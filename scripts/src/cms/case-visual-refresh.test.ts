import assert from "node:assert/strict";
import test from "node:test";
import {
  assessCaseMediaPin,
  copyPublishedCasePayload,
  hasExactCasePublicationPin,
  hasExpectedCaseVisual,
  mergePublishedCaseVisualPayload,
  historicalCasePinReceiptIsValid,
  planCasePublicationRefreshEntry,
  planPublishedPinRepair,
  planCaseVisualRefresh,
} from "./case-visual-refresh.js";

const valid = {
  receiptExists: false,
  currentVersionNumber: 3,
  currentChecksum: "old",
  expectedChecksum: "new",
  currentImmutableVersionValid: true,
  sourceReviewApproved: true,
  rightsApproved: true,
  accessibilityApproved: true,
  publicationValid: true,
  evidenceApproved: true,
};

test("a changed governed binary appends a new immutable version", () => {
  assert.deepEqual(planCaseVisualRefresh(valid), {
    action: "append",
    nextVersionNumber: 4,
  });
});

test("a receipted refresh replay does nothing", () => {
  assert.deepEqual(planCaseVisualRefresh({ ...valid, receiptExists: true }), {
    action: "replay",
  });
});

test("a valid historical publication pin survives an approved binary upgrade", () => {
  assert.deepEqual(planPublishedPinRepair({
    mediaId: "asset-1",
    references: [{ assetId: "asset-1", mediaVersionId: "version-1" }],
    pinnedVersionExists: true,
  }), { action: "preserve" });
  assert.deepEqual(planCaseVisualRefresh({
    ...valid,
    currentVersionNumber: 1,
    currentChecksum: "version-1-checksum",
    expectedChecksum: "version-2-checksum",
  }), { action: "append", nextVersionNumber: 2 });
  assert.deepEqual(planCaseVisualRefresh({
    ...valid,
    receiptExists: true,
    currentVersionNumber: 2,
    currentChecksum: "version-2-checksum",
    expectedChecksum: "version-2-checksum",
  }), { action: "replay" });
});

test("pin repair only targets a genuinely missing reference", () => {
  assert.deepEqual(planPublishedPinRepair({
    mediaId: "asset-1",
    references: [],
    pinnedVersionExists: false,
  }), { action: "repair" });
  assert.equal(planPublishedPinRepair({
    mediaId: "asset-1",
    references: [{ assetId: "asset-2", mediaVersionId: "version-1" }],
    pinnedVersionExists: true,
  }).action, "fail");
  assert.equal(planPublishedPinRepair({
    mediaId: "asset-1",
    references: [{ assetId: "asset-1", mediaVersionId: "missing-version" }],
    pinnedVersionExists: false,
  }).action, "fail");
});

test("a refresh copies the published payload rather than mutating it", () => {
  const published = {
    content: { title: "Editor's title", evidence: [{ approved: true }] },
    mediaIds: ["asset-1"],
  };
  const copied = copyPublishedCasePayload(published);
  assert.deepEqual(copied, published);
  assert.notEqual(copied, published);
  assert.notEqual(copied.content, published.content);
  copied.content.title = "Changed copy";
  assert.equal(published.content.title, "Editor's title");
});

test("a refresh preserves newer editorial fields while replacing only visual governance", () => {
  const published = {
    summary: "Editor-approved newer summary",
    content: {
      mandate: "Editor-approved mandate",
      outcomes: ["Editor-approved outcome"],
      visual: { caption: "Prior artwork", altText: "Prior visual" },
    },
    mediaIds: ["old-asset"],
  };
  const replacement = {
    summary: "Baseline summary that must not overwrite edits",
    content: {
      mandate: "Baseline mandate that must not overwrite edits",
      visual: { caption: "New artwork", altText: "New visual" },
    },
    mediaIds: ["new-asset"],
  };
  const merged = mergePublishedCaseVisualPayload(published, replacement, "new-asset");

  assert.equal(merged.summary, "Editor-approved newer summary");
  assert.equal((merged.content as any).mandate, "Editor-approved mandate");
  assert.deepEqual((merged.content as any).outcomes, ["Editor-approved outcome"]);
  assert.deepEqual((merged.content as any).visual, replacement.content.visual);
  assert.deepEqual(merged.mediaIds, ["new-asset"]);
  assert.deepEqual(published.mediaIds, ["old-asset"]);
  assert.deepEqual(published.content.visual, { caption: "Prior artwork", altText: "Prior visual" });
});

