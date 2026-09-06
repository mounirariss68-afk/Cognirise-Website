import assert from "node:assert/strict";
import test from "node:test";
import { canTransition, hasEditionConflict, isMarketAssigned, lifecycleDateError, parseTransitionInput, violatesSeparationOfDuties, workflowRequestDigest } from "./workflow";

test("workflow role matrix and market assignments enforce separation boundaries", () => {
  assert.equal(canTransition("author", "draft", "review"), true);
  assert.equal(canTransition("author", "review", "approved"), false);
  assert.equal(canTransition("reviewer", "review", "approved"), true);
  assert.equal(canTransition("publisher", "approved", "published"), true);
  assert.equal(canTransition("reviewer", "approved", "published"), false);
  assert.equal(isMarketAssigned({ id: "reviewer", role: "reviewer", markets: ["uae"] }, "uae"), true);
  assert.equal(isMarketAssigned({ id: "reviewer", role: "reviewer", markets: ["uae"] }, "ksa"), false);
});

test("closed transition inputs preserve idempotency and scheduler safety fields", () => {
  assert.deepEqual(parseTransitionInput({
    requestId: "receipt_123", subjectId: "page.home", market: "uae",
    toState: "review", expectedVersion: 3,
  }), { requestId: "receipt_123", subjectId: "page.home", market: "uae", toState: "review", expectedVersion: 3 });
  assert.equal(parseTransitionInput({
    requestId: "receipt_123", subjectId: "page.home", market: "uae",
    toState: "review", expectedVersion: 3, actor: "forged",
  }), undefined);
  assert.equal(parseTransitionInput({
    requestId: "receipt_123", subjectId: "page.home", market: "uae",
    toState: "review", expectedVersion: 3.5,
  }), undefined);
});

test("optimistic conflicts and self-approval are denied before transition writes", () => {
  const reviewer = { id: "reviewer", role: "reviewer", markets: ["uae"] } as const;
  assert.equal(hasEditionConflict(4, 3), true);
  assert.equal(hasEditionConflict(3, 3), false);
  assert.equal(violatesSeparationOfDuties(reviewer, {
    lastEditorPrincipalId: "reviewer", lastRequesterPrincipalId: "author",
  }, "approved"), true);
  assert.equal(violatesSeparationOfDuties(reviewer, {
    lastEditorPrincipalId: "author", lastRequesterPrincipalId: "author",
  }, "approved"), false);
});

test("scheduled and direct publication validate effective stored and requested lifecycle dates", () => {
  const now = new Date("2026-01-01T12:00:00Z");
  const existing = { publishAt: new Date("2026-01-02T12:00:00Z"), expiresAt: null };
  const input = { requestId: "dates_123", subjectId: "page.home", market: "uae", expectedVersion: 1 } as const;
  assert.match(lifecycleDateError(existing, { ...input, toState: "scheduled", expiresAt: "2026-01-02T12:00:00Z" }, now) ?? "", /strictly later/);
  assert.match(lifecycleDateError(existing, { ...input, toState: "scheduled", expiresAt: "2026-01-02T11:59:59Z" }, now) ?? "", /strictly later/);
  assert.match(lifecycleDateError({ publishAt: null, expiresAt: new Date("2026-01-01T11:00:00Z") }, { ...input, toState: "published" }, now) ?? "", /future/);
  assert.equal(lifecycleDateError(existing, { ...input, toState: "scheduled", expiresAt: "2026-01-03T12:00:00Z" }, now), undefined);
});

test("workflow receipt identity binds actor and every canonical transition field", () => {
  const input = { requestId: "receipt_123", subjectId: "page.home", market: "uae", toState: "scheduled", expectedVersion: 2, publishAt: "2026-01-03T00:00:00.000Z", expiresAt: "2026-01-04T00:00:00.000Z" } as const;
  const actor = { id: "publisher-a", role: "publisher", markets: ["uae"] } as const;
  const digest = workflowRequestDigest(input, actor);
  assert.equal(workflowRequestDigest({ ...input }, actor), digest);
  assert.notEqual(workflowRequestDigest({ ...input, market: "ksa" }, actor), digest);
  assert.notEqual(workflowRequestDigest({ ...input, expectedVersion: 3 }, actor), digest);
  assert.notEqual(workflowRequestDigest({ ...input, expiresAt: "2026-01-05T00:00:00.000Z" }, actor), digest);
  assert.notEqual(workflowRequestDigest(input, { ...actor, id: "publisher-b" }), digest);
});