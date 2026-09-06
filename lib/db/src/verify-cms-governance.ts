import { pool } from "./index";

const requiredTables = [
  "cms_workflow_events",
  "cms_workflow_receipts",
  "cms_preview_token_nonces",
  "cms_webhook_receipts",
  "cms_preview_sessions",
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
  const columns = await pool.query<{ table_name: string; column_name: string }>(
    `select table_name, column_name from information_schema.columns
     where table_schema = 'public'
       and (table_name = 'cms_workflow_receipts' and column_name = 'request_digest'
         or table_name = 'cms_preview_sessions' and column_name = 'exchanged_at')`,
  );
  const requiredColumns = ["cms_workflow_receipts.request_digest", "cms_preview_sessions.exchanged_at"];
  const foundColumns = new Set(columns.rows.map((row) => `${row.table_name}.${row.column_name}`));
  const missingColumns = requiredColumns.filter((column) => !foundColumns.has(column));
  if (missingColumns.length > 0) throw new Error(`Missing CMS governance columns: ${missingColumns.join(", ")}`);
  console.log(`Verified CMS governance tables: ${requiredTables.join(", ")}`);
} finally {
  await pool.end();
}