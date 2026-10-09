import { Link, useLocation } from "wouter";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useState, useEffect, useRef } from "react";
import { MARKET_OPTIONS, useMarketStore } from "@/store/market";
import { assetUrl } from "@/lib/assets";
import { PulseMotionPage } from "@/components/motion/PulseMotionPage";
import { setAnalyticsConsent, useAnalyticsConsent } from "@/lib/analytics";
import { LAUNCH_POLICY, launchHrefAllowed } from "@workspace/api-zod";
import { LaunchLinkGuard } from "@/components/LaunchLinkGuard";
import { isCurrentRouteDestination, routePath } from "@/lib/routeState";
import { marketAwareDestination } from "@/lib/marketDestination";
import { BrandButton } from "@/components/ui/brand-button";
import { PAGE_META, NOT_FOUND_META, normalisePath } from "@/site/routes";
import { FOOTER } from "@/site/content/legal";

type NavigationItem = { id: string; label: string; href: string; group?: "own" | "partner"; items?: NavigationItem[] };

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

/** Kept for the CMS preview, which still owns the metadata of the method articles it previews. */
export const ROUTE_OWNED_METADATA_PATHS = new Set<string>([]);

/** The public menu: seven items and the one call to action. */
export const compiledNavigation: NavigationItem[] = [
  { id: "what-we-do", label: "What we do", href: "/what-we-do" },
  { id: "how-we-work", label: "How we work", href: "/how-we-work" },
  {
    id: "industries",
    label: "Industries",
    href: "/industries",
    items: [
      { id: "industries.financial-services", label: "Financial Services", href: "/industries/financial-services" },
      { id: "industries.telecoms", label: "Telecoms", href: "/industries/telecoms" },
      { id: "industries.public-sector", label: "Public Sector", href: "/industries/public-sector" },
      { id: "industries.energy-resources", label: "Energy & Resources", href: "/industries/energy-resources" },
      { id: "industries.travel-hospitality", label: "Travel & Hospitality", href: "/industries/travel-hospitality" },
      { id: "industries.education", label: "Education", href: "/industries/education" },
      { id: "industries.manufacturing", label: "Manufacturing", href: "/industries/manufacturing" },
    ],
  },
  { id: "cognios", label: "CogniOS", href: "/platforms/cognios" },
  { id: "case-studies", label: "Case studies", href: "/case-studies" },
  { id: "methods", label: "Methods", href: "/methodologies" },
  {
    id: "about",
    label: "About",
    href: "/about",
    items: [
      { id: "about.core-values", label: "Core values", href: "/about/core-values" },
      { id: "about.contact", label: "Contact", href: "/about#contact" },
    ],
  },
];

export const HEADER_CTA = { label: "Book a Value Scan", href: "/value-scan" };

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
      <button type="button" className="underline underline-offset-4 hover:text-white disabled:opacity-50" onClick={update} disabled={saving}>
        {saving ? "Saving…" : enabled ? "Disable" : "Allow"}
      </button>
      {error && <span role="alert" className="text-[hsl(var(--brand-coral))]">{error}</span>}
    </div>
  );
}

