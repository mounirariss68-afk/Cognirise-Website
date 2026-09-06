import { readFile } from "node:fs/promises";
import { emitJson, InventoryRecord, outputPath, repositoryRoot } from "./common.js";
import { migrationOperations, resultDigest } from "./migration.js";

const args = process.argv.slice(2);
const shouldWrite = args.includes("--write");
const shouldApplyDatabase = args.includes("--apply-db");
const input = args.find((argument) => argument.startsWith("--in="))?.slice(5) ?? "scripts/cms/output/inventory.json";
const destination = args.find((argument) => argument.startsWith("--out="))?.slice(6);

async function applyDatabase(operations: ReturnType<typeof migrationOperations>) {
  const { and, eq } = await import("drizzle-orm");
  const {
    cmsAuditEventsTable, cmsDocumentsTable, cmsMarketEditionsTable,
    cmsOperationReceiptsTable, cmsRevisionsTable, cmsUsersTable, db, pool,
  } = await import("@workspace/db");
  try {
    const imported = await db.transaction(async (tx) => {
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

        const [document] = await tx.insert(cmsDocumentsTable).values({
          kind: operation.kind, canonicalSlug: operation.slug, title: operation.title,
          ownerId: serviceAccount.id, status: "active",
        }).returning({ id: cmsDocumentsTable.id });
        if (!document) throw new Error(`Could not create ${operation.externalId}.`);
        const [edition] = await tx.insert(cmsMarketEditionsTable).values({
          documentId: document.id, market: "uae", locale: "en", localizedSlug: operation.slug,
          publicationState: "draft", fallbackMode: "none", parityComplete: false,
        }).returning({ id: cmsMarketEditionsTable.id });
        if (!edition) throw new Error(`Could not create UAE edition for ${operation.externalId}.`);
        await tx.insert(cmsRevisionsTable).values({
          editionId: edition.id, revisionNumber: 1, payload: operation.payload,
          contentDigest: resultDigest(operation.payload), workflowState: "draft",
          createdByUserId: serviceAccount.id, reason: "Inventory migration; pending editorial review.",
        });
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: operation.idempotencyKey, operation: "cms.inventory.import",
          subjectId: document.id, requestDigest: operation.requestDigest,
          resultDigest: resultDigest({ documentId: document.id, editionId: edition.id }),
        });
        await tx.insert(cmsAuditEventsTable).values({
          actorUserId: serviceAccount.id, actorLabel: "cms-inventory-migration",
          action: "cms.inventory.imported", targetType: operation.kind, targetId: document.id,
          requestId: operation.idempotencyKey,
          metadata: { market: "uae", workflowState: "draft", sourceType: "inventory" },
        });
        created++;
      }
      return { created, replayed };
    });
    return imported;
  } finally {
    await pool.end();
  }
}

async function main() {
  const inventory = JSON.parse(await readFile(`${repositoryRoot}/${input}`, "utf8")) as { schemaVersion: number; records: InventoryRecord[] };
  if (inventory.schemaVersion !== 1 || !Array.isArray(inventory.records)) throw new Error("Unsupported or invalid inventory file.");
  const operations = migrationOperations(inventory.records);
  const database = shouldApplyDatabase ? await applyDatabase(operations) : undefined;
  await emitJson({
    schemaVersion: 1, generatedAt: new Date().toISOString(), dryRun: !shouldApplyDatabase,
    mode: shouldApplyDatabase ? "db-apply" : "payload-only",
    note: shouldApplyDatabase
      ? "Applied draft UAE revisions transactionally; no migrated claim was published."
      : "No API or database call was made. Pass --apply-db to create UAE draft revisions.",
    operations, database,
  }, outputPath(destination, "import-payload.json"), shouldWrite);
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });