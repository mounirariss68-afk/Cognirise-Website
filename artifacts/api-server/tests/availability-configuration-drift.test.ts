import assert from "node:assert/strict";
import test from "node:test";

test("availability publish rejects an enabled market or locale added after review", {
  concurrency: false,
}, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "availability-configuration-drift-test-session-secret";
  t.after(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date();
  let configuredMatrix = [
    { id: "ksa-id", code: "ksa", locale: "en" },
    { id: "uae-id", code: "uae", locale: "en" },
  ];
  const statements: string[] = [];
  const query = async (sql: unknown, values: unknown[] = []) => {
    const statement = String(sql);
    statements.push(statement);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "administrator-id",
          name: "Administrator",
          email: "administrator@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: [],
        }],
      };
    }
    if (statement.includes("SELECT id,kind FROM cms_documents")) {
      return String(values[0]) === "document-id"
        ? { rowCount: 1, rows: [{ id: "document-id", kind: "person" }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
      assert.deepEqual(values, ["administrator-id"]);
      return { rowCount: 1, rows: [{ role: "administrator", status: "active" }] };
    }
    if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
      assert.deepEqual(values, ["administrator-id"]);
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT state.draft_version,state.reviewed_version,state.reviewed_selections")) {
      return {
        rowCount: 1,
        rows: [{
          draft_version: 3,
          reviewed_version: 3,
          reviewed_selections: [{ marketEditionId: "ksa-id", locale: "en", decision: "show" }],
          shared_source_revision_id: null,
          reviewed_source_revision_id: null,
        }],
      };
    }
    if (statement.includes("FROM market_editions m") && statement.includes("FOR UPDATE OF m")) {
      return { rowCount: configuredMatrix.length, rows: configuredMatrix };
    }
    return { rowCount: 0, rows: [] };
  };
  t.mock.method(pool, "query", query);
  t.mock.method(pool, "connect", async () => ({
    query,
    release: () => undefined,
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
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
  const publish = async (label: string) => {
    statements.length = 0;
    const response = await fetch(`${origin}/api/documents/document-id/availability/publish`, {
      method: "POST",
      headers,
      body: JSON.stringify({ version: 3 }),
    });
    assert.equal(response.status, 409, label);
    assert.match((await response.json() as { error: string }).error, /configuration changed since review/i);
    assert.ok(
      statements.some((statement) => statement.includes("LOCK TABLE market_editions IN SHARE MODE")),
      `${label}: configuration table lock is required to prevent a phantom destination`,
    );
  };

  await publish("an enabled market added after review is rejected");
  configuredMatrix = [
    { id: "ksa-id", code: "ksa", locale: "en" },
    { id: "ksa-id", code: "ksa", locale: "ar" },
  ];
  await publish("an added locale after review is rejected");
});