/** A plain market selector in the footer; it sets the market the site already remembers. */
function MarketSelect({ market, onSelect }: { market: string; onSelect: (code: string) => void }) {
  return (
    <label className="flex flex-col gap-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">
      {FOOTER.marketLabel}
      <select
        aria-label={FOOTER.marketLabel}
        value={MARKET_OPTIONS.some((option) => option.id === market) ? market : "uae"}
        onChange={(event) => onSelect(event.target.value)}
        className="h-9 w-full max-w-[200px] rounded-sm border border-white/20 bg-white/10 px-2 text-xs font-semibold normal-case tracking-normal text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] [&>option]:text-[hsl(var(--brand-deep))]"
      >
        {MARKET_OPTIONS.map((option) => (
          <option key={option.id} value={option.id}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

function snapshotToNavigation(snapshot: PreviewNavigationSnapshot): NavigationItem[] | null {
  const snapshotItems = snapshot.items ?? [];
  if (snapshotItems.length === 0) return null;
  const childrenByParent = new Map<string, NavigationItem[]>();
  for (const raw of snapshotItems) {
    if (raw.visible === false || raw.enabled === false) continue;
    const id = String(raw.id ?? raw.item_id ?? "");
    const parentId = raw.parentId ?? raw.parent_id;
    const item: NavigationItem = { id, label: String(raw.label ?? ""), href: String(raw.destination ?? raw.href ?? "#") };
    const key = parentId == null ? "" : String(parentId);
    const siblings = childrenByParent.get(key) ?? [];
    siblings.push(item);
    childrenByParent.set(key, siblings);
  }
  const order = (id: string) => {
    const raw = snapshotItems.find((candidate) => String(candidate.id ?? candidate.item_id ?? "") === id);
    return Number(raw?.order ?? raw?.sort_order ?? 0);
  };
  const build = (items: NavigationItem[]): NavigationItem[] => items
    .sort((a, b) => order(a.id) - order(b.id))
    .map((item) => {
      const nested = build(childrenByParent.get(item.id) ?? []);
      return nested.length ? { ...item, items: nested } : item;
    });
  return build(childrenByParent.get("") ?? []);
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
  const [location] = useLocation();
  const { market: publicMarket, locale: publicLocale, setMarket } = useMarketStore();
  const market = marketContext?.market ?? publicMarket;
  const locale = marketContext?.locale ?? publicLocale;

  const previewNavigation = navigationOverride ? snapshotToNavigation(navigationOverride) : null;
  const filterAvailable = (items: NavigationItem[]): NavigationItem[] => items.flatMap((item) => {
    if (!navigationOverride && !launchHrefAllowed(item.href)) return [];
    const children = item.items ? filterAvailable(item.items) : undefined;
    return [{ ...item, items: children?.length ? children : undefined }];
  });
  const visibleNavigation = filterAvailable(previewNavigation ?? compiledNavigation);

  const [scrolled, setScrolled] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousPathRef = useRef(window.location.pathname);
  const currentPath = normalisePath(location);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
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

  // Browser title, description, canonical and social tags, one record per page.
  useEffect(() => {
    if (currentPath.startsWith("/preview/")) return;
    const known = PAGE_META[currentPath];
    const meta = known ?? NOT_FOUND_META;

    document.title = meta.title;

    const setMeta = (selector: string, attribute: string, value: string) => {
      let node = document.head.querySelector<HTMLMetaElement>(selector);
      if (!node) {
        node = document.createElement("meta");
        const match = selector.match(/\[([a-zA-Z-]+)="([^"]+)"\]/);
        if (match) node.setAttribute(match[1], match[2]);
        document.head.appendChild(node);
      }
      node.setAttribute(attribute, value);
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

    setMeta('meta[name="description"]', "content", meta.description);
    setMeta('meta[property="og:title"]', "content", meta.title);
    setMeta('meta[property="og:description"]', "content", meta.description);
    setMeta('meta[name="twitter:title"]', "content", meta.title);
    setMeta('meta[name="twitter:description"]', "content", meta.description);
    const canonical = window.location.origin + currentPath;
    const socialImage = window.location.origin + "/images/cognirise/pulse-hero.jpg";
    setMeta('meta[property="og:url"]', "content", canonical);
    setMeta('meta[property="og:image"]', "content", socialImage);
    setMeta('meta[name="twitter:image"]', "content", socialImage);
    if (!known || !launchHrefAllowed(currentPath)) {
      setMeta('meta[name="robots"]', "content", "noindex,nofollow");
      document.head.querySelector('link[rel="canonical"]')?.remove();
    } else {
      setMeta('meta[name="robots"]', "content", "index,follow");
      setLink("canonical", canonical);
    }
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
      if (document.activeElement?.closest("li")?.querySelector('[aria-expanded="true"]')
        || document.activeElement?.closest('[id^="desktop-menu-"]')) return;
      setActiveDropdown(null);
    }, 200);
  };

  const isCurrentSection = (itemHref: string) => {
    const pathname = itemHref.split("#")[0];
    if (pathname === "/") return currentPath === "/";
    return currentPath === pathname || currentPath.startsWith(`${pathname}/`);
  };

  const isCurrentDestination = (itemHref: string) => isCurrentRouteDestination(itemHref, location, window.location.hash);

  const footerLinks = (items: Array<{ href: string; label: string }>) =>
    items.filter((item) => navigationOverride || launchHrefAllowed(item.href));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className={`fixed top-0 z-50 flex h-[72px] w-full items-center border-b border-border bg-white/95 backdrop-blur transition-colors duration-300 md:h-[82px] ${scrolled ? "shadow-[0_1px_0_rgba(16,41,87,0.06)]" : ""}`}>
        <div className="home-layout-frame flex w-full min-w-0 items-center justify-between gap-6">
          <Link href="/" className="relative z-50 flex h-full shrink-0 items-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2">
            <img
              src={assetUrl("images/cognirise/logo-blue.svg")}
              alt="Cognirise"
              className="h-[48px] w-[170px] origin-left object-contain object-left md:h-[54px] md:w-[190px] xl:w-[205px]"
            />
          </Link>

          <nav className="hidden h-full min-w-0 items-center xl:flex" aria-label="Main">
            <ul className="flex items-center gap-0 2xl:gap-2">
              {visibleNavigation.map((item) => (
                <li
                  key={item.id}
                  className="relative flex h-full items-center px-1.5 2xl:px-4"
                  onMouseEnter={() => item.items ? handleMouseEnter(item.label) : handleMouseLeave()}
                  onMouseLeave={handleMouseLeave}
                  onFocus={() => item.items && handleMouseEnter(item.label)}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) handleMouseLeave();
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
                    <span className={`whitespace-nowrap text-[12px] font-bold tracking-wide transition-colors 2xl:text-[13px] ${isCurrentSection(item.href) ? "text-[hsl(var(--brand-pink))]" : "text-[hsl(var(--brand-deep))] group-hover:text-[hsl(var(--brand-pink))]"}`}>
                      {item.label}
                    </span>
                    {item.items && (
                      <ChevronDown className={`h-3 w-3 transition-transform ${activeDropdown === item.label ? "rotate-180 text-[hsl(var(--brand-pink))]" : "text-muted-foreground"}`} />
                    )}
                  </Link>

                  {item.items && activeDropdown === item.label && (
                    <div id={`desktop-menu-${item.id}`} className="absolute left-0 top-[100%] z-50 min-w-[260px] animate-in fade-in slide-in-from-top-2 pt-6 duration-200">
                      <div className="relative border border-border bg-white p-6 shadow-xl">
                        <div className="absolute left-0 right-0 top-0 h-[2px] bg-gradient-to-r from-[hsl(var(--brand-violet))] to-[hsl(var(--brand-coral))]" />
                        <ul className="relative z-10 flex flex-col gap-3">
                          {item.items.map((subItem) => (
                            <Fragment key={subItem.id}>
                              <li>
                                <Link
                                  href={marketAwareDestination(subItem.href, market, locale)}
                                  aria-current={isCurrentDestination(subItem.href) ? "page" : undefined}
                                  className={`group flex items-center gap-3 rounded-sm text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${isCurrentDestination(subItem.href) ? "text-[hsl(var(--brand-pink))]" : "text-[hsl(var(--brand-deep))] hover:text-[hsl(var(--brand-pink))]"}`}
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

          <div className="hidden shrink-0 items-center xl:flex">
            <BrandButton href={HEADER_CTA.href} className="!px-5 !py-2.5 text-[12px]">{HEADER_CTA.label}</BrandButton>
          </div>

          <button
            className="relative z-50 -mr-2 rounded-sm p-2 text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] xl:hidden"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </header>

      {!navigationOverride && <LaunchLinkGuard />}
      <div className="h-[72px] shrink-0 md:h-[82px]" />

      {isOpen && (
        <div className="fixed inset-0 top-[72px] z-40 overflow-y-auto bg-white px-6 py-8 animate-in fade-in duration-200 md:top-[82px] xl:hidden">
          <nav className="flex flex-col gap-2 pb-12" aria-label="Main">
            {visibleNavigation.map((item) => (
              <div key={item.id} className="flex flex-col border-b border-border last:border-0">
                <div className="flex items-center justify-between py-4">
                  <Link
                    href={marketAwareDestination(item.href, market, locale)}
                    aria-current={!item.items && isCurrentDestination(item.href) ? "page" : undefined}
                    className={`rounded-sm font-display text-xl font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${isCurrentSection(item.href) ? "text-[hsl(var(--brand-pink))]" : "text-[hsl(var(--brand-deep))]"}`}
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
                      className="-mr-2 rounded-sm p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
                    >
                      {mobileExpanded === item.label
                        ? <ChevronDown className="h-5 w-5 text-[hsl(var(--brand-pink))]" />
                        : <ChevronRight className="h-5 w-5 text-muted-foreground" />}
                    </button>
                  )}
                </div>
                {item.items && mobileExpanded === item.label && (
                  <ul id={`mobile-menu-${item.id}`} className="ml-2 flex flex-col gap-3 border-l border-border/50 pb-6 pl-4">
                    {item.items.map((subItem) => (
                      <li key={subItem.id}>
                        <Link
                          href={marketAwareDestination(subItem.href, market, locale)}
                          aria-current={isCurrentDestination(subItem.href) ? "page" : undefined}
                          className={`rounded-sm text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 ${isCurrentDestination(subItem.href) ? "text-[hsl(var(--brand-pink))]" : "text-muted-foreground hover:text-[hsl(var(--brand-deep))]"}`}
                        >
                          {subItem.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="pt-6">
              <BrandButton href={HEADER_CTA.href}>{HEADER_CTA.label}</BrandButton>
            </div>
          </nav>
        </div>
      )}

      <main className="flex-1">
        <PulseMotionPage pathname={location.split("?")[0]}>{children}</PulseMotionPage>
      </main>

      <footer className="relative mt-auto overflow-hidden border-t border-border bg-[hsl(var(--brand-deep))] pb-12 pt-16 text-white">
        <div aria-hidden="true" className="pointer-events-none absolute right-[-10%] top-[-20%] select-none font-display text-[25vw] font-semibold leading-[0.7] tracking-tighter text-white/5">
          COGNIRISE
        </div>

        <div className="home-layout-frame relative z-10">
          <div className="mb-16 grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
            <div className="flex flex-col gap-6">
              <Link href="/">
                <img src={assetUrl("images/cognirise/logo-white.svg")} alt="Cognirise" className="h-12 w-[180px] origin-left object-contain object-left" />
              </Link>
              <p className="max-w-[280px] text-sm text-white/70">{FOOTER.line}</p>
              {marketContext
                ? <p className="text-xs font-bold uppercase tracking-widest text-white/80">Preview · {market.toUpperCase()}</p>
                : <MarketSelect market={market} onSelect={(code) => { setMarket(code); }} />}
            </div>

            {FOOTER.columns.map((column) => (
              <div key={column.heading}>
                <h4 className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">{column.heading}</h4>
                <ul className="flex flex-col gap-3 text-sm font-semibold text-white/80">
                  {footerLinks(column.links).map((item) => (
                    <li key={item.href}><Link href={item.href} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">{item.label}</Link></li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4 className="mb-6 text-[10px] font-semibold uppercase tracking-widest text-white/40">{FOOTER.offices.heading}</h4>
              <ul className="flex flex-col gap-3 text-sm font-semibold text-white/80">
                {FOOTER.offices.cities.map((city) => <li key={city}>{city}</li>)}
                <li><a href={`mailto:${FOOTER.offices.email}`} className="transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-white">{FOOTER.offices.email}</a></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-xs font-semibold text-white/50 md:flex-row md:items-center">
            <p>© {new Date().getFullYear()} {FOOTER.legalEntity}. All rights reserved.</p>
            <div className="flex flex-wrap items-center gap-6">
              <Link href={FOOTER.privacy.href} className="underline underline-offset-4 hover:text-white">{FOOTER.privacy.label}</Link>
              <AnalyticsPreference />
            </div>
          </div>
          {LAUNCH_POLICY.enabled && (
            <p className="mt-4 text-xs text-white/50">
              {FOOTER.consentLine.replace(" See the privacy notice.", "")}{" "}
              <Link href={FOOTER.privacy.href} className="underline underline-offset-4 hover:text-white">See the privacy notice.</Link>
            </p>
          )}
        </div>
      </footer>
    </div>
  );
}
