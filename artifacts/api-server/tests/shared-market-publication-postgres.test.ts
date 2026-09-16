import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import http from "node:http";
import test from "node:test";

type PoolLike = {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
  options: { connectionString?: string };
};

function searchPath(databaseUrl: string, schema: string) {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-csearch_path=${schema},public`);
  return url.toString();
}

async function cloneTables(admin: PoolLike, schema: string) {
  const tables = await admin.query<{ tablename: string }>(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'",
  );
  for (const { tablename } of tables.rows) {
    const name = tablename.replace(/"/g, "\"\"");
    await admin.query(
      `CREATE TABLE "${schema}"."${name}" (LIKE public."${name}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)`,
    );
  }
}

function snapshot(slug: string, title: string, assetId: string, versionId: string) {
  return {
    slug,
    title,
    summary: null,
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "An approved managed-market publication fixture.",
      body: [{ type: "paragraph", text: "A governed public publication." }],
      author: "Editorial practice",
      publicationDate: "2026-10-01",
      readingTimeMinutes: 3,
      topics: ["governance"],
      sectors: [],
      platformIds: [],
      heroMedia: {
        mediaId: assetId,
        mediaVersionId: versionId,
        role: "hero",
        altText: "Approved managed-market image",
      },
      visibility: "public",
      order: 1,
      sources: [{
        label: "Task 321 publication fixture",
        url: "https://example.com/task-321-publication",
        accessedAt: "2026-10-01",
      }],
      verificationDate: "2026-10-01",
      reviewDate: "2027-01-01",
      relatedIds: [],
    },
    mediaIds: [assetId],
    markets: ["uae", "ksa"],
  };
}

