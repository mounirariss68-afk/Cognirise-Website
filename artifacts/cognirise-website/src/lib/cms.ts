import { getGetPublicContactConfigurationQueryKey, getGetPublicHeroFilmQueryKey, getGetPublishedContentQueryKey, useGetPublishedContent, useGetPublicContactConfiguration, useGetPublicHeroFilm, useListPublishedContent } from "@workspace/api-client-react";
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
  type OfficeContent,
  type LandingPageContent,
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
  office: OfficeContent;
  "landing-page": LandingPageContent;
};
export type WebsiteCmsDocumentKind = Exclude<CmsDocumentKind, "site-configuration">;
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
export type HeroFilmSources = {
  mp4: string;
  webm: string;
  poster: string;
};
type DeliveredCmsMedia = NonNullable<PublishedContent["media"]>[number];
type ImmutableCmsMediaReference = {
  mediaId: string;
  mediaVersionId: string;
  altText?: string;
};

/**
 * Resolve governed media by its exact immutable version. Legacy asset IDs are
 * consulted only for documents which have not yet been migrated to a
 * structured reference.
 */
export function resolveCmsMedia(
  media: PublishedContent["media"],
  reference?: ImmutableCmsMediaReference,
  legacyMediaId?: string,
): DeliveredCmsMedia | undefined {
  if (reference) {
    return media?.find((item) =>
      item.id === reference.mediaId && item.versionId === reference.mediaVersionId
    );
  }
  return legacyMediaId ? media?.find((item) => item.id === legacyMediaId) : undefined;
}

/** The compiled route inventory is deliberately explicit.  Reconciliation
 * seeds the same keys, so adding a new compiled landing cannot bypass CMS
 * ownership unnoticed. */
export const COMPILED_LANDING_ROUTES = [
  { sourceKey: "compiled:/", path: "/", template: "landing" },
  { sourceKey: "compiled:/about", path: "/about", template: "landing" },
  { sourceKey: "compiled:/partners", path: "/partners", template: "landing" },
  { sourceKey: "compiled:/platforms", path: "/platforms", template: "landing" },
  { sourceKey: "compiled:/insights", path: "/insights", template: "landing" },
  { sourceKey: "compiled:/methodologies", path: "/methodologies", template: "methodologies" },
] as const;

export const COMPILED_CONTACT_EMAIL = "hello@cognirise.ai";

export function resolvePublishedContactEmail(
  published: { contactEmail?: unknown } | undefined,
): string {
  return typeof published?.contactEmail === "string" && published.contactEmail.trim()
    ? published.contactEmail
    : COMPILED_CONTACT_EMAIL;
}

export function usePublishedContactEmail(): string {
  const { market, locale } = useMarketStore();
  const params = publicContactConfigurationParams(market, locale);
  const query = useGetPublicContactConfiguration(params, {
    query: {
      enabled: Boolean(market),
      queryKey: getGetPublicContactConfigurationQueryKey(params),
      retry: false,
    },
  });
  return resolvePublishedContactEmail(query.data);
}

export function publicContactConfigurationParams(market: string, locale: string) {
  return { market, locale };
}

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
export type PublishedHeroFilmResponse = {
  slot: string;
  poster: { id: string; versionId: string; url: string; mimeType: string };
  sources: Array<{ id: string; versionId: string; url: string; mimeType: string }>;
};

export function resolvePublishedHeroFilm(
  published: PublishedHeroFilmResponse | undefined,
  fallback: HeroFilmSources,
): HeroFilmSources {
  const mp4 = published?.sources.find((source) => source.mimeType === "video/mp4");
  const webm = published?.sources.find((source) => source.mimeType === "video/webm");
  const poster = published?.poster;
  return mp4 && webm && poster?.mimeType.startsWith("image/")
    ? { mp4: mp4.url, webm: webm.url, poster: poster.url }
    : fallback;
}

export function usePublishedHeroFilm(
  slot: "homepage" | "industries",
  fallback: HeroFilmSources,
): HeroFilmSources {
  const { market, locale } = useMarketStore();
  const params = { market, locale };
  const query = useGetPublicHeroFilm(slot, params, {
    query: {
      enabled: Boolean(market),
      queryKey: getGetPublicHeroFilmQueryKey(slot, params),
    },
  });
  return resolvePublishedHeroFilm(query.data as PublishedHeroFilmResponse | undefined, fallback);
}

const CUTOVER: Record<WebsiteCmsDocumentKind, boolean> = {
  person: env.VITE_CMS_CUTOVER_PEOPLE === "true",
  partner: env.VITE_CMS_CUTOVER_PARTNERS === "true",
  platform: env.VITE_CMS_CUTOVER_PLATFORMS === "true",
  publication: env.VITE_CMS_CUTOVER_PUBLICATIONS === "true",
  "case-study": env.VITE_CMS_CUTOVER_CASE_STUDIES === "true",
  industry: env.VITE_CMS_CUTOVER_INDUSTRIES === "true",
  framework: env.VITE_CMS_CUTOVER_FRAMEWORKS === "true",
  office: true,
  "landing-page": true,
};

