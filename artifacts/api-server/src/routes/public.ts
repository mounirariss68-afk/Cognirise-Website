import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  GetPublicSitemapQueryParams,
  ListPublishedContentQueryParams,
} from "@workspace/api-zod";
import { asyncRoute, throttle } from "../lib/http";
import { pageOf } from "../lib/cms";
import { SlidingWindowThrottle } from "../lib/security";
import { downloadMediaObject } from "../lib/object-storage";

const router: IRouter = Router();
const PUBLIC_PAYLOAD_SQL = `(r.payload->>'visibility' IS NULL OR r.payload->>'visibility'='public')
  AND (r.payload->'content'->>'visibility' IS NULL OR r.payload->'content'->>'visibility'='public')
  AND (r.payload->>'confidential' IS NULL OR r.payload->>'confidential' NOT IN ('true','restricted'))
  AND (r.payload->'content'->>'confidential' IS NULL OR r.payload->'content'->>'confidential' NOT IN ('true','restricted'))`;
const publicLimiter = new SlidingWindowThrottle(240, 60_000);
router.use(
  "/public",
  throttle(publicLimiter, (req) => req.ip ?? "unknown"),
);

async function published(row: Record<string, any>, locale: string) {
  const snapshot = row.payload;
  const mediaIds = Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.map(String) : [];
  const assets = await pool.query(
    `SELECT a.*,v.width,v.height,v.metadata FROM cms_media_assets a
      LEFT JOIN LATERAL (SELECT width,height,metadata FROM cms_media_versions
        WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1) v ON true
      WHERE a.id::text=ANY($1::text[]) AND a.status IN ('active','ready')`,
    [mediaIds],
  );
  return {
    id: String(row.id),
    kind: row.kind,
    slug: snapshot.slug ?? row.localized_slug,
    title: snapshot.title,
    summary: snapshot.summary,
    content: snapshot.content,
    seo: snapshot.seo,
    media: assets.rows.map((asset) => ({
      id: String(asset.id), url: `/api/public/media/${asset.id}`, mimeType: asset.media_type,
      width: asset.width ?? null, height: asset.height ?? null, altText: asset.alt_text ?? null,
      caption: asset.metadata?.caption ?? null, credit: asset.credit ?? null,
    })),
    market: row.market,
    locale,
    revision: row.revision_number,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
  };
}

router.get(
  "/public/content",
  asyncRoute(async (req, res) => {
    const parsed = ListPublishedContentQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid content filters." });
      return;
    }
    const { page, pageSize, market, locale = "en" } = parsed.data;
    const kind = parsed.data.kind ?? null;
    const result = await pool.query(
      `WITH selected AS (
         SELECT d.id,d.kind,e.market,e.published_at,e.updated_at,e.localized_slug,
                r.revision_number,r.payload,
                row_number() OVER (PARTITION BY d.id
                  ORDER BY CASE WHEN e.market=$2 THEN 0 ELSE 1 END) AS market_rank
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
             AND r.workflow_state='approved'
          WHERE d.status<>'archived' AND e.publication_state='published'
            AND e.published_at<=now() AND ($1::text IS NULL OR d.kind=$1)
            AND e.market IN ($2,'uae')
            AND ${PUBLIC_PAYLOAD_SQL}
       )
       SELECT *,count(*) OVER() total_count FROM selected WHERE market_rank=1
        ORDER BY published_at DESC
        LIMIT $3 OFFSET $4`,
      [kind, market, pageSize, (page - 1) * pageSize],
    );
    res.json(
      pageOf(
        await Promise.all(result.rows.map((row) => published(row, locale))),
        Number(result.rows[0]?.total_count ?? 0),
        page,
        pageSize,
      ),
    );
  }),
);

router.get(
  "/public/content/:market/:locale/:kind/:slug",
  asyncRoute(async (req, res) => {
    const { market, locale, kind, slug } = req.params;
    const result = await pool.query(
      `SELECT d.id,d.kind,e.market,e.published_at,e.updated_at,e.localized_slug,
              r.revision_number,r.payload
         FROM cms_documents d
         JOIN cms_market_editions e ON e.document_id=d.id
          JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
            AND r.workflow_state='approved'
        WHERE d.status<>'archived' AND e.publication_state='published'
          AND e.published_at<=now() AND d.kind=$1
          AND COALESCE(r.payload->>'slug',e.localized_slug)=$2
           AND e.market IN ($3,'uae')
            AND ${PUBLIC_PAYLOAD_SQL}
        ORDER BY CASE WHEN e.market=$3 THEN 0 ELSE 1 END LIMIT 1`,
      [kind, slug, market],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Published content not found." });
      return;
    }
    res.json(await published(result.rows[0], String(locale)));
  }),
);

router.get("/public/media/:mediaId", asyncRoute(async (req, res) => {
  const asset = await pool.query(
    `SELECT a.storage_key,a.media_type FROM cms_media_assets a
      JOIN cms_market_editions e ON e.publication_state='published' AND e.published_at<=now()
      JOIN cms_documents d ON d.id=e.document_id
      JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
        AND r.workflow_state='approved'
      WHERE a.id=$1 AND a.status IN ('active','ready') AND d.status<>'archived'
       AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(r.payload->'mediaIds','[]'::jsonb)) media_id
         WHERE media_id=a.id::text)
       AND ${PUBLIC_PAYLOAD_SQL} LIMIT 1`,
    [req.params.mediaId],
  );
  if (!asset.rowCount) { res.status(404).json({ error: "Public media not found." }); return; }
  res.type(asset.rows[0].media_type);
  const stream = await downloadMediaObject(asset.rows[0].storage_key);
  stream.on("error", () => res.destroy());
  stream.pipe(res);
}));

router.get(
  "/public/sitemap",
  asyncRoute(async (req, res) => {
    const parsed = GetPublicSitemapQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid sitemap filters." });
      return;
    }
    const result = await pool.query(
      `SELECT d.kind,e.updated_at,r.payload,ARRAY[e.market] markets
         FROM cms_documents d JOIN cms_market_editions e ON e.document_id=d.id
         JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
           AND r.workflow_state='approved'
        WHERE d.status<>'archived' AND e.publication_state='published'
           AND e.published_at<=now() AND ($1::text IS NULL OR e.market=$1)
            AND ${PUBLIC_PAYLOAD_SQL}`,
      [parsed.data.market ?? null],
    );
    const items = result.rows.flatMap((row) => {
      const markets: string[] = parsed.data.market ? [parsed.data.market] : row.markets;
      return markets.map((market) => ({
        url: `/${market}/${parsed.data.locale ?? "en"}/${row.kind}/${row.payload.slug}`,
        updatedAt: row.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      }));
    });
    res.json({ items, generatedAt: new Date() });
  }),
);

export default router;
