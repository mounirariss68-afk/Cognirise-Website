import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { cmsPublicRoute, validateCmsSnapshot } from "@workspace/api-zod";
import {
  canonicalResultDigest,
  industryBaselineAction,
  matchesGovernedCutoverSource,
  mediaMigrationOperations,
  migrationOperations,
  resolveMigrationMedia,
} from "../../../scripts/src/cms/migration";
import type { InventoryRecord } from "../../../scripts/src/cms/common";
import { pulseIndustryMedia } from "../../../scripts/src/cms/industry-media";

type Inventory = {
  expectedCounts: Record<string, number>;
  records: InventoryRecord[];
};

test("the versioned industry baseline never replaces later editorial revisions", () => {
  assert.equal(
    canonicalResultDigest({ content: { image: "legacy.jpg", name: "Finance" }, mediaIds: [] }),
    canonicalResultDigest({ mediaIds: [], content: { name: "Finance", image: "legacy.jpg" } }),
    "JSONB key ordering must not look like stored payload drift",
  );
  assert.equal(matchesGovernedCutoverSource("r1", undefined), true);
  assert.equal(matchesGovernedCutoverSource("r1", "r1"), true);
  assert.equal(matchesGovernedCutoverSource("r1", "editorial-revision"), false);
  const inventoryReason = "Inventory migration; pending editorial review.";
  const cutoverReason = "Approved Cognirise Pulse industry-image cutover; previous revisions and media preserved.";
  const governedChain = [
    { id: "r3", revisionNumber: 3, reason: cutoverReason, workflowState: "approved", hasOpportunity: false, provenanceValid: true, payloadFamilyDigest: "legacy", matchesContractPayload: false, hasValidMediaPin: true, hasKnownV3UnpinnedRef: false, priorHasValidMediaPin: false },
    { id: "r2", revisionNumber: 2, reason: cutoverReason, workflowState: "approved", hasOpportunity: false, provenanceValid: true, payloadFamilyDigest: "legacy", matchesContractPayload: false, hasValidMediaPin: false, hasKnownV3UnpinnedRef: false, priorHasValidMediaPin: false },
    { id: "r1", revisionNumber: 1, reason: inventoryReason, workflowState: "draft", hasOpportunity: false, provenanceValid: true, payloadFamilyDigest: "legacy", matchesContractPayload: false, hasValidMediaPin: false, hasKnownV3UnpinnedRef: false, priorHasValidMediaPin: false },
  ];
  const untouched = structuredClone(governedChain);
  assert.equal(industryBaselineAction(governedChain, "r3", "published"), "append-and-publish");
  assert.deepEqual(governedChain, untouched, "classification must not mutate immutable revision history");
  assert.equal(industryBaselineAction(
    governedChain.map((revision) => revision.id === "r2" ? { ...revision, payloadFamilyDigest: "changed" } : revision),
    "r3",
    "published",
  ), "preserve-editorial");
  assert.equal(industryBaselineAction(
    governedChain.map((revision) => revision.id === "r2" ? { ...revision, provenanceValid: false } : revision),
    "r3",
    "published",
  ), "preserve-editorial");
  assert.equal(industryBaselineAction(
    governedChain.map((revision) => revision.id === "r3" ? { ...revision, hasValidMediaPin: false } : revision),
    "r3",
    "published",
  ), "preserve-editorial");
  assert.equal(industryBaselineAction(governedChain, "r2", "published"), "preserve-editorial");
  assert.equal(industryBaselineAction(governedChain, "r3", "draft"), "preserve-editorial");
  const v3 = {
    id: "r4",
    revisionNumber: 4,
    reason: "Approved broadened industry content contract baseline v3; prior revisions preserved.",
    workflowState: "approved",
    hasOpportunity: true,
    provenanceValid: true,
    payloadFamilyDigest: "current-contract-image",
    matchesContractPayload: true,
    hasValidMediaPin: true,
    hasKnownV3UnpinnedRef: false,
    priorHasValidMediaPin: true,
  };
  assert.equal(industryBaselineAction([v3, ...governedChain.map((revision) => ({
    ...revision,
    hasValidMediaPin: false,
  }))], "r4", "published"), "reuse-complete");
  assert.equal(industryBaselineAction([{
    ...v3,
    hasValidMediaPin: false,
    hasKnownV3UnpinnedRef: true,
  }, ...governedChain.map((revision) => ({
    ...revision,
    hasValidMediaPin: false,
  }))], "r4", "published"), "repair-v3-media",
  "a provenance-backed legacy image family may differ from the current contract image");
  assert.equal(industryBaselineAction([{
    ...v3,
    matchesContractPayload: false,
    hasValidMediaPin: false,
    hasKnownV3UnpinnedRef: true,
  }, ...governedChain.map((revision) => ({
    ...revision,
    hasValidMediaPin: false,
  }))], "r4", "published"), "append-and-publish");
  assert.equal(industryBaselineAction([{
    ...v3,
    hasValidMediaPin: false,
    hasKnownV3UnpinnedRef: true,
    priorHasValidMediaPin: false,
  }, ...governedChain.map((revision) => ({
    ...revision,
    hasValidMediaPin: false,
  }))], "r4", "published"), "preserve-editorial");
  assert.equal(industryBaselineAction([], null, "published"), "preserve-editorial");
});

