import assert from "node:assert/strict";
import test from "node:test";
import {
  isGovernedImmutableTask295ObjectKey,
  resolveTask295Match,
  task295ReceiptKey,
  task295RequestDigest,
  task295ResultDigest,
} from "./task-295-media-import.js";
import { task295MediaManifest } from "./task-295-media-manifest.js";

test("task 295 manifest is exact and has stable unique identities", () => {
  assert.equal(task295MediaManifest.length, 17);
  assert.equal(new Set(task295MediaManifest.map((entry) => entry.sourceFile)).size, 17);
  assert.equal(new Set(task295MediaManifest.map((entry) => entry.checksum)).size, 17);
  for (const entry of task295MediaManifest) {
    assert.match(entry.sourceFile, /_17890402184(?:79|80|81|82)\.(?:jpg|png)$/);
    assert.match(task295ReceiptKey(entry), new RegExp(entry.checksum));
    assert.equal(task295RequestDigest(entry), task295RequestDigest(entry));
  }
});

test("task 295 rerun resolves its receipt to the same exact asset", () => {
  assert.deepEqual(resolveTask295Match({
    receiptSubjectId: "asset-a",
    receiptResultDigest: task295ResultDigest("asset-a", "version-a", "checksum"),
    exactVersions: [{ assetId: "asset-a", versionId: "version-a", checksum: "checksum", collection: "website" }],
    exactAssetIds: ["asset-a"],
    conflictingAssetIdentity: false,
  }), { assetId: "asset-a" });
  assert.throws(() => resolveTask295Match({
    receiptSubjectId: "asset-a",
    receiptResultDigest: task295ResultDigest("asset-a", "version-a", "checksum"),
    exactVersions: [{ assetId: "asset-b", versionId: "version-b", checksum: "checksum", collection: "website" }],
    exactAssetIds: ["asset-b"],
    conflictingAssetIdentity: false,
  }), /Receipt subject/);
});

test("task 295 refuses ambiguous and metadata-only checksum matches", () => {
  assert.throws(() => resolveTask295Match({
    exactVersions: [
      { assetId: "asset-a", versionId: "version-a", checksum: "checksum", collection: "website" },
      { assetId: "asset-b", versionId: "version-b", checksum: "checksum", collection: "website" },
    ],
    exactAssetIds: ["asset-a", "asset-b"],
    conflictingAssetIdentity: false,
  }), /ambiguous/);
  assert.throws(() => resolveTask295Match({
    exactVersions: [],
    exactAssetIds: [],
    conflictingAssetIdentity: true,
  }), /claims this checksum/);
  assert.equal(resolveTask295Match({
    exactVersions: [],
    exactAssetIds: [],
    conflictingAssetIdentity: false,
  }), "create");
});

test("task 295 validates the receipt's exact version digest and website collection", () => {
  assert.throws(() => resolveTask295Match({
    receiptSubjectId: "asset-a",
    receiptResultDigest: task295ResultDigest("asset-a", "different-version", "checksum"),
    exactVersions: [{ assetId: "asset-a", versionId: "version-a", checksum: "checksum", collection: "website" }],
    exactAssetIds: ["asset-a"],
    conflictingAssetIdentity: false,
  }), /result digest/);
  assert.throws(() => resolveTask295Match({
    exactVersions: [{ assetId: "asset-a", versionId: "version-a", checksum: "checksum", collection: "linkedin" }],
    exactAssetIds: ["asset-a"],
    conflictingAssetIdentity: false,
  }), /nonwebsite/);
});

test("task 295 reuses only governed immutable object keys", () => {
  const prefix = "bucket/.private";
  const checksum = "a".repeat(64);
  assert.equal(
    isGovernedImmutableTask295ObjectKey(
      `${prefix}/cms-media/objects/task-295-source/sha256/${checksum}`,
      prefix,
    ),
    true,
  );
  assert.equal(
    isGovernedImmutableTask295ObjectKey(
      `${prefix}/cms-media/staging/task-295-source`,
      prefix,
    ),
    false,
  );
  assert.equal(
    isGovernedImmutableTask295ObjectKey(
      `${prefix}/cms-media/inventory-${checksum}`,
      prefix,
    ),
    false,
  );
  assert.equal(
    isGovernedImmutableTask295ObjectKey(
      `${prefix}/cms-media/objects/task-295-source/sha256/${checksum}/mutable`,
      prefix,
    ),
    false,
  );
});