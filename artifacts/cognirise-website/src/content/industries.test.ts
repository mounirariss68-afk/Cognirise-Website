import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { projectIndustrySnapshotForMarket, validateCmsContent } from "@workspace/api-zod";
import { IndustryEditorialView } from "@/components/industries/IndustryEditorial";
import { INDUSTRIES, INDUSTRY_SECTION_IDS } from "./industries";

test("publishes exactly six complete, distinct industry records", () => {
  assert.equal(INDUSTRIES.length, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.slug)).size, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.thesis)).size, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.opportunity)).size, 6);
  assert.equal(new Set(INDUSTRIES.map((item) => item.selectedWork.description)).size, 6);
  for (const item of INDUSTRIES) {
    assert.ok(item.opportunity);
    assert.ok(item.capabilities.length >= 2);
    assert.ok(item.capabilities.every((capability) => capability.title && capability.body));
    assert.ok(item.selectedWork.description);
    assert.equal(item.pressures.length, 3);
    assert.ok(item.reversal.body);
    assert.ok(item.myth.verdict);
    assert.ok(item.gcc);
    assert.ok(item.sources.length >= 3);
    assert.ok(item.sources.every((source) => source.url.startsWith("https://")));
    assert.ok(item.uses.every((use) => use.evidence && use.boundary));
  }
});

test("does not publish internal research-production language", () => {
  const published = JSON.stringify(INDUSTRIES).toLowerCase();
  assert.doesNotMatch(published, /editor note|placeholder|tbd|claude/);
});

test("keeps the approved financial-services thesis in fallback and CMS content", () => {
  const approvedHeadline = "Trust in AI comes from how it is governed and operated—not how well its chatbot performs.";
  const financialServices = INDUSTRIES.find((industry) => industry.slug === "financial-services");
  assert.equal(financialServices?.thesis, approvedHeadline);

  const payload = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "../../scripts/cms/output/import-payload.json"),
    "utf8",
  )) as { operations: Array<{ kind: string; slug: string; payload: { content: { thesis?: string } } }> };
  const published = payload.operations.find(
    (operation) => operation.kind === "industry" && operation.slug === "financial-services",
  );
  assert.equal(published?.payload.content.thesis, approvedHeadline);

  assert.ok(financialServices);
  const html = renderToStaticMarkup(createElement(
    Router,
    { ssrPath: "/industries/financial-services" },
    createElement(IndustryEditorialView, { view: financialServices }),
  ));
  const heroMarkup = html.match(/<h1 id="industry-title">(.+?)<\/h1>/)?.[1];
  assert.ok(heroMarkup);
  assert.equal(heroMarkup.replace(/<[^>]+>/g, ""), approvedHeadline);
  assert.equal((heroMarkup.match(/class="ind-thesis-dash"/g) ?? []).length, 0);
});

test("keeps evidence classifications and source labels visible", () => {
  const allowed = new Set(["Official source", "Independent study", "Company-reported", "Vendor claim"]);
  for (const item of INDUSTRIES) {
    assert.ok(item.sources.every((source) => allowed.has(source.kind)));
    assert.ok(item.sources.every((source) => source.label && source.publisher));
  }
});

test("every compiled industry passes the governed publish contract", () => {
  for (const industry of INDUSTRIES) {
    const { slug: _slug, ...content } = industry;
    const result = validateCmsContent("industry", content, "publish");
    assert.equal(result.success, true, result.success ? undefined : result.errors.join("; "));
  }
});

test("renders all six migrated CMS industry payloads without compiled fallback", () => {
  const payload = JSON.parse(readFileSync(
    path.resolve(process.cwd(), "../../scripts/cms/output/import-payload.json"),
    "utf8",
  )) as { operations: Array<{ kind: string; slug: string; payload: { content: Omit<(typeof INDUSTRIES)[number], "slug"> } }> };
  const operations = payload.operations.filter((operation) => operation.kind === "industry");
  assert.equal(operations.length, 6);

  for (const operation of operations) {
    const compiled = INDUSTRIES.find((industry) => industry.slug === operation.slug);
    assert.ok(compiled);
    const { slug: _slug, ...compiledContent } = compiled;
    assert.deepEqual(operation.payload.content, compiledContent);
    const validation = validateCmsContent("industry", operation.payload.content, "publish");
    assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));
    const html = renderToStaticMarkup(createElement(
      Router,
      { ssrPath: `/industries/${operation.slug}` },
      createElement(IndustryEditorialView, {
        view: { ...operation.payload.content, slug: operation.slug } as (typeof INDUSTRIES)[number],
      }),
    ));
    assert.ok(html.includes(operation.payload.content.name.replaceAll("&", "&amp;")));
    assert.match(html, /source trail/i);
    assert.doesNotMatch(html, /under review/i);
  }
});

