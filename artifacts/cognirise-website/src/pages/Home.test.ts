import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

test("uses the shared Pulse action family for prominent homepage CTAs", () => {
  assert.match(source, /<BrandButton href="\/what-we-do">Explore our practice<\/BrandButton>/);
  assert.match(source, /<BrandButton href="\/about">Meet the team<\/BrandButton>/);
  assert.match(source, /<BrandButton href="\/contact" variant="inverse">Book a consultation<\/BrandButton>/);
});

test("does not retain the legacy edge-striped homepage CTA", () => {
  assert.doesNotMatch(source, /const CtaButton/);
  assert.doesNotMatch(source, /hover:shadow-\[6px_6px_0px/);
  assert.doesNotMatch(source, /bg-gradient-to-b/);
});

test("keeps expanded industry copy legible without redundant explore or close labels", () => {
  assert.doesNotMatch(source, /home-industry-affordance/);
  assert.doesNotMatch(source, /\{isActive \? "Close" : "Explore"\}/);
  assert.match(source, /\.home-industry-item\.active \.home-industry-visual:after\{background:linear-gradient\(90deg,rgba\(253,252,251,\.96\)[\s\S]*transparent 62%\)/);
  assert.match(source, /\.home-industry-item\.active \.home-industry-orientation,.home-industry-item\.active \.home-industry-detail\{max-width:34ch;color:rgba\(16,41,87,\.96\)/);
});