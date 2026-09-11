import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { repositoryRoot } from "./common.js";
import { mapWithConcurrency } from "./media-reconciliation.js";
import { objectStorageClient } from "./object-storage.js";
import { task295MediaManifest, type Task295MediaManifestEntry } from "./task-295-media-manifest.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const target = args.find((item) => item.startsWith("--target="))?.slice(9);
const LOCK_KEY = "cms-task-295-exact-media-import-v1";

interface StorageHelpers {
  assertMediaType(mimeType: string, size: number): void;
  detectMediaSignature(bytes: Buffer): string | null;
  promoteMediaObject(stagingPath: string, expectedType: string, expectedSize: number, checksum?: string): Promise<{
    storageKey: string; checksum: string; size: number; width: number | null; height: number | null;
  }>;
  deleteMediaStagingObject(stagingPath: string): Promise<void>;
}

export function task295RequestDigest(entry: Task295MediaManifestEntry) {
  return createHash("sha256").update(JSON.stringify({
    task: 295,
    checksum: entry.checksum,
    byteSize: entry.byteSize,
    mimeType: entry.mimeType,
    width: entry.width,
    height: entry.height,
  })).digest("hex");
}

export function task295ReceiptKey(entry: Task295MediaManifestEntry) {
  return `cms-task-295-media-v1:${entry.checksum}`;
}

export function task295ResultDigest(assetId: string, versionId: string, checksum: string) {
  return createHash("sha256").update(`${assetId}:${versionId}:${checksum}`).digest("hex");
}

export function isGovernedImmutableTask295ObjectKey(storageKey: string, privatePrefix: string) {
  const prefix = privatePrefix.replace(/^\/+|\/+$/g, "");
  if (!prefix || storageKey.includes("..")) return false;
  const immutablePrefix = `${prefix}/cms-media/objects/`;
  if (!storageKey.startsWith(immutablePrefix)) return false;
  const suffix = storageKey.slice(immutablePrefix.length);
  return /^[^/]+\/sha256\/[a-f0-9]{64}$/.test(suffix);
}

export function resolveTask295Match(input: {
  receiptSubjectId?: string;
  receiptResultDigest?: string | null;
  exactVersions: ReadonlyArray<{ assetId: string; versionId: string; checksum: string; collection: string }>;
  exactAssetIds: readonly string[];
  conflictingAssetIdentity: boolean;
}): "create" | { assetId: string } {
  const nonWebsite = input.exactVersions.find((version) => version.collection !== "website");
  if (nonWebsite) throw new Error("Exact bytes belong to a nonwebsite collection; refusing cross-collection reuse.");
  const exact = [...new Set(input.exactAssetIds)];
  if (input.receiptSubjectId) {
    if (!exact.includes(input.receiptSubjectId)) {
      throw new Error("Receipt subject does not retain an exact immutable version.");
    }
    if (!input.receiptResultDigest || !input.exactVersions.some((version) =>
      version.assetId === input.receiptSubjectId
      && task295ResultDigest(version.assetId, version.versionId, version.checksum) === input.receiptResultDigest
    )) {
      throw new Error("Receipt result digest does not identify an exact immutable version.");
    }
    return { assetId: input.receiptSubjectId };
  }
  if (exact.length > 1) throw new Error("Exact bytes occur on multiple assets; refusing an ambiguous reuse.");
  if (exact.length === 1) return { assetId: exact[0] };
  if (input.conflictingAssetIdentity) {
    throw new Error("An asset claims this checksum without an exact immutable version.");
  }
  return "create";
}

function sourceDimensions(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/png") {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) {
      return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions could not be read.");
}

async function loadGovernedStorageHelpers(): Promise<StorageHelpers> {
  // Constructed dynamically so the scripts package can reuse the API's
  // governed implementation without pulling API source into scripts' rootDir.
  const moduleUrl = pathToFileURL(path.join(
    repositoryRoot,
    "artifacts/api-server/src/lib/object-storage.ts",
  )).href;
  return await import(moduleUrl) as StorageHelpers;
}

