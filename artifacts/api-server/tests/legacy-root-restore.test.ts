import assert from "node:assert/strict";
import test from "node:test";

test("legacy root restore activates only the selected authorized edition", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "legacy-root-restore-session-secret-long-enough";
  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date("2026-10-02T00:00:00Z");
  let rootStatus = "archived";
  const states: Record<string, string> = { ksa: "published", uae: "published" };
  const staleInReviewRevisionId = "ksa-stale-in-review";
  let latestRevisionId = staleInReviewRevisionId;
  let latestWorkflow = "in-review";
  let committed = false;
  const payload = {
    slug: "legacy-document",
    title: "Legacy document",
    summary: null,
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "Restored content.",
      body: [{ type: "paragraph", text: "Governed restored publication." }],
      author: "Editorial",
      publicationDate: "2026-10-02",
      readingTimeMinutes: 1,
      topics: ["governance"],
      sectors: [],
      platformIds: [],
      visibility: "public",
      order: 0,
      sources: [{
        label: "Archive recovery policy",
        url: "https://example.com/archive-recovery",
        accessedAt: "2026-10-02",
      }],
      verificationDate: "2026-10-02",
      reviewDate: "2026-10-02",
      relatedIds: [],
    },
    mediaIds: [],
    markets: ["ksa"],
  };

  t.mock.method(pool, "query", async (sql: unknown, values: unknown[] = []) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: values[0] ?? security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "KSA publisher",
          email: "ksa-publisher@example.com",
          role: "publisher",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          market_codes: ["ksa"],
        }],
      };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) return { rowCount: 1, rows: [] };
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "ksa",
          default_locale: "en",
          fallback_market_code: null,
          fallback_locale: null,
          is_canonical: true,
        }],
      };
    }
    if (statement.includes("WITH selected AS")) {
      return states.ksa === "published"
        ? {
            rowCount: 1,
            rows: [{
              id: "legacy-document",
              kind: "publication",
              market: "ksa",
              locale: "en",
              published_at: now,
              updated_at: now,
              localized_slug: "legacy-document",
              revision_id: latestRevisionId,
              revision_number: 3,
              payload,
              total_count: 1,
              requested_market: "ksa",
              requested_locale: "en",
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("AS is_configured")) {
      return { rowCount: 1, rows: [{ is_configured: true, configured_page_paths: [] }] };
    }
    if (statement.includes("FROM cms_navigation_published_policies")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT r.id,r.payload,r.workflow_state,d.kind")) {
      return {
        rowCount: 1,
        rows: [{
          id: latestRevisionId,
          payload,
          workflow_state: latestWorkflow,
          kind: "publication",
          canonical_slug: "legacy-document",
          market: "ksa",
          locale: "en",
        }],
      };
    }
    if (statement.includes("UPDATE cms_revisions SET workflow_state='in-review'")) {
      latestWorkflow = "in-review";
      states.ksa = "in-review";
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_media_references")) return { rowCount: 0, rows: [] };
    if (statement.includes("SELECT d.id,d.kind") && statement.endsWith("WHERE d.id=$1")) {
      return {
        rowCount: 1,
        rows: [{
          id: "legacy-document",
          kind: "publication",
          canonical_slug: "legacy-document",
          title: "Legacy document",
          owner_id: "user-id",
          root_status: rootStatus,
          created_at: now,
          updated_at: now,
          markets: ["ksa"],
          can_permanently_delete: false,
          revision_id: latestRevisionId,
          revision_number: latestRevisionId === "ksa-successor" ? 3 : 2,
          payload,
          workflow_state: latestWorkflow,
          publication_state: states.ksa,
          published_revision_id: "ksa-published",
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });
  t.mock.method(pool, "connect", async () => ({
    async query(sql: unknown, values: unknown[] = []) {
      const statement = String(sql);
      if (statement === "BEGIN" || statement === "ROLLBACK") return { rowCount: 0, rows: [] };
      if (statement === "COMMIT") {
        committed = true;
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT status FROM cms_documents")) {
        return { rowCount: 1, rows: [{ status: rootStatus }] };
      }
      if (statement.includes("SET publication_state='archived'")) {
        states.ksa = "archived";
        states.uae = "archived";
        return { rowCount: 2, rows: [] };
      }
      if (statement.includes("UPDATE cms_documents SET status='active'")) {
        rootStatus = "active";
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("SELECT e.id,e.published_revision_id,d.kind")) {
        assert.deepEqual(values.slice(0, 3), ["legacy-document", "ksa", "en"]);
        return {
          rowCount: 1,
          rows: [{
            id: "ksa-edition",
            published_revision_id: "ksa-published",
            kind: "publication",
            revision_id: latestRevisionId,
            revision_number: 2,
            workflow_state: latestWorkflow,
            payload,
          }],
        };
      }
      if (statement.includes("INSERT INTO cms_revisions")) {
        assert.equal(values[1], "ksa-published");
        latestRevisionId = "ksa-successor";
        latestWorkflow = "draft";
        return {
          rowCount: 1,
          rows: [{
            id: latestRevisionId,
            payload,
          }],
        };
      }
      if (statement.includes("SET publication_state='draft'")) {
        states.ksa = "draft";
        return { rowCount: 1, rows: [{ id: "ksa-edition" }] };
      }
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        if (values[0] !== latestRevisionId) return { rowCount: 0, rows: [] };
        return {
          rowCount: 1,
          rows: [{
            id: latestRevisionId,
            edition_id: "ksa-edition",
            payload,
            kind: "publication",
            canonical_slug: "legacy-document",
            workflow_state: latestWorkflow,
            publication_state: states.ksa,
            market: "ksa",
            locale: "en",
          }],
        };
      }
      if (statement.includes("UPDATE cms_revisions SET workflow_state='approved'")) {
        latestWorkflow = "approved";
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("UPDATE cms_market_editions SET publication_state=$2")) {
        states.ksa = "published";
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("INSERT INTO cms_audit_events")) return { rowCount: 1, rows: [] };
      return { rowCount: 0, rows: [] };
    },
    release() {},
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
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
  const response = await fetch(`${origin}/api/documents/legacy-document/restore`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
    body: JSON.stringify({ market: "ksa", locale: "en" }),
  });
  assert.equal(response.status, 200);
  const restored = await response.json() as {
    status: string;
    currentRevisionId: string;
    publishedRevisionId: string;
  };
  assert.equal(restored.status, "draft");
  assert.equal(restored.currentRevisionId, "ksa-successor");
  assert.equal(restored.publishedRevisionId, "ksa-published");
  assert.equal(latestWorkflow, "draft");
  assert.equal(rootStatus, "active");
  assert.equal(states.ksa, "draft");
  assert.equal(states.uae, "archived");
  assert.equal(committed, true);

  const stalePublish = await fetch(`${origin}/api/documents/legacy-document/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
    body: JSON.stringify({ revisionId: staleInReviewRevisionId }),
  });
  assert.equal(stalePublish.status, 409);
  assert.equal(latestRevisionId, "ksa-successor");
  assert.equal(latestWorkflow, "draft");
  assert.equal(states.ksa, "draft");

  const publicWhileRestored = await fetch(
    `${origin}/api/public/content?market=ksa&locale=en&kind=publication`,
  );
  assert.equal(publicWhileRestored.status, 200);
  assert.equal((await publicWhileRestored.json() as { items: unknown[] }).items.length, 0);

  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };
  const submitted = await fetch(`${origin}/api/documents/legacy-document/submit`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: latestRevisionId }),
  });
  assert.equal(submitted.status, 200, await submitted.text());
  assert.equal(latestWorkflow, "in-review");
  assert.equal(states.ksa, "in-review");

  const published = await fetch(`${origin}/api/documents/legacy-document/publish`, {
    method: "POST",
    headers,
    body: JSON.stringify({ revisionId: latestRevisionId }),
  });
  assert.equal(published.status, 200, await published.text());
  assert.equal(latestWorkflow, "approved");
  assert.equal(states.ksa, "published");
  assert.equal(states.uae, "archived");
  const publicAfterRepublish = await fetch(
    `${origin}/api/public/content?market=ksa&locale=en&kind=publication`,
  );
  assert.equal(publicAfterRepublish.status, 200);
  const republishedItems = (await publicAfterRepublish.json() as {
    items: Array<{ id: string; revision: number }>;
  }).items;
  assert.equal(republishedItems.length, 1);
  assert.equal(republishedItems[0]?.id, "legacy-document");
  assert.equal(republishedItems[0]?.revision, 3);
});