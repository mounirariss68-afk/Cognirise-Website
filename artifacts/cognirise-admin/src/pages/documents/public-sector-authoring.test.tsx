import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";
import {
  INDUSTRY_SECTION_CONTENT_PATHS,
  industryContentSchema,
  projectIndustrySnapshotForMarket,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { ContentEditor } from "./ContentEditor.tsx";

Object.assign(globalThis, { React });

const sourceUrl = "https://example.gov/public-service";

function publicSectorPov() {
  return {
    version: 1 as const,
    market: "uae" as const,
    marketLabel: "United Arab Emirates",
    opportunity: [
      { type: "paragraph" as const, text: "Complete more public journeys correctly, first time." },
      { type: "heading" as const, level: 2 as const, text: "Remove friction before automating it" },
      { type: "list" as const, items: ["Remove requirements the institution already satisfies."] },
    ],
    pressuresHeading: "Legitimacy before velocity",
    capabilitiesIntroduction: "Capabilities are reusable across public services.",
    applicationsDisclaimer: "These are representative patterns, not Cognirise engagements.",
    marketHeading: "Ambition and evidence must be separated.",
    marketContext: [
      { type: "paragraph" as const, text: "The market publishes both targets and measured delivery." },
    ],
    sourcesIntroduction: "A strategy document supports intent, not realised benefit.",
    nextAction: [
      { type: "heading" as const, level: 3 as const, text: "Map one high-friction journey" },
      { type: "paragraph" as const, text: "Follow it from policy intent to resolved case." },
    ],
  };
}

function industry(overrides: Record<string, unknown> = {}) {
  return {
    schemaVersion: 1,
    legacyPath: "/industries/public-sector",
    name: "Public Sector",
    shortName: "Public Sector",
    thesis: "Public value is earned at the point of service.",
    accent: "public value",
    dek: "A governed public-sector proposition.",
    opportunity: "The first paragraph remains available to the shared industry template.",
    capabilities: [
      { title: "Sovereign service platforms", body: "Defined identity and access boundaries." },
      { title: "Governed casework agents", body: "Bounded support with named accountability." },
    ],
    selectedWork: { description: "Selected evidence." },
    image: "/images/public-sector.jpg",
    imageAlt: "A public-service setting",
    variant: "field",
    pressures: [
      { title: "Legitimacy", body: "Every rights-affecting decision needs evidence." },
      { title: "Accessibility", body: "Assisted channels remain part of the service." },
      { title: "Data boundaries", body: "Purpose and retention shape trust." },
    ],
    reversal: { title: "Automating a broken service hardens friction.", body: "First paragraph.\n\nSecond paragraph." },
    myth: { claim: "A chatbot proves intelligent government.", verdict: "A channel is not an end-to-end service.\n\nMeasure the resolved outcome." },
    gcc: "Regional context.",
    service: { label: "Sovereign & Regulated AI", href: "/services", firstMove: "Begin with one journey." },
    uses: [{
      use: "Case intake and triage",
      description: "A person describes a situation in their own words.",
      evidence: "Evaluated deployment in bounded tasks.",
      boundary: "Show the determination before it takes effect.",
      sourceUrls: [sourceUrl],
    }],
    sources: [{
      label: "Public-service evidence",
      publisher: "Example government",
      kind: "Official source",
      url: sourceUrl,
      market: "uae",
      supports: "A bounded public-service result.",
      limitation: "Reported by the institution.",
    }],
    publicSectorPov: publicSectorPov(),
    verificationDate: "2026-09-12",
    reviewDate: "2027-03-12",
    visibility: "public",
    order: 1,
    relatedIds: [],
    ...overrides,
  };
}

test("Public Sector v1 accepts rich editorial blocks and extended source-backed uses", () => {
  const parsed = industryContentSchema.safeParse(industry());
  assert.equal(parsed.success, true);
  if (!parsed.success) return;
  assert.equal(parsed.data.publicSectorPov?.version, 1);
  assert.equal(parsed.data.uses[0]?.description, "A person describes a situation in their own words.");
  assert.deepEqual(parsed.data.uses[0]?.sourceUrls, [sourceUrl]);
  assert.equal(parsed.data.sources[0]?.supports, "A bounded public-service result.");
});

test("Public Sector source associations and ownership are governed", () => {
  const wrongIndustry = industry({ name: "Education", legacyPath: "/industries/education" });
  assert.equal(industryContentSchema.safeParse(wrongIndustry).success, false);

  const wrongSource = industry({
    uses: [{ ...industry().uses[0], sourceUrls: ["https://unrelated.example/source"] }],
  });
  const parsed = industryContentSchema.safeParse(wrongSource);
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.error.issues.some((issue) => issue.path.join(".") === "uses.0.sourceUrls.0"));
  }

  const missingUseSource = industry({
    uses: [{ ...industry().uses[0], sourceUrls: [] }],
  });
  assert.equal(industryContentSchema.safeParse(missingUseSource).success, false);

  const missingSourceNotes = industry({
    sources: [{ ...industry().sources[0], supports: undefined }],
  });
  assert.equal(industryContentSchema.safeParse(missingSourceNotes).success, false);

  const longListItem = industry({
    publicSectorPov: {
      ...publicSectorPov(),
      opportunity: [{ type: "list", items: ["x".repeat(2_001)] }],
    },
  });
  assert.equal(industryContentSchema.safeParse(longListItem).success, false);
});

