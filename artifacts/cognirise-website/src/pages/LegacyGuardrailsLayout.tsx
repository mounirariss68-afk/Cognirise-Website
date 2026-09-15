import React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import type { CmsRecord } from "@/lib/cms";
import type { GuardrailsLegacyContent } from "@workspace/api-zod";

import { Kicker } from "@/components/guardrails/Kicker";
import { MarkdownInline } from "@/components/guardrails/MarkdownInline";
import { LayersInteraction } from "@/components/guardrails/LayersInteraction";
import { ExposureInteraction } from "@/components/guardrails/ExposureInteraction";
import { QuestionsInteraction } from "@/components/guardrails/QuestionsInteraction";
import { MethodInteraction } from "@/components/guardrails/MethodInteraction";
import { ResponsiveTable } from "@/components/guardrails/ResponsiveTable";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";

const colorMap: Record<string, string> = {
  policy: "var(--gf-ink)",
  prompt: "var(--gf-layer-prompt)",
  runtime: "var(--gf-layer-runtime)",
  architecture: "var(--gf-layer-arch)",
};

export function LegacyGuardrailsLayout({
  framework,
}: {
  framework: CmsRecord<GuardrailsLegacyContent>;
}) {
  const reducedMotion = useReducedMotion();
  const content = framework;

  return (
    <article className="guardrails-page overflow-hidden bg-[var(--gf-bg)] font-sans text-[var(--gf-ink)] selection:bg-[var(--gf-accent)] selection:text-[var(--gf-accent-ink)]">
      {/* 1. Hero */}
      <header className="px-6 pb-16 pt-9 md:px-[var(--gf-page-gutter)] lg:pb-24 border-b border-[var(--gf-border)]">
        <Kicker>{cleanHeroIdentifier(content.hero.eyebrow)}</Kicker>
        <div className="mt-8 w-full max-w-[var(--gf-content-hero)]">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.6 }}
          >
            <h1 className="font-display text-[var(--gf-h1)] font-semibold leading-[0.92] tracking-[-0.085em]">
              <MarkdownInline text={content.hero.headline} />
            </h1>
            <p className="mt-8 text-[var(--gf-text-lg)] md:text-[var(--gf-text-xl)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink-muted)] w-full max-w-[var(--gf-content-standard)]">
              <MarkdownInline text={content.hero.subheadline} />
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-6">
              <BrandButton href={content.hero.primaryAction.href}>{content.hero.primaryAction.label}</BrandButton>
              <a href={content.hero.secondaryAction.href} className="inline-flex items-center gap-2 border-b border-[var(--gf-ink)] pb-1 text-[var(--gf-text-sm)] font-bold hover:text-[var(--gf-accent)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] focus-visible:ring-offset-4">
                {content.hero.secondaryAction.label}
              </a>
            </div>
          </motion.div>
        </div>
      </header>

      {/* 2. The distinction */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 border-b border-[var(--gf-border)]">
        <div className="w-full max-w-[var(--gf-content-wide)]">
          <h2 className="font-display text-[var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
            <MarkdownInline text={content.distinction.heading} />
          </h2>
          <div className="mt-8 space-y-6 text-[var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
            {content.distinction.body.map((para, idx) => (
              <p key={idx} className={para.includes("**") ? "text-[var(--gf-ink)] text-[var(--gf-text-xl)] border-l-2 border-[var(--gf-accent)] pl-5 mt-8" : ""}>
                <MarkdownInline text={para} />
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* 3. Where the rule is enforced */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-bg)]">
        <h2 className="font-display text-[var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
          <MarkdownInline text={content.layers.heading} />
        </h2>
        <p className="mt-6 w-full max-w-[var(--gf-content-copy)] text-[var(--gf-text-base)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
          <MarkdownInline text={content.layers.intro} />
        </p>

        <div className="mt-16 w-full">
          <LayersInteraction diagram={content.layers.diagram} />
        </div>
        
        <div className="mt-16 w-full">
          <p className="mb-6 text-[var(--gf-text-lg)]"><MarkdownInline text={content.layers.exampleText} /></p>
          <ResponsiveTable
            headers={content.layers.tableHeaders}
            rows={content.layers.table}
            rowColors={colorMap}
            columns={[
              { key: "layer", isBold: true },
              { key: "whatItIs" },
              { key: "inThisExample" },
              { key: "whatGetsPastIt" },
              { key: "strengthLabel" }
            ]}
          />
        </div>

        <div className="mt-12 w-full max-w-[var(--gf-content-wide)]">
          <blockquote className="border-l-4 border-[var(--gf-ink)] pl-6 text-[var(--gf-text-xl)] font-medium leading-relaxed italic text-[var(--gf-ink-muted)] my-12">
            <MarkdownInline text={content.layers.pullOut} />
          </blockquote>
          
          <p className="text-[var(--gf-text-lg)] leading-relaxed text-[var(--gf-ink)]">
            <MarkdownInline text={content.layers.closingLine} />
          </p>
          
          <div className="mt-12 p-6 md:p-8 border border-[var(--gf-border)] bg-[var(--gf-surface)]">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-[var(--gf-accent-violet-soft)] flex items-center justify-center shrink-0">
                <span className="text-[var(--gf-accent-violet)] font-bold text-[var(--gf-text-xs)]">5</span>
              </div>
              <div>
                <h3 className="font-bold text-[var(--gf-text-sm)] uppercase tracking-wider text-[var(--gf-ink-muted)]">
                  <MarkdownInline text={content.layers.aside.heading} />
                </h3>
                <p className="mt-3 text-[var(--gf-text-sm)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink)]">
                  <MarkdownInline text={content.layers.aside.body} />
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. How strong is strong enough */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-surface)] border-t border-[var(--gf-border)]">
        <h2 className="font-display text-[var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
          <MarkdownInline text={content.stoppingRule.heading} />
        </h2>
        <p className="mt-6 w-full max-w-[var(--gf-content-quote)] text-[var(--gf-text-base)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
          <MarkdownInline text={content.stoppingRule.intro} />
        </p>

        <div className="mt-16 w-full">
          <ExposureInteraction diagram={content.stoppingRule.diagram} />
        </div>
        
        <div className="mt-16 w-full">
          <ResponsiveTable
            headers={content.stoppingRule.tableHeaders}
            rows={content.stoppingRule.exposures}
            rowColors={colorMap}
            columns={[
              { key: "handover" },
              { key: "requirement", isBold: true }
            ]}
          />
        </div>

        <blockquote className="mt-16 w-full max-w-[var(--gf-content-quote)] border-l-4 border-[var(--gf-ink)] pl-6 text-[var(--gf-text-xl)] font-medium leading-relaxed italic text-[var(--gf-ink-muted)]">
          <MarkdownInline text={content.stoppingRule.pullOut} />
        </blockquote>
      </section>

      {/* 5. Three questions */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-bg)] border-t border-[var(--gf-border)]">
        <h2 className="font-display text-[var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
          <MarkdownInline text={content.questions.heading} />
        </h2>
        <p className="mt-6 mb-12 w-full max-w-[var(--gf-content-copy)] text-[var(--gf-text-base)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
          <MarkdownInline text={content.questions.intro} />
        </p>

        <QuestionsInteraction panels={content.questions.panels} />
      </section>

      {/* 6. The method */}
      <section className="py-20 lg:py-28">
        <div className="px-6 md:px-[var(--gf-page-gutter)] mb-12">
          <h2 className="font-display text-[var(--gf-h3)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
            <MarkdownInline text={content.method.heading} />
          </h2>
          <p className="mt-4 text-[var(--gf-text-base)] text-[var(--gf-ink-muted)]">
            <MarkdownInline text={content.method.intro} />
          </p>
        </div>
        
        <MethodInteraction phases={content.method.phases} />
      </section>

      {/* 7. What it costs */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-bg)] border-b border-[var(--gf-border)]">
        <h2 className="font-display text-[var(--gf-display)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
          <MarkdownInline text={content.maintenance.heading} />
        </h2>
        
        <div className="mt-12 w-full">
          <ResponsiveTable
            headers={content.maintenance.tableHeaders}
            rows={content.maintenance.table}
            rowColors={colorMap}
            columns={[
              { key: "layer", isBold: true },
              { key: "set" },
              { key: "prove" },
              { key: "hold" }
            ]}
          />
        </div>

        <p className="mt-12 w-full max-w-[var(--gf-content-wide)] text-[var(--gf-text-base)] leading-[var(--gf-leading-body)] text-[var(--gf-ink)] bg-[var(--gf-surface)] p-6 md:p-8 border border-[var(--gf-border)] shadow-sm">
          <MarkdownInline text={content.maintenance.closingParagraph} />
        </p>
      </section>

      {/* 8. The one number */}
      <section className="px-6 py-24 md:px-[var(--gf-page-gutter)] lg:py-32 bg-[var(--gf-surface)] text-center">
        <h2 className="text-[var(--gf-text-xs)] font-bold uppercase tracking-[var(--gf-tracking-measure)] text-[var(--gf-ink-muted)] mb-8">
          <MarkdownInline text={content.measurement.heading} />
        </h2>
        <p className="mx-auto w-full max-w-[var(--gf-content-measure)] font-display text-[var(--gf-display)] font-semibold leading-[var(--gf-leading-measure)] tracking-[var(--gf-tracking-heading)] text-[var(--gf-ink)]">
          <MarkdownInline text={content.measurement.statement} />
        </p>
        <p className="mx-auto mt-8 w-full max-w-[var(--gf-content-compact)] text-[var(--gf-text-lg)] leading-[var(--gf-leading-copy)] text-[var(--gf-ink-muted)]">
          <MarkdownInline text={content.measurement.supportingLine} />
        </p>
      </section>

      {/* 9. Authority and enforcement */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-bg)] border-y border-[var(--gf-border)]">
        <div className="w-full max-w-[var(--gf-content-standard)]">
          <h2 className="font-display text-[var(--gf-display)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
            <MarkdownInline text={content.authority.heading} />
          </h2>
          <div className="mt-8 space-y-6 text-[var(--gf-text-lg)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
            {content.authority.body.map((para, idx) => (
              <p key={idx} className={para.includes("**") ? "text-[var(--gf-text-xl)] font-medium text-[var(--gf-ink)] py-2" : ""}>
                <MarkdownInline text={para} />
              </p>
            ))}
          </div>

          <a href={content.authority.linkCard.href} className="mt-10 block group bg-[var(--gf-surface)] border border-[var(--gf-border)] p-6 md:p-8 transition-colors hover:border-[var(--gf-accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-focus)] shadow-sm">
            <div className="flex items-center gap-2 text-[var(--gf-text-xs)] font-bold uppercase tracking-[var(--gf-tracking-label)] text-[var(--gf-accent)] mb-3">
              Related Methodology <ArrowUpRight size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </div>
            <h3 className="font-display text-[var(--gf-table-h)] font-bold text-[var(--gf-ink)] group-hover:text-[var(--gf-accent)] transition-colors">
              <MarkdownInline text={content.authority.linkCard.title} />
            </h3>
            <p className="mt-2 text-[var(--gf-text-base)] text-[var(--gf-ink-muted)] italic">
              <MarkdownInline text={content.authority.linkCard.description} />
            </p>
          </a>
        </div>
      </section>

      {/* 10. What this is built from */}
      <section className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28">
        <h2 className="font-display text-[var(--gf-h4)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
          <MarkdownInline text={content.references.heading} />
        </h2>
        <div className="mt-6 w-full max-w-[var(--gf-content-standard)] space-y-4 text-[var(--gf-text-base)] leading-[var(--gf-leading-body)] text-[var(--gf-ink-muted)]">
          {content.references.intro.map((para, idx) => <p key={idx}><MarkdownInline text={para} /></p>)}
        </div>

        <div className="mt-14 grid md:grid-cols-3 gap-8 w-full">
          {content.references.groups.map((group) => (
            <div key={group.id}>
              <h3 className="font-bold text-[var(--gf-text-sm)] uppercase tracking-wider text-[var(--gf-ink)] border-b border-[var(--gf-border)] pb-3 mb-4">
                <MarkdownInline text={group.title} />
              </h3>
              <p className="text-[var(--gf-text-sm)] text-[var(--gf-ink-muted)] leading-[var(--gf-leading-copy)]">
                <MarkdownInline text={group.items} />
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 11. Three moves & Closing */}
      <section className="border-t border-[var(--gf-border)]">
        <div className="w-full max-w-[var(--gf-content-measure)] px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28">
          <h2 className="font-display text-[var(--gf-display)] font-semibold leading-[var(--gf-leading-heading)] tracking-[var(--gf-tracking-heading)]">
            <MarkdownInline text={content.moves.heading} />
          </h2>
          
          <div className="mt-12 space-y-10">
            {content.moves.moves.map((move, idx) => (
              <div key={idx} className="flex gap-5">
                <div className="shrink-0 pt-1">
                  <div className="w-6 h-6 rounded-full bg-[var(--gf-accent)] text-[var(--gf-accent-ink)] flex items-center justify-center text-[var(--gf-text-xs)] font-bold">
                    {move.number}
                  </div>
                </div>
                <div>
                  <p className="text-[var(--gf-text-base)] text-[var(--gf-ink)] leading-[var(--gf-leading-copy)]">
                    <strong><MarkdownInline text={move.title} /></strong> <MarkdownInline text={move.body} />
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-[var(--gf-rail-bg)] text-[var(--gf-rail-ink)] px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-24 text-center border-t border-[var(--gf-border)] shadow-sm">
          <h2 className="font-display text-[var(--gf-h3)] font-bold tracking-[var(--gf-tracking-heading)]">
            <MarkdownInline text={content.moves.cta.heading} />
          </h2>
          <p className="mt-6 w-full max-w-[var(--gf-content-compact)] text-[var(--gf-text-lg)] text-[var(--gf-rail-ink-muted)] mx-auto">
            <MarkdownInline text={content.moves.cta.body} />
          </p>
          <div className="mt-10 flex justify-center">
            <BrandButton href={content.moves.cta.button.href}>{content.moves.cta.button.label}</BrandButton>
          </div>
          <p className="mt-16 text-[var(--gf-text-xs)] text-[var(--gf-rail-ink-muted)] opacity-80 w-full max-w-[var(--gf-content-footer)] mx-auto">
            <MarkdownInline text={content.moves.footerNote} />
          </p>
        </div>
      </section>
    </article>
  );
}

export default LegacyGuardrailsLayout;