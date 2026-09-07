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
const expectedAvailabilityMigrations = [
  { idx: 8, when: 1788747983000, tag: "0008_cms_person_market_availability" },
  { idx: 9, when: 1788747983001, tag: "0009_cms_person_market_availability_staging" },
];

test("registers person availability migrations in ordered Drizzle history", async () => {
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: Array<{ idx: number; when: number; tag: string }>;
  };

  assert.deepEqual(
    journal.entries.slice(-2).map(({ idx, when, tag }) => ({ idx, when, tag })),
    expectedAvailabilityMigrations,
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
  await migrationPool.query(`
    CREATE TABLE "cms_documents" ("id" uuid PRIMARY KEY);
    CREATE TABLE "market_editions" ("id" uuid PRIMARY KEY);
    CREATE TABLE "cms_users" ("id" uuid PRIMARY KEY);
    CREATE TABLE "${schema}"."__drizzle_migrations" (
      "id" serial PRIMARY KEY,
      "hash" text NOT NULL,
      "created_at" bigint
    );
    INSERT INTO "${schema}"."__drizzle_migrations" ("hash", "created_at")
    VALUES ('migration-0007-fixture', 1788725000000);
  `);

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
    [1788725000000, ...expectedAvailabilityMigrations.map((entry) => entry.when)],
  );

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