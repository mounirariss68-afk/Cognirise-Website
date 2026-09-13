import assert from "node:assert/strict";
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

const migrationsFolder = fileURLToPath(new URL("../migrations", import.meta.url));
const journalPath = new URL("../migrations/meta/_journal.json", import.meta.url);

/**
 * The generated baseline migration names its foreign-key targets in the
 * public schema. A fresh-schema migration test must keep every FK inside its
 * isolated schema, otherwise generated landing parity rows point at the
 * development database's tables. Production remains on the checked-in
 * migration files and public schema.
 */
async function isolatedMigrations(schema: string, context: { after: (callback: () => void | Promise<void>) => void }) {
  const folder = await mkdtemp(join(tmpdir(), `cms-migrations-${schema}-`));
  await cp(migrationsFolder, folder, { recursive: true });
  const entries = await readdir(folder, { recursive: true, withFileTypes: true });
  await Promise.all(entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".sql"))
    .map(async (entry) => {
      const filePath = join(entry.parentPath ?? entry.path, entry.name);
      const sql = await readFile(filePath, "utf8");
      await writeFile(filePath, sql.replaceAll('"public".', ""), "utf8");
    }));
  context.after(() => rm(folder, { recursive: true, force: true }));
  return folder;
}
const expectedMigrations = [
  { idx: 8, when: 1788747983000, tag: "0008_cms_person_market_availability" },
  { idx: 9, when: 1788747983001, tag: "0009_cms_person_market_availability_staging" },
  { idx: 10, when: 1788747983002, tag: "0010_cms_media_collections" },
  { idx: 11, when: 1788747983003, tag: "0011_cms_revision_media_versions" },
  { idx: 12, when: 1788909800000, tag: "0012_cms_preview_revision" },
  { idx: 13, when: 1788909800001, tag: "0013_cms_motion_media" },
  { idx: 14, when: 1788909800002, tag: "0014_cms_media_metadata_versions" },
  { idx: 15, when: 1788959300000, tag: "0015_cms_media_original_filename" },
  { idx: 16, when: 1788959300001, tag: "0016_cms_user_access_tokens" },
  { idx: 17, when: 1788959300002, tag: "0017_cms_editorial_workflow" },
  { idx: 18, when: 1788959300003, tag: "0018_cms_navigation_editions" },
  { idx: 19, when: 1788959300004, tag: "0019_cms_landing_page_contract" },
  { idx: 20, when: 1788959300005, tag: "0020_cms_navigation_published_policy" },
  { idx: 21, when: 1788959300006, tag: "0021_cms_preview_navigation_snapshot" },
  { idx: 22, when: 1788959300007, tag: "0022_cms_legacy_root_archive_normalization" },
  { idx: 23, when: 1788998400000, tag: "0023_readiness_assessments" },
  { idx: 24, when: 1788998400001, tag: "0024_cms_document_availability" },
  { idx: 25, when: 1788998400002, tag: "0025_cms_editorial_market" },
  { idx: 26, when: 1788998400003, tag: "0026_cms_navigation_publish_versions" },
  { idx: 27, when: 1788998400004, tag: "0027_cms_access_delivery_jobs" },
  { idx: 28, when: 1788998400005, tag: "0028_cms_access_delivery_leases" },
  { idx: 29, when: 1788998400006, tag: "0029_cms_shared_market_editions" },
  { idx: 30, when: 1788998400007, tag: "0030_cms_shared_history_cascade_deletes" },
  { idx: 31, when: 1788998400008, tag: "0031_cms_shared_pointer_integrity" },
];

test("registers migrations in ordered Drizzle history", async () => {
  const journal = JSON.parse(await readFile(journalPath, "utf8")) as {
    entries: Array<{ idx: number; when: number; tag: string }>;
  };

  assert.deepEqual(
    journal.entries.slice(-expectedMigrations.length).map(({ idx, when, tag }) => ({ idx, when, tag })),
    expectedMigrations,
  );
  assert.equal(new Set(journal.entries.map((entry) => entry.idx)).size, journal.entries.length);
  assert.equal(new Set(journal.entries.map((entry) => entry.when)).size, journal.entries.length);
  assert.ok(journal.entries.every((entry, index) => index === 0 || entry.when > journal.entries[index - 1].when));
});

