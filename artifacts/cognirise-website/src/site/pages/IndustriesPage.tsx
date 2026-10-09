import { useEffect, useRef, useState } from "react";
import { assetUrl } from "@/lib/assets";
import { FIGURES_LEGEND, INDUSTRIES_CARDS_HEADING, INDUSTRIES_CLOSING, INDUSTRIES_HERO, INDUSTRY_CARDS } from "@/site/content/industries-hub";
import { PageHero } from "@/site/components/PageHero";
import { IndustryCards } from "@/site/components/Cards";
import { ClosingBand } from "@/site/components/ClosingBand";
import { Section, SectionHeading } from "@/site/components/Primitives";
import { PulseImage } from "@/components/ui/pulse-image";

/** The hub keeps its existing hero film; the poster shows when the video cannot play. */
function HubFilm() {
  const [failed, setFailed] = useState(false);
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const video = ref.current;
      if (video && video.paused) void video.play().catch(() => setFailed(true));
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);
  if (failed) return <PulseImage src={assetUrl(INDUSTRIES_HERO.image!.src)} alt={INDUSTRIES_HERO.image!.alt} className="h-full w-full object-cover" eager />;
  return (
    <video ref={ref} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onError={() => setFailed(true)} poster={assetUrl(INDUSTRIES_HERO.image!.src)} className="absolute inset-0 h-full w-full object-cover">
      <source src={assetUrl("/videos/cognirise/industries-hero-flight.mp4")} type="video/mp4" />
      <source src={assetUrl("/videos/cognirise/industries-hero-flight.webm")} type="video/webm" />
    </video>
  );
}

export default function IndustriesPage() {
  return (
    <div className="bg-[#fdfcfb] text-[#102957]">
      <PageHero title={INDUSTRIES_HERO.title} lead={INDUSTRIES_HERO.lead} primary={INDUSTRIES_HERO.primary} secondary={INDUSTRIES_HERO.secondary} media={<HubFilm />} />

      <Section labelledBy="choose-heading">
        <SectionHeading id="choose-heading">{INDUSTRIES_CARDS_HEADING}</SectionHeading>
        <IndustryCards cards={INDUSTRY_CARDS} />
      </Section>

      <Section tone="soft" labelledBy="legend-heading">
        <div className="grid gap-8 lg:grid-cols-[0.35fr_0.65fr] lg:gap-[6vw]">
          <SectionHeading id="legend-heading" size="sm">{FIGURES_LEGEND.heading}</SectionHeading>
          <dl className="divide-y divide-[#cbd3e1] border-y border-[#102957]">
            {FIGURES_LEGEND.items.map((item) => (
              <div key={item.tag} className="grid gap-2 py-4 sm:grid-cols-[200px_1fr] sm:gap-6">
                <dt className="font-semibold text-[hsl(var(--brand-pink))]">{item.tag}</dt>
                <dd className="text-[15px] leading-[1.55] text-[#30486d]">{item.body}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      <ClosingBand heading={INDUSTRIES_CLOSING.heading} body={INDUSTRIES_CLOSING.body} cta={INDUSTRIES_CLOSING.cta} />
    </div>
  );
}
