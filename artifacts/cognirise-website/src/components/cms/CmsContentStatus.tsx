import { useCmsPublishedPage } from "@/lib/cms";
import { useMarketStore } from "@/store/market";

export function CmsContentStatus({ pathname }: { pathname: string }) {
  const { market } = useMarketStore();
  const isPreviewRoute = pathname.startsWith("/preview/");
  const { state } = useCmsPublishedPage(market, pathname, !isPreviewRoute);

  if (isPreviewRoute || (!state.marketFallback && state.source !== "migration-fallback")) return null;

  const message = state.marketFallback
    ? `Regional content is using the ${state.resolvedMarket?.toUpperCase() ?? "default"} market fallback.`
    : "Showing the verified website content fallback.";

  return (
    <p
      className="mx-auto w-full max-w-[1440px] px-6 pt-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground md:px-12"
      role="status"
      aria-live="polite"
      data-testid="status-cms-market-fallback"
    >
      {message}
    </p>
  );
}