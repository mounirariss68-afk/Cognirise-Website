import { Link } from "wouter";
import { ArrowDown, ArrowRight, Plus } from "lucide-react";
import { BrandButton } from "@/components/ui/brand-button";
import { getMarketLocationLabel, useMarketStore } from "@/store/market";
import { scrollToSection } from "@/lib/motion";
import { contentRecord, useCmsCollection } from "@/lib/cms";
import { metadataFromSeo, useDynamicMetadata } from "@/lib/metadata";
import { composePlatformCatalog } from "@/lib/platformCatalog";
import { SpatialDisclosure, SpatialDisclosureItem, SpatialDisclosureTrigger, SpatialDisclosurePanel } from "@/components/ui/spatial-disclosure";
import { PlatformsHeroMedia } from "@/components/platforms/platforms-hero-media";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { landingCta, landingMedia, landingNarrative, landingSeo, landingText } from "@/lib/cms";
import { cleanHeroIdentifier } from "@/lib/hero-identifiers";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";

export default function PlatformsOverview() {
  const governedLanding = useGovernedLanding();
  const governedHero = governedLanding ? landingNarrative(governedLanding, "hero") : null;
  const heroVisual = landingMedia(governedLanding, "platforms-hero-visual", { src: "/media/platforms/cognios-rotation-fallback.jpg", alt: "A layered CogniOS ecosystem connected by a luminous central spine." });
  const closingCta = landingCta(governedLanding, "platforms-closing-cta", { label: "Book a value scan", href: "/value-scan" });
  const { market } = useMarketStore();
  const platformsQuery = useCmsCollection("platform", [], (item) => {
    const content = contentRecord(item, "platform");
    return { slug: item.slug, description: content.summary };
  });
  const governedSeo = governedLanding ? landingSeo(governedLanding) : undefined;
  useDynamicMetadata(governedSeo ? metadataFromSeo({
    title: governedSeo.title ?? "CogniOS Platform Ecosystem | Cognirise",
    description: governedSeo.description ?? "Discover the platform architecture connecting enterprise knowledge, agents and accountability.",
    canonicalUrl: governedSeo.canonicalUrl,
    noIndex: governedSeo.noIndex,
  }, {
    title: "CogniOS Platform Ecosystem | Cognirise",
    description: "Discover the platform architecture connecting enterprise knowledge, agents and accountability.",
  }) : undefined);
  
  const marketLocation = getMarketLocationLabel(market);
  const heroEyebrow = cleanHeroIdentifier(
    landingText(governedLanding, "platforms-hero-eyebrow", `Platforms / ${marketLocation}`),
    { marketLocation },
  );

  const platforms = composePlatformCatalog(platformsQuery.data);

  return (
    <div className="flex flex-col" data-governed-landing={governedLanding?.pagePath}>
      <section className="public-hero-shell px-6 md:px-12 pt-8 md:pt-12 max-w-[1440px] mx-auto w-full">
        <div className="grid grid-cols-1 items-start gap-12 pb-12 lg:grid-cols-[0.86fr_1.14fr] lg:gap-16">
          <div className="pb-4 relative z-10">
            <div className="mb-8 flex flex-col gap-7">
              <NavigationBackControl embedded />
              <div data-hero-content-edge className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                {heroEyebrow}
              </div>
            </div>
            <h1 className="text-5xl md:text-6xl lg:text-[93px] leading-[0.94] font-semibold mb-8 max-w-[660px]">
              {landingText(governedLanding, "platforms-hero-heading", governedHero?.heading ?? "Ecosystem for execution.")}
            </h1>
            <p className="text-base md:text-lg text-muted-foreground max-w-[460px] mb-10 leading-relaxed">
              {landingText(governedLanding, "platforms-hero-body", governedHero?.text ?? "Cognirise combines AI-native advisory, forward-deployed engineering and governed agents to move consequential work into production. CogniOS connects enterprise knowledge, specialist agents and human accountability under one governed operating system.")}
            </p>
            <div className="flex flex-wrap items-center gap-6">
              <BrandButton href="/value-scan">{landingText(governedLanding, "platforms-hero-cta", "Bring us one process")}</BrandButton>
              <button 
                onClick={() => scrollToSection("matrix")}
                className="group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]"
              >
                {landingText(governedLanding, "platforms-hero-explore-label", "Explore capability matrix")} <ArrowDown className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="platforms-hero-cut relative h-[400px] lg:h-[640px] bg-[hsl(var(--brand-deep))]">
            <PlatformsHeroMedia fallbackSrc={heroVisual.src} fallbackAlt={heroVisual.alt} objectPosition={heroVisual.objectPosition} />
            <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--brand-deep))] via-transparent to-transparent opacity-70" />
            
            <div className="absolute right-0 top-12 z-10 text-[100px] lg:text-[145px] font-display font-semibold leading-none text-white opacity-20 mix-blend-overlay tracking-tight pointer-events-none">
              {landingText(governedLanding, "platforms-ecosystem-wordmark", "system")}
            </div>
            
            <div className="absolute bottom-[12%] left-[13%] z-20 text-[10px] uppercase tracking-widest text-white sm:bottom-[11%] sm:left-[12%]">
              <span className="mb-2 block opacity-75">{landingText(governedLanding, "platforms-ecosystem-label", "CogniOS Ecosystem")}</span>
              {landingText(governedLanding, "platforms-ecosystem-body", "One governed flow")}
            </div>
          </div>
        </div>
      </section>

      <section id="matrix" className="px-6 md:px-12 py-24 md:py-32 max-w-[1440px] mx-auto w-full">
        <div className="mb-16">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            {landingText(governedLanding, "platforms-matrix-eyebrow", "Capability Matrix")}
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-[68px] leading-[0.97] font-semibold max-w-[700px]">
             {landingText(governedLanding, "platforms-matrix-heading", "Connected capabilities.")}
          </h2>
        </div>

        <SpatialDisclosure orientation="vertical" allowCollapse={true} defaultValue="platform-ecosystem" className="flex flex-col">
            <SpatialDisclosureItem id="platform-ecosystem" className="border-t border-foreground">
              <SpatialDisclosureTrigger id="platform-ecosystem" className="w-full flex items-center justify-between text-left group pt-8 pb-8">
                <h3 className="text-xl font-bold uppercase tracking-widest text-muted-foreground group-hover:text-[hsl(var(--brand-pink))] transition-colors text-[11px] m-0">Platform ecosystem</h3>
                <Plus className="h-6 w-6 text-foreground group-hover:text-[hsl(var(--brand-pink))] transition-transform duration-300 group-data-[state=active]:rotate-45 group-data-[state=active]:text-[hsl(var(--brand-pink))]" />
              </SpatialDisclosureTrigger>
              <SpatialDisclosurePanel id="platform-ecosystem" className="data-[state=inactive]:hidden pb-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                  {platforms.map((platform) => (
                    <Link
                      href={platform.href}
                      key={platform.slug}
                      data-testid={`link-platform-${platform.slug}`}
                      aria-label={`Explore ${platform.name}${platform.ownership === "partner" ? ", partner platform" : ""}`}
                      className="group block h-full bg-[hsl(var(--secondary))] p-8 transition-colors hover:bg-[hsl(var(--brand-violet))/5] border border-transparent hover:border-[hsl(var(--brand-pink))/20] cursor-pointer relative overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-4"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))] transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100" />
                        <div className="flex justify-between items-start mb-6">
                          <div>
                            <span className="mb-3 block text-[10px] font-bold uppercase tracking-[.16em] text-muted-foreground">
                              {platform.ownership === "partner" ? "Partner platform" : "Cognirise platform"}
                            </span>
                            <h4 className="text-3xl md:text-4xl font-semibold text-[hsl(var(--brand-deep))] transition-colors group-hover:text-[hsl(var(--brand-pink))]">{platform.name}</h4>
                          </div>
                          <ArrowRight className="h-6 w-6 text-muted-foreground group-hover:text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1" />
                        </div>
                        <p className="text-foreground/70 leading-relaxed text-base max-w-[420px]">{platform.description}</p>
                    </Link>
                  ))}
                </div>
              </SpatialDisclosurePanel>
            </SpatialDisclosureItem>
        </SpatialDisclosure>
      </section>

      <section className="bg-foreground text-white px-6 md:px-12 py-24 relative overflow-hidden">
        <div className="absolute right-0 bottom-[-5%] text-[20vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none">
          MOVE
        </div>
        <div className="max-w-[1440px] mx-auto relative z-10">
          <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-widest text-white/60 mb-6">
            <div className="h-[1px] w-6 bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
            {landingText(governedLanding, "platforms-closing-eyebrow", "The first move")}
          </div>
          <h2 className="text-5xl md:text-7xl lg:text-[110px] leading-[0.88] font-semibold tracking-tight mb-8">
            {landingText(governedLanding, "platforms-closing-headline", "Bring one process. Leave with a route.")}
          </h2>
          <p className="text-lg text-white/80 max-w-[515px] mb-12">
            {landingText(governedLanding, "platforms-closing-body", "Start with the work where urgency, complexity and value have already collided. In a focused working session, we surface the opportunity, constraints and a practical route to production.")}
          </p>
          <BrandButton href={closingCta.href} variant="submit">{closingCta.label}</BrandButton>
        </div>
      </section>
    </div>
  );
}
