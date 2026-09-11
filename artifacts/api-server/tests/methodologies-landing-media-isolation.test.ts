import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

test("methodologies draft and public landing keep separate immutable hero pins", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "methodologies-media-isolation-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const inventory = JSON.parse(readFileSync(
    resolve(process.cwd(), "../../lib/db/landing-page-inventory.json"),
    "utf8",
  )) as Array<{ path: string; snapshot: Record<string, any> }>;
  const base = structuredClone(
    inventory.find((entry) => entry.path === "/methodologies")?.snapshot,
  );
  assert.ok(base, "the generated methodologies landing fixture must exist");

  const documentId = "00000000-0000-4000-8000-000000000301";
  const editionId = "00000000-0000-4000-8000-000000000302";
  const publishedRevisionId = "00000000-0000-4000-8000-000000000303";
  const draftRevisionId = "00000000-0000-4000-8000-000000000304";
  const assetId = "00000000-0000-4000-8000-000000000305";
  const versions = {
    published: "00000000-0000-4000-8000-000000000311",
    draft: "00000000-0000-4000-8000-000000000312",
    later: "00000000-0000-4000-8000-000000000313",
  };
  const heroSection = (versionId: string) => ({
    type: "media",
    id: "methodologies-hero-media",
    order: 10_000,
    references: [{
      mediaId: assetId,
      mediaVersionId: versionId,
      role: "hero",
      altText: "A governed methodology moving from evidence to action",
    }],
  });
  const publishedSnapshot = structuredClone(base);
  publishedSnapshot.mediaIds = [assetId];
  publishedSnapshot.content.sections = publishedSnapshot.content.sections.map(
    (section: { id: string }) =>
      section.id === "methodologies-hero-media"
        ? { ...heroSection(versions.published), order: 1 }
        : section,
  );
  const draftSnapshot = structuredClone(base);
  draftSnapshot.mediaIds = [assetId];
  draftSnapshot.content.sections = draftSnapshot.content.sections.map(
    (section: { id: string }) =>
      section.id === "methodologies-hero-media"
        ? { ...heroSection(versions.draft), order: 1 }
        : section,
  );
  let latestAssetVersion = versions.draft;
  const now = new Date("2026-09-10T00:00:00Z");

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
          name: "CMS editor",
          email: "editor@example.com",
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
      return {
        rowCount: 1,
        rows: [{
          id: documentId,
          kind: "landing-page",
          market: "uae",
          locale: "en",
          published_at: now,
          updated_at: now,
          localized_slug: "methodologies",
          revision_id: publishedRevisionId,
          revision_number: 7,
          payload: publishedSnapshot,
          total_count: 1,
          requested_market: "uae",
          requested_locale: "en",
        }],
      };
    }
    if (statement.includes("FROM cms_media_references ref")) {
      assert.equal(values[1], `revision:${publishedRevisionId}`);
      return {
        rowCount: 1,
        rows: [{
          id: assetId,
          version_id: versions.published,
          filename: "methodologies-approved-hero.webp",
          media_type: "image/webp",
          status: "active",
          width: 1600,
          height: 900,
          alt_text: "A governed methodology moving from evidence to action",
          metadata: {
            altText: "A governed methodology moving from evidence to action",
          },
        }],
      };
    }
    if (statement.includes("configured_page_paths")) {
      return {
        rowCount: 1,
        rows: [{
          is_configured: true,
          configured_page_paths: ["/methodologies"],
        }],
      };
    }
    if (statement.includes("ARRAY(SELECT DISTINCT market FROM cms_market_editions")) {
      return {
        rowCount: 1,
        rows: [{
          id: documentId,
          kind: "landing-page",
          canonical_slug: "methodologies",
          title: draftSnapshot.title,
          owner_id: "user-id",
          root_status: "active",
          created_at: now,
          updated_at: now,
          markets: ["uae"],
          edition_id: editionId,
          revision_id: draftRevisionId,
          revision_number: 8,
          payload: draftSnapshot,
          workflow_state: "draft",
          publication_state: "published",
          publish_at: null,
          published_at: now,
          published_revision_id: publishedRevisionId,
          can_permanently_delete: false,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolveListening) =>
    server.once("listening", resolveListening)
  );
  t.after(async () => {
    await new Promise<void>((resolveClose, reject) =>
      server.close((error) => error ? reject(error) : resolveClose())
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
  const cookie =
    `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`;

  const draftResponse = await fetch(
    `${origin}/api/documents/${documentId}?market=uae&locale=en`,
    { headers: { cookie } },
  );
  assert.equal(draftResponse.status, 200);
  const draftBody = await draftResponse.json() as {
    currentRevisionId: string;
    publishedRevisionId: string;
    content: { sections: Array<{ id: string; references: Array<{ mediaVersionId: string }> }> };
  };
  assert.equal(draftBody.currentRevisionId, draftRevisionId);
  assert.equal(draftBody.publishedRevisionId, publishedRevisionId);
  assert.equal(
    draftBody.content.sections.find((section) =>
      section.id === "methodologies-hero-media"
    )?.references[0].mediaVersionId,
    versions.draft,
  );

  const publicUrl =
    `${origin}/api/public/content?market=uae&locale=en&kind=landing-page`;
  const firstPublic = await (await fetch(publicUrl)).json() as {
    items: Array<{
      content: { sections: Array<{ id: string; references: Array<{ mediaVersionId: string }> }> };
      media: Array<{ versionId: string; url: string }>;
    }>;
  };
  const publicMethodologies = firstPublic.items[0];
  assert.equal(
    publicMethodologies.content.sections.find((section) =>
      section.id === "methodologies-hero-media"
    )?.references[0].mediaVersionId,
    versions.published,
  );
  assert.deepEqual(publicMethodologies.media, [{
    id: assetId,
    versionId: versions.published,
    url: `/api/public/media/${assetId}/${versions.published}`,
    mimeType: "image/webp",
    width: 1600,
    height: 900,
    duration: null,
    caption: null,
    altText: "A governed methodology moving from evidence to action",
    credit: null,
    motionMetadata: null,
  }]);

  latestAssetVersion = versions.later;
  const afterNewVersion = await (await fetch(publicUrl)).json() as typeof firstPublic;
  assert.equal(latestAssetVersion, versions.later);
  assert.equal(afterNewVersion.items[0].media[0].versionId, versions.published);
  assert.match(
    afterNewVersion.items[0].media[0].url,
    new RegExp(`${versions.published}$`),
  );
});