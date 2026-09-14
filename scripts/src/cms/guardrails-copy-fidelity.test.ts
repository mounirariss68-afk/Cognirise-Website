import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { guardrailsFixture } from "./guardrails-fixture";
import {
  agentAuthorityFrameworkContentSchema,
  frameworkContentSchema,
  validateCmsContent,
} from "@workspace/api-zod";

const root = new URL("../../../", import.meta.url);
const read = (name: string) => readFileSync(fileURLToPath(new URL(`attached_assets/${name}`, root)), "utf8");
const plain = (text: string) => text.replace(/\*\*/g, "").replace(/\*/g, "").replace(/\s+/g, " ").trim();
function strings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(strings);
  if (value && typeof value === "object") return Object.values(value).flatMap(strings);
  return [];
}

test("staging payload excludes editorial instructions and revised-only claims", () => {
  const values = strings(guardrailsFixture);
  for (const value of values) {
    assert.doesNotMatch(value, /<svg|## \d+ ·|\[ILLUSTRATION|Before pasting|Change log against|100% bypass|roughly triple/);
    assert.doesNotMatch(value, /\*\*(?:Intro|Section heading|Primary action|Footer note \(small\)):\*\*/);
  }
});

test("fixture validates against the runtime framework contract", () => {
  assert.equal(frameworkContentSchema.safeParse(guardrailsFixture.content).success, true);
});

test("reviewed Guardrails prose, table cells, actions, SEO and disclaimer remain verbatim", () => {
  const actual = plain(strings(guardrailsFixture).join(" "));
  const source = read("guardrails-page-copy_1789364808531.md");
  const expected: string[] = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line === "---" || line.startsWith("#") || line.startsWith("**[")) continue;
    if (/^\*\*(Section|Nav label|Slug|Sits alongside):/.test(line)) continue;
    if (line.startsWith("|")) {
      if (/^\|[-| ]+\|$/.test(line)) continue;
      expected.push(...line.split("|").slice(1, -1).map(plain));
      continue;
    }
    const field = line.match(/^\*\*[^*]+:\*\*\s*(.+)$/);
    if (field) {
      // The link card has two independently editable text fields.
      if (line.startsWith("**Link card:")) expected.push(...field[1].split(" → ").map(plain));
      else expected.push(plain(field[1]));
      continue;
    }
    if (/^\*\*[^*]+:\*\*$/.test(line)) continue;
    const column = line.match(/^\*\*Column \d — (.+)\*\*$/);
    if (column) { expected.push(plain(column[1])); continue; }
    const phase = line.match(/^\*\*(SET|PROVE|HOLD) · (.+)\*\*$/);
    if (phase) { expected.push(phase[1], plain(phase[2])); continue; }
    expected.push(plain(line.replace(/^>\s*/, "").replace(/^\d+\.\s*/, "")));
  }
  expected.push("What this is built from");
  const missing = expected.filter((value) => value && !actual.includes(value));
  assert.deepEqual(missing, [], `Reviewed source text missing or rewritten:\n${missing.join("\n")}`);
});

for (const name of ["illustration-A-four-layers_1789364808532.svg", "illustration-B-sufficiency_1789364808532.svg"]) {
  test(`all visible reference words and text alternatives are governed: ${name}`, () => {
    const actual = plain(strings(guardrailsFixture).join(" "));
    const source = read(name);
    const labels = [...source.matchAll(/<(?:text|title|desc)\b[^>]*>([\s\S]*?)<\/(?:text|title|desc)>/g)]
      .map((match) => plain(match[1].replace(/<[^>]+>/g, "")));
    assert.deepEqual(labels.filter((label) => !actual.includes(label)), []);
  });
}

