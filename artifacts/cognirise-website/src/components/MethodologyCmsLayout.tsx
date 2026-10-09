import type {
  FrameworkContent,
  MethodologyEditorialDefinition,
} from "@workspace/api-zod";
import {
  methodologyEditorialDefinition,
  methodologyEditorialMediaValues,
  missingMethodologyMediaPins,
} from "@workspace/api-zod";
import { createContext, useContext, type ReactNode } from "react";
import {
  cmsEntryRenderPolicy,
  resolveCmsMedia,
  resolvePinnedCmsMedia,
  type CmsRecord,
  useCmsEntry,
} from "@/lib/cms";
import { metadataFromSeo, type PageMetadata, useDynamicMetadata } from "@/lib/metadata";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { useReleaseContext } from "@/lib/releases";

export type MethodologyTemplate = Extract<
  FrameworkContent,
  { template: "idao" | "ai-use-case-prioritization" | "ai-value-to-scale" | "agentic-operations-readiness" | "human-agent-operating-model" }
>["template"];

export type MethodologyFramework = Extract<FrameworkContent, { template: MethodologyTemplate }>;

const templateBySlug = {
  idao: "idao",
  "ai-use-case-prioritization": "ai-use-case-prioritization",
  "ai-value-to-scale": "ai-value-to-scale",
  "agentic-operations-readiness": "agentic-operations-readiness",
  "human-agent-operating-model": "human-agent-operating-model",
} as const satisfies Record<string, MethodologyTemplate>;

const MethodologyCmsContext = createContext<{
  framework: CmsRecord<MethodologyFramework>;
  preview: boolean;
} | null>(null);

function hasResolvedMethodologyMedia(
  framework: MethodologyFramework,
  media: CmsRecord<MethodologyFramework>["media"],
  preview: boolean,
) {
  const definition = methodologyEditorialDefinition(framework.template);
  if (!definition) return false;
  if (missingMethodologyMediaPins(definition.slots, framework.editorial).length) return false;
  return methodologyEditorialMediaValues(definition.slots, framework.editorial).every(({ media: pin }) =>
    preview
      ? Boolean(resolvePinnedCmsMedia(media, pin))
      : Boolean(resolveCmsMedia(media, pin)),
  );
}

/**
 * The route remains the sole layout owner.  This boundary deliberately does
 * not render a generic methodology page: doing so would drop assessments,
 * report generation, saved-session behaviour and the fixed diagrams.  It
 * merely supplies a validated, exact CMS revision to that existing route.
 */
export function MethodologyCmsDelivery({
  slug,
  children,
}: {
  slug: keyof typeof templateBySlug;
  children: ReactNode;
}) {
  const inherited = useContext(MethodologyCmsContext);
  const releaseContext = useReleaseContext();
  // The public method pages are code-owned: they render their compiled editorial
  // and never wait for the CMS. Protected previews still arrive through the
  // inherited context above.
  const query = useCmsEntry("framework", slug, { preferCompiled: true });
  if (inherited) return <>{children}</>;

  const policy = cmsEntryRenderPolicy(query.isAuthoritative, query.delivery);
  const delivered = query.data;
  const framework = delivered?.content;
  const selected = policy === "cms" && framework?.template === templateBySlug[slug]
    ? framework as MethodologyFramework
    : null;
  const cmsMediaAvailable = Boolean(
    selected
    && delivered
    && resolveCmsMedia(delivered.media, selected.hero.media, selected.hero.mediaId)
    && hasResolvedMethodologyMedia(selected, delivered.media, false),
  );
  const hasReleasedRevision = Boolean(releaseContext?.release.manifest.revisions.some((revision) =>
    revision.kind === "framework" && revision.snapshot.slug === slug
  ));
  const useCompiledReleaseFallback = Boolean(releaseContext && !hasReleasedRevision);
  // A configured methodology must never leave an indexable stale page behind
  // while its exact revision or immutable media cannot be delivered.
  useDynamicMetadata(
    query.isAuthoritative && !cmsMediaAvailable && !useCompiledReleaseFallback
      ? {
          title: "Methodology unavailable | Cognirise",
          description: "The requested methodology is temporarily unavailable.",
          canonicalUrl: null,
          noIndex: true,
        }
      : undefined,
  );
  if (useCompiledReleaseFallback) return <>{children}</>;
  if (policy === "compiled-fallback") return <>{children}</>;
  if (selected && delivered) {
    const record = {
      ...selected,
      id: delivered.id,
      slug: delivered.slug,
      title: delivered.title,
      summary: delivered.summary ?? null,
      media: delivered.media,
      seo: delivered.seo,
      publishedAt: delivered.publishedAt,
      updatedAt: delivered.updatedAt,
      market: delivered.market,
      requestedMarket: delivered.requestedMarket,
      usedFallback: delivered.usedFallback,
    } as CmsRecord<MethodologyFramework>;
    // A configured/cut-over route must fail closed rather than displaying
    // compiled imagery if the exact published media binding is absent.
    if (!cmsMediaAvailable) {
      return <MethodologyUnavailable message="The published methodology media could not be safely delivered." />;
    }
    return (
      <MethodologyCmsContext.Provider value={{ framework: record, preview: false }}>
        {children}
      </MethodologyCmsContext.Provider>
    );
  }
  return <MethodologyUnavailable message={policy === "loading" ? "Loading methodology…" : "The published CMS edition could not be safely delivered."} />;
}

/** Used only by the protected preview shell after its issued revision and
 * immutable media set have been validated. */
