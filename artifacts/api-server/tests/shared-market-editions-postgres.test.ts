import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

type PoolLike = {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
  connect(): Promise<{
    query<T = Record<string, unknown>>(
      sql: string,
      values?: unknown[],
    ): Promise<{ rows: T[]; rowCount: number | null }>;
    release(): void;
  }>;
  options: { connectionString?: string };
};

function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-csearch_path=${schema},public`);
  return url.toString();
}

async function clonePublicTables(admin: PoolLike, schema: string) {
  const tables = await admin.query<{ tablename: string }>(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'",
  );
  for (const table of tables.rows) {
    const name = table.tablename.replace(/"/g, "\"\"");
    await admin.query(
      `CREATE TABLE "${schema}"."${name}" (LIKE public."${name}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)`,
    );
  }
}

const source = {
  label: "Task 321 PostgreSQL source",
  url: "https://example.com/task-321",
  accessedAt: "2026-10-01",
};

function publicationSnapshot(
  slug: string,
  title: string,
  heroMediaId: string,
  heroMediaVersionId: string,
) {
  return {
    slug,
    title,
    summary: null,
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "A complete shared-edition integration fixture.",
      body: [{ type: "paragraph", text: "This body deliberately has no stable item IDs." }],
      author: "Editorial practice",
      publicationDate: "2026-10-01",
      readingTimeMinutes: 3,
      topics: ["governance"],
      sectors: [],
      platformIds: [],
      heroMedia: {
        mediaId: heroMediaId,
        mediaVersionId: heroMediaVersionId,
        role: "hero",
        altText: "Shared edition fixture image",
      },
      visibility: "public",
      order: 1,
      sources: [source],
      verificationDate: "2026-10-01",
      reviewDate: "2027-01-01",
      relatedIds: [],
    },
    mediaIds: [heroMediaId],
    markets: ["uae", "ksa"],
  };
}

