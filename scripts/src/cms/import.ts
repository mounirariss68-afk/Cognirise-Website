import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Storage } from "@google-cloud/storage";
import { and, desc, eq } from "drizzle-orm";
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
  personAvailabilityOperations,
  personGovernanceOperations,
  resolveMigrationMedia,
  resultDigest,
  type MediaMigrationOperation,
  type MigrationOperation,
  type PersonAvailabilityOperation,
  type PersonGovernanceOperation,
} from "./migration.js";
import { mapWithConcurrency } from "./media-reconciliation.js";
import { objectStorageClient } from "./object-storage.js";

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
  if (deferMediaUpload) {
    throw new Error("Deferred media database imports are no longer supported; durable upload and verification are required.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is not configured.");
  }
}

async function verifyStoredMedia(
  bucket: ReturnType<Storage["bucket"]>,
  storageKey: string,
  operation: MediaMigrationOperation,
  expectedMd5?: string,
) {
  if (storageKey.startsWith("deferred/")) return false;
  const object = bucket.file(storageKey);
  const [exists] = await object.exists();
  if (!exists) return false;
  const [metadata] = await object.getMetadata();
  if (Number(metadata.size) !== operation.byteSize) return false;
  if (metadata.metadata?.checksum === operation.checksum) return true;
  if (expectedMd5 && metadata.md5Hash === expectedMd5) return true;
  const [storedBytes] = await object.download();
  return createHash("sha256").update(storedBytes).digest("hex") === operation.checksum;
}

async function uploadMedia(operations: MediaMigrationOperation[]) {
  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const candidates = operations.filter((item) => item.cmsOwnership === "cms-candidate");
  const entries = await mapWithConcurrency(candidates, 6, async (operation) => {
    if (!["image/jpeg", "image/png", "image/webp", "image/avif", "application/pdf"].includes(operation.mimeType)) {
      throw new Error(`CMS candidate ${operation.publicPath} has an unsupported media type.`);
    }
    const bytes = await readFile(`${repositoryRoot}/${operation.sourceFile}`);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const expectedMd5 = createHash("md5").update(bytes).digest("base64");
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
          metadata: { checksum: operation.checksum, source: "cms-inventory-v3" },
        },
      });
    } else {
      const [metadata] = await object.getMetadata();
      if (Number(metadata.size) !== operation.byteSize) {
        throw new Error(`Stored object size conflict for ${operation.publicPath}.`);
      }
    }
    if (!await verifyStoredMedia(bucket, storageKey, operation, expectedMd5)) {
      throw new Error(`Stored object checksum conflict for ${operation.publicPath}.`);
    }
    return [operation.publicPath, storageKey] as const;
  });
  return new Map(entries);
}

