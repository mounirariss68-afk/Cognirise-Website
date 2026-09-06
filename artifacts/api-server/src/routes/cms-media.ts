import { randomUUID } from "node:crypto";
import type { Readable } from "node:stream";
import { and, desc, eq, isNull } from "drizzle-orm";
import { cmsDocumentsTable, cmsMarketEditionsTable, cmsMediaAssetsTable, cmsMediaReferencesTable, cmsMediaVersionsTable, cmsRevisionsTable, db } from "@workspace/db";
import { Router, type IRouter, type Request, type Response } from "express";
import { principalForRequest, requireSameOrigin } from "../lib/cms/auth";
import { cmsEditionPayloadSchema } from "../lib/cms/contracts";
import { mediaReferences } from "../lib/cms/media-references";
import { CmsObjectStorage } from "../lib/cms/object-storage";

type CmsPrincipal = NonNullable<Awaited<ReturnType<typeof principalForRequest>>>;
export type CmsPrincipalResolver = (req: Request) => Promise<CmsPrincipal | undefined>;

export interface CmsMediaStorage {
  createPendingPath(mediaId: string): string;
  signPut(objectPath: string): Promise<string>;
  fileMetadata(objectPath: string): Promise<{ contentType?: string; size?: string; md5Hash?: string; generation?: string; metadata?: Record<string, string> } | undefined>;
  file(objectPath: string, generation?: string): {
    getMetadata(): PromiseLike<readonly [{ contentType?: string; size?: string | number; md5Hash?: string; generation?: string | number }, ...unknown[]]>;
    createReadStream(): Readable;
  };
}

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "application/pdf"]);
const maxBytes = 25 * 1024 * 1024;
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const isString = (value: unknown, max: number) => typeof value === "string" && value.length <= max;

async function principal(req: Request, res: Response, resolvePrincipal: CmsPrincipalResolver): Promise<CmsPrincipal | undefined> {
  const user = await resolvePrincipal(req);
  if (!user) res.status(401).json({ error: "CMS authentication required" });
  return user;
}
function canManage(user: CmsPrincipal) {
  return ["author", "regionalEditor", "publisher", "admin"].includes(user.role);
}

