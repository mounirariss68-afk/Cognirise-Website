import { Router, type IRouter } from "express";
import { pipeline } from "node:stream/promises";
import { pool } from "@workspace/db";
import {
  CMS_CONTACT_EMAIL_DOCUMENT_SLUG,
  launchHrefAllowed,
  CMS_HERO_DOCUMENT_SLUGS,
  CMS_HERO_FILM_SLOTS,
  collectCmsMediaReferences,
  contactEmailConfigurationContentSchema,
  cmsPublicRoute,
  isCmsRetiredLandingPagePath,
  type CmsHeroFilmSlot,
  type CmsContent,
  type CmsDocumentKind,
  GetPublicSitemapQueryParams,
  ListPublishedContentQueryParams,
  validateCmsSnapshot,
  validateCmsSnapshotForDelivery,
  projectIndustrySnapshotForMarket,
} from "@workspace/api-zod";
import { asyncRoute, throttle } from "../lib/http";
import { pageOf } from "../lib/cms";
import { SlidingWindowThrottle } from "../lib/security";
import { downloadMediaObject, parseByteRange } from "../lib/object-storage";
import { approvedMediaVersionMetadataSql } from "../lib/media-version-governance";
import { isPublicContentVisible } from "../lib/policy";
import { PUBLIC_KIND_CONFIGURATION_SQL } from "../lib/document-lifecycle-sql";
import { navigationCandidates, isPublishedPageAvailable } from "../lib/navigation-policy";
import {
  documentPublishedAvailabilityClause,
  industryExactMarketDeliveryClause,
  industryDestinationEligibilityClause,
  managedMarketPublicDeliveryClause,
  managedMarketExactMaterializationClause,
  publicPayloadEligibilityClause,
} from "../lib/availability";

const router: IRouter = Router();
const PUBLIC_IMMUTABLE_MEDIA_CACHE_CONTROL = "public, max-age=31536000, immutable";
export const publicMediaDelivery = {
  download: downloadMediaObject,
};
const PUBLIC_PAYLOAD_SQL = publicPayloadEligibilityClause();

/**
 * Custom editions remain independently deliverable through the request's
 * normal candidate chain. A shared edition is deliberately different: its
 * state-selected source edition is the delivery source for every eligible
 * destination, even where the market itself has no fallback chain. The
 * separately frozen published source pointer, rather than state’s editable
 * draft source pointer, must match the edition's approved published revision.
 */
function deliverySourceClause(
  candidateClause: string,
  edition = "e",
  state = "delivery",
  requestedMarketSql?: string,
  requestedLocaleSql?: string,
) {
  // A draft binding is not public authority.  The gate only activates after
  // the exact destination has published its immutable resolved materialization.
  const managedDestination = requestedMarketSql && requestedLocaleSql
    ? `AND ${managedMarketPublicDeliveryClause(
      `${edition}.document_id`,
      edition,
      requestedMarketSql,
      requestedLocaleSql,
    )}`
    : "";
  return `(
    ((
      ${edition}.content_mode='custom'
      OR ${managedMarketExactMaterializationClause(`${edition}.document_id`, edition)}
    ) AND ${candidateClause})
    OR (
      ${edition}.content_mode='shared'
      AND ${edition}.id=${state}.shared_source_edition_id
      AND ${edition}.published_revision_id=${state}.published_source_revision_id
    )
  ) ${managedDestination}`;
}

/**
 * Public media has no destination request, so authorize a reference only when
 * its exact published edition/revision would win public source selection for
 * at least one enabled destination. This is deliberately stronger than a
 * document-wide availability check: an off KSA custom revision cannot publish
 * its media merely because that document's shared UAE source remains on.
 *
 * The candidate CTE mirrors navigationCandidates/marketLocaleCandidates:
 * requested locale, requested default locale, configured fallback chain, then
 * canonical default locale. The winning-source ordering is the public content
 * query's exact-custom, shared, other-custom ordering.
 */
