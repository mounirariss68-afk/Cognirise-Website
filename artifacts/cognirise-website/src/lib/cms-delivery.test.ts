import assert from "node:assert/strict";
import test from "node:test";
import { COMPILED_LANDING_ROUTES, cmsCollectionDelivery, cmsCollectionIsCutOver, cmsEntryRenderPolicy, landingNarrative, landingSections, landingVisualReferences, type CmsDeliveryState } from "./cms";
import type { LandingPageContent } from "@workspace/api-zod";

test("compiled framework content is limited to explicit pre-cutover fallback", () => {
  assert.equal(cmsEntryRenderPolicy(false, "compiled-fallback"), "compiled-fallback");
  assert.equal(cmsEntryRenderPolicy(false, "cms"), "cms");

  for (const delivery of ["compiled-fallback", "api-error", "contract-error", "intentional-empty"] as CmsDeliveryState[]) {
    assert.equal(cmsEntryRenderPolicy(true, delivery), "unavailable");
  }
  assert.equal(cmsEntryRenderPolicy(true, "loading"), "loading");
  assert.equal(cmsEntryRenderPolicy(true, "cms"), "cms");
});

test("compiled landing inventory has a governed source key for every known route", () => {
  assert.deepEqual(COMPILED_LANDING_ROUTES.map((route) => route.sourceKey), [
    "compiled:/", "compiled:/about", "compiled:/partners", "compiled:/platforms",
    "compiled:/insights", "compiled:/work", "compiled:/methodologies",
  ]);
  assert.deepEqual(COMPILED_LANDING_ROUTES.map((route) => route.template), [
    "landing", "landing", "landing", "landing", "landing", "landing", "methodologies",
  ]);
});

test("office fallback ends after CMS publication history exists", () => {
  assert.equal(cmsCollectionIsCutOver("office", false), false);
  assert.equal(cmsCollectionIsCutOver("office", true), true);
  assert.equal(cmsCollectionDelivery("office", {
    isPending: false,
    isError: false,
    hasContractErrors: false,
    hasItems: false,
    isConfigured: true,
  }), "intentional-empty");
  assert.equal(cmsCollectionDelivery("office", {
    isPending: false,
    isError: false,
    hasContractErrors: false,
    hasItems: false,
    isConfigured: false,
  }), "compiled-fallback");
});

test("homepage renderer consumes ordered governed narrative and only falls back while unconfigured", () => {
  assert.equal(cmsCollectionIsCutOver("landing-page", false), false);
  assert.equal(cmsCollectionDelivery("landing-page", {
    isPending: false, isError: false, hasContractErrors: false, hasItems: false, isConfigured: false,
  }), "compiled-fallback");
  assert.equal(cmsCollectionDelivery("landing-page", {
    isPending: false, isError: false, hasContractErrors: false, hasItems: false, isConfigured: true,
  }), "intentional-empty");
  assert.equal(cmsCollectionDelivery("landing-page", {
    isPending: false, isError: true, hasContractErrors: false, hasItems: false, isConfigured: true,
  }), "api-error");

  const page = {
    schemaVersion: 1,
    pagePath: "/",
    template: "landing",
    narrative: "Fallback governed narrative.",
    sections: [
      { type: "cta", id: "action", order: 2, label: "Talk to us", href: "/contact", style: "primary" },
      { type: "narrative", id: "hero", order: 1, heading: "Governed heading", body: [{ type: "paragraph", text: "Published homepage copy." }] },
    ],
    seo: {},
    legal: {},
    visualReferences: [],
    visibility: "public",
    order: 0,
    sources: [],
    relatedIds: [],
  } satisfies LandingPageContent;
  assert.deepEqual(landingNarrative(page, "hero"), {
    heading: "Governed heading",
    text: "Published homepage copy.",
  });
});

test("every governed landing section and visual reference is exposed to the renderer", () => {
  const page = {
    schemaVersion: 1, pagePath: "/about", template: "landing", narrative: "About governed narrative.",
    sections: [
      { type: "legal", id: "legal", order: 4, text: "Terms apply.", required: true },
      { type: "media", id: "image", order: 3, references: [{ mediaId: "00000000-0000-4000-8000-000000000001", mediaVersionId: "00000000-0000-4000-8000-000000000002", role: "supporting", altText: "Approved image" }] },
      { type: "cta", id: "cta", order: 2, label: "Read more", href: "/about", style: "secondary" },
      { type: "narrative", id: "copy", order: 1, body: [{ type: "paragraph", text: "Approved copy." }] },
    ],
    seo: { title: "About" }, legal: {}, visualReferences: [{ mediaId: "00000000-0000-4000-8000-000000000003", mediaVersionId: "00000000-0000-4000-8000-000000000004", role: "og-image" }],
    visibility: "public", order: 0, sources: [], relatedIds: [],
  } satisfies LandingPageContent;
  assert.deepEqual(landingSections(page).map((section) => section.type), ["narrative", "cta", "media", "legal"]);
  assert.equal(landingVisualReferences(page).length, 2);
});