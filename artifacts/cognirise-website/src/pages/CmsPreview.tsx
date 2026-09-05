import { useEffect, useMemo, useState } from "react";
import { useLocation, useRoute, useSearch } from "wouter";
import { useExchangeCmsPreviewToken } from "@workspace/api-client-react";
import { isCmsMarket, isCmsSlug, useCmsPreviewPage } from "@/lib/cms";
import { useMarketStore, type Market } from "@/store/market";

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
  const exchange = useExchangeCmsPreviewToken();
  const [exchangeComplete, setExchangeComplete] = useState(!token);
  const [exchangeStarted, setExchangeStarted] = useState(false);
  const preview = useCmsPreviewPage((market ?? "uae") as Market, slug ?? "home", Boolean(market && slug && exchangeComplete));

  useEffect(() => {
    if (!token || !market || !slug || exchangeComplete || exchangeStarted) return;
    setExchangeStarted(true);
    exchange.mutate(
      { data: { token } },
      {
        onSuccess: (result) => {
          if (result.market !== market || result.slug !== slug) return;
          setMarket(market);
          setExchangeComplete(true);
          setLocation(`/preview/${market}/${slug}`, { replace: true });
        },
      },
    );
  }, [exchange, exchangeComplete, exchangeStarted, market, setLocation, setMarket, slug, token]);

  if (!market || !slug) {
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
    <article className="mx-auto w-full max-w-[960px] px-6 py-16" data-testid="cms-draft-preview">
      <p className="mb-3 text-xs font-bold uppercase tracking-widest text-[hsl(var(--brand-pink))]">CMS draft preview · {market.toUpperCase()}</p>
      <h1 className="font-display text-4xl font-semibold text-[hsl(var(--brand-deep))]">{page.title ?? "Untitled draft"}</h1>
      <div className="mt-8 space-y-4">
        {page.sections.map((section, index) => (
          <pre key={index} className="overflow-x-auto border border-border bg-muted/30 p-4 text-xs text-foreground" data-testid={`cms-preview-section-${index}`}>
            {JSON.stringify(section, null, 2)}
          </pre>
        ))}
      </div>
    </article>
  );
}