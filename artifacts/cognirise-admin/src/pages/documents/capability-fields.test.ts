import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  addIndustryCapability,
  changeIndustryCapability,
  removeIndustryCapability,
} from "./capability-fields.ts";

const adminRoot = new URL("../../../", import.meta.url);

test("capability changes preserve every typed character without mutating the input", () => {
  const original = [
    { title: "First title", body: "First body" },
    { title: "Second title", body: "Second body" },
  ];
  const typed = "  text | with spaces  \nand a line break\n";

  const changedTitle = changeIndustryCapability(original, 0, "title", typed);
  const changedBody = changeIndustryCapability(changedTitle, 0, "body", typed);

  assert.equal(changedTitle[0].title, typed);
  assert.equal(changedBody[0].body, typed);
  assert.deepEqual(original, [
    { title: "First title", body: "First body" },
    { title: "Second title", body: "Second body" },
  ]);
});

test("capabilities can be added and removed without changing remaining values or order", () => {
  const original = [
    { title: "One", body: "Body one" },
    { title: "Two", body: "Body two" },
  ];

  const added = addIndustryCapability(original);
  assert.deepEqual(added, [...original, { title: "", body: "" }]);
  assert.deepEqual(removeIndustryCapability(added, 1), [
    { title: "One", body: "Body one" },
    { title: "", body: "" },
  ]);
  assert.deepEqual(original, [
    { title: "One", body: "Body one" },
    { title: "Two", body: "Body two" },
  ]);
});

test("capability updates retain unknown historical fields and media pins", () => {
  const original = [{
    title: "One",
    body: "Body one",
    legacyLabel: "Retained during migration",
    image: { mediaId: "media-1", mediaVersionId: "version-1", role: "supporting" },
  }];

  const changed = changeIndustryCapability(original, 0, "title", "Updated");

  assert.deepEqual(changed, [{
    title: "Updated",
    body: "Body one",
    legacyLabel: "Retained during migration",
    image: { mediaId: "media-1", mediaVersionId: "version-1", role: "supporting" },
  }]);
  assert.deepEqual(original[0].image, { mediaId: "media-1", mediaVersionId: "version-1", role: "supporting" });
});

test("industry editor uses controlled repeatable capability fields instead of pair parsing", async () => {
  const source = await readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8");
  const industryEditor = source.slice(source.indexOf('{kind === "industry"'), source.indexOf('{kind === "framework"'));
  const capabilityEditor = industryEditor.slice(
    industryEditor.indexOf('aria-labelledby="industry-capabilities-heading"'),
    industryEditor.indexOf('label="Selected work section description"'),
  );

  assert.match(capabilityEditor, /Add capability/);
  assert.match(capabilityEditor, /Remove capability/);
  assert.match(capabilityEditor, /changeIndustryCapability/);
  assert.doesNotMatch(capabilityEditor, /parsePairs/);
});