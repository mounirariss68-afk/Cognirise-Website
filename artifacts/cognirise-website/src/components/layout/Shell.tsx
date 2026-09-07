import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { PulseMotionPage } from "@/components/motion/PulseMotionPage";
import { setAnalyticsConsent, useAnalyticsConsent } from "@/lib/analytics";
import { SERVICE_LINE_LABELS } from "@/lib/serviceLines";
import { ALLIANCE_PLATFORMS } from "@/lib/alliancePlatforms";
import { useGetPublicNavigationSettings } from "@workspace/api-client-react";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Cognirise | Intelligence That Moves Work",
    description: "Cognirise redesigns consequential enterprise work around people, data, controls and intelligent execution.",
  },
  "/what-we-do": {
    title: "Consulting, Sovereign AI & AI Platforms | Cognirise",
    description: `Explore ${SERVICE_LINE_LABELS.join(", ")}.`,
  },
  "/what-we-do/agentic-enterprise-transformation": {
    title: "Agentic Transformation Capability | Consulting & Engineering with AI",
    description: "A supporting capability within Consulting & Engineering with AI for redesigning priority work around governed intelligent execution.",
  },
  "/what-we-do/data-ai-foundations": {
    title: "Data & AI Foundations Capability | Consulting & Engineering with AI",
    description: "A supporting capability within Consulting & Engineering with AI for making data, controls and architecture production-ready.",
  },
  "/what-we-do/engineering-with-ai": {
    title: "Engineering Capability | Consulting & Engineering with AI",
    description: "A supporting capability within Consulting & Engineering with AI for shipping production systems with forward-deployed teams.",
  },
  "/what-we-do/sovereign-regulated-ai": {
    title: "Sovereign & Regulated Capability | Sovereign AI Solutions",
    description: "A supporting capability within Sovereign AI Solutions for building local control, security and explainability into the work.",
  },
  "/what-we-do/digital-ai-workforce": {
    title: "Digital Workforce Capability | AI Platforms",
    description: "A supporting capability within AI Platforms for deploying governed agents into real operating environments.",
  },
  "/platforms": {
    title: "CogniOS Platform Ecosystem | Cognirise",
    description: "Discover the platform architecture that connects enterprise knowledge, agents, integrations and human accountability.",
  },
  "/platforms/cognios": {
    title: "CogniOS AI Platform | Cognirise",
    description: "The operating system for governed intelligence.",
  },
  "/platforms/cognios/architecture": {
    title: "CogniOS Architecture | Cognirise",
    description: "Interactive layered architecture for enterprise intelligence.",
  },
  "/platforms/cognidocs": {
    title: "CogniDocs | Cognirise",
    description: "Knowledge made available with the context, access and control the work requires.",
  },
  "/platforms/cogniagents": {
    title: "CogniAgents | Cognirise",
    description: "Governed agents that coordinate specialist tasks in defined operational environments.",
  },
  "/platforms/cognitalk": {
    title: "CogniTalk | Cognirise",
    description: "A bilingual conversational layer for meaningful work between people and enterprise intelligence.",
  },
  "/platforms/cogniware": {
    title: "CogniWare | Cognirise",
    description: "Composable intelligence capabilities connected to the systems that run the enterprise.",
  },
  "/industries": {
    title: "AI Transformation by Industry | Cognirise",
    description: "Sector-specific routes for organisations where intelligent transformation must be fast, sovereign and defensible.",
  },
  "/industries/financial-services": {
    title: "Financial Services AI | Evidence-Led Industry View | Cognirise",
    description: "A governed view of AI in financial services: model risk, operating reversals, evidenced use cases and GCC context.",
  },
  "/industries/telecoms": {
    title: "Telecoms AI | Evidence-Led Industry View | Cognirise",
    description: "An evidence-led view of telecoms AI across bounded network autonomy, service resolution and infrastructure economics.",
  },
  "/industries/travel-hospitality": {
    title: "Travel & Hospitality AI | Evidence-Led Industry View | Cognirise",
    description: "A practical view of AI in travel and hospitality, centred on disruption recovery, frontline judgment and evidence.",
  },
  "/industries/energy-resources": {
    title: "Energy & Resources AI | Evidence-Led Industry View | Cognirise",
    description: "A field-grounded view of AI in energy and resources, from asset context and maintenance to safe operating boundaries.",
  },
  "/industries/manufacturing": {
    title: "Manufacturing AI | Evidence-Led Industry View | Cognirise",
    description: "An evidence-led view of industrial AI across quality, maintenance, planning and the connected workforce.",
  },
  "/work": {
    title: "How Cognirise Delivers AI Transformation",
    description: "See how Cognirise frames, builds and governs consequential AI transformation work without hiding behind theatre.",
  },
  "/insights": {
    title: "AI Transformation Insights | Cognirise",
    description: "Field notes for leaders building AI-native organisations across strategy, architecture, governance and operations.",
  },
  "/about": {
    title: "Our Team | Cognirise",
    description: "Meet the Cognirise leadership team and Board of Advisors behind our senior-led AI transformation work.",
  },
  "/partners": {
    title: "Partners | Cognirise",
    description: "The alliance and technology network that supports our operating model.",
  },
  "/faq": {
    title: "FAQ | Cognirise",
    description: "Common questions about our capability, model, and approach.",
  },
  "/contact": {
    title: "Contact Us | Cognirise",
    description: "Connect with our team to discuss an operating problem.",
  },
  "/value-scan": {
    title: "Book an AI Value Scan | Cognirise",
    description: "Bring Cognirise one process under pressure and leave with a clearer route toward governed intelligent execution.",
  },
};