export function referencedRevisionHasEligibleDestinationClause(
  documentIdSql: string,
  editionIdSql: string,
  revisionIdSql: string,
) {
  return `EXISTS (
    SELECT 1
      FROM market_editions destination
      CROSS JOIN LATERAL (
        SELECT DISTINCT locale
          FROM unnest(
            ARRAY[destination.default_locale,destination.fallback_locale]
          ) AS supported_locale(locale)
         WHERE locale IS NOT NULL
      ) destination_locale
     WHERE destination.enabled=true AND destination_locale.locale IS NOT NULL
       AND ${documentPublishedAvailabilityClause(
         documentIdSql,
         "destination.code",
         "destination_locale.locale",
       )}
       AND EXISTS (
         WITH RECURSIVE fallback_chain AS (
           SELECT destination.code,destination.fallback_market_code,
                  destination.fallback_locale,0 AS depth,ARRAY[destination.code]::text[] AS visited
           UNION ALL
           SELECT fallback.code,fallback.fallback_market_code,
                  fallback.fallback_locale,current.depth+1,current.visited || fallback.code
             FROM fallback_chain current
             JOIN market_editions fallback
               ON fallback.code=current.fallback_market_code
              AND fallback.enabled=true
            WHERE current.depth<CASE
                    WHEN destination_locale.locale<>destination.default_locale THEN 14
                    ELSE 15
                  END
              AND NOT fallback.code=ANY(current.visited)
         ),
         candidate_keys AS (
           SELECT destination.code AS market,destination_locale.locale AS locale,0 AS candidate_rank
           UNION ALL
           SELECT destination.code,destination.default_locale,1
            WHERE destination_locale.locale<>destination.default_locale
           UNION ALL
           SELECT fallback.code,COALESCE(current.fallback_locale,fallback.default_locale),current.depth+2
             FROM fallback_chain current
             JOIN market_editions fallback
               ON fallback.code=current.fallback_market_code
              AND fallback.enabled=true
           UNION ALL
           SELECT canonical.code,canonical.default_locale,99
             FROM market_editions canonical
            WHERE canonical.enabled=true AND canonical.is_canonical=true
         ),
         candidates AS (
           SELECT market,locale,min(candidate_rank) AS candidate_rank
             FROM candidate_keys
            GROUP BY market,locale
         ),
         selected_source AS (
           SELECT source_edition.id AS edition_id,source_revision.id AS revision_id
             FROM cms_market_editions source_edition
             LEFT JOIN cms_document_availability_states source_delivery
               ON source_delivery.document_id=source_edition.document_id
             JOIN cms_revisions source_revision
               ON source_revision.id=source_edition.published_revision_id
              AND source_revision.edition_id=source_edition.id
              AND source_revision.workflow_state='approved'
             LEFT JOIN candidates
               ON candidates.market=source_edition.market
              AND candidates.locale=source_edition.locale
            WHERE source_edition.document_id=${documentIdSql}
              AND source_edition.publication_state='published'
              AND source_edition.published_at<=now()
              AND ${publicPayloadEligibilityClause("d", "source_revision")}
              AND ${industryDestinationEligibilityClause(
                "d",
                "source_edition",
                "source_revision",
                "destination.code",
              )}
               AND ${managedMarketPublicDeliveryClause(
                 documentIdSql,
                 "source_edition",
                 "destination.code",
                 "destination_locale.locale",
               )}
              AND (
                ((
                  source_edition.content_mode='custom'
                  OR ${managedMarketExactMaterializationClause(documentIdSql, "source_edition")}
                ) AND candidates.market IS NOT NULL)
                OR (
                  source_edition.content_mode='shared'
                  AND source_edition.id=source_delivery.shared_source_edition_id
                  AND source_edition.published_revision_id=source_delivery.published_source_revision_id
                )
              )
            ORDER BY CASE
              WHEN (
                source_edition.content_mode='custom'
                OR ${managedMarketExactMaterializationClause(documentIdSql, "source_edition")}
              )
               AND source_edition.market=destination.code
               AND source_edition.locale=destination_locale.locale THEN 0
              WHEN source_edition.content_mode='shared' THEN 1
              ELSE 2
            END,
            candidates.candidate_rank,source_edition.updated_at DESC,source_edition.id
            LIMIT 1
         )
         SELECT 1 FROM selected_source
          WHERE selected_source.edition_id=${editionIdSql}
            AND selected_source.revision_id=${revisionIdSql}
       )
  )`;
}

