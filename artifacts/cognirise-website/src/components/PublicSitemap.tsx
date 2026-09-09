import { useEffect } from "react";
import { useGetPublicNavigationSettings, useGetPublicSitemap } from "@workspace/api-client-react";
import { useMarketStore } from "@/store/market";
import { ALLIANCE_PLATFORM_LIST } from "@/lib/alliancePlatforms";
import { useLocation } from "wouter";

export const STATIC_SITEMAP_PATHS = [
  "/methodologies/idao",
  "/methodologies/agent-authority-model",
  ...ALLIANCE_PLATFORM_LIST.map(({ slug }) => `/platforms/${slug}`),
];

export function mergeSitemapItems(items: Array<{ url: string }>, origin: string, unavailablePaths = new Set<string>()) {
  const redirectPaths = new Set(["/services", "/what-we-do"]);
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
  const [location] = useLocation();
  const isPreview = location.split(/[?#]/)[0].startsWith("/preview/");
  const sitemap = useGetPublicSitemap({ market, locale }, {
    query: { queryKey: ["public-sitemap", market, locale], enabled: !isPreview },
  });
  const navigation = useGetPublicNavigationSettings({ market, locale }, {
    query: { queryKey: ["public-navigation", market, locale], enabled: !isPreview },
  });

  useEffect(() => {
    const id = "public-sitemap-jsonld";
    document.getElementById(id)?.remove();
    if (isPreview) return;
    if (!sitemap.data?.items.length) return;
    const unavailable = new Set(navigation.data?.isConfigured
      ? navigation.data.pages.filter((page) => !page.enabled).map((page) => page.path)
      : []);
    const allItems = mergeSitemapItems(sitemap.data.items, window.location.origin, unavailable);

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
  }, [isPreview, sitemap.data, navigation.data]);

  return null;
}