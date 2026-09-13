import assert from "node:assert/strict";
import test from "node:test";
import { applySharedOverrideOperations, mergeSharedBaselineUpdate } from "@workspace/api-zod";
import { managedMarketPublicDeliveryClause } from "../src/lib/availability";
import {
  assertManagedMarketPublication,
  sparseOverridesForResolvedSnapshot,
} from "../src/lib/managed-market-lifecycle";

test("ordinary managed saves retain a sparse adopted-baseline projection", () => {
  const adopted = {
    title: "Neutral title",
    content: { body: "Neutral copy", sections: [{ id: "hero", title: "Neutral hero" }] },
    mediaIds: ["asset-a"],
  };
  const saved = {
    title: "KSA title",
    content: { body: "KSA copy", sections: [{ id: "hero", title: "KSA hero" }] },
    mediaIds: ["asset-a"],
  };
  const operations = sparseOverridesForResolvedSnapshot(adopted, saved);
  assert.deepEqual(applySharedOverrideOperations(adopted, operations as any), saved);
  assert.deepEqual(operations.map((operation) => operation.path), ["content.body", "content.sections[id=hero].title", "title"]);
});

test("ordinary image-only editing leaves nested shared text inheritable", () => {
  const old = { content: { sections: [{ id: "hero", title: "Shared", image: { mediaId: "a", mediaVersionId: "1" } }] } };
  const local = { content: { sections: [{ id: "hero", title: "Shared", image: { mediaId: "b", mediaVersionId: "2" } }] } };
  const operations = sparseOverridesForResolvedSnapshot(old, local);
  assert.deepEqual(operations.map((item) => item.path), [
    "content.sections[id=hero].image.mediaId", "content.sections[id=hero].image.mediaVersionId",
  ]);
  const update = { content: { sections: [{ ...old.content.sections[0], title: "Shared revised" }] } };
  const merged = mergeSharedBaselineUpdate(old, update, operations);
  assert.deepEqual(merged.conflicts, []);
  assert.deepEqual(merged.snapshot, { content: { sections: [{ ...local.content.sections[0], title: "Shared revised" }] } });
});

test("stable section adds, removals, reorders and edits reproduce the saved snapshot", () => {
  const before = { content: { sections: [{ id: "a", title: "A" }, { id: "b", title: "B" }, { id: "c", title: "C" }] } };
  const after = { content: { sections: [{ id: "c", title: "C edited" }, { id: "d", title: "D" }, { id: "b", title: "B" }] } };
  const operations = sparseOverridesForResolvedSnapshot(before, after);
  assert.ok(operations.every((item) => !/\[\d+\]/.test(item.path)));
  assert.deepEqual(applySharedOverrideOperations(before, operations), after);
});

test("public managed authority activates from durable publication evidence, not draft pointers", () => {
  const clause = managedMarketPublicDeliveryClause("d.id", "e", "$3", "$4");
  assert.match(clause, /cms_audit_events publication/);
  assert.match(clause, /managedBindingId/);
  assert.match(clause, /cms_resolved_market_revisions resolved/);
  assert.doesNotMatch(clause, /materialized_revision_id/);
});

test("managed publication rejects a manifest whose immutable pins differ from the revision", async () => {
  const snapshot = {
    content: {
      heroMedia: {
        mediaId: "asset-a",
        mediaVersionId: "version-a",
        role: "hero",
      },
    },
    mediaIds: [],
  };
  const client = {
    async query(sql: string) {
      if (sql.includes("FROM cms_market_edition_bindings binding")) {
        return {
          rowCount: 1,
          rows: [{
            id: "binding-a",
            mode: "independent",
            baseline_id: null,
            based_on_baseline_revision_id: null,
            materialized_revision_id: "revision-a",
            override_operations: [],
          }],
        };
      }
      if (sql.includes("FROM cms_resolved_market_revisions resolved")) {
        return {
          rowCount: 1,
          rows: [{
            snapshot_matches: true,
            payload: snapshot,
            kind: "platform",
            media_references: [{ assetId: "asset-a", mediaVersionId: "version-b" }],
          }],
        };
      }
      if (sql.includes("FROM cms_media_references")) {
        return {
          rowCount: 1,
          rows: [{ assetId: "asset-a", mediaVersionId: "version-a" }],
        };
      }
      throw new Error(`Unexpected managed-publication query: ${sql}`);
    },
  };
  await assert.rejects(
    assertManagedMarketPublication(client, {
      documentId: "document-a",
      market: "ksa",
      locale: "en",
      revisionId: "revision-a",
    }),
    /manifest does not match/,
  );
});

test("managed publication rejects one asset with conflicting snapshot pins", async () => {
  const client = {
    async query(sql: string) {
      if (sql.includes("FROM cms_market_edition_bindings binding")) {
        return {
          rowCount: 1,
          rows: [{
            id: "binding-a",
            mode: "independent",
            baseline_id: null,
            based_on_baseline_revision_id: null,
            materialized_revision_id: "revision-a",
            override_operations: [],
          }],
        };
      }
      if (sql.includes("FROM cms_resolved_market_revisions resolved")) {
        return {
          rowCount: 1,
          rows: [{
            snapshot_matches: true,
            payload: {
              content: {
                heroMedia: { mediaId: "asset-a", mediaVersionId: "version-a", role: "hero" },
                social: {
                  imageMedia: { mediaId: "asset-a", mediaVersionId: "version-b", role: "og-image" },
                },
              },
              mediaIds: [],
            },
            kind: "platform",
            media_references: [],
          }],
        };
      }
      throw new Error(`Media rows must not be queried after a conflicting snapshot: ${sql}`);
    },
  };
  await assert.rejects(
    assertManagedMarketPublication(client, {
      documentId: "document-a",
      market: "ksa",
      locale: "en",
      revisionId: "revision-a",
    }),
    /conflicting immutable media pins/,
  );
});