/**
 * A shared sitemap row is hidden only by an exact custom revision that could
 * itself be publicly selected. Merely publishing an edition pointer is not
 * enough: a private, restricted, retired, or unapproved custom revision must
 * not make the publicly eligible shared route disappear.
 */
export function publishedCustomSourceExistsClause(
  documentAlias: string,
  documentIdSql: string,
  marketSql: string,
  localeSql: string,
) {
  return `EXISTS (
    SELECT 1
      FROM cms_market_editions custom
      JOIN cms_revisions custom_revision
        ON custom_revision.id=custom.published_revision_id
       AND custom_revision.edition_id=custom.id
       AND custom_revision.workflow_state='approved'
     WHERE custom.document_id=${documentIdSql}
        AND (
          custom.content_mode='custom'
          OR ${managedMarketExactMaterializationClause(documentIdSql, "custom")}
        )
       AND custom.market=${marketSql}
       AND custom.locale=${localeSql}
       AND custom.publication_state='published'
       AND custom.published_at<=now()
       AND ${publicPayloadEligibilityClause(documentAlias, "custom_revision")}
        AND ${industryDestinationEligibilityClause(
          documentAlias,
          "custom",
          "custom_revision",
          marketSql,
        )}
  )`;
}
const publicLimiter = new SlidingWindowThrottle(240, 60_000);
router.use(
  "/public",
  throttle(publicLimiter, (req) => req.ip ?? "unknown"),
);

class PublicContractError extends Error {}

