import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { Storage } from "@google-cloud/storage";
import { and, eq } from "drizzle-orm";
import { type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";
import {
  emitJson,
  type InventoryRecord,
  outputPath,
  repositoryRoot,
} from "./common.js";
import {
  mediaMigrationOperations,
  migrationOperations,
  resultDigest,
  type MediaMigrationOperation,
  type MigrationOperation,
} from "./migration.js";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldApplyDatabase = args.includes("--apply-db");
const deferMediaUpload = args.includes("--defer-media-upload");
const input = args.find((argument) => argument.startsWith("--in="))?.slice(5) ?? "scripts/cms/output/inventory.json";
const destination = args.find((argument) => argument.startsWith("--out="))?.slice(6);
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

interface Inventory {
  schemaVersion: number;
  manifestDigest: string;
  records: InventoryRecord[];
  expectedCounts: Record<string, number>;
}

function assertDevelopmentTarget() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("CMS inventory import is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database import requires the explicit --target=development safeguard.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!deferMediaUpload && (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR)) {
    throw new Error("Development Object Storage is not configured.");
  }
}

async function uploadMedia(operations: MediaMigrationOperation[]) {
  if (deferMediaUpload) {
    return new Map(operations.filter((item) => item.cmsOwnership === "cms-candidate")
      .map((item) => [item.publicPath, `deferred/cms-media/inventory-${item.checksum}`]));
  }
  const storage = new Storage();
  const bucket = storage.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKeys = new Map<string, string>();
  for (const operation of operations.filter((item) => item.cmsOwnership === "cms-candidate")) {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"].includes(operation.mimeType)) {
      throw new Error(`CMS candidate ${operation.publicPath} has an unsupported media type.`);
    }
    const bytes = await readFile(`${repositoryRoot}/${operation.sourceFile}`);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== operation.checksum || bytes.length !== operation.byteSize) {
      throw new Error(`Asset changed after inventory: ${operation.sourceFile}.`);
    }
    const storageKey = `${prefix}/cms-media/inventory-${operation.checksum}`;
    const object = bucket.file(storageKey);
    const [exists] = await object.exists();
    if (!exists) {
      await object.save(bytes, {
        resumable: false,
        contentType: operation.mimeType,
        metadata: {
          cacheControl: "private, max-age=31536000, immutable",
          metadata: { checksum: operation.checksum, source: "cms-inventory-v2" },
        },
      });
    } else {
      const [metadata] = await object.getMetadata();
      if (Number(metadata.size) !== operation.byteSize) {
        throw new Error(`Stored object size conflict for ${operation.publicPath}.`);
      }
    }
    storageKeys.set(operation.publicPath, storageKey);
  }
  return storageKeys;
}

function withMedia(operation: MigrationOperation, mediaByPath: Map<string, string>) {
  const mediaIds = operation.mediaPaths.map((path) => {
    const id = mediaByPath.get(path);
    if (!id) throw new Error(`No imported CMS media record for ${path}.`);
    return id;
  });
  const content = structuredClone(operation.payload.content) as Record<string, unknown>;
  if (mediaIds[0] && (operation.kind === "platform" || operation.kind === "publication")) {
    content.heroMediaId = mediaIds[0];
  }
  const payload = { ...operation.payload, content, mediaIds };
  const validation = validateCmsSnapshot(operation.kind as CmsDocumentKind, payload, "draft");
  if (!validation.success) throw new Error(`${operation.externalId}: ${validation.errors.join("; ")}`);
  return validation.data;
}

