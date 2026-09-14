import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLocalSuccessorToEditionMatrix,
  previewPinForEditionRevision,
  previewResponseMatchesTarget,
} from "./preview-revision-lifecycle.ts";

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

test("initial preview follows the loaded latest revision even when an edition matrix pointer is stale", () => {
  assert.equal(
    previewPinForEditionRevision(undefined, "revision-2", false, "revision-3"),
    "revision-3",
  );
  assert.equal(
    previewPinForEditionRevision("revision-2", "revision-2", false, "revision-3"),
    "revision-2",
    "an already-open intentional history pin remains exact",
  );
});

test("preview issuance must identify the exact saved market, locale, and revision", () => {
  const target = { market: "uae", locale: "en-US", revisionId: "revision-3" };
  const response = {
    requestedMarket: "uae",
    requestedLocale: "en-US",
    market: "uae",
    locale: "en-US",
    revisionId: "revision-3",
  };
  assert.equal(previewResponseMatchesTarget(response, target), true);
  assert.equal(
    previewResponseMatchesTarget({ ...response, revisionId: "revision-2" }, target),
    false,
    "a stale capability must never open for a newly saved revision",
  );
  assert.equal(
    previewResponseMatchesTarget({ ...response, requestedMarket: "ksa" }, target),
    false,
    "a capability requested for a different market is not interchangeable",
  );
  assert.equal(
    previewResponseMatchesTarget({ ...response, locale: "ar" }, target),
    false,
    "a resolved locale mismatch is treated as a failed issuance",
  );
  assert.equal(previewResponseMatchesTarget(undefined, target), false);
});