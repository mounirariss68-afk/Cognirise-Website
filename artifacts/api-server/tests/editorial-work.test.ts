import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ReplitConnectors } from "@replit/connectors-sdk";
import { pool } from "@workspace/db";
import { deliverEditorialDigestJob, editorialDigestConfigured, sendEditorialDigest } from "../src/lib/editorial-work";

function restoreEnvironment(values: Record<string, string | undefined>) {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function webhookDeliveryFingerprint(): string {
  return createHash("sha256").update(JSON.stringify({
    provider: "webhook",
    endpoint: "https://delivery.example.test/digest",
    recipient: "safe-recipient@example.test",
    adminUrl: "https://admin.example.test/admin/",
  })).digest("hex");
}

function resendDeliveryFingerprint(): string {
  return createHash("sha256").update(JSON.stringify({
    provider: "resend",
    from: "editorial@example.test",
    recipient: "safe-recipient@example.test",
    adminUrl: "https://admin.example.test/admin/",
  })).digest("hex");
}

test("digest delivery is opt-in safe-recipient delivery with mocked transport only", async () => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "webhook";
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

test("Resend digest delivery uses the signal-capable connector proxy with a durable idempotency key", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
  process.env.EDITORIAL_DIGEST_FROM = "Cognirise Editorial <editorial@cognidocs.cognirise.ai>";
  delete process.env.EDITORIAL_DIGEST_WEBHOOK_URL;
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  try {
    t.mock.method(ReplitConnectors.prototype, "listConnections", async () => [{
      id: "resend-connection-a",
      connector_name: "resend",
    }]);
    assert.equal(editorialDigestConfigured(), true, "only the safe configured-status function exposes readiness");
    let request: {
      path: string;
      init: RequestInit;
    } | undefined;
    await sendEditorialDigest("safe-recipient@example.test", [{
      type: "review-requested",
      title: "Review requested <urgent>",
      message: "A revision needs review & approval.",
      link: "/documents/11111111-1111-4111-8111-111111111111?market=uae&locale=en",
      created_at: "2026-01-01T00:00:00.000Z",
    }], "22222222-2222-4222-8222-222222222222", async () => {
      throw new Error("Webhook transport must not be called for the Resend provider.");
    }, async (path, init) => {
      request = { path, init };
      return { ok: true };
    });
    assert.equal(request?.path, "/emails");
    assert.deepEqual(request?.init.headers, {
      "Content-Type": "application/json",
      "Idempotency-Key": "22222222-2222-4222-8222-222222222222",
    });
    const body = JSON.parse(String(request?.init.body)) as Record<string, string>;
    assert.equal(body.from, "Cognirise Editorial <editorial@cognidocs.cognirise.ai>");
    assert.equal(body.to, "safe-recipient@example.test");
    assert.equal(body.subject, "Editorial digest: 1 update");
    assert.match(body.text, /https:\/\/admin\.example\.test\/admin\/content\/11111111-1111-4111-8111-111111111111/);
    assert.match(body.html, /Review requested &lt;urgent&gt;/);
    assert.match(body.html, /review &amp; approval/);
  } finally {
    restoreEnvironment(original);
  }
});

test("digest configuration fails closed without an explicit provider and provider fields", () => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  try {
    delete process.env.EDITORIAL_DIGEST_PROVIDER;
    process.env.EDITORIAL_DIGEST_FROM = "editorial@example.test";
    process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
    process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
    assert.equal(editorialDigestConfigured(), false);
    process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
    delete process.env.EDITORIAL_DIGEST_FROM;
    assert.equal(editorialDigestConfigured(), false);
    process.env.EDITORIAL_DIGEST_PROVIDER = "webhook";
    process.env.EDITORIAL_DIGEST_WEBHOOK_URL = "http://delivery.example.test/digest";
    assert.equal(editorialDigestConfigured(), false, "webhooks must use HTTPS");
    process.env.EDITORIAL_DIGEST_WEBHOOK_URL = "https://delivery.example.test/digest";
    process.env.ADMIN_PUBLIC_URL = "http://admin.example.test/admin/";
    assert.equal(editorialDigestConfigured(), false, "administrator links must use HTTPS");
  } finally {
    restoreEnvironment(original);
  }
});

