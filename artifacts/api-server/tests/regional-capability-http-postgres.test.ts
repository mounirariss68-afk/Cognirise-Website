import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

type PoolLike = {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
  options: { connectionString?: string };
};

function searchPath(url: string, schema: string) {
  const value = new URL(url);
  value.searchParams.set("options", `-csearch_path=${schema},public`);
  return value.toString();
}

async function cloneTables(admin: PoolLike, schema: string) {
  const result = await admin.query<{ tablename: string }>(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'",
  );
  for (const { tablename } of result.rows) {
    await admin.query(
      `CREATE TABLE "${schema}"."${tablename.replaceAll('"', '""')}" (LIKE public."${tablename.replaceAll('"', '""')}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)`,
    );
  }
}

test("configured grants are immediate, exact-geo HTTP authority", {
  concurrency: false,
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async (t) => {
  const databaseUrl = process.env.DATABASE_URL;
  const sessionSecret = process.env.SESSION_SECRET;
  assert.ok(databaseUrl);
  const schema = `task345_scope_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { pool: routePool } = await import("@workspace/db") as { pool: PoolLike };
  const Pool = routePool.constructor as unknown as new (options: { connectionString: string }) => PoolLike;
  const admin = new Pool({ connectionString: databaseUrl });
  let server: any;
  const ids = {
    emptyAdmin: randomUUID(), author: randomUUID(), reviewer: randomUUID(),
    uae: randomUUID(), ksa: randomUUID(), asset: randomUUID(), version: randomUUID(),
    ksaOnlyAsset: randomUUID(), ksaOnlyVersion: randomUUID(),
  };
  const tokens = { emptyAdmin: randomUUID(), author: randomUUID(), reviewer: randomUUID() };
  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await cloneTables(admin, schema);
    await admin.query(`SET search_path TO "${schema}", public`);
    const migration0041 = await readFile(
      resolve(process.cwd(), "../../lib/db/migrations/0041_cms_shared_baseline_governing_source.sql"),
      "utf8",
    );
    for (const number of ["0032", "0033", "0034", "0035", "0036", "0037", "0038", "0039", "0040"]) {
      const file = await readFile(resolve(process.cwd(), `../../lib/db/migrations/${number}_${{
        "0032": "cms_editorial_work", "0033": "cms_editorial_review_hardening",
        "0034": "cms_editorial_digest_delivery_identity", "0035": "cms_revision_accuracy_confirmations",
        "0036": "cms_review_request_accountability_snapshot", "0037": "cms_capability_matrix_access_projection",
        "0038": "cms_review_capability_reviewers", "0039": "cms_capability_matrix_configuration",
         "0040": "cms_legacy_administrator_market_snapshots",
      }[number]}.sql`), "utf8");
      await admin.query(file);
    }
    await admin.query(
      `INSERT INTO market_editions(id,code,display_name,default_locale,fallback_locale,enabled,is_canonical)
       VALUES ($1,'uae','UAE','en',NULL,true,true),($2,'ksa','KSA','en','fr',true,false)`,
      [ids.uae, ids.ksa],
    );
    const security = await import("../src/lib/security.ts");
    for (const [key, role] of [["emptyAdmin", "administrator"], ["author", "viewer"], ["reviewer", "viewer"]] as const) {
      await admin.query(
        "INSERT INTO cms_users(id,email,display_name,role,status) VALUES ($1,$2,$3,$4,'active')",
        [ids[key], `${key}-${schema}@example.test`, key, role],
      );
      await admin.query(
        "INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at) VALUES ($1,'fixture',1,now())",
        [ids[key]],
      );
      await admin.query(
        "INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at) VALUES ($1,$2,now(),now()+interval '1 hour')",
        [ids[key], security.hashToken(tokens[key])],
      );
      // All three accounts are explicitly configured. Role must not restore
      // authority for the empty administrator or lower-role reviewer.
      await admin.query("INSERT INTO cms_user_capability_configurations(user_id) VALUES ($1)", [ids[key]]);
    }
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'platform','view','regional','uae'),($1,'platform','edit','regional','uae'),
              ($1,'platform','view','regional','ksa'),($1,'platform','edit','regional','ksa'),
               ($1,'platform','view','shared','uae'),($1,'platform','edit','shared','uae'),
               ($1,'platform','view','shared','ksa'),($1,'platform','edit','shared','ksa'),
               ($2,'platform','view','shared','uae'),($2,'platform','review','shared','uae'),
               ($2,'platform','review','regional','uae')`,
      [ids.author, ids.reviewer],
    );
    await admin.query(
      `INSERT INTO cms_media_assets(id,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,collection,status,uploaded_by_user_id)
       VALUES ($1,'scope/asset','scope.png','scope.png','image/png',4,'scope','Scope image','website','active',$2)`,
      [ids.asset, ids.author],
    );
    await admin.query(
      `INSERT INTO cms_media_versions(id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,1,'scope/version','scope-version',4,100,100,
         '{"altText":"Scope image","rightsStatus":"approved","accessibilityStatus":"approved"}')`,
      [ids.version, ids.asset],
    );
    await admin.query(
      `INSERT INTO cms_media_assets(id,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,collection,status,uploaded_by_user_id)
       VALUES ($1,'scope/ksa-only','ksa-only.png','ksa-only.png','image/png',4,'ksa-only','KSA only','website','active',$2)`,
      [ids.ksaOnlyAsset, ids.author],
    );
    await admin.query(
      `INSERT INTO cms_media_versions(id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,1,'scope/ksa-only-version','ksa-only-version',4,100,100,
         '{"altText":"KSA only","rightsStatus":"approved","accessibilityStatus":"approved"}')`,
      [ids.ksaOnlyVersion, ids.ksaOnlyAsset],
    );

    routePool.options.connectionString = searchPath(databaseUrl, schema);
    process.env.DATABASE_URL = routePool.options.connectionString;
    process.env.SESSION_SECRET = "regional-capability-http-fixture";
    const [{ default: app }, auth] = await Promise.all([import("../src/app.ts"), import("../src/lib/auth.ts")]);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server!.once("listening", resolve));
    const address = (server as any).address();
    const origin = `http://127.0.0.1:${address.port}`;
    const request = (who: keyof typeof tokens, path: string, method: string, body?: unknown) => {
      const csrf = auth.csrfForSession(security.hashToken(tokens[who]));
      return fetch(`${origin}${path}`, {
        method,
        headers: { origin, "content-type": "application/json", "x-csrf-token": csrf,
          cookie: `${auth.SESSION_COOKIE}=${tokens[who]}; ${auth.CSRF_COOKIE}=${csrf}` },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    };
    const status = async (response: Response, expected: number, label: string) => {
      const body = await response.text();
      assert.equal(response.status, expected, `${label}: ${body}`);
      return body;
    };

    const emptyList = JSON.parse(await status(
      await request("emptyAdmin", "/api/documents", "GET"), 200, "configured-empty admin list",
    )) as { items: unknown[] };
    assert.deepEqual(emptyList.items, [], "configured-empty admin must not receive list items");

    const platform = {
      schemaVersion: 1, category: "Specialist", summary: "Scoped UAE platform.",
      heroMedia: { mediaId: ids.asset, mediaVersionId: ids.version, role: "hero", altText: "Scope image" },
      template: "standard", sections: [{ heading: "Scoped", body: [{ type: "paragraph", text: "Scoped body." }] }],
      capabilities: ["Bounded"], differentiators: ["Exact"], cta: { label: "Open", href: "/platforms/scoped" },
      visibility: "public", order: 1, sources: [{ label: "Fixture", url: "https://example.test/source", accessedAt: "2026-10-01" }],
      verificationDate: "2026-10-01", reviewDate: "2027-01-01", relatedIds: [],
    };
    await status(await request("emptyAdmin", "/api/documents", "POST", {
      kind: "platform", slug: `denied-${schema.slice(-8)}`, title: "Denied", content: platform, markets: ["uae"],
    }), 403, "configured-empty admin cannot create");
    const created = await request("author", "/api/documents", "POST", {
      kind: "platform", slug: `scope-${schema.slice(-8)}`, title: "Scoped platform", content: platform, markets: ["uae", "ksa"],
    });
    const createdBody = JSON.parse(await status(created, 201, "viewer role with explicit UAE Edit can create/save UAE")) as { id: string };
    const documentId = createdBody.id;
    const neutralCreated = JSON.parse(await status(await request("author", "/api/documents", "POST", {
      kind: "platform", slug: `neutral-${schema.slice(-8)}`, title: "Neutral platform",
      content: platform, markets: ["uae", "ksa"], sharedLocale: "en",
    }), 201, "all-destination Shared and regional Edit creates a deliberately neutral baseline")) as { id: string };
    const neutralMatrix = JSON.parse(await status(
      await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "GET"),
      200, "full Shared and regional View reads the intentionally neutral baseline",
    )) as {
      baselines: Array<{ id: string; revisionId: string; revisionNumber: number; snapshot: Record<string, unknown> | null; governingSourceRevisionId: string | null; authorityKind: string }>;
      bindings: Array<{ id: string }>;
    };
    const neutralBaseline = neutralMatrix.baselines.find((baseline) => baseline.revisionNumber === 1);
    assert.ok(neutralBaseline?.snapshot, "intentional neutral baseline exposes its pinned snapshot without a country origin");
    assert.equal(neutralBaseline.governingSourceRevisionId, null, "intentional neutral baseline does not invent a country governing source");
    assert.equal(neutralBaseline.authorityKind, "neutral", "DTO distinguishes proven neutral authority from unresolved history");
    await status(
      await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings/${neutralMatrix.bindings[0].id}/compare`, "GET"),
      200, "full authority can compare a neutral shared binding",
    );
    const neutralSuccessor = { ...neutralBaseline.snapshot, summary: "Neutral successor one." };
    await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "POST", {
      locale: "en", snapshot: neutralSuccessor, expectedRevisionNumber: 1,
    }), 201, "intentional neutral baseline accepts a first all-destination-authorized successor");
    await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "POST", {
      locale: "en", snapshot: { ...neutralSuccessor, summary: "Neutral successor two." }, expectedRevisionNumber: 2,
    }), 201, "intentional neutral baseline accepts a second all-destination-authorized successor");
    await admin.query(
      "DELETE FROM cms_user_capability_grants WHERE user_id=$1 AND scope='shared' AND market_code='ksa'",
      [ids.author],
    );
    const neutralKsaBinding = (await admin.query<{
      id: string; version: number; mode: string; baseline_id: string | null;
      based_on_baseline_revision_id: string | null; materialized_revision_id: string | null;
    }>(
      `SELECT id,version,mode,baseline_id,based_on_baseline_revision_id,materialized_revision_id
         FROM cms_market_edition_bindings
        WHERE document_id=$1 AND market_edition_id=$2 AND locale='en'`,
      [neutralCreated.id, ids.ksa],
    )).rows[0]!;
    const neutralBindingPointer = {
      mode: neutralKsaBinding.mode,
      baseline_id: neutralKsaBinding.baseline_id,
      based_on_baseline_revision_id: neutralKsaBinding.based_on_baseline_revision_id,
      materialized_revision_id: neutralKsaBinding.materialized_revision_id,
      version: neutralKsaBinding.version,
    };
    const neutralActiveRevision = (await admin.query<{ active_revision_id: string }>(
      "SELECT active_revision_id FROM cms_shared_baselines WHERE id=$1",
      [neutralBaseline.id],
    )).rows[0]!.active_revision_id;
    await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings`, "PUT", {
      marketEditionId: ids.ksa, locale: "en", mode: "adapted", baselineId: neutralBaseline.id,
      baselineRevisionId: neutralActiveRevision, version: neutralKsaBinding.version,
      expectedDestinationRevisionId: neutralKsaBinding.materialized_revision_id,
      expectedActiveBaselineRevisionId: neutralActiveRevision,
    }), 403, "missing Shared authority cannot bind an intentional neutral baseline");
    await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings/${neutralKsaBinding.id}/resolve`, "POST", {
      action: "reset", baselineRevisionId: neutralActiveRevision, version: neutralKsaBinding.version,
    }), 403, "missing Shared authority cannot resolve an intentional neutral baseline");
    assert.deepEqual((await admin.query<{
      mode: string; baseline_id: string | null; based_on_baseline_revision_id: string | null;
      materialized_revision_id: string | null; version: number;
    }>(
      `SELECT mode,baseline_id,based_on_baseline_revision_id,materialized_revision_id,version
         FROM cms_market_edition_bindings WHERE id=$1`,
      [neutralKsaBinding.id],
    )).rows[0], neutralBindingPointer, "denied neutral bind/resolve leave every binding pointer unchanged");
    await status(
      await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings/${neutralMatrix.bindings[0].id}/compare`, "GET"),
      403, "regional-only authority cannot compare raw neutral shared content",
    );
    const regionalOnlyNeutral = JSON.parse(await status(
      await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "GET"),
      200, "regional-only view receives neutral baseline recovery record",
    )) as { baselines: Array<{ snapshot: Record<string, unknown> | null; mediaReferences: unknown[]; authorityKind: string }> };
    assert.equal(regionalOnlyNeutral.baselines[0]?.snapshot, null,
      "a single regional View grant cannot expose raw intentional-neutral shared content");
    assert.deepEqual(regionalOnlyNeutral.baselines[0]?.mediaReferences, [],
      "a single regional View grant cannot expose neutral baseline media pins");
    assert.equal(regionalOnlyNeutral.baselines[0]?.authorityKind, "neutral",
      "permission-denied neutral authority remains distinguishable from unresolved history");
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'platform','view','shared','ksa'),($1,'platform','edit','shared','ksa')`,
      [ids.author],
    );
    const prospectiveDestinationId = randomUUID();
    await admin.query(
      `INSERT INTO market_editions(id,code,display_name,default_locale,fallback_locale,enabled,is_canonical)
       VALUES ($1,'uk','UK','en',NULL,true,false)`,
      [prospectiveDestinationId],
    );
    await admin.query(
      `INSERT INTO cms_market_editions(id,document_id,market,locale,publication_state,content_mode)
       VALUES ($1,$2,'uk','en','draft','custom')`,
      [randomUUID(), neutralCreated.id],
    );
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'platform','view','regional','uk'),($1,'platform','edit','regional','uk')`,
      [ids.author],
    );
    await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings`, "PUT", {
      marketEditionId: prospectiveDestinationId, locale: "en", mode: "shared", baselineId: neutralBaseline.id,
      baselineRevisionId: neutralActiveRevision, version: 0,
      expectedDestinationRevisionId: null,
      expectedActiveBaselineRevisionId: neutralActiveRevision,
    }), 403, "regional Edit on a newly prospective destination cannot bypass its missing Shared authority");
    assert.equal((await admin.query(
      `SELECT 1 FROM cms_market_edition_bindings
        WHERE document_id=$1 AND market_edition_id=$2 AND locale='en'`,
      [neutralCreated.id, prospectiveDestinationId],
    )).rowCount, 0, "prospective-scope denial does not create a new destination binding");
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'platform','view','shared','uk'),($1,'platform','edit','shared','uk')`,
      [ids.author],
    );
    await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings`, "PUT", {
      marketEditionId: prospectiveDestinationId, locale: "en", mode: "shared", baselineId: neutralBaseline.id,
      baselineRevisionId: neutralActiveRevision, version: 0,
      expectedDestinationRevisionId: null,
      expectedActiveBaselineRevisionId: neutralActiveRevision,
    }), 200, "full Shared authority including the newly prospective destination can bind neutral content");
    await admin.query(
      `UPDATE cms_market_edition_bindings
          SET mode='independent',baseline_id=NULL,based_on_baseline_revision_id=NULL
        WHERE document_id=$1 AND baseline_id=$2`,
      [neutralCreated.id, neutralBaseline.id],
    );
    const independentNeutralMatrix = JSON.parse(await status(
      await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "GET"),
      200, "fully authorized actor still reads an unused intentional neutral baseline",
    )) as { baselines: Array<{ id: string; snapshot: Record<string, unknown> | null; canEdit: boolean }> };
    const independentNeutralBaseline = independentNeutralMatrix.baselines.find((baseline) => baseline.id === neutralBaseline.id);
    assert.ok(independentNeutralBaseline?.snapshot, "unused intentional neutral baseline remains visible");
    assert.equal(independentNeutralBaseline?.canEdit, true, "unused intentional neutral baseline remains editable under prospective authority");
    const neutralRegionalSource = await admin.query<{ id: string }>(
      `SELECT revision.id FROM cms_revisions revision
        JOIN cms_market_editions edition ON edition.id=revision.edition_id
       WHERE edition.document_id=$1 AND edition.market='uae' AND edition.locale='en'
       ORDER BY revision.revision_number DESC LIMIT 1`,
      [neutralCreated.id],
    );
    const reanchoredNeutral = JSON.parse(await status(await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "POST", {
      locale: "en", sourceRevisionId: neutralRegionalSource.rows[0].id, expectedRevisionNumber: 3,
    }), 201, "a neutral baseline may explicitly re-anchor to an exact regional revision")) as { revisionId: string };
    const unknownAfterReanchor = randomUUID();
    await admin.query(
      `INSERT INTO cms_shared_baseline_revisions
         (id,baseline_id,revision_number,snapshot,media_references,content_digest,source_revision_id,governing_source_revision_id,created_by_user_id)
       VALUES ($1,$2,5,$3,'[]'::jsonb,'unknown-after-reanchor',NULL,NULL,$4)`,
      [unknownAfterReanchor, neutralBaseline.id, neutralSuccessor, ids.author],
    );
    await admin.query(
      "UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1",
      [neutralBaseline.id, unknownAfterReanchor],
    );
    // Re-introduce one managed destination solely to exercise endpoint
    // authorization against the active unresolved revision. The preceding
    // assertion already proved the all-independent baseline remains visible.
    await admin.query(
      `UPDATE cms_market_edition_bindings
          SET mode='shared',baseline_id=$2,based_on_baseline_revision_id=$3
        WHERE id=$1`,
      [neutralKsaBinding.id, neutralBaseline.id, reanchoredNeutral.revisionId],
    );
    const unresolvedBindingPointer = (await admin.query<{
      mode: string; baseline_id: string | null; based_on_baseline_revision_id: string | null;
      materialized_revision_id: string | null; version: number;
    }>(
      `SELECT mode,baseline_id,based_on_baseline_revision_id,materialized_revision_id,version
         FROM cms_market_edition_bindings WHERE id=$1`,
      [neutralKsaBinding.id],
    )).rows[0]!;
    const unresolvedBind = await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings`, "PUT", {
      marketEditionId: ids.ksa, locale: "en", mode: "adapted", baselineId: neutralBaseline.id,
      baselineRevisionId: unknownAfterReanchor, version: unresolvedBindingPointer.version,
      expectedDestinationRevisionId: unresolvedBindingPointer.materialized_revision_id,
      expectedActiveBaselineRevisionId: unknownAfterReanchor,
    });
    const unresolvedBindBody = await unresolvedBind.text();
    assert.notEqual(unresolvedBind.status, 200, `unresolved baseline must not authorize a binding mutation: ${unresolvedBindBody}`);
    assert.doesNotMatch(unresolvedBindBody, /changed after comparison/i,
      "unresolved-origin denial must not be misreported as a stale comparison");
    assert.match(unresolvedBindBody, /baseline|source|authorized|assigned|resolve/i,
      "unresolved binding response must identify an authorization or recovery condition");
    const unresolvedResolve = await request("author", `/api/documents/${neutralCreated.id}/shared-market/bindings/${neutralKsaBinding.id}/resolve`, "POST", {
      action: "reset", baselineRevisionId: unknownAfterReanchor, version: unresolvedBindingPointer.version,
    });
    const unresolvedResolveBody = await unresolvedResolve.text();
    assert.notEqual(unresolvedResolve.status, 200, `unresolved baseline must not authorize a resolution mutation: ${unresolvedResolveBody}`);
    assert.doesNotMatch(unresolvedResolveBody, /changed after comparison/i,
      "unresolved-origin resolution denial must not be misreported as a stale comparison");
    assert.match(unresolvedResolveBody, /baseline|source|authorized|assigned|resolve/i,
      "unresolved resolution response must identify an authorization or recovery condition");
    assert.deepEqual((await admin.query<{
      mode: string; baseline_id: string | null; based_on_baseline_revision_id: string | null;
      materialized_revision_id: string | null; version: number;
    }>(
      `SELECT mode,baseline_id,based_on_baseline_revision_id,materialized_revision_id,version
         FROM cms_market_edition_bindings WHERE id=$1`,
      [neutralKsaBinding.id],
    )).rows[0], unresolvedBindingPointer, "unresolved bind/resolve denials leave every pointer unchanged");
    const unknownAfterReanchorMatrix = JSON.parse(await status(
      await request("author", `/api/documents/${neutralCreated.id}/shared-market`, "GET"),
      200, "unknown null-origin successor after regional re-anchor is listed for recovery",
    )) as { baselines: Array<{ snapshot: Record<string, unknown> | null; mediaReferences: unknown[]; authorityKind: string }> };
    assert.equal(unknownAfterReanchorMatrix.baselines[0]?.snapshot, null,
      "an unproven null-origin successor cannot inherit the original neutral classification after re-anchor");
    assert.deepEqual(unknownAfterReanchorMatrix.baselines[0]?.mediaReferences, [],
      "an unproven null-origin successor cannot expose baseline media pins after re-anchor");
    assert.equal(unknownAfterReanchorMatrix.baselines[0]?.authorityKind, "unresolved",
      "unproven null-origin history is not presented as intentionally neutral");
    // UK exists only to prove a newly prospective neutral destination cannot
    // bypass Shared authority. Retire it before the separate UAE/KSA fixture
    // below deliberately narrows its prospective market catalogue.
    await admin.query("UPDATE market_editions SET enabled=false WHERE id=$1", [prospectiveDestinationId]);
    // The creation request is intentionally addressed to every enabled shared
    // destination. Revert to the narrow UAE-only matrix before the negative
    // source-establishment and KSA non-enumeration assertions below.
    await admin.query("DELETE FROM cms_user_capability_grants WHERE user_id=$1", [ids.author]);
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'platform','view','regional','uae'),($1,'platform','edit','regional','uae')`,
      [ids.author],
    );
    // The create contract initially materializes a legacy shared source. This
    // fixture subsequently exercises exact UAE regional content/media rights,
    // so make that source a real custom UAE edition before narrowing authority.
    await admin.query(
      "UPDATE cms_market_editions SET content_mode='custom' WHERE document_id=$1 AND market='uae' AND locale='en'",
      [documentId],
    );
    const legacyExactSource = await admin.query<{ id: string }>(
      `SELECT r.id FROM cms_revisions r
        JOIN cms_market_editions edition ON edition.id=r.edition_id
       WHERE edition.document_id=$1 AND edition.market='uae' AND edition.locale='en'
       ORDER BY r.revision_number DESC LIMIT 1`,
      [documentId],
    );
    const otherKindDocument = randomUUID();
    const sharedSourceDocument = randomUUID();
    const sharedSourceEdition = randomUUID();
    await admin.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'person','other-kind','Other kind',$2,'active'),
              ($3,'platform','shared-source-kind','Shared source',$2,'active')`,
      [otherKindDocument, ids.author, sharedSourceDocument],
    );
    await admin.query(
      `INSERT INTO cms_market_editions(id,document_id,market,locale,publication_state,content_mode)
       VALUES ($1,$2,'uae','en','draft','custom'),($3,$4,'shared-source','en','draft','shared')`,
      [randomUUID(), otherKindDocument, sharedSourceEdition, sharedSourceDocument],
    );
    // 0041 must remain additive even with legacy append-only baseline history.
    // Rehearse the schema-maintenance dry run against an existing row protected
    // by the immutable trigger, roll it back, then install the column for the
    // remainder of this isolated HTTP fixture.
    const immutableBaseline = randomUUID();
    const immutableBaselineRevision = randomUUID();
    await admin.query(
      `INSERT INTO cms_shared_baselines(id,document_id,locale,active_revision_id,created_by_user_id)
       VALUES ($1,$2,'en-GB',NULL,$3)`,
       [immutableBaseline, documentId, ids.author],
    );
    await admin.query(
      `INSERT INTO cms_shared_baseline_revisions
         (id,baseline_id,revision_number,snapshot,content_digest,source_revision_id,created_by_user_id)
       VALUES ($1,$2,1,'{}'::jsonb,'immutable-legacy',$3,$4)`,
      [immutableBaselineRevision, immutableBaseline, legacyExactSource.rows[0].id, ids.author],
    );
    // `CREATE TABLE ... LIKE` used by this isolated fixture does not copy
    // triggers, so install the production append-only guard explicitly before
    // rehearsing the migration against an existing history row.
    await admin.query(
      `CREATE TRIGGER cms_shared_baseline_revisions_immutable
         BEFORE UPDATE OR DELETE ON cms_shared_baseline_revisions
         FOR EACH ROW EXECUTE FUNCTION public.cms_reject_shared_history_mutation()`,
    );
    const governingColumnBeforeDryRun = (await admin.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema=current_schema() AND table_name='cms_shared_baseline_revisions'
          AND column_name='governing_source_revision_id'`,
    )).rowCount;
    await admin.query("BEGIN");
    await admin.query(migration0041);
    assert.equal((await admin.query<{ count: number }>(
      `SELECT count(*)::int count FROM pg_trigger
        WHERE tgrelid='cms_shared_baseline_revisions'::regclass
          AND tgname='cms_shared_baseline_revisions_immutable' AND NOT tgisinternal`,
    )).rows[0].count, 1, "legacy baseline immutable trigger remains installed during 0041 dry run");
    const dryRunLegacy = (await admin.query<{ source_revision_id: string | null; governing_source_revision_id: string | null }>(
      "SELECT source_revision_id,governing_source_revision_id FROM cms_shared_baseline_revisions WHERE id=$1",
      [immutableBaselineRevision],
    )).rows[0];
    assert.equal(dryRunLegacy.source_revision_id, legacyExactSource.rows[0].id,
      "0041 dry run preserves exact-copy provenance on immutable legacy history");
    assert.equal(dryRunLegacy.governing_source_revision_id, null,
      "0041 does not fabricate a physical governing origin on immutable legacy history");
    await admin.query("ROLLBACK");
    assert.equal((await admin.query(
      `SELECT 1 FROM information_schema.columns
        WHERE table_schema=current_schema() AND table_name='cms_shared_baseline_revisions'
          AND column_name='governing_source_revision_id'`,
    )).rowCount, governingColumnBeforeDryRun,
    "0041 dry run restores the governing-origin column to its prior schema state");
    await admin.query(migration0041);
    const installedLegacy = (await admin.query<{ source_revision_id: string | null; governing_source_revision_id: string | null }>(
      "SELECT source_revision_id,governing_source_revision_id FROM cms_shared_baseline_revisions WHERE id=$1",
      [immutableBaselineRevision],
    )).rows[0];
    assert.equal(installedLegacy.source_revision_id, legacyExactSource.rows[0].id,
      "0041 install leaves immutable exact-copy provenance unchanged");
    assert.equal(installedLegacy.governing_source_revision_id, null,
      "0041 install leaves legacy authority to the validated runtime compatibility fallback");
    await status(
      await request("author", `/api/documents/${otherKindDocument}?market=uae&locale=en`, "GET"),
      403, "explicit platform grant cannot read another document kind",
    );
    await status(
      await request("author", `/api/documents/${sharedSourceDocument}?market=shared-source&locale=en`, "GET"),
      403, "shared source is denied without grants for every affected destination",
    );
    await status(
      await request("emptyAdmin", `/api/documents/${documentId}?market=uae&locale=en`, "GET"),
      403, "configured-empty admin cannot read a document",
    );
    await admin.query(
      `INSERT INTO cms_market_editions(document_id,market,locale,publication_state,content_mode)
       VALUES ($1,'ksa','en','draft','custom')`,
      [documentId],
    );
    const ksaEdition = await admin.query<{ id: string }>(
      "SELECT id FROM cms_market_editions WHERE document_id=$1 AND market='ksa'", [documentId],
    );
    const ksaRevision = randomUUID();
    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
        VALUES ($1,$2,1,$3,'ksa-scope','draft',$4,'Scoped KSA fixture')`,
      [ksaRevision, ksaEdition.rows[0].id, { slug: "ksa-scope", title: "KSA", content: platform }, ids.author],
    );
    await admin.query(
      `INSERT INTO cms_market_edition_bindings(document_id,market_edition_id,locale,mode,baseline_id,version,updated_by_user_id)
       VALUES ($1,$2,'en','independent',NULL,1,$3)`,
      [documentId, ids.ksa, ids.author],
    );
    const uaeRevisionForShared = await admin.query<{ id: string; payload: Record<string, unknown>; revision_number: number }>(
      `SELECT r.id,r.payload,r.revision_number FROM cms_revisions r
        JOIN cms_market_editions e ON e.id=r.edition_id
       WHERE e.document_id=$1 AND e.market='uae'
       ORDER BY r.revision_number DESC LIMIT 1`,
      [documentId],
    );
    const newerDraftPayload = { ...uaeRevisionForShared.rows[0].payload, summary: "Newer unselected UAE draft." };
    await admin.query(
      `INSERT INTO cms_revisions(edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ((SELECT id FROM cms_market_editions WHERE document_id=$1 AND market='uae' AND locale='en'),
               $2,$3,'newer-unselected-draft','draft',$4,'Newer draft must not replace selected source')`,
      [documentId, uaeRevisionForShared.rows[0].revision_number + 1, newerDraftPayload, ids.author],
    );
    await admin.query(
      `UPDATE cms_market_editions
          SET published_revision_id=$2,publication_state='published'
        WHERE document_id=$1 AND market='uae' AND locale='en'`,
      [documentId, uaeRevisionForShared.rows[0].id],
    );
    await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en",
      sourceRevisionId: uaeRevisionForShared.rows[0].id,
      snapshot: uaeRevisionForShared.rows[0].payload,
    }), 403, "regional-only UAE Edit cannot establish a shared source affecting KSA");
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'platform','edit','regional','ksa'),($1,'platform','view','shared','uae'),
              ($1,'platform','edit','shared','uae')`,
      [ids.author],
    );
    await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en", sourceRevisionId: uaeRevisionForShared.rows[0].id,
      snapshot: newerDraftPayload,
    }), 409, "a supplied snapshot that differs from the selected published source is rejected");
    const firstBaseline = JSON.parse(await status(
      await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: uaeRevisionForShared.rows[0].id,
      }),
      201,
      "fully granted author persists the selected older published payload rather than a newer draft",
    )) as { id: string; revisionId: string; snapshot: Record<string, unknown> };
    assert.deepEqual(firstBaseline.snapshot, uaeRevisionForShared.rows[0].payload,
      "server derives the baseline snapshot from the locked selected source");
    await admin.query("DELETE FROM cms_user_capability_grants WHERE user_id=$1 AND market_code='ksa'", [ids.author]);
    await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en", snapshot: uaeRevisionForShared.rows[0].payload, expectedRevisionNumber: 1,
    }), 403, "regional-only authority cannot replace an unused baseline without naming its durable source");
    await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en", sourceRevisionId: uaeRevisionForShared.rows[0].id,
      snapshot: uaeRevisionForShared.rows[0].payload, expectedRevisionNumber: 1,
    }), 403, "regional-only authority cannot replace an unused baseline with prospective KSA reach");
    await admin.query(
      "INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code) VALUES ($1,'platform','edit','regional','ksa')",
      [ids.author],
    );
    const unusedSuccessor = JSON.parse(await status(
      await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
        locale: "en", sourceRevisionId: uaeRevisionForShared.rows[0].id, expectedRevisionNumber: 1,
      }),
      201,
      "fully granted author can replace an unused baseline using prospective same-language destinations",
    )) as { revisionId: string };
    await admin.query("DELETE FROM cms_user_capability_grants WHERE user_id=$1 AND market_code='ksa'", [ids.author]);
    await admin.query(
      `INSERT INTO cms_market_edition_bindings
         (document_id,market_edition_id,locale,mode,baseline_id,based_on_baseline_revision_id,version,updated_by_user_id)
       VALUES ($1,$2,'en','shared',$3,$4,1,$5)`,
      [documentId, ids.uae, firstBaseline.id, unusedSuccessor.revisionId, ids.author],
    );
    const unrelatedBaseline = randomUUID();
    const unrelatedBaselineRevision = randomUUID();
    await admin.query(
      `INSERT INTO cms_shared_baselines(id,document_id,locale,active_revision_id,created_by_user_id)
       VALUES ($1,$2,'fr',NULL,$3)`,
      [unrelatedBaseline, documentId, ids.author],
    );
    await admin.query(
      `INSERT INTO cms_shared_baseline_revisions(id,baseline_id,revision_number,snapshot,content_digest,created_by_user_id)
       VALUES ($1,$2,1,$3,'unrelated-fr',$4)`,
      [unrelatedBaselineRevision, unrelatedBaseline, uaeRevisionForShared.rows[0].payload, ids.author],
    );
    await admin.query("UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1", [
      unrelatedBaseline, unrelatedBaselineRevision,
    ]);
    await admin.query(
      `INSERT INTO cms_market_edition_bindings
         (document_id,market_edition_id,locale,mode,baseline_id,based_on_baseline_revision_id,version,updated_by_user_id)
       VALUES ($1,$2,'fr','shared',$3,$4,1,$5)`,
      [documentId, ids.ksa, unrelatedBaseline, unrelatedBaselineRevision, ids.author],
    );
    const boundSuccessor = JSON.parse(await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en", sourceRevisionId: uaeRevisionForShared.rows[0].id,
      snapshot: uaeRevisionForShared.rows[0].payload, expectedRevisionNumber: 2,
    }), 201, "an en successor ignores a bound unrelated fr baseline rather than requiring KSA authority")) as {
      revisionNumber: number;
    };
    const directSuccessorSnapshot = {
      ...uaeRevisionForShared.rows[0].payload,
      summary: "Direct neutral successor content, intentionally distinct from the governing source.",
    };
    const directSuccessor = JSON.parse(await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en", snapshot: directSuccessorSnapshot, expectedRevisionNumber: boundSuccessor.revisionNumber,
    }), 201, "fully authorized no-source direct successor persists its edited snapshot")) as {
      snapshot: Record<string, unknown>; revisionNumber: number;
    };
    assert.deepEqual(directSuccessor.snapshot, directSuccessorSnapshot,
      "no-source direct successor does not replace its explicit edited snapshot with the governing-source payload");
    const secondDirectSnapshot = { ...directSuccessorSnapshot, summary: "Second direct successor remains independently authored." };
    await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "en", snapshot: secondDirectSnapshot, expectedRevisionNumber: directSuccessor.revisionNumber,
    }), 201, "a second no-source successor retains durable governing authority without becoming an exact source copy");
    const nullOriginRevision = await admin.query<{ revision_number: number }>(
      "SELECT revision_number FROM cms_shared_baseline_revisions WHERE id=$1",
      [unrelatedBaselineRevision],
    );
    await status(await request("author", `/api/documents/${documentId}/shared-market`, "POST", {
      locale: "fr", snapshot: directSuccessorSnapshot, expectedRevisionNumber: 1,
    }), 409, "a null-origin neutral baseline requires an explicit durable source selection");
    assert.equal((await admin.query<{ revision_number: number }>(
      "SELECT revision_number FROM cms_shared_baseline_revisions WHERE id=$1",
      [unrelatedBaselineRevision],
    )).rows[0].revision_number, nullOriginRevision.rows[0].revision_number,
    "null-origin rejection leaves the active baseline revision unchanged");
    await admin.query(
      "INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code) VALUES ($1,'platform','view','regional','ksa')",
      [ids.author],
    );
    const authorityMatrix = JSON.parse(await status(
      await request("author", `/api/documents/${documentId}/shared-market`, "GET"),
      200, "shared-market authority matrix is available",
    )) as { baselines: Array<{
      locale: string; canEdit: boolean; editReason: string | null;
      snapshot: Record<string, unknown> | null; mediaReferences: unknown[];
    }> };
    const nullOriginBaseline = authorityMatrix.baselines.find((baseline) => baseline.locale === "fr");
    const editedBaseline = authorityMatrix.baselines.find((baseline) => baseline.locale === "en");
    assert.equal(editedBaseline?.canEdit, true, "twice-edited no-source baseline remains visible and editable through governing authority");
    assert.equal(nullOriginBaseline?.canEdit, false, "null-origin baseline DTO denies editing");
    assert.match(nullOriginBaseline?.editReason ?? "", /no durable real-market origin/i,
      "null-origin baseline DTO exposes the recoverable source-selection reason");
    assert.equal(nullOriginBaseline?.snapshot, null, "null-origin baseline DTO redacts raw shared snapshot");
    assert.deepEqual(nullOriginBaseline?.mediaReferences, [], "null-origin baseline DTO redacts raw media pins");
    await admin.query(
      "DELETE FROM cms_user_capability_grants WHERE user_id=$1 AND capability='view' AND scope='regional' AND market_code='ksa'",
      [ids.author],
    );
    await admin.query(
      "INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES ($1,$2,$3,$4)",
      [ids.asset, ids.version, documentId, `revision:${ksaRevision}`],
    );
    await admin.query(
      "INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES ($1,$2,$3,$4)",
      [ids.ksaOnlyAsset, ids.ksaOnlyVersion, documentId, `revision:${ksaRevision}`],
    );
    await status(await request("author", `/api/documents/${documentId}?market=ksa&locale=en`, "GET"), 403, "explicit UAE grant cannot read KSA");
    await status(await request("author", `/api/media/${ids.asset}`, "GET"), 200, "actual UAE media reference authorizes media read");
    await status(
      await request("emptyAdmin", `/api/media/${ids.asset}`, "GET"),
      404,
      "configured-empty admin receives the media non-enumeration response for an asset an authorized actor can read",
    );
    await status(await request("author", `/api/media/${ids.ksaOnlyAsset}`, "GET"), 404, "actual KSA-only media reference cannot leak or enumerate");

    const revision = await admin.query<{ id: string; edition_id: string }>(
      "SELECT id,edition_id FROM cms_revisions WHERE edition_id=(SELECT id FROM cms_market_editions WHERE document_id=$1 AND market='uae') ORDER BY revision_number DESC LIMIT 1",
      [documentId],
    );
    const requestId = randomUUID();
    await admin.query(
      "UPDATE cms_revisions SET workflow_state='in-review' WHERE id=$1",
      [revision.rows[0].id],
    );
    await admin.query(
      `INSERT INTO cms_review_requests(id,edition_id,revision_id,requester_user_id,reviewer_user_id,status)
       VALUES ($1,$2,$3,$4,$5,'requested')`,
      [requestId, revision.rows[0].edition_id, revision.rows[0].id, ids.author, ids.reviewer],
    );
    await status(await request("reviewer", `/api/editorial-work/review-requests/${requestId}/decision`, "POST", {
      decision: "approved", note: "Exact scoped review.",
    }), 200, "viewer role with explicit Review can decide non-self UAE review");
    await admin.query("DELETE FROM cms_user_capability_grants WHERE user_id=$1", [ids.author]);
    await status(await request("author", `/api/documents/${documentId}?market=uae&locale=en`, "GET"), 403, "grant revocation denies an already-issued MFA session");
    await status(await request("emptyAdmin", `/api/documents/${documentId}`, "DELETE"), 403, "configured-empty admin cannot delete");
  } finally {
    if (server) await new Promise<void>((resolve) => server!.close(() => resolve()));
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end();
    if (databaseUrl === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = databaseUrl;
    if (sessionSecret === undefined) delete process.env.SESSION_SECRET; else process.env.SESSION_SECRET = sessionSecret;
  }
});