import { useEffect } from "react";
import { useMarketStore } from "@/store/market";
import { useLocation } from "wouter";
import { useReleaseContext } from "@/lib/releases";

export const STATIC_SITEMAP_PATHS: string[] = [];

export function mergeSitemapItems(items: Array<{ url: string }>, origin: string, unavailablePaths = new Set<string>()) {
   const redirectPaths = new Set([
     "/services", "/what-we-do", "/work", "/work/",
     "/cognitalk", "/platforms/cognitalk", "/cogniware", "/platforms/cogniware",
   ]);
  const routableItems = items.filter((entry) => {
    const path = new URL(entry.url, origin).pathname;
    return path !== "/advisors" && !redirectPaths.has(path) && !unavailablePaths.has(path);
  });
  const merged = [
    ...routableItems,
    ...STATIC_SITEMAP_PATHS.filter((path) => !unavailablePaths.has(path)).map((path) => ({ url: `${origin}${path}` })),
  ];
  return merged.filter((entry, index) => {
    const path = new URL(entry.url, origin).pathname;
    return merged.findIndex((candidate) => new URL(candidate.url, origin).pathname === path) === index;
  });
}

export function PublicSitemap() {
  const { market, locale } = useMarketStore();
  const releaseContext = useReleaseContext();
  const [location] = useLocation();
  const isPreview = location.split(/[?#]/)[0].startsWith("/preview/");

  useEffect(() => {
    const id = "public-sitemap-jsonld";
    document.getElementById(id)?.remove();
    if (isPreview) return;
    const routes = releaseContext?.release.manifest.revisions
      .flatMap((revision) => revision.route ? [{ url: `${window.location.origin}${revision.route}` }] : []) ?? [];
    if (!routes.length) return;
    const allItems = mergeSitemapItems(routes, window.location.origin);

    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: allItems.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: entry.url,
      })),
    });
    document.head.appendChild(script);
    return () => script.remove();
  }, [isPreview, market, locale, releaseContext]);

  return null;
}