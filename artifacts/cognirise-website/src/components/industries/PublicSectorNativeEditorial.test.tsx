import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { INDUSTRIES } from "@/content/industries";
import { IndustryEditorialView } from "./IndustryEditorial";
import type { PublicSectorNative } from "@workspace/api-zod";

test("native Public Sector renders all four exact editions with semantic tables, static illustrations and regional links", async () => {
  const manuscripts = JSON.parse(await readFile(new URL("../../../../../scripts/src/cms/public-sector-native-content.json", import.meta.url), "utf8"));
  for (const market of ["uae", "ksa", "turkiye", "europe"]) {
    const manuscript = manuscripts[market];
    const native = manuscript.publicSectorNative as PublicSectorNative;
    const view = { ...INDUSTRIES[4], ...manuscript, publicSectorPov: undefined };
    const html = renderToString(<Router ssrPath={`/industries/public-sector?market=${market}&locale=en`}><IndustryEditorialView view={view} marketOverride={market} /></Router>);
    assert.match(html, /class="ps-native"/);
    assert.ok(html.includes(`data-market="${market}"`));
    for (const section of native.sections) assert.ok(html.includes(`data-industry-section="${section.id}"`));
    assert.equal((html.match(/class="ps-action ps-action--/g) ?? []).length, 3);
    assert.equal((html.match(/Illustration only, not a working form/g) ?? []).length, 3);
    assert.match(html, /role="region" tabindex="0" aria-label=/);
    assert.match(html, /scope="row"/);
    assert.match(html, /scope="col"/);
    assert.match(html, /id="ps-start"/);
    assert.ok(html.includes(`/contact?market=${market}&amp;locale=en`));
    assert.match(html, /not a new verification performed during website integration/);
    assert.doesNotMatch(html, /<form|<input|<textarea|dangerouslySetInnerHTML/);
    assert.match(html, /data-cms-field="content\.publicSectorNative\.sections\.4\.blocks\./);
    const wrongMarket = market === "uae" ? "ksa" : "uae";
    const wrong = renderToString(<Router ssrPath={`/industries/public-sector?market=${wrongMarket}&locale=en`}><IndustryEditorialView view={view} marketOverride={wrongMarket} /></Router>);
    assert.match(wrong, /under review/);
    assert.doesNotMatch(wrong, /class="ps-native"/);
  }
});

test("the canonical route uses exact approved publication, not a stale UAE whole-site snapshot", async () => {
  const app = await readFile(new URL("../../App.tsx", import.meta.url), "utf8");
  assert.match(app, /if \(path === "\/industries\/public-sector"\) return routedPage/);
  assert.match(app, /\/industries\/government.*CanonicalRedirect to="\/industries\/public-sector"/);
});
