import { createContext, createElement, useContext, type ReactNode } from "react";
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
  INDUSTRY_SECTION_IDS,
  isIndustrySectionId,
  type IndustrySectionId,
  validateCmsContent,
} from "@workspace/api-zod";
import { useMarketStore } from "@/store/market";
import { getListPublishedContentQueryKey } from "@workspace/api-client-react";
import { releasePublishedContent, useReleaseContext } from "@/lib/releases";

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
  market: PublishedContent["market"];
  requestedMarket: PublishedContent["requestedMarket"];
  usedFallback: PublishedContent["usedFallback"];
};
export type CmsDeliveryState = "cms" | "compiled-fallback" | "intentional-empty" | "loading" | "api-error" | "contract-error";
export type CmsEntryRenderPolicy = "cms" | "compiled-fallback" | "loading" | "unavailable";

/** Distinguish an unavailable CMS service from a genuine public 404. */
export function cmsRequestIsUnavailable(error: unknown): boolean {
  if (!error || typeof error !== "object") return true;
  const candidate = error as { name?: unknown; status?: unknown };
  if (candidate.name === "ResponseParseError") return true;
  if (typeof candidate.status !== "number") return true;
  return candidate.status === 408 || candidate.status === 429 || candidate.status >= 500;
}
export type HeroFilmSources = {
  mp4: string;
  webm: string;
  poster: string;
};
type DeliveredCmsMedia = NonNullable<PublishedContent["media"]>[number];
export type CmsMediaFocalPoint = { x: number; y: number };
type ImmutableCmsMediaReference = {
  mediaId: string;
  mediaVersionId: string;
  altText?: string;
};

/** Convert immutable public/preview media crop metadata into a CSS position.
 * Missing or invalid metadata intentionally leaves the browser's centered
 * object-position unchanged. */
export function cmsMediaObjectPosition(
  media: Pick<DeliveredCmsMedia, "focalPoint"> | { focalPoint?: CmsMediaFocalPoint | null } | null | undefined,
): string | undefined {
  const point = media?.focalPoint;
  if (
    !point
    || !Number.isFinite(point.x)
    || !Number.isFinite(point.y)
  ) return undefined;
  const x = Math.max(0, Math.min(1, point.x));
  const y = Math.max(0, Math.min(1, point.y));
  return `${x * 100}% ${y * 100}%`;
}

const CmsPreviewRequestContext = createContext(false);

/** Render a compiled public route against an issued preview snapshot without
 * making a second public CMS request for the route's related collections. */
export function CmsPreviewRequestBoundary({ children }: { children: ReactNode }) {
  return createElement(CmsPreviewRequestContext.Provider, { value: true }, children);
}

/** The fixed industry-outline identifiers accepted by a protected preview. */
export { INDUSTRY_SECTION_IDS as INDUSTRY_PREVIEW_SECTION_IDS };
export type IndustryPreviewSectionId = IndustrySectionId;
export type IndustryPreviewFocusMessage = {
  type: "industry-preview-focus";
  section: IndustryPreviewSectionId;
  state?: "expanded" | "collapsed";
};

export function isIndustryPreviewFocusMessage(value: unknown): value is IndustryPreviewFocusMessage {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const message = value as Record<string, unknown>;
  if (
    message.type !== "industry-preview-focus"
    || typeof message.section !== "string"
    || !isIndustrySectionId(message.section)
    || !["expanded", "collapsed", undefined].includes(message.state as "expanded" | "collapsed" | undefined)
  ) return false;
  return Object.keys(message).every((key) => key === "type" || key === "section" || key === "state");
}

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

/** Protected previews must never turn a mutable asset ID into draft media.
 * Unlike resolveCmsMedia, this deliberately has no legacy-ID fallback. */
export function resolvePinnedCmsMedia(
  media: PublishedContent["media"],
  reference?: ImmutableCmsMediaReference,
): DeliveredCmsMedia | undefined {
  if (!reference?.mediaId || !reference.mediaVersionId) return undefined;
  return media?.find((item) =>
    item.id === reference.mediaId && item.versionId === reference.mediaVersionId
  );
}