async function applyDatabase(
  operations: MigrationOperation[],
  mediaOperations: MediaMigrationOperation[],
  storageKeys: Map<string, string>,
) {
  const {
    cmsAuditEventsTable,
    cmsDocumentsTable,
    cmsMarketEditionsTable,
    cmsMediaAssetsTable,
    cmsMediaReferencesTable,
    cmsMediaVersionsTable,
    cmsOperationReceiptsTable,
    cmsRevisionsTable,
    cmsUsersTable,
    marketEditionsTable,
    db,
    pool,
  } = await import("@workspace/db");
  try {
    const before = {
      documents: (await db.select().from(cmsDocumentsTable)).length,
      editions: (await db.select().from(cmsMarketEditionsTable)).length,
      revisions: (await db.select().from(cmsRevisionsTable)).length,
      media: (await db.select().from(cmsMediaAssetsTable)).length,
      receipts: (await db.select().from(cmsOperationReceiptsTable)).length,
      audits: (await db.select().from(cmsAuditEventsTable)).length,
    };
    const imported = await db.transaction(async (tx) => {
      await tx.insert(marketEditionsTable).values({
        code: "uae",
        displayName: "United Arab Emirates",
        defaultLocale: "en",
        isCanonical: true,
        enabled: true,
      }).onConflictDoNothing({ target: marketEditionsTable.code });
      const [canonicalMarket] = await tx.select().from(marketEditionsTable)
        .where(eq(marketEditionsTable.code, "uae"));
      if (!canonicalMarket || canonicalMarket.defaultLocale !== "en" || !canonicalMarket.isCanonical
        || !canonicalMarket.enabled || canonicalMarket.fallbackMarketCode || canonicalMarket.fallbackLocale) {
        throw new Error("Existing UAE market configuration conflicts with the canonical English-only cutover.");
      }
      const [serviceAccount] = await tx.insert(cmsUsersTable).values({
        email: "cms-inventory-migration@service.invalid",
        displayName: "CMS inventory migration service",
        role: "viewer",
        status: "suspended",
      }).onConflictDoUpdate({
        target: cmsUsersTable.email,
        set: { displayName: "CMS inventory migration service", role: "viewer", status: "suspended" },
      }).returning({ id: cmsUsersTable.id });
      if (!serviceAccount) throw new Error("Could not provision migration attribution account.");

      const mediaByPath = new Map<string, string>();
      let mediaCreated = 0;
      let mediaReplayed = 0;
      for (const operation of mediaOperations.filter((item) => item.cmsOwnership === "cms-candidate")) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        if (receipt && receipt.requestDigest !== operation.requestDigest) {
          throw new Error(`Media idempotency conflict for ${operation.externalId}.`);
        }
        let [asset] = await tx.select({ id: cmsMediaAssetsTable.id })
          .from(cmsMediaAssetsTable)
          .where(eq(cmsMediaAssetsTable.checksum, operation.checksum));
        if (!asset) {
          [asset] = await tx.insert(cmsMediaAssetsTable).values({
            storageKey: storageKeys.get(operation.publicPath)!,
            filename: operation.filename,
            mediaType: operation.mimeType,
            byteSize: operation.byteSize,
            checksum: operation.checksum,
            status: "pending-review",
            uploadedByUserId: serviceAccount.id,
          }).returning({ id: cmsMediaAssetsTable.id });
          if (!asset) throw new Error(`Could not create media ${operation.externalId}.`);
          await tx.insert(cmsMediaVersionsTable).values({
            assetId: asset.id,
            versionNumber: 1,
            storageKey: storageKeys.get(operation.publicPath)!,
            checksum: operation.checksum,
            byteSize: operation.byteSize,
            width: operation.width,
            height: operation.height,
            metadata: {
              sourcePath: operation.publicPath,
              usages: operation.usages,
              accessibilityStatus: "needs-review",
              rightsStatus: "needs-review",
            },
          });
          mediaCreated++;
        } else {
          mediaReplayed++;
        }
        mediaByPath.set(operation.publicPath, String(asset.id));
        if (!receipt) {
          await tx.insert(cmsOperationReceiptsTable).values({
            idempotencyKey: operation.idempotencyKey,
            operation: "cms.inventory.media-import",
            subjectId: String(asset.id),
            requestDigest: operation.requestDigest,
            resultDigest: resultDigest({ mediaId: asset.id, checksum: operation.checksum }),
          });
          await tx.insert(cmsAuditEventsTable).values({
            actorUserId: serviceAccount.id,
            actorLabel: "cms-inventory-migration",
            action: "cms.inventory.media-imported",
            targetType: "media",
            targetId: String(asset.id),
            requestId: operation.idempotencyKey,
            metadata: { status: "pending-review", sourcePath: operation.publicPath },
          });
        }
      }

      let created = 0;
      let replayed = 0;
      for (const operation of operations) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        if (receipt) {
          if (receipt.requestDigest !== operation.requestDigest) {
            throw new Error(`Idempotency key conflict for ${operation.externalId}; inventory content changed.`);
          }
          replayed++;
          continue;
        }
        const [conflict] = await tx.select({ id: cmsDocumentsTable.id }).from(cmsDocumentsTable)
          .where(eq(cmsDocumentsTable.canonicalSlug, operation.slug));
        if (conflict) throw new Error(`Slug ${operation.slug} is already owned by a non-migration document.`);

        const resolvedPayload = withMedia(operation, mediaByPath);
        const [document] = await tx.insert(cmsDocumentsTable).values({
          kind: operation.kind,
          canonicalSlug: operation.slug,
          title: operation.title,
          ownerId: serviceAccount.id,
          status: "active",
        }).returning({ id: cmsDocumentsTable.id });
        if (!document) throw new Error(`Could not create ${operation.externalId}.`);
        const [edition] = await tx.insert(cmsMarketEditionsTable).values({
          documentId: document.id,
          market: "uae",
          locale: "en",
          localizedSlug: operation.slug,
          publicationState: "draft",
          fallbackMode: "none",
          parityComplete: false,
        }).returning({ id: cmsMarketEditionsTable.id });
        if (!edition) throw new Error(`Could not create UAE edition for ${operation.externalId}.`);
        const [revision] = await tx.insert(cmsRevisionsTable).values({
          editionId: edition.id,
          revisionNumber: 1,
          payloadVersion: 1,
          payload: resolvedPayload,
          contentDigest: resultDigest(resolvedPayload),
          workflowState: "draft",
          createdByUserId: serviceAccount.id,
          reason: "Inventory migration; pending editorial review.",
        }).returning({ id: cmsRevisionsTable.id });
        if (!revision) throw new Error(`Could not create revision for ${operation.externalId}.`);
        for (const mediaId of resolvedPayload.mediaIds) {
          await tx.insert(cmsMediaReferencesTable).values({
            assetId: mediaId,
            documentId: document.id,
            fieldPath: `revision:${revision.id}`,
          });
        }
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: operation.idempotencyKey,
          operation: "cms.inventory.import",
          subjectId: String(document.id),
          requestDigest: operation.requestDigest,
          resultDigest: resultDigest({ documentId: document.id, editionId: edition.id, revisionId: revision.id }),
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id,
          actorLabel: "cms-inventory-migration",
          action: "cms.inventory.imported",
          targetType: operation.kind,
          targetId: String(document.id),
          requestId: operation.idempotencyKey,
          metadata: {
            market: "uae",
            locale: "en",
            workflowState: "draft",
            sourceType: "inventory-v2",
            revisionId: String(revision.id),
          },
        });
        created++;
      }
      return { created, replayed, mediaCreated, mediaReplayed };
    });
    return { before, ...imported };
  } finally {
    await pool.end();
  }
}

