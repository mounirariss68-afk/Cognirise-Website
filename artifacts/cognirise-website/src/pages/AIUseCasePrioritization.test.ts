import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { getRecommendation, type UseCase } from "./AIUseCasePrioritization";

function opportunity(scores: UseCase["scores"]): UseCase {
  return {
    id: "test",
    name: "Test opportunity",
    description: "",
    scores,
    caveats: "",
    dependencies: "",
  };
}

const base = {
  value: 4,
  feasibility: 4,
  timeToEvidence: 4,
  adoptionFriction: 4,
  controlBurden: 4,
  reusePotential: 4,
};

test("stage recommendations use explicit criteria rather than the total alone", () => {
  assert.equal(getRecommendation(opportunity({ ...base, value: 2 })).stage, "Stop");
  assert.equal(getRecommendation(opportunity({ ...base, feasibility: 2 })).stage, "Innovate");
  assert.equal(getRecommendation(opportunity({ ...base, adoptionFriction: 2 })).stage, "Demonstrate");
  assert.equal(getRecommendation(opportunity(base)).stage, "Activate");
});

test("high control burden and low feasibility produce an explained stop decision", () => {
  const result = getRecommendation(opportunity({ ...base, feasibility: 2, controlBurden: 2 }));
  assert.equal(result.stage, "Stop");
  assert.match(result.reason, /control burden/i);
  assert.match(result.reason, /feasibility/i);
});

test("the page states its limits and connects decisions to IDAO and Value Scan", () => {
  const source = readFileSync(new URL("./AIUseCasePrioritization.tsx", import.meta.url), "utf8");
  assert.match(source, /not market benchmarks, probabilities or a certification/i);
  assert.match(source, /Dependencies/);
  assert.match(source, /Caveats & Constraints/);
  assert.match(source, /\/methodologies\/idao#innovate/);
  assert.match(source, /\/methodologies\/idao#demonstrate/);
  assert.match(source, /\/methodologies\/idao#activate/);
  assert.match(source, /href="\/value-scan"/);
});