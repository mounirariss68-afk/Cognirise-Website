import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PulsePageEditor } from "./PulsePageEditor";
import { pulseDefault } from "./pulse-authoring";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("Pulse editor exposes labeled hero inputs, section navigation and actionable validation", () => {
  const page = pulseDefault("cognibase-pulse").pulsePage;
  const html = renderToStaticMarkup(<PulsePageEditor page={page} onChange={() => {}} errors={["pulsePage.hero.headline: Headline needs review", "pulsePage.sections.6.items.0.body: Answer needs review"]} />);
  assert.match(html, /Hero headline/);
  assert.match(html, /Headline needs review/);
  assert.match(html, /Answer needs review/);
  assert.match(html, /tab-pulse-sections/);
  assert.match(html, /tab-pulse-diagram/);
  assert.match(html, /select-pulse-tone/);
  assert.doesNotMatch(html, /<pre>/);
});