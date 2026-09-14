import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import {
  aiValueToScaleEditorial,
  heroSeed,
} from "../../../../lib/api-zod/src/methodology-editorial/ai-value-to-scale";

test("AI Value-to-Scale seed retains the baseline hero, CTAs, and six source links", () => {
  assert.deepEqual(heroSeed, {
    breadcrumb: "Methodologies / 01",
    title: "AI Value-to-Scale.",
    description: "Can this organisation repeatedly move valuable AI into sustained operation?",
    supportingText: "This proprietary Cognirise model assesses the conditions that connect value, delivery, adoption, authority and outcomes. It does not rank AI consumption, certify compliance or claim a statistical benchmark.",
    imageSrc: "/images/cognirise/method-vts-v2.jpg",
    imageAlt: "Violet, pink and orange light streams connect architectural portals and converge at a circular portal on the right.",
    imagePosition: "right center",
    imageCaptionSubtitle: "Systemic Readiness",
    imageCaptionTitle: "Connecting opportunity to sustained value.",
  });
  assert.deepEqual(aiValueToScaleEditorial.seed.heroActions, {
    assessment: { label: "Start your assessment", href: "#assessment" },
    model: { label: "See the model", href: "#model" },
  });
  assert.equal(aiValueToScaleEditorial.seed.sources.links.length, 6);
  assert.deepEqual(
    aiValueToScaleEditorial.seed.sources.links.map((source) => source.href),
    [
      "https://www.nist.gov/itl/ai-risk-management-framework",
      "https://www.iso.org/standard/81230.html",
      "https://eur-lex.europa.eu/eli/reg/2024/1689/oj",
      "https://www.mckinsey.com/capabilities/quantumblack/our-insights/the-state-of-ai-in-2023-generative-ais-breakout-year",
      "https://www.bcg.com/publications/2025/ai-radar-global-ai-adoption-in-2025",
      "https://www.accenture.com/us-en/insights/artificial-intelligence/ai-maturity-and-transformation",
    ],
  );
});

test("AI Value-to-Scale CMS editorial fields render at their original positions", async () => {
  const edited = structuredClone(aiValueToScaleEditorial.seed) as {
    model: { heading: string };
    instructions: { steps: Array<{ heading: string }> };
    sources: { links: Array<{ label: string; href: string }> };
  };
  edited.model.heading = "Edited model heading";
  edited.instructions.steps[0].heading = "Edited first step";
  edited.sources.links[0] = { label: "Edited source", href: "https://example.com/evidence" };
  const parsed = aiValueToScaleEditorial.editorialSchema.parse(edited);
  assert.equal(parsed.model.heading, "Edited model heading");

  const page = await readFile(path.join(import.meta.dirname, "AIValueToScale.tsx"), "utf8");
  assert.match(page, /methodologyEditorial<"ai-value-to-scale", typeof aiValueToScaleEditorial>/);
  assert.match(page, /\{editorial\.model\.heading\}/);
  assert.match(page, /\{step\.heading\}/);
  assert.match(page, /href=\{source\.href\}/);
});