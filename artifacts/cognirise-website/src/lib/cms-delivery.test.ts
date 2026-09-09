import assert from "node:assert/strict";
import test from "node:test";
import { cmsCollectionDelivery, cmsCollectionIsCutOver, cmsEntryRenderPolicy, type CmsDeliveryState } from "./cms";

test("compiled framework content is limited to explicit pre-cutover fallback", () => {
  assert.equal(cmsEntryRenderPolicy(false, "compiled-fallback"), "compiled-fallback");
  assert.equal(cmsEntryRenderPolicy(false, "cms"), "cms");

  for (const delivery of ["compiled-fallback", "api-error", "contract-error", "intentional-empty"] as CmsDeliveryState[]) {
    assert.equal(cmsEntryRenderPolicy(true, delivery), "unavailable");
  }
  assert.equal(cmsEntryRenderPolicy(true, "loading"), "loading");
  assert.equal(cmsEntryRenderPolicy(true, "cms"), "cms");
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