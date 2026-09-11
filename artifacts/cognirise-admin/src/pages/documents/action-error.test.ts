import assert from "node:assert/strict";
import test from "node:test";
import { describeActionError } from "./action-error";

test("unwraps API media rejection and retains all blockers", () => {
  const result = describeActionError({
    status: 422,
    data: { error: "Review references unavailable or unapproved media.", details: [
      "bankingPov.starters.0.image: media is not active.",
      "bankingPov.production.image: media rights are not approved.",
    ] },
  });
  assert.match(result.message, /unapproved media/);
  assert.equal(result.issues.length, 2);
  assert.equal(result.mediaBlocked, true);
});

test("keeps structured content errors distinct from media approval", () => {
  const result = describeActionError({ data: {
    error: "Review readiness validation failed.",
    details: [{ path: ["seo", "title"], message: "Required" }],
  } });
  assert.deepEqual(result.issues, [{ path: "seo.title", message: "Required" }]);
  assert.equal(result.mediaBlocked, false);
});

test("supports legacy responses, session errors and network errors", () => {
  assert.equal(describeActionError({ error: "Session expired" }).message, "Session expired");
  assert.equal(describeActionError(new Error("Network unavailable")).message, "Network unavailable");
  assert.ok(describeActionError(null).message.length > 0);
});