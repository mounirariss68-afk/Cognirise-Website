import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

type PoolLike = {
  query<T = Record<string, unknown>>(
    sql: string,
    values?: unknown[],
  ): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
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
  const uaeMarketId = randomUUID();
  const ksaMarketId = randomUUID();
  const qatarMarketId = randomUUID();
  const omanMarketId = randomUUID();
  const bahrainMarketId = randomUUID();
  const disabledMarketId = randomUUID();
  const sourceEditionId = randomUUID();
  const arabicSourceEditionId = randomUUID();
  const sharedSourceEditionId = randomUUID();
  const independentEditionId = randomUUID();
  const foreignEditionId = randomUUID();
  const sourceRevisionId = randomUUID();
  const arabicSourceRevisionId = randomUUID();
  const sharedSourceRevisionId = randomUUID();
  const independentRevisionId = randomUUID();
  const foreignRevisionId = randomUUID();
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
    await admin.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'publication',$2,$3,$4,'active'),
              ($5,'publication',$6,'Independent publication',$4,'active'),
              ($7,'publication',$8,'Foreign source',$4,'active')`,
      [
        documentId, commonSnapshot.slug, commonSnapshot.title, administratorId,
        independentDocumentId, `independent-${independentDocumentId.slice(0, 8)}`,
        foreignDocumentId, `foreign-${foreignDocumentId.slice(0, 8)}`,
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
         ($10,$11,'uae','en',$12,'published','custom')`,
      [
        sourceEditionId, documentId, commonSnapshot.slug,
        arabicSourceEditionId, arabicSnapshot.slug,
        sharedSourceEditionId,
        independentEditionId, independentDocumentId, `independent-${independentDocumentId.slice(0, 8)}`,
        foreignEditionId, foreignDocumentId, `foreign-${foreignDocumentId.slice(0, 8)}`,
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
         ($12,$13,1,$3,'task321-foreign','approved',$4,'Different document source fixture')`,
      [
        sourceRevisionId, sourceEditionId, commonSnapshot, administratorId,
        arabicSourceRevisionId, arabicSourceEditionId, arabicSnapshot,
        sharedSourceRevisionId, sharedSourceEditionId,
        independentRevisionId, independentEditionId,
        foreignRevisionId, foreignEditionId,
      ],
    );
    await admin.query(
      `UPDATE cms_market_editions
          SET published_revision_id=CASE id
            WHEN $1 THEN $2::uuid WHEN $3 THEN $4::uuid
            WHEN $5 THEN $6::uuid WHEN $7 THEN $8::uuid END,
              published_at=now()
        WHERE id IN ($1,$3,$5,$7)`,
      [
        sourceEditionId, sourceRevisionId,
        arabicSourceEditionId, arabicSourceRevisionId,
        sharedSourceEditionId, sharedSourceRevisionId,
        foreignEditionId, foreignRevisionId,
      ],
    );
    await admin.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)`,
      [commonImageId, commonImageVersionId, documentId, `revision:${sourceRevisionId}`],
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
        baselineRevisionId: englishBaseline.revisionId, version: 0,
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
        baselineRevisionId: englishBaseline.revisionId, version: 0,
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
        baselineRevisionId: englishBaseline.revisionId, version: 0,
      }),
      200,
      "create adapted binding to reset",
    );
    const bahrain = await json<{ id: string; version: number }>(
      await request(`/api/documents/${documentId}/shared-market/bindings`, "PUT", {
        marketEditionId: bahrainMarketId, locale: "en", mode: "adapted", baselineId: englishBaseline.id,
        baselineRevisionId: englishBaseline.revisionId, version: 0,
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
      conflicts: Array<{ path: string; kind: string }>;
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
          { path: "title", choice: "market" },
          { path: "summary", choice: "shared" },
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