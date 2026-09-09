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
import { CASE_STUDY_TAXONOMY_COUNTS } from "./case-studies.js";
import { PUBLIC_MARKET_BASELINE } from "./market-baseline.js";

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
    const caseMediaPaths = new Set(caseStudyMediaPaths(records));
    const mediaOperations = mediaMigrationOperations(records);
    return await db.transaction(async (tx) => {
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
          throw new Error(`${expected.code} public market configuration parity failed.`);
        }
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
      for (const operation of mediaOperations.filter((item) => item.cmsOwnership === "cms-candidate")) {
        const [asset] = await tx.select({
          id: cmsMediaAssetsTable.id,
          status: cmsMediaAssetsTable.status,
          checksum: cmsMediaAssetsTable.checksum,
          byteSize: cmsMediaAssetsTable.byteSize,
          storageKey: cmsMediaAssetsTable.storageKey,
        }).from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.checksum, operation.checksum));
        if (
          !asset ||
           !((caseMediaPaths.has(operation.publicPath) && (asset.status === "active" || asset.status === "ready"))
             || (!caseMediaPaths.has(operation.publicPath) && asset.status === "pending-review")) ||
          asset.byteSize !== operation.byteSize
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
      const publishedSummaryExternalIds: string[] = [];
      let publishedSummaryMediaReady = true;
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
        const isSummaryCase = operation.kind === "case-study" && operation.mediaPaths.length === 1;
        if (!edition || edition.locale !== "en"
          || (isSummaryCase
            ? edition.publicationState !== "published" || !edition.publishedRevisionId
            : edition.publicationState !== "draft" || edition.publishedRevisionId)) {
          throw new Error(`Missing isolated UAE/English draft parity for ${operation.externalId}.`);
        }
        const revisionPredicate = isSummaryCase
          ? eq(cmsRevisionsTable.id, edition.publishedRevisionId!)
          : and(
              eq(cmsRevisionsTable.editionId, edition.id),
              eq(cmsRevisionsTable.revisionNumber, 1),
            );
        const [revision] = await tx.select({
          id: cmsRevisionsTable.id,
          payload: cmsRevisionsTable.payload,
          contentDigest: cmsRevisionsTable.contentDigest,
          workflowState: cmsRevisionsTable.workflowState,
          createdByUserId: cmsRevisionsTable.createdByUserId,
          approvedByUserId: cmsRevisionsTable.approvedByUserId,
        }).from(cmsRevisionsTable).where(revisionPredicate);
        if (
          !revision ||
          (isSummaryCase ? revision.workflowState !== "approved" : revision.workflowState !== "draft") ||
          revision.createdByUserId !== serviceAccount.id ||
          (isSummaryCase ? !revision.approvedByUserId : revision.approvedByUserId)
        ) throw new Error(`Missing unapproved draft revision parity for ${operation.externalId}.`);
        const validation = validateCmsSnapshot(operation.kind as CmsDocumentKind, revision.payload, isSummaryCase ? "publish" : "draft");
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
          .where(and(
            eq(cmsMediaReferencesTable.documentId, document.id),
            eq(cmsMediaReferencesTable.fieldPath, `revision:${revision.id}`),
          ));
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
          audit.action !== (isSummaryCase
            ? "cms.inventory.case-study-summary-published"
            : "cms.inventory.imported") ||
          audit.targetId !== String(document.id)
        ) throw new Error(`Receipt/audit parity mismatch for ${operation.externalId}.`);
        if (isSummaryCase) approvedRevisionIds.push(String(revision.id));
        else draftRevisionIds.push(String(revision.id));
        if (isSummaryCase) {
          publishedSummaryExternalIds.push(operation.externalId);
          const [publishedReference] = await tx.select({
            mediaVersionId: cmsMediaReferencesTable.mediaVersionId,
          }).from(cmsMediaReferencesTable).where(and(
            eq(cmsMediaReferencesTable.documentId, document.id),
            eq(cmsMediaReferencesTable.fieldPath, `revision:${revision.id}`),
          ));
          const [publishedMediaVersion] = publishedReference?.mediaVersionId
            ? await tx.select({
                checksum: cmsMediaVersionsTable.checksum,
                storageKey: cmsMediaVersionsTable.storageKey,
              }).from(cmsMediaVersionsTable)
                .where(eq(cmsMediaVersionsTable.id, publishedReference.mediaVersionId))
            : [];
          const expectedCaseMedia = mediaOperations.find((item) =>
            item.publicPath === operation.mediaPaths[0]
          );
          if (!publishedMediaVersion
            || publishedMediaVersion.checksum !== expectedCaseMedia?.checksum
            || publishedMediaVersion.storageKey.startsWith("deferred/")) {
            publishedSummaryMediaReady = false;
          }
        }
      }
      return {
        documents: migrationOperations(records).length,
        editions: migrationOperations(records).length,
        revisions: draftRevisionIds.length + approvedRevisionIds.length,
        media: mediaByPath.size,
        durableMediaObjects,
        mediaReceiptConflicts,
        references: migrationOperations(records).reduce((total, operation) => total + operation.mediaPaths.length, 0),
        receipts: migrationOperations(records).length + mediaByPath.size,
        audits: migrationOperations(records).length + mediaByPath.size,
        approvedRevisionIds,
        draftRevisionIds,
        publishedSummaryExternalIds,
        publishedSummaryMediaReady,
      };
    });
  } finally {
    await pool.end();
  }
}

