import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  NAVIGATION_ITEM_IDS,
  NavigationPolicySnapshotSchema,
  UpdateNavigationSettingsSchema,
  parsePersistedNavigationPolicy,
} from "@workspace/api-zod";
import { isPublishedPageAvailable, navigationCandidates, publishedNavigationPolicy } from "../src/lib/navigation-policy";
import { pool } from "@workspace/db";

test("the active navigation registry retires Work without accepting new writes", () => {
  assert.equal(NAVIGATION_ITEM_IDS.includes("work"), false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    market: "uae",
    locale: "en",
    pages: [],
    items: [{
      id: "work",
      label: "Work",
      parentId: null,
      order: 0,
      destination: "/work",
      visible: true,
    }],
  }).success, false);
});

test("a locale supported only by a fallback market is not a valid requested destination", async (t) => {
  t.mock.method(pool, "query", async () => ({
    rowCount: 2,
    rows: [
      {
        code: "ksa", default_locale: "ar", fallback_market_code: "uae",
        fallback_locale: null, is_canonical: false,
      },
      {
        code: "uae", default_locale: "en", fallback_market_code: null,
        fallback_locale: null, is_canonical: true,
      },
    ],
  }));
  assert.equal(await navigationCandidates("ksa", "en"), null);
  assert.equal(await publishedNavigationPolicy("ksa", "en"), null);
  assert.equal(await isPublishedPageAvailable("/platforms", "ksa", "en"), false);
});

test("persisted policies drop only retired Work records and keep approved settings", () => {
  const persisted = {
    items: [
      {
        id: "platforms",
        label: "Approved platforms",
        parentId: null,
        order: 0,
        destination: "/platforms",
        visible: false,
      },
      {
        id: "work",
        label: "Legacy Work",
        parentId: null,
        order: 1,
        destination: "/work",
        visible: true,
      },
    ],
    pages: [
      { path: "/platforms", enabled: false },
      { path: "/work", enabled: false },
      { path: "/work/customer-story", enabled: true },
    ],
  };
  assert.equal(NavigationPolicySnapshotSchema.safeParse(persisted).success, false);
  const parsed = parsePersistedNavigationPolicy(persisted);
  assert.deepEqual(parsed.items, [{
    id: "platforms",
    label: "Approved platforms",
    parentId: null,
    order: 0,
    destination: "/platforms",
    visible: false,
  }]);
  assert.deepEqual(parsed.pages, [
    { path: "/platforms", enabled: false },
    { path: "/work/customer-story", enabled: true },
  ]);
});

const base = {
  market: "ksa",
  locale: "en",
  version: 1,
  pages: [
    { path: "/platforms", enabled: true },
    { path: "/platforms/cognios", enabled: false },
  ],
  items: [
    {
      id: "platforms",
      label: "Platforms",
      parentId: null,
      order: 0,
      destination: "/platforms",
      visible: true,
    },
    {
      id: "platforms.cognios",
      label: "CogniOS",
      parentId: "platforms",
      order: 1,
      destination: "/platforms/cognios",
      visible: false,
    },
  ],
};

test("navigation policy accepts a hidden link to an unavailable page", () => {
  assert.equal(UpdateNavigationSettingsSchema.safeParse(base).success, true);
});

test("navigation policy rejects visible unavailable destinations", () => {
  const value = {
    ...base,
    items: base.items.map((item) => item.id === "platforms.cognios" ? { ...item, visible: true } : item),
  };
  const result = UpdateNavigationSettingsSchema.safeParse(value);
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues[0]?.message ?? "", /unavailable page/);
});

test("navigation policy rejects dangling parents and external destinations", () => {
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    ...base,
    items: base.items.map((item) => item.id === "platforms" ? { ...item, destination: "https://example.com" } : item),
  }).success, false);
});

test("navigation parent omission inherits the registry while explicit null promotes to top level", () => {
  const omitted = {
    ...base,
    items: base.items.map((item) => item.id === "platforms.cognios"
      ? {
          id: item.id,
          label: item.label,
          order: item.order,
          destination: item.destination,
          visible: item.visible,
        }
      : item),
  };
  const inherited = UpdateNavigationSettingsSchema.parse(omitted);
  assert.equal(Object.prototype.hasOwnProperty.call(
    inherited.items.find((item) => item.id === "platforms.cognios")!,
    "parentId",
  ), false);

  const promoted = UpdateNavigationSettingsSchema.parse({
    ...base,
    items: base.items.map((item) => item.id === "platforms.cognios"
      ? { ...item, parentId: null }
      : item),
  });
  assert.equal(promoted.items.find((item) => item.id === "platforms.cognios")?.parentId, null);
});

