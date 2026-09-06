import { pool } from "@workspace/db";

/** Invoke from the scheduled operations worker; it stores aggregates before raw deletion. */
export async function runRetentionMaintenance(): Promise<void> {
  const retentionDays = Math.max(1, Number(process.env.ANALYTICS_RAW_RETENTION_DAYS ?? 30));
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO cms_analytics_daily(day,market,path,event_name,event_count,unique_visitors,updated_at)
       SELECT occurred_at::date,market,path,event_name,count(*),count(DISTINCT anonymous_id),now()
       FROM cms_analytics_events WHERE occurred_at < now()-($1::text||' days')::interval
       GROUP BY 1,2,3,4
       ON CONFLICT(day,market,path,event_name) DO UPDATE SET event_count=EXCLUDED.event_count,
         unique_visitors=EXCLUDED.unique_visitors,updated_at=now()`,
      [retentionDays],
    );
    await client.query("DELETE FROM cms_analytics_events WHERE occurred_at < now()-($1::text||' days')::interval", [retentionDays]);
    await client.query("DELETE FROM cms_sessions WHERE expires_at < now() OR revoked_at < now()-interval '30 days'");
    await client.query("DELETE FROM cms_preview_sessions WHERE expires_at < now()");
    await client.query(
      `INSERT INTO cms_audit_events(actor_label,action,target_type,target_id,metadata)
       VALUES ('system','maintenance.retention','operations','analytics',$1)`,
      [{ retentionDays }],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}