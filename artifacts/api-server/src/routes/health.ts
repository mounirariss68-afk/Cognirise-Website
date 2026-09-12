import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { pool } from "@workspace/db";
import { publishedNavigationPolicy } from "../lib/navigation-policy";

const router: IRouter = Router();
const READINESS_TIMEOUT_MS = 1_000;

type ReadinessStatus = "ok" | "unavailable";
export type ReadinessChecks = {
  database: ReadinessStatus;
  schema: ReadinessStatus;
  navigation: ReadinessStatus;
};

const requiredColumns: Record<string, readonly string[]> = {
  market_editions: ["code", "default_locale", "enabled"],
  cms_documents: ["id", "status"],
  cms_market_editions: [
    "id",
    "document_id",
    "market",
    "locale",
    "content_mode",
    "publication_state",
    "published_revision_id",
  ],
  cms_revisions: [
    "id",
    "edition_id",
    "payload",
    "content_digest",
    "workflow_state",
    "created_by_user_id",
  ],
  cms_navigation_published_policies: [
    "market",
    "locale",
    "items",
    "pages",
    "published_version",
  ],
  cms_navigation_items: ["id", "enabled", "visible"],
  cms_operation_receipts: [
    "idempotency_key",
    "operation",
    "subject_id",
    "request_digest",
    "result_digest",
    "actor_user_id",
    "response",
    "status_code",
    "created_at",
  ],
  cms_access_delivery_jobs: [
    "id",
    "user_id",
    "access_token_id",
    "purpose",
    "status",
    "attempts",
    "payload_ciphertext",
    "payload_expires_at",
    "available_at",
    "processing_lease",
    "last_attempt_at",
    "sent_at",
    "failed_at",
    "provider_message_id",
    "last_error",
    "created_at",
    "updated_at",
  ],
  cms_document_availability_states: [
    "document_id",
    "shared_source_edition_id",
    "published_source_revision_id",
  ],
  cms_media_references: ["document_id", "asset_id", "media_version_id", "field_path"],
};

function withTimeout<T>(promise: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), READINESS_TIMEOUT_MS);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

type QueryPool = Pick<typeof pool, "query">;
type NavigationProbe = (market: string, locale: string) => Promise<unknown>;

async function schemaIsCompatible(database: QueryPool): Promise<boolean> {
  const tables = Object.keys(requiredColumns);
  const columns = [...new Set(Object.values(requiredColumns).flat())];
  const result = await withTimeout(database.query<{ table_name: string; column_name: string }>(
    `SELECT table_name,column_name
       FROM information_schema.columns
      WHERE table_schema='public'
        AND table_name=ANY($1::text[])
        AND column_name=ANY($2::text[])`,
    [tables, columns],
  ));
  const found = new Map<string, Set<string>>();
  for (const row of result.rows) {
    const current = found.get(String(row.table_name)) ?? new Set<string>();
    current.add(String(row.column_name));
    found.set(String(row.table_name), current);
  }
  return tables.every((table) =>
    requiredColumns[table]!.every((column) => found.get(table)?.has(column))
  );
}

async function publicNavigationIsReady(
  database: QueryPool,
  navigationProbe: NavigationProbe,
): Promise<boolean> {
  const market = await withTimeout(database.query<{ code: string; default_locale: string }>(
    `SELECT code,default_locale
       FROM market_editions
      WHERE enabled=true
      ORDER BY is_canonical DESC,code
      LIMIT 1`,
  ));
  const representative = market.rows[0];
  if (!representative) return false;
  // This exercises the same fallback, policy validation, and published-document
  // eligibility path used by GET /api/public/navigation. A missing policy is
  // valid during an unconfigured rollout; an invalid policy is not.
  const policy = await withTimeout(
    navigationProbe(String(representative.code), String(representative.default_locale)),
  );
  if (!policy) {
    // The public route intentionally falls back to this legacy visibility
    // table before a policy has been published; keep that compatibility path
    // inside readiness rather than declaring a half-installed schema healthy.
    await withTimeout(database.query(
      `SELECT id,COALESCE(visible,enabled) AS visible
         FROM cms_navigation_items
        LIMIT 1`,
    ));
  }
  return true;
}

export async function runReadinessChecks(
  database: QueryPool = pool,
  navigationProbe: NavigationProbe = publishedNavigationPolicy,
): Promise<{
  status: ReadinessStatus;
  checks: ReadinessChecks;
}> {
  const checks: ReadinessChecks = {
    database: "unavailable",
    schema: "unavailable",
    navigation: "unavailable",
  };
  try {
    await withTimeout(database.query("SELECT 1"));
    checks.database = "ok";
  } catch {
    return { status: "unavailable", checks };
  }
  try {
    if (await schemaIsCompatible(database)) checks.schema = "ok";
  } catch {
    return { status: "unavailable", checks };
  }
  if (checks.schema === "ok") {
    try {
      if (await publicNavigationIsReady(database, navigationProbe)) checks.navigation = "ok";
    } catch {
      // Keep database/schema results but never expose SQL or policy details.
    }
  }
  const status = Object.values(checks).every((value) => value === "ok")
    ? "ok"
    : "unavailable";
  return { status, checks };
}

router.get("/healthz", async (_req, res) => {
  try {
    await Promise.race([
      pool.query("SELECT 1"),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1_000)),
    ]);
    res.json(HealthCheckResponse.parse({ status: "ok" }));
  } catch {
    res.status(503).json({ status: "unavailable" });
  }
});

router.get("/readyz", async (_req, res) => {
  const result = await runReadinessChecks();
  res.status(result.status === "ok" ? 200 : 503).json(result);
});

export default router;
