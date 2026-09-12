import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../", import.meta.url);

test("dashboard labels match the existing seven-day review query and Value Scan formula", async () => {
  const page = await readFile(new URL("src/pages/Dashboard.tsx", adminRoot), "utf8");

  assert.match(page, /In-review drafts older than 7 days \(UTC\)/);
  assert.doesNotMatch(page, />48hrs/);
  assert.match(page, /Value Scan \/ CTA Conversion/);
  assert.match(page, /Value Scan submissions ÷ CTA clicks/);
  assert.match(page, /analytics\.ctaConversionRate/);
});
