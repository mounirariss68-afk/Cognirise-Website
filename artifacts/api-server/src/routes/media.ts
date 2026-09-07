import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  ListMediaQueryParams,
  RequestMediaUploadBody,
  FinalizeMediaUploadBody,
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
import { createMediaUpload, assertMediaType, downloadMediaObject, inspectMediaObject, verifyMediaObject } from "../lib/object-storage";

const router: IRouter = Router();
router.use("/media", authenticate, requireMfa);

type MediaClassification = {
  collection?: "website" | "linkedin";
  linkedinAssetKind?: "post" | "header" | null;
  campaignMetadata?: Record<string, unknown> | null;
};

export function isValidMediaClassification(input: MediaClassification): boolean {
  const collection = input.collection ?? "website";
  return collection === "linkedin"
    ? input.linkedinAssetKind === "post" || input.linkedinAssetKind === "header"
    : input.linkedinAssetKind == null;
}

export function isUsableMediaStatus(status: unknown): boolean {
  return status === "active" || status === "ready";
}

export function apiMediaStatus(status: unknown): "pending" | "ready" | "failed" {
  if (isUsableMediaStatus(status)) return "ready";
  if (status === "failed") return "failed";
  return "pending";
}

export function media(row: Record<string, any>) {
  return {
    id: String(row.id),
    filename: row.filename,
    objectPath: row.storage_key,
    publicUrl:
      row.status === "active" || row.status === "ready"
        ? `/api/media/${String(row.id)}/file`
        : null,
    mimeType: row.media_type,
    size: row.byte_size,
    width: row.width,
    height: row.height,
    checksum: row.checksum,
    altText: row.alt_text,
    caption: row.metadata?.caption ?? null,
    credit: row.credit,
    collection: row.collection ?? "website",
    linkedinAssetKind: row.linkedin_asset_kind ?? null,
    campaignMetadata: row.campaign_metadata ?? null,
    focalPoint: row.metadata?.focalPoint ?? null,
    status: apiMediaStatus(row.status),
    createdBy: row.uploaded_by_user_id ? String(row.uploaded_by_user_id) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const selectMedia = `SELECT a.*,v.width,v.height,v.metadata
  FROM cms_media_assets a LEFT JOIN LATERAL (
    SELECT width,height,metadata FROM cms_media_versions
    WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
  ) v ON true`;

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
  if (!isValidMediaClassification(input)) {
    res.status(400).json({ error: "LinkedIn media requires a post or header asset kind; website media must not have one." });
    return;
  }
  try {
    assertMediaType(input.mimeType, input.size);
  } catch {
    res.status(400).json({ error: "Only JPEG, PNG, WebP, AVIF, and PDF files up to 50 MB are allowed." });
    return;
  }
  const auth = res.locals.auth as AuthContext;
  const id = crypto.randomUUID();
  try {
    const upload = await createMediaUpload(id, input.mimeType, input.checksum);
    const result = await pool.query(
      `INSERT INTO cms_media_assets(
         storage_key,filename,media_type,byte_size,checksum,status,uploaded_by_user_id,
         collection,linkedin_asset_kind,campaign_metadata)
       VALUES ($1,$2,$3,$4,$5,'pending',$6,$7,$8,$9) RETURNING *`,
      [
        upload.objectPath, input.filename, input.mimeType, input.size,
        input.checksum ?? "pending", auth.user.id, input.collection ?? "website",
        input.linkedinAssetKind ?? null, input.campaignMetadata ?? null,
      ],
    );
    await audit(auth, "media.upload_requested", "media", id);
    res.status(201).json({ media: media(result.rows[0]), uploadUrl: upload.uploadUrl, method: "PUT", headers: { "Content-Type": input.mimeType, ...(input.checksum ? { "x-goog-meta-checksum": input.checksum } : {}) }, expiresAt: upload.expiresAt });
  } catch (error) {
    req.log.error({ err: error }, "Media upload request failed");
    res.status(503).json({ error: "Media storage is temporarily unavailable." });
  }
}));

