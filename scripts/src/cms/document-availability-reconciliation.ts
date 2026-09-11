import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const args = process.argv.slice(2);
const target = args.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);

export function assertDevelopmentTarget(environment = process.env) {
  if (target !== "development") {
    throw new Error("Document availability reconciliation requires --target=development.");
  }
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Document availability reconciliation is disabled in production.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

export async function reconcileDocumentAvailability(
  client: { query: (sql: string) => Promise<unknown> },
  migrationSql: string | string[],
) {
  await client.query("BEGIN");
  try {
    for (const sql of Array.isArray(migrationSql) ? migrationSql : [migrationSql]) {
      await client.query(sql);
    }
    const ambiguousOrigins = await client.query(
      `SELECT count(*) FILTER (WHERE ambiguous)::int AS ambiguous_internal_origins
         FROM cms_editorial_market_migration_reports`,
    ) as { rows?: Array<{ ambiguous_internal_origins?: number }> };
    const ambiguousInternalOrigins = Number(
      ambiguousOrigins.rows?.[0]?.ambiguous_internal_origins ?? 0,
    );
    const result = await client.query(
      `SELECT count(*) FILTER (
         WHERE NOT visibility_preserved
            OR NOT resolvability_preserved
            OR NOT selection_preserved
       )::int AS failures
       FROM cms_document_availability_migration_reports`,
    ) as { rows?: Array<{ failures?: number }> };
    if (Number(result.rows?.[0]?.failures ?? 0) !== 0) {
      throw new Error(
        "Document availability reconciliation parity verification failed; migration receipt differs from selected published revision.",
      );
    }
    await client.query("COMMIT");
    return { ambiguousInternalOrigins };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  }
}

async function main() {
  assertDevelopmentTarget();
  const { pool } = await import("@workspace/db");
  const migrationSql = await Promise.all([
    readFile(
      resolve(import.meta.dirname, "../../../lib/db/migrations/0024_cms_document_availability.sql"),
      "utf8",
    ),
    readFile(
      resolve(import.meta.dirname, "../../../lib/db/migrations/0025_cms_editorial_market.sql"),
      "utf8",
    ),
  ]);
  try {
    const result = await reconcileDocumentAvailability(pool, migrationSql);
    console.log(
      `Document availability reconciliation completed with zero parity failures; ${result.ambiguousInternalOrigins} ambiguous internal editorial origins remain.`,
    );
  } finally {
    await pool.end();
  }
}

if (process.argv[1]?.endsWith("document-availability-reconciliation.ts")) {
  await main();
}