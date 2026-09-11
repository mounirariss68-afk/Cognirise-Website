import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { and, desc, eq, inArray } from "drizzle-orm";
import {
  type InventoryRecord,
  repositoryRoot,
} from "./common.js";
import {
  canonicalResultDigest,
  EDUCATION_SUCCESSOR_SEO,
  educationSuccessorRecoveryKey,
  educationSuccessorVersion,
  isEducationSuccessorOperation,
  isKnownEducationSuccessorAuthorityDigest,
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
  educationReconciliationOutcome,
  inspectReceiptCoverage,
  requiresPublishedCaseSnapshot,
  toleratesDocumentReceiptDigestDrift,
  type ExpectedReceipt,
} from "./receipt-reconciliation.js";
import { mediaVersionIsExactCurrent } from "./media-metadata.js";
import { runReconciliationLifecycle } from "./reconcile-order.js";

function normalizeEducationMediaPayload(
  payload: {
    mediaIds?: unknown[];
    content?: Record<string, unknown>;
  },
  replacement?: { image?: unknown; imageAlt?: unknown },
) {
  payload.mediaIds = [];
  if (!payload.content) return;
  delete payload.content.heroMediaId;
  delete payload.content.heroMedia;
  delete payload.content.supportingMedia;
  if (replacement) {
    if (typeof replacement.image === "string") payload.content.image = replacement.image;
    if (typeof replacement.imageAlt === "string") payload.content.imageAlt = replacement.imageAlt;
  }
  const pov = payload.content.educationPov;
  const imagery = pov && typeof pov === "object" && !Array.isArray(pov)
    ? (pov as Record<string, unknown>).imagery
    : undefined;
  if (!imagery || typeof imagery !== "object" || Array.isArray(imagery)) return;
  for (const slot of ["educatorPractice", "researchCoordination"]) {
    const scene = (imagery as Record<string, unknown>)[slot];
    if (scene && typeof scene === "object" && !Array.isArray(scene)) {
      delete (scene as Record<string, unknown>).media;
    }
  }
}

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
  for (const slug of ["education", "public-sector"]) {
    await run("pnpm", [
      "--filter",
      "@workspace/scripts",
      slug === "education"
        ? "cms:publish-education-hero"
        : "cms:publish-public-sector-hero",
      "--",
      "--apply-db",
      "--target=development",
    ]);
  }
}

