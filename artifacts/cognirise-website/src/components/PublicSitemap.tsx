import { useEffect } from "react";
import { useGetPublicSitemap } from "@workspace/api-client-react";
import { useMarketStore } from "@/store/market";

export function PublicSitemap() {
  const { market } = useMarketStore();
  const sitemap = useGetPublicSitemap({ market, locale: "en" });

  useEffect(() => {
    const id = "public-sitemap-jsonld";
    document.getElementById(id)?.remove();
    if (!sitemap.data?.items.length) return;
    const script = document.createElement("script");
    script.id = id;
    script.type = "application/ld+json";
    script.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      itemListElement: sitemap.data.items.map((entry, index) => ({
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