import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

/**
 * This is intentionally an authenticated route test rather than a mocked
 * pool test. It exercises the same transaction that publishes CMS content,
 * including the immutable media pin and shared-source availability snapshot.
 */
test("administrator publishes a saved shared draft without review", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
  concurrency: false,
}, async (t) => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "postgres-cms-publishing-test-session-secret";
  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const client = await pool.connect();
  const fixtureId = randomUUID();
  const userId = randomUUID();
  const assetId = randomUUID();
  const mediaVersionId = randomUUID();
  const token = randomUUID();
  const slug = `postgres-publish-${fixtureId.slice(0, 8)}`;
  let documentId: string | undefined;
  let reviewedDocumentId: string | undefined;
  let server: ReturnType<typeof app.listen> | undefined;

  const payload = {
    schemaVersion: 1,
    variant: "article",
    teaser: "An authenticated database-backed publication fixture.",
    body: [{ type: "paragraph", text: "This saved draft is published without a review request." }],
    author: "CMS regression fixture",
    publicationDate: "2026-10-01",
    readingTimeMinutes: 1,
    topics: ["governance"],
    sectors: [],
    platformIds: [],
    heroMedia: {
      mediaId: assetId,
      mediaVersionId,
      role: "hero",
      altText: "A publication fixture image",
    },
    social: {
      imageMedia: {
        mediaId: assetId,
        mediaVersionId,
        role: "og-image",
        altText: "A social publication fixture image",
      },
    },
    visibility: "public",
    order: 0,
    sources: [{
      label: "CMS publishing regression source",
      url: "https://example.com/cms-publishing-regression",
      accessedAt: "2026-10-01",
    }],
    verificationDate: "2026-10-01",
    reviewDate: "2026-10-01",
    relatedIds: [],
  };

  try {
    const schemaReady = await client.query<{ ready: boolean }>(
      `SELECT
         to_regclass('cms_document_availability_states') IS NOT NULL
         AND to_regclass('cms_media_versions') IS NOT NULL
         AND to_regclass('cms_totp_credentials') IS NOT NULL AS ready`,
    );
    if (!schemaReady.rows[0]?.ready) {
      t.skip("DATABASE_URL has not applied the CMS publishing migrations");
      return;
    }

    await client.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,$2,'CMS publishing administrator','administrator','active')`,
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
      [userId, security.hashToken(token)],
    );
    await client.query(
      `INSERT INTO cms_media_assets
         (id,storage_key,filename,original_filename,media_type,byte_size,checksum,status,uploaded_by_user_id)
       VALUES ($1,$2,'hero.png','hero.png','image/png',4,$3,'active',$4)`,
      [assetId, `cms-test/${assetId}.png`, `checksum-${assetId}`, userId],
    );
    await client.query(
      `INSERT INTO cms_media_versions
         (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata,created_at)
       VALUES ($1,$2,1,$3,$4,4,1200,800,'{"altText":"A governed fixture image"}'::jsonb,now())`,
      [mediaVersionId, assetId, `cms-test/${mediaVersionId}.png`, `checksum-${assetId}`],
    );

    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const csrf = auth.csrfForSession(security.hashToken(token));
    const headers = {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrf}`,
    };
    const post = (path: string, body: Record<string, unknown>) => fetch(`${origin}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const create = await post("/api/documents", {
      kind: "publication",
      slug,
      title: "Authenticated direct publication fixture",
      content: payload,
      markets: ["uae"],
    });
    assert.equal(create.status, 201);
    const created = await create.json() as {
      id: string;
      currentRevisionId: string;
    };
    documentId = created.id;

    const previewStart = await fetch(
      `${origin}/api/documents/${documentId}/preview?market=uae&locale=en`,
      { headers },
    );
    assert.equal(previewStart.status, 200);
    const previewStarted = await previewStart.json() as { previewUrl: string };
    const preview = await fetch(`${origin}/api${previewStarted.previewUrl}`, { headers });
    assert.equal(preview.status, 200);
    const previewBody = await preview.json() as {
      media: Array<{ id: string; versionId: string }>;
      missingMediaIds: string[];
    };
    assert.deepEqual(previewBody.missingMediaIds, []);
    assert.deepEqual(
      [...new Map(previewBody.media.map(({ id, versionId }) => [
        id,
        { id, versionId },
      ] as const)).values()],
      [{ id: assetId, versionId: mediaVersionId }],
    );

    const initialAvailability = await pool.query<{ draft_version: number }>(
      `SELECT draft_version FROM cms_document_availability_states WHERE document_id=$1`,
      [documentId],
    );
    assert.equal(initialAvailability.rows[0]?.draft_version, 1);
    await client.query(
      `UPDATE cms_document_availability_states
          SET draft_version=2,updated_at=now() WHERE document_id=$1`,
      [documentId],
    );
    const stagedDirectAvailability = await client.query(
      `UPDATE cms_document_market_availability
          SET draft_decision='off',updated_at=now()
        WHERE document_id=$1
        RETURNING market_edition_id::text,locale,draft_decision`,
      [documentId],
    );
    assert.ok(stagedDirectAvailability.rowCount);
    const staleAvailabilityPublish = await post(`/api/documents/${documentId}/publish`, {
      revisionId: created.currentRevisionId,
      availabilityVersion: 1,
    });
    assert.equal(staleAvailabilityPublish.status, 409, await staleAvailabilityPublish.text());

    const publish = await post(`/api/documents/${documentId}/publish`, {
      revisionId: created.currentRevisionId,
      availabilityVersion: 2,
    });
    assert.equal(publish.status, 200);
    const pinned = await pool.query<{ media_version_id: string }>(
      `SELECT media_version_id FROM cms_media_references
        WHERE document_id=$1 AND field_path LIKE $2`,
      [documentId, `revision:${created.currentRevisionId}%`],
    );
    assert.ok(pinned.rowCount && pinned.rows.every((row) => row.media_version_id === mediaVersionId));
    const releasedAvailability = await pool.query<{
      published_version: number;
      published_source_revision_id: string;
    }>(
      `SELECT published_version,published_source_revision_id
         FROM cms_document_availability_states WHERE document_id=$1`,
      [documentId],
    );
    assert.equal(releasedAvailability.rows[0]?.published_version, 2);
    assert.equal(releasedAvailability.rows[0]?.published_source_revision_id, created.currentRevisionId);

    const staleReplay = await post(`/api/documents/${documentId}/publish`, {
      revisionId: created.currentRevisionId,
      availabilityVersion: 2,
    });
    assert.equal(staleReplay.status, 409, await staleReplay.text());

    await client.query("UPDATE cms_users SET role='editor' WHERE id=$1", [userId]);
    const editorPublish = await post(`/api/documents/${documentId}/publish`, {
      revisionId: created.currentRevisionId,
    });
    assert.equal(editorPublish.status, 403, await editorPublish.text());

    await client.query("UPDATE cms_users SET role='administrator' WHERE id=$1", [userId]);
    const personCreate = await post("/api/documents", {
      kind: "person",
      slug: `${slug}-person`,
      title: "Reviewed destination regression fixture",
      content: {
        schemaVersion: 1,
        role: "founder",
        title: "Governed founder",
        biography: "A person fixture used to protect staged destination edits.",
        focusAreas: [],
        profileLinks: [],
        approvedFallback: "initials",
        visibility: "public",
        order: 0,
        sources: [{
          label: "CMS reviewed destination source",
          url: "https://example.com/cms-reviewed-destination",
          accessedAt: "2026-10-01",
        }],
        verificationDate: "2026-10-01",
        reviewDate: "2026-10-01",
        relatedIds: [],
      },
      markets: ["uae"],
    });
    assert.equal(personCreate.status, 201);
    const person = await personCreate.json() as { id: string; currentRevisionId: string };
    reviewedDocumentId = person.id;
    const review = await post(`/api/documents/${person.id}/availability/review`, { version: 1 });
    assert.equal(review.status, 200, await review.text());
    const submit = await post(`/api/documents/${person.id}/submit`, {
      revisionId: person.currentRevisionId,
    });
    assert.equal(submit.status, 200, await submit.text());
    await client.query(
      `UPDATE cms_document_availability_states
          SET draft_version=2,updated_at=now()
        WHERE document_id=$1`,
      [person.id],
    );
    const stagedAvailability = await client.query(
      `UPDATE cms_document_market_availability
          SET draft_decision='off',updated_at=now()
        WHERE document_id=$1
        RETURNING market_edition_id::text,locale,draft_decision`,
      [person.id],
    );
    assert.ok(stagedAvailability.rowCount);
    const reviewedPublish = await post(`/api/documents/${person.id}/publish`, {
      revisionId: person.currentRevisionId,
      availabilityVersion: 2,
    });
    assert.equal(reviewedPublish.status, 409, await reviewedPublish.text());
    const preservedState = await pool.query<{
      draft_version: number;
      reviewed_version: number | null;
      draft_decision: string | null;
    }>(
      `SELECT s.draft_version,s.reviewed_version,a.draft_decision
         FROM cms_document_availability_states s
         LEFT JOIN cms_document_market_availability a ON a.document_id=s.document_id
        WHERE s.document_id=$1
        ORDER BY a.market_edition_id,a.locale
        LIMIT 1`,
      [person.id],
    );
    assert.equal(preservedState.rows[0]?.draft_version, 2);
    assert.equal(preservedState.rows[0]?.reviewed_version, 1);
    assert.equal(preservedState.rows[0]?.draft_decision, "off");
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
    }
    if (documentId) {
      await client.query("DELETE FROM cms_documents WHERE id=$1", [documentId]);
    }
    if (reviewedDocumentId) {
      await client.query("DELETE FROM cms_documents WHERE id=$1", [reviewedDocumentId]);
    }
    await client.query("DELETE FROM cms_media_assets WHERE id=$1", [assetId]);
    await client.query("DELETE FROM cms_sessions WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM cms_totp_credentials WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM cms_users WHERE id=$1", [userId]);
    client.release();
    await pool.end();
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});