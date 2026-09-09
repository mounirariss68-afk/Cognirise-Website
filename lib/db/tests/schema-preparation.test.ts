import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import pg from "pg";
import { schemaPreparationSql } from "../scripts/schema-preparation.mjs";

test("post-merge backfills media filenames before forced schema synchronization", async () => {
  const source = await readFile(new URL("../../../scripts/post-merge.sh", import.meta.url), "utf8");
  assert.ok(source.indexOf("prepare-schema-push") < source.indexOf("push-force"));
  assert.match(schemaPreparationSql, /ADD COLUMN IF NOT EXISTS "original_filename" text/);
  assert.match(schemaPreparationSql, /SET "original_filename" = "filename"/);
  assert.match(schemaPreparationSql, /ALTER COLUMN "original_filename" SET NOT NULL/);
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
        filename text NOT NULL
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