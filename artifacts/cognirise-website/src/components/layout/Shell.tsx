import { Link, useLocation } from "wouter";
import { Menu, X } from "lucide-react";
import { useState, useEffect } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Cognirise | Intelligence That Moves Work",
    description:
      "Cognirise redesigns consequential enterprise work around people, data, controls and intelligent execution.",
  },
  "/what-we-do": {
    title: "AI Transformation Services | Cognirise",
    description:
      "Explore Cognirise services for agentic transformation, AI foundations, modern engineering and sovereign enterprise delivery.",
  },
  "/what-we-do/agentic-enterprise-transformation": {
    title: "Agentic Enterprise Transformation | Cognirise",
    description:
      "Redesign priority work for governed intelligent execution with a practical route from one process to production.",
  },
  "/platforms/cognios": {
    title: "CogniOS AI Platform Architecture | Cognirise",
    description:
      "Discover the governed architecture that connects enterprise knowledge, agents, integrations and human accountability.",
  },
  "/industries": {
    title: "AI Transformation by Industry | Cognirise",
    description:
      "Sector-specific routes for organisations where intelligent transformation must be fast, sovereign and defensible.",
  },
  "/industries/public-sector": {
    title: "Public Sector AI Transformation | Cognirise",
    description:
      "Build sovereign, governed AI capability for public services where trust, continuity and human authority matter.",
  },
  "/work": {
    title: "How Cognirise Delivers AI Transformation",
    description:
      "See how Cognirise frames, builds and governs consequential AI transformation work without hiding behind theatre.",
  },
  "/insights": {
    title: "AI Transformation Insights | Cognirise",
    description:
      "Field notes for leaders building AI-native organisations across strategy, architecture, governance and operations.",
  },
  "/about": {
    title: "About Cognirise | Senior-Led AI Transformation",
    description:
      "Meet the principles behind Cognirise: senior accountability, practical delivery and intelligence designed around real work.",
  },
  "/value-scan": {
    title: "Book an AI Value Scan | Cognirise",
    description:
      "Bring Cognirise one process under pressure and leave with a clearer route toward governed intelligent execution.",
  },
};

const navItems = [
  { label: "What we do", href: "/what-we-do" },
  { label: "Platforms", href: "/platforms/cognios" },
  { label: "Industries", href: "/industries" },
  { label: "Work", href: "/work" },
  { label: "Insights", href: "/insights" },
  { label: "About", href: "/about" },
];