test("publishes the education POV across schools, higher education and institutional transformation", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education");
  assert.ok(education?.educationPov);
  assert.equal(education.educationPov.convictions.length, 5);
  assert.equal(education.educationPov.version, 2);
  assert.equal(education.educationPov.imagery, undefined);
  assert.match(education.image, /pulse-industry-education-campus-v4\.png$/);
  assert.equal(education.educationPov.valueDomains.length, 5);
  assert.equal(education.educationPov.targetState.length, 7);
  assert.deepEqual(education.educationPov.roadmap.map((step) => step.horizon), ["0–90 days", "3–9 months", "9–18 months"]);

  const copy = JSON.stringify(education).toLowerCase();
  for (const theme of ["k–12", "teaching", "assessment", "research", "educator", "operations", "agent platform", "people and change", "evidence and scale", "uae"]) {
    assert.ok(copy.includes(theme), `missing Education theme: ${theme}`);
  }
  assert.doesNotMatch(copy, /saudi/i);
  for (const institution of ["harvard", "yale", "caltech", "singapore", "aila"]) {
    assert.ok(copy.includes(institution), `missing institutional signal: ${institution}`);
  }

  const html = renderToStaticMarkup(createElement(
    Router,
    { ssrPath: "/industries/education" },
    createElement(IndustryEditorialView, { view: education }),
  ));
  assert.match(html, /Build the institution-wide AI operating system/);
  assert.match(html, /Learning, Teaching and Assessment/i);
  assert.match(html, /Research and Discovery/i);
  assert.match(html, /Educator Capability and Professional Practice/i);
  assert.match(html, /Identify and redesign one measurable education journey/i);
  assert.match(html, /Institutional signals/i);
  assert.match(html, /not Cognirise client/i);
  assert.match(html, /href="\/value-scan"/);
  assert.match(html, /Operating pressures/i);
});

test("keeps application and signal claims associated with the published source trail", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education")!;
  const sources = new Set(education.sources.map((source) => source.url));
  const pov = education.educationPov!;
  assert.equal(pov.applications?.length, 3);
  for (const item of [...pov.signals, ...(pov.applications ?? []).flatMap((group) => group.items)]) {
    assert.ok(item.sourceUrls.length > 0);
    for (const url of item.sourceUrls) assert.ok(sources.has(url), `unmapped source: ${url}`);
  }
  assert.ok(pov.introduction && pov.strategicShift && pov.patternQuote && pov.globalDirection);
  assert.doesNotMatch(JSON.stringify(education), /194-student|twice the learning|weeks to (?:about )?an hour/);
  const harvard = education.sources.find((source) => source.publisher === "Harvard Gazette");
  if (harvard) assert.notEqual(harvard.kind, "Independent study");
});

test("shared Education presentation retains every approved narrative field without the rejected controls", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education")!;
  const html = renderToStaticMarkup(createElement(Router, { ssrPath: "/industries/education" },
    createElement(IndustryEditorialView, { view: education, marketOverride: "uae" })));
  const strings = (value: unknown): string[] => {
    if (typeof value === "string") return [value];
    if (Array.isArray(value)) return value.flatMap(strings);
    if (value && typeof value === "object") return Object.entries(value)
      .filter(([key]) => key !== "market").flatMap(([, item]) => strings(item));
    return [];
  };
  for (const text of strings(education.educationPov)) {
    const escaped = renderToStaticMarkup(createElement("span", null, text)).slice(6, -7);
    assert.ok(html.includes(escaped), `Missing approved Education material: ${text}`);
  }
  assert.ok(html.includes(education.selectedWork.description));
  assert.match(html, /class="ind-hero"/);
  assert.match(html, /class="ind-image"/);
  assert.match(html, /Operating pressures/);
  assert.doesNotMatch(html, /Education sections|education-hero-caption|Illustration:|id="selected-work"|aria-pressed=/);
  assert.equal((html.match(/<img /g) ?? []).length, 1);
});

