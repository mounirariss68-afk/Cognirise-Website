import { randomUUID } from "node:crypto";
import { pool } from "@workspace/db";
import { logger } from "./logger";
import { type AuthContext } from "./auth";
import { canAccessEditionTarget } from "../routes/documents";

const MAX_DIGEST_ATTEMPTS = 5;
const RETRY_DELAYS_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 60 * 60_000, 12 * 60 * 60_000];
const DIGEST_PROVIDER_FAILURE = "Editorial digest delivery failed.";
const DIGEST_NOT_CONFIGURED = "Editorial digest delivery is not configured.";
const DIGEST_ATTEMPTS_EXHAUSTED = "Editorial digest delivery attempts were exhausted.";

type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }>;
};
type DigestFetch = (input: string, init: RequestInit) => Promise<{ ok: boolean }>;
type DigestNotification = Record<string, any>;

class DigestBlockedError extends Error {}

function retryAt(attempt: number): Date {
  return new Date(Date.now() + RETRY_DELAYS_MS[Math.min(attempt, RETRY_DELAYS_MS.length - 1)]);
}

function configuredHttpUrl(value: string | undefined): URL | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol) && !url.username && !url.password ? url : undefined;
  } catch {
    return undefined;
  }
}

function safeRecipient(): string | undefined {
  const recipient = process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT?.trim().toLowerCase();
  return recipient && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient) ? recipient : undefined;
}

function digestConfiguration(): { endpoint: string; recipient: string; adminUrl: URL } | undefined {
  const endpoint = configuredHttpUrl(process.env.EDITORIAL_DIGEST_WEBHOOK_URL);
  const recipient = safeRecipient();
  const adminUrl = configuredHttpUrl(process.env.ADMIN_PUBLIC_URL);
  return endpoint && recipient && adminUrl ? { endpoint: endpoint.toString(), recipient, adminUrl } : undefined;
}

export function editorialDigestConfigured(): boolean {
  return Boolean(digestConfiguration());
}

function administratorDeepLink(link: unknown, adminUrl: URL): string {
  const relativeLink = String(link);
  // Notifications are allowed to contain only normal application-relative
  // locations. In particular, never turn a stored absolute preview/access URL
  // into an outbound digest link.
  if (!relativeLink.startsWith("/") || relativeLink.startsWith("//")) {
    throw new DigestBlockedError("Digest notification link is not authorized.");
  }
  const parsed = new URL(relativeLink, "https://editorial-digest.invalid");
  // The API's durable notification ledger uses its API-facing documents path.
  // Email is consumed by the administrator UI, whose authenticated route is
  // /content/:id. Whitelist and translate that one normal route rather than
  // passing arbitrary stored locations (including previews/access URLs) out.
  const documentMatch = /^\/documents\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/i
    .exec(parsed.pathname);
  if (!documentMatch) throw new DigestBlockedError("Digest notification link is not authorized.");
  const base = adminUrl.toString().endsWith("/") ? adminUrl.toString() : `${adminUrl.toString()}/`;
  return new URL(`content/${documentMatch[1]}${parsed.search}`, base).toString();
}

function authFromUser(row: Record<string, any>): AuthContext {
  return {
    id: "",
    tokenHash: "",
    mfaVerified: true,
    createdAt: new Date(0),
    expiresAt: new Date(0),
    user: {
      id: String(row.id),
      name: row.name ?? "",
      email: String(row.email),
      role: row.role,
      status: row.status,
      marketCodes: row.market_codes ?? [],
      mfaEnabled: Boolean(row.mfa_enabled),
      mustRotate: Boolean(row.must_rotate),
      lastLoginAt: row.last_login_at ? new Date(row.last_login_at) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    },
  };
}

async function currentDigestRecipient(executor: Queryable, userId: string): Promise<AuthContext | undefined> {
  const result = await executor.query(
    `SELECT u.id,u.display_name name,u.email,u.role,u.status,u.last_login_at,u.created_at,u.updated_at,
            p.must_rotate,
            COALESCE((SELECT array_agg(a.market_code ORDER BY a.market_code)
              FROM cms_user_market_assignments a WHERE a.user_id=u.id),'{}') market_codes,
            EXISTS(SELECT 1 FROM cms_totp_credentials t WHERE t.user_id=u.id
              AND t.verified_at IS NOT NULL AND t.disabled_at IS NULL) mfa_enabled
       FROM cms_users u LEFT JOIN cms_password_credentials p ON p.user_id=u.id
      WHERE u.id=$1`,
    [userId],
  );
  return result.rowCount && result.rows[0].status === "active"
    ? authFromUser(result.rows[0])
    : undefined;
}

