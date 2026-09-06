import { and, eq, inArray, isNull } from "drizzle-orm";
import { cmsDocumentsTable, cmsMarketEditionsTable, cmsRedirectsTable, cmsRevisionsTable, db } from "@workspace/db";
import { CANONICAL_MARKET, type CmsMarket } from "./security";
import { cmsEditionPayloadSchema } from "./contracts";
import { hydratePublicPage, hydratePublicPublication } from "./public-hydration";
import { resolvePublicEdition, type FallbackMode, type PublicationState } from "./public-resolution";

export { resolvePublicEdition };
export type { FallbackMode, PublicationState };
export type DeliveryMode = FallbackMode;
export type RouteKind = "home" | "service" | "platform" | "industry" | "caseStudy" | "about" | "contact" | "landing" | "legal";

export interface CmsPage {
  id: string; revision: string; slug: string; routeKind: RouteKind; market: CmsMarket;
  title?: string; summary?: string; body?: readonly Record<string, unknown>[];
  seo?: Record<string, unknown>; sections: readonly Record<string, unknown>[];
  updatedAt: string; publicationState: PublicationState; publishAt?: string; expiresAt?: string;
}
export interface CmsPageEnvelope {
  schemaVersion: 1; page: CmsPage | null;
  meta: {
    requestedMarket: CmsMarket; resolvedMarket: CmsMarket | null; marketFallback: boolean;
    deliveryMode: DeliveryMode; requestedPublicationState?: PublicationState;
    resolvedPublicationState?: PublicationState; requestedPublishAt?: string; requestedExpiresAt?: string;
    publishAt?: string; expiresAt?: string; source: "postgres"; preview: boolean;
  };
}
export interface Edition {
  market: CmsMarket; fallbackMode: FallbackMode; publicationState: PublicationState;
  title?: string; summary?: string; slug?: string; body?: readonly Record<string, unknown>[];
  seo?: Record<string, unknown>; sections?: readonly Record<string, unknown>[];
  publishAt?: string; expiresAt?: string; parityComplete?: boolean;
}
export interface PageDocument {
  id: string; revision: string; slug: string; routeKind: RouteKind; updatedAt: string;
  requestedEdition: Edition | null; uaeEdition: Edition | null;
}