async function inspectReconciliationState(
  expected: Map<string, ExpectedReceipt>,
  database: DatabaseBindings,
) {
  const {
    cmsAuditEventsTable,
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
    resultDigest: cmsOperationReceiptsTable.resultDigest,
  }).from(cmsOperationReceiptsTable);
  const coverage = inspectReceiptCoverage(expected, receipts);
  const { conflicts, missingCount, relevantReceipts } = coverage;
  const invalid = [...coverage.invalid];
  const educationOutcomes: Array<{
    idempotencyKey: string;
    status: string;
    message: string;
  }> = [];
  let educationCutoverPending = false;

  const documentIds: string[] = [];
  const mediaIds: string[] = [];
  for (const receipt of relevantReceipts) {
    const operation = expected.get(receipt.idempotencyKey)!;
    if (operation.subjectType === "document") documentIds.push(receipt.subjectId);
    else mediaIds.push(receipt.subjectId);
  }

  for (const receipt of relevantReceipts) {
    const expectation = expected.get(receipt.idempotencyKey);
    if (!expectation?.publishEducationSuccessor) continue;
    const [edition] = await db.select({
      id: cmsMarketEditionsTable.id,
      publicationState: cmsMarketEditionsTable.publicationState,
      publishedRevisionId: cmsMarketEditionsTable.publishedRevisionId,
    }).from(cmsMarketEditionsTable).where(and(
      eq(cmsMarketEditionsTable.documentId, receipt.subjectId),
      eq(cmsMarketEditionsTable.market, "uae"),
    ));
    const [publishedRevision] = edition?.publishedRevisionId
      ? await db.select({
          payload: cmsRevisionsTable.payload,
          workflowState: cmsRevisionsTable.workflowState,
        }).from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition.publishedRevisionId))
      : [];
    const [latestRevision] = edition?.id
      ? await db.select({
          id: cmsRevisionsTable.id,
          payload: cmsRevisionsTable.payload,
          workflowState: cmsRevisionsTable.workflowState,
        }).from(cmsRevisionsTable)
          .where(eq(cmsRevisionsTable.editionId, edition.id))
          .orderBy(desc(cmsRevisionsTable.revisionNumber))
          .limit(1)
      : [];
    const [receiptAudit] = expectation.publishEducationSuccessor
      ? await db.select({
          metadata: cmsAuditEventsTable.metadata,
        }).from(cmsAuditEventsTable)
          .where(eq(cmsAuditEventsTable.requestId, receipt.idempotencyKey))
          .limit(1)
      : [];
    const successorRevisionId = (receiptAudit?.metadata as Record<string, unknown> | null)?.revisionId;
    const [successorRevision] = typeof successorRevisionId === "string" && edition?.id
      ? await db.select({
          id: cmsRevisionsTable.id,
          payload: cmsRevisionsTable.payload,
          workflowState: cmsRevisionsTable.workflowState,
        }).from(cmsRevisionsTable).where(and(
          eq(cmsRevisionsTable.id, successorRevisionId),
          eq(cmsRevisionsTable.editionId, edition.id),
        ))
      : [];
    const payload = publishedRevision?.payload as {
      seo?: Record<string, unknown>;
      content?: {
        educationPov?: {
          version?: unknown;
          imagery?: Record<string, { media?: { mediaId?: unknown; mediaVersionId?: unknown; role?: unknown } }>;
        };
        heroMediaId?: unknown;
        heroMedia?: { mediaId?: unknown; mediaVersionId?: unknown; role?: unknown };
      };
      mediaIds?: unknown[];
    } | undefined;
    const mediaIds = Array.isArray(payload?.mediaIds)
      ? payload.mediaIds.filter((item): item is string => typeof item === "string")
      : [];
    const expectedEducationMedia = expectation.educationMedia ?? [];
    const references = edition?.publishedRevisionId && mediaIds.length > 0
      ? await db.select({
          assetId: cmsMediaReferencesTable.assetId,
          mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
           assetStatus: cmsMediaAssetsTable.status,
          assetChecksum: cmsMediaAssetsTable.checksum,
           storageKey: cmsMediaVersionsTable.storageKey,
          versionChecksum: cmsMediaVersionsTable.checksum,
           versionMetadata: cmsMediaVersionsTable.metadata,
        }).from(cmsMediaReferencesTable)
          .innerJoin(cmsMediaAssetsTable, eq(cmsMediaAssetsTable.id, cmsMediaReferencesTable.assetId))
          .innerJoin(cmsMediaVersionsTable, eq(cmsMediaVersionsTable.id, cmsMediaReferencesTable.mediaVersionId))
          .where(and(
          eq(cmsMediaReferencesTable.documentId, receipt.subjectId),
          eq(cmsMediaReferencesTable.fieldPath, `revision:${edition.publishedRevisionId}`),
        ))
      : [];
    const referenceByAssetId = new Map(references.map((reference) => [reference.assetId, reference]));
    const imagery = payload?.content?.educationPov?.imagery;
    const selectedReferences = [
      payload?.content?.heroMedia,
      ...(imagery?.educatorPractice?.media ? [imagery.educatorPractice.media] : []),
      ...(imagery?.researchCoordination?.media ? [imagery.researchCoordination.media] : []),
    ];
    const publishedPinsHaveStrictMetadata = Boolean(
      mediaIds.length > 0
      && references.length === mediaIds.length
      && new Set(references.map((reference) => reference.assetId)).size === mediaIds.length
      && selectedReferences.length === mediaIds.length
      && selectedReferences.every((selected, index) => {
        const pinned = selected && typeof selected.mediaId === "string"
          ? referenceByAssetId.get(selected.mediaId)
          : undefined;
        const metadata = pinned?.versionMetadata as Record<string, unknown> | null | undefined;
        return selected?.mediaId === mediaIds[index]
          && selected?.mediaVersionId === pinned?.mediaVersionId
          && selected?.role === (index === 0 ? "hero" : "supporting")
          && (pinned?.assetStatus === "active" || pinned?.assetStatus === "ready")
          && pinned?.assetChecksum === pinned?.versionChecksum
          && typeof pinned?.storageKey === "string"
          && !pinned.storageKey.startsWith("deferred/")
          && metadata?.accessibilityStatus === "approved"
          && metadata?.rightsStatus === "approved-use";
      }),
    );
    const hasExactPins = expectedEducationMedia.length === mediaIds.length
      && mediaIds.length === expectedEducationMedia.length
      && selectedReferences.length === expectedEducationMedia.length
      && selectedReferences.every((selected, index) => {
        const pinned = selected && typeof selected.mediaId === "string"
          ? referenceByAssetId.get(selected.mediaId)
          : undefined;
        return selected?.mediaId === mediaIds[index]
          && selected?.mediaVersionId === pinned?.mediaVersionId
          && selected?.role === (index === 0 ? "hero" : "supporting")
          && pinned?.assetChecksum === expectedEducationMedia[index]!.checksum
          && pinned?.versionChecksum === expectedEducationMedia[index]!.checksum;
      });
    const publishedComplete = Boolean(
      edition?.publicationState === "published"
      && edition.publishedRevisionId
      && publishedRevision?.workflowState === "approved"
      && payload?.content?.educationPov?.version === 2
      && payload.seo?.title === EDUCATION_SUCCESSOR_SEO.title
      && payload.seo?.description === EDUCATION_SUCCESSOR_SEO.description
      && payload.content.heroMediaId === mediaIds[0]
      && hasExactPins,
    );
    const publishedAuthority = Boolean(
      edition?.publicationState === "published"
      && edition.publishedRevisionId
      && publishedRevision?.workflowState === "approved"
      && publishedPinsHaveStrictMetadata
      && validateCmsSnapshot("industry", publishedRevision.payload, "publish").success,
    );
    const authoritativePayload = receipt.operation === "cms.inventory.education-successor-pending-cutover"
      ? (publishedComplete ? publishedRevision?.payload : successorRevision?.payload)
      : receipt.operation === "cms.inventory.import"
        ? latestRevision?.payload
        : publishedRevision?.payload;
    const normalizedPayload = authoritativePayload
      ? JSON.parse(JSON.stringify(authoritativePayload)) as {
          mediaIds?: unknown[];
          content?: Record<string, unknown>;
        }
      : undefined;
    if (normalizedPayload) {
      normalizeEducationMediaPayload(normalizedPayload, {
        image: expectation.expectedImage,
        imageAlt: expectation.expectedImageAlt,
      });
    }
    const requiresEducationSuccessorRecovery = Boolean(
      receipt.operation === "cms.inventory.industry-contract-editorial-preserved"
      && edition?.publishedRevisionId
      && latestRevision?.id === edition.publishedRevisionId
      && latestRevision.workflowState === "approved"
      && isKnownEducationSuccessorAuthorityDigest(
        normalizedPayload ? canonicalResultDigest(normalizedPayload) : undefined,
      ),
    );
    const exactPayload = Boolean(
      normalizedPayload
      && expectation.expectedNormalizedPayloadDigest
      && canonicalResultDigest(normalizedPayload) === expectation.expectedNormalizedPayloadDigest,
    );
    const outcome = educationReconciliationOutcome({
      receiptOperation: receipt.operation,
      publishedComplete,
      exactPayload,
      publishedAuthority,
      freshDraftComplete: Boolean(
        receipt.operation === "cms.inventory.education-successor-pending-cutover"
          ? successorRevision?.workflowState === "draft"
          : edition?.publicationState === "draft"
            && !edition.publishedRevisionId
            && latestRevision?.workflowState === "draft"
      ),
      hasLiveRevision: Boolean(latestRevision),
    });
    if (!outcome.valid) {
      invalid.push(`${receipt.idempotencyKey}: ${outcome.message}`);
    } else {
      educationCutoverPending ||= outcome.status === "pending-cutover"
        || requiresEducationSuccessorRecovery;
      educationOutcomes.push({
        idempotencyKey: receipt.idempotencyKey,
        status: outcome.status!,
        message: outcome.message,
      });
    }
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
    if (!mediaVersionIsExactCurrent({
      asset,
      version,
      expected: {
        checksum: operation.media.checksum,
        byteSize: operation.media.byteSize,
        mediaType: operation.media.mimeType,
      },
    })) {
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
    state: missingCount === 0
      && invalid.length === 0
      && conflicts.length === 0
      && !educationCutoverPending
      ? "complete" as const
      : "pending" as const,
    existingCount,
    missingCount,
    conflicts,
    invalid,
    educationOutcomes,
    educationCutoverPending,
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
  const mediaOperations = mediaMigrationOperations(inventory.records);
  for (const operation of migrationOperations(inventory.records)) {
    const educationSuccessor = isEducationSuccessorOperation(operation);
    const normalizedOperationPayload = JSON.parse(JSON.stringify(operation.payload)) as {
      mediaIds?: unknown[];
      content?: Record<string, unknown>;
    };
    if (educationSuccessor) normalizeEducationMediaPayload(normalizedOperationPayload);
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "document",
      // Versioned industry baselines receive a new receipt. If an earlier
      // edition has subsequent revisions, import records a preservation
      // receipt rather than replacing that editorial history.
      tolerateDigestDrift: toleratesDocumentReceiptDigestDrift(
        operation,
        governedLegacyExternalIds,
      ),
      publishEducationSuccessor: educationSuccessor,
      expectedNormalizedPayloadDigest: educationSuccessor
        ? canonicalResultDigest(normalizedOperationPayload)
        : undefined,
      expectedImage: educationSuccessor
        ? (normalizedOperationPayload.content as Record<string, unknown> | undefined)?.image
        : undefined,
      expectedImageAlt: educationSuccessor
        ? (normalizedOperationPayload.content as Record<string, unknown> | undefined)?.imageAlt
        : undefined,
      educationMedia: educationSuccessor
        ? operation.mediaPaths.map((publicPath) => {
            const media = mediaOperations.find((candidate) => candidate.publicPath === publicPath);
            if (!media) throw new Error(`Education successor media is missing ${publicPath}.`);
            return media;
          })
        : undefined,
      publishCase: Boolean(operation.kind === "case-study"
        && operation.mediaPaths.length === 1
        && operation.payload.content
        && (operation.payload.content as Record<string, unknown>).variant === "summary"
        && (operation.payload.content as Record<string, unknown>).disclosure === "anonymized"
        && (operation.payload.content as Record<string, unknown>).publicEvidenceStatus === "approved"),
    });
    if (educationSuccessor) {
      const version = educationSuccessorVersion(operation.idempotencyKey);
      if (!version) throw new Error(`Invalid Education successor operation key: ${operation.idempotencyKey}`);
      expected.set(educationSuccessorRecoveryKey(operation.externalId, version), {
        requestDigest: operation.requestDigest,
        subjectType: "document",
        optional: true,
        publishEducationSuccessor: true,
        expectedNormalizedPayloadDigest: canonicalResultDigest(normalizedOperationPayload),
          expectedImage: (normalizedOperationPayload.content as Record<string, unknown> | undefined)?.image,
          expectedImageAlt: (normalizedOperationPayload.content as Record<string, unknown> | undefined)?.imageAlt,
        educationMedia: operation.mediaPaths.map((publicPath) => {
          const media = mediaOperations.find((candidate) => candidate.publicPath === publicPath);
          if (!media) throw new Error(`Education successor media is missing ${publicPath}.`);
          return media;
        }),
      });
    }
  }
  for (const operation of mediaOperations
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
    for (const outcome of before.educationOutcomes) {
      console.log(`Education reconciliation ${outcome.status}: ${outcome.message} (${outcome.idempotencyKey}).`);
    }
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
        for (const outcome of next.educationOutcomes) {
          console.log(`Education reconciliation ${outcome.status}: ${outcome.message} (${outcome.idempotencyKey}).`);
        }
        if (next.conflicts.length) {
          const details = next.conflicts
            .map((conflict) => `${conflict.idempotencyKey} (stored ${conflict.actualDigest}, inventory ${conflict.expectedDigest})`)
            .join("; ");
          console.warn(
            `CMS reconciliation preserved ${next.conflicts.length} previously imported operation(s) whose inventory changed. Resolve each intentional replacement with an explicitly versioned operation: ${details}`,
          );
        }
        if (
          next.conflicts.length > 0
          || next.missingCount > 0
          || next.invalid.length > 0
          || (next.state !== "complete" && !next.educationCutoverPending)
        ) {
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
    const final = await inspectReconciliationState(expected, database);
    if (final.state !== "complete") {
      throw new Error(
        `CMS post-publication reconciliation became incomplete: missing=${final.missingCount} invalid=${final.invalid.length} conflicts=${final.conflicts.length}. ${final.invalid.join("; ")}`,
      );
    }
    for (const outcome of final.educationOutcomes) {
      console.log(`Education reconciliation ${outcome.status}: ${outcome.message} (${outcome.idempotencyKey}).`);
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
