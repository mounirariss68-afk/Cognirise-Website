import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { cmsEntryRenderPolicy, contentRecord, useCmsEntry, type CmsRecord, resolveCmsMedia, cmsMediaObjectPosition } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import type { FrameworkContent } from "@workspace/api-zod";

import { Kicker } from "@/components/guardrails/Kicker";
import { MarkdownInline } from "@/components/guardrails/MarkdownInline";
import { LayerExplorer } from "@/components/guardrails/LayerExplorer";
import { ExposureExplorer } from "@/components/guardrails/ExposureExplorer";
import { QuestionsInteraction } from "@/components/guardrails/QuestionsInteraction";
import { ResponsiveTable } from "@/components/guardrails/ResponsiveTable";
import { Disclosure } from "@/components/guardrails/Disclosure";
import { PulseImage } from "@/components/ui/pulse-image";

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

  const heroMedia = resolveCmsMedia(framework.media, framework.heroMedia, framework.heroMediaId);
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

  const content = framework;
  const heroMedia = resolveCmsMedia(framework.media, framework.heroMedia, framework.heroMediaId);
  const heroImage = heroMedia?.url;
  const presentation = content.presentation;

  return (
    <article className="guardrails-page bg-[var(--gf-bg)] font-sans text-[var(--gf-ink)] selection:bg-[var(--gf-accent)] selection:text-[var(--gf-accent-ink)] pb-12">

      {/* 1. Header (Hero) */}
      <header className="grid lg:grid-cols-2 min-h-[75vh] border-b border-[var(--gf-border)]">
        <div className="flex flex-col justify-center px-6 py-16 md:px-[var(--gf-page-gutter)] lg:pr-12 xl:pr-24">
          <Kicker>{content.hero.eyebrow}</Kicker>
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
          >
            <h1 className="mt-8 font-display text-[length:var(--gf-h1)] font-semibold leading-[0.92] tracking-[-0.085em] text-[var(--gf-ink)]">
              <MarkdownInline text={presentation?.hero?.headline || content.hero.headline} />
            </h1>
            <p className="mt-8 text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink-muted)] max-w-[var(--gf-content-standard)] font-medium">
              <MarkdownInline text={presentation?.hero?.subheadline || content.hero.subheadline} />
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <BrandButton href={content.hero.primaryAction.href}>{content.hero.primaryAction.label}</BrandButton>
              <a href={content.hero.secondaryAction.href} className="inline-flex items-center gap-2 border-b border-[var(--gf-ink)] pb-1 text-[length:var(--gf-text-sm)] font-bold hover:text-[var(--gf-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-offset-4">
                {content.hero.secondaryAction.label} <ArrowRight size={16} />
              </a>
            </div>
            {presentation?.hero?.detailsLabel && (
              <div className="mt-8 max-w-[var(--gf-content-standard)]">
                <Disclosure title={presentation.hero.detailsLabel}>
                  <div className="space-y-4">
                    <p><MarkdownInline text={content.hero.headline} /></p>
                    <p><MarkdownInline text={content.hero.subheadline} /></p>
                  </div>
                </Disclosure>
              </div>
            )}
          </motion.div>
        </div>
        <div className="relative bg-[var(--gf-surface)] lg:border-l border-[var(--gf-border)] overflow-hidden h-[320px] md:h-[420px] lg:h-full min-h-[320px]">
          {heroImage ? (
            <PulseImage
              src={heroImage}
              alt={heroMedia?.altText || "Cognirise Guardrails Framework"}
              className="w-full h-full object-cover"
              style={{ objectPosition: cmsMediaObjectPosition(heroMedia) }}
              eager
            />
          ) : (
            <div className="w-full h-full bg-[#0b2247] flex items-center justify-center text-white/50 text-[length:var(--gf-text-sm)] p-6 text-center">
              Draft hero media is not available in this revision.
            </div>
          )}
        </div>
      </header>

      {/* 2. Distinction */}
      <section className="px-6 py-12 md:px-[var(--gf-page-gutter)] lg:py-20 bg-[var(--gf-surface)] border-b border-[var(--gf-border)]">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10 max-w-[var(--gf-content-wide)] mx-auto">
          <div>
           <Kicker>{content.distinction.heading}</Kicker>
            <h2 className="mt-6 font-display text-[length:var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)] text-[var(--gf-ink)]">
              <MarkdownInline text={content.distinction.heading} />
            </h2>
          </div>
          <div className="space-y-8 text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)] lg:border-l lg:border-[var(--gf-border)] lg:pl-10">
            <p className="text-[var(--gf-ink)] font-medium border-l-2 border-[var(--gf-accent)] pl-5">
              <MarkdownInline text={presentation?.distinction?.summary || content.distinction.body[0]} />
            </p>
            {content.distinction.body[1] && (
              <p><MarkdownInline text={content.distinction.body[1]} /></p>
            )}
            {content.distinction.body.length > 2 && (
              <Disclosure title={presentation?.distinction?.detailsLabel || "Read the distinction in full"}>
                <div className="space-y-6">
                  {presentation?.distinction && <p><MarkdownInline text={content.distinction.body[0]} /></p>}
                  {content.distinction.body.slice(2).map((para, idx) => (
                    <p key={idx}><MarkdownInline text={para} /></p>
                  ))}
                </div>
              </Disclosure>
            )}
          </div>
        </div>
      </section>

      {/* 3. Layers Explorer */}
      <section className="px-6 py-12 md:px-[var(--gf-page-gutter)] lg:py-20 bg-[var(--gf-bg)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-standard)]">
           <Kicker>{content.layers.diagram.kicker}</Kicker>
          <h2 className="mt-4 font-display text-[length:var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)] text-[var(--gf-ink)]">
            <MarkdownInline text={content.layers.heading} />
          </h2>
          <p className="mt-4 text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)] font-medium">
            <MarkdownInline text={presentation?.layers?.summary || content.layers.intro} />
          </p>
        </div>

        <div className="mt-12 max-w-[var(--gf-content-wide)]">
          <p className="mb-8 max-w-[var(--gf-content-copy)] border-l-2 border-[var(--gf-accent-violet)] pl-5 text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]">
            <MarkdownInline text={content.layers.exampleText} />
          </p>
          <LayerExplorer content={content} />
          <div className="mt-8">
            <div className="space-y-8">
              <blockquote className="border-l-4 border-[var(--gf-border)] pl-6 py-1 text-[length:var(--gf-text-lg)] italic text-[var(--gf-ink-muted)] mb-8">
                <MarkdownInline text={content.layers.pullOut} />
              </blockquote>
              <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink)] max-w-[var(--gf-content-copy)]">
                <MarkdownInline text={content.layers.closingLine} />
              </p>
              <aside className="flex gap-4 p-6 border border-[var(--gf-border)] bg-[var(--gf-surface)] max-w-[var(--gf-content-copy)]">
                <div className="shrink-0 w-8 h-8 rounded-full bg-[var(--gf-accent-violet-soft)] text-[var(--gf-accent-violet)] flex items-center justify-center font-bold text-[length:var(--gf-text-xs)]">
                  5
                </div>
                <div>
                  <h4 className="font-bold text-[length:var(--gf-text-xs)] uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink-muted)] mb-2">
                    <MarkdownInline text={content.layers.aside.heading} />
                  </h4>
                  <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink)]">
                    <MarkdownInline text={content.layers.aside.body} />
                  </p>
                </div>
              </aside>
            </div>
            <div className="mt-8">
              <Disclosure title={presentation?.layers?.detailsLabel || "See all four layers and the worked example"}>
              <p className="mb-6"><MarkdownInline text={content.layers.intro} /></p>
              <div className="mt-10 overflow-x-auto border-t border-[var(--gf-border)] pt-8">
                <ResponsiveTable
                  headers={content.layers.tableHeaders}
                  rows={content.layers.table}
                  columns={[
                    { key: "layer", isBold: true },
                    { key: "whatItIs" },
                    { key: "inThisExample" },
                    { key: "whatGetsPastIt" },
                    { key: "strengthLabel" }
                  ]}
                />
              </div>
              </Disclosure>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Exposure Explorer */}
      <section className="px-6 py-12 md:px-[var(--gf-page-gutter)] lg:py-20 bg-[var(--gf-surface)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-standard)]">
           <Kicker>{content.stoppingRule.diagram.kicker}</Kicker>
          <h2 className="mt-4 font-display text-[length:var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)] text-[var(--gf-ink)]">
            <MarkdownInline text={content.stoppingRule.heading} />
          </h2>
          <p className="mt-4 text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)] font-medium">
            <MarkdownInline text={presentation?.exposure?.summary || content.stoppingRule.intro} />
          </p>
        </div>

        <div className="mt-12 max-w-[var(--gf-content-wide)]">
          <ExposureExplorer content={content} />
          <div className="mt-8">
            <blockquote className="border-l-4 border-[var(--gf-border)] pl-6 py-1 text-[length:var(--gf-text-lg)] italic text-[var(--gf-ink-muted)]">
              <MarkdownInline text={content.stoppingRule.pullOut} />
            </blockquote>
            <div className="mt-8">
              <Disclosure title={presentation?.exposure?.detailsLabel || "See the five exposure-to-control relationships"}>
              <p className="mb-6"><MarkdownInline text={content.stoppingRule.intro} /></p>
              <p className="mb-6"><MarkdownInline text={content.stoppingRule.diagram.note} /></p>
              <div className="overflow-x-auto border-t border-[var(--gf-border)] pt-8">
                <ResponsiveTable
                  headers={content.stoppingRule.tableHeaders}
                  rows={content.stoppingRule.exposures}
                  columns={[
                    { key: "handover" },
                    { key: "requirement", isBold: true }
                  ]}
                />
              </div>
              <p className="mt-6"><MarkdownInline text={content.stoppingRule.diagram.footer} /></p>
              </Disclosure>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Set / Prove / Hold (Method + Maintenance + Questions + Measurement) */}
      <section className="px-6 py-12 md:px-[var(--gf-page-gutter)] lg:py-20 bg-[var(--gf-bg)] border-b border-[var(--gf-border)]">
        <div className="max-w-[var(--gf-content-standard)] mb-16">
           <Kicker>{content.method.heading}</Kicker>
          <h2 className="mt-4 font-display text-[length:var(--gf-display)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)] text-[var(--gf-ink)]">
            <MarkdownInline text={content.method.heading} />
          </h2>
          <p className="mt-4 text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] font-medium">
            <MarkdownInline text={presentation?.setProveHold?.summary || content.method.intro} />
          </p>
          {presentation?.setProveHold && (
            <p className="mt-4 text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink-muted)]"><MarkdownInline text={content.method.intro} /></p>
          )}
        </div>
        
        <div className="max-w-[var(--gf-content-wide)] space-y-16">
          {content.method.phases.map((phase, pIdx) => (
            <div key={phase.id} className="grid md:grid-cols-[1fr_2.5fr] gap-8 md:gap-12 items-start border-t border-[var(--gf-border)] pt-8">
              <div className="md:sticky md:top-8">
                <h3 className="font-display text-[length:var(--gf-h3)] font-semibold text-[var(--gf-ink)] flex flex-col">
                  <span className="text-[var(--gf-accent)] font-mono text-[length:var(--gf-text-sm)] tracking-widest uppercase mb-2">0{pIdx + 1} {phase.caption}</span>
                  {phase.name}
                </h3>
              </div>
              <ul className="space-y-6">
                {phase.steps.map((step, sIdx) => (
                  <li key={sIdx} className="flex gap-4">
                    <span className="text-[length:var(--gf-text-sm)] font-bold text-[var(--gf-accent-coral)] mt-1">
                      0{sIdx + 1}
                    </span>
                    <p className="text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]">
                      <MarkdownInline text={step} strongClass="font-semibold" />
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-20 max-w-[var(--gf-content-wide)]">
          <div className="max-w-[var(--gf-content-compact)] border-l-2 border-[var(--gf-accent)] bg-[var(--gf-surface)] p-6 md:p-8">
            <Kicker>{presentation?.setProveHold?.measurementDetailsLabel || content.measurement.heading}</Kicker>
            <h3 className="mt-4 font-display text-[length:var(--gf-h3)] font-semibold leading-tight text-[var(--gf-ink)]">
              <MarkdownInline text={content.measurement.statement} />
            </h3>
            <p className="mt-4 text-[length:var(--gf-text-base)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink-muted)]">
              <MarkdownInline text={content.measurement.supportingLine} />
            </p>
          </div>
        </div>

        {/* Maintenance and questions remain available without repeating their full detail in the default reading path. */}
        <div className="mt-20 max-w-[var(--gf-content-wide)]">
          <div className="space-y-4">
            <Disclosure title={presentation?.setProveHold?.maintenanceDetailsLabel || "Maintenance by enforcement layer"}>
              <div className="overflow-x-auto pb-4">
                <ResponsiveTable
                  headers={content.maintenance.tableHeaders}
                  rows={content.maintenance.table}
                  columns={[
                    { key: "layer", isBold: true },
                    { key: "set" },
                    { key: "prove" },
                    { key: "hold" }
                  ]}
                />
              </div>
              <p className="mt-8 font-medium text-[var(--gf-ink)] leading-relaxed"><MarkdownInline text={content.maintenance.closingParagraph} /></p>
            </Disclosure>

            <Disclosure title={presentation?.setProveHold?.questionsDetailsLabel || "Questions a control must answer"}>
              <p className="mb-6 font-medium text-[var(--gf-ink)]"><MarkdownInline text={content.questions.intro} /></p>
              <QuestionsInteraction panels={content.questions.panels} />
            </Disclosure>
          </div>
        </div>
      </section>

      {/* 6. Authority (Related Model) */}
      <section className="px-6 py-12 md:px-[var(--gf-page-gutter)] lg:py-20 bg-[var(--gf-surface)] border-b border-[var(--gf-border)]">
        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-10 max-w-[var(--gf-content-wide)] mx-auto">
          <div>
             <Kicker>{content.authority.linkCard.title}</Kicker>
            <h2 className="mt-6 font-display text-[length:var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)] text-[var(--gf-ink)]">
              <MarkdownInline text={content.authority.heading} />
            </h2>
          </div>
          <div className="space-y-8 text-[length:var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)] lg:border-l lg:border-[var(--gf-border)] lg:pl-10">
            <p className="text-[var(--gf-ink)] font-medium border-l-2 border-[var(--gf-accent)] pl-5">
              <MarkdownInline text={presentation?.authority?.summary || content.authority.body[0]} />
            </p>
            <div className="space-y-6">
              {content.authority.body.slice(1).map((para, idx) => (
                <p key={idx}><MarkdownInline text={para} /></p>
              ))}
            </div>
            {presentation?.authority?.detailsLabel && (
              <Disclosure title={presentation.authority.detailsLabel}>
                <p><MarkdownInline text={content.authority.body[0]} /></p>
              </Disclosure>
            )}
            <a href={content.authority.linkCard.href} className="block group bg-[var(--gf-bg)] border border-[var(--gf-border)] p-8 transition-all hover:border-[var(--gf-accent)] hover:shadow-sm relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)]">
              <div className="absolute top-0 right-0 p-6 text-[var(--gf-border)] group-hover:text-[var(--gf-accent)]/20 transition-colors">
                <ArrowUpRight size={48} />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-accent)] mb-3">
                  Related Methodology <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
                <h3 className="font-display text-[length:var(--gf-h4)] font-bold text-[var(--gf-ink)] group-hover:text-[var(--gf-accent)] transition-colors pr-16">
                  <MarkdownInline text={content.authority.linkCard.title} />
                </h3>
                <p className="mt-3 text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] italic max-w-[90%]">
                  <MarkdownInline text={content.authority.linkCard.description} />
                </p>
              </div>
            </a>
          </div>
        </div>
      </section>

      {/* 7. Next Steps & Sources */}
      <section className="px-6 py-12 md:px-[var(--gf-page-gutter)] lg:py-20 bg-[var(--gf-bg)]">
        <div className="max-w-[var(--gf-content-wide)] mx-auto">
           <Kicker>{content.references.heading}</Kicker>
          <h2 className="mt-4 font-display text-[length:var(--gf-h3)] font-semibold tracking-[-0.04em] text-[var(--gf-ink)] mb-6">
            <MarkdownInline text={content.moves.heading} />
          </h2>
          <p className="text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] mb-10 max-w-[var(--gf-content-standard)] font-medium">
            <MarkdownInline text={presentation?.sourcesNextStep?.summary || content.references.intro[0]} />
          </p>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20">
              {/* Moves & CTA */}
              <div>
                <ul className="space-y-6 mb-10">
                  {content.moves.moves.map((move, idx) => (
                    <li key={idx} className="flex gap-4">
                       <div className="shrink-0 pt-1">
                         <div className="w-5 h-5 rounded-full bg-[var(--gf-accent)] text-[var(--gf-accent-ink)] flex items-center justify-center text-[10px] font-bold">
                           {move.number}
                         </div>
                       </div>
                       <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink)] leading-[var(--gf-leading-copy)]">
                         <strong className="block mb-1 text-[length:var(--gf-text-base)]"><MarkdownInline text={move.title} /></strong>
                         <span className="text-[var(--gf-ink-muted)]"><MarkdownInline text={move.body} /></span>
                       </p>
                    </li>
                  ))}
                </ul>

                <div className="bg-[var(--gf-surface)] p-8 border border-[var(--gf-border)] text-left shadow-sm">
                  <h3 className="font-display text-[length:var(--gf-table-h)] font-bold mb-3 text-[var(--gf-ink)]">
                    <MarkdownInline text={content.moves.cta.heading} />
                  </h3>
                  <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] mb-6">
                    <MarkdownInline text={content.moves.cta.body} />
                  </p>
                  <BrandButton href={content.moves.cta.button.href}>{content.moves.cta.button.label}</BrandButton>
                </div>
                {content.moves.footerNote && (
                  <p className="mt-6 text-[11px] text-[var(--gf-ink-muted)]">
                    <MarkdownInline text={content.moves.footerNote} />
                  </p>
                )}
              </div>

              {/* Sources / References */}
              <div className="lg:border-l lg:border-[var(--gf-border)] lg:pl-16">
                <h3 className="font-display text-[length:var(--gf-h4)] font-semibold tracking-[-0.04em] text-[var(--gf-ink)] mb-6">
                  <MarkdownInline text={content.references.heading} />
                </h3>
                <div className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] mb-8 space-y-3">
                  {content.references.intro.map((para, idx) => (
                    <p key={idx}><MarkdownInline text={para} /></p>
                  ))}
                </div>
                {presentation?.sourcesNextStep?.detailsLabel && (
                  <Disclosure title={presentation.sourcesNextStep.detailsLabel}>
                    <p><MarkdownInline text={content.moves.footerNote} /></p>
                  </Disclosure>
                )}

                <div className="space-y-6">
                  {content.references.groups.map(group => (
                    <div key={group.id} className="border-t border-[var(--gf-border)] pt-4">
                      <h4 className="font-bold text-[10px] uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-ink)] mb-2">
                        <MarkdownInline text={group.title} />
                      </h4>
                      <p className="text-[length:var(--gf-text-sm)] text-[var(--gf-ink-muted)] leading-relaxed">
                        <MarkdownInline text={group.items} />
                      </p>
                    </div>
                  ))}
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