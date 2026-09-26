import { useEffect } from "react";
import { useLocation } from "wouter";
import { PulseImage } from "@/components/ui/pulse-image";
import { BrandButton } from "@/components/ui/brand-button";
import { assetUrl } from "@/lib/assets";
import { MethodologyRouteMap } from "@/components/MethodologyRouteMap";
import { MethodologiesHeroFilm } from "@/components/MethodologiesHeroFilm";
import { NavigationBackControl } from "@/components/navigation/NavigationBackControl";
import { useGovernedLanding } from "@/components/GovernedLandingRoute";
import { landingCta, landingMedia, landingNarrative } from "@/lib/cms";
import { useMarketStore } from "@/store/market";

export default function MethodologiesPortfolio() {
  const [location] = useLocation();
  const { market, locale } = useMarketStore();
  const governedLanding = useGovernedLanding();
  const governedHero = governedLanding ? landingNarrative(governedLanding, "hero") : null;
  const primaryAction = landingCta(governedLanding, "primary-action", {
    label: "Find your situation",
    href: "/methodologies#route-navigator",
  });
  // Only the UAE English edition has this route-owned film. Other markets
  // retain their governed hero image; UAE never paints the retired still.
  const showFilm = market === "uae" && locale === "en";
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
      <header className="public-hero-shell border-b border-[#cbd3e1] px-6 pb-16 pt-8 md:px-[4.8vw] md:pt-[22px] lg:pb-20">
        <div className="grid items-start gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-[4vw]">
          <div className="flex min-w-0 flex-col lg:min-h-[620px]">
            <div className="flex flex-col gap-7">
              <NavigationBackControl embedded />
              <p data-hero-content-edge className="text-[10px] font-bold uppercase tracking-[.14em] text-[hsl(var(--brand-pink))]" data-testid="portfolio-kicker">
                How we do it
              </p>
            </div>
            <div className="mt-10 lg:mt-auto">
              <h1 className="font-display text-[clamp(40px,4.8vw,76px)] font-semibold leading-[.94] tracking-[-.08em] [overflow-wrap:anywhere]" data-testid="portfolio-title">
                {governedHero?.heading ?? "From AI ambition to working outcomes."}
              </h1>
              <div className="mt-7 max-w-[620px] border-t border-[#102957] pt-7">
                <p className="text-[clamp(16px,1.4vw,19px)] leading-[1.58] text-[#405777]" data-testid="portfolio-description">
                  {governedHero?.text ?? "Start with the decision in front of you—not a framework name. Choose one of seven situations to see what you may already have, what needs deciding and which existing method can help. Strategy, operations and implementation are context, not a required sequence."}
                </p>

                <BrandButton
                  href={primaryAction.href}
                  onClick={handleNavClick}
                  data-testid="hero-primary-cta"
                  className="mt-8 max-w-full min-w-0"
                >
                  {primaryAction.label}
                </BrandButton>
              </div>
            </div>
          </div>
          
          <figure data-methodology-hero-frame className="clip-diagonal relative h-[430px] w-full overflow-hidden bg-[#e8e1dc] md:h-[520px] lg:h-[620px] motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-right-8 motion-safe:duration-700 motion-safe:ease-out" data-testid="hero-figure">
            {showFilm ? <MethodologiesHeroFilm /> : (
              <PulseImage
                key={heroMedia.src}
                src={heroMedia.src}
                alt={heroMedia.alt}
                style={{ objectPosition: heroMedia.objectPosition }}
                className="absolute inset-0 h-full w-full object-cover"
                eager
              />
            )}
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
