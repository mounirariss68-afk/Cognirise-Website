import assert from "node:assert/strict";
import test from "node:test";
import { filterSharedMarketReadiness } from "../src/lib/shared-market-readiness";

const row = {
  document_id: "page",
  baseline_id: "shared",
  mode: "adapted",
  active_revision_id: "new",
  based_on_baseline_revision_id: "old",
  held_baseline_revision_id: null,
  latest_revision_id: "draft",
  published_revision_id: "live",
  published_decision: "show",
  draft_decision: null,
  translation_state: "current",
  override_operations: [],
};
const client = (rows: unknown[]) => ({ query: async () => ({ rows }) });

test("readiness can simultaneously report pending changes and shared updates", async () => {
  for (const filter of ["pending", "updates"]) {
    assert.deepEqual([...await filterSharedMarketReadiness(client([row]), ["page"], filter, ["ksa"])], ["page"]);
  }
  assert.equal((await filterSharedMarketReadiness(client([row]), ["page"], "ready", ["ksa"])).size, 0);
});

test("an intentional hold suppresses only its reviewed update", async () => {
  const held = { ...row, held_baseline_revision_id: "new" };
  assert.equal((await filterSharedMarketReadiness(client([held]), ["page"], "updates", null)).size, 0);
  assert.equal((await filterSharedMarketReadiness(client([{ ...held, active_revision_id: "newer" }]), ["page"], "updates", null)).size, 1);
});

test("independent market pages need no shared baseline to be ready", async () => {
  const independent = { ...row, mode: "independent", baseline_id: null, latest_revision_id: "live" };
  assert.equal((await filterSharedMarketReadiness(client([independent]), ["page"], "ready", null)).size, 1);
  assert.equal((await filterSharedMarketReadiness(client([independent]), ["page"], "needs-baseline", null)).size, 0);
  assert.equal((await filterSharedMarketReadiness(client([independent]), ["page"], "updates", null)).size, 0);
});

test("independence exempts only baseline setup, not missing content or pending review", async () => {
  const independent = { ...row, mode: "independent", baseline_id: null, translation_state: "not-applicable" };
  for (const [filter, values] of [
    ["pending", independent],
    ["missing", { ...independent, latest_revision_id: null, legacy_shared: false }],
    ["blocker", { ...independent, workflow_state: "rejected" }],
  ] as const) {
    assert.equal((await filterSharedMarketReadiness(client([values]), ["page"], filter, null)).size, 1);
    assert.equal((await filterSharedMarketReadiness(client([values]), ["page"], "ready", null)).size, 0);
    assert.equal((await filterSharedMarketReadiness(client([values]), ["page"], "needs-baseline", null)).size, 0);
  }
});

test("missing required baselines remain visible for shared, adapted and unbound editions", async () => {
  for (const mode of ["shared", "adapted", null]) {
    const missingBaseline = { ...row, mode, baseline_id: null };
    assert.equal((await filterSharedMarketReadiness(client([missingBaseline]), ["page"], "needs-baseline", null)).size, 1);
  }
});

test("conflicting changed fields surface as review blockers", async () => {
  const conflicting = {
    ...row,
    adopted_snapshot: { title: "Old" },
    current_snapshot: { title: "Shared new" },
    override_operations: [{ op: "set", path: "title", value: "Local title" }],
  };
  assert.equal((await filterSharedMarketReadiness(client([conflicting]), ["page"], "blocker", null)).size, 1);
});

test("destination permissions and explicit market/locale are applied in the query", async () => {
  let observed: unknown[] = [];
  const scoped = { query: async (sql: string, values?: unknown[]) => {
    assert.match(sql, /m\.code=ANY\(\$2::text\[\]\)/);
    assert.match(sql, /target\.locale=\$4/);
    observed = values ?? [];
    return { rows: [] };
  } };
  await filterSharedMarketReadiness(scoped, ["page"], "pending", ["ksa"], "ksa", "ar");
  assert.deepEqual(observed, [["page"], ["ksa"], "ksa", "ar", "pending"]);
});