import assert from "node:assert/strict";
import test from "node:test";
import { caseSectors, directlyRelatedCases, normalizeCaseFilterValue, type RelatedCase } from "./case-study-model";

const base = {
  slug: "bounded-operations",
  disclosure: "anonymized",
  industrySlugs: ["financial-services"],
  relatedIndustries: ["financial-services"],
  publicEvidenceStatus: "approved",
} as RelatedCase;

test("caseSectors normalizes singular and list relationships", () => {
  const item = { ...base, sector: "telecoms", sectors: ["public-sector"] };
  assert.deepEqual(caseSectors(item), ["public-sector", "financial-services", "telecoms"]);
});

test("direct evidence excludes restricted, unapproved, and prohibited industry rails", () => {
  const restricted = { ...base, slug: "restricted", disclosure: "restricted" };
  const unapproved = { ...base, slug: "unapproved", approvedForIndustry: false };
  assert.deepEqual(directlyRelatedCases([base, restricted, unapproved], "financial-services").map((item) => item.slug), ["bounded-operations"]);
  assert.deepEqual(directlyRelatedCases([base], "energy-resources"), []);
  assert.deepEqual(directlyRelatedCases([base], "education"), []);
});

test("case filter analytics uses the API's lowercase all sentinel", () => {
  assert.equal(normalizeCaseFilterValue("All"), "all");
  assert.equal(normalizeCaseFilterValue("Financial Services"), "Financial Services");
  assert.equal(normalizeCaseFilterValue("production"), "production");
});