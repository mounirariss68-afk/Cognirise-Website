import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("people controls consume configured markets instead of a hard-coded geography list", async () => {
  const list = await readFile(new URL("src/pages/documents/DocumentList.tsx", adminRoot), "utf8");

  assert.match(list, /useListMarketEditions/);
  assert.match(list, /\.filter\(\(market\) => market\.enabled\)/);
  assert.match(list, /permittedMarkets\.find\(\(market\) => market\.isCanonical\) \?\? permittedMarkets\[0\]/);
  assert.doesNotMatch(list, /\[['"]uae['"],\s*['"]ksa['"],\s*['"]turkiye['"],\s*['"]europe['"]\]/i);
});

test("people and documents use one accessible checkbox control with effective staged state", async () => {
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");
  const control = await readFile(new URL("src/pages/documents/MarketAvailabilityChecklist.tsx", adminRoot), "utf8");

  assert.match(matrix, /MarketAvailabilityChecklist/);
  assert.match(control, /item\.stagedDecision !== "off"/);
  assert.match(control, /stageShared\(item\.marketEditionId, item\.locale, destination, next === true\)/);
  assert.match(control, /Show this content in/);
  assert.match(control, /next \? "show" : "off"/);
  assert.match(control, /Your chosen checkbox state is retained locally/);
  assert.match(control, /Reload destinations/);
  assert.match(control, /selectionDraft\?: AvailabilitySelectionDraft/);
  assert.match(control, /onSelectionDraftChange/);
});

test("shared control keeps pending decisions separate from live availability and administrator releases", async () => {
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");
  const control = await readFile(new URL("src/pages/documents/MarketAvailabilityChecklist.tsx", adminRoot), "utf8");

  assert.match(control, /\{reviewed \? "Reviewed" : "Pending"\}:/);
  assert.match(control, /Not published yet/);
  assert.match(control, /item\.publishedEffectiveAvailable \? "Shown" : "Excluded"/);
  assert.match(control, /usePublishDocumentMarketAvailability/);
  assert.match(control, /const useLegacyPersonAvailability = releaseIndividually && sharedAvailability\.data\?\.sharedSource === null/);
  assert.match(control, /Open shared content to review\/publish/);
  assert.match(matrix, /onOpenSharedContent=\{\(\) => setLocation\(`\/content\/\$\{person\.id\}`\)\}/);
  assert.match(control, /Send people destinations for review/);
  assert.match(control, /Confirm publish/);
  assert.match(control, /useLegacyPersonAvailability && isAdministrator && pending/);
  assert.doesNotMatch(matrix, /\/preview\/about/);
  assert.doesNotMatch(matrix, /<Select/);
});

test("a person with a shared source stages generic destinations and opens shared publication", async () => {
  const control = await readFile(new URL("src/pages/documents/MarketAvailabilityChecklist.tsx", adminRoot), "utf8");
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");

  assert.match(control, /useLegacyPersonAvailability\s*\? personAvailability\.data\?\.items \?\? \[\]\s*: sharedAvailability\.data\?\.items \?\? \[\]/);
  assert.match(control, /onCheckedChange=\{\(next\) => useLegacyPersonAvailability\s*\? stagePerson[\s\S]*: stageShared/);
  assert.match(control, /releaseIndividually && !useLegacyPersonAvailability && onOpenSharedContent/);
  assert.match(matrix, /onOpenSharedContent=\{\(\) => setLocation/);
});