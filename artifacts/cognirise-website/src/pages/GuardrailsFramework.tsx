import React, { useEffect, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { cmsEntryRenderPolicy, contentRecord, useCmsEntry, type CmsRecord, resolveCmsMedia, cmsMediaObjectPosition } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import type { FrameworkContent, SetProveHoldGuardrailsContent, GuardrailsLegacyContent } from "@workspace/api-zod";

import { Kicker } from "@/components/guardrails/Kicker";
import { MarkdownInline } from "@/components/guardrails/MarkdownInline";
import { LegacyGuardrailsLayout } from "./LegacyGuardrailsLayout";
import { MethodPageHero } from "@/components/MethodPageHero";
import { GUARDRAILS_ACTIONS, GUARDRAILS_RECORD } from "@/site/content/guardrails";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";

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
  if ((renderPolicy !== "cms" && renderPolicy !== "compiled-fallback") || !framework || framework.template !== "guardrails") return {
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

function SectionNavigator() {
  const [active, setActive] = useState("overview");
  const activeRef = useRef(active);

  useEffect(() => {
    const getHash = () => window.location.hash.substring(1);
    const setCurrent = (id: string) => {
      activeRef.current = id;
      setActive(id);
    };
    if (getHash()) {
      setCurrent(getHash());
    }

    const handleHashChange = () => {
      const hash = getHash();
      if (hash) setCurrent(hash);
    };

    window.addEventListener("hashchange", handleHashChange);

    const observer = new IntersectionObserver(
      (entries) => {
        const intersecting = entries.filter(e => e.isIntersecting);
        if (intersecting.length > 0) {
          const next = intersecting[0].target.id;
          const phaseHashIsActive = next === "overview"
            && activeRef.current.startsWith("guardrails-phase-");
          if (!phaseHashIsActive) setCurrent(next);
        }
      },
      { rootMargin: "-100px 0px -60% 0px" }
    );

    document.querySelectorAll("[data-nav-section]").forEach(el => observer.observe(el));

    return () => {
      window.removeEventListener("hashchange", handleHashChange);
      observer.disconnect();
    };
  }, []);

  const links = [
    { id: "overview", label: "Overview" },
    { id: "guardrails-phase-set", label: "Set" },
    { id: "guardrails-phase-prove", label: "Prove" },
    { id: "guardrails-phase-hold", label: "Hold" },
    { id: "layers", label: "Enforcement" },
    { id: "lifecycle", label: "Lifecycle" },
  ];

  return (
    <nav aria-label="Framework sections" className="sticky top-0 z-40 bg-[var(--gf-bg)] border-b border-[var(--gf-border)] shadow-sm">
      <div className="max-w-[var(--gf-content-wide)] mx-auto px-6 md:px-[var(--gf-page-gutter)]">
        <div className="flex gap-8 overflow-x-auto hide-scrollbar">
          {links.map(l => (
            <a
              key={l.id}
              href={`#${l.id}`}
              aria-current={active === l.id ? "location" : undefined}
              className={`whitespace-nowrap py-4 text-[12px] font-bold uppercase tracking-[0.14em] transition-colors border-b-[3px] ${active === l.id ? 'border-[var(--gf-ink)] text-[var(--gf-ink)]' : 'border-transparent text-[var(--gf-ink-muted)] hover:text-[var(--gf-ink)]'}`}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}

type GuardrailsActions = { primary: { label: string; href: string }; secondary: { label: string; href: string }; move: { label: string; href: string } };

export function GuardrailsLayout({
  framework,
  renderPolicy = "cms",
  preview = false,
  actions,
}: {
  framework: CmsRecord<GuardrailsContent> | null;
  renderPolicy?: "cms" | "compiled-fallback" | "loading" | "unavailable";
  preview?: boolean;
  /** Code-owned button targets for the public page; a CMS preview keeps its own. */
  actions?: GuardrailsActions;
}) {
  useDynamicMetadata(guardrailsMetadata(framework, renderPolicy, preview));

  if (renderPolicy === "loading") {
    return (
      <main className="guardrails-page min-h-[70vh] bg-[var(--gf-bg)] px-6 py-20 md:px-[var(--gf-page-gutter)]" aria-busy="true">
        <NavigationBackControl embedded className="mb-7" />
        <Kicker>Methodologies & frameworks</Kicker>
        <p className="mt-8 text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)]">Loading the governed methodology…</p>
      </main>
    );
  }

  if (renderPolicy === "unavailable" || !framework || framework.template !== "guardrails") {
    return (
      <main className="guardrails-page min-h-[70vh] bg-[var(--gf-bg)] px-6 py-20 md:px-[var(--gf-page-gutter)]">
        <NavigationBackControl embedded className="mb-7" />
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

  if (framework.contentVersion === "guardrails-legacy-v1") {
    return <LegacyGuardrailsLayout framework={framework as CmsRecord<GuardrailsLegacyContent>} />;
  }

  const content = framework as CmsRecord<SetProveHoldGuardrailsContent>;
  const heroMedia = resolveCmsMedia(framework.media, content.heroMedia, content.heroMediaId);
  const heroImage = heroMedia?.url;
  const primaryAction = actions?.primary ?? content.hero.primaryAction;
  const secondaryAction = actions?.secondary ?? content.hero.secondaryAction;
  const moveButton = actions?.move ?? content.moves.cta.button;

  return (
    <article data-guardrails-page className="guardrails-page [overflow-wrap:anywhere] bg-[var(--gf-bg)] font-sans text-foreground selection:bg-[var(--gf-accent)] selection:text-white pb-24">
      {/* 1. Header (Hero) */}
      <MethodPageHero
        breadcrumb={content.hero.eyebrow}
        title={content.hero.headline}
        description={content.hero.subheadline}
        supportingText={content.hero.strapline}
        imageSrc={heroImage || ""}
        imageResolved={true}
        imageAlt={heroMedia?.altText || "Cognirise Guardrails Framework"}
        imagePosition={cmsMediaObjectPosition(heroMedia) || "center"}
        actions={
          <div className="flex flex-wrap items-center gap-6">
            <BrandButton href={primaryAction.href} variant="primary">{primaryAction.label}</BrandButton>
            <BrandButton href={secondaryAction.href} variant="editorial">{secondaryAction.label}</BrandButton>
          </div>
        }
      />

      <SectionNavigator />

      {/* 2. Overview (Set, Prove, Hold Map) */}
      <section id="overview" data-nav-section data-guardrails-section="overview" className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-surface)] border-b border-[var(--gf-border)] scroll-mt-14 relative">
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
      <section id="layers" data-nav-section data-guardrails-section="layers" className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-bg)] border-b border-[var(--gf-border)] scroll-mt-14">
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
            
            <div className="border-l-2 border-[var(--gf-accent-coral)] pl-6 py-2 self-start">
              <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-3">
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
      <section id="lifecycle" data-nav-section data-guardrails-section="lifecycle" className="px-6 py-20 md:px-[var(--gf-page-gutter)] lg:py-28 bg-[var(--gf-surface)] border-b border-[var(--gf-border)] scroll-mt-14">
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
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-ink-muted)] mb-3 block">Context</span>
              <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[40ch]">
                <MarkdownInline text={content.lifecycleMatrix.callout} />
              </p>
            </div>
            <div className="border-t-2 border-[var(--gf-accent-coral)] pt-6">
              <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-accent-coral)] mb-3 block">Measurement standard</span>
              <p className="text-[length:var(--gf-text-lg)] text-[var(--gf-ink)] font-semibold leading-relaxed max-w-[36ch]">
                <MarkdownInline text={content.lifecycleMatrix.measure} />
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Next Steps */}
      <section id="next-steps" data-guardrails-section="next-steps" className="px-6 py-16 md:px-[var(--gf-page-gutter)] lg:py-24 bg-[var(--gf-bg)] relative overflow-hidden">

        <div className="max-w-[var(--gf-content-wide)] mx-auto relative z-10">

          <div className="max-w-[var(--gf-content-standard)] mb-16">
            <h2 className="font-display text-[length:var(--gf-h3)] font-semibold tracking-[-0.04em] text-[var(--gf-ink)] mb-6">
              <MarkdownInline text={content.moves.heading} />
            </h2>
            <p className="text-[length:var(--gf-text-lg)] text-[var(--gf-ink-muted)] mb-10 leading-relaxed max-w-[var(--gf-content-narrow)]">
              <MarkdownInline text={content.moves.intro} />
            </p>

            <ul className="space-y-10 relative">
              <div className="absolute left-[11px] top-6 bottom-8 w-px bg-gradient-to-b from-[var(--gf-accent-violet)] to-transparent" aria-hidden="true" />
              {content.moves.items.map((move) => (
                <li key={move.id} className="flex gap-6 items-start relative z-10">
                   <div className="shrink-0 pt-1">
                     <div className="w-6 h-6 rounded-full bg-[var(--gf-accent-violet)] text-white flex items-center justify-center text-[10px] font-bold shadow-md shadow-[var(--gf-accent-violet)]/20 ring-4 ring-[var(--gf-bg)]">
                       {move.number}
                     </div>
                   </div>
                   <div>
                     <strong className="block mb-2 text-[length:var(--gf-text-lg)] text-[var(--gf-ink)] font-display tracking-tight">
                       <MarkdownInline text={move.title} />
                     </strong>
                     <span className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] leading-relaxed max-w-[50ch] block">
                       <MarkdownInline text={move.body} />
                     </span>
                   </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
            <div className="bg-[var(--gf-surface)] p-8 md:p-10 border border-[var(--gf-border)] text-left shadow-lg shadow-[var(--gf-ink)]/5 relative overflow-hidden flex flex-col items-start rounded-xl">
              <h3 className="font-display text-[length:var(--gf-h4)] font-bold mb-4 text-[var(--gf-ink)] relative z-10">
                <MarkdownInline text={content.moves.cta.heading} />
              </h3>
              <p className="text-[length:var(--gf-text-base)] text-[var(--gf-ink-muted)] mb-8 max-w-[36ch] leading-relaxed relative z-10 flex-1">
                <MarkdownInline text={content.moves.cta.body} />
              </p>
              <BrandButton href={moveButton.href} variant="primary" className="relative z-10 mt-auto">{moveButton.label}</BrandButton>
            </div>

            <a href={content.relatedLink.href} className="group flex flex-col items-start bg-[var(--gf-surface)] border border-[var(--gf-border)] p-8 md:p-10 transition-all duration-300 hover:border-[var(--gf-accent)] hover:shadow-xl hover:shadow-[var(--gf-accent)]/10 relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gf-accent)] rounded-xl">
              <div className="absolute top-0 right-0 p-8 text-[var(--gf-border)] group-hover:text-[var(--gf-accent)]/10 transition-colors duration-500 transform group-hover:scale-110 origin-top-right">
                <ArrowUpRight size={64} strokeWidth={1} />
              </div>
              <div className="relative z-10 flex-1">
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--gf-accent)] mb-4">
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
          </div>

        </div>
      </section>

    </article>
  );
}

export default function GuardrailsFrameworkPage() {
  // The public page is code-owned: it renders the compiled edition and never waits for the CMS.
  const query = useCmsEntry("framework", "guardrails-framework", { preferCompiled: true });
  const renderPolicy = cmsEntryRenderPolicy(query.isAuthoritative, query.delivery);

  const cmsRecord = query.data ? contentRecord(query.data, "framework") : null;
  const framework = cmsRecord?.template === "guardrails"
    ? (cmsRecord as CmsRecord<GuardrailsContent>)
    : renderPolicy === "compiled-fallback" ? (GUARDRAILS_RECORD as CmsRecord<GuardrailsContent>) : null;

  return <GuardrailsLayout framework={framework} renderPolicy={renderPolicy} actions={cmsRecord ? undefined : GUARDRAILS_ACTIONS} />;
}
