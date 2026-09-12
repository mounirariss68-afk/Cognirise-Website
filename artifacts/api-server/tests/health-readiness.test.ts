import assert from "node:assert/strict";
import test from "node:test";
import { runReadinessChecks } from "../src/routes/health";

const requiredColumns = [
  ["market_editions", "code"],
  ["market_editions", "default_locale"],
  ["market_editions", "enabled"],
  ["cms_documents", "id"],
  ["cms_documents", "status"],
  ["cms_market_editions", "id"],
  ["cms_market_editions", "document_id"],
  ["cms_market_editions", "market"],
  ["cms_market_editions", "locale"],
  ["cms_market_editions", "content_mode"],
  ["cms_market_editions", "publication_state"],
  ["cms_market_editions", "published_revision_id"],
  ["cms_revisions", "id"],
  ["cms_revisions", "edition_id"],
  ["cms_revisions", "payload"],
  ["cms_revisions", "content_digest"],
  ["cms_revisions", "workflow_state"],
  ["cms_revisions", "created_by_user_id"],
  ["cms_navigation_published_policies", "market"],
  ["cms_navigation_published_policies", "locale"],
  ["cms_navigation_published_policies", "items"],
  ["cms_navigation_published_policies", "pages"],
  ["cms_navigation_published_policies", "published_version"],
  ["cms_navigation_items", "id"],
  ["cms_navigation_items", "enabled"],
  ["cms_navigation_items", "visible"],
  ["cms_operation_receipts", "idempotency_key"],
  ["cms_operation_receipts", "operation"],
  ["cms_operation_receipts", "subject_id"],
  ["cms_operation_receipts", "request_digest"],
  ["cms_operation_receipts", "result_digest"],
  ["cms_operation_receipts", "actor_user_id"],
  ["cms_operation_receipts", "response"],
  ["cms_operation_receipts", "status_code"],
  ["cms_operation_receipts", "created_at"],
  ["cms_access_delivery_jobs", "id"],
  ["cms_access_delivery_jobs", "user_id"],
  ["cms_access_delivery_jobs", "access_token_id"],
  ["cms_access_delivery_jobs", "purpose"],
  ["cms_access_delivery_jobs", "status"],
  ["cms_access_delivery_jobs", "attempts"],
  ["cms_access_delivery_jobs", "payload_ciphertext"],
  ["cms_access_delivery_jobs", "payload_expires_at"],
  ["cms_access_delivery_jobs", "available_at"],
  ["cms_access_delivery_jobs", "processing_lease"],
  ["cms_access_delivery_jobs", "last_attempt_at"],
  ["cms_access_delivery_jobs", "sent_at"],
  ["cms_access_delivery_jobs", "failed_at"],
  ["cms_access_delivery_jobs", "provider_message_id"],
  ["cms_access_delivery_jobs", "last_error"],
  ["cms_access_delivery_jobs", "created_at"],
  ["cms_access_delivery_jobs", "updated_at"],
  ["cms_document_availability_states", "document_id"],
  ["cms_document_availability_states", "shared_source_edition_id"],
  ["cms_document_availability_states", "published_source_revision_id"],
  ["cms_media_references", "document_id"],
  ["cms_media_references", "asset_id"],
  ["cms_media_references", "media_version_id"],
  ["cms_media_references", "field_path"],
].map(([table_name, column_name]) => ({ table_name, column_name }));

test("readiness is unavailable when the database cannot be reached", async () => {
  const result = await runReadinessChecks({
    query: async () => {
      throw new Error("database unavailable");
    },
  });
  assert.deepEqual(result, {
    status: "unavailable",
    checks: { database: "unavailable", schema: "unavailable", navigation: "unavailable" },
  });
});

test("readiness checks schema compatibility and a representative public navigation path", async () => {
  const calls: string[] = [];
  const result = await runReadinessChecks(
    {
      query: async (text) => {
        calls.push(text);
        if (text === "SELECT 1") return { rows: [], rowCount: 1 };
        if (text.includes("information_schema.columns")) return { rows: requiredColumns, rowCount: requiredColumns.length };
        return { rows: [{ code: "uae", default_locale: "en" }], rowCount: 1 };
      },
    },
    async (market, locale) => {
      assert.equal(market, "uae");
      assert.equal(locale, "en");
    },
  );
  assert.equal(result.status, "ok");
  assert.deepEqual(result.checks, { database: "ok", schema: "ok", navigation: "ok" });
  assert.ok(calls.some((text) => text.includes("information_schema.columns")));
});

test("readiness never exposes schema details when compatibility is incomplete", async () => {
  const result = await runReadinessChecks({
    query: async (text) => {
      if (text === "SELECT 1") return { rows: [], rowCount: 1 };
      return { rows: [], rowCount: 0 };
    },
  });
  assert.deepEqual(result, {
    status: "unavailable",
    checks: { database: "ok", schema: "unavailable", navigation: "unavailable" },
  });
});

test("readiness rejects a schema without the 0027 receipt or delivery tables", async () => {
  const missingDeliverySchema = requiredColumns.filter(({ table_name }) =>
    table_name !== "cms_operation_receipts" && table_name !== "cms_access_delivery_jobs"
  );
  const result = await runReadinessChecks({
    query: async (text) => {
      if (text === "SELECT 1") return { rows: [], rowCount: 1 };
      return { rows: missingDeliverySchema, rowCount: missingDeliverySchema.length };
    },
  });
  assert.deepEqual(result.checks, {
    database: "ok",
    schema: "unavailable",
    navigation: "unavailable",
  });
  assert.equal(result.status, "unavailable");
});