type NavigationItem = { id: string; label: string; href: string; items?: NavigationItem[] };

const navigation: NavigationItem[] = [
  {
    id: "what-we-do",
    label: "What we do",
    href: "/what-we-do",
    items: [
      { id: "what-we-do.overview", label: "Overview", href: "/what-we-do" },
      { id: "what-we-do.consulting-engineering", label: SERVICE_LINE_LABELS[0], href: "/what-we-do#consulting-engineering" },
      { id: "what-we-do.sovereign-solutions", label: SERVICE_LINE_LABELS[1], href: "/what-we-do#sovereign-solutions" },
      { id: "what-we-do.ai-platforms", label: SERVICE_LINE_LABELS[2], href: "/what-we-do#ai-platforms" },
    ]
  },
  {
    id: "platforms",
    label: "Platforms",
    href: "/platforms",
    items: [
      { id: "platforms.overview", label: "Platform Overview", href: "/platforms" },
      { id: "platforms.cognios", label: "CogniOS", href: "/platforms/cognios" },
      { id: "platforms.architecture", label: "Architecture", href: "/platforms/cognios#architecture" },
      { id: "platforms.cognidocs", label: "CogniDocs", href: "/platforms/cognidocs" },
      { id: "platforms.cogniagents", label: "CogniAgents", href: "/platforms/cogniagents" },
      { id: "platforms.cognitalk", label: "CogniTalk", href: "/platforms/cognitalk" },
      { id: "platforms.cogniware", label: "CogniWare", href: "/platforms/cogniware" },
      { id: "platforms.lupitor", label: "Lupitor", href: "/platforms/lupitor" },
      { id: "platforms.datatoolpack", label: "Datatoolpack", href: "/platforms/datatoolpack" },
      { id: "platforms.bunjee-ai", label: "bunjee.ai", href: "/platforms/bunjee-ai" },
    ]
  },
  {
    id: "industries",
    label: "Industries",
    href: "/industries",
    items: [
      { id: "industries.overview", label: "Industries Overview", href: "/industries" },
      { id: "industries.banking", label: "Financial Services", href: "/industries/financial-services" },
      { id: "industries.telecoms", label: "Telecoms", href: "/industries/telecoms" },
      { id: "industries.travel", label: "Travel & Hospitality", href: "/industries/travel-hospitality" },
      { id: "industries.energy", label: "Energy & Resources", href: "/industries/energy-resources" },
      { id: "industries.manufacturing", label: "Manufacturing", href: "/industries/manufacturing" },
    ]
  },
  { id: "work", label: "Work", href: "/work" },
  { id: "insights", label: "Insights", href: "/insights" },
  {
    id: "about",
    label: "About",
    href: "/about",
    items: [
      { id: "about.leadership", label: "Our Team", href: "/about" },
      { id: "about.partners", label: "Partners", href: "/partners" },
      { id: "about.advisors", label: "Board of Advisors", href: "/about#board-of-advisors" },
      { id: "about.faq", label: "FAQ", href: "/faq" },
      { id: "about.contact", label: "Contact", href: "/contact" },
    ]
  },
];

