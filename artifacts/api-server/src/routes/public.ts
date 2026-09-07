import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  cmsPublicRoute,
  type CmsContent,
  type CmsDocumentKind,
  GetPublicSitemapQueryParams,
  ListPublishedContentQueryParams,
  validateCmsSnapshot,
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

class PublicContractError extends Error {}

async function marketCandidates(requestedMarket: string, requestedLocale: string) {
  if (requestedLocale !== "en") return null;
  const result = await pool.query(
    `SELECT code,default_locale,fallback_market_code,fallback_locale,is_canonical
     FROM market_editions WHERE enabled=true`,
  );
  const markets = new Map(result.rows.map((row) => [String(row.code), row]));
  const requested = markets.get(requestedMarket);
  if (!requested) return null;
  const candidates: string[] = [];
  const visited = new Set<string>();
  let current: Record<string, any> | undefined = requested;
  while (current && !visited.has(String(current.code)) && candidates.length < 8) {
    const code = String(current.code);
    visited.add(code);
    candidates.push(code);
    current = current.fallback_market_code
      ? markets.get(String(current.fallback_market_code))
      : undefined;
  }
  const canonical = result.rows.find((row) => row.is_canonical);
  if (canonical && !candidates.includes(String(canonical.code))) candidates.push(String(canonical.code));
  if (markets.has("uae") && !candidates.includes("uae")) candidates.push("uae");
  return candidates;
}

async function published(row: Record<string, any>) {
  const validation = validateCmsSnapshot(row.kind as CmsDocumentKind, row.payload, "publish");
  if (!validation.success) {
    throw new PublicContractError(`Published revision ${row.revision_number} is invalid: ${validation.errors.join("; ")}`);
  }
  const snapshot = validation.data;
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
    locale: row.locale,
    requestedMarket: row.requested_market,
    usedFallback: row.market !== row.requested_market,
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
    const candidates = await marketCandidates(market, locale);
    if (!candidates) {
      res.status(404).json({ error: "Market or locale is unavailable." });
      return;
    }
    const result = await pool.query(
      `WITH selected AS (
         SELECT d.id,d.kind,e.market,e.locale,e.published_at,e.updated_at,e.localized_slug,
                r.revision_number,r.payload,
                row_number() OVER (PARTITION BY d.id
                   ORDER BY array_position($2::text[],e.market),e.updated_at DESC,e.id) AS market_rank
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
             AND r.workflow_state='approved'
          WHERE d.status<>'archived' AND e.publication_state='published'
            AND e.published_at<=now() AND ($1::text IS NULL OR d.kind=$1)
             AND e.market=ANY($2::text[])
             AND (d.kind<>'person' OR NOT EXISTS (
               SELECT 1 FROM cms_person_market_availability a
               JOIN market_editions requested ON requested.id=a.market_edition_id
               WHERE a.document_id=d.id AND requested.code=$3 AND a.published_decision='off'
             ))
            AND ${PUBLIC_PAYLOAD_SQL}
       )
       SELECT *,count(*) OVER() total_count,$3::text requested_market
         FROM selected WHERE market_rank=1
         ORDER BY COALESCE((payload->'content'->>'order')::int,0),payload->>'title',published_at DESC
         LIMIT $4 OFFSET $5`,
      [kind, candidates, market, pageSize, (page - 1) * pageSize],
    );
    try {
      const items = await Promise.all(result.rows.map((row) => published(row)));
      res.json({
        ...pageOf(
        items,
        Number(result.rows[0]?.total_count ?? 0),
        page,
        pageSize,
        ),
        market: items[0]?.market ?? market,
        locale,
        requestedMarket: market,
        usedFallback: items.some((item) => item.usedFallback),
      });
    } catch (error) {
      if (error instanceof PublicContractError) {
        req.log.error({ err: error, kind, market }, "Invalid published CMS content");
        res.status(502).json({ error: "Published content failed contract validation." });
        return;
      }
      throw error;
    }
  }),
);

router.get(
  "/public/content/:market/:locale/:kind/:slug",
  asyncRoute(async (req, res) => {
    const { market, locale, kind, slug } = req.params;
    const candidates = await marketCandidates(String(market), String(locale));
    if (!candidates) {
      res.status(404).json({ error: "Market or locale is unavailable." });
      return;
    }
    const result = await pool.query(
      `SELECT d.id,d.kind,e.market,e.locale,e.published_at,e.updated_at,e.localized_slug,
              r.revision_number,r.payload,$3::text requested_market
         FROM cms_documents d
         JOIN cms_market_editions e ON e.document_id=d.id
          JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
            AND r.workflow_state='approved'
        WHERE d.status<>'archived' AND e.publication_state='published'
          AND e.published_at<=now() AND d.kind=$1
          AND COALESCE(r.payload->>'slug',e.localized_slug)=$2
           AND e.market=ANY($4::text[])
            AND (d.kind<>'person' OR NOT EXISTS (
              SELECT 1 FROM cms_person_market_availability a
              JOIN market_editions requested ON requested.id=a.market_edition_id
              WHERE a.document_id=d.id AND requested.code=$3 AND a.published_decision='off'
            ))
            AND ${PUBLIC_PAYLOAD_SQL}
         ORDER BY array_position($4::text[],e.market),e.updated_at DESC,e.id LIMIT 1`,
      [kind, slug, market, candidates],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Published content not found." });
      return;
    }
    try {
      res.json(await published(result.rows[0]));
    } catch (error) {
      if (error instanceof PublicContractError) {
        req.log.error({ err: error, kind, slug, market }, "Invalid published CMS content");
        res.status(502).json({ error: "Published content failed contract validation." });
        return;
      }
      throw error;
    }
  }),
);

router.get("/public/media/:mediaId", asyncRoute(async (req, res) => {
  const asset = await pool.query(
    `SELECT COALESCE(v.storage_key,a.storage_key) storage_key,
       CASE WHEN v.metadata->>'rendition'='webp-1600' THEN 'image/webp' ELSE a.media_type END media_type
       FROM cms_media_assets a
      LEFT JOIN LATERAL (
        SELECT storage_key,metadata FROM cms_media_versions
        WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
      ) v ON true
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
      `SELECT d.kind,e.market,e.locale,e.updated_at,r.payload
         FROM cms_documents d JOIN cms_market_editions e ON e.document_id=d.id
         JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
           AND r.workflow_state='approved'
        WHERE d.status<>'archived' AND e.publication_state='published'
            AND e.published_at<=now() AND ($1::text IS NULL OR e.market=$1)
            AND COALESCE((r.payload->'seo'->>'noIndex')::boolean,false)=false
            AND ${PUBLIC_PAYLOAD_SQL}`,
      [parsed.data.market ?? null],
    );
    const items = result.rows.flatMap((row) => {
      const validation = validateCmsSnapshot(row.kind as CmsDocumentKind, row.payload, "publish");
      if (!validation.success) return [];
      const route = cmsPublicRoute(
        row.kind as CmsDocumentKind,
        validation.data.slug,
        validation.data.content as CmsContent,
      );
      if (!route) return [];
      const suffix = row.market === "uae" ? "" : `?market=${encodeURIComponent(row.market)}`;
      return [{
        url: `${route}${suffix}`,
        updatedAt: row.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      }];
    });
    res.json({ items, generatedAt: new Date() });
  }),
);

export default router;
