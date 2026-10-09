import { readFileSync } from "node:fs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { LAUNCH_POLICY, launchHrefAllowed } from "@workspace/api-zod";
import { NOT_FOUND_META, PAGE_META, PUBLIC_PATHS, REDIRECTS, normalisePath, redirectFor } from "./routes";
import { INDUSTRY_PAGES } from "./content/industries";

const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");

test("every public page has a browser title under 60 characters and a description of 70 to 155", () => {
  for (const [path, meta] of Object.entries(PAGE_META)) {
    assert.ok(meta.title.length > 0 && meta.title.length <= 60, `${path}: title ${meta.title.length}`);
    assert.ok(meta.description.length >= 70 && meta.description.length <= 155, `${path}: description ${meta.description.length}`);
    assert.match(meta.title, /Cognirise/, `${path}: title carries the site name`);
  }
  assert.equal(NOT_FOUND_META.title, "Page not found | Cognirise");
});

test("the seven industries, the public-sector point of view and the method pages are public routes", () => {
  assert.equal(INDUSTRY_PAGES.length, 6);
  for (const page of INDUSTRY_PAGES) assert.ok(PUBLIC_PATHS.includes(page.path), page.path);
  for (const path of [
    "/industries/public-sector",
    "/industries/public-sector/point-of-view",
    "/methodologies",
    "/methodologies/idao",
    "/methodologies/agent-authority-model",
    "/methodologies/guardrails-framework",
    "/methodologies/human-agent-operating-model",
    "/methodologies/ai-value-to-scale",
    "/methodologies/ai-use-case-prioritization",
    "/methodologies/agentic-operations-readiness",
    "/about/core-values",
    "/privacy",
  ]) {
    assert.ok(PUBLIC_PATHS.includes(path), path);
    assert.match(app, new RegExp(`path="${path.replaceAll("/", "\\/")}"`), `${path} is routed`);
  }
});

test("every public path is allowed by the launch policy and listed in the sitemap", () => {
  for (const path of PUBLIC_PATHS) {
    assert.ok(launchHrefAllowed(path), `${path} is blocked by the launch policy`);
    assert.match(sitemap, new RegExp(`<loc>https://cognirise.ai${path.replaceAll("/", "\\/")}</loc>`), `${path} missing from the sitemap`);
  }
  assert.equal((sitemap.match(/<loc>/g) ?? []).length, PUBLIC_PATHS.length, "the sitemap lists exactly the public pages");
});

test("hidden pages stay hidden: their old addresses redirect to a public page", () => {
  assert.equal(LAUNCH_POLICY.insights, false);
  assert.equal(LAUNCH_POLICY.platforms, false);
  assert.equal(redirectFor("/insights"), "/methodologies");
  assert.equal(redirectFor("/insights/some-article"), "/methodologies");
  assert.equal(redirectFor("/platforms"), "/platforms/cognios");
  assert.equal(redirectFor("/platforms/lupitor"), "/platforms/cognios");
  assert.equal(redirectFor("/platforms/cognios"), null);
  assert.equal(redirectFor("/partners"), "/about");
  assert.equal(redirectFor("/faq"), "/about");
  for (const target of Object.values(REDIRECTS)) {
    const path = target.split("#")[0];
    assert.ok(PUBLIC_PATHS.includes(path), `${target} points at a public page`);
  }
});

test("retired industry, service and case-study addresses move to their replacements", () => {
  assert.equal(redirectFor("/industries/banking"), "/industries/financial-services");
  assert.equal(redirectFor("/industries/government"), "/industries/public-sector");
  assert.equal(redirectFor("/industries/manufacturing"), null, "manufacturing is a page now");
  assert.equal(redirectFor("/what-we-do/data-ai-foundations"), "/what-we-do#data-ai-foundations");
  assert.equal(redirectFor("/work/anything"), "/case-studies");
  assert.equal(redirectFor("/contact"), "/about#contact");
  assert.equal(redirectFor("/industries/financial-services/"), null);
  assert.equal(normalisePath("/industries/telecoms/?market=ksa"), "/industries/telecoms");
});
