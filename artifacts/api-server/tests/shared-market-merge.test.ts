import assert from "node:assert/strict";
import test from "node:test";
import {
  applySharedOverrideOperations,
  mergeSharedBaselineUpdate,
  resetSharedOverridePath,
  sparseOverridesForResolvedSnapshot,
} from "@workspace/api-zod";

const baseline = {
  title: "Shared title",
  content: {
    sections: [
      { id: "intro", heading: "Introduction", image: { mediaId: "shared-image", mediaVersionId: "v1" } },
      { id: "proof", heading: "Proof" },
    ],
  },
};

test("shared text preserves a Saudi image override through a baseline update", () => {
  const operations = [{
    op: "set" as const,
    path: "content.sections[id=intro].image",
    value: { mediaId: "ksa-image", mediaVersionId: "ksa-v7" },
  }];
  const updated = {
    ...baseline,
    title: "Shared title revised",
    content: {
      ...baseline.content,
      sections: [
        { ...baseline.content.sections[0], heading: "Introduction revised" },
        baseline.content.sections[1],
      ],
    },
  };
  const merged = mergeSharedBaselineUpdate(baseline, updated, operations);
  assert.deepEqual(merged.conflicts, []);
  assert.equal(merged.snapshot.title, "Shared title revised");
  assert.deepEqual(
    (merged.snapshot.content as { sections: Array<{ image: unknown }> }).sections[0]?.image,
    { mediaId: "ksa-image", mediaVersionId: "ksa-v7" },
  );
});

test("baseline changes to locally overridden fields require an explicit decision", () => {
  const result = mergeSharedBaselineUpdate(
    baseline,
    { ...baseline, title: "Global replacement" },
    [{ op: "set", path: "title", value: "Saudi title" }],
  );
  assert.equal(result.conflicts[0]?.kind, "concurrent-value-change");
});

test("stable array operations reject positional and concurrent reorder ambiguity", () => {
  assert.throws(
    () => applySharedOverrideOperations(baseline, [{
      op: "set",
      path: "content.sections[0].heading",
      value: "No positional paths",
    }]),
    /stable array selectors/i,
  );
  const result = mergeSharedBaselineUpdate(
    baseline,
    {
      ...baseline,
      content: { sections: [baseline.content.sections[1], baseline.content.sections[0]] },
    },
    [{ op: "array-reorder", path: "content.sections", ids: ["proof", "intro"] }],
  );
  assert.equal(result.conflicts[0]?.kind, "array-reorder-conflict");
});

test("resetting one scalar rederives sparse operations without dropping unrelated overrides", () => {
  const operations = [
    { op: "set" as const, path: "title", value: "Saudi title" },
    { op: "set" as const, path: "content.sections[id=proof].heading", value: "Saudi proof" },
  ];
  const reset = resetSharedOverridePath(baseline, operations, "title");
  assert.deepEqual(applySharedOverrideOperations(baseline, reset), {
    ...baseline,
    content: {
      sections: [
        baseline.content.sections[0],
        { ...baseline.content.sections[1], heading: "Saudi proof" },
      ],
    },
  });
  assert.deepEqual(reset.map((operation) => operation.path), ["content.sections[id=proof].heading"]);
});

test("nested reset splits a parent set and preserves local siblings", () => {
  const adopted = {
    content: {
      social: {
        title: "Shared social title",
        imageMedia: { mediaId: "shared-image", mediaVersionId: "v1" },
      },
    },
  };
  const reset = resetSharedOverridePath(adopted, [{
    op: "set",
    path: "content.social",
    value: {
      title: "Saudi social title",
      imageMedia: { mediaId: "ksa-image", mediaVersionId: "v2" },
    },
  }], "content.social.imageMedia");
  assert.deepEqual(applySharedOverrideOperations(adopted, reset), {
    content: {
      social: {
        title: "Saudi social title",
        imageMedia: { mediaId: "shared-image", mediaVersionId: "v1" },
      },
    },
  });
  assert.deepEqual(reset, [{
    op: "set",
    path: "content.social.title",
    value: "Saudi social title",
  }]);
});

test("stable-ID resets remove local additions, reset items and retain unrelated operations", () => {
  const operations = [
    { op: "set" as const, path: "content.sections[id=intro].heading", value: "Saudi intro" },
    {
      op: "array-add" as const,
      path: "content.sections",
      value: { id: "local", heading: "Saudi local section" },
      afterId: "proof",
    },
  ];
  const itemReset = resetSharedOverridePath(baseline, operations, "content.sections[id=intro].heading");
  assert.ok(
    itemReset.every((operation) => operation.path !== "content.sections[id=intro].heading"),
    "resetting one stable item must not retain its local leaf override",
  );
  assert.deepEqual(
    applySharedOverrideOperations(baseline, itemReset).content,
    {
      sections: [
        baseline.content.sections[0],
        baseline.content.sections[1],
        { id: "local", heading: "Saudi local section" },
      ],
    },
  );
  const additionReset = resetSharedOverridePath(baseline, operations, "content.sections[id=local]");
  assert.deepEqual(additionReset, [{
    op: "set",
    path: "content.sections[id=intro].heading",
    value: "Saudi intro",
  }]);
  const orderReset = resetSharedOverridePath(
    baseline,
    [{ op: "array-reorder", path: "content.sections", ids: ["proof", "intro"] }],
    "content.sections",
  );
  assert.deepEqual(orderReset, []);
});

test("nested reset fails rather than guessing through a locally removed parent", () => {
  assert.throws(
    () => resetSharedOverridePath(
      { content: { social: { imageMedia: { mediaId: "shared", mediaVersionId: "v1" } } } },
      [{ op: "remove", path: "content.social" }],
      "content.social.imageMedia",
    ),
    /unrepresentable/i,
  );
});

test("typed-media reset synchronizes root media IDs without dropping legacy attachments", () => {
  const adopted = {
    content: {
      heroMedia: { mediaId: "shared-asset", mediaVersionId: "shared-v1", role: "hero" },
    },
    mediaIds: ["shared-asset", "legacy-attachment"],
  };
  const operations = [
    {
      op: "set" as const,
      path: "content.heroMedia",
      value: { mediaId: "local-asset", mediaVersionId: "local-v2", role: "hero" },
    },
    { op: "set" as const, path: "mediaIds", value: ["local-asset", "legacy-attachment"] },
  ];
  const reset = resetSharedOverridePath(adopted, operations, "content.heroMedia", "publication");
  assert.deepEqual(applySharedOverrideOperations(adopted, reset), {
    content: {
      heroMedia: { mediaId: "shared-asset", mediaVersionId: "shared-v1", role: "hero" },
    },
    mediaIds: ["legacy-attachment", "shared-asset"],
  });
});