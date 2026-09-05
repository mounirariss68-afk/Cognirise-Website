import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useExchangeCmsPreviewToken } from "@workspace/api-client-react";
import { isCmsMarket, isCmsRouteKind, isCmsSlug, useCmsPreviewPage } from "@/lib/cms";
import { useMarketStore, type Market } from "@/store/market";
import { CmsPageRenderer } from "@/components/cms/CmsPageRenderer";

function tokenFromSearch(search: string): string | undefined {
  const token = new URLSearchParams(search).get("token");
  return token && token.length > 0 ? token : undefined;
}

export default function CmsPreview() {
  const [, params] = useRoute("/preview/:market/:slug");
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { setMarket } = useMarketStore();
  const token = useMemo(() => tokenFromSearch(search), [search]);
  const market = isCmsMarket(params?.market) ? params.market : undefined;
  const slug = isCmsSlug(params?.slug) ? params.slug : undefined;
  const routeKindValue = new URLSearchParams(search).get("routeKind");
  const routeKind = isCmsRouteKind(routeKindValue) ? routeKindValue : undefined;
  const exchange = useExchangeCmsPreviewToken();
  const [exchangeComplete, setExchangeComplete] = useState(!token);
  const [exchangeStarted, setExchangeStarted] = useState(false);
  const preview = useCmsPreviewPage((market ?? "uae") as Market, slug ?? "home", Boolean(market && slug && routeKind && exchangeComplete), routeKind);

  useEffect(() => {
    if (!token || !market || !slug || !routeKind || exchangeComplete || exchangeStarted) return;
    setExchangeStarted(true);
    exchange.mutate(
      { data: { token } },
      {
        onSuccess: (result) => {
          if (result.market !== market || result.slug !== slug || result.routeKind !== routeKind) return;
          setMarket(market);
          setExchangeComplete(true);
          setLocation(`/preview/${market}/${slug}?routeKind=${routeKind}`, { replace: true });
        },
      },
    );
  }, [exchange, exchangeComplete, exchangeStarted, market, routeKind, setLocation, setMarket, slug, token]);

  if (!market || !slug || !routeKind) {
    return <section className="px-6 py-16" data-testid="status-cms-preview-invalid">Invalid preview address.</section>;
  }

  if (token && !exchangeComplete) {
    return <section className="px-6 py-16" role="status" data-testid="status-cms-preview-exchange">Securing preview access…</section>;
  }

  if (exchange.isError || preview.isError) {
    return <section className="px-6 py-16" role="alert" data-testid="status-cms-preview-error">Preview access is unavailable or has expired.</section>;
  }

  if (preview.isLoading || !preview.state) {
    return <section className="px-6 py-16" role="status" data-testid="status-cms-preview-loading">Loading draft preview…</section>;
  }

  const { page } = preview.state;
  if (!page) {
    return <section className="px-6 py-16" data-testid="status-cms-preview-empty">No draft page exists for this market and slug.</section>;
  }

  return (
    <div data-testid="cms-draft-preview">
      <aside className="border-b border-border bg-muted/40 px-6 py-3 text-center text-xs font-bold uppercase tracking-widest text-[hsl(var(--brand-pink))]" role="status">
        Draft preview · requested {market.toUpperCase()} · resolved {preview.state.resolvedMarket?.toUpperCase() ?? "unavailable"}
        {preview.state.marketFallback ? " · inherited UAE canonical content" : " · market-owned content"}
      </aside>
      <CmsPageRenderer page={page} preview />
    </div>
  );
}