import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const boundary = readFileSync(new URL("../components/GovernedLandingRoute.tsx", import.meta.url), "utf8");

test("Work overview redirects through the governed release registry and full records retain their route", () => {
  assert.match(app, /releaseRedirectForPath\(release\.data\.manifest, path\)/);
  assert.match(app, /search \? `\$\{to\}\?\$\{search\}` : to/);
  assert.match(app, /<Route path="\/work\/:slug" component=\{CaseStudyDetail\}/);
  assert.doesNotMatch(app, /WorkProof/);
});

test("legacy industry selected-work routes preserve their query and move to the overview rail", () => {
  const redirect = 'return <AnchoredRedirect to="/industries" anchor="selected-work" />';
  assert.match(app, /const legacyIndustryPaths = new Set/);
  assert.match(app, /"\/industries\/financial-services"/);
  assert.match(app, /"\/industries\/banking"/);
  assert.match(app, /"\/pov-banking"/);
  assert.match(app, /window\.location\.hash === "#selected-work"/);
  assert.ok(app.includes(redirect));
  assert.ok(app.indexOf(redirect) < app.indexOf("const unavailable"));
  assert.ok(app.indexOf(redirect) < app.indexOf("const unavailable"));
  assert.match(app, /search \? `\$\{to\}\?\$\{search\}` : to/);
  assert.doesNotMatch(app, /LegacyIndustrySelectedWorkRedirect|LegacyIndustryAliasRedirect/);
});

test("all compiled collection landings pass explicitly through the governed boundary", () => {
  for (const [path, component] of [
    ["/about", "AboutPeople"], ["/partners", "Partners"], ["/platforms", "PlatformsOverview"],
    ["/insights", "InsightsEditorial"],
  ]) {
    assert.match(app, new RegExp(`<GovernedLandingRoute pagePath="${path}" compiled=\\{${component}\\}`));
    assert.doesNotMatch(app, new RegExp(`<Route path="${path}" component=\\{${component}\\}`));
  }
});

test("released CMS wins and missing delivery never renders compiled content", () => {
  assert.match(boundary, /useCmsCollection\("landing-page"/);
  assert.match(boundary, /candidate\.pagePath === pagePath/);
  assert.match(boundary, /governedLandingDelivery\(/);
  assert.match(boundary, /query\.configuredPagePaths/);
  assert.match(boundary, /delivery === "compiled-fallback"[^\n]+<PageUnavailable/);
  assert.match(boundary, /delivery !== "cms"/);
  assert.match(boundary, /class LandingSlotErrorBoundary/);
  assert.match(boundary, /error instanceof LandingSlotDeliveryError/);
  assert.match(boundary, /<LandingSlotErrorBoundary[\s\S]*<Compiled \/>[\s\S]*<\/LandingSlotErrorBoundary>/);
  assert.doesNotMatch(boundary, /landingSections\(page\)\.map/);
  assert.doesNotMatch(boundary, /<aside/);
});

test("each approved compiled template consumes the governed landing context in place", () => {
  for (const component of ["AboutPeople", "Partners", "PlatformsOverview", "InsightsEditorial"]) {
    const source = readFileSync(new URL(`./${component}.tsx`, import.meta.url), "utf8");
    assert.match(source, /useGovernedLanding\(\)/);
    assert.match(source, /landingNarrative\(governedLanding, "hero"\)|landingText\(governedLanding, "[^"]+-hero-heading"/);
    assert.match(source, /governedHero\?\.heading|const heroHeading = landingText\(/);
    assert.match(source, /landing(?:Text|Cta|Media)\(governedLanding,/);
  }
  assert.match(boundary, /<GovernedLandingContext\.Provider value=\{page\}>[\s\S]*<Compiled \/>/);
});