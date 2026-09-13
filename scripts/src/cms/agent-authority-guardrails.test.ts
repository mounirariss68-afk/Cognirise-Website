import assert from "node:assert/strict";
import test from "node:test";
import { frameworkGuardrailsSubsectionSchema } from "@workspace/api-zod";
import {
  agentAuthorityGuardrails,
  canonicalJson,
  stagedFrameworkPayload,
} from "./agent-authority-guardrails.js";

test("guardrails subsection admits only the two fixed diagram identifiers", () => {
  assert.equal(frameworkGuardrailsSubsectionSchema.safeParse(agentAuthorityGuardrails).success, true);
  assert.equal(frameworkGuardrailsSubsectionSchema.safeParse({
    ...agentAuthorityGuardrails,
    firstFigure: { ...agentAuthorityGuardrails.firstFigure, asset: "https://untrusted.example/diagram.svg" },
  }).success, false);
  assert.equal(frameworkGuardrailsSubsectionSchema.safeParse({
    ...agentAuthorityGuardrails,
    unexpectedHtml: "<script>alert(1)</script>",
  }).success, false);
});

test("guardrails staging only adds the optional structured field", () => {
  const current = {
    slug: "agent-authority-model",
    title: "The Agent Authority Model",
    summary: "Existing summary",
    content: { schemaVersion: 1, template: "agent-authority", teaser: "Existing draft copy" },
    seo: {},
    mediaIds: [],
    markets: ["uae"],
  };
  const staged = stagedFrameworkPayload(current);

  assert.deepEqual(staged.content, { ...current.content, guardrails: agentAuthorityGuardrails });
  assert.equal(canonicalJson(staged.content), canonicalJson({ ...current.content, guardrails: agentAuthorityGuardrails }));
  assert.equal(agentAuthorityGuardrails.interaction.requiredControls.betweenExamples, undefined);
  assert.equal(agentAuthorityGuardrails.heading, "Guardrails are not an authority model");
  assert.equal(agentAuthorityGuardrails.comparisonRows[2].guardrailsEmphasis, "italic");
  assert.equal(agentAuthorityGuardrails.comparisonRows[2].authorityModelEmphasis, "italic");
  assert.deepEqual(agentAuthorityGuardrails.comparisonColumns, {
    guardrails: "Guardrails",
    authorityModel: "The Agent Authority Model",
  });
  assert.equal(Object.hasOwn(agentAuthorityGuardrails.interaction.requiredControls, "betweenExamples"), false);
  assert.doesNotMatch(JSON.stringify(agentAuthorityGuardrails), /By contrast,/);
  assert.deepEqual(agentAuthorityGuardrails.firstFigure, {
    asset: "aam-guardrails-vs-authority.svg",
    altText: "Left: one agent inside a single guardrail perimeter, with four acts of different consequence all leaving under the same authority. Right: the same four acts governed separately as handovers, each with its own type, exposure rating and authority level.",
    captionLabel: "Illustration 1 —",
    captionLead: "Guardrails govern the agent; the Agent Authority Model governs the handover.",
    captionBody: "Four acts of very different consequence, protected identically on the left and rated individually on the right. Handovers shown are illustrative.",
  });
  assert.deepEqual(agentAuthorityGuardrails.secondFigure, {
    asset: "aam-how-they-interact.svg",
    altText: "A chart with authority rising vertically from in the loop to out of the loop, and exposure rising left to right. A descending staircase marks the ceiling exposure sets on authority. Required controls sit in the permitted region below it, an arrow shows a handover promoted upward on measured evidence, and a marker above the ceiling shows a compensating control where authority is carried by an approved template rather than by the agent.",
    captionLabel: "Illustration 2 —",
    captionLead: "Exposure sets the ceiling; evidence earns the climb.",
    captionBody: "Everything under the staircase is permitted, and that is where required controls sit. Promotion moves a handover up within the permitted region. Only a compensating control — a guardrail that carries the authority itself — moves the ceiling.",
  });
  assert.throws(() => stagedFrameworkPayload(staged), /already has guardrails content/);
});