function publicSnapshot(row: Record<string, any>) {
  if (
    row.kind === "landing-page"
    && row.payload
    && typeof row.payload === "object"
    && !Array.isArray(row.payload)
  ) {
    const content = row.payload.content;
    const pagePath = content && typeof content === "object" && !Array.isArray(content)
      ? content.pagePath ?? row.payload.pagePath
      : row.payload.pagePath;
    if (typeof pagePath === "string" && isCmsRetiredLandingPagePath(pagePath)) return null;
  }
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
  const result = await pool.query(
    `SELECT code,default_locale,fallback_market_code,fallback_locale,is_canonical
     FROM market_editions WHERE enabled=true`,
  );
  const markets = new Map(result.rows.map((row) => [String(row.code), row]));
  const requested = markets.get(requestedMarket);
  if (!requested) return null;
  const supportedLocales = new Set(result.rows.flatMap((row) =>
    [row.default_locale, row.fallback_locale].filter(Boolean).map(String)
  ));
  if (!supportedLocales.has(requestedLocale)) return null;
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

/** Ordered edition keys: requested locale first, then each configured locale
 * fallback and market fallback. This prevents an English row from winning
 * merely because it was updated more recently than the requested locale. */
async function marketLocaleCandidates(requestedMarket: string, requestedLocale: string) {
  const candidates = await navigationCandidates(requestedMarket, requestedLocale);
  return candidates?.map((candidate) => `${candidate.market}|${candidate.locale}`) ?? null;
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
  const mediaIds = [...new Set(collectCmsMediaReferences(
    row.kind as CmsDocumentKind,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [],
    snapshot.seo,
  ).map((reference) => reference.mediaId))];
  const assets = await pool.query(
    `SELECT a.*,v.id version_id,v.width,v.height,v.metadata
       FROM cms_media_references ref
       JOIN cms_media_assets a ON a.id=ref.asset_id
       JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
      WHERE ref.document_id=$1 AND ref.field_path=$2
        AND a.id::text=ANY($3::text[]) AND a.status IN ('active','ready')
        AND ${approvedMediaVersionMetadataSql("v.metadata")}`,
    [String(row.id), `revision:${String(row.revision_id)}`, mediaIds],
  );
  let projectedSnapshot: typeof snapshot;
  try {
    projectedSnapshot = row.kind === "industry"
      ? projectIndustrySnapshotForMarket(
           snapshot,
           String(row.requested_market),
           String(row.editorial_market ?? row.market),
         )
      : snapshot;
  } catch {
    // A historically published shared source can be structurally valid yet
    // incompatible with this delivery market. Treat it as ineligible rather
    // than turning a public miss into a 500/502 contract failure.
    return null;
  }
  const projectedValidation = validateCmsSnapshotForDelivery(
    row.kind as CmsDocumentKind,
    projectedSnapshot,
    "publish",
  );
  if (!projectedValidation.success) {
    throw new PublicContractError(
      `Published revision ${row.revision_number} is invalid after market projection.`,
    );
  }
  return {
    id: String(row.id),
    kind: row.kind,
    slug: projectedValidation.data.slug ?? row.localized_slug,
    title: projectedValidation.data.title,
    summary: projectedValidation.data.summary,
    content: projectedValidation.data.content,
    seo: projectedValidation.data.seo ?? (projectedValidation.data.content as Record<string, unknown>).seo,
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
       focalPoint: Object.hasOwn(asset.metadata ?? {}, "focalPoint")
         ? asset.metadata.focalPoint
         : null,
    })),
    market: row.market,
    locale: row.locale,
    requestedMarket: row.requested_market,
     requestedLocale: row.requested_locale ?? row.locale,
     usedFallback: row.market !== row.requested_market || row.locale !== (row.requested_locale ?? row.locale),
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
    const candidates = await marketLocaleCandidates(market, locale);
    if (!candidates) {
      res.status(404).json({ error: "Market or locale is unavailable." });
      return;
    }
    const result = await pool.query(
      `WITH selected AS (
         SELECT d.id,d.kind,e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,
                e.published_at,e.updated_at,e.localized_slug,
                r.id revision_id,r.revision_number,r.payload,
                row_number() OVER (
                  PARTITION BY d.id
                   ORDER BY CASE
                     WHEN (
                       e.content_mode='custom'
                       OR ${managedMarketExactMaterializationClause("d.id", "e")}
                     ) AND e.market=$3 AND e.locale=$4 THEN 0
                     WHEN e.content_mode='shared' THEN 1
                     ELSE 2
                   END,
                   array_position($2::text[],e.market||'|'||e.locale),e.updated_at DESC,e.id
                ) AS market_rank
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id
            LEFT JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
             AND r.workflow_state='approved'
          WHERE d.status<>'archived' AND e.publication_state='published'
            AND e.published_at<=now() AND ($1::text IS NULL OR d.kind=$1)
              AND ${deliverySourceClause("(e.market||'|'||e.locale)=ANY($2::text[])", "e", "delivery", "$3", "$4")}
            AND ${documentPublishedAvailabilityClause("d.id", "$3", "$4")}
             AND ${industryDestinationEligibilityClause("d", "e", "r", "$3")}
             AND ${industryExactMarketDeliveryClause("d", "e", "$3")}
            AND ${PUBLIC_PAYLOAD_SQL}
       )
       SELECT *,count(*) OVER() total_count,$3::text requested_market,$4::text requested_locale
         FROM selected WHERE market_rank=1
         ORDER BY COALESCE((payload->'content'->>'order')::int,0),payload->>'title',published_at DESC
         LIMIT $5 OFFSET $6`,
      [kind, candidates, market, locale, pageSize, (page - 1) * pageSize],
    );
    const configuration = kind
      ? await pool.query(PUBLIC_KIND_CONFIGURATION_SQL, [kind])
      : { rows: [{ is_configured: true }] };
    try {
      const eligibleRows = (await Promise.all(result.rows.map(async (row) => {
        const snapshot = publicSnapshot(row);
        if (!snapshot) {
          req.log.error(
            { kind: row.kind, documentId: String(row.id), revision: row.revision_number },
            "Excluded ineligible published CMS content",
          );
          return null;
        }
        const route = cmsPublicRoute(
          row.kind as CmsDocumentKind,
          snapshot.slug,
          snapshot.content as CmsContent,
        );
        if (route && !await isPageAvailable(route, market, locale)) return null;
        return { row, snapshot };
      }))).filter((entry): entry is { row: Record<string, any>; snapshot: NonNullable<ReturnType<typeof publicSnapshot>> } => Boolean(entry));
      const items = (await Promise.all(
        eligibleRows.map(({ row, snapshot }) => published(row, snapshot)),
      )).filter((item): item is NonNullable<typeof item> => item !== null);
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
        configuredPagePaths: Array.isArray(configuration.rows[0]?.configured_page_paths)
          ? configuration.rows[0].configured_page_paths
          : [],
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
  const candidates = await marketLocaleCandidates(market, locale);
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
        LEFT JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
         AND r.workflow_state='approved'
      WHERE d.kind='site-configuration'
        AND d.canonical_slug=$1
         AND ${deliverySourceClause("(e.market||'|'||e.locale)=ANY($2::text[])", "e", "delivery", "$3", "$4")}
        AND e.publication_state='published' AND e.published_at<=now()
         AND ${documentPublishedAvailabilityClause("d.id", "$3", "$4")}
        AND ${PUBLIC_PAYLOAD_SQL}
       ORDER BY CASE
         WHEN (
           e.content_mode='custom'
           OR ${managedMarketExactMaterializationClause("d.id", "e")}
         ) AND e.market=$3 AND e.locale=$4 THEN 0
         WHEN e.content_mode='shared' THEN 1
         ELSE 2
       END,
       array_position($2::text[],e.market||'|'||e.locale),e.updated_at DESC,e.id
      LIMIT 1`,
    [documentSlug, candidates, market, locale],
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
    `SELECT a.id,a.media_type,a.status,v.id version_id,v.metadata
       FROM cms_media_references ref
       JOIN cms_media_assets a ON a.id=ref.asset_id AND a.status IN ('active','ready')
       JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
      WHERE ref.document_id=$1 AND ref.field_path=$2
        AND a.id::text=ANY($3::text[])
        AND ${approvedMediaVersionMetadataSql("v.metadata")}`,
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
    usedFallback: row.market !== market || row.locale !== locale,
    revision: row.revision_number,
    publishedAt: row.published_at,
  });
}));

router.get("/public/contact-configuration", asyncRoute(async (req, res) => {
  const market = typeof req.query.market === "string" ? req.query.market : "uae";
  const locale = typeof req.query.locale === "string" ? req.query.locale : "en";
  const candidates = await marketLocaleCandidates(market, locale);
  if (!candidates) {
    res.status(404).json({ error: "Market or locale is unavailable." });
    return;
  }
  const result = await pool.query(
    `SELECT d.id,e.market,e.locale,e.published_at,e.updated_at,
            r.id revision_id,r.revision_number,r.payload
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
        LEFT JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
         AND r.workflow_state='approved'
      WHERE d.kind='site-configuration' AND d.status<>'archived'
        AND d.canonical_slug=$1
         AND ${deliverySourceClause("(e.market||'|'||e.locale)=ANY($2::text[])", "e", "delivery", "$3", "$4")}
        AND e.publication_state='published' AND e.published_at<=now()
         AND ${documentPublishedAvailabilityClause("d.id", "$3", "$4")}
         AND ${PUBLIC_PAYLOAD_SQL}
       ORDER BY CASE
         WHEN (
           e.content_mode='custom'
           OR ${managedMarketExactMaterializationClause("d.id", "e")}
         ) AND e.market=$3 AND e.locale=$4 THEN 0
         WHEN e.content_mode='shared' THEN 1
         ELSE 2
       END,
       array_position($2::text[],e.market||'|'||e.locale),e.updated_at DESC,e.id
      LIMIT 1`,
    [CMS_CONTACT_EMAIL_DOCUMENT_SLUG, candidates, market, locale],
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
    usedFallback: row.market !== market || row.locale !== locale,
    revision: row.revision_number,
    publishedAt: row.published_at,
  });
}));

router.get(
  "/public/content/:market/:locale/:kind/:slug",
  asyncRoute(async (req, res) => {
    const { market, locale, kind, slug } = req.params;
    const candidates = await marketLocaleCandidates(String(market), String(locale));
    if (!candidates) {
      res.status(404).json({ error: "Market or locale is unavailable." });
      return;
    }
    const result = await pool.query(
      `WITH selected AS (
         SELECT d.id,d.kind,e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,
                e.published_at,e.updated_at,e.localized_slug,
                r.id revision_id,r.revision_number,r.payload,
                $3::text requested_market,$5::text requested_locale,
                row_number() OVER (
                  PARTITION BY d.id
                  ORDER BY CASE
                    WHEN (
                      e.content_mode='custom'
                      OR ${managedMarketExactMaterializationClause("d.id", "e")}
                    ) AND e.market=$3 AND e.locale=$5 THEN 0
                    WHEN e.content_mode='shared' THEN 1
                    ELSE 2
                  END,
                  array_position($4::text[],e.market||'|'||e.locale),e.updated_at DESC,e.id
                ) AS source_rank
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id
            LEFT JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
             AND r.workflow_state='approved'
          WHERE d.status<>'archived' AND e.publication_state='published'
            AND e.published_at<=now() AND d.kind=$1
             AND ${deliverySourceClause("(e.market||'|'||e.locale)=ANY($4::text[])", "e", "delivery", "$3", "$5")}
            AND ${documentPublishedAvailabilityClause("d.id", "$3", "$5")}
             AND ${industryDestinationEligibilityClause("d", "e", "r", "$3")}
             AND ${industryExactMarketDeliveryClause("d", "e", "$3")}
            AND ${PUBLIC_PAYLOAD_SQL}
       )
       SELECT id,kind,market,locale,editorial_market,published_at,updated_at,localized_slug,
              revision_id,revision_number,payload,requested_market,requested_locale
         FROM selected
        WHERE source_rank=1 AND COALESCE(payload->>'slug',localized_slug)=$2
        LIMIT 1`,
      [kind, slug, market, candidates, locale],
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
      const route = cmsPublicRoute(
        result.rows[0].kind as CmsDocumentKind,
        snapshot.slug,
        snapshot.content as CmsContent,
      );
      if (route && !await isPageAvailable(route, String(market), String(locale))) {
        res.status(404).json({ error: "Published content not found." });
        return;
      }
      const delivered = await published(result.rows[0], snapshot);
      if (!delivered) {
        res.status(404).json({ error: "Published content not found." });
        return;
      }
      res.json(delivered);
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
        AND ${approvedMediaVersionMetadataSql("v.metadata")}
          AND ${referencedRevisionHasEligibleDestinationClause("d.id", "e.id", "r.id")}
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
      `WITH selected AS (
         SELECT d.kind,e.market,e.locale,e.updated_at,r.payload
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
             AND r.workflow_state='approved'
          WHERE d.status<>'archived' AND (
                e.content_mode='custom'
                OR ${managedMarketExactMaterializationClause("d.id", "e")}
              )
            AND e.publication_state='published' AND e.published_at<=now()
            AND ($1::text IS NULL OR e.market=$1)
            AND ${documentPublishedAvailabilityClause("d.id", "e.market", "e.locale")}
             AND ${industryDestinationEligibilityClause("d", "e", "r", "e.market")}
             AND ${managedMarketPublicDeliveryClause("d.id", "e", "e.market", "e.locale")}
            AND COALESCE((r.payload->'seo'->>'noIndex')::boolean,false)=false
            AND ${PUBLIC_PAYLOAD_SQL}
         UNION ALL
         SELECT d.kind,destination.code market,destination_locale.locale,e.updated_at,r.payload
           FROM cms_documents d
           JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
           JOIN cms_market_editions e ON e.id=delivery.shared_source_edition_id
             AND e.document_id=d.id AND e.content_mode='shared'
             AND e.publication_state='published' AND e.published_at<=now()
             AND e.published_revision_id=delivery.published_source_revision_id
           JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
             AND r.workflow_state='approved'
           JOIN market_editions destination ON destination.enabled=true
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale
               FROM unnest(
                 ARRAY[destination.default_locale,destination.fallback_locale]
               ) AS supported_locale(locale)
              WHERE locale IS NOT NULL
           ) destination_locale
          WHERE ($1::text IS NULL OR destination.code=$1)
            AND destination_locale.locale IS NOT NULL
             AND NOT ${publishedCustomSourceExistsClause(
               "d",
               "d.id",
               "destination.code",
               "destination_locale.locale",
             )}
            AND ${documentPublishedAvailabilityClause("d.id", "destination.code", "destination_locale.locale")}
             AND ${industryDestinationEligibilityClause("d", "e", "r", "destination.code")}
             AND ${industryExactMarketDeliveryClause("d", "e", "destination.code")}
              AND ${managedMarketPublicDeliveryClause(
                "d.id",
                "e",
                "destination.code",
                "destination_locale.locale",
              )}
            AND COALESCE((r.payload->'seo'->>'noIndex')::boolean,false)=false
            AND ${PUBLIC_PAYLOAD_SQL}
       )
       SELECT * FROM selected`,
      [parsed.data.market ?? null],
    );
    const candidates = result.rows.flatMap((row) => {
      const snapshot = publicSnapshot(row);
      if (!snapshot) return [];
      const route = cmsPublicRoute(
        row.kind as CmsDocumentKind,
        snapshot.slug,
        snapshot.content as CmsContent,
      );
      if (!route || !launchHrefAllowed(route)) return [];
      const suffix = row.market === "uae" ? "" : `?market=${encodeURIComponent(row.market)}`;
      return [{
        url: `${route}${suffix}`,
        path: route,
        market: String(row.market),
        locale: String(row.locale),
        updatedAt: row.updated_at,
        changeFrequency: "weekly",
        priority: 0.7,
      }];
    });
    const requestedMarket = parsed.data.market ?? "uae";
    const items = (await Promise.all(candidates.map(async (item) =>
      await isPageAvailable(item.path, requestedMarket, item.locale) ? item : null
    ))).filter((item): item is NonNullable<typeof item> => item !== null)
      .map(({ path: _path, market: _market, locale: _locale, ...item }) => item);
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

export const isPageAvailable = isPublishedPageAvailable;

export function rankMarketLocaleCandidates(
  rows: Array<Record<string, any>>,
  requestedMarket: string,
  requestedLocale: string,
) {
  const markets = new Map(rows.map((row) => [String(row.code), row]));
  const requested = markets.get(requestedMarket);
  if (!requested) return null;
  const supportedLocales = new Set(rows.flatMap((row) =>
    [row.default_locale, row.fallback_locale].filter(Boolean).map(String),
  ));
  if (!supportedLocales.has(requestedLocale)) return null;
  const keys: string[] = [];
  const add = (market: string | undefined, locale: string | undefined) => {
    if (!market || !locale) return;
    const key = `${market}|${locale}`;
    if (!keys.includes(key)) keys.push(key);
  };
  let current: Record<string, any> | undefined = requested;
  const visited = new Set<string>();
  while (current && !visited.has(String(current.code)) && keys.length < 16) {
    const code = String(current.code);
    visited.add(code);
    add(code, requestedLocale);
    add(code, current.fallback_locale ? String(current.fallback_locale) : undefined);
    add(code, String(current.default_locale));
    current = current.fallback_market_code
      ? markets.get(String(current.fallback_market_code))
      : undefined;
  }
  const canonical = rows.find((row) => row.is_canonical);
  if (canonical) {
    add(String(canonical.code), requestedLocale);
    add(String(canonical.code), String(canonical.default_locale));
  }
  return keys;
}
