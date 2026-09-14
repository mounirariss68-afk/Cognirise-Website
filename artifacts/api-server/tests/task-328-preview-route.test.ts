import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

test("Task 328 issues exact shared-person previews without readiness gating", {
  concurrency: false,
}, async (t) => {
  const previousDatabaseUrl = process.env.DATABASE_URL;
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://task-328-preview-fixture.invalid/cognirise";
  process.env.SESSION_SECRET = "task-328-preview-route-session-secret";

  const [{ default: app }, { pool }, auth, security, documents] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
    import("../src/routes/documents.ts"),
  ]);

  const now = new Date("2026-10-01T12:00:00Z");
  const documentId = "00000000-0000-4000-8000-000000000801";
  const editionId = "00000000-0000-4000-8000-000000000802";
  const olderRevisionId = "00000000-0000-4000-8000-000000000803";
  const newerRevisionId = "00000000-0000-4000-8000-000000000804";
  const foreignRevisionId = "00000000-0000-4000-8000-000000000807";
  const mediaAssetId = "00000000-0000-4000-8000-000000000805";
  const mediaVersionId = "00000000-0000-4000-8000-000000000806";
  const sessionToken = "task-328-preview-session-token";
  const previewSessions: Array<{
    tokenDigest: string;
    revisionId: string;
    requestedMarket: string;
    requestedLocale: string;
    expiresAt: Date;
  }> = [];
  // A legacy shared source is destination-wide until it is classified. This
  // editor is authorized for every enabled destination in the fixture.
  let marketCodes = ["uae", "ksa"];
  let role: "editor" | "viewer" = "editor";

  const personContent = {
    schemaVersion: 1,
    role: "leader",
    title: "Preview-only person",
    biography: "This saved draft deliberately remains incomplete for publication.",
    // This malformed draft field should be surfaced as a warning, not make
    // capability issuance fail. Publication readiness fields are also absent.
    focusAreas: [{ title: "", detail: "" }],
    profileLinks: [],
    // Missing identity fallback, source, verification date, and review date
    // are readiness blockers, but must not prevent protected draft preview.
    visibility: "public",
    order: 0,
  };
  const snapshot = (title: string) => ({
    slug: "task-328-preview-person",
    title,
    summary: null,
    content: personContent,
    mediaIds: [mediaAssetId],
    markets: ["uae"],
  });
  const revisions = new Map([
    [olderRevisionId, { id: olderRevisionId, number: 1, payload: snapshot("Older saved person") }],
    [newerRevisionId, { id: newerRevisionId, number: 2, payload: snapshot("Newest saved person") }],
  ]);

  const query = async (sql: unknown, values: unknown[] = []) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "task-328-session",
          token_digest: security.hashToken(sessionToken),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "task-328-user",
          name: "Task 328 editor",
          email: "task-328-editor@example.com",
          role,
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: role !== "viewer",
          market_codes: marketCodes,
        }],
      };
    }
    if (statement.includes("SELECT content_mode FROM cms_market_editions")) {
      assert.deepEqual(values.slice(0, 3), [documentId, "uae", "en"]);
      return { rowCount: 1, rows: [{ content_mode: "shared", default_locale: "en" }] };
    }
    if (statement.includes("FROM cms_market_edition_bindings binding")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement === "SELECT code FROM market_editions WHERE enabled=true") {
      return { rowCount: 2, rows: [{ code: "uae" }, { code: "ksa" }] };
    }
    if (statement.includes("SELECT code,default_locale,fallback_market_code")) {
      return {
        rowCount: 2,
        rows: [
          { code: "uae", default_locale: "en", fallback_market_code: null, fallback_locale: null, is_canonical: true },
          { code: "ksa", default_locale: "en", fallback_market_code: "uae", fallback_locale: "en", is_canonical: false },
        ],
      };
    }
    if (statement.includes("cms_navigation_published_policies")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("WITH represented_sources AS")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM cms_documents d")) {
      return {
        rowCount: 1,
        rows: [{
          id: documentId,
          kind: "person",
          canonical_slug: "task-328-preview-person",
          title: "Newest saved person",
          owner_id: "task-328-user",
          root_status: "active",
          created_at: now,
          updated_at: now,
          markets: ["uae"],
          edition_id: editionId,
          revision_id: newerRevisionId,
          revision_number: 2,
          payload: snapshot("Newest saved person"),
          workflow_state: "draft",
          publication_state: "draft",
          publish_at: null,
          published_at: null,
          published_revision_id: null,
          can_permanently_delete: true,
        }],
      };
    }
    if (statement.includes("SELECT e.id,e.market,e.locale,NULL::text fallback_reason")) {
      return {
        rowCount: 1,
        rows: [{ id: editionId, market: "uae", locale: "en", fallback_reason: null, used_fallback: false }],
      };
    }
    if (statement.includes("SELECT id,payload,revision_number FROM cms_revisions")) {
      const requestedRevisionId = values[1] ? String(values[1]) : newerRevisionId;
      const revision = revisions.get(requestedRevisionId);
      return revision
        ? {
            rowCount: 1,
            rows: [{ id: revision.id, payload: revision.payload, revision_number: revision.number }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_preview_sessions")) {
      previewSessions.push({
        tokenDigest: String(values[0]),
        revisionId: String(values[2]),
        requestedMarket: String(values[5]),
        requestedLocale: String(values[6]),
        expiresAt: values[4] as Date,
      });
      return { rowCount: 1, rows: [] };
    }
    if (
      statement.includes("JOIN cms_media_references ref")
      && statement.includes("FROM cms_preview_sessions p")
    ) {
      const session = previewSessions.find((candidate) => candidate.tokenDigest === String(values[0]));
      if (!session || String(values[1]) !== mediaAssetId || String(values[2]) !== mediaVersionId) {
        return { rowCount: 0, rows: [] };
      }
      return {
        rowCount: 1,
        rows: [{
          document_id: documentId,
          kind: "person",
          storage_key: "task-328/protected-person.png",
          metadata: { altText: "Preview-only person" },
          payload: revisions.get(session.revisionId)?.payload,
          market: "uae",
          locale: "en",
          requested_market: session.requestedMarket,
          requested_locale: session.requestedLocale,
          status: "active",
          media_type: "image/png",
        }],
      };
    }
    if (statement.includes("SELECT a.id,v.id version_id")) {
      return {
        rowCount: 1,
        rows: [{
          id: mediaAssetId,
          version_id: mediaVersionId,
          width: 1200,
          height: 800,
          metadata: { altText: "Preview-only person" },
          media_type: "image/png",
          alt_text: "Preview-only person",
          credit: null,
        }],
      };
    }
    if (statement.includes("FROM cms_media_references ref")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM cms_preview_sessions p")) {
      const session = previewSessions.find((candidate) => candidate.tokenDigest === String(values[0]));
      const revision = session ? revisions.get(session.revisionId) : undefined;
      return session && revision
        ? {
            rowCount: 1,
            rows: [{
              document_id: documentId,
              kind: "person",
              market: "uae",
              locale: "en",
              editorial_market: "uae",
              revision_id: revision.id,
              payload: revision.payload,
              revision_number: revision.number,
              requested_market: session.requestedMarket,
              requested_locale: session.requestedLocale,
              fallback_reason: null,
              navigation_policy_digest: "task-328-navigation-digest",
              navigation_snapshot: { items: [], pages: [] },
              expires_at: session.expiresAt,
              revoked_at: null,
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    throw new Error(`Unexpected Task 328 preview SQL: ${statement.slice(0, 160)}`);
  };

  t.mock.method(pool, "query", query as never);
  t.mock.method(documents.previewMediaDelivery, "download", async () => Readable.from(["protected-media"]));

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  });

  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken(sessionToken));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=${sessionToken}; ${auth.CSRF_COOKIE}=${csrf}`,
  };
  const previewEndpoint = (query = "") =>
    `${origin}/api/documents/${documentId}/preview?market=uae&locale=en${query}`;
  const expectJson = async <T>(response: Response, status: number, label: string) => {
    const text = await response.text();
    assert.equal(response.status, status, `${label}: ${text}`);
    return JSON.parse(text) as T;
  };

  const exactIssue = await expectJson<{
    previewUrl: string;
    document: { title: string };
    revisionId: string;
    revisionNumber: number;
    requestedMarket: string;
    warnings: string[];
  }>(
    await fetch(previewEndpoint(`&revisionId=${olderRevisionId}`), { headers }),
    200,
    "authorized shared person exact UAE preview",
  );
  assert.equal(exactIssue.revisionId, olderRevisionId);
  assert.equal(exactIssue.revisionNumber, 1);
  assert.equal(exactIssue.document.title, "Older saved person");
  assert.equal(exactIssue.requestedMarket, "uae");
  assert.ok(exactIssue.warnings.length > 0, "draft validation blockers should be returned as preview warnings");
  assert.equal(
    (await fetch(previewEndpoint(`&revisionId=${foreignRevisionId}`), { headers })).status,
    404,
    "an unknown requested revision must not silently fall back to the newest revision",
  );

  const token = exactIssue.previewUrl.split("/").at(-1);
  assert.ok(token);
  const delivered = await expectJson<{
    revisionId: string;
    revisionNumber: number;
    requestedMarket: string;
    document: { title: string };
    validationWarnings: string[];
  }>(
    await fetch(`${origin}/api/preview/${encodeURIComponent(token)}`, { headers }),
    200,
    "protected exact saved person delivery",
  );
  assert.equal(delivered.revisionId, olderRevisionId);
  assert.equal(delivered.revisionNumber, 1);
  assert.equal(delivered.requestedMarket, "uae");
  assert.equal(delivered.document.title, "Older saved person");
  assert.ok(delivered.validationWarnings.length > 0);
  assert.equal(
    (await fetch(`${origin}/api/preview/${encodeURIComponent(token)}`)).status,
    401,
    "protected preview delivery requires authentication",
  );

  role = "viewer";
  assert.equal(
    (await fetch(previewEndpoint(), { headers })).status,
    403,
    "viewers cannot issue protected previews",
  );
  role = "editor";
  marketCodes = ["uae"];
  assert.equal(
    (await fetch(previewEndpoint(), { headers })).status,
    403,
    "a narrower market assignment cannot issue a legacy shared-source preview",
  );
  assert.equal(
    (await fetch(`${origin}/api/preview/${encodeURIComponent(token)}`, { headers })).status,
    403,
    "an editor cannot deliver a preview issued for another market",
  );

  marketCodes = ["uae"];
  assert.equal(
    (await fetch(`${origin}/api/preview/${encodeURIComponent(token)}/media/${mediaAssetId}/wrong-version`, { headers })).status,
    404,
    "protected media requires the exact pinned version",
  );
  assert.equal(
    (await fetch(`${origin}/api/preview/${encodeURIComponent(token)}/media/${mediaAssetId}/${mediaVersionId}`)).status,
    401,
    "protected preview media requires authentication",
  );
});