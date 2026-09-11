import assert from "node:assert/strict";
import test from "node:test";
import { applyLocalSuccessorToEditionMatrix, previewPinForEditionRevision } from "./preview-revision-lifecycle.ts";

test("a confirmed local rollback or restore replaces the iframe pin and exact edition authority", () => {
  const matrix = {
    items: [
      { market: "uae", locale: "en-US", revisionId: "revision-8", revisionNumber: 8 },
      { market: "ksa", locale: "en-US", revisionId: "revision-3", revisionNumber: 3 },
    ],
  };
  for (const successor of [
    { currentRevisionId: "rollback-successor-9", revisionNumber: 9 },
    { currentRevisionId: "restore-successor-10", revisionNumber: 10 },
  ]) {
    assert.equal(
      previewPinForEditionRevision("revision-8", successor.currentRevisionId, true),
      successor.currentRevisionId,
    );
    const updated = applyLocalSuccessorToEditionMatrix(matrix, { market: "uae", locale: "en-US" }, successor);
    assert.deepEqual(updated?.items[0], {
      market: "uae", locale: "en-US", revisionId: successor.currentRevisionId, revisionNumber: successor.revisionNumber,
    });
    assert.deepEqual(updated?.items[1], matrix.items[1], "a local successor cannot rewrite another edition");
  }
});

test("a remote edition update leaves an already-open exact iframe pin stale rather than repinning it", () => {
  assert.equal(
    previewPinForEditionRevision("revision-8", "remote-revision-9", false),
    "revision-8",
  );
  assert.equal(
    previewPinForEditionRevision(undefined, "remote-revision-9", false),
    "remote-revision-9",
    "the initial edition still receives a preview pin",
  );
});