async function validateSources(helpers: StorageHelpers) {
  if (task295MediaManifest.length !== 17) throw new Error("Task 295 manifest must contain exactly 17 entries.");
  const checksums = new Set<string>();
  return mapWithConcurrency(task295MediaManifest, 4, async (entry) => {
    if (checksums.has(entry.checksum)) throw new Error(`Duplicate manifest checksum: ${entry.checksum}.`);
    checksums.add(entry.checksum);
    const bytes = await readFile(path.join(repositoryRoot, entry.sourceFile));
    helpers.assertMediaType(entry.mimeType, bytes.length);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const dimensions = sourceDimensions(bytes, entry.mimeType);
    if (
      helpers.detectMediaSignature(bytes) !== entry.mimeType
      || bytes.length !== entry.byteSize
      || checksum !== entry.checksum
      || dimensions.width !== entry.width
      || dimensions.height !== entry.height
    ) throw new Error(`Manifest identity mismatch for ${entry.sourceFile}.`);
    return { entry, bytes };
  });
}

async function verifyObject(storageKey: string, expected: Task295MediaManifestEntry) {
  if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) throw new Error("DEFAULT_OBJECT_STORAGE_BUCKET_ID is required.");
  const [bytes] = await objectStorageClient
    .bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID)
    .file(storageKey)
    .download();
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== expected.byteSize || checksum !== expected.checksum) {
    throw new Error(`Durable readback conflict for ${expected.sourceFile}.`);
  }
}

async function verifyAuthenticatedPreviews(
  outcomes: ReadonlyArray<{
    entry: Task295MediaManifestEntry;
    assetId: string;
  }>,
  pool: { query(text: string, values?: unknown[]): Promise<{ rows: any[] }> },
) {
  const apiRequire = createRequire(path.join(repositoryRoot, "artifacts/api-server/package.json"));
  const express = apiRequire("express");
  const cookieParser = apiRequire("cookie-parser");
  const [{ default: mediaRouter }, auth] = await Promise.all([
    import(pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/routes/media.ts")).href),
    import(pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/lib/auth.ts")).href),
  ]);
  const fixtureEmail = `task-295-preview-${randomUUID()}@service.invalid`;
  const inserted = await pool.query(
    `INSERT INTO cms_users (email,display_name,role,status,email_verified_at)
     VALUES ($1,'Task 295 temporary preview verifier','editor','active',now()) RETURNING id`,
    [fixtureEmail],
  );
  const userId = String(inserted.rows[0].id);
  let server: Server | undefined;
  try {
    await pool.query(
      `INSERT INTO cms_totp_credentials
         (user_id,encrypted_secret,encryption_key_version,verified_at)
       VALUES ($1,$2,1,now())`,
      [userId, `task-295-ephemeral-${randomUUID()}`],
    );
    const cookies = new Map<string, string>();
    const request = { ip: "127.0.0.1", header: () => "task-295-preview-verifier" };
    const response = { cookie: (name: string, value: string) => { cookies.set(name, value); } };
    await auth.createSession(userId, true, request as never, response as never);
    const app = express();
    app.use(express.json());
    app.use(cookieParser());
    app.use("/api", mediaRouter);
    const listeningServer: Server = app.listen(0, "127.0.0.1");
    server = listeningServer;
    await new Promise<void>((resolve) => listeningServer.once("listening", resolve));
    const address = listeningServer.address();
    if (!address || typeof address === "string") throw new Error("Could not bind ephemeral preview verifier.");
    const cookie = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    await mapWithConcurrency(outcomes, 3, async ({ entry, assetId }) => {
      const response = await fetch(`http://127.0.0.1:${address.port}/api/media/${assetId}/file`, {
        headers: { cookie },
      });
      if (!response.ok || response.headers.get("content-type") !== entry.mimeType) {
        throw new Error(`Authenticated preview failed for ${entry.sourceFile}: HTTP ${response.status}.`);
      }
      const bytes = Buffer.from(await response.arrayBuffer());
      if (
        bytes.length !== entry.byteSize
        || createHash("sha256").update(bytes).digest("hex") !== entry.checksum
      ) throw new Error(`Authenticated preview bytes conflict for ${entry.sourceFile}.`);
    });
  } finally {
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve())
      );
    }
    await pool.query("DELETE FROM cms_sessions WHERE user_id=$1", [userId]);
    await pool.query("DELETE FROM cms_users WHERE id=$1", [userId]);
  }
}

