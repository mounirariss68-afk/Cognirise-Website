import { getGetPublishedContentQueryKey, useGetPublishedContent, useListPublishedContent } from "@workspace/api-client-react";
import type { DocumentKind, PublishedContent } from "@workspace/api-client-react";
import {
  type CmsContent,
  type CmsDocumentKind,
  type PersonContent,
  type PartnerContent,
  type PlatformContent,
  type PublicationContent,
  type CaseStudyContent,
  type IndustryContent,
  type FrameworkContent,
  validateCmsContent,
} from "@workspace/api-zod";
import { useMarketStore } from "@/store/market";

export type CmsContentByKind = {
  person: PersonContent;
  partner: PartnerContent;
  platform: PlatformContent;
  publication: PublicationContent;
  "case-study": CaseStudyContent;
  industry: IndustryContent;
  framework: FrameworkContent;
};
export type CmsRecord<T extends CmsContent = CmsContent> = T & {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  media: PublishedContent["media"];
  seo: PublishedContent["seo"];
  publishedAt: string;
  updatedAt: string;
};
export type CmsDeliveryState = "cms" | "compiled-fallback" | "intentional-empty" | "loading" | "api-error" | "contract-error";
export type CmsEntryRenderPolicy = "cms" | "compiled-fallback" | "loading" | "unavailable";

export function cmsEntryRenderPolicy(
  isAuthoritative: boolean,
  delivery: CmsDeliveryState,
): CmsEntryRenderPolicy {
  if (delivery === "cms") return "cms";
  if (!isAuthoritative && delivery === "compiled-fallback") return "compiled-fallback";
  if (delivery === "loading") return "loading";
  return "unavailable";
}

const env = import.meta.env ?? {};
const CUTOVER: Record<CmsDocumentKind, boolean> = {
  person: env.VITE_CMS_CUTOVER_PEOPLE === "true",
  partner: env.VITE_CMS_CUTOVER_PARTNERS === "true",
  platform: env.VITE_CMS_CUTOVER_PLATFORMS === "true",
  publication: env.VITE_CMS_CUTOVER_PUBLICATIONS === "true",
  "case-study": env.VITE_CMS_CUTOVER_CASE_STUDIES === "true",
  industry: env.VITE_CMS_CUTOVER_INDUSTRIES === "true",
  framework: env.VITE_CMS_CUTOVER_FRAMEWORKS === "true",
};

export function contentRecord<K extends CmsDocumentKind>(item: PublishedContent, kind: K): CmsRecord<CmsContentByKind[K]> {
  const content = { ...(item.content as CmsContent) } as CmsContent & {
    heroMediaId?: string;
    image?: string;
    imageAlt?: string;
  };
  if (kind === "industry" && content.heroMediaId) {
    const hero = item.media?.find((media) => media.id === content.heroMediaId);
    if (hero) {
      content.image = hero.url;
      content.imageAlt = hero.altText || content.imageAlt;
    }
  }
  return {
    ...content,
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary ?? null,
    media: item.media,
    seo: item.seo,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
  } as unknown as CmsRecord<CmsContentByKind[K]>;
}

export function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function stringList(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

export function useCmsCollection<T>(
  kind: DocumentKind,
  fallback: T[],
  mapper: (item: PublishedContent, index: number) => T | null,
) {
  const { market } = useMarketStore();
  const query = useListPublishedContent({ kind, market, locale: "en", pageSize: 100 });
  const validations = query.data?.items.map((item) => validateCmsContent(kind as CmsDocumentKind, item.content, "publish"));
  const contractErrors = validations?.flatMap((result) => result.success ? [] : result.errors) ?? [];
  const validItems = query.data?.items.filter((_item, index) => validations?.[index]?.success) ?? [];
  const mapped = validItems.map(mapper).filter((item): item is T => item !== null);
  const cutover = CUTOVER[kind as CmsDocumentKind];
  let delivery: CmsDeliveryState;
  if (query.isPending) delivery = "loading";
  else if (query.isError) delivery = "api-error";
  else if (contractErrors.length) delivery = "contract-error";
  else if (mapped.length) delivery = "cms";
  else delivery = cutover ? "intentional-empty" : "compiled-fallback";
  const useFallback = !cutover && delivery !== "cms";
  const issue = query.isError
    ? `CMS request failed for ${kind}.`
    : contractErrors.length
      ? `CMS contract rejected ${kind}: ${contractErrors.join("; ")}`
      : null;
  if (issue) console.error(issue);

  return {
    ...query,
    data: useFallback ? fallback : mapped,
    delivery,
    issue,
    isFallback: useFallback,
    isAuthoritative: cutover,
    selectedMarket: (query.data as (typeof query.data & { market?: string }) | undefined)?.market,
    usedMarketFallback: (query.data as (typeof query.data & { usedFallback?: boolean }) | undefined)?.usedFallback ?? false,
  };
}

export function useCmsEntry(kind: DocumentKind, slug: string) {
  const { market } = useMarketStore();
  // Collection landing narratives are intentionally code-owned; only entity
  // details are CMS-owned. Do not model landings as sentinel entity records.
  const codeOwnedLanding = ["about", "advisors", "partners", "platforms", "insights", "work"].includes(slug);
  const cutover = CUTOVER[kind as CmsDocumentKind];
  const cutoverGated = kind === "framework" && !cutover;
  const query = useGetPublishedContent(market, "en", kind, slug, {
    query: {
      enabled: !codeOwnedLanding && !cutoverGated,
      queryKey: getGetPublishedContentQueryKey(market, "en", kind, slug),
    },
  });
  const validation = query.data
    ? validateCmsContent(kind as CmsDocumentKind, query.data.content, "publish")
    : undefined;
  const issue = query.isError
    ? `CMS detail request failed for ${kind}/${slug}.`
    : validation && !validation.success
      ? `CMS contract rejected ${kind}/${slug}: ${validation.errors.join("; ")}`
      : null;
  if (issue) console.error(issue);
  return {
    ...query,
    data: codeOwnedLanding || cutoverGated ? undefined : validation?.success ? query.data : undefined,
    delivery: codeOwnedLanding || cutoverGated ? "compiled-fallback" as const
      : query.isPending ? "loading" as const
      : issue ? (validation && !validation.success ? "contract-error" : "api-error") as CmsDeliveryState
      : query.data ? "cms" as const
      : "intentional-empty" as const,
    issue,
    isAuthoritative: cutover,
  };
}