import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

test("uses the shared Pulse action family for prominent homepage CTAs", () => {
  assert.match(source, /<BrandButton href="\/#service-lines">Explore our practice<\/BrandButton>/);
  assert.match(source, /"home-convergence-cta", \{ label: "Meet the team", href: "\/about" \}/);
  assert.match(source, /<BrandButton href=\{convergenceCta\.href\}>\{convergenceCta\.label\}<\/BrandButton>/);
  assert.match(source, /"home-start-cta", \{ label: "Book a consultation", href: "\/contact" \}/);
  assert.match(source, /<BrandButton href=\{startCta\.href\} variant="inverse">\{startCta\.label\}<\/BrandButton>/);
});

test("promotes both public methodologies", () => {
  assert.match(source, /"home-framework-idao-cta", \{ label: "Explore IDAO", href: "\/methodologies\/idao" \}/);
  assert.match(source, /"home-framework-authority-cta", \{ label: "Agent Authority Model", href: "\/methodologies\/agent-authority-model" \}/);
  assert.match(source, /href=\{frameworkIdaoCta\.href\}[^>]*>\{frameworkIdaoCta\.label\}/);
  assert.match(source, /href=\{frameworkAuthorityCta\.href\}[^>]*>\{frameworkAuthorityCta\.label\}/);
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