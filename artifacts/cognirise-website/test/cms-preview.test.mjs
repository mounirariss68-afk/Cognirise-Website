import assert from "node:assert/strict";
import test from "node:test";
import { buildCmsPreviewUrl } from "../src/lib/cms-preview.ts";

test("preview URL uses the selected edition localized slug with canonical fallback", () => {
  assert.equal(buildCmsPreviewUrl({
    basePath: "/",
    market: "ksa",
    localizedSlug: "khadamat-al-thaka",
    canonicalSlug: "ai-services",
    routeKind: "service",
    token: "token with symbols&",
  }), "/preview/ksa/khadamat-al-thaka?token=token%20with%20symbols%26&routeKind=service");

  assert.equal(buildCmsPreviewUrl({
    basePath: "/site/",
    market: "uae",
    localizedSlug: null,
    canonicalSlug: "ai-services",
    routeKind: "service",
    token: "token",
  }), "/site/preview/uae/ai-services?token=token&routeKind=service");
});