export function MethodologyCmsPreviewBoundary({
  framework,
  children,
}: {
  framework: CmsRecord<MethodologyFramework>;
  children: ReactNode;
}) {
  if (
    !resolvePinnedCmsMedia(framework.media, framework.hero.media)
    || !hasResolvedMethodologyMedia(framework, framework.media, true)
  ) {
    return <MethodologyUnavailable message="This saved revision's immutable hero media is unavailable." />;
  }
  return (
    <MethodologyCmsContext.Provider value={{ framework, preview: true }}>
      {children}
    </MethodologyCmsContext.Provider>
  );
}

export function useMethodologyCmsContent<T extends MethodologyTemplate>(template: T) {
  const context = useContext(MethodologyCmsContext);
  if (!context || context.framework.template !== template) return null;
  return context as {
    framework: CmsRecord<Extract<MethodologyFramework, { template: T }>>;
    preview: boolean;
  };
}

/**
 * Return one complete, validated template editorial object. This intentionally
 * never overlays CMS values on compiled values: a partial or stale revision
 * must fail validation rather than silently mixing two editorial authorities.
 */
export function methodologyEditorial<
  T extends MethodologyTemplate,
  Definition extends MethodologyEditorialDefinition<T>,
>(
  template: T,
  context: ReturnType<typeof useMethodologyCmsContent<T>>,
  seed: Definition["seed"],
): Definition["seed"] {
  if (!context) return seed;
  if (context.framework.template !== template) {
    throw new Error(`Methodology editorial template mismatch: expected ${template}.`);
  }
  return context.framework.editorial as Definition["seed"];
}

/** Pages retain their compiled SEO as the only fallback; once a CMS edition is
 * authoritative, its SEO travels with that exact revision. */
export function methodologyCmsSeoMetadata<T extends MethodologyTemplate>(
  context: ReturnType<typeof useMethodologyCmsContent<T>>,
  fallback: PageMetadata,
) {
  const metadata = context
    ? metadataFromSeo(context.framework.seo ?? undefined, fallback)
    : fallback;
  // Protected previews must retain their no-index guard even when the exact
  // revision carries publishable SEO.
  return context?.preview
    ? { ...metadata, canonicalUrl: null, noIndex: true }
    : metadata;
}

export function useMethodologyCmsSeo<T extends MethodologyTemplate>(
  context: ReturnType<typeof useMethodologyCmsContent<T>>,
  fallback: PageMetadata,
) {
  useDynamicMetadata(methodologyCmsSeoMetadata(context, fallback));
}

export function methodologyHero<T extends MethodologyTemplate>(
  context: ReturnType<typeof useMethodologyCmsContent<T>>,
  fallback: {
    breadcrumb: string;
    title: string;
    description: string;
    supportingText?: string;
    imageSrc: string;
    imageAlt: string;
    imagePosition?: string;
    imageCaptionSubtitle?: string;
    imageCaptionTitle?: string;
  },
) {
  if (!context) return fallback;
  const { framework, preview } = context;
  const media = preview
    ? resolvePinnedCmsMedia(framework.media, framework.hero.media)
    : resolveCmsMedia(framework.media, framework.hero.media, framework.hero.mediaId);
  // The boundary already rejects this condition. Keeping this guard makes
  // direct consumers fail closed too, without inventing a compiled media URL.
  if (!media) throw new Error("Methodology CMS hero media was not delivered.");
  return {
    breadcrumb: framework.hero.breadcrumb,
    title: framework.hero.title,
    description: framework.hero.description,
    supportingText: framework.hero.supportingText,
    imageSrc: media.url,
    imageAlt: framework.hero.media?.altText ?? media.altText ?? fallback.imageAlt,
    imagePosition: framework.hero.imagePosition,
    imageCaptionSubtitle: framework.hero.imageCaptionSubtitle,
    imageCaptionTitle: framework.hero.imageCaptionTitle,
    imageResolved: true,
  };
}

/**
 * Resolve a declared supporting-media slot from the same approved revision as
 * the rest of the page. In a compiled render the immutable source path is
 * used; in CMS delivery a missing, stale, or non-pinned asset is an error,
 * never a fallback to the compiled image.
 */
export function methodologyEditorialMedia<T extends MethodologyTemplate>(
  context: ReturnType<typeof useMethodologyCmsContent<T>>,
  mediaLeaf: {
    src: string;
    altText: string;
    media?: {
      mediaId: string;
      mediaVersionId: string;
      role: "hero" | "supporting" | "background" | "icon";
      altText?: string;
    };
  },
) {
  if (!context) return { src: mediaLeaf.src, altText: mediaLeaf.altText };
  const media = context.preview
    ? resolvePinnedCmsMedia(context.framework.media, mediaLeaf.media)
    : resolveCmsMedia(context.framework.media, mediaLeaf.media);
  if (!media) throw new Error("Methodology CMS supporting media was not delivered.");
  return {
    src: media.url,
    // This is editorial copy stored on the exact page revision, not library
    // metadata. It deliberately wins even when it is an explicit decorative
    // empty string under a template that permits one.
    altText: mediaLeaf.altText,
    imageResolved: true,
  };
}

function MethodologyUnavailable({ message }: { message: string }) {
  return (
    <main className="min-h-screen bg-background px-6 py-24">
      <NavigationBackControl embedded className="mx-auto mb-7 max-w-[720px]" />
      <section className="mx-auto max-w-[720px] border border-amber-300 bg-amber-50 p-8 text-amber-950" role="alert">
        <h1 className="text-2xl font-semibold">This methodology is unavailable.</h1>
        <p className="mt-3 leading-7">{message}</p>
      </section>
    </main>
  );
}