import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { countryImageRegion, launchStageImage } from "./launch-region";

test("country image mapping has a Europe rest-of-world and failure default", () => {
  for (const [country, region] of [["AE", "uae"], ["SA", "ksa"], ["TR", "turkiye"], ["DE", "europe"], ["US", "europe"], ["", "europe"], ["sa", "ksa"]]) {
    assert.equal(countryImageRegion(country), region);
  }
});
test("analytics cannot manufacture an explicit UAE choice before country detection", () => {
  const analytics = readFileSync(new URL("./analytics.ts", import.meta.url), "utf8");
  assert.match(analytics, /if \(!LAUNCH_POLICY\.enabled && url\.searchParams\.get\("market"\) !== market\)/);
});
test("every launch region has four existing immutable bundled stage images", () => {
  for (const region of ["uae", "ksa", "turkiye", "europe"] as const) {
    for (const stage of ["innovate", "demonstrate", "activate", "operate"]) {
      const image = launchStageImage(region, stage);
      assert.ok(existsSync(new URL(`../../public${image}`, import.meta.url)), `${region}/${stage}`);
    }
  }
});
