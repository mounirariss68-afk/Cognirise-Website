import assert from "node:assert/strict";
import { getEventListeners } from "node:events";
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
    { protectedMediaDelivery },
    auth,
    security,
  ] = await Promise.all([
    import("@workspace/db"),
    import("../src/app.ts"),
    import("../src/routes/public.ts"),
    import("../src/routes/media.ts"),
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
  const versions = new Map<string, {
    storageKey: string;
    bytes: string | Buffer;
    width: number;
    metadata: Record<string, unknown>;
  }>([
    [revisions.first.versionId, {
      storageKey: "private/cms-media/asset/v1.png",
      bytes: "approved-version-one",
      width: 1200,
      metadata: {
        caption: "Approved artwork",
        motionMetadata: null,
        focalPoint: { x: 0.25, y: 0.75 },
      },
    }],
  ]);
  const pendingRevisionId = "00000000-0000-4000-8000-000000000013";
  const documentId = "00000000-0000-4000-8000-000000000201";
  let missingReferenceInserted = false;
  let publishedRevision = revisions.first;
  let latestVersion = revisions.first;
  let assetAltText: string | null = "Approved artwork";
  let assetCredit: string | null = "Cognirise";
  let slowNextDownload = false;
  const deliveredStreams: Readable[] = [];
  const storageErrorListeners = new Map<Readable, (error: Error) => void>();
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
          metadata: version.metadata,
          alt_text: assetAltText,
          credit: assetCredit,
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
            rows: [{
              storage_key: version.storageKey,
              media_type: "image/png",
              byte_size: Buffer.byteLength(version.bytes),
              kind: "platform",
              payload: snapshot,
            }],
          }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT COALESCE(v.storage_key,a.storage_key) storage_key")) {
      const version = versions.get(publishedRevision.versionId);
      return version
        ? {
            rowCount: 1,
            rows: [{
              storage_key: version.storageKey,
              media_type: "image/png",
              byte_size: Buffer.byteLength(version.bytes),
            }],
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
    async query(sql: unknown, values?: unknown[]) {
      const statement = String(sql);
      if (statement === "BEGIN" || statement === "COMMIT" || statement === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }
      if (statement === "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE") {
        return String(values?.[0]) === documentId
          ? { rowCount: 1, rows: [{ id: documentId }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("LOCK TABLE cms_user_market_assignments IN SHARE MODE")) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
        return { rowCount: 1, rows: [{ role: "administrator", status: "active" }] };
      }
      if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
        return { rowCount: 1, rows: [{ market_code: "uae" }] };
      }
      if (statement.includes("SELECT e.id") && statement.includes("FROM cms_revisions r")
        && statement.includes("FOR UPDATE OF e")) {
        return String(values?.[0]) === pendingRevisionId && String(values?.[1]) === documentId
          ? { rowCount: 1, rows: [{ id: "edition-id" }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT a.*,v.metadata") && statement.includes("FOR UPDATE OF a")) {
        const version = versions.get(latestVersion.versionId)!;
        return {
          rowCount: 1,
          rows: [{
            id: assetId,
            collection: "website",
            linkedin_asset_kind: null,
            media_type: "image/png",
            motion_metadata: null,
            alt_text: assetAltText,
            credit: assetCredit,
            metadata: version.metadata,
          }],
        };
      }
      if (statement.includes("UPDATE cms_media_assets SET filename")) {
        assert.doesNotMatch(statement, /alt_text|credit/);
        return { rowCount: 1, rows: [{ id: assetId }] };
      }
      if (statement.includes("INSERT INTO cms_media_versions(")) {
        const prior = versions.get(latestVersion.versionId)!;
        versions.set(revisions.second.versionId, {
          ...prior,
          metadata: values?.[1] as Record<string, unknown>,
        });
        latestVersion = revisions.second;
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("SELECT a.*,v.id version_id,v.width,v.height,v.metadata")) {
        const version = versions.get(latestVersion.versionId)!;
        return {
          rowCount: 1,
          rows: [{
            id: assetId,
            filename: "asset.png",
            storage_key: version.storageKey,
            media_type: "image/png",
            byte_size: Buffer.byteLength(version.bytes),
            checksum: "checksum",
            status: "active",
            collection: "website",
            linkedin_asset_kind: null,
            campaign_metadata: null,
            motion_metadata: null,
            alt_text: assetAltText,
            credit: assetCredit,
            width: version.width,
            height: 630,
            metadata: version.metadata,
            created_at: now,
            updated_at: now,
          }],
        };
      }
      if (statement.includes("SELECT r.id,r.edition_id,r.payload,d.kind")) {
        return {
          rowCount: 1,
          rows: [{
            id: pendingRevisionId,
            edition_id: "edition-id",
            payload: snapshot,
            kind: "platform",
            workflow_state: "in-review",
            publication_state: "in-review",
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
          rows: [{
            id: assetId,
            version_id: revisions.second.versionId,
            status: "active",
            media_type: "image/png",
            width: 1200,
            height: 630,
            alt_text: "Approved artwork",
            metadata: versions.get(revisions.second.versionId)?.metadata,
          }],
        };
      }
      return { rowCount: 1, rows: [] };
    },
    release() {},
  };
  t.mock.method(pool, "connect", async () => transactionClient as never);
  t.mock.method(publicMediaDelivery, "download", async (
    storageKey: string,
    range?: { start: number; end: number },
  ) => {
    const version = [...versions.values()].find((candidate) =>
      candidate.storageKey === storageKey
    );
    if (!version) throw new Error("Missing test object");
    const bytes = Buffer.from(version.bytes);
    const selected = range ? bytes.subarray(range.start, range.end + 1) : bytes;
    const stream = slowNextDownload
      ? Readable.from((async function* () {
          for (let offset = 0; offset < selected.length; offset += 16 * 1024) {
            await new Promise((resolve) => setTimeout(resolve, 2));
            yield selected.subarray(offset, offset + 16 * 1024);
          }
        })())
      : Readable.from(selected);
    const storageErrorListener = () => {};
    stream.on("error", storageErrorListener);
    storageErrorListeners.set(stream, storageErrorListener);
    slowNextDownload = false;
    deliveredStreams.push(stream);
    return stream;
  });
  t.mock.method(protectedMediaDelivery, "download", publicMediaDelivery.download);

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
  const firstMedia = await fetch(`${origin}${firstContent.media[0].url}`);
  assert.equal(firstMedia.headers.get("content-type"), "image/png");
  assert.equal(
    firstMedia.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(await firstMedia.text(), "approved-version-one");
  const partial = await fetch(`${origin}${firstContent.media[0].url}`, {
    headers: { range: "bytes=9-15" },
  });
  assert.equal(partial.status, 206);
  assert.equal(partial.headers.get("accept-ranges"), "bytes");
  assert.equal(partial.headers.get("content-range"), "bytes 9-15/20");
  assert.equal(partial.headers.get("content-type"), "image/png");
  assert.equal(
    partial.headers.get("cache-control"),
    "public, max-age=31536000, immutable",
  );
  assert.equal(await partial.text(), "version");
  const unsatisfiable = await fetch(`${origin}${firstContent.media[0].url}`, {
    headers: { range: "bytes=20-" },
  });
  assert.equal(unsatisfiable.status, 416);
  assert.equal(unsatisfiable.headers.get("content-range"), "bytes */20");

  const approvedVersion = versions.get(revisions.first.versionId)!;
  const approvedBytes = approvedVersion.bytes;
  approvedVersion.bytes = Buffer.alloc(1536 * 1024 * 3, 0x5a);
  const warnings: Error[] = [];
  const onWarning = (warning: Error) => warnings.push(warning);
  process.on("warning", onWarning);
  try {
    for (let attempt = 0; attempt < 12; attempt++) {
      const response = await fetch(`${origin}${firstContent.media[0].url}`);
      assert.equal(response.status, 200);
      assert.equal((await response.arrayBuffer()).byteLength, 1536 * 1024 * 3);
    }

    slowNextDownload = true;
    const controller = new AbortController();
    const abortResponse = await fetch(`${origin}${firstContent.media[0].url}`, {
      signal: controller.signal,
    });
    const abortedBody = abortResponse.arrayBuffer();
    await new Promise((resolve) => setTimeout(resolve, 10));
    controller.abort();
    await assert.rejects(abortedBody, { name: "AbortError" });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(deliveredStreams.at(-1)?.destroyed, true);

    const afterAbort = await fetch(`${origin}${firstContent.media[0].url}`);
    assert.equal(afterAbort.status, 200);
    assert.equal((await afterAbort.arrayBuffer()).byteLength, 1536 * 1024 * 3);
  } finally {
    process.off("warning", onWarning);
    approvedVersion.bytes = approvedBytes;
  }
  assert.equal(
    warnings.some((warning) => warning.name === "MaxListenersExceededWarning"),
    false,
  );
  for (const stream of deliveredStreams) {
    // node:stream pipeline detaches its abort/error handlers on a later turn
    // after an aborted response. Drain that lifecycle before asserting the
    // adapter-owned listener is the only retained listener.
    for (let attempt = 0; attempt < 10; attempt++) {
      const errorListeners = getEventListeners(stream, "error");
      const closeListeners = getEventListeners(stream, "close");
      const endListeners = getEventListeners(stream, "end");
      if (
        errorListeners.length === 1 &&
        errorListeners[0] === storageErrorListeners.get(stream) &&
        closeListeners.length === 0 &&
        endListeners.length === 0
      ) {
        break;
      }
      await new Promise<void>((resolve) => setImmediate(resolve));
    }
    assert.deepEqual(getEventListeners(stream, "error"), [storageErrorListeners.get(stream)]);
    assert.equal(getEventListeners(stream, "close").length, 0);
    assert.equal(getEventListeners(stream, "end").length, 0);
  }

  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const protectedPartial = await fetch(`${origin}/api/media/${assetId}/file`, {
    headers: {
      range: "bytes=-3",
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
  });
  assert.equal(protectedPartial.status, 206);
  assert.equal(protectedPartial.headers.get("content-range"), "bytes 17-19/20");
  assert.equal(protectedPartial.headers.get("content-type"), "image/png");
  assert.equal(protectedPartial.headers.get("cache-control"), "no-store, private");
  assert.equal(await protectedPartial.text(), "one");

  const metadataPatch = await fetch(`${origin}/api/media/${assetId}`, {
    method: "PATCH",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
    },
    body: JSON.stringify({
      caption: "Revised caption",
      altText: null,
      credit: "Revised credit",
    }),
  });
  assert.equal(metadataPatch.status, 200);
  const patched = await metadataPatch.json() as {
    caption: string; altText: null; credit: string; status: string;
  };
  assert.equal(patched.caption, "Revised caption");
  assert.equal(patched.altText, null);
  assert.equal(patched.credit, "Revised credit");
  assert.equal(patched.status, "review");
  const metadataVersion = versions.get(revisions.second.versionId)!;
  assert.deepEqual(metadataVersion.metadata, {
    caption: "Revised caption",
    altText: null,
    credit: "Revised credit",
    motionMetadata: null,
    focalPoint: { x: 0.25, y: 0.75 },
    rightsStatus: "needs-review",
    accessibilityStatus: "needs-review",
    sourceReview: null,
  });

  const unchangedContent = await (await fetch(contentUrl)).json() as {
    media: Array<{
      versionId: string;
      url: string;
      altText: string | null;
      caption: string;
      credit: string;
      focalPoint: { x: number; y: number } | null;
    }>;
  };
  assert.equal(unchangedContent.media[0].versionId, revisions.first.versionId);
  assert.equal(unchangedContent.media[0].altText, "Approved artwork");
  assert.equal(unchangedContent.media[0].caption, "Approved artwork");
  assert.equal(unchangedContent.media[0].credit, "Cognirise");
  assert.deepEqual(unchangedContent.media[0].focalPoint, { x: 0.25, y: 0.75 });
  assert.equal(
    await (await fetch(`${origin}${unchangedContent.media[0].url}`)).text(),
    "approved-version-one",
  );
  const pendingMedia = await fetch(
    `${origin}/api/public/media/${assetId}/${revisions.second.versionId}`,
  );
  assert.equal(pendingMedia.status, 404);

  publishedRevision = revisions.second;
  const republishedContent = await (await fetch(contentUrl)).json() as {
    media: Array<{ versionId: string; url: string; altText: null; caption: string; credit: string }>;
  };
  assert.equal(republishedContent.media[0].versionId, revisions.second.versionId);
  assert.equal(republishedContent.media[0].altText, null);
  assert.equal(republishedContent.media[0].caption, "Revised caption");
  assert.equal(republishedContent.media[0].credit, "Revised credit");
  assert.equal(
    await (await fetch(`${origin}${republishedContent.media[0].url}`)).text(),
    "approved-version-one",
  );
  const unapproved = await fetch(
    `${origin}/api/public/media/${assetId}/00000000-0000-4000-8000-000000000103`,
  );
  assert.equal(unapproved.status, 404);

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
  assert.equal(publish.status, 422);
  assert.equal(missingReferenceInserted, true);
});
