import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState, useEffect, useRef } from "react";
import { BrandButton } from "@/components/ui/brand-button";
import { configurePublicMarkets, getMarketLocationLabel, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { PulseMotionPage } from "@/components/motion/PulseMotionPage";
import { setAnalyticsConsent, useAnalyticsConsent } from "@/lib/analytics";
import { ALLIANCE_PLATFORMS } from "@/lib/alliancePlatforms";
import { useGetPublicConfiguration, useGetPublicNavigationSettings } from "@workspace/api-client-react";
import { releaseHrefAvailable, useReleaseContext } from "@/lib/releases";
import { handleSamePageHashNavigation } from "@/lib/hashNavigation";
import { isCurrentRouteDestination, routePath } from "@/lib/routeState";
import { marketAwareDestination } from "@/lib/marketDestination";
import { ReviewVersionSelect } from "./ReviewVersionSelect";
import { PLATFORM_CATALOG } from "@/lib/platformCatalog";

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Cognirise | Intelligence That Moves Work",
    description: "Cognirise redesigns consequential enterprise work around people, data, controls and intelligent execution.",
  },
  "/methodologies": {
    title: "AI Methodologies & Frameworks | Cognirise",
    description: "Explore Cognirise methods for moving valuable AI into sustained operation, from organisational maturity to workflow authority.",
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
    title: "CogniOS | The Operating System for Enterprise AI | Cognirise",
    description: "CogniOS manages the full lifecycle of your agentic workflows, from design and approval to scheduling, monitoring and retirement.",
  },
  "/platforms/cognios/architecture": {
    title: "CogniOS Architecture | Cognirise",
    description: "Interactive layered architecture for enterprise intelligence.",
  },
  "/platforms/cognidocs": {
    title: "CogniDocs Document Intelligence | Cognirise",
    description: "Turn complex financial statements and engineering drawings into structured, source-linked findings for human review.",
  },
  "/platforms/cogniagents": {
    title: "CogniAgents | Agentic Workflows for Every Business Function | Cognirise",
    description: "CogniAgents are function-specific AI workflows tailored to your business, with best practices, human oversight and grounded knowledge built in.",
  },
  "/platforms/cognibase": {
    title: "CogniBase | Enterprise Knowledge with Cited Answers | Cognirise",
    description: "CogniBase connects enterprise documents, databases and systems to deliver grounded answers with citations, hybrid retrieval and controlled deployment.",
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
  "/industries/public-sector": {
    title: "Public Sector AI | Evidence-Led Industry View | Cognirise",
    description: "An evidence-led view of governed public-sector AI, accessible services, accountability and sovereign delivery.",
  },
  "/industries/education": {
    title: "Education AI | K–12 & Higher Education | Cognirise",
    description: "Build shared AI capability across schools, universities and education authorities: better learning, stronger educators and researchers, and responsible service redesign.",
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
    description: "Connect with Cognirise or contact our confirmed offices in Dubai, Riyadh and London.",
  },
  "/value-scan": {
    title: "Book an AI Value Scan | Cognirise",
    description: "Bring Cognirise one process under pressure and leave with a clearer route toward governed intelligent execution.",
  },
  "/methodologies/agent-authority-model": {
    title: "Agent Authority Model | Cognirise",
    description: "A deterministic framework to measure, promote, and constrain intelligent agents based on evidence of capability and clear boundaries of operational authority.",
  },
};

/** These route components apply either their compiled baseline or the exact
 * authoritative CMS revision SEO after client navigation. */
export const ROUTE_OWNED_METADATA_PATHS = new Set([
  "/methodologies/guardrails-framework",
  "/methodologies/idao",
  "/methodologies/ai-use-case-prioritization",
  "/methodologies/ai-value-to-scale",
  "/methodologies/agentic-operations-readiness",
  "/methodologies/human-agent-operating-model",
]);

type NavigationItem = { id: string; label: string; href: string; group?: "own" | "partner"; items?: NavigationItem[] };
export const groupPlatformNavigation = (items: NavigationItem[]): NavigationItem[] =>
  items.filter((item) => item.id !== "work" && !/^\/work\/?$/.test(routePath(item.href))).map((item) => item.id !== "platforms" && routePath(item.href) !== "/platforms"
    ? { ...item, items: item.items ? groupPlatformNavigation(item.items) : undefined }
    : {
        ...item,
        items: [
          ...(item.items?.some((child) => routePath(child.href) === "/platforms")
            ? [{ ...item.items.find((child) => routePath(child.href) === "/platforms")! }]
            : [{ id: "platforms.overview", label: "Platform Overview", href: "/platforms" }]),
          ...PLATFORM_CATALOG.map((platform) => ({
            id: `platforms.${platform.slug}`,
            label: platform.name,
            href: platform.href,
            group: platform.ownership === "cognirise" ? "own" as const : "partner" as const,
          })),
        ],
      });
