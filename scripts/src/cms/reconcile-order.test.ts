import assert from "node:assert/strict";
import test from "node:test";
import { runReconciliationLifecycle } from "./reconcile-order.js";

test("fresh reconciliation verifies the draft baseline before publication and then replays idempotently", async () => {
  const events: string[] = [];
  let installed = false;

  const runCycle = async (beforeIsComplete: boolean, initialImport: boolean) =>
    runReconciliationLifecycle({
      beforeIsComplete,
      initialImport,
      importInventory: async () => {
        events.push("import");
        installed = true;
      },
      inspectAfterImport: async () => {
        events.push("inspect");
        return { state: installed ? "complete" : "incomplete" };
      },
      validateAfterImport: (after) => {
        events.push("validate");
        assert.equal(after.state, "complete");
      },
      verifyInitialBaseline: async () => {
        events.push("verify-draft-baseline");
        assert.equal(installed, true);
      },
      publishIndustryMedia: async () => {
        events.push("publish-industry-media");
        assert.equal(installed, true);
      },
    });

  assert.deepEqual(
    await runCycle(false, true),
    { state: "complete" },
  );
  assert.equal(await runCycle(true, false), null);
  assert.deepEqual(events, [
    "import",
    "inspect",
    "validate",
    "verify-draft-baseline",
    "publish-industry-media",
    "publish-industry-media",
  ]);
});