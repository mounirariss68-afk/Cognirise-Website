import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./IndustriesOverview.tsx", import.meta.url), "utf8");

test("composes the overview around the shared picker and one capability story", () => {
  assert.match(source, /<IndustryPicker[\s\S]*id="industries"/);
  assert.match(source, /Agentic platforms/);
  assert.match(source, /Sovereign & regulated AI/);
  assert.match(source, /AI-native consulting & engineering/);
  assert.match(source, /Responsible delivery/);
  assert.match(source, /href="\/value-scan"/);
});

test("removes the duplicate and controls-led industry chapters", () => {
  assert.doesNotMatch(source, /Make controls part of the flow/);
  assert.doesNotMatch(source, /Critical infrastructure/);
  assert.doesNotMatch(source, /io-view-link/);
  assert.doesNotMatch(source, /SpatialDisclosure/);
});