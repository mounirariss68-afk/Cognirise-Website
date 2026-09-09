import { useSyncExternalStore } from "react";

export type Market = "uae" | "ksa" | "turkiye" | "europe";

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
    address: "The City, United Kingdom",
  },
} as const;

const markets = MARKET_OPTIONS.map(({ id }) => id);
const listeners = new Set<() => void>();

export function isMarket(value: string | null): value is Market {
  return markets.includes(value as Market);
}

export function getMarketLocationLabel(market: Market): string {
  return MARKET_OPTIONS.find(({ id }) => id === market)?.locationLabel ?? "Dubai · UAE";
}

export function resolveMarket(search: string, stored: string | null): Market {
  const fromUrl = new URLSearchParams(search).get("market");
  if (isMarket(fromUrl)) return fromUrl;
  return isMarket(stored) ? stored : "uae";
}

function initialMarket(): Market {
  if (typeof window === "undefined") return "uae";
  return resolveMarket(window.location.search, window.localStorage.getItem("cognirise-market"));
}

let currentMarket = initialMarket();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setMarket(market: Market) {
  currentMarket = market;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("cognirise-market", market);
    const url = new URL(window.location.href);
    url.searchParams.set("market", market);
    window.history.replaceState(window.history.state, "", url);
  }
  listeners.forEach((listener) => listener());
}

if (typeof window !== "undefined") {
  window.addEventListener("popstate", () => {
    const next = resolveMarket(window.location.search, window.localStorage.getItem("cognirise-market"));
    if (next !== currentMarket) {
      currentMarket = next;
      window.localStorage.setItem("cognirise-market", next);
      listeners.forEach((listener) => listener());
    }
  });
}

export function useMarketStore() {
  const market = useSyncExternalStore(
    subscribe,
    () => currentMarket,
    () => "uae" as Market,
  );

  return { market, setMarket };
}
