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
import {
  industryPublicationPinAction,
  pulseIndustryMedia,
} from "../../../scripts/src/cms/industry-media";

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
    operation.idempotencyKey.startsWith(
      operation.slug === "financial-services"
        ? "cms-industry-contract-v12:"
        : operation.slug === "education"
          ? "cms-industry-education-successor-v12:"
        : "cms-industry-contract-v8:",
    )
  ));

  const media = mediaMigrationOperations(inventory.records);
  const candidateByPath = new Map(
    media.filter((operation) => operation.cmsOwnership === "cms-candidate")
      .map((operation, index) => [operation.publicPath, `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`]),
  );

  for (const operation of industries) {
    const approvedMedia = pulseIndustryMedia.find((item) => item.slug === operation.slug);
    assert.ok(approvedMedia);
    const supportingPaths = pulseIndustryMedia
      .filter((item) => item.slug === operation.slug && item.role === "supporting")
      .map((item) => item.publicPath);
    assert.deepEqual(operation.mediaPaths, [approvedMedia.publicPath, ...supportingPaths]);
    assert.equal((operation.payload.content as { image?: string }).image, approvedMedia.publicPath);
    assert.equal((operation.payload.content as { imageAlt?: string }).imageAlt, approvedMedia.altText);
    const resolved = resolveMigrationMedia(operation, candidateByPath);
    const validation = validateCmsSnapshot("industry", resolved, "draft");
    assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));
    assert.equal(resolved.mediaIds.length, 1 + supportingPaths.length);
    assert.equal((resolved.content as { heroMediaId?: string }).heroMediaId, resolved.mediaIds[0]);
    assert.ok((resolved.content as { opportunity?: string }).opportunity);
    assert.ok((resolved.content as { capabilities?: unknown[] }).capabilities!.length >= 2);
    assert.ok((resolved.content as { selectedWork?: { description?: string } }).selectedWork?.description);
    assert.equal(cmsPublicRoute("industry", operation.slug, resolved.content), `/industries/${operation.slug}`);
  }
});

test("the Pulse industry family governs one Education hero without creating another industry", () => {
  const inventory = loadInventory();
  const media = mediaMigrationOperations(inventory.records);
  const mediaByPath = new Map(media.map((operation) => [operation.publicPath, operation]));
  const associated = pulseIndustryMedia.filter((item) => item.slug && item.role !== "supporting");
  const unassociated = pulseIndustryMedia.filter((item) => !item.slug);

  assert.equal(pulseIndustryMedia.length, 9);
  assert.equal(associated.length, 6);
  assert.equal(pulseIndustryMedia.filter((item) => item.role === "supporting").length, 0);
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
    assert.equal(operation.width, item.width ?? 1536);
    assert.equal(operation.height, item.height ?? 1024);
    assert.equal(operation.altText, item.altText);
  }

  const industryPaths = new Set(
    migrationOperations(inventory.records)
      .filter((operation) => operation.kind === "industry")
      .flatMap((operation) => operation.mediaPaths),
  );
  assert.deepEqual(
    [...industryPaths].sort(),
    [
      ...associated.map((item) => item.publicPath),
      ...pulseIndustryMedia.filter((item) => item.role === "supporting").map((item) => item.publicPath),
    ].sort(),
  );
  assert.ok(unassociated.every((item) => !industryPaths.has(item.publicPath)));
});

test("Education reconciliation invokes the Education-only hero cutover", () => {
  const reconcileSource = readFileSync(
    path.resolve(process.cwd(), "../../scripts/src/cms/reconcile.ts"),
    "utf8",
  );
  const cutoverSource = readFileSync(
    path.resolve(process.cwd(), "../../scripts/src/cms/industry-cutover.ts"),
    "utf8",
  );
  assert.match(reconcileSource, /"cms:publish-education-hero"/);
  assert.match(cutoverSource, /requestedSlug && requestedSlug !== "education"/);
  assert.match(cutoverSource, /fullPlan\.filter\(\(item\) => item\.definition\.slug === requestedSlug\)/);
  assert.match(cutoverSource, /if \(!requestedSlug\) \{/);
  assert.match(cutoverSource, /const expectedUnassociated = requestedSlug \? 0 : 3/);
  assert.match(cutoverSource, /plan\.length !== expectedAssociated \+ expectedSupporting \+ expectedUnassociated/);
});

test("compiled industry fallbacks use the approved Pulse PNG family", () => {
  const source = readFileSync(
    path.resolve(process.cwd(), "../cognirise-website/src/content/industries.ts"),
    "utf8",
  );
  for (const item of pulseIndustryMedia.filter((candidate) => candidate.slug)) {
    assert.match(source, new RegExp(item.publicPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(source, new RegExp(item.altText.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.doesNotMatch(
    source,
    /pulse-industry-(financial|telecoms|travel|energy|public-sector|education)\.jpg/,
  );
});

test("only an absent exact reference can be restored on an approved Pulse publication", () => {
  const base = {
    workflowState: "approved",
    mediaIds: ["approved-asset"],
    heroMediaId: "approved-asset",
    expectedAssetId: "approved-asset",
    expectedVersionId: "approved-version",
  };
  assert.equal(industryPublicationPinAction({
    ...base,
    referenceVersionIds: [],
  }), "insert-reference");
  assert.equal(industryPublicationPinAction({
    ...base,
    referenceVersionIds: ["approved-version"],
  }), "complete");
  assert.equal(industryPublicationPinAction({
    ...base,
    referenceVersionIds: ["another-version"],
  }), "blocked");
  assert.equal(industryPublicationPinAction({
    ...base,
    heroMediaId: "another-asset",
    referenceVersionIds: [],
  }), "blocked");
  const supporting = [{ assetId: "educator-practice", versionId: "educator-practice-v1" }];
  assert.equal(industryPublicationPinAction({
    ...base,
    mediaIds: ["approved-asset", "educator-practice"],
    expectedSupportingMedia: supporting,
    referenceVersionIds: ["approved-version", "educator-practice-v1"],
  }), "complete");
  assert.equal(industryPublicationPinAction({
    ...base,
    mediaIds: ["approved-asset", "educator-practice"],
    expectedSupportingMedia: supporting,
    referenceVersionIds: ["approved-version"],
  }), "blocked", "a partial supporting-media pin cannot be repaired as a hero-only reference");
});