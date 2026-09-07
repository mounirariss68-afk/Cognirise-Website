import assert from "node:assert/strict";
import test from "node:test";
import {
  cmsPublicRoute,
  UpdateDocumentMarketAvailabilityBody,
  UpdateNavigationSettingsSchema,
  validateCmsContent,
  validateCmsSnapshot,
} from "@workspace/api-zod";

const governance = {
  schemaVersion: 1,
  visibility: "public",
  order: 1,
  sources: [{ label: "Approved source", url: "https://example.com/source", accessedAt: "2026-09-06" }],
  verificationDate: "2026-09-06",
  reviewDate: "2027-03-06",
  relatedIds: [],
};

test("publication requires a known variant and governed article body", () => {
  const valid = validateCmsContent("publication", {
    ...governance,
    variant: "article",
    teaser: "A governed teaser.",
    body: [{ type: "paragraph", text: "A complete paragraph." }],
    author: "Editorial practice",
    publicationDate: "2026-09-06",
    readingTimeMinutes: 1,
    topics: ["governance"],
    sectors: [],
    platformIds: [],
  }, "publish");
  assert.equal(valid.success, true);
  assert.equal(validateCmsContent("publication", { ...governance, variant: "video" }, "draft").success, false);
});

test("POVs require a ready PDF reference before publication", () => {
  const result = validateCmsContent("publication", {
    ...governance,
    variant: "pov",
    teaser: "A document teaser.",
    body: [],
    author: "Editorial practice",
    publicationDate: "2026-09-06",
    topics: [],
    sectors: [],
    platformIds: [],
  }, "publish");
  assert.equal(result.success, false);
  assert.match(result.errors.join(" "), /PDF/);
});

test("unsafe profile links are rejected at the shared boundary", () => {
  const result = validateCmsContent("person", {
    ...governance,
    role: "advisor",
    title: "Advisor",
    biography: "A complete approved biography.",
    focusAreas: [],
    profileLinks: [{ label: "Unsafe", url: "javascript:alert(1)" }],
    approvedFallback: "initials",
  }, "draft");
  assert.equal(result.success, false);
});

test("restricted and summary cases never receive public detail routes", () => {
  const restricted = {
    ...governance,
    variant: "full" as const,
    disclosure: "restricted" as const,
    mandate: "A mandate.",
    constraints: [],
    work: [{ type: "paragraph" as const, text: "The approved work." }],
    controls: [],
    outcomes: [],
    evidence: [],
  };
  assert.equal(cmsPublicRoute("case-study", "restricted-case", restricted), null);
  assert.equal(cmsPublicRoute("case-study", "summary-case", { ...restricted, variant: "summary", disclosure: "anonymized" }), null);
  assert.equal(cmsPublicRoute("case-study", "full-case", { ...restricted, disclosure: "anonymized" }), "/work/full-case");
});

test("snapshot contract normalizes media authority and rejects unknown fields", () => {
  const mediaId = "00000000-0000-4000-8000-000000000001";
  const result = validateCmsSnapshot("platform", {
    slug: "new-platform",
    title: "New platform",
    content: {
      ...governance,
      category: "Specialist",
      summary: "A governed platform summary.",
      template: "standard",
      heroMediaId: mediaId,
      sections: [],
      capabilities: [],
      differentiators: [],
      unexpected: true,
    },
    mediaIds: [],
    markets: ["uae"],
  }, "draft");
  assert.equal(result.success, false);
});

test("navigation settings accept only known unique menu item IDs", () => {
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "platforms", enabled: false }, { id: "platforms.cognios", enabled: true }],
  }).success, true);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "platforms", enabled: false }, { id: "platforms", enabled: true }],
  }).success, false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "external.unsafe", enabled: false }],
  }).success, false);
});

test("market availability accepts only the governed three-state decision", () => {
  for (const decision of ["inherit", "show", "off"]) {
    assert.equal(UpdateDocumentMarketAvailabilityBody.safeParse({ decision }).success, true);
  }
  assert.equal(
    UpdateDocumentMarketAvailabilityBody.safeParse({ decision: "hidden" }).success,
    false,
  );
});