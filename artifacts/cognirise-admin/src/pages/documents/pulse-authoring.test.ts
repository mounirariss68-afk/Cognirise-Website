import assert from "node:assert/strict";
import test from "node:test";
import { validateCmsContent } from "@workspace/api-zod";
import { hasAuthoredPlatformContent, pulseCreationContent, pulseDefault, pulseTemplateForSlug, replacePlatformTemplate } from "./pulse-authoring";

test("only the exact platform slugs select owner-supplied drafts", () => {
  assert.equal(pulseTemplateForSlug(" cognibase "), "cognibase-pulse");
  assert.equal(pulseTemplateForSlug("cogniagents"), "cogniagents-pulse");
  assert.equal(pulseTemplateForSlug("cognibase-archive"), null);
  assert.equal(pulseTemplateForSlug("cognios"), null);
});

test("creation prefills complete governed drafts without changing other kinds or slugs", () => {
  for (const slug of ["cognibase", "cogniagents"]) {
    const content = pulseCreationContent("platform", slug, { visibility: "hidden", order: 7 });
    assert.equal(content.template, pulseTemplateForSlug(slug));
    assert.equal(content.visibility, "hidden");
    assert.equal(content.order, 7);
    assert.equal(content.pulsePage.sections.length, 7);
    assert.equal(content.pulsePage.sectionOrder.length, 7);
    assert.equal(validateCmsContent("platform", content, "draft").success, true);
  }
  const other = { category: "Custom" };
  assert.equal(pulseCreationContent("platform", "custom", other), other);
  assert.equal(pulseCreationContent("person", "cognibase", other), other);
});

test("template replacement preserves governance and isolates mutable defaults", () => {
  const current = { template: "standard", summary: "Written copy", category: "Written", sections: [{ heading: "Existing" }], sources: [{ label: "Source", url: "https://example.com" }], relatedIds: ["one"], visibility: "restricted" };
  assert.equal(hasAuthoredPlatformContent(current), true);
  const next = replacePlatformTemplate(current, "cognibase-pulse");
  assert.equal(next.visibility, "restricted");
  assert.deepEqual(next.sources, current.sources);
  assert.deepEqual(next.relatedIds, current.relatedIds);
  assert.equal(next.sections.length, 0);
  next.pulsePage.hero.headline = "Changed";
  assert.notEqual(pulseDefault("cognibase-pulse").pulsePage.hero.headline, "Changed");
  assert.equal(replacePlatformTemplate(next, "standard").pulsePage, undefined);
  assert.equal(current.sections[0].heading, "Existing");
});