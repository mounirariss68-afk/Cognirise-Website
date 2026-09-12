import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";

export type AccessDeliveryPurpose = "invitation" | "password-reset";
export type AccessDeliveryStatus = "pending" | "sent" | "failed" | "expired";

type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<{
    rows: any[];
    rowCount?: number | null;
  }>;
};

export class AccessDeliveryError extends Error {}

const MAX_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000];

function deliveryEncryptionKey(): Buffer {
  const configured =
    process.env.ACCESS_DELIVERY_ENCRYPTION_KEY ??
    process.env.ACCESS_EMAIL_WEBHOOK_SECRET;
  if (!configured) {
    throw new AccessDeliveryError("Secure access delivery encryption is not configured.");
  }
  return createHash("sha256").update(configured).digest();
}

function encryptPayload(payload: Record<string, unknown>): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", deliveryEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(JSON.stringify(payload), "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  // Versioned so a future key-rotation format can be introduced without
  // interpreting old jobs as plaintext.
  return `v1:${iv.toString("base64url")}:${tag.toString("base64url")}:${ciphertext.toString("base64url")}`;
}

function decryptPayload(encoded: string): Record<string, unknown> {
  const [version, ivText, tagText, ciphertextText] = encoded.split(":");
  if (version !== "v1" || !ivText || !tagText || !ciphertextText) {
    throw new AccessDeliveryError("The access delivery payload is invalid.");
  }
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      deliveryEncryptionKey(),
      Buffer.from(ivText, "base64url"),
    );
    decipher.setAuthTag(Buffer.from(tagText, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertextText, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext);
    if (!parsed || typeof parsed !== "object") throw new Error("not an object");
    return parsed as Record<string, unknown>;
  } catch {
    throw new AccessDeliveryError("The access delivery payload could not be opened.");
  }
}

