import { pool } from "@workspace/db";
import {
  cmsPublicRoute,
  safeParsePersistedNavigationPolicy,
  type CmsContent,
  type CmsDocumentKind,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import {
  documentPublishedAvailabilityClause,
  industryDestinationEligibilityClause,
  publicPayloadEligibilityClause,
} from "./availability";

export type PolicyCandidate = { market: string; locale: string };
type PublishedDocumentRoutes = { known: Set<string>; available: Set<string> };

function publicPath(value: string) {
  return value.split(/[?#]/)[0]!.replace(/\/+$/, "") || "/";
}

function representedRoute(kind: string, payload: Record<string, unknown>) {
  const slug = typeof payload.slug === "string" ? payload.slug : null;
  if (!slug) return null;
  if (kind === "platform") return `/platforms/${slug}`;
  if (kind === "publication") return `/insights/${slug}`;
  if (kind === "industry") return `/industries/${slug}`;
  if (kind === "framework") return `/methodologies/${slug}`;
  return null;
}

/**
 * Returns routes represented by published CMS documents and the subset which
 * may be delivered to the requested destination. Navigation destinations that
 * do not map to a CMS document retain their policy-controlled behavior.
 */
async function publishedDocumentRoutes(
  market: string,
  locale: string,
  candidates: PolicyCandidate[],
): Promise<PublishedDocumentRoutes> {
  const result = await pool.query(
    `WITH represented_sources AS (
       SELECT d.id,d.kind,r.payload,
              ${documentPublishedAvailabilityClause("d.id", "$1", "$2")} AS available,
               (
                 ${publicPayloadEligibilityClause("d", "r")}
                 AND ${industryDestinationEligibilityClause("d", "e", "r", "$1")}
               ) AS public_eligible,
               CASE
                 WHEN e.content_mode='custom' AND e.market=$1 AND e.locale=$2 THEN 0
                 WHEN e.content_mode='shared' THEN 1
                 ELSE 2
               END AS source_kind_rank,
               array_position($3::text[],e.market||'|'||e.locale) AS candidate_rank,
               e.updated_at,e.id AS edition_id
          FROM cms_documents d
          JOIN cms_market_editions e ON e.document_id=d.id
          LEFT JOIN cms_document_availability_states delivery ON delivery.document_id=d.id
          JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
            AND r.workflow_state='approved'
         WHERE d.status<>'archived' AND e.publication_state='published'
           AND e.published_at<=now()
           AND (
             (e.content_mode='custom' AND (e.market||'|'||e.locale)=ANY($3::text[]))
             OR (
               e.content_mode='shared'
               AND e.id=delivery.shared_source_edition_id
               AND e.published_revision_id=delivery.published_source_revision_id
             )
           )
      ),
      selected_sources AS (
        SELECT *,
               row_number() OVER (
                 PARTITION BY id
                 ORDER BY source_kind_rank,candidate_rank,updated_at DESC,edition_id
              ) AS source_rank
          FROM represented_sources
         WHERE public_eligible
      )
       SELECT kind,payload,available,source_rank,true AS public_eligible
         FROM selected_sources
       UNION ALL
       SELECT kind,payload,false AS available,NULL::bigint AS source_rank,false AS public_eligible
         FROM represented_sources
        WHERE NOT public_eligible`,
    [market, locale, candidates.map((candidate) => `${candidate.market}|${candidate.locale}`)],
  );
  const known = new Set<string>();
  const available = new Set<string>();
  for (const row of result.rows) {
    if (typeof row.kind !== "string" || !row.payload || typeof row.payload !== "object") continue;
    const snapshot = validateCmsSnapshot(row.kind as CmsDocumentKind, row.payload, "publish");
    if (!snapshot.success) {
      const route = representedRoute(row.kind, row.payload);
      if (route) known.add(publicPath(route));
      continue;
    }
    const content = snapshot.data.content as CmsContent;
    // A non-public but structurally valid source is still a known historical
    // route. Give the route mapper public visibility solely to identify it;
    // `public_eligible` below ensures it can never enter the available set.
    const routeContent = row.public_eligible
      ? content
      : { ...(content as Record<string, unknown>), visibility: "public" } as CmsContent;
    const route = cmsPublicRoute(row.kind as CmsDocumentKind, snapshot.data.slug, routeContent)
      ?? representedRoute(row.kind, row.payload);
    if (!route) continue;
    const path = publicPath(route);
    known.add(path);
    // Keep every represented source route known so a historical shared slug
    // that lost to a differently-slugged exact custom edition is hidden,
    // rather than treated as an unknown policy destination. Only the actual
    // rank-one delivery source is available at this destination.
    if (row.public_eligible && Number(row.source_rank) === 1 && row.available) available.add(path);
  }
  return { known, available };
}

export async function navigationCandidates(market: string, locale: string): Promise<PolicyCandidate[] | null> {
  const result = await pool.query(
    `SELECT code,default_locale,fallback_market_code,fallback_locale,is_canonical
       FROM market_editions WHERE enabled=true`,
  );
  const markets = new Map(result.rows.map((row) => [String(row.code), row]));
  const requested = markets.get(market);
  if (!requested) return null;
  // A locale belongs to the requested destination only. Accepting a locale
  // merely because another market supports it lets that market's fallback
  // chain bypass an explicit requested-locale availability decision.
  const supportedLocales = new Set(
    [requested.default_locale, requested.fallback_locale].filter(Boolean).map(String),
  );
  if (!supportedLocales.has(locale)) return null;
  const values: PolicyCandidate[] = [];
  const add = (candidateMarket: string, candidateLocale: string) => {
    if (!values.some((value) => value.market === candidateMarket && value.locale === candidateLocale)) {
      values.push({ market: candidateMarket, locale: candidateLocale });
    }
  };
  add(market, locale);
  if (locale !== requested.default_locale) add(market, String(requested.default_locale));
  const visited = new Set<string>();
  let current = requested;
  while (current?.fallback_market_code && !visited.has(String(current.code)) && values.length < 16) {
    visited.add(String(current.code));
    const fallback = markets.get(String(current.fallback_market_code));
    if (!fallback) break;
    add(String(fallback.code), String(current.fallback_locale || fallback.default_locale));
    current = fallback;
  }
  const canonical = result.rows.find((row) => row.is_canonical);
  if (canonical) add(String(canonical.code), String(canonical.default_locale));
  return values;
}

export async function publishedNavigationPolicy(market: string, locale: string) {
  const candidates = await navigationCandidates(market, locale);
  if (!candidates) return null;
  for (const candidate of candidates) {
    const result = await pool.query(
      `SELECT items,pages,published_at FROM cms_navigation_published_policies
        WHERE market=$1 AND locale=$2`,
      [candidate.market, candidate.locale],
    );
    if (!result.rowCount || !result.rows[0]) continue;
    const parsed = safeParsePersistedNavigationPolicy({
      items: result.rows[0].items,
      pages: result.rows[0].pages,
    });
    if (parsed.success) {
      const routes = await publishedDocumentRoutes(market, locale, candidates);
      return {
        ...parsed.data,
        items: parsed.data.items.map((item) => {
          const destination = publicPath(item.destination);
          return routes.known.has(destination) && !routes.available.has(destination)
            ? { ...item, visible: false }
            : item;
        }),
        market: candidate.market,
        locale: candidate.locale,
        requestedMarket: market,
        requestedLocale: locale,
        usedFallback: candidate.market !== market || candidate.locale !== locale,
        publishedAt: result.rows[0].published_at,
      };
    }
    throw new Error(`Published navigation policy is invalid: ${parsed.error.issues[0]?.message ?? "invalid hierarchy"}`);
  }
  return null;
}

export async function isPublishedPageAvailable(path: string, market: string, locale: string) {
  const candidates = await navigationCandidates(market, locale);
  if (!candidates) return false;
  const routes = await publishedDocumentRoutes(market, locale, candidates);
  const normalizedPath = publicPath(path);
  if (routes.known.has(normalizedPath) && !routes.available.has(normalizedPath)) return false;
  const policy = await publishedNavigationPolicy(market, locale);
  // No published snapshot is an explicit compatibility/unconfigured state.
  // Once a snapshot exists, every surface uses its page decision.
  if (!policy) return true;
  return policy.pages.find((page) => page.path === path)?.enabled ?? true;
}