export function createCmsMediaRouter(
  storage: CmsMediaStorage = new CmsObjectStorage(),
  resolvePrincipal: CmsPrincipalResolver = principalForRequest,
): IRouter {
const router: IRouter = Router();

router.get("/cms/admin/media", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  if (!canManage(user)) { res.status(403).json({ error: "Media access denied" }); return; }
  const assets = await db.select().from(cmsMediaAssetsTable).orderBy(desc(cmsMediaAssetsTable.updatedAt));
  const visibleAssets = user.role === "admin" ? assets : assets.filter((asset) => asset.createdByPrincipalId === user.id);
  const versions = await db.select().from(cmsMediaVersionsTable).orderBy(desc(cmsMediaVersionsTable.version));
  const latestVersionByMediaId = new Map<string, typeof versions[number]>();
  for (const version of versions) {
    if (!latestVersionByMediaId.has(version.mediaId)) latestVersionByMediaId.set(version.mediaId, version);
  }
  res.json({
    media: visibleAssets.map((asset) => {
      const version = latestVersionByMediaId.get(asset.id);
      return {
        ...asset,
        latestVersion: version ? {
          mediaId: version.mediaId,
          version: version.version,
          contentType: version.contentType,
          byteSize: version.byteSize,
          checksum: version.checksum,
          metadata: version.metadata,
          createdAt: version.createdAt,
          previewUrl: `/api/cms/admin/media/${encodeURIComponent(asset.id)}/versions/${version.version}/preview`,
        } : null,
      };
    }),
  });
});
router.get("/cms/admin/media/:mediaId/versions/:version", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  if (!canManage(user)) { res.status(403).json({ error: "Media access denied" }); return; }
  const mediaId = first(req.params.mediaId) ?? "";
  const versionNumber = Number(first(req.params.version));
  if (!Number.isInteger(versionNumber) || versionNumber < 1) { res.status(400).json({ error: "Invalid media version" }); return; }
  const [asset] = await db.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, mediaId)).limit(1);
  if (!asset) { res.status(404).json({ error: "Media asset not found" }); return; }
  if (asset.createdByPrincipalId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Media access denied" }); return; }
  if (asset.rightsExpiresAt && asset.rightsExpiresAt <= new Date()) { res.status(403).json({ error: "Media rights have expired" }); return; }
  const [version] = await db.select().from(cmsMediaVersionsTable).where(and(eq(cmsMediaVersionsTable.mediaId, mediaId), eq(cmsMediaVersionsTable.version, versionNumber))).limit(1);
  if (!version?.objectPath) { res.status(404).json({ error: "Media version not found" }); return; }
  res.json({
    mediaId,
    version: version.version,
    contentType: version.contentType,
    byteSize: version.byteSize,
    checksum: version.checksum,
    metadata: version.metadata,
    createdAt: version.createdAt,
    previewUrl: `/api/cms/admin/media/${encodeURIComponent(mediaId)}/versions/${version.version}/preview`,
  });
});
router.get("/cms/admin/media/:mediaId/versions/:version/preview", async (req, res): Promise<void> => {
  res.set("Cache-Control", "no-store");
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  if (!canManage(user)) { res.status(403).json({ error: "Media access denied" }); return; }
  const mediaId = first(req.params.mediaId) ?? "";
  const versionNumber = Number(first(req.params.version));
  if (!Number.isInteger(versionNumber) || versionNumber < 1) { res.status(400).json({ error: "Invalid media version" }); return; }
  const [asset] = await db.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, mediaId)).limit(1);
  if (!asset) { res.status(404).json({ error: "Media asset not found" }); return; }
  if (asset.createdByPrincipalId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Media access denied" }); return; }
  if (asset.rightsExpiresAt && asset.rightsExpiresAt <= new Date()) { res.status(403).json({ error: "Media rights have expired" }); return; }
  const [version] = await db.select().from(cmsMediaVersionsTable).where(and(eq(cmsMediaVersionsTable.mediaId, mediaId), eq(cmsMediaVersionsTable.version, versionNumber))).limit(1);
  if (!version?.objectPath) { res.status(404).json({ error: "Media version not found" }); return; }
  try {
    const storageGeneration = typeof version.metadata.storageGeneration === "string"
      ? version.metadata.storageGeneration
      : undefined;
    const file = storage.file(version.objectPath, storageGeneration); const [metadata] = await file.getMetadata();
    if ((storageGeneration && String(metadata.generation) !== storageGeneration) ||
      (version.contentType && metadata.contentType !== version.contentType) ||
      (version.byteSize !== null && Number(metadata.size) !== version.byteSize) ||
      (version.checksum && metadata.md5Hash !== version.checksum)) {
      res.status(404).json({ error: "Media object no longer matches its immutable version" }); return;
    }
    res.set("Content-Type", String(metadata.contentType ?? version.contentType ?? "application/octet-stream"));
    res.set("Content-Disposition", "inline");
    if (metadata.size) res.set("Content-Length", String(metadata.size));
    const stream = file.createReadStream();
    stream.once("error", (error) => {
      if (!res.headersSent) res.status(404).json({ error: "Media object not found" });
      else res.destroy(error);
    });
    stream.pipe(res);
  } catch { res.status(404).json({ error: "Media object not found" }); }
});
router.post("/cms/admin/media/upload-intent", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  if (!canManage(user)) { res.status(403).json({ error: "Media upload is not permitted" }); return; }
  const body = req.body as Record<string, unknown>;
  if (!body || !isString(body.title, 240) || (body.altText !== undefined && !isString(body.altText, 1000)) ||
    typeof body.decorative !== "boolean" || typeof body.contentType !== "string" || !allowedTypes.has(body.contentType) ||
    !Number.isInteger(body.size) || (body.size as number) < 1 || (body.size as number) > maxBytes) {
    res.status(400).json({ error: "Invalid media upload metadata" }); return;
  }
  const mediaId = `media-${randomUUID()}`; const objectPath = storage.createPendingPath(mediaId); const expiresAt = new Date(Date.now() + 15 * 60_000);
  try {
    const uploadUrl = await storage.signPut(objectPath);
    await db.insert(cmsMediaAssetsTable).values({
      id: mediaId, kind: body.contentType === "application/pdf" ? "document" : "image", title: body.title as string,
      altText: typeof body.altText === "string" ? body.altText : null, decorative: body.decorative,
      lifecycleState: "pending", pendingObjectPath: objectPath, pendingContentType: body.contentType,
      pendingByteSize: body.size as number, pendingExpiresAt: expiresAt, createdByPrincipalId: user.id,
    });
    res.status(201).json({ mediaId, objectPath, uploadUrl, expiresAt });
  } catch { res.status(503).json({ error: "Media upload storage is unavailable" }); }
});
router.post("/cms/admin/media/finalize", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  const body = req.body as Record<string, unknown>;
  if (!body || typeof body.mediaId !== "string" || typeof body.objectPath !== "string") { res.status(400).json({ error: "mediaId and objectPath are required" }); return; }
  const [asset] = await db.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, body.mediaId)).limit(1);
  if (!asset) { res.status(404).json({ error: "Media asset not found" }); return; }
  if (asset.createdByPrincipalId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Media access denied" }); return; }
  if (asset.lifecycleState !== "pending" || asset.pendingObjectPath !== body.objectPath || !asset.pendingExpiresAt || asset.pendingExpiresAt <= new Date()) { res.status(409).json({ error: "Upload intent is invalid or expired" }); return; }
  try {
    const metadata = await storage.fileMetadata(body.objectPath);
    const size = Number(metadata?.size);
    if (!metadata || !metadata.contentType || metadata.contentType !== asset.pendingContentType || size !== asset.pendingByteSize || !allowedTypes.has(metadata.contentType) || !Number.isSafeInteger(size) || typeof metadata.generation !== "string") {
      res.status(400).json({ error: "Uploaded object does not match its upload intent" }); return;
    }
    const [version] = await db.insert(cmsMediaVersionsTable).values({
      mediaId: asset.id, version: 1, objectPath: body.objectPath, contentType: metadata.contentType, byteSize: size,
      checksum: metadata.md5Hash ?? null, metadata: { ...(metadata.metadata ?? {}), storageGeneration: metadata.generation }, createdByPrincipalId: user.id,
    }).returning();
    const [updated] = await db.update(cmsMediaAssetsTable).set({ lifecycleState: "draft", pendingObjectPath: null, pendingContentType: null, pendingByteSize: null, pendingExpiresAt: null }).where(eq(cmsMediaAssetsTable.id, asset.id)).returning();
    res.json({ media: updated, version });
  } catch { res.status(503).json({ error: "Unable to verify uploaded object" }); }
});
router.patch("/cms/admin/media/:mediaId", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  const body = req.body as Record<string, unknown>;
  if (!body || Object.keys(body).some((key) => !["title", "altText", "decorative", "caption", "rightsOwner", "lifecycleState"].includes(key)) ||
    (body.title !== undefined && !isString(body.title, 240)) || (body.altText !== undefined && body.altText !== null && !isString(body.altText, 1000)) ||
    (body.decorative !== undefined && typeof body.decorative !== "boolean") || (body.lifecycleState !== undefined && !["draft", "published", "archived"].includes(String(body.lifecycleState)))) { res.status(400).json({ error: "Invalid media update" }); return; }
  const [asset] = await db.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, first(req.params.mediaId) ?? "")).limit(1);
  if (!asset) { res.status(404).json({ error: "Media asset not found" }); return; }
  if (asset.createdByPrincipalId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Media access denied" }); return; }
  if (body.lifecycleState === "published" && !["publisher", "admin"].includes(user.role)) { res.status(403).json({ error: "Publishing media requires publisher role" }); return; }
  const [updated] = await db.update(cmsMediaAssetsTable).set({
    ...(typeof body.title === "string" ? { title: body.title } : {}),
    ...(body.altText === null || typeof body.altText === "string" ? { altText: body.altText } : {}),
    ...(typeof body.decorative === "boolean" ? { decorative: body.decorative } : {}),
    ...(typeof body.caption === "string" ? { caption: body.caption } : {}),
    ...(typeof body.rightsOwner === "string" ? { rightsOwner: body.rightsOwner } : {}),
    ...(typeof body.lifecycleState === "string" ? { lifecycleState: body.lifecycleState } : {}),
  }).where(eq(cmsMediaAssetsTable.id, asset.id)).returning();
  res.json({ media: updated });
});
router.delete("/cms/admin/media/:mediaId", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const user = await principal(req, res, resolvePrincipal); if (!user) return;
  const [asset] = await db.select().from(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, first(req.params.mediaId) ?? "")).limit(1);
  if (!asset) { res.status(404).json({ error: "Media asset not found" }); return; }
  if (asset.createdByPrincipalId !== user.id && user.role !== "admin") { res.status(403).json({ error: "Media access denied" }); return; }
  await db.update(cmsMediaAssetsTable).set({ lifecycleState: "archived" }).where(eq(cmsMediaAssetsTable.id, asset.id));
  res.sendStatus(204);
});
router.get("/cms/media/:mediaId/versions/:version", async (req, res): Promise<void> => {
  const versionNumber = Number(first(req.params.version)); if (!Number.isInteger(versionNumber) || versionNumber < 1) { res.status(400).json({ error: "Invalid media version" }); return; }
  const [asset] = await db.select().from(cmsMediaAssetsTable).where(and(eq(cmsMediaAssetsTable.id, first(req.params.mediaId) ?? ""), eq(cmsMediaAssetsTable.lifecycleState, "published"))).limit(1);
  const [version] = asset ? await db.select().from(cmsMediaVersionsTable).where(and(eq(cmsMediaVersionsTable.mediaId, asset.id), eq(cmsMediaVersionsTable.version, versionNumber))).limit(1) : [];
  const now = new Date();
  if (!asset || (asset.rightsExpiresAt && asset.rightsExpiresAt <= now) || !version?.objectPath) { res.status(404).json({ error: "Media not found" }); return; }
  const references = await db.select({
    document: cmsDocumentsTable,
    edition: cmsMarketEditionsTable,
    revision: cmsRevisionsTable,
    fieldPath: cmsMediaReferencesTable.fieldPath,
  })
    .from(cmsMediaReferencesTable)
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMediaReferencesTable.revisionId))
    .innerJoin(cmsMarketEditionsTable, eq(cmsMarketEditionsTable.id, cmsRevisionsTable.editionId))
    .innerJoin(cmsDocumentsTable, eq(cmsDocumentsTable.id, cmsMarketEditionsTable.documentId))
    .where(and(
      eq(cmsMediaReferencesTable.mediaId, asset.id),
      eq(cmsMediaReferencesTable.mediaVersion, versionNumber),
      eq(cmsRevisionsTable.id, cmsMarketEditionsTable.liveRevisionId),
      eq(cmsDocumentsTable.contentClass, "public"),
      isNull(cmsDocumentsTable.archivedAt),
    ));
  if (!references.some(({ document, edition, revision, fieldPath }) => {
    if (edition.publicationState !== "published" ||
      !["canonical", "override"].includes(edition.fallbackMode) ||
      (edition.publishAt && edition.publishAt > now) ||
      (edition.expiresAt && edition.expiresAt <= now)) return false;
    const parsed = cmsEditionPayloadSchema.safeParse(revision.payload);
    return parsed.success &&
      parsed.data.documentId === document.id &&
      parsed.data.market === edition.market &&
      parsed.data.fallbackMode === edition.fallbackMode &&
      parsed.data.content.kind === document.kind &&
      parsed.data.content.ownership.sensitivity === "public" &&
      mediaReferences(parsed.data.content).some((reference) =>
        reference.mediaId === asset.id && reference.fieldPath === fieldPath);
  })) { res.status(404).json({ error: "Media is not publicly referenced" }); return; }
  try {
    const storageGeneration = typeof version.metadata.storageGeneration === "string"
      ? version.metadata.storageGeneration
      : undefined;
    const file = storage.file(version.objectPath, storageGeneration); const [metadata] = await file.getMetadata();
    if ((storageGeneration && String(metadata.generation) !== storageGeneration) ||
      (version.contentType && metadata.contentType !== version.contentType) ||
      (version.byteSize !== null && Number(metadata.size) !== version.byteSize) ||
      (version.checksum && metadata.md5Hash !== version.checksum)) {
      res.status(404).json({ error: "Media object no longer matches its immutable version" }); return;
    }
    res.set("Content-Type", String(metadata.contentType ?? version.contentType ?? "application/octet-stream"));
    res.set("Cache-Control", "public, max-age=31536000, immutable"); if (metadata.size) res.set("Content-Length", String(metadata.size));
    const stream = file.createReadStream();
    stream.once("error", (error) => {
      if (!res.headersSent) {
        res.status(404).json({ error: "Media object not found" });
      } else {
        res.destroy(error);
      }
    });
    stream.pipe(res);
  } catch { res.status(404).json({ error: "Media object not found" }); }
});
return router;
}

export default createCmsMediaRouter();