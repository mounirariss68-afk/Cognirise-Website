import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AgentAuthorityModel.tsx", import.meta.url), "utf8");
const comparisonDiagram = readFileSync(
  new URL("../components/agent-authority/ComparisonDiagram.tsx", import.meta.url),
  "utf8",
);
const interactionChart = readFileSync(
  new URL("../components/agent-authority/InteractionChart.tsx", import.meta.url),
  "utf8",
);

test("Guardrails is one h2 section after the assessment and before Standards provenance", () => {
  const assessmentIndex = source.indexOf("<AgentAuthorityAssessment");
  const guardrailsAnchorIndex = source.indexOf('id="guardrails-and-authority"');
  const standardsIndex = source.indexOf("Standards provenance");

  assert.ok(assessmentIndex >= 0, "the page still renders the canonical assessment");
  assert.ok(guardrailsAnchorIndex > assessmentIndex, "guardrails must follow the assessment");
  assert.ok(standardsIndex > guardrailsAnchorIndex, "guardrails must precede Standards provenance");
  assert.equal(
    (source.match(/id="guardrails-and-authority"/g) ?? []).length,
    1,
    "the deep-link anchor must appear exactly once",
  );
  assert.match(
    source,
    /<h2\b[^>]*id="guardrails-and-authority"[^>]*>/,
    "the deep-link must identify the top-level guardrails h2 heading",
  );
  assert.doesNotMatch(source, /<h1\b[^>]*id="guardrails-and-authority"[^>]*>/);
  assert.doesNotMatch(source, /<h3\b[^>]*id="guardrails-and-authority"[^>]*>/);
  assert.doesNotMatch(source, /<section\s+id="guardrails-and-authority"/);
});

test("Guardrails figures are native selectable objects, not legacy image or SVG renderers", () => {
  const guardrailsIndex = source.indexOf('id="guardrails-and-authority"');
  const standardsIndex = source.indexOf("Standards provenance");
  assert.ok(guardrailsIndex >= 0 && standardsIndex > guardrailsIndex);
  const guardrailsMarkup = source.slice(guardrailsIndex, standardsIndex);

  assert.doesNotMatch(guardrailsMarkup, /<img\b/i);
  assert.doesNotMatch(guardrailsMarkup, /<svg\b|<canvas\b/i);
  assert.doesNotMatch(guardrailsMarkup, /assetUrl\(/);
});

test("Guardrails markup keeps CMS table labels, emphasis, captions, and alt descriptions", () => {
  assert.match(source, /\{guardrails\.comparisonColumns\.guardrails\}/);
  assert.match(source, /\{guardrails\.comparisonColumns\.authorityModel\}/);
  assert.match(source, /row\.guardrailsEmphasis/);
  assert.match(source, /row\.authorityModelEmphasis/);
  assert.match(source, /<ComparisonDiagram\s+figure=\{guardrails\.firstFigure\}/);
  assert.match(source, /<InteractionChart\s+figure=\{guardrails\.secondFigure\}/);
  for (const component of [comparisonDiagram, interactionChart]) {
    assert.match(component, /aria-label=\{figure\.altText\}/);
    assert.match(component, /figure\.captionLabel/);
    assert.match(component, /figure\.captionLead/);
    assert.match(component, /figure\.captionBody/);
  }
});

test("Interaction chart keeps the native canonical permitted grid", () => {
  assert.match(interactionChart, /grid-cols-5 grid-rows-3/);
  assert.match(interactionChart, /getCeiling\(col\.eBand\)/);
  assert.match(interactionChart, /const ceilingRow = canonicalCeiling === "out-of-loop" \? 0 : canonicalCeiling === "on-loop" \? 1 : 2/);
  assert.match(interactionChart, /const permitted = rowIndex >= ceilingRow/);
  assert.match(interactionChart, /permitted \? "bg-white\/\[0\.08\]" : "bg-\[#ff775d\]\/\[0\.04\]"/);
  for (const band of ["E1", "E2", "E3", "E4", "E5"]) {
    assert.match(interactionChart, new RegExp(`band: "${band}"`));
  }
});

test("Existing ceiling explorer and control specification precede the worked example", () => {
  const ceiling = source.indexOf('id="authority-ceiling"');
  const explorer = source.indexOf("<MatrixExplorer />");
  const controls = source.indexOf("Six answers become a control specification.");
  const worked = source.indexOf("<Kicker>Worked example");
  assert.ok(ceiling > 0 && explorer > ceiling && controls > explorer && worked > controls);
  assert.match(comparisonDiagram, /name: "Book an appointment", profile: "Action · R2 \/ H2", oversight: "on the loop"/);
  assert.match(interactionChart, /onKeyDown=/);
  assert.match(interactionChart, /region\.scrollLeft \+=/);
});