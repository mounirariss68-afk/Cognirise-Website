import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { guardrailsFixture } from "../../../../../scripts/src/cms/guardrails-fixture";
import { LayerExplorer } from "./LayerExplorer";
import { ExposureExplorer } from "./ExposureExplorer";
import { MarkdownInline } from "./MarkdownInline";

const content = guardrailsFixture.content;

const normalize = (html: string) =>
  html
    .replace(/<[^>]*>/g, "")
    .replace(/<!-- -->/g, "")
    .replace(/\s+/g, " ")
    .trim();

const renderedText = (text: string) => normalize(renderToString(<MarkdownInline text={text} />));

describe("guardrails explorer text equivalents", () => {
  it("renders every supplied layer diagram string, including inactive rows", () => {
    const diagram = content.layers.diagram;
    const html = renderToString(<LayerExplorer content={content} />);
    const text = normalize(html);
    const suppliedStrings = [
      diagram.title,
      diagram.description,
      diagram.kicker,
      diagram.rule,
      diagram.thresholdLabel,
      diagram.footer,
      ...diagram.rows.flatMap((row) => [
        row.label,
        row.description,
        row.example,
        row.bypassLabel,
        row.bypass,
        row.strengthLabel,
      ]),
    ];

    for (const value of suppliedStrings) {
      assert.ok(text.includes(renderedText(value)), `Missing layer diagram string: ${value}`);
    }

    assert.match(html, /role="region"/);
    assert.match(html, /aria-describedby="guardrails-layer-diagram-summary"/);
    assert.match(html, /data-guardrails-print-summary="layers"/);
    assert.match(html, /sr-only print:not-sr-only/);
    assert.doesNotMatch(html, /<table\b/);
  });

  it("renders every supplied exposure diagram string, including inactive bands and destinations", () => {
    const diagram = content.stoppingRule.diagram;
    const html = renderToString(<ExposureExplorer content={content} />);
    const text = normalize(html);
    const suppliedStrings = [
      diagram.title,
      diagram.description,
      diagram.kicker,
      diagram.heading,
      diagram.bandHeading,
      diagram.destinationHeading,
      diagram.footer,
      diagram.note,
      ...diagram.bands.flatMap((band) => [band.label, band.description]),
      ...diagram.destinations.flatMap((destination) => [destination.label, destination.description]),
      ...diagram.additions.map((addition) => addition.label),
    ];

    for (const value of suppliedStrings) {
      assert.ok(text.includes(renderedText(value)), `Missing exposure diagram string: ${value}`);
    }

    assert.match(html, /role="region"/);
    assert.match(html, /aria-describedby="guardrails-exposure-diagram-summary"/);
    assert.match(html, /data-guardrails-print-summary="exposure"/);
    assert.match(html, /sr-only print:not-sr-only/);
    assert.doesNotMatch(html, /<table\b/);
  });
});