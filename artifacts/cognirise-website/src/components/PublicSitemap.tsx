import { useEffect } from "react";
import { useGetPublicSitemap } from "@workspace/api-client-react";
import { useMarketStore } from "@/store/market";
import { ALLIANCE_PLATFORM_LIST } from "@/lib/alliancePlatforms";

export const STATIC_SITEMAP_PATHS = [
  "/methodologies/agent-authority-model",
  ...ALLIANCE_PLATFORM_LIST.map(({ slug }) => `/platforms/${slug}`),
];

export function mergeSitemapItems(items: Array<{ url: string }>, origin: string) {
  const merged = [
    ...items.filter((entry) => new URL(entry.url, origin).pathname !== "/advisors"),
    ...STATIC_SITEMAP_PATHS.map((path) => ({ url: `${origin}${path}` })),
  ];
  return merged.filter((entry, index) => {
    const path = new URL(entry.url, origin).pathname;
    return merged.findIndex((candidate) => new URL(candidate.url, origin).pathname === path) === index;
  });
}

export function PublicSitemap() {
  const { market } = useMarketStore();
  const sitemap = useGetPublicSitemap({ market, locale: "en" });

  useEffect(() => {
    const id = "public-sitemap-jsonld";
    document.getElementById(id)?.remove();
    if (!sitemap.data?.items.length) return;
    const allItems = mergeSitemapItems(sitemap.data.items, window.location.origin);

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
  }, [sitemap.data]);

  return null;
}