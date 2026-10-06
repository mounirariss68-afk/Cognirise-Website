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

test("BlueprintJourney makes the full image card a click target", () => {
  assert.match(source, /\.blueprint-trigger:before\s*\{[\s\S]*position: absolute; inset: 0;/);
  assert.match(source, /\.blueprint-panel\s*\{[\s\S]*pointer-events: none;/);
});

test("BlueprintJourney starts with every stage collapsed and requires activation to open", () => {
  assert.match(source, /defaultValue=\{null\}/);
  assert.match(source, /preview=\{false\}/);
  assert.doesNotMatch(source, /previewExpands|previewOverridesSelection/);
  assert.match(source, /allowCollapse/);
});

test("BlueprintJourney presents durations as compact stage metadata rather than pills", () => {
  assert.match(source, /\.blueprint-meta \{[\s\S]*grid-template-columns: auto minmax\(0, 1fr\);[\s\S]*min-width: 0;/);
  assert.match(source, /\.blueprint-time \{[\s\S]*font-size: 10px;[\s\S]*letter-spacing: 0\.1em;/);
  assert.match(source, /\.blueprint-time:before \{[\s\S]*background: var\(--bp-accent/);
  assert.doesNotMatch(source, /\.blueprint-time \{[\s\S]*border-radius: 999px/);
  assert.doesNotMatch(source, /\.blueprint-time \{[\s\S]*background: #fdfcfb/);
  assert.doesNotMatch(source, /\.blueprint-time \{[\s\S]*box-shadow:/);
  assert.match(source, /\.blueprint-title \{[\s\S]*min-width: 0;[\s\S]*overflow-wrap: anywhere;/);
});

test("BlueprintJourney gives only the 48-hour stage controlled accent emphasis", () => {
  assert.match(source, /"highlight" in stage && stage\.highlight[\s\S]*\? "blueprint-time--highlight"/);
  assert.match(source, /\.blueprint-time--highlight \{[\s\S]*color: white;[\s\S]*text-decoration-color: var\(--bp-accent/);
  assert.equal((content.match(/highlight: true/g) ?? []).length, 1);
  assert.match(content, /time: "48 hours"[\s\S]*highlight: true/);
});

test("BlueprintJourney keeps metadata aligned in expanded desktop and stacked layouts", () => {
  assert.match(source, /\.blueprint-row:has\(\.blueprint-item\.active\) \.blueprint-item:not\(\.active\) \.blueprint-meta \{[\s\S]*grid-template-columns: 1fr/);
  assert.match(source, /@media \(max-width: 1023px\)[\s\S]*\.blueprint-meta \{ grid-template-columns: auto minmax\(0, 1fr\); \}/);
  assert.match(source, /\.blueprint-time \{[\s\S]*max-width: 100%;[\s\S]*white-space: normal;[\s\S]*text-wrap: balance;/);
});

test("BlueprintJourney keeps image crop and text measure stable while cards expand", () => {
  assert.match(source, /\.blueprint-visual img\s*\{[\s\S]*width: clamp\(560px, 46vw, 720px\)/);
  assert.match(source, /transform: translateX\(-50%\)/);
  assert.doesNotMatch(source, /transform: scale\(/);
  assert.match(source, /--blueprint-active-width:/);
  assert.match(source, /\.blueprint-trigger > \* \{ width: 100%; \}/);
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

test("homepage blueprint starts equally collapsed with explicit disclosure", () => {
  assert.match(source, /defaultValue=\{null\}/);
  assert.match(source, /allowCollapse/);
  assert.match(source, /preview=\{false\}/);
  assert.match(source, /flex: 1 1 0/);
  assert.doesNotMatch(source, /defaultValue="2"/);
});

test("governed homepage blueprint resolves all four exact stage slots and fails closed", () => {
  assert.match(source, /resolveBlueprintStageMedia/);
  assert.match(source, /\["innovate", 1\]/);
  assert.match(source, /\["demonstrate", 2\]/);
  assert.match(source, /\["activate", 3\]/);
  assert.match(source, /\["operate", 4\]/);
  assert.match(source, /`home-idao-stage-\$\{stage\}`/);
  assert.match(source, /references\.length !== 1/);
  assert.match(source, /return null/);
  assert.match(source, /landingMedia\(page,/);
  assert.match(source, /governedMedia\?\.alt/);
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
