import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { EducationEditorialView, stableEducationContentSignature } from "./EducationEditorial";
import { INDUSTRIES } from "@/content/industries";

test("Education content signatures are stable for object key order and change for a content revision", () => {
  const first = { content: { thesis: "Education", targetState: [{ title: "Mission", body: "Choose purpose." }] }, market: "uae" };
  const reordered = { market: "uae", content: { targetState: [{ body: "Choose purpose.", title: "Mission" }], thesis: "Education" } };
  const revision = { market: "uae", content: { targetState: [{ body: "Choose purpose and measures.", title: "Mission" }], thesis: "Education" } };

  assert.equal(stableEducationContentSignature(first), stableEducationContentSignature(reordered));
  assert.notEqual(stableEducationContentSignature(first), stableEducationContentSignature(revision));
});

test("Education renders explicit, labelled controls for every projected explorer item", () => {
  const education = INDUSTRIES.find((industry) => industry.slug === "education")!;
  const html = renderToStaticMarkup(createElement(
    Router,
    {
      ssrPath: "/industries/education",
      children: createElement(EducationEditorialView, { view: education, marketOverride: "uae" }),
    },
  ));

  assert.match(html, /data-testid="education-hero-caption"/);
  assert.equal((html.match(/data-testid="education-domain-\d"/g) ?? []).length, 5);
  assert.equal((html.match(/data-testid="education-application-group-\d"/g) ?? []).length, education.educationPov!.applications!.length);
  assert.equal((html.match(/data-testid="education-capability-\d"/g) ?? []).length, 7);
  assert.equal((html.match(/data-testid="education-roadmap-\d"/g) ?? []).length, 3);
  assert.match(html, /top-\[72px\].*md:top-\[82px\]/);
  assert.doesNotMatch(html, /scroll-mt-24/);
});