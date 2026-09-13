import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";
import {
  documentPublishedAvailabilityClause,
  industryExactMarketDeliveryClause,
  industryDestinationEligibilityClause,
} from "../src/lib/availability";
import { projectIndustrySnapshotForMarket } from "@workspace/api-zod";

test("published document availability is an authoritative, fail-closed pre-fallback gate", () => {
  assert.match(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /cms_document_market_availability/,
  );
  assert.match(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /requested\.code=\$3/,
  );
  assert.match(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /availability\.locale=\$4/,
  );
  assert.match(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /cms_document_availability_states authoritative/,
  );
  assert.doesNotMatch(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /authoritative\.published_version/,
  );
  assert.match(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /availability\.published_decision IS DISTINCT FROM 'off'/,
  );
  assert.doesNotMatch(
    documentPublishedAvailabilityClause("d.id", "$3", "$4"),
    /draft_decision/,
  );
});

test("all public document delivery selectors apply published availability before fallback", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/public.ts"), "utf8");

  // Collection, detail, hero, and contact selection use the request's market
  // before candidate rank can choose a locale or market fallback.
  assert.equal(
    (source.match(/documentPublishedAvailabilityClause\("d\.id", "\$3", "\$(?:4|5)"\)/g) ?? []).length,
    4,
  );
  // Sitemap custom rows are checked at their own destination; shared sitemap
  // rows are expanded to the enabled destination market/locale pairs.
  assert.equal(
    (source.match(/documentPublishedAvailabilityClause\("d\.id", "e\.market", "e\.locale"\)/g) ?? []).length,
    1,
  );
  assert.equal(
    (source.match(/documentPublishedAvailabilityClause\("d\.id", "destination\.code", "destination_locale\.locale"\)/g) ?? []).length,
    1,
  );
  assert.doesNotMatch(source, /cms_person_market_availability/);
  assert.match(source, /referencedRevisionHasEligibleDestinationClause\("d\.id", "e\.id", "r\.id"\)/);
  const mediaEligibility = source.slice(
    source.indexOf("export function referencedRevisionHasEligibleDestinationClause"),
    source.indexOf("const publicLimiter"),
  );
  assert.match(mediaEligibility, /documentPublishedAvailabilityClause\(/);
  assert.match(mediaEligibility, /"destination\.code"/);
  assert.match(mediaEligibility, /"destination_locale\.locale"/);
  assert.doesNotMatch(mediaEligibility, /availability\.published_decision='off'/);
  assert.match(source, /e\.id=delivery\.shared_source_edition_id/);
  assert.doesNotMatch(source, /e\.published_revision_id=delivery\.shared_source_revision_id/);
  assert.match(source, /r\.id=e\.published_revision_id/);
  assert.match(source, /e\.published_revision_id=delivery\.published_source_revision_id/);
  assert.match(
    source,
    /industryExactMarketDeliveryClause\("d", "e", "destination\.code"\)/,
  );

  for (const [marker, limit, ranksFallback] of [
    ['router.get(\n  "/public/content",', "LIMIT $5", false],
    ['router.get("/public/hero-films/:slot"', "LIMIT 1", true],
    ['router.get("/public/contact-configuration"', "LIMIT 1", true],
    ['"/public/content/:market/:locale/:kind/:slug"', "LIMIT 1", true],
  ]) {
    const start = source.indexOf(marker);
    assert.ok(start >= 0, `missing ${marker}`);
    const end = source.indexOf(limit, start);
    assert.ok(end >= 0, `missing ${limit} for ${marker}`);
    const selection = source.slice(start, end + limit.length);
    const availability = selection.indexOf("documentPublishedAvailabilityClause");
    assert.ok(availability >= 0, `${marker} lacks an availability exclusion`);
    assert.ok(
      selection.includes("deliverySourceClause"),
      `${marker} does not resolve the published shared source`,
    );
    if (ranksFallback) {
      const rankingBoundary = marker === '"/public/content/:market/:locale/:kind/:slug"'
        ? selection.indexOf(")\n       SELECT id")
        : selection.indexOf("ORDER BY CASE");
      assert.ok(
        availability < rankingBoundary,
        `${marker} ranks a fallback before checking the requested destination`,
      );
    }
  }
  const contactStart = source.indexOf('router.get("/public/contact-configuration"');
  const contactOrder = source.indexOf("ORDER BY CASE", contactStart);
  const contactPayloadGate = source.indexOf("AND ${PUBLIC_PAYLOAD_SQL}", contactStart);
  assert.ok(contactPayloadGate >= contactStart && contactPayloadGate < contactOrder);
});

