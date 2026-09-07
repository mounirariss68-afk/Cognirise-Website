import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("people controls consume configured markets instead of a hard-coded geography list", async () => {
  const list = await readFile(new URL("src/pages/documents/DocumentList.tsx", adminRoot), "utf8");

  assert.match(list, /useListMarketEditions/);
  assert.match(list, /\.filter\(\(market\) => market\.enabled\)/);
  assert.match(list, /enabledMarkets\.find\(\(market\) => market\.isCanonical\) \?\? enabledMarkets\[0\]/);
  assert.doesNotMatch(list, /\[['"]uae['"],\s*['"]ksa['"],\s*['"]turkiye['"],\s*['"]europe['"]\]/i);
});

test("people controls separate staged preview state from approved public state", async () => {
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");

  assert.match(matrix, /item\.pendingDecision \?\? item\.publishedDecision/);
  assert.match(matrix, /Public \{item\.publishedEffectiveAvailable \? "on" : "off"\}/);
  assert.match(matrix, /Preview \{item\.previewEffectiveAvailable \? "on" : "off"\}/);
  assert.match(matrix, /usePublishDocumentMarketAvailability/);
  assert.match(matrix, /isAdministrator && item\.pendingDecision/);
  assert.doesNotMatch(matrix, /\/preview\/about/);
});