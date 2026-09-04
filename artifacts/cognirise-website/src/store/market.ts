import { useSyncExternalStore } from "react";

export type Market = "uae" | "ksa" | "turkiye" | "europe";

const markets: Market[] = ["uae", "ksa", "turkiye", "europe"];
const listeners = new Set<() => void>();

function initialMarket(): Market {
  if (typeof window === "undefined") return "uae";
  const stored = window.localStorage.getItem("cognirise-market");
  return markets.includes(stored as Market) ? (stored as Market) : "uae";
}

let currentMarket = initialMarket();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setMarket(market: Market) {
  currentMarket = market;
  window.localStorage.setItem("cognirise-market", market);
  listeners.forEach((listener) => listener());
}

export function useMarketStore() {
  const market = useSyncExternalStore(
    subscribe,
    () => currentMarket,
    () => "uae" as Market,
  );

  return { market, setMarket };
}
