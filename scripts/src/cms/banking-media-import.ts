import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { emitJson, outputPath, repositoryRoot } from "./common.js";
import { mapWithConcurrency } from "./media-reconciliation.js";
import { objectStorageClient } from "./object-storage.js";
import { bankingMediaManifest, type BankingMediaManifestEntry } from "./banking-media-manifest.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const write = args.includes("--write");
const target = args.find((item) => item.startsWith("--target="))?.slice(9);
const destination = args.find((item) => item.startsWith("--out="))?.slice(6);
const LOCK_KEY = "cms-banking-pov-v1-media-import";

interface StorageHelpers {
  assertMediaType(mimeType: string, size: number): void;
  detectMediaSignature(bytes: Buffer): string | null;
  promoteMediaObject(stagingPath: string, expectedType: string, expectedSize: number, checksum?: string): Promise<{
    storageKey: string; checksum: string; size: number; width: number | null; height: number | null;
  }>;
  deleteMediaStagingObject(stagingPath: string): Promise<void>;
}

export function bankingMediaRequestDigest(entry: BankingMediaManifestEntry) {
  return createHash("sha256").update(JSON.stringify({ task: 289, ...entry })).digest("hex");
}

function acceptsHistoricalBankingMediaRequestDigest(actual: string, entry: BankingMediaManifestEntry) {
  if (actual === bankingMediaRequestDigest(entry)) return true;
  // The original gate import used an earlier, less specific accessibility
  // description. Binary identity and intended use never changed; retain its
  // receipt rather than creating a second asset or mutating an old pin.
  if (entry.id !== "production-readiness-gate") return false;
  const prior = {
    ...entry,
    altText: "A layered architectural gateway with illuminated pathways, representing controlled progression from permission to action.",
  };
  return actual === bankingMediaRequestDigest(prior);
}

export function bankingMediaReceiptKey(entry: BankingMediaManifestEntry) {
  // The originally shared site-financial asset had generic legacy alt text.
  // This Banking-specific v2 receipt creates its own immutable descriptive
  // asset rather than changing a version that may belong to another document.
  const altRevision = entry.id === "production-readiness-gate" ? ":descriptive-alt-v2" : "";
  return `cms-banking-pov-v1-media:${entry.id}:${entry.checksum}${altRevision}`;
}

export function bankingMediaResultDigest(assetId: string, mediaVersionId: string, checksum: string) {
  return createHash("sha256").update(`${assetId}:${mediaVersionId}:${checksum}`).digest("hex");
}

function dimensions(bytes: Buffer, mimeType: string) {
  if (mimeType === "image/png") return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions could not be read.");
}

async function helpers(): Promise<StorageHelpers> {
  return await import(pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/lib/object-storage.ts")).href) as StorageHelpers;
}

async function validatedSources(storage: StorageHelpers) {
  if (bankingMediaManifest.length !== 5 || new Set(bankingMediaManifest.map((item) => item.id)).size !== 5) {
    throw new Error("The Banking media manifest must contain the exact five distinct governed assets.");
  }
  return await mapWithConcurrency(bankingMediaManifest, 3, async (entry) => {
    const bytes = await readFile(path.join(repositoryRoot, entry.sourceFile));
    storage.assertMediaType(entry.mimeType, bytes.length);
    const actual = {
      checksum: createHash("sha256").update(bytes).digest("hex"),
      byteSize: bytes.length,
      ...dimensions(bytes, entry.mimeType),
      signature: storage.detectMediaSignature(bytes),
    };
    if (actual.checksum !== entry.checksum || actual.byteSize !== entry.byteSize
      || actual.width !== entry.width || actual.height !== entry.height || actual.signature !== entry.mimeType) {
      throw new Error(`Banking source identity mismatch: ${entry.sourceFile}.`);
    }
    return { entry, bytes };
  });
}

async function verifyObject(storageKey: string, entry: BankingMediaManifestEntry) {
  const [bytes] = await objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!)
    .file(storageKey).download();
  if (bytes.length !== entry.byteSize || createHash("sha256").update(bytes).digest("hex") !== entry.checksum) {
    throw new Error(`Immutable Banking object readback failed: ${entry.sourceFile}.`);
  }
}

