import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const page = readFileSync(new URL("./AgenticOperationsReadiness.tsx", import.meta.url), "utf8");
const editorial = readFileSync(new URL("../../../../lib/api-zod/src/methodology-editorial/agentic-operations-readiness.ts", import.meta.url), "utf8");
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
  assert.match(editorial, /operating-condition register/i);
  assert.match(page, /unresolved\.map/);
  assert.match(editorial, /"\/methodologies\/idao"/);
  assert.match(editorial, /"\/methodologies\/agent-authority-model"/);
  assert.match(editorial, /This framework decides whether the workflow has viable operating conditions/);
  assert.match(editorial, /does not decide how independently an agent may act/);
});

test("keeps the baseline editorial and source record in its shared seed", () => {
  assert.match(editorial, /heroSeed/);
  assert.match(editorial, /method-aor-v2\.jpg/);
  assert.match(editorial, /External source review: 10 September 2026/);
  assert.match(editorial, /Cognirise proprietary content/);
  assert.match(editorial, /not presented as requirements of the sources below/);
  for (const source of ["NIST AI Risk Management Framework", "NIST AI 600-1", "EU AI Act"]) {
    assert.match(editorial, new RegExp(source));
  }
});

test("binds CMS editorial fields in their original page positions", () => {
  assert.match(page, /methodologyEditorial<[\s\S]*?>\("agentic-operations-readiness", cms, agenticOperationsReadinessEditorial\.seed\)/);
  for (const field of [
    "relationship.startHereWhen",
    "boundary.heading",
    "workflowScope.placeholder",
    "readinessOutput.heading",
    "basis.sources.map",
    "delivery.actions.map",
  ]) {
    assert.match(page, new RegExp(`editorial\\.${field.replaceAll(".", "\\.")}`));
  }
});

test("keeps answers in page memory while preserving legacy record reopening", () => {
  assert.match(page, /useMethodSessionState<Partial<ReadinessAnswers>>/);
  assert.match(page, /requestedSavedId \?[\s\S]*?isReadinessAnswersSessionState/);
  assert.match(page, /setAnswers\(record\.answers\)/);
  assert.match(page, /downloadReadinessResultsPdf/);
  assert.doesNotMatch(page, /createReadinessAssessment|copyShareLink|saveReadinessAssessment/);
});