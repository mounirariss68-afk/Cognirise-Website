import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  deduplicateFixtureMediaReferences,
  cleanupReceiptFromState,
  cleanupSchemaValidationMode,
  isOwnedStorageKey,
  preservationMatches,
  publicStorageReferenceOverlap,
  validateAllFixtureSnapshots,
  validateHarnessState,
  validateCleanupReceipt,
} from "./task-345-harness";

const root = "private/task-345";
function fixtureState() {
  const users = [
    ["author", "editor"],
    ["reviewer", "publisher"],
    ["publisher", "publisher"],
    ["administrator", "administrator"],
  ] as const;
  const ids = users.map(() => randomUUID());
  return {
    version: 1 as const,
    phase: "ready" as const,
    prefix: "fixture-cms-task-345-00000000-0000-4000-8000-000000000000",
    schema: "task345_00000000000000000000",
    createdAt: "2026-01-01T00:00:00.000Z",
    sessionSecret: "x".repeat(48),
    storageRoot: root,
    bucketName: "fixture-bucket",
    capabilities: "unavailable" as const,
    users: users.map(([label, role], index) => ({
      id: ids[index]!, label, role, email: `fixture.${label}@fixture.invalid`,
      password: "not-used-in-this-test", totpSecret: "ABCDEFGHIJKLMNOP",
    })),
    documents: [
      "person", "partner", "platform", "publication", "case-study",
      "industry", "framework", "office", "site-configuration", "landing-page",
    ].map((kind) => ({
      id: randomUUID(), kind, slug: `fixture-cms-task-345-${kind}`,
      uaeRevisionId: randomUUID(), ksaRevisionId: randomUUID(), mediaVersionIds: [],
    })),
    media: Array.from({ length: 10 }, (_, index) => ({
      assetId: randomUUID(), versionId: randomUUID(),
      storageKey: `${root}/cms-media/objects/fixture-cms-task-345-00000000-0000-4000-8000-000000000000/asset-${index}/sha256/digest`,
      checksum: "digest",
    })),
    baseline: {
      version: 1 as const, capturedAt: "before", publishedPointers: [],
      availability: [], mediaPins: [], revisionDigests: [],
    },
  };
}

test("Task 345 media ownership accepts only immutable fixture objects", () => {
  assert.equal(
    isOwnedStorageKey(root, `${root}/cms-media/objects/fixture-cms-task-345-id/asset/sha256/digest`),
    true,
  );
  assert.equal(isOwnedStorageKey(root, `${root}/cms-media/staging/upload`), false);
  assert.equal(
    isOwnedStorageKey(root, `${root}/cms-media/objects/fixture-cms-task-345-id/../other`),
    false,
  );
  assert.equal(isOwnedStorageKey(root, "other/cms-media/objects/fixture/asset/sha256/digest"), false);
});

test("Task 345 preservation comparison ignores capture time but detects snapshots", () => {
  const baseline = {
    version: 1 as const,
    capturedAt: "before",
    publishedPointers: [{ revisionId: "one" }],
    availability: [],
    mediaPins: [{ mediaVersionId: "media-one" }],
    revisionDigests: [{ digest: "digest-one" }],
  };
  assert.equal(preservationMatches(baseline, { ...baseline, capturedAt: "after" }), true);
  assert.equal(
    preservationMatches(baseline, {
      ...baseline,
      publishedPointers: [{ revisionId: "changed" }],
    }),
    false,
  );
});

test("Task 345 state rejects a media namespace escape", () => {
  const state = fixtureState();
  assert.throws(
    () => validateHarnessState({
      ...state,
      media: state.media.map((media, index) =>
        index === 0 ? { ...media, storageKey: `${root}/cms-media/objects/fixture/../escape` } : media),
    }),
    /outside its namespace/,
  );
});

test("Task 345 durable cleanup receipt excludes credentials and pins exact ownership", () => {
  const state = validateHarnessState(fixtureState());
  const receipt = cleanupReceiptFromState(state);
  assert.doesNotThrow(() => validateCleanupReceipt(receipt));
  const serialized = JSON.stringify(receipt);
  assert.equal(serialized.includes(state.sessionSecret), false);
  assert.equal(serialized.includes(state.users[0]!.password), false);
  assert.equal(serialized.includes(state.users[0]!.totpSecret), false);
  assert.throws(
    () => validateCleanupReceipt({
      ...receipt,
      storageKeys: receipt.storageKeys.map((key, index) =>
        index === 0 ? `${root}/cms-media/objects/shared/asset/sha256/digest` : key),
    }),
    /exact fixture namespace/,
  );
});

test("Task 345 restart cleanup detects public and shared object references", () => {
  const owned = `${root}/cms-media/objects/fixture-cms-task-345-id/asset/sha256/digest`;
  const other = `${root}/cms-media/objects/shared/asset/sha256/digest`;
  assert.deepEqual(publicStorageReferenceOverlap([owned], [other]), []);
  assert.deepEqual(publicStorageReferenceOverlap([owned], [other, owned, owned]), [owned]);
});

test("Task 345 restart cleanup accepts partial creating schemas without weakening ready checks", () => {
  assert.equal(cleanupSchemaValidationMode("creating", true), "partial");
  assert.equal(cleanupSchemaValidationMode("ready", true), "ready");
  assert.equal(cleanupSchemaValidationMode("creating", false), "absent");
  assert.equal(cleanupSchemaValidationMode("ready", false), "absent");
});

test("Task 345 all-kind fixture snapshots satisfy publish and draft contracts", () => {
  assert.doesNotThrow(() => validateAllFixtureSnapshots());
});

test("Task 345 media-reference plan deduplicates a pin and rejects conflicting versions", () => {
  const samePin = [
    { mediaId: "asset-1", mediaVersionId: "version-1", fieldPath: "content.hero" },
    { mediaId: "asset-1", mediaVersionId: "version-1", fieldPath: "content.social" },
  ];
  assert.equal(deduplicateFixtureMediaReferences(samePin).length, 1);
  assert.throws(
    () => deduplicateFixtureMediaReferences([
      ...samePin,
      { mediaId: "asset-1", mediaVersionId: "version-2", fieldPath: "content.og" },
    ]),
    /conflicting immutable versions/,
  );
});