test("Resend digest rejects an ambiguous connector account before transport", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
  process.env.EDITORIAL_DIGEST_FROM = "editorial@example.test";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  try {
    t.mock.method(ReplitConnectors.prototype, "listConnections", async () => [
      { id: "resend-connection-a", connector_name: "resend" },
      { id: "resend-connection-b", connector_name: "resend" },
    ]);
    let transportCalled = false;
    await assert.rejects(
      () => sendEditorialDigest("safe-recipient@example.test", [], "job-id", undefined, async () => {
        transportCalled = true;
        return { ok: true };
      }),
      /not configured/,
    );
    assert.equal(transportCalled, false, "a connector account must never be selected from an ambiguous list");
  } finally {
    restoreEnvironment(original);
  }
});

test("a retry blocks when its reserved delivery configuration changes", async () => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "webhook";
  process.env.EDITORIAL_DIGEST_WEBHOOK_URL = "https://replacement.example.test/digest";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  try {
    let transportCalled = false;
    await assert.rejects(
      () => sendEditorialDigest(
        "safe-recipient@example.test",
        [{ type: "assignment", title: "Assignment", message: "Review it.", link: "/documents/11111111-1111-4111-8111-111111111111", created_at: "2026-01-01" }],
        "job-id",
        async () => {
          transportCalled = true;
          return { ok: true };
        },
        undefined,
        {
          provider: "webhook",
          configurationFingerprint: webhookDeliveryFingerprint(),
          connectionId: null,
        },
      ),
      /identity changed after the job was reserved/,
    );
    assert.equal(transportCalled, false, "a retry cannot reuse an idempotency key at a new endpoint");
  } finally {
    restoreEnvironment(original);
  }
});

test("a Resend retry blocks when its reserved connector ID is replaced", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
  process.env.EDITORIAL_DIGEST_FROM = "editorial@example.test";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  try {
    t.mock.method(ReplitConnectors.prototype, "listConnections", async () => [{
      id: "replacement-resend-connection",
      connector_name: "resend",
    }]);
    let transportCalled = false;
    await assert.rejects(
      () => sendEditorialDigest(
        "safe-recipient@example.test",
        [],
        "job-id",
        undefined,
        async () => {
          transportCalled = true;
          return { ok: true };
        },
        {
          provider: "resend",
          configurationFingerprint: resendDeliveryFingerprint(),
          connectionId: "resend-connection-a",
        },
      ),
      /identity changed after the job was reserved/,
    );
    assert.equal(transportCalled, false, "a replacement account cannot receive a retry");
  } finally {
    restoreEnvironment(original);
  }
});

test("Resend digest aborts its connector request through AbortSignal", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
  process.env.EDITORIAL_DIGEST_FROM = "editorial@example.test";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  try {
    t.mock.method(ReplitConnectors.prototype, "listConnections", async () => [{
      id: "resend-connection-a",
      connector_name: "resend",
    }]);
    const controller = new AbortController();
    let requestedTimeout: number | undefined;
    let transportSettled = false;
    t.mock.method(AbortSignal, "timeout", (milliseconds) => {
      requestedTimeout = milliseconds;
      return controller.signal;
    });
    await assert.rejects(
      () => sendEditorialDigest("safe-recipient@example.test", [{
        type: "assignment", title: "Assignment", message: "Review it.",
        link: "/documents/11111111-1111-4111-8111-111111111111",
        created_at: "2026-01-01T00:00:00.000Z",
      }], "job-id", undefined, async (_path, init) => new Promise((_, reject) => {
        init.signal?.addEventListener("abort", () => {
          transportSettled = true;
          reject(controller.signal.reason);
        }, { once: true });
        queueMicrotask(() => controller.abort(new Error("transport timeout")));
      })),
      /transport timeout/,
    );
    assert.equal(requestedTimeout, 10_000);
    assert.equal(transportSettled, true, "the provider promise settles on the real abort signal");
  } finally {
    restoreEnvironment(original);
  }
});

