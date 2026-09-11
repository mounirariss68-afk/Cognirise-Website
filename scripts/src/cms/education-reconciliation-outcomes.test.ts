import assert from "node:assert/strict";
import test from "node:test";
import { educationReconciliationOutcome } from "./receipt-reconciliation.js";
import { runReconciliationLifecycle } from "./reconcile-order.js";

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

test("an old approved Education v2 imports a successor draft, cuts over all three pins, then replays", async () => {
  type State = "old-approved-v2" | "successor-draft" | "three-pin-published";
  let state: State = "old-approved-v2";
  const calls: string[] = [];

  const inspect = () => {
    const pending = state === "successor-draft";
    const complete = state === "three-pin-published";
    return {
      state: complete ? "complete" as const : "pending" as const,
      educationCutoverPending: pending,
      outcome: educationReconciliationOutcome({
        receiptOperation: pending
          ? "cms.inventory.education-successor-pending-cutover"
          : "cms.inventory.education-successor-published",
        publishedComplete: complete,
        exactPayload: pending || complete,
        freshDraftComplete: pending,
        hasLiveRevision: true,
      }),
    };
  };

  const before = inspect();
  const after = await runReconciliationLifecycle({
    beforeIsComplete: before.state === "complete",
    initialImport: false,
    importInventory: async () => {
      calls.push("import-v11-draft");
      state = "successor-draft";
    },
    inspectAfterImport: async () => inspect(),
    validateAfterImport: (next) => {
      assert.equal(next.outcome.valid, true);
      assert.equal(next.outcome.status, "pending-cutover");
      assert.equal(next.educationCutoverPending, true);
    },
    verifyInitialBaseline: async () => { calls.push("verify"); },
    publishIndustryMedia: async () => {
      calls.push("cutover-three-pins");
      state = "three-pin-published";
    },
  });
  assert.equal(after?.outcome.status, "pending-cutover");
  assert.deepEqual(calls, ["import-v11-draft", "cutover-three-pins"]);
  assert.equal(inspect().outcome.status, "published");

  const replayBefore = inspect();
  const replay = await runReconciliationLifecycle({
    beforeIsComplete: replayBefore.state === "complete",
    initialImport: false,
    importInventory: async () => { calls.push("unexpected-import"); },
    inspectAfterImport: async () => inspect(),
    validateAfterImport: () => assert.fail("a complete three-pin publication must not revalidate as import"),
    verifyInitialBaseline: async () => { calls.push("unexpected-verify"); },
    publishIndustryMedia: async () => { calls.push("cutover-replay"); },
  });
  assert.equal(replay, null);
  assert.deepEqual(calls, ["import-v11-draft", "cutover-three-pins", "cutover-replay"]);
});