import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../src/App.tsx", import.meta.url), "utf8");
const renderer = await readFile(new URL("../src/components/cms/CmsPageRenderer.tsx", import.meta.url), "utf8");
const preview = await readFile(new URL("../src/pages/CmsPreview.tsx", import.meta.url), "utf8");
const runtime = await readFile(new URL("../src/lib/cms-runtime.ts", import.meta.url), "utf8");
const shell = await readFile(new URL("../src/components/layout/Shell.tsx", import.meta.url), "utf8");
const insights = await readFile(new URL("../src/pages/InsightsEditorial.tsx", import.meta.url), "utf8");
const article = await readFile(new URL("../src/pages/InsightArticle.tsx", import.meta.url), "utf8");
const contact = await readFile(new URL("../src/pages/Contact.tsx", import.meta.url), "utf8");
const valueScan = await readFile(new URL("../src/pages/ValueScan.tsx", import.meta.url), "utf8");
const analytics = await readFile(new URL("../src/lib/analytics.ts", import.meta.url), "utf8");

test("public rendering retains explicit hard-coded routes and code-owned forms", () => {
  assert.match(app, /const hardCodedRoutes/);
  assert.match(renderer, /formSlotSection/);
  assert.match(renderer, /section\.form === "contact"/);
  assert.match(app, /cms\.data\?\.page/);
  assert.match(app, /return <NotFound \/>/);
});

test("CMS form slots compose code-owned submission forms, not full pages", () => {
  assert.match(contact, /export function ContactForm\(\)/);
  assert.match(contact, /<ContactForm \/>/);
  assert.match(valueScan, /export function ValueScanForm\(\)/);
  assert.match(valueScan, /<ValueScanForm \/>/);
  assert.match(renderer, /import \{ ContactForm \}/);
  assert.match(renderer, /import \{ ValueScanForm \}/);
  assert.match(renderer, /shell\(<ContactForm \/>\)/);
  assert.match(renderer, /shell\(<ValueScanForm \/>\)/);
  assert.doesNotMatch(renderer, /import Contact from/);
  assert.doesNotMatch(renderer, /import ValueScan from/);

  const formSlotBranch = renderer.slice(
    renderer.indexOf('if (type === "formSlotSection")'),
    renderer.indexOf('if (type === "referenceGridSection")'),
  );
  assert.doesNotMatch(formSlotBranch, /section\.(fields|action|endpoint|consent)/);
});

test("CMS rendering is restricted to approved sections and safe destinations", () => {
  assert.match(renderer, /const approvedSections = new Set/);
  assert.match(renderer, /approvedSections\.has\(type\)/);
  assert.match(renderer, /\["https:", "mailto:", "tel:"\]/);
  assert.doesNotMatch(renderer, /dangerouslySetInnerHTML/);
});

test("preview visibly distinguishes inherited canonical content", () => {
  assert.match(preview, /inherited UAE canonical content/);
  assert.match(preview, /resolved \{preview\.state\.resolvedMarket/);
});

test("governed shell data and redirects retain stable fallbacks", () => {
  assert.match(app, /function GovernedRedirects/);
  assert.match(app, /runtime\.data\?\.redirects/);
  assert.match(shell, /runtimeNavigation\(cmsRuntime\.data\) \?\? fallbackNavigation/);
  assert.match(shell, /cmsRuntime\.data\?\.markets\.length/);
  assert.match(runtime, /\["https:", "mailto:", "tel:"\]/);
});

test("publication delivery only falls back on outage and preserves deterministic not found", () => {
  assert.match(insights, /useGetCmsPublishedPublications/);
  assert.match(insights, /meta\.source !== "migration-fallback"/);
  assert.match(article, /useGetCmsPublishedPublication/);
  assert.match(article, /fallbackAllowed = cms\.isError \|\| cms\.data\?\.meta\.source === "migration-fallback"/);
  assert.match(article, /if \(!publication && !\(fallbackAllowed && known\)\) return <NotFound \/>/);
  assert.doesNotMatch(article, /dangerouslySetInnerHTML/);
});

test("analytics uses a safe shared wrapper and only non-PII attribution dimensions", () => {
  assert.match(analytics, /window\.umami\?\.track\(name, data\)/);
  assert.match(analytics, /typeof window === "undefined"/);
  assert.match(article, /trackEvent\("publication_viewed"/);
  assert.match(article, /trackEvent\("governed_download_clicked"/);
  assert.match(renderer, /trackEvent\("governed_media_played"/);
  assert.match(renderer, /hasPlayed\.current/);
  assert.match(insights, /trackEvent\("newsletter_subscribed"/);
  assert.match(contact, /trackEvent\("contact_form_submitted"/);
  assert.match(valueScan, /trackEvent\("value_scan_submitted"/);

  for (const source of [article, renderer, insights, contact, valueScan]) {
    const analyticsCalls = source.match(/trackEvent\([\s\S]*?\}\);/g) ?? [];
    for (const call of analyticsCalls) assert.doesNotMatch(call, /\b(email|name|message|challenge|organization|company)\s*:/);
  }
});