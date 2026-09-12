import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ServiceError } from "./error-boundary";

test("service error is distinct from not found and offers a retry", () => {
  const html = renderToStaticMarkup(<ServiceError onRetry={() => undefined} />);
  assert.match(html, /data-testid="service-error"/);
  assert.match(html, /role="alert"/);
  assert.match(html, /temporarily unavailable/);
  assert.match(html, />Try again</);
});