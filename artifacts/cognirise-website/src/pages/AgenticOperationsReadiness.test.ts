import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./AgenticOperationsReadiness.tsx", import.meta.url), "utf8");
const app = readFileSync(new URL("../App.tsx", import.meta.url), "utf8");
const routeMap = readFileSync(new URL("../components/MethodologyRouteMap.tsx", import.meta.url), "utf8");

test("publishes the workflow readiness method and portfolio route", () => {
  assert.match(app, /path="\/methodologies\/agentic-operations-readiness"/);
  assert.match(routeMap, /Agentic Operations Readiness/);
  assert.match(routeMap, /href: "\/methodologies\/agentic-operations-readiness"/);
});

test("tests all six workflow operating conditions", () => {
  for (const condition of ["Workflow stability", "Data & tool access", "Observability", "Fallback & recovery", "Exceptions & boundaries", "Operating economics"]) {
    assert.match(page, new RegExp(condition.replace("&", "\\&")));
  }
  assert.match(page, /values\.includes\("stop"\)/);
  assert.match(page, /values\.every\(\(value\) => value === "ready"\)/);
  for (const decision of ["Proceed", "Prepare", "Stop"]) assert.match(page, new RegExp(`label: "${decision}"`));
});

test("names unresolved conditions and keeps delivery and authority boundaries explicit", () => {
  assert.match(page, /operating-condition register/i);
  assert.match(page, /unresolved\.map/);
  assert.match(page, /href="\/methodologies\/idao"/);
  assert.match(page, /href="\/methodologies\/agent-authority-model"/);
  assert.match(page, /This framework decides whether the workflow has viable operating conditions/);
  assert.match(page, /does not decide how independently an agent may act/);
});

test("dates sources and separates them from Cognirise proprietary logic", () => {
  assert.match(page, /External source review: 10 September 2026/);
  assert.match(page, /Cognirise proprietary content/);
  assert.match(page, /not presented as requirements of the sources below/);
  for (const source of ["NIST AI Risk Management Framework", "NIST AI 600-1", "EU AI Act"]) {
    assert.match(page, new RegExp(source));
  }
});

test("keeps answers in page memory while preserving legacy record reopening", () => {
  assert.match(page, /useMethodSessionState<Partial<ReadinessAnswers>>/);
  assert.match(page, /requestedSavedId \?[\s\S]*?isReadinessAnswersSessionState/);
  assert.match(page, /setAnswers\(record\.answers\)/);
  assert.match(page, /downloadReadinessResultsPdf/);
  assert.doesNotMatch(page, /createReadinessAssessment|copyShareLink|saveReadinessAssessment/);
});