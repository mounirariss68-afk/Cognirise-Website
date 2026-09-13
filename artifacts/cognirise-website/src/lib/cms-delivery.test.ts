import assert from "node:assert/strict";
import test from "node:test";
import { COMPILED_LANDING_ROUTES, cmsCollectionData, cmsCollectionDelivery, cmsCollectionIsCutOver, cmsEntryIsCutOver, cmsEntryRenderPolicy, cmsRequestIsUnavailable, landingNarrative, landingSections, landingVisualReferences, type CmsDeliveryState } from "./cms";
import type { LandingPageContent } from "@workspace/api-zod";

test("people never select compiled profiles, even with legacy cutover disabled or no publication history", () => {
  for (const configured of [undefined, false, true]) {
    assert.equal(cmsCollectionIsCutOver("person", configured), true);
    assert.equal(cmsCollectionDelivery("person", {
      isPending: false, isError: false, hasContractErrors: false, hasItems: false,
      isConfigured: configured,
    }), "intentional-empty");
  }
  for (const authoritative of [false, true]) {
    for (const state of ["loading", "api-error", "contract-error", "intentional-empty", "compiled-fallback"] as CmsDeliveryState[]) {
      assert.deepEqual(cmsCollectionData("person", state, ["stale profile"], ["hidden compiled profile"], authoritative), []);
    }
    assert.deepEqual(cmsCollectionData("person", "cms", ["visible leader", "visible advisor"], ["hidden compiled profile"], authoritative), ["visible leader", "visible advisor"]);
  }
});

test("compiled framework content is limited to explicit pre-cutover fallback", () => {
  assert.equal(cmsEntryRenderPolicy(false, "compiled-fallback"), "compiled-fallback");
  assert.equal(cmsEntryRenderPolicy(false, "cms"), "cms");

  for (const delivery of ["compiled-fallback", "api-error", "contract-error", "intentional-empty"] as CmsDeliveryState[]) {
    assert.equal(cmsEntryRenderPolicy(true, delivery), "unavailable");
  }
  assert.equal(cmsEntryRenderPolicy(true, "loading"), "loading");
  assert.equal(cmsEntryRenderPolicy(true, "cms"), "cms");
});

test("only the approved Agent Authority framework entry is cut over when the framework collection is not", () => {
  assert.equal(cmsEntryIsCutOver("framework", "agent-authority-model"), true);
  assert.equal(cmsEntryIsCutOver("framework", "another-framework"), false);
  assert.equal(cmsEntryIsCutOver("publication", "agent-authority-model"), false);
});

test("compiled landing inventory has a governed source key for every known route", () => {
  assert.deepEqual(COMPILED_LANDING_ROUTES.map((route) => route.sourceKey), [
    "compiled:/", "compiled:/about", "compiled:/partners", "compiled:/platforms",
    "compiled:/insights", "compiled:/methodologies",
  ]);
  assert.deepEqual(COMPILED_LANDING_ROUTES.map((route) => route.template), [
    "landing", "landing", "landing", "landing", "landing", "methodologies",
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

test("CMS request classification preserves genuine 404s while surfacing outages", () => {
  assert.equal(cmsRequestIsUnavailable(new Error("network timeout")), true);
  assert.equal(cmsRequestIsUnavailable({ name: "ResponseParseError", status: 200 }), true);
  assert.equal(cmsRequestIsUnavailable({ name: "ApiError", status: 404 }), false);
  assert.equal(cmsRequestIsUnavailable({ name: "ApiError", status: 503 }), true);
});