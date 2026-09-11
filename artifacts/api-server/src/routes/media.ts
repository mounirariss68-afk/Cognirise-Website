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
  requireEditor,
  requireMfa,
  requirePublisher,
  type AuthContext,
} from "../lib/auth";
import { audit, pageOf } from "../lib/cms";
import { asyncRoute } from "../lib/http";
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
  return {
    id: String(row.id),
    versionId: String(row.version_id),
    filename: row.filename,
    objectPath: row.storage_key,
    publicUrl: isPreviewableMediaStatus(row.status)
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
    status: apiMediaStatus(row.status),
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
      `${selectMedia} WHERE ($1::text IS NULL OR a.filename ILIKE '%'||$1||'%'
        OR a.alt_text ILIKE '%'||$1||'%')
        AND ($2::text IS NULL OR a.media_type=$2)
        AND ($3::text IS NULL OR a.collection=$3)
        AND ($4::text IS NULL OR a.linkedin_asset_kind=$4)
        ORDER BY a.created_at DESC`,
      [q.search ?? null, q.mimeType ?? null, q.collection ?? null, q.linkedinAssetKind ?? null],
    );
    const all = result.rows.map(media);
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

router.post("/media/upload-requests", requireCsrf, requireEditor, asyncRoute(async (req, res) => {
  const parsed = RequestMediaUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid upload request." });
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
    const result = await pool.query(
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
      const existing = await pool.query("SELECT * FROM cms_media_assets WHERE id=$1", [id]);
      row = existing.rows[0];
    }
    if (!row || (idempotencyKey && !uploadRequestMatches(row, input))) {
      res.status(409).json({ error: "Idempotency-Key is already associated with a different upload request." });
      return;
    }
    if (row.status !== "pending") {
      res.status(409).json({ error: "This upload request is already complete and cannot be restarted." });
      return;
    }
    const upload = await mediaStorage.createUpload(id, input.mimeType, input.checksum);
    if (created || row.storage_key === `pending:${id}`) {
      await pool.query("UPDATE cms_media_assets SET storage_key=$2 WHERE id=$1 AND status='pending'", [id, upload.objectPath]);
      row.storage_key = upload.objectPath;
      await audit(auth, "media.upload_requested", "media", id);
    } else if (row.storage_key !== upload.objectPath) {
      res.status(409).json({ error: "This upload request has an invalid staging path." });
      return;
    }
    res.status(created ? 201 : 200).json(uploadResponse(row, upload));
  } catch (error) {
    req.log.error({ err: error }, "Media upload request failed");
    res.status(503).json({ error: "Media storage is temporarily unavailable." });
  }
}));

router.post("/media/:mediaId/renew-upload", requireCsrf, requireEditor, asyncRoute(async (req, res) => {
  const auth = res.locals.auth as AuthContext;
  const result = await pool.query("SELECT * FROM cms_media_assets WHERE id=$1", [req.params.mediaId]);
  if (!result.rowCount) {
    res.status(404).json({ error: "Media asset not found." });
    return;
  }
  const row = result.rows[0];
  if (row.uploaded_by_user_id !== auth.user.id && auth.user.role !== "administrator") {
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
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = ReviewMediaBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Choose approve or reject." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const mediaId = String(req.params.mediaId);
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
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only an awaiting-review asset can be reviewed." });
        return;
      }
      await client.query(
        `INSERT INTO cms_audit_events
          (actor_user_id,actor_label,action,target_type,target_id,metadata)
         VALUES ($1,$2,$3,'media',$4,$5)`,
        [
          auth.user.id,
          auth.user.email,
          action,
          mediaId,
          { previousStatus: "pending-review", nextStatus },
        ],
      );
      const reviewed = await client.query(`${selectMedia} WHERE a.id=$1`, [mediaId]);
      await client.query("COMMIT");
      res.json(media(reviewed.rows[0]));
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
    const result = await pool.query(`${selectMedia} WHERE a.id=$1`, [
      req.params.mediaId,
    ]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Media asset not found." });
      return;
    }
    res.json(media(result.rows[0]));
  }),
);

router.patch(
  "/media/:mediaId",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
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
         alt_text=CASE WHEN $3 THEN $4 ELSE alt_text END,
          credit=CASE WHEN $5 THEN $6 ELSE credit END,
          collection=COALESCE($7,collection),
          linkedin_asset_kind=CASE WHEN $7='website' THEN NULL WHEN $8 THEN $9 ELSE linkedin_asset_kind END,
          campaign_metadata=CASE WHEN $10 THEN $11 ELSE campaign_metadata END,
          motion_metadata=CASE WHEN $12 THEN $13 ELSE motion_metadata END,
          updated_at=now()
         WHERE id=$1 RETURNING id`,
        [
          req.params.mediaId, input.filename ?? null,
          Object.hasOwn(input, "altText"), input.altText ?? null,
          Object.hasOwn(input, "credit"), input.credit ?? null,
          input.collection ?? null,
          Object.hasOwn(input, "linkedinAssetKind"), input.linkedinAssetKind ?? null,
          Object.hasOwn(input, "campaignMetadata"), input.campaignMetadata ?? null,
          Object.hasOwn(input, "motionMetadata"), input.motionMetadata ?? null,
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
        };
        const appended = await client.query(
          appendMediaMetadataVersionSql,
          [req.params.mediaId, completeMetadata],
        );
        if (!appended.rowCount) throw new Error("Media has no source version to snapshot.");
      }
      const selected = await client.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
      response = media(selected.rows[0] ?? updated.rows[0]);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(res.locals.auth as AuthContext, "media.updated", "media", String(req.params.mediaId));
    res.json(response);
  }),
);

router.delete(
  "/media/:mediaId",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `DELETE FROM cms_media_assets a WHERE a.id=$1 AND NOT EXISTS(
       SELECT 1 FROM cms_media_references r WHERE r.asset_id=a.id) RETURNING id`,
      [req.params.mediaId],
    );
    if (!result.rowCount) {
      res.status(409).json({ error: "Media is in use or does not exist." });
      return;
    }
    await audit(res.locals.auth as AuthContext, "media.deleted", "media", String(req.params.mediaId));
    res.status(204).end();
  }),
);

router.post("/media/:mediaId/finalize", requireCsrf, requireEditor, asyncRoute(async (req, res) => {
  const parsed = FinalizeMediaUploadBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid media finalization." });
    return;
  }
  const input = parsed.data as typeof parsed.data & MediaClassification;
  const auth = res.locals.auth as AuthContext;
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
    if (row.uploaded_by_user_id !== auth.user.id && auth.user.role !== "administrator") {
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
        await client.query("COMMIT");
        res.json(media(finalized.rows[0] ?? row));
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
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,metadata)
       VALUES ($1,$2,'media.finalized','media',$3,$4)`,
      [auth.user.id, auth.user.email, String(req.params.mediaId), { receipt }],
    );
    const finalized = await client.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
    response = media(finalized.rows[0] ?? result.rows[0]);
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
  res.json(response);
}));

export default router;