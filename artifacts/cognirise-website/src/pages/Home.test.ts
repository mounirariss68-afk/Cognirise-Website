import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

test("uses the exact agent-era professional services hero positioning", () => {
  assert.match(source, /heroNarrative\?\.heading \?\? <>Professional services built for the age of <em[^>]*>agents\.<\/em><\/>/);
});

test("keeps the What we do anchor and service content in the original homepage order", () => {
  const serviceIndex = source.indexOf('<section id="service-lines"');
   const blueprintIndex = source.indexOf("<BlueprintJourney stageMedia=");
  const imageLedgerIndex = source.indexOf('aria-label="Cognirise outcomes in motion"');

  assert.ok(serviceIndex >= 0);
  assert.ok(blueprintIndex > serviceIndex);
  assert.ok(imageLedgerIndex > blueprintIndex);
  assert.match(source, /<Kicker>\{landingText\(governedLanding, "home-service-label", "What we do"\)\}<\/Kicker>/);
  assert.match(source, /home-service-heading", "We combine strategy, engineering and platform\."/);
  assert.match(source, /home-service-body", "We don't hand over a presentation and wish you luck\./);
});

test("removes retired homepage sections and their outcomes data", () => {
  assert.doesNotMatch(source, /home-firm-|home-clarity-|The firm|Operating conviction/);
  assert.doesNotMatch(source, /const outcomes/);
  assert.match(source, /!section\.id\.startsWith\("home-"\)/);
});

test("uses the shared Pulse action family for prominent homepage CTAs", () => {
  assert.match(source, /<BrandButton href="\/#service-lines">Explore our practice<\/BrandButton>/);
  assert.match(source, /"home-convergence-cta", \{ label: "Meet the team", href: "\/about" \}/);
  assert.match(source, /<BrandButton href=\{convergenceCta\.href\}>\{convergenceCta\.label\}<\/BrandButton>/);
  assert.match(source, /"home-start-cta", \{ label: "Book a consultation", href: "\/contact" \}/);
  assert.match(source, /<BrandButton href=\{startCta\.href\} variant="inverse">\{startCta\.label\}<\/BrandButton>/);
});

test("passes the governed methodology group into the consulting service card", () => {
  assert.match(source, /"home-framework-idao-cta", \{ label: "Explore IDAO", href: "\/methodologies\/idao" \}/);
  assert.match(source, /"home-framework-authority-cta", \{ label: "Agent Authority Model", href: "\/methodologies\/agent-authority-model" \}/);
  assert.match(source, /"home-framework-portfolio-cta", \{ label: "View methodology portfolio", href: "\/methodologies" \}/);
  assert.match(source, /methodologyCtas=\{\[frameworkPortfolioCta, frameworkIdaoCta, frameworkAuthorityCta\]\}/);
  assert.doesNotMatch(source, /frameworkRenderPolicy|useCmsEntry\(|featuredFramework|frameworkHero/);
});

test("connects each image-ledger outcome to an approved governed destination", () => {
  assert.match(source, /"home-image-ledger-first-cta", \{ label: "Agent Authority Model", href: "\/methodologies\/agent-authority-model" \}/);
  assert.match(source, /"home-image-ledger-second-cta", \{ label: "Human–Agent Operating Model", href: "\/methodologies\/human-agent-operating-model" \}/);
  assert.match(source, /"home-image-ledger-third-cta", \{ label: "CogniOS architecture", href: "\/platforms\/cognios#architecture" \}/);
  assert.match(source, /home-image-ledger-first-caption", "Boundaries you control\."/);
  assert.match(source, /href=\{imageLedgerFirstCta\.href\}/);
  assert.match(source, /href=\{imageLedgerSecondCta\.href\}/);
  assert.match(source, /href=\{imageLedgerThirdCta\.href\}/);
  assert.match(source, /<strong className="block max-w-full/);
  assert.match(source, /<div className="mt-3 max-w-full">[\s\S]*?<BrandButton href=\{imageLedgerFirstCta\.href\}/);
  assert.doesNotMatch(source, /AI Guardrails|home-image-ledger-guardrails/);
});

test("does not retain the legacy edge-striped homepage CTA", () => {
  assert.doesNotMatch(source, /const CtaButton/);
  assert.doesNotMatch(source, /hover:shadow-\[6px_6px_0px/);
  assert.doesNotMatch(source, /bg-gradient-to-b/);
});

test("uses the shared CMS-backed industry picker", () => {
  assert.match(source, /import \{ IndustryPicker \} from "@\/components\/IndustryPicker"/);
  assert.match(source, /<IndustryPicker id="home-industries" \/>/);
  assert.doesNotMatch(source, /useCmsCollection\("industry"/);
});