export function cmsCollectionIsCutOver(
  kind: WebsiteCmsDocumentKind,
  isConfigured = true,
): boolean {
  return CUTOVER[kind] && isConfigured;
}

export function cmsCollectionDelivery(
  kind: WebsiteCmsDocumentKind,
  state: {
    isPending: boolean;
    isError: boolean;
    hasContractErrors: boolean;
    hasItems: boolean;
    isConfigured?: boolean;
  },
): CmsDeliveryState {
  if (state.isPending) return "loading";
  if (state.isError) return "api-error";
  if (state.hasContractErrors) return "contract-error";
  if (state.hasItems) return "cms";
  return cmsCollectionIsCutOver(kind, state.isConfigured)
    ? "intentional-empty"
    : "compiled-fallback";
}

export function governedLandingDelivery(
  state: CmsDeliveryState,
  configuredPagePaths: readonly string[],
  pagePath: string,
  hasPage: boolean,
): CmsDeliveryState {
  if (state === "loading" || state === "api-error" || state === "contract-error") return state;
  if (hasPage) return "cms";
  return configuredPagePaths.includes(pagePath) ? "intentional-empty" : "compiled-fallback";
}

export function contentRecord<K extends WebsiteCmsDocumentKind>(item: PublishedContent, kind: K): CmsRecord<CmsContentByKind[K]> {
  const content = { ...(item.content as CmsContent) } as CmsContent & {
    heroMedia?: ImmutableCmsMediaReference;
    heroMediaId?: string;
    image?: string;
    imageAlt?: string;
  };
  if (kind === "industry" && (content.heroMedia || content.heroMediaId)) {
    const hero = resolveCmsMedia(item.media, content.heroMedia, content.heroMediaId);
    if (hero) {
      content.image = hero.url;
      content.imageAlt = content.heroMedia?.altText || hero.altText || content.imageAlt;
    }
  }
  if (kind === "industry") {
    const pov = (content as Record<string, unknown>).educationPov;
    const imagery = pov && typeof pov === "object" && !Array.isArray(pov)
      ? (pov as Record<string, unknown>).imagery
      : undefined;
    if (imagery && typeof imagery === "object" && !Array.isArray(imagery)) {
      for (const slot of ["educatorPractice", "researchCoordination"]) {
        const scene = (imagery as Record<string, unknown>)[slot];
        if (!scene || typeof scene !== "object" || Array.isArray(scene)) continue;
        const mutableScene = scene as {
          src?: string;
          altText?: string;
          media?: ImmutableCmsMediaReference;
        };
        const resolved = mutableScene.media
          ? resolveCmsMedia(item.media, mutableScene.media)
          : undefined;
        if (resolved) {
          mutableScene.src = resolved.url;
          mutableScene.altText = mutableScene.media?.altText || resolved.altText || mutableScene.altText;
        }
      }
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

export function landingNarrative(
  page: LandingPageContent,
  sectionId: string,
): { heading?: string; text: string } {
  const section = [...page.sections]
    .sort((left, right) => left.order - right.order)
    .find((candidate) => candidate.id === sectionId && candidate.type === "narrative");
  if (!section || section.type !== "narrative") return { text: page.narrative };
  const text = section.body.flatMap((block) =>
    block.type === "paragraph" || block.type === "quote" || block.type === "heading"
      ? [block.text]
      : block.type === "list" ? block.items : []
  ).join(" ");
  return { heading: section.heading, text: text || page.narrative };
}
export function useCmsCollection<T>(
  kind: WebsiteCmsDocumentKind,
  fallback: T[],
  mapper: (item: PublishedContent, index: number) => T | null,
) {
  const { market, locale } = useMarketStore();
  const query = useListPublishedContent({ kind: kind as DocumentKind, market, locale, pageSize: 100 });
  const response = query.data as (typeof query.data & {
    isConfigured?: boolean;
    configuredPagePaths?: string[];
  }) | undefined;
  const validations = response?.items.map((item) => validateCmsContent(kind as CmsDocumentKind, item.content, "publish"));
  const contractErrors = validations?.flatMap((result) => result.success ? [] : result.errors) ?? [];
  const validItems = response?.items.filter((_item, index) => validations?.[index]?.success) ?? [];
  const mapped = validItems.map(mapper).filter((item): item is T => item !== null);
  const cutover = cmsCollectionIsCutOver(kind, response?.isConfigured);
  const delivery = cmsCollectionDelivery(kind, {
    isPending: query.isPending,
    isError: query.isError,
    hasContractErrors: Boolean(contractErrors.length),
    hasItems: Boolean(mapped.length),
    isConfigured: response?.isConfigured,
  });
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
    configuredPagePaths: response?.configuredPagePaths ?? [],
    selectedMarket: (query.data as (typeof query.data & { market?: string }) | undefined)?.market,
    usedMarketFallback: (query.data as (typeof query.data & { usedFallback?: boolean }) | undefined)?.usedFallback ?? false,
  };
}

export function useCmsEntry(kind: WebsiteCmsDocumentKind, slug: string) {
  const { market, locale } = useMarketStore();
  // Collection landing narratives are intentionally code-owned; only entity
  // details are CMS-owned. Do not model landings as sentinel entity records.
  const codeOwnedLanding = ["about", "partners", "platforms", "insights", "work"].includes(slug);
  const cutover = CUTOVER[kind];
  const cutoverGated = kind === "framework" && !cutover;
  const query = useGetPublishedContent(market, locale, kind as DocumentKind, slug, {
    query: {
      enabled: !codeOwnedLanding && !cutoverGated,
      queryKey: getGetPublishedContentQueryKey(market, locale, kind as DocumentKind, slug),
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

export function landingText(
  page: LandingPageContent | null | undefined,
  slot: string,
  fallback: string,
): string {
  if (!page) return fallback;
  const section = landingSections(page).find((candidate) => candidate.id === slot);
  if (!section) return landingSlotError(page, slot, "required narrative slot is missing");
  if (section.type !== "narrative") {
    return landingSlotError(page, slot, `expected narrative, received ${section.type}`);
  }
  const delivered = section.body.flatMap((block) =>
    block.type === "list" ? block.items : [block.text]
  ).join(" ").trim();
  return delivered || landingSlotError(page, slot, "narrative slot is empty");
}

function landingSlotError(page: LandingPageContent, slot: string, reason: string): never {
  throw new LandingSlotDeliveryError(page.pagePath, slot, reason);
}

/** The renderer's single ordered view of a governed landing composition.  Keeping
 * this here (rather than teaching each route about the union) makes it possible
 * to audit every section and prevents a new section from being silently
 * dropped by a route. */
export function landingSections(page: LandingPageContent): LandingPageContent["sections"] {
  return [...page.sections].sort((left, right) => left.order - right.order);
}

export function landingMedia(
  page: CmsRecord<LandingPageContent> | null | undefined,
  slot: string,
  fallback: { src: string; alt: string },
): { src: string; alt: string } {
  if (!page) return fallback;
  const section = landingSections(page).find((candidate) => candidate.id === slot);
  if (!section) return landingSlotError(page, slot, "required media slot is missing");
  if (section.type === "migration-media") {
    if (!page.publishedAt) return { src: section.sourcePath, alt: section.altText };
    return landingSlotError(page, slot, "published content contains unresolved migration media");
  }
  if (section.type !== "media") return landingSlotError(page, slot, `expected media, received ${section.type}`);
  const reference = section.references[0];
  if (!reference) return landingSlotError(page, slot, "media slot has no immutable reference");
  const delivered = page?.media?.find((media) =>
    media.id === reference.mediaId && media.versionId === reference.mediaVersionId
  );
  if (!delivered) return landingSlotError(page, slot, "the exact referenced media version was not delivered");
  return { src: delivered.url, alt: reference.altText ?? delivered.altText ?? fallback.alt };
}

export class LandingSlotDeliveryError extends Error {
  readonly pagePath: string;
  readonly slot: string;

  constructor(pagePath: string, slot: string, reason: string) {
    super(`Landing slot delivery failed for "${pagePath}" / "${slot}": ${reason}`);
    this.name = "LandingSlotDeliveryError";
    this.pagePath = pagePath;
    this.slot = slot;
  }
}

export function landingVisualReferences(page: LandingPageContent): LandingPageContent["visualReferences"] {
  return [
    ...page.visualReferences,
    ...landingSections(page).flatMap((section) => section.type === "media" ? section.references : []),
  ];
}

export function landingSeo(page: LandingPageContent): LandingPageContent["seo"] {
  return page.seo;
}

export function landingCta(
  page: LandingPageContent | null | undefined,
  slot: string,
  fallback: { label: string; href: string },
): { label: string; href: string } {
  if (!page) return fallback;
  const section = landingSections(page).find((candidate) => candidate.id === slot);
  if (!section) return landingSlotError(page, slot, "required CTA slot is missing");
  if (section.type !== "cta") return landingSlotError(page, slot, `expected cta, received ${section.type}`);
  if (!section.label.trim() || !section.href.trim()) return landingSlotError(page, slot, "CTA slot is empty");
  return { label: section.label, href: section.href };
}
