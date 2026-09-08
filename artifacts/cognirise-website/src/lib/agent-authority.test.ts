import assert from "node:assert/strict";
import { test } from "node:test";
import {
  type HScore,
  type Oversight,
  type RScore,
  OVERSIGHT_ORDER,
  evaluateAssessment,
  getAssessmentErrors,
  getCeiling,
  getEBand,
  isRequestedAboveCeiling,
  isRoleVague,
} from "./agent-authority";

const expectedBands: Record<RScore, EBandRow> = {
  1: [1, 2, 3, 4, 5],
  2: [1, 2, 3, 4, 5],
  3: [2, 2, 3, 4, 5],
  4: [3, 3, 3, 4, 5],
};
type EBandRow = [1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5, 1 | 2 | 3 | 4 | 5];

test("maps every reversibility and reach combination to its exposure band", () => {
  for (const rScore of [1, 2, 3, 4] as RScore[]) {
    for (const hScore of [1, 2, 3, 4, 5] as HScore[]) {
      assert.equal(getEBand(rScore, hScore), expectedBands[rScore][hScore - 1]);
    }
  }
});

test("maps every exposure band to the required oversight ceiling", () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map((band) => getCeiling(band as 1 | 2 | 3 | 4 | 5)),
    OVERSIGHT_ORDER,
  );
});

test("compares every requested authority with every ceiling", () => {
  for (const requested of OVERSIGHT_ORDER) {
    for (const ceiling of OVERSIGHT_ORDER) {
      assert.equal(
        isRequestedAboveCeiling(requested, ceiling),
        OVERSIGHT_ORDER.indexOf(requested) < OVERSIGHT_ORDER.indexOf(ceiling),
        `${requested} compared with ${ceiling}`,
      );
    }
  }
});

test("rejects team ownership but accepts a named accountable role", () => {
  assert.equal(isRoleVague("Network operations team"), true);
  assert.equal(isRoleVague("Risk"), true);
  assert.equal(isRoleVague("Duty Manager, Operations Control Centre"), false);
});

test("identifies every incomplete governance output rather than scoring it", () => {
  const errors = getAssessmentErrors({});
  assert.equal(errors.length, 8);
  assert.equal(evaluateAssessment({}), null);
});

test("requires an intervention window for E2 and an artefact above the ceiling", () => {
  const base = {
    handoverDescription: "Issues a replacement boarding pass",
    handoverType: "Action" as const,
    rScore: 3 as const,
    hScore: 2 as const,
    requestedOversight: "out-of-loop" as Oversight,
    accountableRole: "Duty Manager, Operations Control Centre",
    promotionEvidence: "500 consecutive rebookings with zero disputed reversals",
    automaticDemotion: "Any involuntary downgrade or caused missed connection",
  };
  assert.match(getAssessmentErrors(base).join(" "), /intervention window/i);
  assert.match(getAssessmentErrors({ ...base, interventionWindow: "10 minutes" }).join(" "), /artefact/i);
  assert.equal(
    evaluateAssessment({ ...base, interventionWindow: "10 minutes", artefact: "Approved rebooking whitelist" })?.aboveCeiling,
    true,
  );
});

test("produces the approved airline worked-example result at the ceiling", () => {
  const result = evaluateAssessment({
    handoverDescription: "Rebooks a disrupted passenger and issues a boarding pass",
    handoverType: "Action",
    rScore: 3,
    hScore: 2,
    requestedOversight: "on-loop",
    interventionWindow: "Shorter than released-seat availability",
    accountableRole: "Duty Manager, Operations Control Centre",
    promotionEvidence: "500 consecutive rebookings with zero disputed reversals and no complaint uplift",
    automaticDemotion: "Any involuntary downgrade or caused missed connection",
  });
  assert.ok(result);
  assert.equal(result.eBand, 2);
  assert.equal(result.ceiling, "on-loop");
  assert.equal(result.aboveCeiling, false);
  assert.equal(result.artefactRequired, false);
});