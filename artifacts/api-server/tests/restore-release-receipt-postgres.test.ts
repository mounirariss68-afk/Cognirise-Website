import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import test from "node:test";

test("restore-release receipt is durable, exact, actor-bound, and single-use", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
  concurrency: false,
}, async (t) => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "postgres-restore-release-test-session-secret";
  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const client = await pool.connect();
  const fixtureId = randomUUID();
  const restorerId = randomUUID();
  const otherPublisherId = randomUUID();
  const restorerToken = randomUUID();
  const otherPublisherToken = randomUUID();
  const documentId = randomUUID();
  const editionId = randomUUID();
  const sourceRevisionId = randomUUID();
  const sourceDigest = createHash("sha256").update(`${fixtureId}-source`).digest("base64url");
  const slug = `restore-release-${fixtureId.slice(0, 8)}`;
  const payload = {
    schemaVersion: 1,
    variant: "article",
    teaser: "A durable restore release fixture.",
    body: [{ type: "paragraph", text: "An approved publication restored for release." }],
    author: "CMS restore release fixture",
    publicationDate: "2026-10-03",
    readingTimeMinutes: 1,
    topics: ["governance"],
    sectors: [],
    platformIds: [],
    visibility: "public",
    order: 0,
    sources: [{
      label: "Restore release test source",
      url: "https://example.com/restore-release",
      accessedAt: "2026-10-03",
    }],
    verificationDate: "2026-10-03",
    reviewDate: "2026-10-03",
    relatedIds: [],
  };
  const revisionPayload = {
    slug,
    title: "Restore release fixture",
    summary: null,
    content: payload,
    mediaIds: [],
    markets: [] as string[],
  };
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    const schemaReady = await client.query<{ ready: boolean }>(
      `SELECT to_regclass('cms_restore_release_receipts') IS NOT NULL
              AND to_regclass('cms_revision_accuracy_confirmations') IS NOT NULL AS ready`,
    );
    if (!schemaReady.rows[0]?.ready) {
      t.skip("DATABASE_URL has not applied migration 0043");
      return;
    }
    const market = await client.query<{ code: string; default_locale: string }>(
      `SELECT code,default_locale FROM market_editions
        WHERE enabled=true ORDER BY code LIMIT 1`,
    );
    assert.equal(market.rowCount, 1);
    const marketCode = market.rows[0].code;
    const locale = market.rows[0].default_locale;
    revisionPayload.markets.push(marketCode);

    for (const [userId, email, token] of [
      [restorerId, `${slug}-restorer@example.com`, restorerToken],
      [otherPublisherId, `${slug}-other@example.com`, otherPublisherToken],
    ]) {
      await client.query(
        `INSERT INTO cms_users(id,email,display_name,role,status)
         VALUES ($1,$2,'Restore release publisher','publisher','active')`,
        [userId, email],
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
        `INSERT INTO cms_user_capability_configurations(user_id) VALUES ($1)`,
        [userId],
      );
      await client.query(
        `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
         SELECT $1,'publication',capability,'regional',$2
           FROM unnest(ARRAY['view','edit','publish']::text[]) capability`,
        [userId, marketCode],
      );
    }
    await client.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,status)
       VALUES ($1,'publication',$2,'Restore release fixture','active')`,
      [documentId, slug],
    );
    await client.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,publication_state,content_mode)
       VALUES ($1,$2,$3,$4,'archived','custom')`,
      [editionId, documentId, marketCode, locale],
    );
    await client.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,
          created_by_user_id,approved_by_user_id,approved_at,reason)
       VALUES ($1,$2,1,$3::jsonb,$4,'approved',$5,$5,now(),'Restore release source')`,
      [sourceRevisionId, editionId, JSON.stringify(revisionPayload), sourceDigest, restorerId],
    );
    await client.query(
      `UPDATE cms_market_editions
          SET published_revision_id=$2
        WHERE id=$1`,
      [editionId, sourceRevisionId],
    );

    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const headersFor = (token: string) => {
      const csrf = auth.csrfForSession(security.hashToken(token));
      return {
        "content-type": "application/json",
        origin,
        "x-csrf-token": csrf,
        cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrf}`,
      };
    };
    const post = (token: string, path: string, body: Record<string, unknown>) =>
      fetch(`${origin}${path}`, {
        method: "POST",
        headers: headersFor(token),
        body: JSON.stringify(body),
      });

    const restore = await post(restorerToken, `/api/documents/${documentId}/restore`, {
      market: marketCode,
      locale,
    });
    assert.equal(restore.status, 200);
    const restored = await restore.json() as { currentRevisionId: string };
    const receipt = await client.query<{
      document_id: string;
      edition_id: string;
      revision_id: string;
      content_digest: string;
      authorized_actor_user_id: string;
      authorized_transition: string;
      consumed_at: Date | null;
    }>(
      `SELECT document_id::text,edition_id::text,revision_id::text,content_digest,
              authorized_actor_user_id::text,authorized_transition,consumed_at
         FROM cms_restore_release_receipts
        WHERE revision_id=$1`,
      [restored.currentRevisionId],
    );
    assert.equal(receipt.rowCount, 1);
    assert.deepEqual(receipt.rows[0], {
      document_id: documentId,
      edition_id: editionId,
      revision_id: restored.currentRevisionId,
      content_digest: sourceDigest,
      authorized_actor_user_id: restorerId,
      authorized_transition: "restore-successor-release",
      consumed_at: null,
    });
    const successorDigest = sourceDigest;

    // Closing the server and constructing a fresh one is the restart boundary:
    // the next request can only succeed if authority is in PostgreSQL.
    await new Promise<void>((resolve, reject) =>
      server!.close((error) => error ? reject(error) : resolve()),
    );
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const restartedAddress = server.address();
    assert.ok(restartedAddress && typeof restartedAddress !== "string");
    const restartedOrigin = `http://127.0.0.1:${restartedAddress.port}`;
    const restartedPost = (token: string, body: Record<string, unknown>) => {
      const csrf = auth.csrfForSession(security.hashToken(token));
      return fetch(`${restartedOrigin}/api/documents/${documentId}/publish`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: restartedOrigin,
          "x-csrf-token": csrf,
          cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrf}`,
        },
        body: JSON.stringify(body),
      });
    };

    const borrowed = await restartedPost(otherPublisherToken, {
      revisionId: restored.currentRevisionId,
    });
    assert.equal(borrowed.status, 403, await borrowed.text());

    await client.query(
      `UPDATE cms_restore_release_receipts
          SET content_digest='digest-drift'
        WHERE revision_id=$1`,
      [restored.currentRevisionId],
    );
    const digestDrift = await restartedPost(restorerToken, {
      revisionId: restored.currentRevisionId,
    });
    assert.equal(digestDrift.status, 403, await digestDrift.text());
    await client.query(
      `UPDATE cms_restore_release_receipts SET content_digest=$2 WHERE revision_id=$1`,
      [restored.currentRevisionId, successorDigest],
    );

    const publish = await restartedPost(restorerToken, {
      revisionId: restored.currentRevisionId,
    });
    assert.equal(publish.status, 200, await publish.text());
    const consumed = await client.query<{ consumed_at: Date | null; consumed_by_user_id: string }>(
      `SELECT consumed_at,consumed_by_user_id::text FROM cms_restore_release_receipts
        WHERE revision_id=$1`,
      [restored.currentRevisionId],
    );
    assert.equal(consumed.rowCount, 1);
    assert.ok(consumed.rows[0].consumed_at);
    assert.equal(consumed.rows[0].consumed_by_user_id, restorerId);

    const replay = await restartedPost(restorerToken, {
      revisionId: restored.currentRevisionId,
    });
    assert.equal(replay.status, 409, await replay.text());

    const newRevisionId = randomUUID();
    const newDigest = createHash("sha256").update(`${fixtureId}-new`).digest("base64url");
    await client.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,
          created_by_user_id,reason)
       VALUES ($1,$2,3,$3::jsonb,$4,'draft',$5,'Changed after restore')`,
      [
        newRevisionId,
        editionId,
        JSON.stringify({
          ...revisionPayload,
          content: { ...payload, teaser: "Changed" },
        }),
        newDigest,
        restorerId,
      ],
    );
    const newRevision = await restartedPost(restorerToken, { revisionId: newRevisionId });
    assert.equal(newRevision.status, 409, await newRevision.text());
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
    }
    await client.query("DELETE FROM cms_documents WHERE id=$1", [documentId]);
    await client.query("DELETE FROM cms_sessions WHERE user_id=ANY($1::uuid[])", [[restorerId, otherPublisherId]]);
    await client.query("DELETE FROM cms_totp_credentials WHERE user_id=ANY($1::uuid[])", [[restorerId, otherPublisherId]]);
    await client.query("DELETE FROM cms_user_capability_grants WHERE user_id=ANY($1::uuid[])", [[restorerId, otherPublisherId]]);
    await client.query("DELETE FROM cms_user_capability_configurations WHERE user_id=ANY($1::uuid[])", [[restorerId, otherPublisherId]]);
    await client.query("DELETE FROM cms_users WHERE id=ANY($1::uuid[])", [[restorerId, otherPublisherId]]);
    client.release();
    await pool.end();
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});