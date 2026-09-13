import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("./AgentAuthorityModel.tsx", import.meta.url), "utf8");

test("Guardrails anchor is on its h3 and its figures use the page gutters", () => {
  assert.match(source, /<h3 id="guardrails-and-authority" className="[^"]*scroll-mt-20/);
  assert.doesNotMatch(source, /<section id="guardrails-and-authority"/);
  assert.doesNotMatch(source, /guardrails && \(\s*<section[\s\S]{0,160}<div className="mx-auto max-w-\[1120px\]"/);
  assert.match(source, /<figure className="mt-9 border border-\[#cbd3e1\] bg-white p-3 sm:p-5">/);
});

test("Guardrails markup keeps CMS table labels and exact structured emphasis", () => {
  assert.match(source, /\{guardrails\.comparisonColumns\.guardrails\}/);
  assert.match(source, /\{guardrails\.comparisonColumns\.authorityModel\}/);
  assert.match(source, /row\.guardrailsEmphasis === "italic" \? <em>\{row\.guardrails\}<\/em> : row\.guardrails/);
  assert.match(source, /row\.authorityModelEmphasis === "italic" \? <em>\{row\.authorityModel\}<\/em> : row\.authorityModel/);
  assert.match(source, /<strong>\{guardrails\.firstFigure\.captionLabel\}<\/strong> <em>\{guardrails\.firstFigure\.captionLead\}<\/em> \{guardrails\.firstFigure\.captionBody\}/);
  assert.match(source, /<strong>\{guardrails\.secondFigure\.captionLabel\}<\/strong> <em>\{guardrails\.secondFigure\.captionLead\}<\/em> \{guardrails\.secondFigure\.captionBody\}/);
});