test("worker reserves one immutable event set and dispatches it through mocked delivery", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "webhook";
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
        delivery_provider: "webhook",
        delivery_configuration_fingerprint: webhookDeliveryFingerprint(),
        delivery_connection_id: null,
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

test("stale lease recovery waits for abortable transport and settles with its replacement lease", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_WEBHOOK_URL: process.env.EDITORIAL_DIGEST_WEBHOOK_URL,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
  process.env.EDITORIAL_DIGEST_FROM = "editorial@example.test";
  delete process.env.EDITORIAL_DIGEST_WEBHOOK_URL;
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  const jobId = "22222222-2222-4222-8222-222222222222";
  const userId = "33333333-3333-4333-8333-333333333333";
  const notification = {
    id: "55555555-5555-4555-8555-555555555555",
    type: "assignment",
    title: "Editorial assignment",
    message: "Review work.",
    link: "/documents/44444444-4444-4444-8444-444444444444?market=ae&locale=en",
    created_at: "2026-01-01T00:00:00.000Z",
    edition_id: null,
    document_id: null,
    market: null,
    locale: null,
  };
  const controller = new AbortController();
  let replacementLease: unknown;
  let settledLease: unknown;
  let transportSettled = false;
  const query = async (rawSql: unknown, values: unknown[] = []) => {
    const sql = String(rawSql);
    if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) return { rows: [], rowCount: 0 };
    if (sql.includes("SELECT j.*,u.email")) {
      return { rows: [{
        id: jobId, user_id: userId, status: "processing", attempts: 1,
        last_attempt_at: new Date(0), email: "safe-recipient@example.test",
        recipient_status: "active", preference_enabled: true,
        delivery_provider: "resend",
        delivery_configuration_fingerprint: resendDeliveryFingerprint(),
        delivery_connection_id: "resend-connection-a",
      }], rowCount: 1 };
    }
    if (sql.includes("FROM cms_users u LEFT JOIN cms_password_credentials")) {
      return { rows: [{
        id: userId, name: "Safe Recipient", email: "safe-recipient@example.test", role: "editor",
        status: "active", market_codes: [], mfa_enabled: true, must_rotate: false,
        created_at: new Date(), updated_at: new Date(), last_login_at: null,
      }], rowCount: 1 };
    }
    if (sql.includes("FROM cms_editorial_digest_job_notifications selection")) {
      return { rows: [notification], rowCount: 1 };
    }
    if (sql.includes("SELECT enabled FROM cms_editorial_digest_preferences")) {
      return { rows: [{ enabled: true }], rowCount: 1 };
    }
    if (sql.includes("SET status='processing'")) {
      replacementLease = values[1];
      return { rows: [], rowCount: 1 };
    }
    if (sql.includes("SET status='failed'")) {
      settledLease = values[1];
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  };
  t.mock.method(pool, "connect", async () => ({ query, release() {} }) as never);
  t.mock.method(pool, "query", query as never);
  t.mock.method(AbortSignal, "timeout", () => controller.signal);
  t.mock.method(ReplitConnectors.prototype, "listConnections", async () => [{
    id: "resend-connection-a",
    connector_name: "resend",
  }]);
  t.mock.method(ReplitConnectors.prototype, "createProxyFetch", () => async (
    _url: string | URL | Request,
    init?: RequestInit,
  ) => new Promise<Response>((_resolve, reject) => {
    init?.signal?.addEventListener("abort", () => {
      transportSettled = true;
      reject(controller.signal.reason);
    }, { once: true });
    queueMicrotask(() => controller.abort(new Error("transport timeout")));
  }));
  try {
    await deliverEditorialDigestJob(jobId);
    assert.equal(transportSettled, true);
    assert.equal(settledLease, replacementLease, "the stale worker can only settle its replacement lease");
  } finally {
    restoreEnvironment(original);
  }
});

