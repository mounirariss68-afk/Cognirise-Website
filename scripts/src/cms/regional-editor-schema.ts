/**
 * Development-only, additive recovery for the Task 345 regional-editor
 * database objects. This deliberately applies checked-in migrations 0035–0041
 * rather than running db push or any content reconciliation.
 */
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

type Client = {
  query(sql: string, values?: unknown[]): Promise<{ rows: Array<Record<string, any>>; rowCount: number | null }>;
  release(): void;
};

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const migrations = [
  "0035_cms_revision_accuracy_confirmations.sql",
  "0036_cms_review_request_accountability_snapshot.sql",
  "0037_cms_capability_matrix_access_projection.sql",
  "0038_cms_review_capability_reviewers.sql",
  "0039_cms_capability_matrix_configuration.sql",
  "0040_cms_legacy_administrator_market_snapshots.sql",
  "0041_cms_shared_baseline_governing_source.sql",
] as const;
const apply = process.argv.includes("--apply");
const development = process.argv.includes("--development");
const schemaArgument = process.argv.find((argument) => argument.startsWith("--schema="))?.slice("--schema=".length);

function schemaIdentifier(schema: string) {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema)) {
    throw new Error("--schema must be a simple PostgreSQL schema identifier.");
  }
  return `"${schema}"`;
}

function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonical(item)]));
  }
  return value;
}

function digest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
}

function assertApplyTarget() {
  if (!apply) return;
  if (!development || process.env.NODE_ENV !== "development") {
    throw new Error("Refusing schema recovery: --apply --development and NODE_ENV=development are all required.");
  }
  for (const key of ["APP_ENV", "ENVIRONMENT", "DEPLOYMENT_ENV"]) {
    if (/^(prod|production)$/i.test(process.env[key] ?? "")) {
      throw new Error(`Refusing schema recovery because ${key} is production.`);
    }
  }
  if (process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Refusing schema recovery in a deployment.");
  }
}

async function relationExists(client: Client, relation: string) {
  const result = await client.query("SELECT to_regclass($1) relation", [relation]);
  return Boolean(result.rows[0]?.relation);
}

async function columnExists(client: Client, table: string, column: string) {
  const result = await client.query(
    `SELECT 1 FROM information_schema.columns
      WHERE table_schema=current_schema() AND table_name=$1 AND column_name=$2`,
    [table, column],
  );
  return Boolean(result.rows[0]);
}

async function rows(client: Client, sql: string, values?: unknown[]) {
  return (await client.query(sql, values)).rows;
}