test("applies the complete schema chain to a fresh database and replays safely", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (context) => {
  const schema = `migration_fresh_${process.pid}_${Date.now()}`;
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
  const testMigrationsFolder = await isolatedMigrations(schema, context);
  await migrate(drizzle(migrationPool), {
    migrationsFolder: testMigrationsFolder,
    migrationsSchema: schema,
    migrationsTable: "__drizzle_migrations",
  });
  const required = await migrationPool.query<{ table_name: string; column_name: string }>(
    `SELECT table_name,column_name
       FROM information_schema.columns
      WHERE table_schema=$1
        AND (
          (table_name='cms_navigation_published_policies' AND column_name IN ('items','pages','published_version'))
          OR (table_name='cms_market_editions' AND column_name IN ('content_mode','published_revision_id'))
          OR (table_name='cms_document_availability_states' AND column_name IN ('shared_source_edition_id','published_source_revision_id'))
          OR (table_name='cms_media_references' AND column_name='media_version_id')
        )
      ORDER BY table_name,column_name`,
    [schema],
  );
  assert.ok(required.rows.length >= 8, "fresh migration must expose readiness-critical columns");
  const appliedBeforeReplay = await migrationPool.query(
    `SELECT created_at FROM "${schema}"."__drizzle_migrations" ORDER BY created_at`,
  );
  await migrate(drizzle(migrationPool), {
    migrationsFolder: testMigrationsFolder,
    migrationsSchema: schema,
    migrationsTable: "__drizzle_migrations",
  });
  const appliedAfterReplay = await migrationPool.query(
    `SELECT created_at FROM "${schema}"."__drizzle_migrations" ORDER BY created_at`,
  );
  assert.deepEqual(appliedAfterReplay.rows, appliedBeforeReplay.rows);
});