test("Task 321 managed publication activates only after review and stays pinned", {
  concurrency: false,
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (t) => {
  const databaseUrl = process.env.DATABASE_URL;
  const previousSecret = process.env.SESSION_SECRET;
  assert.ok(databaseUrl);
  const schema = `task321_publication_${randomUUID().replaceAll("-", "").slice(0, 18)}`;
  const { pool: routePool } = await import("@workspace/db") as { pool: PoolLike };
  const PoolConstructor = routePool.constructor as unknown as new (options: { connectionString: string }) => PoolLike;
  const admin = new PoolConstructor({ connectionString: databaseUrl });
  let server: any;
  const userId = randomUUID();
  const token = randomUUID();
  const reviewerId = randomUUID();
  const reviewerToken = randomUUID();
  const documentId = randomUUID();
  const uaeMarketId = randomUUID();
  const ksaMarketId = randomUUID();
  const sourceEditionId = randomUUID();
  const sourceRevisionId = randomUUID();
  const sourceSuccessorId = randomUUID();
  const atomicSharedEditionId = randomUUID();
  const atomicSharedRevisionId = randomUUID();
  const atomicDestinationRevisionId = randomUUID();
  const commonAssetId = randomUUID();
  const commonVersionId = randomUUID();
  const saudiAssetId = randomUUID();
  const saudiVersionId = randomUUID();

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await cloneTables(admin, schema);
    await admin.query(`SET search_path TO "${schema}", public`);
    const ready = await admin.query<{ ready: boolean }>(
      `SELECT to_regclass('cms_shared_baselines') IS NOT NULL
              AND to_regclass('cms_market_edition_bindings') IS NOT NULL
              AND to_regclass('cms_resolved_market_revisions') IS NOT NULL AS ready`,
    );
    if (!ready.rows[0]?.ready) {
      t.skip("DATABASE_URL has not applied Task 321 migrations");
      return;
    }
    const security = await import("../src/lib/security.ts");
    await admin.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,'task321-publication@example.com','Task 321 publisher','administrator','active')`,
      [userId],
    );
    await admin.query(
      `INSERT INTO cms_users(id,email,display_name,role,status)
       VALUES ($1,'task321-publication-reviewer@example.com','Task 321 publication reviewer','publisher','active')`,
      [reviewerId],
    );
    await admin.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code)
       VALUES ($1,'uae'),($1,'ksa')`,
      [reviewerId],
    );
    await admin.query(
      `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
       VALUES ($1,'task321-publication',1,now()),($2,'task321-publication-reviewer',1,now())`,
      [userId, reviewerId],
    );
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [userId, security.hashToken(token)],
    );
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [reviewerId, security.hashToken(reviewerToken)],
    );
    await admin.query(
      `INSERT INTO market_editions
         (id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
       VALUES ($1,'uae','United Arab Emirates','en',NULL,NULL,true,true),
              ($2,'ksa','Saudi Arabia','en','uae','en',true,false)`,
      [uaeMarketId, ksaMarketId],
    );
    await admin.query(
      `INSERT INTO cms_legacy_administrator_market_snapshots(user_id,market_codes)
       VALUES ($1,ARRAY['uae','ksa']::text[])
       ON CONFLICT (user_id) DO UPDATE SET market_codes=EXCLUDED.market_codes`,
      [userId],
    );
    for (const [assetId, versionId, label] of [
      [commonAssetId, commonVersionId, "common"],
      [saudiAssetId, saudiVersionId, "saudi"],
    ] as const) {
      await admin.query(
        `INSERT INTO cms_media_assets
           (id,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,
            collection,status,uploaded_by_user_id)
         VALUES ($1,$2,$3,$3,'image/png',4,$4,'Approved managed-market image','website','active',$5)`,
        [assetId, `task321-publication/${assetId}`, `${label}.png`, `asset-${label}`, userId],
      );
      await admin.query(
        `INSERT INTO cms_media_versions
           (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,$2,1,$3,$4,4,1200,800,
                 '{"altText":"Approved managed-market image","rightsStatus":"approved","accessibilityStatus":"approved"}'::jsonb)`,
        [versionId, assetId, `task321-publication/${versionId}`, `version-${label}`],
      );
    }
    const shared = snapshot(`task321-publication-${documentId.slice(0, 8)}`, "Legacy UAE publication", commonAssetId, commonVersionId);
    await admin.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'publication',$2,$3,$4,'active')`,
      [documentId, shared.slug, shared.title, userId],
    );
    await admin.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,localized_slug,publication_state,content_mode)
       VALUES ($1,$2,'uae','en',$3,'published','custom')`,
      [sourceEditionId, documentId, shared.slug],
    );
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,1,$3,'task321-publication-source','approved',$4,'Task 321 source fixture')`,
      [sourceRevisionId, sourceEditionId, shared, userId],
    );
    await admin.query(
      "UPDATE cms_market_editions SET published_revision_id=$2,published_at=now() WHERE id=$1",
      [sourceEditionId, sourceRevisionId],
    );
    await admin.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)`,
      [commonAssetId, commonVersionId, documentId, `revision:${sourceRevisionId}`],
    );
    await admin.query(
      `INSERT INTO cms_navigation_published_policies(market,locale,items,pages,published_version,published_by_user_id)
       VALUES ('ksa','en',
         '[{"id":"insights","label":"Managed insight","parentId":null,"order":1,"destination":"/insights/${shared.slug}","visible":true},
          {"id":"about.contact","label":"Contact","parentId":null,"order":2,"destination":"/contact","visible":true}]'::jsonb,
        '[{"path":"/insights/${shared.slug}","enabled":true},{"path":"/contact","enabled":true}]'::jsonb,1,$1)`,
      [userId],
    );

    routePool.options.connectionString = searchPath(databaseUrl, schema);
    process.env.DATABASE_URL = routePool.options.connectionString;
    process.env.SESSION_SECRET = "task-321-managed-publication-session-secret";
    const [{ default: app }, auth] = await Promise.all([
      import("../src/app.ts"),
      import("../src/lib/auth.ts"),
    ]);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", resolve));
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
    const requestAs = (sessionToken: string, path: string, method: string, body?: unknown) => {
      const sessionCsrf = auth.csrfForSession(security.hashToken(sessionToken));
      return fetch(`${origin}${path}`, {
        method,
        headers: {
          ...headers,
          connection: "close",
          "x-csrf-token": sessionCsrf,
          cookie: `${auth.SESSION_COOKIE}=${sessionToken}; ${auth.CSRF_COOKIE}=${sessionCsrf}`,
        },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    };
    const request = (path: string, method: string, body?: unknown) =>
      requestAs(token, path, method, body);
    const reviewerRequest = (path: string, method: string, body?: unknown) =>
      requestAs(reviewerToken, path, method, body);
    const expectJson = async <T>(response: Response, status: number, label: string) => {
      const text = await response.text();
      assert.equal(response.status, status, `${label}: ${text}`);
      return JSON.parse(text) as T;
    };
    const confirmAccuracy = async (revisionId: string) => expectJson(
      await request(`/api/documents/${documentId}/revisions/${revisionId}/accuracy-confirmation`, "POST"),
      200,
      "confirm exact revision accuracy before submit",
    );
    const approveExactReview = async (revisionId: string) => {
      const review = await admin.query<{ id: string; reviewer_user_id: string; status: string }>(
        `SELECT id::text,reviewer_user_id::text,status
           FROM cms_review_requests
          WHERE revision_id=$1
          ORDER BY requested_at DESC,id DESC
          LIMIT 1`,
        [revisionId],
      );
      assert.equal(review.rows[0]?.reviewer_user_id, reviewerId);
      assert.equal(review.rows[0]?.status, "requested");
      await expectJson(
        await reviewerRequest(
          `/api/editorial-work/review-requests/${review.rows[0]!.id}/decision`,
          "POST",
          { decision: "approved" },
        ),
        200,
        "approve exact managed revision with the independent reviewer",
      );
    };
    const publicJson = (path: string) => new Promise<{ status: number; body: string }>((resolve, reject) => {
      const target = new URL(`${origin}${path}`);
      const client = http.get(target, { headers: { connection: "close" } }, (response) => {
        const chunks: Buffer[] = [];
        response.on("data", (chunk: Buffer) => chunks.push(chunk));
        response.on("end", () => resolve({
          status: response.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf8"),
        }));
        response.on("error", reject);
      });
      client.on("error", reject);
    });
    const publicItem = async () => {
      let lastError: unknown;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 100));
          const response = await publicJson("/api/public/content?market=ksa&locale=en&kind=publication");
          assert.equal(response.status, 200, `public KSA content: ${response.body}`);
          return JSON.parse(response.body) as {
            items: Array<{ title: string; revision: number; media: Array<{ id: string; versionId: string }> }>;
          };
        } catch (error) {
          lastError = error;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
      }
      throw lastError;
    };

    assert.equal((await publicItem()).items[0]?.title, "Legacy UAE publication");
    const baseline = await expectJson<{ id: string; revisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId, snapshot: shared,
      }),
      201,
      "establish managed publication baseline",
    );
    const binding = await expectJson<{ id: string; materializedRevisionId: string; version: number }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId,
        locale: "en",
        mode: "adapted",
        baselineId: baseline.id,
        baselineRevisionId: baseline.revisionId,
        expectedDestinationRevisionId: null,
        expectedActiveBaselineRevisionId: baseline.revisionId,
        version: 0,
      }),
      200,
      "create KSA binding",
    );
    assert.equal(
      (await publicItem()).items[0]?.title,
      "Legacy UAE publication",
      "a draft managed binding must preserve the legacy published result until its first reviewed publication",
    );
    await confirmAccuracy(binding.materializedRevisionId);
    await expectJson(
      await request(`/api/documents/${documentId}/submit`, "POST", { revisionId: binding.materializedRevisionId }),
      200,
      "submit initial managed materialization",
    );
    await approveExactReview(binding.materializedRevisionId);
    await expectJson(
      await request(`/api/documents/${documentId}/publish`, "POST", { revisionId: binding.materializedRevisionId }),
      200,
      "reviewed publish activates KSA managed authority",
    );
    const firstLive = await publicItem();
    assert.equal(firstLive.items[0]?.title, "Legacy UAE publication");
    assert.equal(firstLive.items[0]?.media[0]?.id, commonAssetId);
    assert.equal(firstLive.items[0]?.media[0]?.versionId, commonVersionId);
    const activation = await admin.query<{ count: string }>(
      `SELECT count(*)::text FROM cms_audit_events
        WHERE action='document.published' AND target_id=$1
          AND metadata->>'managedBindingId'=$2`,
      [documentId, binding.id],
    );
    assert.equal(activation.rows[0]?.count, "1");

    const initialSitemap = await expectJson<{ items: Array<{ url: string }> }>(
      await fetch(`${origin}/api/public/sitemap?market=ksa`), 200, "managed KSA sitemap",
    );
    assert.ok(initialSitemap.items.some((item) => item.url === `/insights/${shared.slug}?market=ksa`));
    const initialNavigation = await expectJson<{ items: Array<{ id: string }> }>(
      await fetch(`${origin}/api/public/navigation?market=ksa&locale=en`), 200, "managed KSA navigation",
    );
    assert.ok(initialNavigation.items.some((item) => item.id === "insights"));

    const saudiContent = {
      ...shared.content,
      heroMedia: {
        mediaId: saudiAssetId,
        mediaVersionId: saudiVersionId,
        role: "hero",
        altText: "Saudi approved image",
      },
    };
    const saved = await expectJson<{ currentRevisionId: string; revisionNumber: number }>(
      await request(`/api/documents/${documentId}`, "PATCH", {
        market: "ksa",
        locale: "en",
        revisionNumber: 1,
        expectedRevisionId: binding.materializedRevisionId,
        content: saudiContent,
        mediaIds: [saudiAssetId],
      }),
      200,
      "save normal Saudi image-only successor",
    );
    assert.equal(saved.revisionNumber, 2);
    const beforeSecondPublish = await publicItem();
    assert.equal(beforeSecondPublish.items[0]?.media[0]?.versionId, commonVersionId);
    assert.equal(beforeSecondPublish.items[0]?.revision, 1, "a normal draft cannot replace the approved live pin");
    await confirmAccuracy(saved.currentRevisionId);
    await expectJson(
      await request(`/api/documents/${documentId}/submit`, "POST", { revisionId: saved.currentRevisionId }),
      200,
      "submit Saudi image successor",
    );
    await approveExactReview(saved.currentRevisionId);
    await expectJson(
      await request(`/api/documents/${documentId}/publish`, "POST", { revisionId: saved.currentRevisionId }),
      200,
      "publish reviewed Saudi image successor",
    );
    const secondLive = await publicItem();
    assert.equal(secondLive.items[0]?.media[0]?.id, saudiAssetId);
    assert.equal(secondLive.items[0]?.media[0]?.versionId, saudiVersionId);

    const revisedShared = { ...shared, title: "Shared source changed after KSA activation" };
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,2,$3,'task321-source-successor','approved',$4,'Task 321 source successor')`,
      [sourceSuccessorId, sourceEditionId, revisedShared, userId],
    );
    await expectJson(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: sourceSuccessorId, snapshot: revisedShared, expectedRevisionNumber: 1,
      }),
      201,
      "create later shared baseline without cascading live KSA output",
    );
    const afterSharedUpdate = await publicItem();
    assert.equal(afterSharedUpdate.items[0]?.title, "Legacy UAE publication");
    assert.equal(afterSharedUpdate.items[0]?.media[0]?.versionId, saudiVersionId);

    await admin.query(
      `INSERT INTO cms_document_availability_states(document_id,updated_by_user_id)
       VALUES ($1,$2)`,
      [documentId, userId],
    );
    await admin.query(
      `INSERT INTO cms_document_market_availability
         (document_id,market_edition_id,locale,published_decision)
       VALUES ($1,$2,'en','off')`,
      [documentId, ksaMarketId],
    );
    assert.deepEqual((await publicItem()).items, [], "an explicit OFF remains authoritative over activated content");
    const offSitemap = await expectJson<{ items: Array<{ url: string }> }>(
      await fetch(`${origin}/api/public/sitemap?market=ksa`), 200, "OFF KSA sitemap",
    );
    assert.equal(offSitemap.items.some((item) => item.url === `/insights/${shared.slug}?market=ksa`), false);
    const offNavigation = await expectJson<{ items: Array<{ id: string }> }>(
      await fetch(`${origin}/api/public/navigation?market=ksa&locale=en`), 200, "OFF KSA navigation",
    );
    assert.ok(
      offNavigation.items.some((item) => item.id === "about.contact"),
      "a document availability decision must not expose or corrupt unrelated public navigation",
    );

    await admin.query(
      `UPDATE cms_document_market_availability SET published_decision='show'
        WHERE document_id=$1 AND market_edition_id=$2 AND locale='en'`,
      [documentId, ksaMarketId],
    );
    assert.equal((await publicItem()).items[0]?.media[0]?.versionId, saudiVersionId);
    const approvedBeforeArchive = await admin.query<{
      payload: Record<string, unknown>;
      media_version_id: string;
    }>(
      `SELECT revision.payload,reference.media_version_id::text
         FROM cms_revisions revision
         LEFT JOIN cms_media_references reference
           ON reference.document_id=$1 AND reference.field_path='revision:'||revision.id::text
        WHERE revision.id=$2
        ORDER BY reference.asset_id`,
      [documentId, saved.currentRevisionId],
    );
    const newerDraft = await expectJson<{ currentRevisionId: string; revisionNumber: number }>(
      await request(`/api/documents/${documentId}`, "PATCH", {
        market: "ksa",
        locale: "en",
        revisionNumber: saved.revisionNumber,
        expectedRevisionId: saved.currentRevisionId,
        title: "Newer draft that must not be restored",
      }),
      200,
      "create newer managed draft before archive",
    );
    await confirmAccuracy(newerDraft.currentRevisionId);
    await expectJson(
      await request(`/api/documents/${documentId}/submit`, "POST", { revisionId: newerDraft.currentRevisionId }),
      200,
      "submit newer managed draft before archive",
    );
    const newerReview = await admin.query<{ id: string; reviewer_user_id: string; status: string }>(
      `SELECT id::text,reviewer_user_id::text,status
         FROM cms_review_requests
        WHERE revision_id=$1
        ORDER BY requested_at DESC,id DESC
        LIMIT 1`,
      [newerDraft.currentRevisionId],
    );
    assert.equal(newerReview.rows[0]?.reviewer_user_id, reviewerId);
    assert.equal(newerReview.rows[0]?.status, "requested");
    await expectJson(
      await reviewerRequest(
        `/api/editorial-work/review-requests/${newerReview.rows[0]!.id}/decision`,
        "POST",
        { decision: "rejected", note: "Keep the already-approved snapshot for recovery." },
      ),
      200,
      "independent reviewer rejects newer managed draft before archive",
    );
    await expectJson(
      await request(`/api/documents/${documentId}/archive`, "POST", {
        market: "ksa", locale: "en", reason: "Task 321 managed archive",
      }),
      200,
      "archive activated managed KSA edition",
    );
    assert.deepEqual(
      (await publicItem()).items,
      [],
      "an activated managed destination must never reveal its legacy UAE fallback after archive",
    );
    const archivedNavigation = await expectJson<{ items: Array<{ id: string; visible: boolean }> }>(
      await fetch(`${origin}/api/public/navigation?market=ksa&locale=en`),
      200,
      "archived managed KSA navigation",
    );
    assert.equal(
      archivedNavigation.items.find((item) => item.id === "insights")?.visible,
      false,
      "an activated-but-archived managed route remains known and must be hidden, not treated as an unknown policy destination",
    );
    assert.ok(
      archivedNavigation.items.some((item) => item.id === "about.contact"),
      "an unavailable managed route must not remove unrelated navigation",
    );
    const { isPublishedPageAvailable } = await import("../src/lib/navigation-policy.ts");
    assert.equal(
      await isPublishedPageAvailable(`/insights/${shared.slug}`, "ksa", "en"),
      false,
      "the archived managed route must not be available through a policy fallback",
    );
    const restored = await expectJson<{ currentRevisionId: string; status: string }>(
      await request(`/api/documents/${documentId}/restore`, "POST", {
        market: "ksa", locale: "en", reason: "Task 321 managed restore",
      }),
      200,
      "restore clones the approved managed history into a draft",
    );
    assert.equal(restored.status, "draft", "restore never automatically republishes an archived edition");
    const restoredRevision = await admin.query<{
      payload: Record<string, unknown>;
      workflow_state: string;
      publication_state: string;
      published_revision_id: string | null;
      media_version_id: string;
    }>(
      `SELECT revision.payload,revision.workflow_state,edition.publication_state,
              edition.published_revision_id::text,reference.media_version_id::text
         FROM cms_revisions revision
         JOIN cms_market_editions edition ON edition.id=revision.edition_id
         LEFT JOIN cms_media_references reference
           ON reference.document_id=$1 AND reference.field_path='revision:'||revision.id::text
        WHERE revision.id=$2
        ORDER BY reference.asset_id`,
      [documentId, restored.currentRevisionId],
    );
    assert.equal(restoredRevision.rows[0]?.workflow_state, "draft");
    assert.equal(restoredRevision.rows[0]?.publication_state, "draft");
    assert.equal(restoredRevision.rows[0]?.published_revision_id, saved.currentRevisionId);
    assert.deepEqual(
      restoredRevision.rows.map((row) => row.payload)[0],
      approvedBeforeArchive.rows.map((row) => row.payload)[0],
      "restore must reproduce the approved snapshot, not the newer rejected draft",
    );
    assert.deepEqual(
      restoredRevision.rows.map((row) => row.media_version_id),
      approvedBeforeArchive.rows.map((row) => row.media_version_id),
      "restore must copy the exact approved immutable media pins",
    );
    assert.deepEqual(
      (await publicItem()).items,
      [],
      "a restored draft remains unavailable until it is explicitly reviewed and published again",
    );

    // Task 345: the atomic shared-source release uses the same immutable
    // destination receipt as availability/publish.  Exercise every pin
    // component against the real PostgreSQL fixture before the final release.
    await admin.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,localized_slug,publication_state,content_mode)
       VALUES ($1,$2,'shared-source','und',$3,'draft','shared')`,
      [atomicSharedEditionId, documentId, shared.slug],
    );
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,1,$3,'task345-atomic-source','draft',$4,'Task 345 atomic shared source')`,
      [atomicSharedRevisionId, atomicSharedEditionId, shared, userId],
    );
    await admin.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)`,
      [commonAssetId, commonVersionId, documentId, `revision:${atomicSharedRevisionId}`],
    );
    await admin.query(
      `UPDATE cms_document_availability_states
          SET draft_version=0,reviewed_version=NULL,published_version=0,
              reviewed_selections='[]'::jsonb,reviewed_destination_pins='[]'::jsonb,
              shared_source_edition_id=$2,shared_source_revision_id=$3,
              reviewed_source_revision_id=NULL,published_source_revision_id=NULL,
              updated_by_user_id=$4,updated_at=now()
        WHERE document_id=$1`,
      [documentId, atomicSharedEditionId, atomicSharedRevisionId, userId],
    );
    await admin.query(
      `INSERT INTO cms_user_capability_configurations(user_id)
       VALUES ($1) ON CONFLICT (user_id) DO NOTHING`,
      [reviewerId],
    );
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       SELECT $1,'publication',capability,scope,market_code
         FROM unnest(ARRAY['view','review','publish']::text[]) capability
         CROSS JOIN unnest(ARRAY['regional','shared']::text[]) scope
         CROSS JOIN unnest(ARRAY['uae','ksa']::text[]) market_code
       ON CONFLICT DO NOTHING`,
      [reviewerId],
    );
    const atomicAvailability = await expectJson<{ draftVersion: number; items: Array<{
      marketEditionId: string;
      market: string;
      locale: string;
    }> }>(
      await request(`/api/documents/${documentId}/availability`, "GET"),
      200,
      "read atomic shared-source availability",
    );
    await expectJson(
      await request(`/api/documents/${documentId}/availability`, "PUT", {
        version: atomicAvailability.draftVersion,
        destinations: atomicAvailability.items.map((item) => ({
          marketEditionId: item.marketEditionId,
          locale: item.locale,
          decision: "show",
        })),
      }),
      200,
      "stage atomic shared-source availability",
    );
    const stagedAtomicAvailability = await expectJson<{ draftVersion: number }>(
      await request(`/api/documents/${documentId}/availability`, "GET"),
      200,
      "read staged atomic shared-source availability",
    );
    await expectJson(
      await reviewerRequest(`/api/documents/${documentId}/availability/review`, "POST", {
        version: stagedAtomicAvailability.draftVersion,
      }),
      200,
      "review atomic shared-source availability",
    );
    await confirmAccuracy(atomicSharedRevisionId);
    await expectJson(
      await request(`/api/documents/${documentId}/submit`, "POST", {
        revisionId: atomicSharedRevisionId,
      }),
      200,
      "submit atomic shared-source revision",
    );
    await approveExactReview(atomicSharedRevisionId);

    const atomicPublicState = async () => (await admin.query(
      `SELECT 'edition' kind,e.id::text id,e.market,e.locale,
              e.publication_state,e.published_revision_id::text pointer,
              NULL::text decision,NULL::text binding_id
         FROM cms_market_editions e WHERE e.document_id=$1
       UNION ALL
       SELECT 'availability',a.market_edition_id::text,a.market_edition_id::text,a.locale,
              NULL,a.published_decision,a.published_decision,NULL
         FROM cms_document_market_availability a WHERE a.document_id=$1
       UNION ALL
       SELECT 'state',s.document_id::text,s.draft_version::text,
              COALESCE(s.reviewed_version,-1)::text,s.published_version::text,
              s.shared_source_revision_id::text,s.published_source_revision_id::text,
              NULL
         FROM cms_document_availability_states s WHERE s.document_id=$1
       ORDER BY kind,id,market,locale`,
      [documentId],
    )).rows;
    const expectAtomicConflictPreservesPublicState = async (
      label: string,
      mutate: () => Promise<void>,
      restore: () => Promise<void>,
    ) => {
      await mutate();
      const before = await atomicPublicState();
      await expectJson(
        await request(`/api/documents/${documentId}/publish`, "POST", {
          revisionId: atomicSharedRevisionId,
          availabilityVersion: stagedAtomicAvailability.draftVersion,
        }),
        409,
        label,
      );
      assert.deepEqual(await atomicPublicState(), before, `${label} leaves public pointers unchanged`);
      await restore();
    };

    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,99,$3,'task345-destination-revision-drift','approved',$4,'Task 345 destination pin drift')`,
      [atomicDestinationRevisionId, sourceEditionId, shared, userId],
    );
    await expectAtomicConflictPreservesPublicState(
      "destination revision drift blocks atomic shared publish",
      async () => {
        await admin.query(
          "UPDATE cms_market_editions SET published_revision_id=$2 WHERE id=$1",
          [sourceEditionId, atomicDestinationRevisionId],
        );
      },
      async () => {
        await admin.query(
          "UPDATE cms_market_editions SET published_revision_id=$2 WHERE id=$1",
          [sourceEditionId, sourceRevisionId],
        );
      },
    );

    const atomicBinding = await admin.query<{
      id: string;
      binding_materialized_revision_id: string;
    }>(
      `SELECT binding.id::text,
              binding.materialized_revision_id::text binding_materialized_revision_id
         FROM cms_market_edition_bindings binding
         JOIN cms_market_editions exact
           ON exact.document_id=binding.document_id
          AND exact.market='ksa' AND exact.locale='en'
         JOIN cms_resolved_market_revisions resolved
           ON resolved.binding_id=binding.id
          AND resolved.cms_revision_id=exact.published_revision_id
        WHERE binding.document_id=$1 AND binding.market_edition_id=$2 AND binding.locale='en'`,
      [documentId, ksaMarketId],
    );
    assert.equal(atomicBinding.rowCount, 1);
    const originalBindingId = atomicBinding.rows[0]!.id;
    const originalBindingMaterializedRevisionId = atomicBinding.rows[0]!.binding_materialized_revision_id;
    assert.ok(originalBindingMaterializedRevisionId);
    await expectAtomicConflictPreservesPublicState(
      "destination materialization drift blocks atomic shared publish",
      async () => {
        await admin.query(
          `UPDATE cms_market_edition_bindings
              SET materialized_revision_id=$2
            WHERE id=$1`,
          [originalBindingId, saved.currentRevisionId],
        );
      },
      async () => {
        await admin.query(
          `UPDATE cms_market_edition_bindings
              SET materialized_revision_id=$2
            WHERE id=$1`,
          [originalBindingId, originalBindingMaterializedRevisionId],
        );
      },
    );
    await expectAtomicConflictPreservesPublicState(
      "destination binding drift blocks atomic shared publish",
      async () => {
        await admin.query(
          "UPDATE cms_market_edition_bindings SET market_edition_id=$2 WHERE id=$1",
          [originalBindingId, uaeMarketId],
        );
      },
      async () => {
        await admin.query(
          "UPDATE cms_market_edition_bindings SET market_edition_id=$2 WHERE id=$1",
          [originalBindingId, ksaMarketId],
        );
      },
    );
    await expectAtomicConflictPreservesPublicState(
      "destination content digest drift blocks atomic shared publish",
      async () => {
        await admin.query(
          "UPDATE cms_revisions SET content_digest='task345-content-digest-drift' WHERE id=$1",
          [sourceRevisionId],
        );
      },
      async () => {
        await admin.query(
          "UPDATE cms_revisions SET content_digest='task321-publication-source' WHERE id=$1",
          [sourceRevisionId],
        );
      },
    );

    const beforeMissingSharedGrant = await atomicPublicState();
    await admin.query(
      `DELETE FROM cms_user_capability_grants
        WHERE user_id=$1 AND topic='publication' AND capability='publish'
          AND scope='shared' AND market_code='ksa'`,
      [reviewerId],
    );
    await expectJson(
      await reviewerRequest(`/api/documents/${documentId}/publish`, "POST", {
        revisionId: atomicSharedRevisionId,
        availabilityVersion: stagedAtomicAvailability.draftVersion,
      }),
      403,
      "missing one Shared destination grant blocks atomic shared publish",
    );
    assert.deepEqual(await atomicPublicState(), beforeMissingSharedGrant);
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'publication','publish','shared','ksa')
       ON CONFLICT DO NOTHING`,
      [reviewerId],
    );
    await expectJson(
      await reviewerRequest(`/api/documents/${documentId}/publish`, "POST", {
        revisionId: atomicSharedRevisionId,
        availabilityVersion: stagedAtomicAvailability.draftVersion,
      }),
      200,
      "full Shared and Regional authority publishes atomic shared source",
    );
    const atomicPublished = await admin.query<{
      published_source_revision_id: string;
      published_decision: string;
    }>(
      `SELECT state.published_source_revision_id::text,
              availability.published_decision
         FROM cms_document_availability_states state
         JOIN cms_document_market_availability availability
           ON availability.document_id=state.document_id
        WHERE state.document_id=$1
        ORDER BY availability.market_edition_id
        LIMIT 1`,
      [documentId],
    );
    assert.equal(atomicPublished.rows[0]?.published_source_revision_id, atomicSharedRevisionId);
    assert.equal(atomicPublished.rows[0]?.published_decision, "show");
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server.close((error: Error) => error ? reject(error) : resolve()));
    await routePool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
    if (databaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = databaseUrl;
    if (previousSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = previousSecret;
  }
});