function caseStudyMediaPaths(records: InventoryRecord[]) {
  return new Set(records.filter((record) => record.type === "case-study")
    .flatMap((record) => Array.isArray(record.fields.mediaPaths)
      ? record.fields.mediaPaths.filter((path): path is string => typeof path === "string")
      : []));
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
    "case-study": inventory.expectedCounts.caseStudies,
  };
  for (const [type, expected] of Object.entries(expectedByType)) {
    if (typeof expected !== "number") {
      errors.push(`Inventory expectedCounts is missing ${type}.`);
      continue;
    }
    if (count(type) !== expected) errors.push(`Expected ${expected} ${type} records, found ${count(type)}.`);
  }
  const expectedTaxonomy = CASE_STUDY_TAXONOMY_COUNTS;
  if (inventory.expectedCounts.caseStudies !== 21) {
    errors.push(`Expected exactly 21 case studies, found ${inventory.expectedCounts.caseStudies ?? "missing"}.`);
  }
  const actualTaxonomy = Object.fromEntries(Object.keys(expectedTaxonomy).map((sector) => [
    sector,
    inventory.records.filter((record) =>
      record.type === "case-study"
      && (record.fields.content as Record<string, unknown> | undefined)?.sector === sector,
    ).length,
  ]));
  if (JSON.stringify(actualTaxonomy) !== JSON.stringify(expectedTaxonomy)) {
    errors.push(`Case-study taxonomy mismatch: expected ${JSON.stringify(expectedTaxonomy)}, found ${JSON.stringify(actualTaxonomy)}.`);
  }
  if (JSON.stringify(inventory.expectedCounts.caseStudyTaxonomy) !== JSON.stringify(expectedTaxonomy)) {
    errors.push("Inventory expectedCounts.caseStudyTaxonomy does not match the controlled taxonomy.");
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
      cmsAuthoritativeCollections: database?.publishedSummaryExternalIds.length === 21
        ? ["case-studies"]
        : [],
      compiledFallbackCollections: ["people", "partners", "platforms", "publications", "case-studies", "industries", "frameworks"],
      fallbackRemovalDecisions: database
        ? database.publishedSummaryExternalIds.length === 21
          ? "Case-study summary fallbacks are eligible for removal; all other collections remain compiled fallbacks."
          : "No fallback was removed; published case-study summary coverage is incomplete."
        : "Dry run only; no fallback was removed and no database publication was verified.",
      mediaReadiness: database
        ? database.publishedSummaryMediaReady && database.durableMediaObjects === database.media
          ? "Verified durable media and immutable pins are ready for published case-study summaries; editorial rights and accessibility remain governed in CMS."
          : "Verified database state still has incomplete durable media or immutable summary pins."
        : "Not verified in dry run; durable media, immutable pins, rights, and accessibility require database verification.",
      unresolvedDrafts: database ? database.draftRevisionIds : [],
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