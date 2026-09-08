import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { cmsPublicRoute, validateCmsSnapshot } from "@workspace/api-zod";
import {
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