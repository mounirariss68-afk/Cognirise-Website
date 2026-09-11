import assert from "node:assert/strict";
import test from "node:test";
import { educationReconciliationOutcome } from "./receipt-reconciliation.js";

test("Education reconciliation preserves newer editorial authority without requiring the governed payload", () => {
  assert.deepEqual(educationReconciliationOutcome({
    receiptOperation: "cms.inventory.industry-contract-editorial-preserved",
    publishedComplete: false,
    exactPayload: false,
    freshDraftComplete: false,
    hasLiveRevision: true,
  }), {
    valid: true,
    status: "preserved-editorial",
    message: "newer editorial authority was preserved",
  });
});

test("Education reconciliation accepts an already-complete governed publication", () => {
  assert.equal(educationReconciliationOutcome({
    receiptOperation: "cms.inventory.industry-contract-baseline-reused",
    publishedComplete: true,
    exactPayload: true,
    freshDraftComplete: false,
    hasLiveRevision: true,
  }).status, "reused");
});

test("fresh Education import is complete only as an exact review draft", () => {
  assert.equal(educationReconciliationOutcome({
    receiptOperation: "cms.inventory.import",
    publishedComplete: false,
    exactPayload: true,
    freshDraftComplete: true,
    hasLiveRevision: true,
  }).status, "new-draft");
  assert.equal(educationReconciliationOutcome({
    receiptOperation: "cms.inventory.import",
    publishedComplete: false,
    exactPayload: false,
    freshDraftComplete: true,
    hasLiveRevision: true,
  }).valid, false, "an unknown new draft is never implicitly accepted");
  assert.equal(educationReconciliationOutcome({
    receiptOperation: "cms.inventory.import",
    publishedComplete: true,
    exactPayload: true,
    freshDraftComplete: false,
    hasLiveRevision: true,
  }).status, "published", "an exact draft can become public only through the complete governed cutover");
});

test("published Education reconciliation outcome is idempotent", () => {
  const input = {
    receiptOperation: "cms.inventory.education-successor-published",
    publishedComplete: true,
    exactPayload: true,
    freshDraftComplete: false,
    hasLiveRevision: true,
  };
  assert.deepEqual(
    educationReconciliationOutcome(input),
    educationReconciliationOutcome(input),
  );
});