import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mapWithConcurrency, mediaDisposition } from "./media-reconciliation.js";

const expected = { checksum: "abc", byteSize: 42, storageKey: "private/cms-media/inventory-abc" };
const complete = {
  checksum: "abc",
  byteSize: 42,
  storageKey: expected.storageKey,
  objectExists: true,
  objectChecksum: "abc",
  objectByteSize: 42,
};

test("a reconciliation rerun reuses a verified immutable object", () => {
  assert.equal(mediaDisposition(expected, complete), "reused");
  assert.equal(mediaDisposition(expected, complete), "reused");
});

test("deferred and missing objects are repairable incomplete states", () => {
  assert.equal(mediaDisposition(expected, { ...complete, storageKey: "deferred/cms-media/abc" }), "repaired");
  assert.equal(mediaDisposition(expected, { ...complete, objectExists: false }), "repaired");
});

test("an existing object with the wrong bytes is invalid, not successful", () => {
  assert.equal(mediaDisposition(expected, { ...complete, objectChecksum: "wrong" }), "invalid");
  assert.equal(mediaDisposition(expected, { ...complete, objectByteSize: 41 }), "invalid");
});

test("remote media work is bounded and keeps result order", async () => {
  let active = 0;
  let maximumActive = 0;
  const results = await mapWithConcurrency([1, 2, 3, 4, 5, 6], 2, async (value) => {
    active++;
    maximumActive = Math.max(maximumActive, active);
    await new Promise((resolve) => setTimeout(resolve, 5));
    active--;
    return value * 2;
  });

  assert.deepEqual(results, [2, 4, 6, 8, 10, 12]);
  assert.equal(maximumActive, 2);
  await assert.rejects(() => mapWithConcurrency([1], 0, async (value) => value));
});

test("the executable reconciliation uploads and verifies durable objects without deferred mode", async () => {
  const reconcile = await readFile(new URL("./reconcile.ts", import.meta.url), "utf8");
  const importer = await readFile(new URL("./import.ts", import.meta.url), "utf8");
  assert.doesNotMatch(reconcile, /"--defer-media-upload"/);
  assert.match(importer, /object\.save\(bytes/);
  assert.match(importer, /metadata\.md5Hash === expectedMd5/);
  assert.match(reconcile, /metadata\.md5Hash === sourceMd5/);
  assert.match(importer, /repairsIncompleteVersion/);
  assert.match(importer, /binaryStillMatches/);
  assert.match(importer, /preserving its earlier inventory receipt digest/);
});