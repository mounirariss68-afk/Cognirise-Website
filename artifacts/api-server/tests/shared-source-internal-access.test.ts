import assert from "node:assert/strict";
import test from "node:test";

test("an editor authorized for every destination can read shared-source/und while a restricted editor cannot", {
  concurrency: false,
}, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "shared-source-internal-access-test-session-secret";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  let marketCodes = ["ksa", "uae"];
  const now = new Date("2026-10-01T12:00:00Z");
  const documentId = "00000000-0000-4000-8000-000000000701";
  const query = async (sql: unknown, values: unknown[] = []) => {
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
          name: "Destination editor",
          email: "editor@example.com",
          role: "editor",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: marketCodes,
        }],
      };
    }
    if (statement.includes("SELECT content_mode FROM cms_market_editions")) {
      assert.equal(values[0], documentId);
      assert.ok(values[1] === "shared-source" || values[1] === "uae");
      // Mode is a property of the exact target, not merely its market. This
      // catches a custom uae/en sibling accidentally authorizing uae/ar shared
      // content for a UAE-only editor.
      assert.equal(values[2], values[1] === "shared-source" ? "und" : "ar");
      return { rowCount: 1, rows: [{ content_mode: "shared" }] };
    }
    // This fixture is an unbound legacy shared source. The destination-wide
    // authorization branch is therefore still authoritative after checking
    // that no managed shared/adapted binding materializes this exact address.
    if (statement.includes("FROM cms_market_edition_bindings binding")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement === "SELECT code FROM market_editions WHERE enabled=true") {
      return { rowCount: 2, rows: [{ code: "ksa" }, { code: "uae" }] };
    }
    if (statement.includes("FROM cms_documents d")) {
      // getDocument first applies market scopes, then intentionally retries
      // unscoped only after the destination-wide shared-source authorization.
      if (values[3] !== null) return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          id: documentId,
          kind: "publication",
          canonical_slug: "internal-shared-source",
          title: "Internal shared source",
          owner_id: "user-id",
          root_status: "active",
          created_at: now,
          updated_at: now,
          markets: ["shared-source"],
          edition_id: "00000000-0000-4000-8000-000000000702",
          revision_id: "00000000-0000-4000-8000-000000000703",
          revision_number: 4,
          payload: {
            slug: "internal-shared-source",
            title: "Internal shared source",
            content: {},
            mediaIds: [],
          },
          workflow_state: "draft",
          publication_state: "draft",
          publish_at: null,
          published_at: null,
          published_revision_id: null,
          can_permanently_delete: true,
        }],
      };
    }
    throw new Error(`Unexpected query: ${statement}`);
  };
  t.mock.method(pool, "query", query as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const headers = {
    cookie: `${auth.SESSION_COOKIE}=session-token`,
  };
  const endpoint = `http://127.0.0.1:${address.port}/api/documents/${documentId}?market=shared-source&locale=und`;

  const authorized = await fetch(endpoint, { headers });
  assert.equal(authorized.status, 200);
  assert.equal((await authorized.json() as { currentRevisionId: string }).currentRevisionId,
    "00000000-0000-4000-8000-000000000703");

  marketCodes = ["ksa"];
  const restricted = await fetch(endpoint, { headers });
  assert.equal(restricted.status, 403);

  marketCodes = ["uae"];
  const localeSplit = await fetch(
    `http://127.0.0.1:${address.port}/api/documents/${documentId}?market=uae&locale=ar`,
    { headers },
  );
  assert.equal(localeSplit.status, 403);
});