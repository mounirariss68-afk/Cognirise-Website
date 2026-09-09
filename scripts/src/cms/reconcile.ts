import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  type InventoryRecord,
  repositoryRoot,
} from "./common.js";
import {
  historicalMediaReceipts,
  mediaMigrationOperations,
  migrationOperations,
  personAvailabilityOperations,
  personGovernanceOperations,
} from "./migration.js";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { mapWithConcurrency } from "./media-reconciliation.js";
import { objectStorageClient } from "./object-storage.js";
import {
  inspectReceiptCoverage,
  requiresPublishedCaseSnapshot,
  type ExpectedReceipt,
} from "./receipt-reconciliation.js";
import { runReconciliationLifecycle } from "./reconcile-order.js";

interface Inventory {
  schemaVersion: number;
  manifestDigest: string;
  records: InventoryRecord[];
}

async function loadDatabase() {
  return import("@workspace/db");
}

type DatabaseBindings = Awaited<ReturnType<typeof loadDatabase>>;

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        signal
          ? `${command} was terminated by ${signal}.`
          : `${command} exited with code ${code ?? "unknown"}.`,
      ));
    });
  });
}

async function reconcilePublishedIndustryMedia() {
  await run("pnpm", [
    "--filter",
    "@workspace/scripts",
    "cms:publish-industry-images",
    "--",
    "--apply-db",
    "--target=development",
  ]);
}

