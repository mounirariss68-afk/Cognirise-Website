import assert from "node:assert/strict";
import test from "node:test";

test("public landing configuration reports publication history per page path", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "landing-publication-history-test-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  let configuredPagePaths = ["/about"];
  let draftLandingDeleted = false;
  const now = new Date();

  t.mock.method(pool, "query", async (sql: unknown, values: unknown[] = []) => {
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
          name: "CMS administrator",
          email: "cms@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    if (statement.includes("SELECT array_agg(market) markets")) {
      return { rowCount: 1, rows: [{ markets: ["uae"] }] };
    }
    if (statement.includes("DELETE FROM cms_documents d")) {
      const documentId = String(values[0] ?? "");
      if (documentId === "draft-landing") {
        draftLandingDeleted = true;
        return { rowCount: 1, rows: [{ id: documentId }] };
      }
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) {
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae",
          default_locale: "en",
          fallback_market_code: null,
          fallback_locale: null,
          is_canonical: true,
        }],
      };
    }
    if (statement.includes("WITH selected AS")) return { rowCount: 0, rows: [] };
    if (statement.includes("configured_page_paths")) {
      assert.match(statement, /pagePath[\s\S]*work/);
      return {
        rowCount: 1,
        rows: [{
          is_configured: configuredPagePaths.length > 0,
          configured_page_paths: configuredPagePaths,
        }],
      };
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
  const endpoint =
    `http://127.0.0.1:${address.port}/api/public/content?market=uae&locale=en&kind=landing-page`;

  const aboutOnly = await fetch(endpoint);
  assert.equal(aboutOnly.status, 200);
  const archivedPublishedBody = await aboutOnly.json() as {
    isConfigured: boolean;
    configuredPagePaths: string[];
    items: unknown[];
  };
  assert.equal(archivedPublishedBody.isConfigured, true);
  assert.deepEqual(archivedPublishedBody.configuredPagePaths, ["/about"]);
  assert.deepEqual(archivedPublishedBody.items, []);

  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const deleteHeaders = {
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };
  const blockedDelete = await fetch(`${origin}/api/documents/published-landing`, {
    method: "DELETE",
    headers: deleteHeaders,
  });
  assert.equal(blockedDelete.status, 409);
  assert.match(
    (await blockedDelete.json() as { error: string }).error,
    /publication history cannot be permanently deleted/,
  );
  const afterBlockedDelete = await fetch(endpoint);
  const afterBlockedDeleteBody = await afterBlockedDelete.json() as {
    isConfigured: boolean;
    configuredPagePaths: string[];
    items: unknown[];
  };
  assert.equal(afterBlockedDeleteBody.isConfigured, true);
  assert.deepEqual(afterBlockedDeleteBody.configuredPagePaths, ["/about"]);
  assert.deepEqual(afterBlockedDeleteBody.items, []);

  const draftDelete = await fetch(`${origin}/api/documents/draft-landing`, {
    method: "DELETE",
    headers: deleteHeaders,
  });
  assert.equal(draftDelete.status, 204);
  assert.equal(draftLandingDeleted, true);

  configuredPagePaths = [];
  const draftOnly = await fetch(endpoint);
  assert.equal(draftOnly.status, 200);
  const draftBody = await draftOnly.json() as {
    isConfigured: boolean;
    configuredPagePaths: string[];
  };
  assert.equal(draftBody.isConfigured, false);
  assert.deepEqual(draftBody.configuredPagePaths, []);
});