async function permittedNotifications(
  executor: Queryable,
  auth: AuthContext,
  notifications: DigestNotification[],
): Promise<DigestNotification[]> {
  const authorized: DigestNotification[] = [];
  // Do not reproduce canAccessEditionTarget in SQL. Shared-source and adopted
  // editions deliberately have a more subtle authority rule than a market-code
  // prefilter can safely express.
  for (const notification of notifications) {
    if (notification.edition_id && !await canAccessEditionTarget(
      executor,
      auth,
      String(notification.document_id),
      String(notification.market),
      String(notification.locale),
    )) {
      continue;
    }
    authorized.push(notification);
  }
  return authorized;
}

async function authorizedNotifications(
  executor: Queryable,
  auth: AuthContext,
  notifications: DigestNotification[],
): Promise<DigestNotification[] | undefined> {
  const permitted = await permittedNotifications(executor, auth, notifications);
  // Retries must preserve their original payload exactly. A lost right blocks
  // the whole already-reserved selection rather than sending a new subset.
  return permitted.length === notifications.length ? permitted : undefined;
}

async function selectedNotifications(executor: Queryable, jobId: string): Promise<DigestNotification[]> {
  const result = await executor.query(
    `SELECT n.id,n.type,n.title,n.message,n.link,n.created_at,n.edition_id,
            e.document_id,e.market,e.locale
       FROM cms_editorial_digest_job_notifications selection
       JOIN cms_editorial_notifications n ON n.id=selection.notification_id
       LEFT JOIN cms_market_editions e ON e.id=n.edition_id
      WHERE selection.job_id=$1
      ORDER BY selection.notification_id`,
    [jobId],
  );
  return result.rows as DigestNotification[];
}

async function reserveNotifications(
  executor: Queryable,
  jobId: string,
  auth: AuthContext,
): Promise<DigestNotification[]> {
  const visible: DigestNotification[] = [];
  let offset = 0;
  const pageSize = 50;
  // A recent notification whose recipient has since lost access must not make
  // every older, still-authorized event undispatchable. This is only selection
  // time behavior; once reserved, retry authorization remains fail-closed.
  while (visible.length < pageSize) {
    const candidates = await executor.query(
      `SELECT n.id,n.type,n.title,n.message,n.link,n.created_at,n.edition_id,
              e.document_id,e.market,e.locale
         FROM cms_editorial_notifications n
         LEFT JOIN cms_market_editions e ON e.id=n.edition_id
        WHERE n.user_id=$1 AND n.digest_delivered_at IS NULL
          AND NOT EXISTS (
            SELECT 1 FROM cms_editorial_digest_job_notifications selection
             WHERE selection.notification_id=n.id
          )
        ORDER BY n.created_at DESC
        LIMIT $2 OFFSET $3
        FOR UPDATE OF n SKIP LOCKED`,
      [auth.user.id, pageSize, offset],
    );
    const rows = candidates.rows as DigestNotification[];
    if (!rows.length) break;
    visible.push(...(await permittedNotifications(executor, auth, rows)).slice(0, pageSize - visible.length));
    offset += rows.length;
    if (rows.length < pageSize) break;
  }
  if (!visible.length) return [];
  await executor.query(
    `INSERT INTO cms_editorial_digest_job_notifications(job_id,notification_id)
     SELECT $1,unnest($2::uuid[])
     ON CONFLICT (notification_id) DO NOTHING`,
    [jobId, visible.map((notification) => String(notification.id))],
  );
  return selectedNotifications(executor, jobId);
}

/**
 * The only outbound digest call. Tests pass a mock fetcher; production passes
 * the platform fetch. This makes accidental live mail impossible in tests.
 */