async function inspectReconciliationState(
  expected: Map<string, ExpectedReceipt>,
  database: DatabaseBindings,
) {
  const {
    cmsDocumentsTable,
    cmsMarketEditionsTable,
    cmsRevisionsTable,
    cmsMediaReferencesTable,
    cmsMediaAssetsTable,
    cmsMediaVersionsTable,
    cmsOperationReceiptsTable,
    db,
  } = database;
  const receipts = await db.select({
    idempotencyKey: cmsOperationReceiptsTable.idempotencyKey,
    requestDigest: cmsOperationReceiptsTable.requestDigest,
    subjectId: cmsOperationReceiptsTable.subjectId,
    operation: cmsOperationReceiptsTable.operation,
  }).from(cmsOperationReceiptsTable);
  const coverage = inspectReceiptCoverage(expected, receipts);
  const { conflicts, missingCount, relevantReceipts } = coverage;

  const documentIds: string[] = [];
  const mediaIds: string[] = [];
  for (const receipt of relevantReceipts) {
    const operation = expected.get(receipt.idempotencyKey)!;
    if (operation.subjectType === "document") documentIds.push(receipt.subjectId);
    else mediaIds.push(receipt.subjectId);
  }

  const uniqueDocumentIds = [...new Set(documentIds)];
  const uniqueMediaIds = [...new Set(mediaIds)];
  const [documents, media, versions] = await Promise.all([
    uniqueDocumentIds.length
      ? db.select({ id: cmsDocumentsTable.id })
        .from(cmsDocumentsTable)
        .where(inArray(cmsDocumentsTable.id, uniqueDocumentIds))
      : [],
    uniqueMediaIds.length
      ? db.select()
        .from(cmsMediaAssetsTable)
        .where(inArray(cmsMediaAssetsTable.id, uniqueMediaIds))
      : [],
    uniqueMediaIds.length
      ? db.select().from(cmsMediaVersionsTable)
        .where(inArray(cmsMediaVersionsTable.assetId, uniqueMediaIds))
        .orderBy(desc(cmsMediaVersionsTable.versionNumber))
      : [],
  ]);
  const invalid = [...coverage.invalid];
  if (documents.length !== uniqueDocumentIds.length) {
    invalid.push(`receipt subjects: found ${documents.length}/${uniqueDocumentIds.length} documents`);
  }
  if (media.length !== uniqueMediaIds.length) {
    invalid.push(`receipt subjects: found ${media.length}/${uniqueMediaIds.length} media assets`);
  }
  const mediaById = new Map(media.map((asset) => [asset.id, asset]));
  const latestVersionByAsset = new Map<string, typeof versions[number]>();
  for (const version of versions) {
    if (!latestVersionByAsset.has(version.assetId)) latestVersionByAsset.set(version.assetId, version);
  }
  if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is required.");
  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
  const mediaReceipts = relevantReceipts.filter((receipt) => expected.get(receipt.idempotencyKey)?.media);
  const mediaInvalid = await mapWithConcurrency(mediaReceipts, 6, async (receipt) => {
    const operation = expected.get(receipt.idempotencyKey);
    if (!operation?.media) return undefined;
    const asset = mediaById.get(receipt.subjectId);
    const version = latestVersionByAsset.get(receipt.subjectId);
    if (!asset || !version) {
      return `${operation.media.publicPath}: missing asset or immutable version`;
    }
    if (asset.checksum !== operation.media.checksum || asset.byteSize !== operation.media.byteSize
      || version.checksum !== operation.media.checksum || version.byteSize !== operation.media.byteSize
      || version.storageKey.startsWith("deferred/")) {
      return `${operation.media.publicPath}: database checksum, size, or storage key is incomplete`;
    }
    const object = bucket.file(version.storageKey);
    const [exists] = await object.exists();
    if (!exists) {
      return `${operation.media.publicPath}: durable object is missing`;
    }
    const [metadata] = await object.getMetadata();
    const sourceBytes = await readFile(`${repositoryRoot}/${operation.media.sourceFile}`);
    const sourceMd5 = createHash("md5").update(sourceBytes).digest("base64");
    const objectMatches = Number(metadata.size) === operation.media.byteSize
      && (
        metadata.metadata?.checksum === operation.media.checksum
        || metadata.md5Hash === sourceMd5
      );
    if (!objectMatches) {
      return `${operation.media.publicPath}: durable object is invalid`;
    }
    return undefined;
  });
  invalid.push(...mediaInvalid.filter((item): item is string => Boolean(item)));

  for (const receipt of relevantReceipts) {
    const expectation = expected.get(receipt.idempotencyKey);
    if (!requiresPublishedCaseSnapshot(expectation, receipt)) continue;
    const [edition] = await db.select({
      id: cmsMarketEditionsTable.id,
      publicationState: cmsMarketEditionsTable.publicationState,
      publishedRevisionId: cmsMarketEditionsTable.publishedRevisionId,
    }).from(cmsMarketEditionsTable).where(inArray(cmsMarketEditionsTable.documentId, [receipt.subjectId]));
    if (!edition || edition.publicationState !== "published" || !edition.publishedRevisionId) {
      invalid.push(`${receipt.idempotencyKey}: publication incomplete`);
      continue;
    }
    const [revision] = await db.select({
      payload: cmsRevisionsTable.payload,
      workflowState: cmsRevisionsTable.workflowState,
    }).from(cmsRevisionsTable).where(inArray(cmsRevisionsTable.id, [edition.publishedRevisionId]));
    const validation = revision ? validateCmsSnapshot("case-study", revision.payload, "publish") : null;
    const payload = revision?.payload as { mediaIds?: unknown[]; content?: Record<string, unknown> } | undefined;
    const mediaId = Array.isArray(payload?.mediaIds) && payload.mediaIds.length === 1 && typeof payload.mediaIds[0] === "string"
      ? payload.mediaIds[0] : null;
    const [reference] = mediaId ? await db.select({
      mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
    }).from(cmsMediaReferencesTable).where(and(
      eq(cmsMediaReferencesTable.documentId, receipt.subjectId),
      eq(cmsMediaReferencesTable.fieldPath, `revision:${edition.publishedRevisionId}`),
      eq(cmsMediaReferencesTable.assetId, mediaId),
    )) : [];
    if (!revision || revision.workflowState !== "approved" || !validation?.success
      || !reference?.mediaVersionId) {
      invalid.push(`${receipt.idempotencyKey}: approved summary or immutable media pin is incomplete`);
    }
  }

  const existingCount = relevantReceipts.length;
  return {
    state: missingCount === 0 && invalid.length === 0 && conflicts.length === 0
      ? "complete" as const
      : "pending" as const,
    existingCount,
    missingCount,
    conflicts,
    invalid,
  };
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("CMS cutover reconciliation is disabled in production.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const inventory = JSON.parse(
    await readFile(`${repositoryRoot}/scripts/cms/output/inventory.json`, "utf8"),
  ) as Inventory;
  if (inventory.schemaVersion !== 2 || !inventory.manifestDigest || !Array.isArray(inventory.records)) {
    throw new Error("Unsupported or invalid CMS inventory file.");
  }

  const expected = new Map<string, ExpectedReceipt>();
  const governedLegacyExternalIds = new Set(
    personGovernanceOperations(inventory.records).map((operation) => operation.externalId),
  );
  for (const operation of migrationOperations(inventory.records)) {
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "document",
      // Versioned industry baselines receive a new receipt. If an earlier
      // edition has subsequent revisions, import records a preservation
      // receipt rather than replacing that editorial history.
      tolerateDigestDrift: governedLegacyExternalIds.has(operation.externalId)
        || operation.kind === "industry"
        || operation.idempotencyKey.startsWith("cms-case-study-baseline-v1:")
        || operation.idempotencyKey.startsWith("cms-case-study-baseline-v2:"),
      publishCase: Boolean(operation.kind === "case-study"
        && operation.mediaPaths.length === 1
        && operation.payload.content
        && (operation.payload.content as Record<string, unknown>).variant === "summary"
        && (operation.payload.content as Record<string, unknown>).disclosure === "anonymized"
        && (operation.payload.content as Record<string, unknown>).publicEvidenceStatus === "approved"),
    });
  }
  for (const operation of mediaMigrationOperations(inventory.records)
    .filter((item) => item.cmsOwnership === "cms-candidate")) {
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "media",
      media: operation,
    });
  }
  for (const receipt of historicalMediaReceipts(inventory.records)) {
    expected.set(receipt.idempotencyKey, {
      requestDigest: receipt.requestDigest,
      acceptedRequestDigests: receipt.acceptedRequestDigests,
      subjectType: "media",
      optional: true,
      sameSubjectAs: receipt.replacementIdempotencyKey,
    });
  }
  for (const operation of personAvailabilityOperations(inventory.records)) {
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "document",
    });
  }
  for (const operation of personGovernanceOperations(inventory.records)) {
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "document",
    });
  }

  const database = await loadDatabase();
  try {
    const before = await inspectReconciliationState(expected, database);
    const initialImport = before.existingCount === 0;
    if (before.state !== "complete") {
      console.log(
        initialImport
          ? `CMS cutover is absent; uploading and importing ${before.missingCount} governed development operations.`
          : `CMS reconciliation: missing=${before.missingCount} invalid=${before.invalid.length} conflicts=${before.conflicts.length}; verifying and repairing without replacing valid immutable versions.`,
      );
    }
    const after = await runReconciliationLifecycle({
      beforeIsComplete: before.state === "complete",
      initialImport,
      importInventory: async () => {
        await run("pnpm", [
          "--filter",
          "@workspace/scripts",
          "cms:import",
          "--",
          "--apply-db",
          "--target=development",
        ]);
      },
      inspectAfterImport: () => inspectReconciliationState(expected, database),
      validateAfterImport: (next) => {
        if (next.conflicts.length) {
          const details = next.conflicts
            .map((conflict) => `${conflict.idempotencyKey} (stored ${conflict.actualDigest}, inventory ${conflict.expectedDigest})`)
            .join("; ");
          console.warn(
            `CMS reconciliation preserved ${next.conflicts.length} previously imported operation(s) whose inventory changed. Resolve each intentional replacement with an explicitly versioned operation: ${details}`,
          );
        }
        if (next.state !== "complete") {
          throw new Error(
            `CMS cutover reconciliation remained incomplete: missing=${next.missingCount} invalid=${next.invalid.length} conflicts=${next.conflicts.length}. ${next.invalid.join("; ")}`,
          );
        }
      },
      verifyInitialBaseline: async () => {
        await run("pnpm", [
          "--filter",
          "@workspace/scripts",
          "cms:verify",
          "--",
          "--db",
        ]);
      },
      publishIndustryMedia: reconcilePublishedIndustryMedia,
    });
    if (!after) {
      console.log(
        `CMS media reconciliation completed: missing=0 invalid=0 conflicts=${before.conflicts.length} created=0 repaired=0 reused=${before.existingCount}.`,
      );
      return;
    }
    console.log(
      `CMS media reconciliation completed: missing=0 invalid=0 conflicts=${after.conflicts.length} created=${after.existingCount - before.existingCount} repaired=${before.invalid.length} reused=${before.existingCount - before.invalid.length}.`,
    );
  } finally {
    await database.pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