async function preservationSnapshot(client: Client) {
  const grantsExist = await relationExists(client, "cms_user_capability_grants");
  const availabilityStateExists = await relationExists(client, "cms_document_availability_states");
  const marketAvailabilityExists = await relationExists(client, "cms_document_market_availability");
  const accountabilityPresent = await columnExists(
    client, "cms_review_requests", "accountable_editor_user_id",
  );
  const legacyAdminSnapshotExists = await relationExists(
    client, "cms_legacy_administrator_market_snapshots",
  );
  const governingOriginPresent = await columnExists(
    client, "cms_shared_baseline_revisions", "governing_source_revision_id",
  );
  // A pre-0041 row has no physical governing column, but its exact-copy
  // source is still its compatibility authority when it resolves to a valid
  // same-document real market. Keep this expression schema-safe: PostgreSQL
  // must never parse a missing column in the before snapshot.
  const authoritySource = governingOriginPresent
    ? "COALESCE(revision.governing_source_revision_id,revision.source_revision_id)"
    : "revision.source_revision_id";
  const recordedOrigin = governingOriginPresent
    ? "revision.governing_source_revision_id IS NOT NULL"
    : "false";
  const legacyFallback = governingOriginPresent
    ? "revision.governing_source_revision_id IS NULL"
    : "true";
  const legacyAdministratorEffectiveMarkets = legacyAdminSnapshotExists
    ? await rows(client, `SELECT user_id,market_codes
                            FROM cms_legacy_administrator_market_snapshots ORDER BY user_id`)
    : await rows(client, `SELECT user_row.id user_id,
                                  COALESCE(array_agg(market.code ORDER BY market.code)
                                    FILTER (WHERE market.enabled),'{}') market_codes
                             FROM cms_users user_row CROSS JOIN market_editions market
                            WHERE user_row.role='administrator'
                            GROUP BY user_row.id ORDER BY user_row.id`);
  const [revisions, baselinePayloadAndCopyProvenance, effectiveGoverningOriginMapping, effectiveGoverningOrigins, governingOriginCoverage, documentPublicState, pointers, availability, marketAvailability, roles, markets, grants, reviewDispositions] = await Promise.all([
    rows(client, `SELECT id,edition_id,revision_number,content_digest,workflow_state,source_revision_id
                    FROM cms_revisions ORDER BY id`),
    rows(client, `SELECT id,baseline_id,revision_number,content_digest,snapshot,source_revision_id
                    FROM cms_shared_baseline_revisions ORDER BY id`),
    rows(client, `SELECT revision.id,
                         CASE
                               WHEN source_edition.document_id=baseline.document_id
                               AND source_edition.market NOT IN ('shared-source','und')
                                 THEN ${authoritySource}
                              ELSE NULL
                            END effective_governing_source_revision_id
                    FROM cms_shared_baseline_revisions revision
                    JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
                    LEFT JOIN cms_revisions source_revision ON source_revision.id=${authoritySource}
                    LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
                   ORDER BY revision.id`),
    rows(client, `SELECT CASE
                              WHEN source_edition.document_id=baseline.document_id
                               AND source_edition.market NOT IN ('shared-source','und')
                                THEN ${authoritySource}
                              ELSE NULL
                            END effective_governing_source_revision_id,
                            count(*)::int count
                       FROM cms_shared_baseline_revisions revision
                       JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
                       LEFT JOIN cms_revisions source_revision ON source_revision.id=${authoritySource}
                       LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
                       GROUP BY 1 ORDER BY 1`),
    rows(client, `SELECT
                        count(*) FILTER (WHERE ${recordedOrigin})::int recorded_count,
                        count(*) FILTER (
                          WHERE ${legacyFallback}
                            AND source_edition.document_id=baseline.document_id
                            AND source_edition.market NOT IN ('shared-source','und')
                        )::int valid_legacy_fallback_count,
                        count(*) FILTER (
                          WHERE (
                              source_edition.document_id=baseline.document_id
                              AND source_edition.market NOT IN ('shared-source','und')
                            ) IS NOT TRUE
                        )::int unresolved_count
                       FROM cms_shared_baseline_revisions revision
                       JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
                       LEFT JOIN cms_revisions source_revision ON source_revision.id=${authoritySource}
                       LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id`),
    rows(client, "SELECT id,kind,canonical_slug,status FROM cms_documents ORDER BY id"),
    rows(client, `SELECT id,document_id,market,locale,published_revision_id,publication_state
                    FROM cms_market_editions ORDER BY id`),
    availabilityStateExists
      ? rows(client, "SELECT * FROM cms_document_availability_states ORDER BY document_id")
      : Promise.resolve([]),
    marketAvailabilityExists
      ? rows(client, "SELECT * FROM cms_document_market_availability ORDER BY document_id,market_edition_id")
      : Promise.resolve([]),
    rows(client, "SELECT id,role FROM cms_users ORDER BY id"),
    rows(client, "SELECT user_id,market_code FROM cms_user_market_assignments ORDER BY user_id,market_code"),
    grantsExist
      ? rows(client, `SELECT user_id,topic,capability,scope,market_code
                       FROM cms_user_capability_grants
                       ORDER BY user_id,topic,capability,scope,market_code`)
      : Promise.resolve([]),
    rows(client, `SELECT status,count(*)::int count
                  FROM cms_review_requests GROUP BY status ORDER BY status`),
  ]);
  return {
    contentRevisions: digest(revisions),
    baselinePayloadAndCopyProvenance: digest(baselinePayloadAndCopyProvenance),
    effectiveGoverningOriginMapping: digest(effectiveGoverningOriginMapping),
    documentPublicState: digest(documentPublicState),
    publicationPointers: digest(pointers),
    availability: digest({ availability, marketAvailability }),
    userRolesMarketsAndGrants: digest({ roles, markets, grants }),
    legacyAdministratorEffectiveMarkets: digest(legacyAdministratorEffectiveMarkets),
    effectiveGoverningOrigins,
    governingOriginCoverage: governingOriginCoverage[0] ?? {
      recorded_count: 0, valid_legacy_fallback_count: 0, unresolved_count: 0,
    },
    pendingReviewDispositions: reviewDispositions,
    // 0036 is allowed to fill this attribution for currently requested work;
    // it never changes review status or content authority.
    pendingWithoutAccountableEditor: accountabilityPresent
      ? Number((await client.query(
        `SELECT count(*)::int count FROM cms_review_requests
          WHERE status='requested' AND accountable_editor_user_id IS NULL`,
      )).rows[0]?.count ?? 0)
      : null,
  };
}

async function schemaState(client: Client) {
  const result = await client.query(
    `SELECT
       current_schema() schema_name,
       to_regclass('cms_revision_accuracy_confirmations') IS NOT NULL accuracy_present,
       to_regclass('cms_user_capability_grants') IS NOT NULL matrix_present,
       to_regclass('cms_capability_migration_receipts') IS NOT NULL matrix_receipts_present,
       to_regclass('cms_user_capability_configurations') IS NOT NULL matrix_configuration_present,
       EXISTS(
         SELECT 1 FROM information_schema.columns
          WHERE table_schema=current_schema() AND table_name='cms_review_requests'
            AND column_name='accountable_editor_user_id'
       ) accountability_present,
       EXISTS(
         SELECT 1 FROM information_schema.columns
          WHERE table_schema=current_schema() AND table_name='cms_shared_baseline_revisions'
            AND column_name='governing_source_revision_id'
       ) governing_source_present,
       to_regprocedure('cms_assert_review_request_target()') IS NOT NULL reviewer_trigger_function_present`,
  );
  return result.rows[0];
}

