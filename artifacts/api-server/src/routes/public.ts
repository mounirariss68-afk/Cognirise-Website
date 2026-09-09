import { Router, type IRouter } from "express";
import { pipeline } from "node:stream/promises";
import { pool } from "@workspace/db";
import {
  CMS_HERO_DOCUMENT_SLUGS,
  CMS_HERO_FILM_SLOTS,
  CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
  contactEmailConfigurationContentSchema,
  cmsPublicRoute,
  type CmsHeroFilmSlot,
  type CmsContent,
  type CmsDocumentKind,
  GetPublicSitemapQueryParams,
  ListPublishedContentQueryParams,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { asyncRoute, throttle } from "../lib/http";
import { pageOf } from "../lib/cms";
import { SlidingWindowThrottle } from "../lib/security";
import { downloadMediaObject, parseByteRange } from "../lib/object-storage";
import { isPublicContentVisible } from "../lib/policy";
import { PUBLIC_KIND_CONFIGURATION_SQL } from "../lib/document-lifecycle-sql";

const router: IRouter = Router();
const PUBLIC_IMMUTABLE_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const publicMediaDelivery = {
  download: downloadMediaObject,
};
const PUBLIC_PAYLOAD_SQL = `(r.payload->>'visibility' IS NULL OR r.payload->>'visibility'='public')
  AND (r.payload->'content'->>'visibility' IS NULL OR r.payload->'content'->>'visibility'='public')
  AND (r.payload->>'confidential' IS NULL OR r.payload->>'confidential' NOT IN ('true','restricted'))
  AND (r.payload->'content'->>'confidential' IS NULL OR r.payload->'content'->>'confidential' NOT IN ('true','restricted'))
  AND (r.payload->'content'->>'disclosure' IS NULL OR r.payload->'content'->>'disclosure'<>'restricted')
  AND (d.kind<>'case-study' OR r.payload->'content'->>'publicEvidenceStatus'='approved')`;
const publicLimiter = new SlidingWindowThrottle(240, 60_000);
router.use(
  "/public",
  throttle(publicLimiter, (req) => req.ip ?? "unknown"),
);

class PublicContractError extends Error {}

function publicSnapshot(row: Record<string, any>) {
  if (!isPublicContentVisible(String(row.kind), row.payload)) return null;
  const validation = validateCmsSnapshot(row.kind as CmsDocumentKind, row.payload, "publish");
  if (!validation.success) return null;
  if (
    row.kind === "case-study" &&
    (validation.data.content as Record<string, unknown>).disclosure === "restricted"
  ) {
    return null;
  }
  return validation.data;
}
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

export function publicMediaUrl(assetId: string, versionId: string) {
  return `/api/public/media/${assetId}/${versionId}`;
}

const HERO_SLOTS = new Set<string>(CMS_HERO_FILM_SLOTS);
const HERO_MIME_TYPES = new Set(["video/mp4", "video/webm"]);

type HeroSource = { mediaId: string; mediaVersionId: string; mimeType: string };

function validateHeroPayload(payload: unknown): {
  posterMediaId: string;
  posterMediaVersionId: string;
  sources: HeroSource[];
} | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const nested = (payload as Record<string, unknown>).content;
  const content = nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : payload as Record<string, unknown>;
  const hero = content.hero;
  if (!hero || typeof hero !== "object" || Array.isArray(hero)) return null;
  const value = hero as Record<string, unknown>;
  if (
    Object.keys(value).sort().join(",") !== "posterMediaId,posterMediaVersionId,sources" ||
    typeof value.posterMediaId !== "string" ||
    typeof value.posterMediaVersionId !== "string" ||
    !Array.isArray(value.sources) ||
    value.sources.length !== 2
  ) return null;
  const sources: HeroSource[] = [];
  for (const source of value.sources) {
    if (!source || typeof source !== "object" || Array.isArray(source)) return null;
    const item = source as Record<string, unknown>;
    if (
      Object.keys(item).sort().join(",") !== "mediaId,mediaVersionId,mimeType" ||
      typeof item.mediaId !== "string" ||
      typeof item.mediaVersionId !== "string" ||
      typeof item.mimeType !== "string" ||
      !HERO_MIME_TYPES.has(item.mimeType)
    ) return null;
    sources.push({
      mediaId: item.mediaId,
      mediaVersionId: item.mediaVersionId,
      mimeType: item.mimeType,
    });
  }
  if (
    new Set(sources.map((source) => source.mimeType)).size !== 2 ||
    sources.some((source) => source.mediaId === value.posterMediaId) ||
    new Set([
      value.posterMediaId,
      ...sources.map((source) => source.mediaId),
    ]).size !== 3
  ) return null;
  return {
    posterMediaId: value.posterMediaId,
    posterMediaVersionId: value.posterMediaVersionId,
    sources,
  };
}