test("navigation maps CMS routes before exposing policy destinations", async () => {
  const source = await readFile(resolve(process.cwd(), "src/lib/navigation-policy.ts"), "utf8");
  assert.match(source, /cmsPublicRoute/);
  assert.match(source, /industryExactMarketDeliveryClause/);
  assert.match(source, /industryExactMarketDeliveryClause\("d", "e", "\$1"\)/);
  assert.match(source, /cms_document_availability_states delivery/);
  assert.match(source, /e\.content_mode='shared'/);
  assert.match(source, /r\.id=e\.published_revision_id/);
  assert.doesNotMatch(source, /e\.published_revision_id=delivery\.shared_source_revision_id/);
  assert.match(source, /e\.published_revision_id=delivery\.published_source_revision_id/);
  assert.match(source, /routes\.known\.has\(destination\) && !routes\.available\.has\(destination\)/);
});

test("relocating a shared industry delivery address retains its editorial market", async () => {
  const source = await readFile(resolve(process.cwd(), "src/routes/public.ts"), "utf8");
  assert.match(source, /COALESCE\(e\.editorial_market,e\.market\) editorial_market/);
  assert.match(source, /String\(row\.editorial_market \?\? row\.market\)/);

  // The delivery address changes from KSA to the internal shared-source/und
  // address. Banking remains a KSA-approved source because its editorial
  // origin is stable; passing the relocated address as the origin would reject
  // the same live approved revision.
  const approvedBanking = {
    slug: "financial-services",
    markets: ["ksa"],
    content: {
      name: "Financial Services",
      bankingPov: { market: "ksa" },
    },
  };
  const relocatedEdition = { market: "shared-source", editorialMarket: "ksa" };
  const beforeRelocation = projectIndustrySnapshotForMarket(approvedBanking, "ksa", "ksa");
  const afterRelocation = projectIndustrySnapshotForMarket(
    approvedBanking,
    "ksa",
    relocatedEdition.editorialMarket,
  );
  assert.deepEqual(afterRelocation, beforeRelocation);
  assert.doesNotThrow(() => projectIndustrySnapshotForMarket(approvedBanking, "ksa", "ksa"));
  assert.throws(
    () => projectIndustrySnapshotForMarket(approvedBanking, "ksa", "shared-source"),
    /cannot fall back/,
  );
});