function loadInventory(): Inventory {
  return JSON.parse(readFileSync(
    path.resolve(process.cwd(), "../../scripts/cms/output/inventory.json"),
    "utf8",
  )) as Inventory;
}

test("the governed inventory produces six publishable industry cutover records idempotently", () => {
  const inventory = loadInventory();
  assert.equal(inventory.expectedCounts.industries, 6);

  const firstPass = migrationOperations(inventory.records);
  const secondPass = migrationOperations(inventory.records);
  assert.deepEqual(secondPass, firstPass, "reconciliation inputs must be stable across replays");

  const industries = firstPass.filter((operation) => operation.kind === "industry");
  assert.equal(industries.length, 6);
  assert.equal(new Set(industries.map((operation) => operation.slug)).size, 6);
  assert.equal(new Set(industries.map((operation) => operation.idempotencyKey)).size, 6);
  assert.ok(industries.every((operation) =>
    operation.idempotencyKey.startsWith("cms-industry-contract-v8:")
  ));

  const media = mediaMigrationOperations(inventory.records);
  const candidateByPath = new Map(
    media.filter((operation) => operation.cmsOwnership === "cms-candidate")
      .map((operation, index) => [operation.publicPath, `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`]),
  );

  for (const operation of industries) {
    const resolved = resolveMigrationMedia(operation, candidateByPath);
    const validation = validateCmsSnapshot("industry", resolved, "publish");
    assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));
    assert.equal(resolved.mediaIds.length, 1);
    assert.equal((resolved.content as { heroMediaId?: string }).heroMediaId, resolved.mediaIds[0]);
    assert.ok((resolved.content as { opportunity?: string }).opportunity);
    assert.ok((resolved.content as { capabilities?: unknown[] }).capabilities!.length >= 2);
    assert.ok((resolved.content as { selectedWork?: { description?: string } }).selectedWork?.description);
    assert.equal(cmsPublicRoute("industry", operation.slug, resolved.content), `/industries/${operation.slug}`);
  }
});

test("the Pulse industry family governs nine native-wide assets but associates only the six existing industries", () => {
  const inventory = loadInventory();
  const media = mediaMigrationOperations(inventory.records);
  const mediaByPath = new Map(media.map((operation) => [operation.publicPath, operation]));
  const associated = pulseIndustryMedia.filter((item) => item.slug);
  const unassociated = pulseIndustryMedia.filter((item) => !item.slug);

  assert.equal(pulseIndustryMedia.length, 9);
  assert.equal(associated.length, 6);
  assert.deepEqual(
    unassociated.map((item) => item.sector),
    ["Manufacturing", "Defense", "Retail & CPG"],
  );

  for (const item of pulseIndustryMedia) {
    const operation = mediaByPath.get(item.publicPath);
    assert.ok(operation, `missing ${item.publicPath}`);
    assert.equal(operation.cmsOwnership, "cms-candidate");
    assert.equal(operation.collection, "website");
    assert.equal(operation.mimeType, "image/png");
    assert.equal(operation.width, 1536);
    assert.equal(operation.height, 1024);
    assert.equal(operation.altText, item.altText);
  }
});