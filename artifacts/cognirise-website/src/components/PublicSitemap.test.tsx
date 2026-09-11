import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { mergeSitemapItems, STATIC_SITEMAP_PATHS } from "./PublicSitemap";

test("sitemap integration includes the public methodologies once across static and CMS sources", () => {
  const origin = "https://cognirise.ai";
  const routes = ["/methodologies/ai-use-case-prioritization", "/methodologies/idao", "/methodologies/agent-authority-model"];
  routes.forEach((route) => assert.ok(STATIC_SITEMAP_PATHS.includes(route)));
  const merged = mergeSitemapItems([
    { url: `${origin}/` },
    ...routes.map((route) => ({ url: `${origin}${route}` })),
    { url: `${origin}/advisors` },
    { url: `${origin}/what-we-do` },
    { url: `${origin}/services` },
  ], origin);
  routes.forEach((route) => assert.equal(merged.filter((item) => item.url === `${origin}${route}`).length, 1));
  assert.equal(merged.some((item) => item.url.endsWith("/advisors")), false);
  assert.equal(merged.some((item) => item.url.endsWith("/what-we-do")), false);
  assert.equal(merged.some((item) => item.url.endsWith("/services")), false);
});

test("the canonical methodology route is present in the static XML sitemap", async () => {
  const xml = await readFile(new URL("../../public/sitemap.xml", import.meta.url), "utf8");
  assert.match(xml, /https:\/\/cognirise\.ai\/methodologies\/agent-authority-model/);
  assert.match(xml, /https:\/\/cognirise\.ai\/methodologies\/idao/);
  assert.match(xml, /https:\/\/cognirise\.ai\/methodologies\/ai-use-case-prioritization/);
  assert.doesNotMatch(xml, /https:\/\/cognirise\.ai\/what-we-do<\/loc>/);
  assert.doesNotMatch(xml, /https:\/\/cognirise\.ai\/work\/?<\/loc>/);
});

test("retired Work overview is excluded without removing published full record URLs", () => {
  const origin = "https://cognirise.ai";
  const items = ["/work", "/work/", "/work?source=legacy#proof", "/work/full-record"]
    .map((path) => ({ url: `${origin}${path}` }));
  const merged = mergeSitemapItems(items, origin);
  assert.deepEqual(merged.filter((item) => new URL(item.url).pathname.startsWith("/work")), [
    { url: `${origin}/work/full-record` },
  ]);
});
