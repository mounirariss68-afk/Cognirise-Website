import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { schemaPreparationSql } from "../scripts/schema-preparation.mjs";

test("navigation version preparation preserves policy data and replays safely", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO pg_temp");
    for (const table of ["cms_navigation_editions", "cms_page_availability", "cms_navigation_published_policies"]) {
      await client.query(`CREATE TEMP TABLE ${table} (id integer PRIMARY KEY, payload text)`);
      await client.query(`INSERT INTO ${table} VALUES (1, 'preserved-approved-policy')`);
    }
    await client.query(schemaPreparationSql);
    await client.query("UPDATE cms_navigation_published_policies SET published_version=7");
    await client.query(schemaPreparationSql);
    for (const table of ["cms_navigation_editions", "cms_page_availability", "cms_navigation_published_policies"]) {
      const column = table === "cms_navigation_published_policies" ? "published_version" : "version";
      const result = await client.query(`SELECT payload, ${column} AS version FROM ${table}`);
      assert.deepEqual(result.rows, [{ payload: "preserved-approved-policy", version: column === "published_version" ? 7 : 1 }]);
    }
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
});

test("post-merge prepares narrow media compatibility before safe schema synchronization", async () => {
  const source = await readFile(new URL("../../../scripts/post-merge.sh", import.meta.url), "utf8");
  const contentSchema = await readFile(new URL("../src/schema/cms-content.ts", import.meta.url), "utf8");
  assert.ok(source.indexOf("prepare-schema-push") < source.indexOf("@workspace/db push"));
  assert.doesNotMatch(source, /push-force/);
  assert.match(schemaPreparationSql, /ADD COLUMN IF NOT EXISTS "original_filename" text/);
  assert.match(schemaPreparationSql, /SET "original_filename" = "filename"/);
  assert.match(schemaPreparationSql, /ALTER COLUMN "original_filename" SET NOT NULL/);
  assert.match(schemaPreparationSql, /ADD COLUMN IF NOT EXISTS "motion_metadata" jsonb/);
  assert.match(schemaPreparationSql, /'website', 'linkedin', 'motion'/);
  assert.match(schemaPreparationSql, /cms_media_assets_motion_type_check/);
  assert.match(schemaPreparationSql, /cms_media_assets_motion_metadata_check/);
  assert.match(schemaPreparationSql, /Development-only merge preparation for the additive 0027/);
  assert.match(schemaPreparationSql, /CREATE TABLE IF NOT EXISTS "cms_operation_receipts"/);
  assert.match(schemaPreparationSql, /CREATE TABLE "cms_access_delivery_jobs"/);
  assert.match(schemaPreparationSql, /cms_access_delivery_jobs_due_idx/);
  assert.match(schemaPreparationSql, /Development-only preparation for additive migration 0029/);
  assert.match(schemaPreparationSql, /CREATE TABLE IF NOT EXISTS cms_shared_baselines/);
  assert.match(schemaPreparationSql, /CREATE TABLE IF NOT EXISTS cms_market_edition_bindings/);
  assert.match(schemaPreparationSql, /CREATE TABLE IF NOT EXISTS cms_resolved_market_revisions/);
  assert.match(schemaPreparationSql, /cms_shared_baseline_revisions_immutable/);
  assert.match(schemaPreparationSql, /Development-only preparation for additive migration 0031/);
  assert.match(schemaPreparationSql, /cms_editorial_digest_jobs_delivery_identity_check/);
  assert.match(schemaPreparationSql, /delivery_configuration_fingerprint/);
  assert.match(schemaPreparationSql, /cannot prepare shared pointer integrity/);
  assert.match(schemaPreparationSql, /CREATE CONSTRAINT TRIGGER cms_market_edition_bindings_integrity/);
  assert.match(schemaPreparationSql, /DEFERRABLE INITIALLY DEFERRED/);
  assert.match(schemaPreparationSql, /cms_resolved_market_revisions_integrity/);
  assert.match(schemaPreparationSql, /cms_revisions_shared_pointer_integrity/);
  assert.match(schemaPreparationSql, /cms_assert_shared_pointer_dependency_integrity/);
  assert.match(
    contentSchema,
    /cmsPersonMarketAvailabilityTable[\s\S]*?createdAt: timestamp\("created_at", \{ withTimezone: true \}\)\.notNull\(\)\.defaultNow\(\)/,
  );
});

test("schema preparation preserves populated media rows and is idempotent", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO pg_temp");
    await client.query(`
      CREATE TEMP TABLE cms_media_assets (
        id text PRIMARY KEY,
        filename text NOT NULL,
        media_type text NOT NULL DEFAULT 'image/png',
        collection text NOT NULL DEFAULT 'website',
        linkedin_asset_kind text
      )
    `);
    await client.query(`
      INSERT INTO cms_media_assets (id, filename)
      VALUES ('asset-1', 'published-case.png')
    `);
    await client.query(schemaPreparationSql);
    await client.query(schemaPreparationSql);
    const result = await client.query(`
      SELECT id, filename, original_filename
        FROM cms_media_assets
    `);
    assert.deepEqual(result.rows, [{
      id: "asset-1",
      filename: "published-case.png",
      original_filename: "published-case.png",
    }]);
    const nullable = await client.query(`
      SELECT is_nullable
        FROM information_schema.columns
       WHERE table_schema LIKE 'pg_temp_%'
         AND table_name = 'cms_media_assets'
         AND column_name = 'original_filename'
    `);
    assert.equal(nullable.rows[0]?.is_nullable, "NO");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});

test("schema preparation restores absent 0027 receipt and outbox structures idempotently", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO pg_temp");
    await client.query("CREATE TEMP TABLE cms_users (id uuid PRIMARY KEY)");
    await client.query("CREATE TEMP TABLE cms_user_access_tokens (id uuid PRIMARY KEY)");
    await client.query(schemaPreparationSql);
    await client.query(schemaPreparationSql);
    const columns = await client.query<{ table_name: string; column_name: string }>(`
      SELECT table_name, column_name
        FROM information_schema.columns
       WHERE table_schema LIKE 'pg_temp_%'
         AND table_name IN ('cms_operation_receipts', 'cms_access_delivery_jobs')
       ORDER BY table_name, ordinal_position
    `);
    const found = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`));
    for (const column of [
      "cms_operation_receipts.idempotency_key",
      "cms_operation_receipts.response",
      "cms_operation_receipts.status_code",
      "cms_access_delivery_jobs.id",
      "cms_access_delivery_jobs.payload_ciphertext",
      "cms_access_delivery_jobs.available_at",
      "cms_access_delivery_jobs.updated_at",
    ]) {
      assert.ok(found.has(column), `missing prepared 0027 column ${column}`);
    }
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});