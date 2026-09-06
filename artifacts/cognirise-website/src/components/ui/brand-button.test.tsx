import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Router } from "wouter";
import { BrandButton } from "./brand-button";

const render = (element: React.ReactElement) => renderToStaticMarkup(element);

test("renders every main variant with the shared Pulse action structure", () => {
  for (const variant of ["primary", "secondary", "inverse", "submit"] as const) {
    const markup = render(<BrandButton variant={variant}>Continue</BrandButton>);

    assert.match(markup, new RegExp(`pulse-action-${variant}`));
    assert.match(markup, /pulse-action-layout/);
    assert.match(markup, /pulse-action-icon/);
    assert.match(markup, /pulse-signal-rail/);
  }
});

test("keeps editorial actions visually light", () => {
  const markup = render(<BrandButton variant="editorial">Read more</BrandButton>);

  assert.match(markup, /pulse-editorial-icon/);
  assert.match(markup, /focus-visible:ring-2/);
  assert.doesNotMatch(markup, /pulse-action-layout/);
  assert.doesNotMatch(markup, /pulse-signal-rail/);
});

test("exposes loading and disabled button states", () => {
  const loadingMarkup = render(<BrandButton isLoading>Submitting</BrandButton>);
  const disabledMarkup = render(<BrandButton disabled>Unavailable</BrandButton>);

  assert.match(loadingMarkup, /aria-busy="true"/);
  assert.match(loadingMarkup, /disabled=""/);
  assert.match(loadingMarkup, /lucide-loader-circle/);
  assert.match(disabledMarkup, /disabled=""/);
});

test("forwards anchor attributes while making unavailable links unfocusable", () => {
  const markup = render(
    <Router ssrPath="/">
      <BrandButton
        href="/value-scan"
        disabled
        aria-label="Book the value scan"
        data-testid="value-scan-link"
      >
        Book a value scan
      </BrandButton>
    </Router>,
  );

  assert.match(markup, /href="\/value-scan"/);
  assert.match(markup, /aria-label="Book the value scan"/);
  assert.match(markup, /data-testid="value-scan-link"/);
  assert.match(markup, /aria-disabled="true"/);
  assert.match(markup, /tabindex="-1"/);
});