import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const shell = readFileSync(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8");
const page = readFileSync(new URL("../components/industries/IndustryEditorial.tsx", import.meta.url), "utf8");
const sitemap = readFileSync(new URL("../../public/sitemap.xml", import.meta.url), "utf8");

const canonical = [
  "financial-services",
  "telecoms",
  "travel-hospitality",
  "energy-resources",
  "public-sector",
  "education",
];

test("advertises exactly the six canonical industry routes", () => {
  for (const slug of canonical) {
    assert.match(app, new RegExp(`path=\"/industries/${slug}\"`));
    assert.match(shell, new RegExp(`\"/industries/${slug}\"`));
    assert.match(sitemap, new RegExp(`<loc>https://cognirise.ai/industries/${slug}</loc>`));
  }
  assert.doesNotMatch(shell, /Manufacturing|\/industries\/manufacturing/);
  assert.doesNotMatch(sitemap, /manufacturing|government/);
});

test("every routed page component is imported", () => {
  const routeComponents = [...app.matchAll(/component=\{([A-Z][A-Za-z0-9]*)\}/g)].map((match) => match[1]);
  assert.ok(routeComponents.length > 20, "expected the complete public route inventory");
  for (const component of routeComponents) {
    assert.match(app, new RegExp(`import ${component} from `), `${component} must be imported`);
  }
});

test("keeps replaced industry routes intentional and query-preserving", () => {
  assert.match(app, /function CanonicalRedirect[\s\S]*useSearch\(\)[\s\S]*`\$\{to\}\?\$\{search\}`/);
  assert.match(app, /path="\/industries\/government"[\s\S]*CanonicalRedirect to="\/industries\/public-sector"/);
  assert.match(app, /path="\/industries\/manufacturing"[\s\S]*CanonicalRedirect to="\/industries\/public-sector"/);
  assert.match(app, /path="\/pov-government"[\s\S]*CanonicalRedirect to="\/industries\/public-sector"/);
});

test("preserves metadata, accessible comparisons and reduced motion", () => {
  for (const slug of canonical) assert.match(shell, new RegExp(`\"/industries/${slug}\":[\\s\\S]*title:`));
  assert.match(page, /<table className="ind-table">/);
  assert.match(page, /aria-labelledby="evidence-title"/);
  assert.match(page, /@media\(prefers-reduced-motion:reduce\)/);
  for (const variant of ["network", "journey", "field", "factory"]) {
    assert.match(page, new RegExp(`\\.industry--${variant}`));
  }
});