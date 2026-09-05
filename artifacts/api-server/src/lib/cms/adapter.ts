import { CANONICAL_MARKET, parseMarket, type CmsMarket } from "./security";

const API_VERSION = "2025-02-19";
// Editions, rather than document-level fields, are the delivery boundary.
export const PAGE_QUERY = `*[_type == "page" && (
  routeKind == $routeKind &&
  (
  slug.current == $slug ||
  marketEditions[market->code == $market][0].localizedSlug.current == $slug
))]{
  "_id": _id, "_rev": _rev, "slug": slug.current, routeKind, _updatedAt,
  "requestedEdition": marketEditions[market->code == $market][0]{
    "market": market->code, fallbackMode, publicationState, parityComplete, title, summary,
    "slug": localizedSlug.current, body, "sections": sections[]{
      ...,
      primaryAction{..., internal->{_type, routeKind, "slug": coalesce(
        marketEditions[market->code == $market][0].localizedSlug.current, slug.current
      )}},
      action{..., internal->{_type, routeKind, "slug": coalesce(
        marketEditions[market->code == $market][0].localizedSlug.current, slug.current
      )}},
      media->{..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)},
      asset->{..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)},
      "claims": claims[]->{...},
      "proof": proof[]->{...},
      "items": items[]->{..., "slug": coalesce(
        marketEditions[market->code == $market][0].localizedSlug.current, slug.current
      )}
    }, "seo": seo{..., "openGraphImage": openGraphImage->{
      ..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)
    }}, publishAt, expiresAt
  },
  "uaeEdition": marketEditions[market->code == "uae"][0]{
    "market": market->code, fallbackMode, publicationState, parityComplete, title, summary,
    "slug": localizedSlug.current, body, "sections": sections[]{
      ...,
      primaryAction{..., internal->{_type, routeKind, "slug": coalesce(
        marketEditions[market->code == "uae"][0].localizedSlug.current, slug.current
      )}},
      action{..., internal->{_type, routeKind, "slug": coalesce(
        marketEditions[market->code == "uae"][0].localizedSlug.current, slug.current
      )}},
      media->{..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)},
      asset->{..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)},
      "claims": claims[]->{...},
      "proof": proof[]->{...},
      "items": items[]->{..., "slug": coalesce(
        marketEditions[market->code == "uae"][0].localizedSlug.current, slug.current
      )}
    }, "seo": seo{..., "openGraphImage": openGraphImage->{
      ..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)
    }}, publishAt, expiresAt
  }
}`;

export type FallbackMode = "canonical" | "uaeFallback" | "override" | "unavailable";
export type PublicationState =
  | "draft" | "review" | "approved" | "scheduled" | "published" | "expired" | "archived";
export type DeliveryMode = "canonical" | "override" | "uaeFallback" | "unavailable";

export interface CmsPage {
  id: string;
  revision: string;
  slug: string;
  routeKind: "home" | "service" | "platform" | "industry" | "caseStudy" | "about" | "contact" | "landing" | "legal";
  market: CmsMarket;
  title?: string;
  summary?: string;
  body?: readonly Record<string, unknown>[];
  seo?: Record<string, unknown>;
  sections: readonly Record<string, unknown>[];
  updatedAt: string;
  publicationState: PublicationState;
  publishAt?: string;
  expiresAt?: string;
}

export interface CmsPageEnvelope {
  schemaVersion: 1;
  page: CmsPage | null;
  meta: {
    requestedMarket: CmsMarket;
    resolvedMarket: CmsMarket | null;
    marketFallback: boolean;
    deliveryMode: DeliveryMode;
    requestedPublicationState?: PublicationState;
    resolvedPublicationState?: PublicationState;
    requestedPublishAt?: string;
    requestedExpiresAt?: string;
    publishAt?: string;
    expiresAt?: string;
    source: "sanity" | "cache" | "migration-fallback";
    preview: boolean;
    fallbackVersion?: string;
  };
}

