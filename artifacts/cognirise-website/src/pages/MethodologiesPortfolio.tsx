import { useEffect } from "react";
import { useLocation } from "wouter";
import { PulseImage } from "@/components/ui/pulse-image";
import { BrandButton } from "@/components/ui/brand-button";
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

  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) => {
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
                {governedHero?.text ?? "Start with the decision in front of you—not a framework name. Choose one of seven situations to see what you may already have, what needs deciding and which existing method can help. Strategy, operations and implementation are context, not a required sequence."}
              </p>
              
              <BrandButton
                href={primaryAction.href}
                onClick={handleNavClick}
                data-testid="hero-primary-cta"
                className="mt-10 max-w-full min-w-0"
              >
                {primaryAction.label}
              </BrandButton>
            </div>
          </div>
          
          <figure data-methodology-hero-frame className="clip-diagonal relative h-[430px] w-full overflow-hidden bg-[#071936] md:h-[520px] lg:h-[620px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:duration-700 motion-safe:ease-out" data-testid="hero-figure">
            <PulseImage
              key={heroMedia.src}
              src={heroMedia.src}
              alt={heroMedia.alt}
               style={{ objectPosition: heroMedia.objectPosition }}
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
            Select the decision in front of you. See what you may already have, the practical output to work toward, and which existing method fits. IDAO delivery and specialist authority decisions remain conditional on evidence.
          </p>
        </div>
        
        <div data-testid="route-navigator-container">
          <MethodologyRouteMap />
        </div>
        <p className="mt-8 max-w-3xl text-[14px] leading-[1.6] text-[#647491]">
          Value Scan remains a separate optional facilitated enquiry, not a scored assessment. IDAO and the Human–Agent Operating Model remain delivery and playbook content; they are not presented here as compulsory questionnaires.
        </p>
      </section>
    </main>
  );
}