test("Public Sector review blockers are draft-visible but publish-blocking", () => {
  const content = industry({
    publicSectorPov: {
      ...publicSectorPov(),
      reviewBlockers: ["Confirm the independent source limitation before publication."],
    },
  });
  const snapshot = {
    slug: "public-sector",
    title: "Public Sector",
    summary: "Governed public-service delivery.",
    seo: { noIndex: false },
    content,
    mediaIds: [],
    markets: ["uae"],
  };
  assert.equal(validateCmsSnapshot("industry", snapshot, "draft").success, true);
  const published = validateCmsSnapshot("industry", snapshot, "publish");
  assert.equal(published.success, false);
  if (!published.success) assert.ok(published.errors.some((error) => /review blockers/i.test(error)));
});

test("Public Sector POV delivery is exact and cannot use another market", () => {
  const snapshot = {
    slug: "public-sector",
    markets: ["uae"],
    content: industry(),
  };
  const exact = projectIndustrySnapshotForMarket(snapshot, "uae", "uae");
  assert.deepEqual(exact.markets, ["uae"]);
  assert.equal(exact.content.publicSectorPov.market, "uae");
  assert.throws(
    () => projectIndustrySnapshotForMarket(snapshot, "ksa", "uae"),
    /Public Sector delivery cannot fall back/,
  );
});

test("Public Sector fields map to every fixed industry editing section", () => {
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.hero.includes("publicSectorPov.marketLabel"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.opportunity.includes("publicSectorPov.opportunity"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.pressures.includes("publicSectorPov.pressuresHeading"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.capabilities.includes("publicSectorPov.capabilitiesIntroduction"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.applications.includes("publicSectorPov.applicationsDisclaimer"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.market.includes("publicSectorPov.marketContext"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.sources.includes("publicSectorPov.sourcesIntroduction"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.sources.includes("publicSectorPov.reviewBlockers"));
  assert.ok(INDUSTRY_SECTION_CONTENT_PATHS.cta.includes("publicSectorPov.nextAction"));

  const markup = renderToStaticMarkup(
    <ContentEditor
      kind="industry"
      value={industry()}
      onChange={() => {}}
      errors={[]}
      industrySection="market"
    />,
  );
  assert.match(markup, /Public Sector POV structure/);
  assert.match(markup, /Market context heading/);
  assert.match(markup, /Market context blocks/);
  assert.doesNotMatch(markup, /Applications disclaimer/);

  const sourcesMarkup = renderToStaticMarkup(
    <ContentEditor
      kind="industry"
      value={industry({ publicSectorPov: { ...publicSectorPov(), reviewBlockers: ["Needs source review."] } })}
      onChange={() => {}}
      errors={[]}
      industrySection="sources"
    />,
  );
  assert.match(sourcesMarkup, /Review blockers \(publish gate\)/);
  assert.match(sourcesMarkup, /Needs source review\./);
});

test("Public Sector structured rich editor preserves numbered punctuation and line breaks", () => {
  const markup = renderToStaticMarkup(
    <ContentEditor
      kind="industry"
      value={industry({
        publicSectorPov: {
          ...publicSectorPov(),
          opportunity: [{
            type: "list",
            style: "numbered",
            items: ["Keep; punctuation\nand line breaks."],
          }],
        },
      })}
      onChange={() => {}}
      errors={[]}
      industrySection="opportunity"
    />,
  );
  assert.match(markup, /Keep; punctuation/);
  assert.match(markup, /and line breaks\./);
  assert.match(markup, /Line breaks, numbering, and punctuation are preserved exactly/);
});