test("Task 321 shared-market routes isolate baselines, pins, conflicts, and delivery", {
  concurrency: false,
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (t) => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSessionSecret = process.env.SESSION_SECRET;
  assert.ok(originalDatabaseUrl);

  const schema = `task321_shared_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { pool: routePool } = await import("@workspace/db") as { pool: PoolLike };
  const PoolConstructor = routePool.constructor as unknown as new (options: {
    connectionString: string;
  }) => PoolLike;
  const admin = new PoolConstructor({ connectionString: originalDatabaseUrl });
  let server: { close(callback: (error?: Error) => void): void } | undefined;

  const administratorId = randomUUID();
  const editorId = randomUUID();
  const viewerId = randomUUID();
  const administratorToken = randomUUID();
  const editorToken = randomUUID();
  const viewerToken = randomUUID();
  const documentId = randomUUID();
  const independentDocumentId = randomUUID();
  const foreignDocumentId = randomUUID();
  const task337DocumentId = randomUUID();

  const personDocumentId = randomUUID();
  const uaeMarketId = randomUUID();
  const ksaMarketId = randomUUID();
  const qatarMarketId = randomUUID();
  const omanMarketId = randomUUID();
  const bahrainMarketId = randomUUID();
  const europeMarketId = randomUUID();

  const guardMarketId = randomUUID();
  const disabledMarketId = randomUUID();
  const sourceEditionId = randomUUID();
  const arabicSourceEditionId = randomUUID();
  const sharedSourceEditionId = randomUUID();
  const independentEditionId = randomUUID();
  const foreignEditionId = randomUUID();

  const personSourceEditionId = randomUUID();
  const personLiveEditionId = randomUUID();
  const guardEditionId = randomUUID();
  const sourceRevisionId = randomUUID();
  const arabicSourceRevisionId = randomUUID();
  const sharedSourceRevisionId = randomUUID();
  const task337UaePublishedRevisionId = randomUUID();
  const task337UaeSavedRevisionId = randomUUID();
  const task337UaeEditionId = randomUUID();
  const independentRevisionId = randomUUID();
  const foreignRevisionId = randomUUID();

  const personSourceRevisionId = randomUUID();
  const personLiveRevisionId = randomUUID();
  const guardRevisionId = randomUUID();
  const commonImageId = randomUUID();
  const commonImageVersionId = randomUUID();
  const conflictingCommonImageVersionId = randomUUID();
  const saudiImageId = randomUUID();
  const saudiImageVersionId = randomUUID();

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await clonePublicTables(admin, schema);
    await admin.query(`SET search_path TO "${schema}", public`);
    const ready = await admin.query<{ ready: boolean }>(
      `SELECT to_regclass('cms_documents') IS NOT NULL
              AND to_regclass('cms_shared_baselines') IS NOT NULL
              AND to_regclass('cms_market_edition_bindings') IS NOT NULL
              AND to_regclass('cms_resolved_market_revisions') IS NOT NULL AS ready`,
    );
    if (!ready.rows[0]?.ready) {
      t.skip("DATABASE_URL has not applied the shared-market edition migration");
      return;
    }

    const security = await import("../src/lib/security.ts");
    for (const [id, role, token, name] of [
      [administratorId, "administrator", administratorToken, "Task 321 administrator"],
      [editorId, "editor", editorToken, "Task 321 UAE editor"],
      [viewerId, "viewer", viewerToken, "Task 321 viewer"],
    ] as const) {
      await admin.query(
        `INSERT INTO cms_users(id,email,display_name,role,status)
         VALUES ($1,$2,$3,$4,'active')`,
        [id, `${id}@example.com`, name, role],
      );
      await admin.query(
        `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
         VALUES ($1,'task321-fixture',1,now())`,
        [id],
      );
      await admin.query(
        `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
         VALUES ($1,$2,now(),now()+interval '1 hour')`,
        [id, security.hashToken(token)],
      );
    }
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'uae')",
      [editorId],
    );

    for (const [id, code, enabled, canonical, fallback] of [
      [uaeMarketId, "uae", true, true, null],
      [ksaMarketId, "ksa", true, false, "uae"],
      [qatarMarketId, "qatar", true, false, "uae"],
      [omanMarketId, "oman", true, false, "uae"],
      [bahrainMarketId, "bahrain", true, false, "uae"],
      [europeMarketId, "europe", true, false, "uae"],
       [guardMarketId, "guard", true, false, "uae"],
      [disabledMarketId, "disabled", false, false, "uae"],
    ] as const) {
      await admin.query(
        `INSERT INTO market_editions
           (id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
         VALUES ($1,$2,$2,'en',$5,'en',$3,$4)`,
        [id, code, enabled, canonical, fallback],
      );
    }

    for (const [assetId, versionId, label] of [
      [commonImageId, commonImageVersionId, "shared"],
      [saudiImageId, saudiImageVersionId, "saudi"],
    ] as const) {
      await admin.query(
        `INSERT INTO cms_media_assets
           (id,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,
            collection,status,uploaded_by_user_id)
         VALUES ($1,$2,$3,$3,'image/png',4,$4,'Task 321 governed image','website','active',$5)`,
        [assetId, `task321/${assetId}`, `${label}.png`, `task321-${label}-asset`, administratorId],
      );
      await admin.query(
        `INSERT INTO cms_media_versions
           (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,$2,1,$3,$4,4,1200,800,
                 '{"altText":"Task 321 governed image","rightsStatus":"approved","accessibilityStatus":"approved"}'::jsonb)`,
        [versionId, assetId, `task321/${versionId}`, `task321-${label}-version`],
      );
    }
    await admin.query(
      `INSERT INTO cms_media_versions
         (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,2,$3,$4,4,1200,800,
               '{"altText":"Task 321 governed image","rightsStatus":"approved","accessibilityStatus":"approved"}'::jsonb)`,
      [conflictingCommonImageVersionId, commonImageId,
        `task321/${conflictingCommonImageVersionId}`, "task321-shared-conflicting-version"],
    );

    const commonSnapshot = publicationSnapshot(
      `task-321-${documentId.slice(0, 8)}`,
      "Common published output",
      commonImageId,
      commonImageVersionId,
    );
    const arabicSnapshot = {
      ...commonSnapshot,
      slug: `task-321-ar-${documentId.slice(0, 8)}`,
      title: "النشرة المشتركة",
    };
    const task337PublishedSnapshot = {
      ...commonSnapshot,
      slug: `task-337-${task337DocumentId.slice(0, 8)}`,
      title: "UAE published source",
    };
    const task337SavedSnapshot = {
      ...task337PublishedSnapshot,
      title: "UAE saved successor",
    };

    const personSnapshot = {
      slug: `person-${personDocumentId.slice(0, 8)}`,
      title: "Shared person fixture",
      summary: null,
      mediaIds: [],
      markets: ["uae", "ksa"],
      content: {
        schemaVersion: 1,
        role: "employee",
        title: "Shared person fixture",
        biography: "A governed person profile copied only as a draft.",
        focusAreas: [],
        profileLinks: [],
        approvedFallback: "initials",
        visibility: "public",
        order: 0,
        sources: [],
        relatedIds: [],
      },
    };
    await admin.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'publication',$2,$3,$4,'active'),
              ($5,'publication',$6,'Independent publication',$4,'active'),
              ($7,'publication',$8,'Foreign source',$4,'active'),
              ($9,'person',$10,$11,$4,'active')`,
      [
        documentId, commonSnapshot.slug, commonSnapshot.title, administratorId,
        independentDocumentId, `independent-${independentDocumentId.slice(0, 8)}`,
        foreignDocumentId, `foreign-${foreignDocumentId.slice(0, 8)}`,
        personDocumentId, personSnapshot.slug, personSnapshot.title,
      ],
    );
    await admin.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,localized_slug,publication_state,content_mode)
       VALUES
         ($1,$2,'uae','en',$3,'published','custom'),
         ($4,$2,'ksa','ar',$5,'published','custom'),
         ($6,$2,'shared-source','en',$3,'published','shared'),
         ($7,$8,'qatar','en',$9,'draft','custom'),
         ($10,$11,'uae','en',$12,'published','custom'),
         ($13,$2,'guard','en',$14,'draft','custom'),
         ($15,$16,'uae','en',$17,'draft','custom'),
         ($18,$16,'ksa','en',$19,'published','custom')`,
      [
        sourceEditionId, documentId, commonSnapshot.slug,
        arabicSourceEditionId, arabicSnapshot.slug,
        sharedSourceEditionId,
        independentEditionId, independentDocumentId, `independent-${independentDocumentId.slice(0, 8)}`,
        foreignEditionId, foreignDocumentId, `foreign-${foreignDocumentId.slice(0, 8)}`,
        guardEditionId, `guard-${documentId.slice(0, 8)}`,
        personSourceEditionId, personDocumentId, personSnapshot.slug,
        personLiveEditionId, `person-ksa-${personDocumentId.slice(0, 8)}`,
      ],
    );
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES
         ($1,$2,1,$3,'task321-common','approved',$4,'Task 321 source fixture'),
         ($5,$6,1,$7,'task321-arabic','approved',$4,'Task 321 Arabic source fixture'),
         ($8,$9,1,$3,'task321-shared-source','approved',$4,'Must never become a baseline'),
         ($10,$11,1,$3,'task321-independent','draft',$4,'Independent destination fixture'),
         ($12,$13,1,$3,'task321-foreign','approved',$4,'Different document source fixture'),
         ($14,$15,1,$3,'task321-guard','draft',$4,'Guided reuse target fixture'),
         ($16,$17,1,$18,'task321-person-source','draft',$4,'Person shared source fixture'),
         ($19,$20,1,$18,'task321-person-live','approved',$4,'Person live destination fixture')`,
      [
        sourceRevisionId, sourceEditionId, commonSnapshot, administratorId,
        arabicSourceRevisionId, arabicSourceEditionId, arabicSnapshot,
        sharedSourceRevisionId, sharedSourceEditionId,
        independentRevisionId, independentEditionId,
        foreignRevisionId, foreignEditionId,
        guardRevisionId, guardEditionId,
        personSourceRevisionId, personSourceEditionId, personSnapshot,
        personLiveRevisionId, personLiveEditionId,
      ],
    );
    await admin.query(
      `UPDATE cms_market_editions
          SET published_revision_id=CASE id
            WHEN $1 THEN $2::uuid WHEN $3 THEN $4::uuid
            WHEN $5 THEN $6::uuid WHEN $7 THEN $8::uuid
            WHEN $9 THEN $10::uuid END,
              published_at=now()
        WHERE id IN ($1,$3,$5,$7,$9)`,
      [
        sourceEditionId, sourceRevisionId,
        arabicSourceEditionId, arabicSourceRevisionId,
        sharedSourceEditionId, sharedSourceRevisionId,
        foreignEditionId, foreignRevisionId,
        personLiveEditionId, personLiveRevisionId,
      ],
    );
    await admin.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)`,
      [commonImageId, commonImageVersionId, documentId, `revision:${sourceRevisionId}`],
    );
    await admin.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'publication',$2,$3,$4,'active')`,
      [task337DocumentId, task337PublishedSnapshot.slug, task337PublishedSnapshot.title, administratorId],
    );
    await admin.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,localized_slug,publication_state,content_mode)
       VALUES ($1,$2,'uae','en',$3,'published','custom')`,
      [task337UaeEditionId, task337DocumentId, task337PublishedSnapshot.slug],
    );
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES
         ($1,$3,1,$4,'task337-uae-published','approved',$5,'Task 337 published UAE source'),
         ($2,$3,2,$6,'task337-uae-saved','draft',$5,'Task 337 saved UAE successor')`,
      [
        task337UaePublishedRevisionId,
        task337UaeSavedRevisionId,
        task337UaeEditionId,
        task337PublishedSnapshot,
        administratorId,
        task337SavedSnapshot,
      ],
    );
    await admin.query(
      `UPDATE cms_market_editions
          SET published_revision_id=$1,published_at=now()
        WHERE id=$2`,
      [task337UaePublishedRevisionId, task337UaeEditionId],
    );
    await admin.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4),($1,$2,$3,$5)`,
      [
        commonImageId,
        commonImageVersionId,
        task337DocumentId,
        `revision:${task337UaePublishedRevisionId}`,
        `revision:${task337UaeSavedRevisionId}`,
      ],
    );
    await admin.query(
      `INSERT INTO cms_document_market_availability
         (document_id,market_edition_id,locale,published_decision,draft_decision,
          updated_by_user_id,published_by_user_id,published_at)
       VALUES ($1,$2,'en','show',NULL,$3,$3,'2026-10-01T00:00:00.000Z')`,
      [personDocumentId, ksaMarketId, administratorId],
    );

    routePool.options.connectionString = withSearchPath(originalDatabaseUrl, schema);
    process.env.DATABASE_URL = routePool.options.connectionString;
    process.env.SESSION_SECRET = "task-321-shared-market-postgres-session-secret";
    const [{ default: app }, auth] = await Promise.all([
      import("../src/app.ts"),
      import("../src/lib/auth.ts"),
    ]);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => (server as any).once("listening", resolve));
    const address = (server as any).address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const headersFor = (token: string, csrf = true) => {
      const tokenHash = security.hashToken(token);
      const csrfToken = auth.csrfForSession(tokenHash);
      return {
        "content-type": "application/json",
        origin,
        cookie: csrf
          ? `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrfToken}`
          : `${auth.SESSION_COOKIE}=${token}`,
        ...(csrf ? { "x-csrf-token": csrfToken } : {}),
      };
    };
    const request = (path: string, method: string, body: unknown, headers = headersFor(administratorToken)) =>
      fetch(`${origin}${path}`, { method, headers, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    const json = async <T>(response: Response, status: number, label: string) => {
      const text = await response.text();
      assert.equal(response.status, status, `${label}: ${text}`);
      return JSON.parse(text) as T;
    };

    const publicBeforeBinding = await fetch(
      `${origin}/api/public/content?market=ksa&locale=en&kind=publication`,
    );
    const beforeItems = await json<{ items: Array<{ title: string }> }>(
      publicBeforeBinding, 200, "legacy UAE fallback before a managed KSA binding",
    );
    assert.equal(beforeItems.items[0]?.title, "Common published output");

    const unauthenticated = await request(
      `/api/documents/${documentId}/shared-market`, "GET", undefined, { "content-type": "application/json" },
    );
    assert.equal(unauthenticated.status, 401);
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId, snapshot: commonSnapshot,
      }, headersFor(editorToken))).status,
      403,
      "only administrators establish neutral baselines",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId, snapshot: commonSnapshot,
      }, headersFor(administratorToken, false))).status,
      403,
      "state-changing shared-market routes require CSRF",
    );
    await json(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: foreignRevisionId, snapshot: commonSnapshot,
      }),
      404,
      "a baseline source revision must belong to this exact document",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: sharedSourceRevisionId, snapshot: commonSnapshot,
      })).status,
      404,
      "legacy shared-source rows cannot be inferred as neutral baseline input",
    );

    const englishBaseline = await json<{
      id: string; revisionId: string; revisionNumber: number; sourceRevisionId: string;
    }>(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId, snapshot: commonSnapshot,
      }),
      201,
      "establish English baseline",
    );
    const arabicBaseline = await json<{ id: string; sourceRevisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "ar", sourceRevisionId: arabicSourceRevisionId, snapshot: arabicSnapshot,
      }),
      201,
      "establish Arabic baseline",
    );

    assert.notEqual(englishBaseline.id, arabicBaseline.id);
    assert.equal(arabicBaseline.sourceRevisionId, arabicSourceRevisionId);

    assert.equal(
      (await request(`/api/documents/${independentDocumentId}/shared-market/bindings`, "PUT", {
        marketEditionId: disabledMarketId, locale: "en", mode: "independent",
        independentRevisionId, version: 0,
      })).status,
      404,
      "disabled market editions cannot be bound",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId, locale: "en", mode: "shared", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, version: 0,
      }, headersFor(editorToken))).status,
      403,
      "a market editor cannot bind a destination outside their assignment",
    );
    assert.equal(
      (await request(`/api/documents/${independentDocumentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId, locale: "en", mode: "independent",
        independentRevisionId, version: 0,
      }, headersFor(viewerToken))).status,
      403,
      "viewers cannot create independent bindings",
    );

    const personBaseline = await json<{ id: string; revisionId: string }>(
      await request(`/api/documents/${personDocumentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: personSourceRevisionId, snapshot: personSnapshot,
      }),
      201,
      "establish a person baseline without publishing",
    );
    const personBaselineSuccessor = await json<{ id: string; revisionId: string }>(
      await request(`/api/documents/${personDocumentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: personSourceRevisionId, snapshot: personSnapshot,
        expectedRevisionNumber: 1,
      }),
      201,
      "save a successor that retains the same person source revision",
    );
    const personLiveReceipt = async () => admin.query<{
      published_revision_id: string; publication_state: string; payload: string; availability_receipt: string;
    }>(
      `SELECT edition.published_revision_id::text,edition.publication_state,
              revision.payload::text,
              (SELECT to_jsonb(availability)::text
                 FROM cms_document_market_availability availability
                WHERE availability.document_id=$1 AND availability.market_edition_id=$2 AND availability.locale='en')
                availability_receipt
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.id=edition.published_revision_id
        WHERE edition.id=$3`,
      [personDocumentId, ksaMarketId, personLiveEditionId],
    );
    const personLiveBeforeReuse = await personLiveReceipt();
    assert.equal(
      (await request(`/api/documents/${personDocumentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId, locale: "en", mode: "shared",
        baselineId: personBaseline.id, baselineRevisionId: personBaseline.revisionId,
        expectedDestinationRevisionId: personLiveRevisionId,
        expectedActiveBaselineRevisionId: personBaseline.revisionId,
        version: 0,
      })).status,
      409,
      "a baseline successor invalidates a previously inspected person reuse confirmation",
    );
    assert.deepEqual((await personLiveReceipt()).rows[0], personLiveBeforeReuse.rows[0],
      "a stale person reuse request preserves the live revision and availability receipt");
    const personBinding = await json<{ materializedRevisionId: string | null }>(
      await request(`/api/documents/${personDocumentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId, locale: "en", mode: "shared",
        baselineId: personBaselineSuccessor.id, baselineRevisionId: personBaselineSuccessor.revisionId,
        expectedDestinationRevisionId: personLiveRevisionId,
        expectedActiveBaselineRevisionId: personBaselineSuccessor.revisionId,
        version: 0,
      }),
      200,
      "materialize a person shared draft in a governed destination",
    );
    assert.ok(personBinding.materializedRevisionId);
    const personDestination = await admin.query<{
      publication_state: string; published_revision_id: string | null; workflow_state: string;
    }>(
      `SELECT edition.publication_state,edition.published_revision_id::text,revision.workflow_state
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.id=$2 AND revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market='ksa' AND edition.locale='en'`,
      [personDocumentId, personBinding.materializedRevisionId],
    );
    assert.deepEqual(personDestination.rows[0], {
      publication_state: "published",
      published_revision_id: personLiveRevisionId,
      workflow_state: "draft",
    }, "person reuse appends only a draft and preserves its existing live pointer");
    assert.deepEqual((await personLiveReceipt()).rows[0], personLiveBeforeReuse.rows[0],
      "person reuse leaves the live person revision and published availability receipt byte-for-byte unchanged");

    const guardedReuse = {
      marketEditionId: guardMarketId,
      locale: "en",
      mode: "shared",
      baselineId: englishBaseline.id,
      baselineRevisionId: englishBaseline.revisionId,
      expectedActiveBaselineRevisionId: englishBaseline.revisionId,
    };
    const guardState = async () => admin.query<{
      revision_count: string; binding_count: string; latest_revision_id: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM cms_revisions WHERE edition_id=$1) revision_count,
         (SELECT count(*)::text FROM cms_market_edition_bindings
           WHERE document_id=$2 AND market_edition_id=$3 AND locale='en') binding_count,
         (SELECT id::text FROM cms_revisions WHERE edition_id=$1
           ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1) latest_revision_id`,
      [guardEditionId, documentId, guardMarketId],
    );
    const beforeGuardRejections = await guardState();
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...guardedReuse, version: 0,
      })).status,
      422,
      "new shared materialization cannot omit an inspected destination token",
    );
    const { expectedActiveBaselineRevisionId: _omittedActiveBaselineToken, ...reuseWithoutActiveBaselineToken } = guardedReuse;
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...reuseWithoutActiveBaselineToken, version: 0, expectedDestinationRevisionId: guardRevisionId,
      })).status,
      422,
      "new shared materialization cannot omit an inspected active baseline token",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...guardedReuse, version: 0, expectedDestinationRevisionId: null,
      })).status,
      409,
      "a null inspected token cannot overwrite a destination saved after an empty comparison",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...guardedReuse, version: 0, expectedDestinationRevisionId: randomUUID(),
      })).status,
      409,
      "a missing inspected destination revision cannot materialize over current content",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...guardedReuse, version: 1, expectedDestinationRevisionId: guardRevisionId,
      })).status,
      409,
      "an absent binding cannot be created with an existing-binding version token",
    );
    assert.deepEqual((await guardState()).rows[0], beforeGuardRejections.rows[0],
      "all rejected guided-reuse guards preserve the destination revision and binding state");
    const guardedBinding = await json<{ version: number; materializedRevisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...guardedReuse, version: 0, expectedDestinationRevisionId: guardRevisionId,
      }),
      200,
      "an inspected current destination may be safely reused",
    );
    const beforeStaleBindingVersion = await guardState();
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        ...guardedReuse, version: 0, expectedDestinationRevisionId: guardedBinding.materializedRevisionId,
      })).status,
      409,
      "a stale create version cannot overwrite the newly bound destination",
    );
    assert.deepEqual((await guardState()).rows[0], beforeStaleBindingVersion.rows[0],
      "a stale binding version leaves the materialized draft and binding untouched");
    const independent = await json<{ mode: string; baselineId: string | null; materializedRevisionId: string | null }>(
      await request(`/api/documents/${independentDocumentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId, locale: "en", mode: "independent",
        independentRevisionId, version: 0,
      }),
      200,
      "independent publication binding",
    );
    assert.equal(independent.mode, "independent");
    assert.equal(independent.baselineId, null);
    assert.equal(independent.materializedRevisionId, independentRevisionId);

    const ksa = await json<{
      id: string; version: number; materializedRevisionId: string | null;
    }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId, locale: "en", mode: "adapted", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, expectedDestinationRevisionId: null,
        expectedActiveBaselineRevisionId: englishBaseline.revisionId, version: 0,
      }),
      200,
      "create Saudi adapted binding",
    );
    assert.ok(ksa.materializedRevisionId);
    await admin.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1", [editorId]);
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'ksa')",
      [editorId],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId,
        locale: "en",
        mode: "independent",
        independentRevisionId: ksa.materializedRevisionId,
        version: ksa.version,
      }, headersFor(editorToken))).status,
      403,
      "a destination-only editor cannot convert a shared binding without access to its current source",
    );
    const beforeGenericRebind = await admin.query<{
      version: number; materialized_revision_id: string; revision_count: string; pin_count: string;
    }>(
      `SELECT binding.version,binding.materialized_revision_id::text,
              (SELECT count(*)::text FROM cms_revisions revision
                JOIN cms_market_editions edition ON edition.id=revision.edition_id
               WHERE edition.document_id=$1 AND edition.market='ksa' AND edition.locale='en') revision_count,
              (SELECT count(*)::text FROM cms_media_references reference WHERE reference.document_id=$1) pin_count
         FROM cms_market_edition_bindings binding WHERE binding.id=$2`,
      [documentId, ksa.id],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: ksaMarketId, locale: "en", mode: "independent",
        independentRevisionId: ksa.materializedRevisionId, version: ksa.version,
      })).status,
      409,
      "generic binding PUT cannot detach a Shared/Adapted binding outside Compare and Resolve",
    );
    const afterGenericRebind = await admin.query(
      `SELECT binding.version,binding.materialized_revision_id::text,
              (SELECT count(*)::text FROM cms_revisions revision
                JOIN cms_market_editions edition ON edition.id=revision.edition_id
               WHERE edition.document_id=$1 AND edition.market='ksa' AND edition.locale='en') revision_count,
              (SELECT count(*)::text FROM cms_media_references reference WHERE reference.document_id=$1) pin_count
         FROM cms_market_edition_bindings binding WHERE binding.id=$2`,
      [documentId, ksa.id],
    );
    assert.deepEqual(
      afterGenericRebind.rows[0],
      beforeGenericRebind.rows[0],
      "rejected generic rebind leaves the binding, resolved snapshot revision, and pins unchanged",
    );
    const legacySource = await admin.query<{ published_revision_id: string }>(
      "SELECT published_revision_id::text FROM cms_market_editions WHERE id=$1",
      [sourceEditionId],
    );
    assert.equal(
      legacySource.rows[0]?.published_revision_id,
      sourceRevisionId,
      "creating a binding cannot repoint an existing legacy publication",
    );
    const publicAfterBinding = await fetch(
      `${origin}/api/public/content?market=ksa&locale=en&kind=publication`,
    );
    assert.deepEqual(
      (await json<{ items: Array<{ title: string }> }>(publicAfterBinding, 200, "managed KSA public response")).items.map((item) => item.title),
      beforeItems.items.map((item) => item.title),
      "a draft binding must preserve existing live output until an explicit reviewed publication",
    );

    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId, locale: "en", mode: "shared", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, version: 1,
      })).status,
      409,
      "an absent binding cannot be created with an existing-binding version token",
    );
    const qatar = await json<{ id: string; version: number }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId, locale: "en", mode: "shared", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, expectedDestinationRevisionId: null,
        expectedActiveBaselineRevisionId: englishBaseline.revisionId, version: 0,
      }),
      200,
      "create shared binding to adopt",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId, locale: "en", mode: "shared", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, version: 0,
      })).status,
      409,
      "a create token cannot overwrite an already-bound market edition",
    );
    const oman = await json<{ id: string; version: number }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: omanMarketId, locale: "en", mode: "adapted", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, expectedDestinationRevisionId: null,
        expectedActiveBaselineRevisionId: englishBaseline.revisionId, version: 0,
      }),
      200,
      "create adapted binding to reset",
    );
    const bahrain = await json<{ id: string; version: number }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: bahrainMarketId, locale: "en", mode: "adapted", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, expectedDestinationRevisionId: null,
        expectedActiveBaselineRevisionId: englishBaseline.revisionId, version: 0,
      }),
      200,
      "create adapted binding to detach",
    );

    const saudiOverride = await json<{ version: number; materializedRevisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/overrides`, "PUT", {
        version: ksa.version,
        baselineRevisionId: englishBaseline.revisionId,
        operations: [
          { op: "set", path: "title", value: "Saudi-only headline" },
          { op: "set", path: "summary", value: "Saudi-only summary" },
          {
            op: "set",
            path: "content.heroMedia",
            value: {
              mediaId: saudiImageId,
              mediaVersionId: saudiImageVersionId,
              role: "hero",
              altText: "Saudi-only image",
            },
          },
        ],
      }),
      200,
      "save sparse Saudi text and image override",
    );
    const resolvedSaudi = await admin.query<{
      snapshot: Record<string, unknown> & { title: string; content: { heroMedia: { mediaId: string; mediaVersionId: string } } };
      media_references: Array<{ assetId: string; mediaVersionId: string }>;
    }>(
      "SELECT snapshot,media_references FROM cms_resolved_market_revisions WHERE cms_revision_id=$1",
      [saudiOverride.materializedRevisionId],
    );
    assert.equal(resolvedSaudi.rows[0]?.snapshot.title, "Saudi-only headline");
    assert.deepEqual(resolvedSaudi.rows[0]?.snapshot.content.heroMedia, {
      mediaId: saudiImageId,
      mediaVersionId: saudiImageVersionId,
      role: "hero",
      altText: "Saudi-only image",
    });
    const saudiPins = await admin.query<{ asset_id: string; media_version_id: string }>(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id`,
      [documentId, `revision:${saudiOverride.materializedRevisionId}`],
    );
    assert.ok(
      saudiPins.rows.some((pin) => pin.asset_id === saudiImageId && pin.media_version_id === saudiImageVersionId),
      "the Saudi image-only override must pin its exact selected media version",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/overrides`, "PUT", {
        version: saudiOverride.version,
        baselineRevisionId: englishBaseline.revisionId,
        operations: [{ op: "array-reorder", path: "content.body", ids: ["not-a-stable-id"] }],
      })).status,
      409,
      "positional/non-stable arrays are rejected instead of being ambiguously replayed",
    );
    const omanOverride = await json<{ version: number }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${oman.id}/overrides`, "PUT", {
        version: oman.version,
        baselineRevisionId: englishBaseline.revisionId,
        operations: [{ op: "set", path: "title", value: "Oman local title" }],
      }),
      200,
      "save Oman override before reset",
    );
    const bahrainOverride = await json<{ version: number; materializedRevisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${bahrain.id}/overrides`, "PUT", {
        version: bahrain.version,
        baselineRevisionId: englishBaseline.revisionId,
        operations: [
          { op: "set", path: "title", value: "Bahrain local title" },
          {
            op: "set",
            path: "content.heroMedia",
            value: {
              mediaId: saudiImageId,
              mediaVersionId: saudiImageVersionId,
              role: "hero",
              altText: "Bahrain retained local image",
            },
          },
        ],
      }),
      200,
      "save Bahrain text and image overrides before detach",
    );
    const bahrainLocalBeforeDetach = await admin.query<{
      snapshot: Record<string, unknown>;
      media_references: Array<{ assetId: string; mediaVersionId: string }>;
    }>(
      "SELECT snapshot,media_references FROM cms_resolved_market_revisions WHERE cms_revision_id=$1",
      [bahrainOverride.materializedRevisionId],
    );
    const bahrainPinsBeforeDetach = await admin.query<{ asset_id: string; media_version_id: string }>(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id,media_version_id`,
      [documentId, `revision:${bahrainOverride.materializedRevisionId}`],
    );

    const successorRevisionId = randomUUID();
    const conflictingPinsSnapshot = {
      ...commonSnapshot,
      content: {
        ...commonSnapshot.content,
        social: {
          imageMedia: {
            mediaId: commonImageId,
            mediaVersionId: conflictingCommonImageVersionId,
            role: "og-image",
            altText: "Conflicting governed image",
          },
        },
      },
    };
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId, snapshot: conflictingPinsSnapshot,
        expectedRevisionNumber: englishBaseline.revisionNumber,
      })).status,
      422,
      "a snapshot cannot collapse conflicting immutable versions for one media asset",
    );
    const changedCommonSnapshot = {
      ...commonSnapshot,
      title: "Common published output revised",
      summary: "Common shared summary revised",
    };
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,2,$3,'task321-common-revised','approved',$4,'Task 321 baseline successor')`,
      [successorRevisionId, sourceEditionId, changedCommonSnapshot, administratorId],
    );
    const updatedBaseline = await json<{ revisionId: string; revisionNumber: number }>(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: successorRevisionId, snapshot: changedCommonSnapshot,
        expectedRevisionNumber: englishBaseline.revisionNumber,
      }),
      201,
      "create baseline successor",
    );
    assert.equal(updatedBaseline.revisionNumber, 2);
    const held = await admin.query<{ count: string }>(
      `SELECT count(*)::text FROM cms_market_edition_bindings
        WHERE document_id=$1 AND held_baseline_revision_id=$2`,
      [documentId, updatedBaseline.revisionId],
    );
    assert.equal(held.rows[0]?.count, "0", "a baseline successor never silently accepts or holds a destination");
    const compare = await json<{
      canAutoAdopt: boolean;
      localSnapshot: Record<string, unknown>;
      conflicts: Array<{ conflictId: string; path: string; kind: string }>;
    }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/compare`, "GET", undefined),
      200,
      "compare Saudi conflict",
    );
    assert.equal(compare.canAutoAdopt, false);
    assert.deepEqual(compare.conflicts.map(({ path, kind }) => ({ path, kind })), [
      { path: "title", kind: "concurrent-value-change" },
      { path: "summary", kind: "concurrent-value-change" },
    ]);
    assert.ok(
      compare.conflicts.every((conflict) => typeof conflict.conflictId === "string" && conflict.conflictId.length > 0),
      "comparison exposes a stable operation conflict identity independent of display path",
    );
    assert.deepEqual(
      compare.localSnapshot,
      resolvedSaudi.rows[0]?.snapshot,
      "compare exposes the exact current Saudi materialization, not its adopted baseline",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/overrides`, "PUT", {
        version: saudiOverride.version,
        baselineRevisionId: updatedBaseline.revisionId,
        operations: [],
      })).status,
      409,
      "an override save cannot silently adopt a newer historical baseline",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/resolve`, "POST", {
        version: saudiOverride.version, baselineRevisionId: updatedBaseline.revisionId, action: "adopt",
      })).status,
      409,
      "an Adopt action with conflicts requires an explicit path decision",
    );

    const kept = await json<{ version: number; materializedRevisionId: string; heldBaselineRevisionId: string | null }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/resolve`, "POST", {
        version: saudiOverride.version, baselineRevisionId: updatedBaseline.revisionId, action: "keep",
      }),
      200,
      "hold conflicting Saudi adaptation",
    );
    assert.equal(kept.heldBaselineRevisionId, updatedBaseline.revisionId);
    const keptSaudi = await admin.query<{
      snapshot: Record<string, unknown>;
      media_references: Array<{ assetId: string; mediaVersionId: string }>;
    }>(
      "SELECT snapshot,media_references FROM cms_resolved_market_revisions WHERE cms_revision_id=$1",
      [kept.materializedRevisionId],
    );
    const keptSaudiPins = await admin.query<{ asset_id: string; media_version_id: string }>(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id,media_version_id`,
      [documentId, `revision:${kept.materializedRevisionId}`],
    );
    assert.deepEqual(keptSaudi.rows[0]?.snapshot, resolvedSaudi.rows[0]?.snapshot);
    assert.deepEqual(keptSaudi.rows[0]?.media_references, resolvedSaudi.rows[0]?.media_references);
    assert.deepEqual(keptSaudiPins.rows, saudiPins.rows);
    const compareAfterKeep = await json<{ localSnapshot: Record<string, unknown> }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/compare`, "GET", undefined),
      200,
      "compare Saudi retained materialization after Keep",
    );
    assert.deepEqual(compareAfterKeep.localSnapshot, resolvedSaudi.rows[0]?.snapshot);
    const marketDecision = await json<{
      version: number; materializedRevisionId: string; operations: Array<{ path: string }>; heldBaselineRevisionId: string | null;
    }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${ksa.id}/resolve`, "POST", {
        version: kept.version,
        baselineRevisionId: updatedBaseline.revisionId,
        action: "adopt",
        conflictDecisions: [
          { conflictId: compare.conflicts.find((conflict) => conflict.path === "title")?.conflictId, choice: "market" },
          { conflictId: compare.conflicts.find((conflict) => conflict.path === "summary")?.conflictId, choice: "shared" },
        ],
      }),
      200,
      "adopt baseline with an explicit market conflict decision",
    );
    assert.equal(marketDecision.heldBaselineRevisionId, null);
    assert.ok(
      marketDecision.operations.some((operation) => operation.path === "title"),
      "a market conflict decision preserves the local operation",
    );
    assert.ok(
      !marketDecision.operations.some((operation) => operation.path === "summary"),
      "a shared conflict decision removes only that local operation",
    );
    const adopted = await json<{ version: number; baselineRevisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${qatar.id}/resolve`, "POST", {
        version: qatar.version, baselineRevisionId: updatedBaseline.revisionId, action: "adopt",
      }),
      200,
      "adopt non-conflicting baseline",
    );
    assert.equal(adopted.baselineRevisionId, updatedBaseline.revisionId);
    const reset = await json<{
      version: number; operations: unknown[]; mode: string; baselineRevisionId: string; materializedRevisionId: string;
    }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${oman.id}/resolve`, "POST", {
        version: omanOverride.version, baselineRevisionId: updatedBaseline.revisionId, action: "reset",
      }),
      200,
      "reset local overrides",
    );
    assert.deepEqual(reset.operations, []);
    assert.equal(reset.mode, "shared");
    assert.equal(reset.baselineRevisionId, updatedBaseline.revisionId);
    const resetSnapshot = await admin.query<{ snapshot: Record<string, unknown> }>(
      "SELECT snapshot FROM cms_resolved_market_revisions WHERE cms_revision_id=$1",
      [reset.materializedRevisionId],
    );
    const matrixAfterReset = await json<{
      baselines: Array<{ revisionId: string; snapshot: Record<string, unknown> }>;
      bindings: Array<{ id: string; mode: string; baselineRevisionId: string | null; materializedRevisionId: string | null }>;
    }>(
      await request(`/api/documents/${documentId}/shared-market`, "GET", undefined),
      200,
      "shared-market matrix after last-field reset",
    );
    const matrixBaseline = matrixAfterReset.baselines.find((baseline) => baseline.revisionId === updatedBaseline.revisionId);
    const matrixOman = matrixAfterReset.bindings.find((binding) => binding.id === oman.id);
    assert.deepEqual(resetSnapshot.rows[0]?.snapshot, matrixBaseline?.snapshot);
    assert.equal(matrixOman?.mode, "shared");
    assert.equal(matrixOman?.baselineRevisionId, updatedBaseline.revisionId);
    assert.equal(matrixOman?.materializedRevisionId, reset.materializedRevisionId);
    const detached = await json<{
      mode: string; baselineId: string | null; translationState: string; operations: unknown[]; materializedRevisionId: string;
    }>(
      await request(`/api/documents/${documentId}/shared-market/bindings/${bahrain.id}/resolve`, "POST", {
        version: bahrainOverride.version, baselineRevisionId: updatedBaseline.revisionId, action: "detach",
      }),
      200,
      "detach local market",
    );
    assert.equal(detached.mode, "independent");
    assert.equal(detached.baselineId, null);
    assert.equal(detached.translationState, "not-applicable");
    assert.deepEqual(detached.operations, []);
    const bahrainDetached = await admin.query<{
      snapshot: Record<string, unknown>;
      media_references: Array<{ assetId: string; mediaVersionId: string }>;
    }>(
      "SELECT snapshot,media_references FROM cms_resolved_market_revisions WHERE cms_revision_id=$1",
      [detached.materializedRevisionId],
    );
    const bahrainPinsAfterDetach = await admin.query<{ asset_id: string; media_version_id: string }>(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id,media_version_id`,
      [documentId, `revision:${detached.materializedRevisionId}`],
    );
    assert.deepEqual(bahrainDetached.rows[0]?.snapshot, bahrainLocalBeforeDetach.rows[0]?.snapshot);
    assert.deepEqual(bahrainDetached.rows[0]?.media_references, bahrainLocalBeforeDetach.rows[0]?.media_references);
    assert.deepEqual(bahrainPinsAfterDetach.rows, bahrainPinsBeforeDetach.rows);
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings/${qatar.id}/resolve`, "POST", {
        version: qatar.version, baselineRevisionId: updatedBaseline.revisionId, action: "adopt",
      })).status,
      409,
      "stale resolution tokens fail rather than overwriting an earlier decision",
    );
    assert.equal(kept.version, saudiOverride.version + 1);

    const normalSave = await json<{ currentRevisionId: string }>(
      await request(`/api/documents/${documentId}`, "PATCH", {
        market: "ksa",
        locale: "en",
        revisionNumber: 4,
        expectedRevisionId: marketDecision.materializedRevisionId,
        title: "Saudi normal editor save",
      }),
      200,
      "normal document save after materialization",
    );
    const tracked = await admin.query<{ materialized_revision_id: string }>(
      "SELECT materialized_revision_id::text FROM cms_market_edition_bindings WHERE id=$1",
      [ksa.id],
    );
    assert.equal(
      tracked.rows[0]?.materialized_revision_id,
      normalSave.currentRevisionId,
      "a normal exact-edition save must advance the binding's materialized revision pointer",
    );
    const beforeOverlap = await admin.query<{
      revision_number: number;
      version: number;
      based_on_baseline_revision_id: string;
    }>(
      `SELECT revision.revision_number,binding.version,binding.based_on_baseline_revision_id::text
         FROM cms_revisions revision
         JOIN cms_market_edition_bindings binding ON binding.id=$2
        WHERE revision.id=$1`,
      [normalSave.currentRevisionId, ksa.id],
    );
    assert.ok(beforeOverlap.rows[0]);
    const overlapPool = new PoolConstructor({
      connectionString: withSearchPath(originalDatabaseUrl, schema),
    });
    const overlapLock = await overlapPool.connect();
    try {
      // Hold the common document mutex until both real HTTP clients have
      // submitted their stale tokens. Once released, exactly one mutation can
      // win; the other must observe fresh state and return a recoverable 409.
      await overlapLock.query("BEGIN");
      await overlapLock.query("SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      const ordinarySave = request(`/api/documents/${documentId}`, "PATCH", {
        market: "ksa",
        locale: "en",
        revisionNumber: Number(beforeOverlap.rows[0].revision_number),
        expectedRevisionId: normalSave.currentRevisionId,
        title: "Concurrent ordinary save winner candidate",
      });
      const sharedOverride = request(
        `/api/documents/${documentId}/shared-market/bindings/${ksa.id}/overrides`,
        "PUT",
        {
          version: Number(beforeOverlap.rows[0].version),
          baselineRevisionId: String(beforeOverlap.rows[0].based_on_baseline_revision_id),
          operations: [{ op: "set", path: "title", value: "Concurrent shared override winner candidate" }],
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
      await overlapLock.query("COMMIT");
      const overlapResponses = await Promise.all([ordinarySave, sharedOverride]);
      assert.deepEqual(
        overlapResponses.map((response) => response.status).sort(),
        [200, 409],
        "controlled ordinary-save/shared-override overlap must elect one winner without deadlock or a 500",
      );
    } finally {
      await overlapLock.query("ROLLBACK").catch(() => undefined);
      overlapLock.release();
      await overlapPool.end();
    }
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'qatar')",
      [editorId],
    );
    const permissionRaceBefore = await admin.query<{
      version: number;
      materialized_revision_id: string | null;
      revision_count: string;
      pin_count: string;
      success_audit_count: string;
    }>(
      `SELECT binding.version,binding.materialized_revision_id::text,
              (SELECT count(*)::text FROM cms_revisions revision
                 JOIN cms_market_editions edition ON edition.id=revision.edition_id
                WHERE edition.document_id=$1) revision_count,
              (SELECT count(*)::text FROM cms_media_references reference
                WHERE reference.document_id=$1) pin_count,
              (SELECT count(*)::text FROM cms_audit_events event
                WHERE event.target_id=$1::text AND event.action='shared-market-bound') success_audit_count
         FROM cms_market_edition_bindings binding
        WHERE binding.id=$2`,
      [independentDocumentId, independent.id],
    );
    const permissionRacePool = new PoolConstructor({
      connectionString: withSearchPath(originalDatabaseUrl, schema),
    });
    const permissionRaceLock = await permissionRacePool.connect();
    try {
      await permissionRaceLock.query("BEGIN");
      await permissionRaceLock.query(
        "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE",
        [independentDocumentId],
      );
      const deniedRebind = request(
        `/api/documents/${independentDocumentId}/shared-market/bindings`,
        "PUT",
        {
          marketEditionId: qatarMarketId,
          locale: "en",
          mode: "independent",
          independentRevisionId,
          version: independent.version,
        },
        headersFor(editorToken),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
      // Match the production administrator write order: take the user row
      // first, then replace assignments. The blocked mutation must neither
      // deadlock with this order nor retain its pre-wait editor identity.
      const identityUpdate = await admin.connect();
      try {
        await identityUpdate.query("BEGIN");
        await identityUpdate.query("UPDATE cms_users SET role='viewer' WHERE id=$1", [editorId]);
        await identityUpdate.query(
          "DELETE FROM cms_user_market_assignments WHERE user_id=$1 AND market_code='qatar'",
          [editorId],
        );
        await identityUpdate.query("COMMIT");
      } finally {
        await identityUpdate.query("ROLLBACK").catch(() => undefined);
        identityUpdate.release();
      }
      await permissionRaceLock.query("COMMIT");
      assert.equal(
        (await deniedRebind).status,
        403,
        "a request authorized before waiting must re-check its role and destination assignment after the document lock",
      );
    } finally {
      await permissionRaceLock.query("ROLLBACK").catch(() => undefined);
      permissionRaceLock.release();
      await permissionRacePool.end();
    }
    const permissionRaceAfter = await admin.query(
      `SELECT binding.version,binding.materialized_revision_id::text,
              (SELECT count(*)::text FROM cms_revisions revision
                 JOIN cms_market_editions edition ON edition.id=revision.edition_id
                WHERE edition.document_id=$1) revision_count,
              (SELECT count(*)::text FROM cms_media_references reference
                WHERE reference.document_id=$1) pin_count,
              (SELECT count(*)::text FROM cms_audit_events event
                WHERE event.target_id=$1::text AND event.action='shared-market-bound') success_audit_count
         FROM cms_market_edition_bindings binding
        WHERE binding.id=$2`,
      [independentDocumentId, independent.id],
    );
    assert.deepEqual(
      permissionRaceAfter.rows[0],
      permissionRaceBefore.rows[0],
      "a denied permission race leaves revisions, pins, and the binding pointer unchanged",
    );
    const neverPublishedBeforeRestore = await admin.query<{
      revision_count: string;
      latest_revision_id: string;
      workflow_state: string;
    }>(
      `SELECT count(revision.*)::text revision_count,
              (array_agg(revision.id::text ORDER BY revision.revision_number DESC,
                 revision.created_at DESC,revision.id DESC))[1] latest_revision_id,
              (array_agg(revision.workflow_state ORDER BY revision.revision_number DESC,
                 revision.created_at DESC,revision.id DESC))[1] workflow_state
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market='qatar' AND edition.locale='en'`,
      [independentDocumentId],
    );
    assert.equal(neverPublishedBeforeRestore.rows[0]?.workflow_state, "draft");
    await json(
      await request(`/api/documents/${independentDocumentId}/archive`, "POST", {
        market: "qatar", locale: "en", reason: "Archive never-published recovery fixture",
      }),
      200,
      "archive a never-published independent edition",
    );
    const neverPublishedRestored = await json<{ currentRevisionId: string; status: string }>(
      await request(`/api/documents/${independentDocumentId}/restore`, "POST", {
        market: "qatar", locale: "en", reason: "Restore never-published recovery fixture",
      }),
      200,
      "restore retains never-published draft work",
    );
    const neverPublishedAfterRestore = await admin.query<{
      revision_count: string;
      latest_revision_id: string;
      workflow_state: string;
      publication_state: string;
      published_revision_id: string | null;
    }>(
      `SELECT count(revision.*)::text revision_count,
              (array_agg(revision.id::text ORDER BY revision.revision_number DESC,
                 revision.created_at DESC,revision.id DESC))[1] latest_revision_id,
              (array_agg(revision.workflow_state ORDER BY revision.revision_number DESC,
                 revision.created_at DESC,revision.id DESC))[1] workflow_state,
              (array_agg(edition.publication_state))[1] publication_state,
              (array_agg(edition.published_revision_id::text))[1] published_revision_id
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market='qatar' AND edition.locale='en'`,
      [independentDocumentId],
    );
    assert.equal(neverPublishedRestored.status, "draft");
    assert.equal(neverPublishedAfterRestore.rows[0]?.workflow_state, "draft");
    assert.equal(neverPublishedAfterRestore.rows[0]?.publication_state, "draft");
    assert.equal(neverPublishedAfterRestore.rows[0]?.published_revision_id, null);
    assert.deepEqual(
      neverPublishedAfterRestore.rows[0]?.revision_count,
      neverPublishedBeforeRestore.rows[0]?.revision_count,
      "never-published recovery keeps its explicit draft/rejected history instead of synthesizing a publication clone",
    );
    assert.equal(
      neverPublishedRestored.currentRevisionId,
      neverPublishedBeforeRestore.rows[0]?.latest_revision_id,
    );
    const qatarBeforeAcknowledgement = await admin.query<{
      version: number;
      translation_state: string;
      translation_source_revision_id: string | null;
    }>(
      `SELECT version,translation_state,translation_source_revision_id::text
         FROM cms_market_edition_bindings
        WHERE id=$1`,
      [qatar.id],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId,
        locale: "en",
        mode: "shared",
        baselineId: englishBaseline.id,
        baselineRevisionId: updatedBaseline.revisionId,
        translationSourceRevisionId: englishBaseline.revisionId,
        version: qatarBeforeAcknowledgement.rows[0]?.version,
      })).status,
      409,
      "an acknowledgement of an obsolete baseline source must not falsely clear translation staleness",
    );
    const qatarAfterObsoleteAcknowledgement = await admin.query<{
      version: number;
      translation_state: string;
      translation_source_revision_id: string | null;
    }>(
      `SELECT version,translation_state,translation_source_revision_id::text
         FROM cms_market_edition_bindings
        WHERE id=$1`,
      [qatar.id],
    );
    assert.deepEqual(
      qatarAfterObsoleteAcknowledgement.rows[0],
      qatarBeforeAcknowledgement.rows[0],
      "a rejected obsolete acknowledgement cannot mutate translation state or binding version",
    );
    const qatarCurrentAcknowledgement = await json<{ version: number; translationState: string }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId,
        locale: "en",
        mode: "shared",
        baselineId: englishBaseline.id,
        baselineRevisionId: updatedBaseline.revisionId,
        translationSourceRevisionId: updatedBaseline.revisionId,
        version: qatarBeforeAcknowledgement.rows[0]?.version,
      }),
      200,
      "only the active authorized source baseline can acknowledge a translation",
    );
    assert.equal(qatarCurrentAcknowledgement.translationState, "current");
    const qatarAfterCurrentAcknowledgement = await admin.query<{
      translation_state: string;
      translation_source_revision_id: string | null;
    }>(
      `SELECT translation_state,translation_source_revision_id::text
         FROM cms_market_edition_bindings
        WHERE id=$1`,
      [qatar.id],
    );
    assert.equal(qatarAfterCurrentAcknowledgement.rows[0]?.translation_state, "current");
    assert.equal(
      qatarAfterCurrentAcknowledgement.rows[0]?.translation_source_revision_id,
      updatedBaseline.revisionId,
      "the database records the exact active source that was explicitly acknowledged",
    );
    const translationSuccessorId = randomUUID();
    const translationSuccessorSnapshot = {
      ...changedCommonSnapshot,
      title: "Common published output revised after translation acknowledgement",
    };
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,3,$3,'task321-translation-successor','approved',$4,'Task 321 translation successor')`,
      [translationSuccessorId, sourceEditionId, translationSuccessorSnapshot, administratorId],
    );
    const acknowledgedSuccessor = await json<{ revisionId: string }>(
      await request(`/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en",
        sourceRevisionId: translationSuccessorId,
        snapshot: translationSuccessorSnapshot,
        expectedRevisionNumber: updatedBaseline.revisionNumber,
      }),
      201,
      "a later active baseline successor marks a previously acknowledged translation stale",
    );
    const qatarAfterSuccessor = await admin.query<{
      translation_state: string;
      translation_source_revision_id: string | null;
    }>(
      `SELECT translation_state,translation_source_revision_id::text
         FROM cms_market_edition_bindings
        WHERE id=$1`,
      [qatar.id],
    );
    assert.equal(qatarAfterSuccessor.rows[0]?.translation_state, "stale");
    assert.equal(
      qatarAfterSuccessor.rows[0]?.translation_source_revision_id,
      updatedBaseline.revisionId,
      "the stale marker retains the last explicitly acknowledged source rather than silently advancing it",
    );
    assert.notEqual(acknowledgedSuccessor.revisionId, updatedBaseline.revisionId);
    const qatarBeforeCrossLocaleAcknowledgement = await admin.query<{ version: number }>(
      "SELECT version FROM cms_market_edition_bindings WHERE id=$1",
      [qatar.id],
    );
    const crossLocaleAcknowledgement = await json<{
      translationState: string;
      translationSourceRevisionId: string | null;
    }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: qatarMarketId,
        locale: "en",
        mode: "shared",
        baselineId: englishBaseline.id,
        baselineRevisionId: updatedBaseline.revisionId,
        translationSourceRevisionId: arabicBaseline.revisionId,
        version: qatarBeforeCrossLocaleAcknowledgement.rows[0]?.version,
      }),
      200,
      "an active Arabic source can acknowledge an English destination's frozen baseline",
    );
    assert.equal(crossLocaleAcknowledgement.translationState, "current");
    assert.equal(crossLocaleAcknowledgement.translationSourceRevisionId, arabicBaseline.revisionId);
    const qatarCrossLocaleState = await admin.query<{
      translation_state: string;
      translation_source_revision_id: string | null;
    }>(
      `SELECT translation_state,translation_source_revision_id::text
         FROM cms_market_edition_bindings WHERE id=$1`,
      [qatar.id],
    );
    assert.deepEqual(qatarCrossLocaleState.rows[0], {
      translation_state: "current",
      translation_source_revision_id: arabicBaseline.revisionId,
    });
    await admin.query("UPDATE cms_users SET role='editor' WHERE id=$1", [editorId]);
    await admin.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code)
       VALUES ($1,'ksa'),($1,'qatar'),($1,'oman'),($1,'bahrain')
       ON CONFLICT DO NOTHING`,
      [editorId],
    );
    const availabilityRacePool = new PoolConstructor({
      connectionString: withSearchPath(originalDatabaseUrl, schema),
    });
    const availabilityRaceLock = await availabilityRacePool.connect();
    try {
      await availabilityRaceLock.query("BEGIN");
      await availabilityRaceLock.query("SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      const revokedAvailabilityStage = request(
        `/api/documents/${documentId}/availability`,
        "PUT",
        {
          version: 0,
          destinations: [
            { marketEditionId: uaeMarketId, locale: "en", decision: "show" },
            { marketEditionId: ksaMarketId, locale: "en", decision: "show" },
            { marketEditionId: qatarMarketId, locale: "en", decision: "show" },
            { marketEditionId: omanMarketId, locale: "en", decision: "show" },
            { marketEditionId: bahrainMarketId, locale: "en", decision: "show" },
          ],
        },
        headersFor(editorToken),
      );
      await new Promise((resolve) => setTimeout(resolve, 25));
      const availabilityIdentityUpdate = await admin.connect();
      try {
        await availabilityIdentityUpdate.query("BEGIN");
        await availabilityIdentityUpdate.query("UPDATE cms_users SET role='viewer' WHERE id=$1", [editorId]);
        await availabilityIdentityUpdate.query(
          "DELETE FROM cms_user_market_assignments WHERE user_id=$1 AND market_code='oman'",
          [editorId],
        );
        await availabilityIdentityUpdate.query("COMMIT");
      } finally {
        await availabilityIdentityUpdate.query("ROLLBACK").catch(() => undefined);
        availabilityIdentityUpdate.release();
      }
      await availabilityRaceLock.query("COMMIT");
      assert.equal(
        (await revokedAvailabilityStage).status,
        403,
        "availability staging rechecks a role/assignment revoked while it waits for the document mutex",
      );
    } finally {
      await availabilityRaceLock.query("ROLLBACK").catch(() => undefined);
      availabilityRaceLock.release();
      await availabilityRacePool.end();
    }
    const availabilityRaceState = await admin.query<{
      state_count: string;
      decision_count: string;
      success_audit_count: string;
    }>(
      `SELECT
         (SELECT count(*)::text FROM cms_document_availability_states WHERE document_id=$1) state_count,
         (SELECT count(*)::text FROM cms_document_market_availability WHERE document_id=$1) decision_count,
         (SELECT count(*)::text FROM cms_audit_events
           WHERE target_id=$1::text AND action='document.availability.staged') success_audit_count`,
      [documentId],
    );
    assert.deepEqual(availabilityRaceState.rows[0], {
      state_count: "0",
      decision_count: "0",
      success_audit_count: "0",
    });
    const crossSourceFixture = await admin.query<{
      materialized_revision_id: string;
      revision_count: string;
    }>(
      `SELECT binding.materialized_revision_id::text,
              (SELECT count(*)::text FROM cms_revisions revision
                 JOIN cms_market_editions edition ON edition.id=revision.edition_id
                WHERE edition.document_id=$1 AND edition.market='qatar' AND edition.locale='en') revision_count
         FROM cms_market_edition_bindings binding WHERE binding.id=$2`,
      [documentId, qatar.id],
    );
    await admin.query("UPDATE cms_users SET role='publisher' WHERE id=$1", [editorId]);
    await admin.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1", [editorId]);
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'qatar'),($1,'uae')",
      [editorId],
    );
    // The current source is UAE and the adopted source is KSA. This models a
    // binding whose historical local materialization has a different source
    // boundary than its latest comparison target.
    await admin.query(
      `UPDATE cms_market_edition_bindings
          SET based_on_baseline_revision_id=$2
        WHERE id=$1`,
      [qatar.id, arabicBaseline.revisionId],
    );
    assert.equal(
      (await request(
        `/api/documents/${documentId}/shared-market/bindings/${qatar.id}/compare`,
        "GET",
        undefined,
        headersFor(editorToken),
      )).status,
      403,
      "compare requires permission for the adopted historical source as well as the current source",
    );
    await admin.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1", [editorId]);
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'qatar'),($1,'ksa')",
      [editorId],
    );
    await admin.query(
      "UPDATE cms_revisions SET workflow_state='approved' WHERE id=$1",
      [crossSourceFixture.rows[0]?.materialized_revision_id],
    );
    await admin.query(
      `UPDATE cms_market_editions
          SET published_revision_id=$1,publication_state='archived'
        WHERE document_id=$2 AND market='qatar' AND locale='en'`,
      [crossSourceFixture.rows[0]?.materialized_revision_id, documentId],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/restore`, "POST", {
        market: "qatar", locale: "en", reason: "Cross-source authorization denial fixture",
      }, headersFor(editorToken))).status,
      403,
      "restore checks the archived approved revision's historical source before writing a successor",
    );
    const crossSourceAfterDeniedRestore = await admin.query<{
      publication_state: string;
      published_revision_id: string;
      revision_count: string;
    }>(
      `SELECT edition.publication_state,edition.published_revision_id::text,
              (SELECT count(*)::text FROM cms_revisions revision WHERE revision.edition_id=edition.id) revision_count
         FROM cms_market_editions edition
        WHERE edition.document_id=$1 AND edition.market='qatar' AND edition.locale='en'`,
      [documentId],
    );
    assert.deepEqual(crossSourceAfterDeniedRestore.rows[0], {
      publication_state: "archived",
      published_revision_id: crossSourceFixture.rows[0]?.materialized_revision_id,
      revision_count: crossSourceFixture.rows[0]?.revision_count,
    });

    // Task 329's explicit geo-copy route must be independent from the older
    // shared-source customization operation: it copies a named exact revision
    // into a missing configured target without moving, approving, or publishing
    // either edition.
    const kuwaitMarketId = randomUUID();
    await admin.query(
      `INSERT INTO market_editions
         (id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
       VALUES ($1,'kuwait','kuwait','en','uae','en',true,false)`,
      [kuwaitMarketId],
    );
    const publicBeforeGeoCopy = await json<{ items: Array<{ title: string }> }>(
      await fetch(`${origin}/api/public/content?market=kuwait&locale=en&kind=publication`),
      200,
      "Kuwait fallback before an unpublished geo copy",
    );
    const latestSaudi = await admin.query<{
      id: string; revision_number: number; workflow_state: string; publication_state: string;
      published_revision_id: string | null; market: string; locale: string;
    }>(
      `SELECT revision.id::text,revision.revision_number,revision.workflow_state,
              edition.publication_state,edition.published_revision_id::text,edition.market,edition.locale
         FROM cms_revisions revision
         JOIN cms_market_editions edition ON edition.id=revision.edition_id
        WHERE edition.document_id=$1 AND edition.market='ksa' AND edition.locale='en'
        ORDER BY revision.revision_number DESC,revision.created_at DESC,revision.id DESC LIMIT 1`,
      [documentId],
    );
    assert.ok(latestSaudi.rows[0]);
    const copyCandidates = await json<{
      candidates: Array<{ revisionId: string; market: string; locale: string; workflowState: string;
        publicationState: string; readinessIssues: Array<{ category: string }> }>;
    }>(
      await request(`/api/documents/${documentId}/market-copy-candidates/kuwait/en`, "GET", undefined),
      200,
      "authorized same-locale geo copy candidates",
    );
    const saudiCandidate = copyCandidates.candidates.find((candidate) => candidate.revisionId === latestSaudi.rows[0]?.id);
    assert.deepEqual(
      {
        revisionId: saudiCandidate?.revisionId,
        market: saudiCandidate?.market,
        locale: saudiCandidate?.locale,
        workflowState: saudiCandidate?.workflowState,
        publicationState: saudiCandidate?.publicationState,
      },
      {
        revisionId: latestSaudi.rows[0]?.id,
        market: "ksa",
        locale: "en",
        workflowState: latestSaudi.rows[0]?.workflow_state,
        publicationState: "saved",
      },
      "candidate identity and saved/published state are explicit",
    );
    assert.ok(
      saudiCandidate?.readinessIssues.some((issue) => issue.category === "workflow"),
      "saved revision readiness distinguishes the approval requirement from content validation",
    );
    const sourceBeforeCopy = await admin.query<{
      published_revision_id: string | null; publication_state: string; revision_count: string;
    }>(
      `SELECT edition.published_revision_id::text,edition.publication_state,
              count(revision.*)::text revision_count
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market='ksa' AND edition.locale='en'
        GROUP BY edition.id`,
      [documentId],
    );
    const copied = await json<{
      editionId: string; revisionId: string; revisionNumber: number; market: string; locale: string;
      sourceRevisionId: string; sourceMarket: string; sourceLocale: string; replayed: boolean;
    }>(
      await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: kuwaitMarketId,
        destinationLocale: "en",
        sourceRevisionId: latestSaudi.rows[0]?.id,
        expectedSourceRevisionId: latestSaudi.rows[0]?.id,
      }),
      201,
      "copy an explicit exact Saudi revision to missing Kuwait",
    );
    assert.deepEqual(
      {
        market: copied.market, locale: copied.locale, sourceRevisionId: copied.sourceRevisionId,
        sourceMarket: copied.sourceMarket, sourceLocale: copied.sourceLocale, replayed: copied.replayed,
      },
      {
        market: "kuwait", locale: "en", sourceRevisionId: latestSaudi.rows[0]?.id,
        sourceMarket: "ksa", sourceLocale: "en", replayed: false,
      },
    );
    const copiedState = await admin.query<{
      publication_state: string; published_revision_id: string | null; workflow_state: string;
    }>(
      `SELECT edition.publication_state,edition.published_revision_id::text,revision.workflow_state
         FROM cms_market_editions edition JOIN cms_revisions revision ON revision.id=$2
        WHERE edition.id=$1`,
      [copied.editionId, copied.revisionId],
    );
    assert.deepEqual(copiedState.rows[0], {
      publication_state: "draft",
      published_revision_id: null,
      workflow_state: "draft",
    }, "a copied destination is editable and unpublished without inheriting approval");
    const publicAfterGeoCopy = await json<{ items: Array<{ title: string }> }>(
      await fetch(`${origin}/api/public/content?market=kuwait&locale=en&kind=publication`),
      200,
      "Kuwait fallback after an unpublished geo copy",
    );
    assert.deepEqual(
      publicAfterGeoCopy.items,
      publicBeforeGeoCopy.items,
      "an unpublished copied draft cannot change effective public delivery",
    );
    const copiedPins = await admin.query<{ asset_id: string; media_version_id: string }>(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id,media_version_id`,
      [documentId, `revision:${copied.revisionId}`],
    );
    const sourcePins = await admin.query<{ asset_id: string; media_version_id: string }>(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id,media_version_id`,
      [documentId, `revision:${latestSaudi.rows[0]?.id}`],
    );
    assert.deepEqual(copiedPins.rows, sourcePins.rows, "copy preserves exact immutable media pins");
    const replayed = await json<{ revisionId: string; replayed: boolean }>(
      await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: kuwaitMarketId,
        destinationLocale: "en",
        sourceRevisionId: latestSaudi.rows[0]?.id,
        expectedSourceRevisionId: latestSaudi.rows[0]?.id,
      }),
      200,
      "safe copy retry",
    );
    assert.equal(replayed.revisionId, copied.revisionId);
    assert.equal(replayed.replayed, true);
    assert.equal(replayed.market, copied.market);
    assert.equal(replayed.locale, copied.locale);
    const sourceAfterCopy = await admin.query<{
      published_revision_id: string | null; publication_state: string; revision_count: string;
    }>(
      `SELECT edition.published_revision_id::text,edition.publication_state,
              count(revision.*)::text revision_count
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market='ksa' AND edition.locale='en'
        GROUP BY edition.id`,
      [documentId],
    );
    assert.deepEqual(sourceAfterCopy.rows[0], sourceBeforeCopy.rows[0], "copy leaves source delivery and history unchanged");
    const jordanMarketId = randomUUID();
    await admin.query(
      `INSERT INTO market_editions
         (id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
       VALUES ($1,'jordan','jordan','en','uae','en',true,false)`,
      [jordanMarketId],
    );
    const publishedSourceCandidates = await json<{
      candidates: Array<{ revisionId: string; market: string; publicationState: string; publishedRevisionId: string | null }>;
    }>(
      await request(`/api/documents/${documentId}/market-copy-candidates/jordan/en`, "GET", undefined),
      200,
      "both saved and published source candidates",
    );
    const uaeCandidates = publishedSourceCandidates.candidates.filter((candidate) => candidate.market === "uae");
    assert.ok(
      uaeCandidates.some((candidate) => candidate.revisionId === sourceRevisionId
        && candidate.publicationState === "published"
        && candidate.publishedRevisionId === sourceRevisionId),
      "a published source remains an explicit candidate when a newer saved revision exists",
    );
    assert.ok(
      uaeCandidates.some((candidate) => candidate.revisionId !== sourceRevisionId
        && candidate.publicationState === "saved"
        && candidate.publishedRevisionId === sourceRevisionId),
      "a draft successor is truthfully labelled saved rather than Published",
    );
    assert.ok(
      !publishedSourceCandidates.candidates.some((candidate) => candidate.revisionId === sharedSourceRevisionId),
      "legacy shared-source storage is never offered as a geo copy candidate",
    );
    // Task 337 regression: each missing destination gets its own candidate
    // context, while source authority and unpublished-copy boundaries remain
    // explicit for both saved and published UAE revisions.
    const task337UnauthorizedEurope = await request(
      `/api/documents/${task337DocumentId}/market-copy-candidates/europe/en`,
      "GET",
      undefined,
      headersFor(editorToken),
    );
    assert.equal(
      task337UnauthorizedEurope.status,
      403,
      "candidate discovery still requires destination-market permission for missing Europe",
    );
    const task337SourceUnauthorized = await json<{
      targetMarket: string;
      targetLocale: string;
      candidates: Array<{ market: string; revisionId: string }>;
    }>(
      await request(
        `/api/documents/${task337DocumentId}/market-copy-candidates/ksa/en`,
        "GET",
        undefined,
        headersFor(editorToken),
      ),
      200,
      "a Saudi-assigned editor without UAE authority can open the candidate boundary",
    );
    assert.deepEqual(
      {
        targetMarket: task337SourceUnauthorized.targetMarket,
        targetLocale: task337SourceUnauthorized.targetLocale,
        candidates: task337SourceUnauthorized.candidates,
      },
      { targetMarket: "ksa", targetLocale: "en", candidates: [] },
      "candidate discovery does not leak either UAE saved or published revision without source permission",
    );
    await admin.query("UPDATE cms_users SET role='editor' WHERE id=$1", [editorId]);
    await admin.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1", [editorId]);
    await admin.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code)
       VALUES ($1,'uae'),($1,'ksa'),($1,'europe')`,
      [editorId],
    );
    const task337Candidate = async (targetMarket: string) => json<{
      documentId: string;
      targetMarket: string;
      targetLocale: string;
      candidates: Array<{
        market: string;
        locale: string;
        revisionId: string;
        revisionNumber: number;
        workflowState: string;
        publicationState: string;
        publishedRevisionId: string | null;
        ready: boolean;
        readinessIssues: Array<{ category: string }>;
      }>;
    }>(
      await request(
        `/api/documents/${task337DocumentId}/market-copy-candidates/${targetMarket}/en`,
        "GET",
        undefined,
        headersFor(editorToken),
      ),
      200,
      `authorized ${targetMarket} candidate discovery`,
    );
    const task337EuropeCandidates = await task337Candidate("europe");
    const task337SaudiCandidates = await task337Candidate("ksa");
    for (const [targetMarket, result] of [
      ["europe", task337EuropeCandidates],
      ["ksa", task337SaudiCandidates],
    ] as const) {
      assert.equal(result.documentId, task337DocumentId);
      assert.equal(result.targetMarket, targetMarket);
      assert.equal(result.targetLocale, "en");
      assert.equal(result.candidates.length, 2);
      assert.ok(
        result.candidates.every((candidate) => candidate.market === "uae" && candidate.locale === "en"),
        `${targetMarket} candidates remain same-locale UAE sources and exclude the destination`,
      );
      assert.ok(
        !result.candidates.some((candidate) => candidate.market === targetMarket),
        `${targetMarket} is excluded from its own source candidates`,
      );
      const published = result.candidates.find((candidate) => candidate.revisionId === task337UaePublishedRevisionId);
      const saved = result.candidates.find((candidate) => candidate.revisionId === task337UaeSavedRevisionId);
      assert.deepEqual(
        {
          revisionId: published?.revisionId,
          revisionNumber: published?.revisionNumber,
          workflowState: published?.workflowState,
          publicationState: published?.publicationState,
          publishedRevisionId: published?.publishedRevisionId,
        },
        {
          revisionId: task337UaePublishedRevisionId,
          revisionNumber: 1,
          workflowState: "approved",
          publicationState: "published",
          publishedRevisionId: task337UaePublishedRevisionId,
        },
        `${targetMarket} retains the UAE published revision as an explicit candidate`,
      );
      assert.deepEqual(
        {
          revisionId: saved?.revisionId,
          revisionNumber: saved?.revisionNumber,
          workflowState: saved?.workflowState,
          publicationState: saved?.publicationState,
          publishedRevisionId: saved?.publishedRevisionId,
        },
        {
          revisionId: task337UaeSavedRevisionId,
          revisionNumber: 2,
          workflowState: "draft",
          publicationState: "saved",
          publishedRevisionId: task337UaePublishedRevisionId,
        },
        `${targetMarket} labels the newer UAE revision saved rather than published`,
      );
      assert.ok(
        saved?.readinessIssues.some((issue) => issue.category === "workflow"),
        `${targetMarket} preserves the saved-only review boundary`,
      );
    }
    const task337SourceBeforeCopies = await admin.query<{
      publication_state: string;
      published_revision_id: string | null;
      revision_count: string;
    }>(
      `SELECT edition.publication_state,edition.published_revision_id::text,
              count(revision.*)::text revision_count
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.id=$1
        GROUP BY edition.id`,
      [task337UaeEditionId],
    );
    const task337EuropeCopy = await json<{
      market: string;
      locale: string;
      sourceRevisionId: string;
      sourceWorkflowState: string;
      sourcePublicationState: string;
      replayed: boolean;
    }>(
      await request(`/api/documents/${task337DocumentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: europeMarketId,
        destinationLocale: "en",
        sourceRevisionId: task337UaeSavedRevisionId,
        expectedSourceRevisionId: task337UaeSavedRevisionId,
      }, headersFor(editorToken)),
      201,
      "copy the UAE saved revision into missing Europe as a draft",
    );
    assert.deepEqual(
      {
        market: task337EuropeCopy.market,
        locale: task337EuropeCopy.locale,
        sourceRevisionId: task337EuropeCopy.sourceRevisionId,
        sourceWorkflowState: task337EuropeCopy.sourceWorkflowState,
        sourcePublicationState: task337EuropeCopy.sourcePublicationState,
        replayed: task337EuropeCopy.replayed,
      },
      {
        market: "europe",
        locale: "en",
        sourceRevisionId: task337UaeSavedRevisionId,
        sourceWorkflowState: "draft",
        sourcePublicationState: "saved",
        replayed: false,
      },
      "Europe records the exact UAE saved source without promoting it",
    );
    const task337SaudiCopy = await json<{
      market: string;
      locale: string;
      sourceRevisionId: string;
      sourceWorkflowState: string;
      sourcePublicationState: string;
      replayed: boolean;
    }>(
      await request(`/api/documents/${task337DocumentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: ksaMarketId,
        destinationLocale: "en",
        sourceRevisionId: task337UaePublishedRevisionId,
        expectedSourceRevisionId: task337UaePublishedRevisionId,
      }, headersFor(editorToken)),
      201,
      "copy the UAE published revision into missing Saudi as a draft",
    );
    assert.deepEqual(
      {
        market: task337SaudiCopy.market,
        locale: task337SaudiCopy.locale,
        sourceRevisionId: task337SaudiCopy.sourceRevisionId,
        sourceWorkflowState: task337SaudiCopy.sourceWorkflowState,
        sourcePublicationState: task337SaudiCopy.sourcePublicationState,
        replayed: task337SaudiCopy.replayed,
      },
      {
        market: "ksa",
        locale: "en",
        sourceRevisionId: task337UaePublishedRevisionId,
        sourceWorkflowState: "approved",
        sourcePublicationState: "published",
        replayed: false,
      },
      "Saudi records the exact UAE published source while remaining an unpublished draft",
    );
    const task337CopiedState = await admin.query<{
      market: string;
      publication_state: string;
      published_revision_id: string | null;
      workflow_state: string;
    }>(
      `SELECT edition.market,edition.publication_state,edition.published_revision_id::text,
              revision.workflow_state
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market IN ('europe','ksa')
          AND edition.locale='en'
        ORDER BY edition.market`,
      [task337DocumentId],
    );
    assert.deepEqual(
      task337CopiedState.rows,
      [
        { market: "europe", publication_state: "draft", published_revision_id: null, workflow_state: "draft" },
        { market: "ksa", publication_state: "draft", published_revision_id: null, workflow_state: "draft" },
      ],
      "both missing destinations remain editable unpublished drafts",
    );
    const task337SourceAfterCopies = await admin.query<{
      publication_state: string;
      published_revision_id: string | null;
      revision_count: string;
    }>(
      `SELECT edition.publication_state,edition.published_revision_id::text,
              count(revision.*)::text revision_count
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.id=$1
        GROUP BY edition.id`,
      [task337UaeEditionId],
    );
    assert.deepEqual(
      task337SourceAfterCopies.rows,
      task337SourceBeforeCopies.rows,
      "copying Europe and Saudi leaves the UAE source publication and revision history unchanged",
    );
    assert.equal(
      (await request(
        `/api/documents/${task337DocumentId}/market-copy-candidates/europe/en`,
        "GET",
        undefined,
        headersFor(editorToken),
      )).status,
      409,
      "candidate discovery closes the missing-destination boundary after Europe is created",
    );
    assert.equal(
      (await request(
        `/api/documents/${task337DocumentId}/market-copy-candidates/ksa/en`,
        "GET",
        undefined,
        headersFor(editorToken),
      )).status,
      409,
      "candidate discovery closes the missing-destination boundary after Saudi is created",
    );
    await admin.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1", [editorId]);
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'ksa'),($1,'jordan')",
      [editorId],
    );
    const inheritedSourceCandidates = await json<{
      candidates: Array<{ revisionId: string }>;
    }>(
      await request(
        `/api/documents/${documentId}/market-copy-candidates/jordan/en`,
        "GET",
        undefined,
        headersFor(editorToken),
      ),
      200,
      "managed source candidates honor inherited authority",
    );
    assert.ok(
      !inheritedSourceCandidates.candidates.some((candidate) => candidate.revisionId === latestSaudi.rows[0]?.id),
      "a destination/source-market editor cannot inspect a managed revision without its inherited baseline source",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: jordanMarketId,
        destinationLocale: "en",
        sourceRevisionId: latestSaudi.rows[0]?.id,
        expectedSourceRevisionId: latestSaudi.rows[0]?.id,
      }, headersFor(editorToken))).status,
      403,
      "copy fails closed when the managed source revision's immutable baseline authority is absent",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: jordanMarketId,
        destinationLocale: "en",
        sourceRevisionId: sharedSourceRevisionId,
        expectedSourceRevisionId: sharedSourceRevisionId,
      })).status,
      404,
      "legacy shared-source storage cannot be copied through the geo-copy route",
    );
    const copyRacePool = new PoolConstructor({
      connectionString: withSearchPath(originalDatabaseUrl, schema),
    });
    const copyRaceLock = await copyRacePool.connect();
    try {
      await copyRaceLock.query("BEGIN");
      await copyRaceLock.query("SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      const copyBody = {
        destinationMarketEditionId: jordanMarketId,
        destinationLocale: "en",
        sourceRevisionId,
        expectedSourceRevisionId: sourceRevisionId,
      };
      const firstCopy = request(`/api/documents/${documentId}/market-edition-copies`, "POST", copyBody);
      const secondCopy = request(`/api/documents/${documentId}/market-edition-copies`, "POST", copyBody);
      await new Promise((resolve) => setTimeout(resolve, 25));
      await copyRaceLock.query("COMMIT");
      const copyResponses = await Promise.all([firstCopy, secondCopy]);
      assert.deepEqual(
        copyResponses.map((response) => response.status).sort(),
        [200, 201],
        "concurrent duplicate copy submissions create one destination and recover the other request safely",
      );
    } finally {
      await copyRaceLock.query("ROLLBACK").catch(() => undefined);
      copyRaceLock.release();
      await copyRacePool.end();
    }
    const concurrentCopies = await admin.query<{ edition_count: string; revision_count: string; audit_count: string }>(
      `SELECT
         (SELECT count(*)::text FROM cms_market_editions
           WHERE document_id=$1 AND market='jordan' AND locale='en') edition_count,
         (SELECT count(*)::text FROM cms_revisions revision
           JOIN cms_market_editions edition ON edition.id=revision.edition_id
           WHERE edition.document_id=$1 AND edition.market='jordan' AND edition.locale='en') revision_count,
         (SELECT count(*)::text FROM cms_audit_events
           WHERE target_id=$1::text AND action='document.market_edition_copied'
             AND metadata->>'destinationMarket'='jordan'
             AND metadata->>'destinationLocale'='en') audit_count`,
      [documentId],
    );
    assert.deepEqual(concurrentCopies.rows[0], {
      edition_count: "1",
      revision_count: "1",
      audit_count: "1",
    }, "concurrent retries retain one Jordan draft and one Jordan audit receipt");
    const jordanCopied = await admin.query<{ edition_id: string; revision_id: string }>(
      `SELECT edition.id::text edition_id,revision.id::text revision_id
         FROM cms_market_editions edition
         JOIN cms_revisions revision ON revision.edition_id=edition.id
        WHERE edition.document_id=$1 AND edition.market='jordan' AND edition.locale='en'
        ORDER BY revision.revision_number DESC LIMIT 1`,
      [documentId],
    );
    await admin.query(
      `UPDATE cms_revisions SET workflow_state='approved' WHERE id=$1`,
      [jordanCopied.rows[0]?.revision_id],
    );
    await admin.query(
      `UPDATE cms_market_editions
          SET publication_state='published',published_revision_id=$2,published_at=now()
        WHERE id=$1`,
      [jordanCopied.rows[0]?.edition_id, jordanCopied.rows[0]?.revision_id],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: jordanMarketId,
        destinationLocale: "en",
        sourceRevisionId,
        expectedSourceRevisionId: sourceRevisionId,
      })).status,
      409,
      "a retry cannot reuse a copy receipt after the target draft has been reviewed or published",
    );
    const lebanonMarketId = randomUUID();
    const lebanonEditionId = randomUUID();
    const lebanonRevisionId = randomUUID();
    await admin.query(
      `INSERT INTO market_editions
         (id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
       VALUES ($1,'lebanon','lebanon','en','uae','en',true,false)`,
      [lebanonMarketId],
    );
    await admin.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,publication_state,content_mode,customized_from_revision_id)
       VALUES ($1,$2,'lebanon','en','draft','custom',$3)`,
      [lebanonEditionId, documentId, sourceRevisionId],
    );
    await admin.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
       SELECT $1,$2,1,payload,'task329-unreceipted-lineage','draft',$3,
              'Fixture sharing lineage without a copy receipt',$4
         FROM cms_revisions WHERE id=$4`,
      [lebanonRevisionId, lebanonEditionId, administratorId, sourceRevisionId],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: lebanonMarketId,
        destinationLocale: "en",
        sourceRevisionId,
        expectedSourceRevisionId: sourceRevisionId,
      })).status,
      409,
      "a source lineage on an unrelated target cannot impersonate this target's immutable copy receipt",
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: kuwaitMarketId,
        destinationLocale: "en",
        sourceRevisionId: arabicSourceRevisionId,
        expectedSourceRevisionId: arabicSourceRevisionId,
      })).status,
      409,
      "incompatible source and destination locales cannot be copied",
    );
    await admin.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'kuwait')
       ON CONFLICT DO NOTHING`,
      [editorId],
    );
    await admin.query(
      "DELETE FROM cms_user_market_assignments WHERE user_id=$1 AND market_code='ksa'",
      [editorId],
    );
    assert.equal(
      (await request(`/api/documents/${documentId}/market-edition-copies`, "POST", {
        destinationMarketEditionId: kuwaitMarketId,
        destinationLocale: "en",
        sourceRevisionId: latestSaudi.rows[0]?.id,
        expectedSourceRevisionId: latestSaudi.rows[0]?.id,
      }, headersFor(editorToken))).status,
      403,
      "copy authorizes the selected exact historical source market, not a current binding alone",
    );
    const copyAudits = await admin.query<{ count: string }>(
      `SELECT count(*)::text count FROM cms_audit_events
        WHERE target_id=$1::text AND action='document.market_edition_copied'
          AND metadata->>'destinationMarket'='kuwait'
          AND metadata->>'destinationLocale'='en'`,
      [documentId],
    );
    assert.equal(copyAudits.rows[0]?.count, "1", "safe retry does not create another copy audit event");
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
    }
    await routePool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await admin.end();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
  }
});
