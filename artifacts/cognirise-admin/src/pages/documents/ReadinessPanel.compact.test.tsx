import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ReadinessPanel } from "./ReadinessPanel";
import type { ReadinessIssue } from "./document-readiness";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

const correction: ReadinessIssue = {
  id: "address", scope: "publish", scopes: ["publish"], severity: "blocker",
  path: "content.address", label: "Address needs correction",
  detail: "Enter the complete postal address.", action: "focus-content-field", actionLabel: "Find address",
};
const review: ReadinessIssue = {
  id: "review", scope: "workflow", scopes: ["workflow"], severity: "blocker",
  path: "workflow.review", label: "Review submission required",
  detail: "Submit the saved revision.", action: "focus-submit-review", actionLabel: "Submit review",
};

test("compact checks keep review as workflow, not a repeated content error", () => {
  const html = renderToStaticMarkup(<ReadinessPanel id="checks" compact issues={[correction, review]} onAction={() => {}} />);
  assert.match(html, /aria-label="Workflow state"/);
  assert.match(html, /1 content check to review/);
  assert.equal(html.match(/Review submission required/g)?.length, 1);
  assert.match(html, /id="checks-address"/);
  assert.match(html, /Enter the complete postal address/);
  assert.doesNotMatch(html, /Path:|blocker|Exact edition/);
  assert.doesNotMatch(html, /<details[^>]* open/);
});

test("passing content checks do not imply approval or publication", () => {
  const html = renderToStaticMarkup(<ReadinessPanel id="checks" compact issues={[review]} onAction={() => {}} />);
  assert.match(html, /Content checks passed/);
  assert.match(html, /Review submission required/);
  assert.doesNotMatch(html, /Ready for the next workflow step/);
});

test("compact checks retain cross-field media errors as discoverable corrections", () => {
  const html = renderToStaticMarkup(<ReadinessPanel id="checks" compact issues={[{ ...correction, id: "media", path: "content.media", label: "Media needs attention", detail: "This image is not approved." }]} onAction={() => {}} />);
  assert.match(html, /This image is not approved/);
  assert.match(html, /data-readiness-issue="media"/);
});