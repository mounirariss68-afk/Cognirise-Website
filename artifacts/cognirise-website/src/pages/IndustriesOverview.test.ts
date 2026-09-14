import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./IndustriesOverview.tsx", import.meta.url), "utf8");

test("composes the overview around the picker, one approved case-study rail, and one capability story", () => {
  assert.match(source, /<IndustryPicker[\s\S]*id="industries"/);
  assert.match(source, /useCmsCollection<PublicCaseStudy>\("case-study"/);
  assert.match(source, /approvedPublishedCases\(caseStudies\.data\)/);
  assert.match(source, /<CaseStudyRail cases=\{approvedCases\} \/>/);
  assert.match(source, /<IndustryPicker[\s\S]*compact\s*\/>/);
  assert.ok(source.indexOf("<IndustryPicker") < source.indexOf("<CaseStudyRail"));
  assert.ok(source.indexOf("<CaseStudyRail") < source.indexOf('<section className="io-capability">'));
  assert.match(source, /Loading approved case studies/);
  assert.match(source, /Approved case studies are temporarily unavailable/);
  assert.match(source, /No approved case studies are currently published/);
  assert.match(source, /Agentic platforms/);
  assert.match(source, /Sovereign & regulated AI/);
  assert.match(source, /AI-native consulting & engineering/);
  assert.match(source, /Responsible delivery/);
  assert.match(source, /href="\/value-scan"/);
});

test("removes the duplicate and controls-led industry chapters", () => {
  assert.doesNotMatch(source, /Make controls part of the flow/);
  assert.doesNotMatch(source, /Critical infrastructure/);
  assert.doesNotMatch(source, /io-view-link/);
  assert.doesNotMatch(source, /SpatialDisclosure/);
});

test("uses the approved inverse BrandButton for the closing value-scan CTA", () => {
  assert.match(source, /import \{ BrandButton \} from "@\/components\/ui\/brand-button"/);
  assert.match(source, /<BrandButton href="\/value-scan" variant="inverse" className="mt-5">Book a value scan<\/BrandButton>/);
  assert.doesNotMatch(source, /io-primary/);
});