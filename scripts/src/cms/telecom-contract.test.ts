import assert from "node:assert/strict";
import test from "node:test";
import { telecomPovSchema, validateCmsSnapshot, belongsToIndustrySection } from "@workspace/api-zod";
import { telecomPov } from "./telecom-content";
import { readFileSync } from "node:fs";

test("Telecom source inventory and references are complete", () => {
  assert.equal(telecomPov.departments.length, 18);
  assert.equal(telecomPov.departments.reduce((n, d) => n + d.roles.length, 0), 115);
  assert.equal(telecomPovSchema.safeParse(JSON.parse(JSON.stringify(telecomPov))).success, true);
  assert.equal(belongsToIndustrySection("content.telecomPov.metrics.0.definition", "sources"), true);
  assert.equal(belongsToIndustrySection("content.telecomPov.departments.0.roles.0.body", "capabilities"), true);
});
test("Missing evidence, unresolved values and dangling metric references fail", () => {
  for (const mutate of [
    (v: any) => { v.metrics[0].classification = "reported"; },
    (v: any) => { v.metrics[0].classification = "unresolved"; },
    (v: any) => { v.departments[0].metricIds = ["missing"]; },
    (v: any) => { v.metrics[1].id = v.metrics[0].id; },
  ]) {
    const data = structuredClone(telecomPov);
    mutate(data);
    assert.equal(telecomPovSchema.safeParse(data).success, false);
  }
});
test("Saved candidate is draft-valid, publication blocked and old editions compatible", () => {
  const candidate = JSON.parse(readFileSync(new URL("../../cms/output/telecom-review-candidate.json", import.meta.url), "utf8"));
  assert.equal(validateCmsSnapshot("industry", candidate, "draft").success, true);
  assert.equal(validateCmsSnapshot("industry", candidate, "publish").success, false);
  delete candidate.content.telecomPov;
  assert.equal(validateCmsSnapshot("industry", candidate, "draft").success, true);
});
