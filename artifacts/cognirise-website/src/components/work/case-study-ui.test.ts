import assert from "node:assert/strict";
import test from "node:test";
import { caseSectors, directlyRelatedCases, normalizeCaseFilterValue, type RelatedCase } from "./case-study-model";
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

test("direct evidence excludes restricted, unapproved, and prohibited industry rails", () => {
  const restricted = { ...base, slug: "restricted", disclosure: "restricted" };
  const unapproved = { ...base, slug: "unapproved", approvedForIndustry: false };
  assert.deepEqual(directlyRelatedCases([base, restricted, unapproved], "financial-services").map((item) => item.slug), ["bounded-operations"]);
  assert.deepEqual(directlyRelatedCases([base], "energy-resources"), []);
  assert.deepEqual(directlyRelatedCases([base], "education"), []);
});

test("case filter analytics uses the API's lowercase all sentinel", () => {
  assert.equal(normalizeCaseFilterValue("All"), "all");
  assert.equal(normalizeCaseFilterValue("Financial Services"), "Financial Services");
  assert.equal(normalizeCaseFilterValue("production"), "production");
});

test("industry cards introduce the solution before the visual and expose no lifecycle disclaimer", async () => {
  const source = await readFile(new URL("./case-study-ui.tsx", import.meta.url), "utf8");
  const editorialStart = source.indexOf("if (editorial)");
  const nonEditorialStart = source.indexOf('\n  return (\n    <article className="work-card"', editorialStart);
  const editorial = source.slice(editorialStart, nonEditorialStart);
  assert.ok(editorial.indexOf("work-card__intro") < editorial.indexOf("work-card__visual"));
  assert.ok(editorial.indexOf("work-card__details") < editorial.indexOf("work-card__visual"));
  assert.match(source, /<h2 id="industry-cases-title">Case studies<\/h2>/);
  assert.doesNotMatch(editorial, /value\(item, "stage"\)|impactClassification|deliveryStage/);

  assert.match(editorial, /aria-expanded=\{expanded\}/);
  assert.match(editorial, /aria-controls=\{detailsId\}/);
  assert.match(editorial, /onClick=\{.*?setExpanded/);
  assert.doesNotMatch(editorial, /Explore the solution/i);
  assert.doesNotMatch(editorial, /Inputs → workflow → checkpoint → capability/i);
  assert.doesNotMatch(editorial, /work-card__footer/);
  assert.doesNotMatch(editorial, /CaseSummaryDialog/);
});

test("CSS ensures images are fully contained and scale properly", async () => {
  const css = await readFile(new URL("./case-study-ui.css", import.meta.url), "utf8");
  assert.match(css, /\.case-rendition\{[^}]*overflow:hidden/);
  assert.match(css, /\.case-rendition\.is-compact img\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*height:\s*auto;/);
  assert.match(css, /\.case-rendition:not\(\.is-compact\) img\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*100%;[^}]*height:\s*auto;/);
  assert.match(css, /@media \(min-width: 960px\)[\s\S]*?\.industry-case-rail__slide\s*\{[\s\S]*?flex-basis:\s*33\.333333%;/);
  assert.match(css, /\.work-card--editorial \.case-rendition figcaption\s*\{[\s\S]*?background:\s*#071936;/);
  assert.match(css, /\.industry-case-rail \.work-card--editorial\s*\{[\s\S]*?align-self:\s*flex-start;[\s\S]*?height:\s*auto;/);
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