router.get("/media/:mediaId/file", asyncRoute(async (req, res) => {
  const result = await pool.query(
    `SELECT COALESCE(v.storage_key,a.storage_key) storage_key,
       CASE WHEN v.metadata->>'rendition'='webp-1600' THEN 'image/webp' ELSE a.media_type END media_type
     FROM cms_media_assets a
     LEFT JOIN LATERAL (
       SELECT storage_key,metadata FROM cms_media_versions
       WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
     ) v ON true
     WHERE a.id=$1 AND a.status IN ('active','ready')`,
    [req.params.mediaId],
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "Usable media asset not found." });
    return;
  }
  try {
    res.type(result.rows[0].media_type);
    downloadMediaObject(result.rows[0].storage_key).then((stream) => stream.pipe(res)).catch(() => {
      if (!res.headersSent) res.status(404).json({ error: "Media object not found." });
      else res.destroy();
    });
  } catch {
    res.status(503).json({ error: "Media storage is temporarily unavailable." });
  }
}));

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
    const existing = await pool.query(
      "SELECT collection,linkedin_asset_kind FROM cms_media_assets WHERE id=$1",
      [req.params.mediaId],
    );
    if (!existing.rowCount) {
      res.status(404).json({ error: "Media asset not found." });
      return;
    }
    const effectiveClassification: MediaClassification = {
      collection: input.collection ?? existing.rows[0].collection ?? "website",
      linkedinAssetKind: input.collection === "website"
        ? null
        : Object.hasOwn(input, "linkedinAssetKind")
          ? input.linkedinAssetKind
          : existing.rows[0].linkedin_asset_kind,
    };
    if (!isValidMediaClassification(effectiveClassification)) {
      res.status(400).json({ error: "LinkedIn media requires a post or header asset kind; website media must not have one." });
      return;
    }
    const result = await pool.query(
      `UPDATE cms_media_assets SET filename=COALESCE($2,filename),
       alt_text=CASE WHEN $3 THEN $4 ELSE alt_text END,
        credit=CASE WHEN $5 THEN $6 ELSE credit END,
        collection=COALESCE($7,collection),
        linkedin_asset_kind=CASE WHEN $7='website' THEN NULL WHEN $8 THEN $9 ELSE linkedin_asset_kind END,
        campaign_metadata=CASE WHEN $10 THEN $11 ELSE campaign_metadata END,
        updated_at=now()
       WHERE id=$1 RETURNING id`,
      [
        req.params.mediaId,
        input.filename ?? null,
        Object.hasOwn(input, "altText"),
        input.altText ?? null,
        Object.hasOwn(input, "credit"),
        input.credit ?? null,
        input.collection ?? null,
        Object.hasOwn(input, "linkedinAssetKind"),
        input.linkedinAssetKind ?? null,
        Object.hasOwn(input, "campaignMetadata"),
        input.campaignMetadata ?? null,
      ],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Media asset not found." });
      return;
    }
    await audit(res.locals.auth as AuthContext, "media.updated", "media", String(req.params.mediaId));
    const updated = await pool.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
    res.json(media(updated.rows[0]));
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
  const current = await pool.query("SELECT * FROM cms_media_assets WHERE id=$1 AND status='pending'", [req.params.mediaId]);
  if (!current.rowCount || current.rows[0].storage_key !== parsed.data.objectPath) {
    res.status(409).json({ error: "This upload cannot be finalized." });
    return;
  }
  const classification: MediaClassification = {
    collection: input.collection ?? current.rows[0].collection ?? "website",
    linkedinAssetKind: Object.hasOwn(input, "linkedinAssetKind") ? input.linkedinAssetKind : current.rows[0].linkedin_asset_kind,
  };
  if (!isValidMediaClassification(classification)) {
    res.status(400).json({ error: "LinkedIn media requires a post or header asset kind; website media must not have one." });
    return;
  }
  try {
    const uploaded = await verifyMediaObject(parsed.data.objectPath, current.rows[0].media_type, current.rows[0].byte_size, current.rows[0].checksum === "pending" ? undefined : current.rows[0].checksum);
    const inspected = await inspectMediaObject(parsed.data.objectPath, current.rows[0].media_type);
    const metadata = { caption: parsed.data.caption ?? null };
    const result = await pool.query(
      `UPDATE cms_media_assets SET checksum=$2,alt_text=$3,credit=$4,
       collection=$5,linkedin_asset_kind=$6,
       campaign_metadata=COALESCE($7,campaign_metadata),
       status='active',updated_at=now() WHERE id=$1 RETURNING *`,
      [
        req.params.mediaId,
        input.checksum ?? uploaded.checksum ?? current.rows[0].checksum,
        input.altText ?? null,
        input.credit ?? null,
        classification.collection,
        classification.linkedinAssetKind ?? null,
        input.campaignMetadata ?? null,
      ],
    );
    await pool.query(
      `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
        VALUES ($1,1,$2,$3,$4,$5,$6,$7)`,
      [req.params.mediaId, parsed.data.objectPath, uploaded.checksum, uploaded.size, inspected.width, inspected.height, metadata],
    );
    if (inspected.rendition) {
      await pool.query(
        `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,2,$2,$3,$4,$5,$6,$7)`,
        [req.params.mediaId, inspected.rendition.storageKey, inspected.rendition.checksum,
          inspected.rendition.byteSize, inspected.width, inspected.height,
          { ...metadata, rendition: "webp-1600" }],
      );
    }
    await audit(res.locals.auth as AuthContext, "media.finalized", "media", String(req.params.mediaId));
    const finalized = await pool.query(`${selectMedia} WHERE a.id=$1`, [req.params.mediaId]);
    res.json(media(finalized.rows[0] ?? result.rows[0]));
  } catch (error) {
    await pool.query("UPDATE cms_media_assets SET status='failed',updated_at=now() WHERE id=$1", [req.params.mediaId]);
    res.status(409).json({ error: "Uploaded object verification failed." });
  }
}));

export default router;