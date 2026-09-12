import assert from "node:assert/strict";
import test from "node:test";
import { industryExactMarketDeliveryClause } from "../src/lib/availability";

const publicSectorSnapshot = {
  slug: "public-sector",
  title: "Public Sector",
  summary: "Governed public-service delivery.",
  mediaIds: [],
  markets: ["uae"],
  content: {
    schemaVersion: 1,
    legacyPath: "/industries/manufacturing",
    name: "Public Sector",
    shortName: "Public Sector",
    thesis: "Public value is earned at the point of service.",
    accent: "point of service.",
    dek: "A governed public-service perspective.",
    opportunity: "Make high-friction services easier to complete.",
    capabilities: [
      { title: "Sovereign service platforms", body: "Build governed services." },
      { title: "Governed casework agents", body: "Support bounded decisions." },
    ],
    selectedWork: { description: "Show accountable public-service outcomes." },
    image: "/images/cognirise/industries/public-sector.png",
    imageAlt: "A governed public-service setting.",
    variant: "ledger",
    pressures: [
      { title: "Legitimacy", body: "Make authority visible." },
      { title: "Accessibility", body: "Design for every user." },
      { title: "Data boundaries", body: "Keep purpose and access explicit." },
    ],
    reversal: {
      title: "Automation can harden friction.",
      body: "A faster interface is not a complete service.",
    },
    myth: {
      claim: "A chatbot proves a service is intelligent.",
      verdict: "Measure the complete governed journey instead.",
    },
    gcc: "Public institutions need transparent controls and service evidence.",
    service: {
      label: "Sovereign & Regulated AI",
      href: "/what-we-do",
      firstMove: "Map one high-friction public journey.",
    },
    uses: [{
      use: "Case intake and triage",
      evidence: "Established digital-service practice",
      boundary: "Human escalation",
    }],
    sources: [{
      label: "Approved source",
      publisher: "Public authority",
      kind: "Official source",
      url: "https://example.com/public-sector-source",
    }],
    verificationDate: "2026-09-06",
    reviewDate: "2027-03-06",
    visibility: "public",
    order: 5,
    relatedIds: [],
  },
};

test("public-sector public delivery keeps exact non-UAE markets isolated while UAE remains live", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);

  const queriedStatements: string[] = [];
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    queriedStatements.push(statement);

    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 2,
        rows: [
          {
            code: "uae",
            default_locale: "en",
            fallback_market_code: null,
            fallback_locale: null,
            is_canonical: true,
          },
          {
            code: "ksa",
            default_locale: "en",
            fallback_market_code: "uae",
            fallback_locale: "en",
            is_canonical: false,
          },
        ],
      };
    }

    if (statement.includes("WITH selected AS")) {
      assert.match(statement, /d\.canonical_slug='public-sector'/);
      assert.match(statement, /\$3<>'uae'/);
      assert.match(statement, /e\.market<>\$3/);

      const requestedMarket = String(values?.[2]);
      if (requestedMarket === "ksa") return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          id: "public-sector-document",
          kind: "industry",
          market: "uae",
          locale: "en",
          editorial_market: "uae",
          published_at: new Date("2026-09-06T00:00:00Z"),
          updated_at: new Date("2026-09-06T00:00:00Z"),
          localized_slug: "public-sector",
          revision_id: "public-sector-uae-revision",
          revision_number: 1,
          payload: publicSectorSnapshot,
          requested_market: "uae",
          requested_locale: "en",
        }],
      };
    }

    // A structurally valid navigation policy is not needed for this
    // delivery test. Empty policy/document-route results keep the page
    // available without introducing another source of fallback behavior.
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  try {
    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;

    const ksaList = await fetch(
      `${origin}/api/public/content?market=ksa&locale=en&kind=industry`,
    );
    assert.equal(ksaList.status, 200);
    assert.deepEqual((await ksaList.json() as { items: unknown[] }).items, []);

    const ksaDetail = await fetch(
      `${origin}/api/public/content/ksa/en/industry/public-sector`,
    );
    assert.equal(ksaDetail.status, 404);

    const uaeDetail = await fetch(
      `${origin}/api/public/content/uae/en/industry/public-sector`,
    );
    assert.equal(uaeDetail.status, 200);
    const uaeBody = await uaeDetail.json() as {
      title: string;
      market: string;
      usedFallback: boolean;
    };
    assert.equal(uaeBody.title, "Public Sector");
    assert.equal(uaeBody.market, "uae");
    assert.equal(uaeBody.usedFallback, false);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
  }

  assert.equal(
    queriedStatements.filter((statement) => statement.includes("WITH selected AS")).length,
    3,
  );
});

test("exact-market restriction is scoped to Public Sector and does not change other industries", () => {
  const clause = industryExactMarketDeliveryClause("d", "e", "$3");
  assert.match(clause, /d\.kind='industry'/);
  assert.match(clause, /d\.canonical_slug='public-sector'/);
  assert.match(clause, /\$3<>'uae'/);
  assert.match(clause, /e\.market<>\$3/);
  assert.doesNotMatch(clause, /education|financial-services|telecoms|travel|energy-resources/);
});