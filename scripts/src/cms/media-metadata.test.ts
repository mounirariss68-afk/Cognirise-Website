import assert from "node:assert/strict";
import test from "node:test";
import {
  mediaMetadataUpdate,
  mediaReviewStatusUpdate,
  mediaVersionIsExactCurrent,
  shouldUpdateMediaMetadata,
} from "./media-metadata.js";
import { caseRefreshAssetBinaryUpdate } from "./case-visual-refresh.js";

test("a replay with a valid immutable version does not replace editor-owned metadata", () => {
  const editorMetadata = {
    altText: "Editor-approved description",
    credit: "Editorial desk",
    collection: "approved-library",
    linkedinAssetKind: "header",
    campaignMetadata: { campaign: "launch", audience: "buyers" },
  };
  const inventoryMetadata = {
    altText: "Inventory description",
    credit: "Inventory source",
    collection: "website",
    linkedinAssetKind: "header",
    campaignMetadata: { campaign: "import" },
  } as const;

  assert.equal(shouldUpdateMediaMetadata({
    assetExists: true,
    immutableVersionIsCurrent: true,
  }), false);
  const replayed = shouldUpdateMediaMetadata({
    assetExists: true,
    immutableVersionIsCurrent: true,
  }) ? mediaMetadataUpdate(inventoryMetadata) : editorMetadata;
  assert.deepEqual(replayed, editorMetadata);
});

test("editor metadata is not part of a governed binary refresh update", () => {
  const editorMetadata = {
    altText: "Editor-approved description",
    credit: "Editorial desk",
    collection: "website",
    linkedinAssetKind: null,
    campaignMetadata: { owner: "editor" },
  };
  const binaryUpdate = caseRefreshAssetBinaryUpdate({
    storageKey: "cms-media/new-checksum",
    mediaType: "image/png",
    byteSize: 42,
    checksum: "new-checksum",
  });
  assert.deepEqual({ ...editorMetadata, ...binaryUpdate }, {
    ...editorMetadata,
    ...binaryUpdate,
  });
  assert.equal("altText" in binaryUpdate, false);
  assert.equal("credit" in binaryUpdate, false);
  assert.equal("campaignMetadata" in binaryUpdate, false);
});

test("an approved active v2 keeps its clearance when the imported binary is exact", () => {
  const current = {
    checksum: "same-checksum",
    byteSize: 42,
    mediaType: "image/png",
  };
  assert.equal(mediaVersionIsExactCurrent({
    asset: current,
    version: { ...current, storageKey: "private/cms-media/same-checksum" },
    expected: current,
  }), true);
  assert.deepEqual(mediaReviewStatusUpdate({
    exactCurrentVersion: true,
    explicitlyApproved: false,
  }), {});
  assert.deepEqual(mediaReviewStatusUpdate({
    exactCurrentVersion: true,
    explicitlyApproved: true,
  }), {});
});

test("a changed or deferred binary cannot inherit reviewer clearance", () => {
  const current = {
    checksum: "old-checksum",
    byteSize: 42,
    mediaType: "image/png",
  };
  const expected = {
    checksum: "new-checksum",
    byteSize: 43,
    mediaType: "image/png",
  };
  assert.equal(mediaVersionIsExactCurrent({
    asset: current,
    version: { checksum: "new-checksum", byteSize: 43, storageKey: "private/cms-media/new-checksum" },
    expected,
  }), false);
  assert.equal(mediaVersionIsExactCurrent({
    asset: expected,
    version: { ...expected, storageKey: "deferred/new-checksum" },
    expected,
  }), false);
  assert.deepEqual(mediaReviewStatusUpdate({
    exactCurrentVersion: false,
    explicitlyApproved: false,
  }), { status: "pending-review" });
  assert.deepEqual(mediaReviewStatusUpdate({
    exactCurrentVersion: false,
    explicitlyApproved: true,
  }), { status: "active" });
});