const states: readonly PublicationState[] = ["draft", "review", "approved", "scheduled", "published", "expired", "archived"];
const fallbacks: readonly FallbackMode[] = ["canonical", "uaeFallback", "override", "unavailable"];
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const iso = (value: Date | null) => value?.toISOString();
type StoredNavigationLink = {
  label: string;
  internal?: { id: string };
  externalUrl?: string;
  children?: StoredNavigationLink[];
};
type RuntimeNavigationTarget = {
  id: string;
  _type: "page" | "publication";
  slug: string;
  routeKind?: RouteKind;
};
type RuntimeNavigationLink = {
  label: string;
  internal?: RuntimeNavigationTarget;
  externalUrl?: string;
  children?: RuntimeNavigationLink[];
};
const unavailable = (market: CmsMarket, preview: boolean, requested?: typeof cmsMarketEditionsTable.$inferSelect): CmsPageEnvelope => ({
  schemaVersion: 1, page: null, meta: {
    requestedMarket: market, resolvedMarket: null, marketFallback: false, deliveryMode: "unavailable",
    ...(requested && states.includes(requested.publicationState as PublicationState) ? { requestedPublicationState: requested.publicationState as PublicationState } : {}),
    ...(iso(requested?.publishAt ?? null) ? { requestedPublishAt: iso(requested?.publishAt ?? null)! } : {}),
    ...(iso(requested?.expiresAt ?? null) ? { requestedExpiresAt: iso(requested?.expiresAt ?? null)! } : {}),
    source: "postgres", preview,
  },
});
function navigationReferenceIds(items: readonly StoredNavigationLink[]): string[] {
  return items.flatMap((item) => [
    ...(item.internal ? [item.internal.id] : []),
    ...navigationReferenceIds(item.children ?? []),
  ]);
}
function resolveNavigationLinks(
  items: readonly StoredNavigationLink[],
  targets: ReadonlyMap<string, RuntimeNavigationTarget>,
): RuntimeNavigationLink[] {
  return items.flatMap((item) => {
    const internal = item.internal ? targets.get(item.internal.id) : undefined;
    if (item.internal && !internal) return [];
    const children = resolveNavigationLinks(item.children ?? [], targets);
    return [{
      label: item.label,
      ...(internal ? { internal } : {}),
      ...(item.externalUrl ? { externalUrl: item.externalUrl } : {}),
      ...(children.length ? { children } : {}),
    }];
  });
}
async function navigationTargets(
  ids: readonly string[],
  market: CmsMarket,
  now = new Date(),
): Promise<Map<string, RuntimeNavigationTarget>> {
  const uniqueIds = [...new Set(ids)];
  if (!uniqueIds.length) return new Map();
  const markets = market === CANONICAL_MARKET ? [CANONICAL_MARKET] : [market, CANONICAL_MARKET];
  const rows = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable })
    .from(cmsDocumentsTable)
    .innerJoin(cmsMarketEditionsTable, eq(cmsMarketEditionsTable.documentId, cmsDocumentsTable.id))
    .where(and(
      inArray(cmsDocumentsTable.id, uniqueIds),
      inArray(cmsMarketEditionsTable.market, markets),
      isNull(cmsDocumentsTable.archivedAt),
    ));
  const byDocumentMarket = new Map(rows.map((row) => [`${row.document.id}:${row.edition.market}`, row]));
  const targets = new Map<string, RuntimeNavigationTarget>();
  for (const id of uniqueIds) {
    const requested = byDocumentMarket.get(`${id}:${market}`);
    const uae = byDocumentMarket.get(`${id}:${CANONICAL_MARKET}`);
    if (!requested?.edition.liveRevisionId) continue;
    const delivery = resolvePublicEdition(requested?.edition, uae?.edition, market, now);
    if (delivery === "unavailable") continue;
    const resolved = delivery === "uae" ? uae : requested;
    if (!resolved?.edition.liveRevisionId || !resolved.document.canonicalSlug) continue;
    const slug = requested.edition.localizedSlug ?? resolved.document.canonicalSlug;
    if (resolved.document.kind === "publication") {
      targets.set(id, { id, _type: "publication", slug });
      continue;
    }
    if (resolved.document.kind !== "page" || !resolved.document.routeKind) continue;
    if ((resolved.edition.fallbackMode === "canonical" || resolved.edition.fallbackMode === "override") &&
      !resolved.edition.parityComplete) continue;
    targets.set(id, {
      id,
      _type: "page",
      slug,
      routeKind: resolved.document.routeKind as RouteKind,
    });
  }
  return targets;
}
async function asPage(
  document: typeof cmsDocumentsTable.$inferSelect,
  contentEdition: typeof cmsMarketEditionsTable.$inferSelect,
  revision: typeof cmsRevisionsTable.$inferSelect,
  routeEdition = contentEdition,
  now = new Date(),
): Promise<CmsPage | null> {
  const parsed = cmsEditionPayloadSchema.safeParse(revision.payload);
  if (!parsed.success || parsed.data.documentId !== document.id || parsed.data.market !== contentEdition.market ||
    parsed.data.fallbackMode !== contentEdition.fallbackMode || parsed.data.content.kind !== "page" ||
    parsed.data.content.ownership.sensitivity !== "public") return null;
  const content = await hydratePublicPage(
    parsed.data.content,
    revision.id,
    routeEdition.market as CmsMarket,
    now,
  );
  const title = typeof content.title === "string" ? content.title : undefined;
  const summary = typeof content.summary === "string" ? content.summary : undefined;
  const sections = content.sections.filter(record);
  const seo = record(content.seo) ? content.seo : undefined;
  if (!document.routeKind || !document.canonicalSlug) return null;
  return {
    id: document.id, revision: revision.id, slug: routeEdition.localizedSlug ?? document.canonicalSlug,
    routeKind: document.routeKind as RouteKind, market: routeEdition.market as CmsMarket,
    ...(title ? { title } : {}), ...(summary ? { summary } : {}), ...(seo ? { seo } : {}),
    sections, updatedAt: revision.createdAt.toISOString(), publicationState: contentEdition.publicationState as PublicationState,
    ...(iso(contentEdition.publishAt) ? { publishAt: iso(contentEdition.publishAt)! } : {}),
    ...(iso(contentEdition.expiresAt) ? { expiresAt: iso(contentEdition.expiresAt)! } : {}),
  };
}
async function revision(id: string | null): Promise<typeof cmsRevisionsTable.$inferSelect | undefined> {
  if (!id) return undefined;
  return (await db.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, id)).limit(1))[0];
}