test("shared pointer integrity rejects cross-boundary pointers while accepting deferred materialization", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (context) => {
  const schema = `shared_pointer_${process.pid}_${Date.now()}`;
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
  const testMigrationsFolder = await isolatedMigrations(schema, context);
  await migrate(drizzle(migrationPool), {
    migrationsFolder: testMigrationsFolder,
    migrationsSchema: schema,
    migrationsTable: "__drizzle_migrations",
  });
  // Drizzle replay must retain the deferred constraint triggers, not recreate
  // them or replace their migration receipt.
  await migrate(drizzle(migrationPool), {
    migrationsFolder: testMigrationsFolder,
    migrationsSchema: schema,
    migrationsTable: "__drizzle_migrations",
  });
  const triggers = await migrationPool.query<{ tgname: string; tgdeferrable: boolean; tginitdeferred: boolean }>(
    `SELECT tgname,tgdeferrable,tginitdeferred
       FROM pg_trigger
      WHERE tgrelid IN (
        'cms_shared_baselines'::regclass,
        'cms_shared_baseline_revisions'::regclass,
        'cms_market_edition_bindings'::regclass,
        'cms_resolved_market_revisions'::regclass
      ) AND tgname LIKE '%_integrity'
      ORDER BY tgname`,
  );
  assert.deepEqual(triggers.rows, [
    { tgname: "cms_market_edition_bindings_integrity", tgdeferrable: true, tginitdeferred: true },
    { tgname: "cms_resolved_market_revisions_integrity", tgdeferrable: true, tginitdeferred: true },
    { tgname: "cms_shared_baseline_revisions_integrity", tgdeferrable: true, tginitdeferred: true },
    { tgname: "cms_shared_baselines_integrity", tgdeferrable: true, tginitdeferred: true },
  ]);

  const ids = {
    user: randomUUID(),
    document: randomUUID(),
    foreignDocument: randomUUID(),
    uae: randomUUID(),
    ksa: randomUUID(),
    source: randomUUID(),
    sourceArabic: randomUUID(),
    sourceForeign: randomUUID(),
    sourceInternal: randomUUID(),
    destination: randomUUID(),
    baseline: randomUUID(),
    baselineRevision: randomUUID(),
    successorBaselineRevision: randomUUID(),
    foreignBaseline: randomUUID(),
    foreignBaselineRevision: randomUUID(),
    arabicBaseline: randomUUID(),
    arabicBaselineRevision: randomUUID(),
    binding: randomUUID(),
    materialized: randomUUID(),
    detachedMaterialized: randomUUID(),
    wrongMaterialized: randomUUID(),
    localeWrongRevision: randomUUID(),
  };
  await migrationPool.query(
    `INSERT INTO cms_users(id,email) VALUES ($1,'shared-pointer@example.invalid')`,
    [ids.user],
  );
  await migrationPool.query(
    `INSERT INTO cms_documents(id,kind,title) VALUES
       ($1,'case-study','Shared pointer document'),
       ($2,'case-study','Foreign pointer document')`,
    [ids.document, ids.foreignDocument],
  );
  await migrationPool.query(
    `INSERT INTO market_editions(id,code,display_name,default_locale) VALUES
       ($1,'pointer-uae','Pointer UAE','en'),
       ($2,'pointer-ksa','Pointer KSA','en')`,
    [ids.uae, ids.ksa],
  );
  await migrationPool.query(
    `INSERT INTO cms_market_editions(id,document_id,market,locale) VALUES
       ($1,$2,'pointer-ksa','en'),
       ($3,$2,'pointer-ksa','ar'),
       ($4,$5,'pointer-ksa','en'),
       ($6,$2,'shared-source','und'),
       ($7,$2,'pointer-uae','en')`,
    [
      ids.source, ids.document, ids.sourceArabic, ids.sourceForeign,
      ids.foreignDocument, ids.sourceInternal, ids.destination,
    ],
  );
  const insertRevision = async (id: string, editionId: string, number: number) => {
    await migrationPool.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,created_by_user_id,reason)
       VALUES ($1,$2,$3,'{}'::jsonb,$4,$5,'shared pointer fixture')`,
      [id, editionId, number, `digest-${id}`, ids.user],
    );
  };
  await insertRevision(ids.materialized, ids.destination, 1);
  await insertRevision(ids.detachedMaterialized, ids.destination, 2);
  await insertRevision(ids.wrongMaterialized, ids.source, 2);
  await insertRevision(ids.localeWrongRevision, ids.sourceArabic, 1);
  const sourceRevision = randomUUID();
  const foreignSourceRevision = randomUUID();
  const internalSourceRevision = randomUUID();
  await insertRevision(sourceRevision, ids.source, 1);
  await insertRevision(foreignSourceRevision, ids.sourceForeign, 2);
  await insertRevision(internalSourceRevision, ids.sourceInternal, 1);

  // A binding is intentionally inserted before its resolved history and
  // materialized pointer. The deferrable checks inspect the coherent final
  // transaction state, which is the route's real materialization order.
  await migrationPool.query("BEGIN");
  await migrationPool.query(
    `INSERT INTO cms_shared_baselines(id,document_id,locale,created_by_user_id)
     VALUES ($1,$2,'en',$3)`,
    [ids.baseline, ids.document, ids.user],
  );
  await migrationPool.query(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,1,'{}'::jsonb,'baseline-1',$3,$4)`,
    [ids.baselineRevision, ids.baseline, sourceRevision, ids.user],
  );
  await migrationPool.query(
    `UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1`,
    [ids.baseline, ids.baselineRevision],
  );
  await migrationPool.query(
    `INSERT INTO cms_market_edition_bindings(
       id,document_id,market_edition_id,locale,mode,baseline_id,based_on_baseline_revision_id
     ) VALUES ($1,$2,$3,'en','shared',$4,$5)`,
    [ids.binding, ids.document, ids.uae, ids.baseline, ids.baselineRevision],
  );
  await migrationPool.query(
    `INSERT INTO cms_resolved_market_revisions(
       binding_id,cms_revision_id,baseline_revision_id,snapshot,content_digest
     ) VALUES ($1,$2,$3,'{}'::jsonb,'resolved-1')`,
    [ids.binding, ids.materialized, ids.baselineRevision],
  );
  await migrationPool.query(
    `UPDATE cms_market_edition_bindings SET materialized_revision_id=$2 WHERE id=$1`,
    [ids.binding, ids.materialized],
  );
  await migrationPool.query("COMMIT");

  const commitRejects = async (statement: string, values: unknown[], expected: RegExp) => {
    await migrationPool.query("BEGIN");
    try {
      await migrationPool.query(statement, values);
      await assert.rejects(migrationPool.query("COMMIT"), expected);
    } finally {
      await migrationPool.query("ROLLBACK").catch(() => {});
    }
  };
  await commitRejects(
    `UPDATE cms_revisions SET edition_id=$2 WHERE id=$1`,
    [sourceRevision, ids.sourceForeign],
    /shared baseline revision source must remain an exact real-market revision/,
  );

  // The foreign baseline itself is valid, so this is specifically a binding
  // cross-document update rather than a missing-reference failure.
  await migrationPool.query("BEGIN");
  await migrationPool.query(
    `INSERT INTO cms_shared_baselines(id,document_id,locale,created_by_user_id)
     VALUES ($1,$2,'en',$3)`,
    [ids.foreignBaseline, ids.foreignDocument, ids.user],
  );
  await migrationPool.query(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,1,'{}'::jsonb,'foreign-baseline',$3,$4)`,
    [ids.foreignBaselineRevision, ids.foreignBaseline, foreignSourceRevision, ids.user],
  );
  await migrationPool.query(
    `UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1`,
    [ids.foreignBaseline, ids.foreignBaselineRevision],
  );
  await migrationPool.query("COMMIT");
  await commitRejects(
    `UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1`,
    [ids.baseline, ids.foreignBaselineRevision],
    /shared baseline active revision must belong to its baseline/,
  );
  await commitRejects(
    `UPDATE cms_market_edition_bindings
        SET baseline_id=$2,based_on_baseline_revision_id=$3
      WHERE id=$1`,
    [ids.binding, ids.foreignBaseline, ids.foreignBaselineRevision],
    /shared binding baseline must match its document and locale/,
  );
  await commitRejects(
    `UPDATE cms_market_edition_bindings SET materialized_revision_id=$2 WHERE id=$1`,
    [ids.binding, ids.wrongMaterialized],
    /shared binding materialized revision must match its exact destination/,
  );
  await commitRejects(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,2,'{}'::jsonb,'foreign-source',$3,$4)`,
    [randomUUID(), ids.baseline, foreignSourceRevision, ids.user],
    /shared baseline revision source must be an exact real-market revision/,
  );
  await commitRejects(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,2,'{}'::jsonb,'wrong-source-locale',$3,$4)`,
    [randomUUID(), ids.baseline, ids.localeWrongRevision, ids.user],
    /shared baseline revision source must be an exact real-market revision/,
  );
  await commitRejects(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,2,'{}'::jsonb,'internal-source',$3,$4)`,
    [randomUUID(), ids.baseline, internalSourceRevision, ids.user],
    /shared baseline revision source must be an exact real-market revision/,
  );

  await migrationPool.query("BEGIN");
  await migrationPool.query(
    `INSERT INTO cms_shared_baselines(id,document_id,locale,created_by_user_id)
     VALUES ($1,$2,'ar',$3)`,
    [ids.arabicBaseline, ids.document, ids.user],
  );
  await migrationPool.query(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,1,'{}'::jsonb,'arabic-baseline',$3,$4)`,
    [ids.arabicBaselineRevision, ids.arabicBaseline, ids.localeWrongRevision, ids.user],
  );
  await migrationPool.query(
    `UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1`,
    [ids.arabicBaseline, ids.arabicBaselineRevision],
  );
  await migrationPool.query("COMMIT");
  await commitRejects(
    `INSERT INTO cms_resolved_market_revisions(
       binding_id,cms_revision_id,baseline_revision_id,snapshot,content_digest
     ) VALUES ($1,$2,$3,'{}'::jsonb,'wrong-baseline-locale')`,
    [ids.binding, ids.detachedMaterialized, ids.arabicBaselineRevision],
    /resolved market revision baseline must match its binding document and locale/,
  );

  // A newer baseline and an independent detach may be committed together.
  // The older resolved row remains valid history even though its baseline is
  // no longer the binding's mutable pointer.
  await migrationPool.query("BEGIN");
  await migrationPool.query(
    `INSERT INTO cms_shared_baseline_revisions(
       id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id
     ) VALUES ($1,$2,2,'{}'::jsonb,'baseline-2',$3,$4)`,
    [ids.successorBaselineRevision, ids.baseline, sourceRevision, ids.user],
  );
  await migrationPool.query(
    `UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1`,
    [ids.baseline, ids.successorBaselineRevision],
  );
  await migrationPool.query(
    `INSERT INTO cms_resolved_market_revisions(
       binding_id,cms_revision_id,baseline_revision_id,snapshot,content_digest
     ) VALUES ($1,$2,NULL,'{}'::jsonb,'resolved-detach')`,
    [ids.binding, ids.detachedMaterialized],
  );
  await migrationPool.query(
    `UPDATE cms_market_edition_bindings
        SET mode='independent',baseline_id=NULL,based_on_baseline_revision_id=NULL,
            held_baseline_revision_id=NULL,materialized_revision_id=$2
      WHERE id=$1`,
    [ids.binding, ids.detachedMaterialized],
  );
  await migrationPool.query("COMMIT");
  const history = await migrationPool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM cms_resolved_market_revisions WHERE binding_id=$1`,
    [ids.binding],
  );
  assert.equal(history.rows[0]?.count, "2");

  // 0030 keeps direct shared-history edits immutable but permits the document
  // lifecycle's FK cascades. Integrity triggers remain deferred-only and do
  // not interfere with that cleanup path.
  await migrationPool.query(`DELETE FROM cms_documents WHERE id=$1`, [ids.document]);
  const removedHistory = await migrationPool.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM cms_resolved_market_revisions WHERE binding_id=$1`,
    [ids.binding],
  );
  assert.equal(removedHistory.rows[0]?.count, "0");
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
  const legacyArchivedDocumentId = randomUUID();
  const legacyArchivedUaeEditionId = randomUUID();
  const legacyArchivedKsaEditionId = randomUUID();
  const gulfMarketId = randomUUID();
  const middleMarketId = randomUUID();
  const regionalMarketId = randomUUID();
  const canonicalMarketId = randomUUID();
  const isolatedMarketId = randomUUID();
  const chainedDocumentId = randomUUID();
  const chainedEditionId = randomUUID();
  const chainedRevisionId = randomUUID();
  const canonicalDocumentId = randomUUID();
  const canonicalEditionId = randomUUID();
  const canonicalRevisionId = randomUUID();
  const excludedPersonDocumentId = randomUUID();
  const excludedPersonEditionId = randomUUID();
  const excludedPersonRevisionId = randomUUID();
  const publishedWithDraftDocumentId = randomUUID();
  const draftEditionId = randomUUID();
  const draftPublishedRevisionId = randomUUID();
  const newerDraftRevisionId = randomUUID();
  await migrationPool.query(`
    CREATE TABLE "cms_documents" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "kind" text NOT NULL DEFAULT 'case-study',
      "canonical_slug" text NOT NULL UNIQUE,
      "title" text NOT NULL DEFAULT 'Test document',
      "status" text NOT NULL DEFAULT 'active'
    );
    CREATE TABLE "cms_market_editions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE CASCADE,
      "market" text NOT NULL DEFAULT 'uae',
      "locale" text NOT NULL DEFAULT 'en',
      "localized_slug" text,
      "publication_state" text NOT NULL DEFAULT 'draft',
      "fallback_mode" text NOT NULL DEFAULT 'none',
      "parity_complete" boolean NOT NULL DEFAULT false,
      "published_revision_id" uuid,
       "published_at" timestamp with time zone,
       "updated_at" timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE TABLE "cms_revisions" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "edition_id" uuid,
      "revision_number" integer NOT NULL DEFAULT 1,
      "payload_version" integer NOT NULL DEFAULT 1,
      "payload" jsonb NOT NULL DEFAULT '{"mediaIds":[]}'::jsonb,
      "content_digest" text NOT NULL DEFAULT 'fixture',
      "workflow_state" text NOT NULL DEFAULT 'draft',
      "created_by_user_id" uuid,
      "approved_at" timestamp with time zone,
      "reason" text NOT NULL DEFAULT 'fixture',
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    );
    CREATE TABLE "market_editions" (
      "id" uuid PRIMARY KEY,
      "code" text NOT NULL UNIQUE,
      "display_name" text NOT NULL DEFAULT 'Test market',
      "default_locale" text NOT NULL DEFAULT 'en',
      "fallback_market_code" text,
      "fallback_locale" text,
      "is_canonical" boolean NOT NULL DEFAULT false,
      "enabled" boolean NOT NULL DEFAULT true
    );
    CREATE TABLE "cms_users" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "email" text NOT NULL UNIQUE DEFAULT 'fixture@example.invalid',
      "display_name" text,
      "role" text NOT NULL DEFAULT 'editor',
      "status" text NOT NULL DEFAULT 'active',
      "email_verified_at" timestamp with time zone
    );
    CREATE TABLE "cms_audit_events" (
      "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      "actor_label" text NOT NULL DEFAULT 'fixture',
      "action" text NOT NULL,
      "target_type" text NOT NULL,
      "target_id" text NOT NULL,
      "metadata" jsonb,
      "occurred_at" timestamp with time zone NOT NULL DEFAULT now()
    );
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
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id", "canonical_slug") VALUES ($1, 'published-document')`,
    [publishedDocumentId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id", "canonical_slug", "status")
     VALUES ($1, 'legacy-archived-document', 'archived')`,
    [legacyArchivedDocumentId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_market_editions" ("id","document_id","market","locale","publication_state")
     VALUES ($1,$3,'uae','en','published'),($2,$3,'ksa','en','draft')`,
    [legacyArchivedUaeEditionId, legacyArchivedKsaEditionId, legacyArchivedDocumentId],
  );
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
  // This is intentionally a pre-0024 database fixture. It exercises the
  // actual PostgreSQL migration with a requested default/fallback locale,
  // a fallback chain longer than one hop, and an independent canonical
  // market. The approved pointer must win over a newer draft revision.
  await migrationPool.query(
    `INSERT INTO "market_editions"
       ("id","code","default_locale","fallback_market_code","fallback_locale","is_canonical")
     VALUES
       ($1,'gulf','ar','middle','fr',false),
       ($2,'middle','de','regional','es',false),
       ($3,'regional','it',NULL,NULL,false),
       ($4,'canonical','en',NULL,NULL,true),
       ($5,'isolated','en',NULL,NULL,false)`,
    [gulfMarketId, middleMarketId, regionalMarketId, canonicalMarketId, isolatedMarketId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id","kind","canonical_slug")
     VALUES
       ($1,'publication','chained-publication'),
       ($2,'publication','canonical-publication'),
       ($3,'person','excluded-person'),
       ($4,'publication','published-over-newer-draft')`,
    [chainedDocumentId, canonicalDocumentId, excludedPersonDocumentId, publishedWithDraftDocumentId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_market_editions"
       ("id","document_id","market","locale","localized_slug","publication_state",
        "published_revision_id","published_at")
     VALUES
       ($1,$2,'regional','es','chained-publication','published',$3,now()-interval '1 day'),
       ($4,$5,'canonical','en','canonical-publication','published',$6,now()-interval '1 day'),
       ($7,$8,'canonical','en','excluded-person','published',$9,now()-interval '1 day'),
       ($10,$11,'gulf','ar','published-over-newer-draft','published',$12,now()-interval '1 day')`,
    [
      chainedEditionId, chainedDocumentId, chainedRevisionId,
      canonicalEditionId, canonicalDocumentId, canonicalRevisionId,
      excludedPersonEditionId, excludedPersonDocumentId, excludedPersonRevisionId,
      draftEditionId, publishedWithDraftDocumentId, draftPublishedRevisionId,
    ],
  );
  await migrationPool.query(
    `INSERT INTO "cms_revisions"
       ("id","edition_id","revision_number","workflow_state","payload","created_at")
     VALUES
       ($1,$2,1,'approved','{"mediaIds":[],"content":{}}'::jsonb,now()-interval '2 days'),
       ($3,$4,1,'approved','{"mediaIds":[],"content":{}}'::jsonb,now()-interval '2 days'),
       ($5,$6,1,'approved','{"mediaIds":[],"content":{}}'::jsonb,now()-interval '2 days'),
       ($7,$8,1,'approved','{"mediaIds":[],"content":{}}'::jsonb,now()-interval '2 days'),
       ($9,$8,2,'draft','{"mediaIds":[],"content":{}}'::jsonb,now()-interval '1 hour')`,
    [
      chainedRevisionId, chainedEditionId,
      canonicalRevisionId, canonicalEditionId,
      excludedPersonRevisionId, excludedPersonEditionId,
      draftPublishedRevisionId, draftEditionId,
      newerDraftRevisionId,
    ],
  );
  // 0008/0009 are intentionally still pending. Supplying their eventual
  // shape lets the real historical chain carry this pre-existing person
  // exclusion into 0024 without skipping any migration.
  await migrationPool.query(`
    CREATE TABLE "cms_person_market_availability" (
      "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE CASCADE,
      "market_edition_id" uuid NOT NULL REFERENCES "market_editions"("id") ON DELETE CASCADE,
      "decision" text NOT NULL DEFAULT 'inherit',
      "published_decision" text NOT NULL DEFAULT 'inherit',
      "draft_decision" text,
      "updated_by_user_id" uuid,
      "published_by_user_id" uuid,
      "published_at" timestamp with time zone,
      "created_at" timestamp with time zone NOT NULL DEFAULT now(),
      "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
      PRIMARY KEY ("document_id","market_edition_id")
    );
  `);
  await migrationPool.query(
    `INSERT INTO "cms_person_market_availability"
       ("document_id","market_edition_id","decision","published_decision")
     VALUES ($1,$2,'off','off')`,
    [excludedPersonDocumentId, gulfMarketId],
  );

  await migrate(drizzle(migrationPool), {
    migrationsFolder,
    migrationsSchema: schema,
    migrationsTable: "__drizzle_migrations",
  });
  const migrationReceipt = await migrationPool.query<{
    document_id: string;
    locale: string;
    legacy_selected_edition_id: string | null;
    legacy_selected_revision_id: string | null;
    published_selected_edition_id: string | null;
    published_selected_revision_id: string | null;
    legacy_resolvable: boolean;
    published_resolvable: boolean;
    selection_preserved: boolean;
  }>(
    `SELECT "document_id","locale","legacy_selected_edition_id","legacy_selected_revision_id",
            "published_selected_edition_id","published_selected_revision_id",
            "legacy_resolvable","published_resolvable","selection_preserved"
       FROM "cms_document_availability_migration_reports"
      WHERE "market_edition_id"=$1
        AND "document_id" IN ($2,$3,$4,$5)
      ORDER BY "document_id","locale"`,
    [
      gulfMarketId,
      chainedDocumentId,
      canonicalDocumentId,
      excludedPersonDocumentId,
      publishedWithDraftDocumentId,
    ],
  );
  const chainedReceipt = migrationReceipt.rows.find((row) =>
    row.document_id === chainedDocumentId && row.locale === "ar"
  );
  assert.deepEqual(chainedReceipt, {
    document_id: chainedDocumentId,
    locale: "ar",
    legacy_selected_edition_id: chainedEditionId,
    legacy_selected_revision_id: chainedRevisionId,
    published_selected_edition_id: chainedEditionId,
    published_selected_revision_id: chainedRevisionId,
    legacy_resolvable: true,
    published_resolvable: true,
    selection_preserved: true,
  });
  const canonicalReceipt = migrationReceipt.rows.find((row) =>
    row.document_id === canonicalDocumentId && row.locale === "fr"
  );
  assert.equal(canonicalReceipt?.legacy_selected_revision_id, canonicalRevisionId);
  assert.equal(canonicalReceipt?.published_selected_revision_id, canonicalRevisionId);
  const excludedReceipt = migrationReceipt.rows.find((row) =>
    row.document_id === excludedPersonDocumentId && row.locale === "ar"
  );
  assert.deepEqual(excludedReceipt && {
    legacy: excludedReceipt.legacy_selected_revision_id,
    published: excludedReceipt.published_selected_revision_id,
    legacyResolvable: excludedReceipt.legacy_resolvable,
    publishedResolvable: excludedReceipt.published_resolvable,
    preserved: excludedReceipt.selection_preserved,
  }, {
    legacy: null,
    published: null,
    legacyResolvable: false,
    publishedResolvable: false,
    preserved: true,
  });
  const pinnedDraftReceipt = migrationReceipt.rows.find((row) =>
    row.document_id === publishedWithDraftDocumentId && row.locale === "ar"
  );
  assert.equal(pinnedDraftReceipt?.legacy_selected_revision_id, draftPublishedRevisionId);
  assert.equal(pinnedDraftReceipt?.published_selected_revision_id, draftPublishedRevisionId);
  assert.notEqual(pinnedDraftReceipt?.published_selected_revision_id, newerDraftRevisionId);
  const excludedAvailability = await migrationPool.query<{ published_decision: string }>(
    `SELECT "published_decision" FROM "cms_document_market_availability"
      WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='ar'`,
    [excludedPersonDocumentId, gulfMarketId],
  );
  assert.equal(excludedAvailability.rows[0]?.published_decision, "off");
  const globallyIneligibleAvailability = await migrationPool.query<{ published_decision: string }>(
    `SELECT "published_decision" FROM "cms_document_market_availability"
      WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='en'`,
    [chainedDocumentId, isolatedMarketId],
  );
  assert.equal(
    globallyIneligibleAvailability.rows[0]?.published_decision,
    "off",
    "singleton shared promotion must not expose a legacy-unreachable destination",
  );
  // A replay preserves the receipt and does not replace a later editorial
  // selection with a freshly computed migration baseline.
  await migrationPool.query(
    `UPDATE "cms_document_market_availability"
        SET "published_decision"='show',"updated_at"=now()
      WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='ar'`,
    [chainedDocumentId, gulfMarketId],
  );
  const receiptBeforeReplay = await migrationPool.query(
    `SELECT * FROM "cms_document_availability_migration_reports"
      WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='ar'`,
    [chainedDocumentId, gulfMarketId],
  );
  await assert.rejects(
    migrationPool.query(
      `UPDATE "cms_document_availability_migration_reports"
          SET "selection_preserved"=false
        WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='ar'`,
      [chainedDocumentId, gulfMarketId],
    ),
    /migration receipts are immutable/,
  );
  await migrationPool.query(await readFile(
    new URL("../migrations/0024_cms_document_availability.sql", import.meta.url),
    "utf8",
  ));
  const receiptAfterReplay = await migrationPool.query(
    `SELECT * FROM "cms_document_availability_migration_reports"
      WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='ar'`,
    [chainedDocumentId, gulfMarketId],
  );
  assert.deepEqual(receiptAfterReplay.rows, receiptBeforeReplay.rows);
  const editorialSelectionAfterReplay = await migrationPool.query<{ published_decision: string }>(
    `SELECT "published_decision" FROM "cms_document_market_availability"
      WHERE "document_id"=$1 AND "market_edition_id"=$2 AND "locale"='ar'`,
    [chainedDocumentId, gulfMarketId],
  );
  assert.equal(editorialSelectionAfterReplay.rows[0]?.published_decision, "show");

  // The development post-merge reconciler replays this SQL after a schema
  // push. A later one-edition custom document must not be reclassified as a
  // historical shared source or receive historical availability on replay.
  const laterCustomDocumentId = randomUUID();
  const laterCustomEditionId = randomUUID();
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id", "canonical_slug") VALUES ($1, 'later-custom-document')`,
    [laterCustomDocumentId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_market_editions" ("id", "document_id", "content_mode")
     VALUES ($1, $2, 'custom')`,
    [laterCustomEditionId, laterCustomDocumentId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_document_availability_states" ("document_id") VALUES ($1)`,
    [laterCustomDocumentId],
  );
  const selectedSourceBeforeReplay = await migrationPool.query<{
    shared_source_edition_id: string | null;
    shared_source_revision_id: string | null;
    published_source_revision_id: string | null;
  }>(
    `SELECT "shared_source_edition_id","shared_source_revision_id","published_source_revision_id"
       FROM "cms_document_availability_states" WHERE "document_id"=$1`,
    [publishedDocumentId],
  );
  await migrationPool.query(await readFile(
    new URL("../migrations/0024_cms_document_availability.sql", import.meta.url),
    "utf8",
  ));
  const laterCustomMode = await migrationPool.query<{ content_mode: string }>(
    `SELECT "content_mode" FROM "cms_market_editions" WHERE "id"=$1`,
    [laterCustomEditionId],
  );
  assert.equal(laterCustomMode.rows[0]?.content_mode, "custom");
  const laterCustomAvailability = await migrationPool.query(
    `SELECT 1 FROM "cms_document_market_availability" WHERE "document_id"=$1`,
    [laterCustomDocumentId],
  );
  assert.equal(
    laterCustomAvailability.rowCount,
    0,
    "a replay must not turn documents authored after the migration into historical availability rows",
  );
  const selectedSourceAfterReplay = await migrationPool.query<{
    shared_source_edition_id: string | null;
    shared_source_revision_id: string | null;
    published_source_revision_id: string | null;
  }>(
    `SELECT "shared_source_edition_id","shared_source_revision_id","published_source_revision_id"
       FROM "cms_document_availability_states" WHERE "document_id"=$1`,
    [publishedDocumentId],
  );
  assert.ok(selectedSourceBeforeReplay.rows[0]?.shared_source_edition_id);
  assert.deepEqual(selectedSourceAfterReplay.rows, selectedSourceBeforeReplay.rows);

  // A real shared source may already have been moved to its internal delivery
  // address before the editorial-origin migration runs. The moved source uses
  // its relocation audit, while a real regional clone must retain its own
  // address as editorial origin rather than inherit the source's UAE origin.
  const relocatedDocumentId = randomUUID();
  const relocatedSourceEditionId = randomUUID();
  const relocatedSourceRevisionId = randomUUID();
  const internalCloneEditionId = randomUUID();
  const internalCloneRevisionId = randomUUID();
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id","canonical_slug") VALUES ($1,'relocated-editorial-origin')`,
    [relocatedDocumentId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_market_editions"
       ("id","document_id","market","locale","content_mode","publication_state")
     VALUES ($1,$2,'shared-source','und','shared','published'),
            ($3,$2,'ksa','en','custom','published')`,
    [relocatedSourceEditionId, relocatedDocumentId, internalCloneEditionId],
  );
  await migrationPool.query(
    `INSERT INTO "cms_revisions"
       ("id","edition_id","revision_number","payload","content_digest","workflow_state","source_revision_id")
     VALUES ($1,$2,1,'{}'::jsonb,'relocated-source','approved',NULL),
            ($3,$4,1,'{}'::jsonb,'internal-clone','approved',$1)`,
    [
      relocatedSourceRevisionId,
      relocatedSourceEditionId,
      internalCloneRevisionId,
      internalCloneEditionId,
    ],
  );
  await migrationPool.query(
    `UPDATE "cms_market_editions" SET "published_revision_id"=CASE
       WHEN "id"=$1 THEN $2::uuid WHEN "id"=$3 THEN $4::uuid END
      WHERE "id" IN ($1,$3)`,
    [
      relocatedSourceEditionId,
      relocatedSourceRevisionId,
      internalCloneEditionId,
      internalCloneRevisionId,
    ],
  );
  await migrationPool.query(
    `INSERT INTO "cms_audit_events" ("actor_label","action","target_type","target_id","metadata")
     VALUES ('migration fixture','document.shared_source_relocated','document',$1,
             jsonb_build_object('sourceEditionId',$2::text,'from',jsonb_build_object('market','uae')))`,
    [relocatedDocumentId, relocatedSourceEditionId],
  );
  await migrationPool.query(await readFile(
    new URL("../migrations/0025_cms_editorial_market.sql", import.meta.url),
    "utf8",
  ));
  const recoveredOrigins = await migrationPool.query<{ id: string; editorial_market: string | null }>(
    `SELECT "id","editorial_market" FROM "cms_market_editions"
      WHERE "id" IN ($1,$2) ORDER BY "market"`,
    [relocatedSourceEditionId, internalCloneEditionId],
  );
  assert.deepEqual(
    recoveredOrigins.rows.map((row) => row.editorial_market),
    ["ksa", "uae"],
    "a real clone keeps its own origin while the moved source uses its audit receipt",
  );

  const mediaIdentityConstraint = await migrationPool.query<{ contype: string }>(
    `SELECT contype
       FROM pg_constraint
      WHERE conrelid='cms_media_versions'::regclass
        AND conname='cms_media_versions_id_asset_uidx'`,
  );
  assert.deepEqual(mediaIdentityConstraint.rows, [{ contype: "u" }]);

  const applied = await adminPool.query<{ created_at: string }>(
    `SELECT "created_at" FROM "${schema}"."__drizzle_migrations" ORDER BY "created_at"`,
  );
  assert.deepEqual(
    applied.rows.map((row) => Number(row.created_at)),
    [1788725000000, ...expectedMigrations.map((entry) => entry.when)],
  );
  const normalizedLegacyArchive = await migrationPool.query<{
    status: string;
    market: string;
    publication_state: string;
  }>(
    `SELECT d.status,e.market,e.publication_state
       FROM cms_documents d JOIN cms_market_editions e ON e.document_id=d.id
      WHERE d.id=$1 ORDER BY e.market`,
    [legacyArchivedDocumentId],
  );
  assert.deepEqual(normalizedLegacyArchive.rows, [
    { status: "active", market: "ksa", publication_state: "archived" },
    { status: "active", market: "uae", publication_state: "archived" },
  ]);

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
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id", "canonical_slug") VALUES ($1, 'draft-document')`,
    [draftDocumentId],
  );
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
  await migrationPool.query(
    `INSERT INTO "cms_documents" ("id", "canonical_slug") VALUES ($1, 'availability-document')`,
    [documentId],
  );
  await migrationPool.query(
    `INSERT INTO "market_editions" ("id", "code") VALUES ($1, 'test-market')`,
    [marketId],
  );
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