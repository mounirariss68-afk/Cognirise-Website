import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./BlueprintJourney.tsx", import.meta.url), "utf8");

test("BlueprintJourney uses SpatialDisclosure for the expanding image effect", () => {
  assert.match(source, /SpatialDisclosure/);
  assert.match(source, /SpatialDisclosureItem/);
  assert.match(source, /SpatialDisclosurePanel/);
  assert.match(source, /SpatialDisclosureTrigger/);
});

test("BlueprintJourney keeps text content inside the image panels", () => {
  assert.doesNotMatch(source, /role="tablist"/);
  assert.doesNotMatch(source, /role="tabpanel"/);
  assert.match(source, /blueprint-tagline/);
  assert.match(source, /blueprint-description/);
  assert.match(source, /blueprint-outcome/);
});

test("BlueprintJourney removes explicit explore/close labels (as requested)", () => {
  assert.doesNotMatch(source, /Explore/i);
  assert.doesNotMatch(source, /Close/i);
});

test("BlueprintJourney uses a controlled gradient for readability without hiding artwork", () => {
  assert.match(source, /linear-gradient\(0deg, rgba\(7,25,54,0\.95\) 0%, rgba\(7,25,54,0\.6\) 35%, transparent 70%\)/);
  assert.match(source, /linear-gradient\(0deg, rgba\(7,25,54,0\.98\) 0%, rgba\(7,25,54,0\.85\) 55%, transparent 90%\)/);
});

test("BlueprintJourney makes the full image card a hover and click target", () => {
  assert.match(source, /\.blueprint-trigger:before\s*\{[\s\S]*position: absolute; inset: 0;/);
  assert.match(source, /\.blueprint-panel\s*\{[\s\S]*pointer-events: none;/);
});