export function Shell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const { market, setMarket } = useMarketStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    window.scrollTo(0, 0);
  }, [location]);

  useEffect(() => {
    const articleTitle =
      location.startsWith("/insights/") &&
      "AI Transformation Perspective | Cognirise";
    const meta = pageMeta[location] ?? {
      title: articleTitle || "Page Not Found | Cognirise",
      description: location.startsWith("/insights/")
        ? "A Cognirise perspective on building governed AI-native organisations and production-ready intelligent work."
        : "The requested Cognirise page could not be found.",
    };
    const siteUrl = (
      import.meta.env.VITE_SITE_URL || window.location.origin
    ).replace(/\/$/, "");
    const canonicalUrl = `${siteUrl}${location === "/" ? "" : location}`;
    const imageUrl = `${siteUrl}/images/cognirise/pulse-hero.jpg`;

    const setMeta = (selector: string, attribute: string, value: string) => {
      const node = document.head.querySelector<HTMLMetaElement>(selector);
      node?.setAttribute(attribute, value);
    };

    document.title = meta.title;
    setMeta('meta[name="description"]', "content", meta.description);
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[property="og:image"]', "content", imageUrl);
    setMeta('meta[name="twitter:title"]', "content", meta.title);
    setMeta('meta[name="twitter:description"]', "content", meta.description);
    setMeta('meta[name="twitter:image"]', "content", imageUrl);

    let canonical =
      document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [location]);

  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className={`sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur transition-all duration-300 ${
          scrolled ? "py-2" : "py-4"
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 md:px-12">
          <Link href="/">
            <img
              src="/images/cognirise/logo-blue.svg"
              alt="Cognirise"
              className="h-8 md:h-10 object-contain origin-left"
            />
          </Link>

          <nav className="hidden items-center gap-7 xl:flex">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={location.startsWith(item.href) ? "page" : undefined}
                className={`text-sm font-semibold transition-colors hover:text-[hsl(var(--brand-pink))] ${
                  location.startsWith(item.href) ? "text-[hsl(var(--brand-pink))]" : "text-foreground"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-5 xl:flex">
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <button 
                onClick={() => setMarket("uae")} 
                className={`transition-colors hover:text-foreground ${market === "uae" ? "text-foreground font-bold" : ""}`}
              >
                UAE
              </button>
              <span>/</span>
              <button 
                onClick={() => setMarket("ksa")} 
                className={`transition-colors hover:text-foreground ${market === "ksa" ? "text-foreground font-bold" : ""}`}
              >
                KSA
              </button>
              <span>/</span>
              <button 
                onClick={() => setMarket("turkiye")} 
                className={`transition-colors hover:text-foreground ${market === "turkiye" ? "text-foreground font-bold" : ""}`}
              >
                TR
              </button>
              <span>/</span>
              <button 
                onClick={() => setMarket("europe")} 
                className={`transition-colors hover:text-foreground ${market === "europe" ? "text-foreground font-bold" : ""}`}
              >
                EU
              </button>
            </div>
            <Link href="/value-scan">
              <BrandButton>Bring us one process</BrandButton>
            </Link>
          </div>

          <button
            className="xl:hidden p-2 -mr-2"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="fixed inset-0 top-[65px] z-40 bg-foreground px-6 py-8 xl:hidden">
          <nav className="flex flex-col gap-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={location.startsWith(item.href) ? "page" : undefined}
                className="text-2xl font-display font-semibold text-white"
              >
                {item.label}
              </Link>
            ))}
            <Link href="/value-scan" className="mt-4">
              <BrandButton>Bring us one process</BrandButton>
            </Link>
          </nav>
          
          <div className="mt-12 flex flex-wrap gap-4 text-sm font-medium uppercase tracking-wider text-muted-foreground">
            <button 
              onClick={() => { setMarket("uae"); setIsOpen(false); }}
              className={market === "uae" ? "text-white font-bold" : ""}
            >
              UAE
            </button>
            <button 
              onClick={() => { setMarket("ksa"); setIsOpen(false); }}
              className={market === "ksa" ? "text-white font-bold" : ""}
            >
              KSA
            </button>
            <button 
              onClick={() => { setMarket("turkiye"); setIsOpen(false); }}
              className={market === "turkiye" ? "text-white font-bold" : ""}
            >
              Türkiye
            </button>
            <button 
              onClick={() => { setMarket("europe"); setIsOpen(false); }}
              className={market === "europe" ? "text-white font-bold" : ""}
            >
              Europe
            </button>
          </div>
        </div>
      )}

      <main className="flex-1">{children}</main>

      <footer className="mt-24 border-t border-border bg-[hsl(var(--brand-deep))] text-white py-12">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col justify-between gap-8 px-6 md:flex-row md:items-end md:px-12">
          <div className="flex flex-col gap-6">
            <img
              src="/images/cognirise/logo-white.svg"
              alt="Cognirise"
              className="h-10 object-contain origin-left"
            />
            <div className="text-sm text-blue-200">
              <p>Intelligence that moves work.</p>
              <p className="mt-1 font-medium text-white">
                {market === "uae" ? "Dubai · United Arab Emirates" :
                 market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
                 market === "turkiye" ? "Istanbul · Türkiye" :
                 "London · Europe"}
              </p>
            </div>
          </div>
          
          <div className="flex flex-col gap-6 md:text-right">
            <div className="grid grid-cols-2 gap-x-12 gap-y-3 text-sm text-blue-200 md:flex md:gap-8">
              <Link href="/what-we-do" className="hover:text-white">Services</Link>
              <Link href="/platforms/cognios" className="hover:text-white">Platforms</Link>
              <Link href="/industries" className="hover:text-white">Industries</Link>
              <Link href="/insights" className="hover:text-white">Insights</Link>
            </div>
            <p className="text-xs text-blue-300">© Cognirise. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