function AnalyticsPreference() {
  const enabled = useAnalyticsConsent();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const update = async () => {
    setSaving(true);
    setError("");
    try {
      await setAnalyticsConsent(!enabled);
    } catch {
      setError("Could not record analytics preference.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span>Analytics: {enabled ? "on" : "off"}</span>
      <button
        type="button"
        className="underline underline-offset-4 hover:text-white disabled:opacity-50"
        onClick={update}
        disabled={saving}
      >
        {saving ? "Saving…" : enabled ? "Disable" : "Allow"}
      </button>
      {error && <span role="alert" className="text-[hsl(var(--brand-coral))]">{error}</span>}
    </div>
  );
}

export function Shell({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const navigationSettings = useGetPublicNavigationSettings();
  const enabledNavigation = new Map(navigationSettings.data?.items.map((item) => [item.id, item.enabled]) ?? []);
  const visibleNavigation = navigation
    .filter((item) => enabledNavigation.get(item.id) ?? true)
    .map((item) => {
      const visibleChildren = item.items?.filter((child) => enabledNavigation.get(child.id) ?? true);
      return { ...item, items: visibleChildren?.length ? visibleChildren : undefined };
    });
  const { market, setMarket } = useMarketStore();
  const [scrolled, setScrolled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef(window.location.pathname);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setIsOpen(false);
    setActiveDropdown(null);
    const pathname = window.location.pathname;
    const hash = window.location.hash;
    const pathChanged = previousPathRef.current !== pathname;
    previousPathRef.current = pathname;

    window.requestAnimationFrame(() => {
      if (hash) {
        document.getElementById(hash.slice(1))?.scrollIntoView({ block: "start" });
      } else if (pathChanged) {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      }
    });
  }, [location]);

  useEffect(() => {
    const articleTitle = location.startsWith("/insights/") && "AI Transformation Perspective | Cognirise";
    const allianceSlug = location.match(/^\/platforms\/(lupitor|datatoolpack|bunjee-ai)$/)?.[1] as keyof typeof ALLIANCE_PLATFORMS | undefined;
    const alliance = allianceSlug ? ALLIANCE_PLATFORMS[allianceSlug] : undefined;
    const meta = alliance?.meta ?? pageMeta[location] ?? {
      title: articleTitle || "Page Not Found | Cognirise",
      description: location.startsWith("/insights/")
        ? "A Cognirise perspective on building governed AI-native organisations and production-ready intelligent work."
        : "The requested Cognirise page could not be found.",
    };
    
    document.title = meta.title;
    
    const setMeta = (selector: string, attribute: string, value: string, createIfMissing: boolean = false) => {
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node && createIfMissing) {
        node = document.createElement("meta");
        const match = selector.match(/\[([a-zA-Z-]+)="([^"]+)"\]/);
        if (match) {
          node.setAttribute(match[1], match[2]);
        }
        document.head.appendChild(node);
      }
      if (node) node.setAttribute(attribute, value);
    };

    const setLink = (rel: string, href: string) => {
      let node = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
      if (!node) {
        node = document.createElement("link");
        node.setAttribute("rel", rel);
        document.head.appendChild(node);
      }
      node.setAttribute("href", href);
    };

    setMeta('meta[name="description"]', "content", meta.description, true);
    setMeta('meta[property="og:title"]', "content", meta.title, true);
    setMeta('meta[property="og:description"]', "content", meta.description, true);
    setMeta('meta[name="twitter:title"]', "content", meta.title, true);
    setMeta('meta[name="twitter:description"]', "content", meta.description, true);
    const canonical = window.location.origin + location;
    const socialImage = alliance ? window.location.origin + alliance.meta.socialImage : window.location.origin + "/images/cognirise/pulse-hero.jpg";
    setMeta('meta[property="og:url"]', "content", canonical, true);
    setMeta('meta[property="og:image"]', "content", socialImage, true);
    setMeta('meta[name="twitter:image"]', "content", socialImage, true);
    setLink("canonical", canonical);
  }, [location]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const handleMouseEnter = (label: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setActiveDropdown(label);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setActiveDropdown(null);
    }, 200);
  };

  const isCurrentSection = (itemHref: string) => {
    if (itemHref === "/") return location === "/";
    return location.startsWith(itemHref);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className="fixed top-0 z-50 flex h-[72px] w-full items-center border-b border-border bg-white/95 backdrop-blur transition-colors duration-300 md:h-[82px]"
      >
        <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-6 md:px-12">
          <Link href="/" className="relative z-50 flex h-full shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2">
            <img
              src={assetUrl("images/cognirise/logo-blue.svg")}
              alt="Cognirise"
              className="h-[48px] w-[170px] origin-left object-contain object-left md:h-[54px] md:w-[190px] xl:w-[205px]"
            />
          </Link>

          <nav className="hidden h-full items-center xl:flex">
            <ul className="flex items-center gap-2">
              {visibleNavigation.map((item) => (
                <li
                  key={item.href}
                  className="relative h-full flex items-center px-4"
                  onMouseEnter={() => item.items ? handleMouseEnter(item.label) : handleMouseLeave()}
                  onMouseLeave={handleMouseLeave}
                  onFocus={() => item.items && handleMouseEnter(item.label)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      handleMouseLeave();
                    }
                  }}
                >
                  <Link href={item.href} className="group py-2 flex items-center gap-1.5 focus-visible:outline-none">
                    <span
                      className={`text-[13px] font-bold tracking-wide transition-colors ${
                        isCurrentSection(item.href) ? "text-[hsl(var(--brand-pink))]" : "text-[hsl(var(--brand-deep))] group-hover:text-[hsl(var(--brand-pink))]"
                      }`}
                    >
                      {item.label}
                    </span>
                    {item.items && (
                      <ChevronDown className={`h-3 w-3 transition-transform ${activeDropdown === item.label ? 'rotate-180 text-[hsl(var(--brand-pink))]' : 'text-muted-foreground'}`} />
                    )}
                  </Link>

                  {item.items && activeDropdown === item.label && (
                    <div className="absolute top-[100%] pt-6 left-0 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="bg-white border border-border shadow-xl p-6 relative">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                        
                        <ul className="flex flex-col gap-3 relative z-10">
                          {item.items.map((subItem) => (
                            <li key={subItem.href}>
                              <Link 
                                href={subItem.href}
                                className={`group flex items-center gap-3 text-sm font-semibold transition-colors focus-visible:outline-none ${
                                  location === subItem.href ? "text-[hsl(var(--brand-pink))]" : "text-[hsl(var(--brand-deep))] hover:text-[hsl(var(--brand-pink))]"
                                }`}
                              >
                                <div className={`w-0 overflow-hidden transition-all group-hover:w-3 ${location === subItem.href ? "w-3" : ""}`}>
                                  <div className="h-[2px] w-3 bg-[hsl(var(--brand-coral))]" />
                                </div>
                                {subItem.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="hidden items-center gap-6 xl:flex relative z-50">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {['uae', 'ksa', 'turkiye', 'europe'].map((m) => (
                <div key={m} className="flex items-center gap-2">
                  <button 
                    onClick={() => setMarket(m as any)} 
                    className={`transition-colors hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:text-[hsl(var(--brand-pink))] ${market === m ? "text-[hsl(var(--brand-deep))]" : ""}`}
                  >
                    {m === 'turkiye' ? 'TR' : m === 'europe' ? 'EU' : m.toUpperCase()}
                  </button>
                  {m !== 'europe' && <span className="opacity-30">/</span>}
                </div>
              ))}
            </div>
            <BrandButton href="/value-scan">Bring us one process</BrandButton>
          </div>

          <button
            className="xl:hidden p-2 -mr-2 relative z-50 text-[hsl(var(--brand-deep))] focus-visible:outline-none"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {/* Main content offset so it doesn't hide behind fixed header */}
      <div className="h-[72px] md:h-[82px] shrink-0" />

      {isOpen && (
        <div className="fixed inset-0 top-[72px] md:top-[82px] z-40 bg-white px-6 py-8 overflow-y-auto xl:hidden animate-in fade-in duration-200">
          <nav className="flex flex-col gap-2 pb-12">
            {visibleNavigation.map((item) => (
              <div key={item.href} className="flex flex-col border-b border-border last:border-0">
                <div className="flex items-center justify-between py-4">
                  <Link
                    href={item.href}
                    className={`text-xl font-display font-semibold transition-colors focus-visible:outline-none ${isCurrentSection(item.href) ? 'text-[hsl(var(--brand-pink))]' : 'text-[hsl(var(--brand-deep))]'}`}
                  >
                    {item.label}
                  </Link>
                  {item.items && (
                    <button 
                      className="p-2 -mr-2 focus-visible:outline-none"
                      onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                    >
                      {mobileExpanded === item.label ? 
                        <ChevronDown className="h-5 w-5 text-[hsl(var(--brand-pink))]" /> : 
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      }
                    </button>
                  )}
                </div>
                
                {item.items && mobileExpanded === item.label && (
                  <ul className="flex flex-col gap-3 pb-6 pl-4 border-l border-border/50 ml-2">
                    {item.items.map((subItem) => (
                      <li key={subItem.href}>
                        <Link 
                          href={subItem.href}
                          className={`text-sm font-semibold transition-colors focus-visible:outline-none ${
                            location === subItem.href ? "text-[hsl(var(--brand-pink))]" : "text-muted-foreground hover:text-[hsl(var(--brand-deep))]"
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="pt-8">
              <BrandButton href="/value-scan" className="w-full justify-center">Bring us one process</BrandButton>
            </div>
          </nav>
          
          <div className="pb-12 border-t border-border pt-8">
            <span className="block text-[10px] font-semibold uppercase tracking-widest text-muted-foreground mb-4">Select Region</span>
            <div className="flex flex-wrap gap-4 text-xs font-bold uppercase tracking-widest text-muted-foreground">
              {['uae', 'ksa', 'turkiye', 'europe'].map((m) => (
                <button 
                  key={m}
                  onClick={() => { setMarket(m as any); setIsOpen(false); }}
                  className={`transition-colors focus-visible:outline-none ${market === m ? "text-[hsl(var(--brand-pink))]" : "hover:text-[hsl(var(--brand-deep))]"}`}
                >
                  {m === 'turkiye' ? 'Türkiye' : m}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="flex-1">
        <PulseMotionPage pathname={location.split("?")[0]}>{children}</PulseMotionPage>
      </main>

      <footer className="mt-auto border-t border-border bg-[hsl(var(--brand-deep))] text-white pt-16 pb-12 overflow-hidden relative">
        {/* Decorative background element */}
        <div className="absolute right-[-10%] top-[-20%] text-[25vw] leading-[0.7] font-display font-semibold tracking-tighter text-white/5 pointer-events-none select-none">
          COGNIRISE
        </div>
        
        <div className="mx-auto w-full max-w-[1440px] px-6 md:px-12 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 lg:gap-8 mb-16">
            <div className="flex flex-col gap-6">
              <Link href="/">
                <img
                  src={assetUrl("images/cognirise/logo-white.svg")}
                  alt="Cognirise"
                  className="h-12 w-[180px] origin-left object-contain object-left"
                />
              </Link>
              <div className="text-sm text-white/70 max-w-[280px]">
                <p>Intelligence that moves work.</p>
                <p className="mt-4 font-semibold text-white/90">
                  {market === "uae" ? "Dubai · United Arab Emirates" :
                   market === "ksa" ? "Riyadh · Kingdom of Saudi Arabia" :
                   market === "turkiye" ? "Istanbul · Türkiye" :
                   "London · Europe"}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-6">Capability</h4>
              <ul className="flex flex-col gap-3 text-sm text-white/80 font-semibold">
                <li><Link href="/what-we-do" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Services</Link></li>
                <li><Link href="/platforms" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Platforms</Link></li>
                <li><Link href="/industries" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Industries</Link></li>
                <li><Link href="/work" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Work</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-6">Company</h4>
              <ul className="flex flex-col gap-3 text-sm text-white/80 font-semibold">
                <li><Link href="/about" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">About & Leadership</Link></li>
                <li><Link href="/insights" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Insights</Link></li>
                <li><Link href="/partners" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Partners</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">Contact</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-6">Action</h4>
              <BrandButton href="/value-scan" variant="inverse" className="w-full">Bring us one process</BrandButton>
            </div>
          </div>
          
          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-white/50">
            <p>© {new Date().getFullYear()} Cognirise. All rights reserved.</p>
            <AnalyticsPreference />
          </div>
        </div>
      </footer>
    </div>
  );
}
