import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { and, desc, eq } from "drizzle-orm";
import { type CmsDocumentKind, cmsPublicRoute, validateCmsSnapshot } from "@workspace/api-zod";
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
} from "./migration.js";

const args = process.argv.slice(2);
const inventoryPath = args.find((argument) => argument.startsWith("--inventory="))?.slice(12) ?? "scripts/cms/output/inventory.json";
const payloadPath = args.find((argument) => argument.startsWith("--payload="))?.slice(10) ?? "scripts/cms/output/import-payload.json";
const shouldVerifyDatabase = args.includes("--db");
const shouldWrite = args.includes("--write");

interface Inventory {
  schemaVersion: number;
  manifestDigest: string;
  generatedAt: string;
  dryRun: boolean;
  expectedCounts: Record<string, number>;
  records: InventoryRecord[];
  [key: string]: unknown;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

async function verifyDatabase(records: InventoryRecord[]) {
  const {
    cmsAuditEventsTable,
    cmsDocumentsTable,
    cmsMarketEditionsTable,
    cmsMediaAssetsTable,
    cmsMediaReferencesTable,
    cmsMediaVersionsTable,
    cmsOperationReceiptsTable,
    cmsPasswordCredentialsTable,
    cmsRevisionsTable,
    cmsSessionsTable,
    cmsUsersTable,
    marketEditionsTable,
    db,
    pool,
  } = await import("@workspace/db");
  try {
    return await db.transaction(async (tx) => {
      const [canonicalMarket] = await tx.select().from(marketEditionsTable)
        .where(eq(marketEditionsTable.code, "uae"));
      if (!canonicalMarket || canonicalMarket.defaultLocale !== "en" || !canonicalMarket.isCanonical
        || !canonicalMarket.enabled || canonicalMarket.fallbackMarketCode || canonicalMarket.fallbackLocale) {
        throw new Error("Canonical UAE/English market configuration parity failed.");
      }
      const [serviceAccount] = await tx.select({ id: cmsUsersTable.id })
        .from(cmsUsersTable)
        .where(and(
          eq(cmsUsersTable.email, "cms-inventory-migration@service.invalid"),
          eq(cmsUsersTable.role, "viewer"),
          eq(cmsUsersTable.status, "suspended"),
        ));
      if (!serviceAccount) throw new Error("Migration service account is missing or not a suspended viewer.");
      const credentials = await tx.select({ userId: cmsPasswordCredentialsTable.userId })
        .from(cmsPasswordCredentialsTable).where(eq(cmsPasswordCredentialsTable.userId, serviceAccount.id));
      const sessions = await tx.select({ userId: cmsSessionsTable.userId })
        .from(cmsSessionsTable).where(eq(cmsSessionsTable.userId, serviceAccount.id));
      if (credentials.length || sessions.length) throw new Error("Migration service account must not have credentials or sessions.");

      const mediaByPath = new Map<string, string>();
      let durableMediaObjects = 0;
      let mediaReceiptConflicts = 0;
      for (const operation of mediaMigrationOperations(records).filter((item) => item.cmsOwnership === "cms-candidate")) {
        const [asset] = await tx.select({
          id: cmsMediaAssetsTable.id,
          status: cmsMediaAssetsTable.status,
          checksum: cmsMediaAssetsTable.checksum,
          byteSize: cmsMediaAssetsTable.byteSize,
          storageKey: cmsMediaAssetsTable.storageKey,
          altText: cmsMediaAssetsTable.altText,
          credit: cmsMediaAssetsTable.credit,
          collection: cmsMediaAssetsTable.collection,
          linkedinAssetKind: cmsMediaAssetsTable.linkedinAssetKind,
          campaignMetadata: cmsMediaAssetsTable.campaignMetadata,
        }).from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.checksum, operation.checksum));
        if (
          !asset ||
          asset.status !== "pending-review" ||
          asset.byteSize !== operation.byteSize ||
          asset.altText !== operation.altText ||
          asset.credit !== operation.credit ||
          asset.collection !== operation.collection ||
          asset.linkedinAssetKind !== operation.linkedinAssetKind ||
          JSON.stringify(canonical(asset.campaignMetadata)) !== JSON.stringify(canonical(operation.campaignMetadata))
        ) {
          throw new Error(`Missing pending-review media parity for ${operation.publicPath}.`);
        }
        const [version] = await tx.select({
          checksum: cmsMediaVersionsTable.checksum,
          byteSize: cmsMediaVersionsTable.byteSize,
          storageKey: cmsMediaVersionsTable.storageKey,
          width: cmsMediaVersionsTable.width,
          height: cmsMediaVersionsTable.height,
        }).from(cmsMediaVersionsTable)
          .where(eq(cmsMediaVersionsTable.assetId, asset.id))
          .orderBy(desc(cmsMediaVersionsTable.versionNumber))
          .limit(1);
        if (
          !version ||
          version.checksum !== operation.checksum ||
          version.byteSize !== operation.byteSize ||
          version.storageKey.startsWith("deferred/") ||
          version.width !== operation.width ||
          version.height !== operation.height
        ) throw new Error(`Missing immutable media version parity for ${operation.publicPath}.`);
        const [receipt] = await tx.select({ requestDigest: cmsOperationReceiptsTable.requestDigest })
          .from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        const [audit] = await tx.select({ requestId: cmsAuditEventsTable.requestId })
          .from(cmsAuditEventsTable)
          .where(eq(cmsAuditEventsTable.requestId, operation.idempotencyKey));
        if (!receipt || !audit) {
          throw new Error(`Missing media receipt/audit parity for ${operation.publicPath}.`);
        }
        if (receipt.requestDigest !== operation.requestDigest) mediaReceiptConflicts++;
        mediaByPath.set(operation.publicPath, String(asset.id));
        if (!asset.storageKey.startsWith("deferred/") && !version.storageKey.startsWith("deferred/")) durableMediaObjects++;
      }

      const approvedRevisionIds: string[] = [];
      const draftRevisionIds: string[] = [];
      for (const operation of migrationOperations(records)) {
        const [document] = await tx.select({
          id: cmsDocumentsTable.id,
          kind: cmsDocumentsTable.kind,
          title: cmsDocumentsTable.title,
        }).from(cmsDocumentsTable).where(eq(cmsDocumentsTable.canonicalSlug, operation.slug));
        if (!document || document.kind !== operation.kind || document.title !== operation.title) {
          throw new Error(`Missing document parity for ${operation.externalId}.`);
        }
        const [edition] = await tx.select({
          id: cmsMarketEditionsTable.id,
          locale: cmsMarketEditionsTable.locale,
          publicationState: cmsMarketEditionsTable.publicationState,
          publishedRevisionId: cmsMarketEditionsTable.publishedRevisionId,
        }).from(cmsMarketEditionsTable).where(and(
          eq(cmsMarketEditionsTable.documentId, document.id),
          eq(cmsMarketEditionsTable.market, "uae"),
        ));
        if (!edition || edition.locale !== "en" || edition.publicationState !== "draft" || edition.publishedRevisionId) {
          throw new Error(`Missing isolated UAE/English draft parity for ${operation.externalId}.`);
        }
        const [revision] = await tx.select({
          id: cmsRevisionsTable.id,
          payload: cmsRevisionsTable.payload,
          contentDigest: cmsRevisionsTable.contentDigest,
          workflowState: cmsRevisionsTable.workflowState,
          createdByUserId: cmsRevisionsTable.createdByUserId,
          approvedByUserId: cmsRevisionsTable.approvedByUserId,
        }).from(cmsRevisionsTable).where(and(
          eq(cmsRevisionsTable.editionId, edition.id),
          eq(cmsRevisionsTable.revisionNumber, 1),
        ));
        if (
          !revision ||
          revision.workflowState !== "draft" ||
          revision.createdByUserId !== serviceAccount.id ||
          revision.approvedByUserId
        ) throw new Error(`Missing unapproved draft revision parity for ${operation.externalId}.`);
        const validation = validateCmsSnapshot(operation.kind as CmsDocumentKind, revision.payload, "draft");
        if (!validation.success) throw new Error(`${operation.externalId}: ${validation.errors.join("; ")}`);
        if (revision.contentDigest !== resultDigest(validation.data)) {
          throw new Error(`Revision digest mismatch for ${operation.externalId}.`);
        }
        if (JSON.stringify(canonical(validation.data.content)) !== JSON.stringify(canonical({
          ...(operation.payload.content as Record<string, unknown>),
          ...(operation.mediaPaths[0] && (operation.kind === "platform" || operation.kind === "publication" || operation.kind === "industry" || operation.kind === "framework")
            ? { heroMediaId: mediaByPath.get(operation.mediaPaths[0]) }
            : {}),
        }))) throw new Error(`Content payload parity mismatch for ${operation.externalId}.`);
        const expectedMedia = operation.mediaPaths.map((path) => mediaByPath.get(path));
        if (JSON.stringify(validation.data.mediaIds) !== JSON.stringify(expectedMedia)) {
          throw new Error(`Media payload parity mismatch for ${operation.externalId}.`);
        }
        const references = await tx.select({ assetId: cmsMediaReferencesTable.assetId })
          .from(cmsMediaReferencesTable)
          .where(eq(cmsMediaReferencesTable.documentId, document.id));
        if (references.length !== expectedMedia.length) throw new Error(`Media-reference parity mismatch for ${operation.externalId}.`);
        const [receipt] = await tx.select({
          requestDigest: cmsOperationReceiptsTable.requestDigest,
          subjectId: cmsOperationReceiptsTable.subjectId,
        }).from(cmsOperationReceiptsTable)
          .where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        const [audit] = await tx.select({
          requestId: cmsAuditEventsTable.requestId,
          action: cmsAuditEventsTable.action,
          targetId: cmsAuditEventsTable.targetId,
        }).from(cmsAuditEventsTable)
          .where(eq(cmsAuditEventsTable.requestId, operation.idempotencyKey));
        if (
          !receipt ||
          receipt.requestDigest !== operation.requestDigest ||
          receipt.subjectId !== String(document.id) ||
          !audit ||
          audit.action !== "cms.inventory.imported" ||
          audit.targetId !== String(document.id)
        ) throw new Error(`Receipt/audit parity mismatch for ${operation.externalId}.`);
        draftRevisionIds.push(String(revision.id));
      }
      return {
        documents: migrationOperations(records).length,
        editions: migrationOperations(records).length,
        revisions: draftRevisionIds.length,
        media: mediaByPath.size,
        durableMediaObjects,
        mediaReceiptConflicts,
        references: migrationOperations(records).reduce((total, operation) => total + operation.mediaPaths.length, 0),
        receipts: migrationOperations(records).length + mediaByPath.size,
        audits: migrationOperations(records).length + mediaByPath.size,
        approvedRevisionIds,
        draftRevisionIds,
      };
    });
  } finally {
    await pool.end();
  }
}

