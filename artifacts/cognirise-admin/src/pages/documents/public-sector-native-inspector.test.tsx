import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { belongsToIndustrySection, isIndustrySectionId, type PublicSectorNative } from "@workspace/api-zod";
import { PublicSectorNativeEditor } from "./PublicSectorNativeEditor";

test("native inspector paths identify the same section as the immutable preview; legacy paths stay unchanged", () => {
  assert.equal(isIndustrySectionId("change-2"), true);
  assert.equal(belongsToIndustrySection("content.publicSectorNative.sections.4.blocks.0.runs.0.text", "change-2"), true);
  assert.equal(belongsToIndustrySection("content.publicSectorNative.sections.4.blocks.0.runs.0.text", "change-1"), false);
  assert.equal(belongsToIndustrySection("content.publicSectorNative.researchDateQualification", "research"), true);
  assert.equal(belongsToIndustrySection("content.publicSectorPov.opportunity.0.text", "opportunity"), true);
});

test("native regional editing exposes actual text and source fields without altering topology or showing generic nine-section copy", async () => {
  const manuscripts = JSON.parse(await readFile(new URL("../../../../../scripts/src/cms/public-sector-native-content.json", import.meta.url), "utf8"));
  for (const market of ["uae", "europe"]) {
    const native = manuscripts[market].publicSectorNative as PublicSectorNative;
    const html = renderToString(<PublicSectorNativeEditor value={native} onChange={() => {}} section="change-2" />);
    assert.match(html, /content\.publicSectorNative\.sections\.4\.blocks/);
    assert.doesNotMatch(html, /content\.publicSectorNative\.sections\.(3|5)\./);
    assert.doesNotMatch(html, /data-field-path="content\.(uses|capabilities|pressures)/);
    assert.doesNotMatch(html, /data-field-path="[^"]+\.(type|layout|version|market)"/);
    const research = renderToString(<PublicSectorNativeEditor value={native} onChange={() => {}} section="research" />);
    assert.match(research, /content\.publicSectorNative\.researchDateQualification/);
    assert.match(research, /content\.publicSectorNative\.sections\.13/);
    assert.match(research, /Current unresolved review blockers/);
  }
});
