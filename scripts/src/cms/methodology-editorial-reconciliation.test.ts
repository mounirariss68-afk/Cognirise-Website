import assert from "node:assert/strict";
import test from "node:test";
import { provisionStagedMedia, runDraftTransaction } from "./methodology-editorial-reconciliation.js";

test("Task 241 conflict preflight does not invoke injected object storage", async () => {
  const calls: string[] = [];
  await assert.rejects(
    runDraftTransaction({
      begin: async () => { calls.push("begin"); },
      preflight: async () => { calls.push("preflight"); throw new Error("edited draft conflict"); },
      stage: async () => { calls.push("stage"); return []; },
      commit: async () => { calls.push("commit"); },
      rollback: async () => { calls.push("rollback"); },
      provisionObjects: async () => { calls.push("mock-object-storage"); },
    }),
    /edited draft conflict/,
  );
  assert.deepEqual(calls, ["begin", "preflight", "rollback"]);
});

test("Task 241 database staging rollback does not invoke injected object storage", async () => {
  const calls: string[] = [];
  await assert.rejects(
    runDraftTransaction({
      begin: async () => { calls.push("begin"); },
      preflight: async () => { calls.push("preflight"); },
      stage: async () => { calls.push("stage"); throw new Error("injected database failure"); },
      commit: async () => { calls.push("commit"); },
      rollback: async () => { calls.push("rollback"); },
      provisionObjects: async () => { calls.push("mock-object-storage"); },
    }),
    /injected database failure/,
  );
  assert.deepEqual(calls, ["begin", "preflight", "stage", "rollback"]);
});

test("Task 241 provisions object storage only after commit", async () => {
  const calls: string[] = [];
  await runDraftTransaction({
    begin: async () => { calls.push("begin"); },
    preflight: async () => { calls.push("preflight"); },
    stage: async () => { calls.push("stage"); return "draft"; },
    commit: async () => { calls.push("commit"); },
    rollback: async () => { calls.push("rollback"); },
    provisionObjects: async () => { calls.push("mock-object-storage"); },
  });
  assert.deepEqual(calls, ["begin", "preflight", "stage", "commit", "mock-object-storage"]);
});

test("Task 241 bootstrap preserves published, reviewed, and edited terminal routes without storage side effects", async () => {
  const terminalStates = ["published", "reviewed", "newer-edited"];
  let stagedWrites = 0;
  let storageWrites = 0;
  const classifications = terminalStates.map((slug) => ({ slug, action: "preserved" as const }));
  const outcome = await runDraftTransaction({
    begin: async () => undefined,
    preflight: async () => undefined,
    stage: async () => classifications,
    commit: async () => undefined,
    rollback: async () => undefined,
    provisionObjects: async () => {
      await provisionStagedMedia(
        classifications,
        Object.fromEntries(terminalStates.map((slug) => [slug, [{ storageKey: slug }]])),
        async () => { storageWrites += 1; },
      );
    },
  });
  assert.deepEqual(outcome, classifications);
  assert.equal(stagedWrites, 0);
  assert.equal(storageWrites, 0);
});

test("Task 241 bootstrap still rejects a placeholder rather than preserving it as terminal", async () => {
  let storageWrites = 0;
  await assert.rejects(
    runDraftTransaction({
      begin: async () => undefined,
      preflight: async () => { throw new Error("latest revision contains a placeholder identity"); },
      stage: async () => [],
      commit: async () => undefined,
      rollback: async () => undefined,
      provisionObjects: async () => { storageWrites += 1; },
    }),
    /placeholder identity/,
  );
  assert.equal(storageWrites, 0);
});