test("media eligibility admits only the exact source selected for an eligible destination", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
  concurrency: false,
}, async () => {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  const schema = `public_media_source_${randomUUID().replaceAll("-", "")}`;
  try {
    const {
      referencedRevisionHasEligibleDestinationClause,
      publishedCustomSourceExistsClause,
    } = await import("../src/routes/public");
    await client.query(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}";`);
    await client.query(`
      CREATE TABLE market_editions (
        id text PRIMARY KEY, code text NOT NULL UNIQUE, default_locale text NOT NULL,
        fallback_market_code text, fallback_locale text, is_canonical boolean NOT NULL DEFAULT false,
        enabled boolean NOT NULL DEFAULT true
      );
      CREATE TABLE cms_documents (
        id text PRIMARY KEY, kind text NOT NULL DEFAULT 'platform', status text NOT NULL DEFAULT 'active',
        canonical_slug text
      );
      CREATE TABLE cms_market_editions (
        id text PRIMARY KEY, document_id text NOT NULL, market text NOT NULL, locale text NOT NULL,
        content_mode text NOT NULL, publication_state text NOT NULL, published_at timestamptz,
        published_revision_id text, editorial_market text, updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE cms_revisions (
        id text PRIMARY KEY, edition_id text NOT NULL, workflow_state text NOT NULL,
        payload jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE TABLE cms_document_availability_states (
        document_id text PRIMARY KEY, published_version integer NOT NULL DEFAULT 0,
        shared_source_edition_id text, published_source_revision_id text
      );
      CREATE TABLE cms_document_market_availability (
        document_id text NOT NULL, market_edition_id text NOT NULL, locale text NOT NULL,
        published_decision text, PRIMARY KEY (document_id, market_edition_id, locale)
      );
      -- The public authority predicates are installed in production by the
      -- shared-market migration. Keep this isolated legacy-delivery fixture
      -- unmanaged while providing its exact referenced table shape.
      CREATE TABLE cms_market_edition_bindings (
        id text PRIMARY KEY, document_id text NOT NULL, market_edition_id text NOT NULL,
        locale text NOT NULL, mode text NOT NULL
      );
      CREATE TABLE cms_resolved_market_revisions (
        binding_id text NOT NULL, cms_revision_id text NOT NULL
      );
      CREATE TABLE cms_audit_events (
        target_type text NOT NULL, target_id text NOT NULL, action text NOT NULL,
        metadata jsonb NOT NULL DEFAULT '{}'::jsonb
      );
      CREATE TABLE cms_media_references (
        asset_id text NOT NULL, document_id text NOT NULL, field_path text NOT NULL,
        media_version_id text NOT NULL
      );
    `);
    await client.query(`
      INSERT INTO market_editions (id,code,default_locale,is_canonical) VALUES
        ('destination-ksa','ksa','en',false),('destination-uae','uae','en',true);
      INSERT INTO cms_documents (id,kind) VALUES
         ('mixed-document','platform'),('other-document','platform'),
         ('private-custom-document','platform'),('unapproved-custom-document','platform'),
         ('banking-document','industry'),('public-sector-document','industry')
       ON CONFLICT (id) DO UPDATE SET kind=EXCLUDED.kind;
      INSERT INTO cms_market_editions
         (id,document_id,market,locale,content_mode,publication_state,published_at,published_revision_id)
      VALUES
        ('mixed-shared','mixed-document','shared-source','und','shared','published',now(),'mixed-shared-revision'),
        ('mixed-ksa-custom','mixed-document','ksa','en','custom','published',now(),'mixed-custom-revision'),
        ('other-ksa-custom','other-document','ksa','en','custom','published',now(),'other-custom-revision'),
        ('private-shared','private-custom-document','shared-source','und','shared','published',now(),'private-shared-revision'),
        ('private-ksa-custom','private-custom-document','ksa','en','custom','published',now(),'private-custom-revision'),
        ('unapproved-shared','unapproved-custom-document','shared-source','und','shared','published',now(),'unapproved-shared-revision'),
         ('unapproved-ksa-custom','unapproved-custom-document','ksa','en','custom','published',now(),'unapproved-custom-revision'),
         ('banking-shared','banking-document','shared-source','und','shared','published',now(),'banking-shared-revision'),
          ('banking-uae-custom','banking-document','uae','en','custom','published',now(),'banking-custom-revision'),
          ('public-sector-shared','public-sector-document','shared-source','und','shared','published',now(),'public-sector-shared-revision');
       UPDATE cms_market_editions
          SET editorial_market=CASE id
            WHEN 'banking-shared' THEN 'uae'
            WHEN 'banking-uae-custom' THEN 'ksa'
          END
        WHERE id IN ('banking-shared','banking-uae-custom');
      INSERT INTO cms_revisions (id,edition_id,workflow_state,payload) VALUES
        ('mixed-shared-revision','mixed-shared','approved','{}'::jsonb),
        ('mixed-custom-revision','mixed-ksa-custom','approved','{}'::jsonb),
        ('other-custom-revision','other-ksa-custom','approved','{}'::jsonb),
        ('private-shared-revision','private-shared','approved','{}'::jsonb),
        ('private-custom-revision','private-ksa-custom','approved','{"content":{"visibility":"private"}}'::jsonb),
        ('unapproved-shared-revision','unapproved-shared','approved','{}'::jsonb),
         ('unapproved-custom-revision','unapproved-ksa-custom','draft','{}'::jsonb),
         ('banking-shared-revision','banking-shared','approved','{"content":{"bankingPov":{"market":"uae"}}}'::jsonb),
          ('banking-custom-revision','banking-uae-custom','approved','{"content":{"bankingPov":{"market":"ksa"}}}'::jsonb),
          ('public-sector-shared-revision','public-sector-shared','approved','{"slug":"public-sector","title":"Public Sector","content":{"visibility":"public"}}'::jsonb);
       UPDATE cms_documents
          SET canonical_slug=CASE id
            WHEN 'banking-document' THEN 'financial-services'
            WHEN 'public-sector-document' THEN 'public-sector'
          END
        WHERE id IN ('banking-document','public-sector-document');
      INSERT INTO cms_document_availability_states
        (document_id,published_version,shared_source_edition_id,published_source_revision_id)
      VALUES
        ('mixed-document',1,'mixed-shared','mixed-shared-revision'),
        ('other-document',1,NULL,NULL),
        ('private-custom-document',1,'private-shared','private-shared-revision'),
         ('unapproved-custom-document',1,'unapproved-shared','unapproved-shared-revision'),
          ('banking-document',1,'banking-shared','banking-shared-revision'),
          ('public-sector-document',1,'public-sector-shared','public-sector-shared-revision');
      INSERT INTO cms_document_market_availability
        (document_id,market_edition_id,locale,published_decision)
      VALUES
        ('mixed-document','destination-ksa','en','off'),
        ('mixed-document','destination-uae','en','show'),
        ('other-document','destination-ksa','en','show'),
        ('other-document','destination-uae','en','off'),
        ('private-custom-document','destination-ksa','en','show'),
        ('private-custom-document','destination-uae','en','off'),
        ('unapproved-custom-document','destination-ksa','en','show'),
         ('unapproved-custom-document','destination-uae','en','off'),
         ('banking-document','destination-ksa','en','off'),
          ('banking-document','destination-uae','en','show'),
          ('public-sector-document','destination-ksa','en','show'),
          ('public-sector-document','destination-uae','en','show');
      INSERT INTO cms_media_references (asset_id,document_id,field_path,media_version_id) VALUES
        ('custom-only','mixed-document','revision:mixed-custom-revision','custom-v1'),
        ('shared-asset','mixed-document','revision:mixed-shared-revision','shared-v1'),
        ('shared-asset','other-document','revision:other-custom-revision','other-v1'),
        ('private-custom-only','private-custom-document','revision:private-custom-revision','private-custom-v1'),
        ('private-custom-shared','private-custom-document','revision:private-shared-revision','private-shared-v1');
    `);
    const predicate = referencedRevisionHasEligibleDestinationClause("d.id", "e.id", "r.id");
    const eligibility = await client.query<{ document_id: string; asset_id: string; eligible: boolean }>(
      `SELECT d.id AS document_id,ref.asset_id,${predicate} AS eligible
         FROM cms_media_references ref
         JOIN cms_documents d ON d.id=ref.document_id
         JOIN cms_market_editions e ON e.document_id=d.id
         JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
        WHERE ref.field_path='revision:'||r.id
        ORDER BY d.id,e.id`,
    );
    assert.deepEqual(eligibility.rows, [
      { document_id: "mixed-document", asset_id: "custom-only", eligible: false },
      { document_id: "mixed-document", asset_id: "shared-asset", eligible: true },
      { document_id: "other-document", asset_id: "shared-asset", eligible: true },
      { document_id: "private-custom-document", asset_id: "private-custom-only", eligible: false },
      { document_id: "private-custom-document", asset_id: "private-custom-shared", eligible: true },
    ]);
    assert.deepEqual(
      (await client.query<{ asset_id: string }>(
        `SELECT DISTINCT ref.asset_id
           FROM cms_media_references ref
           JOIN cms_documents d ON d.id=ref.document_id
           JOIN cms_market_editions e ON e.document_id=d.id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
          WHERE ref.field_path='revision:'||r.id
            AND ${predicate}
          ORDER BY ref.asset_id`,
      )).rows,
      [{ asset_id: "private-custom-shared" }, { asset_id: "shared-asset" }],
    );
    const customSourceExists = publishedCustomSourceExistsClause(
      "d",
      "d.id",
      "destination.code",
      "'en'",
    );
    const sharedSitemapRows = await client.query<{ document_id: string }>(
      `SELECT d.id AS document_id
         FROM cms_documents d
         JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
         JOIN cms_market_editions e ON e.id=delivery.shared_source_edition_id
           AND e.document_id=d.id AND e.content_mode='shared'
           AND e.publication_state='published' AND e.published_at<=now()
           AND e.published_revision_id=delivery.published_source_revision_id
         JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
           AND r.workflow_state='approved'
         JOIN market_editions destination ON destination.code='ksa' AND destination.enabled=true
          WHERE d.id IN ('private-custom-document','unapproved-custom-document','banking-document','public-sector-document')
          AND ${documentPublishedAvailabilityClause("d.id", "destination.code", "'en'")}
           AND ${industryDestinationEligibilityClause("d", "e", "r", "destination.code")}
           AND ${industryExactMarketDeliveryClause("d", "e", "destination.code")}
          AND NOT ${customSourceExists}
        ORDER BY d.id`,
    );
    assert.deepEqual(sharedSitemapRows.rows, [
      { document_id: "private-custom-document" },
      { document_id: "unapproved-custom-document" },
    ]);
    const publicSectorUaeSitemap = await client.query<{ document_id: string }>(
      `SELECT d.id AS document_id
         FROM cms_documents d
         JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
         JOIN cms_market_editions e ON e.id=delivery.shared_source_edition_id
           AND e.document_id=d.id AND e.content_mode='shared'
           AND e.publication_state='published' AND e.published_at<=now()
           AND e.published_revision_id=delivery.published_source_revision_id
         JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
           AND r.workflow_state='approved'
         JOIN market_editions destination ON destination.code='uae' AND destination.enabled=true
        WHERE d.id='public-sector-document'
          AND ${documentPublishedAvailabilityClause("d.id", "destination.code", "'en'")}
          AND ${industryDestinationEligibilityClause("d", "e", "r", "destination.code")}
          AND ${industryExactMarketDeliveryClause("d", "e", "destination.code")}
          AND NOT ${publishedCustomSourceExistsClause("d", "d.id", "destination.code", "'en'")}`,
    );
    assert.deepEqual(publicSectorUaeSitemap.rows, [{ document_id: "public-sector-document" }]);
    const uaeCustomExists = publishedCustomSourceExistsClause(
      "d",
      "d.id",
      "destination.code",
      "'en'",
    );
    const bankingSelection = await client.query<{ edition_id: string }>(
      `SELECT source.id AS edition_id
         FROM cms_documents d
         JOIN market_editions destination ON destination.code='uae' AND destination.enabled=true
         JOIN cms_market_editions source ON source.document_id=d.id
         JOIN cms_revisions source_revision
           ON source_revision.id=source.published_revision_id
          AND source_revision.edition_id=source.id
          AND source_revision.workflow_state='approved'
        WHERE d.id='banking-document'
          AND source.publication_state='published'
          AND source.published_at<=now()
          AND ${industryDestinationEligibilityClause("d", "source", "source_revision", "destination.code")}
        ORDER BY CASE
          WHEN source.content_mode='custom' AND source.market=destination.code AND source.locale='en' THEN 0
          WHEN source.content_mode='shared' THEN 1
          ELSE 2
        END
        LIMIT 1`,
    );
    assert.deepEqual(bankingSelection.rows, [{ edition_id: "banking-shared" }]);
    const bankingSharedSitemap = await client.query<{ document_id: string }>(
      `SELECT d.id AS document_id
         FROM cms_documents d
         JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
         JOIN cms_market_editions e ON e.id=delivery.shared_source_edition_id
           AND e.document_id=d.id AND e.content_mode='shared'
         JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
           AND r.workflow_state='approved'
         JOIN market_editions destination ON destination.code='uae' AND destination.enabled=true
        WHERE d.id='banking-document'
          AND ${documentPublishedAvailabilityClause("d.id", "destination.code", "'en'")}
          AND ${industryDestinationEligibilityClause("d", "e", "r", "destination.code")}
          AND NOT ${uaeCustomExists}`,
    );
    assert.deepEqual(bankingSharedSitemap.rows, [{ document_id: "banking-document" }]);

    const {
      industryDeliveryErrors,
      publishedCustomIndustryWinnerClause,
    } = await import("../src/routes/documents");
    const invalidCustomWinner = await client.query<{ winning: boolean }>(
      `SELECT ${publishedCustomIndustryWinnerClause("d.id", "destination.code", "'en'")} winning
         FROM cms_documents d
         JOIN market_editions destination ON destination.code='uae'
        WHERE d.id='banking-document'`,
    );
    assert.equal(
      invalidCustomWinner.rows[0]?.winning,
      false,
      "a public-but-cross-market Banking custom revision cannot suppress shared delivery validation",
    );
    const ksaSharedErrors = industryDeliveryErrors(
      {
        slug: "financial-services",
        markets: ["ksa"],
        content: { bankingPov: { market: "ksa" } },
      },
      "ksa",
      [{ market: "uae", locale: "en", hasPublishedCustom: invalidCustomWinner.rows[0]?.winning }],
    );
    assert.deepEqual(
      ksaSharedErrors.map(({ market, locale }) => ({ market, locale })),
      [{ market: "uae", locale: "en" }],
      "the KSA shared revision must reject before it could deliver to UAE",
    );
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
    await pool.end();
  }
});

