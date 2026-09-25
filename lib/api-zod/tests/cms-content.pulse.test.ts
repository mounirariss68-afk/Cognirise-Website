import assert from "node:assert/strict";
import test from "node:test";
import {
  cognibasePulseDraftContent,
  cogniagentsPulseDraftContent,
} from "../src/pulse-platform-defaults";
import { platformContentSchema, validateCmsContent, validateCmsSnapshot } from "../src/cms-content";

test("both approved Pulse draft defaults satisfy the typed platform contract", () => {
  assert.equal(platformContentSchema.safeParse(cognibasePulseDraftContent).success, true);
  assert.equal(platformContentSchema.safeParse(cogniagentsPulseDraftContent).success, true);
});

test("publish validation accepts a complete Pulse variant with governance metadata", () => {
  const content = structuredClone(cognibasePulseDraftContent);
  content.sources = [{ label: "Approved CogniBase page brief", url: "https://example.com/cognibase-brief" }];
  content.verificationDate = "2026-01-01";
  content.reviewDate = "2026-01-01";
  assert.equal(validateCmsContent("platform", content, "publish").success, true);
});

test("snapshot publish requires canonical slugs for Pulse templates", () => {
  const snapshot = {
    slug: "cogniagents",
    title: "CogniBase",
    content: {
      ...structuredClone(cognibasePulseDraftContent),
      sources: [{ label: "Approved CogniBase page brief", url: "https://example.com/cognibase-brief" }],
      verificationDate: "2026-01-01",
      reviewDate: "2026-01-01",
    },
    mediaIds: [],
    markets: ["global"],
  };
  assert.equal(validateCmsSnapshot("platform", snapshot, "publish").success, false);
  assert.equal(validateCmsSnapshot("platform", { ...snapshot, slug: "cognibase" }, "publish").success, true);
  assert.equal(validateCmsSnapshot("platform", snapshot, "draft").success, false);
  const agentsSnapshot = {
    ...snapshot,
    slug: "cognibase",
    title: "CogniAgents",
    content: {
      ...structuredClone(cogniagentsPulseDraftContent),
      sources: [{ label: "Approved CogniAgents page brief", url: "https://example.com/cogniagents-brief" }],
      verificationDate: "2026-01-01",
      reviewDate: "2026-01-01",
    },
  };
  assert.equal(validateCmsSnapshot("platform", agentsSnapshot, "publish").success, false);
  assert.equal(validateCmsSnapshot("platform", { ...agentsSnapshot, slug: "cogniagents" }, "publish").success, true);
});

test("publish rejects Pulse CTAs targeting hidden or absent section anchors", () => {
  const content = structuredClone(cognibasePulseDraftContent);
  content.sources = [{ label: "Approved CogniBase page brief", url: "https://example.com/cognibase-brief" }];
  content.verificationDate = "2026-01-01";
  content.reviewDate = "2026-01-01";
  const hiddenSection = structuredClone(content);
  hiddenSection.pulsePage.sections.find((section) => section.id === "how-it-works")!.visible = false;
  const snapshot = {
    slug: "cognibase",
    title: "CogniBase",
    content: hiddenSection,
    mediaIds: [],
    markets: ["global"],
  };
  assert.equal(validateCmsSnapshot("platform", snapshot, "publish").success, false);

  const sectionLink = structuredClone(content);
  sectionLink.pulsePage.hero.ctas[1].href = "/contact";
  sectionLink.pulsePage.sections.find((section) => section.id === "how-it-works")!.visible = false;
  sectionLink.pulsePage.sections.find((section) => section.id === "capabilities")!.links = [
    { label: "How it works", href: "#how-it-works" },
  ];
  const sectionLinkSnapshot = { ...snapshot, content: sectionLink };
  assert.equal(validateCmsSnapshot("platform", sectionLinkSnapshot, "publish").success, false);

  const absentAnchor = structuredClone(content);
  absentAnchor.pulsePage.hero.ctas[1].href = "#problem";
  assert.equal(platformContentSchema.safeParse(absentAnchor).success, false);
});

test("Pulse drafts can be incomplete while explicit template variants stay matched", () => {
  assert.equal(validateCmsContent("platform", {
    template: "cognibase-pulse",
    pulsePage: { variant: "cognibase-pulse" },
  }, "draft").success, true);
  assert.equal(validateCmsContent("platform", {
    template: "cognibase-pulse",
    pulsePage: { variant: "cogniagents-pulse" },
  }, "draft").success, false);
});

test("Pulse validation rejects incomplete sections, duplicate IDs, and duplicate order entries", () => {
  const missingSection = structuredClone(cognibasePulseDraftContent);
  missingSection.pulsePage.sections.pop();
  assert.equal(platformContentSchema.safeParse(missingSection).success, false);

  const duplicateSection = structuredClone(cognibasePulseDraftContent);
  duplicateSection.pulsePage.sections[1] = {
    ...duplicateSection.pulsePage.sections[1],
    id: "problem",
  };
  assert.equal(platformContentSchema.safeParse(duplicateSection).success, false);

  const duplicateOrder = structuredClone(cognibasePulseDraftContent);
  duplicateOrder.pulsePage.sectionOrder[1] = "problem";
  assert.equal(platformContentSchema.safeParse(duplicateOrder).success, false);
});

test("Pulse validation rejects empty, mismatched, unsafe, and unstructured content", () => {
  const emptyPayload = structuredClone(cognibasePulseDraftContent);
  emptyPayload.pulsePage = undefined as never;
  assert.equal(platformContentSchema.safeParse(emptyPayload).success, false);

  const mismatched = structuredClone(cognibasePulseDraftContent);
  mismatched.template = "cogniagents-pulse";
  assert.equal(platformContentSchema.safeParse(mismatched).success, false);

  const unsafeLink = structuredClone(cognibasePulseDraftContent);
  unsafeLink.pulsePage.hero.ctas[0].href = "javascript:alert(1)";
  assert.equal(platformContentSchema.safeParse(unsafeLink).success, false);

  const markup = structuredClone(cognibasePulseDraftContent);
  markup.pulsePage.hero.headline = "<script>alert(1)</script>";
  assert.equal(platformContentSchema.safeParse(markup).success, false);

  const unknownField = { ...cognibasePulseDraftContent, arbitraryCss: "position:fixed" };
  assert.equal(platformContentSchema.safeParse(unknownField).success, false);
});

test("legacy standard platform content remains valid without Pulse payload", () => {
  assert.equal(platformContentSchema.safeParse({
    category: "Platform",
    summary: "Existing standard platform summary.",
    template: "standard",
  }).success, true);
});