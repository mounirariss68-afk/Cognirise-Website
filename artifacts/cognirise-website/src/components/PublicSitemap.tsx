import { useEffect } from "react";
import { launchHrefAllowed } from "@workspace/api-zod";
import { useLocation } from "wouter";
import { PUBLIC_PATHS } from "@/site/routes";

export const STATIC_SITEMAP_PATHS: string[] = [];

export function mergeSitemapItems(items: Array<{ url: string }>, origin: string, unavailablePaths = new Set<string>()) {
   const redirectPaths = new Set([
     "/services", "/work", "/work/",
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
    if (!launchHrefAllowed(entry.url)) return false;
    const path = new URL(entry.url, origin).pathname;
    return merged.findIndex((candidate) => new URL(candidate.url, origin).pathname === path) === index;
  });
}

export function PublicSitemap() {
  const [location] = useLocation();
  const isPreview = location.split(/[?#]/)[0].startsWith("/preview/");

  useEffect(() => {
    const id = "public-sitemap-jsonld";
    document.getElementById(id)?.remove();
    if (isPreview) return;
    // The public pages are code-owned; the list is the route table, not a CMS release.
    const allItems = mergeSitemapItems(PUBLIC_PATHS.map((path) => ({ url: `${window.location.origin}${path}` })), window.location.origin);

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
  }, [isPreview]);

  return null;
}