export interface Edition {
  market: CmsMarket;
  fallbackMode: FallbackMode;
  publicationState: PublicationState;
  title?: string;
  summary?: string;
  slug?: string;
  body?: readonly Record<string, unknown>[];
  seo?: Record<string, unknown>;
  sections?: readonly Record<string, unknown>[];
  publishAt?: string;
  expiresAt?: string;
  parityComplete?: boolean;
}
export interface PageDocument {
  id: string;
  revision: string;
  slug: string;
  routeKind: CmsPage["routeKind"];
  updatedAt: string;
  requestedEdition: Edition | null;
  uaeEdition: Edition | null;
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function optionalText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
function optionalDate(value: unknown): string | undefined {
  return typeof value === "string" && Number.isFinite(Date.parse(value)) ? value : undefined;
}
const publicationStates: readonly PublicationState[] = ["draft", "review", "approved", "scheduled", "published", "expired", "archived"];
const fallbackModes: readonly FallbackMode[] = ["canonical", "uaeFallback", "override", "unavailable"];

function validateEdition(value: unknown): Edition | null {
  // Sanity may omit an undefined projection key; it means no explicit edition.
  if (value == null) return null;
  if (!record(value)) throw new Error("CMS market edition is invalid");
  const market = parseMarket(value.market);
  if (
    !market ||
    !fallbackModes.includes(value.fallbackMode as FallbackMode) ||
    !publicationStates.includes(value.publicationState as PublicationState) ||
    (value.sections !== undefined && (!Array.isArray(value.sections) || !value.sections.every(record))) ||
    (value.body !== undefined && (!Array.isArray(value.body) || !value.body.every(record))) ||
    (value.seo !== undefined && !record(value.seo)) ||
    (value.publishAt !== undefined && !optionalDate(value.publishAt)) ||
    (value.expiresAt !== undefined && !optionalDate(value.expiresAt))
  ) throw new Error("CMS market edition failed runtime contract validation");
  const title = optionalText(value.title);
  const summary = optionalText(value.summary);
  const slug = optionalText(value.slug);
  const publishAt = optionalDate(value.publishAt);
  const expiresAt = optionalDate(value.expiresAt);
  const edition: Edition = {
    market,
    fallbackMode: value.fallbackMode as FallbackMode,
    publicationState: value.publicationState as PublicationState,
    parityComplete: value.parityComplete === true,
    ...(title ? { title } : {}),
    ...(summary ? { summary } : {}),
    ...(slug ? { slug } : {}),
    ...(publishAt ? { publishAt } : {}),
    ...(expiresAt ? { expiresAt } : {}),
  };
  if (value.body) edition.body = value.body as readonly Record<string, unknown>[];
  if (value.seo) edition.seo = value.seo;
  if (value.sections) edition.sections = value.sections as readonly Record<string, unknown>[];
  return edition;
}

export function validatePageDocument(value: unknown): PageDocument | null {
  if (value === null) return null;
  if (!record(value) || typeof value._id !== "string" || typeof value._rev !== "string" ||
    typeof value.slug !== "string" || typeof value._updatedAt !== "string" ||
    !["home", "service", "platform", "industry", "caseStudy", "about", "contact", "landing", "legal"].includes(String(value.routeKind))) {
    throw new Error("CMS page failed runtime contract validation");
  }
  return {
    id: value._id, revision: value._rev, slug: value.slug, routeKind: value.routeKind as CmsPage["routeKind"], updatedAt: value._updatedAt,
    requestedEdition: validateEdition(value.requestedEdition),
    uaeEdition: validateEdition(value.uaeEdition),
  };
}

export function isPublishedAndLive(edition: Edition, now = Date.now()): boolean {
  return edition.publicationState === "published" &&
    (!edition.publishAt || Date.parse(edition.publishAt) <= now) &&
    (!edition.expiresAt || Date.parse(edition.expiresAt) > now);
}

/** Resolve explicit editorial policy; absence/expiry never silently becomes UAE. */
export function resolveEdition(
  document: PageDocument | null,
  requestedMarket: CmsMarket,
  preview: boolean,
  now = Date.now(),
): CmsPageEnvelope {
  const requested = document?.requestedEdition ?? null;
  const unavailable = (reason?: Edition): CmsPageEnvelope => ({
    schemaVersion: 1, page: null,
    meta: {
      requestedMarket, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable",
      ...(reason ? { requestedPublicationState: reason.publicationState } : {}),
      ...(reason?.publishAt ? { requestedPublishAt: reason.publishAt } : {}),
      ...(reason?.expiresAt ? { requestedExpiresAt: reason.expiresAt } : {}),
      source: "sanity", preview,
    },
  });
  if (!document || !requested || requested.market !== requestedMarket) return unavailable();
  // A declared unavailable edition and any non-live exact edition are unavailable.
  if (requested.fallbackMode === "unavailable" || (!preview && !isPublishedAndLive(requested, now))) {
    return unavailable(requested);
  }
  if (!preview && requested.fallbackMode !== "uaeFallback" && (!requested.parityComplete || !requested.sections?.length)) return unavailable(requested);
  let resolved = requested;
  let deliveryMode: DeliveryMode = requested.fallbackMode;
  if (requested.fallbackMode === "uaeFallback") {
    const uae = document.uaeEdition;
    if (!uae || uae.market !== CANONICAL_MARKET || uae.fallbackMode !== "canonical" ||
      (!preview && (!isPublishedAndLive(uae, now) || !uae.parityComplete || !uae.sections?.length))) {
      return unavailable(requested);
    }
    resolved = uae;
  } else if (requested.fallbackMode === "canonical" && requestedMarket !== CANONICAL_MARKET) {
    return unavailable(requested);
  }
  return {
    schemaVersion: 1,
    page: {
      id: document.id, revision: document.revision, slug: resolved.slug ?? document.slug, routeKind: document.routeKind,
      market: resolved.market, ...(resolved.title ? { title: resolved.title } : {}),
      ...(resolved.summary ? { summary: resolved.summary } : {}),
      ...(resolved.body ? { body: resolved.body } : {}),
      ...(resolved.seo ? { seo: resolved.seo } : {}),
      sections: resolved.sections ?? [], updatedAt: document.updatedAt,
      publicationState: resolved.publicationState,
      ...(resolved.publishAt ? { publishAt: resolved.publishAt } : {}),
      ...(resolved.expiresAt ? { expiresAt: resolved.expiresAt } : {}),
    },
    meta: {
      requestedMarket, resolvedMarket: resolved.market,
      marketFallback: deliveryMode === "uaeFallback", deliveryMode,
      requestedPublicationState: requested.publicationState,
      resolvedPublicationState: resolved.publicationState,
      ...(requested.publishAt ? { requestedPublishAt: requested.publishAt } : {}),
      ...(requested.expiresAt ? { requestedExpiresAt: requested.expiresAt } : {}),
      ...(resolved.publishAt ? { publishAt: resolved.publishAt } : {}),
      ...(resolved.expiresAt ? { expiresAt: resolved.expiresAt } : {}),
      source: "sanity", preview,
    },
  };
}

function config(): { projectId: string; dataset: string; token?: string } | undefined {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  if (!projectId || !dataset) return undefined;
  if (!/^[a-z0-9-]+$/.test(projectId) || !/^[a-zA-Z0-9_-]+$/.test(dataset)) throw new Error("Invalid Sanity project or dataset configuration");
  return { projectId, dataset, ...(process.env.SANITY_API_TOKEN ? { token: process.env.SANITY_API_TOKEN } : {}) };
}
async function queryPage(market: CmsMarket, slug: string, routeKind: CmsPage["routeKind"], preview: boolean): Promise<PageDocument | null> {
  const cms = config();
  if (!cms) throw new Error("CMS is not configured");
  if (preview && !cms.token) throw new Error("CMS preview token is not configured");
  const params = new URLSearchParams({ query: PAGE_QUERY, "$market": JSON.stringify(market), "$slug": JSON.stringify(slug), "$routeKind": JSON.stringify(routeKind), perspective: preview ? "drafts" : "published" });
  const response = await fetch(`https://${cms.projectId}.${preview ? "api.sanity.io" : "apicdn.sanity.io"}/v${API_VERSION}/data/query/${encodeURIComponent(cms.dataset)}?${params}`, {
    headers: preview && cms.token ? { Authorization: `Bearer ${cms.token}` } : {}, signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`CMS query failed with status ${response.status}`);
  const body = await response.json() as unknown;
  if (!record(body) || !("result" in body) || !Array.isArray(body.result)) throw new Error("CMS response envelope is invalid");
  if (body.result.length > 1) throw new Error("CMS route collision: slug must resolve to exactly one page");
  return validatePageDocument(body.result[0] ?? null);
}

interface CacheEntry { result: CmsPageEnvelope; expiresAt: number; staleUntil: number; }
const cache = new Map<string, CacheEntry>();
const CACHE_MS = 60_000;
const STALE_MS = 24 * 60 * 60_000;
const FALLBACK_VERSION = "cms-migration-v1";
export function cacheDeadlines(result: CmsPageEnvelope, now: number) {
  const boundaries = [
    result.page?.publishAt, result.page?.expiresAt,
    result.meta.requestedPublishAt, result.meta.requestedExpiresAt,
    result.meta.publishAt, result.meta.expiresAt,
  ].flatMap((value) => {
    const instant = value ? Date.parse(value) : Number.NaN;
    return Number.isFinite(instant) && instant > now ? [instant] : [];
  });
  const boundary = boundaries.length > 0 ? Math.min(...boundaries) : Number.POSITIVE_INFINITY;
  return {
    expiresAt: Math.min(now + CACHE_MS, boundary),
    staleUntil: Math.min(now + STALE_MS, boundary),
  };
}
export async function getPublishedPage(market: CmsMarket, slug: string, routeKind: CmsPage["routeKind"], now = Date.now()): Promise<CmsPageEnvelope> {
  const key = `${market}:${routeKind}:${slug}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return { ...cached.result, meta: { ...cached.result.meta, source: "cache" } };
  try {
    const result = resolveEdition(await queryPage(market, slug, routeKind, false), market, false, now);
    cache.set(key, { result, ...cacheDeadlines(result, now) });
    return result;
  } catch {
    if (cached && cached.staleUntil > now) return { ...cached.result, meta: { ...cached.result.meta, source: "cache" } };
    return { schemaVersion: 1, page: null, meta: { requestedMarket: market, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable", source: "migration-fallback", preview: false, fallbackVersion: FALLBACK_VERSION } };
  }
}
export async function getPreviewPage(market: CmsMarket, slug: string, routeKind: CmsPage["routeKind"]): Promise<CmsPageEnvelope> {
  return resolveEdition(await queryPage(market, slug, routeKind, true), market, true);
}
export function invalidatePublishedCache(): number { const count = cache.size; cache.clear(); return count; }
export function cmsConfigurationStatus() {
  const validPreviewSecret = (process.env.CMS_PREVIEW_SECRETS ?? "").split(",").some((secret) => secret.trim().length >= 32);
  let workflowCredentials = false;
  try {
    const parsed = JSON.parse(process.env.CMS_WORKFLOW_CREDENTIALS ?? "[]") as unknown;
    workflowCredentials = Array.isArray(parsed) && parsed.some((item) => {
      if (!record(item) || typeof item.id !== "string" || typeof item.key !== "string" || item.key.length < 32) return false;
      const role = item.role;
      const knownRole = ["author", "regionalEditor", "reviewer", "publisher", "admin"].includes(String(role));
      const assigned = Array.isArray(item.markets) && item.markets.length > 0 && item.markets.every((market) => parseMarket(market));
      return knownRole && (assigned || (role === "admin" && item.markets === "all"));
    });
  } catch {
    workflowCredentials = false;
  }
  return {
    configured: Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_DATASET),
    previewConfigured: Boolean(process.env.SANITY_PROJECT_ID && process.env.SANITY_DATASET && process.env.SANITY_API_TOKEN && validPreviewSecret),
    webhookConfigured: Boolean(process.env.SANITY_WEBHOOK_SECRET),
    workflowConfigured: Boolean(process.env.SANITY_API_TOKEN && workflowCredentials),
  };
}

export interface CmsRuntimeEnvelope {
  schemaVersion: 1;
  market: CmsMarket;
  source: "sanity" | "migration-fallback";
  markets: readonly { code: CmsMarket; name: string }[];
  navigation: readonly {
    placement: "primary" | "utility" | "footer";
    items: readonly Record<string, unknown>[];
  }[];
  redirects: readonly { sourcePath: string; destinationPath: string; statusCode: 301 | 302 | 307 | 308 }[];
}

const RUNTIME_QUERY = `{
  "markets": *[_type == "globalSettings" && lifecycle.state == "published"][0].markets[]->{code, name},
  "navigation": *[_type == "navigation"]{
    placement,
    "canonical": items[]{..., internal->{_type, routeKind, "slug": slug.current},
      children[]{..., internal->{_type, routeKind, "slug": slug.current}}},
    "edition": marketEditions[market->code == $market][0]{
      fallbackMode, publicationState, publishAt, expiresAt,
      "items": items[]{..., internal->{_type, routeKind, "slug": coalesce(
        marketEditions[market->code == $market][0].localizedSlug.current, slug.current
      )}, children[]{..., internal->{_type, routeKind, "slug": coalesce(
        marketEditions[market->code == $market][0].localizedSlug.current, slug.current
      )}}}
    },
    "canonicalEdition": marketEditions[market->code == "uae"][0]{fallbackMode, publicationState, publishAt, expiresAt}
  },
  "redirects": *[_type == "redirect" && active == true && lifecycle.state == "published" && (!defined(market) || market->code == $market)]{
    sourcePath, destinationPath, statusCode
  }
}`;

function liveRuntimeEdition(value: UnknownRecord, now: number): boolean {
  return value.publicationState === "published" &&
    (!value.publishAt || (typeof value.publishAt === "string" && Date.parse(value.publishAt) <= now)) &&
    (!value.expiresAt || (typeof value.expiresAt === "string" && Date.parse(value.expiresAt) > now));
}

type UnknownRecord = Record<string, unknown>;

export function validateRuntimeResult(value: unknown, market: CmsMarket, now = Date.now()): CmsRuntimeEnvelope {
  if (!record(value)) throw new Error("CMS runtime response is invalid");
  const markets = Array.isArray(value.markets) ? value.markets.flatMap((item) => {
    if (!record(item)) return [];
    const code = parseMarket(item.code);
    return code && typeof item.name === "string" ? [{ code, name: item.name }] : [];
  }) : [];
  const navigation = Array.isArray(value.navigation) ? value.navigation.flatMap((item) => {
    if (!record(item) || !["primary", "utility", "footer"].includes(String(item.placement))) return [];
    const edition = record(item.edition) ? item.edition : undefined;
    let items: unknown = undefined;
    // Navigation editions are the independent publication boundary. Do not
    // require the document lifecycle as well or a released edition is hidden.
    const canonicalEdition = record(item.canonicalEdition) ? item.canonicalEdition : undefined;
    const canonicalLive = canonicalEdition && liveRuntimeEdition(canonicalEdition, now) && canonicalEdition.fallbackMode === "canonical";
    if (market === CANONICAL_MARKET && canonicalLive) items = item.canonical;
    else if (edition && liveRuntimeEdition(edition, now)) {
      if (edition.fallbackMode === "override") items = edition.items;
      else if (edition.fallbackMode === "uaeFallback" && canonicalLive) items = item.canonical;
    }
    if (!Array.isArray(items) || !items.every(record)) return [];
    return [{ placement: item.placement as "primary" | "utility" | "footer", items }];
  }) : [];
  const redirects = Array.isArray(value.redirects) ? value.redirects.flatMap((item) => {
    if (!record(item) || typeof item.sourcePath !== "string" || typeof item.destinationPath !== "string" ||
      !/^\/(?!\/)/.test(item.sourcePath) || !/^\/(?!\/)/.test(item.destinationPath) ||
      item.sourcePath === item.destinationPath || ![301, 302, 307, 308].includes(item.statusCode as number)) return [];
    return [{
      sourcePath: item.sourcePath,
      destinationPath: item.destinationPath,
      statusCode: item.statusCode as 301 | 302 | 307 | 308,
    }];
  }) : [];
  return { schemaVersion: 1, market, source: "sanity", markets, navigation, redirects };
}

export async function getPublishedRuntime(market: CmsMarket): Promise<CmsRuntimeEnvelope> {
  const cms = config();
  if (!cms) return { schemaVersion: 1, market, source: "migration-fallback", markets: [], navigation: [], redirects: [] };
  try {
    const params = new URLSearchParams({
      query: RUNTIME_QUERY,
      "$market": JSON.stringify(market),
      perspective: "published",
    });
    const response = await fetch(`https://${cms.projectId}.apicdn.sanity.io/v${API_VERSION}/data/query/${encodeURIComponent(cms.dataset)}?${params}`, {
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error(`CMS runtime query failed with status ${response.status}`);
    const body = await response.json() as unknown;
    if (!record(body) || !("result" in body)) throw new Error("CMS runtime envelope is invalid");
    return validateRuntimeResult(body.result, market);
  } catch {
    return { schemaVersion: 1, market, source: "migration-fallback", markets: [], navigation: [], redirects: [] };
  }
}

const PUBLICATION_QUERY = `*[_type == "publication" && (
  slug.current == $slug ||
  marketEditions[market->code == $market][0].localizedSlug.current == $slug
)]{
  "_id": _id, "_rev": _rev, _updatedAt, format, publishedAt, readingMinutes, authors[]->{name, role}, topics, media->{..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)}, download->{..., "url": coalesce(image.asset->url, file.asset->url, externalUrl)}, gated, eventStartsAt,
  "edition": marketEditions[market->code == $market][0]{fallbackMode, publicationState, title, dek, body, "slug": localizedSlug.current, seo, publishAt, expiresAt},
  "uae": marketEditions[market->code == "uae"][0]{fallbackMode, publicationState, title, dek, body, "slug": localizedSlug.current, seo, publishAt, expiresAt},
  "baseSlug": slug.current
}`;
function publicationEnvelope(publication: Record<string, unknown> | null, market: CmsMarket, now = Date.now()) {
  const unavailable = { publication: null, meta: { requestedMarket: market, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable", source: "sanity", preview: false } };
  if (!publication) return unavailable;
  const edition = record(publication.edition) ? publication.edition : undefined;
  const uae = record(publication.uae) ? publication.uae : undefined;
  if (!edition || !liveRuntimeEdition(edition, now) || edition.fallbackMode === "unavailable") return unavailable;
  const resolved = edition.fallbackMode === "uaeFallback" ? uae : edition;
  if (!resolved || !liveRuntimeEdition(resolved, now) || (edition.fallbackMode === "uaeFallback" && resolved.fallbackMode !== "canonical")) return unavailable;
  if (typeof publication._id !== "string" || typeof publication._rev !== "string" || typeof publication._updatedAt !== "string" || typeof publication.format !== "string" || typeof publication.baseSlug !== "string" || typeof resolved.title !== "string") return unavailable;
  return { publication: {
    id: publication._id, revision: publication._rev, slug: typeof resolved.slug === "string" ? resolved.slug : publication.baseSlug,
    market: resolved === uae ? "uae" : market, title: resolved.title, format: publication.format, dek: typeof resolved.dek === "string" ? resolved.dek : undefined,
    body: Array.isArray(resolved.body) ? resolved.body : [], authors: Array.isArray(publication.authors) ? publication.authors : [], topics: Array.isArray(publication.topics) ? publication.topics : [],
    ...(typeof publication.publishedAt === "string" ? { publishedAt: publication.publishedAt } : {}),
    ...(typeof publication.readingMinutes === "number" && Number.isInteger(publication.readingMinutes) && publication.readingMinutes > 0 ? { readingMinutes: publication.readingMinutes } : {}),
    ...(record(publication.media) ? { media: publication.media } : {}), ...(record(publication.download) ? { download: publication.download } : {}),
    gated: publication.gated === true, ...(typeof publication.eventStartsAt === "string" ? { eventStartsAt: publication.eventStartsAt } : {}),
    ...(record(resolved.seo) ? { seo: resolved.seo } : {}), publicationState: resolved.publicationState, updatedAt: publication._updatedAt,
  }, meta: { requestedMarket: market, resolvedMarket: resolved === uae ? "uae" : market, marketFallback: resolved === uae, deliveryMode: resolved === uae ? "uaeFallback" : "override", source: "sanity", preview: false } };
}
async function publicationsQuery(market: CmsMarket, slug = "") {
  const cms = config(); if (!cms) return [];
  const query = slug ? PUBLICATION_QUERY : PUBLICATION_QUERY.replace(/ && \([\s\S]*?\)\]\{/, "]{" );
  const params = new URLSearchParams({ query, "$market": JSON.stringify(market), "$slug": JSON.stringify(slug), perspective: "published" });
  const response = await fetch(`https://${cms.projectId}.apicdn.sanity.io/v${API_VERSION}/data/query/${encodeURIComponent(cms.dataset)}?${params}`, { signal: AbortSignal.timeout(4_000) });
  const body = await response.json() as UnknownRecord;
  return record(body) && Array.isArray(body.result) ? body.result.filter(record) : [];
}
export async function getPublishedPublication(market: CmsMarket, slug: string) {
  try { const rows = await publicationsQuery(market, slug); return rows.length === 1 ? publicationEnvelope(rows[0], market) : publicationEnvelope(null, market); }
  catch { return { publication: null, meta: { requestedMarket: market, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable", source: "migration-fallback", preview: false, fallbackVersion: FALLBACK_VERSION } }; }
}
export async function getPublishedPublications(market: CmsMarket) {
  try { const publications = (await publicationsQuery(market)).map((item) => publicationEnvelope(item, market)).flatMap((item) => item.publication ? [item.publication] : []); return { publications, meta: { requestedMarket: market, resolvedMarket: market, marketFallback: false, deliveryMode: "override", source: "sanity", preview: false } }; }
  catch { return { publications: [], meta: { requestedMarket: market, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable", source: "migration-fallback", preview: false, fallbackVersion: FALLBACK_VERSION } }; }
}

export async function getSitemap(origin: string): Promise<string> {
  const configuredOrigin = process.env.PUBLIC_SITE_ORIGIN;
  const safeOrigin = configuredOrigin && /^https:\/\/(?:www\.)?cognirise\.ai$/.test(configuredOrigin)
    ? configuredOrigin
    : "https://cognirise.ai";
  const fallbackPaths = [
    "/", "/what-we-do", "/what-we-do/agentic-enterprise-transformation",
    "/what-we-do/data-ai-foundations", "/what-we-do/engineering-with-ai",
    "/what-we-do/sovereign-regulated-ai", "/what-we-do/digital-ai-workforce",
    "/platforms", "/platforms/cognios", "/platforms/cognidocs",
    "/platforms/cogniagents", "/platforms/cognitalk", "/platforms/cogniware",
    "/industries", "/industries/banking", "/industries/public-sector",
    "/industries/telecoms", "/industries/travel", "/industries/energy",
    "/industries/manufacturing", "/work", "/insights", "/about", "/partners",
    "/advisors", "/faq", "/contact", "/value-scan",
  ];
  void origin; // Sitemap origin is deployment configuration, never a request-derived host.
  const xml = (urls: readonly string[]) =>
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${safeOrigin}${url}</loc></url>`).join("")}</urlset>`;
  const cms = config();
  if (!cms) return xml(fallbackPaths);
  const query = `*[_type in ["page","publication"]]{
    _updatedAt, _type, routeKind, "baseSlug": slug.current,
    "editions": marketEditions[
      publicationState == "published" &&
      (!defined(publishAt) || dateTime(publishAt) <= dateTime(now())) &&
      (!defined(expiresAt) || dateTime(expiresAt) > dateTime(now())) &&
      fallbackMode != "unavailable"
    ]{"market": market->code, fallbackMode, "slug": localizedSlug.current, seo}
  }`;
  const params = new URLSearchParams({ query, perspective: "published" });
  let body: UnknownRecord;
  try {
    const response = await fetch(`https://${cms.projectId}.apicdn.sanity.io/v${API_VERSION}/data/query/${encodeURIComponent(cms.dataset)}?${params}`, {
      signal: AbortSignal.timeout(4_000),
    });
    if (!response.ok) throw new Error("CMS sitemap query failed");
    body = await response.json() as UnknownRecord;
  } catch {
    return xml(fallbackPaths);
  }
  const rows = Array.isArray(body.result) ? body.result : [];
  const urls = rows.flatMap((row) => {
    if (!record(row) || typeof row.baseSlug !== "string" || !Array.isArray(row.editions)) return [];
    const baseSlug = row.baseSlug;
    return row.editions.flatMap((edition) => {
      if (!record(edition) || !parseMarket(edition.market) || record(edition.seo) && edition.seo.noIndex === true) return [];
      const slug = typeof edition.slug === "string" ? edition.slug : baseSlug;
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return [];
      const path = row._type === "publication" ? `/insights/${slug}`
        : row.routeKind === "home" ? "/"
        : row.routeKind === "service" ? `/what-we-do/${slug}`
        : row.routeKind === "platform" ? `/platforms/${slug}`
        : row.routeKind === "industry" ? `/industries/${slug}`
        : `/${slug}`;
      const lastmod = typeof row._updatedAt === "string" && Number.isFinite(Date.parse(row._updatedAt))
        ? `<lastmod>${new Date(row._updatedAt).toISOString()}</lastmod>` : "";
      return [`<url><loc>${safeOrigin}${path}</loc>${lastmod}</url>`];
    });
  });
  return urls.length
    ? `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...new Set(urls)].join("")}</urlset>`
    : xml(fallbackPaths);
}