test("navigation patch accepts hierarchy fields for authoritative edition validation", () => {
  const value = {
    ...base,
    items: [
      ...base.items,
      {
        id: "methodologies",
        label: "How we do it",
        parentId: "platforms",
        order: 2,
        destination: "/methodologies/idao",
        visible: true,
      },
      {
        id: "methodologies.idao",
        label: "IDAO",
        order: 3,
        destination: "/methodologies/idao",
        visible: true,
      },
    ],
  };
  const result = UpdateNavigationSettingsSchema.safeParse(value);
  assert.equal(result.success, true);
});

test("fallback market and locale policies suppress the same page everywhere", async (t) => {
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions")) {
      return {
        rowCount: 2,
        rows: [
          { code: "ksa", default_locale: "ar", fallback_market_code: "uae", fallback_locale: "en", is_canonical: false },
          { code: "uae", default_locale: "en", fallback_market_code: null, fallback_locale: null, is_canonical: true },
        ],
      };
    }
    if (values?.[1] !== "en") return { rowCount: 0, rows: [] };
    return {
      rowCount: 1,
      rows: [{ items: [], pages: [{ path: "/platforms", enabled: false }], published_at: new Date() }],
    };
  });
  const policy = await publishedNavigationPolicy("ksa", "ar");
  assert.equal(policy?.market, "uae");
  assert.equal(policy?.locale, "en");
  assert.equal(policy?.usedFallback, true);
  assert.equal(await isPublishedPageAvailable("/platforms", "ksa", "ar"), false);
});

test("published policy compatibility removes legacy Work without losing approved decisions", async (t) => {
  t.mock.method(pool, "query", async (sql: unknown) => {
    if (String(sql).includes("FROM market_editions")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae", default_locale: "en", fallback_market_code: null,
          fallback_locale: null, is_canonical: true,
        }],
      };
    }
    return {
      rowCount: 1,
      rows: [{
        items: [
          { id: "platforms", label: "Approved platforms", parentId: null, order: 0, destination: "/platforms", visible: false },
          { id: "work", label: "Legacy Work", parentId: null, order: 1, destination: "/work", visible: true },
        ],
        pages: [
          { path: "/platforms", enabled: false },
          { path: "/work", enabled: false },
          { path: "/work/customer-story", enabled: true },
        ],
        published_at: new Date(),
      }],
    };
  });
  const policy = await publishedNavigationPolicy("uae", "en");
  assert.deepEqual(policy?.items.map((item) => item.id), ["platforms"]);
  assert.deepEqual(policy?.pages, [
    { path: "/platforms", enabled: false },
    { path: "/work/customer-story", enabled: true },
  ]);
  assert.equal(await isPublishedPageAvailable("/work", "uae", "en"), true);
  assert.equal(await isPublishedPageAvailable("/work/customer-story", "uae", "en"), true);
});

test("navigation hides a non-UAE Public Sector fallback route", async (t) => {
  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 2,
        rows: [
          {
            code: "ksa", default_locale: "en", fallback_market_code: "uae",
            fallback_locale: "en", is_canonical: false,
          },
          {
            code: "uae", default_locale: "en", fallback_market_code: null,
            fallback_locale: null, is_canonical: true,
          },
        ],
      };
    }
    if (statement.includes("cms_navigation_published_policies")) {
      return {
        rowCount: 1,
        rows: [{
          items: [{
            id: "platforms", label: "Public Sector", parentId: null, order: 0,
            destination: "/industries/public-sector", visible: true,
          }],
          pages: [{ path: "/industries/public-sector", enabled: true }],
          published_at: new Date(),
        }],
      };
    }
    if (statement.includes("WITH represented_sources")) {
      assert.match(statement, /d\.canonical_slug='public-sector'/);
      assert.match(statement, /\$1<>'uae'/);
      return {
        rowCount: 1,
        rows: [{
          kind: "industry",
          payload: { slug: "public-sector" },
          available: false,
          source_rank: null,
          public_eligible: false,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });

  const policy = await publishedNavigationPolicy("ksa", "en");
  assert.equal(policy?.items[0]?.visible, false);
});