test("Guardrails structural destinations, strengths, and method order cannot drift", () => {
  for (const index of guardrailsFixture.content.layers.table.keys()) {
    const strengthDrift = structuredClone(guardrailsFixture.content);
    strengthDrift.layers.table[index].strength = strengthDrift.layers.table[index].strength === 4 ? 3 : 4;
    assert.equal(frameworkContentSchema.safeParse(strengthDrift).success, false);

    const labelDrift = structuredClone(guardrailsFixture.content);
    labelDrift.layers.table[index].strengthLabel = "incorrect strength";
    assert.equal(frameworkContentSchema.safeParse(labelDrift).success, false);

    const diagramStrengthDrift = structuredClone(guardrailsFixture.content);
    diagramStrengthDrift.layers.diagram.rows[index].strength = diagramStrengthDrift.layers.diagram.rows[index].strength === 4 ? 3 : 4;
    assert.equal(frameworkContentSchema.safeParse(diagramStrengthDrift).success, false);

    const diagramLabelDrift = structuredClone(guardrailsFixture.content);
    diagramLabelDrift.layers.diagram.rows[index].strengthLabel = "incorrect strength";
    assert.equal(frameworkContentSchema.safeParse(diagramLabelDrift).success, false);
  }

  const thresholdDrift = structuredClone(guardrailsFixture.content);
  thresholdDrift.layers.diagram.thresholdAfter = "architecture" as never;
  assert.equal(frameworkContentSchema.safeParse(thresholdDrift).success, false);

  const missingDiagramRow = structuredClone(guardrailsFixture.content);
  missingDiagramRow.layers.diagram.rows.pop();
  assert.equal(frameworkContentSchema.safeParse(missingDiagramRow).success, false);

  for (const index of guardrailsFixture.content.stoppingRule.exposures.keys()) {
    const destinationDrift = structuredClone(guardrailsFixture.content);
    destinationDrift.stoppingRule.exposures[index].enforcementLayer = destinationDrift.stoppingRule.exposures[index].enforcementLayer === "architecture" ? "runtime" : "architecture";
    assert.equal(frameworkContentSchema.safeParse(destinationDrift).success, false);

    const additionDrift = structuredClone(guardrailsFixture.content);
    additionDrift.stoppingRule.exposures[index].additionId = additionDrift.stoppingRule.exposures[index].additionId === "monitoring" ? "none" : "monitoring";
    assert.equal(frameworkContentSchema.safeParse(additionDrift).success, false);

    const diagramDestinationDrift = structuredClone(guardrailsFixture.content);
    diagramDestinationDrift.stoppingRule.diagram.bands[index].destination = diagramDestinationDrift.stoppingRule.diagram.bands[index].destination === "architecture" ? "runtime" : "architecture";
    assert.equal(frameworkContentSchema.safeParse(diagramDestinationDrift).success, false);

    const diagramAdditionDrift = structuredClone(guardrailsFixture.content);
    diagramAdditionDrift.stoppingRule.diagram.bands[index].additionId = diagramAdditionDrift.stoppingRule.diagram.bands[index].additionId === "monitoring" ? "none" : "monitoring";
    assert.equal(frameworkContentSchema.safeParse(diagramAdditionDrift).success, false);
  }

  const phaseDrift = structuredClone(guardrailsFixture.content);
  [phaseDrift.method.phases[0], phaseDrift.method.phases[1]] = [phaseDrift.method.phases[1], phaseDrift.method.phases[0]];
  assert.equal(frameworkContentSchema.safeParse(phaseDrift).success, false);
});

test("legacy Agent Authority content defaults only an absent template", () => {
  const authority = {
    teaser: "Authority teaser",
    handoverExplanation: "Authority handover explanation",
    methodology: [{ type: "paragraph" as const, text: "Methodology paragraph" }],
    workedExample: {
      sector: "Travel",
      title: "Authority example",
      handover: "action" as const,
      reversibility: "R3" as const,
      reach: "H2" as const,
      exposureBand: "E2" as const,
      oversight: "On the loop, with a stated intervention window",
      detail: "A complete authority example.",
      requestedAuthority: "on-loop" as const,
      interventionWindow: "Before the action.",
      accountableRole: "Operations owner",
      promotionEvidence: "Reviewed evidence.",
      automaticDemotion: "Any failed control.",
    },
  };
  const expected = agentAuthorityFrameworkContentSchema.parse(authority);
  assert.deepEqual(frameworkContentSchema.parse(authority), expected);

  const explicitUnknown = { ...authority, template: "unknown" };
  assert.equal(validateCmsContent("framework", explicitUnknown, "draft").success, false);
  assert.equal(validateCmsContent("framework", explicitUnknown, "publish").success, false);

  const explicitUndefined = { ...authority, template: undefined };
  assert.equal(frameworkContentSchema.safeParse(explicitUndefined).success, false);
  assert.equal(validateCmsContent("framework", explicitUndefined, "draft").success, false);
});