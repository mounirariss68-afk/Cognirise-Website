import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./IndustryPicker.tsx", import.meta.url), "utf8");

test("is CMS-backed and provides explicit delivery states", () => {
  assert.match(source, /useCmsCollection\("industry", INDUSTRIES/);
  assert.match(source, /role="status"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /No industry points of view are currently published/);
});

test("previews disclosures without making their triggers navigation links", () => {
  assert.match(source, /mode="editorial"[\s\S]*previewOverridesSelection[\s\S]*previewExpands/);
  assert.match(source, /<SpatialDisclosureTrigger/);
  assert.doesNotMatch(source, /<SpatialDisclosureTrigger[^>]*asChild/);
  assert.match(source, /<Link href=\{industry\.href\} className="home-industry-link"/);
});

test("supports a compact overview-only layout without changing the shared homepage default", () => {
  assert.match(source, /compact\?: boolean/);
  assert.match(source, /compact = false/);
  assert.match(source, /home-industry-disclosure--compact/);
  assert.match(source, /home-industry-disclosure--compact[\s\S]*home-industry-row\{height:196px\}/);
  assert.match(source, /home-industry-disclosure--compact \.home-industry-row:has\(\.home-industry-item\.active\) \.home-industry-item\.active\{grid-template-rows:130px minmax\(0,1fr\)\}/);
  assert.match(source, /home-industry-disclosure--compact \.home-industry-orientation\{font-size:12px/);
  assert.match(source, /home-industry-disclosure--compact \.home-industry-detail\{font-size:12px/);
  assert.match(source, /@media\(max-width:767px\)[\s\S]*home-industry-disclosure--compact \.home-industry-row:has\(\.home-industry-item\.active\)\{height:auto\}/);
});

test("preserves responsive visuals and reduced-motion behavior", () => {
  assert.match(source, /@media\(max-width:767px\)/);
  assert.match(source, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(source, /\.home-industry-item\.active \.home-industry-visual:after/);
  assert.match(source, /\.home-industry-item\.active \.home-industry-orientation,.home-industry-item\.active \.home-industry-detail/);
});