test("published navigation hides a destination whose published CMS document is unavailable", async (t) => {
  const platform = {
    slug: "unavailable-platform",
    title: "Unavailable platform",
    content: {
      schemaVersion: 1,
      category: "Specialist",
      summary: "A governed platform summary.",
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
    markets: ["uae"],
  };
  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae", default_locale: "en", fallback_market_code: null,
          fallback_locale: null, is_canonical: true,
        }],
      };
    }
    if (statement.includes("cms_navigation_published_policies")) {
      return {
        rowCount: 1,
        rows: [{
          items: [{
            id: "platforms", label: "Unavailable platform", parentId: null,
            order: 0, destination: "/platforms/unavailable-platform", visible: true,
          }],
          pages: [{ path: "/platforms/unavailable-platform", enabled: true }],
          published_at: new Date(),
        }],
      };
    }
    if (statement.includes("FROM cms_documents d")) {
      assert.match(statement, /cms_document_availability_states delivery/);
      assert.match(statement, /e\.content_mode='shared'/);
      assert.match(statement, /r\.id=e\.published_revision_id/);
      assert.doesNotMatch(statement, /e\.published_revision_id=delivery\.shared_source_revision_id/);
      assert.match(statement, /e\.published_revision_id=delivery\.published_source_revision_id/);
      assert.match(statement, /cms_document_market_availability/);
      return { rowCount: 1, rows: [{ kind: "platform", payload: platform, available: false }] };
    }
    return { rowCount: 0, rows: [] };
  });

  const policy = await publishedNavigationPolicy("uae", "en");
  assert.equal(policy?.items[0]?.visible, false);
  assert.equal(await isPublishedPageAvailable("/platforms/unavailable-platform", "uae", "en"), false);
});