async function main() {
  const inventory = JSON.parse(await readFile(`${repositoryRoot}/${inventoryPath}`, "utf8")) as Inventory;
  const payload = JSON.parse(await readFile(`${repositoryRoot}/${payloadPath}`, "utf8")) as {
    schemaVersion: number;
    manifestDigest: string;
    operations: { externalId: string; requestDigest: string }[];
    mediaOperations: { externalId: string; requestDigest: string }[];
  };
  const errors: string[] = [];
  if (inventory.schemaVersion !== 2 || payload.schemaVersion !== 2) errors.push("Inventory and import payload must use schema version 2.");
  const { generatedAt: _generatedAt, dryRun: _dryRun, manifestDigest, ...stable } = inventory;
  const calculatedManifestDigest = createHash("sha256").update(JSON.stringify(stable)).digest("hex");
  if (manifestDigest !== calculatedManifestDigest || payload.manifestDigest !== manifestDigest) errors.push("Manifest digest mismatch.");
  const count = (type: string) => inventory.records.filter((record) => record.type === type).length;
  const expectedByType: Record<string, number | undefined> = {
    person: inventory.expectedCounts.people,
    partner: inventory.expectedCounts.partners,
    platform: inventory.expectedCounts.platforms,
    article: inventory.expectedCounts.articles,
    industry: inventory.expectedCounts.industries,
    framework: inventory.expectedCounts.frameworks,
    asset: inventory.expectedCounts.assets,
  };
  for (const [type, expected] of Object.entries(expectedByType)) {
    if (typeof expected !== "number") {
      errors.push(`Inventory expectedCounts is missing ${type}.`);
      continue;
    }
    if (count(type) !== expected) errors.push(`Expected ${expected} ${type} records, found ${count(type)}.`);
  }
  const operations = migrationOperations(inventory.records);
  const mediaOperations = mediaMigrationOperations(inventory.records);
  if (payload.operations.length !== operations.length || payload.mediaOperations.length !== mediaOperations.length) {
    errors.push(`Import payload must contain ${operations.length} content and ${mediaOperations.length} media operations.`);
  }
  const payloadContent = new Map(payload.operations.map((operation) => [operation.externalId, operation.requestDigest]));
  const payloadMedia = new Map(payload.mediaOperations.map((operation) => [operation.externalId, operation.requestDigest]));
  if (operations.some((operation) => payloadContent.get(operation.externalId) !== operation.requestDigest)) errors.push("Content operation digest mismatch.");
  if (mediaOperations.some((operation) => payloadMedia.get(operation.externalId) !== operation.requestDigest)) errors.push("Media operation digest mismatch.");
  for (const operation of mediaOperations) {
    const bytes = await readFile(`${repositoryRoot}/${operation.sourceFile}`);
    if (createHash("sha256").update(bytes).digest("hex") !== operation.checksum) errors.push(`Asset checksum mismatch: ${operation.sourceFile}.`);
  }
  if (errors.length) throw new Error(`Verification failed:\n- ${errors.join("\n- ")}`);

  const database = shouldVerifyDatabase ? await verifyDatabase(inventory.records) : undefined;
  const publicUrls = operations.flatMap((operation) => {
    const validation = validateCmsSnapshot(operation.kind as CmsDocumentKind, operation.payload, "draft");
    if (!validation.success) return [];
    const route = cmsPublicRoute(operation.kind as CmsDocumentKind, operation.slug, validation.data.content);
    return route ? [route] : [];
  });
  const report = {
    schemaVersion: 1,
    target: shouldVerifyDatabase ? "configured development database" : "manifest dry run",
    manifestDigest,
    generatedAt: new Date().toISOString(),
    parity: {
      inventoryRecords: inventory.records.length,
      contentOperations: operations.length,
      mediaOperations: mediaOperations.length,
      cmsCandidateMedia: mediaOperations.filter((operation) => operation.cmsOwnership === "cms-candidate").length,
      database,
    },
    release: {
      approvedRevisionIds: database?.approvedRevisionIds ?? [],
      cmsAuthoritativeCollections: [],
      compiledFallbackCollections: ["people", "partners", "platforms", "publications", "case-studies", "industries", "frameworks"],
      fallbackRemovalDecisions: "No fallback was removed; all migrated content remains an unapproved draft.",
      mediaReadiness: database && database.durableMediaObjects === database.media
        ? "Candidate objects are present but remain pending rights and accessibility review."
        : "Candidate metadata is present; durable object upload, rights, and accessibility remain unresolved.",
      unresolvedDrafts: operations.map((operation) => operation.externalId),
      candidatePublicUrls: publicUrls,
    },
    rollback: {
      content: "Keep compiled fallbacks enabled. If a later publication must be reverted, select its prior approved revision in the admin rollback flow.",
      data: "Use scripts/cms/output/pre-import-export.json and idempotency receipts to identify imported rows; never delete published editions during rollback.",
      media: "Static website files remain in place. Candidate CMS media remains private and pending durable-upload, rights, and accessibility checks.",
    },
  };
  if (shouldWrite) await emitJson(report, outputPath(undefined, "cutover-report.json"), true);
  console.log(`Verified ${inventory.records.length} inventory records, ${operations.length} content operations, and ${mediaOperations.length} reconciled assets${shouldVerifyDatabase ? ", including database parity" : ""}.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});