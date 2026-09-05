import { pool } from "./index";

const requiredTables = [
  "cms_workflow_events",
  "cms_workflow_receipts",
  "cms_preview_token_nonces",
  "cms_webhook_receipts",
] as const;

try {
  const result = await pool.query<{ table_name: string | null }>(
    `select to_regclass('public.' || required_name)::text as table_name
     from unnest($1::text[]) as required(required_name)`,
    [requiredTables],
  );
  const missing = requiredTables.filter(
    (name) => !result.rows.some((row) => row.table_name === name),
  );
  if (missing.length > 0) {
    throw new Error(`Missing CMS governance tables: ${missing.join(", ")}`);
  }
  console.log(`Verified CMS governance tables: ${requiredTables.join(", ")}`);
} finally {
  await pool.end();
}