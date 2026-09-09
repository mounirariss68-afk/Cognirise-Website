import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./BlueprintJourney.tsx", import.meta.url), "utf8");
const content = readFileSync(new URL("../content/idao.ts", import.meta.url), "utf8");

test("BlueprintJourney uses SpatialDisclosure for the expanding image effect", () => {
  assert.match(source, /SpatialDisclosure/);
  assert.match(source, /SpatialDisclosureItem/);
  assert.match(source, /SpatialDisclosurePanel/);
  assert.match(source, /SpatialDisclosureTrigger/);
});

test("BlueprintJourney keeps text content inside the image panels", () => {
  assert.doesNotMatch(source, /role="tablist"/);
  assert.doesNotMatch(source, /role="tabpanel"/);
  assert.match(source, /blueprint-tagline/);
  assert.match(source, /blueprint-description/);
  assert.match(source, /blueprint-outcome/);
});

test("BlueprintJourney removes explicit explore/close labels (as requested)", () => {
  assert.doesNotMatch(source, /Explore/i);
  assert.doesNotMatch(source, /Close/i);
});

test("BlueprintJourney uses a controlled gradient for readability without hiding artwork", () => {
  assert.match(source, /linear-gradient\(0deg, rgba\(7,25,54,0\.95\) 0%, rgba\(7,25,54,0\.6\) 35%, transparent 70%\)/);
  assert.match(source, /linear-gradient\(0deg, rgba\(7,25,54,0\.98\) 0%, rgba\(7,25,54,0\.85\) 55%, transparent 90%\)/);
});

test("BlueprintJourney makes the full image card a hover and click target", () => {
  assert.match(source, /\.blueprint-trigger:before\s*\{[\s\S]*position: absolute; inset: 0;/);
  assert.match(source, /\.blueprint-panel\s*\{[\s\S]*pointer-events: none;/);
});

test("BlueprintJourney keeps image crop and text measure stable while cards expand", () => {
  assert.match(source, /\.blueprint-visual img\s*\{[\s\S]*width: clamp\(560px, 46vw, 720px\)/);
  assert.match(source, /transform: translateX\(-50%\)/);
  assert.doesNotMatch(source, /transform: scale\(/);
  assert.match(source, /--blueprint-active-width:/);
  assert.match(source, /\.blueprint-trigger > \* \{ width: calc\(var\(--blueprint-active-width\) - 56px\); \}/);
  assert.match(source, /\.blueprint-panel-content \{ width: calc\(var\(--blueprint-active-width\) - 56px\);/);
});

test("BlueprintJourney preserves the IDAO stage order and timing commitments", () => {
  const innovate = content.indexOf('title: "Innovate"');
  const demonstrate = content.indexOf('title: "Demonstrate"');
  const activate = content.indexOf('title: "Activate"');
  const operate = content.indexOf('title: "Operate"');

  assert.ok(innovate < demonstrate);
  assert.ok(demonstrate < activate);
  assert.ok(activate < operate);
  assert.match(content, /time: "48 hours"/);
  assert.match(content, /time: "2–4 weeks \(MVP\)"/);
  assert.match(source, /prototype in 48 hours/);
});

test("each IDAO stage explains the client role and tangible outcome", () => {
  assert.equal((content.match(/clientRole:/g) ?? []).length, 4);
  assert.equal((content.match(/outcome:/g) ?? []).length, 4);
  assert.match(source, />\s*Your role\s*</);
  assert.match(source, />\s*What you have in hand\s*</);
});

test("the homepage blueprint does not duplicate the IDAO delivery canon", () => {
  assert.doesNotMatch(source, /IDAO_CANON_LAYERS/);
  assert.doesNotMatch(source, /delivery-canon-heading/);
  assert.doesNotMatch(source, /The delivery canon/);
});

test("the public IDAO section does not expose named delivery vendors", () => {
  const forbiddenVendors = [
    "Anthropic",
    "Claude",
    "OpenAI",
    "Perplexity",
    "Langfuse",
    "LangSmith",
    "Replit",
  ];

  for (const vendor of forbiddenVendors) {
    assert.doesNotMatch(source, new RegExp(`\\b${vendor}\\b`, "i"));
  }
});
