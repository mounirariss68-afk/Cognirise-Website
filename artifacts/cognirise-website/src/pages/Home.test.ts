import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");
const blueprintSource = readFileSync(new URL("../components/BlueprintJourney.tsx", import.meta.url), "utf8");
const serviceTilesSource = readFileSync(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8");
const industryPickerSource = readFileSync(new URL("../components/IndustryPicker.tsx", import.meta.url), "utf8");

test("keeps the agent-era hero and Senior experts homepage copy", () => {
  assert.match(source, /heroNarrative\?\.heading \?\? <>Professional services built for the age of <em[^>]*>agents\.<\/em><\/>/);
  assert.match(source, /Senior experts, forward-deployed engineers and governed agents move priority work from strategy into production\./);
  assert.doesNotMatch(source, /Senior operators/);
});

test("renders the ordered, governed office-city list without adding unapproved copy", () => {
  assert.match(source, /landingList\(governedLanding, "home-office-cities", \["Dubai", "Riyadh", "Istanbul", "Amsterdam", "London", "Vienna"\]\)/);
  assert.match(source, /<span[^>]*>Office locations<\/span>/);
  assert.match(source, /officeCities\.map\(\(city\) => <li key=\{city\}>\{city\}<\/li>\)/);
  assert.match(source, /aria-label="Office locations"/);
  assert.match(source, /const hasApprovedOffices = !governedLanding \|\| governedLanding\.sections\.some\(\(section\) => section\.id === "home-office-cities"\)/);
});

test("renders all four Task 437 proof statements from governed slots", () => {
  assert.match(source, /landingText\(governedLanding, "home-proof-model", "No long pilots\. Prototype in 48 hours\."\)/);
  assert.match(source, /landingText\(governedLanding, "home-proof-focus", "We don’t bill mandays\. We deliver outcomes\."\)/);
  assert.match(source, /landingText\(governedLanding, "home-proof-platform", "We don’t build Power Points\. We build working solutions"\)/);
  assert.match(source, /landingText\(governedLanding, "home-proof-presence", "No vendor lock-in\. You own the platform\."\)/);
  assert.doesNotMatch(source, /home-proof-(model|focus|platform|presence)-label/);
});

test("retains service, Blueprint, convergence, industry, and start sections in order", () => {
  const serviceIndex = source.indexOf('<section id="service-lines"');
  const blueprintIndex = source.indexOf("<BlueprintJourney stageMedia=");
  const convergenceIndex = source.indexOf('className="bg-[#eef0f5]');
  const industryIndex = source.indexOf('<IndustryPicker');
  const startIndex = source.indexOf('landingText(governedLanding, "home-start-heading", "Ready for a change?")');

  assert.ok(serviceIndex >= 0);
  assert.ok(blueprintIndex > serviceIndex);
  assert.ok(convergenceIndex > blueprintIndex);
  assert.ok(industryIndex > convergenceIndex);
  assert.ok(startIndex > industryIndex);
  assert.match(source, /<Kicker>\{landingText\(governedLanding, "home-service-label", "What we do"\)\}<\/Kicker>/);
  assert.match(source, /home-service-heading", "We combine strategy, engineering and platform\."/);
  assert.match(source, /home-convergence-heading", "We deploy teams who bridge the entire operating gap\."/);
  assert.match(source, /home-convergence-image-caption", "people \+ agents"/);
  assert.match(source, /home-start-label", "Start"/);
});

test("removes the retired image ledger and service-body intro", () => {
  assert.doesNotMatch(source, /home-image-ledger|Cognirise outcomes in motion/);
  assert.doesNotMatch(source, /home-service-body|home-convergence-body|home-start-body/);
  assert.doesNotMatch(source, /outcomes in motion|You don't need a strategy firm that can't code/);
});

test("keeps convergence and start CTAs on the approved Cognirise email route", () => {
  assert.match(source, /"home-convergence-cta", \{ label: "Book a 48-hour prototype", href: "mailto:support@cognirise\.ai" \}/);
  assert.match(source, /"home-start-cta", \{ label: "Talk to us", href: "mailto:support@cognirise\.ai" \}/);
  assert.match(source, /<BrandButton href=\{convergenceCta\.href\}>\{convergenceCta\.label\}<\/BrandButton>/);
  assert.match(source, /<BrandButton href=\{startCta\.href\} variant="inverse">\{startCta\.label\}<\/BrandButton>/);
  assert.match(source, /<BrandButton href="\/#service-lines">Explore our practice<\/BrandButton>/);
});

test("keeps the homepage service-card summary and its content authority", () => {
  assert.match(source, /<ServiceLineTiles\s+variant="summary"\s+source="homepage"/);
  assert.match(serviceTilesSource, /const HOMEPAGE_SERVICE_COPY:/);
  assert.match(serviceTilesSource, /label: "Consulting & Engineering with AI"/);
  assert.match(serviceTilesSource, /label: "Custom-made Sovereign AI Solutions"/);
  assert.match(serviceTilesSource, /label: "Market-leading AI Platforms"/);
  assert.match(serviceTilesSource, /aria-label="Service lines"/);
  assert.match(serviceTilesSource, /data-testid=\{`service-trigger-\$\{service\.id\}`\}/);
  assert.match(serviceTilesSource, /variant === "summary" \? homepageCopy\.label : service\.label/);
  assert.match(serviceTilesSource, /trackEvent\("service_card_activated"/);
});

test("retains Blueprint stage order and exact governed media resolution", () => {
  assert.match(source, /resolveBlueprintStageMedia\(homepage\)/);
  assert.match(source, /<BlueprintJourney stageMedia=\{blueprintStageMedia \?\? undefined\} \/>/);
  for (const stage of ["innovate", "demonstrate", "activate", "operate"]) {
    assert.match(blueprintSource, new RegExp(`\\["${stage}", \\d\\]`));
    assert.match(blueprintSource, new RegExp(`candidate\\.id === \`home-idao-stage-\\$\\{stage\\}\``));
  }
  assert.match(blueprintSource, /section\.references\.length !== 1/);
  assert.match(blueprintSource, /return null;/);
  assert.match(blueprintSource, /governedMedia\?\.src \?\? assetUrl\(stage\.image\)/);
  assert.match(blueprintSource, /data-testid=\{`blueprint-trigger-\$\{stage\.id\}`\}/);
});

test("uses the shared CMS-backed homepage industry cards", () => {
  assert.match(source, /import \{ IndustryPicker \} from "@\/components\/IndustryPicker"/);
  assert.match(source, /id="home-industries"\s+homepage\s+heading=\{homepageIndustryNarrative\?\.heading \|\| "Built on expertise\."\}/);
  assert.match(source, /industryIds=\{homepageIndustryNarrative\?\.industryIds\}/);
  assert.match(industryPickerSource, /const industryQuery = useCmsCollection\("industry", \[\]/);
  assert.match(industryPickerSource, /industryIds\.includes\(industry\.slug\)/);
  assert.match(industryPickerSource, /industryIds\.indexOf\(left\.slug\) - industryIds\.indexOf\(right\.slug\)/);
  assert.match(industryPickerSource, /data-testid=\{`home-industry-trigger-\$\{industry\.id\}`\}/);
  assert.match(industryPickerSource, /data-testid=\{`link-industry-picker-\$\{industry\.slug\}`\}/);
  assert.match(industryPickerSource, /industryQuery\.delivery === "intentional-empty"/);
  assert.doesNotMatch(source, /useCmsCollection\("industry"/);
});

test("preserves the public homepage delivery guardrails", () => {
  assert.match(source, /homepageDelivery !== "cms" && homepageDelivery !== "compiled-fallback"/);
  assert.match(source, /No published homepage edition is available for this market and locale\./);
  assert.match(source, /The published homepage blueprint media could not be safely delivered\./);
  assert.match(source, /!section\.id\.startsWith\("home-"\)/);
});
