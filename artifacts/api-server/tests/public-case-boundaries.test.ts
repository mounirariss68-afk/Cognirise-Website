import assert from "node:assert/strict";
import test from "node:test";

test("public case collection, detail, sitemap, and media enforce disclosure boundaries", {
  concurrency: false,
}, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);
  const now = new Date("2026-09-08T00:00:00Z");
  const governed = {
    schemaVersion: 1,
    disclosure: "anonymized",
    sector: "Financial Services",
    organizationDescriptor: "An anonymized financial-services organization",
    engagementType: "client-delivery",
    deliveryStage: "pilot",
    impactClassification: "pilot-demo",
    impactStatement: "The pilot demonstrated a governed workflow.",
    disclosureNote: "Identifying information is withheld.",
    publicEvidenceStatus: "approved",
    relatedIndustries: ["financial-services"],
    visual: {
      kind: "illustrative-interface-reconstruction",
      caption: "Illustrative interface reconstruction.",
      altText: "A reconstructed workflow interface.",
      textEquivalent: "A workflow moves through review and approval.",
      template: "workflow-console",
      fixtureLabels: ["Illustrative data"],
    },
    mandate: "A safe public mandate.",
    constraints: [],
    work: [{ type: "paragraph", text: "Approved public work." }],
    controls: [],
    outcomes: [],
    evidence: [],
    visibility: "public",
    order: 0,
    sources: [{ label: "Approved source", url: "https://example.com/source", accessedAt: "2026-09-06" }],
    verificationDate: "2026-09-06",
    reviewDate: "2027-03-06",
    relatedIds: [],
  };
  const rows = [
    row("summary-case", { ...governed, variant: "summary" }),
    row("full-case", { ...governed, variant: "full" }),
    row("restricted-case", { ...governed, variant: "full", disclosure: "restricted" }),
    row("hidden-case", { ...governed, variant: "full", visibility: "hidden" }),
    row("review-case", { ...governed, variant: "full", publicEvidenceStatus: "needs-review" }),
    row("invalid-case", { ...governed, variant: "full", mandate: "" }),
  ];

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae",
          default_locale: "en",
          fallback_market_code: null,
          fallback_locale: null,
          is_canonical: true,
        }],
      };
    }
    if (statement.includes("WITH selected AS")) {
      assert.match(statement, /r\.workflow_state='approved'/);
      assert.match(statement, /disclosure.*restricted/);
      return { rowCount: rows.length, rows: rows.map((candidate) => ({ ...candidate, total_count: rows.length })) };
    }
    if (statement.includes("SELECT d.id,d.kind,e.market")) {
      const found = rows.find((candidate) => candidate.localized_slug === values?.[1]);
      return found ? { rowCount: 1, rows: [found] } : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT a.*,v.id version_id")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT d.kind,e.market,e.locale")) {
      return { rowCount: rows.length, rows };
    }
    if (statement.includes("SELECT v.storage_key")) {
      const found = rows.find((candidate) => candidate.localized_slug === values?.[0]);
      return found
        ? { rowCount: 1, rows: [{ storage_key: "private/object", media_type: "image/png", ...found }] }
        : { rowCount: 0, rows: [] };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve()))
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;

  const collection = await (await fetch(
    `${origin}/api/public/content?market=uae&locale=en&kind=case-study&page=1&pageSize=20`,
  )).json() as { items: Array<{ slug: string }> };
  assert.deepEqual(collection.items.map((item) => item.slug), ["summary-case", "full-case"]);

  assert.equal((await fetch(`${origin}/api/public/content/uae/en/case-study/summary-case`)).status, 404);
  assert.equal((await fetch(`${origin}/api/public/content/uae/en/case-study/full-case`)).status, 200);
  assert.equal((await fetch(`${origin}/api/public/content/uae/en/case-study/restricted-case`)).status, 404);

  const sitemap = await (await fetch(`${origin}/api/public/sitemap?market=uae`)).json() as {
    items: Array<{ url: string }>;
  };
  assert.deepEqual(sitemap.items.map((item) => item.url), ["/work/full-case"]);

  for (const slug of ["restricted-case", "hidden-case", "review-case", "invalid-case"]) {
    assert.equal((await fetch(`${origin}/api/public/media/${slug}/version`)).status, 404);
  }

  function row(slug: string, content: Record<string, unknown>) {
    return {
      id: slug,
      kind: "case-study",
      market: "uae",
      locale: "en",
      published_at: now,
      updated_at: now,
      localized_slug: slug,
      revision_id: `${slug}-revision`,
      revision_number: 1,
      payload: { slug, title: slug, summary: "An anonymized public-safe summary.", content, mediaIds: [], markets: ["uae"] },
      requested_market: "uae",
    };
  }
});