async function main() {
  const inventory = JSON.parse(await readFile(`${repositoryRoot}/${input}`, "utf8")) as Inventory;
  if (inventory.schemaVersion !== 2 || !Array.isArray(inventory.records) || !inventory.manifestDigest) {
    throw new Error("Unsupported or invalid inventory file.");
  }
  const operations = migrationOperations(inventory.records);
  const mediaOperations = mediaMigrationOperations(inventory.records);
  let database;
  if (shouldApplyDatabase) {
    assertDevelopmentTarget();
    const storageKeys = await uploadMedia(mediaOperations);
    database = await applyDatabase(operations, mediaOperations, storageKeys);
    if (shouldWrite) {
      await emitJson({
        schemaVersion: 1,
        target: "development",
        capturedAt: new Date().toISOString(),
        manifestDigest: inventory.manifestDigest,
        before: database.before,
        localAssets: mediaOperations.map((item) => ({
          publicPath: item.publicPath,
          checksum: item.checksum,
          ownership: item.cmsOwnership,
        })),
      }, outputPath(undefined, "pre-import-export.json"), true);
    }
  }
  await emitJson({
    schemaVersion: 2,
    generatedAt: new Date().toISOString(),
    manifestDigest: inventory.manifestDigest,
    dryRun: !shouldApplyDatabase,
    mode: shouldApplyDatabase ? "development-db-apply" : "payload-only",
    note: shouldApplyDatabase
      ? `Imported governed UAE/English drafts and candidate media metadata. No content was approved or published; media remains pending rights/accessibility${deferMediaUpload ? " and durable-object upload" : ""} review.`
      : "No storage or database call was made. Use --apply-db --target=development to import governed drafts.",
    operations,
    mediaOperations,
    database,
  }, outputPath(destination, "import-payload.json"), shouldWrite);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});