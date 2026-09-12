import assert from "node:assert/strict";
import test from "node:test";
import {
  createDraftOperationGuard,
  createDraftRecoveryExport,
  downloadDraftRecovery,
} from "./draft-operation-safety";

test("draft operation guard rejects overlapping work and ignores a late key", () => {
  const guard = createDraftOperationGuard<{ title: string }>();
  const first = guard.start("document:uae:en", { title: "first" });
  assert.equal(first.accepted, true);
  if (!first.accepted) return;

  const overlapping = guard.start("document:uae:en", { title: "second" });
  assert.equal(overlapping.accepted, false);
  assert.equal(guard.isCurrent(first.token, "document:uae:en"), true);
  assert.equal(guard.isCurrent(first.token, "document:ksa:en"), false);
  assert.equal(guard.finish({ ...first.token, key: "document:ksa:en" }), false);
  assert.equal(guard.pending?.snapshot.title, "first");
  assert.equal(guard.finish(first.token), true);

  const second = guard.start("document:ksa:en", { title: "second" });
  assert.equal(second.accepted, true);
});

test("draft recovery export is explicit, stable JSON and contains no credentials", () => {
  const recovery = createDraftRecoveryExport(
    { title: "Local title", content: { schemaVersion: 1 }, seo: {} },
    {
      editorKey: "document/document-1/uae/en-US",
      kind: "industry",
      market: "uae",
      locale: "en-US",
      revisionId: "revision-4",
      capturedAt: "2026-09-12T12:00:00.000Z",
    },
  );
  assert.equal(recovery.filename, "document-document-1-uae-en-US-local-draft.json");
  const parsed = JSON.parse(recovery.body);
  assert.equal(parsed.recoveryVersion, 1);
  assert.equal(parsed.revisionId, "revision-4");
  assert.equal(parsed.draft.title, "Local title");
  assert.equal("token" in parsed, false);
  assert.equal("password" in parsed, false);
  assert.equal(downloadDraftRecovery(recovery, {}), false);
});