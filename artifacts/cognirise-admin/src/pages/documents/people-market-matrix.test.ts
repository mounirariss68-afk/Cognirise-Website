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

test("people controls use accessible checkboxes with effective staged state", async () => {
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");

  assert.match(matrix, /import \{ Checkbox \}/);
  assert.match(matrix, /const checked = hasPendingChange[\s\S]*item\?\.previewEffectiveAvailable[\s\S]*item\?\.publishedEffectiveAvailable/);
  assert.match(matrix, /onCheckedChange=\{\(nextChecked\) => setAvailability\(market, nextChecked === true\)\}/);
  assert.match(matrix, /aria-label=\{`\$\{person\.title\} available in \$\{market\.displayName\}`\}/);
  assert.match(matrix, /disabled=\{!canManage \|\| update\.isPending \|\| publish\.isPending\}/);
  assert.match(matrix, /available \? "show" : "off"/);
});

test("people controls keep pending changes separate from live availability and administrator publication", async () => {
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");

  assert.match(matrix, /Pending: \{item\.previewEffectiveAvailable \? "Available" : "Hidden"\}/);
  assert.match(matrix, /Live: \{item\.publishedEffectiveAvailable \? "Available" : "Hidden"\}/);
  assert.match(matrix, /usePublishDocumentMarketAvailability/);
  assert.match(matrix, /isAdministrator && hasPendingChange/);
  assert.doesNotMatch(matrix, /\/preview\/about/);
  assert.doesNotMatch(matrix, /Inherit|Explicit on|Explicit off|Edition present|Fallback/);
  assert.doesNotMatch(matrix, /<Select/);
});