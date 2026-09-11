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
  canonicalResultDigest,
  matchesGovernedCutoverSource,
  industryBaselineAction,
  educationSuccessorAction,
  educationSuccessorRecoveryKey,
  educationSuccessorVersion,
  financialServicesPunctuationReconciliationPlan,
  isEducationSuccessorOperation,
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
import {
  mediaMetadataUpdate,
  mediaReviewStatusUpdate,
  mediaVersionIsExactCurrent,
  shouldUpdateMediaMetadata,
} from "./media-metadata.js";
import {
  mediaRefreshReceiptDigestIsAccepted,
  resolveMediaImportAssetId,
  resolveMissingLegacyMediaSubjectRecoveryId,
} from "./media-import-lineage.js";
import { PUBLIC_MARKET_BASELINE } from "./market-baseline.js";
import {
  caseMediaRefreshKey,
  casePublicationRefreshKey,
  caseRefreshDigest,
  caseRefreshAssetBinaryUpdate,
  assessCaseMediaPin,
  hasExactCasePublicationPin,
  hasExpectedCaseVisual,
  mergePublishedCaseVisualPayload,
  historicalCasePinReceiptIsValid,
  planCasePublicationRefreshEntry,
  planCaseVisualRefresh,
} from "./case-visual-refresh.js";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldApplyDatabase = args.includes("--apply-db");
const deferMediaUpload = args.includes("--defer-media-upload");
const input = args.find((argument) => argument.startsWith("--in="))?.slice(5) ?? "scripts/cms/output/inventory.json";
const destination = args.find((argument) => argument.startsWith("--out="))?.slice(6);
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