export type PreviewIndustryMediaResolution = {
  content: IndustryContent;
  missingReferences: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function pinnedReferenceKey(value: Record<string, unknown>): string | null {
  return typeof value.mediaId === "string" && typeof value.mediaVersionId === "string"
    ? `${value.mediaId}@${value.mediaVersionId}`
    : null;
}

/** Hydrate a saved industry snapshot only with URLs issued for this preview
 * session.  In particular, Education's supporting imagery cannot retain a
 * public/static URL when its immutable draft-media reference is unavailable. */
export function resolvePreviewIndustryMedia(
  industry: IndustryContent,
  media: PublishedContent["media"],
): PreviewIndustryMediaResolution {
  // CMS content is JSON. Cloning avoids mutating the immutable saved response
  // before it is rendered or checked by another preview concern.
  const content = JSON.parse(JSON.stringify(industry)) as IndustryContent;
  const missingReferences = new Set<string>();

  const inspect = (value: unknown): void => {
    if (Array.isArray(value)) {
      value.forEach(inspect);
      return;
    }
    if (!isRecord(value)) return;
    const key = pinnedReferenceKey(value);
    if (key && !resolvePinnedCmsMedia(media, value as ImmutableCmsMediaReference)) {
      missingReferences.add(key);
    }
    Object.values(value).forEach(inspect);
  };
  inspect(content);

  const hero = resolvePinnedCmsMedia(media, content.heroMedia);
  if (content.heroMedia && hero) {
    content.image = hero.url;
    content.imageAlt = content.heroMedia.altText || hero.altText || content.imageAlt;
  }

  const educationPov = content.educationPov;
  if (educationPov?.version === 2 && educationPov.imagery) {
    for (const slot of ["educatorPractice", "researchCoordination"] as const) {
      const scene = educationPov.imagery[slot];
      const resolved = resolvePinnedCmsMedia(media, scene.media);
      if (scene.media && resolved) {
        scene.src = resolved.url;
        scene.altText = scene.media.altText || resolved.altText || scene.altText;
      }
    }
  }

  return { content, missingReferences: [...missingReferences] };
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
  const releaseContext = useReleaseContext();
  const params = publicContactConfigurationParams(market, locale);
  const query = useGetPublicContactConfiguration(params, {
    query: {
      enabled: Boolean(market) && !releaseContext,
      queryKey: getGetPublicContactConfigurationQueryKey(params),
      retry: false,
    },
  });
  if (releaseContext) {
    const revision = releaseContext.release.manifest.revisions.find((item) => {
      if (item.kind !== "site-configuration") return false;
      const content = item.snapshot.content as { configuration?: unknown };
      return content.configuration === "contact-email";
    });
    const content = revision?.snapshot.content as { contactEmail?: unknown } | undefined;
    return typeof content?.contactEmail === "string" ? content.contactEmail : "";
  }
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
  const releaseContext = useReleaseContext();
  const params = { market, locale };
  const query = useGetPublicHeroFilm(slot, params, {
    query: {
      enabled: Boolean(market) && !releaseContext,
      queryKey: getGetPublicHeroFilmQueryKey(slot, params),
    },
  });
  if (releaseContext) {
    const revision = releaseContext.release.manifest.revisions.find((item) => {
      if (item.kind !== "site-configuration") return false;
      const content = item.snapshot.content as { page?: unknown };
      return content.page === slot;
    });
    const content = revision?.snapshot.content as {
      hero?: {
        posterMediaId: string;
        posterMediaVersionId: string;
        sources: Array<{ mediaId: string; mediaVersionId: string; mimeType: string }>;
      };
    } | undefined;
    const hero = content?.hero;
    const findMedia = (id: string, versionId: string) =>
      (revision?.media ?? []).find((item) => item.id === id && item.versionId === versionId);
    const poster = hero && findMedia(hero.posterMediaId, hero.posterMediaVersionId);
    const sources = hero?.sources.flatMap((source) => {
      const media = findMedia(source.mediaId, source.mediaVersionId);
      return media ? [{ id: media.id, versionId: media.versionId, url: media.url, mimeType: source.mimeType }] : [];
    }) ?? [];
    const released = poster && hero && sources.length === hero.sources.length ? {
      slot,
      poster: { id: poster.id, versionId: poster.versionId, url: poster.url, mimeType: poster.mimeType },
      sources,
    } : undefined;
    return resolvePublishedHeroFilm(released, fallback);
  }
  return resolvePublishedHeroFilm(query.data as PublishedHeroFilmResponse | undefined, fallback);
}

const CUTOVER: Record<WebsiteCmsDocumentKind, boolean> = {
  person: true,
  partner: true,
  platform: true,
  publication: true,
  "case-study": true,
  industry: true,
  framework: true,
  office: true,
  "landing-page": true,
};

/**
 * Entry cutovers are explicit where a document kind contains a mixture of
 * published and unpublished pages. Keep this list narrower than the framework
 * collection flag so one approved framework cannot make every framework
 * route authoritative.
 */
const ENTRY_CUTOVER: Partial<Record<WebsiteCmsDocumentKind, readonly string[]>> = {};

export function cmsEntryIsCutOver(kind: WebsiteCmsDocumentKind, slug: string): boolean {
  return CUTOVER[kind] || ENTRY_CUTOVER[kind]?.includes(slug) === true;
}

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
  return "intentional-empty";
}

