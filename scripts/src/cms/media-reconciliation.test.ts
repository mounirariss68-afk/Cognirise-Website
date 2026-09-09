import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mapWithConcurrency, mediaDisposition } from "./media-reconciliation.js";
import { migrationOperation, resolveMigrationMedia } from "./migration.js";

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
  assert.match(importer, /originalFilename: operation\.filename/);
  assert.match(importer, /preserving its earlier inventory receipt digest/);
});

test("framework reconciliation pins the imported gateway version without changing its rules", () => {
  const record = {
    externalId: "framework:agent-authority-model-v1",
    type: "framework" as const,
    name: "The Agent Authority Model",
    sourceFile: "attached_assets/Cognirise_Agent_Authority_Model_1788905486347.pptx",
    fields: {
      slug: "agent-authority-model",
      summary: "A governed methodology.",
      mediaPaths: ["/images/cognirise/cognirise-pulse-governance.jpg"],
      content: {
        schemaVersion: 1,
        template: "agent-authority",
        teaser: "A governed methodology.",
        handoverExplanation: "Govern each handover, rather than treating an agent as one permanent class.",
        methodology: [{ type: "paragraph", text: "Exposure sets the ceiling." }],
        workedExample: {
          sector: "Travel & hospitality",
          title: "Re-accommodation",
          handover: "action",
          reversibility: "R3",
          reach: "H2",
          exposureBand: "E2",
          oversight: "On the loop, with a stated intervention window",
          detail: "A named duty manager owns it.",
          requestedAuthority: "on-loop",
          interventionWindow: "Before released-seat inventory expires.",
          accountableRole: "Duty Manager, Operations Control Centre",
          promotionEvidence: "An approved body of clean rebookings.",
          automaticDemotion: "Any involuntary downgrade.",
        },
        sectorExamples: [],
        visibility: "public",
        order: 0,
        sources: [{ label: "Approved framework source" }],
        relatedIds: [],
      },
    },
    review: { status: "needs-review" as const, reasons: ["Approve before publication."] },
  };
  const operation = migrationOperation(record);
  const mediaId = "00000000-0000-4000-8000-000000000003";
  const resolved = resolveMigrationMedia(operation, new Map([
    ["/images/cognirise/cognirise-pulse-governance.jpg", mediaId],
  ]));

  assert.deepEqual(resolved.mediaIds, [mediaId]);
  assert.equal((resolved.content as Record<string, unknown>).heroMediaId, mediaId);
  assert.equal((resolved.content as Record<string, unknown>).template, "agent-authority");
  assert.equal(migrationOperation(record).idempotencyKey, operation.idempotencyKey);
});

test("framework reconciliation remains blocked in production", async () => {
  const reconcile = await readFile(new URL("./reconcile.ts", import.meta.url), "utf8");
  assert.match(reconcile, /NODE_ENV === "production"/);
  assert.match(reconcile, /REPLIT_DEPLOYMENT === "1"/);
  assert.match(reconcile, /disabled in production/);
});