test("an already-projected Education preview honors its requested market over the global default", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education")!;
  for (const market of ["ksa", "europe", "turkiye"] as const) {
    const projected = projectIndustrySnapshotForMarket({ content: education }, market).content as typeof education;
    const html = renderToStaticMarkup(createElement(Router, { ssrPath: "/preview/capability" },
      createElement(IndustryEditorialView, { view: projected, marketOverride: market })));
    assert.doesNotMatch(html, /\bUAE\b|United Arab Emirates/);
    if (market === "ksa") assert.match(html, /Saudi Arabia/);
    else assert.doesNotMatch(html, /Saudi/);
  }
});

test("Education metadata reflects the broader audience without changing the route", () => {
  const shell = readFileSync(path.resolve(process.cwd(), "src/components/layout/Shell.tsx"), "utf8");
  const metadata = shell.match(/"\/industries\/education": \{([\s\S]*?)\n  \}/)?.[1];
  assert.ok(metadata);
  assert.match(metadata, /K–12 & Higher Education/);
  assert.match(metadata, /schools, universities and education authorities/);
});

test("keeps UAE and Saudi Education editions strictly separated", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education");
  assert.ok(education);

  const uaeHtml = renderToStaticMarkup(createElement(
    Router,
    { ssrPath: "/industries/education?market=uae" },
    createElement(IndustryEditorialView, { view: education, marketOverride: "uae" }),
  ));
  assert.match(uaeHtml, /\bUAE\b/);
  assert.doesNotMatch(uaeHtml, /Saudi/i);

  const saudiHtml = renderToStaticMarkup(createElement(
    Router,
    { ssrPath: "/industries/education?market=ksa" },
    createElement(IndustryEditorialView, { view: education, marketOverride: "ksa" }),
  ));
  assert.match(saudiHtml, /Saudi Arabia/);
  assert.doesNotMatch(saudiHtml, /\bUAE\b|United Arab Emirates/i);

  for (const market of ["turkiye", "europe"] as const) {
    const neutralHtml = renderToStaticMarkup(createElement(
      Router,
      { ssrPath: `/industries/education?market=${market}` },
      createElement(IndustryEditorialView, { view: education, marketOverride: market }),
    ));
    assert.doesNotMatch(neutralHtml, /\bUAE\b|United Arab Emirates|Saudi/i);
  }
});

test("every projected Education edition validates and preserves its five convictions and source associations", () => {
  const { slug: _slug, ...content } = INDUSTRIES.find((industry) => industry.slug === "education")!;
  for (const market of ["uae", "ksa", "turkiye", "europe"]) {
    const payload = projectIndustrySnapshotForMarket({
      content,
      title: "Education",
      summary: content.dek,
      seo: { description: content.dek },
    }, market);
    const validation = validateCmsContent("industry", payload.content, "publish");
    assert.equal(validation.success, true, `${market}: ${validation.success ? "" : validation.errors.join("; ")}`);
    assert.equal(payload.content.educationPov!.convictions.length, 5);
    const sourceUrls = new Set(payload.content.sources.map((source) => source.url));
    const claims = [
      ...payload.content.educationPov!.signals,
      ...payload.content.educationPov!.applications!.flatMap((group) => group.items),
    ];
    for (const item of claims) {
      for (const url of item.sourceUrls) assert.ok(sourceUrls.has(url), `${market}: missing source ${url}`);
    }
    const publicJson = JSON.stringify(payload);
    if (market !== "uae") assert.doesNotMatch(publicJson, /\bUAE\b|United Arab Emirates|moe\.gov\.ae|ai\.gov\.ae/i);
    if (market !== "ksa") assert.doesNotMatch(publicJson, /Saudi|sdaia\.gov\.sa/i);
    assert.deepEqual(projectIndustrySnapshotForMarket(payload, market), payload);
  }
});

test("the shared industry renderer has the governed nine-section outline in a fixed order", () => {
  for (const industry of INDUSTRIES) {
    const html = renderToStaticMarkup(createElement(
      Router,
      { ssrPath: `/industries/${industry.slug}` },
      createElement(IndustryEditorialView, { view: industry }),
    ));
    const sections = [...html.matchAll(/data-industry-section="([^"]+)"/g)].map((match) => match[1]);
    assert.deepEqual(sections, INDUSTRY_SECTION_IDS, `${industry.slug} must use the shared section outline`);
    assert.ok(html.includes('<h2 id="pressure-title">Where impressive AI demos meet the realities of running a business.</h2>'));
  }
});