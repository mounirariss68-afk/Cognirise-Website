import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pool } from "@workspace/db";
import { deliverEditorialDigestJob, sendEditorialDigest } from "../src/lib/editorial-work";

function restoreEnvironment(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

test("digest delivery is opt-in safe-recipient delivery with mocked transport only", async () => {
  const original = {
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_WEBHOOK_URL = "https://delivery.example.test/digest";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  try {
    let called = 0;
    let requestBody: Record<string, any> | undefined;
    await sendEditorialDigest("safe-recipient@example.test", [{
      type: "assignment", title: "Editorial assignment", message: "Review work.",
      link: "/documents/11111111-1111-4111-8111-111111111111?market=ae&locale=en",
      created_at: "2026-01-01T00:00:00.000Z",
    }], "job-id", async (_url, init) => {
      called += 1;
      requestBody = JSON.parse(String(init.body));
      return { ok: true };
    });
    assert.equal(called, 1);
    assert.equal(
      requestBody?.notifications[0]?.link,
      "https://admin.example.test/admin/content/11111111-1111-4111-8111-111111111111?market=ae&locale=en",
    );

    await assert.rejects(
      () => sendEditorialDigest("staff@example.test", [], "job-id", async () => {
        throw new Error("A mock must not be called for an unsafe recipient.");
      }),
      /configured safe digest recipient/,
    );
    await assert.rejects(
      () => sendEditorialDigest("safe-recipient@example.test", [{
        type: "assignment", title: "Unsafe", message: "Unsafe", link: "/preview/secret-token", created_at: "2026-01-01",
      }], "job-id", async () => {
        throw new Error("A mock must not be called for a non-admin link.");
      }),
      /link is not authorized/,
    );
  } finally {
    restoreEnvironment(original);
  }
});

test("worker reserves one immutable event set and dispatches it through mocked delivery", async (t) => {
  const original = {
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_WEBHOOK_URL = "https://delivery.example.test/digest";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  const jobId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";
  const documentId = "44444444-4444-4444-8444-444444444444";
  const notification = {
    id: "55555555-5555-4555-8555-555555555555",
    type: "assignment",
    title: "Editorial assignment",
    message: "Review work.",
    link: `/documents/${documentId}?market=ae&locale=en`,
    created_at: "2026-01-01T00:00:00.000Z",
    edition_id: null,
    document_id: null,
    market: null,
    locale: null,
  };
  const deniedNotification = {
    ...notification,
    id: "66666666-6666-4666-8666-666666666666",
    edition_id: "77777777-7777-4777-8777-777777777777",
    document_id: documentId,
    market: "ae",
    locale: "en",
  };
  const deniedPage = Array.from({ length: 50 }, (_value, index) => ({
    ...deniedNotification,
    id: `66666666-6666-4666-8666-${String(index).padStart(12, "0")}`,
  }));
  let reserved = false;
  let reservedIds: unknown[] = [];
  const candidateOffsets: unknown[] = [];
  let sent = false;
  let request: Record<string, any> | undefined;
  const query = async (rawSql: unknown, values: unknown[] = []) => {
    const sql = String(rawSql);
    if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) return { rows: [], rowCount: 0 };
    if (sql.includes("SELECT j.*,u.email")) {
      return { rows: [{
        id: jobId, user_id: userId, status: "pending", attempts: 0, available_at: new Date(),
        email: "safe-recipient@example.test", recipient_status: "active", preference_enabled: true,
      }], rowCount: 1 };
    }
    if (sql.includes("FROM cms_users u LEFT JOIN cms_password_credentials")) {
      return { rows: [{
        id: userId, name: "Safe Recipient", email: "safe-recipient@example.test", role: "editor",
        status: "active", market_codes: [], mfa_enabled: true, must_rotate: false,
        created_at: new Date(), updated_at: new Date(), last_login_at: null,
      }], rowCount: 1 };
    }
    if (sql.includes("FROM cms_editorial_digest_job_notifications selection")
      && sql.includes("JOIN cms_editorial_notifications n")) {
      return { rows: reserved ? [notification] : [], rowCount: reserved ? 1 : 0 };
    }
    if (sql.includes("FROM cms_editorial_notifications n")) {
      candidateOffsets.push(values[2]);
      return Number(values[2]) === 0
        ? { rows: deniedPage, rowCount: deniedPage.length }
        : { rows: [notification], rowCount: 1 };
    }
    if (sql.includes("SELECT content_mode FROM cms_market_editions")) {
      return { rows: [{ content_mode: "custom" }], rowCount: 1 };
    }
    if (sql.includes("INSERT INTO cms_editorial_digest_job_notifications")) {
      reserved = true;
      reservedIds = values[1] as unknown[];
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("SELECT enabled FROM cms_editorial_digest_preferences")) {
      return { rows: [{ enabled: true }], rowCount: 1 };
    }
    if (sql.includes("SET status='sent'")) {
      sent = true;
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  };
  t.mock.method(pool, "connect", async () => ({ query, release() {} }) as never);
  t.mock.method(pool, "query", query as never);
  t.mock.method(globalThis, "fetch", async (_url: string | URL | Request, init?: RequestInit) => {
    request = JSON.parse(String(init?.body));
    return { ok: true } as Response;
  });
  try {
    await deliverEditorialDigestJob(jobId);
    assert.equal(reserved, true);
    assert.deepEqual(reservedIds, [notification.id]);
    assert.deepEqual(candidateOffsets, [0, 50]);
    assert.equal(sent, true);
    assert.equal(request?.to, "safe-recipient@example.test");
    assert.equal(request?.notifications.length, 1);
    assert.equal(request?.notifications[0]?.link, `https://admin.example.test/admin/content/${documentId}?market=ae&locale=en`);
  } finally {
    restoreEnvironment(original);
  }
});

test("digest worker keeps event selection immutable and reauthorizes exact targets", async () => {
  const source = await readFile(resolve(process.cwd(), "src/lib/editorial-work.ts"), "utf8");
  assert.match(source, /cms_editorial_digest_job_notifications/);
  assert.match(source, /ON CONFLICT \(notification_id\) DO NOTHING/);
  assert.match(source, /canAccessEditionTarget\(\s*executor,/);
  assert.doesNotMatch(source, /e\.market<>'shared-source'/);
  assert.match(source, /preference\.rows\[0\]\?\.enabled/);
  assert.match(source, /visible\.length !== notifications\.length/);
  assert.match(source, /ADMIN_PUBLIC_URL/);
  assert.match(source, /DIGEST_PROVIDER_FAILURE/);
});

test("editorial migration enforces exact revision review and durable digest dedupe", async () => {
  const migration = await readFile(
    resolve(process.cwd(), "../../lib/db/migrations/0032_cms_editorial_work.sql"), "utf8",
  );
  const worker = await readFile(resolve(process.cwd(), "src/lib/editorial-work.ts"), "utf8");
  const routes = await readFile(resolve(process.cwd(), "src/routes/editorial-work.ts"), "utf8");
  assert.match(migration, /cms_review_requests_open_revision_uidx/);
  assert.match(migration, /cms_editorial_revision_supersedes_review/);
  assert.match(migration, /cms_editorial_notifications_event_uidx/);
  assert.match(migration, /cms_editorial_digest_jobs_user_date_uidx/);
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /attempts>=\$2/);
  assert.match(routes, /role IN \('administrator','publisher'\)/);
});