import { Router, type IRouter, type Request, type Response } from "express";
import { pipeline } from "node:stream/promises";
import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import {
  ListMediaQueryParams,
  RequestMediaUploadBody,
  FinalizeMediaUploadBody,
  ReviewMediaBody,
  UpdateMediaBody,
} from "@workspace/api-zod";
import {
  authenticate,
  requireCsrf,
  requireMfa,
  type AuthContext,
} from "../lib/auth";
import { audit, pageOf } from "../lib/cms";
import { asyncRoute } from "../lib/http";
import { canAccessAnyContentCapability, type CmsCapability } from "../lib/policy";
import { canAccessEditionTarget } from "./documents";
import { mediaVersionReviewStatus } from "../lib/media-version-governance";
import {
  createMediaUpload,
  assertMediaType,
  deleteMediaStagingObject,
  downloadMediaObject,
  parseByteRange,
  promoteMediaObject,
  MediaObjectValidationError,
  renewMediaUpload,
} from "../lib/object-storage";

const router: IRouter = Router();
router.use("/media", authenticate, requireMfa);
export const protectedMediaDelivery = {
  download: downloadMediaObject,
};
export const mediaStorage = {
  createUpload: createMediaUpload,
  renewUpload: renewMediaUpload,
  promote: promoteMediaObject,
  deleteStaging: deleteMediaStagingObject,
};

const IDEMPOTENCY_KEY_PATTERN = /^[\x21-\x7e]{1,200}$/;

type MediaReferenceTarget = {
  document_id: string;
  market: string;
  locale: string;
};

/**
 * Media is not a global content back door. A referenced asset is inspectable
 * only through an exact document edition the caller can access. Altering
 * metadata/review state requires the capability across every referencing
 * document because one asset version is shared. Unbound pending uploads stay
 * visible only to their uploader (or an administrator).
 */
async function mediaReferenceTargets(mediaId: string): Promise<{
  exists: boolean;
  uploadedByUserId: string | null;
  targets: MediaReferenceTarget[];
  unresolvedReferenceCount: number;
  referenceCount: number;
}> {
  const result = await pool.query(
    `SELECT a.uploaded_by_user_id,r.id reference_id,r.document_id,
            revision.id revision_id,e.market,e.locale
       FROM cms_media_assets a
       LEFT JOIN cms_media_references r ON r.asset_id=a.id
       LEFT JOIN cms_revisions revision
         ON r.field_path='revision:'||revision.id::text
       LEFT JOIN cms_market_editions e ON e.id=revision.edition_id
      WHERE a.id=$1`,
    [mediaId],
  );
  return {
    exists: Boolean(result.rowCount),
    uploadedByUserId: result.rows[0]?.uploaded_by_user_id
      ? String(result.rows[0].uploaded_by_user_id)
      : null,
    targets: result.rows
      .filter((row) => row.reference_id && row.document_id && row.revision_id && row.market && row.locale)
      .map((row) => ({
        document_id: String(row.document_id),
        market: String(row.market),
        locale: String(row.locale),
      })),
    referenceCount: result.rows.filter((row) => row.reference_id).length,
    unresolvedReferenceCount: result.rows.filter((row) =>
      row.reference_id && (!row.document_id || !row.revision_id || !row.market || !row.locale),
    ).length,
  };
}

async function canAccessMedia(
  auth: AuthContext,
  mediaId: string,
  capability: CmsCapability,
  requireEveryReference = false,
): Promise<{ exists: boolean; allowed: boolean }> {
  // Global media administration is a distinct pre-matrix administrator
  // privilege. Referenced assets for configured accounts still flow through
  // the exact source/destination content policy below.
  if (auth.user.role === "administrator" && !auth.user.capabilityMatrixConfigured) {
    return { exists: true, allowed: true };
  }
  const target = await mediaReferenceTargets(mediaId);
  if (!target.exists) return { exists: false, allowed: false };
  if (!target.referenceCount) {
    return {
      exists: true,
      allowed: target.uploadedByUserId === auth.user.id
        && await canAccessAnyContentCapability(auth.user, capability === "view" ? "edit" : capability),
    };
  }
  // A reference without a resolvable `revision:<id>` → edition binding has no
  // safe geography. It never authorizes a read and blocks a shared mutation.
  if (!target.targets.length) return { exists: true, allowed: false };
  const distinct = [...new Map(target.targets.map((entry) => [
    `${entry.document_id}/${entry.market}/${entry.locale}`, entry,
  ])).values()];
  const decisions = await Promise.all(distinct.map((entry) =>
    canAccessEditionTarget(pool, auth, entry.document_id, entry.market, entry.locale, capability),
  ));
  return {
    exists: true,
    allowed: requireEveryReference
      ? target.unresolvedReferenceCount === 0 && decisions.every(Boolean)
      : decisions.some(Boolean),
  };
}

