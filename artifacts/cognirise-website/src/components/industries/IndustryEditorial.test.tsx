import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToString } from "react-dom/server";
import { Router } from "wouter";
import type { PublicSectorPov } from "@workspace/api-zod";
import { INDUSTRIES, type IndustryContent } from "@/content/industries";
import { IndustryEditorialView } from "./IndustryEditorial";
import { readFile } from "node:fs/promises";
import path from "node:path";

const publicSectorPov = {
  version: 1,
  market: "uae",
  marketLabel: "UAE",
  opportunity: [
    { type: "paragraph", text: "Complete more journeys, correctly, first time." },
    { type: "list", style: "numbered", items: ["Remove avoidable requirements.", "Connect owners across the journey."] },
  ],
  pressuresHeading: "Legitimacy before velocity.",
  capabilitiesIntroduction: "Reusable capability belongs in the institution, not in a one-off demo.",
  applicationsDisclaimer: "Representative patterns only; these are not Cognirise client engagements.",
  marketHeading: "Ambition is not the same as realised evidence.",
  marketContext: [
    { type: "heading", level: 3, text: "Demonstrated delivery" },
    { type: "paragraph", text: "The evidence must remain inspectable.\nLine breaks remain readable. <strong>not markup</strong>" },
  ],
  sourcesIntroduction: "A strategy document supports policy intent, not realised benefit.",
  nextAction: [
    { type: "heading", level: 2, text: "Map one high-friction public journey." },
    { type: "paragraph", text: "Follow it from policy intent to resolved case." },
    { type: "list", style: "bullet", items: ["Name accountable owners.", "Measure completion by channel."] },
  ],
} as PublicSectorPov;

const view: IndustryContent = {
  ...INDUSTRIES[4],
  publicSectorPov,
  uses: INDUSTRIES[4].uses.map((use, index) => index === 0
    ? {
      ...use,
      description: "A person describes a situation in their own words.",
      evidence: "Evaluated deployment, for information. Limited operational evidence for transactions.",
      sourceUrls: [INDUSTRIES[4].sources[0].url],
    }
    : use),
  sources: INDUSTRIES[4].sources.map((source, index) => index === 0
    ? {
      ...source,
      supports: "Procedures and requirements eliminated.",
      limitation: "Savings figures published without stated methodology.",
    }
    : source),
};

function render() {
  return renderToString(
    <Router ssrPath="/industries/public-sector">
      <IndustryEditorialView view={view} />
    </Router>,
  );
}

test("public-sector POV preserves the governed nine-section order and full block content", () => {
  const html = render();
  const sections = [...html.matchAll(/data-industry-section="([^"]+)"/g)].map((match) => match[1]);
  assert.deepEqual(sections, [
    "hero", "opportunity", "pressures", "capabilities", "applications",
    "perspective", "market", "sources", "cta",
  ]);
  assert.match(html, /Complete more journeys, correctly, first time\./);
  assert.match(html, /Remove avoidable requirements\./);
  assert.match(html, /Map one high-friction public journey\./);
  assert.match(html, /Procedures and requirements eliminated\./);
  assert.match(html, /Savings figures published without stated methodology\./);
  assert.match(html, /href="https:\/\/u\.ae\/en\/about-the-uae\/strategies-initiatives-and-awards\/strategies-plans-and-visions\/government-services-and-digital-transformation\/uae-strategy-for-artificial-intelligence"/);
});

test("public-sector POV renders text safely and preserves multiline evidence", () => {
  const html = render();
  assert.match(html, /The evidence must remain inspectable\.<br\/>Line breaks remain readable\./);
  assert.match(html, /&lt;strong&gt;not markup&lt;\/strong&gt;/);
  assert.doesNotMatch(html, /<strong>not markup<\/strong>/);
  assert.match(html, /UAE/);
  assert.match(html, /Supports/);
  assert.match(html, /Limitation/);
  assert.doesNotMatch(html, /reviewBlockers|approvalBlockers|draftBlockers/);
});

test("public-sector POV does not fall back to another market edition", () => {
  const html = renderToString(
    <Router ssrPath="/industries/public-sector?market=ksa">
      <IndustryEditorialView view={view} marketOverride="ksa" />
    </Router>,
  );
  assert.match(html, /This industry perspective is under review\./);
  assert.doesNotMatch(html, /Complete more journeys, correctly, first time\./);
});

test("legacy exact Public Sector editions remain renderable without a POV field", () => {
  const legacy = INDUSTRIES.find((industry) => industry.slug === "public-sector")!;
  const html = renderToString(
    <Router ssrPath="/industries/public-sector?market=ksa">
      <IndustryEditorialView view={legacy} marketOverride="ksa" />
    </Router>,
  );
  assert.doesNotMatch(html, /This industry perspective is under review\./);
  assert.match(html, /Make high-friction services easier to complete/);
});

test("industry loading and under-review boundaries retain their route-owned Back control", async () => {
  const editorial = await readFile(path.resolve(import.meta.dirname, "IndustryEditorial.tsx"), "utf8");
  const banking = await readFile(path.resolve(import.meta.dirname, "../../pages/IndustryBanking.tsx"), "utf8");
  assert.match(editorial, /delivery === "loading"[\s\S]*?<NavigationBackControl embedded/);
  assert.match(editorial, /This industry perspective is under review\.[\s\S]*?<NavigationBackControl embedded|<NavigationBackControl embedded[\s\S]*?This industry perspective is under review\./);
  assert.match(banking, /delivery === "loading"[\s\S]*?<NavigationBackControl embedded/);
  assert.match(banking, /<NavigationBackControl embedded[\s\S]*?This industry perspective is under review\./);
});