import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./Home.tsx", import.meta.url), "utf8");

test("uses the shared Pulse action family for prominent homepage CTAs", () => {
  assert.match(source, /<BrandButton href="\/#service-lines">Explore our practice<\/BrandButton>/);
  assert.match(source, /<BrandButton href="\/about">Meet the team<\/BrandButton>/);
  assert.match(source, /<BrandButton href="\/contact" variant="inverse">Book a consultation<\/BrandButton>/);
});

test("promotes both public methodologies", () => {
  assert.match(source, /href="\/methodologies\/idao"[^>]*>Explore IDAO/);
  assert.match(source, /href="\/methodologies\/agent-authority-model"[^>]*>Agent Authority Model/);
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