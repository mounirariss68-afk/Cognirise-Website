import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  mergeRelationshipRecords,
  relationshipRecordHref,
} from "./relationship-records";

const root = new URL("../../../", import.meta.url);

test("relationship controls use searchable governed records and preserve unavailable selections", async () => {
  const controls = await readFile(new URL("src/pages/documents/relationship-controls.tsx", root), "utf8");
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", root), "utf8");
  assert.match(controls, /useListDocuments/);
  assert.match(controls, /Results include kind, status, and market availability/);
  assert.match(controls, /retained unchanged/);
  assert.match(controls, /Remove/);
  assert.match(controls, />Suggestions</);
  assert.match(controls, />Selected associations</);
  assert.match(controls, /do not reuse or replicate content/);
  assert.match(controls, /automatically create website links/);
  assert.match(controls, /reciprocal association/);
  assert.match(controls, /relationshipRecordHref/);
  assert.match(editor, /<RecordPicker label="Related records"/);
  assert.match(editor, /<RecordPicker label="Related platforms"[\s\S]*kind="platform"/);
  assert.doesNotMatch(editor, /label="Related record IDs"/);
  assert.doesNotMatch(editor, /One CMS record UUID per line/);
});

test("enum-backed industries are constrained while unknown stored values remain explicit", async () => {
  const controls = await readFile(new URL("src/pages/documents/relationship-controls.tsx", root), "utf8");
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", root), "utf8");
  assert.match(controls, /EnumMultiSelect/);
  assert.match(controls, /Unrecognized stored values are never silently discarded/);
  assert.match(editor, /<EnumMultiSelect/);
  assert.doesNotMatch(editor, /<StringList label="Related website industries"/);
});

test("selected association discovery is independent, de-duplicated, and keeps authorized entry links", () => {
  const first = {
    id: "first",
    title: "First",
    slug: "first",
    kind: "person" as const,
    status: "draft" as const,
    markets: ["ae"],
  };
  const second = { ...first, id: "second", title: "Second", slug: "second" };
  assert.deepEqual(
    mergeRelationshipRecords([first, second], [second]),
    [first, second],
  );
  assert.equal(relationshipRecordHref("a record/id"), "/content/a%20record%2Fid");
});

test("relationship controls resolve selected records with an independent authorized catalogue", async () => {
  const controls = await readFile(new URL("src/pages/documents/relationship-controls.tsx", root), "utf8");
  assert.match(controls, /selectedCatalogueParams/);
  assert.match(controls, /pageSize: 100/);
  assert.match(controls, /selectedCatalogueRecords/);
  assert.match(controls, /customFetch<DocumentPage>\(listDocumentsUrl\(pageParams\)/);
  assert.match(controls, /Inaccessible existing reference/);
  assert.match(controls, /IDs are retained unchanged/);
  assert.match(controls, /<a\s+href=\{relationshipRecordHref\(document\.id\)\}/);
});