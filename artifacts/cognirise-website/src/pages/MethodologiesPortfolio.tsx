import { useEffect } from "react";
import { useLocation } from "wouter";
import { PulseImage } from "@/components/ui/pulse-image";
import { assetUrl } from "@/lib/assets";
import { MethodologyRouteMap } from "@/components/MethodologyRouteMap";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { landingCta, landingMedia, landingNarrative } from "@/lib/cms";

export default function MethodologiesPortfolio() {
  const [location] = useLocation();
  const governedLanding = useGovernedLanding();
  const governedHero = governedLanding ? landingNarrative(governedLanding, "hero") : null;
  const primaryAction = landingCta(governedLanding, "primary-action", {
    label: "Find your situation",
    href: "/methodologies#route-navigator",
  });
  const heroMedia = landingMedia(governedLanding, "methodologies-hero-media", {
    src: assetUrl("/images/cognirise/method-overview.jpg"),
    alt: "Architectural intersection representing connected methods",
  });

  useEffect(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        let restored = false;
        try {
          const storedScroll = sessionStorage.getItem("cognirise-methodology-scroll");
          if (storedScroll) {
            const scrollY = parseInt(storedScroll, 10);
            if (!isNaN(scrollY)) {
              window.scrollTo({ top: scrollY, behavior: "instant" });
              sessionStorage.removeItem("cognirise-methodology-scroll");
              restored = true;
            }
          }
        } catch (e) {}
        
        // Fallback if no exact scroll position was stored but we have the hash
        if (!restored && window.location.hash === "#route-navigator") {
          const el = document.getElementById("route-navigator");
          if (el) {
            el.scrollIntoView({ behavior: "instant", block: "start" });
          }
        }
      });
    });
  }, [location]);

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (primaryAction.href !== "/methodologies#route-navigator") return;
    e.preventDefault();
    const el = document.getElementById("route-navigator");
    if (el) {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      el.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
      window.history.pushState(null, "", "#route-navigator");
    }
  };

  return (
    <main className="bg-[#fdfcfb] text-[#102957]">
      <header className="px-6 pb-20 pt-12 md:px-[4.8vw] lg:pb-28 border-b border-[#cbd3e1]">
        <p className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]" data-testid="portfolio-kicker">
          How we do it
        </p>
        <div className="mt-7 grid gap-12 lg:gap-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div className="flex flex-col gap-8">
            <h1 className="font-display text-[clamp(45px,7vw,100px)] font-semibold leading-[.88] tracking-[-.08em]" data-testid="portfolio-title">
              {governedHero?.heading ?? "From AI ambition to working outcomes."}
            </h1>
            <div className="border-t border-[#102957] pt-8 max-w-[620px]">
              <p className="text-[19px] leading-[1.58] text-[#405777]" data-testid="portfolio-description">
                {governedHero?.text ?? "Choose the decision you need to make. Find a practical method to assess the evidence, define the next action and move forward responsibly."}
              </p>
              
              <a 
                href={primaryAction.href}
                onClick={handleNavClick}
                data-testid="hero-primary-cta"
                className="mt-10 relative overflow-hidden inline-flex items-center gap-3 bg-[#102957] text-white px-7 py-4 hover:bg-[#1a3a75] text-[15px] font-bold transition-colors group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[hsl(var(--brand-pink))]"
              >
                <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]" />
                <span className="pl-1">{primaryAction.label}</span>
              </a>
            </div>
          </div>
          
          <figure data-methodology-hero-frame className="clip-diagonal relative h-[430px] w-full overflow-hidden bg-[#071936] md:h-[520px] lg:h-[620px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:duration-700 motion-safe:ease-out" data-testid="hero-figure">
            <PulseImage
              key={heroMedia.src}
              src={heroMedia.src}
              alt={heroMedia.alt}
              className="h-full w-full object-cover opacity-90"
              eager
            />
          </figure>
        </div>
      </header>

      <section 
        id="route-navigator"
        className="bg-white px-6 py-24 md:px-[4.8vw] min-h-[80vh]" 
        aria-labelledby="roadmap-title"
      >
        <div className="max-w-3xl mb-16">
          <h2 id="roadmap-title" className="font-display text-[clamp(40px,5vw,72px)] font-semibold tracking-[-.08em] text-[#102957]">
            Start with your situation
          </h2>
          <p className="mt-6 text-[19px] leading-[1.58] text-[#536887]">
            Select the decision in front of you. See which method can help, what it produces, and when IDAO delivery or an Agent Authority decision becomes relevant.
          </p>
        </div>
        
        <div data-testid="route-navigator-container">
          <MethodologyRouteMap />
        </div>
      </section>
    </main>
  );
}
