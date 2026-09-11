import assert from "node:assert/strict";
import test from "node:test";
import { isKnownEducationSuccessorAuthorityDigest } from "./migration.js";
import { educationReconciliationOutcome } from "./receipt-reconciliation.js";
import { runReconciliationLifecycle } from "./reconcile-order.js";
import { educationDraftReceiptAllowed, educationDraftReceiptOperations, industryPublicationPinAction } from "./industry-media.js";
import { readFileSync } from "node:fs";

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

test("empty Education import receipt reaches one-hero publication and replays without a pending successor receipt", async () => {
  // The real empty-database branch writes cms.inventory.import, not the
  // successor-pending-cutover receipt used by the upgrade branch.
  const importSource = readFileSync(new URL("./import.ts", import.meta.url), "utf8");
  const cutoverSource = readFileSync(new URL("./industry-cutover.ts", import.meta.url), "utf8");
  assert.match(importSource, /operation: publishCase[\s\S]*?: "cms\.inventory\.import"/);
  assert.match(cutoverSource, /operation=ANY\(\$4::text\[\]\)/);
  assert.match(cutoverSource, /\[\.\.\.educationDraftReceiptOperations\]/);
  assert.match(cutoverSource, /educationDraftReceiptAllowed\(/);
  const receipt = { operation: "cms.inventory.import" };
  assert.ok(educationDraftReceiptOperations.includes(receipt.operation as typeof educationDraftReceiptOperations[number]));
  const calls: string[] = [];
  let imported = false;
  let published: string | null = null;
  let revisionNumber = 0;
  let pins: string[] = [];
  const inspect = () => educationReconciliationOutcome({
    receiptOperation: receipt.operation,
    publishedComplete: published !== null,
    exactPayload: imported,
    freshDraftComplete: imported && published === null,
    hasLiveRevision: imported,
  });
  const publish = async () => {
    if (published) {
      assert.equal(industryPublicationPinAction({
        workflowState: "approved", mediaIds: ["hero"], heroMediaId: "hero",
        expectedAssetId: "hero", expectedVersionId: "reviewed-version",
        referenceVersionIds: pins,
      }), "complete");
      calls.push("replay");
      return;
    }
    assert.equal(educationDraftReceiptAllowed(receipt.operation, revisionNumber, published), true);
    pins = ["reviewed-version"];
    revisionNumber += 1;
    published = "approved-hero-revision";
    calls.push("one-hero-publication");
  };
  await runReconciliationLifecycle({
    beforeIsComplete: false, initialImport: true,
    importInventory: async () => { imported = true; revisionNumber = 1; calls.push("import"); },
    inspectAfterImport: async () => inspect(),
    validateAfterImport: state => assert.equal(state.status, "new-draft"),
    verifyInitialBaseline: async () => { calls.push("verify-draft"); },
    publishIndustryMedia: publish,
  });
  assert.equal(inspect().status, "published");
  await runReconciliationLifecycle({
    beforeIsComplete: true, initialImport: false,
    importInventory: async () => assert.fail("replay must not import"),
    inspectAfterImport: async () => inspect(),
    validateAfterImport: () => assert.fail("replay must not revalidate import"),
    verifyInitialBaseline: async () => assert.fail("replay must not verify fresh draft"),
    publishIndustryMedia: publish,
  });
  assert.deepEqual(calls, ["import", "verify-draft", "one-hero-publication", "replay"]);
  assert.equal(revisionNumber, 2);
  assert.deepEqual(pins, ["reviewed-version"]);
});

test("generic import authority never authorizes newer drafts or an existing publication", () => {
  assert.equal(educationDraftReceiptAllowed("cms.inventory.import", 1, null), true);
  assert.equal(educationDraftReceiptAllowed("cms.inventory.import", 2, null), false);
  assert.equal(educationDraftReceiptAllowed("cms.inventory.import", 1, "published"), false);
  assert.equal(educationDraftReceiptAllowed("cms.inventory.industry-contract-editorial-preserved", 1, null), false);
  assert.equal(educationDraftReceiptAllowed("cms.inventory.education-successor-pending-cutover", 10, "previous-approved"), true);
});

test("a preserved receipt can recover only from a known approved Education authority", () => {
  assert.equal(
    isKnownEducationSuccessorAuthorityDigest(
      "ba1408ae2bb721fcf743e9153ddae98ae0e6ec40d98a4e93a4370214996954f0",
    ),
    true,
  );
  assert.equal(isKnownEducationSuccessorAuthorityDigest("editorial-drift"), false);
});

test("an approved Education successor imports a hero draft, cuts over one pin, then replays", async () => {
  type State = "old-approved-v2" | "successor-draft" | "hero-published";
  let state: State = "old-approved-v2";
  const calls: string[] = [];

  const inspect = () => {
    const pending = state === "successor-draft";
    const complete = state === "hero-published";
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
      calls.push("import-v12-draft");
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
      calls.push("cutover-hero");
      state = "hero-published";
    },
  });
  assert.equal(after?.outcome.status, "pending-cutover");
  assert.deepEqual(calls, ["import-v12-draft", "cutover-hero"]);
  assert.equal(inspect().outcome.status, "published");

  const replayBefore = inspect();
  const replay = await runReconciliationLifecycle({
    beforeIsComplete: replayBefore.state === "complete",
    initialImport: false,
    importInventory: async () => { calls.push("unexpected-import"); },
    inspectAfterImport: async () => inspect(),
    validateAfterImport: () => assert.fail("a complete hero publication must not revalidate as import"),
    verifyInitialBaseline: async () => { calls.push("unexpected-verify"); },
    publishIndustryMedia: async () => { calls.push("cutover-replay"); },
  });
  assert.equal(replay, null);
  assert.deepEqual(calls, ["import-v12-draft", "cutover-hero", "cutover-replay"]);
});