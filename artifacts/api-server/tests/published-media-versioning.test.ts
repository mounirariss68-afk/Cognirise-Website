import assert from "node:assert/strict";
import { Readable } from "node:stream";
import test from "node:test";

test("public media stays on the revision pin when a newer asset version appears", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "media-version-test-session-secret-longer-than-32-chars";

  const [
    { pool },
    { default: app },
    { publicMediaDelivery },
    auth,
    security,
  ] = await Promise.all([
    import("@workspace/db"),
    import("../src/app.ts"),
    import("../src/routes/public.ts"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const assetId = "00000000-0000-4000-8000-000000000001";
  const revisions = {
    first: {
      id: "00000000-0000-4000-8000-000000000011",
      number: 1,
      versionId: "00000000-0000-4000-8000-000000000101",
    },
    second: {
      id: "00000000-0000-4000-8000-000000000012",
      number: 2,
      versionId: "00000000-0000-4000-8000-000000000102",
    },
  };
  const versions = new Map([
    [revisions.first.versionId, {
      storageKey: "private/cms-media/asset/v1.png",
      bytes: "approved-version-one",
      width: 1200,
    }],
  ]);
  const pendingRevisionId = "00000000-0000-4000-8000-000000000013";
  const documentId = "00000000-0000-4000-8000-000000000201";
  let missingReferenceInserted = false;
  let publishedRevision = revisions.first;
  const now = new Date("2026-09-07T00:00:00Z");
  const snapshot = {
    slug: "pinned-platform",
    title: "Pinned platform",
    content: {
      schemaVersion: 1,
      category: "Specialist",
      summary: "A governed platform summary.",
      heroMediaId: assetId,
      template: "standard",
      sections: [],
      capabilities: [],
      differentiators: [],
      visibility: "public",
      order: 0,
      sources: [{
        label: "Approved source",
        url: "https://example.com/source",
        accessedAt: "2026-09-06",
      }],
      verificationDate: "2026-09-06",
      reviewDate: "2027-03-06",
      relatedIds: [],
    },
    mediaIds: [assetId],
    markets: ["uae"],
  };

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
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
          email: "admin@example.com",
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
    if (statement.includes("SELECT d.id,d.kind,e.market")) {
      return {
        rowCount: 1,
        rows: [{
          id: documentId,
          kind: "platform",
          market: "uae",
          locale: "en",
          published_at: now,
          updated_at: now,
          localized_slug: snapshot.slug,
          revision_id: publishedRevision.id,
          revision_number: publishedRevision.number,
          payload: snapshot,
          requested_market: "uae",
        }],
      };
    }
    if (statement.includes("SELECT a.*,v.id version_id")) {
      assert.match(statement, /v\.id=ref\.media_version_id/);
      const version = versions.get(publishedRevision.versionId);
      assert.ok(version);
      return {
        rowCount: 1,
        rows: [{
          id: assetId,
          version_id: publishedRevision.versionId,
          media_type: "image/png",
          width: version.width,
          height: 630,
          metadata: { caption: "Approved artwork" },
          alt_text: "Approved artwork",
          credit: "Cognirise",
        }],
      };
    }
    if (statement.includes("SELECT v.storage_key")) {
      const [requestedAssetId, requestedVersionId] = values?.map(String) ?? [];
      const version = versions.get(requestedVersionId);
      const authorized = requestedAssetId === assetId &&
        requestedVersionId === publishedRevision.versionId &&
        version;
      return authorized
        ? {
            rowCount: 1,
            rows: [{ storage_key: version.storageKey, media_type: "image/png" }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT d.id,d.kind,d.canonical_slug")) {
      return {
        rowCount: 1,
        rows: [{
          id: documentId,
          kind: "platform",
          canonical_slug: snapshot.slug,
          title: snapshot.title,
          root_status: "active",
          created_at: now,
          updated_at: now,
          markets: ["uae"],
          edition_id: "edition-id",
          revision_id: pendingRevisionId,
          revision_number: 3,
          payload: snapshot,
          workflow_state: "approved",
          publication_state: "published",
          published_at: now,
          published_revision_id: pendingRevisionId,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });
  const transactionClient = {
    async query(sql: unknown) {
      const statement = String(sql);
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        return {
          rowCount: 1,
          rows: [{
            id: pendingRevisionId,
            edition_id: "edition-id",
            payload: snapshot,
            kind: "platform",
          }],
        };
      }
      if (
        statement.includes("INSERT INTO cms_media_references") &&
        statement.includes("asset.status IN ('active','ready')")
      ) {
        missingReferenceInserted = true;
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("SELECT a.id::text id,COALESCE(pinned.id,latest.id)")) {
        assert.equal(missingReferenceInserted, true);
        return {
          rowCount: 1,
          rows: [{ id: assetId, version_id: revisions.second.versionId }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  t.mock.method(pool, "connect", async () => transactionClient as never);
  t.mock.method(publicMediaDelivery, "download", async (storageKey: string) => {
    const version = [...versions.values()].find((candidate) =>
      candidate.storageKey === storageKey
    );
    if (!version) throw new Error("Missing test object");
    return Readable.from(version.bytes);
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const contentUrl = `${origin}/api/public/content/uae/en/platform/${snapshot.slug}`;

  const firstContent = await (await fetch(contentUrl)).json() as {
    media: Array<{ versionId: string; url: string }>;
  };
  assert.equal(firstContent.media[0].versionId, revisions.first.versionId);
  assert.equal(
    await (await fetch(`${origin}${firstContent.media[0].url}`)).text(),
    "approved-version-one",
  );

  versions.set(revisions.second.versionId, {
    storageKey: "private/cms-media/asset/v2.png",
    bytes: "approved-version-two",
    width: 1600,
  });
  const unchangedContent = await (await fetch(contentUrl)).json() as {
    media: Array<{ versionId: string; url: string }>;
  };
  assert.equal(unchangedContent.media[0].versionId, revisions.first.versionId);
  assert.equal(
    await (await fetch(`${origin}${unchangedContent.media[0].url}`)).text(),
    "approved-version-one",
  );

  publishedRevision = revisions.second;
  const republishedContent = await (await fetch(contentUrl)).json() as {
    media: Array<{ versionId: string; url: string }>;
  };
  assert.equal(republishedContent.media[0].versionId, revisions.second.versionId);
  assert.equal(
    await (await fetch(`${origin}${republishedContent.media[0].url}`)).text(),
    "approved-version-two",
  );
  const unapproved = await fetch(
    `${origin}/api/public/media/${assetId}/00000000-0000-4000-8000-000000000103`,
  );
  assert.equal(unapproved.status, 404);

  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const publish = await fetch(`${origin}/api/documents/${documentId}/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
    body: JSON.stringify({ revisionId: pendingRevisionId }),
  });
  assert.equal(publish.status, 200);
  assert.equal(missingReferenceInserted, true);
});