import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { repositoryRoot } from "./common";
import { eq, sql } from "drizzle-orm";
import { db, pool, cmsUsersTable, cmsMediaAssetsTable, cmsMediaVersionsTable, cmsAuditEventsTable } from "@workspace/db";
import { objectStorageClient } from "./object-storage";
import { promoteMediaObject, deleteMediaStagingObject, detectMediaSignature } from "../../../artifacts/api-server/src/lib/object-storage";

const filename = "cognirise-team-founders-background-conversation.png";
const sourceFile = "attached_assets/generated_images/team-gokhan-omer-conversation-soft-review.png";
const altText = "Four colleagues examine a translucent magenta architectural model in a bright workshop, with two softly focused colleagues talking in the background.";

async function main() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") throw new Error("This import is for the workspace CMS only.");
  const bytes = await readFile(path.join(repositoryRoot, sourceFile));
  if (detectMediaSignature(bytes) !== "image/png") throw new Error("Invalid source image.");
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const bucketId = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateDir = process.env.PRIVATE_OBJECT_DIR;
  if (!bucketId || !privateDir) throw new Error("CMS storage is not configured.");
  const bucket = objectStorageClient.bucket(bucketId);
  const [existing] = await db.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.checksum, checksum));
  if (existing) {
    const [stored] = await bucket.file(existing.storageKey).download();
    if (createHash("sha256").update(stored).digest("hex") !== checksum) throw new Error("Existing object verification failed.");
    console.log(JSON.stringify({ assetId: existing.id, filename: existing.filename, status: existing.status, verified: true, existing: true }));
    return;
  }
  const staging = `${privateDir.replace(/^\/+|\/+$/g, "")}/cms-media/staging/${randomUUID()}`;
  await bucket.file(staging).save(bytes, { resumable: false, contentType: "image/png" });
  const immutable = await promoteMediaObject(staging, "image/png", bytes.length, checksum);
  const [readback] = await bucket.file(immutable.storageKey).download();
  if (createHash("sha256").update(readback).digest("hex") !== checksum || readback.length !== bytes.length) throw new Error("Durable image readback failed.");
  const result = await db.transaction(async tx => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${`cms-team-review-image:${checksum}`}))`);
    const [duplicate] = await tx.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.checksum, checksum));
    if (duplicate) return { assetId: duplicate.id, filename: duplicate.filename, status: duplicate.status };
    const [actor] = await tx.insert(cmsUsersTable).values({
      email: "cms-media-import@service.invalid", displayName: "CMS media import service", role: "viewer", status: "suspended",
    }).onConflictDoNothing().returning();
    const user = actor ?? (await tx.select().from(cmsUsersTable).where(eq(cmsUsersTable.email, "cms-media-import@service.invalid")))[0];
    if (!user) throw new Error("Import attribution missing.");
    const [asset] = await tx.insert(cmsMediaAssetsTable).values({
      filename, originalFilename: filename, storageKey: immutable.storageKey, mediaType: "image/png",
      checksum, byteSize: bytes.length, altText, collection: "website", status: "pending-review", uploadedByUserId: user.id,
    }).returning();
    const [version] = await tx.insert(cmsMediaVersionsTable).values({
      assetId: asset.id, versionNumber: 1, storageKey: immutable.storageKey, checksum, byteSize: bytes.length,
      width: immutable.width, height: immutable.height,
      metadata: { sourceFile, altText, caption: "Cognirise team workshop — background conversation variant",
        intendedUse: "Saved for later use; not assigned to a website page.", generatedWithAI: true,
        rightsStatus: "needs-review", accessibilityStatus: "needs-review", sourceReview: "awaiting-cms-publisher-review" },
    }).returning();
    await tx.insert(cmsAuditEventsTable).values({
      actorUserId: user.id, actorLabel: "CMS media import service", action: "cms.media.imported",
      targetType: "media", targetId: asset.id, requestId: randomUUID(),
      metadata: { mediaVersionId: version.id, checksum, status: "pending-review", sourceFile, publicationChanged: false },
    });
    return { assetId: asset.id, filename: asset.filename, status: asset.status };
  });
  await deleteMediaStagingObject(staging);
  console.log(JSON.stringify({ ...result, verified: true, websiteChanged: false }));
}

main().finally(() => pool.end()).catch(error => { console.error("CMS image import failed; no publication was changed.", { name: error.name, code: error.code }); process.exitCode = 1; });