const EDUCATION_V11_OPERATION_PREFIX = "cms-industry-education-successor-v11:";
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
      await tx.insert(marketEditionsTable).values(
        PUBLIC_MARKET_BASELINE.map((market) => ({ ...market })),
      ).onConflictDoNothing({ target: marketEditionsTable.code });
      const configuredMarkets = await tx.select().from(marketEditionsTable);
      const configuredMarketByCode = new Map(configuredMarkets.map((market) => [market.code, market]));
      for (const expected of PUBLIC_MARKET_BASELINE) {
        const actual = configuredMarketByCode.get(expected.code);
        if (!actual
          || actual.displayName !== expected.displayName
          || actual.defaultLocale !== expected.defaultLocale
          || actual.fallbackMarketCode !== expected.fallbackMarketCode
          || actual.fallbackLocale !== expected.fallbackLocale
          || actual.isCanonical !== expected.isCanonical
          || actual.enabled !== expected.enabled) {
          throw new Error(`Existing ${expected.code} market configuration conflicts with the governed public market baseline.`);
        }
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
      const governedCaseByMediaPath = new Map(operations.flatMap((operation) =>
        operation.kind === "case-study" && operation.mediaPaths.length === 1
          ? [[operation.mediaPaths[0], operation] as const]
          : []
      ));
      let mediaCreated = 0;
      let mediaReplayed = 0;
      let mediaRepaired = 0;
      for (const operation of mediaOperations.filter((item) => item.cmsOwnership === "cms-candidate")) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        const historicalReceipts: Array<{
          receipt: typeof receipt;
          acceptedDigests: string[];
        }> = [];
        for (const expectedHistorical of operation.historicalReceipts) {
          const [historicalReceipt] = await tx.select().from(cmsOperationReceiptsTable)
            .where(eq(
              cmsOperationReceiptsTable.idempotencyKey,
              expectedHistorical.idempotencyKey,
            ));
          if (historicalReceipt) {
            historicalReceipts.push({
              receipt: historicalReceipt,
              acceptedDigests: expectedHistorical.acceptedRequestDigests,
            });
          }
        }
        const durableStorageKey = storageKeys.get(operation.publicPath);
        if (!durableStorageKey || durableStorageKey.startsWith("deferred/")) {
          throw new Error(`No verified durable object is available for ${operation.publicPath}.`);
        }
        const lineageAssetId = resolveMediaImportAssetId({
          currentReceipt: receipt,
          historicalReceipts,
        });
        let [asset] = lineageAssetId
          ? await tx.select().from(cmsMediaAssetsTable)
            .where(eq(cmsMediaAssetsTable.id, lineageAssetId))
          : await tx.select().from(cmsMediaAssetsTable)
            .where(eq(cmsMediaAssetsTable.checksum, operation.checksum));
        if (lineageAssetId && !asset) {
          const recoveryAssetId = resolveMissingLegacyMediaSubjectRecoveryId({
            currentReceipt: receipt,
            historicalReceipts,
          });
          if (recoveryAssetId !== lineageAssetId) {
            throw new Error(`${operation.externalId}: media receipt subject recovery is inconsistent.`);
          }
          console.warn(`${operation.externalId}: restoring the missing subject of one accepted legacy media receipt.`);
        }
        const governedCase = governedCaseByMediaPath.get(operation.publicPath);
        const refreshKey = governedCase
          ? caseMediaRefreshKey(operation.externalId, operation.checksum)
          : undefined;
        const [refreshReceipt] = refreshKey
          ? await tx.select().from(cmsOperationReceiptsTable)
            .where(eq(cmsOperationReceiptsTable.idempotencyKey, refreshKey))
          : [];
        if (refreshReceipt && (
          refreshReceipt.subjectId !== String(asset?.id)
          || !mediaRefreshReceiptDigestIsAccepted({
            actualDigest: refreshReceipt.requestDigest,
            currentDigest: operation.requestDigest,
            acceptedPriorDigests: operation.acceptedPriorRequestDigests,
          })
        )) throw new Error(`${operation.externalId}: governed media refresh receipt conflicts with the current operation.`);
        const approvedCaseRefresh = Boolean(
          governedCase
          && operation.sourceReviewApproved
          && operation.rightsStatus === "approved-use"
          && operation.accessibilityStatus !== "needs-review",
        );
        if (receipt && receipt.requestDigest !== operation.requestDigest) {
          const binaryStillMatches = asset
            && asset.checksum === operation.checksum
            && asset.byteSize === operation.byteSize
            && asset.mediaType === operation.mimeType;
          if (!binaryStillMatches) {
            if (!approvedCaseRefresh) {
              console.error(`Preserving previously imported media for ${operation.externalId}; the inventory digest and binary identity changed.`);
              mediaByPath.set(operation.publicPath, receipt.subjectId);
              mediaReplayed++;
              continue;
            }
          } else if (!refreshReceipt) {
            console.warn(`Reusing matching media binary for ${operation.externalId} while preserving its earlier inventory receipt digest.`);
          }
        }
        let assetCreated = false;
        if (!asset) {
          [asset] = await tx.insert(cmsMediaAssetsTable).values({
            ...(lineageAssetId ? { id: lineageAssetId } : {}),
            storageKey: durableStorageKey,
            filename: operation.filename,
            originalFilename: operation.filename,
            mediaType: operation.mimeType,
            byteSize: operation.byteSize,
            checksum: operation.checksum,
            ...mediaMetadataUpdate(operation),
            status: approvedCaseRefresh ? "active" : "pending-review",
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
              accessibilityStatus: approvedCaseRefresh ? "approved" : "needs-review",
              rightsStatus: approvedCaseRefresh ? "approved-use" : "needs-review",
              ...(approvedCaseRefresh ? {
                sourceReview: "approved",
                governedRefreshKey: refreshKey,
              } : {}),
            },
          });
          assetCreated = true;
          mediaCreated++;
        } else {
          const [latestVersion] = await tx.select().from(cmsMediaVersionsTable)
            .where(eq(cmsMediaVersionsTable.assetId, asset.id))
            .orderBy(desc(cmsMediaVersionsTable.versionNumber))
            .limit(1);
          const durableVersionIsCurrent = mediaVersionIsExactCurrent({
            asset,
            version: latestVersion,
            expected: {
              checksum: operation.checksum,
              byteSize: operation.byteSize,
              mediaType: operation.mimeType,
            },
          });
          const refreshPlan = approvedCaseRefresh
            ? planCaseVisualRefresh({
                receiptExists: Boolean(refreshReceipt),
                currentVersionNumber: latestVersion?.versionNumber ?? 0,
                currentChecksum: latestVersion?.checksum ?? "",
                expectedChecksum: operation.checksum,
                currentImmutableVersionValid: Boolean(
                  latestVersion
                  && latestVersion.checksum === asset.checksum
                  && latestVersion.byteSize === asset.byteSize
                  && !latestVersion.storageKey.startsWith("deferred/"),
                ),
                sourceReviewApproved: operation.sourceReviewApproved === true,
                rightsApproved: operation.rightsStatus === "approved-use",
                accessibilityApproved: operation.accessibilityStatus !== "needs-review",
                publicationValid: true,
                evidenceApproved: true,
              })
            : null;
          if (refreshPlan?.action === "fail") {
            throw new Error(`${operation.externalId}: ${refreshPlan.reason}.`);
          }
          if (refreshPlan?.action === "append" || (!approvedCaseRefresh && shouldUpdateMediaMetadata({
            assetExists: true,
            immutableVersionIsCurrent: Boolean(durableVersionIsCurrent),
          }))) {
            await tx.insert(cmsMediaVersionsTable).values({
              assetId: asset.id,
              versionNumber: refreshPlan?.action === "append"
                ? refreshPlan.nextVersionNumber
                : (latestVersion?.versionNumber ?? 0) + 1,
              storageKey: durableStorageKey,
              checksum: operation.checksum,
              byteSize: operation.byteSize,
              width: operation.width,
              height: operation.height,
              metadata: approvedCaseRefresh ? {
                ...(latestVersion?.metadata as Record<string, unknown> | null),
                sourcePath: operation.publicPath,
                accessibilityStatus: "approved",
                rightsStatus: "approved-use",
                sourceReview: "approved",
                governedRefreshKey: refreshKey,
              } : {
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
              ...caseRefreshAssetBinaryUpdate({
                storageKey: durableStorageKey,
                mediaType: operation.mimeType,
                byteSize: operation.byteSize,
                checksum: operation.checksum,
              }),
              ...(!approvedCaseRefresh ? mediaMetadataUpdate(operation) : {}),
              ...mediaReviewStatusUpdate({
                exactCurrentVersion: durableVersionIsCurrent,
                explicitlyApproved: approvedCaseRefresh,
              }),
              updatedAt: new Date(),
            }).where(eq(cmsMediaAssetsTable.id, asset.id));
            if (approvedCaseRefresh && refreshKey) {
              await tx.insert(cmsOperationReceiptsTable).values({
                idempotencyKey: refreshKey,
                operation: "cms.inventory.case-media-version-refreshed",
                subjectId: String(asset.id),
                requestDigest: operation.requestDigest,
                resultDigest: resultDigest({ mediaId: asset.id, checksum: operation.checksum }),
              });
              await tx.insert(cmsAuditEventsTable).values({
                actorUserId: serviceAccount.id,
                actorLabel: "cms-inventory-migration",
                action: "cms.inventory.case-media-version-refreshed",
                targetType: "media",
                targetId: String(asset.id),
                requestId: refreshKey,
                metadata: {
                  sourcePath: operation.publicPath,
                  priorMediaVersionId: latestVersion?.id,
                  checksum: operation.checksum,
                },
              });
            }
            mediaRepaired++;
          } else {
            mediaReplayed++;
          }
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
        if (approvedCaseRefresh && refreshKey && assetCreated) {
          await tx.insert(cmsOperationReceiptsTable).values({
            idempotencyKey: refreshKey,
            operation: "cms.inventory.case-media-version-refreshed",
            subjectId: String(asset.id),
            requestDigest: operation.requestDigest,
            resultDigest: resultDigest({ mediaId: asset.id, checksum: operation.checksum }),
          });
          await tx.insert(cmsAuditEventsTable).values({
            actorUserId: serviceAccount.id,
            actorLabel: "cms-inventory-migration",
            action: "cms.inventory.case-media-version-refreshed",
            targetType: "media",
            targetId: String(asset.id),
            requestId: refreshKey,
            metadata: {
              sourcePath: operation.publicPath,
              priorMediaVersionId: null,
              checksum: operation.checksum,
            },
          });
        }
      }

      for (const operation of operations.filter((item) =>
        item.kind === "case-study" && item.mediaPaths.length === 1
      )) {
        const [publicationReceipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        if (publicationReceipt?.operation !== "cms.inventory.case-study-summary-published") continue;
        const mediaOperation = mediaOperations.find((item) =>
          item.publicPath === operation.mediaPaths[0] && item.cmsOwnership === "cms-candidate"
        );
        if (!mediaOperation
          || !mediaOperation.sourceReviewApproved
          || mediaOperation.rightsStatus !== "approved-use"
          || mediaOperation.accessibilityStatus === "needs-review") {
          throw new Error(`${operation.externalId}: published case media no longer passes governance gates.`);
        }
        const mediaId = mediaByPath.get(mediaOperation.publicPath);
        if (!mediaId) throw new Error(`${operation.externalId}: published case media is unavailable.`);
        const [document] = await tx.select({
          id: cmsDocumentsTable.id,
          kind: cmsDocumentsTable.kind,
        }).from(cmsDocumentsTable)
          .where(eq(cmsDocumentsTable.id, publicationReceipt.subjectId));
        if (!document || document.kind !== "case-study") {
          throw new Error(`${operation.externalId}: published case receipt subject is invalid.`);
        }
        const [edition] = await tx.select({
          id: cmsMarketEditionsTable.id,
          publicationState: cmsMarketEditionsTable.publicationState,
          publishedRevisionId: cmsMarketEditionsTable.publishedRevisionId,
        }).from(cmsMarketEditionsTable).where(and(
          eq(cmsMarketEditionsTable.documentId, document.id),
          eq(cmsMarketEditionsTable.market, "uae"),
        ));
        if (!edition || edition.publicationState !== "published" || !edition.publishedRevisionId) {
          throw new Error(`${operation.externalId}: published case edition is incomplete.`);
        }
        const [publishedRevision] = await tx.select({
          id: cmsRevisionsTable.id,
          payload: cmsRevisionsTable.payload,
          workflowState: cmsRevisionsTable.workflowState,
        }).from(cmsRevisionsTable)
          .where(eq(cmsRevisionsTable.id, edition.publishedRevisionId));
        const readiness = publishedRevision
          ? validateCmsSnapshot("case-study", publishedRevision.payload, "publish")
          : null;
        const publishedPayload = publishedRevision?.payload as {
          mediaIds?: unknown[];
        } | undefined;
        if (!publishedRevision
          || publishedRevision.workflowState !== "approved"
          || !readiness?.success
          || !Array.isArray(publishedPayload?.mediaIds)
          || publishedPayload.mediaIds.length !== 1) {
          throw new Error(`${operation.externalId}: published case snapshot is not repairable.`);
        }
        // A newly commissioned asset deliberately has a new asset identity.
        // Its immutable version is created above, then the publication-refresh
        // pass below appends a revision and switches the published pin. Do not
        // try to repair the old revision as if it already referenced the new
        // asset; that would either fail or overwrite its immutable history.
        if (publishedPayload.mediaIds[0] !== mediaId) continue;
        const references = await tx.select({
          assetId: cmsMediaReferencesTable.assetId,
          mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
        }).from(cmsMediaReferencesTable).where(and(
          eq(cmsMediaReferencesTable.documentId, document.id),
          eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision.id}`),
        ));
        const [pinnedVersion] = references.length === 1 && references[0].mediaVersionId
          ? await tx.select({
            id: cmsMediaVersionsTable.id,
            assetId: cmsMediaVersionsTable.assetId,
            checksum: cmsMediaVersionsTable.checksum,
            storageKey: cmsMediaVersionsTable.storageKey,
          }).from(cmsMediaVersionsTable).where(and(
            eq(cmsMediaVersionsTable.id, references[0].mediaVersionId),
            eq(cmsMediaVersionsTable.assetId, mediaId),
          ))
          : [];
        const pinState = assessCaseMediaPin({
          expectedAssetId: String(mediaId),
          expectedChecksum: mediaOperation.checksum,
          references: references.map((reference) => ({
            assetId: String(reference.assetId),
            mediaVersionId: reference.mediaVersionId ? String(reference.mediaVersionId) : null,
          })),
          pinnedVersion: pinnedVersion ? {
            id: String(pinnedVersion.id),
            assetId: String(pinnedVersion.assetId),
            checksum: pinnedVersion.checksum,
            storageKey: pinnedVersion.storageKey,
          } : null,
        });
        if (pinState === "valid") continue;
        if (pinState === "historical" && pinnedVersion) {
          const priorRefreshKey = casePublicationRefreshKey(
            mediaOperation.externalId,
            pinnedVersion.checksum,
          );
          const priorRefreshDigest = caseRefreshDigest({
            externalId: operation.externalId,
            checksum: pinnedVersion.checksum,
          });
          const [priorRefreshReceipt] = await tx.select({
            requestDigest: cmsOperationReceiptsTable.requestDigest,
            subjectId: cmsOperationReceiptsTable.subjectId,
          }).from(cmsOperationReceiptsTable)
            .where(eq(cmsOperationReceiptsTable.idempotencyKey, priorRefreshKey));
          if (historicalCasePinReceiptIsValid({
            receiptRequestDigest: priorRefreshReceipt?.requestDigest ?? null,
            expectedRequestDigest: priorRefreshDigest,
            receiptSubjectId: priorRefreshReceipt?.subjectId ?? null,
            publishedRevisionId: String(publishedRevision.id),
          })) continue;
        }
        if (pinState === "conflict") {
          throw new Error(`${operation.externalId}: published case has a conflicting media reference.`);
        }
        if (pinState === "historical") {
          throw new Error(`${operation.externalId}: published case has an unreceipted historical media reference.`);
        }
        const [mediaVersion] = await tx.select({
          id: cmsMediaVersionsTable.id,
          metadata: cmsMediaVersionsTable.metadata,
        }).from(cmsMediaVersionsTable).where(and(
          eq(cmsMediaVersionsTable.assetId, mediaId),
          eq(cmsMediaVersionsTable.checksum, mediaOperation.checksum),
        )).orderBy(desc(cmsMediaVersionsTable.versionNumber)).limit(1);
        if (!mediaVersion) {
          throw new Error(`${operation.externalId}: published case immutable media version is missing.`);
        }
        const repairKey =
          `cms-case-study-pin-repair-v1:${operation.externalId}:${mediaOperation.checksum}`;
        const repairDigest = resultDigest({
          documentId: document.id,
          revisionId: publishedRevision.id,
          mediaId,
          mediaVersionId: mediaVersion.id,
          checksum: mediaOperation.checksum,
        });
        const [repairReceipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, repairKey));
        if (repairReceipt) {
          throw new Error(`${operation.externalId}: published case pin repair receipt conflicts.`);
        }
        await tx.insert(cmsMediaReferencesTable).values({
          assetId: mediaId,
          mediaVersionId: mediaVersion.id,
          documentId: document.id,
          fieldPath: `revision:${publishedRevision.id}`,
        });
        await tx.update(cmsMediaAssetsTable).set({
          status: "active",
          updatedAt: new Date(),
        }).where(eq(cmsMediaAssetsTable.id, mediaId));
        await tx.update(cmsMediaVersionsTable).set({
          metadata: {
            ...(mediaVersion.metadata as Record<string, unknown> | null),
            accessibilityStatus: "approved",
            rightsStatus: "approved-use",
            sourceReview: "approved",
          },
        }).where(eq(cmsMediaVersionsTable.id, mediaVersion.id));
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: repairKey,
          operation: "cms.inventory.case-study-pin-repaired",
          subjectId: String(document.id),
          requestDigest: repairDigest,
          resultDigest: repairDigest,
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id,
          actorLabel: "cms-inventory-migration",
          action: "cms.inventory.case-study-pin-repaired",
          targetType: "case-study",
          targetId: String(document.id),
          requestId: repairKey,
          metadata: {
            revisionId: String(publishedRevision.id),
            mediaId,
            mediaVersionId: String(mediaVersion.id),
            sourcePath: mediaOperation.publicPath,
          },
        });
      }

      for (const operation of operations.filter((item) =>
        item.kind === "case-study" && item.mediaPaths.length === 1
      )) {
        const resolvedPayload = resolveMigrationMedia(operation, mediaByPath);
        const mediaOperation = mediaOperations.find((item) =>
          item.publicPath === operation.mediaPaths[0] && item.cmsOwnership === "cms-candidate"
        );
        if (!mediaOperation) throw new Error(`${operation.externalId}: governed case visual is missing.`);
        const publicationRefreshKey = casePublicationRefreshKey(
          mediaOperation.externalId,
          mediaOperation.checksum,
        );
        const refreshDigest = caseRefreshDigest({
          externalId: operation.externalId,
          checksum: mediaOperation.checksum,
        });
        const [existingRefresh] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, publicationRefreshKey));
        const [document] = await tx.select({
          id: cmsDocumentsTable.id,
          kind: cmsDocumentsTable.kind,
        }).from(cmsDocumentsTable).where(eq(cmsDocumentsTable.canonicalSlug, operation.slug));
        const entryPlan = planCasePublicationRefreshEntry({
          refreshReceiptDigest: existingRefresh?.requestDigest ?? null,
          expectedRefreshDigest: refreshDigest,
          documentKind: document?.kind ?? null,
        });
        if (entryPlan.action === "fail") throw new Error(`${operation.externalId}: ${entryPlan.reason}.`);
        if (entryPlan.action === "fresh-install") continue;
        const [edition] = await tx.select().from(cmsMarketEditionsTable).where(and(
          eq(cmsMarketEditionsTable.documentId, document.id),
          eq(cmsMarketEditionsTable.market, "uae"),
        ));
        if (!edition || edition.publicationState !== "published" || !edition.publishedRevisionId) {
          throw new Error(`${operation.externalId}: current case publication gate failed.`);
        }
        const [publishedRevision] = await tx.select().from(cmsRevisionsTable)
          .where(eq(cmsRevisionsTable.id, edition.publishedRevisionId));
        const validation = publishedRevision
          ? validateCmsSnapshot("case-study", publishedRevision.payload, "publish")
          : null;
        const replacementValidation = validateCmsSnapshot("case-study", resolvedPayload, "publish");
        if (!replacementValidation.success) {
          throw new Error(`${operation.externalId}: replacement case payload failed publication validation.`);
        }
        const publishedPayload = validation?.success ? validation.data : null;
        const content = publishedPayload?.content as Record<string, unknown> | undefined;
        const evidence = content?.evidence;
        const evidenceApproved = content?.variant === "summary"
          && content.disclosure === "anonymized"
          && content.publicEvidenceStatus === "approved"
          && Array.isArray(evidence)
          && evidence.length > 0
          && evidence.every((item) =>
            item && typeof item === "object" && (item as Record<string, unknown>).approved === true
          );
        const mediaId = publishedPayload?.mediaIds.length === 1 ? publishedPayload.mediaIds[0] : undefined;
        const [currentReference] = mediaId ? await tx.select({
          mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
        }).from(cmsMediaReferencesTable).where(and(
          eq(cmsMediaReferencesTable.documentId, document.id),
          eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision!.id}`),
          eq(cmsMediaReferencesTable.assetId, mediaId),
        )) : [];
        const [currentVersion] = currentReference?.mediaVersionId
          ? await tx.select().from(cmsMediaVersionsTable)
            .where(and(
              eq(cmsMediaVersionsTable.id, currentReference.mediaVersionId),
              eq(cmsMediaVersionsTable.assetId, mediaId!),
            ))
          : [];
        const targetMediaId = mediaByPath.get(operation.mediaPaths[0]);
        if (!targetMediaId) throw new Error(`${operation.externalId}: replacement cinematic media is unavailable.`);
        const [targetVersion] = await tx.select().from(cmsMediaVersionsTable)
          .where(and(
            eq(cmsMediaVersionsTable.assetId, targetMediaId),
            eq(cmsMediaVersionsTable.checksum, mediaOperation.checksum),
          ))
          .orderBy(desc(cmsMediaVersionsTable.versionNumber))
          .limit(1);
        const [targetAsset] = await tx.select({
          status: cmsMediaAssetsTable.status,
        }).from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, targetMediaId));
        const targetMetadata = targetVersion?.metadata as Record<string, unknown> | null;
        if (entryPlan.action === "replay") {
          const references = await tx.select({
            assetId: cmsMediaReferencesTable.assetId,
            mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
          }).from(cmsMediaReferencesTable).where(and(
            eq(cmsMediaReferencesTable.documentId, document.id),
            eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision?.id}`),
          ));
          const [pinnedVersion] = references.length === 1 && references[0].mediaVersionId
            ? await tx.select({
              id: cmsMediaVersionsTable.id,
              assetId: cmsMediaVersionsTable.assetId,
              checksum: cmsMediaVersionsTable.checksum,
              storageKey: cmsMediaVersionsTable.storageKey,
            }).from(cmsMediaVersionsTable)
              .where(eq(cmsMediaVersionsTable.id, references[0].mediaVersionId))
            : [];
          const replayGovernanceValid = Boolean(
            publishedRevision?.workflowState === "approved"
            && validation?.success
            && evidenceApproved
            && targetAsset?.status === "active"
            && mediaOperation.sourceReviewApproved === true
            && targetMetadata?.rightsStatus === "approved-use"
            && targetMetadata?.accessibilityStatus === "approved"
            && targetVersion
            && hasExpectedCaseVisual(
              publishedPayload as Record<string, unknown>,
              replacementValidation.data as Record<string, unknown>,
            )
            && hasExactCasePublicationPin({
              expectedAssetId: targetMediaId,
              expectedMediaVersionId: String(targetVersion?.id),
              expectedChecksum: mediaOperation.checksum,
              mediaIds: publishedPayload?.mediaIds,
              references: references.map((reference) => ({
                assetId: String(reference.assetId),
                mediaVersionId: reference.mediaVersionId ? String(reference.mediaVersionId) : null,
              })),
              pinnedVersion: pinnedVersion ? {
                id: String(pinnedVersion.id),
                assetId: String(pinnedVersion.assetId),
                checksum: pinnedVersion.checksum,
                storageKey: pinnedVersion.storageKey,
              } : null,
            })
          );
          if (!replayGovernanceValid) {
            throw new Error(`${operation.externalId}: receipted case visual replay does not match its exact approved publication pin.`);
          }
          continue;
        }
        const plan = planCaseVisualRefresh({
          receiptExists: false,
          currentVersionNumber: currentVersion?.versionNumber ?? 0,
          currentChecksum: currentVersion?.checksum ?? "",
          expectedChecksum: mediaOperation.checksum,
          currentImmutableVersionValid: Boolean(
            publishedRevision?.workflowState === "approved"
            && currentVersion
            && !currentVersion.storageKey.startsWith("deferred/")
          ),
          sourceReviewApproved: mediaOperation.sourceReviewApproved === true,
          rightsApproved: targetMetadata?.rightsStatus === "approved-use",
          accessibilityApproved: targetMetadata?.accessibilityStatus === "approved",
          publicationValid: Boolean(
            validation?.success && mediaId && targetVersion && targetMediaId && targetAsset?.status === "active"
          ),
          evidenceApproved,
        });
        if (plan.action === "fail") throw new Error(`${operation.externalId}: ${plan.reason}.`);
        if (plan.action === "replay") {
          const references = await tx.select({
            assetId: cmsMediaReferencesTable.assetId,
            mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
          }).from(cmsMediaReferencesTable).where(and(
            eq(cmsMediaReferencesTable.documentId, document.id),
            eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision?.id}`),
          ));
          const [pinnedVersion] = references.length === 1 && references[0].mediaVersionId
            ? await tx.select({
              id: cmsMediaVersionsTable.id,
              assetId: cmsMediaVersionsTable.assetId,
              checksum: cmsMediaVersionsTable.checksum,
              storageKey: cmsMediaVersionsTable.storageKey,
            }).from(cmsMediaVersionsTable)
              .where(eq(cmsMediaVersionsTable.id, references[0].mediaVersionId))
            : [];
          if (
            !hasExpectedCaseVisual(
              publishedPayload as Record<string, unknown>,
              replacementValidation.data as Record<string, unknown>,
            )
            || !hasExactCasePublicationPin({
              expectedAssetId: targetMediaId,
              expectedMediaVersionId: String(targetVersion?.id),
              expectedChecksum: mediaOperation.checksum,
              mediaIds: publishedPayload?.mediaIds,
              references: references.map((reference) => ({
                assetId: String(reference.assetId),
                mediaVersionId: reference.mediaVersionId ? String(reference.mediaVersionId) : null,
              })),
              pinnedVersion: pinnedVersion ? {
                id: String(pinnedVersion.id),
                assetId: String(pinnedVersion.assetId),
                checksum: pinnedVersion.checksum,
                storageKey: pinnedVersion.storageKey,
              } : null,
            })
          ) {
            throw new Error(`${operation.externalId}: unchanged binary replay does not match its exact approved visual and immutable pin.`);
          }
          continue;
        }
        const [latestRevision] = await tx.select({ revisionNumber: cmsRevisionsTable.revisionNumber })
          .from(cmsRevisionsTable)
          .where(eq(cmsRevisionsTable.editionId, edition.id))
          .orderBy(desc(cmsRevisionsTable.revisionNumber))
          .limit(1);
        const copiedPayload = mergePublishedCaseVisualPayload(
          publishedPayload as Record<string, unknown>,
          replacementValidation.data as Record<string, unknown>,
          targetMediaId,
        );
        const mergedValidation = validateCmsSnapshot("case-study", copiedPayload, "publish");
        if (!mergedValidation.success) {
          throw new Error(`${operation.externalId}: merged visual refresh payload failed publication validation.`);
        }
        const [newRevision] = await tx.insert(cmsRevisionsTable).values({
          editionId: edition.id,
          revisionNumber: (latestRevision?.revisionNumber ?? 0) + 1,
          payloadVersion: publishedRevision!.payloadVersion,
          payload: mergedValidation.data,
          contentDigest: resultDigest(mergedValidation.data),
          workflowState: "approved",
          createdByUserId: serviceAccount.id,
          approvedByUserId: serviceAccount.id,
          approvedAt: new Date(),
          reason: "Approved case-study narrative and governed visual refresh; prior revisions preserved.",
        }).returning({ id: cmsRevisionsTable.id });
        if (!newRevision || !targetVersion || !targetMediaId) throw new Error(`${operation.externalId}: refresh revision could not be created.`);
        await tx.insert(cmsMediaReferencesTable).values({
          assetId: targetMediaId,
          mediaVersionId: targetVersion.id,
          documentId: document.id,
          fieldPath: `revision:${newRevision.id}`,
        });
        await tx.update(cmsMarketEditionsTable).set({
          publishedRevisionId: newRevision.id,
          publishedAt: new Date(),
          updatedAt: new Date(),
        }).where(eq(cmsMarketEditionsTable.id, edition.id));
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: publicationRefreshKey,
          operation: "cms.inventory.case-visual-refresh-published",
          subjectId: String(newRevision.id),
          requestDigest: refreshDigest,
          resultDigest: resultDigest({
            documentId: document.id,
            priorRevisionId: publishedRevision!.id,
            revisionId: newRevision.id,
            mediaVersionId: targetVersion.id,
          }),
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id,
          actorLabel: "cms-inventory-migration",
          action: "cms.inventory.case-visual-refresh-published",
          targetType: "case-study",
          targetId: String(document.id),
          requestId: publicationRefreshKey,
          metadata: {
            priorRevisionId: String(publishedRevision!.id),
            revisionId: String(newRevision.id),
            priorMediaVersionId: String(currentVersion!.id),
            mediaVersionId: String(targetVersion.id),
            sourcePath: mediaOperation.publicPath,
          },
        });
      }

      let created = 0;
      let replayed = 0;
      for (const operation of operations) {
        const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        const educationVersion = isEducationSuccessorOperation(operation)
          ? educationSuccessorVersion(operation.idempotencyKey)
          : undefined;
        const educationRecoveryKey = educationVersion
          ? educationSuccessorRecoveryKey(operation.externalId, educationVersion)
          : undefined;
        const [educationRecoveryReceipt] = educationRecoveryKey
          ? await tx.select().from(cmsOperationReceiptsTable)
            .where(eq(cmsOperationReceiptsTable.idempotencyKey, educationRecoveryKey))
          : [];
        const canRecoverPreservedEducation = Boolean(
          educationRecoveryKey
          && receipt?.operation === "cms.inventory.industry-contract-editorial-preserved"
          && receipt.requestDigest === operation.requestDigest,
        );
        if (educationRecoveryReceipt) {
          if (
            !canRecoverPreservedEducation
            || educationRecoveryReceipt.operation !== "cms.inventory.education-successor-pending-cutover"
            || educationRecoveryReceipt.requestDigest !== operation.requestDigest
          ) {
            throw new Error(`${operation.externalId}: Education successor recovery receipt conflicts with the current operation.`);
          }
          replayed++;
          continue;
        }
        if (receipt) {
          if (!canRecoverPreservedEducation && receipt.requestDigest !== operation.requestDigest) {
            if (operation.kind === "case-study"
              && operation.idempotencyKey.startsWith("cms-case-study-baseline-v2:")) {
              // The v2 baseline digest covers editor-owned narrative fields.
              // Reconcile its immutable visual pin below instead of treating a
              // legitimate editor revision as a receipt conflict.
            } else {
              console.error(`Preserving previously imported document for ${operation.externalId}; the inventory digest changed.`);
              replayed++;
              continue;
            }
          }
          if (!canRecoverPreservedEducation && receipt.requestDigest === operation.requestDigest) {
            replayed++;
            continue;
          }
        }
        const [conflict] = await tx.select({ id: cmsDocumentsTable.id }).from(cmsDocumentsTable)
          .where(eq(cmsDocumentsTable.canonicalSlug, operation.slug));
        const resolvedPayload = resolveMigrationMedia(operation, mediaByPath);
        if (conflict) {
          if (operation.kind === "case-study" && operation.idempotencyKey.startsWith("cms-case-study-baseline-v2:")) {
            const readiness = validateCmsSnapshot("case-study", resolvedPayload, "publish");
            if (!readiness.success) throw new Error(`${operation.externalId}: governed replacement is not publishable.`);
            const [edition] = await tx.select({
              id: cmsMarketEditionsTable.id,
              publishedRevisionId: cmsMarketEditionsTable.publishedRevisionId,
              publicationState: cmsMarketEditionsTable.publicationState,
            }).from(cmsMarketEditionsTable).where(and(
              eq(cmsMarketEditionsTable.documentId, conflict.id),
              eq(cmsMarketEditionsTable.market, "uae"),
            ));
            if (!edition || edition.publicationState !== "published" || !edition.publishedRevisionId) {
              throw new Error(`${operation.externalId}: governed replacement requires an existing published edition.`);
            }
            const [publishedRevision] = await tx.select({
              id: cmsRevisionsTable.id,
              payload: cmsRevisionsTable.payload,
              workflowState: cmsRevisionsTable.workflowState,
            }).from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition.publishedRevisionId));
            const publishedValidation = publishedRevision
              ? validateCmsSnapshot("case-study", publishedRevision.payload, "publish")
              : null;
            const targetMediaId = operation.mediaPaths.length === 1
              ? mediaByPath.get(operation.mediaPaths[0])
              : undefined;
            const expectedMediaOperation = operation.mediaPaths.length === 1
              ? mediaOperations.find((item) =>
                item.publicPath === operation.mediaPaths[0] && item.cmsOwnership === "cms-candidate"
              )
              : undefined;
            const [targetVersion] = targetMediaId ? await tx.select({
              id: cmsMediaVersionsTable.id,
              assetId: cmsMediaVersionsTable.assetId,
              checksum: cmsMediaVersionsTable.checksum,
              storageKey: cmsMediaVersionsTable.storageKey,
            }).from(cmsMediaVersionsTable).where(and(
              eq(cmsMediaVersionsTable.assetId, targetMediaId),
              eq(cmsMediaVersionsTable.checksum, expectedMediaOperation?.checksum ?? ""),
            )).orderBy(desc(cmsMediaVersionsTable.versionNumber)).limit(1) : [];
            const references = publishedRevision ? await tx.select({
              assetId: cmsMediaReferencesTable.assetId,
              mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
            }).from(cmsMediaReferencesTable).where(and(
              eq(cmsMediaReferencesTable.documentId, conflict.id),
              eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision.id}`),
            )) : [];
            const [pinnedVersion] = references.length === 1 && references[0].mediaVersionId
              ? await tx.select({
                id: cmsMediaVersionsTable.id,
                assetId: cmsMediaVersionsTable.assetId,
                checksum: cmsMediaVersionsTable.checksum,
                storageKey: cmsMediaVersionsTable.storageKey,
              }).from(cmsMediaVersionsTable)
                .where(eq(cmsMediaVersionsTable.id, references[0].mediaVersionId))
              : [];
            if (
              !publishedRevision
              || publishedRevision.workflowState !== "approved"
              || !publishedValidation?.success
              || !targetMediaId
              || !expectedMediaOperation
              || !targetVersion
              || !hasExpectedCaseVisual(
                publishedValidation.data as Record<string, unknown>,
                readiness.data as Record<string, unknown>,
              )
              || !hasExactCasePublicationPin({
                expectedAssetId: targetMediaId,
                expectedMediaVersionId: String(targetVersion.id),
                expectedChecksum: expectedMediaOperation.checksum,
                mediaIds: publishedValidation.data.mediaIds,
                references: references.map((reference) => ({
                  assetId: String(reference.assetId),
                  mediaVersionId: reference.mediaVersionId ? String(reference.mediaVersionId) : null,
                })),
                pinnedVersion: pinnedVersion ? {
                  id: String(pinnedVersion.id),
                  assetId: String(pinnedVersion.assetId),
                  checksum: pinnedVersion.checksum,
                  storageKey: pinnedVersion.storageKey,
                } : null,
              })
            ) {
              throw new Error(`${operation.externalId}: governed visual replacement conflicts with the published narrative or immutable pin.`);
            }
            if (!receipt) {
              await tx.insert(cmsOperationReceiptsTable).values({
                idempotencyKey: operation.idempotencyKey,
                operation: "cms.inventory.case-study-summary-published",
                subjectId: String(conflict.id),
                requestDigest: operation.requestDigest,
                resultDigest: resultDigest({ documentId: conflict.id, governedReplacement: true }),
              });
              await tx.insert(cmsAuditEventsTable).values({
                actorUserId: serviceAccount.id,
                actorLabel: "cms-inventory-migration",
                action: "cms.inventory.case-study-summary-published",
                targetType: "case-study",
                targetId: String(conflict.id),
                requestId: operation.idempotencyKey,
                metadata: { sourceExternalId: operation.externalId, governedReplacement: true },
              });
            } else if (receipt.operation !== "cms.inventory.case-study-summary-published") {
              throw new Error(`${operation.externalId}: governed baseline receipt has an incompatible operation.`);
            }
            replayed++;
            continue;
          }
          if (operation.kind === "case-study" && operation.idempotencyKey.startsWith("cms-case-study-baseline-v1:")) {
            await tx.insert(cmsOperationReceiptsTable).values({
              idempotencyKey: operation.idempotencyKey,
              operation: "cms.inventory.case-study-baseline-preserved",
              subjectId: String(conflict.id),
              requestDigest: operation.requestDigest,
              resultDigest: resultDigest({ documentId: conflict.id, preservedEditorial: true }),
            });
            await tx.insert(cmsAuditEventsTable).values({
              actorUserId: serviceAccount.id,
              actorLabel: "cms-inventory-migration",
              action: "cms.inventory.case-study-baseline-preserved",
              targetType: "case-study",
              targetId: String(conflict.id),
              requestId: operation.idempotencyKey,
              metadata: { sourceExternalId: operation.externalId, preservedEditorial: true },
            });
            replayed++;
            continue;
          }
          const isIndustryContractOperation = operation.kind === "industry" && (
            operation.idempotencyKey.startsWith("cms-industry-contract-v8:")
            || isEducationSuccessorOperation(operation)
            || (
              operation.slug === "financial-services"
              && operation.idempotencyKey.startsWith("cms-industry-contract-v12:")
            )
          );
          if (!isIndustryContractOperation) {
            throw new Error(`Slug ${operation.slug} is already owned by a non-migration document.`);
          }
          const [edition] = await tx.select({
            id: cmsMarketEditionsTable.id,
            publishedRevisionId: cmsMarketEditionsTable.publishedRevisionId,
            publicationState: cmsMarketEditionsTable.publicationState,
          })
            .from(cmsMarketEditionsTable)
            .where(and(
              eq(cmsMarketEditionsTable.documentId, conflict.id),
              eq(cmsMarketEditionsTable.market, "uae"),
            ));
          if (!edition) throw new Error(`The existing ${operation.slug} industry has no UAE edition.`);
          const revisions = await tx.select({
            id: cmsRevisionsTable.id,
            revisionNumber: cmsRevisionsTable.revisionNumber,
            reason: cmsRevisionsTable.reason,
            workflowState: cmsRevisionsTable.workflowState,
            payload: cmsRevisionsTable.payload,
            contentDigest: cmsRevisionsTable.contentDigest,
          }).from(cmsRevisionsTable)
            .where(eq(cmsRevisionsTable.editionId, edition.id))
            .orderBy(desc(cmsRevisionsTable.revisionNumber));
          const publishedRevision = revisions.find((revision) =>
            String(revision.id) === String(edition.publishedRevisionId)
          );
          const publishedPayload = publishedRevision?.payload as {
            content?: Record<string, unknown>;
            mediaIds?: unknown[];
          } | undefined;
          const publishedMediaIds = Array.isArray(publishedPayload?.mediaIds)
            ? publishedPayload.mediaIds.filter((id): id is string => typeof id === "string")
            : [];
          const publishedHeroId = typeof publishedPayload?.content?.heroMediaId === "string"
            ? publishedPayload.content.heroMediaId
            : null;
          const publishedReferences = publishedRevision
            ? await tx.select({
                assetId: cmsMediaReferencesTable.assetId,
                mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
                status: cmsMediaAssetsTable.status,
              }).from(cmsMediaReferencesTable)
                .innerJoin(cmsMediaAssetsTable, eq(cmsMediaAssetsTable.id, cmsMediaReferencesTable.assetId))
                .where(and(
                  eq(cmsMediaReferencesTable.documentId, conflict.id),
                  eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision.id}`),
                ))
            : [];
          const pinnedMedia = publishedRevision && publishedMediaIds.length === 1
            ? await tx.select({
                assetId: cmsMediaReferencesTable.assetId,
                mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
                status: cmsMediaAssetsTable.status,
                versionId: cmsMediaVersionsTable.id,
              }).from(cmsMediaReferencesTable)
                .innerJoin(cmsMediaAssetsTable, eq(cmsMediaAssetsTable.id, cmsMediaReferencesTable.assetId))
                .innerJoin(cmsMediaVersionsTable, and(
                  eq(cmsMediaVersionsTable.id, cmsMediaReferencesTable.mediaVersionId),
                  eq(cmsMediaVersionsTable.assetId, cmsMediaReferencesTable.assetId),
                ))
                .where(and(
                  eq(cmsMediaReferencesTable.documentId, conflict.id),
                  eq(cmsMediaReferencesTable.fieldPath, `revision:${publishedRevision.id}`),
                  eq(cmsMediaReferencesTable.assetId, publishedMediaIds[0]),
                ))
            : [];
          const approvedPin = pinnedMedia.length === 1
            && publishedHeroId === publishedMediaIds[0]
            && (pinnedMedia[0].status === "active" || pinnedMedia[0].status === "ready")
            && Boolean(pinnedMedia[0].mediaVersionId)
            && pinnedMedia[0].mediaVersionId === pinnedMedia[0].versionId
            ? pinnedMedia[0]
            : null;
          const educationPublishedPins = operation.slug === "education"
            && publishedMediaIds.length === 3
            && publishedReferences.length === 3
            && publishedReferences.every((reference) =>
              (reference.status === "active" || reference.status === "ready")
                && Boolean(reference.mediaVersionId)
            );
          const immediatelyPriorRevision = publishedRevision
            ? revisions.find((revision) =>
                revision.revisionNumber === publishedRevision.revisionNumber - 1
              )
            : undefined;
          const priorPayload = immediatelyPriorRevision?.payload as {
            content?: Record<string, unknown>;
            mediaIds?: unknown[];
          } | undefined;
          const priorMediaIds = Array.isArray(priorPayload?.mediaIds)
            ? priorPayload.mediaIds.filter((id): id is string => typeof id === "string")
            : [];
          const priorHeroId = typeof priorPayload?.content?.heroMediaId === "string"
            ? priorPayload.content.heroMediaId
            : null;
          const priorPinnedMedia = immediatelyPriorRevision && priorMediaIds.length === 1
            ? await tx.select({
                assetId: cmsMediaReferencesTable.assetId,
                mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
                status: cmsMediaAssetsTable.status,
                versionId: cmsMediaVersionsTable.id,
              }).from(cmsMediaReferencesTable)
                .innerJoin(cmsMediaAssetsTable, eq(cmsMediaAssetsTable.id, cmsMediaReferencesTable.assetId))
                .innerJoin(cmsMediaVersionsTable, and(
                  eq(cmsMediaVersionsTable.id, cmsMediaReferencesTable.mediaVersionId),
                  eq(cmsMediaVersionsTable.assetId, cmsMediaReferencesTable.assetId),
                ))
                .where(and(
                  eq(cmsMediaReferencesTable.documentId, conflict.id),
                  eq(cmsMediaReferencesTable.fieldPath, `revision:${immediatelyPriorRevision.id}`),
                  eq(cmsMediaReferencesTable.assetId, priorMediaIds[0]),
                ))
            : [];
          const priorApprovedPin = priorPinnedMedia.length === 1
            && priorHeroId === priorMediaIds[0]
            && (priorPinnedMedia[0].status === "active" || priorPinnedMedia[0].status === "ready")
            && Boolean(priorPinnedMedia[0].mediaVersionId)
            && priorPinnedMedia[0].mediaVersionId === priorPinnedMedia[0].versionId
            ? priorPinnedMedia[0]
            : null;
          const allReceipts = await tx.select().from(cmsOperationReceiptsTable);
          const allAudits = await tx.select().from(cmsAuditEventsTable);
          const receiptByKey = new Map(allReceipts.map((item) => [item.idempotencyKey, item]));
          const auditByRequest = new Map(allAudits.flatMap((item) =>
            item.requestId ? [[item.requestId, item] as const] : []
          ));
          const normalizedPayloadDigest = (
            payload: unknown,
            removeContract: boolean,
          ) => {
            const normalized = structuredClone(payload) as {
              content?: Record<string, unknown>;
              mediaIds?: unknown[];
            };
            normalized.mediaIds = [];
            if (normalized.content) {
              delete normalized.content.heroMediaId;
              if (removeContract) {
                delete normalized.content.opportunity;
                delete normalized.content.capabilities;
                delete normalized.content.selectedWork;
              }
            }
            return canonicalResultDigest(normalized);
          };
          const expectedContractDigest = normalizedPayloadDigest(resolvedPayload, false);
          const classifiedRevisions = revisions.map((revision) => {
            const revisionId = String(revision.id);
            const revisionPayload = revision.payload as { content?: Record<string, unknown> };
            const hasOpportunity = typeof revisionPayload?.content?.opportunity !== "undefined";
            let provenanceValid = false;
            if (revision.revisionNumber === 1) {
              const key = `cms-inventory-v2:${operation.externalId}`;
              const receipt = receiptByKey.get(key);
              const audit = auditByRequest.get(key);
              provenanceValid = receipt?.operation === "cms.inventory.import"
                && receipt.subjectId === String(conflict.id)
                && receipt.resultDigest === resultDigest({
                  documentId: conflict.id,
                  editionId: edition.id,
                  revisionId: revision.id,
                })
                && audit?.action === "cms.inventory.imported"
                     && (
                       audit.targetType === "industry"
                       || (
                         receipt.idempotencyKey === EDUCATION_V11_CUTOVER_KEY
                         && audit.targetType === "document"
                       )
                     )
                && audit.targetId === String(conflict.id)
                && (audit.metadata as Record<string, unknown> | null)?.revisionId === revisionId
                && typeof revision.contentDigest === "string";
            } else if (!hasOpportunity) {
              const receipt = allReceipts.find((item) =>
                item.operation === "cms.industry.pulse-media-cutover"
                && item.subjectId === revisionId
                && (
                  item.idempotencyKey === `cms-industry-pulse-cutover-v1:${operation.slug}`
                  || item.idempotencyKey === `cms-industry-pulse-cutover-v2:${operation.slug}`
                )
              );
              const audit = receipt ? auditByRequest.get(receipt.idempotencyKey) : undefined;
              const metadata = audit?.metadata as Record<string, unknown> | null;
              provenanceValid = Boolean(receipt)
                && audit?.action === "document.published"
                && audit.targetType === "document"
                && audit.targetId === String(conflict.id)
                && metadata?.revisionId === revisionId
                && matchesGovernedCutoverSource(
                  String(
                    revisions.find((candidate) =>
                      candidate.revisionNumber === revision.revisionNumber - 1
                    )?.id ?? "",
                  ),
                  metadata?.sourceRevisionId,
                )
                && receipt?.resultDigest === resultDigest({
                  documentId: conflict.id,
                  editionId: edition.id,
                  revisionId,
                  mediaId: metadata?.mediaId,
                  mediaVersionId: metadata?.mediaVersionId,
                })
                && typeof revision.contentDigest === "string";
            } else {
              const receipt = allReceipts.find((item) => {
                const candidateAudit = auditByRequest.get(item.idempotencyKey);
                const candidateMetadata = candidateAudit?.metadata as Record<string, unknown> | null;
                const isVersionedIndustryOperation =
                  item.idempotencyKey.startsWith("cms-industry-contract-v")
                  || item.idempotencyKey.startsWith("cms-industry-education-successor-v")
                  || item.idempotencyKey.startsWith(EDUCATION_V11_RECOVERY_KEY_PREFIX)
                  || item.idempotencyKey === EDUCATION_V11_CUTOVER_KEY;
                const isIndustryContractAudit =
                  candidateAudit?.action?.startsWith("cms.inventory.industry-contract")
                  || (
                    (
                      item.idempotencyKey.startsWith("cms-industry-education-successor-v")
                      || item.idempotencyKey.startsWith(EDUCATION_V11_RECOVERY_KEY_PREFIX)
                    )
                    && (
                      candidateAudit?.action === "cms.inventory.education-successor-published"
                      || candidateAudit?.action === "cms.inventory.education-successor-pending-cutover"
                    )
                  )
                  || (
                    item.idempotencyKey === EDUCATION_V11_CUTOVER_KEY
                    && candidateAudit?.action === "document.published"
                  );
                return item.subjectId === String(conflict.id)
                  && isVersionedIndustryOperation
                  && isIndustryContractAudit
                  && candidateMetadata?.revisionId === revisionId;
              });
              const audit = receipt ? auditByRequest.get(receipt.idempotencyKey) : undefined;
              const metadata = audit?.metadata as Record<string, unknown> | null;
              provenanceValid = receipt
                ? Boolean(
                    receipt.subjectId === String(conflict.id)
                    && (
                      audit?.action?.startsWith("cms.inventory.industry-contract")
                      || (
                        (
                          receipt.idempotencyKey.startsWith("cms-industry-education-successor-v")
                          || receipt.idempotencyKey.startsWith(EDUCATION_V11_RECOVERY_KEY_PREFIX)
                        )
                        && (
                          audit?.action === "cms.inventory.education-successor-published"
                          || audit?.action === "cms.inventory.education-successor-pending-cutover"
                        )
                      )
                      || (
                        receipt.idempotencyKey === EDUCATION_V11_CUTOVER_KEY
                        && audit?.action === "document.published"
                      )
                    )
                     && (
                       audit.targetType === "industry"
                       || (
                         receipt.idempotencyKey === EDUCATION_V11_CUTOVER_KEY
                         && audit.targetType === "document"
                       )
                     )
                    && audit.targetId === String(conflict.id)
                    && metadata?.revisionId === revisionId
                    && typeof revision.contentDigest === "string"
                  )
                : false;
            }
            if (
              !provenanceValid
              && operation.slug === "education"
              && revisionId === String(edition.publishedRevisionId ?? "")
            ) {
              const priorCutoverReceipt = receiptByKey.get(EDUCATION_V11_CUTOVER_KEY);
              const priorCutoverAudit = auditByRequest.get(EDUCATION_V11_CUTOVER_KEY);
              const priorCutoverMetadata = priorCutoverAudit?.metadata as Record<string, unknown> | null;
              provenanceValid = Boolean(
                priorCutoverReceipt?.operation === "cms.industry.pulse-media-cutover"
                && priorCutoverReceipt.subjectId === revisionId
                && priorCutoverAudit?.action === "document.published"
                && priorCutoverAudit.targetType === "document"
                && priorCutoverAudit.targetId === String(conflict.id)
                && priorCutoverMetadata?.revisionId === revisionId
                && typeof revision.contentDigest === "string"
              );
            }
            return {
              id: String(revision.id),
              revisionNumber: revision.revisionNumber,
              reason: revision.reason,
              workflowState: revision.workflowState,
              hasOpportunity,
              provenanceValid,
              payloadFamilyDigest: normalizedPayloadDigest(revision.payload, true),
              matchesContractPayload: normalizedPayloadDigest(revision.payload, false) === expectedContractDigest,
               hasValidMediaPin: revisionId === String(edition.publishedRevisionId)
                 && (Boolean(approvedPin) || educationPublishedPins),
              hasKnownV3UnpinnedRef: revisionId === String(edition.publishedRevisionId)
                && publishedReferences.length === 1
                && publishedReferences[0].mediaVersionId === null
                && publishedMediaIds.length === 1
                && String(publishedReferences[0].assetId) === publishedMediaIds[0]
                && publishedHeroId === publishedMediaIds[0],
              priorHasValidMediaPin: revisionId === String(edition.publishedRevisionId)
                && Boolean(priorApprovedPin),
            };
          });
          const isEducationSuccessor = isEducationSuccessorOperation(operation);
          if (isEducationSuccessor && educationVersion === "v12") {
            const priorKey = `${EDUCATION_V11_OPERATION_PREFIX}${operation.externalId}`;
            const recoveryKey = `${EDUCATION_V11_RECOVERY_KEY_PREFIX}${operation.externalId}`;
            const priorReceipt = receiptByKey.get(priorKey);
            const priorAudit = auditByRequest.get(priorKey);
            const priorMetadata = priorAudit?.metadata as Record<string, unknown> | null;
            const recoveryReceipt = receiptByKey.get(recoveryKey);
            const recoveryAudit = auditByRequest.get(recoveryKey);
            const recoveryMetadata = recoveryAudit?.metadata as Record<string, unknown> | null;
            const priorCutoverReceipt = receiptByKey.get(EDUCATION_V11_CUTOVER_KEY);
            const priorCutoverAudit = auditByRequest.get(EDUCATION_V11_CUTOVER_KEY);
            const priorCutoverMetadata = priorCutoverAudit?.metadata as Record<string, unknown> | null;
            const latestRevision = revisions[0];
            const priorAuthorityIsExact = Boolean(
              priorReceipt
              && priorReceipt.requestDigest === EDUCATION_V11_REQUEST_DIGEST
              && (priorReceipt.operation === "cms.inventory.industry-contract-editorial-preserved"
                || priorReceipt.operation === "cms.inventory.education-successor-pending-cutover"
                || priorReceipt.operation === "cms.inventory.education-successor-published")
              && priorReceipt.subjectId === String(conflict.id)
              && priorAudit
              && (priorAudit.action === "cms.inventory.industry-contract-editorial-preserved"
                || priorAudit.action === "cms.inventory.education-successor-pending-cutover"
                || priorAudit.action === "cms.inventory.education-successor-published")
              && priorAudit.targetType === "industry"
              && priorAudit.targetId === String(conflict.id)
              && priorMetadata
              && (
                priorMetadata.revisionId === String(latestRevision?.id ?? "")
                || priorMetadata.preservedRevisionId === String(recoveryMetadata?.previousRevisionId ?? "")
              )
              && recoveryReceipt
              && recoveryReceipt.requestDigest === EDUCATION_V11_REQUEST_DIGEST
              && recoveryReceipt.operation === "cms.inventory.education-successor-pending-cutover"
              && recoveryReceipt.subjectId === String(conflict.id)
              && recoveryAudit?.action === "cms.inventory.education-successor-pending-cutover"
              && recoveryAudit.targetType === "industry"
              && recoveryAudit.targetId === String(conflict.id)
              && recoveryMetadata?.revisionId
              && recoveryReceipt.resultDigest === resultDigest({
                documentId: conflict.id,
                editionId: edition.id,
                revisionId: recoveryMetadata.revisionId,
              })
              && priorCutoverReceipt
              && priorCutoverReceipt.operation === "cms.industry.pulse-media-cutover"
              && priorCutoverReceipt.subjectId === String(latestRevision?.id ?? "")
              && priorCutoverAudit?.action === "document.published"
              && priorCutoverAudit.targetType === "document"
              && priorCutoverAudit.targetId === String(conflict.id)
              && priorCutoverMetadata?.revisionId === String(latestRevision?.id ?? "")
              && priorCutoverMetadata.sourceRevisionId === String(recoveryMetadata.revisionId)
              && edition.publicationState === "published"
              && String(edition.publishedRevisionId ?? "") === String(latestRevision?.id ?? "")
              && latestRevision?.workflowState === "approved"
            );
            if (!priorAuthorityIsExact) {
              throw new Error(
                `${operation.externalId}: Education campus hero replacement requires the exact approved v11 successor receipt and live revision; preserving current editorial authority.`,
              );
            }
          }
          let baselineAction = industryBaselineAction(
            classifiedRevisions,
            edition.publishedRevisionId ? String(edition.publishedRevisionId) : null,
            edition.publicationState,
          );
          if (isEducationSuccessor) {
            baselineAction = educationSuccessorAction({
              baselineAction,
              latestNormalizedPayloadDigest: revisions[0]
                ? normalizedPayloadDigest(revisions[0].payload, false)
                : undefined,
              canonicalPayload: resolvedPayload,
            });
          }
          const punctuationPlan = baselineAction === "preserve-editorial"
            ? financialServicesPunctuationReconciliationPlan({
                slug: operation.slug,
                publicationState: edition.publicationState,
                publishedRevisionId: edition.publishedRevisionId
                  ? String(edition.publishedRevisionId)
                  : null,
                latestRevision: revisions[0]
                  ? {
                      id: String(revisions[0].id),
                      workflowState: revisions[0].workflowState,
                    }
                  : undefined,
                publishedPayload,
                canonicalPayload: resolvedPayload,
                publishedReferences,
              })
            : null;
          const isPunctuationOnly = Boolean(punctuationPlan);
          if (isPunctuationOnly) {
            baselineAction = "append-and-publish";
          }
          if (baselineAction === "append-and-publish" || baselineAction === "repair-v3-media") {
             // Education successors are controlled handoffs, not direct
             // publication. Preserve the approved edition, append the
             // successor as a draft, then let the Education-only cutover add
             // the reviewed immutable hero pin in one publish transaction.
            const educationSuccessorDraft = isEducationSuccessor
              && baselineAction === "append-and-publish";
            const publicationPin = educationSuccessorDraft
              ? null
              : isPunctuationOnly
              ? null
              : baselineAction === "repair-v3-media" || (!approvedPin && priorApprovedPin)
                ? priorApprovedPin
                : approvedPin;
            if (!publicationPin && !isPunctuationOnly && !educationSuccessorDraft) {
              throw new Error(`${operation.slug} has no approved immutable hero-media pin; preserving publication.`);
            }
            const nextRevisionNumber = Math.max(...revisions.map((revision) => revision.revisionNumber)) + 1;
            const publicationPayload = structuredClone(
              isPunctuationOnly
                ? punctuationPlan!.payload
                : baselineAction === "repair-v3-media"
                  ? publishedPayload
                  : resolvedPayload,
            ) as {
              content: Record<string, unknown>;
              mediaIds: string[];
            };
            if (!isPunctuationOnly && !educationSuccessorDraft) {
              publicationPayload.mediaIds = [String(publicationPin!.assetId)];
              publicationPayload.content.heroMediaId = String(publicationPin!.assetId);
            }
            const readiness = validateCmsSnapshot(
              "industry",
              publicationPayload,
              educationSuccessorDraft ? "draft" : "publish",
            );
            if (!readiness.success) {
              throw new Error(`${operation.slug} is not publication-ready: ${readiness.errors.join("; ")}`);
            }
            const [revision] = await tx.insert(cmsRevisionsTable).values({
              editionId: edition.id,
              revisionNumber: nextRevisionNumber,
              payloadVersion: 1,
              payload: readiness.data,
              contentDigest: resultDigest(readiness.data),
              workflowState: "draft",
              createdByUserId: serviceAccount.id,
              reason: baselineAction === "repair-v3-media"
                ? "Approved v4 repair of the known v3 industry hero-media pin defect; prior revisions preserved."
                : isEducationSuccessor
                   ? "Approved Education campus-hero successor v12; rejected supporting imagery removed from the current revision while prior revisions and immutable media are preserved."
                : "Approved financial-services punctuation baseline v12; prior revisions and media state preserved.",
            }).returning({ id: cmsRevisionsTable.id });
            if (!revision) throw new Error(`Could not append the ${operation.slug} contract baseline.`);
            if (educationSuccessorDraft) {
              const pendingReceiptKey = canRecoverPreservedEducation
                ? educationRecoveryKey!
                : operation.idempotencyKey;
              await tx.insert(cmsOperationReceiptsTable).values({
                idempotencyKey: pendingReceiptKey,
                operation: "cms.inventory.education-successor-pending-cutover",
                subjectId: String(conflict.id),
                requestDigest: operation.requestDigest,
                resultDigest: resultDigest({
                  documentId: conflict.id,
                  editionId: edition.id,
                  revisionId: revision.id,
                }),
              });
              await tx.insert(cmsAuditEventsTable).values({
                actorUserId: serviceAccount.id,
                actorLabel: "cms-inventory-migration",
                action: "cms.inventory.education-successor-pending-cutover",
                targetType: "industry",
                targetId: String(conflict.id),
                requestId: pendingReceiptKey,
                metadata: {
                  market: "uae",
                  locale: "en",
                  revisionId: String(revision.id),
                  previousRevisionId: String(revisions[0].id),
                  workflowState: "draft",
                  publicationState: edition.publicationState,
                  reason: "Education v12 successor is awaiting the governed single-campus-hero immutable-media cutover",
                  ...(canRecoverPreservedEducation
                    ? { recoveredFromReceiptKey: operation.idempotencyKey }
                    : {}),
                },
              });
              created++;
              continue;
            }
            if (isPunctuationOnly && punctuationPlan!.references.length) {
              await tx.insert(cmsMediaReferencesTable).values(
                punctuationPlan!.references.map((reference) => ({
                  ...reference,
                  documentId: conflict.id,
                  fieldPath: `revision:${revision.id}`,
                })),
              );
            } else if (publicationPin) {
              await tx.insert(cmsMediaReferencesTable).values({
                assetId: publicationPin.assetId,
                mediaVersionId: publicationPin.mediaVersionId,
                documentId: conflict.id,
                fieldPath: `revision:${revision.id}`,
              });
            }
            const publishedHeroReference = isPunctuationOnly
              ? punctuationPlan!.references.find((reference) => reference.assetId === publishedHeroId)
              : undefined;
            const receiptMediaId = isPunctuationOnly ? publishedHeroId : publicationPin!.assetId;
            const receiptMediaVersionId = isPunctuationOnly
              ? publishedHeroReference?.mediaVersionId ?? null
              : publicationPin!.mediaVersionId;
            await tx.update(cmsRevisionsTable).set({
              workflowState: "approved",
              approvedByUserId: serviceAccount.id,
              approvedAt: new Date(),
            }).where(eq(cmsRevisionsTable.id, revision.id));
            await tx.update(cmsMarketEditionsTable).set({
              publicationState: "published",
              parityComplete: true,
              publishedRevisionId: revision.id,
              publishedAt: new Date(),
              updatedAt: new Date(),
            }).where(eq(cmsMarketEditionsTable.id, edition.id));
            await tx.insert(cmsOperationReceiptsTable).values({
              idempotencyKey: operation.idempotencyKey,
              operation: baselineAction === "repair-v3-media"
                ? "cms.inventory.industry-contract-v3-media-repaired"
                : isEducationSuccessor
                  ? "cms.inventory.education-successor-published"
                : "cms.inventory.industry-contract-baseline-published",
              subjectId: String(conflict.id),
              requestDigest: operation.requestDigest,
              resultDigest: resultDigest({
                documentId: conflict.id,
                editionId: edition.id,
                revisionId: revision.id,
                mediaId: receiptMediaId,
                mediaVersionId: receiptMediaVersionId,
              }),
            });
            await tx.insert(cmsAuditEventsTable).values({
              actorUserId: serviceAccount.id,
              actorLabel: "cms-inventory-migration",
              action: baselineAction === "repair-v3-media"
                ? "cms.inventory.industry-contract-v3-media-repaired"
                : isEducationSuccessor
                  ? "cms.inventory.education-successor-published"
                : "cms.inventory.industry-contract-baseline-published",
              targetType: "industry",
              targetId: String(conflict.id),
              requestId: operation.idempotencyKey,
              metadata: {
                market: "uae",
                locale: "en",
                revisionId: String(revision.id),
                previousRevisionId: String(revisions[0].id),
                workflowState: "approved",
                publicationState: "published",
                reason: baselineAction === "repair-v3-media"
                  ? "Known v3 unpinned square-JPG reference replaced in a new immutable revision using the prior approved Pulse pin"
                  : isEducationSuccessor
                   ? "Approved Education campus-hero successor v12 with strict market markers and prior immutable media preserved"
                  : "Approved financial-services punctuation baseline v12 with prior media state preserved",
                repairedRevisionId: baselineAction === "repair-v3-media"
                  ? String(publishedRevision!.id)
                  : undefined,
                pinSourceRevisionId: baselineAction === "repair-v3-media"
                  ? String(immediatelyPriorRevision!.id)
                  : String(publishedRevision!.id),
                mediaId: receiptMediaId ? String(receiptMediaId) : null,
                mediaVersionId: receiptMediaVersionId ? String(receiptMediaVersionId) : null,
              },
            });
          } else if (baselineAction === "reuse-complete") {
            await tx.insert(cmsOperationReceiptsTable).values({
              idempotencyKey: operation.idempotencyKey,
              operation: "cms.inventory.industry-contract-baseline-reused",
              subjectId: String(conflict.id),
              requestDigest: operation.requestDigest,
              resultDigest: resultDigest({
                documentId: conflict.id,
                editionId: edition.id,
                revisionId: String(publishedRevision!.id),
                mediaVersionId: String(approvedPin!.mediaVersionId),
              }),
            });
            await tx.insert(cmsAuditEventsTable).values({
              actorUserId: serviceAccount.id,
              actorLabel: "cms-inventory-migration",
              action: "cms.inventory.industry-contract-baseline-reused",
              targetType: "industry",
              targetId: String(conflict.id),
              requestId: operation.idempotencyKey,
              metadata: {
                market: "uae",
                locale: "en",
                revisionId: String(publishedRevision!.id),
                mediaId: String(approvedPin!.assetId),
                mediaVersionId: String(approvedPin!.mediaVersionId),
              },
            });
          } else if (receipt?.operation === "cms.inventory.industry-contract-editorial-preserved") {
            // The existing preservation receipt is immutable. If the current
            // authority is not one of the explicitly approved handoff states,
            // keep it preserved rather than attempting a second receipt.
            replayed++;
          } else {
            // A later revision is editorial authority. Record the versioned
            // baseline as intentionally preserved; never replace or publish it.
            await tx.insert(cmsOperationReceiptsTable).values({
              idempotencyKey: operation.idempotencyKey,
              operation: "cms.inventory.industry-contract-editorial-preserved",
              subjectId: String(conflict.id),
              requestDigest: operation.requestDigest,
              resultDigest: resultDigest({
                documentId: conflict.id,
                preservedRevisionId: String(revisions[0]?.id ?? ""),
                preservedRevisionNumber: revisions[0]?.revisionNumber ?? 0,
              }),
            });
            await tx.insert(cmsAuditEventsTable).values({
              actorUserId: serviceAccount.id,
              actorLabel: "cms-inventory-migration",
              action: "cms.inventory.industry-contract-editorial-preserved",
              targetType: "industry",
              targetId: String(conflict.id),
              requestId: operation.idempotencyKey,
              metadata: {
                market: "uae",
                locale: "en",
                preservedRevisionId: String(revisions[0]?.id ?? ""),
                preservedRevisionNumber: revisions[0]?.revisionNumber ?? 0,
              },
            });
          }
          created++;
          continue;
        }

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
        const caseMediaOperation = operation.kind === "case-study" && operation.mediaPaths.length === 1
          ? mediaOperations.find((candidate) => candidate.publicPath === operation.mediaPaths[0])
          : undefined;
        const publishCase = operation.kind === "case-study"
          && operation.mediaPaths.length === 1
          && caseMediaOperation?.cmsOwnership === "cms-candidate"
          && caseMediaOperation.sourceReviewApproved === true
          && caseMediaOperation.rightsStatus === "approved-use"
          && caseMediaOperation.accessibilityStatus !== "needs-review"
          && Boolean((resolvedPayload.content as Record<string, unknown>).disclosure === "anonymized")
          && Boolean((resolvedPayload.content as Record<string, unknown>).publicEvidenceStatus === "approved")
          && (resolvedPayload.content as Record<string, unknown>).variant === "summary"
          && !operation.slug.includes("detail");
        const caseReadiness = publishCase
          ? validateCmsSnapshot("case-study", resolvedPayload, "publish")
          : null;
        if (publishCase && !caseReadiness?.success) {
          console.warn(`${operation.externalId}: publication gates failed; retaining private draft.`);
        }
        let pinnedVersionId: string | undefined;
        if (publishCase && caseReadiness?.success && resolvedPayload.mediaIds.length === 1) {
          const [version] = await tx.select({ id: cmsMediaVersionsTable.id, metadata: cmsMediaVersionsTable.metadata })
            .from(cmsMediaVersionsTable)
            .where(and(
              eq(cmsMediaVersionsTable.assetId, resolvedPayload.mediaIds[0]),
              eq(cmsMediaVersionsTable.checksum, caseMediaOperation!.checksum),
            ))
            .orderBy(desc(cmsMediaVersionsTable.versionNumber))
            .limit(1);
          if (!version) {
            console.warn(`${operation.externalId}: immutable media version is missing; retaining private draft.`);
          } else {
            pinnedVersionId = String(version.id);
            await tx.update(cmsMediaAssetsTable).set({
              status: "active",
              updatedAt: new Date(),
            }).where(eq(cmsMediaAssetsTable.id, resolvedPayload.mediaIds[0]));
            await tx.update(cmsMediaVersionsTable).set({
              metadata: {
                ...(version.metadata as Record<string, unknown>),
                accessibilityStatus: "approved",
                rightsStatus: "approved-use",
                sourceReview: "approved",
              },
            }).where(eq(cmsMediaVersionsTable.id, version.id));
          }
        }
        for (const mediaId of resolvedPayload.mediaIds) {
          await tx.insert(cmsMediaReferencesTable).values({
            assetId: mediaId,
            mediaVersionId: mediaId === resolvedPayload.mediaIds[0] && pinnedVersionId ? pinnedVersionId : null,
            documentId: document.id,
            fieldPath: `revision:${revision.id}`,
          });
        }
        if (publishCase && caseReadiness?.success && pinnedVersionId) {
          await tx.update(cmsRevisionsTable).set({
            payload: caseReadiness.data,
            contentDigest: resultDigest(caseReadiness.data),
            workflowState: "approved",
            approvedByUserId: serviceAccount.id,
            approvedAt: new Date(),
            reason: "Source-reviewed public summary baseline; immutable visual pin approved.",
          }).where(eq(cmsRevisionsTable.id, revision.id));
          await tx.update(cmsMarketEditionsTable).set({
            publicationState: "published",
            parityComplete: true,
            publishedRevisionId: revision.id,
            publishedAt: new Date(),
            updatedAt: new Date(),
          }).where(eq(cmsMarketEditionsTable.id, edition.id));
        }
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: operation.idempotencyKey,
          operation: publishCase && caseReadiness?.success && pinnedVersionId
            ? "cms.inventory.case-study-summary-published"
            : "cms.inventory.import",
          subjectId: String(document.id),
          requestDigest: operation.requestDigest,
          resultDigest: resultDigest({ documentId: document.id, editionId: edition.id, revisionId: revision.id }),
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id,
          actorLabel: "cms-inventory-migration",
          action: publishCase && caseReadiness?.success && pinnedVersionId
            ? "cms.inventory.case-study-summary-published"
            : "cms.inventory.imported",
          targetType: operation.kind,
          targetId: String(document.id),
          requestId: operation.idempotencyKey,
          metadata: {
            market: "uae",
            locale: "en",
            workflowState: publishCase && caseReadiness?.success && pinnedVersionId ? "approved" : "draft",
            sourceType: "inventory-v2",
            revisionId: String(revision.id),
            publicationState: publishCase && caseReadiness?.success && pinnedVersionId ? "published" : "draft",
            mediaVersionId: pinnedVersionId,
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
      ? "Applied the governed UAE/English inventory. Eligible case-study summaries publish only after evidence, source review, rights, accessibility, durable-storage, and immutable-version gates pass; all other content retains its governed state."
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

const EDUCATION_V11_REQUEST_DIGEST =
  "f0b565465e2384da9afb278a4c06395353de7c768c0f21c9c9fff05674f8b76d";

const EDUCATION_V11_CUTOVER_KEY = "cms-industry-education-imagery-v3:education";

const EDUCATION_V11_RECOVERY_KEY_PREFIX = "cms-industry-education-successor-v11-recovery:";
