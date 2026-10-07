import assert from "node:assert/strict";
import test from "node:test";
import { INDUSTRIES } from "./industries";
import { applyPublicSectorLaunch, publicSectorLaunchEnabled } from "./public-sector-launch";

test("Public Sector launch renders all fourteen sections from each exact October edition", () => {
  const base = INDUSTRIES.find((industry) => industry.slug === "public-sector")!;
  for (const market of ["uae", "ksa", "turkiye", "europe"] as const) {
    const view = applyPublicSectorLaunch(base, market);
    assert.equal(view.publicSectorNative?.market, market);
    assert.equal(view.publicSectorNative?.sections.length, 14);
    assert.equal(view.thesis, "The state takes the first step. A person confirms the outcome.");
    assert.equal(view.publicSectorPov, undefined);
    assert.equal(view.image, base.image);
    assert.ok(view.sources.length);
  }
  assert.equal(applyPublicSectorLaunch(INDUSTRIES[0], "europe"), INDUSTRIES[0]);
});

test("Launch override is limited to English public traffic with launch policy enabled", () => {
  const options = { enabled: true, slug: "public-sector", locale: "en", protectedPreview: false, releasePreview: false };
  assert.equal(publicSectorLaunchEnabled(options), true);
  for (const override of [
    { enabled: false }, { slug: "telecoms" }, { locale: "tr" },
    { protectedPreview: true }, { releasePreview: true },
  ]) {
    assert.equal(publicSectorLaunchEnabled({ ...options, ...override }), false);
  }
});
