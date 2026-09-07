import { useEffect } from "react";
import { useGetPublicSitemap } from "@workspace/api-client-react";
import { useMarketStore } from "@/store/market";
import { ALLIANCE_PLATFORM_LIST } from "@/lib/alliancePlatforms";

export function PublicSitemap() {
  const { market } = useMarketStore();
  const sitemap = useGetPublicSitemap({ market, locale: "en" });

  useEffect(() => {
    const id = "public-sitemap-jsonld";
    document.getElementById(id)?.remove();
    if (!sitemap.data?.items.length) return;
    // Inject statically defined alliance platforms into the sitemap
    const allianceItems = ALLIANCE_PLATFORM_LIST.map(({ slug }) => ({
      url: `${window.location.origin}/platforms/${slug}`,
    }));
    const allItems = [
      ...sitemap.data.items.filter((entry) => new URL(entry.url, window.location.origin).pathname !== "/advisors"),
      ...allianceItems,
    ];

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