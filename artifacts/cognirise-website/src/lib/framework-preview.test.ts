import assert from "node:assert/strict";
import test from "node:test";
import { normalizeFrameworkPreviewContent } from "./framework-preview";

const guardrails = {
  heading: "Guardrails are not an authority model",
  opening: "Opening.",
  definition: "Definition.",
  bankExample: { beforeQuote: "Before", quote: "Quote", afterQuote: "After" },
  comparisonHeading: "Three differences that matter",
  comparisonColumns: { guardrails: "Guardrails", authorityModel: "The Agent Authority Model" },
  comparisonRows: [
    { label: "One", guardrails: "Guardrail one", authorityModel: "Authority one", guardrailsEmphasis: "plain", authorityModelEmphasis: "plain" },
    { label: "Two", guardrails: "Guardrail two", authorityModel: "Authority two", guardrailsEmphasis: "plain", authorityModelEmphasis: "plain" },
    { label: "Three", guardrails: "Guardrail three", authorityModel: "Authority three", guardrailsEmphasis: "italic", authorityModelEmphasis: "italic" },
  ],
  unit: { heading: "Why the unit is the whole argument", paragraphs: ["One.", "Two."], emphasis: "Emphasis." },
  firstFigure: { asset: "aam-guardrails-vs-authority.svg", altText: "First diagram.", captionLabel: "Illustration 1 —", captionLead: "First lead.", captionBody: "First remainder." },
  interaction: {
    heading: "How the two interact",
    introduction: "Introduction.",
    exposure: { lead: "Exposure.", body: "Exposure body." },
    evidence: { lead: "Evidence.", body: "Evidence body." },
    controlsIntroduction: "Controls introduction.",
    requiredControls: {
      lead: "Required.", bodyBeforeExamples: "Body.", assuranceExample: "Assurance.",
      controlExample: "Control.", conclusion: "Conclusion.",
    },
    compensatingControls: { lead: "Compensating.", bodyBeforeContent: "Before.", content: "Content.", bodyAfterContent: "After." },
  },
  secondFigure: { asset: "aam-how-they-interact.svg", altText: "Second diagram.", captionLabel: "Illustration 2 —", captionLead: "Second lead.", captionBody: "Second remainder." },
  designRule: { heading: "The design rule this produces", quote: "Quote.", conclusion: "Conclusion.", failure: "Failure.", closingEmphasis: "Closing." },
};

test("malformed framework draft fields normalize into render-safe buyer content", () => {
  const normalized = normalizeFrameworkPreviewContent({
    template: "agent-authority",
    teaser: { unsafe: true },
    methodology: [
      { type: "heading", level: "huge", text: { unsafe: true } },
      { type: "list", items: { not: "an array" } },
      { type: "paragraph", text: "Visible draft copy" },
    ],
    workedExample: {
      reversibility: 4,
      reach: {},
      requestedAuthority: "unknown",
      title: { unsafe: true },
    },
    sectorExamples: [
      null,
      { reversibility: {}, reach: 2, handover: [], title: { unsafe: true } },
    ],
    sources: [{ label: { unsafe: true } }, { label: "Valid citation", url: 42 }],
    mediaIds: "not-an-array",
  });

  assert.ok(normalized);
  assert.equal(normalized.teaser, "");
  assert.deepEqual(normalized.methodology, [
    { type: "list", style: "bullet", items: [] },
    { type: "paragraph", text: "Visible draft copy" },
  ]);
  assert.equal(normalized.workedExample.reversibility, "R1");
  assert.equal(normalized.workedExample.reach, "H1");
  assert.equal(normalized.workedExample.requestedAuthority, "out-of-loop");
  assert.equal(normalized.sectorExamples[0].title, "Untitled handover");
  assert.deepEqual(normalized.sources, [{ label: "Valid citation", url: undefined, accessedAt: undefined }]);
});

test("framework preview accepts only a complete fixed-asset guardrails subsection", () => {
  const normalized = normalizeFrameworkPreviewContent({ template: "agent-authority", guardrails });
  assert.deepEqual(normalized?.guardrails, guardrails);

  const unsafeAsset = normalizeFrameworkPreviewContent({
    template: "agent-authority",
    guardrails: { ...guardrails, firstFigure: { ...guardrails.firstFigure, asset: "/editor-controlled.svg" } },
  });
  assert.equal(unsafeAsset?.guardrails, undefined);

  const legacy = normalizeFrameworkPreviewContent({ template: "agent-authority" });
  assert.equal(legacy?.guardrails, undefined);
});