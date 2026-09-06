import { useSyncExternalStore } from "react";

export type Market = "uae" | "ksa" | "turkiye" | "europe";

const markets: Market[] = ["uae", "ksa", "turkiye", "europe"];
const listeners = new Set<() => void>();

export function isMarket(value: string | null): value is Market {
  return markets.includes(value as Market);
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