export async function sendEditorialDigest(
  recipientEmail: string,
  notifications: DigestNotification[],
  jobId: string,
  fetcher: DigestFetch = (input, init) => fetch(input, init),
): Promise<void> {
  const configuration = digestConfiguration();
  if (!configuration) throw new DigestBlockedError(DIGEST_NOT_CONFIGURED);
  if (recipientEmail.trim().toLowerCase() !== configuration.recipient) {
    throw new DigestBlockedError("Recipient is not the configured safe digest recipient.");
  }
  const response = await fetcher(configuration.endpoint, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": jobId },
    body: JSON.stringify({
      to: recipientEmail,
      template: "editorial-digest",
      notifications: notifications.map((notification) => ({
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: administratorDeepLink(notification.link, configuration.adminUrl),
        createdAt: notification.created_at,
      })),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(DIGEST_PROVIDER_FAILURE);
}

async function blockDigestJob(jobId: string, lease: string | undefined, reason: string): Promise<void> {
  await pool.query(
    `UPDATE cms_editorial_digest_jobs
        SET status='blocked',processing_lease=NULL,failed_at=now(),last_error=$3,updated_at=now()
      WHERE id=$1 AND ($2::uuid IS NULL OR (status='processing' AND processing_lease=$2))`,
    [jobId, lease ?? null, reason],
  );
}

/**
 * Digest event IDs are reserved in cms_editorial_digest_job_notifications as
 * part of claiming a job. A retry therefore uses the exact original event set
 * and idempotency key, rather than whatever notifications exist later.
 */
export async function deliverEditorialDigestJob(jobId: string): Promise<void> {
  const client = await pool.connect();
  let claimed: Record<string, any> | undefined;
  let notifications: DigestNotification[] = [];
  try {
    await client.query("BEGIN");
    const result = await client.query(
      `SELECT j.*,u.email,u.status recipient_status,
              COALESCE(preference.enabled,false) preference_enabled
         FROM cms_editorial_digest_jobs j
         JOIN cms_users u ON u.id=j.user_id
         LEFT JOIN cms_editorial_digest_preferences preference ON preference.user_id=j.user_id
        WHERE j.id=$1
          AND ((j.status='pending' AND j.available_at<=now())
            OR (j.status='failed' AND j.available_at<=now() AND j.attempts<$2)
            OR (j.status='processing' AND j.last_attempt_at<now()-interval '15 minutes' AND j.attempts<$2))
        FOR UPDATE SKIP LOCKED`,
      [jobId, MAX_DIGEST_ATTEMPTS],
    );
    if (!result.rowCount) {
      await client.query("ROLLBACK");
      return;
    }
    const row = result.rows[0] as Record<string, any>;
    if (row.recipient_status !== "active" || !row.preference_enabled || !editorialDigestConfigured()) {
      await client.query(
        `UPDATE cms_editorial_digest_jobs
            SET status='blocked',failed_at=now(),processing_lease=NULL,last_error=$2,updated_at=now()
          WHERE id=$1`,
        [jobId, row.recipient_status !== "active"
          ? "Recipient is no longer active."
          : !row.preference_enabled
            ? "Editorial digest delivery is no longer enabled."
            : DIGEST_NOT_CONFIGURED],
      );
      await client.query("COMMIT");
      return;
    }
    const auth = await currentDigestRecipient(client, String(row.user_id));
    if (!auth || auth.user.email.trim().toLowerCase() !== safeRecipient()) {
      await client.query(
        `UPDATE cms_editorial_digest_jobs
            SET status='blocked',failed_at=now(),processing_lease=NULL,
                last_error=$2,updated_at=now()
          WHERE id=$1`,
        [jobId, !auth ? "Recipient is no longer active." : "Recipient is not the configured safe digest recipient."],
      );
      await client.query("COMMIT");
      return;
    }
    notifications = await selectedNotifications(client, jobId);
    if (!notifications.length && Number(row.attempts) > 0) {
      // A job which has already been dispatched must retain its relation. Do
      // not replace a missing selection after a crash/delete: that would turn
      // the same provider idempotency key into a different digest.
      await client.query(
        `UPDATE cms_editorial_digest_jobs
            SET status='blocked',processing_lease=NULL,failed_at=now(),
                last_error='Digest notification selection is no longer available.',updated_at=now()
          WHERE id=$1`,
        [jobId],
      );
      await client.query("COMMIT");
      return;
    }
    if (!notifications.length) notifications = await reserveNotifications(client, jobId, auth);
    if (!notifications.length) {
      await client.query(
        `UPDATE cms_editorial_digest_jobs
            SET status='sent',processing_lease=NULL,sent_at=now(),
                last_error='No currently authorized notifications to deliver.',updated_at=now()
          WHERE id=$1`,
        [jobId],
      );
      await client.query("COMMIT");
      return;
    }
    const lease = randomUUID();
    await client.query(
      `UPDATE cms_editorial_digest_jobs
          SET status='processing',processing_lease=$2,attempts=attempts+1,
              last_attempt_at=now(),updated_at=now()
        WHERE id=$1`,
      [jobId, lease],
    );
    row.processing_lease = lease;
    row.attempts = Number(row.attempts) + 1;
    claimed = row;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  if (!claimed) return;

  let failure: string | undefined;
  let blockedReason: string | undefined;
  try {
    // Rights and opt-in can change after the transactional reservation, so
    // check both immediately before every provider request. Never send a
    // subset: that would change a retry payload under the same idempotency key.
    const preference = await pool.query(
      "SELECT enabled FROM cms_editorial_digest_preferences WHERE user_id=$1",
      [claimed.user_id],
    );
    const auth = await currentDigestRecipient(pool, String(claimed.user_id));
    if (!preference.rows[0]?.enabled) {
      throw new DigestBlockedError("Editorial digest delivery is no longer enabled.");
    }
    if (!auth || auth.user.email.trim().toLowerCase() !== safeRecipient()) {
      throw new DigestBlockedError(!auth
        ? "Recipient is no longer active."
        : "Recipient is not the configured safe digest recipient.");
    }
    const visible = await authorizedNotifications(pool, auth, await selectedNotifications(pool, jobId));
    if (!visible || visible.length !== notifications.length) {
      throw new DigestBlockedError("Digest notifications are no longer authorized.");
    }
    await sendEditorialDigest(auth.user.email, visible, jobId);
  } catch (error) {
    if (error instanceof DigestBlockedError) blockedReason = error.message;
    else failure = DIGEST_PROVIDER_FAILURE;
  }

  if (blockedReason) {
    await blockDigestJob(jobId, String(claimed.processing_lease), blockedReason);
    return;
  }
  const settle = await pool.connect();
  try {
    await settle.query("BEGIN");
    if (failure) {
      await settle.query(
        `UPDATE cms_editorial_digest_jobs
            SET status='failed',processing_lease=NULL,failed_at=now(),
                available_at=$3,last_error=$4,updated_at=now()
          WHERE id=$1 AND status='processing' AND processing_lease=$2`,
        [jobId, claimed.processing_lease, Number(claimed.attempts) < MAX_DIGEST_ATTEMPTS
          ? retryAt(Number(claimed.attempts)) : new Date(), failure],
      );
    } else {
      await settle.query(
        `UPDATE cms_editorial_digest_jobs
            SET status='sent',processing_lease=NULL,sent_at=now(),last_error=NULL,updated_at=now()
          WHERE id=$1 AND status='processing' AND processing_lease=$2`,
        [jobId, claimed.processing_lease],
      );
      await settle.query(
        `UPDATE cms_editorial_notifications
            SET digest_delivered_at=now()
          WHERE id IN (
            SELECT notification_id FROM cms_editorial_digest_job_notifications WHERE job_id=$1
          ) AND digest_delivered_at IS NULL`,
        [jobId],
      );
    }
    await settle.query("COMMIT");
  } catch (error) {
    await settle.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    settle.release();
  }
}

export async function pollEditorialWork(): Promise<void> {
  await pool.query(
    `INSERT INTO cms_editorial_digest_jobs(user_id,digest_date)
     SELECT preference.user_id,current_date
       FROM cms_editorial_digest_preferences preference
       JOIN cms_users user_account ON user_account.id=preference.user_id
      WHERE preference.enabled AND user_account.status='active'
        AND EXISTS (SELECT 1 FROM cms_editorial_notifications n
                     WHERE n.user_id=preference.user_id AND n.digest_delivered_at IS NULL)
     ON CONFLICT (user_id,digest_date) DO NOTHING`,
  );
  // A due reminder represents live work only. Editors receive it while the
  // edition still has an editable revision; reviewers receive it only for an
  // outstanding request for that exact current revision.
  await pool.query(
    `INSERT INTO cms_editorial_notifications
      (user_id,event_key,type,edition_id,document_id,title,message,link)
     SELECT actionable.user_id,
            'due-reminder:' || actionable.assignment_id::text || ':' || actionable.role || ':' || current_date::text,
            'due-reminder',actionable.edition_id,actionable.document_id,
            CASE WHEN actionable.due_at < now() THEN 'Editorial work overdue' ELSE 'Editorial work due soon' END,
            'An assigned editorial due date requires attention.',
            '/documents/' || actionable.document_id::text ||
              '?market=' || actionable.market || '&locale=' || actionable.locale
       FROM (
         SELECT assignment.id assignment_id,assignment.editor_user_id user_id,assignment.edition_id,
                assignment.document_id,assignment.due_at,edition.market,edition.locale,'editor' role
           FROM cms_editorial_assignments assignment
           JOIN cms_market_editions edition ON edition.id=assignment.edition_id
           JOIN LATERAL (
             SELECT workflow_state FROM cms_revisions
              WHERE edition_id=edition.id ORDER BY revision_number DESC LIMIT 1
           ) latest ON latest.workflow_state IN ('draft','in-review','rejected')
          WHERE assignment.editor_user_id IS NOT NULL AND assignment.due_at IS NOT NULL
            AND assignment.due_at<=now()+interval '24 hours'
         UNION ALL
         SELECT assignment.id,request.reviewer_user_id,assignment.edition_id,assignment.document_id,
                assignment.due_at,edition.market,edition.locale,'reviewer'
           FROM cms_editorial_assignments assignment
           JOIN cms_market_editions edition ON edition.id=assignment.edition_id
           JOIN cms_review_requests request
             ON request.edition_id=assignment.edition_id AND request.status='requested'
           JOIN LATERAL (
             SELECT id FROM cms_revisions
              WHERE edition_id=edition.id ORDER BY revision_number DESC LIMIT 1
           ) latest ON latest.id=request.revision_id
          WHERE assignment.due_at IS NOT NULL AND assignment.due_at<=now()+interval '24 hours'
       ) actionable
       JOIN cms_users user_account ON user_account.id=actionable.user_id AND user_account.status='active'
     ON CONFLICT (user_id,event_key) DO NOTHING`,
  );
  // A crashed final attempt must not retain a processing lease forever. Failed
  // jobs at the attempt limit are terminal and therefore cannot be reclaimed.
  await pool.query(
    `UPDATE cms_editorial_digest_jobs
        SET status='failed',processing_lease=NULL,failed_at=COALESCE(failed_at,now()),
            last_error=$1,updated_at=now()
      WHERE status='processing' AND last_attempt_at<now()-interval '15 minutes' AND attempts>=$2`,
    [DIGEST_ATTEMPTS_EXHAUSTED, MAX_DIGEST_ATTEMPTS],
  );
  const jobs = await pool.query(
    `SELECT id FROM cms_editorial_digest_jobs
      WHERE ((status IN ('pending','failed') AND available_at<=now())
         OR (status='processing' AND last_attempt_at<now()-interval '15 minutes'))
        AND attempts<$1
      ORDER BY available_at,created_at LIMIT 10`,
    [MAX_DIGEST_ATTEMPTS],
  );
  await Promise.allSettled(jobs.rows.map((row) => deliverEditorialDigestJob(String(row.id))));
}

let workerTimer: ReturnType<typeof setInterval> | undefined;
export function startEditorialWorkWorker(): void {
  if (workerTimer) return;
  const poll = () => void pollEditorialWork().catch((error) => {
    logger.error({ err: error }, "Editorial work worker poll failed");
  });
  workerTimer = setInterval(poll, 60_000);
  poll();
}

export const editorialWork = {
  maxDigestAttempts: MAX_DIGEST_ATTEMPTS,
  sendDigest: sendEditorialDigest,
};