async function main() {
  if (!apply) {
    console.log(JSON.stringify({
      task: 295,
      mode: "dry-run",
      count: task295MediaManifest.length,
      message: "Pass --apply-db --target=development to upload and reconcile only this manifest.",
      manifest: task295MediaManifest,
    }, null, 2));
    return;
  }
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Task 295 media reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Task 295 media reconciliation requires --target=development.");
  }
  if (!process.env.DATABASE_URL || !process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR) {
    throw new Error("DATABASE_URL and private Object Storage configuration are required.");
  }

  const helpers = await loadGovernedStorageHelpers();
  const sources = await validateSources(helpers);
  const {
    cmsAuditEventsTable,
    cmsMediaAssetsTable,
    cmsMediaVersionsTable,
    cmsOperationReceiptsTable,
    cmsUsersTable,
    db,
    pool,
  } = await import("@workspace/db");
  const prefix = process.env.PRIVATE_OBJECT_DIR.replace(/^\/+|\/+$/g, "");
  const checksums = task295MediaManifest.map((entry) => entry.checksum);
  const [assets, versions, receipts] = await Promise.all([
    db.select().from(cmsMediaAssetsTable).where(inArray(cmsMediaAssetsTable.checksum, checksums)),
    db.select({
      id: cmsMediaVersionsTable.id,
      assetId: cmsMediaVersionsTable.assetId,
      checksum: cmsMediaVersionsTable.checksum,
      byteSize: cmsMediaVersionsTable.byteSize,
      width: cmsMediaVersionsTable.width,
      height: cmsMediaVersionsTable.height,
      storageKey: cmsMediaVersionsTable.storageKey,
      versionNumber: cmsMediaVersionsTable.versionNumber,
      collection: cmsMediaAssetsTable.collection,
    }).from(cmsMediaVersionsTable)
      .innerJoin(cmsMediaAssetsTable, eq(cmsMediaAssetsTable.id, cmsMediaVersionsTable.assetId))
      .where(inArray(cmsMediaVersionsTable.checksum, checksums))
      .orderBy(asc(cmsMediaVersionsTable.versionNumber)),
    db.select().from(cmsOperationReceiptsTable)
      .where(inArray(cmsOperationReceiptsTable.idempotencyKey, task295MediaManifest.map(task295ReceiptKey))),
  ]);
  const receiptByKey = new Map(receipts.map((receipt) => [receipt.idempotencyKey, receipt]));
  const versionsByChecksum = new Map<string, typeof versions>();
  for (const version of versions) {
    const list = versionsByChecksum.get(version.checksum) ?? [];
    list.push(version);
    versionsByChecksum.set(version.checksum, list);
  }

  // Full immutable-object readback occurs before opening the write transaction.
  const reusable = new Map<string, typeof versions[number]>();
  await mapWithConcurrency(task295MediaManifest, 4, async (entry) => {
    const receipt = receiptByKey.get(task295ReceiptKey(entry));
    if (receipt && receipt.requestDigest !== task295RequestDigest(entry)) {
      throw new Error(`Receipt digest conflict for ${entry.sourceFile}.`);
    }
    const matchingVersions = versionsByChecksum.get(entry.checksum) ?? [];
    const mutableIdentity = matchingVersions.find((version) =>
      version.byteSize === entry.byteSize
      && !isGovernedImmutableTask295ObjectKey(version.storageKey, prefix)
    );
    if (mutableIdentity) {
      throw new Error(`Exact bytes for ${entry.sourceFile} use a non-immutable storage namespace.`);
    }
    const candidates = matchingVersions.filter((version) =>
      version.byteSize === entry.byteSize
      && version.width === entry.width
      && version.height === entry.height
      && isGovernedImmutableTask295ObjectKey(version.storageKey, prefix)
    );
    await mapWithConcurrency(candidates, 3, async (version) => verifyObject(version.storageKey, entry));
    const match = resolveTask295Match({
      receiptSubjectId: receipt?.subjectId,
      receiptResultDigest: receipt?.resultDigest,
      exactVersions: candidates.map((version) => ({
        assetId: version.assetId,
        versionId: version.id,
        checksum: version.checksum,
        collection: version.collection,
      })),
      exactAssetIds: candidates.map((version) => version.assetId),
      conflictingAssetIdentity: assets.some((asset) =>
        asset.checksum === entry.checksum
        && (asset.byteSize !== entry.byteSize || !candidates.some((version) => version.assetId === asset.id))
      ),
    });
    if (match !== "create") {
      const exactVersion = receipt
        ? candidates.find((version) =>
            version.assetId === match.assetId
            && task295ResultDigest(version.assetId, version.id, version.checksum) === receipt.resultDigest
          )
        : candidates.find((version) => version.assetId === match.assetId);
      reusable.set(entry.checksum, exactVersion!);
    }
  });

  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
  const promoted = new Map<string, Awaited<ReturnType<StorageHelpers["promoteMediaObject"]>>>();
  await mapWithConcurrency(sources.filter(({ entry }) => !reusable.has(entry.checksum)), 3, async ({ entry, bytes }) => {
    const stagingPath = `${prefix}/cms-media/staging/task-295-${entry.checksum}`;
    await bucket.file(stagingPath).save(bytes, {
      resumable: false,
      contentType: entry.mimeType,
      metadata: { metadata: { checksum: entry.checksum } },
    });
    const result = await helpers.promoteMediaObject(stagingPath, entry.mimeType, entry.byteSize, entry.checksum);
    if (
      result.checksum !== entry.checksum || result.size !== entry.byteSize
      || result.width !== entry.width || result.height !== entry.height
    ) throw new Error(`Governed promotion identity mismatch for ${entry.sourceFile}.`);
    await verifyObject(result.storageKey, entry);
    promoted.set(entry.checksum, result);
  });

  const outcomes = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`);
    const [serviceUser] = await tx.insert(cmsUsersTable).values({
      email: "cms-task-295-import@service.invalid",
      displayName: "Task 295 media import service",
      role: "viewer",
      status: "suspended",
    }).onConflictDoUpdate({
      target: cmsUsersTable.email,
      set: { displayName: "Task 295 media import service", role: "viewer", status: "suspended" },
    }).returning({ id: cmsUsersTable.id });
    if (!serviceUser) throw new Error("Could not provision task 295 attribution user.");

    const results = [];
    for (const entry of task295MediaManifest) {
      const key = task295ReceiptKey(entry);
      const digest = task295RequestDigest(entry);
      const [receipt] = await tx.select().from(cmsOperationReceiptsTable)
        .where(eq(cmsOperationReceiptsTable.idempotencyKey, key));
      const knownVersion = reusable.get(entry.checksum);
      if (receipt) {
        if (receipt.requestDigest !== digest || knownVersion?.assetId !== receipt.subjectId) {
          throw new Error(`Concurrent or historical receipt conflict for ${entry.sourceFile}.`);
        }
        results.push({ entry, assetId: receipt.subjectId, version: knownVersion!, disposition: "reused" as const });
        continue;
      }

      if (knownVersion) {
        await tx.insert(cmsOperationReceiptsTable).values({
          idempotencyKey: key,
          operation: "cms.task-295.media-reused",
          subjectId: knownVersion.assetId,
          requestDigest: digest,
          resultDigest: task295ResultDigest(knownVersion.assetId, knownVersion.id, entry.checksum),
        });
        results.push({ entry, assetId: knownVersion.assetId, version: knownVersion, disposition: "reused" as const });
        continue;
      }

      // Recheck all identities under the task lock before creating metadata.
      const concurrent = await tx.select({ id: cmsMediaVersionsTable.id })
        .from(cmsMediaVersionsTable)
        .where(and(
          eq(cmsMediaVersionsTable.checksum, entry.checksum),
          eq(cmsMediaVersionsTable.byteSize, entry.byteSize),
        ));
      if (concurrent.length) throw new Error(`A concurrent exact version appeared for ${entry.sourceFile}; rerun safely.`);
      const stored = promoted.get(entry.checksum);
      if (!stored) throw new Error(`No governed promotion exists for ${entry.sourceFile}.`);
      const [asset] = await tx.insert(cmsMediaAssetsTable).values({
        storageKey: stored.storageKey,
        filename: entry.filename,
        originalFilename: path.basename(entry.sourceFile),
        mediaType: entry.mimeType,
        byteSize: entry.byteSize,
        checksum: entry.checksum,
        altText: entry.altText,
        credit: null,
        collection: "website",
        linkedinAssetKind: null,
        campaignMetadata: null,
        status: "pending-review",
        uploadedByUserId: serviceUser.id,
      }).returning();
      if (!asset) throw new Error(`Could not create ${entry.sourceFile}.`);
      const [version] = await tx.insert(cmsMediaVersionsTable).values({
        assetId: asset.id,
        versionNumber: 1,
        storageKey: stored.storageKey,
        checksum: entry.checksum,
        byteSize: entry.byteSize,
        width: entry.width,
        height: entry.height,
        metadata: {
          task: 295,
          sourceFile: entry.sourceFile,
          originalFilename: path.basename(entry.sourceFile),
          collection: "website",
          altText: entry.altText,
          credit: null,
          accessibilityStatus: "needs-review",
          rightsStatus: "unresolved",
          sourceReview: "visual-inspection-complete",
        },
      }).returning();
      if (!version) throw new Error(`Could not create the original version for ${entry.sourceFile}.`);
      await tx.insert(cmsOperationReceiptsTable).values({
        idempotencyKey: key,
        operation: "cms.task-295.media-imported",
        subjectId: asset.id,
        requestDigest: digest,
        resultDigest: task295ResultDigest(asset.id, version.id, entry.checksum),
      });
      await tx.insert(cmsAuditEventsTable).values({
        actorUserId: serviceUser.id,
        actorLabel: "cms-task-295-import",
        action: "cms.task-295.media-imported",
        targetType: "media",
        targetId: asset.id,
        requestId: key,
        metadata: { mediaVersionId: version.id, checksum: entry.checksum, status: "pending-review" },
      });
      results.push({ entry, assetId: asset.id, version, disposition: "created" as const });
    }
    return results;
  });

  await mapWithConcurrency(outcomes, 4, async ({ entry, version }) => verifyObject(version.storageKey, entry));
  await verifyAuthenticatedPreviews(outcomes, pool);
  await mapWithConcurrency(
    sources.filter(({ entry }) => promoted.has(entry.checksum)),
    3,
    async ({ entry }) => helpers.deleteMediaStagingObject(`${prefix}/cms-media/staging/task-295-${entry.checksum}`),
  );
  const finalAssets = await db.select({
    id: cmsMediaAssetsTable.id,
    filename: cmsMediaAssetsTable.filename,
    status: cmsMediaAssetsTable.status,
    credit: cmsMediaAssetsTable.credit,
    altText: cmsMediaAssetsTable.altText,
    collection: cmsMediaAssetsTable.collection,
  }).from(cmsMediaAssetsTable)
    .where(inArray(cmsMediaAssetsTable.id, outcomes.map((outcome) => outcome.assetId)));
  const finalAssetById = new Map(finalAssets.map((asset) => [asset.id, asset]));
  console.log(JSON.stringify({
    task: 295,
    environment: "task/development",
    productionVerified: false,
    count: outcomes.length,
    receipts: outcomes.map(({ entry, assetId, version, disposition }) => {
      const asset = finalAssetById.get(assetId);
      if (!asset) throw new Error(`Final asset state is missing for ${entry.sourceFile}.`);
      return {
      sourceFile: entry.sourceFile,
      checksum: entry.checksum,
      byteSize: entry.byteSize,
      dimensions: { width: entry.width, height: entry.height },
      assetId,
      mediaVersionId: version.id,
      versionNumber: version.versionNumber,
      storageKey: version.storageKey,
      filename: asset.filename,
      collection: asset.collection,
      status: asset.status,
      altText: asset.altText,
      rightsStatus: "unresolved",
      credit: asset.credit,
      disposition,
      durableSha256Readback: true,
      authenticatedPreviewPath: `/api/media/${assetId}/file`,
      authenticatedPreviewVerified: true,
    };
    }),
  }, null, 2));
  await pool.end();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}