import { useEffect, useState } from "react";
import { useMarketStore } from "@/store/market";
import { LAUNCH_POLICY } from "@workspace/api-zod";
import { assetUrl } from "./assets";

export type ImageRegion = "uae" | "ksa" | "turkiye" | "europe";
export function countryImageRegion(country: string): ImageRegion {
  return ({ AE: "uae", SA: "ksa", TR: "turkiye" } as Record<string, ImageRegion>)[country.toUpperCase()] ?? "europe";
}
export function launchAudienceEnabled() {
  return LAUNCH_POLICY.enabled && !window.location.pathname.includes("/preview/");
}
let detected: Promise<ImageRegion> | undefined;
let sessionChoice: ImageRegion | null = null;
function detectRegion() {
  // Country-only public lookup; no GPS permission or coordinates. Do not send
  // cookies, page URLs, CMS identifiers, or other personal data to the provider.
  return detected ??= fetch("https://api.country.is/", {
    credentials: "omit", referrerPolicy: "no-referrer", signal: AbortSignal.timeout(2500),
  }).then(async (response) => {
    if (!response.ok) throw new Error("Country lookup unavailable");
    const body = await response.json();
    return countryImageRegion(typeof body.country === "string" ? body.country : "");
  }).catch(() => "europe" as const);
}
export function useLaunchImageRegion() {
  const { market, setMarket } = useMarketStore();
  const [automatic, setAutomatic] = useState<ImageRegion | null>(null);
  const explicit = new URLSearchParams(window.location.search).get("market");
  const selected = explicit && ["uae", "ksa", "turkiye", "europe"].includes(explicit) ? explicit as ImageRegion : null;
  if (selected && launchAudienceEnabled()) sessionChoice = selected;
  useEffect(() => {
    let active = true;
    if (launchAudienceEnabled() && !selected && !sessionChoice) void detectRegion().then((region) => {
      if (active) {
        // A manual choice made while the lookup was pending must win, even
        // when it selected the existing market and did not notify the store.
        const now = new URLSearchParams(window.location.search).get("market");
        if (now && ["uae", "ksa", "turkiye", "europe"].includes(now)) {
          sessionChoice = now as ImageRegion;
          setAutomatic(sessionChoice);
          return;
        }
        setAutomatic(region);
        // Preserve the detected image region in subsequent market-aware links.
        setMarket(region);
      }
    });
    return () => { active = false; };
  }, [selected, market]);
  return selected ?? sessionChoice ?? automatic;
}
export function launchStageImage(region: ImageRegion, stage: string) {
  return assetUrl(region === "uae"
    ? `/images/cognirise/blueprint-${stage}.jpg`
    : `/images/cognirise/idao/${region}/${stage}.jpg`);
}
