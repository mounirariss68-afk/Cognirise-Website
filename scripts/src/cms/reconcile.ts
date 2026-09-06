import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { inArray } from "drizzle-orm";
import {
  type InventoryRecord,
  repositoryRoot,
} from "./common.js";
import {
  mediaMigrationOperations,
  migrationOperations,
} from "./migration.js";

interface Inventory {
  schemaVersion: number;
  manifestDigest: string;
  records: InventoryRecord[];
}

interface ExpectedReceipt {
  requestDigest: string;
  subjectType: "document" | "media";
}

async function loadDatabase() {
  return import("@workspace/db");
}

type DatabaseBindings = Awaited<ReturnType<typeof loadDatabase>>;

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: repositoryRoot,
      env: process.env,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(
        signal
          ? `${command} was terminated by ${signal}.`
          : `${command} exited with code ${code ?? "unknown"}.`,
      ));
    });
  });
}

async function inspectReconciliationState(
  expected: Map<string, ExpectedReceipt>,
  database: DatabaseBindings,
) {
  const {
    cmsDocumentsTable,
    cmsMediaAssetsTable,
    cmsOperationReceiptsTable,
    db,
  } = database;
  const receipts = await db.select({
    idempotencyKey: cmsOperationReceiptsTable.idempotencyKey,
    requestDigest: cmsOperationReceiptsTable.requestDigest,
    subjectId: cmsOperationReceiptsTable.subjectId,
  }).from(cmsOperationReceiptsTable);
  const relevantReceipts = receipts.filter((receipt) => expected.has(receipt.idempotencyKey));

  const documentIds: string[] = [];
  const mediaIds: string[] = [];
  for (const receipt of relevantReceipts) {
    const operation = expected.get(receipt.idempotencyKey)!;
    if (receipt.requestDigest !== operation.requestDigest) {
      throw new Error(`CMS cutover receipt digest mismatch for ${receipt.idempotencyKey}.`);
    }
    if (operation.subjectType === "document") documentIds.push(receipt.subjectId);
    else mediaIds.push(receipt.subjectId);
  }

  const [documents, media] = await Promise.all([
    documentIds.length
      ? db.select({ id: cmsDocumentsTable.id })
        .from(cmsDocumentsTable)
        .where(inArray(cmsDocumentsTable.id, documentIds))
      : [],
    mediaIds.length
      ? db.select({ id: cmsMediaAssetsTable.id })
        .from(cmsMediaAssetsTable)
        .where(inArray(cmsMediaAssetsTable.id, mediaIds))
      : [],
  ]);
  if (documents.length !== documentIds.length || media.length !== mediaIds.length) {
    throw new Error(
      `CMS cutover receipts reference missing records: found ${documents.length}/${documentIds.length} documents and ${media.length}/${mediaIds.length} media assets.`,
    );
  }

  const existingCount = relevantReceipts.length;
  const missingCount = expected.size - existingCount;
  return {
    state: missingCount === 0 ? "complete" as const : "pending" as const,
    existingCount,
    missingCount,
  };
}

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("CMS cutover reconciliation is disabled in production.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const inventory = JSON.parse(
    await readFile(`${repositoryRoot}/scripts/cms/output/inventory.json`, "utf8"),
  ) as Inventory;
  if (inventory.schemaVersion !== 2 || !inventory.manifestDigest || !Array.isArray(inventory.records)) {
    throw new Error("Unsupported or invalid CMS inventory file.");
  }

  const expected = new Map<string, ExpectedReceipt>();
  for (const operation of migrationOperations(inventory.records)) {
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "document",
    });
  }
  for (const operation of mediaMigrationOperations(inventory.records)
    .filter((item) => item.cmsOwnership === "cms-candidate")) {
    expected.set(operation.idempotencyKey, {
      requestDigest: operation.requestDigest,
      subjectType: "media",
    });
  }

  const database = await loadDatabase();
  try {
    const before = await inspectReconciliationState(expected, database);
    if (before.state === "complete") {
      console.log(
        `CMS cutover already reconciled: ${expected.size} receipts have matching digests and live records. Existing editorial state was left unchanged.`,
      );
      return;
    }

    const initialImport = before.existingCount === 0;
    console.log(
      initialImport
        ? `CMS cutover is absent; importing ${before.missingCount} governed development operations with deferred media.`
        : `CMS inventory expanded safely: preserving ${before.existingCount} completed operations and applying ${before.missingCount} new operations.`,
    );
    await run("pnpm", [
      "--filter",
      "@workspace/scripts",
      "cms:import",
      "--",
      "--apply-db",
      "--target=development",
      "--defer-media-upload",
    ]);

    const after = await inspectReconciliationState(expected, database);
    if (after.state !== "complete") {
      throw new Error(
        `CMS cutover reconciliation remained incomplete after import: ${after.missingCount} operations are still missing.`,
      );
    }
    if (initialImport) {
      await run("pnpm", [
        "--filter",
        "@workspace/scripts",
        "cms:verify",
        "--",
        "--db",
      ]);
    }
    console.log(
      `CMS cutover reconciliation completed: ${expected.size} receipts have matching digests and live records. Existing editorial state was left unchanged.`,
    );
  } finally {
    await database.pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});