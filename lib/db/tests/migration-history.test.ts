import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const journalPath = new URL("../migrations/meta/_journal.json", import.meta.url);
const expectedMigrations = [
  { idx: 8, when: 1788747983000, tag: "0008_cms_person_market_availability" },
  { idx: 9, when: 1788747983001, tag: "0009_cms_person_market_availability_staging" },
  { idx: 10, when: 1788747983002, tag: "0010_cms_media_collections" },
  { idx: 11, when: 1788747983003, tag: "0011_cms_revision_media_versions" },
];

test("registers migrations in ordered Drizzle history", async () => {
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: Array<{ idx: number; when: number; tag: string }>;
  };

  assert.deepEqual(
    journal.entries.slice(-4).map(({ idx, when, tag }) => ({ idx, when, tag })),
    expectedMigrations,
  );
  assert.equal(new Set(journal.entries.map((entry) => entry.idx)).size, journal.entries.length);
  assert.equal(new Set(journal.entries.map((entry) => entry.when)).size, journal.entries.length);
  assert.ok(journal.entries.every((entry, index) => index === 0 || entry.when > journal.entries[index - 1].when));
});

test("upgrades a migration-0007 database and resolves staged availability only after publish", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (context) => {
  const schema = `migration_test_${process.pid}_${Date.now()}`;
  assert.match(schema, /^[a-z0-9_]+$/);

  const adminPool = new Pool({ connectionString: process.env.DATABASE_URL, max: 1 });
  const migrationPool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1,
    options: `-c search_path=${schema}`,
  });

  context.after(async () => {
    await migrationPool.end();
    await adminPool.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await adminPool.end();
  });

  await adminPool.query(`CREATE SCHEMA "${schema}"`);
  const publishedDocumentId = randomUUID();
  const publishedEditionId = randomUUID();
  const publishedRevisionId = randomUUID();
  const publishedAssetId = randomUUID();
  const publishedReferenceId = randomUUID();
  const firstVersionId = randomUUID();
  const approvedVersionId = randomUUID();
  const missingReferenceAssetId = randomUUID();
  const missingReferenceVersionId = randomUUID();
  await migrationPool.query(`
    CREATE TABLE "cms_documents" ("id" uuid PRIMARY KEY);
    CREATE TABLE "cms_market_editions" (
      "id" uuid PRIMARY KEY,
      "document_id" uuid NOT NULL,
      "published_revision_id" uuid,
      "published_at" timestamp with time zone
    );
    CREATE TABLE "cms_revisions" (
      "id" uuid PRIMARY KEY,
      "payload" jsonb NOT NULL DEFAULT '{"mediaIds":[]}'::jsonb,
      "approved_at" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE TABLE "market_editions" ("id" uuid PRIMARY KEY);
    CREATE TABLE "cms_users" ("id" uuid PRIMARY KEY);
    CREATE TABLE "cms_media_assets" (
      "id" uuid PRIMARY KEY,
      "storage_key" text NOT NULL,
      "filename" text NOT NULL,
      "media_type" text NOT NULL,
      "byte_size" integer NOT NULL,
      "checksum" text NOT NULL,
      "status" text NOT NULL
    );
    CREATE TABLE "cms_media_versions" (
      "id" uuid PRIMARY KEY,
      "asset_id" uuid NOT NULL,
      "version_number" integer NOT NULL,
      "storage_key" text NOT NULL,
      "checksum" text NOT NULL,
      "created_at" timestamp with time zone NOT NULL
    );
    CREATE TABLE "cms_media_references" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "asset_id" uuid NOT NULL,
      "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE cascade,
      "field_path" text NOT NULL
    );
    CREATE TABLE "${schema}"."__drizzle_migrations" (
      "id" serial PRIMARY KEY,
      "hash" text NOT NULL,
      "created_at" bigint
    );
    INSERT INTO "${schema}"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('migration-0007-fixture', 1788725000000);
  `);
  await migrationPool.query(`INSERT INTO "cms_documents" ("id") VALUES ($1)`, [
    publishedDocumentId,
  ]);
  await migrationPool.query(`INSERT INTO "cms_revisions" ("id") VALUES ($1)`, [
    publishedRevisionId,
  ]);
  await migrationPool.query(
    `UPDATE "cms_revisions"
        SET "payload"=jsonb_build_object(
          'mediaIds', jsonb_build_array($2::text, $3::text)
        )
      WHERE "id"=$1`,
    [publishedRevisionId, publishedAssetId, missingReferenceAssetId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_market_editions"
       ("id", "document_id", "published_revision_id", "published_at")
       VALUES ($1, $2, $3, '2026-06-01T00:00:00Z')`,
    [publishedEditionId, publishedDocumentId, publishedRevisionId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_media_assets"
       ("id", "storage_key", "filename", "media_type", "byte_size", "checksum", "status")
       VALUES ($1, 'asset.png', 'asset.png', 'image/png', 1, 'asset-checksum', 'active')`,
    [publishedAssetId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_media_versions"
       ("id", "asset_id", "version_number", "storage_key", "checksum", "created_at")
       VALUES
         ($1, $3, 1, 'v1.png', 'v1-checksum', '2026-04-01T00:00:00Z'),
         ($2, $3, 2, 'v2.png', 'v2-checksum', '2026-05-01T00:00:00Z')`,
    [firstVersionId, approvedVersionId, publishedAssetId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_media_assets"
       ("id", "storage_key", "filename", "media_type", "byte_size", "checksum", "status")
       VALUES ($1, 'missing-ref.png', 'missing-ref.png', 'image/png', 1, 'missing-ref-checksum', 'active')`,
    [missingReferenceAssetId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_media_versions"
       ("id", "asset_id", "version_number", "storage_key", "checksum", "created_at")
       VALUES ($1, $2, 1, 'missing-ref-v1.png', 'missing-ref-v1-checksum', '2026-05-15T00:00:00Z')`,
    [missingReferenceVersionId, missingReferenceAssetId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_media_references"
       ("id", "asset_id", "document_id", "field_path")
       VALUES ($1, $2, $3, 'revision:' || $4::text)`,
    [
      publishedReferenceId,
      publishedAssetId,
      publishedDocumentId,
      publishedRevisionId,
    ],
  );

  await migrate(drizzle(migrationPool), {
    migrationsFolder,
    migrationsSchema: schema,
    migrationsTable: "__drizzle_migrations",
  });

  const applied = await adminPool.query<{ created_at: string }>(
    `SELECT "created_at" FROM "${schema}"."__drizzle_migrations" ORDER BY "created_at"`,
  );
  assert.deepEqual(
    applied.rows.map((row) => Number(row.created_at)),
    [1788725000000, ...expectedMigrations.map((entry) => entry.when)],
  );

  const mediaReferenceColumns = await adminPool.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = $1 AND table_name = 'cms_media_references'
      ORDER BY column_name`,
    [schema],
  );
  assert.ok(mediaReferenceColumns.rows.some((row) => row.column_name === "media_version_id"));

  const pinnedReference = await migrationPool.query<{ media_version_id: string }>(
    `SELECT "media_version_id" FROM "cms_media_references" WHERE "id"=$1`,
    [publishedReferenceId],
  );
  assert.equal(pinnedReference.rows[0].media_version_id, approvedVersionId);
  const repairedMissingReference = await migrationPool.query<{
    media_version_id: string;
  }>(
    `SELECT "media_version_id"
       FROM "cms_media_references"
      WHERE "document_id"=$1
        AND "field_path"='revision:' || $2::text
        AND "asset_id"=$3`,
    [publishedDocumentId, publishedRevisionId, missingReferenceAssetId],
  );
  assert.equal(repairedMissingReference.rowCount, 1);
  assert.equal(
    repairedMissingReference.rows[0].media_version_id,
    missingReferenceVersionId,
  );
  const appendedVersionId = randomUUID();
  await migrationPool.query(
    `INSERT INTO "cms_media_versions"
       ("id", "asset_id", "version_number", "storage_key", "checksum", "created_at")
       VALUES ($1, $2, 3, 'v3.png', 'v3-checksum', '2026-07-01T00:00:00Z')`,
    [appendedVersionId, publishedAssetId],
  );
  const stillPinned = await migrationPool.query<{ media_version_id: string }>(
    `SELECT "media_version_id" FROM "cms_media_references" WHERE "id"=$1`,
    [publishedReferenceId],
  );
  assert.equal(stillPinned.rows[0].media_version_id, approvedVersionId);
  await assert.rejects(
    migrationPool.query(
      `UPDATE "cms_media_references" SET "media_version_id"=$2 WHERE "id"=$1`,
      [publishedReferenceId, firstVersionId],
    ),
    /pinned CMS media reference is immutable/,
  );
  await assert.rejects(
    migrationPool.query(
      `UPDATE "cms_media_versions" SET "storage_key"='changed.png' WHERE "id"=$1`,
      [approvedVersionId],
    ),
    /CMS media versions are immutable/,
  );
  const draftDocumentId = randomUUID();
  const draftReferenceId = randomUUID();
  await migrationPool.query(`INSERT INTO "cms_documents" ("id") VALUES ($1)`, [
    draftDocumentId,
  ]);
  await migrationPool.query(
    `INSERT INTO "cms_media_references"
       ("id", "asset_id", "media_version_id", "document_id", "field_path")
       VALUES ($1, $2, $3, $4, 'revision:draft')`,
    [
      draftReferenceId,
      publishedAssetId,
      approvedVersionId,
      draftDocumentId,
    ],
  );
  await migrationPool.query(`DELETE FROM "cms_documents" WHERE "id"=$1`, [
    draftDocumentId,
  ]);
  const deletedDraftReferences = await migrationPool.query(
    `SELECT 1 FROM "cms_media_references" WHERE "id"=$1`,
    [draftReferenceId],
  );
  assert.equal(deletedDraftReferences.rowCount, 0);

  const columns = await adminPool.query<{ column_name: string }>(
    `SELECT column_name
       FROM information_schema.columns
      WHERE table_schema = $1
        AND table_name = 'cms_person_market_availability'
      ORDER BY column_name`,
    [schema],
  );
  assert.deepEqual(
    columns.rows.map((row) => row.column_name),
    [
      "created_at",
      "decision",
      "document_id",
      "draft_decision",
      "market_edition_id",
      "published_at",
      "published_by_user_id",
      "published_decision",
      "updated_at",
      "updated_by_user_id",
    ],
  );

  const documentId = randomUUID();
  const marketId = randomUUID();
  const userId = randomUUID();
  await migrationPool.query(`INSERT INTO "cms_documents" ("id") VALUES ($1)`, [documentId]);
  await migrationPool.query(`INSERT INTO "market_editions" ("id") VALUES ($1)`, [marketId]);
  await migrationPool.query(`INSERT INTO "cms_users" ("id") VALUES ($1)`, [userId]);
  await migrationPool.query(
    `INSERT INTO "cms_person_market_availability"
       ("document_id", "market_edition_id", "decision", "updated_by_user_id")
     VALUES ($1, $2, 'inherit', $3)`,
    [documentId, marketId, userId],
  );
  await migrationPool.query(
    `UPDATE "cms_person_market_availability"
        SET "draft_decision" = 'off', "updated_by_user_id" = $3
      WHERE "document_id" = $1 AND "market_edition_id" = $2`,
    [documentId, marketId, userId],
  );

  const beforePublish = await migrationPool.query<{ decision: string }>(
    `SELECT "published_decision" AS "decision"
       FROM "cms_person_market_availability"
      WHERE "document_id" = $1 AND "market_edition_id" = $2`,
    [documentId, marketId],
  );
  assert.equal(beforePublish.rows[0].decision, "inherit");

  await migrationPool.query(
    `UPDATE "cms_person_market_availability"
        SET "published_decision" = "draft_decision",
            "draft_decision" = NULL,
            "published_by_user_id" = $3,
            "published_at" = now()
      WHERE "document_id" = $1 AND "market_edition_id" = $2`,
    [documentId, marketId, userId],
  );

  const afterPublish = await migrationPool.query<{ decision: string; draft_decision: string | null }>(
    `SELECT "published_decision" AS "decision", "draft_decision"
       FROM "cms_person_market_availability"
      WHERE "document_id" = $1 AND "market_edition_id" = $2`,
    [documentId, marketId],
  );
  assert.equal(afterPublish.rows[0].decision, "off");
  assert.equal(afterPublish.rows[0].draft_decision, null);
});