export type PreviewNavigationSnapshot = {
  market?: string;
  locale?: string;
  items?: Array<Record<string, unknown>>;
  pages?: Array<Record<string, unknown>>;
};

export type PreviewMarketContext = {
  market: string;
  locale: string;
};

const compiledNavigation: NavigationItem[] = [
  {
    id: "what-we-do",
    label: "What we do",
    href: "/",
  },
  {
    id: "methodologies",
    label: "How we do it",
    href: "/methodologies",
    items: [
      { id: "methodologies.overview", label: "Methodology Portfolio", href: "/methodologies" },
      { id: "methodologies.value-to-scale", label: "AI Value-to-Scale", href: "/methodologies/ai-value-to-scale" },
      { id: "methodologies.agentic-readiness", label: "Agentic Operations Readiness", href: "/methodologies/agentic-operations-readiness" },
      { id: "methodologies.use-case-prioritization", label: "Use-Case Prioritization", href: "/methodologies/ai-use-case-prioritization" },
      { id: "methodologies.idao", label: "IDAO", href: "/methodologies/idao" },
      { id: "methodologies.agent-authority", label: "Agent Authority Model", href: "/methodologies/agent-authority-model" },
      { id: "methodologies.guardrails", label: "Guardrails Framework", href: "/methodologies/guardrails-framework" },
    ]
  },
  {
    id: "platforms",
    label: "Platforms",
    href: "/platforms",
    items: [
      { id: "platforms.overview", label: "Platform Overview", href: "/platforms" },
      { id: "platforms.cognios", label: "CogniOS", href: "/platforms/cognios", group: "own" },
      { id: "platforms.cogniagents", label: "CogniAgents", href: "/platforms/cogniagents", group: "own" },
      { id: "platforms.cognidocs", label: "CogniDocs", href: "/platforms/cognidocs", group: "own" },
      { id: "platforms.cognibase", label: "CogniBase", href: "/platforms/cognibase", group: "own" },
      { id: "platforms.lupitor", label: "Lupitor", href: "/platforms/lupitor", group: "partner" },
      { id: "platforms.datatoolpack", label: "Datatoolpack", href: "/platforms/datatoolpack", group: "partner" },
      { id: "platforms.bunjee-ai", label: "bunjee.ai", href: "/platforms/bunjee-ai", group: "partner" },
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
      { id: "industries.public-sector", label: "Public Sector", href: "/industries/public-sector" },
      { id: "industries.education", label: "Education", href: "/industries/education" },
    ]
  },
  { id: "insights", label: "Insights", href: "/insights" },
  {
    id: "about",
    label: "About",
    href: "/about",
    items: [
      { id: "about.leadership", label: "Our Team", href: "/about" },
      { id: "about.partners", label: "Partners", href: "/partners" },
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

export function Shell({
  children,
  navigationOverride,
  marketContext,
}: {
  children: React.ReactNode;
  /** Capability-issued navigation. Never persisted or used by public routes. */
  navigationOverride?: PreviewNavigationSnapshot;
  /** Capability-issued market context. It never writes to public preferences. */
  marketContext?: PreviewMarketContext;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [location, setLocation] = useLocation();
  const { market: publicMarket, locale: publicLocale, setMarket } = useMarketStore();
  const market = marketContext?.market ?? publicMarket;
  const locale = marketContext?.locale ?? publicLocale;
  const releaseContext = useReleaseContext();
  const publicConfiguration = useGetPublicConfiguration();
  const marketOptions = publicConfiguration.data?.markets ?? [];
  useEffect(() => {
    if (!publicConfiguration.data || marketContext) return;
    configurePublicMarkets(
      publicConfiguration.data.markets,
      publicConfiguration.data.markets.find((option) => option.isCanonical)?.code,
    );
  }, [marketContext, publicConfiguration.data]);
  const navigationSettings = useGetPublicNavigationSettings({ market, locale }, {
    query: { queryKey: ["public-navigation", market, locale], enabled: !navigationOverride && !releaseContext },
  });
  const releaseNavigation = releaseContext?.release.manifest.navigation;
  const effectiveNavigation = navigationOverride ?? releaseNavigation;
  const snapshotItems = effectiveNavigation?.items ?? [];
  const snapshotNavigation = effectiveNavigation && snapshotItems.length > 0
    ? (() => {
        const childrenByParent = new Map<string, NavigationItem[]>();
        const roots: NavigationItem[] = [];
        for (const raw of snapshotItems) {
          if (raw.visible === false || raw.enabled === false) continue;
          const id = String(raw.id ?? raw.item_id ?? "");
          const parentId = raw.parentId ?? raw.parent_id;
          const item: NavigationItem = {
            id,
            label: String(raw.label ?? ""),
            href: String(raw.destination ?? raw.href ?? "#"),
          };
          const key = parentId == null ? "" : String(parentId);
          const siblings = childrenByParent.get(key) ?? [];
          siblings.push(item);
          childrenByParent.set(key, siblings);
        }
        const build = (items: NavigationItem[]): NavigationItem[] => items
          .sort((a, b) => {
            const left = snapshotItems.find((raw) => String(raw.id ?? raw.item_id ?? "") === a.id);
            const right = snapshotItems.find((raw) => String(raw.id ?? raw.item_id ?? "") === b.id);
            return Number(left?.order ?? left?.sort_order ?? 0) - Number(right?.order ?? right?.sort_order ?? 0);
          })
          .map((item) => {
            const nested = build(childrenByParent.get(item.id) ?? []);
            return nested.length ? { ...item, items: nested } : item;
          });
        return build(childrenByParent.get("") ?? roots);
      })()
    : null;
  const rawVisibleNavigation: NavigationItem[] = snapshotNavigation ?? (navigationSettings.data?.isConfigured
    ? navigationSettings.data.items
      .filter((item) => item.visible && !item.parentId)
      .map((item) => {
        const children = navigationSettings.data!.items
          .filter((child) => child.visible && child.parentId === item.id)
          .sort((a, b) => a.order - b.order)
          .map((child) => ({ id: child.id, label: child.label, href: child.destination }));
        return {
          id: item.id,
          label: item.label,
          href: item.destination,
          items: children.length ? children : undefined,
        };
      })
      .sort((a, b) => {
        const left = navigationSettings.data!.items.find((item) => item.id === a.id)?.order ?? 0;
        const right = navigationSettings.data!.items.find((item) => item.id === b.id)?.order ?? 0;
        return left - right;
      })
    : compiledNavigation);
  const availabilityManifest = releaseContext?.release.manifest;
  const filterAvailable = (items: NavigationItem[]): NavigationItem[] => items.flatMap((item) => {
    const children = item.items ? filterAvailable(item.items) : undefined;
    if (availabilityManifest && !releaseHrefAvailable(availabilityManifest, item.href)) return [];
    return [{ ...item, items: children?.length ? children : undefined }];
  });
  const visibleNavigation = groupPlatformNavigation(filterAvailable(rawVisibleNavigation));
  const footerLinks = (items: Array<{ href: string; label: string }>) =>
    availabilityManifest ? items.filter((item) => releaseHrefAvailable(availabilityManifest, item.href)) : items;
  const capabilityFooterLinks = footerLinks([
    { href: "/#service-lines", label: "What we do" },
    { href: "/platforms", label: "Platforms" },
    { href: "/industries", label: "Industries" },
    { href: "/methodologies/idao", label: "IDAO methodology" },
    { href: "/methodologies/agent-authority-model", label: "Agent Authority Model" },
  ]);
  const companyFooterLinks = footerLinks([
    { href: "/about", label: "About & Leadership" },
    { href: "/insights", label: "Insights" },
    { href: "/partners", label: "Partners" },
    { href: "/contact", label: "Contact" },
  ]);
  const [scrolled, setScrolled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef(window.location.pathname);
  const currentPath = routePath(location);

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
    // These pages own governed metadata; do not overwrite their child effects.
    if (
      currentPath.startsWith("/preview/")
      || currentPath === "/industries/financial-services"
      || ROUTE_OWNED_METADATA_PATHS.has(currentPath)
    ) return;
    const articleTitle = currentPath.startsWith("/insights/") && "AI Transformation Perspective | Cognirise";
    const allianceSlug = currentPath.match(/^\/platforms\/(lupitor|datatoolpack|bunjee-ai)$/)?.[1] as keyof typeof ALLIANCE_PLATFORMS | undefined;
    const alliance = allianceSlug ? ALLIANCE_PLATFORMS[allianceSlug] : undefined;
    const meta = alliance?.meta ?? pageMeta[currentPath] ?? {
      title: articleTitle || "Page Not Found | Cognirise",
      description: currentPath.startsWith("/insights/")
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
    const canonical = window.location.origin + currentPath;
    const socialImage = alliance ? window.location.origin + alliance.meta.socialImage : window.location.origin + "/images/cognirise/pulse-hero.jpg";
    setMeta('meta[property="og:url"]', "content", canonical, true);
    setMeta('meta[property="og:image"]', "content", socialImage, true);
    setMeta('meta[name="twitter:image"]', "content", socialImage, true);
    setLink("canonical", canonical);
  }, [currentPath]);

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
    const pathname = itemHref.split("#")[0];
    if (pathname === "/") return currentPath === "/";
    if (pathname === "/methodologies") return currentPath.startsWith("/methodologies");
    return currentPath.startsWith(pathname);
  };

  const isCurrentDestination = (itemHref: string) => {
    return isCurrentRouteDestination(itemHref, location, window.location.hash);
  };

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header
        className="fixed top-0 z-50 flex h-[72px] w-full items-center border-b border-border bg-white/95 backdrop-blur transition-colors duration-300 md:h-[82px]"
      >
        <div className="home-layout-frame flex w-full min-w-0 items-center justify-between">
          <Link href="/" className="relative z-50 flex h-full shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2">
            <img
              src={assetUrl("images/cognirise/logo-blue.svg")}
              alt="Cognirise"
              className="h-[48px] w-[170px] origin-left object-contain object-left md:h-[54px] md:w-[190px] xl:w-[205px]"
            />
          </Link>

          <nav className="hidden min-w-0 h-full items-center xl:flex">
            <ul className="flex items-center gap-0 2xl:gap-2">
              {visibleNavigation.map((item) => (
                <li
                  key={item.id}
                  className="relative h-full flex items-center px-1.5 2xl:px-4"
                  onMouseEnter={() => item.items ? handleMouseEnter(item.label) : handleMouseLeave()}
                  onMouseLeave={handleMouseLeave}
                  onFocus={() => item.items && handleMouseEnter(item.label)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      handleMouseLeave();
                    }
                  }}
                >
                  <Link
                    id={`desktop-nav-${item.id}`}
                    href={marketAwareDestination(item.href, market, locale)}
                    className="group flex items-center gap-1.5 py-2 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-4"
                    aria-expanded={item.items ? activeDropdown === item.label : undefined}
                    aria-controls={item.items ? `desktop-menu-${item.id}` : undefined}
                    aria-current={!item.items && isCurrentDestination(item.href) ? "page" : undefined}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        setActiveDropdown(null);
                        event.currentTarget.focus();
                      }
                    }}
                  >
                    <span
                      className={`whitespace-nowrap text-[12px] font-bold tracking-wide transition-colors 2xl:text-[13px] ${
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
                    <div id={`desktop-menu-${item.id}`} className="absolute top-[100%] pt-6 left-0 min-w-[260px] animate-in fade-in slide-in-from-top-2 duration-200 z-50">
                      <div className="bg-white border border-border shadow-xl p-6 relative">
                        {/* Top accent line */}
                        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                        
                        <ul className="flex flex-col gap-3 relative z-10">
                          {item.items.map((subItem, index) => (
                            <Fragment key={subItem.id}>
                              {subItem.group && item.items?.[index - 1]?.group !== subItem.group && (
                                <li className={`pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground ${subItem.group === "partner" ? "mt-2 border-t border-border pt-4" : ""}`} aria-label={subItem.group === "own" ? "Cognirise-owned platforms" : "Partner platforms"}>
                                  {subItem.group === "own" ? "Own platforms" : "Partner platforms"}
                                </li>
                              )}
                            <li>
                              <Link 
                                href={marketAwareDestination(subItem.href, market, locale)}
                                aria-current={isCurrentDestination(subItem.href) ? "page" : undefined}
                                className={`group flex items-center gap-3 rounded-sm text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${
                                   isCurrentDestination(subItem.href) ? "text-[hsl(var(--brand-pink))]" : "text-[hsl(var(--brand-deep))] hover:text-[hsl(var(--brand-pink))]"
                                }`}
                                onKeyDown={(event) => {
                                  if (event.key === "Escape") {
                                    document.getElementById(`desktop-nav-${item.id}`)?.focus();
                                    setActiveDropdown(null);
                                  }
                                }}
                              >
                                <div className={`w-0 overflow-hidden transition-all group-hover:w-3 ${isCurrentDestination(subItem.href) ? "w-3" : ""}`}>
                                  <div className="h-[2px] w-3 bg-[hsl(var(--brand-coral))]" />
                                </div>
                                {subItem.label}
                              </Link>
                            </li>
                            </Fragment>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="relative z-50 hidden shrink-0 items-center gap-3 2xl:gap-6 xl:flex">
            {marketContext ? (
              <span className="text-xs font-bold uppercase tracking-widest text-[hsl(var(--brand-deep))]">
                Preview · {getMarketLocationLabel(market)}
              </span>
            ) : import.meta.env?.DEV && marketOptions.length > 0 ? (
              <ReviewVersionSelect markets={marketOptions} market={market} onSelect={setMarket} />
            ) : null}
            <BrandButton href="/value-scan" className="shrink-0 px-4 2xl:px-6">Bring us one process</BrandButton>
          </div>

          <button
            className="xl:hidden p-2 -mr-2 relative z-50 rounded-sm text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
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
              <div key={item.id} className="flex flex-col border-b border-border last:border-0">
                <div className="flex items-center justify-between py-4">
                  <Link
                    href={marketAwareDestination(item.href, market, locale)}
                    aria-current={!item.items && isCurrentDestination(item.href) ? "page" : undefined}
                    className={`rounded-sm text-xl font-display font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${isCurrentSection(item.href) ? 'text-[hsl(var(--brand-pink))]' : 'text-[hsl(var(--brand-deep))]'}`}
                  >
                    {item.label}
                  </Link>
                  {item.items && (
                    <button
                      type="button"
                      onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                      aria-label={`${mobileExpanded === item.label ? "Collapse" : "Expand"} ${item.label}`}
                      aria-expanded={mobileExpanded === item.label}
                      aria-controls={`mobile-menu-${item.id}`}
                      className="p-2 -mr-2 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
                    >
                      {mobileExpanded === item.label ? 
                        <ChevronDown className="h-5 w-5 text-[hsl(var(--brand-pink))]" /> : 
                        <ChevronRight className="h-5 w-5 text-muted-foreground" />
                      }
                    </button>
                  )}
                </div>
                
                {item.items && mobileExpanded === item.label && (
                  <ul id={`mobile-menu-${item.id}`} className="flex flex-col gap-3 pb-6 pl-4 border-l border-border/50 ml-2">
                    {item.items.map((subItem, index) => (
                      <Fragment key={subItem.id}>
                        {subItem.group && item.items?.[index - 1]?.group !== subItem.group && (
                          <li className={`pt-2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground ${subItem.group === "partner" ? "mt-2 border-t border-border pt-4" : ""}`} aria-label={subItem.group === "own" ? "Cognirise-owned platforms" : "Partner platforms"}>
                            {subItem.group === "own" ? "Own platforms" : "Partner platforms"}
                          </li>
                        )}
                      <li>
                        <Link 
                          href={marketAwareDestination(subItem.href, market, locale)}
                          aria-current={isCurrentDestination(subItem.href) ? "page" : undefined}
                          className={`rounded-sm text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${
                             isCurrentDestination(subItem.href) ? "text-[hsl(var(--brand-pink))]" : "text-muted-foreground hover:text-[hsl(var(--brand-deep))]"
                          }`}
                        >
                          {subItem.label}
                        </Link>
                      </li>
                      </Fragment>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="pt-8">
              <BrandButton href="/value-scan" className="w-full justify-center">Bring us one process</BrandButton>
            </div>
          </nav>
          
          {marketContext ? (
            <div className="pb-12 border-t border-border pt-8 text-xs font-bold uppercase tracking-widest text-[hsl(var(--brand-deep))]">
              Preview · {getMarketLocationLabel(market)}
            </div>
          ) : import.meta.env?.DEV && marketOptions.length > 0 ? (
            <div className="pb-12 border-t border-border pt-8">
              <ReviewVersionSelect markets={marketOptions} market={market} onSelect={setMarket} />
            </div>
          ) : null}
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
        
        <div className="home-layout-frame relative z-10">
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
                  Market view · {getMarketLocationLabel(market)}
                </p>
              </div>
            </div>
            
            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-6">Capability</h4>
              <ul className="flex flex-col gap-3 text-sm text-white/80 font-semibold">
                {capabilityFooterLinks.map((item) => (
                  <li key={item.href}><Link href={item.href} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">{item.label}</Link></li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-6">Company</h4>
              <ul className="flex flex-col gap-3 text-sm text-white/80 font-semibold">
                {companyFooterLinks.map((item) => (
                  <li key={item.href}><Link href={item.href} className="hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">{item.label}</Link></li>
                ))}
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