test("navigation hides a superseded shared slug while retaining the exact custom route", async (t) => {
  const platform = (slug: string) => ({
    slug,
    title: slug,
    content: {
      schemaVersion: 1,
      category: "Specialist",
      summary: "A governed platform summary.",
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
  });
  t.mock.method(pool, "query", async (sql: unknown) => {
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
    if (statement.includes("cms_navigation_published_policies")) {
      return {
        rowCount: 1,
        rows: [{
          items: [
            { id: "platforms", label: "Shared", parentId: null, order: 0, destination: "/platforms/shared-platform", visible: true },
            { id: "methodologies", label: "Custom", parentId: null, order: 1, destination: "/platforms/regional-platform", visible: true },
          ],
          pages: [
            { path: "/platforms/shared-platform", enabled: true },
            { path: "/platforms/regional-platform", enabled: true },
          ],
          published_at: new Date(),
        }],
      };
    }
    if (statement.includes("FROM cms_documents d")) {
      assert.match(statement, /FROM selected_sources/);
      // The shared source remains a represented route, but exact KSA custom
      // wins public delivery. Its old slug is therefore known-and-unavailable.
      return {
        rowCount: 2,
        rows: [
          { kind: "platform", payload: platform("shared-platform"), available: true, source_rank: "2", public_eligible: true },
          { kind: "platform", payload: platform("regional-platform"), available: true, source_rank: "1", public_eligible: true },
        ],
      };
    }
    return { rowCount: 0, rows: [] };
  });

  const policy = await publishedNavigationPolicy("ksa", "en");
  assert.deepEqual(policy?.items.map((item) => [item.destination, item.visible]), [
    ["/platforms/shared-platform", false],
    ["/platforms/regional-platform", true],
  ]);
  assert.equal(await isPublishedPageAvailable("/platforms/shared-platform", "ksa", "en"), false);
  assert.equal(await isPublishedPageAvailable("/platforms/regional-platform", "ksa", "en"), true);
});

test("real navigation selection promotes a public shared source over a private exact custom source", {
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
  concurrency: false,
}, async (t) => {
  const client = await pool.connect();
  const schema = `navigation_public_source_${randomUUID().replaceAll("-", "")}`;
  try {
    await client.query(`CREATE SCHEMA "${schema}"; SET search_path TO "${schema}";`);
    await client.query(`
      CREATE TABLE market_editions (
        id text PRIMARY KEY, code text NOT NULL UNIQUE, default_locale text NOT NULL,
        fallback_market_code text, fallback_locale text, is_canonical boolean NOT NULL DEFAULT false,
        enabled boolean NOT NULL DEFAULT true
      );
      CREATE TABLE cms_documents (
        id text PRIMARY KEY, kind text NOT NULL, status text NOT NULL DEFAULT 'active',
        canonical_slug text
      );
      CREATE TABLE cms_market_editions (
        id text PRIMARY KEY, document_id text NOT NULL, market text NOT NULL, locale text NOT NULL,
        content_mode text NOT NULL, publication_state text NOT NULL, published_at timestamptz,
        published_revision_id text, editorial_market text, updated_at timestamptz NOT NULL DEFAULT now()
      );
      CREATE TABLE cms_revisions (
        id text PRIMARY KEY, edition_id text NOT NULL, workflow_state text NOT NULL, payload jsonb NOT NULL
      );
      CREATE TABLE cms_document_availability_states (
        document_id text PRIMARY KEY, published_version integer NOT NULL,
        shared_source_edition_id text, published_source_revision_id text
      );
      CREATE TABLE cms_document_market_availability (
        document_id text NOT NULL, market_edition_id text NOT NULL, locale text NOT NULL,
        published_decision text, PRIMARY KEY (document_id, market_edition_id, locale)
      );
      -- This fixture models legacy shared delivery, so it has no binding rows;
      -- the production shared-market authority predicate nevertheless requires
      -- these migrated relation shapes to be present.
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
      CREATE TABLE cms_navigation_published_policies (
        market text NOT NULL, locale text NOT NULL, items jsonb NOT NULL, pages jsonb NOT NULL,
        published_version integer NOT NULL DEFAULT 1, published_at timestamptz NOT NULL
      );
      INSERT INTO market_editions (id,code,default_locale,is_canonical)
      VALUES ('destination-ksa','ksa','en',true);
      INSERT INTO cms_documents (id,kind) VALUES ('document','platform');
      INSERT INTO cms_market_editions
        (id,document_id,market,locale,content_mode,publication_state,published_at,published_revision_id)
      VALUES
        ('shared','document','shared-source','und','shared','published',now(),'shared-revision'),
        ('custom','document','ksa','en','custom','published',now(),'custom-revision');
      INSERT INTO cms_revisions (id,edition_id,workflow_state,payload) VALUES
        ('shared-revision','shared','approved',
         '{"slug":"shared-platform","title":"Shared","content":{"schemaVersion":1,"category":"Specialist","summary":"Shared summary","heroMediaId":"00000000-0000-4000-8000-000000000001","template":"standard","sections":[],"capabilities":[],"differentiators":[],"visibility":"public","order":0,"sources":[{"label":"Approved source","url":"https://example.com/source","accessedAt":"2026-09-06"}],"verificationDate":"2026-09-06","reviewDate":"2027-03-06","relatedIds":[]},"mediaIds":["00000000-0000-4000-8000-000000000001"],"markets":["ksa"]}'::jsonb),
        ('custom-revision','custom','approved',
         '{"slug":"private-platform","title":"Private","visibility":"restricted","content":{"schemaVersion":1,"category":"Specialist","summary":"Private summary","heroMediaId":"00000000-0000-4000-8000-000000000001","template":"standard","sections":[],"capabilities":[],"differentiators":[],"visibility":"public","order":0,"sources":[{"label":"Approved source","url":"https://example.com/source","accessedAt":"2026-09-06"}],"verificationDate":"2026-09-06","reviewDate":"2027-03-06","relatedIds":[]},"mediaIds":["00000000-0000-4000-8000-000000000001"],"markets":["ksa"]}'::jsonb);
      INSERT INTO cms_document_availability_states
        (document_id,published_version,shared_source_edition_id,published_source_revision_id)
      VALUES ('document',1,'shared','shared-revision');
      INSERT INTO cms_document_market_availability
        (document_id,market_edition_id,locale,published_decision)
      VALUES ('document','destination-ksa','en','show');
      INSERT INTO cms_navigation_published_policies (market,locale,items,pages,published_version,published_at)
      VALUES (
        'ksa','en',
        '[{"id":"platforms","label":"Shared","parentId":null,"order":0,"destination":"/platforms/shared-platform","visible":true},{"id":"methodologies","label":"Private","parentId":null,"order":1,"destination":"/platforms/private-platform","visible":true}]'::jsonb,
        '[{"path":"/platforms/shared-platform","enabled":true},{"path":"/platforms/private-platform","enabled":true}]'::jsonb,
        1, now()
      );
    `);
    t.mock.method(pool, "query", async (sql: string, values?: unknown[]) =>
      await client.query(sql, values),
    );
    const policy = await publishedNavigationPolicy("ksa", "en");
    assert.deepEqual(policy?.items.map((item) => [item.destination, item.visible]), [
      ["/platforms/shared-platform", true],
      ["/platforms/private-platform", false],
    ]);
    assert.equal(await isPublishedPageAvailable("/platforms/shared-platform", "ksa", "en"), true);
    assert.equal(await isPublishedPageAvailable("/platforms/private-platform", "ksa", "en"), false);
  } finally {
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    client.release();
  }
});

test("an unsupported published grandchild is surfaced instead of silently flattened", async (t) => {
  t.mock.method(pool, "query", async (sql: unknown) => {
    if (String(sql).includes("FROM market_editions")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae", default_locale: "en", fallback_market_code: null,
          fallback_locale: null, is_canonical: true,
        }],
      };
    }
    return {
      rowCount: 1,
      rows: [{
        items: [
          { id: "platforms", label: "Platforms", parentId: null, order: 0, destination: "/platforms", visible: true },
          { id: "platforms.cognios", label: "CogniOS", parentId: "platforms", order: 1, destination: "/platforms/cognios", visible: true },
          { id: "methodologies.idao", label: "IDAO", parentId: "platforms.cognios", order: 2, destination: "/methodologies/idao", visible: true },
        ],
        pages: [],
        published_at: new Date(),
      }],
    };
  });
  await assert.rejects(
    publishedNavigationPolicy("uae", "en"),
    /submenu cannot be nested/i,
  );
});