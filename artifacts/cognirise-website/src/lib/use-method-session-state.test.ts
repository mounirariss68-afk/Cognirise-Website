import assert from "node:assert/strict";
import test from "node:test";
import { parseMethodSessionState } from "./use-method-session-state";

type Answers = { value?: number };

const isAnswers = (value: unknown): value is Answers =>
  Boolean(value)
  && typeof value === "object"
  && !Array.isArray(value)
  && Object.values(value).every((score) => Number.isInteger(score) && (score as number) >= 1 && (score as number) <= 5);

test("session state parsing restores valid JSON", () => {
  assert.deepEqual(parseMethodSessionState('{"value":3}', {}, isAnswers), { value: 3 });
});

test("session state parsing safely falls back for corrupt or invalid data", () => {
  assert.deepEqual(parseMethodSessionState("{bad json", {}, isAnswers), {});
  assert.deepEqual(parseMethodSessionState('{"value":99}', {}, isAnswers), {});
  assert.deepEqual(parseMethodSessionState(null, {}, isAnswers), {});
});