test("a stalled Resend discovery holds no database lock and single-flights retries", async (t) => {
  const original = {
    EDITORIAL_DIGEST_PROVIDER: process.env.EDITORIAL_DIGEST_PROVIDER,
    EDITORIAL_DIGEST_FROM: process.env.EDITORIAL_DIGEST_FROM,
    EDITORIAL_DIGEST_SAFE_RECIPIENT: process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT,
    ADMIN_PUBLIC_URL: process.env.ADMIN_PUBLIC_URL,
  };
  process.env.EDITORIAL_DIGEST_PROVIDER = "resend";
  process.env.EDITORIAL_DIGEST_FROM = "editorial@example.test";
  process.env.EDITORIAL_DIGEST_SAFE_RECIPIENT = "safe-recipient@example.test";
  process.env.ADMIN_PUBLIC_URL = "https://admin.example.test/admin/";
  const jobId = "22222222-2222-4222-8222-222222222222";
  let connectionLookups = 0;
  let connectionAcquires = 0;
  let blockedJobs = 0;
  let timeoutCallback: (() => void) | undefined;
  const query = async (rawSql: unknown) => {
    const sql = String(rawSql);
    if (/^BEGIN|^COMMIT|^ROLLBACK/.test(sql)) return { rows: [], rowCount: 0 };
    if (sql.includes("SELECT j.*,u.email")) {
      return { rows: [{
        id: jobId, user_id: "33333333-3333-4333-8333-333333333333", status: "pending", attempts: 0,
        email: "safe-recipient@example.test", recipient_status: "active", preference_enabled: true,
        delivery_provider: "resend",
        delivery_configuration_fingerprint: resendDeliveryFingerprint(),
        delivery_connection_id: "resend-connection-a",
      }], rowCount: 1 };
    }
    if (sql.includes("SET status='blocked'")) {
      blockedJobs += 1;
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 1 };
  };
  t.mock.method(ReplitConnectors.prototype, "listConnections", async () => {
    connectionLookups += 1;
    return new Promise(() => {});
  });
  t.mock.method(ReplitConnectors.prototype, "createProxyFetch", () => {
    throw new Error("mail transport must not start after discovery timeout");
  });
  t.mock.method(pool, "connect", async () => {
    connectionAcquires += 1;
    return { query, release() {} } as never;
  });
  t.mock.method(globalThis, "setTimeout", ((callback: () => void) => {
    timeoutCallback = callback;
    return {} as ReturnType<typeof setTimeout>;
  }) as typeof setTimeout);
  try {
    const first = deliverEditorialDigestJob(jobId);
    await new Promise<void>((resolve) => queueMicrotask(resolve));
    assert.equal(connectionLookups, 1);
    assert.equal(connectionAcquires, 0, "connection discovery finishes before the worker acquires a DB lock");
    assert.ok(timeoutCallback);
    timeoutCallback();
    await first;
    assert.equal(blockedJobs, 1, "the job settles far before the 15-minute stale lease threshold");

    await deliverEditorialDigestJob(jobId);
    assert.equal(connectionLookups, 1, "cooldown reuses the one unresolved read-only lookup");
    assert.equal(blockedJobs, 2);
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
  const deliveryIdentityMigration = await readFile(
    resolve(process.cwd(), "../../lib/db/migrations/0034_cms_editorial_digest_delivery_identity.sql"), "utf8",
  );
  const worker = await readFile(resolve(process.cwd(), "src/lib/editorial-work.ts"), "utf8");
  const routes = await readFile(resolve(process.cwd(), "src/routes/editorial-work.ts"), "utf8");
  assert.match(migration, /cms_review_requests_open_revision_uidx/);
  assert.match(migration, /cms_editorial_revision_supersedes_review/);
  assert.match(migration, /cms_editorial_notifications_event_uidx/);
  assert.match(migration, /cms_editorial_digest_jobs_user_date_uidx/);
  assert.match(worker, /FOR UPDATE SKIP LOCKED/);
  assert.match(worker, /attempts>=\$2/);
  assert.match(worker, /createProxyFetch\("resend"\)/);
  assert.match(worker, /AbortSignal\.timeout\(10_000\)/);
  assert.match(worker, /deliveryIdentityMatches/);
  assert.match(deliveryIdentityMigration, /delivery_configuration_fingerprint/);
  assert.match(deliveryIdentityMigration, /cms_editorial_digest_jobs_delivery_identity_check/);
  assert.match(routes, /role IN \('administrator','publisher'\)/);
});