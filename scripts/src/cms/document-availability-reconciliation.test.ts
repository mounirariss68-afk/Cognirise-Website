import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { reconcileDocumentAvailability } from "./document-availability-reconciliation.js";

test("document availability reconciliation is transactional and fails parity mismatches", async () => {
  const statements: string[] = [];
  await reconcileDocumentAvailability({
    async query(sql) {
      statements.push(sql);
      return sql.includes("FROM cms_document_availability_migration_reports")
        ? { rows: [{ failures: 0 }] }
        : { rows: [] };
    },
  }, "SELECT 'reconcile';");
  assert.deepEqual(statements, [
    "BEGIN",
    "SELECT 'reconcile';",
    statements[2],
    statements[3],
    "COMMIT",
  ]);
  assert.match(statements[2]!, /ambiguous_internal_origins/);
  assert.match(statements[3]!, /NOT visibility_preserved/);
  assert.match(statements[3]!, /OR NOT selection_preserved/);

  const failed: string[] = [];
  await assert.rejects(() => reconcileDocumentAvailability({
    async query(sql) {
      failed.push(sql);
      return sql.includes("FROM cms_document_availability_migration_reports")
        ? { rows: [{ failures: 1 }] }
        : { rows: [] };
    },
  }, "SELECT 'reconcile';"), /parity verification failed/);
  assert.equal(failed.at(-1), "ROLLBACK");
});

test("development reconciliation applies availability then editorial-origin migration in one transaction", async () => {
  const statements: string[] = [];
  await reconcileDocumentAvailability({
    async query(sql) {
      statements.push(sql);
      return sql.includes("FROM cms_document_availability_migration_reports")
        ? { rows: [{ failures: 0 }] }
        : { rows: [] };
    },
  }, ["-- 0024 availability", "-- 0025 editorial origin"]);
  assert.deepEqual(statements, [
    "BEGIN",
    "-- 0024 availability",
    "-- 0025 editorial origin",
    statements[3],
    statements[4],
    "COMMIT",
  ]);
  assert.match(statements[3]!, /ambiguous_internal_origins/);
  assert.match(statements[4]!, /FROM cms_document_availability_migration_reports/);
});

test("migration only promotes pre-state singleton editions and preserves selected sources", async () => {
  const sql = await readFile(
    resolve(import.meta.dirname, "../../../lib/db/migrations/0024_cms_document_availability.sql"),
    "utf8",
  );
  assert.match(sql, /Only records without an availability state are historical migration/);
  assert.match(sql, /AND NOT EXISTS \(\s*SELECT 1 FROM "cms_document_availability_states" state/);
  assert.match(sql, /AND state\."shared_source_edition_id" IS NULL/);
  assert.match(sql, /ORDER BY r\."revision_number" DESC,r\."created_at" DESC,r\."id" DESC/);
  assert.match(sql, /cms_document_availability_candidates/);
  assert.match(sql, /recursive fallback using its parent's configured/);
  assert.match(sql, /legacy_selected_revision_id/);
  assert.match(sql, /selection_preserved/);
  assert.match(sql, /migration receipts are immutable/);
  assert.match(sql, /cms_document_availability_migration_control/);
  assert.match(sql, /ON CONFLICT \("document_id","market_edition_id","locale"\) DO NOTHING/);
});

test("editorial-origin migration traces revision lineage and reports unresolved origins", async () => {
  const sql = await readFile(
    resolve(import.meta.dirname, "../../../lib/db/migrations/0025_cms_editorial_market.sql"),
    "utf8",
  );
  assert.match(sql, /WITH RECURSIVE revision_lineage/);
  assert.match(sql, /r\."source_revision_id"/);
  assert.match(sql, /document\.shared_source_relocated/);
  assert.match(sql, /metadata"->'from'->>'market'/);
  assert.match(sql, /candidate_count=1/);
  assert.match(sql, /CMS editorial-market reconciliation left % ambiguous origins unresolved/);
});