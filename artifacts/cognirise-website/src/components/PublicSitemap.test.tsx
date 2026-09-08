import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { mergeSitemapItems, STATIC_SITEMAP_PATHS } from "./PublicSitemap";

test("sitemap integration includes the methodology once across static and CMS sources", () => {
  const origin = "https://cognirise.ai";
  const route = "/methodologies/agent-authority-model";
  assert.ok(STATIC_SITEMAP_PATHS.includes(route));
  const merged = mergeSitemapItems([
    { url: `${origin}/` },
    { url: `${origin}${route}` },
    { url: `${origin}/advisors` },
  ], origin);
  assert.equal(merged.filter((item) => item.url === `${origin}${route}`).length, 1);
  assert.equal(merged.some((item) => item.url.endsWith("/advisors")), false);
});

test("the canonical methodology route is present in the static XML sitemap", async () => {
  const xml = await readFile(new URL("../../public/sitemap.xml", import.meta.url), "utf8");
  assert.match(xml, /https:\/\/cognirise\.ai\/methodologies\/agent-authority-model/);
});