export function heroFilmPayload(slot: string, payload: unknown, rows: Array<Record<string, any>>) {
  if (!HERO_SLOTS.has(slot)) return null;
  const hero = validateHeroPayload(payload);
  if (!hero || rows.length !== 3) return null;
  const expected = [
    { id: hero.posterMediaId, versionId: hero.posterMediaVersionId, mimeType: null },
    ...hero.sources.map((source) => ({
      id: source.mediaId,
      versionId: source.mediaVersionId,
      mimeType: source.mimeType,
    })),
  ];
  const assets = expected.map((wanted) => rows.find((row) =>
    String(row.id) === wanted.id && String(row.version_id) === wanted.versionId &&
    (wanted.mimeType == null ? String(row.media_type).startsWith("image/") : row.media_type === wanted.mimeType)
  ));
  if (assets.some((asset) => !asset) || new Set(assets.map((asset) => String(asset!.id))).size !== 3) return null;
  const poster = assets[0]!;
  return {
    slot,
    poster: {
      mediaId: String(poster.id),
      mediaVersionId: String(poster.version_id),
      url: publicMediaUrl(String(poster.id), String(poster.version_id)),
      mimeType: poster.media_type,
    },
    sources: assets.slice(1).map((asset) => ({
      mediaId: String(asset!.id),
      mediaVersionId: String(asset!.version_id),
      url: publicMediaUrl(String(asset!.id), String(asset!.version_id)),
      mimeType: asset!.media_type,
    })),
  };
}

