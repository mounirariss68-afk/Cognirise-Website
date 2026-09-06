import { pool } from "@workspace/db";
import type { AuthContext } from "./auth";

export function pageOf<T>(
  items: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.ceil(total / pageSize),
    items,
  };
}

export function documentFromRow(row: Record<string, any>) {
  return {
    id: String(row.id),
    kind: row.kind,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    status: row.status,
    content: row.content ?? {},
    seo: row.seo ?? undefined,
    mediaIds: row.media_ids ?? [],
    markets: row.markets ?? [],
    revisionNumber: row.revision_number,
    publishedRevisionId: row.published_revision_id,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    createdBy: row.created_by ? String(row.created_by) : undefined,
    updatedBy: row.updated_by ? String(row.updated_by) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function revisionSnapshot(document: ReturnType<typeof documentFromRow>) {
  return {
    slug: document.slug,
    title: document.title,
    summary: document.summary,
    content: document.content,
    seo: document.seo,
    mediaIds: document.mediaIds,
    markets: document.markets,
  };
}

export async function audit(
  auth: AuthContext,
  action: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await pool.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [auth.user.id, auth.user.email, action, entityType, entityId, metadata],
  );
}