test("receipted and unchanged-binary fresh-install replays require the exact approved visual and media pin", () => {
  const replacement = {
    content: { visual: { caption: "Approved cinematic scene", altText: "Approved visual" } },
    mediaIds: ["new-asset"],
  };
  const editedPublished = {
    content: {
      title: "Editor-updated title",
      visual: { caption: "Approved cinematic scene", altText: "Approved visual" },
    },
    mediaIds: ["new-asset"],
  };
  assert.equal(hasExpectedCaseVisual(editedPublished, replacement), true);
  assert.equal(hasExpectedCaseVisual({
    ...editedPublished,
    content: { ...editedPublished.content, visual: { caption: "Unapproved swap" } },
  }, replacement), false);

  const exact = {
    expectedAssetId: "new-asset",
    expectedMediaVersionId: "new-version",
    expectedChecksum: "new-checksum",
    mediaIds: ["new-asset"],
    references: [{ assetId: "new-asset", mediaVersionId: "new-version" }],
    pinnedVersion: {
      id: "new-version",
      assetId: "new-asset",
      checksum: "new-checksum",
      storageKey: "cms-media/inventory-new-checksum",
    },
  };
  assert.equal(hasExactCasePublicationPin(exact), true);
  assert.equal(hasExactCasePublicationPin({
    ...exact,
    references: [{ assetId: "new-asset", mediaVersionId: "other-version" }],
  }), false);
  assert.equal(hasExactCasePublicationPin({
    ...exact,
    pinnedVersion: { ...exact.pinnedVersion, checksum: "other-checksum" },
  }), false);
});

test("failed publication, evidence, or media gates never append", () => {
  for (const failed of [
    { publicationValid: false },
    { evidenceApproved: false },
    { currentImmutableVersionValid: false },
    { sourceReviewApproved: false },
    { rightsApproved: false },
    { accessibilityApproved: false },
  ]) {
    assert.equal(planCaseVisualRefresh({ ...valid, ...failed }).action, "fail");
  }
});

test("a base-version published installation upgrades once and then replays", () => {
  const expectedRefreshDigest = "governed-refresh";
  const initialEntry = planCasePublicationRefreshEntry({
    refreshReceiptDigest: null,
    expectedRefreshDigest,
    documentKind: "case-study",
  });
  assert.deepEqual(initialEntry, { action: "inspect-published" });

  const upgrade = planCaseVisualRefresh(valid);
  assert.deepEqual(upgrade, { action: "append", nextVersionNumber: 4 });

  const replay = planCasePublicationRefreshEntry({
    refreshReceiptDigest: expectedRefreshDigest,
    expectedRefreshDigest,
    documentKind: "case-study",
  });
  assert.deepEqual(replay, { action: "replay" });
});

test("a fresh installation waits for document creation and receipt conflicts fail", () => {
  assert.deepEqual(planCasePublicationRefreshEntry({
    refreshReceiptDigest: null,
    expectedRefreshDigest: "governed-refresh",
    documentKind: null,
  }), { action: "fresh-install" });
  assert.deepEqual(planCasePublicationRefreshEntry({
    refreshReceiptDigest: "unexpected",
    expectedRefreshDigest: "governed-refresh",
    documentKind: "case-study",
  }), { action: "fail", reason: "publication refresh receipt conflicts" });
});

test("metadata-only versions do not invalidate the immutable version pinned by publication", () => {
  assert.equal(assessCaseMediaPin({
    expectedAssetId: "asset-1",
    expectedChecksum: "same-binary",
    references: [{ assetId: "asset-1", mediaVersionId: "version-1" }],
    pinnedVersion: {
      id: "version-1",
      assetId: "asset-1",
      checksum: "same-binary",
      storageKey: "cms-media/inventory-same-binary",
    },
  }), "valid");
  assert.equal(assessCaseMediaPin({
    expectedAssetId: "asset-1",
    expectedChecksum: "same-binary",
    references: [],
    pinnedVersion: null,
  }), "missing");
});

test("a prior immutable visual pin is accepted only with its exact refresh receipt", () => {
  assert.equal(assessCaseMediaPin({
    expectedAssetId: "asset-1",
    expectedChecksum: "new-binary",
    references: [{ assetId: "asset-1", mediaVersionId: "version-1" }],
    pinnedVersion: {
      id: "version-1",
      assetId: "asset-1",
      checksum: "prior-binary",
      storageKey: "cms-media/inventory-prior-binary",
    },
  }), "historical");
  assert.equal(historicalCasePinReceiptIsValid({
    receiptRequestDigest: "known-prior-refresh",
    expectedRequestDigest: "known-prior-refresh",
    receiptSubjectId: "published-revision-1",
    publishedRevisionId: "published-revision-1",
  }), true);
  assert.equal(historicalCasePinReceiptIsValid({
    receiptRequestDigest: "unknown-refresh",
    expectedRequestDigest: "known-prior-refresh",
    receiptSubjectId: "published-revision-1",
    publishedRevisionId: "published-revision-1",
  }), false);
});