type MediaPermissions = {
  canEdit: boolean;
  canReview: boolean;
  /** Audit history is a separate administrator-only privilege. */
  canInspect: boolean;
};

async function mediaWithPermissions(
  auth: AuthContext,
  row: Record<string, any>,
): Promise<ReturnType<typeof media> & MediaPermissions> {
  const mediaId = String(row.id);
  const [edit, review] = await Promise.all([
    canAccessMedia(auth, mediaId, "edit", true),
    canAccessMedia(auth, mediaId, "review", true),
  ]);
  return {
    ...media(row),
    canEdit: edit.allowed,
    canReview: review.allowed,
    canInspect: auth.user.role === "administrator",
  };
}

async function requireMediaAccess(
  res: Response,
  mediaId: string,
  capability: CmsCapability,
  options: { all?: boolean; conceal?: boolean } = {},
): Promise<boolean> {
  const result = await canAccessMedia(
    res.locals.auth as AuthContext,
    mediaId,
    capability,
    options.all,
  );
  if (result.allowed) return true;
  if (!result.exists || options.conceal) {
    res.status(404).json({ error: "Media asset not found." });
  } else {
    res.status(403).json({ error: "You do not have the required content capability for this media asset." });
  }
  return false;
}

async function requireUnboundMediaCreate(res: Response): Promise<boolean> {
  const auth = res.locals.auth as AuthContext;
  if (await canAccessAnyContentCapability(auth.user, "edit")) return true;
  res.status(403).json({ error: "Edit capability for at least one assigned content geography is required to upload media." });
  return false;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .filter(([, item]) => item !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function deterministicMediaId(userId: string, idempotencyKey: string): string {
  const bytes = createHash("sha256")
    .update("cognirise:media-upload:v1\0")
    .update(userId)
    .update("\0")
    .update(idempotencyKey)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function uploadRequestMatches(row: Record<string, any>, input: Record<string, any>): boolean {
  return row.filename === input.filename &&
    row.original_filename === input.filename &&
    row.media_type === input.mimeType &&
    Number(row.byte_size) === input.size &&
    row.checksum === (input.checksum ?? "pending") &&
    row.collection === (input.collection ?? "website") &&
    (row.linkedin_asset_kind ?? null) === (input.linkedinAssetKind ?? null) &&
    canonicalJson(row.campaign_metadata ?? null) === canonicalJson(input.campaignMetadata ?? null) &&
    canonicalJson(row.motion_metadata ?? null) === canonicalJson(input.motionMetadata ?? null);
}

function uploadResponse(row: Record<string, any>, upload: Awaited<ReturnType<typeof createMediaUpload>>) {
  return {
    media: media(row),
    uploadUrl: upload.uploadUrl,
    method: "PUT",
    headers: {
      "Content-Type": row.media_type,
    },
    expiresAt: upload.expiresAt,
  };
}

type MediaClassification = {
  collection?: "website" | "linkedin" | "motion";
  linkedinAssetKind?: "post" | "header" | null;
  campaignMetadata?: Record<string, unknown> | null;
  motionMetadata?: Record<string, unknown> | null;
};

export function isValidMediaClassification(input: MediaClassification, mimeType?: string): boolean {
  const collection = input.collection ?? "website";
  if (collection === "linkedin") {
    return (input.linkedinAssetKind === "post" || input.linkedinAssetKind === "header") &&
      input.motionMetadata == null && !mimeType?.startsWith("video/");
  }
  if (collection === "motion") {
    return input.linkedinAssetKind == null && input.motionMetadata != null &&
      (mimeType === undefined || mimeType === "video/mp4" || mimeType === "video/webm");
  }
  return input.linkedinAssetKind == null && input.motionMetadata == null &&
    !mimeType?.startsWith("video/");
}

export function isUsableMediaStatus(status: unknown): boolean {
  return status === "active" || status === "ready";
}

export function isPreviewableMediaStatus(status: unknown): boolean {
  return isUsableMediaStatus(status) || status === "pending-review";
}

const RETIRED_MEDIA_FILENAMES = [
  "canon-1.jpg",
  "canon-2.jpg",
  "canon-3.jpg",
  "canon-4.jpg",
  "canon-5.jpg",
] as const;

export function isRetiredMediaFilename(filename: unknown): boolean {
  return typeof filename === "string"
    && RETIRED_MEDIA_FILENAMES.includes(filename.toLowerCase() as (typeof RETIRED_MEDIA_FILENAMES)[number]);
}

export function apiMediaStatus(status: unknown): "pending" | "review" | "ready" | "rejected" | "failed" {
  if (isUsableMediaStatus(status)) return "ready";
  if (status === "pending-review") return "review";
  if (status === "rejected") return "rejected";
  if (status === "failed") return "failed";
  return "pending";
}

export function media(row: Record<string, any>) {
  const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
  const governed = (key: string, legacy: unknown) =>
    Object.hasOwn(metadata, key) ? metadata[key] : legacy ?? null;
  const versionReviewStatus = mediaVersionReviewStatus(metadata);
  const status = versionReviewStatus === "pending"
    ? "review"
    : versionReviewStatus === "rejected"
      ? "rejected"
      : apiMediaStatus(row.status);
  return {
    id: String(row.id),
    versionId: String(row.version_id),
    filename: row.filename,
    objectPath: row.storage_key,
    publicUrl: versionReviewStatus !== "rejected" && isPreviewableMediaStatus(row.status)
      ? `/api/media/${String(row.id)}/file`
      : null,
    mimeType: row.media_type,
    size: row.byte_size,
    width: row.width,
    height: row.height,
    checksum: row.checksum,
    altText: governed("altText", row.alt_text),
    caption: governed("caption", null),
    credit: governed("credit", row.credit),
    collection: row.collection ?? "website",
    linkedinAssetKind: row.linkedin_asset_kind ?? null,
    campaignMetadata: row.campaign_metadata ?? null,
    motionMetadata: governed("motionMetadata", row.motion_metadata),
    focalPoint: governed("focalPoint", null),
    status,
    createdBy: row.uploaded_by_user_id ? String(row.uploaded_by_user_id) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const selectMedia = `SELECT a.*,v.id version_id,v.width,v.height,v.metadata
  FROM cms_media_assets a LEFT JOIN LATERAL (
    SELECT id,width,height,metadata FROM cms_media_versions
    WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
  ) v ON true`;

export const protectedMediaFileSql = `SELECT COALESCE(v.storage_key,a.storage_key) storage_key,
       COALESCE(v.byte_size,a.byte_size) byte_size,
       a.filename,
       CASE WHEN v.metadata->>'rendition'='webp-1600' THEN 'image/webp' ELSE a.media_type END media_type
     FROM cms_media_assets a
     LEFT JOIN LATERAL (
       SELECT storage_key,byte_size,metadata FROM cms_media_versions
       WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
     ) v ON true
      WHERE a.id=$1 AND a.status IN ('active','ready','pending-review')`;

export const protectedMediaDownloadSql = `SELECT COALESCE(v.storage_key,a.storage_key) storage_key,
       COALESCE(v.byte_size,a.byte_size) byte_size,
       a.original_filename filename,a.media_type
     FROM cms_media_assets a
     LEFT JOIN LATERAL (
       SELECT storage_key,byte_size FROM cms_media_versions
       WHERE asset_id=a.id ORDER BY version_number ASC LIMIT 1
     ) v ON true
      WHERE a.id=$1 AND a.status IN ('active','ready','pending-review')`;

export const appendMediaMetadataVersionSql = `INSERT INTO cms_media_versions(
    asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
  SELECT latest.asset_id,latest.version_number+1,latest.storage_key,latest.checksum,
         latest.byte_size,latest.width,latest.height,$2::jsonb
    FROM cms_media_versions latest
   WHERE latest.asset_id=$1
   ORDER BY latest.version_number DESC
   LIMIT 1`;

router.get(
  "/media",
  asyncRoute(async (req, res) => {
    const parsed = ListMediaQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid media filters." });
      return;
    }
    const q = parsed.data as typeof parsed.data & MediaClassification;
    const result = await pool.query(
      `${selectMedia} WHERE lower(a.filename) <> ALL($5::text[])
        AND ($1::text IS NULL OR a.filename ILIKE '%'||$1||'%'
        OR a.alt_text ILIKE '%'||$1||'%')
        AND ($2::text IS NULL OR a.media_type=$2)
        AND ($3::text IS NULL OR a.collection=$3)
        AND ($4::text IS NULL OR a.linkedin_asset_kind=$4)
        ORDER BY a.created_at DESC`,
      [q.search ?? null, q.mimeType ?? null, q.collection ?? null, q.linkedinAssetKind ?? null, RETIRED_MEDIA_FILENAMES],
    );
    const auth = res.locals.auth as AuthContext;
    const visible = await Promise.all(result.rows.map(async (row) =>
      (await canAccessMedia(auth, String(row.id), "view")).allowed
        ? mediaWithPermissions(auth, row)
        : null,
    ));
    const all = visible.filter((item): item is ReturnType<typeof media> & MediaPermissions => item !== null);
    res.json(
      pageOf(
        all.slice((q.page - 1) * q.pageSize, q.page * q.pageSize),
        all.length,
        q.page,
        q.pageSize,
      ),
    );
  }),
);

router.post("/media/upload-requests", requireCsrf, asyncRoute(async (req, res) => {
  if (!await requireUnboundMediaCreate(res)) return;
  const parsed = RequestMediaUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid upload request." });
    return;
  }
  if (isRetiredMediaFilename(parsed.data.filename)) {
    res.status(400).json({ error: "This retired media filename cannot be uploaded." });
    return;
  }
  const input = parsed.data as typeof parsed.data & MediaClassification;
  if (!isValidMediaClassification(input, input.mimeType)) {
    res.status(400).json({ error: "Video must use the motion collection and include governed motion metadata." });
    return;
  }
  try {
    assertMediaType(input.mimeType, input.size);
  } catch {
    res.status(400).json({ error: "Images and PDFs up to 50 MB, or MP4 and WebM video up to 250 MB, are allowed." });
    return;
  }
  const auth = res.locals.auth as AuthContext;
  const idempotencyKey = req.header("idempotency-key");
  if (idempotencyKey !== undefined && !IDEMPOTENCY_KEY_PATTERN.test(idempotencyKey)) {
    res.status(400).json({ error: "Idempotency-Key must contain 1 to 200 visible ASCII characters." });
    return;
  }
  const id = idempotencyKey
    ? deterministicMediaId(auth.user.id, idempotencyKey)
    : crypto.randomUUID();
  try {
    const client = await pool.connect();
    let responseStatus = 201;
    try {
      await client.query("BEGIN");
      const result = await client.query(
      `INSERT INTO cms_media_assets(
          id,storage_key,filename,original_filename,media_type,byte_size,checksum,status,uploaded_by_user_id,
         collection,linkedin_asset_kind,campaign_metadata,motion_metadata)
        VALUES ($1,$2,$3,$3,$4,$5,$6,'pending',$7,$8,$9,$10,$11)
        ON CONFLICT (id) DO NOTHING RETURNING *`,
      [
        id, `pending:${id}`, input.filename, input.mimeType, input.size,
        input.checksum ?? "pending", auth.user.id, input.collection ?? "website",
        input.linkedinAssetKind ?? null, input.campaignMetadata ?? null,
        input.motionMetadata ?? null,
      ],
      );
      let row = result.rows[0] as Record<string, any> | undefined;
      const created = Boolean(row);
      if (!row) {
        const existing = await client.query("SELECT * FROM cms_media_assets WHERE id=$1 FOR UPDATE", [id]);
        row = existing.rows[0];
      }
      if (!row || (idempotencyKey && !uploadRequestMatches(row, input))) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Idempotency-Key is already associated with a different upload request." });
        return;
      }
      if (row.status !== "pending") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "This upload request is already complete and cannot be restarted." });
        return;
      }
      const upload = await mediaStorage.createUpload(id, input.mimeType, input.checksum);
      if (created || row.storage_key === `pending:${id}`) {
        await client.query("UPDATE cms_media_assets SET storage_key=$2 WHERE id=$1 AND status='pending'", [id, upload.objectPath]);
        row.storage_key = upload.objectPath;
        await audit(auth, "media.upload_requested", "media", id, {}, client);
      } else if (row.storage_key !== upload.objectPath) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "This upload request has an invalid staging path." });
        return;
      }
      responseStatus = created ? 201 : 200;
      const response = uploadResponse(row, upload);
      await client.query("COMMIT");
      res.status(responseStatus).json(response);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    req.log.error({ err: error }, "Media upload request failed");
    res.status(503).json({ error: "Media storage is temporarily unavailable." });
  }
}));

