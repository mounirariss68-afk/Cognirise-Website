import { readFile } from "node:fs/promises";
import { InventoryRecord, repositoryRoot } from "./common.js";
import { migrationOperations } from "./migration.js";

const args = process.argv.slice(2);
const inventoryPath = args.find((argument) => argument.startsWith("--inventory="))?.slice(12) ?? "scripts/cms/output/inventory.json";
const payloadPath = args.find((argument) => argument.startsWith("--payload="))?.slice(10) ?? "scripts/cms/output/import-payload.json";
const shouldVerifyDatabase = args.includes("--db");

async function verifyDatabase(records: Parameters<typeof migrationOperations>[0]) {
  const { and, eq } = await import("drizzle-orm");
  const {
    cmsAuditEventsTable, cmsDocumentsTable, cmsMarketEditionsTable,
    cmsOperationReceiptsTable, cmsPasswordCredentialsTable, cmsRevisionsTable,
    cmsSessionsTable, cmsUsersTable, db, pool,
  } = await import("@workspace/db");
  try {
    await db.transaction(async (tx) => {
      const [serviceAccount] = await tx.select({ id: cmsUsersTable.id })
        .from(cmsUsersTable)
        .where(and(
          eq(cmsUsersTable.email, "cms-inventory-migration@service.invalid"),
          eq(cmsUsersTable.role, "viewer"),
          eq(cmsUsersTable.status, "suspended"),
        ));
      if (!serviceAccount) throw new Error("Migration service account is missing or not suspended viewer.");
      const credentials = await tx.select({ userId: cmsPasswordCredentialsTable.userId })
        .from(cmsPasswordCredentialsTable).where(eq(cmsPasswordCredentialsTable.userId, serviceAccount.id));
      const sessions = await tx.select({ userId: cmsSessionsTable.userId })
        .from(cmsSessionsTable).where(eq(cmsSessionsTable.userId, serviceAccount.id));
      if (credentials.length || sessions.length) throw new Error("Migration service account must not have password credentials or sessions.");
      for (const operation of migrationOperations(records)) {
        const [document] = await tx.select({ id: cmsDocumentsTable.id, kind: cmsDocumentsTable.kind })
          .from(cmsDocumentsTable).where(eq(cmsDocumentsTable.canonicalSlug, operation.slug));
        if (!document || document.kind !== operation.kind) throw new Error(`Missing document parity for ${operation.externalId}.`);
        const [edition] = await tx.select({ id: cmsMarketEditionsTable.id, publicationState: cmsMarketEditionsTable.publicationState })
          .from(cmsMarketEditionsTable).where(and(
            eq(cmsMarketEditionsTable.documentId, document.id),
            eq(cmsMarketEditionsTable.market, "uae"),
          ));
        if (!edition || edition.publicationState !== "draft") throw new Error(`Missing UAE draft parity for ${operation.externalId}.`);
        const [revision] = await tx.select({ id: cmsRevisionsTable.id, workflowState: cmsRevisionsTable.workflowState, createdByUserId: cmsRevisionsTable.createdByUserId })
          .from(cmsRevisionsTable).where(and(
            eq(cmsRevisionsTable.editionId, edition.id),
            eq(cmsRevisionsTable.revisionNumber, 1),
          ));
        if (!revision || revision.workflowState !== "draft" || revision.createdByUserId !== serviceAccount.id) throw new Error(`Missing draft revision parity for ${operation.externalId}.`);
        const [receipt] = await tx.select({ idempotencyKey: cmsOperationReceiptsTable.idempotencyKey })
          .from(cmsOperationReceiptsTable).where(eq(cmsOperationReceiptsTable.idempotencyKey, operation.idempotencyKey));
        const [audit] = await tx.select({ requestId: cmsAuditEventsTable.requestId })
          .from(cmsAuditEventsTable).where(eq(cmsAuditEventsTable.requestId, operation.idempotencyKey));
        if (!receipt || !audit) throw new Error(`Missing receipt or audit event for ${operation.externalId}.`);
      }
    });
  } finally {
    await pool.end();
  }
}

async function main() {
  const inventory = JSON.parse(await readFile(`${repositoryRoot}/${inventoryPath}`, "utf8")) as { expectedCounts: Record<string, number>; records: InventoryRecord[] };
  const payload = JSON.parse(await readFile(`${repositoryRoot}/${payloadPath}`, "utf8")) as { operations: { externalId: string }[] };
  const count = (items: { type: string }[], type: string) => items.filter((item) => item.type === type).length;
  const errors: string[] = [];
  for (const [type, expected] of Object.entries({ partner: 5, platform: 5, article: 3 })) if (count(inventory.records, type) !== expected) errors.push(`Expected ${expected} ${type} records, found ${count(inventory.records, type)}.`);
  if (inventory.expectedCounts.advisors !== 3) errors.push(`Expected three advisors, found ${inventory.expectedCounts.advisors}.`);
  const migratableRecords = inventory.records.filter((record) => record.type !== "asset");
  const inventoryIds = new Set(migratableRecords.map((record) => record.externalId));
  const allInventoryIds = new Set(inventory.records.map((record) => record.externalId));
  const payloadIds = new Set(payload.operations.map((operation) => operation.externalId));
  if (allInventoryIds.size !== inventory.records.length || payloadIds.size !== payload.operations.length) errors.push("Duplicate external IDs detected.");
  if (inventoryIds.size !== payloadIds.size || [...inventoryIds].some((id) => !payloadIds.has(id))) errors.push("Payload does not exactly cover inventory external IDs.");
  if (errors.length) throw new Error(`Verification failed:\n- ${errors.join("\n- ")}`);
  if (shouldVerifyDatabase) await verifyDatabase(inventory.records);
  console.log(`Verified ${inventory.records.length} inventory records and ${payload.operations.length} non-asset idempotent upserts${shouldVerifyDatabase ? ", including DB parity" : ""}.`);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });