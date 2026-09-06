import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { ALLIANCE_PLATFORM_LIST, ALLIANCE_PLATFORMS } from "./alliancePlatforms";

const routes = ["/platforms/lupitor", "/platforms/datatoolpack", "/platforms/bunjee-ai"];

test("defines three governed alliance platform narratives with traceable official evidence", () => {
  assert.equal(ALLIANCE_PLATFORM_LIST.length, 3);
  for (const platform of ALLIANCE_PLATFORM_LIST) {
    assert.ok(platform.headline);
    assert.ok(platform.problem);
    assert.ok(platform.mechanism);
    assert.ok(platform.workflow.length >= 3);
    assert.equal(platform.differentiators.length, 3);
    assert.ok(platform.facts.every((fact) => fact.sourceUrl.startsWith("https://")));
    assert.ok(platform.sources.every((source) => source.url.startsWith("https://") && source.supports));
    assert.equal(platform.verifiedOn, "6 September 2026");
    assert.match(platform.contribution, /remains the product owner/);
    assert.ok(platform.meta.title.length > 30);
    assert.ok(platform.meta.description.length > 100);
  }
});

test("covers the required product capability contract", () => {
  const lupitor = JSON.stringify(ALLIANCE_PLATFORMS.lupitor);
  assert.match(lupitor, /verified/i);
  assert.match(lupitor, /multilingual|99\+/i);
  assert.match(lupitor, /voice, chat, email, SMS and WhatsApp/i);
  assert.match(lupitor, /cloud, sovereign cloud and air-gapped/i);

  const data = JSON.stringify(ALLIANCE_PLATFORMS.datatoolpack);
  for (const claim of ["profil", "clean", "transform", "feature", "anomal", "pipeline", "connector", "export"]) {
    assert.match(data.toLowerCase(), new RegExp(claim));
  }

  const bunjee = JSON.stringify(ALLIANCE_PLATFORMS["bunjee-ai"]);
  for (const claim of ["expert", "hiring", "onboarding", "communication", "assessment", "training"]) {
    assert.match(bunjee.toLowerCase(), new RegExp(claim));
  }
});

test("registers exact routes before the generic platform route and keeps the unknown-route fallback", async () => {
  const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  for (const route of routes) assert.match(app, new RegExp(`<Route path=\"${route}\"`));
  assert.ok(app.indexOf("/platforms/bunjee-ai") < app.indexOf("/platforms/:slug"));
  assert.match(app, /<Route component=\{NotFound\} \/>/);
});

test("links every alliance page from the home AI Platforms card and platform overview", async () => {
  const [serviceLines, overview] = await Promise.all([
    readFile(new URL("./serviceLines.ts", import.meta.url), "utf8"),
    readFile(new URL("../pages/PlatformsOverview.tsx", import.meta.url), "utf8"),
  ]);
  for (const route of routes) assert.match(serviceLines, new RegExp(route));
  assert.match(overview, /ALLIANCE_PLATFORM_LIST/);
  assert.match(overview, /link-platform-/);
});

test("publishes all canonical routes in static sitemap and route metadata", async () => {
  const [sitemap, shell] = await Promise.all([
    readFile(new URL("../../public/sitemap.xml", import.meta.url), "utf8"),
    readFile(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8"),
  ]);
  for (const route of routes) {
    assert.match(sitemap, new RegExp(route));
    assert.match(shell, new RegExp(`\"${route}\"`));
  }
});