test("public detail HTTP selects the exact custom source before applying a regional slug", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);
  const customSnapshot = {
    slug: "regional-platform",
    title: "Regional platform",
    content: {
      schemaVersion: 1,
      category: "Specialist",
      summary: "A region-specific approved platform.",
      heroMediaId: "00000000-0000-4000-8000-000000000001",
      template: "standard",
      sections: [],
      capabilities: [],
      differentiators: [],
      visibility: "public",
      order: 0,
      sources: [{ label: "Approved source", url: "https://example.com/source", accessedAt: "2026-09-06" }],
      verificationDate: "2026-09-06",
      reviewDate: "2027-03-06",
      relatedIds: [],
    },
    mediaIds: ["00000000-0000-4000-8000-000000000001"],
    markets: ["ksa"],
  };
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "ksa", default_locale: "en", fallback_market_code: null,
          fallback_locale: null, is_canonical: true,
        }],
      };
    }
    if (statement.includes("WITH selected AS") && statement.includes("source_rank=1")) {
      // The two eligible rows have different slugs: a shared source has
      // `shared-platform`, while this exact KSA custom source has
      // `regional-platform`. Selection must occur before the slug predicate.
      assert.ok(statement.indexOf("source_rank=1") < statement.indexOf("COALESCE(payload->>'slug',localized_slug)=$2"));
      if (values?.[1] === "shared-platform") return { rowCount: 0, rows: [] };
      assert.equal(values?.[1], "regional-platform");
      return {
        rowCount: 1,
        rows: [{
          id: "document-id",
          kind: "platform",
          market: "ksa",
          locale: "en",
          published_at: new Date("2026-09-06T00:00:00Z"),
          updated_at: new Date("2026-09-06T00:00:00Z"),
          localized_slug: "regional-platform",
          revision_id: "00000000-0000-4000-8000-000000000010",
          revision_number: 2,
          payload: customSnapshot,
          requested_market: "ksa",
          requested_locale: "en",
        }],
      };
    }
    // The shared source does exist for this document, but it is not selected
    // at KSA/en because the exact custom edition wins.
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const custom = await fetch(`${origin}/api/public/content/ksa/en/platform/regional-platform`);
    assert.equal(custom.status, 200);
    assert.equal((await custom.json() as { slug: string }).slug, "regional-platform");
    const shared = await fetch(`${origin}/api/public/content/ksa/en/platform/shared-platform`);
    assert.equal(shared.status, 404);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
  }
});