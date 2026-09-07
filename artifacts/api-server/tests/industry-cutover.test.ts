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