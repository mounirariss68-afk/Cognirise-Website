import { pool } from "@workspace/db";
import { createHash } from "node:crypto";
import type { AuthContext } from "./auth";

export type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<{
    rows: any[];
    rowCount?: number | null;
  }>;
};

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
  executor: Queryable = pool,
): Promise<void> {
  await executor.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,metadata)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [auth.user.id, auth.user.email, action, entityType, entityId, redactAuditMetadata(metadata)],
  );
}

const SENSITIVE_KEYS = /token|password|secret|access.?link|ciphertext|email|name|notes|content|payload|body/i;

function redactAuditValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      SENSITIVE_KEYS.test(key) ? "[redacted]" : redactAuditValue(item),
    ]),
  );
}

/** Audit metadata is a security boundary; credentials never belong in it. */
export function redactAuditMetadata(metadata: Record<string, unknown>) {
  return redactAuditValue(metadata) as Record<string, unknown>;
}

export function operationDigest(
  actorId: string,
  operation: string,
  subjectId: string,
  requestKey: string,
): string {
  return createHash("sha256")
    .update("cognirise:cms-operation:v1\0")
    .update(actorId)
    .update("\0")
    .update(operation)
    .update("\0")
    .update(subjectId)
    .update("\0")
    .update(requestKey)
    .digest("hex");
}

export function requestDigest(input: unknown): string {
  const canonical = JSON.stringify(input, (_key, value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return value;
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
        left.localeCompare(right),
      ),
    );
  });
  return createHash("sha256").update(canonical).digest("hex");
}

export type OperationReceipt = {
  idempotencyKey: string;
  operation: string;
  subjectId: string;
  requestDigest: string;
  actorUserId: string | null;
  response: Record<string, unknown> | null;
  statusCode: number | null;
};

export async function reserveOperationReceipt(
  executor: Queryable,
  input: {
    idempotencyKey: string;
    operation: string;
    subjectId: string;
    requestDigest: string;
    actorUserId: string;
  },
): Promise<boolean> {
  const result = await executor.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,actor_user_id)
     VALUES ($1,$2,$3,$4,$5)
     ON CONFLICT (idempotency_key) DO NOTHING
     RETURNING idempotency_key`,
    [
      input.idempotencyKey,
      input.operation,
      input.subjectId,
      input.requestDigest,
      input.actorUserId,
    ],
  );
  return Boolean(result.rowCount);
}

/**
 * Claim an idempotency key while the governed mutation is in progress. A
 * duplicate request with a different actor, subject, or body is rejected;
 * an identical request receives the committed response after the transaction.
 */
export async function existingOperationReceipt(
  executor: Queryable,
  idempotencyKey: string,
  operation: string,
  subjectId: string,
  bodyDigest: string,
  actorUserId: string,
): Promise<OperationReceipt | null> {
  const result = await executor.query(
    `SELECT idempotency_key,operation,subject_id,request_digest,actor_user_id,response,status_code
       FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE`,
    [idempotencyKey],
  );
  const row = result.rows[0];
  if (!row) return null;
  if (
    row.operation !== operation ||
    row.subject_id !== subjectId ||
    row.request_digest !== bodyDigest ||
    String(row.actor_user_id ?? "") !== actorUserId
  ) {
    const error = new Error("Idempotency-Key is already associated with a different operation.");
    (error as any).code = "IDEMPOTENCY_CONFLICT";
    throw error;
  }
  return {
    idempotencyKey: row.idempotency_key,
    operation: row.operation,
    subjectId: row.subject_id,
    requestDigest: row.request_digest,
    actorUserId: row.actor_user_id ? String(row.actor_user_id) : null,
    response: row.response ?? null,
    statusCode: row.status_code == null ? null : Number(row.status_code),
  };
}

export async function saveOperationReceipt(
  executor: Queryable,
  input: {
    idempotencyKey: string;
    operation: string;
    subjectId: string;
    requestDigest: string;
    actorUserId: string;
    statusCode: number;
    response: Record<string, unknown>;
  },
): Promise<void> {
  const result = await executor.query(
    `UPDATE cms_operation_receipts
        SET status_code=$6,response=$7,result_digest=$8
      WHERE idempotency_key=$1 AND operation=$2 AND subject_id=$3
        AND request_digest=$4 AND actor_user_id=$5`,
    [
      input.idempotencyKey,
      input.operation,
      input.subjectId,
      input.requestDigest,
      input.actorUserId,
      input.statusCode,
      input.response,
      requestDigest(input.response),
    ],
  );
  if (!result.rowCount) {
    const error = new Error("Idempotency-Key was not reserved for this operation.");
    (error as any).code = "IDEMPOTENCY_CONFLICT";
    throw error;
  }
}
