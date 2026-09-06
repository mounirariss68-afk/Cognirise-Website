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

async function inspectReconciliationState(expected: Map<string, ExpectedReceipt>) {
  const {
    cmsDocumentsTable,
    cmsMediaAssetsTable,
    cmsOperationReceiptsTable,
    db,
    pool,
  } = await import("@workspace/db");
  try {
    const receipts = await db.select({
      idempotencyKey: cmsOperationReceiptsTable.idempotencyKey,
      requestDigest: cmsOperationReceiptsTable.requestDigest,
      subjectId: cmsOperationReceiptsTable.subjectId,
    }).from(cmsOperationReceiptsTable);
    const relevantReceipts = receipts.filter((receipt) => expected.has(receipt.idempotencyKey));

    if (relevantReceipts.length === 0) return "empty" as const;
    if (relevantReceipts.length !== expected.size) {
      throw new Error(
        `CMS cutover reconciliation is partial: found ${relevantReceipts.length} of ${expected.size} receipts. Refusing to overwrite or duplicate content.`,
      );
    }

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
      db.select({ id: cmsDocumentsTable.id })
        .from(cmsDocumentsTable)
        .where(inArray(cmsDocumentsTable.id, documentIds)),
      db.select({ id: cmsMediaAssetsTable.id })
        .from(cmsMediaAssetsTable)
        .where(inArray(cmsMediaAssetsTable.id, mediaIds)),
    ]);
    if (documents.length !== documentIds.length || media.length !== mediaIds.length) {
      throw new Error(
        `CMS cutover receipts reference missing records: found ${documents.length}/${documentIds.length} documents and ${media.length}/${mediaIds.length} media assets.`,
      );
    }

    return "complete" as const;
  } finally {
    await pool.end();
  }
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

  const state = await inspectReconciliationState(expected);
  if (state === "complete") {
    console.log(
      `CMS cutover already reconciled: ${expected.size} receipts have matching digests and live records. Existing editorial state was left unchanged.`,
    );
    return;
  }

  console.log("CMS cutover is absent; importing governed development drafts with deferred media.");
  await run("pnpm", [
    "--filter",
    "@workspace/scripts",
    "cms:import",
    "--",
    "--apply-db",
    "--target=development",
    "--defer-media-upload",
  ]);
  await run("pnpm", [
    "--filter",
    "@workspace/scripts",
    "cms:verify",
    "--",
    "--db",
  ]);
  console.log("CMS cutover import and database parity verification completed.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});