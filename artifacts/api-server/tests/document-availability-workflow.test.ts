import assert from "node:assert/strict";
import test from "node:test";

test("availability release paths reject stale, unauthorized, and standalone shared releases", { concurrency: false }, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "availability-workflow-test-session-secret-that-is-longer-than-32-chars";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  let role: "editor" | "administrator" = "editor";
  let draftVersion = 1;
  const now = new Date();
  const query = async (sql: unknown, values: unknown[] = []) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id", token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now, expires_at: new Date(now.getTime() + 60_000),
          created_at: now, user_id: "user-id", name: "CMS user", email: "cms@example.com",
          role, status: "active", last_login_at: null, user_created_at: now, user_updated_at: now,
          must_rotate: false, mfa_enabled: true, market_codes: role === "administrator" ? ["*"] : ["ksa"],
        }],
      };
    }
    if (statement.includes("SELECT id,kind FROM cms_documents")) {
      return { rowCount: 1, rows: [{ id: "document-id", kind: "publication" }] };
    }
    if (statement.includes("SELECT id FROM cms_documents")) {
      return { rowCount: 1, rows: [{ id: "document-id" }] };
    }
    if (statement.includes("SELECT kind FROM cms_documents WHERE id=$1 FOR KEY SHARE")) {
      if (values[0] === "missing-document-id") return { rowCount: 0, rows: [] };
      return { rowCount: 1, rows: [{ kind: "publication" }] };
    }
    if (statement.includes("SELECT draft_version FROM cms_document_availability_states")) {
      return { rowCount: 1, rows: [{ draft_version: draftVersion, shared_source_edition_id: null }] };
    }
    if (statement.includes("FROM cms_document_availability_states")) {
      return {
        rowCount: 1,
        rows: [{
          draft_version: draftVersion, reviewed_version: 1, reviewed_selections: [],
          shared_source_revision_id: "source-draft", reviewed_source_revision_id: "source-draft",
        }],
      };
    }
    if (statement.includes("FROM market_editions m") && statement.includes("FOR UPDATE OF m")) {
      return {
        rowCount: 2,
        rows: [
          { id: "ksa-id", code: "ksa", locale: "en" },
          { id: "uae-id", code: "uae", locale: "en" },
        ],
      };
    }
    return { rowCount: 1, rows: [] };
  };
  t.mock.method(pool, "query", query as never);
  t.mock.method(pool, "connect", async () => ({
    query: (sql: unknown, values?: unknown[]) => pool.query(sql, values),
    release: () => undefined,
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json", origin, "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  const stale = await fetch(`${origin}/api/documents/document-id/availability`, {
    method: "PUT", headers,
    body: JSON.stringify({ version: 0, destinations: [{ marketEditionId: "ksa-id", locale: "en", decision: "off" }] }),
  });
  assert.equal(stale.status, 409);

  const missingReview = await fetch(`${origin}/api/documents/missing-document-id/availability/review`, {
    method: "POST",
    headers,
    body: JSON.stringify({ version: 1 }),
  });
  assert.equal(missingReview.status, 404);
  assert.equal((await missingReview.json() as { error: string }).error, "Document not found.");

  const denied = await fetch(`${origin}/api/documents/document-id/availability`, {
    method: "PUT", headers,
    body: JSON.stringify({ version: draftVersion, destinations: [
      { marketEditionId: "ksa-id", locale: "en", decision: "show" },
      { marketEditionId: "uae-id", locale: "en", decision: "show" },
    ] }),
  });
  assert.equal(denied.status, 403);

  role = "administrator";
  const standaloneSharedRelease = await fetch(`${origin}/api/documents/document-id/availability/publish`, {
    method: "POST", headers, body: JSON.stringify({ version: 1 }),
  });
  assert.equal(standaloneSharedRelease.status, 409);

  const staleSource = await fetch(`${origin}/api/documents/document-id/availability/source`, {
    method: "POST", headers, body: JSON.stringify({ version: 0, sourceRevisionId: "source-revision" }),
  });
  assert.equal(staleSource.status, 409);
});