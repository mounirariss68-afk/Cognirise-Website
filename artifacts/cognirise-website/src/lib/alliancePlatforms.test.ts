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
    if (platform.slug === "datatoolpack") {
      assert.match(platform.contribution, /Datatoolpack brings the specialist AutoData platform/);
      assert.match(platform.contribution, /Cognirise shapes the data product and quality approach/);
      assert.doesNotMatch(platform.contribution, /remains the product owner|not a Cognirise product/i);
    } else {
      assert.match(platform.contribution, /remains the product owner/);
    }
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


test("links every alliance page from the home AI Platforms card and canonical platform inventory", async () => {
  const [serviceLines, overview] = await Promise.all([
    readFile(new URL("./serviceLines.ts", import.meta.url), "utf8"),
    readFile(new URL("./platformCatalog.ts", import.meta.url), "utf8"),
  ]);
  for (const route of routes) assert.match(serviceLines, new RegExp(route));
  for (const route of routes) assert.match(overview, new RegExp(route));
});
