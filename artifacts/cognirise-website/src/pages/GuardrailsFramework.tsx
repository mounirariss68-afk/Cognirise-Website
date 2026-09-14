import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { cmsEntryRenderPolicy, contentRecord, useCmsEntry, type CmsRecord, resolveCmsMedia, cmsMediaObjectPosition } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import type { FrameworkContent, SetProveHoldGuardrailsContent, GuardrailsLegacyContent } from "@workspace/api-zod";

import { Kicker } from "@/components/guardrails/Kicker";
import { MarkdownInline } from "@/components/guardrails/MarkdownInline";
import { PulseImage } from "@/components/ui/pulse-image";
import { LegacyGuardrailsLayout } from "./LegacyGuardrailsLayout";

import { SetProveHoldActionMap } from "@/components/guardrails/SetProveHoldActionMap";
import { FourLayerComparison } from "@/components/guardrails/FourLayerComparison";
import { LifecycleMatrix } from "@/components/guardrails/LifecycleMatrix";

type GuardrailsContent = Extract<FrameworkContent, { template: "guardrails" }>;

export function guardrailsMetadata(
  framework: CmsRecord<GuardrailsContent> | null,
  renderPolicy: "cms" | "compiled-fallback" | "loading" | "unavailable",
  preview = false,
) {
  if (preview) return {
    title: "Protected draft preview | Cognirise",
    description: "Protected CMS draft preview.",
    canonicalUrl: null,
    noIndex: true,
  };
  if (renderPolicy !== "cms" || !framework || framework.template !== "guardrails") return {
    title: "Content unavailable | Cognirise",
    description: "This content is not currently available.",
    canonicalUrl: null,
    noIndex: true,
  };

  const heroMedia = resolveCmsMedia(framework.media, framework.heroMedia, (framework as any).heroMediaId);
  const socialMedia = framework.seo?.ogImageMedia
    ? resolveCmsMedia(framework.media, framework.seo.ogImageMedia)
    : heroMedia;
  const heroImage = socialMedia?.url;
  const imageUrl = heroImage
    ? (heroImage.startsWith("http") ? heroImage : `${typeof window !== 'undefined' ? window.location.origin : ''}${heroImage}`)
    : undefined;

  return metadataFromSeo(framework.seo, {
    title: framework.title,
    description: framework.summary ?? "",
    canonicalUrl: `${typeof window !== 'undefined' ? window.location.origin : ''}/methodologies/guardrails-framework`,
    imageUrl,
  });
}