async function applyDatabase(
  operations: MigrationOperation[],
  mediaOperations: MediaMigrationOperation[],
  availabilityOperations: PersonAvailabilityOperation[],
  governanceOperations: PersonGovernanceOperation[],
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
    cmsPersonMarketAvailabilityTable,
    cmsRevisionsTable,
    cmsUsersTable,
    marketEditionsTable,
    db,
    pool,
  } = await import("@workspace/db");
  const storageBucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
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
      let mediaRepaired = 0;
      for (const operation of mediaOperations.filter((item) => item.cmsOwnership === "cms-candidate")) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        const durableStorageKey = storageKeys.get(operation.publicPath);
        if (!durableStorageKey || durableStorageKey.startsWith("deferred/")) {
          throw new Error(`No verified durable object is available for ${operation.publicPath}.`);
        }
        let [asset] = receipt
          ? await tx.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, receipt.subjectId))
          : await tx.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.checksum, operation.checksum));
        if (receipt && receipt.requestDigest !== operation.requestDigest) {
          const binaryStillMatches = asset
            && asset.checksum === operation.checksum
            && asset.byteSize === operation.byteSize
            && asset.mediaType === operation.mimeType;
          if (!binaryStillMatches) {
            console.error(`Preserving previously imported media for ${operation.externalId}; the inventory digest and binary identity changed.`);
            mediaByPath.set(operation.publicPath, receipt.subjectId);
            mediaReplayed++;
            continue;
          }
          console.warn(`Repairing matching media binary for ${operation.externalId} while preserving its earlier inventory receipt digest.`);
        }
        if (!asset) {
          [asset] = await tx.insert(cmsMediaAssetsTable).values({
            storageKey: durableStorageKey,
            filename: operation.filename,
            mediaType: operation.mimeType,
            byteSize: operation.byteSize,
            checksum: operation.checksum,
            altText: operation.altText,
            credit: operation.credit,
            collection: operation.collection,
            linkedinAssetKind: operation.linkedinAssetKind,
            campaignMetadata: operation.campaignMetadata,
            status: "pending-review",
            uploadedByUserId: serviceAccount.id,
          }).returning();
          if (!asset) throw new Error(`Could not create media ${operation.externalId}.`);
          await tx.insert(cmsMediaVersionsTable).values({
            assetId: asset.id,
            versionNumber: 1,
            storageKey: durableStorageKey,
            checksum: operation.checksum,
            byteSize: operation.byteSize,
            width: operation.width,
            height: operation.height,
            metadata: {
              sourcePath: operation.publicPath,
              usages: operation.usages,
               collection: operation.collection,
               linkedinAssetKind: operation.linkedinAssetKind,
               campaignMetadata: operation.campaignMetadata,
               altText: operation.altText,
               credit: operation.credit,
              accessibilityStatus: "needs-review",
              rightsStatus: "needs-review",
            },
          });
          mediaCreated++;
        } else {
          const [latestVersion] = await tx.select().from(cmsMediaVersionsTable)
            .where(eq(cmsMediaVersionsTable.assetId, asset.id))
            .orderBy(desc(cmsMediaVersionsTable.versionNumber))
            .limit(1);
          const durableVersionIsCurrent = latestVersion
            && latestVersion.checksum === operation.checksum
            && latestVersion.byteSize === operation.byteSize
            && !latestVersion.storageKey.startsWith("deferred/");
          if (!durableVersionIsCurrent) {
            await tx.insert(cmsMediaVersionsTable).values({
              assetId: asset.id,
              versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
              storageKey: durableStorageKey,
              checksum: operation.checksum,
              byteSize: operation.byteSize,
              width: operation.width,
              height: operation.height,
              metadata: {
                sourcePath: operation.publicPath,
                usages: operation.usages,
                collection: operation.collection,
                linkedinAssetKind: operation.linkedinAssetKind,
                campaignMetadata: operation.campaignMetadata,
                altText: operation.altText,
                credit: operation.credit,
                accessibilityStatus: "needs-review",
                rightsStatus: "needs-review",
                repairsIncompleteVersion: latestVersion?.versionNumber ?? null,
              },
            });
            await tx.update(cmsMediaAssetsTable).set({
              storageKey: durableStorageKey,
              filename: operation.filename,
              mediaType: operation.mimeType,
              byteSize: operation.byteSize,
              checksum: operation.checksum,
              altText: operation.altText,
              credit: operation.credit,
              updatedAt: new Date(),
            }).where(eq(cmsMediaAssetsTable.id, asset.id));
            mediaRepaired++;
          } else {
            mediaReplayed++;
          }
          await tx.update(cmsMediaAssetsTable).set({
            altText: operation.altText,
            credit: operation.credit,
            collection: operation.collection,
            linkedinAssetKind: operation.linkedinAssetKind,
            campaignMetadata: operation.campaignMetadata,
            updatedAt: new Date(),
          }).where(eq(cmsMediaAssetsTable.id, asset.id));
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
            console.error(`Preserving previously imported document for ${operation.externalId}; the inventory digest changed.`);
            replayed++;
            continue;
          }
          replayed++;
          continue;
        }
        const [conflict] = await tx.select({ id: cmsDocumentsTable.id }).from(cmsDocumentsTable)
          .where(eq(cmsDocumentsTable.canonicalSlug, operation.slug));
        if (conflict) throw new Error(`Slug ${operation.slug} is already owned by a non-migration document.`);

        const resolvedPayload = resolveMigrationMedia(operation, mediaByPath);
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
      let availabilityCreated = 0;
      let availabilityReplayed = 0;
      const availabilityConflicts: string[] = [];
      for (const operation of availabilityOperations) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        if (receipt) {
          if (receipt.requestDigest !== operation.requestDigest) {
            console.error(`Preserving previously initialized availability for ${operation.externalId}; the inventory digest changed.`);
            availabilityReplayed++;
            continue;
          }
          availabilityReplayed++;
          continue;
        }
        const [documentReceipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.documentIdempotencyKey));
        if (!documentReceipt) {
          throw new Error(`Cannot initialize availability before importing ${operation.externalId}.`);
        }
        const [market] = await tx.select({ id: marketEditionsTable.id }).from(marketEditionsTable)
          .where(eq(marketEditionsTable.code, operation.market));
        if (!market) throw new Error(`Configured market ${operation.market} was not found.`);
        const [existingAvailability] = await tx.select({
          publishedDecision: cmsPersonMarketAvailabilityTable.publishedDecision,
        }).from(cmsPersonMarketAvailabilityTable).where(and(
          eq(cmsPersonMarketAvailabilityTable.documentId, documentReceipt.subjectId),
          eq(cmsPersonMarketAvailabilityTable.marketEditionId, market.id),
        ));
        if (existingAvailability && existingAvailability.publishedDecision !== operation.decision) {
          availabilityConflicts.push(
            `${operation.externalId}: existing ${existingAvailability.publishedDecision}, inventory ${operation.decision}`,
          );
          console.error(`Preserving editorial availability for ${operation.externalId}; it conflicts with the inventory default.`);
          await tx.insert(cmsOperationReceiptsTable).values({
            idempotencyKey: operation.idempotencyKey,
            operation: "cms.inventory.person-market-availability-conflict-preserved",
            subjectId: documentReceipt.subjectId,
            requestDigest: operation.requestDigest,
            resultDigest: resultDigest({
              documentId: documentReceipt.subjectId,
              market: operation.market,
              preservedDecision: existingAvailability.publishedDecision,
              inventoryDecision: operation.decision,
            }),
          });
          await tx.insert(cmsAuditEventsTable).values({
            actorUserId: serviceAccount.id,
            actorLabel: "cms-inventory-migration",
            action: "cms.inventory.person-market-availability-conflict-preserved",
            targetType: "person",
            targetId: documentReceipt.subjectId,
            requestId: operation.idempotencyKey,
            metadata: {
              market: operation.market,
              preservedDecision: existingAvailability.publishedDecision,
              inventoryDecision: operation.decision,
            },
          });
          availabilityCreated++;
          continue;
        }
        if (!existingAvailability) {
          await tx.insert(cmsPersonMarketAvailabilityTable).values({
            documentId: documentReceipt.subjectId,
            marketEditionId: market.id,
            decision: operation.decision,
            publishedDecision: operation.decision,
            updatedByUserId: serviceAccount.id,
            publishedByUserId: serviceAccount.id,
            publishedAt: new Date(),
          });
        }
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: operation.idempotencyKey,
          operation: "cms.inventory.person-market-availability",
          subjectId: documentReceipt.subjectId,
          requestDigest: operation.requestDigest,
          resultDigest: resultDigest({
            documentId: documentReceipt.subjectId,
            marketEditionId: market.id,
            decision: operation.decision,
          }),
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id,
          actorLabel: "cms-inventory-migration",
          action: "cms.inventory.person-market-availability-initialized",
          targetType: "person",
          targetId: documentReceipt.subjectId,
          requestId: operation.idempotencyKey,
          metadata: { market: operation.market, decision: operation.decision },
        });
        availabilityCreated++;
      }
      let governanceCreated = 0;
      let governanceReplayed = 0;
      const governanceConflicts: string[] = [];
      for (const operation of governanceOperations) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        if (receipt) {
          if (receipt.requestDigest !== operation.requestDigest) {
            governanceConflicts.push(`${operation.externalId}: governance receipt digest changed`);
          } else {
            governanceReplayed++;
          }
          continue;
        }
        const [documentReceipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.documentIdempotencyKey));
        if (!documentReceipt) {
          governanceConflicts.push(`${operation.externalId}: legacy import receipt not found`);
          continue;
        }
        const preserveGovernanceConflict = async (reason: string, preserved: unknown) => {
          governanceConflicts.push(`${operation.externalId}: ${reason}`);
          console.error(`Preserving editorial person fields for ${operation.externalId}: ${reason}.`);
          await tx.insert(cmsOperationReceiptsTable).values({
            idempotencyKey: operation.idempotencyKey,
            operation: "cms.inventory.person-governance-conflict-preserved",
            subjectId: documentReceipt.subjectId,
            requestDigest: operation.requestDigest,
            resultDigest: resultDigest({
              documentId: documentReceipt.subjectId,
              preserved,
              inventoryControlled: operation.controlled,
            }),
          });
          await tx.insert(cmsAuditEventsTable).values({
            actorUserId: serviceAccount.id,
            actorLabel: "cms-inventory-migration",
            action: "cms.inventory.person-governance-conflict-preserved",
            targetType: "person",
            targetId: documentReceipt.subjectId,
            requestId: operation.idempotencyKey,
            metadata: {
              market: operation.market,
              reason,
              preserved,
              inventoryControlled: operation.controlled,
            },
          });
          governanceCreated++;
        };
        const [edition] = await tx.select().from(cmsMarketEditionsTable).where(and(
          eq(cmsMarketEditionsTable.documentId, documentReceipt.subjectId),
          eq(cmsMarketEditionsTable.market, operation.market),
        ));
        if (!edition) {
          await preserveGovernanceConflict("canonical market edition not found", null);
          continue;
        }
        const [current] = await tx.select().from(cmsRevisionsTable)
          .where(eq(cmsRevisionsTable.editionId, edition.id))
          .orderBy(desc(cmsRevisionsTable.revisionNumber))
          .limit(1);
        const payload = current?.payload as Record<string, unknown> | undefined;
        const content = payload?.content as Record<string, unknown> | undefined;
        const actual = content && typeof content.role === "string" && typeof content.title === "string"
          && typeof content.order === "number"
          ? { role: content.role, title: content.title, order: content.order }
          : undefined;
        const matches = (candidate: typeof actual) => candidate
          && candidate.role === operation.controlled.role
          && candidate.title === operation.controlled.title
          && candidate.order === operation.controlled.order;
        const isLegacy = actual && operation.legacyControlled.some((candidate) =>
          candidate.role === actual.role && candidate.title === actual.title && candidate.order === actual.order,
        );
        if (!current || !payload || !content || (!matches(actual) && !isLegacy)) {
          await preserveGovernanceConflict(
            "controlled fields differ from known legacy or desired values",
            actual ?? null,
          );
          continue;
        }
        let revisionId = current.id;
        if (!matches(actual)) {
          const nextPayload = {
            ...payload,
            content: { ...content, ...operation.controlled },
          };
          const validation = validateCmsSnapshot("person", nextPayload, "draft");
          if (!validation.success) {
            governanceConflicts.push(`${operation.externalId}: ${validation.errors.join("; ")}`);
            continue;
          }
          const [revision] = await tx.insert(cmsRevisionsTable).values({
            editionId: edition.id,
            revisionNumber: current.revisionNumber + 1,
            payloadVersion: current.payloadVersion,
            payload: validation.data,
            contentDigest: resultDigest(validation.data),
            workflowState: "draft",
            createdByUserId: serviceAccount.id,
            reason: "Versioned person governance reconciliation; pending editorial review.",
          }).returning({ id: cmsRevisionsTable.id });
          if (!revision) throw new Error(`Could not create governance revision for ${operation.externalId}.`);
          revisionId = revision.id;
        }
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: operation.idempotencyKey,
          operation: "cms.inventory.person-governance",
          subjectId: documentReceipt.subjectId,
          requestDigest: operation.requestDigest,
          resultDigest: resultDigest({ documentId: documentReceipt.subjectId, revisionId, controlled: operation.controlled }),
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id,
          actorLabel: "cms-inventory-migration",
          action: "cms.inventory.person-governance-reconciled",
          targetType: "person",
          targetId: documentReceipt.subjectId,
          requestId: operation.idempotencyKey,
          metadata: { market: operation.market, revisionId, controlled: operation.controlled },
        });
        governanceCreated++;
      }
      return {
        created,
        replayed,
        mediaCreated,
        mediaRepaired,
        mediaReplayed,
        availabilityCreated,
        availabilityReplayed,
        availabilityConflicts,
        governanceCreated,
        governanceReplayed,
        governanceConflicts,
      };
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
  const availabilityOperations = personAvailabilityOperations(inventory.records);
  const governanceOperations = personGovernanceOperations(inventory.records);
  let database;
  if (shouldApplyDatabase) {
    assertDevelopmentTarget();
    const storageKeys = await uploadMedia(mediaOperations);
    database = await applyDatabase(operations, mediaOperations, availabilityOperations, governanceOperations, storageKeys);
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
      ? "Imported governed UAE/English drafts and verified durable media. No content was approved or published; website media remains pending rights/accessibility review."
      : "No storage or database call was made. Use --apply-db --target=development to import governed drafts.",
    operations,
    availabilityOperations,
    governanceOperations,
    mediaOperations,
    database,
  }, outputPath(destination, "import-payload.json"), shouldWrite);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});