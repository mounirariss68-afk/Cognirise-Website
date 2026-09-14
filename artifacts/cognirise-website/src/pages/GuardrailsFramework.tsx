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
    <article data-guardrails-page className="guardrails-page [overflow-wrap:anywhere] bg-background font-sans text-foreground selection:bg-[var(--gf-accent)] selection:text-white pb-24">
      {/* 1. Header (Hero) */}
      <header className={`relative ${heroImage ? "min-h-[85vh] lg:min-h-[90vh] flex flex-col justify-center" : "min-h-[75vh]"} border-b border-[var(--gf-border)] overflow-hidden`}>
        {heroImage && (
          <div className="absolute top-0 right-0 w-full h-[55vh] lg:h-full lg:w-[65%] z-0 overflow-hidden bg-[var(--gf-surface)] clip-diagonal-bottom lg:clip-diagonal-left">
            <div className="absolute inset-0 bg-[var(--gf-ink)] opacity-[0.03] mix-blend-multiply pointer-events-none z-10" />
            <PulseImage
              src={heroImage}
              alt={heroMedia?.altText || "Cognirise Guardrails Framework"}
              className="w-full h-full object-cover"
              style={{ objectPosition: cmsMediaObjectPosition(heroMedia) }}
              data-pulse-image
              eager
            />
          </div>
        )}
        <div className={`relative z-10 w-full px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-32 ${heroImage ? "mt-[20vh] lg:mt-0" : ""}`}>
          <div className={`max-w-[var(--gf-content-wide)] ${heroImage ? "bg-[var(--gf-bg)]/90 backdrop-blur-md p-8 lg:p-14 border border-[var(--gf-border)] shadow-xl max-w-[650px] lg:max-w-[750px]" : "mx-auto"}`}>
            <Kicker>{content.hero.eyebrow}</Kicker>
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: reducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="mt-8 font-display text-[length:var(--gf-h1)] font-semibold leading-[0.92] tracking-[-0.04em] text-[var(--gf-ink)]">
                <MarkdownInline text={content.hero.headline} />
              </h1>
              <p className="mt-8 text-[length:var(--gf-text-xl)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)] font-medium max-w-[var(--gf-content-standard)]">
                <MarkdownInline text={content.hero.subheadline} />
              </p>
              <div className="mt-8 border-l-[3px] border-[var(--gf-accent-coral)] pl-5 py-1">
                <p className="font-display text-[length:var(--gf-text-lg)] font-bold text-[var(--gf-ink-muted)] max-w-[34ch] leading-tight">
                  <MarkdownInline text={content.hero.strapline} />
                </p>
              </div>
              <div className="mt-12 flex flex-wrap items-center gap-6">
                <BrandButton href={content.hero.primaryAction.href} variant="primary">{content.hero.primaryAction.label}</BrandButton>
                <BrandButton href={content.hero.secondaryAction.href} variant="editorial">{content.hero.secondaryAction.label}</BrandButton>
              </div>
            </motion.div>
          </div>
        </div>
      </header>

      {/* 2. Overview (Set, Prove, Hold Map) */}
      <section data-guardrails-section="overview" className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-32 bg-[var(--gf-surface)] border-b border-[var(--gf-border)] relative">
        <div className="max-w-[var(--gf-content-wide)] mx-auto relative z-10">
          <div className="mb-16 max-w-[var(--gf-content-standard)]">
            <h2 className="font-display text-[length:var(--gf-h2)] font-semibold leading-tight tracking-tight text-[var(--gf-ink)]">
              <MarkdownInline text={content.overview.heading} />
            </h2>
            <p className="mt-8 text-[length:var(--gf-text-xl)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[42ch]">
              <MarkdownInline text={content.overview.intro} />
            </p>
          </div>

          <div>
            <SetProveHoldActionMap phases={content.overview.phases} actions={content.actions} />
          </div>
        </div>
      </section>

      {/* 3. Layers Explorer */}
      <section data-guardrails-section="layers" className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-32 bg-[var(--gf-bg)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
          <div className="mb-16 grid lg:grid-cols-[1.5fr_1fr] gap-12 lg:gap-20 items-end">
            <div className="max-w-[var(--gf-content-standard)]">
              <h2 className="font-display text-[length:var(--gf-h2)] font-semibold leading-tight tracking-tight text-[var(--gf-ink)]">
                <MarkdownInline text={content.layers.heading} />
              </h2>
              <p className="mt-8 text-[length:var(--gf-text-xl)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[40ch]">
                <MarkdownInline text={content.layers.intro} />
              </p>
            </div>
            
            <div className="border border-[var(--gf-border)] bg-[var(--gf-surface)] p-6 shadow-sm self-start">
              <span className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-[var(--gf-ink-muted)] mb-3">
                <span className="w-2 h-2 rounded-full bg-[var(--gf-accent-coral)]" />
                One rule, four ways
              </span>
              <strong className="block text-[length:var(--gf-text-base)] text-[var(--gf-ink)] font-display leading-snug">
                <MarkdownInline text={content.layers.exampleRule} />
              </strong>
            </div>
          </div>

          <div>
            <FourLayerComparison layers={content.layers} />
          </div>

          <div className="mt-16 max-w-[var(--gf-content-copy)]">
            <blockquote className="border-l-[3px] border-[var(--gf-accent-violet)] pl-6 md:pl-8 py-2 text-[length:var(--gf-text-xl)] font-display tracking-tight text-[var(--gf-ink)] leading-relaxed relative">
              <span className="absolute -left-3 -top-3 text-[4rem] text-[var(--gf-accent-violet)] opacity-20 font-serif leading-none" aria-hidden="true">&ldquo;</span>
              <MarkdownInline text={content.layers.callout} />
            </blockquote>
          </div>
        </div>
      </section>

      {/* 4. Lifecycle Matrix */}
      <section data-guardrails-section="lifecycle" className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-32 bg-[var(--gf-surface)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
          <div className="mb-16 max-w-[var(--gf-content-standard)]">
            <h2 className="font-display text-[length:var(--gf-h2)] font-semibold leading-tight tracking-tight text-[var(--gf-ink)]">
              <MarkdownInline text={content.lifecycleMatrix.heading} />
            </h2>
            <p className="mt-8 text-[length:var(--gf-text-xl)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[42ch]">
              <MarkdownInline text={content.lifecycleMatrix.intro} />
            </p>
          </div>

          <div>
            <LifecycleMatrix matrix={content.lifecycleMatrix} />
          </div>

          <div className="mt-16 grid md:grid-cols-2 gap-8 lg:gap-12 max-w-[var(--gf-content-wide)]">
            <div className="border-t-2 border-[var(--gf-border)] pt-6">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-ink-muted)] mb-3 block">Context</span>
              <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[40ch]">
                <MarkdownInline text={content.lifecycleMatrix.callout} />
              </p>
            </div>
            <div className="border-t-2 border-[var(--gf-accent-coral)] pt-6">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[var(--gf-accent-coral)] mb-3 block">Measurement standard</span>
              <p className="text-[length:var(--gf-text-lg)] text-[var(--gf-ink)] font-semibold leading-relaxed max-w-[36ch]">
                <MarkdownInline text={content.lifecycleMatrix.measure} />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Next Steps & Sources */}
      <section data-guardrails-section="next-steps" className="px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-surface)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-[var(--gf-accent-violet)] opacity-[0.02] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" aria-hidden="true" />
        
        <div className="max-w-[var(--gf-content-wide)] mx-auto relative z-10">
          <div className="grid lg:grid-cols-[1.2fr_1fr] gap-16 lg:gap-24">

            {/* Moves & CTA */}
            <div>
              <h2 className="font-display text-[length:var(--gf-h3)] font-semibold tracking-[-0.04em] text-[var(--gf-ink)] mb-6">
                <MarkdownInline text={content.moves.heading} />
              </h2>
              <p className="text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] mb-10 leading-relaxed max-w-[var(--gf-content-narrow)]">
                <MarkdownInline text={content.moves.intro} />
              </p>

              <ul className="space-y-10 mb-14 relative">
                <div className="absolute left-[11px] top-6 bottom-8 w-px bg-gradient-to-b from-[var(--gf-accent-violet)] to-transparent" aria-hidden="true" />
                {content.moves.items.map((move) => (
                  <li key={move.id} className="flex gap-6 items-start relative z-10">
                     <div className="shrink-0 pt-1">
                       <div className="w-6 h-6 rounded-full bg-[var(--gf-accent-violet)] text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-[var(--gf-accent-violet)]/20 ring-4 ring-[var(--gf-surface)]">
                         {move.number}
                       </div>
                     </div>
                     <div>
                       <strong className="block mb-2 text-[length:var(--gf-text-lg)] text-[var(--gf-ink)] font-display tracking-tight">
                         <MarkdownInline text={move.title} />
                       </strong>
                       <span className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[40ch] block">
                         <MarkdownInline text={move.body} />
                       </span>
                     </div>
                  </li>
                ))}
              </ul>

              <div className="bg-[var(--gf-bg)] p-8 md:p-10 border border-[var(--gf-border)] text-left shadow-lg shadow-[var(--gf-ink)]/5 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--gf-accent-coral)] opacity-[0.03] rounded-full blur-2xl translate-x-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
                <h3 className="font-display text-[length:var(--gf-h4)] font-bold mb-4 text-[var(--gf-ink)] relative z-10">
                  <MarkdownInline text={content.moves.cta.heading} />
                </h3>
                <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] mb-8 max-w-[36ch] leading-relaxed relative z-10">
                  <MarkdownInline text={content.moves.cta.body} />
                </p>
                <BrandButton href={content.moves.cta.button.href} variant="primary" className="relative z-10">{content.moves.cta.button.label}</BrandButton>
              </div>
            </div>

            {/* Related Link & References */}
            <div className="flex flex-col gap-10">
              <a href={content.relatedLink.href} className="group block bg-[var(--gf-bg)] border border-[var(--gf-border)] p-8 md:p-10 transition-all duration-300 hover:border-[var(--gf-accent)] hover:shadow-xl hover:shadow-[var(--gf-accent)]/10 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-accent)]">
                <div className="absolute top-0 right-0 p-8 text-[var(--gf-border)] group-hover:text-[var(--gf-accent)]/10 transition-colors duration-500 transform group-hover:scale-110 origin-top-right">
                  <ArrowUpRight size={64} strokeWidth={1} />
                </div>
                <div className="relative z-10">
                  <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-accent)] mb-4">
                    Related Methodology <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                  <h3 className="font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)] group-hover:text-[var(--gf-accent)] transition-colors pr-12 mb-4 leading-tight">
                    <MarkdownInline text={content.relatedLink.title} />
                  </h3>
                  <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] italic leading-relaxed max-w-[32ch]">
                    <MarkdownInline text={content.relatedLink.body} />
                  </p>
                </div>
              </a>

              <div className="bg-[var(--gf-bg)] p-8 md:p-10 border border-[var(--gf-border)]">
                <h3 className="font-display text-[length:var(--gf-h4)] font-semibold text-[var(--gf-ink)] mb-4">
                  <MarkdownInline text={content.references.heading} />
                </h3>
                <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] mb-8 leading-relaxed">
                  <MarkdownInline text={content.references.intro} />
                </p>

                <div className="space-y-6 mb-8">
                  {content.references.items.map((ref) => (
                    <div key={ref.id} className="border-l-[3px] border-[var(--gf-border)] pl-4 hover:border-[var(--gf-accent)] transition-colors">
                      <a href={ref.url} target="_blank" rel="noopener noreferrer" className="group inline-flex items-center gap-1 font-bold text-[length:var(--gf-text-sm)] text-[var(--gf-ink)] hover:text-[var(--gf-accent)] transition-colors">
                        <MarkdownInline text={ref.title} /> <ArrowUpRight size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                      </a>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-[var(--gf-ink-faint)] mt-1.5 mb-2.5">
                        {ref.version}
                      </div>
                      <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] leading-relaxed">
                        <MarkdownInline text={ref.note} />
                      </p>
                    </div>
                  ))}
                </div>

                <div className="border-t border-[var(--gf-border)] pt-6 mt-8">
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