export function governedLandingDelivery(
  state: CmsDeliveryState,
  configuredPagePaths: readonly string[],
  pagePath: string,
  hasPage: boolean,
): CmsDeliveryState {
  if (state === "loading" || state === "api-error" || state === "contract-error") return state;
  if (hasPage) return "cms";
  return "intentional-empty";
}

export function cmsCollectionData<T>(
  kind: WebsiteCmsDocumentKind,
  delivery: CmsDeliveryState,
  mapped: T[],
  fallback: T[],
  isAuthoritative: boolean,
): T[] {
  // People never accept a compiled roster, even from a legacy caller.
  if (kind === "person") return delivery === "cms" ? mapped : [];
  return !isAuthoritative && delivery !== "cms" ? fallback : mapped;
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
    market: item.market,
    requestedMarket: item.requestedMarket,
    usedFallback: item.usedFallback,
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
  const releaseContext = useReleaseContext();
  const previewRequestDisabled = useContext(CmsPreviewRequestContext);
  const params = { kind: kind as DocumentKind, market, locale, pageSize: 100 };
  const query = useListPublishedContent(params, {
    query: {
      queryKey: getListPublishedContentQueryKey(params),
      ...(kind === "person" ? {
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        placeholderData: undefined,
      } : {}),
      ...((previewRequestDisabled || releaseContext) ? { enabled: false } : {}),
    },
  });
  const releasedItems = releaseContext?.release.manifest.revisions
    .filter((revision) => revision.kind === kind)
    .map((revision) => releasePublishedContent(revision, releaseContext.release.manifest)) ?? [];
  const response = (releaseContext ? {
    items: releasedItems,
    isConfigured: true,
    configuredPagePaths: releasedItems
      .filter((item) => item.kind === "landing-page")
      .map((item) => (item.content as { pagePath?: string }).pagePath)
      .filter((path): path is string => Boolean(path)),
    market,
    locale,
    requestedMarket: market,
    usedFallback: false,
  } : previewRequestDisabled ? undefined : query.data) as (typeof query.data & {
    isConfigured?: boolean;
    configuredPagePaths?: string[];
  }) | undefined;
  const invalidEnvelope = kind === "person" && response !== undefined &&
    (!Array.isArray(response?.items) || response.items.some((item) =>
      !item || item.kind !== "person" || typeof item.title !== "string" ||
      typeof item.id !== "string" || !item.content));
  const items = invalidEnvelope ? [] : response?.items;
  const validations = items?.map((item) => validateCmsContent(kind as CmsDocumentKind, item.content, "publish"));
  const contractErrors = validations?.flatMap((result) => result.success ? [] : result.errors) ?? [];
  if (invalidEnvelope) contractErrors.push("Invalid person collection response.");
  const validItems = items?.filter((_item, index) => validations?.[index]?.success) ?? [];
  const mapped = validItems.map(mapper).filter((item): item is T => item !== null);
  const cutover = cmsCollectionIsCutOver(kind, response?.isConfigured);
  const delivery = cmsCollectionDelivery(kind, {
    isPending: !releaseContext && (query.isPending || (kind === "person" && query.isFetching && !query.isError)),
    isError: !releaseContext && query.isError,
    hasContractErrors: Boolean(contractErrors.length),
    hasItems: Boolean(mapped.length),
    isConfigured: response?.isConfigured,
  });
  const useFallback = !cutover && delivery !== "cms";
  const issue = !releaseContext && query.isError
    ? `CMS request failed for ${kind}.`
    : contractErrors.length
      ? `CMS contract rejected ${kind}: ${contractErrors.join("; ")}`
      : null;
  if (issue) console.error(issue);

  return {
    ...query,
    data: cmsCollectionData(kind, delivery, mapped, fallback, cutover),
    delivery,
    issue,
    isFallback: useFallback,
    isAuthoritative: cutover,
    configuredPagePaths: response?.configuredPagePaths ?? [],
    selectedMarket: releaseContext ? market : (query.data as (typeof query.data & { market?: string }) | undefined)?.market,
    usedMarketFallback: releaseContext ? false : (query.data as (typeof query.data & { usedFallback?: boolean }) | undefined)?.usedFallback ?? false,
  };
}

