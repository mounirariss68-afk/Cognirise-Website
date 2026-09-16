import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import {
  deduplicateFixtureMediaReferences,
  isOwnedStorageKey,
  preservationMatches,
  validateAllFixtureSnapshots,
  validateHarnessState,
} from "./task-345-harness";

const root = "private/task-345";

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
  const users = [
    ["author", "editor"],
    ["reviewer", "publisher"],
    ["publisher", "publisher"],
    ["administrator", "administrator"],
  ] as const;
  const ids = users.map(() => randomUUID());
  const state = {
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
      id: ids[index]!,
      label,
      role,
      email: `fixture.${label}@fixture.invalid`,
      password: "not-used-in-this-test",
      totpSecret: "ABCDEFGHIJKLMNOP",
    })),
    documents: [
      "person", "partner", "platform", "publication", "case-study",
      "industry", "framework", "office", "site-configuration", "landing-page",
    ].map((kind) => ({
      id: randomUUID(),
      kind,
      slug: `fixture-cms-task-345-${kind}`,
      uaeRevisionId: randomUUID(),
      ksaRevisionId: randomUUID(),
      mediaVersionIds: [],
    })),
    media: Array.from({ length: 10 }, (_, index) => ({
      assetId: randomUUID(),
      versionId: randomUUID(),
      storageKey: `${root}/cms-media/objects/fixture-cms-task-345-00000000-0000-4000-8000-000000000000/asset-${index}/sha256/digest`,
      checksum: "digest",
    })),
    baseline: {
      version: 1,
      capturedAt: "before",
      publishedPointers: [],
      availability: [],
      mediaPins: [],
      revisionDigests: [],
    },
  };
  assert.throws(
    () => validateHarnessState({
      ...state,
      media: state.media.map((media, index) =>
        index === 0 ? { ...media, storageKey: `${root}/cms-media/objects/fixture/../escape` } : media),
    }),
    /outside its namespace/,
  );
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