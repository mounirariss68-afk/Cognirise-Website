import assert from "node:assert/strict";
import test from "node:test";
import { approvedPublishedCases, caseSectors, normalizeCaseFilterValue, type RelatedCase } from "./case-study-model";
import { horizontalCarouselAction } from "./case-study-ui";
import { readFile } from "node:fs/promises";

const base = {
  slug: "bounded-operations",
  disclosure: "anonymized",
  industrySlugs: ["financial-services"],
  relatedIndustries: ["financial-services"],
  publicEvidenceStatus: "approved",
} as RelatedCase;

test("caseSectors normalizes singular and list relationships", () => {
  const item = { ...base, sector: "telecoms", sectors: ["public-sector"] };
  assert.deepEqual(caseSectors(item), ["public-sector", "financial-services", "telecoms"]);
});

test("overview collection includes each eligible approved record once", () => {
  const restricted = { ...base, slug: "restricted", disclosure: "restricted" };
  const unapproved = { ...base, slug: "unapproved", publicEvidenceStatus: "pending" };
  const hidden = { ...base, slug: "hidden", visibility: "hidden" };
  const industryDenied = { ...base, slug: "industry-denied", approvedForIndustry: false };
  const duplicate = { ...base };
  assert.deepEqual(
    approvedPublishedCases([base, restricted, unapproved, hidden, industryDenied, duplicate]).map((item) => item.slug),
    ["bounded-operations"],
  );
});

test("case filter analytics uses the API's lowercase all sentinel", () => {
  assert.equal(normalizeCaseFilterValue("All"), "all");
  assert.equal(normalizeCaseFilterValue("Financial Services"), "Financial Services");
  assert.equal(normalizeCaseFilterValue("production"), "production");
});

test("case-study cards introduce the solution and expose every detail without a toggle", async () => {
  const source = await readFile(new URL("./case-study-ui.tsx", import.meta.url), "utf8");
  const editorialStart = source.indexOf("if (editorial)");
  const nonEditorialStart = source.indexOf('\n  return (\n    <article className="work-card"', editorialStart);
  const editorial = source.slice(editorialStart, nonEditorialStart);
  assert.ok(editorial.indexOf("work-card__intro") < editorial.indexOf("work-card__visual"));
  assert.ok(editorial.indexOf("work-card__details") < editorial.indexOf("work-card__visual"));
  assert.match(source, /<h2 id="case-studies-title">Case studies<\/h2>/);
  assert.doesNotMatch(editorial, /value\(item, "stage"\)|impactClassification|deliveryStage/);

  assert.match(editorial, /<div className="work-card__details">/);
  assert.match(editorial, /<section><small>01 \/ Objective<\/small>/);
  assert.match(editorial, /<section><small>04 \/ Impact<\/small>/);
  assert.doesNotMatch(editorial, /aria-expanded|aria-controls|setExpanded|button-toggle-case|Collapse|Expand/);
  assert.doesNotMatch(editorial, /Explore the solution/i);
  assert.doesNotMatch(editorial, /Inputs → workflow → checkpoint → capability/i);
  assert.doesNotMatch(editorial, /work-card__footer/);
  assert.doesNotMatch(editorial, /CaseSummaryDialog/);
});

test("industry detail and banking preview paths do not fetch or render their own case rails", async () => {
  const [industry, banking, bankingPage, preview] = await Promise.all([
    readFile(new URL("../industries/IndustryEditorial.tsx", import.meta.url), "utf8"),
    readFile(new URL("../industries/BankingEditorial.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../pages/IndustryBanking.tsx", import.meta.url), "utf8"),
    readFile(new URL("../../pages/CmsPreview.tsx", import.meta.url), "utf8"),
  ]);
  for (const source of [industry, banking, bankingPage, preview]) {
    assert.doesNotMatch(source, /IndustryEvidenceRail|CaseStudyRail|useCmsCollection<PublicCaseStudy>|useListPublishedContent/);
  }
  assert.match(banking, /\/industries\$\{search \? `\?\$\{search\}` : ""\}#selected-work/);
});

test("CSS ensures images are fully contained and scale properly", async () => {
  const css = await readFile(new URL("./case-study-ui.css", import.meta.url), "utf8");
  assert.match(css, /\.case-rendition\{[^}]*overflow:hidden/);
  assert.match(css, /\.case-rendition\.is-compact img\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*height:\s*auto;/);
  assert.match(css, /\.case-rendition:not\(\.is-compact\) img\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*height:\s*auto;/);
  assert.match(css, /@media \(min-width: 1200px\)[\s\S]*?\.case-study-rail__slide\s*\{[\s\S]*?flex-basis:\s*calc\(100% \/ 3\);/);
  assert.match(css, /@media \(min-width: 960px\) and \(max-width: 1199px\)[\s\S]*?flex-basis:\s*50%;/);
  assert.match(css, /\.case-study-rail \.case-rendition figcaption\s*\{\s*position: static;/);
  assert.match(css, /\.case-study-rail \.work-card__details ul\s*\{\s*font-size: 13px;/);
  assert.match(css, /\.work-card--editorial \.case-rendition figcaption\s*\{[\s\S]*?background:\s*#071936;/);
  assert.match(css, /\.case-study-rail \.work-card--editorial\s*\{[\s\S]*?align-self:\s*flex-start;[\s\S]*?height:\s*auto;/);
});

test("carousel keeps drag enabled and synchronizes both end controls after reinitialization", async () => {
  const rail = await readFile(new URL("./case-study-ui.tsx", import.meta.url), "utf8");
  const carousel = await readFile(new URL("../ui/carousel.tsx", import.meta.url), "utf8");
  assert.match(rail, /watchDrag: true/);
  assert.match(rail, /containScroll: "trimSnaps"/);
  assert.match(rail, /addEventListener\("wheel", handleHorizontalWheel, \{ passive: false \}\)/);
  assert.match(rail, /removeEventListener\("wheel", handleHorizontalWheel\)/);
  assert.doesNotMatch(rail, /fallbackSelector/);
  assert.match(rail, /ref=\{previousControl\} aria-label="Previous slide"/);
  assert.match(rail, /ref=\{nextControl\} aria-label="Next slide"/);
  assert.match(rail, /event\.shiftKey && Math\.abs\(event\.deltaY\) >= 8/);
  assert.match(rail, /draggable=\{false\}/);
  assert.match(rail, /duration: reducedMotion \? 0 : 25/);
  assert.match(rail, /loading="lazy"/);
  assert.match(rail, /new IntersectionObserver/);
  assert.match(rail, /data-case-media=\{rendition\.url\}/);
  assert.match(rail, /src=\{shouldLoad \? rendition\.url : undefined\}/);
  assert.match(carousel, /off\('reInit', onSelect\)/);
});

test("horizontal wheel navigation stops at both ends instead of reversing", () => {
  const gesture = { deltaY: 0, shiftKey: false };
  assert.equal(horizontalCarouselAction({
    ...gesture,
    deltaX: -120,
    canScrollPrevious: false,
    canScrollNext: true,
  }), null);
  assert.equal(horizontalCarouselAction({
    ...gesture,
    deltaX: 120,
    canScrollPrevious: false,
    canScrollNext: true,
  }), "next");
  assert.equal(horizontalCarouselAction({
    ...gesture,
    deltaX: 120,
    canScrollPrevious: true,
    canScrollNext: false,
  }), null);
  assert.equal(horizontalCarouselAction({
    ...gesture,
    deltaX: -120,
    canScrollPrevious: true,
    canScrollNext: false,
  }), "previous");
});