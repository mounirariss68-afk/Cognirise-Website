import { CANONICAL_MARKET, parseMarket, type CmsMarket } from "./security";

const API_VERSION = "2025-02-19";
// Editions, rather than document-level fields, are the delivery boundary.
const PAGE_QUERY = `*[_type == "page" && slug.current == $slug][0]{
  "_id": _id, "_rev": _rev, "slug": slug.current, _updatedAt,
  "requestedEdition": marketEditions[market->code == $market][0]{
    "market": market->code, fallbackMode, publicationState, title, summary,
    "slug": localizedSlug.current, body, sections, seo, publishAt, expiresAt
  },
  "uaeEdition": marketEditions[market->code == "uae"][0]{
    "market": market->code, fallbackMode, publicationState, title, summary,
    "slug": localizedSlug.current, body, sections, seo, publishAt, expiresAt
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
}
export interface PageDocument {
  id: string;
  revision: string;
  slug: string;
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
    typeof value.slug !== "string" || typeof value._updatedAt !== "string") {
    throw new Error("CMS page failed runtime contract validation");
  }
  return {
    id: value._id, revision: value._rev, slug: value.slug, updatedAt: value._updatedAt,
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
  let resolved = requested;
  let deliveryMode: DeliveryMode = requested.fallbackMode;
  if (requested.fallbackMode === "uaeFallback") {
    const uae = document.uaeEdition;
    if (!uae || uae.market !== CANONICAL_MARKET || uae.fallbackMode !== "canonical" ||
      (!preview && !isPublishedAndLive(uae, now))) {
      return unavailable(requested);
    }
    resolved = uae;
  } else if (requested.fallbackMode === "canonical" && requestedMarket !== CANONICAL_MARKET) {
    return unavailable(requested);
  }
  return {
    schemaVersion: 1,
    page: {
      id: document.id, revision: document.revision, slug: resolved.slug ?? document.slug,
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
async function queryPage(market: CmsMarket, slug: string, preview: boolean): Promise<PageDocument | null> {
  const cms = config();
  if (!cms) throw new Error("CMS is not configured");
  if (preview && !cms.token) throw new Error("CMS preview token is not configured");
  const params = new URLSearchParams({ query: PAGE_QUERY, "$market": JSON.stringify(market), "$slug": JSON.stringify(slug), perspective: preview ? "drafts" : "published" });
  const response = await fetch(`https://${cms.projectId}.${preview ? "api.sanity.io" : "apicdn.sanity.io"}/v${API_VERSION}/data/query/${encodeURIComponent(cms.dataset)}?${params}`, {
    headers: preview && cms.token ? { Authorization: `Bearer ${cms.token}` } : {}, signal: AbortSignal.timeout(4_000),
  });
  if (!response.ok) throw new Error(`CMS query failed with status ${response.status}`);
  const body = await response.json() as unknown;
  if (!record(body) || !("result" in body)) throw new Error("CMS response envelope is invalid");
  return validatePageDocument(body.result);
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
export async function getPublishedPage(market: CmsMarket, slug: string, now = Date.now()): Promise<CmsPageEnvelope> {
  const key = `${market}:${slug}`;
  const cached = cache.get(key);
  if (cached && cached.expiresAt > now) return { ...cached.result, meta: { ...cached.result.meta, source: "cache" } };
  try {
    const result = resolveEdition(await queryPage(market, slug, false), market, false, now);
    cache.set(key, { result, ...cacheDeadlines(result, now) });
    return result;
  } catch {
    if (cached && cached.staleUntil > now) return { ...cached.result, meta: { ...cached.result.meta, source: "cache" } };
    return { schemaVersion: 1, page: null, meta: { requestedMarket: market, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable", source: "migration-fallback", preview: false, fallbackVersion: FALLBACK_VERSION } };
  }
}
export async function getPreviewPage(market: CmsMarket, slug: string): Promise<CmsPageEnvelope> {
  return resolveEdition(await queryPage(market, slug, true), market, true);
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