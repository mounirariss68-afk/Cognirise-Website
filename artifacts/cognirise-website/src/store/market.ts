import { useSyncExternalStore } from "react";

export type Market = string;

export interface PublicMarket {
  code: string;
  displayName?: string;
  defaultLocale?: string;
  locales?: ReadonlyArray<string>;
  locationLabel?: string;
}

export const MARKET_OPTIONS: ReadonlyArray<{
  id: Market;
  compactLabel: string;
  label: string;
  locationLabel: string;
}> = [
  { id: "uae", compactLabel: "UAE", label: "United Arab Emirates", locationLabel: "Dubai · UAE" },
  { id: "ksa", compactLabel: "KSA", label: "Saudi Arabia", locationLabel: "Riyadh · Kingdom of Saudi Arabia" },
  { id: "turkiye", compactLabel: "TR", label: "Türkiye", locationLabel: "Türkiye" },
  { id: "europe", compactLabel: "EU", label: "Europe", locationLabel: "Europe" },
];

export const OFFICE_LOCATIONS = {
  dubai: {
    city: "Dubai",
    address: "Office 1914, The Binary by Omniyat, Business Bay, PO Box 71515, Dubai, UAE",
  },
  riyadh: {
    city: "Riyadh",
    address: "Office 27, First Floor, 3483 Anas Bin Malik Road, Riyadh, Kingdom of Saudi Arabia",
  },
  london: {
    city: "London",
    address: "34-37 Liverpool St, London EC2M 7PP, United Kingdom",
  },
  amsterdam: {
    city: "Amsterdam",
    address: "Keizersgracht 452, Amsterdam, Netherlands",
  },
} as const;

const listeners = new Set<() => void>();
const knownMarkets = new Set<Market>(MARKET_OPTIONS.map(({ id }) => id));
let enabledMarkets = new Set<Market>(knownMarkets);
let publicMarketsLoaded = false;
let configuredCanonicalMarket: Market = "uae";
let configuredMarkets = new Map<string, PublicMarket>();

export function isMarket(value: string | null): value is Market {
  return Boolean(value && (publicMarketsLoaded ? enabledMarkets.has(value) : knownMarkets.has(value)));
}

export function getMarketLocationLabel(market: Market): string {
  const configured = configuredMarkets.get(market);
  return configured?.locationLabel
    ?? configured?.displayName
    ?? MARKET_OPTIONS.find(({ id }) => id === market)?.locationLabel
    ?? market.toUpperCase();
}

export function resolveMarket(search: string, stored: string | null): Market {
  const fromUrl = new URLSearchParams(search).get("market");
  if (isMarket(fromUrl)) return fromUrl;
  return isMarket(stored) ? stored : configuredCanonicalMarket;
}

function initialMarket(): Market {
  if (typeof window === "undefined") return "uae";
  return resolveMarket(window.location.search, window.localStorage.getItem("cognirise-market"));
}

let currentMarket = initialMarket();
let currentLocale = typeof window === "undefined"
  ? "en"
  : new URLSearchParams(window.location.search).get("locale") || "en";

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function localeForMarket(market: Market, requested?: string | null): string {
  const configuration = configuredMarkets.get(market);
  if (!configuration) return requested || currentLocale || "en";
  const allowed = new Set([
    configuration.defaultLocale,
    ...(configuration.locales ?? []),
  ].filter((locale): locale is string => Boolean(locale)));
  if (requested && (allowed.size === 0 || allowed.has(requested))) return requested;
  return configuration.defaultLocale ?? allowed.values().next().value ?? "en";
}

function applyMarketState(market: Market, locale: string, updateUrl: boolean): boolean {
  const changed = currentMarket !== market || currentLocale !== locale;
  currentMarket = market;
  currentLocale = locale;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("cognirise-market", market);
    if (updateUrl) {
      const url = new URL(window.location.href);
      url.searchParams.set("market", market);
      url.searchParams.set("locale", locale);
      window.history.replaceState(window.history.state, "", url);
    }
  }
  if (changed) listeners.forEach((listener) => listener());
  return changed;
}

export function setMarket(market: string, locale?: string): boolean {
  if (!isMarket(market)) return false;
  applyMarketState(market, localeForMarket(market, locale), true);
  return true;
}

export function configurePublicMarkets(
  markets: ReadonlyArray<string | PublicMarket>,
  canonicalMarket?: string,
) {
  const entries = markets
    .map((market) => typeof market === "string" ? { code: market } : market)
    .filter((market) => Boolean(market.code));
  const next = new Set(entries.map(({ code }) => code));
  configuredMarkets = new Map(entries.map((market) => [market.code, market]));
  enabledMarkets = next;
  publicMarketsLoaded = true;
  configuredCanonicalMarket = canonicalMarket && next.has(canonicalMarket)
    ? canonicalMarket
    : next.values().next().value ?? "uae";

  let selectedMarket = next.has(currentMarket) ? currentMarket : configuredCanonicalMarket;
  let requestedLocale: string | null = null;
  if (typeof window !== "undefined") {
    const query = new URLSearchParams(window.location.search);
    const requested = query.get("market");
    if (requested && next.has(requested)) {
      selectedMarket = requested;
    } else {
      const stored = window.localStorage.getItem("cognirise-market");
      if (stored && next.has(stored)) selectedMarket = stored;
    }
    requestedLocale = query.get("locale");
  }
  if (next.size) {
    applyMarketState(selectedMarket, localeForMarket(selectedMarket, requestedLocale), false);
  }
}

function setLocale(locale: string) {
  const nextLocale = localeForMarket(currentMarket, locale);
  if (nextLocale === currentLocale) return;
  currentLocale = nextLocale;
  if (typeof window !== "undefined") {
    const url = new URL(window.location.href);
    url.searchParams.set("locale", nextLocale);
    window.history.replaceState(window.history.state, "", url);
  }
  listeners.forEach((listener) => listener());
}

export function registerMarketHistoryListener() {
  if (typeof window === "undefined") return () => {};
  const handlePopState = () => {
    const query = new URLSearchParams(window.location.search);
    const nextMarket = resolveMarket(window.location.search, window.localStorage.getItem("cognirise-market"));
    const nextLocale = localeForMarket(nextMarket, query.get("locale"));
    applyMarketState(nextMarket, nextLocale, false);
  };
  window.addEventListener("popstate", handlePopState);
  return () => window.removeEventListener("popstate", handlePopState);
}

if (typeof window !== "undefined") {
  registerMarketHistoryListener();
}

export function useMarketStore() {
  const market = useSyncExternalStore(
    subscribe,
    () => currentMarket,
    () => "uae" as Market,
  );
  const locale = useSyncExternalStore(subscribe, () => currentLocale, () => "en");

  return { market, locale, setMarket, setLocale };
}

export function getMarketState() {
  return { market: currentMarket, locale: currentLocale };
}