router.post("/media/:mediaId/renew-upload", requireCsrf, asyncRoute(async (req, res) => {
  const auth = res.locals.auth as AuthContext;
  if (!await requireMediaAccess(res, String(req.params.mediaId), "edit", { all: true })) return;
  const result = await pool.query("SELECT * FROM cms_media_assets WHERE id=$1", [req.params.mediaId]);
  if (!result.rowCount) {
    res.status(404).json({ error: "Media asset not found." });
    return;
  }
  const row = result.rows[0];
  if (row.uploaded_by_user_id !== auth.user.id
    && !(auth.user.role === "administrator" && !auth.user.capabilityMatrixConfigured)) {
    res.status(403).json({ error: "Only the original uploader or an administrator can renew this upload." });
    return;
  }
  if (row.status !== "pending") {
    res.status(409).json({ error: "Only a pending upload can be renewed." });
    return;
  }
  try {
    const upload = await mediaStorage.renewUpload(
      row.storage_key,
      row.media_type,
      row.checksum === "pending" ? undefined : row.checksum,
    );
    await audit(auth, "media.upload_renewed", "media", String(row.id));
    res.json(uploadResponse(row, upload));
  } catch (error) {
    req.log.error({ err: error }, "Media upload renewal failed");
    res.status(503).json({ error: "Media storage is temporarily unavailable." });
  }
}));