export function useCmsEntry(
  kind: WebsiteCmsDocumentKind,
  slug: string,
  { preferCompiled = false }: { preferCompiled?: boolean } = {},
) {
  const { market, locale } = useMarketStore();
  const releaseContext = useReleaseContext();
  const previewRequestDisabled = useContext(CmsPreviewRequestContext);
  // Collection landing narratives are intentionally code-owned; only entity
  // details are CMS-owned. Do not model landings as sentinel entity records.
  const codeOwnedLanding = ["about", "partners", "platforms", "insights", "work"].includes(slug);
  const cutover = cmsEntryIsCutOver(kind, slug);
  const cutoverGated = kind === "framework" && !cutover;
  const query = useGetPublishedContent(market, locale, kind as DocumentKind, slug, {
    query: {
       enabled: !releaseContext && !codeOwnedLanding && !cutoverGated && !preferCompiled,
      ...(previewRequestDisabled ? { enabled: false } : {}),
      queryKey: getGetPublishedContentQueryKey(market, locale, kind as DocumentKind, slug),
    },
  });
  const releasedRevision = releaseContext?.release.manifest.revisions.find(
    (revision) => revision.kind === kind && revision.snapshot.slug === slug,
  );
  const deliveredData = releasedRevision
    ? releasePublishedContent(releasedRevision, releaseContext!.release.manifest)
    : previewRequestDisabled ? undefined : query.data;
  const validation = deliveredData
    ? validateCmsContent(kind as CmsDocumentKind, deliveredData.content, "publish")
    : undefined;
  const issue = query.isError
    ? `CMS detail request failed for ${kind}/${slug}.`
    : validation && !validation.success
      ? `CMS contract rejected ${kind}/${slug}: ${validation.errors.join("; ")}`
      : null;
  if (issue) console.error(issue);
  return {
    ...query,
    data: releaseContext
      ? validation?.success ? deliveredData : undefined
      : codeOwnedLanding || cutoverGated ? undefined : validation?.success ? deliveredData : undefined,
    delivery: preferCompiled && !releaseContext ? "compiled-fallback" as const : releaseContext
      ? deliveredData && validation?.success ? "cms" as const : "intentional-empty" as const
      : codeOwnedLanding || cutoverGated ? "compiled-fallback" as const
      : query.isPending ? "loading" as const
      : issue ? (validation && !validation.success ? "contract-error" : "api-error") as CmsDeliveryState
      : deliveredData ? "cms" as const
      : "intentional-empty" as const,
    issue,
    isAuthoritative: !preferCompiled && (Boolean(releaseContext) || cutover),
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

export function landingList(
  page: LandingPageContent | null | undefined,
  slot: string,
  fallback: string[],
): string[] {
  if (!page) return fallback;
  const section = landingSections(page).find((candidate) => candidate.id === slot);
  if (!section) return landingSlotError(page, slot, "required ordered list slot is missing");
  if (section.type !== "narrative" || section.body.length !== 1 || section.body[0].type !== "list") {
    return landingSlotError(page, slot, "expected a single narrative list");
  }
  const items = section.body[0].items.map((item) => item.trim());
  if (!items.length || items.some((item) => !item)) {
    return landingSlotError(page, slot, "ordered list slot contains empty items");
  }
  return items;
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
): { src: string; alt: string; objectPosition?: string } {
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
  const objectPosition = cmsMediaObjectPosition(delivered);
  return {
    src: delivered.url,
    alt: reference.altText ?? delivered.altText ?? fallback.alt,
    ...(objectPosition ? { objectPosition } : {}),
  };
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