export function accessLink(token: string): string {
  const baseUrl = process.env.ADMIN_PUBLIC_URL;
  if (!baseUrl) {
    throw new AccessDeliveryError("Administrator access email delivery is not configured.");
  }
  const url = new URL("password-setup", baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  url.searchParams.set("token", token);
  return url.toString();
}

export type AccessDeliveryInput = {
  email: string;
  name: string;
  purpose: AccessDeliveryPurpose;
  token: string;
  expiresAt: Date;
};

/**
 * Persist only an encrypted, expiring delivery payload. The access token is
 * never written to an audit event, operation receipt, or application log.
 */
export function accessDeliveryCiphertext(input: AccessDeliveryInput): string {
  return encryptPayload({
    email: input.email,
    name: input.name,
    purpose: input.purpose,
    token: input.token,
    expiresAt: input.expiresAt.toISOString(),
  });
}

export async function createAccessDeliveryJob(
  executor: Queryable,
  input: AccessDeliveryInput & { userId: string; accessTokenId: string },
): Promise<string> {
  const payloadCiphertext = accessDeliveryCiphertext(input);
  const result = await executor.query(
    `INSERT INTO cms_access_delivery_jobs
      (user_id,access_token_id,purpose,payload_ciphertext,payload_expires_at)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id`,
    [
      input.userId,
      input.accessTokenId,
      input.purpose,
      payloadCiphertext,
      input.expiresAt,
    ],
  );
  return String(result.rows[0].id);
}

export async function getAccessDeliveryJob(
  executor: Queryable,
  jobId: string,
  userId?: string,
) {
  await executor.query(
    `UPDATE cms_access_delivery_jobs
        SET status='expired',payload_ciphertext=NULL,processing_lease=NULL,
            failed_at=COALESCE(failed_at,now()),
            last_error='The access link expired before delivery.',updated_at=now()
      WHERE id=$1 ${userId ? "AND user_id=$2" : ""}
        AND status IN ('pending','failed') AND payload_expires_at<=now()`,
    userId ? [jobId, userId] : [jobId],
  );
  const result = await executor.query(
    `SELECT id,user_id,purpose,status,attempts,available_at,last_attempt_at,sent_at,
            failed_at,provider_message_id,last_error,payload_expires_at,created_at,updated_at
       FROM cms_access_delivery_jobs
      WHERE id=$1 ${userId ? "AND user_id=$2" : ""}`,
    userId ? [jobId, userId] : [jobId],
  );
  return result.rows[0] ?? null;
}

export function publicAccessDeliveryJob(row: Record<string, any>) {
  return {
    id: String(row.id),
    status: (
      row.status === "sent"
        ? "sent"
        : row.status === "failed"
          ? "failed"
          : row.status === "expired"
            ? "expired"
            : "pending"
    ) as AccessDeliveryStatus,
    purpose: row.purpose,
    attempts: Number(row.attempts ?? 0),
    retryAvailable:
      row.status === "failed"
      && Number(row.attempts ?? 0) < MAX_ATTEMPTS
      && (
        row.payload_expires_at == null
        || new Date(row.payload_expires_at).getTime() > Date.now()
      ),
    lastAttemptAt: row.last_attempt_at,
    sentAt: row.sent_at,
    failedAt: row.failed_at,
    expiresAt: row.payload_expires_at,
    lastError: row.status === "failed" || row.status === "expired" ? row.last_error : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function retryAt(attempt: number): Date {
  return new Date(Date.now() + RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
}

/**
 * Claim and deliver one job. Claiming is committed before network I/O, so a
 * process crash leaves a durable processing attempt that a later poll can
 * reconcile rather than dispatching from an uncommitted token.
 */
export async function deliverAccessDeliveryJob(jobId: string): Promise<void> {
  const claimClient = await pool.connect();
  let claimed: Record<string, any> | undefined;
  try {
    await claimClient.query("BEGIN");
    const result = await claimClient.query(
      `SELECT * FROM cms_access_delivery_jobs
        WHERE id=$1 AND (
          (status='pending' AND available_at<=now())
          OR (status='failed' AND available_at<=now() AND attempts < $2)
          OR (status='processing' AND last_attempt_at < now()-interval '15 minutes' AND attempts < $2)
        )
        FOR UPDATE SKIP LOCKED`,
      [jobId, MAX_ATTEMPTS],
    );
    if (!result.rowCount) {
      await claimClient.query("ROLLBACK");
      return;
    }
    const row = result.rows[0] as Record<string, any>;
    claimed = row;
    if (new Date(row.payload_expires_at).getTime() <= Date.now()) {
      await claimClient.query(
        `UPDATE cms_access_delivery_jobs
            SET status='expired',payload_ciphertext=NULL,processing_lease=NULL,
                failed_at=now(),last_error='The access link expired before delivery.',updated_at=now()
          WHERE id=$1`,
        [jobId],
      );
      await claimClient.query("COMMIT");
      return;
    }
    const processingLease = randomUUID();
    await claimClient.query(
      `UPDATE cms_access_delivery_jobs
          SET status='processing',processing_lease=$2,attempts=attempts+1,
              last_attempt_at=now(),updated_at=now()
        WHERE id=$1`,
      [jobId, processingLease],
    );
    row.attempts = Number(row.attempts ?? 0) + 1;
    row.processing_lease = processingLease;
    await claimClient.query("COMMIT");
  } catch (error) {
    await claimClient.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    claimClient.release();
  }
  if (!claimed) return;

  let failure: string | undefined;
  let providerMessageId: string | undefined;
  try {
    const payload = decryptPayload(String(claimed.payload_ciphertext));
    const result = await deliverAccessLink({
      email: String(payload.email),
      name: String(payload.name),
      purpose: payload.purpose as AccessDeliveryPurpose,
      token: String(payload.token),
      expiresAt: new Date(String(payload.expiresAt)),
    }, jobId);
    providerMessageId = result.providerMessageId;
  } catch (error) {
    failure = error instanceof AccessDeliveryError
      ? error.message
      : "The secure access email provider could not be reached.";
  }

  const settleClient = await pool.connect();
  try {
    await settleClient.query("BEGIN");
    if (!failure) {
      await settleClient.query(
        `UPDATE cms_access_delivery_jobs
            SET status='sent',payload_ciphertext=NULL,processing_lease=NULL,
                sent_at=now(),provider_message_id=$3,last_error=NULL,updated_at=now()
          WHERE id=$1 AND status='processing' AND processing_lease=$2`,
        [jobId, claimed.processing_lease, providerMessageId ?? null],
      );
    } else {
      const attempts = Number(claimed.attempts);
      await settleClient.query(
        `UPDATE cms_access_delivery_jobs
            SET status='failed',
                payload_ciphertext=CASE WHEN $5 >= $6 THEN NULL ELSE payload_ciphertext END,
                processing_lease=NULL,failed_at=now(),available_at=$3,last_error=$4,updated_at=now()
          WHERE id=$1 AND status='processing' AND processing_lease=$2`,
        [
          jobId,
          claimed.processing_lease,
          attempts < MAX_ATTEMPTS ? retryAt(attempts) : new Date(),
          failure,
          attempts,
          MAX_ATTEMPTS,
        ],
      );
    }
    await settleClient.query("COMMIT");
  } catch (error) {
    await settleClient.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    settleClient.release();
  }
}

export async function retryAccessDeliveryJob(
  executor: Queryable,
  jobId: string,
  userId: string,
): Promise<Record<string, any> | null> {
  await executor.query(
    `UPDATE cms_access_delivery_jobs
        SET status='expired',payload_ciphertext=NULL,processing_lease=NULL,
            failed_at=COALESCE(failed_at,now()),
            last_error='The access link expired before delivery.',updated_at=now()
      WHERE id=$1 AND user_id=$2
        AND status IN ('pending','failed') AND payload_expires_at<=now()`,
    [jobId, userId],
  );
  const result = await executor.query(
    `UPDATE cms_access_delivery_jobs
        SET status='pending',attempts=0,available_at=now(),last_error=NULL,
            failed_at=NULL,last_attempt_at=NULL,updated_at=now()
      WHERE id=$1 AND user_id=$2 AND status='failed'
        AND payload_ciphertext IS NOT NULL AND payload_expires_at>now()
      RETURNING id,user_id,purpose,status,attempts,available_at,last_attempt_at,sent_at,
                failed_at,provider_message_id,last_error,payload_expires_at,created_at,updated_at`,
    [jobId, userId],
  );
  return result.rows[0] ?? null;
}

export async function deliverAccessLink(
  input: AccessDeliveryInput,
  providerIdempotencyKey?: string,
): Promise<{ providerMessageId?: string }> {
  const endpoint = process.env.ACCESS_EMAIL_WEBHOOK_URL;
  if (!endpoint) {
    throw new AccessDeliveryError("Administrator access email delivery is not configured.");
  }
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...(providerIdempotencyKey ? { "idempotency-key": providerIdempotencyKey } : {}),
      ...(process.env.ACCESS_EMAIL_WEBHOOK_SECRET
        ? { authorization: `Bearer ${process.env.ACCESS_EMAIL_WEBHOOK_SECRET}` }
        : {}),
    },
    body: JSON.stringify({
      to: input.email,
      template: input.purpose,
      variables: {
        name: input.name,
        accessLink: accessLink(input.token),
        expiresAt: input.expiresAt.toISOString(),
      },
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) {
    throw new AccessDeliveryError("The secure access email could not be delivered.");
  }
  return {
    providerMessageId: response.headers.get("x-message-id") ?? undefined,
  };
}

let workerTimer: ReturnType<typeof setInterval> | undefined;

/** Start a bounded poller; jobs remain durable if this process is restarted. */
export function startAccessDeliveryWorker(): void {
  if (workerTimer) return;
  const poll = async () => {
    await pool.query(
      `UPDATE cms_access_delivery_jobs
          SET status=CASE WHEN status IN ('pending','failed') THEN 'expired' ELSE status END,
              payload_ciphertext=NULL,
              processing_lease=CASE WHEN status='processing' THEN processing_lease ELSE NULL END,
              failed_at=CASE WHEN status IN ('pending','failed') THEN COALESCE(failed_at,now()) ELSE failed_at END,
              last_error='The access link expired before delivery.',updated_at=now()
        WHERE status IN ('pending','failed','processing') AND payload_expires_at<=now()`,
    );
    const due = await pool.query(
      `SELECT id FROM cms_access_delivery_jobs
        WHERE status IN ('pending','failed') AND available_at<=now()
          AND attempts < $1 AND payload_expires_at>now()
        ORDER BY available_at,created_at LIMIT 10`,
      [MAX_ATTEMPTS],
    );
    await Promise.allSettled(due.rows.map((row) => deliverAccessDeliveryJob(String(row.id))));
  };
  workerTimer = setInterval(() => void poll().catch((error) => {
    logger.error({ err: error }, "Access delivery worker poll failed");
  }), 30_000);
  void poll().catch((error) => {
    logger.error({ err: error }, "Access delivery worker poll failed");
  });
}

export const accessDelivery = {
  maxAttempts: MAX_ATTEMPTS,
  encryptPayload: accessDeliveryCiphertext,
};