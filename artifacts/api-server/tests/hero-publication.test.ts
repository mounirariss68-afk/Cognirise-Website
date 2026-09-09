import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

test("generic review and publication validate site configuration and pin requested versions", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  assert.match(source, /validateSnapshot\(row\.kind, row\.payload, "draft"\)/);
  assert.match(source, /validateSnapshot\(revision\.rows\[0\]\.kind, revision\.rows\[0\]\.payload, "publish"\)/);
  assert.match(source, /"\/documents\/:documentId\/publish",[\s\S]*?requirePublisher/);
  assert.match(source, /hero\.posterMediaVersionId/);
  assert.match(source, /source\.mediaVersionId/);
  assert.match(source, /id::text=\$4::jsonb->>asset\.id::text/);
  assert.match(source, /Publication references unavailable media/);
});

test("public hero selection remains bound to the approved published revision", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/public.ts"), "utf8");
  assert.match(source, /r\.id=e\.published_revision_id/);
  assert.match(source, /r\.workflow_state='approved'/);
  assert.match(source, /validateCmsSnapshot\("site-configuration", row\.payload, "publish"\)/);
  assert.match(source, /ref\.field_path=\$2/);
});

test("hero publication rolls back without moving the pointer on a stored MIME mismatch", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "hero-publication-test-session-secret-long-enough";

  const [{ pool }, { default: app }, auth, security] = await Promise.all([
    import("@workspace/db"),
    import("../src/app.ts"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const documentId = "00000000-0000-4000-8000-000000000201";
  const editionId = "00000000-0000-4000-8000-000000000202";
  const oldRevisionId = "00000000-0000-4000-8000-000000000203";
  const candidateRevisionId = "00000000-0000-4000-8000-000000000204";
  const posterId = "00000000-0000-4000-8000-000000000011";
  const mp4Id = "00000000-0000-4000-8000-000000000012";
  const webmId = "00000000-0000-4000-8000-000000000013";
  const posterVersion = "00000000-0000-4000-8000-000000000111";
  const mp4Version = "00000000-0000-4000-8000-000000000112";
  const webmVersion = "00000000-0000-4000-8000-000000000113";
  const snapshot = {
    slug: "site-homepage-hero",
    title: "Homepage hero",
    content: {
      schemaVersion: 1,
      page: "homepage",
      hero: {
        posterMediaId: posterId,
        posterMediaVersionId: posterVersion,
        sources: [
          { mediaId: mp4Id, mediaVersionId: mp4Version, mimeType: "video/mp4" },
          { mediaId: webmId, mediaVersionId: webmVersion, mimeType: "video/webm" },
        ],
      },
    },
    mediaIds: [posterId, mp4Id, webmId],
    markets: ["uae"],
  };
  const now = new Date("2026-09-07T00:00:00Z");
  let publishedRevisionId = oldRevisionId;
  let rolledBack = false;

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    if (String(sql).includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: values?.[0] ?? security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "Publisher",
          email: "publisher@example.com",
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
    return { rowCount: 0, rows: [] };
  });
  const transactionClient = {
    async query(sql: unknown) {
      const statement = String(sql);
      if (statement === "BEGIN" || statement === "COMMIT") return { rowCount: 0, rows: [] };
      if (statement === "ROLLBACK") {
        rolledBack = true;
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        return {
          rowCount: 1,
          rows: [{
            id: candidateRevisionId,
            edition_id: editionId,
            payload: snapshot,
            kind: "site-configuration",
          }],
        };
      }
      if (statement.includes("INSERT INTO cms_media_references")) {
        return { rowCount: 3, rows: [] };
      }
      if (statement.includes("SELECT a.id::text id,COALESCE(pinned.id,latest.id)")) {
        return {
          rowCount: 3,
          rows: [
            { id: posterId, version_id: posterVersion, media_type: "video/mp4" },
            { id: mp4Id, version_id: mp4Version, media_type: "video/mp4" },
            { id: webmId, version_id: webmVersion, media_type: "video/webm" },
          ],
        };
      }
      if (statement.includes("UPDATE cms_market_editions")) {
        publishedRevisionId = candidateRevisionId;
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  t.mock.method(pool, "connect", async () => transactionClient as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolveClose, reject) =>
      server.close((error) => (error ? reject(error) : resolveClose()))
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
  const response = await fetch(`${origin}/api/documents/${documentId}/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
    body: JSON.stringify({ revisionId: candidateRevisionId }),
  });

  assert.equal(response.status, 422);
  assert.equal(publishedRevisionId, oldRevisionId);
  assert.equal(rolledBack, true);
});