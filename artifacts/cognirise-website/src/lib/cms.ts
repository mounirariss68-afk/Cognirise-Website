import {
  getGetCmsPreviewPageQueryKey,
  getGetCmsPublishedPageQueryKey,
  useGetCmsPreviewPage,
  useGetCmsPublishedPage,
  type CmsPageEnvelope,
} from "@workspace/api-client-react";
import type { Market } from "@/store/market";

export type CmsSource = "sanity" | "cache" | "migration-fallback";

export interface CmsPageState {
  readonly page: CmsPageEnvelope["page"];
  readonly requestedMarket: Market;
  readonly resolvedMarket: Market | null;
  readonly marketFallback: boolean;
  readonly source: CmsSource;
  readonly preview: boolean;
  readonly fallbackVersion?: string;
}

const validMarkets: readonly Market[] = ["uae", "ksa", "turkiye", "europe"];
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function cmsSlugForPath(pathname: string): string {
  const path = pathname.split("?")[0].split("#")[0];
  if (path === "/") return "home";
  const candidate = path.replace(/^\/+|\/+$/g, "").split("/").at(-1) ?? "";
  return slugPattern.test(candidate) ? candidate : "home";
}

function isCmsPageState(value: unknown): value is CmsPageState {
  if (!value || typeof value !== "object") return false;
  const envelope = value as Record<string, unknown>;
  const meta = envelope.meta;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) return false;
  const fields = meta as Record<string, unknown>;
  const page = envelope.page;
  const validPage = page === null || (
    typeof page === "object" &&
    !Array.isArray(page) &&
    typeof (page as Record<string, unknown>).id === "string" &&
    typeof (page as Record<string, unknown>).revision === "string" &&
    typeof (page as Record<string, unknown>).slug === "string" &&
    validMarkets.includes((page as Record<string, unknown>).market as Market) &&
    ((page as Record<string, unknown>).title === undefined || typeof (page as Record<string, unknown>).title === "string") &&
    Array.isArray((page as Record<string, unknown>).sections) &&
    ((page as Record<string, unknown>).sections as unknown[]).every(
      (section) => typeof section === "object" && section !== null && !Array.isArray(section),
    ) &&
    typeof (page as Record<string, unknown>).updatedAt === "string" &&
    ["draft", "review", "approved", "scheduled", "published", "expired", "archived"].includes(
      (page as Record<string, unknown>).publicationState as string,
    ) &&
    ((page as Record<string, unknown>).seo === undefined ||
      (typeof (page as Record<string, unknown>).seo === "object" &&
        (page as Record<string, unknown>).seo !== null &&
        !Array.isArray((page as Record<string, unknown>).seo)))
  );
  return (
    envelope.schemaVersion === 1 &&
    validPage &&
    validMarkets.includes(fields.requestedMarket as Market) &&
    (fields.resolvedMarket === null || validMarkets.includes(fields.resolvedMarket as Market)) &&
    typeof fields.marketFallback === "boolean" &&
    ["canonical", "override", "uaeFallback", "unavailable"].includes(fields.deliveryMode as string) &&
    ["sanity", "cache", "migration-fallback"].includes(fields.source as string) &&
    typeof fields.preview === "boolean" &&
    (fields.fallbackVersion === undefined || typeof fields.fallbackVersion === "string")
  );
}

function toState(envelope: CmsPageEnvelope, market: Market, preview: boolean): CmsPageState {
  if (!isCmsPageState(envelope)) throw new Error("CMS response failed runtime contract validation");
  if (envelope.meta.requestedMarket !== market || envelope.meta.preview !== preview) {
    throw new Error("CMS response does not match the requested page mode or market");
  }
  return {
    page: envelope.page,
    requestedMarket: envelope.meta.requestedMarket,
    resolvedMarket: envelope.meta.resolvedMarket,
    marketFallback: envelope.meta.marketFallback,
    source: envelope.meta.source,
    preview,
    ...(envelope.meta.fallbackVersion ? { fallbackVersion: envelope.meta.fallbackVersion } : {}),
  };
}

export function hardCodedPageFallback(market: Market): CmsPageState {
  return {
    page: null,
    requestedMarket: market,
    resolvedMarket: "uae",
    marketFallback: market !== "uae",
    source: "migration-fallback",
    preview: false,
    fallbackVersion: "website-hard-coded-v1",
  };
}

/**
 * Published CMS data is intentionally advisory until content migration. Existing
 * page components remain the deterministic rendering and outage fallback.
 */
export function useCmsPublishedPage(market: Market, pathname: string, enabled = true) {
  const slug = cmsSlugForPath(pathname);
  const query = useGetCmsPublishedPage(market, slug, {
    query: {
      enabled,
      queryKey: getGetCmsPublishedPageQueryKey(market, slug),
      select: (envelope) => toState(envelope, market, false),
    },
  });

  return { ...query, slug, state: query.data ?? hardCodedPageFallback(market) };
}

export function useCmsPreviewPage(market: Market, slug: string, enabled: boolean) {
  const query = useGetCmsPreviewPage(market, slug, {
    query: {
      enabled: enabled && slugPattern.test(slug),
      queryKey: getGetCmsPreviewPageQueryKey(market, slug),
      select: (envelope) => toState(envelope, market, true),
    },
  });

  return { ...query, state: query.data };
}

export function isCmsMarket(value: string | undefined): value is Market {
  return validMarkets.includes(value as Market);
}

export function isCmsSlug(value: string | undefined): value is string {
  return Boolean(value && slugPattern.test(value));
}