/** Public reads select only live revisions; no cache or fixture fallback exists. */
export async function getPublishedPage(market: CmsMarket, slug: string, routeKind: RouteKind, now = new Date()): Promise<CmsPageEnvelope> {
  const rows = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable })
    .from(cmsMarketEditionsTable).innerJoin(cmsDocumentsTable, eq(cmsMarketEditionsTable.documentId, cmsDocumentsTable.id))
    .where(and(
      eq(cmsDocumentsTable.kind, "page"),
      eq(cmsDocumentsTable.routeKind, routeKind),
      eq(cmsMarketEditionsTable.market, market),
      eq(cmsMarketEditionsTable.localizedSlug, slug),
      isNull(cmsDocumentsTable.archivedAt),
    )).limit(2);
  if (rows.length !== 1) return unavailable(market, false);
  const requested = rows[0]!.edition;
  if (!requested.liveRevisionId) return unavailable(market, false, requested);
  const [uae] = requested.fallbackMode === "uaeFallback"
    ? await db.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, requested.documentId), eq(cmsMarketEditionsTable.market, CANONICAL_MARKET))).limit(1)
    : [];
  const delivery = resolvePublicEdition(requested, uae, market, now);
  if (delivery === "unavailable") return unavailable(market, false, requested);
  const resolved = delivery === "uae" ? uae! : requested;
  const resolvedRevision = await revision(resolved.liveRevisionId);
  if (!resolvedRevision) return unavailable(market, false, requested);
  const page = await asPage(rows[0]!.document, resolved, resolvedRevision, requested, now);
  if (!page || ((resolved.fallbackMode === "canonical" || resolved.fallbackMode === "override") && !resolved.parityComplete)) return unavailable(market, false, requested);
  return { schemaVersion: 1, page, meta: {
    requestedMarket: market, resolvedMarket: resolved.market as CmsMarket, marketFallback: resolved !== requested,
    deliveryMode: requested.fallbackMode as DeliveryMode, requestedPublicationState: requested.publicationState as PublicationState,
    resolvedPublicationState: resolved.publicationState as PublicationState, source: "postgres", preview: false,
  } };
}

/** Preview is revision-bound by the route layer; it never discovers a draft by slug. */
export async function getPreviewRevision(documentId: string, editionId: string, revisionId: string): Promise<CmsPageEnvelope | null> {
  const [row] = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable, revision: cmsRevisionsTable })
    .from(cmsRevisionsTable).innerJoin(cmsMarketEditionsTable, eq(cmsRevisionsTable.editionId, cmsMarketEditionsTable.id))
    .innerJoin(cmsDocumentsTable, eq(cmsMarketEditionsTable.documentId, cmsDocumentsTable.id))
    .where(and(eq(cmsDocumentsTable.id, documentId), eq(cmsMarketEditionsTable.id, editionId), eq(cmsRevisionsTable.id, revisionId))).limit(1);
  if (!row) return null;
  const page = await asPage(row.document, row.edition, row.revision);
  return page ? { schemaVersion: 1, page, meta: { requestedMarket: row.edition.market as CmsMarket, resolvedMarket: row.edition.market as CmsMarket, marketFallback: false, deliveryMode: row.edition.fallbackMode as DeliveryMode, source: "postgres", preview: true } } : null;
}

