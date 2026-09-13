import assert from "node:assert/strict";
import test from "node:test";
import {
  mergeSharedBaselineUpdate,
  readSharedOverridePath,
  resolveSharedBaselineUpdate,
  type SharedOverrideOperation,
} from "@workspace/api-zod";

const previous = { content: { sections: [
  { id: "hero", title: "Original", caption: "Keep caption" },
  { id: "proof", title: "Proof" },
] } };

test("shared conflict selectors read stable items and preserve safe leaves beside a chosen conflict", () => {
  assert.equal(readSharedOverridePath(previous, "content.sections[id=hero].caption"), "Keep caption");
  const next = { content: { sections: [
    { id: "hero", title: "Shared changed", caption: "Keep caption" },
    { id: "proof", title: "Proof" },
    { id: "new-shared", title: "New shared" },
  ] } };
  const operations: SharedOverrideOperation[] = [
    { op: "set", path: "content.sections[id=hero].title", value: "Market title" },
    { op: "set", path: "content.sections[id=proof].title", value: "Market proof" },
  ];
  const compared = mergeSharedBaselineUpdate(previous, next, operations);
  assert.equal(compared.conflicts.length, 1);
  const market = resolveSharedBaselineUpdate(previous, next, operations, [{ conflictId: compared.conflicts[0]!.conflictId, choice: "market" }]);
  assert.equal(market.success, true);
  if (market.success) {
    assert.equal(readSharedOverridePath(market.snapshot, "content.sections[id=hero].title"), "Market title");
    assert.equal(readSharedOverridePath(market.snapshot, "content.sections[id=proof].title"), "Market proof");
  }
  const shared = resolveSharedBaselineUpdate(previous, next, operations, [{ conflictId: compared.conflicts[0]!.conflictId, choice: "shared" }]);
  assert.equal(shared.success, true);
  if (shared.success) assert.equal(readSharedOverridePath(shared.snapshot, "content.sections[id=hero].title"), "Shared changed");
});

test("same array display path has distinct operation identities; ambiguous legacy paths are rejected", () => {
  const next = { content: { sections: [{ id: "proof", title: "Proof" }, { id: "hero", title: "Original", caption: "Keep caption" }] } };
  const operations: SharedOverrideOperation[] = [
    { op: "array-add", path: "content.sections", value: { id: "market", title: "Market" }, afterId: "hero" },
    { op: "array-reorder", path: "content.sections", ids: ["proof", "hero"] },
  ];
  const compared = mergeSharedBaselineUpdate(previous, next, operations);
  assert.equal(compared.conflicts.length, 2);
  assert.notEqual(compared.conflicts[0]?.conflictId, compared.conflicts[1]?.conflictId);
  const legacy = resolveSharedBaselineUpdate(previous, next, operations, [{ path: "content.sections", choice: "shared" }]);
  assert.equal(legacy.success, false);
  if (!legacy.success) assert.match(legacy.error, /ambiguous/);
});

test("deletion and reorder choices never replay an invalid numeric merge", () => {
  const next = { content: { sections: [{ id: "proof", title: "Proof" }] } };
  const operations: SharedOverrideOperation[] = [{ op: "array-remove", path: "content.sections", id: "hero" }];
  const compared = mergeSharedBaselineUpdate(previous, next, operations);
  const conflictId = compared.conflicts[0]!.conflictId;
  assert.equal(resolveSharedBaselineUpdate(previous, next, operations, [{ conflictId, choice: "market" }]).success, false);
  assert.equal(resolveSharedBaselineUpdate(previous, next, operations, [{ conflictId, choice: "shared" }]).success, true);
});