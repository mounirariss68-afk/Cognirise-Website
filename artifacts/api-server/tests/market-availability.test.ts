import assert from "node:assert/strict";
import test from "node:test";

test("person availability stages editor changes and publishes them with governance", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "market-test-session-secret-that-is-longer-than-32-chars";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  let role: "viewer" | "editor" | "administrator" = "viewer";
  let auditCount = 0;
  let publicSelectionChecked = false;
  const now = new Date();

  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "CMS user",
          email: "cms@example.com",
          role,
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    if (statement.includes("SELECT d.kind,m.code market")) {
      return { rowCount: 1, rows: [{ kind: "person", market: "ksa" }] };
    }
    if (statement.includes("INSERT INTO cms_person_market_availability")) {
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) {
      auditCount += 1;
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("SET published_decision=a.draft_decision")) {
      return {
        rowCount: 1,
        rows: [{ market: "ksa", published_decision: "off", published_at: now }],
      };
    }
    if (statement.includes("JOIN cms_person_market_availability a") && statement.includes("WHERE m.id=$2")) {
      return {
        rowCount: 1,
        rows: [{
          market_edition_id: "market-id",
          market: "ksa",
          display_name: "Saudi Arabia",
          enabled: true,
          published_decision: "inherit",
          draft_decision: "off",
          published_effective_available: true,
          preview_effective_available: false,
          has_edition: false,
          updated_at: now,
          published_at: null,
        }],
      };
    }
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 2,
        rows: [
          { code: "ksa", default_locale: "en", fallback_market_code: "uae", fallback_locale: "en", is_canonical: false },
          { code: "uae", default_locale: "en", fallback_market_code: null, fallback_locale: null, is_canonical: true },
        ],
      };
    }
    if (statement.includes("WITH selected AS")) {
      publicSelectionChecked = statement.includes("cms_person_market_availability") &&
        statement.includes("requested.code=$3") &&
        statement.includes("a.published_decision='off'") &&
        !statement.includes("a.draft_decision='off'");
      return { rowCount: 0, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  const denied = await fetch(`${origin}/api/documents/person-id/market-availability/market-id`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ decision: "off" }),
  });
  assert.equal(denied.status, 403);
  assert.equal(auditCount, 0);

  role = "editor";
  const updated = await fetch(`${origin}/api/documents/person-id/market-availability/market-id`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ decision: "off" }),
  });
  assert.equal(updated.status, 200);
  const stagedResponse = await updated.json() as {
    publishedEffectiveAvailable: boolean;
    pendingDecision: string | null;
    previewEffectiveAvailable: boolean;
  };
  assert.equal(stagedResponse.publishedEffectiveAvailable, true);
  assert.equal(stagedResponse.pendingDecision, "off");
  assert.equal(stagedResponse.previewEffectiveAvailable, false);
  assert.equal(auditCount, 1);

  const editorPublish = await fetch(`${origin}/api/documents/person-id/market-availability/market-id/publish`, {
    method: "POST",
    headers,
  });
  assert.equal(editorPublish.status, 403);

  role = "administrator";
  const release = await fetch(`${origin}/api/documents/person-id/market-availability/market-id/publish`, {
    method: "POST",
    headers,
  });
  assert.equal(release.status, 204);
  assert.equal(auditCount, 2);

  const listed = await fetch(`${origin}/api/public/content?market=ksa&locale=en&kind=person`);
  assert.equal(listed.status, 200);
  assert.deepEqual((await listed.json() as { items: unknown[] }).items, []);
  assert.equal(publicSelectionChecked, true);
});