export function GuardrailsLayout({
  framework,
  renderPolicy = "cms",
  preview = false,
}: {
  framework: CmsRecord<GuardrailsContent> | null;
  renderPolicy?: "cms" | "compiled-fallback" | "loading" | "unavailable";
  preview?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  useDynamicMetadata(guardrailsMetadata(framework, renderPolicy, preview));

  if (renderPolicy === "loading") {
    return (
      <main className="guardrails-page min-h-[70vh] bg-[var(--gf-bg)] px-6 py-20 md:px-[var(--gf-page-gutter)]" aria-busy="true">
        <Kicker>Methodologies & frameworks</Kicker>
        <p className="mt-8 text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)]">Loading the governed methodology…</p>
      </main>
    );
  }

  if (renderPolicy === "unavailable" || !framework || framework.template !== "guardrails") {
    return (
      <main className="guardrails-page min-h-[70vh] bg-[var(--gf-bg)] px-6 py-20 md:px-[var(--gf-page-gutter)]">
        <Kicker>Methodologies & frameworks</Kicker>
        <h1 className="mt-8 max-w-[var(--gf-content-status)] font-display text-[length:var(--gf-h1)] font-semibold leading-[0.92] tracking-[-0.085em] text-[var(--gf-ink)]">
          This methodology is not currently published.
        </h1>
        <p className="mt-6 max-w-[var(--gf-content-narrow)] text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
          The governed framework is unavailable or awaiting approval. No earlier compiled version has been substituted.
        </p>
      </main>
    );
  }

  // Determine which layout to render based on contentVersion
  if (framework.contentVersion === "guardrails-legacy-v1") {
    return <LegacyGuardrailsLayout framework={framework as CmsRecord<GuardrailsLegacyContent>} />;
  }

  // Ensure type is SetProveHoldGuardrailsContent
  const content = framework as CmsRecord<SetProveHoldGuardrailsContent>;
  const heroMedia = resolveCmsMedia(framework.media, content.heroMedia, content.heroMediaId);
  const heroImage = heroMedia?.url;

  return (
    <article data-guardrails-page className="guardrails-page [overflow-wrap:anywhere] bg-[var(--gf-bg)] font-sans text-[var(--gf-ink)] selection:bg-[var(--gf-accent)] selection:text-[var(--gf-accent-ink)] pb-12">

      {/* 1. Header (Hero) */}
      <header className={`${heroImage ? "grid min-h-[75vh] lg:grid-cols-2" : ""} border-b border-[var(--gf-border)]`}>
        <div className={`flex flex-col justify-center px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-24 ${heroImage ? "lg:pr-12 xl:pr-24" : "mx-auto w-full max-w-[var(--gf-content-wide)]"}`}>
          <Kicker>{content.hero.eyebrow}</Kicker>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
          >
            <h1 className="mt-8 font-display text-[length:var(--gf-h1)] font-semibold leading-[0.92] tracking-[-0.085em] text-[var(--gf-ink)]">
              <MarkdownInline text={content.hero.headline} />
            </h1>
            <p className="mt-8 text-[length:var(--gf-text-xl)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)] font-medium max-w-[var(--gf-content-standard)]">
              <MarkdownInline text={content.hero.subheadline} />
            </p>
            <div className="mt-8 border-l-4 border-[var(--gf-accent-coral)] pl-5 py-2">
              <p className="font-display text-[length:var(--gf-text-lg)] font-bold text-[var(--gf-ink-muted)] max-w-[34ch] leading-tight">
                <MarkdownInline text={content.hero.strapline} />
              </p>
            </div>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <BrandButton href={content.hero.primaryAction.href}>{content.hero.primaryAction.label}</BrandButton>
              <a href={content.hero.secondaryAction.href} className="inline-flex items-center gap-2 border-b border-[var(--gf-ink)] pb-1 text-[length:var(--gf-text-sm)] font-bold hover:text-[var(--gf-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-offset-4">
                {content.hero.secondaryAction.label} <ArrowRight size={16} />
              </a>
            </div>
          </motion.div>
        </div>
        {heroImage && (
          <div className="relative min-h-[320px] overflow-hidden bg-[var(--gf-surface)] md:h-[420px] lg:h-full lg:border-l lg:border-[var(--gf-border)]">
            <PulseImage
              src={heroImage}
              alt={heroMedia?.altText || "Cognirise Guardrails Framework"}
              className="w-full h-full object-cover"
              style={{ objectPosition: cmsMediaObjectPosition(heroMedia) }}
              eager
            />
          </div>
        )}
      </header>

      {/* 2. Overview (Set, Prove, Hold Map) */}
      <section data-guardrails-section="overview" className="px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-24 bg-[var(--gf-bg)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
          <div className="mb-14 max-w-[var(--gf-content-standard)]">
            <h2 className="font-display text-[length:var(--gf-h2)] font-semibold leading-tight tracking-tight text-[var(--gf-ink)]">
              <MarkdownInline text={content.overview.heading} />
            </h2>
            <p className="mt-6 text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] leading-relaxed">
              <MarkdownInline text={content.overview.intro} />
            </p>
          </div>

          <SetProveHoldActionMap phases={content.overview.phases} actions={content.actions} />
        </div>
      </section>

      {/* 3. Layers Explorer */}
      <section data-guardrails-section="layers" className="px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-24 bg-[var(--gf-surface)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
          <div className="mb-14 max-w-[var(--gf-content-standard)]">
            <h2 className="font-display text-[length:var(--gf-h2)] font-semibold leading-tight tracking-tight text-[var(--gf-ink)]">
              <MarkdownInline text={content.layers.heading} />
            </h2>
            <p className="mt-6 text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] leading-relaxed">
              <MarkdownInline text={content.layers.intro} />
            </p>
            <div className="mt-8 border border-[var(--gf-border)] bg-[var(--gf-bg)] p-4 max-w-fit">
              <span className="block font-mono text-[10px] uppercase tracking-widest text-[var(--gf-ink-muted)] mb-2">One rule, four ways</span>
              <strong className="text-[length:var(--gf-text-base)] text-[var(--gf-ink)]">
                <MarkdownInline text={content.layers.exampleRule} />
              </strong>
            </div>
          </div>

          <FourLayerComparison layers={content.layers} />

          <div className="mt-12 max-w-[var(--gf-content-copy)]">
            <blockquote className="border-l-4 border-[var(--gf-accent-violet)] pl-6 py-2 text-[length:var(--gf-text-lg)] font-medium text-[var(--gf-ink)] leading-relaxed">
              <MarkdownInline text={content.layers.callout} />
            </blockquote>
          </div>
        </div>
      </section>

      {/* 4. Lifecycle Matrix */}
      <section data-guardrails-section="lifecycle" className="px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-24 bg-[var(--gf-bg)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
          <div className="mb-14 max-w-[var(--gf-content-standard)]">
            <h2 className="font-display text-[length:var(--gf-h2)] font-semibold leading-tight tracking-tight text-[var(--gf-ink)]">
              <MarkdownInline text={content.lifecycleMatrix.heading} />
            </h2>
            <p className="mt-6 text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] leading-relaxed">
              <MarkdownInline text={content.lifecycleMatrix.intro} />
            </p>
          </div>

          <LifecycleMatrix matrix={content.lifecycleMatrix} />

          <div className="mt-12 grid md:grid-cols-2 gap-8 max-w-[var(--gf-content-wide)]">
            <div className="bg-[var(--gf-surface)] p-6 border border-[var(--gf-border)]">
              <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] leading-relaxed">
                <MarkdownInline text={content.lifecycleMatrix.callout} />
              </p>
            </div>
            <div className="bg-[var(--gf-surface)] p-6 border border-[var(--gf-border)]">
              <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink)] font-medium leading-relaxed">
                <MarkdownInline text={content.lifecycleMatrix.measure} />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Next Steps & Sources */}
      <section data-guardrails-section="next-steps" className="px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-24 bg-[var(--gf-bg)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
          <div className="grid lg:grid-cols-[1.5fr_1fr] gap-16 lg:gap-24">

            {/* Moves & CTA */}
            <div>
              <h2 className="font-display text-[length:var(--gf-h3)] font-semibold tracking-[-0.04em] text-[var(--gf-ink)] mb-6">
                <MarkdownInline text={content.moves.heading} />
              </h2>
              <p className="text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] mb-10">
                <MarkdownInline text={content.moves.intro} />
              </p>

              <ul className="space-y-8 mb-12">
                {content.moves.items.map((move) => (
                  <li key={move.id} className="flex gap-4 items-start">
                     <div className="shrink-0 pt-1">
                       <div className="w-6 h-6 rounded-full bg-[var(--gf-ink)] text-white flex items-center justify-center text-[10px] font-bold">
                         {move.number}
                       </div>
                     </div>
                     <div>
                       <strong className="block mb-2 text-[length:var(--gf-text-lg)] text-[var(--gf-ink)]">
                         <MarkdownInline text={move.title} />
                       </strong>
                       <span className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] leading-[var(--gf-leading-copy)]">
                         <MarkdownInline text={move.body} />
                       </span>
                     </div>
                  </li>
                ))}
              </ul>

              <div className="bg-[var(--gf-surface)] p-8 border border-[var(--gf-border)] text-left shadow-sm">
                <h3 className="font-display text-[length:var(--gf-h4)] font-bold mb-3 text-[var(--gf-ink)]">
                  <MarkdownInline text={content.moves.cta.heading} />
                </h3>
                <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] mb-8">
                  <MarkdownInline text={content.moves.cta.body} />
                </p>
                <BrandButton href={content.moves.cta.button.href}>{content.moves.cta.button.label}</BrandButton>
              </div>
            </div>

            {/* Related Link & References */}
            <div className="flex flex-col gap-12">
              <a href={content.relatedLink.href} className="block group bg-[var(--gf-surface)] border border-[var(--gf-border)] p-8 transition-all hover:border-[var(--gf-accent)] hover:shadow-sm relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)]">
                <div className="absolute top-0 right-0 p-6 text-[var(--gf-border)] group-hover:text-[var(--gf-accent)]/20 transition-colors">
                  <ArrowUpRight size={48} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-accent)] mb-3">
                    Related Methodology <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)] group-hover:text-[var(--gf-accent)] transition-colors pr-16 mb-3">
                    <MarkdownInline text={content.relatedLink.title} />
                  </h3>
                  <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] italic leading-relaxed">
                    <MarkdownInline text={content.relatedLink.body} />
                  </p>
                </div>
              </a>

              <div className="bg-[var(--gf-surface)] p-8 border border-[var(--gf-border)]">
                <h3 className="font-display text-[length:var(--gf-h4)] font-semibold text-[var(--gf-ink)] mb-4">
                  <MarkdownInline text={content.references.heading} />
                </h3>
                <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] mb-8 leading-relaxed">
                  <MarkdownInline text={content.references.intro} />
                </p>

                <div className="space-y-6 mb-8">
                  {content.references.items.map((ref) => (
                    <div key={ref.id} className="border-l-2 border-[var(--gf-border)] pl-4">
                      <a href={ref.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-bold text-[length:var(--gf-text-sm)] text-[var(--gf-ink)] hover:text-[var(--gf-accent)] transition-colors">
                        <MarkdownInline text={ref.title} /> <ArrowUpRight size={14} />
                      </a>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--gf-ink-faint)] mt-1 mb-2">
                        {ref.version}
                      </div>
                      <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] leading-snug">
                        <MarkdownInline text={ref.note} />
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--gf-border)] pt-6">
                  <p className="text-[11px] text-[var(--gf-ink-faint)] leading-relaxed italic">
                    <MarkdownInline text={content.references.disclaimer} />
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

    </article>
  );
}

export default function GuardrailsFrameworkPage() {
  const query = useCmsEntry("framework", "guardrails-framework");
  const renderPolicy = cmsEntryRenderPolicy(query.isAuthoritative, query.delivery);
  
  const cmsRecord = query.data ? contentRecord(query.data, "framework") : null;
  const framework = cmsRecord?.template === "guardrails" ? (cmsRecord as CmsRecord<GuardrailsContent>) : null;

  return <GuardrailsLayout framework={framework} renderPolicy={renderPolicy} />;
}
