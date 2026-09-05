import assert from "node:assert/strict";
import test from "node:test";
import {
  cacheDeadlines,
  PAGE_QUERY,
  getSitemap,
  validateRuntimeResult,
  resolveEdition,
  validatePageDocument,
  type PageDocument,
} from "./adapter";

const document = (requested: Record<string, unknown> | null, uae?: Record<string, unknown>): PageDocument =>
  validatePageDocument({
    _id: "page-1", _rev: "rev-1", slug: "services", routeKind: "service", _updatedAt: "2026-01-01T00:00:00Z",
    requestedEdition: requested ? { parityComplete: true, ...requested, sections: Array.isArray(requested.sections) && requested.sections.length ? requested.sections : [{ _type: "heroSection" }] } : requested,
    uaeEdition: uae ?? {
      market: "uae", fallbackMode: "canonical", publicationState: "published",
      title: "UAE", parityComplete: true, sections: [{ _type: "heroSection" }],
    },
  })!;

test("only an explicit live uaeFallback resolves UAE", () => {
  const result = resolveEdition(document({
    market: "ksa", fallbackMode: "uaeFallback", publicationState: "published", sections: [],
  }), "ksa", false, Date.parse("2026-01-02T00:00:00Z"));
  assert.equal(result.meta.deliveryMode, "uaeFallback");
  assert.equal(result.meta.resolvedMarket, "uae");
  assert.equal(result.meta.marketFallback, true);
});

test("missing, unavailable, and expired editions never fall back", () => {
  for (const edition of [
    null,
    { market: "ksa", fallbackMode: "unavailable", publicationState: "published", sections: [] },
    { market: "ksa", fallbackMode: "uaeFallback", publicationState: "published", expiresAt: "2026-01-01T00:00:00Z", sections: [] },
  ]) {
    const result = resolveEdition(document(edition), "ksa", false, Date.parse("2026-01-02T00:00:00Z"));
    assert.equal(result.page, null);
    assert.equal(result.meta.deliveryMode, "unavailable");
    assert.equal(result.meta.marketFallback, false);
  }
});

test("published lifecycle enforces publication state and schedule, preview exposes draft", () => {
  const edition = {
    market: "turkiye", fallbackMode: "override", publicationState: "scheduled",
    publishAt: "2026-02-01T00:00:00Z", title: "TR", sections: [],
  };
  assert.equal(resolveEdition(document(edition), "turkiye", false, Date.parse("2026-01-02T00:00:00Z")).page, null);
  const preview = resolveEdition(document(edition), "turkiye", true, Date.parse("2026-01-02T00:00:00Z"));
  assert.equal(preview.page?.title, "TR");
  assert.equal(preview.meta.requestedPublicationState, "scheduled");
});

test("adapter never uses the old top-level market shape", () => {
  const oldShape = validatePageDocument({
    _id: "page-1", _rev: "rev-1", slug: "services", routeKind: "service", _updatedAt: "2026-01-01T00:00:00Z",
    market: "ksa", title: "wrong", sections: [],
  });
  assert.equal(resolveEdition(oldShape, "ksa", false).page, null);
});

test("delivery query resolves canonical and localized market slugs", () => {
  assert.match(PAGE_QUERY, /slug\.current == \$slug/);
  assert.match(PAGE_QUERY, /localizedSlug\.current == \$slug/);
  assert.match(PAGE_QUERY, /market->code == \$market/);
  assert.equal(PAGE_QUERY.match(/publicationState, parityComplete/g)?.length, 2);
});

test("query-shaped parity-complete editions deliver direct and inherited pages", () => {
  const direct = validatePageDocument({
    _id: "page-direct",
    _rev: "rev-direct",
    slug: "direct",
    routeKind: "service",
    _updatedAt: "2026-09-05T00:00:00Z",
    requestedEdition: {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      parityComplete: true,
      title: "Direct",
      sections: [{ _type: "heroSection", heading: "Direct" }],
    },
    uaeEdition: {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      parityComplete: true,
      title: "Direct",
      sections: [{ _type: "heroSection", heading: "Direct" }],
    },
  });
  assert.ok(resolveEdition(direct, "uae", false).page);

  const inherited = validatePageDocument({
    _id: "page-inherited",
    _rev: "rev-inherited",
    slug: "inherited",
    routeKind: "service",
    _updatedAt: "2026-09-05T00:00:00Z",
    requestedEdition: {
      market: "ksa",
      fallbackMode: "uaeFallback",
      publicationState: "published",
      parityComplete: false,
    },
    uaeEdition: {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      parityComplete: true,
      title: "Inherited",
      sections: [{ _type: "heroSection", heading: "Inherited" }],
    },
  });
  const inheritedResult = resolveEdition(inherited, "ksa", false);
  assert.ok(inheritedResult.page);
  assert.equal(inheritedResult.meta.deliveryMode, "uaeFallback");
});

test("runtime governance rejects unsafe redirects and requires explicit navigation fallback", () => {
  const result = validateRuntimeResult({
    markets: [{ code: "uae", name: "United Arab Emirates" }],
    navigation: [{
      placement: "primary",
      lifecycle: { state: "published" },
      canonical: [{ label: "Home", internal: { slug: "home", routeKind: "home" } }],
      canonicalEdition: { fallbackMode: "canonical", publicationState: "published" },
      edition: {
        fallbackMode: "uaeFallback", publicationState: "published",
      },
    }],
    redirects: [
      { sourcePath: "/old", destinationPath: "/new", statusCode: 308 },
      { sourcePath: "//evil.example", destinationPath: "/new", statusCode: 302 },
      { sourcePath: "/loop", destinationPath: "/loop", statusCode: 301 },
    ],
  }, "ksa");
  assert.equal(result.navigation.length, 1);
  assert.deepEqual(result.redirects, [{ sourcePath: "/old", destinationPath: "/new", statusCode: 308 }]);
});

test("sitemap has a deterministic hard-coded outage fallback", async () => {
  const project = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  delete process.env.SANITY_PROJECT_ID;
  delete process.env.SANITY_DATASET;
  try {
    const sitemap = await getSitemap("https://cognirise.ai");
    assert.match(sitemap, /<loc>https:\/\/cognirise\.ai\/<\/loc>/);
    assert.match(sitemap, /<loc>https:\/\/cognirise\.ai\/value-scan<\/loc>/);
    assert.doesNotMatch(sitemap, /undefined/);
  } finally {
    if (project) process.env.SANITY_PROJECT_ID = project;
    if (dataset) process.env.SANITY_DATASET = dataset;
  }
});

test("fresh and stale cache deadlines never cross publication lifecycle boundaries", () => {
  const now = Date.parse("2026-01-01T00:00:00Z");
  const expiry = now + 10_000;
  const result = resolveEdition(document({
    market: "ksa", fallbackMode: "override", publicationState: "published",
    expiresAt: new Date(expiry).toISOString(), title: "KSA", sections: [],
  }), "ksa", false, now);
  assert.deepEqual(cacheDeadlines(result, now), { expiresAt: expiry, staleUntil: expiry });

  const scheduled = resolveEdition(document({
    market: "ksa", fallbackMode: "override", publicationState: "scheduled",
    publishAt: new Date(expiry).toISOString(), sections: [],
  }), "ksa", false, now);
  assert.deepEqual(cacheDeadlines(scheduled, now), { expiresAt: expiry, staleUntil: expiry });
});
