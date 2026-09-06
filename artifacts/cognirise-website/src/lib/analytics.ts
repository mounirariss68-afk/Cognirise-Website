import { useEffect, useRef, useSyncExternalStore } from "react";
import { recordAnalyticsConsent, recordAnalyticsEvent } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { useMarketStore, type Market } from "@/store/market";

const CONSENT_KEY = "cognirise-analytics-consent";
const CONSENT_VERSION = "1";
const VISITOR_KEY = "cognirise-visitor-id";
const SESSION_KEY = "cognirise-session-id";
const listeners = new Set<() => void>();

function id(storage: Storage, key: string) {
  let value = storage.getItem(key);
  if (!value) {
    value = crypto.randomUUID();
    storage.setItem(key, value);
  }
  return value;
}

export function hasAnalyticsConsent() {
  return typeof window !== "undefined" && window.localStorage.getItem(CONSENT_KEY) === "granted";
}

export async function setAnalyticsConsent(analytics: boolean, marketing = false) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CONSENT_KEY, analytics ? "granted" : "denied");
  listeners.forEach((listener) => listener());
  await recordAnalyticsConsent({
    visitorId: id(window.localStorage, VISITOR_KEY),
    version: CONSENT_VERSION,
    analytics,
    marketing,
    source: "website",
  });
}

export function useAnalyticsConsent() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    hasAnalyticsConsent,
    () => false,
  );
}

export function trackEvent(name: string, market: Market, properties?: Record<string, unknown>) {
  if (!hasAnalyticsConsent() || typeof window === "undefined") return;
  void recordAnalyticsEvent({
    visitorId: id(window.localStorage, VISITOR_KEY),
    sessionId: id(window.sessionStorage, SESSION_KEY),
    name,
    occurredAt: new Date().toISOString(),
    page: `${window.location.pathname}${window.location.search}`,
    referrer: document.referrer || null,
    market,
    properties,
    consentVersion: CONSENT_VERSION,
  }).catch(() => {
    // Analytics must never interrupt the visitor journey.
  });
}

export function AnalyticsBridge() {
  const [location] = useLocation();
  const { market } = useMarketStore();
  const consent = useAnalyticsConsent();
  const previousMarket = useRef(market);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("market") !== market) {
      url.searchParams.set("market", market);
      window.history.replaceState(window.history.state, "", url);
    }
    if (consent) {
      trackEvent("page_view", market);
      if (previousMarket.current !== market) {
        trackEvent("market_change", market, { from: previousMarket.current, to: market });
      }
    }
    previousMarket.current = market;
  }, [consent, location, market]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest<HTMLAnchorElement>("a[href]");
      if (!anchor || anchor.classList.contains("pulse-action")) return;
      const destination = new URL(anchor.href, window.location.href).pathname;
      if (destination === "/value-scan" || destination === "/contact") {
        trackEvent("cta_click", market, {
          label: anchor.textContent?.trim().slice(0, 120),
          destination,
        });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [market]);

  return null;
}