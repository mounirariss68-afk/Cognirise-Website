import React from "react";
import assert from "node:assert/strict";
import { test } from "node:test";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import { FinancialServicesPage } from "./FinancialServicesPage";
import { financialServicesOverrideActive } from "@/pages/IndustryBanking";
import { FS_REJECTED_PHRASES, fsAreas, fsCases, fsLevels, fsProjects, fsVoice, fsResearch } from "@/content/financial-services-launch";

const html = renderToString(<Router ssrPath="/industries/financial-services"><FinancialServicesPage /></Router>);
const text = html.replace(/<[^>]+>/g, " ").replace(/&#x27;|&rsquo;/g, "’");

test("override applies publicly and never inside protected CMS previews", () => {
  assert.equal(financialServicesOverrideActive(true, false), true);
  assert.equal(financialServicesOverrideActive(true, true), false);
  assert.equal(financialServicesOverrideActive(false, false), false);
});

test("page covers all slide 8–14 content groups", () => {
  assert.equal(fsLevels.rows.length, 3);
  assert.equal(fsAreas.rows.length, 6);
  assert.equal(fsProjects.rows.length, 4);
  assert.equal(fsVoice.journeys.length, 7);
  assert.equal(fsCases.items.length, 6);
  for (const row of [...fsLevels.rows.map((r) => r.level), ...fsAreas.rows.map((r) => r.area), ...fsVoice.journeys.map((j) => j.group)]) {
    assert.ok(html.includes(row), row);
  }
  for (const c of fsCases.items) assert.match(html, new RegExp(`data-testid="case-fs-${c.id}"`));
  assert.match(html, /Use AI to reduce manual work in financial services\./);
  assert.match(html, /Illustrative productivity targets/);
  assert.match(html, /Illustrative workflow/);
  assert.match(html, /Reported gate pass rate: 71%/);
  assert.match(html, /What must be agreed before launch\./);
  assert.match(html, /id="fs-examples"/);
});

test("claims are qualified and rejected copy is absent", () => {
  for (const phrase of FS_REJECTED_PHRASES) assert.ok(!text.toLowerCase().includes(phrase), phrase);
  assert.ok(!/accuracy|guarantee(?!s or)/i.test(text.replace("not Cognirise guarantees", "")));
  assert.ok(!/SAMA|GDPR compliant|80\+ languages|0\.05%|15 deployments/.test(text));
  assert.match(text, /not measured case-study outcomes or commitments/);
  assert.match(text, /supplier statements/);
});

test("links are limited to contact, in-page anchor and dated primary sources", () => {
  const hrefs = [...html.matchAll(/href="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(!hrefs.some((h) => /lupitor|ekimetrics/i.test(h)));
  for (const s of fsResearch.sources) assert.ok(hrefs.includes(s.url), s.url);
  assert.ok(hrefs.some((h) => h.includes("/contact")));
  assert.match(text, /checked\s+6 October 2026/);
});
