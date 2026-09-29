import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { useRef } from "react";
import { HeroFilm } from "@/components/HeroFilm";
import { ServiceLineTiles } from "@/components/ServiceLineTiles";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { contentRecord, governedLandingDelivery, landingCta, landingList, landingMedia, landingNarrative, landingSections, landingText, landingVisualReferences, useCmsCollection } from "@/lib/cms";
import { IndustryPicker } from "@/components/IndustryPicker";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { BlueprintJourney, resolveBlueprintStageMedia } from "@/components/BlueprintJourney";

const Kicker = ({ children, className = "text-[#102957]" }: { children: React.ReactNode, className?: string }) => (
  <div className={`flex items-center gap-3 text-[10px] tracking-[0.12em] uppercase font-semibold ${className}`}>
    <div className="w-[23px] h-[2px] bg-gradient-to-r from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
    {children}
  </div>
);

const SectionHeading = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
  <h2 className={`font-display font-semibold text-[clamp(42px,5vw,78px)] tracking-[-0.075em] leading-[0.98] mt-6 ${className}`}>
    {children}
  </h2>
);

export default function Home() {
  const routeLanding = useGovernedLanding();
  const { market } = useMarketStore();
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const landingQuery = useCmsCollection("landing-page", [], (item) => contentRecord(item, "landing-page"));
  const homepage = routeLanding ?? landingQuery.data.find((page) => page.pagePath === "/" && page.template === "landing");
  const homepageDelivery = routeLanding ? "cms" : governedLandingDelivery(
    landingQuery.delivery,
    landingQuery.configuredPagePaths,
    "/",
    Boolean(homepage),
  );
  const blueprintStageMedia = homepageDelivery === "cms" && homepage
    ? resolveBlueprintStageMedia(homepage)
    : null;
  const governedLanding = homepage;
  const homepageIndustrySection = homepage?.sections.find((section) => section.id === "home-industries");
  const homepageIndustryNarrative = homepageIndustrySection?.type === "narrative" ? homepageIndustrySection : undefined;
  const homepageIndustrySubtitle = homepageIndustryNarrative?.body
    .flatMap((block) => block.type === "list" ? block.items : [block.text])
    .join(" ")
    .trim();
  const heroNarrative = homepage ? landingNarrative(homepage, "hero") : null;
  const heroCta = homepage?.cta ?? homepage?.sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .find((section) => section.type === "cta");
  const governedSections = homepage ? landingSections(homepage) : [];
  const governedVisuals = homepage ? landingVisualReferences(homepage) : [];
  const convergenceVisual = landingMedia(governedLanding, "home-convergence-visual", { src: assetUrl("/images/cognirise/pulse-convergence.jpg"), alt: "Depiction of convergence" });
  const convergenceCta = landingCta(governedLanding, "home-convergence-cta", { label: "Book a 48-hour prototype", href: "mailto:support@cognirise.ai" });
  const startCta = landingCta(governedLanding, "home-start-cta", { label: "Talk to us", href: "mailto:support@cognirise.ai" });
  // An existing approved revision predates this new editorial slot. Do not
  // manufacture office claims for that immutable revision while its draft is reviewed.
  const hasApprovedOffices = !governedLanding || governedLanding.sections.some((section) => section.id === "home-office-cities");
  const officeCities = hasApprovedOffices
    ? landingList(governedLanding, "home-office-cities", ["Dubai", "Riyadh", "Istanbul", "Amsterdam", "London", "Vienna"])
    : [];
  const visualUrl = (mediaId: string, mediaVersionId: string) =>
    homepage?.media?.find((media) => media.id === mediaId &&
      (!mediaVersionId || media.versionId === mediaVersionId))?.url;
  const marketLocation = getMarketLocationLabel(market);
  const heroKicker = cleanHeroIdentifier(
    `${marketLocation} / AI-native advisory & engineering`,
    { marketLocation },
  );

  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const yHeroImage = useTransform(heroScrollProgress, [0, 1], [0, prefersReducedMotion ? 0 : 24]);

  if (homepageDelivery === "loading") {
    return <main className="min-h-[70vh] bg-[#fdfcfb] px-6 py-24 text-[#102957]" aria-busy="true">Loading published homepage…</main>;
  }
  if (homepageDelivery !== "cms" && homepageDelivery !== "compiled-fallback") {
    return <main className="min-h-[70vh] bg-[#fdfcfb] px-6 py-24 text-[#102957]"><h1 className="font-display text-5xl">Homepage unavailable</h1><p className="mt-4">The published homepage could not be delivered.</p></main>;
  }
  if (homepageDelivery === "cms" && !homepage) {
    return <main className="min-h-[70vh] bg-[#fdfcfb] px-6 py-24 text-[#102957]"><h1 className="font-display text-5xl">Homepage unavailable</h1><p className="mt-4">No published homepage edition is available for this market and locale.</p></main>;
  }
  if (homepageDelivery === "cms" && !blueprintStageMedia) {
    return <main className="min-h-[70vh] bg-[#fdfcfb] px-6 py-24 text-[#102957]"><h1 className="font-display text-5xl">Homepage unavailable</h1><p className="mt-4">The published homepage blueprint media could not be safely delivered.</p></main>;
  }

  const mConfig = {
    initial: prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-100px" },
    transition: {
      duration: prefersReducedMotion ? 0 : 0.8,
      ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
    }
  };

  return (
    <div className="bg-[#fdfcfb] text-[#102957] font-sans overflow-x-hidden selection:bg-[hsl(var(--brand-pink))] selection:text-white">
      
      {/* HERO */}
      <section ref={heroRef} className="public-hero-shell home-layout-frame pt-8 md:pt-[22px] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-10 lg:gap-8 items-start pb-10 lg:pb-[34px]">
          <motion.div className="home-hero-copy flex max-w-[600px] flex-col lg:min-h-[640px] lg:max-w-none">
            <div className="flex flex-col gap-7">
              <NavigationBackControl embedded />
              <motion.div
                data-hero-content-edge
                initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.6, ease: [0.16, 1, 0.3, 1] }}
              >
                <Kicker>{heroKicker}</Kicker>
              </motion.div>
            </div>
            <div className="mt-10 lg:mt-auto">
            <motion.h1
              data-cms-slot="hero"
              className="max-w-[660px] xl:max-w-[820px] font-display font-semibold text-[clamp(40px,4.8vw,76px)] leading-[0.94] tracking-[-0.08em] mb-7 [overflow-wrap:anywhere]"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {heroNarrative?.heading ?? <>Professional services built for the age of <em className="not-italic text-[hsl(var(--brand-pink))]">agents.</em></>}
            </motion.h1>
            
            <motion.p
              data-cms-slot="hero"
              className="text-[16.5px] leading-[1.6] text-[#405777] max-w-[540px] xl:max-w-[680px] mb-8"
              initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
            >
              {heroNarrative?.text ?? <><strong className="text-[#102957]">Cognirise is the AI-native advisory and engineering firm.</strong> Senior experts, forward-deployed engineers and governed agents move priority work from strategy into production.</>}
            </motion.p>
            {officeCities.length > 0 && (
              <div className="mb-7 text-[12px] leading-relaxed text-[#405777]">
                <span className="mb-2 block font-semibold uppercase tracking-[0.12em] text-[#102957]">Office locations</span>
                <ul className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Office locations">
                  {officeCities.map((city) => <li key={city}>{city}</li>)}
                </ul>
              </div>
            )}
            
            <motion.div
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {heroCta
                ? <BrandButton href={heroCta.href}>{heroCta.label}</BrandButton>
                : <BrandButton href="/#service-lines">Explore our practice</BrandButton>}
            </motion.div>
            </div>
          </motion.div>
          
          <motion.div 
            className="h-[440px] lg:h-[640px] relative overflow-hidden bg-[#101d3b]"
            style={{ 
              y: yHeroImage,
              clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" 
            }}
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, clipPath: "polygon(10% 0, 100% 0, 100% 0, 0 0, 0 12%)" }}
            animate={{ opacity: 1, clipPath: "polygon(10% 0, 100% 0, 100% 91%, 0 100%, 0 12%)" }}
            transition={{ duration: prefersReducedMotion ? 0 : 1.2, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <HeroFilm />
          </motion.div>
        </div>
      </section>

      {homepage && governedSections.filter((section) => section.id !== "hero" && section.id !== "primary-action" && !section.id.startsWith("home-")).map((section) => {
        if (section.type === "narrative") {
          const copy = section.body.flatMap((block) =>
            block.type === "paragraph" || block.type === "quote" || block.type === "heading"
              ? [block.text] : block.items
          );
          return (
            <section key={section.id} id={section.id} className="px-6 md:px-[4.8vw] py-16 border-t border-[#cbd3e1]" aria-label={section.heading ?? section.id}>
              {section.heading && <SectionHeading>{section.heading}</SectionHeading>}
              <div className="mt-5 max-w-3xl space-y-3 text-[17px] leading-[1.6] text-[#405777]">
                {copy.map((paragraph, index) => <p key={`${section.id}-${index}`}>{paragraph}</p>)}
              </div>
            </section>
          );
        }
        if (section.type === "media") {
          return (
            <section key={section.id} className="px-6 md:px-[4.8vw] py-10 grid gap-4 sm:grid-cols-2" aria-label={section.id}>
              {section.references.map((reference) => {
                const url = visualUrl(reference.mediaId, reference.mediaVersionId);
                return url ? <figure key={`${reference.mediaId}-${reference.mediaVersionId}`}><PulseImage src={url} alt={reference.altText ?? ""} className="w-full aspect-[16/9] object-cover" /></figure> : null;
              })}
            </section>
          );
        }
        if (section.type === "legal") {
          return <section key={section.id} className="px-6 md:px-[4.8vw] py-8 text-xs leading-relaxed text-[#647491]" aria-label="Legal information"><p>{section.text}</p></section>;
        }
        if (section.type === "cta") {
          return <section key={section.id} className="px-6 md:px-[4.8vw] py-8" aria-label={section.label}><BrandButton href={section.href}>{section.label}</BrandButton></section>;
        }
        return null;
      })}
      {homepage && governedVisuals.length > 0 && governedVisuals.every((reference) => visualUrl(reference.mediaId, reference.mediaVersionId)) && (
        <meta name="cms-landing-visuals" content={String(governedVisuals.length)} />
      )}
      {homepage && homepage.visualReferences.length > 0 && (
        <section className="px-6 md:px-[4.8vw] py-10 grid gap-4 sm:grid-cols-2" aria-label="Approved landing visuals">
          {homepage.visualReferences.map((reference) => {
            const url = visualUrl(reference.mediaId, reference.mediaVersionId);
            return url ? <PulseImage key={`${reference.mediaId}-${reference.mediaVersionId}`} src={url} alt={reference.altText ?? ""} className="w-full aspect-[16/9] object-cover" /> : null;
          })}
        </section>
      )}

      {/* PROOF LEDGER */}
      <section className="home-layout-frame" aria-label="Cognirise company qualities">
        <div className="border-y border-[#102957] grid grid-cols-2 lg:grid-cols-4">
         {[
           landingText(governedLanding, "home-proof-model", "No long pilots. Prototype in 48 hours."),
           landingText(governedLanding, "home-proof-focus", "We don’t bill mandays. We deliver outcomes."),
           landingText(governedLanding, "home-proof-platform", "We don’t build Power Points. We build working solutions"),
           landingText(governedLanding, "home-proof-presence", "No vendor lock-in. You own the platform.")
         ].map((statement, i) => (
           <div key={i} className={`p-4 lg:p-[18px_20px] text-[14px] leading-[1.4] border-[#cbd3e1]
            ${i % 2 === 0 ? 'border-r' : ''} 
            ${i < 2 ? 'border-b lg:border-b-0' : ''} 
            lg:border-r lg:last:border-r-0`}>
             <strong className="font-semibold">{statement}</strong>
          </div>
        ))}
        </div>
      </section>

      {/* MODEL */}
      <section id="service-lines" className="px-6 md:px-[4.8vw] py-[82px] lg:py-[125px]">
        <div>
          <motion.div {...mConfig}>
            <Kicker>{landingText(governedLanding, "home-service-label", "What we do")}</Kicker>
            <h2 data-cms-slot="home-service-heading" className="font-display font-semibold text-[clamp(43px,5vw,72px)] leading-[0.97] tracking-[-0.08em] mt-5 max-w-[700px]">
               {landingText(governedLanding, "home-service-heading", "We combine strategy, engineering and platform.")}
            </h2>
          </motion.div>
        </div>
        
        <ServiceLineTiles
          variant="summary"
          source="homepage"
          className="mt-10 lg:mt-[65px]"
        />
      </section>

      {/* BLUEPRINT */}
      <BlueprintJourney stageMedia={blueprintStageMedia ?? undefined} />

      {/* CONVERGE */}
      <section className="bg-[#eef0f5] px-6 md:px-[4.8vw] pb-[80px] lg:pb-[126px]">
        <div className="flex flex-col lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:min-h-[590px]">
          <motion.div 
            className="pt-[76px] lg:pt-[90px] pr-0 lg:pr-[9%] pb-[42px] lg:pb-[60px]"
            initial={prefersReducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <Kicker>{landingText(governedLanding, "home-convergence-label", "Our capability")}</Kicker>
            <h2 data-cms-slot="home-convergence-heading" className="font-display font-semibold text-[43px] lg:text-[clamp(43px,5vw,76px)] leading-[0.97] tracking-[-0.08em] my-5 lg:my-7">
              {landingText(governedLanding, "home-convergence-heading", "We deploy teams who bridge the entire operating gap.")}
            </h2>
            
            <div className="mt-10 border-t border-[#102957]">
              {[
                { num: "01", text: landingText(governedLanding, "home-convergence-service-advisory", "Strategy & operating model advisory") },
                { num: "02", text: landingText(governedLanding, "home-convergence-service-engineering", "Forward-deployed enterprise engineering") },
                { num: "03", text: landingText(governedLanding, "home-convergence-service-platform", "Proprietary CogniOS operating system") }
              ].map(item => (
                <div key={item.num} className="py-3 border-b border-[#cbd3e1] text-[13px] font-semibold">
                  <span className="inline-block text-[hsl(var(--brand-pink))] text-[10px] tracking-[0.1em] w-[54px]">{item.num}</span>
                  {item.text}
                </div>
              ))}
            </div>
            <div className="mt-8">
              <BrandButton href={convergenceCta.href}>{convergenceCta.label}</BrandButton>
            </div>
          </motion.div>
          
          <div className="h-[390px] lg:h-auto lg:mt-[-46px] relative overflow-hidden" style={{ clipPath: "polygon(0 8%, 100% 0, 100% 100%, 9% 92%)" }}>
             <PulseImage src={convergenceVisual.src} alt={convergenceVisual.alt} style={{ objectPosition: convergenceVisual.objectPosition }} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-[#071936]/10" />
            <div className="absolute right-6 bottom-6 text-white text-[10px] tracking-[0.11em] uppercase drop-shadow-md">
              {landingText(governedLanding, "home-convergence-image-caption", "people + agents")}
            </div>
          </div>
        </div>
      </section>

      {/* INDUSTRIES */}
      <IndustryPicker
        id="home-industries"
        homepage
        heading={homepageIndustryNarrative?.heading || "Built on expertise."}
        introduction={homepageIndustrySubtitle || undefined}
        industryIds={homepageIndustryNarrative?.industryIds}
        protectedPreview={Boolean(routeLanding)}
      />

      {/* START */}
      <section className="bg-[#102957] text-white px-6 md:px-[4.8vw] py-[77px] lg:py-[104px] pb-[82px] lg:pb-[112px] relative overflow-hidden">
        <div className="absolute right-[-10px] bottom-[-18px] font-display font-semibold text-[19vw] leading-[0.7] tracking-[-0.11em] text-white/[0.06] pointer-events-none">
          PULSE
        </div>
        
        <div className="relative z-10 max-w-[970px]">
          <motion.div {...mConfig}>
            <Kicker className="text-white/80">{landingText(governedLanding, "home-start-label", "Start")}</Kicker>
            <h2 className="font-display font-semibold text-[58px] lg:text-[clamp(52px,7.5vw,113px)] tracking-[-0.095em] leading-[0.88] my-6">
               {landingText(governedLanding, "home-start-heading", "Ready for a change?")}
            </h2>
            
            <BrandButton href={startCta.href} variant="inverse">{startCta.label}</BrandButton>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
