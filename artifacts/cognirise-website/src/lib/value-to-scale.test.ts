import assert from "node:assert/strict";
import test from "node:test";
import { calculateMaturity, MATURITY_DIMENSIONS } from "./value-to-scale";

test("maturity result preserves dimension scores and prioritizes weakest evidence", () => {
  const answers = Object.fromEntries(MATURITY_DIMENSIONS.map((dimension, index) => [dimension.id, index < 2 ? 1 : 4]));
  const result = calculateMaturity(answers);
  assert.equal(result.dimensions.length, 7);
  assert.deepEqual(result.priorities.slice(0, 2).map((item) => item.id), ["value", "portfolio"]);
  assert.ok(result.priorities.length >= 3 && result.priorities.length <= 5);
});

test("high maturity still returns three concrete actions", () => {
  const answers = Object.fromEntries(MATURITY_DIMENSIONS.map((dimension) => [dimension.id, 5]));
  const result = calculateMaturity(answers);
  assert.equal(result.stage.name, "Scaling");
  assert.equal(result.priorities.length, 3);
  assert.match(result.priorities[0].action, /Revalidate/);
  assert.doesNotMatch(result.priorities[0].action, /establish its baseline/);
});

test("incomplete answers are excluded from the calculated average", () => {
  const result = calculateMaturity({ value: 2, portfolio: 4 });
  assert.equal(result.average, 3);
  assert.equal(result.priorities.length, 2);
  assert.equal(result.dimensions.find((item) => item.id === "platform")?.score, 0);
});

test("stage boundaries round to the nearest whole stage", () => {
  const lower = calculateMaturity({ value: 2, portfolio: 2, platform: 3, operating: 3 });
  const upper = calculateMaturity({ value: 3, portfolio: 3, platform: 4, operating: 4 });
  assert.equal(lower.stage.name, "Activating");
  assert.equal(upper.stage.name, "Operating");
});

test("low scores return improvement actions rather than sustain checks", () => {
  const answers = Object.fromEntries(MATURITY_DIMENSIONS.map((dimension) => [dimension.id, 1]));
  const result = calculateMaturity(answers);
  assert.match(result.priorities[0].action, /establish its baseline/);
});