function assertPreserved(before: Awaited<ReturnType<typeof preservationSnapshot>>, after: Awaited<ReturnType<typeof preservationSnapshot>>) {
  for (const field of [
    "contentRevisions",
    "baselinePayloadAndCopyProvenance",
    "effectiveGoverningOriginMapping",
    "documentPublicState",
    "publicationPointers",
    "availability",
    "userRolesMarketsAndGrants",
    "legacyAdministratorEffectiveMarkets",
   ] as const) {
    if (before[field] !== after[field]) {
      throw new Error(`Refusing commit: ${field} changed during additive schema recovery.`);
    }
  }
  if (digest(before.pendingReviewDispositions) !== digest(after.pendingReviewDispositions)) {
    throw new Error("Refusing commit: pending review dispositions changed during schema recovery.");
  }
}

async function main() {
  assertApplyTarget();
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const contents = await Promise.all(migrations.map(async (name) => {
    const sql = await readFile(path.join(root, "lib/db/migrations", name), "utf8");
    return { name, sql, checksum: digest(sql) };
  }));
  const requestDigest = digest(contents.map(({ name, checksum }) => ({ name, checksum })));
  const { pool } = await import("@workspace/db");
  const client = await pool.connect() as Client;
  const key = "schema-maintenance:task-345-regional-editor:0035-0041";
  try {
    await client.query("BEGIN ISOLATION LEVEL SERIALIZABLE");
    if (schemaArgument !== undefined) {
      await client.query(`SET LOCAL search_path TO ${schemaIdentifier(schemaArgument)}, public`);
    }
    const beforeSchema = await schemaState(client);
    const before = await preservationSnapshot(client);
    if (apply) {
      const prior = await client.query(
        `SELECT request_digest,result_digest FROM cms_operation_receipts
          WHERE idempotency_key=$1 FOR KEY SHARE`,
        [key],
      );
      if (prior.rows[0]) {
        if (prior.rows[0].request_digest !== requestDigest) {
          throw new Error("Existing schema-maintenance receipt has an unexpected migration checksum.");
        }
        await client.query("ROLLBACK");
        console.log(JSON.stringify({
          mode: "apply", disposition: "already-applied", migrationChecksums: contents.map(({ name, checksum }) => ({ name, checksum })),
          receiptDigest: prior.rows[0].result_digest,
        }));
        return;
      }
    }
    for (const migration of contents) {
      // 0036 is the only checked-in migration with an intentional historical
      // data update. Once its column exists, never replay that attribution
      // backfill merely because this recovery script gained a later migration.
      if (migration.name.startsWith("0036_") && beforeSchema.accountability_present) continue;
      await client.query(migration.sql);
    }
    const afterSchema = await schemaState(client);
    const after = await preservationSnapshot(client);
    assertPreserved(before, after);
    const receipt = {
      migrations: contents.map(({ name, checksum }) => ({ name, checksum })),
      preserved: {
        contentRevisions: after.contentRevisions,
        baselinePayloadAndCopyProvenance: after.baselinePayloadAndCopyProvenance,
        effectiveGoverningOriginMapping: after.effectiveGoverningOriginMapping,
        documentPublicState: after.documentPublicState,
        publicationPointers: after.publicationPointers,
        availability: after.availability,
        userRolesMarketsAndGrants: after.userRolesMarketsAndGrants,
        legacyAdministratorEffectiveMarkets: after.legacyAdministratorEffectiveMarkets,
      },
      pendingReviewDispositions: after.pendingReviewDispositions,
      governingOrigins: {
        effectiveBefore: before.effectiveGoverningOrigins,
        effectiveAfter: after.effectiveGoverningOrigins,
        coverageBefore: before.governingOriginCoverage,
        coverageAfter: after.governingOriginCoverage,
        unresolvedAfter: after.governingOriginCoverage.unresolved_count,
      },
      accountability: {
        requestedWithoutAccountableEditorBefore: before.pendingWithoutAccountableEditor,
        requestedWithoutAccountableEditorAfter: after.pendingWithoutAccountableEditor,
      },
      schema: afterSchema,
    };
    const resultDigest = digest(receipt);
    if (apply) {
      await client.query(
        `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
         VALUES ($1,'schema-maintenance','task-345-regional-editor',$2,$3)`,
        [key, requestDigest, resultDigest],
      );
      await client.query("COMMIT");
    } else {
      await client.query("ROLLBACK");
    }
    console.log(JSON.stringify({
      mode: apply ? "apply" : "dry-run",
      migrationChecksums: receipt.migrations,
      beforeSchema,
      afterSchema,
      preservedHashes: receipt.preserved,
      pendingReviewDispositions: receipt.pendingReviewDispositions,
      governingOrigins: receipt.governingOrigins,
      accountability: receipt.accountability,
      receiptDigest: resultDigest,
    }));
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Schema recovery failed.");
  process.exitCode = 1;
});