import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { DEMO_SCENARIOS, EXTRACTION_LAYERS } from "../lib/cognidocs-content";

const pageSource = readFileSync(new URL("./CogniDocs.tsx", import.meta.url), "utf8")
  + readFileSync(new URL("../components/cognidocs/DemoViewer.tsx", import.meta.url), "utf8");
const contentSource = readFileSync(new URL("../lib/cognidocs-content.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const pageOutput = `${pageSource}\n${contentSource}`;

test("CogniDocs renders the approved extraction story and both illustrative demonstrations", () => {
  assert.equal(EXTRACTION_LAYERS.length, 3);
  assert.deepEqual(
    EXTRACTION_LAYERS.map((layer) => layer.name),
    ["Vector Geometry", "Text & Coordinates", "Computer Vision"],
  );
  assert.match(pageSource, /EXTRACTION_LAYERS\.map/);
  for (const layer of EXTRACTION_LAYERS) {
    assert.match(contentSource, new RegExp(layer.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(contentSource, new RegExp(layer.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.equal(DEMO_SCENARIOS.length, 2);
  assert.deepEqual(DEMO_SCENARIOS.map((scenario) => scenario.id), ["finance", "engineering"]);
  assert.match(pageSource, /DEMO_SCENARIOS\.map/);
  for (const scenario of DEMO_SCENARIOS) {
    assert.match(contentSource, new RegExp(scenario.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(contentSource, new RegExp(scenario.description.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(contentSource, new RegExp(scenario.imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    for (const field of scenario.fields) {
      assert.ok(field.id, `${scenario.id} field must have a stable source-selection id`);
      assert.ok(field.reviewerNote, `${scenario.id}/${field.id} must carry a reviewer note`);
      assert.match(contentSource, new RegExp(field.label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(contentSource, new RegExp(field.sourceText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(contentSource, new RegExp(field.extractedValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(contentSource, new RegExp(field.confidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(contentSource, new RegExp(field.evidence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.match(contentSource, new RegExp(field.reviewerNote.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  }

  assert.match(pageSource, /illustrative/i);
  assert.match(pageSource, /No document is processed here/i);
  assert.match(pageSource, /Reviewer Note/);
  assert.match(contentSource, /CRM\*CAREEM RIDES DXB 8842/);
  assert.match(contentSource, /Row 2, Description Column \(Page 1\)/);
  assert.match(contentSource, /Pattern match against known transport providers\./);
});

test("CogniDocs keeps claims qualified and does not restore unsupported legacy guarantees", () => {
  for (const unsupportedClaim of [
    /90%\+/i,
    /days\s*(?:→|to)\s*1\s*hr/i,
    /100%\s*(?:can\s*)?run\s*on[- ]premise/i,
    /100%\s*(?:can\s*)?run\s*offline/i,
    /zero guessed/i,
  ]) {
    assert.doesNotMatch(pageOutput, unsupportedClaim);
  }

  assert.match(pageOutput, /deterministic/i);
  assert.match(pageOutput, /human validation|reviewer handoff/i);
  assert.match(pageOutput, /source references|evidence links/i);
  assert.match(pageOutput, /confidence label/i);
});

test("field buttons bind source selection to evidence and reviewer notes", () => {
  assert.match(pageSource, /role="group" aria-label=\{`Extraction fields/);
  assert.match(pageSource, /aria-pressed=\{isActive\}/);
  assert.match(pageSource, /setActiveFieldId\(field\.id\)/);
  assert.match(pageSource, /activeField\.evidence/);
  assert.match(pageSource, /activeField\.reviewerNote/);
  assert.match(pageSource, /activeFieldId === ['"]merchant['"]/);
  assert.match(pageSource, /activeFieldId === ['"]amount['"]/);
  assert.match(pageSource, /activeFieldId === ['"]dimension['"]/);
  assert.match(pageSource, /activeFieldId === ['"]quantity['"]/);
});

test("CogniDocs uses the honest contact enquiry destination", () => {
  assert.match(pageSource, /\/contact/);
  assert.match(pageSource, /href="\/contact"/);
  assert.match(pageSource, /contact|enquir|talk to us/i);
});

test("the legacy CogniDocs route keeps every query parameter while canonicalising", () => {
  assert.match(
    appSource,
    /function CanonicalRedirect\(\{ to \}: \{ to: string \}\) \{[\s\S]*?const search = useSearch\(\);[\s\S]*?return <Redirect to=\{search \? `\$\{to\}\?\$\{search\}` : to\} \/>;[\s\S]*?\}/,
  );
  assert.match(
    appSource,
    /<Route path="\/cognidocs"><CanonicalRedirect to="\/platforms\/cognidocs" \/><\/Route>/,
  );
  assert.doesNotMatch(appSource, /<Route path="\/cognidocs"><Redirect to="\/platforms\/cognidocs" \/><\/Route>/);
});