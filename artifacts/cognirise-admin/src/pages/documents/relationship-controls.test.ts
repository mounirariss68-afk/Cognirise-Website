import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../../", import.meta.url);

test("relationship controls use searchable governed records and preserve unavailable selections", async () => {
  const controls = await readFile(new URL("src/pages/documents/relationship-controls.tsx", root), "utf8");
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", root), "utf8");
  assert.match(controls, /useListDocuments/);
  assert.match(controls, /Results include kind, status, and market availability/);
  assert.match(controls, /retained unchanged/);
  assert.match(controls, /Remove/);
  assert.match(editor, /<RecordPicker label="Related records"/);
  assert.match(editor, /<RecordPicker label="Related platforms" kind="platform"/);
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