async function deliverProtectedMedia(req: Request, res: Response, attachment: boolean) {
  if (!await requireMediaAccess(res, String(req.params.mediaId), "view", { conceal: true })) return;
  const result = await pool.query(
    attachment ? protectedMediaDownloadSql : protectedMediaFileSql,
    [req.params.mediaId],
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "Usable media asset not found." });
    return;
  }
  try {
    res.set("Cache-Control", "no-store, private");
    if (attachment) {
      const filename = String(result.rows[0].filename ?? "download")
        .replace(/[\r\n"]/g, "_");
      res.set(
        "Content-Disposition",
        `attachment; filename="${filename.replace(/[^\x20-\x7E]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      );
    }
    const size = Number(result.rows[0].byte_size);
    const range = parseByteRange(req.headers.range, size);
    res.set("Accept-Ranges", "bytes");
    if (range === "invalid") {
      res.status(416).set("Content-Range", `bytes */${size}`).end();
      return;
    }
    res.type(result.rows[0].media_type);
    res.set("Content-Length", String(range ? range.end - range.start + 1 : size));
    if (range) res.status(206).set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
    const stream = await protectedMediaDelivery.download(
      result.rows[0].storage_key,
      range ?? undefined,
    );
     const originalListeners = new Map(
       stream.eventNames().map((event) => [event, stream.listeners(event)]),
     );
    try {
      await pipeline(stream, res);
     } finally {
       for (const event of stream.eventNames()) {
         const retained = originalListeners.get(event) ?? [];
         for (const listener of stream.listeners(event)) {
           if (!retained.includes(listener)) stream.removeListener(event, listener);
         }
       }
     }
  } catch {
    if (!res.headersSent) res.status(404).json({ error: "Media object not found." });
    else res.destroy();
  }
}

router.get("/media/:mediaId/file", asyncRoute(async (req, res) => {
  await deliverProtectedMedia(req, res, false);
}));

router.get("/media/:mediaId/download", asyncRoute(async (req, res) => {
  await deliverProtectedMedia(req, res, true);
}));

router.post(
  "/media/:mediaId/review",
  requireCsrf,
  asyncRoute(async (req, res) => {
    if (!await requireMediaAccess(res, String(req.params.mediaId), "review", { all: true })) return;
    const parsed = ReviewMediaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose approve or reject." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const mediaId = String(req.params.mediaId);
    // Orval's Zod generator currently does not honor multi-property OpenAPI
    // `required` arrays for request bodies. Enforce the documented review
    // contract at the server boundary until generated support catches up.
    const reviewInput = parsed.data as typeof parsed.data & {
      sourceRightsApproved?: boolean;
      accessibilityApproved?: boolean;
    };
    const { sourceRightsApproved, accessibilityApproved } = reviewInput;
    if (
      parsed.data.decision === "approve"
      && (!sourceRightsApproved || !accessibilityApproved)
    ) {
      res.status(400).json({ error: "Publisher approval requires documented source rights and accessibility approval." });
      return;
    }
    const nextStatus = parsed.data.decision === "approve" ? "active" : "rejected";
    const action = `media.${parsed.data.decision === "approve" ? "approved" : "rejected"}`;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `UPDATE cms_media_assets
            SET status=$2,updated_at=now()
          WHERE id=$1 AND status='pending-review'
        RETURNING id`,
        [mediaId, nextStatus],
      );
      let versionReview = false;
      if (!result.rowCount) {
        const versionResult = await client.query(
          `UPDATE cms_media_assets
              SET updated_at=now()
            WHERE id=$1 AND status IN ('active','ready')
              AND (
                (SELECT latest.metadata->>'rightsStatus'
                   FROM cms_media_versions latest
                  WHERE latest.asset_id=cms_media_assets.id
                  ORDER BY latest.version_number DESC LIMIT 1)='needs-review'
                OR
                (SELECT latest.metadata->>'accessibilityStatus'
                   FROM cms_media_versions latest
                  WHERE latest.asset_id=cms_media_assets.id
                  ORDER BY latest.version_number DESC LIMIT 1)='needs-review'
              )
           RETURNING id`,
          [mediaId],
        );
        if (!versionResult.rowCount) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Only an awaiting-review asset or metadata version can be reviewed." });
          return;
        }
        versionReview = true;
      }
      if (parsed.data.decision === "approve" || versionReview) {
        const latest = await client.query(
          `SELECT metadata FROM cms_media_versions
             WHERE asset_id=$1 ORDER BY version_number DESC LIMIT 1`,
          [mediaId],
        );
        if (!latest.rowCount) throw new Error("Media has no source version to snapshot.");
        const priorMetadata = latest.rows[0].metadata && typeof latest.rows[0].metadata === "object"
          ? latest.rows[0].metadata as Record<string, unknown>
          : {};
        const clearanceMetadata = {
          ...priorMetadata,
          rightsStatus: parsed.data.decision === "approve" ? "approved-use" : "rejected",
          accessibilityStatus: parsed.data.decision === "approve" ? "approved" : "rejected",
          sourceReview: {
            sourceRightsApproved,
            accessibilityApproved,
            reviewedBy: String(auth.user.id),
          },
        };
        const appended = await client.query(
          appendMediaMetadataVersionSql,
          [mediaId, clearanceMetadata],
        );
        if (!appended.rowCount) throw new Error("Media has no source version to snapshot.");
      }
      const reviewed = await client.query(`${selectMedia} WHERE a.id=$1`, [mediaId]);
      const reviewedAsset = media(reviewed.rows[0]);
      await client.query(
        `INSERT INTO cms_audit_events
          (actor_user_id,actor_label,action,target_type,target_id,metadata)
         VALUES ($1,$2,$3,'media',$4,$5)`,
        [
          auth.user.id,
          auth.user.email,
          action,
          mediaId,
          {
            previousStatus: versionReview ? "active" : "pending-review",
            nextStatus: versionReview ? "active" : nextStatus,
            mediaVersionId: reviewedAsset.versionId,
            ...(parsed.data.decision === "approve"
              ? { sourceRightsApproved, accessibilityApproved }
              : {}),
          },
        ],
      );
      await client.query("COMMIT");
      res.json(await mediaWithPermissions(auth, reviewed.rows[0]));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.get(
  "/media/:mediaId",
  asyncRoute(async (req, res) => {
    if (!await requireMediaAccess(res, String(req.params.mediaId), "view", { conceal: true })) return;
    const result = await pool.query(`${selectMedia} WHERE a.id=$1`, [
      req.params.mediaId,
    ]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Media asset not found." });
      return;
    }
    res.json(await mediaWithPermissions(res.locals.auth as AuthContext, result.rows[0]));
  }),
);

router.get(
  "/media/:mediaId/reference-impact",
  asyncRoute(async (req, res) => {
    if (!await requireMediaAccess(res, String(req.params.mediaId), "view", { conceal: true })) return;
    const result = await pool.query(
      `SELECT r.id reference_id,r.document_id,r.media_version_id,r.field_path,r.created_at,
              d.kind document_kind,d.title document_title,d.canonical_slug,d.status document_status,
              e.market,e.locale
         FROM cms_media_references r
         JOIN cms_documents d ON d.id=r.document_id
          JOIN cms_revisions revision
            ON r.field_path='revision:'||revision.id::text
          JOIN cms_market_editions e ON e.id=revision.edition_id
        WHERE r.asset_id=$1
        ORDER BY d.title,r.field_path,r.id`,
      [req.params.mediaId],
    );
    if (!result.rowCount) {
      const asset = await pool.query("SELECT id FROM cms_media_assets WHERE id=$1", [req.params.mediaId]);
      if (!asset.rowCount) {
        res.status(404).json({ error: "Media asset not found." });
        return;
      }
    }
    const auth = res.locals.auth as AuthContext;
    const visibleRows = (await Promise.all(result.rows.map(async (row) =>
      (await canAccessEditionTarget(
        pool,
        auth,
        String(row.document_id),
        String(row.market),
        String(row.locale),
        "view",
      )) ? row : null,
    ))).filter((row): row is Record<string, any> => row !== null);
    const references = visibleRows.map((row) => ({
      referenceId: String(row.reference_id),
      documentId: String(row.document_id),
      mediaVersionId: row.media_version_id ? String(row.media_version_id) : null,
      fieldPath: row.field_path,
      documentKind: row.document_kind,
      documentTitle: row.document_title,
      canonicalSlug: row.canonical_slug,
      documentStatus: row.document_status,
      createdAt: row.created_at,
    }));
    res.json({
      mediaId: String(req.params.mediaId),
      referenceCount: references.length,
      references,
    });
  }),
);

router.patch(
  "/media/:mediaId",
  requireCsrf,
  asyncRoute(async (req, res) => {
    if (!await requireMediaAccess(res, String(req.params.mediaId), "edit", { all: true })) return;
    const parsed = UpdateMediaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid media update." });
      return;
    }
    const input = parsed.data as typeof parsed.data & MediaClassification;
    const client = await pool.connect();
    let response: ReturnType<typeof media>;
    try {
      await client.query("BEGIN");
      const existing = await client.query(
        `SELECT a.*,v.metadata
           FROM cms_media_assets a
           LEFT JOIN LATERAL (
             SELECT metadata FROM cms_media_versions
              WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
           ) v ON true
          WHERE a.id=$1 FOR UPDATE OF a`,
        [req.params.mediaId],
      );
      if (!existing.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Media asset not found." });
        return;
      }
      const current = existing.rows[0];
      const priorMetadata = current.metadata && typeof current.metadata === "object"
        ? current.metadata as Record<string, unknown>
        : {};
      const effectiveValue = (inputKey: string, metadataKey: string, legacy: unknown) =>
        Object.hasOwn(input, inputKey)
          ? (input as Record<string, unknown>)[inputKey] ?? null
          : Object.hasOwn(priorMetadata, metadataKey)
            ? priorMetadata[metadataKey]
            : legacy ?? null;
      const effectiveClassification: MediaClassification = {
        collection: input.collection ?? current.collection ?? "website",
        linkedinAssetKind: input.collection === "website"
          ? null
          : Object.hasOwn(input, "linkedinAssetKind")
            ? input.linkedinAssetKind
            : current.linkedin_asset_kind,
        motionMetadata: effectiveValue("motionMetadata", "motionMetadata", current.motion_metadata) as Record<string, unknown> | null,
      };
      if (!isValidMediaClassification(effectiveClassification, current.media_type)) {
        await client.query("ROLLBACK");
        res.status(400).json({ error: "Video must use the motion collection and include governed motion metadata." });
        return;
      }
      const updated = await client.query(
        `UPDATE cms_media_assets SET filename=COALESCE($2,filename),
          collection=COALESCE($3,collection),
          linkedin_asset_kind=CASE WHEN $3='website' THEN NULL WHEN $4 THEN $5 ELSE linkedin_asset_kind END,
          campaign_metadata=CASE WHEN $6 THEN $7 ELSE campaign_metadata END,
          motion_metadata=CASE WHEN $8 THEN $9 ELSE motion_metadata END,
          updated_at=now()
         WHERE id=$1 RETURNING id`,
        [
          req.params.mediaId,
          input.filename ?? null,
          input.collection ?? null,
          Object.hasOwn(input, "linkedinAssetKind"),
          input.linkedinAssetKind ?? null,
          Object.hasOwn(input, "campaignMetadata"),
          input.campaignMetadata ?? null,
          Object.hasOwn(input, "motionMetadata"),
          input.motionMetadata ?? null,
        ],
      );
      const governedChanged = ["caption", "altText", "credit", "motionMetadata", "focalPoint"]
        .some((key) => Object.hasOwn(input, key));
      if (governedChanged) {
        const completeMetadata = {
          ...priorMetadata,
          caption: effectiveValue("caption", "caption", null),
          altText: effectiveValue("altText", "altText", current.alt_text),
          credit: effectiveValue("credit", "credit", current.credit),
          motionMetadata: effectiveValue("motionMetadata", "motionMetadata", current.motion_metadata),
          focalPoint: effectiveValue("focalPoint", "focalPoint", null),
          rightsStatus: "needs-review",
          accessibilityStatus: "needs-review",
          sourceReview: null,
        };
        const appended = await client.query(
          appendMediaMetadataVersionSql,
          [req.params.mediaId, completeMetadata],
        );
        if (!appended.rowCount) throw new Error("Media has no source version to snapshot.");
      }
      const selected = await client.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
      response = media(selected.rows[0] ?? updated.rows[0]);
      await audit(
        res.locals.auth as AuthContext,
        "media.updated",
        "media",
        String(req.params.mediaId),
        { mediaVersionId: response.versionId },
        client,
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const permissioned = await pool.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
    res.json(await mediaWithPermissions(
      res.locals.auth as AuthContext,
      permissioned.rows[0] ?? response,
    ));
  }),
);

router.delete(
  "/media/:mediaId",
  requireCsrf,
  asyncRoute(async (req, res) => {
    if (!await requireMediaAccess(res, String(req.params.mediaId), "publish", { all: true })) return;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `DELETE FROM cms_media_assets a WHERE a.id=$1 AND NOT EXISTS(
         SELECT 1 FROM cms_media_references r WHERE r.asset_id=a.id) RETURNING id`,
        [req.params.mediaId],
      );
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Media is in use or does not exist." });
        return;
      }
      await audit(res.locals.auth as AuthContext, "media.deleted", "media", String(req.params.mediaId), {}, client);
      await client.query("COMMIT");
      res.status(204).end();
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post("/media/:mediaId/finalize", requireCsrf, asyncRoute(async (req, res) => {
  const parsed = FinalizeMediaUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid media finalization." });
    return;
  }
  const input = parsed.data as typeof parsed.data & MediaClassification;
  const auth = res.locals.auth as AuthContext;
  if (!await requireMediaAccess(res, String(req.params.mediaId), "edit", { all: true })) return;
  const receipt = createHash("sha256")
    .update(canonicalJson(input))
    .digest("hex");
  const client = await pool.connect();
  let response: ReturnType<typeof media> | undefined;
  let cleanupPath: string | undefined;
  try {
    await client.query("BEGIN");
    const current = await client.query(
      `SELECT a.*,v.metadata latest_metadata
         FROM cms_media_assets a
         LEFT JOIN LATERAL (
           SELECT metadata FROM cms_media_versions
            WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
         ) v ON true
        WHERE a.id=$1 FOR UPDATE OF a`,
      [req.params.mediaId],
    );
    if (!current.rowCount) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Media asset not found." });
      return;
    }
    const row = current.rows[0];
    if (row.uploaded_by_user_id !== auth.user.id
      && !(auth.user.role === "administrator" && !auth.user.capabilityMatrixConfigured)) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "Only the original uploader or an administrator can finalize this upload." });
      return;
    }
    if (row.status !== "pending") {
      if (
        row.latest_metadata?.uploadFinalizationReceipt === receipt &&
        row.latest_metadata?.uploadObjectPath === input.objectPath
      ) {
        const finalized = await client.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
        const finalizedAsset = finalized.rows[0] ?? row;
        await client.query("COMMIT");
        res.json(await mediaWithPermissions(auth, finalizedAsset));
        return;
      }
      await client.query("ROLLBACK");
      res.status(409).json({ error: "This asset is already finalized and cannot be changed by retrying." });
      return;
    }
    if (row.storage_key !== input.objectPath) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "This upload cannot be finalized." });
      return;
    }
    const classification: MediaClassification = {
      collection: input.collection ?? row.collection ?? "website",
      linkedinAssetKind: Object.hasOwn(input, "linkedinAssetKind") ? input.linkedinAssetKind : row.linkedin_asset_kind,
      motionMetadata: Object.hasOwn(input, "motionMetadata") ? input.motionMetadata : row.motion_metadata,
    };
    if (!isValidMediaClassification(classification, row.media_type)) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Video must use the motion collection and include governed motion metadata." });
      return;
    }
    if (input.checksum && row.checksum !== "pending" && input.checksum !== row.checksum) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Finalization checksum does not match the upload request." });
      return;
    }
    const promoted = await mediaStorage.promote(
      input.objectPath,
      row.media_type,
      row.byte_size,
      input.checksum ?? (row.checksum === "pending" ? undefined : row.checksum),
    );
    const metadata = {
      caption: input.caption ?? null,
      altText: input.altText ?? null,
      credit: input.credit ?? null,
      motionMetadata: classification.motionMetadata ?? null,
      duration: promoted.duration ?? null,
      uploadFinalizationReceipt: receipt,
      uploadObjectPath: input.objectPath,
    };
    const result = await client.query(
      `UPDATE cms_media_assets SET storage_key=$2,checksum=$3,alt_text=$4,credit=$5,
       collection=$6,linkedin_asset_kind=$7,
       campaign_metadata=COALESCE($8,campaign_metadata),
        motion_metadata=$9,
         status='pending-review',updated_at=now()
       WHERE id=$1 AND status='pending' RETURNING *`,
      [
        req.params.mediaId,
        promoted.storageKey,
        promoted.checksum,
        input.altText ?? null,
        input.credit ?? null,
        classification.collection,
        classification.linkedinAssetKind ?? null,
        input.campaignMetadata ?? null,
        classification.motionMetadata ?? null,
      ],
    );
    if (!result.rowCount) throw new Error("Concurrent media finalization transition failed.");
    await client.query(
      `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
        VALUES ($1,1,$2,$3,$4,$5,$6,$7)`,
      [req.params.mediaId, promoted.storageKey, promoted.checksum, promoted.size, promoted.width, promoted.height, metadata],
    );
    if (promoted.rendition) {
      await client.query(
        `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,2,$2,$3,$4,$5,$6,$7)`,
        [req.params.mediaId, promoted.rendition.storageKey, promoted.rendition.checksum,
          promoted.rendition.byteSize, promoted.width, promoted.height,
          { ...metadata, rendition: "webp-1600" }],
      );
    }
    const finalized = await client.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
    response = media(finalized.rows[0] ?? result.rows[0]);
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,metadata)
       VALUES ($1,$2,'media.finalized','media',$3,$4)`,
      [
        auth.user.id,
        auth.user.email,
        String(req.params.mediaId),
        { receipt, mediaVersionId: response.versionId },
      ],
    );
    cleanupPath = input.objectPath;
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    if (error instanceof MediaObjectValidationError) {
      res.status(409).json({ error: "Uploaded object verification failed." });
    } else {
      req.log.error({ err: error }, "Media finalization temporarily failed");
      res.status(503).json({ error: "Media finalization is temporarily unavailable; retry safely." });
    }
    return;
  } finally {
    client.release();
  }
  await mediaStorage.deleteStaging(cleanupPath!).catch((error) => {
    req.log.warn({ err: error }, "Finalized media staging cleanup failed");
  });
  const permissioned = await pool.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
  res.json(await mediaWithPermissions(
    res.locals.auth as AuthContext,
    permissioned.rows[0] ?? response,
  ));
}));

export default router;
