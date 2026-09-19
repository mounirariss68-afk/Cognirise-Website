import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("People uses the filtered page as its only identity query", async () => {
  const list = await readFile(new URL("src/pages/documents/DocumentList.tsx", adminRoot), "utf8");
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");
  const row = await readFile(new URL("src/pages/documents/PeopleTableRow.tsx", adminRoot), "utf8");

  assert.equal((list.match(/useListDocuments\(/g) ?? []).length, 1);
  assert.doesNotMatch(list, /peopleMatrixParams/);
  assert.match(list, /const marketParams = \{ page: 1, pageSize: 100 \}/);
  assert.match(list, /people=\{pageData\?\.items \?\? \[\]\}/);
  assert.match(matrix, /<Table aria-label="People identity and market availability">/);
  assert.match(matrix, /markets\.map\(\(market\) =>/);
  assert.match(matrix, /totalPages > 1/);
  assert.match(row, /<MarketAvailabilityChecklist/);
  assert.match(row, /compact/);
  assert.match(row, /import\.meta\.env\.BASE_URL/);
  assert.doesNotMatch(row, /\/preview\//);
});

test("People table exposes staged/live labels and locale details without colour-only status", async () => {
  const checklist = await readFile(new URL("src/pages/documents/MarketAvailabilityChecklist.tsx", adminRoot), "utf8");
  const matrix = await readFile(new URL("src/pages/documents/PeopleMarketMatrix.tsx", adminRoot), "utf8");

  assert.match(checklist, /Live shown/);
  assert.match(checklist, /Pending change/);
  assert.match(checklist, /Show locale exceptions|Inspect availability and publication/);
  assert.match(checklist, /aria-pressed=\{checked\}/);
  assert.match(checklist, /const visibleItems = compact \|\| releaseIndividually/);
  assert.match(checklist, /items\.filter\(\(item\) => destinations\.some/);
  assert.match(checklist, /\{visibleItems\.map/);
  assert.match(checklist, /current\.items\.map/);
  assert.match(matrix, /aria-label="Availability legend"/);
  assert.match(matrix, /Expand locale exceptions/);
});

test("generic filters reset the shared server page and controls have keyboard labels", async () => {
  const list = await readFile(new URL("src/pages/documents/DocumentList.tsx", adminRoot), "utf8");
  const docMatrix = await readFile(new URL("src/pages/documents/DocumentMarketMatrix.tsx", adminRoot), "utf8");

  assert.match(list, /setSearch\(e\.target\.value\);\s*setPage\(1\)/);
  assert.match(list, /setStatus\(v === "all" \? undefined : v as DocumentStatus\);\s*setPage\(1\)/);
  assert.match(list, /const pluralLabel = kind === "industry"[\s\S]*`\$\{getKindLabel\(kind\)\}s`/);
  assert.match(list, /aria-label=\{`Search \$\{pluralLabel\}`\}/);
  assert.match(list, /aria-label="Filter documents by status"/);
  assert.match(docMatrix, /aria-label="Go to previous page"/);
  assert.match(docMatrix, /aria-label="Go to next page"/);
  assert.match(list, /href=\{`\/content\/\$\{doc\.id\}`\}/);
});

test("Person creation starts with short metadata and keeps an automatic editable slug", async () => {
  const list = await readFile(new URL("src/pages/documents/DocumentList.tsx", adminRoot), "utf8");

  assert.match(list, /kind === "person" \? "Person name"/);
  assert.match(list, /kind === "office" \|\| kind === "person"/);
  assert.match(list, /form\.setValue\("slug", officeSlug\(event\.target\.value\)/);
  assert.match(list, /kind !== "office" && kind !== "person"/);
});