async function published(row: Record<string, any>, snapshot = publicSnapshot(row)) {
  if (!snapshot) {
    throw new PublicContractError(`Published revision ${row.revision_number} is not eligible for public delivery.`);
  }
  const mediaIds = Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.map(String) : [];
  const assets = await pool.query(
    `SELECT a.*,v.id version_id,v.width,v.height,v.metadata
       FROM cms_media_references ref
       JOIN cms_media_assets a ON a.id=ref.asset_id
       JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
      WHERE ref.document_id=$1 AND ref.field_path=$2
        AND a.id::text=ANY($3::text[]) AND a.status IN ('active','ready')`,
    [String(row.id), `revision:${String(row.revision_id)}`, mediaIds],
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
       id: String(asset.id), versionId: String(asset.version_id),
       url: publicMediaUrl(String(asset.id), String(asset.version_id)), mimeType: asset.media_type,
      width: asset.width ?? null, height: asset.height ?? null,
       duration: Object.hasOwn(asset.metadata ?? {}, "duration") ? asset.metadata.duration : null,
       caption: Object.hasOwn(asset.metadata ?? {}, "caption") ? asset.metadata.caption : null,
       altText: Object.hasOwn(asset.metadata ?? {}, "altText") ? asset.metadata.altText : asset.alt_text ?? null,
       credit: Object.hasOwn(asset.metadata ?? {}, "credit") ? asset.metadata.credit : asset.credit ?? null,
       motionMetadata: Object.hasOwn(asset.metadata ?? {}, "motionMetadata")
         ? asset.metadata.motionMetadata
         : asset.motion_metadata ?? null,
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
                 r.id revision_id,r.revision_number,r.payload,
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
    const configuration = kind
      ? await pool.query(PUBLIC_KIND_CONFIGURATION_SQL, [kind])
      : { rows: [{ is_configured: true }] };
    try {
      const eligibleRows = result.rows.flatMap((row) => {
        const snapshot = publicSnapshot(row);
        if (!snapshot) {
          req.log.error(
            { kind: row.kind, documentId: String(row.id), revision: row.revision_number },
            "Excluded ineligible published CMS content",
          );
          return [];
        }
        return [{ row, snapshot }];
      });
      const items = await Promise.all(
        eligibleRows.map(({ row, snapshot }) => published(row, snapshot)),
      );
      res.json({
        ...pageOf(
          items,
          Math.max(
            items.length,
            Number(result.rows[0]?.total_count ?? 0) - (result.rows.length - items.length),
          ),
          page,
          pageSize,
        ),
        market: items[0]?.market ?? market,
        locale,
        requestedMarket: market,
        usedFallback: items.some((item) => item.usedFallback),
        isConfigured: Boolean(configuration.rows[0]?.is_configured),
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

router.get("/public/hero-films/:slot", asyncRoute(async (req, res) => {
  const slot = String(req.params.slot);
  const market = typeof req.query.market === "string" ? req.query.market : "uae";
  const locale = typeof req.query.locale === "string" ? req.query.locale : "en";
  if (!HERO_SLOTS.has(slot)) {
    res.status(404).json({ error: "Public hero film not found." });
    return;
  }
  const candidates = await marketCandidates(market, locale);
  if (!candidates) {
    res.status(404).json({ error: "Market or locale is unavailable." });
    return;
  }
  const documentSlug = CMS_HERO_DOCUMENT_SLUGS[slot as CmsHeroFilmSlot];
  const result = await pool.query(
    `SELECT d.id,e.market,e.locale,e.published_at,e.updated_at,
            r.id revision_id,r.revision_number,r.payload
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
         AND r.workflow_state='approved'
      WHERE d.kind='site-configuration'
        AND d.canonical_slug=$1
        AND e.market=ANY($2::text[]) AND e.locale=$3
        AND e.publication_state='published' AND e.published_at<=now()
        AND ${PUBLIC_PAYLOAD_SQL}
      ORDER BY array_position($2::text[],e.market),e.updated_at DESC,e.id
      LIMIT 1`,
    [documentSlug, candidates, locale],
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "Public hero film not found." });
    return;
  }
  const row = result.rows[0];
  const validation = validateCmsSnapshot("site-configuration", row.payload, "publish");
  if (!validation.success) {
    res.status(404).json({ error: "Public hero film not found." });
    return;
  }
  const shape = validateHeroPayload(validation.data);
  if (!shape) {
    res.status(404).json({ error: "Public hero film not found." });
    return;
  }
  const ids = [shape.posterMediaId, ...shape.sources.map((source) => source.mediaId)];
  const assets = await pool.query(
    `SELECT a.id,a.media_type,a.status,v.id version_id
       FROM cms_media_references ref
       JOIN cms_media_assets a ON a.id=ref.asset_id AND a.status IN ('active','ready')
       JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
      WHERE ref.document_id=$1 AND ref.field_path=$2
        AND a.id::text=ANY($3::text[])`,
    [String(row.id), `revision:${String(row.revision_id)}`, ids],
  );
  const hero = heroFilmPayload(slot, row.payload, assets.rows);
  if (!hero) {
    res.status(404).json({ error: "Public hero film not found." });
    return;
  }
  res.json({
    ...hero,
    market: row.market,
    locale: row.locale,
    requestedMarket: market,
    usedFallback: row.market !== market,
    revision: row.revision_number,
    publishedAt: row.published_at,
  });
}));

router.get("/public/contact-configuration", asyncRoute(async (req, res) => {
  const market = typeof req.query.market === "string" ? req.query.market : "uae";
  const locale = typeof req.query.locale === "string" ? req.query.locale : "en";
  const candidates = await marketCandidates(market, locale);
  if (!candidates) {
    res.status(404).json({ error: "Market or locale is unavailable." });
    return;
  }
  const result = await pool.query(
    `SELECT d.id,e.market,e.locale,e.published_at,e.updated_at,
            r.id revision_id,r.revision_number,r.payload
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
         AND r.workflow_state='approved'
      WHERE d.kind='site-configuration' AND d.status<>'archived'
        AND d.canonical_slug=$1
        AND e.market=ANY($2::text[]) AND e.locale=$3
        AND e.publication_state='published' AND e.published_at<=now()
      ORDER BY array_position($2::text[],e.market),e.updated_at DESC,e.id
      LIMIT 1`,
    [CMS_CONTACT_EMAIL_DOCUMENT_SLUG, candidates, locale],
  );
  if (!result.rowCount) {
    res.status(404).json({ error: "Public contact configuration not found." });
    return;
  }
  const row = result.rows[0];
  const validation = validateCmsSnapshot("site-configuration", row.payload, "publish");
  const contact = validation.success
    ? contactEmailConfigurationContentSchema.safeParse(validation.data.content)
    : null;
  if (!contact?.success) {
    res.status(404).json({ error: "Public contact configuration not found." });
    return;
  }
  res.json({
    contactEmail: contact.data.contactEmail,
    market: row.market,
    locale: row.locale,
    requestedMarket: market,
    usedFallback: row.market !== market,
    revision: row.revision_number,
    publishedAt: row.published_at,
  });
}));

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
               r.id revision_id,r.revision_number,r.payload,$3::text requested_market
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
      const snapshot = hasPublicDetailRoute(result.rows[0]);
      if (!snapshot) {
        res.status(404).json({ error: "Published content not found." });
        return;
      }
      res.json(await published(result.rows[0], snapshot));
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

router.get("/public/media/:mediaId/:versionId", asyncRoute(async (req, res) => {
  const asset = await pool.query(
    `SELECT v.storage_key,v.byte_size,d.kind,r.payload,
       CASE WHEN v.metadata->>'rendition'='webp-1600' THEN 'image/webp' ELSE a.media_type END media_type
       FROM cms_media_assets a
       JOIN cms_media_versions v ON v.asset_id=a.id AND v.id=$2
      JOIN cms_market_editions e ON e.publication_state='published' AND e.published_at<=now()
      JOIN cms_documents d ON d.id=e.document_id
      JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
        AND r.workflow_state='approved'
       JOIN cms_media_references ref ON ref.document_id=d.id
         AND ref.field_path='revision:'||r.id::text
         AND ref.asset_id=a.id AND ref.media_version_id=v.id
       WHERE a.id=$1 AND a.status IN ('active','ready') AND d.status<>'archived'
        AND EXISTS (SELECT 1 FROM jsonb_array_elements_text(COALESCE(r.payload->'mediaIds','[]'::jsonb)) media_id
          WHERE media_id=a.id::text)
        AND ${PUBLIC_PAYLOAD_SQL}`,
    [req.params.mediaId, req.params.versionId],
  );
  if (!asset.rowCount) { res.status(404).json({ error: "Public media not found." }); return; }
  const publicAsset = asset.rows.find((row) => publicSnapshot(row));
  if (!publicAsset) { res.status(404).json({ error: "Public media not found." }); return; }
  const size = Number(publicAsset.byte_size);
  const range = parseByteRange(req.headers.range, size);
  res.set("Cache-Control", PUBLIC_IMMUTABLE_MEDIA_CACHE_CONTROL);
  res.set("Accept-Ranges", "bytes");
  if (range === "invalid") {
    res.status(416).set("Content-Range", `bytes */${size}`).end();
    return;
  }
  res.type(publicAsset.media_type);
  res.set("Content-Length", String(range ? range.end - range.start + 1 : size));
  if (range) res.status(206).set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
  const stream = await publicMediaDelivery.download(publicAsset.storage_key, range ?? undefined);

  const originalListeners = new Map(
    stream.eventNames().map((event) => [event, stream.listeners(event)]),
  );
  try {
    await pipeline(stream, res);
  } catch {
    if (!res.headersSent) res.status(404).json({ error: "Media object not found." });
    else res.destroy();
  } finally {
    for (const event of stream.eventNames()) {
      const retained = originalListeners.get(event) ?? [];
      for (const listener of stream.listeners(event)) {
        if (!retained.includes(listener)) stream.removeListener(event, listener);
      }
    }
  }
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
      const snapshot = publicSnapshot(row);
      if (!snapshot) return [];
      const route = cmsPublicRoute(
        row.kind as CmsDocumentKind,
        snapshot.slug,
        snapshot.content as CmsContent,
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

function hasPublicDetailRoute(row: Record<string, any>) {
  const snapshot = publicSnapshot(row);
  if (!snapshot) return null;
  if (
    row.kind === "case-study" &&
    (snapshot.content as Record<string, unknown>).variant !== "full"
  ) {
    return null;
  }
  return snapshot;
}
