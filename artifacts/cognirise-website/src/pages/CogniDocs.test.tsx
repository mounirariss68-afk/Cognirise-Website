import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { COGNIDOCS_EDITIONS, DEMO_SCENARIOS, EXTRACTION_LAYERS } from "../lib/cognidocs-content";

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const pageSource = readFileSync(new URL("./CogniDocs.tsx", import.meta.url), "utf8")
  + readFileSync(new URL("../components/cognidocs/DemoViewer.tsx", import.meta.url), "utf8");
const contentSource = readFileSync(new URL("../lib/cognidocs-content.ts", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const sourceMaterial = readFileSync(new URL("../../../../source-material/cognirise-current.html", import.meta.url), "utf8");
const pageOutput = `${pageSource}\n${contentSource}`;

const FINANCE_APPLICATIONS = [
  { source: "Reconciliation", page: /Reconciliation/i },
  { source: "Lending & underwriting", page: /Lending\s+(?:&|and)\s+underwriting/i },
  { source: "Expense management", page: /Expense management/i },
  { source: "Accounting data entry", page: /Accounting data entry/i },
  { source: "Spend analytics", page: /Spend analytics/i },
  { source: "Audit tie-outs", page: /Audit tie-outs/i },
  { source: "Fraud & tampering checks", page: /Fraud\s+(?:&|and)\s+tampering checks/i },
  { source: "VAT recovery", page: /VAT recovery/i },
  { source: "Dispute resolution", page: /Dispute resolution/i },
  { source: "Wealth & mortgage onboarding", page: /Wealth\s+(?:&|and)\s+mortgage onboarding/i },
];

const ENGINEERING_APPLICATIONS = [
  { source: "BOQ & quantity takeoff", page: /BOQ\s+(?:&|and)\s+quantity takeoff/i },
  { source: "Code-compliance review", page: /Code-compliance review/i },
  { source: "Tender & bid evaluation", page: /Tender\s+(?:&|and)\s+bid evaluation/i },
  { source: "Tender writing support", page: /Tender writing support/i },
  { source: "Procurement & SKU matching", page: /Procurement\s+(?:&|and)\s+SKU matching/i },
  { source: "Technical query drafting", page: /Technical query drafting/i },
  { source: "As-built asset registers", page: /As-built asset registers/i },
  { source: "P&ID digitization", page: /P&ID digit(?:is|iz)ation/i },
  { source: "Permit review", page: /Permit review/i },
  { source: "Progress verification", page: /Progress verification/i },
  { source: "FM handover", page: /FM handover/i },
];

test("CogniDocs renders the approved extraction story and both illustrative demonstrations", () => {
  assert.equal(EXTRACTION_LAYERS.length, 3);
  assert.deepEqual(
    EXTRACTION_LAYERS.map((layer) => layer.name),
    ["Vector Geometry", "Text & Coordinates", "Computer Vision"],
  );
  assert.match(pageSource, /EXTRACTION_LAYERS\.map/);
  for (const layer of EXTRACTION_LAYERS) {
    assert.match(contentSource, new RegExp(escapeRegExp(layer.name)));
    assert.match(contentSource, new RegExp(escapeRegExp(layer.description)));
  }

  assert.equal(DEMO_SCENARIOS.length, 2);
  assert.deepEqual(DEMO_SCENARIOS.map((scenario) => scenario.id), ["finance", "engineering"]);
  assert.match(pageSource, /DEMO_SCENARIOS\.map/);
  for (const scenario of DEMO_SCENARIOS) {
    assert.match(contentSource, new RegExp(escapeRegExp(scenario.title)));
    assert.match(contentSource, new RegExp(escapeRegExp(scenario.description)));
    assert.match(contentSource, new RegExp(escapeRegExp(scenario.imagePath)));
    for (const field of scenario.fields) {
      assert.ok(field.id, `${scenario.id} field must have a stable source-selection id`);
      assert.ok(field.reviewerNote, `${scenario.id}/${field.id} must carry a reviewer note`);
      assert.match(contentSource, new RegExp(escapeRegExp(field.label)));
      assert.match(contentSource, new RegExp(escapeRegExp(field.sourceText)));
      assert.match(contentSource, new RegExp(escapeRegExp(field.extractedValue)));
      assert.match(contentSource, new RegExp(escapeRegExp(field.confidence)));
      assert.match(contentSource, new RegExp(escapeRegExp(field.evidence)));
      assert.match(contentSource, new RegExp(escapeRegExp(field.reviewerNote)));
    }
  }

  assert.match(pageSource, /illustrative/i);
  assert.match(pageSource, /No document is processed here/i);
  assert.match(pageSource, /Reviewer Note/);
  assert.match(contentSource, /CRM\*CAREEM RIDES DXB 8842/);
  assert.match(contentSource, /Row 2, Description Column \(Page 1\)/);
  assert.match(contentSource, /Pattern match against known transport providers\./);
});

test("CogniDocs restores both editions, their original outcomes and every source application", () => {
  assert.deepEqual(
    COGNIDOCS_EDITIONS.map(({ name, headline }) => ({ name, headline })),
    [
      { name: "CogniDocs Finance", headline: "Statements become structured, categorized data." },
      { name: "CogniDocs Engineering", headline: "Drawings become itemized, checkable bills of fact." },
    ],
  );
  assert.deepEqual(
    COGNIDOCS_EDITIONS.map((edition) => edition.applications),
    [
      FINANCE_APPLICATIONS.map(({ source }) => source),
      ENGINEERING_APPLICATIONS.map(({ source }) => source),
    ],
  );
  assert.match(pageOutput, /One engine,\s*two editions/i);
  assert.match(pageOutput, /COGNIDOCS FINANCE/i);
  assert.match(pageOutput, /COGNIDOCS ENGINEERING/i);
  assert.match(pageOutput, /Statements become structured, categorized data\./);
  assert.match(pageOutput, /Drawings become itemized, checkable bills of fact\./);
  assert.match(pageSource, /COGNIDOCS_EDITIONS\.map/);

  const editionsIndex = pageOutput.search(/One engine,\s*two editions/i);
  const demosIndex = pageSource.indexOf("DEMO_SCENARIOS.map");
  assert.ok(editionsIndex >= 0 && demosIndex > editionsIndex, "editions must precede the interactive demonstrations");

  for (const application of [...FINANCE_APPLICATIONS, ...ENGINEERING_APPLICATIONS]) {
    assert.match(
      sourceMaterial,
      new RegExp(escapeRegExp(application.source)),
      `source material no longer contains ${application.source}`,
    );
    assert.match(pageOutput, application.page, `CogniDocs no longer exposes ${application.source}`);
  }

  assert.match(
    pageOutput,
    /format\s+(?:adaptation|compatibility)[\s\S]{0,180}(?:new\s+statement\s+formats|scope|scop(?:ed|ing)|depend|agreed|subject|review|input|check)/i,
    "format adaptation/compatibility must be qualified by scope or conditions",
  );
  assert.match(
    pageOutput,
    /\bCAD\b[\s\S]{0,180}(?:compatible files|scope|scop(?:ed|ing)|depend|format|revision|scale|input|check)/i,
    "CAD support must describe its input or validation boundary",
  );
  assert.match(
    pageOutput,
    /\b(?:deployment options|deployed|API integration|on-premise|offline)\b[\s\S]{0,220}(?:environment|network|data residency|scope|scop(?:ed|ing)|depend|agreed|boundary|integrat|subject|consider|available|review)/i,
    "deployment language must remain conditional rather than an unconditional guarantee",
  );
  assert.match(
    pageOutput,
    /Format adaptation[\s\S]{0,220}validated with representative statements/i,
    "format adaptation must name representative-input validation",
  );
  assert.match(
    pageOutput,
    /CAD compatibility[\s\S]{0,220}subject to format compatibility, revision, and scale checks/i,
    "CAD support must retain format, revision and scale checks",
  );
  assert.match(
    pageOutput,
    /Deployment environments[\s\S]{0,220}assessed against infrastructure, security, and connectivity requirements/i,
    "deployment options must remain requirements-led",
  );
});

test("CogniDocs keeps claims qualified and does not restore unsupported legacy guarantees", () => {
  for (const unsupportedClaim of [
    /90%\+/i,
    /days\s*(?:→|to)\s*1\s*hr/i,
    /100%\s*(?:can\s*)?run\s*on[- ]premise/i,
    /100%\s*(?:can\s*)?run\s*offline/i,
    /zero guessed/i,
    /(?:from|for)\s+any\s+institution/i,
    /(?:global|worldwide)\s+(?:database|brand database)/i,
    /hundreds of thousands/i,
    /first\s+(?:statement|format).{0,100}(?:learn|teach)/i,
    /(?:every|each)\s+one\s+after.{0,100}(?:second|instant)/i,
    /drawings?\s+never\s+(?:have to\s+)?leave the building/i,
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