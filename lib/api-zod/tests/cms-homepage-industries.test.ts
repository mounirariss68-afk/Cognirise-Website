import assert from "node:assert/strict";
import test from "node:test";
import { cmsLandingPageContentSchema } from "../src/cms-content";

const pageWithIndustries = (industryIds?: string[]) => ({
  schemaVersion: 1,
  pagePath: "/",
  template: "landing",
  narrative: "Homepage",
  sections: [{
    type: "narrative",
    id: "home-industries",
    order: 10,
    heading: "Industries",
    body: [{ type: "paragraph", text: "A market-approved subtitle." }],
    ...(industryIds ? { industryIds } : {}),
  }],
});

test("homepage industry selection is optional for existing approved revisions", () => {
  assert.equal(cmsLandingPageContentSchema.safeParse(pageWithIndustries()).success, true);
});

test("homepage industry selection accepts ordered subsets of the six canonical records", () => {
  const result = cmsLandingPageContentSchema.safeParse(pageWithIndustries([
    "education",
    "financial-services",
    "telecoms",
  ]));
  assert.equal(result.success, true);
  if (result.success) {
    const section = result.data.sections[0];
    assert.equal(section.type, "narrative");
    if (section.type === "narrative") {
      assert.deepEqual(section.industryIds, ["education", "financial-services", "telecoms"]);
    }
  }
});

test("homepage industry selection rejects unknown, duplicate, empty, and over-limit identifiers", () => {
  for (const ids of [
    [],
    ["education", "education"],
    ["not-a-canonical-industry"],
    [
      "financial-services", "telecoms", "travel-hospitality",
      "energy-resources", "public-sector", "education", "telecoms",
    ],
  ]) {
    assert.equal(cmsLandingPageContentSchema.safeParse(pageWithIndustries(ids)).success, false);
  }
});