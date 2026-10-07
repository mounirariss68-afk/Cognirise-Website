import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import type { TelecomPov } from "@workspace/api-zod";
import { INDUSTRIES, type IndustryContent } from "@/content/industries";
import { IndustryEditorialView } from "./IndustryEditorial";

// Generated governed fixture (parses the supplied source without executing it).
const fixturePath = path.resolve(import.meta.dirname, "../../../../../scripts/src/cms/telecom-content.ts");
async function loadFixture() {
  const mod = await import(pathToFileURL(fixturePath).href) as { telecomPov: TelecomPov; telecomCopy: Partial<IndustryContent> };
  const base = INDUSTRIES.find((i) => i.slug === "telecoms")!;
  return { pov: mod.telecomPov, view: { ...base, ...mod.telecomCopy, telecomPov: mod.telecomPov, slug: "telecoms" } as IndustryContent };
}
const render = (view: IndustryContent) => renderToString(<Router ssrPath="/industries/telecoms"><IndustryEditorialView view={view} marketOverride="uae" /></Router>);
const count = (html: string, re: RegExp) => (html.match(re) ?? []).length;

test("telecom renders nine contract sections in order with value pools nested in opportunity", async () => {
  const { view } = await loadFixture();
  const html = render(view);
  const ids = [...html.matchAll(/data-industry-section="([^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(ids, ["hero", "opportunity", "pressures", "capabilities", "applications", "perspective", "market", "sources", "cta"]);
  const opp = html.slice(html.indexOf('data-industry-section="opportunity"'), html.indexOf('data-industry-section="pressures"'));
  assert.match(opp, /id="telecom-value-pools"/);
  assert.match(opp, /data-cms-field="content\.opportunity"/);
  assert.doesNotMatch(html, /content\.opportunity\.(title|body)/);
  assert.match(html, new RegExp(view.image.replaceAll("/", "\\/").replaceAll(".", "\\.")));
});

test("every public figure carries an adjacent classification and reported figures cite sources", async () => {
  const { view, pov } = await loadFixture();
  const html = render(view);
  const chips = [...html.matchAll(/<span class="tc-metric tc-metric--(\w+)"[^>]*>([\s\S]*?)<\/span><\/span>|<span class="tc-metric tc-metric--(\w+)"[^>]*>([\s\S]*?(?:<\/a>|tc-metric-class">[^<]*<\/span>))/g)];
  assert.ok(chips.length > 0);
  for (const m of pov.metrics) {
    if (m.classification === "unresolved") { assert.equal(m.value, undefined); continue; }
    const re = new RegExp(`data-testid="metric-${m.id}"[^>]*>[\\s\\S]{0,600}?tc-metric-class">${m.classification === "reported" ? "Reported telco outcome" : "Illustrative KPI target"}<`);
    if (html.includes(`data-testid="metric-${m.id}"`)) assert.match(html, re, m.id);
    if (m.classification === "reported") assert.ok(html.includes(m.source!.url), `${m.id} source`);
  }
  assert.match(html, /not Cognirise delivery results or guarantees/);
  assert.doesNotMatch(html, /Cognirise deployment benchmark|our proven results/i);
});

test("metric bindings use exact contract indexes and repeated metrics stay consistent", async () => {
  const { view, pov } = await loadFixture();
  const html = render(view);
  pov.metrics.forEach((m, i) => {
    const values = [...html.matchAll(new RegExp(`data-cms-field="content\\.telecomPov\\.metrics\\.${i}\\.value">([^<]*)<`, "g"))].map((x) => x[1]);
    assert.ok(values.every((v) => v === (m.value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;")), m.id);
  });
  const fields = [...html.matchAll(/data-cms-field="content\.telecomPov\.([^"]+)"/g)].map((x) => x[1]);
  for (const f of fields) {
    let node: unknown = pov;
    for (const part of f.split(".")) node = (node as Record<string, unknown>)?.[part];
    assert.equal(typeof node, "string", `unresolved binding ${f}`);
  }
});

test("full inventory is rendered from data", async () => {
  const { view, pov } = await loadFixture();
  const html = render(view);
  assert.equal(count(html, /data-testid="button-department-/g), 18);
  assert.equal(count(html, /data-testid="button-candidate-/g), 8);
  assert.equal(count(html, /data-testid="value-pool-/g), 6);
  assert.equal(count(html, /data-testid="button-range-/g), 5);
  assert.equal(count(html, /data-testid="button-scenario-telecom-flagships-/g), 8);
  const roles = pov.departments.reduce((n, d) => n + d.roles.length, 0);
  assert.ok(html.replaceAll("<!-- -->", "").includes(`${roles}</strong><span>functional roles`));
  assert.match(html, /Validate first/);
  assert.doesNotMatch(html, /Deploy Now/i);
  assert.match(html, /market=uae/);
});

test("legacy telecom and other industries render without telecom sections", () => {
  const legacy = INDUSTRIES.find((i) => i.slug === "telecoms")!;
  const html = render({ ...legacy, telecomPov: undefined });
  assert.doesNotMatch(html, /data-telecom-editorial|telecom-value-pools/);
  for (const other of INDUSTRIES.filter((i) => i.slug !== "telecoms")) {
    const out = renderToString(<Router ssrPath="/industries/telecoms"><IndustryEditorialView view={other} marketOverride="uae" /></Router>);
    assert.doesNotMatch(out, /data-telecom-editorial/);
  }
});