async function main() {
  const storage = await helpers();
  const sources = await validatedSources(storage);
  const plan = {
    task: 289,
    mode: apply ? "apply" : "dry-run",
    reviewGate: "All assets remain pending-review; a CMS publisher must approve each asset before editor selection or publication.",
    originals: "The supplied attached_assets originals remain unmodified; CMS media versions are immutable byte-for-byte copies.",
    media: bankingMediaManifest,
  };
  if (!apply) {
    await emitJson(plan, outputPath(destination, "banking-media-import-plan.json"), write);
    return;
  }
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Banking media import is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL || !process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR) {
    throw new Error("DATABASE_URL, DEFAULT_OBJECT_STORAGE_BUCKET_ID, and PRIVATE_OBJECT_DIR are required.");
  }
  const {
    cmsAuditEventsTable, cmsMediaAssetsTable, cmsMediaVersionsTable, cmsOperationReceiptsTable, cmsUsersTable, db, pool,
  } = await import("@workspace/db");
  const prefix = process.env.PRIVATE_OBJECT_DIR.replace(/^\/+|\/+$/g, "");
  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
  const promoted = new Map<string, Awaited<ReturnType<StorageHelpers["promoteMediaObject"]>>>();
  await mapWithConcurrency(sources, 3, async ({ entry, bytes }) => {
    const stagingKey = `${prefix}/cms-media/staging/banking-pov-v1-${entry.checksum}`;
    await bucket.file(stagingKey).save(bytes, { resumable: false, contentType: entry.mimeType, metadata: { metadata: { checksum: entry.checksum } } });
    const immutable = await storage.promoteMediaObject(stagingKey, entry.mimeType, entry.byteSize, entry.checksum);
    if (immutable.checksum !== entry.checksum || immutable.size !== entry.byteSize
      || immutable.width !== entry.width || immutable.height !== entry.height) {
      throw new Error(`Immutable Banking promotion identity mismatch: ${entry.sourceFile}.`);
    }
    await verifyObject(immutable.storageKey, entry);
    promoted.set(entry.checksum, immutable);
  });
  const outcomes = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${LOCK_KEY}))`);
    const [serviceUser] = await tx.insert(cmsUsersTable).values({
      email: "cms-banking-pov-media-import@service.invalid", displayName: "Banking POV media import service", role: "viewer", status: "suspended",
    }).onConflictDoUpdate({ target: cmsUsersTable.email, set: { displayName: "Banking POV media import service", role: "viewer", status: "suspended" } }).returning({ id: cmsUsersTable.id });
    if (!serviceUser) throw new Error("Could not create Banking import attribution.");
    const results = [];
    for (const entry of bankingMediaManifest) {
      const key = bankingMediaReceiptKey(entry);
      const digest = bankingMediaRequestDigest(entry);
      const [receipt] = await tx.select().from(cmsOperationReceiptsTable).where(eq(cmsOperationReceiptsTable.idempotencyKey, key));
      if (receipt && !acceptsHistoricalBankingMediaRequestDigest(receipt.requestDigest, entry)) {
        throw new Error(`Banking media receipt conflict: ${entry.sourceFile}.`);
      }
      const exact = await tx.select({
        versionId: cmsMediaVersionsTable.id, assetId: cmsMediaVersionsTable.assetId, storageKey: cmsMediaVersionsTable.storageKey,
      }).from(cmsMediaVersionsTable).innerJoin(cmsMediaAssetsTable, eq(cmsMediaAssetsTable.id, cmsMediaVersionsTable.assetId))
        .where(and(eq(cmsMediaVersionsTable.checksum, entry.checksum), eq(cmsMediaVersionsTable.byteSize, entry.byteSize), eq(cmsMediaAssetsTable.collection, "website")))
        .orderBy(asc(cmsMediaVersionsTable.versionNumber));
      if (receipt) {
        const existing = exact.find((item) => item.assetId === receipt.subjectId);
        if (!existing || existing.assetId !== receipt.subjectId || receipt.resultDigest !== bankingMediaResultDigest(existing.assetId, existing.versionId, entry.checksum)) {
          throw new Error(`Receipt does not identify an immutable Banking media pin: ${entry.sourceFile}.`);
        }
        results.push({ entry, assetId: existing.assetId, mediaVersionId: existing.versionId, storageKey: existing.storageKey, disposition: "replayed" });
        continue;
      }
      const assetIds = [...new Set(exact.map((item) => item.assetId))];
      if (assetIds.length > 1) throw new Error(`Ambiguous exact Banking media identity: ${entry.sourceFile}.`);
      // Do not repurpose the shared legacy site-financial asset: its
      // Banking-specific descriptive alt is represented by a new immutable
      // asset/version and receipt, while old references retain their pin.
      const existing = entry.id === "production-readiness-gate" ? undefined : exact[0];
      if (existing) {
        await tx.insert(cmsOperationReceiptsTable).values({ idempotencyKey: key, operation: "cms.banking-pov.media-reused", subjectId: existing.assetId, requestDigest: digest, resultDigest: bankingMediaResultDigest(existing.assetId, existing.versionId, entry.checksum) });
        results.push({ entry, assetId: existing.assetId, mediaVersionId: existing.versionId, storageKey: existing.storageKey, disposition: "reused" });
        continue;
      }
      const immutable = promoted.get(entry.checksum);
      if (!immutable) throw new Error(`No verified immutable object exists: ${entry.sourceFile}.`);
      const [asset] = await tx.insert(cmsMediaAssetsTable).values({
        storageKey: immutable.storageKey, filename: entry.filename, originalFilename: path.basename(entry.sourceFile), mediaType: entry.mimeType, byteSize: entry.byteSize, checksum: entry.checksum, altText: entry.altText, credit: null, collection: "website", linkedinAssetKind: null, campaignMetadata: null, status: "pending-review", uploadedByUserId: serviceUser.id,
      }).returning();
      if (!asset) throw new Error(`Could not create Banking media asset: ${entry.sourceFile}.`);
      const [version] = await tx.insert(cmsMediaVersionsTable).values({
        assetId: asset.id, versionNumber: 1, storageKey: immutable.storageKey, checksum: entry.checksum, byteSize: entry.byteSize, width: entry.width, height: entry.height,
        metadata: { task: 289, sourceFile: entry.sourceFile, intendedUse: entry.intendedUse, altText: entry.altText, accessibilityStatus: "needs-review", rightsStatus: "needs-review", sourceReview: "awaiting-cms-publisher-review" },
      }).returning();
      if (!version) throw new Error(`Could not create Banking immutable media version: ${entry.sourceFile}.`);
      await tx.insert(cmsOperationReceiptsTable).values({ idempotencyKey: key, operation: "cms.banking-pov.media-imported", subjectId: asset.id, requestDigest: digest, resultDigest: bankingMediaResultDigest(asset.id, version.id, entry.checksum) });
      await tx.insert(cmsAuditEventsTable).values({ actorUserId: serviceUser.id, actorLabel: "cms-banking-pov-media-import", action: "cms.banking-pov.media-imported", targetType: "media", targetId: asset.id, requestId: key, metadata: { mediaVersionId: version.id, checksum: entry.checksum, status: "pending-review", sourceFile: entry.sourceFile } });
      results.push({ entry, assetId: asset.id, mediaVersionId: version.id, storageKey: immutable.storageKey, disposition: "created" });
    }
    return results;
  });
  await mapWithConcurrency(outcomes, 3, async ({ entry, storageKey }) => verifyObject(storageKey, entry));
  await mapWithConcurrency(sources, 3, async ({ entry }) => storage.deleteMediaStagingObject(`${prefix}/cms-media/staging/banking-pov-v1-${entry.checksum}`));
  await emitJson({ ...plan, media: outcomes.map(({ entry, ...pin }) => ({ id: entry.id, sourceFile: entry.sourceFile, checksum: entry.checksum, ...pin, status: "pending-review", immutableReadbackVerified: true })) }, outputPath(destination, "banking-media-import-receipt.json"), write);
  await pool.end();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });
}