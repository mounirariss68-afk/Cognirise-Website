import assert from "node:assert/strict";
import test from "node:test";
import { mediaMetadataUpdate, shouldUpdateMediaMetadata } from "./media-metadata.js";
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