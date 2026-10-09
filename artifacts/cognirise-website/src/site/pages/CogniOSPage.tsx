import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";
import { PulseImage } from "@/components/ui/pulse-image";
import {
  COGNIOS_AUDIENCE,
  COGNIOS_CAPABILITIES,
  COGNIOS_CLOSING,
  COGNIOS_DEPLOYMENT,
  COGNIOS_FAQ,
  COGNIOS_HERO,
  COGNIOS_LAYERS,
  COGNIOS_LIFECYCLE,
  COGNIOS_PROBLEM,
} from "@/site/content/cognios";
import { PageHero } from "@/site/components/PageHero";
import { ClosingBand } from "@/site/components/ClosingBand";
import { PlatformLayers } from "@/site/components/PlatformLayers";
import { TextTable } from "@/site/components/Tables";
import { CardGrid, Section, SectionHeading } from "@/site/components/Primitives";

const ArchitectureStage = lazy(() => import("@/components/cognios/ArchitectureStage").then((m) => ({ default: m.ArchitectureStage })));

/** The existing CogniOS hero film with its poster and fallback image. */
function CogniOSFilm() {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  const { media } = COGNIOS_HERO;
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const video = ref.current;
      if (video && video.paused) void video.play().catch(() => setFailed(true));
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);
  if (failed) return <PulseImage src={assetUrl(media.fallback)} alt={media.alt} className="h-full w-full object-cover" eager />;
  return (
    <video ref={ref} autoPlay muted loop playsInline preload="metadata" aria-label={media.alt} tabIndex={-1} onError={() => setFailed(true)} poster={assetUrl(media.poster)} className="absolute inset-0 h-full w-full object-cover">
      <source src={assetUrl(media.mp4)} type="video/mp4" />
      <source src={assetUrl(media.webm)} type="video/webm" />
    </video>
  );
}

export default function CogniOSPage() {
  const [showArchitecture, setShowArchitecture] = useState(false);

  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero kicker={COGNIOS_HERO.kicker} title={COGNIOS_HERO.title} lead={COGNIOS_HERO.lead} primary={COGNIOS_HERO.primary} secondary={COGNIOS_HERO.secondary} media={<CogniOSFilm />} />

      <Section tone="deep" rule={false} labelledBy="problem-heading">
        <div className="grid gap-8 lg:grid-cols-[0.55fr_0.45fr] lg:gap-[6vw]">
          <SectionHeading id="problem-heading" className="!text-white">{COGNIOS_PROBLEM.heading}</SectionHeading>
          <div className="space-y-4 text-[17px] leading-[1.6] text-[#d7dfed]">
            {COGNIOS_PROBLEM.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </div>
      </Section>

      <Section labelledBy="capabilities-heading">
        <SectionHeading id="capabilities-heading">{COGNIOS_CAPABILITIES.heading}</SectionHeading>
        <CardGrid items={COGNIOS_CAPABILITIES.items} columns={3} numbered />
      </Section>

      <Section tone="soft" labelledBy="lifecycle-heading">
        <SectionHeading id="lifecycle-heading">{COGNIOS_LIFECYCLE.heading}</SectionHeading>
        <ol className="mt-10 grid grid-cols-1 border-t border-[#102957] sm:grid-cols-2 xl:grid-cols-6">
          {COGNIOS_LIFECYCLE.steps.map((step, index) => (
            <li key={step.name} className="flex flex-col gap-2 border-b border-[#cbd3e1] py-5 pr-5 xl:border-b-0 xl:border-r xl:pl-5 xl:first:pl-0 xl:last:border-r-0">
              <span className="text-[10px] font-semibold tracking-[0.12em] text-[hsl(var(--brand-pink))]">0{index + 1}</span>
              <h3 className="font-display text-[20px] font-semibold tracking-[-0.03em] text-[#102957]">{step.name}</h3>
              <p className="text-[14px] leading-[1.5] text-[#405777]">{step.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section labelledBy="layers-heading" id="architecture" className="scroll-mt-24">
        <SectionHeading id="layers-heading">{COGNIOS_LAYERS.heading}</SectionHeading>
        <PlatformLayers layers={COGNIOS_LAYERS.layers} />
        <p className="mt-8 max-w-[720px] text-[15.5px] leading-[1.6] text-[#405777]">{COGNIOS_LAYERS.engines}</p>
        <button
          type="button"
          onClick={() => setShowArchitecture((value) => !value)}
          aria-expanded={showArchitecture}
          aria-controls="full-architecture"
          className="group mt-6 inline-flex items-center gap-2 text-[14px] font-semibold text-[#102957] underline decoration-[hsl(var(--brand-pink))]/40 underline-offset-4 hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2"
        >
          {showArchitecture ? "Hide the full reference architecture" : COGNIOS_LAYERS.link.label}
        </button>
        {showArchitecture && (
          <div id="full-architecture" className="mt-8">
            <Suspense fallback={<p className="text-[14px] text-[#6f7d94]">Loading the architecture…</p>}>
              <ArchitectureStage />
            </Suspense>
          </div>
        )}
      </Section>

      <Section tone="soft" labelledBy="audience-heading">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-[6vw]">
          <div>
            <SectionHeading id="audience-heading" size="sm">{COGNIOS_AUDIENCE.heading}</SectionHeading>
            <ul className="mt-6 divide-y divide-[#cbd3e1] border-y border-[#102957]">
              {COGNIOS_AUDIENCE.items.map((item) => (
                <li key={item.title} className="py-4 text-[15px] leading-[1.55] text-[#30486d]"><strong className="text-[#102957]">{item.title}</strong> {item.body}</li>
              ))}
            </ul>
          </div>
          <div>
            <SectionHeading id="deployment-heading" size="sm">{COGNIOS_DEPLOYMENT.heading}</SectionHeading>
            <ul className="mt-6 divide-y divide-[#cbd3e1] border-y border-[#102957]">
              {COGNIOS_DEPLOYMENT.items.map((item) => (
                <li key={item.title} className="py-4 text-[15px] leading-[1.55] text-[#30486d]"><strong className="text-[#102957]">{item.title}.</strong> {item.body}</li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section labelledBy="faq-heading">
        <SectionHeading id="faq-heading" size="sm">{COGNIOS_FAQ.heading}</SectionHeading>
        <dl className="mt-8 grid gap-px border border-[#cbd3e1] bg-[#cbd3e1] md:grid-cols-2">
          {COGNIOS_FAQ.items.map((item) => (
            <div key={item.q} className="bg-[#fdfcfb] p-6">
              <dt className="font-display text-[18px] font-semibold leading-[1.25] tracking-[-0.03em] text-[#102957]">{item.q}</dt>
              <dd className="mt-3 text-[14.5px] leading-[1.55] text-[#405777]">{item.a}</dd>
            </div>
          ))}
        </dl>
      </Section>

      <ClosingBand heading={COGNIOS_CLOSING.heading} body={COGNIOS_CLOSING.body} cta={COGNIOS_CLOSING.cta} secondary={COGNIOS_CLOSING.secondary} watermark="COGNIOS" />
    </div>
  );
}
