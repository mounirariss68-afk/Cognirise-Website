import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("rollback and restore advance a shared source before review or customization", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
  concurrency: false,
}, async (t) => {
  const previousSessionSecret = process.env.SESSION_SECRET;
  process.env.SESSION_SECRET = "shared-source-recovery-routes-test-session-secret";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const documentId = randomUUID();
  const userId = randomUUID();
  const sourceEditionId = randomUUID();
  const approvedRevisionId = randomUUID();
  const staleSourceRevisionId = randomUUID();
  const token = randomUUID();
  const sourcePayload = {
    slug: `shared-recovery-${documentId.slice(0, 8)}`,
    title: "Shared source recovery fixture",
    summary: null,
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "A source revision used only by the recovery route fixture.",
      body: [{ type: "paragraph", text: "Complete publication copy for recovery verification." }],
      author: "Editorial practice",
      publicationDate: "2026-10-01",
      readingTimeMinutes: 1,
      topics: ["governance"],
      sectors: [],
      platformIds: [],
      visibility: "public",
      order: 0,
      sources: [{
        label: "Editorial source",
        url: "https://example.com/source",
        accessedAt: "2026-10-01",
      }],
      verificationDate: "2026-10-01",
      reviewDate: "2026-10-01",
      relatedIds: [],
    },
    mediaIds: [],
    markets: ["ksa"],
  };
  const client = await pool.connect();
  let server: ReturnType<typeof app.listen> | undefined;
  try {
    const schemaReady = await client.query<{ ready: boolean }>(
      `SELECT
         EXISTS(
           SELECT 1 FROM information_schema.columns
            WHERE table_schema=current_schema()
              AND table_name='cms_market_editions' AND column_name='editorial_market'
         )
         AND EXISTS(
           SELECT 1 FROM information_schema.columns
            WHERE table_schema=current_schema()
              AND table_name='cms_market_editions' AND column_name='content_mode'
         )
         AND EXISTS(
           SELECT 1 FROM information_schema.columns
            WHERE table_schema=current_schema()
              AND table_name='cms_document_availability_states'
                AND column_name='reviewed_source_revision_id'
         ) AS ready`,
    );
    if (!schemaReady.rows[0]?.ready) {
      t.skip("DATABASE_URL has not applied the shared-content destination migrations");
      return;
    }
    await client.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,$2,'Shared recovery administrator','administrator','active')`,
      [userId, `shared-recovery-${documentId}@example.com`],
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
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'publication',$2,$3,$4,'active')`,
      [documentId, sourcePayload.slug, sourcePayload.title, userId],
    );
    await client.query(
      `INSERT INTO cms_market_editions
        (id,document_id,market,locale,editorial_market,publication_state,content_mode)
       VALUES ($1,$2,'shared-source','und','ksa','published','shared')`,
      [sourceEditionId, documentId],
    );
    await client.query(
      `INSERT INTO cms_revisions
        (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES
        ($1,$3,1,$2,'approved-source','approved',$4,'Approved source fixture'),
        ($5,$3,2,$2,'stale-source','draft',$4,'Stale source fixture')`,
      [approvedRevisionId, sourcePayload, sourceEditionId, userId, staleSourceRevisionId],
    );
    await client.query(
      `UPDATE cms_market_editions
          SET published_revision_id=$2,published_at=now()
        WHERE id=$1`,
      [sourceEditionId, approvedRevisionId],
    );
    await client.query(
      `INSERT INTO cms_document_availability_states
        (document_id,draft_version,reviewed_version,published_version,
         shared_source_edition_id,shared_source_revision_id,published_source_revision_id,
         reviewed_source_revision_id,reviewed_selections,updated_by_user_id)
       VALUES ($1,7,7,4,$2,$3,$4,$3,'[{"marketEditionId":"fixture","locale":"en","decision":"show"}]'::jsonb,$5)`,
      [documentId, sourceEditionId, staleSourceRevisionId, approvedRevisionId, userId],
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
    const state = async () => (await pool.query<{
      draft_version: number;
      reviewed_version: number | null;
      shared_source_revision_id: string;
      published_source_revision_id: string;
      reviewed_source_revision_id: string | null;
      reviewed_selections: unknown;
    }>(
      `SELECT draft_version,reviewed_version,shared_source_revision_id,published_source_revision_id,
              reviewed_source_revision_id,reviewed_selections
         FROM cms_document_availability_states WHERE document_id=$1`,
      [documentId],
    )).rows[0];

    const rollback = await post(`/api/documents/${documentId}/rollback`, {
      revisionId: approvedRevisionId,
      note: "Create a recoverable successor from approved source history.",
    });
    assert.equal(rollback.status, 200);
    const rolledBack = await rollback.json() as { currentRevisionId: string; publishedRevisionId: string };
    assert.notEqual(rolledBack.currentRevisionId, staleSourceRevisionId);
    assert.equal(rolledBack.publishedRevisionId, approvedRevisionId);
    assert.deepEqual(await state(), {
      draft_version: 8,
      reviewed_version: null,
      shared_source_revision_id: rolledBack.currentRevisionId,
      published_source_revision_id: approvedRevisionId,
      reviewed_source_revision_id: null,
      reviewed_selections: [],
    });
    assert.equal(
      (await pool.query(
        "SELECT workflow_state FROM cms_revisions WHERE id=$1",
        [approvedRevisionId],
      )).rows[0]?.workflow_state,
      "approved",
      "recovery must not alter the previously approved source",
    );

    const submittedRollback = await post(`/api/documents/${documentId}/submit`, {
      revisionId: rolledBack.currentRevisionId,
    });
    assert.equal(submittedRollback.status, 200, await submittedRollback.text());
    const ksaCustomization = await post(`/api/documents/${documentId}/editions`, {
      market: "ksa",
      locale: "en",
    });
    assert.equal(ksaCustomization.status, 201);
    const ksaFork = await ksaCustomization.json() as { id: string };
    assert.equal(
      (await pool.query(
        "SELECT source_revision_id FROM cms_revisions WHERE id=$1",
        [ksaFork.id],
      )).rows[0]?.source_revision_id,
      rolledBack.currentRevisionId,
      "a new customization must fork the rollback successor, not the stale source",
    );

    await client.query(
      `UPDATE cms_document_availability_states
          SET reviewed_version=draft_version,reviewed_source_revision_id=shared_source_revision_id,
              reviewed_selections='[{"marketEditionId":"fixture","locale":"en","decision":"show"}]'::jsonb
        WHERE document_id=$1`,
      [documentId],
    );
    const archive = await post(`/api/documents/${documentId}/archive`, {
      market: "shared-source",
      locale: "und",
    });
    assert.equal(archive.status, 200, await archive.text());
    const restore = await post(`/api/documents/${documentId}/restore`, {
      market: "shared-source",
      locale: "und",
    });
    assert.equal(restore.status, 200);
    const restored = await restore.json() as { currentRevisionId: string; publishedRevisionId: string };
    assert.notEqual(restored.currentRevisionId, rolledBack.currentRevisionId);
    assert.equal(restored.publishedRevisionId, approvedRevisionId);
    assert.deepEqual(await state(), {
      draft_version: 9,
      reviewed_version: null,
      shared_source_revision_id: restored.currentRevisionId,
      published_source_revision_id: approvedRevisionId,
      reviewed_source_revision_id: null,
      reviewed_selections: [],
    });

    const submittedRestore = await post(`/api/documents/${documentId}/submit`, {
      revisionId: restored.currentRevisionId,
    });
    assert.equal(submittedRestore.status, 200, await submittedRestore.text());
    const uaeCustomization = await post(`/api/documents/${documentId}/editions`, {
      market: "uae",
      locale: "en",
    });
    assert.equal(uaeCustomization.status, 201);
    const uaeFork = await uaeCustomization.json() as { id: string };
    assert.equal(
      (await pool.query(
        "SELECT source_revision_id FROM cms_revisions WHERE id=$1",
        [uaeFork.id],
      )).rows[0]?.source_revision_id,
      restored.currentRevisionId,
      "a new customization must fork the restore successor, not the archived source",
    );
    assert.equal(
      (await pool.query(
        `SELECT source_revision_id FROM cms_revisions WHERE id=$1`,
        [ksaFork.id],
      )).rows[0]?.source_revision_id,
      rolledBack.currentRevisionId,
      "restore must not rewrite historical customizations",
    );
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
    }
    await client.query("DELETE FROM cms_audit_events WHERE target_type='document' AND target_id=$1", [documentId]);
    await client.query("DELETE FROM cms_documents WHERE id=$1", [documentId]);
    await client.query("DELETE FROM cms_sessions WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM cms_totp_credentials WHERE user_id=$1", [userId]);
    await client.query("DELETE FROM cms_users WHERE id=$1", [userId]);
    client.release();
    await pool.end();
    if (previousSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSessionSecret;
  }
});