async function publishedContent(market: CmsMarket, kind: "publication" | "navigation", now = new Date()) {
  const requestedRows = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable, revision: cmsRevisionsTable })
    .from(cmsMarketEditionsTable).innerJoin(cmsDocumentsTable, eq(cmsDocumentsTable.id, cmsMarketEditionsTable.documentId))
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.liveRevisionId))
    .where(and(
      eq(cmsMarketEditionsTable.market, market),
      eq(cmsDocumentsTable.kind, kind),
      isNull(cmsDocumentsTable.archivedAt),
    ));
  const fallbackIds = requestedRows.filter((row) => row.edition.fallbackMode === "uaeFallback").map((row) => row.document.id);
  const uaeRows = fallbackIds.length
    ? await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable, revision: cmsRevisionsTable })
      .from(cmsMarketEditionsTable).innerJoin(cmsDocumentsTable, eq(cmsDocumentsTable.id, cmsMarketEditionsTable.documentId))
      .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.liveRevisionId))
      .where(and(
        eq(cmsMarketEditionsTable.market, CANONICAL_MARKET),
        eq(cmsDocumentsTable.kind, kind),
        inArray(cmsDocumentsTable.id, fallbackIds),
        isNull(cmsDocumentsTable.archivedAt),
      ))
    : [];
  const uaeByDocument = new Map(uaeRows.map((row) => [row.document.id, row]));
  return requestedRows.flatMap((requested) => {
    const uae = uaeByDocument.get(requested.document.id);
    const delivery = resolvePublicEdition(requested.edition, uae?.edition, market, now);
    if (delivery === "unavailable") return [];
    const row = delivery === "uae" ? uae! : requested;
    const parsed = cmsEditionPayloadSchema.safeParse(row.revision.payload);
    return parsed.success && parsed.data.documentId === row.document.id &&
      parsed.data.market === row.edition.market &&
      parsed.data.fallbackMode === row.edition.fallbackMode &&
      parsed.data.content.ownership.sensitivity === "public" &&
      parsed.data.content.kind === kind
      ? [{ ...row, routeEdition: requested.edition, content: parsed.data.content }] : [];
  });
}
export async function getPublishedPublications(market: CmsMarket, slug?: string) {
  const now = new Date();
  const rows = await publishedContent(market, "publication", now);
  const publications = await Promise.all(rows.map(async (row) => {
    if (row.content.kind !== "publication") throw new Error("CMS publication resolver returned the wrong content kind");
    return {
      id: row.document.id,
      revision: row.revision.id,
      slug: row.routeEdition.localizedSlug ?? row.document.canonicalSlug,
      market,
      ...await hydratePublicPublication(row.content, row.revision.id, market, now),
    };
  }));
  return slug ? publications.find((publication) => publication.slug === slug) ?? null : publications;
}
export async function getRuntime(market: CmsMarket) {
  const [navigation, redirects] = await Promise.all([
    publishedContent(market, "navigation"),
    db.select().from(cmsRedirectsTable).where(and(eq(cmsRedirectsTable.market, market), eq(cmsRedirectsTable.active, true))),
  ]);
  const normalizedNavigation = navigation.flatMap((row) => row.content.kind === "navigation"
    ? [{
      id: row.document.id,
      revision: row.revision.id,
      kind: "navigation" as const,
      placement: row.content.content.placement,
      items: row.content.content.items as StoredNavigationLink[],
    }]
    : []);
  const targets = await navigationTargets(
    normalizedNavigation.flatMap((item) => navigationReferenceIds(item.items)),
    market,
  );
  return {
    schemaVersion: 1, market,
    navigation: normalizedNavigation.map((item) => ({
      ...item,
      items: resolveNavigationLinks(item.items, targets),
    })),
    redirects: redirects.map(({ sourcePath, destinationPath, statusCode }) => ({ sourcePath, destinationPath, statusCode })),
    source: "postgres" as const,
  };
}
export function publicSiteOrigin(configured = process.env.CMS_PUBLIC_SITE_ORIGIN ?? process.env.PUBLIC_SITE_ORIGIN): string {
  if (!configured) throw new Error("CMS_PUBLIC_SITE_ORIGIN or PUBLIC_SITE_ORIGIN must be configured for sitemap delivery");
  let url: URL;
  try { url = new URL(configured); } catch { throw new Error("CMS public site origin must be a valid absolute HTTPS URL"); }
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("CMS public site origin must be an absolute HTTPS origin without path, credentials, query, or fragment");
  }
  return url.origin;
}
export function sitemapPath(routeKind: RouteKind, slug: string): string | undefined {
  if (routeKind === "home") return "/";
  if (routeKind === "service") return slug === "what-we-do" ? "/what-we-do" : `/what-we-do/${slug}`;
  if (routeKind === "platform") return slug === "platforms" ? "/platforms" : `/platforms/${slug}`;
  if (routeKind === "industry") return slug === "industries" ? "/industries" : `/industries/${slug}`;
  if (routeKind === "caseStudy") return slug === "work" ? "/work" : undefined;
  if (routeKind === "about") return ["about", "partners", "faq"].includes(slug) ? `/${slug}` : undefined;
  if (routeKind === "contact") return slug === "contact" ? "/contact" : undefined;
  if (routeKind === "landing") return ["insights", "value-scan"].includes(slug) ? `/${slug}` : undefined;
  return undefined;
}
export async function getSitemap(origin?: string) {
  const rows = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable, revision: cmsRevisionsTable })
    .from(cmsMarketEditionsTable).innerJoin(cmsDocumentsTable, eq(cmsDocumentsTable.id, cmsMarketEditionsTable.documentId))
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.liveRevisionId))
    .where(and(
      inArray(cmsDocumentsTable.kind, ["page", "publication"]),
      isNull(cmsDocumentsTable.archivedAt),
    ));
  const resolvedOrigin = publicSiteOrigin(origin);
  const byDocumentMarket = new Map(rows.map((row) => [`${row.document.id}:${row.edition.market}`, row]));
  const now = new Date();
  const urls = rows.flatMap((requested) => {
    const uae = byDocumentMarket.get(`${requested.document.id}:${CANONICAL_MARKET}`);
    const delivery = resolvePublicEdition(requested.edition, uae?.edition, requested.edition.market as CmsMarket, now);
    if (delivery === "unavailable") return [];
    const row = delivery === "uae" ? uae! : requested;
    if (row.document.kind === "page" && (row.edition.fallbackMode === "canonical" || row.edition.fallbackMode === "override") && !row.edition.parityComplete) return [];
    const parsed = cmsEditionPayloadSchema.safeParse(row.revision.payload);
    const routeSlug = requested.edition.localizedSlug ?? row.document.canonicalSlug;
    const path = parsed.success && parsed.data.documentId === row.document.id &&
      parsed.data.market === row.edition.market &&
      parsed.data.fallbackMode === row.edition.fallbackMode &&
      routeSlug
      ? parsed.data.content.kind === "page"
        ? sitemapPath(row.document.routeKind as RouteKind, routeSlug)
        : parsed.data.content.kind === "publication" ? `/insights/${routeSlug}` : undefined
      : undefined;
    return path ? [new URL(path, resolvedOrigin).toString()] : [];
  });
  return [...new Set(urls)];
}

export function invalidatePublishedCache(): number { return 0; }
export function cmsConfigurationStatus() { return { configured: Boolean(process.env.DATABASE_URL), previewConfigured: Boolean(process.env.DATABASE_URL && (process.env.CMS_PREVIEW_SECRETS || process.env.SESSION_SECRET)), workflowConfigured: Boolean(process.env.DATABASE_URL && process.env.CLERK_SECRET_KEY) }; }