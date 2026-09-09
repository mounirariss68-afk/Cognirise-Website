import assert from "node:assert/strict";
import test from "node:test";
import { newLandingNarrativeSection, updateLandingSection } from "./landing-section-fields.ts";

test("landing structured controls create and edit a publish-ready shape without JSON input", () => {
  const initial = newLandingNarrativeSection(0);
  const sections = updateLandingSection([initial], 0, {
    id: "hero",
    body: [{ type: "paragraph", text: "A governed homepage narrative." }],
  });
  sections.push({ type: "cta", id: "primary-action", order: 1, label: "Talk to us", href: "/contact", style: "primary" });
  const content = {
    schemaVersion: 1,
    pagePath: "/",
    template: "landing",
    narrative: "A governed homepage narrative.",
    sections,
    seo: {},
    legal: {},
    visualReferences: [],
    visibility: "public",
    order: 0,
    sources: [{ label: "Approved copy deck", url: "https://example.com/copy" }],
    verificationDate: "2026-09-06",
    reviewDate: "2027-03-06",
    relatedIds: [],
  };
  assert.equal(content.sections[0].id, "hero");
  assert.equal(content.sections[1].type, "cta");
  assert.deepEqual(initial, {
    type: "narrative",
    id: "section-1",
    order: 0,
    body: [{ type: "paragraph", text: "" }],
  });
});