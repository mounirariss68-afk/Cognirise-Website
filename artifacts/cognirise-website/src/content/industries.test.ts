import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { validateCmsContent } from "@workspace/api-zod";
import { IndustryEditorialView } from "@/components/industries/IndustryEditorial";
import { EducationEditorialView } from "@/components/industries/EducationEditorial";
import { INDUSTRIES } from "./industries";

test("publishes exactly six complete, distinct industry records", () => {
  assert.equal(INDUSTRIES.length, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.slug)).size, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.thesis)).size, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.opportunity)).size, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.selectedWork.description)).size, 6);
  for (const item of INDUSTRIES) {
    assert.ok(item.opportunity);
    assert.ok(item.capabilities.length >= 2);
    assert.ok(item.capabilities.every((capability) => capability.title && capability.body));
    assert.ok(item.selectedWork.description);
    assert.equal(item.pressures.length, 3);
    assert.ok(item.reversal.body);
    assert.ok(item.myth.verdict);
    assert.ok(item.gcc);
    assert.ok(item.sources.length >= 3);
    assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
    assert.ok(item.uses.every((use) => use.evidence && use.boundary));
  }
});

test("does not publish internal research-production language", () => {
  const published = JSON.stringify(INDUSTRIES).toLowerCase();
  assert.doesNotMatch(published, /editor note|placeholder|tbd|claude/);
});

test("keeps evidence classifications and source labels visible", () => {
  const allowed = new Set(["Official source", "Independent study", "Company-reported", "Vendor claim"]);
  for (const item of INDUSTRIES) {
    assert.ok(item.sources.every((source) => allowed.has(source.kind)));
    assert.ok(item.sources.every((source) => source.label && source.publisher));
  }
});

test("every compiled industry passes the governed publish contract", () => {
  for (const industry of INDUSTRIES) {
    const { slug: _slug, ...content } = industry;
    const result = validateCmsContent("industry", content, "publish");
    assert.equal(result.success, true, result.success ? undefined : result.errors.join("; "));
  }
});

test("renders all six migrated CMS industry payloads without compiled fallback", () => {
  const payload = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "../../scripts/cms/output/import-payload.json"),
    "utf8",
  )) as { operations: Array<{ kind: string; slug: string; payload: { content: Omit<(typeof INDUSTRIES)[number], "slug"> } }> };
  const operations = payload.operations.filter((operation) => operation.kind === "industry");
  assert.equal(operations.length, 6);

  for (const operation of operations) {
    const compiled = INDUSTRIES.find((industry) => industry.slug === operation.slug);
    assert.ok(compiled);
    const { slug: _slug, ...compiledContent } = compiled;
    assert.deepEqual(operation.payload.content, compiledContent);
    const validation = validateCmsContent("industry", operation.payload.content, "publish");
    assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));
    const html = renderToStaticMarkup(createElement(
      Router,
      { ssrPath: `/industries/${operation.slug}` },
      createElement(IndustryEditorialView, {
        view: { ...operation.payload.content, slug: operation.slug } as (typeof INDUSTRIES)[number],
      }),
    ));
    assert.ok(html.includes(operation.payload.content.name.replaceAll("&", "&amp;")));
    assert.match(html, /source trail/i);
    assert.doesNotMatch(html, /under review/i);
  }
});

test("publishes the specialist higher education POV with balanced themes and supplied evidence", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education");
  assert.ok(education?.educationPov);
  assert.equal(education.educationPov.convictions.length, 5);
  assert.equal(education.educationPov.valueDomains.length, 3);
  assert.equal(education.educationPov.targetState.length, 6);
  assert.deepEqual(education.educationPov.roadmap.map((step) => step.horizon), ["0–90 days", "3–9 months", "9–18 months"]);

  const copy = JSON.stringify(education).toLowerCase();
  for (const theme of ["teaching", "assessment", "research", "student success", "operations", "agent platform", "people and change", "evidence and scale", "uae", "saudi"]) {
    assert.ok(copy.includes(theme), `missing Education theme: ${theme}`);
  }
  for (const institution of ["harvard", "yale", "caltech", "mit", "stanford", "university of california"]) {
    assert.ok(copy.includes(institution), `missing institutional signal: ${institution}`);
  }

  const html = renderToStaticMarkup(createElement(
    Router,
    { ssrPath: "/industries/education" },
    createElement(EducationEditorialView, { view: education }),
  ));
  assert.match(html, /From isolated copilots to coordinated institutional action/i);
  assert.match(html, /Teaching and assessment/i);
  assert.match(html, /Research and discovery/i);
  assert.match(html, /Student success and operations/i);
  assert.match(html, /Identify and redesign one measurable institutional journey/i);
  assert.doesNotMatch(html, /Operating pressures|governed capability|required boundary|supporting evidence and operating guardrails|route to a governed build/i);
});