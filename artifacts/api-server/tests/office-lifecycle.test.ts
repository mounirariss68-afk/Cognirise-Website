import assert from "node:assert/strict";
import test from "node:test";

test("published offices with later drafts archive, restore, and never use permanent deletion", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "office-lifecycle-test-session-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date();
  let rootStatus = "active";
  let publicationState = "published";
  let publishedRevisionId: string | null = "published-revision-id";
  let archiveCount = 0;
  let restoreCount = 0;
  let deleteGuardChecked = false;

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
    if (statement.includes("DELETE FROM cms_documents d")) {
      deleteGuardChecked = statement.includes("publication_event.action='document.published'");
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("SET status='archived'")) {
      rootStatus = "archived";
      archiveCount += 1;
      return { rowCount: 1, rows: [{ id: "office-id" }] };
    }
    if (statement.includes("SET publication_state='archived'")) {
      publicationState = "archived";
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("SET status='active',archived_at=NULL")) {
      rootStatus = "active";
      restoreCount += 1;
      return { rowCount: 1, rows: [{ id: "office-id" }] };
    }
    if (statement.includes("SET publication_state='draft'")) {
      publicationState = "draft";
      publishedRevisionId = null;
      return { rowCount: 1, rows: [] };
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
    if (statement.includes("WITH selected AS")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("AS is_configured")) {
      assert.match(statement, /publication_event\.action='document\.published'/);
      assert.match(statement, /publication_event\.metadata->>'scheduled'/);
      return { rowCount: 1, rows: [{ is_configured: true }] };
    }
    if (statement.includes("SELECT d.id,d.kind")) {
      return {
        rowCount: 1,
        rows: [{
          id: "office-id",
          kind: "office",
          canonical_slug: "office-dubai",
          title: "Dubai",
          owner_id: "user-id",
          root_status: rootStatus,
          created_at: now,
          updated_at: now,
          markets: ["uae"],
          can_permanently_delete: false,
          revision_id: "draft-revision-id",
          revision_number: 2,
          payload: {
            slug: "office-dubai",
            title: "Dubai",
            summary: null,
            content: {
              schemaVersion: 1,
              city: "Dubai",
              address: "Edited draft address",
              visibility: "public",
              order: 0,
              sources: [],
              relatedIds: [],
            },
            mediaIds: [],
            markets: ["uae"],
          },
          workflow_state: "draft",
          publication_state: publicationState,
          published_revision_id: publishedRevisionId,
          publish_at: null,
          published_at: now,
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
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  const permanentDelete = await fetch(`${origin}/api/documents/office-id`, {
    method: "DELETE",
    headers,
  });
  assert.equal(permanentDelete.status, 409);
  assert.equal(deleteGuardChecked, true);

  const archived = await fetch(`${origin}/api/documents/office-id/archive`, {
    method: "POST",
    headers,
    body: "{}",
  });
  assert.equal(archived.status, 200);
  assert.equal((await archived.json() as { status: string }).status, "archived");
  assert.equal(archiveCount, 1);

  const restored = await fetch(`${origin}/api/documents/office-id/restore`, {
    method: "POST",
    headers,
    body: "{}",
  });
  assert.equal(restored.status, 200);
  const restoredDocument = await restored.json() as {
    status: string;
    canPermanentlyDelete: boolean;
    publishedRevisionId: string | null;
  };
  assert.equal(restoredDocument.status, "draft");
  assert.equal(restoredDocument.canPermanentlyDelete, false);
  assert.equal(restoredDocument.publishedRevisionId, null);
  assert.equal(restoreCount, 1);

  const publicOffices = await fetch(
    `${origin}/api/public/content?market=uae&locale=en&kind=office`,
  );
  assert.equal(publicOffices.status, 200);
  assert.equal(
    (await publicOffices.json() as { isConfigured: boolean }).isConfigured,
    true,
    "restoring the last published office must not reactivate compiled fallback",
  );
});