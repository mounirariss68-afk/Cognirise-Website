import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { useRef } from "react";
import { BlueprintJourney } from "@/components/BlueprintJourney";
import { HeroFilm } from "@/components/HeroFilm";
import { ServiceLineTiles } from "@/components/ServiceLineTiles";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { BrandButton } from "@/components/ui/brand-button";
import { PulseImage } from "@/components/ui/pulse-image";
import { contentRecord, governedLandingDelivery, landingCta, landingMedia, landingNarrative, landingSections, landingText, landingVisualReferences, useCmsCollection } from "@/lib/cms";
import { IndustryPicker } from "@/components/IndustryPicker";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";

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
  const homepage = landingQuery.data.find((page) => page.pagePath === "/" && page.template === "landing");
  const homepageDelivery = governedLandingDelivery(
    landingQuery.delivery,
    landingQuery.configuredPagePaths,
    "/",
    Boolean(homepage),
  );
  const governedLanding = routeLanding ?? homepage;
  const heroNarrative = homepage ? landingNarrative(homepage, "hero") : null;
  const heroCta = homepage?.cta ?? homepage?.sections
    .slice()
    .sort((left, right) => left.order - right.order)
    .find((section) => section.type === "cta");
  const governedSections = homepage ? landingSections(homepage) : [];
  const governedVisuals = homepage ? landingVisualReferences(homepage) : [];
  const governanceVisual = landingMedia(governedLanding, "home-governance-visual", { src: assetUrl("/images/cognirise/cognirise-pulse-governance.jpg"), alt: "Visual representation of operational boundaries." });
  const peopleVisual = landingMedia(governedLanding, "home-people-visual", { src: assetUrl("/images/cognirise/cognirise-pulse-people.jpg"), alt: "Visual representation of people and agents in a shared architecture." });
  const platformVisual = landingMedia(governedLanding, "home-platform-visual", { src: assetUrl("/images/cognirise/site-cognios.jpg"), alt: "Visual representation of a durable system." });
  const convergenceVisual = landingMedia(governedLanding, "home-convergence-visual", { src: assetUrl("/images/cognirise/pulse-convergence.jpg"), alt: "Depiction of convergence" });
  const frameworkIdaoCta = landingCta(governedLanding, "home-framework-idao-cta", { label: "Explore IDAO", href: "/methodologies/idao" });
  const frameworkAuthorityCta = landingCta(governedLanding, "home-framework-authority-cta", { label: "Agent Authority Model", href: "/methodologies/agent-authority-model" });
  const frameworkPortfolioCta = landingCta(governedLanding, "home-framework-portfolio-cta", { label: "View methodology portfolio", href: "/methodologies" });
  const imageLedgerFirstCta = landingCta(governedLanding, "home-image-ledger-first-cta", { label: "Agent Authority Model", href: "/methodologies/agent-authority-model" });
  const imageLedgerSecondCta = landingCta(governedLanding, "home-image-ledger-second-cta", { label: "Human–Agent Operating Model", href: "/methodologies/human-agent-operating-model" });
  const imageLedgerThirdCta = landingCta(governedLanding, "home-image-ledger-third-cta", { label: "CogniOS architecture", href: "/platforms/cognios#architecture" });
  const convergenceCta = landingCta(governedLanding, "home-convergence-cta", { label: "Meet the team", href: "/about" });
  const startCta = landingCta(governedLanding, "home-start-cta", { label: "Book a consultation", href: "/contact" });
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
      <section ref={heroRef} className="public-hero-shell px-6 md:px-[4.8vw] pt-8 md:pt-[22px] overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[0.94fr_1.06fr] gap-10 lg:gap-[4vw] items-start pb-10 lg:pb-[34px]">
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
              className="font-display font-semibold text-[clamp(40px,4.8vw,76px)] leading-[0.94] tracking-[-0.08em] mb-7 [overflow-wrap:anywhere]"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {heroNarrative?.heading ?? <>Professional services built for the age of <em className="not-italic text-[hsl(var(--brand-pink))]">agents.</em></>}
            </motion.h1>
            
            <motion.p
              className="text-[16.5px] leading-[1.6] text-[#405777] max-w-[440px] mb-8"
              initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.3, ease: "easeOut" }}
            >
              {heroNarrative?.text ?? <><strong className="text-[#102957]">Cognirise is the AI-native advisory and engineering firm.</strong> Senior operators, forward-deployed engineers and governed agents move priority work from strategy into production.</>}
            </motion.p>
            
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
      <section className="mx-6 md:mx-[4.8vw] border-y border-[#102957] grid grid-cols-2 lg:grid-cols-4" aria-label="Cognirise company qualities">
        {[
          { label: landingText(governedLanding, "home-proof-model-label", "Model"), value: landingText(governedLanding, "home-proof-model", "Advisory + Engineering") },
          { label: landingText(governedLanding, "home-proof-focus-label", "Focus"), value: landingText(governedLanding, "home-proof-focus", "Complex enterprise & government") },
          { label: landingText(governedLanding, "home-proof-platform-label", "Platform"), value: landingText(governedLanding, "home-proof-platform", "CogniOS (Four native engines)") },
          { label: landingText(governedLanding, "home-proof-presence-label", "Presence"), value: landingText(governedLanding, "home-proof-presence", "Middle East & Europe") }
        ].map((item, i) => (
          <div key={item.label} className={`p-4 lg:p-[18px_20px] text-[12px] leading-[1.4] border-[#cbd3e1]
            ${i % 2 === 0 ? 'border-r' : ''} 
            ${i < 2 ? 'border-b lg:border-b-0' : ''} 
            lg:border-r lg:last:border-r-0`}>
            <b className="block text-[11px] tracking-[0.11em] uppercase mb-2 text-[#6a7891]">{item.label}</b>
            <strong className="font-semibold">{item.value}</strong>
          </div>
        ))}
      </section>

      {/* MODEL */}
      <section id="service-lines" className="px-6 md:px-[4.8vw] py-[82px] lg:py-[125px]">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-end">
          <motion.div {...mConfig}>
            <Kicker>{landingText(governedLanding, "home-service-label", "What we do")}</Kicker>
            <h2 className="font-display font-semibold text-[clamp(43px,5vw,72px)] leading-[0.97] tracking-[-0.08em] mt-5 max-w-[700px]">
               {landingText(governedLanding, "home-service-heading", "We combine strategy, engineering and platform.")}
            </h2>
          </motion.div>
          <motion.p 
            className="text-[16px] leading-[1.55] max-w-[410px] text-[#42587b] m-0 lg:mt-0 mt-2"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            {landingText(governedLanding, "home-service-body", "We don't hand over a presentation and wish you luck. We deploy senior teams who take accountability for the architecture, the code and the outcome.")}
          </motion.p>
        </div>
        
        <ServiceLineTiles
          variant="summary"
          source="homepage"
          methodologyCtas={[frameworkPortfolioCta, frameworkIdaoCta, frameworkAuthorityCta]}
          className="mt-10 lg:mt-[65px]"
        />
      </section>

      {/* BLUEPRINT */}
      <BlueprintJourney />

      {/* IMAGE LEDGER */}
      <section className="px-6 md:px-[4.8vw] pb-[82px] lg:pb-[122px]" aria-label="Cognirise outcomes in motion">
        <div className="py-6 lg:py-[25px] border-t border-[#102957] flex flex-col lg:flex-row items-start lg:items-end justify-between gap-5">
          <motion.div {...mConfig}>
            <Kicker>{landingText(governedLanding, "home-image-ledger-label", "The system in motion")}</Kicker>
            <h2 className="font-display font-semibold text-[41px] lg:text-[clamp(39px,4.7vw,69px)] leading-[0.97] tracking-[-0.08em] mt-4 lg:mt-[18px] max-w-[660px]">
               {landingText(governedLanding, "home-image-ledger-heading", "Three conditions for change that holds.")}
            </h2>
          </motion.div>
          <motion.p
            className="max-w-[290px] text-[14px] leading-[1.5] text-[#536887]"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.2 }}
          >
            {landingText(governedLanding, "home-image-ledger-body", "We build the path, the controls and the capacity to keep the work moving after the first release.")}
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_0.8fr] grid-rows-[350px_240px_240px] lg:grid-rows-[310px_310px] gap-3 mt-8 lg:mt-[42px]">
          <motion.figure 
            className="relative overflow-hidden bg-[#071936] group lg:row-span-2"
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, ease: [0.16, 1, 0.3, 1] }}
          >
            <PulseImage src={governanceVisual.src} alt={governanceVisual.alt} style={{ objectPosition: governanceVisual.objectPosition }} className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/75 to-transparent via-[#071936]/20" />
            <motion.figcaption
              className="absolute z-10 left-6 right-6 bottom-5 text-white flex flex-col items-start"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.3 }}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-75 mb-2">{landingText(governedLanding, "home-image-ledger-first-label", "First condition")}</span>
                <strong className="block max-w-full font-display font-semibold text-[clamp(25px,3.4vw,48px)] leading-none tracking-[-0.06em] group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">{landingText(governedLanding, "home-image-ledger-first-caption", "Boundaries you control.")}</strong>
                <div className="mt-3 max-w-full">
                  <BrandButton href={imageLedgerFirstCta.href} variant="editorial" className="max-w-full text-white border-white/70">{imageLedgerFirstCta.label}</BrandButton>
                </div>
            </motion.figcaption>
          </motion.figure>
          
          <motion.figure 
            className="relative overflow-hidden bg-[#071936] group"
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <PulseImage src={peopleVisual.src} alt={peopleVisual.alt} style={{ objectPosition: peopleVisual.objectPosition }} className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/75 to-transparent via-[#071936]/20" />
            <motion.figcaption
              className="absolute z-10 left-6 right-6 bottom-5 text-white flex flex-col items-start"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.4 }}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-75 mb-2">{landingText(governedLanding, "home-image-ledger-second-label", "Second condition")}</span>
                <strong className="block max-w-full font-display font-semibold text-[clamp(19px,2.2vw,30px)] leading-none tracking-[-0.06em] group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">{landingText(governedLanding, "home-image-ledger-second-caption", "Work that flows.")}</strong>
                <div className="mt-3 max-w-full">
                  <BrandButton href={imageLedgerSecondCta.href} variant="editorial" className="max-w-full text-white border-white/70">{imageLedgerSecondCta.label}</BrandButton>
                </div>
            </motion.figcaption>
          </motion.figure>
          
          <motion.figure 
            className="relative overflow-hidden bg-[#071936] group"
            initial={prefersReducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.8, delay: prefersReducedMotion ? 0 : 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <PulseImage src={platformVisual.src} alt={platformVisual.alt} style={{ objectPosition: platformVisual.objectPosition }} className="w-full h-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.2,0.7,0.2,1)] group-hover:scale-105" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#071936]/75 to-transparent via-[#071936]/20" />
            <motion.figcaption
              className="absolute z-10 left-6 right-6 bottom-5 text-white flex flex-col items-start"
              initial={prefersReducedMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.6, delay: prefersReducedMotion ? 0 : 0.5 }}
            >
              <span className="block text-[10px] uppercase tracking-[0.12em] opacity-75 mb-2">{landingText(governedLanding, "home-image-ledger-third-label", "Third condition")}</span>
                <strong className="block max-w-full font-display font-semibold text-[clamp(19px,2.2vw,30px)] leading-none tracking-[-0.06em] group-hover:text-[hsl(var(--brand-pink))] transition-colors duration-300">{landingText(governedLanding, "home-image-ledger-third-caption", "A platform that remembers.")}</strong>
                <div className="mt-3 max-w-full">
                  <BrandButton href={imageLedgerThirdCta.href} variant="editorial" className="max-w-full text-white border-white/70">{imageLedgerThirdCta.label}</BrandButton>
                </div>
            </motion.figcaption>
          </motion.figure>
        </div>
      </section>

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
            <h2 className="font-display font-semibold text-[43px] lg:text-[clamp(43px,5vw,76px)] leading-[0.97] tracking-[-0.08em] my-5 lg:my-7">
              {landingText(governedLanding, "home-convergence-heading", "We deploy teams who bridge the entire operating gap.")}
            </h2>
            <p className="text-[16px] leading-[1.6] text-[#3e567b] max-w-[410px]">
              {landingText(governedLanding, "home-convergence-body", "You don't need a strategy firm that can't code, or an engineering shop that doesn't understand governance. You need a team that takes the work all the way through.")}
            </p>
            
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
      <IndustryPicker id="home-industries" />

      {/* START */}
      <section className="bg-[#102957] text-white px-6 md:px-[4.8vw] py-[77px] lg:py-[104px] pb-[82px] lg:pb-[112px] relative overflow-hidden">
        <div className="absolute right-[-10px] bottom-[-18px] font-display font-semibold text-[19vw] leading-[0.7] tracking-[-0.11em] text-white/[0.06] pointer-events-none">
          PULSE
        </div>
        
        <div className="relative z-10 max-w-[970px]">
          <motion.div {...mConfig}>
            <Kicker className="text-white/80">{landingText(governedLanding, "home-start-label", "Start")}</Kicker>
            <h2 className="font-display font-semibold text-[58px] lg:text-[clamp(52px,7.5vw,113px)] tracking-[-0.095em] leading-[0.88] my-6">
               {landingText(governedLanding, "home-start-heading", "Ready for operational reality?")}
            </h2>
            <p className="text-[17px] leading-[1.55] max-w-[480px] text-[#d6deed] mb-8">
              {landingText(governedLanding, "home-start-body", "Speak with a partner about deploying governed intelligence into your core workflows.")}
            </p>
            
            <BrandButton href={startCta.href} variant="inverse">{startCta.label}</BrandButton>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
