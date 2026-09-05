import assert from "node:assert/strict";
import test from "node:test";
import {
  cacheDeadlines,
  resolveEdition,
  validatePageDocument,
  type PageDocument,
} from "./adapter";

const document = (requested: Record<string, unknown> | null, uae?: Record<string, unknown>): PageDocument =>
  validatePageDocument({
    _id: "page-1", _rev: "rev-1", slug: "services", _updatedAt: "2026-01-01T00:00:00Z",
    requestedEdition: requested,
    uaeEdition: uae ?? {
      market: "uae", fallbackMode: "canonical", publicationState: "published",
      title: "UAE", sections: [],
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
    _id: "page-1", _rev: "rev-1", slug: "services", _updatedAt: "2026-01-01T00:00:00Z",
    market: "ksa", title: "wrong", sections: [],
  });
  assert.equal(resolveEdition(oldShape, "ksa", false).page, null);
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
