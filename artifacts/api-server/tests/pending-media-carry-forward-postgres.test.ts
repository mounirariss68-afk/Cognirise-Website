import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import test from "node:test";

test("an authorized normal save carries only its exact pending-review pin into protected preview delivery", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
  concurrency: false,
}, async (t) => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "pending-media-carry-forward-test-session-secret";
  const [{ default: app }, { pool }, auth, security, documents] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
    import("../src/routes/documents.ts"),
  ]);
  const client = await pool.connect();
  const userId = randomUUID();
  const assetId = randomUUID();
  const retainedVersionId = randomUUID();
  const swappedVersionId = randomUUID();
  const unrelatedAssetId = randomUUID();
  const unrelatedVersionId = randomUUID();
  const sessionToken = randomUUID();
  const slug = `pending-carry-${assetId.slice(0, 8)}`;
  let documentId: string | undefined;
  let server: ReturnType<typeof app.listen> | undefined;

  const content = {
    schemaVersion: 1,
    variant: "article",
    teaser: "The initial prose remains governed by this fixture.",
    body: [{ type: "paragraph", text: "A normal save must retain its exact private draft-media pin." }],
    author: "Pending media regression fixture",
    publicationDate: "2026-10-01",
    readingTimeMinutes: 1,
    topics: ["governance"],
    sectors: [],
    platformIds: [],
    heroMedia: {
      mediaId: assetId,
      mediaVersionId: retainedVersionId,
      role: "hero",
      altText: "A protected pending-review fixture image",
    },
    visibility: "public",
    order: 0,
    sources: [{ label: "Regression source", url: "https://example.com/pending-media-carry", accessedAt: "2026-10-01" }],
    verificationDate: "2026-10-01",
    reviewDate: "2026-10-01",
    relatedIds: [],
  };
  const seo = {
    title: "Pending carry-forward fixture",
    description: "Initial metadata for the exact immutable pending-review carry-forward test.",
    noIndex: false,
    ogImageMedia: {
      mediaId: assetId,
      mediaVersionId: retainedVersionId,
      role: "og-image",
      altText: "A protected pending-review fixture image",
    },
  };

  try {
    const schemaReady = await client.query<{ ready: boolean }>(
      `SELECT to_regclass('cms_media_references') IS NOT NULL
          AND to_regclass('cms_media_versions') IS NOT NULL
          AND to_regclass('cms_totp_credentials') IS NOT NULL AS ready`,
    );
    if (!schemaReady.rows[0]?.ready) {
      t.skip("DATABASE_URL has not applied CMS media-reference migrations");
      return;
    }
    await client.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,$2,'Pending media test administrator','administrator','active')`,
      [userId, `${slug}@example.com`],
    );
    await client.query(
      `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
       VALUES ($1,'fixture',1,now())`,
      [userId],
    );
    await client.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [userId, security.hashToken(sessionToken)],
    );
    const insertAsset = async (id: string, versionId: string, filename: string) => {
      await client.query(
        `INSERT INTO cms_media_assets
           (id,storage_key,filename,original_filename,media_type,byte_size,checksum,status,uploaded_by_user_id)
         VALUES ($1,$2,$3,$3,'image/png',4,$4,'active',$5)`,
        [id, `cms-test/${id}.png`, filename, `checksum-${id}`, userId],
      );
      await client.query(
        `INSERT INTO cms_media_versions
           (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,$2,1,$3,$4,4,1200,800,'{"altText":"Protected pending-review fixture image"}'::jsonb)`,
        [versionId, id, `cms-test/${versionId}.png`, `checksum-${id}`],
      );
    };
    await insertAsset(assetId, retainedVersionId, "retained.png");
    await insertAsset(unrelatedAssetId, unrelatedVersionId, "unrelated.png");

    t.mock.method(documents.previewMediaDelivery, "download", async () => Readable.from(["protected-media"]));
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
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
    const request = (path: string, method: string, body?: unknown) => fetch(`${origin}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    const expectJson = async <T>(response: Response, status: number) => {
      const text = await response.text();
      assert.equal(response.status, status, text);
      return JSON.parse(text) as T;
    };

    const created = await expectJson<{ id: string; currentRevisionId: string }>(await request("/api/documents", "POST", {
      kind: "publication", slug, title: "Pending carry-forward fixture", content, seo, markets: ["uae"],
    }), 201);
    documentId = created.id;
    await client.query(
      `UPDATE cms_media_assets SET status='pending-review' WHERE id=ANY($1::uuid[])`,
      [[assetId, unrelatedAssetId]],
    );
    await client.query(
      `UPDATE cms_media_versions
          SET metadata='{"altText":"Protected pending-review fixture image","rightsStatus":"needs-review","accessibilityStatus":"needs-review"}'::jsonb
        WHERE id=ANY($1::uuid[])`,
      [[retainedVersionId, unrelatedVersionId]],
    );
    await client.query(
      `INSERT INTO cms_media_versions(id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,2,$3,$4,4,1200,800,'{"altText":"Swapped version"}'::jsonb)`,
      [swappedVersionId, assetId, `cms-test/${swappedVersionId}.png`, `checksum-${assetId}-v2`],
    );

    const savedContent = { ...content, teaser: "Updated prose proves a normal save carries its exact pending pin." };
    const savedSeo = { ...seo, description: "Updated SEO proves the separately role-labelled social pin also survives." };
    const saved = await expectJson<{ currentRevisionId: string; revisionNumber: number; content: typeof content; seo: typeof seo }>(await request(`/api/documents/${documentId}`, "PATCH", {
      market: "uae", locale: "en", revisionNumber: 1, expectedRevisionId: created.currentRevisionId,
      title: "Pending carry-forward fixture", content: savedContent, seo: savedSeo,
    }), 200);
    assert.equal(saved.revisionNumber, 2);
    assert.equal(saved.content.teaser, savedContent.teaser);
    assert.equal(saved.seo.ogImageMedia.mediaVersionId, retainedVersionId);
    const pin = await client.query<{ media_version_id: string }>(
      `SELECT media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2`,
      [documentId, `revision:${saved.currentRevisionId}`],
    );
    assert.deepEqual(pin.rows.map((row) => row.media_version_id), [retainedVersionId]);

    const reloaded = await expectJson<{ currentRevisionId: string }>(await request(`/api/documents/${documentId}?market=uae&locale=en`, "GET"), 200);
    assert.equal(reloaded.currentRevisionId, saved.currentRevisionId);
    const previewStarted = await expectJson<{ previewUrl: string }>(await request(
      `/api/documents/${documentId}/preview?market=uae&locale=en&revisionId=${saved.currentRevisionId}`,
      "GET",
    ), 200);
    const previewPayload = await expectJson<{
      document: { content: typeof content; seo: typeof seo };
      media: Array<{ id: string; versionId: string; url: string }>;
      missingMediaIds: string[];
    }>(await request(`/api${previewStarted.previewUrl}`, "GET"), 200);
    assert.equal(previewPayload.document.content.teaser, savedContent.teaser);
    assert.equal(previewPayload.document.seo.ogImageMedia.mediaVersionId, retainedVersionId);
    assert.deepEqual(previewPayload.missingMediaIds, []);
    assert.deepEqual(previewPayload.media.map(({ id, versionId }) => ({ id, versionId })), [{ id: assetId, versionId: retainedVersionId }]);
    const binary = await request(previewPayload.media[0].url, "GET");
    assert.equal(binary.status, 200, await binary.text());

    const swapAttempt = await request(`/api/documents/${documentId}`, "PATCH", {
      market: "uae", locale: "en", revisionNumber: 2, expectedRevisionId: saved.currentRevisionId,
      title: "Pending carry-forward fixture",
      content: { ...savedContent, heroMedia: { ...savedContent.heroMedia, mediaVersionId: swappedVersionId } },
      seo: savedSeo,
    });
    assert.equal(swapAttempt.status, 422, await swapAttempt.text());
    const unrelatedAttempt = await request(`/api/documents/${documentId}`, "PATCH", {
      market: "uae", locale: "en", revisionNumber: 2, expectedRevisionId: saved.currentRevisionId,
      title: "Pending carry-forward fixture",
      content: {
        ...savedContent,
        heroMedia: { ...savedContent.heroMedia, mediaId: unrelatedAssetId, mediaVersionId: unrelatedVersionId },
      },
      seo: savedSeo,
    });
    assert.equal(unrelatedAttempt.status, 422, await unrelatedAttempt.text());
    const revisions = await client.query<{ revision_number: number }>(
      "SELECT revision_number FROM cms_revisions WHERE edition_id=(SELECT id FROM cms_market_editions WHERE document_id=$1 AND market='uae' AND locale='en') ORDER BY revision_number",
      [documentId],
    );
    assert.deepEqual(revisions.rows.map((row) => row.revision_number), [1, 2]);
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    if (documentId) await client.query("DELETE FROM cms_documents WHERE id=$1", [documentId]);
    await client.query("DELETE FROM cms_media_assets WHERE id=ANY($1::uuid[])", [[assetId, unrelatedAssetId]]);
    await client.query("DELETE FROM cms_sessions WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM cms_totp_credentials WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM cms_users WHERE id=$1", [userId]);
    client.release();
    await pool.end();
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});