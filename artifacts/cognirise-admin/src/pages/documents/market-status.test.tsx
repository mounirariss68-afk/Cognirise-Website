import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MarketSourceBadge, MarketStatusLegend, sourceStateForEdition } from "./market-status";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

test("market source legend shares every source label and treatment with cells", () => {
  const legend = renderToStaticMarkup(<MarketStatusLegend />);
  const states = ["shared", "adapted", "independent", "legacy-fallback", "missing"] as const;
  for (const state of states) {
    const cell = renderToStaticMarkup(<MarketSourceBadge state={state} testId={`cell-${state}`} />);
    const label = cell.replace(/<[^>]+>/g, "").trim();
    assert.match(legend, new RegExp(`legend-status-source-${state}`));
    assert.match(legend, new RegExp(`>${label}<`));
  }
  assert.match(legend, /Source.*separate from workflow and delivery/);
  assert.match(legend, /Pending.*staged availability change or a saved draft; it is not live delivery/);
  assert.match(legend, /Not live.*not currently delivered/);
  assert.match(legend, /Updates available.*newer shared baseline is available/);
  assert.match(legend, /Translation stale.*lineage needs acknowledgement or resolution/);
});

test("only authoritative fallback is legacy; an exact unbound edition is independent", () => {
  assert.equal(sourceStateForEdition({ edition: { exact: true, usedFallback: false } }), "independent");
  assert.equal(sourceStateForEdition({ edition: { exact: false, usedFallback: true } }), "legacy-fallback");
  assert.equal(sourceStateForEdition({ edition: { exact: false, usedFallback: false } }), "missing");
});