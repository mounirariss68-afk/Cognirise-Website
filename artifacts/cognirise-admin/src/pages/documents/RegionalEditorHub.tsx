import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import {
  getListDocumentEditionsQueryKey,
  getListDocumentsQueryKey,
  useGetSession,
  useGetPublicConfiguration,
  useListDocuments,
  useListDocumentEditions,
  useListMarketEditions,
  type Document,
  type DocumentEdition,
  type DocumentKind,
} from "@workspace/api-client-react";
import { ArrowUpRight, BookOpenText, Briefcase, House, UsersRound } from "lucide-react";
import { canAccessAnyTopic } from "@/lib/content-capability";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { regionalEditorHref } from "./regional-editor-routing";

const contexts = [
  { id: "home", label: "Homepage", kind: "landing-page", list: "/website-pages", icon: House },
  { id: "people", label: "People & team", kind: "person", list: "/people", icon: UsersRound },
  { id: "work", label: "Case Studies", kind: "case-study", list: "/case-studies", icon: Briefcase },
  { id: "insights", label: "Insights", kind: "publication", list: "/publications", icon: BookOpenText },
] as const;
type Context = (typeof contexts)[number];

function exactEdition(editions: DocumentEdition[] | undefined, market: string, locale: string) {
  return editions?.find((edition) => edition.exact && edition.market === market && edition.locale === locale && edition.revisionId);
}

function EditionRow({ item, context, market, locale, onEditionLocales }: {
  item: Document;
  context: Context;
  market: string;
  locale: string;
  onEditionLocales: (id: string, locales: string[]) => void;
}) {
  const editions = useListDocumentEditions(item.id, {
    query: { queryKey: getListDocumentEditionsQueryKey(item.id), enabled: Boolean(market && locale), retry: false },
  });
  const edition = exactEdition(editions.data?.items, market, locale);
  useEffect(() => {
    if (editions.data?.items) onEditionLocales(item.id, editions.data.items.map((entry) => `${entry.market}:${entry.locale}`));
  }, [editions.data?.items, item.id, onEditionLocales]);
  const source = editions.data?.items.find((candidate) =>
    candidate.exact && candidate.revisionId && candidate.market === market)
    ?? editions.data?.items.find((candidate) => candidate.exact && candidate.revisionId);
  const published = edition?.publicationState === "published" && edition.hasEffectivePublishedRevision;
  const status = edition?.workflowState === "in-review" ? "In review"
    : edition?.workflowState === "draft" ? published ? "Live with pending draft" : "Draft"
      : published ? "Published edition" : edition?.workflowState === "approved" ? "Approved, not published" : "Not published";
  const href = `/content/${item.id}?${new URLSearchParams({
    market, locale, from: context.id,
    ...(!edition && source ? {
      setup: "1",
      sourceMarket: source.market,
      sourceLocale: source.locale,
    } : {}),
  })}`;

  return <li className="rounded-xl border bg-card p-4 sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h3 className="break-words text-base font-semibold">{item.title}</h3>
        <p className="mt-1 font-mono text-xs text-muted-foreground">{item.slug}</p>
        {editions.isLoading ? <p role="status" className="mt-2 text-xs">Checking exact edition…</p>
          : editions.isError ? <p role="alert" className="mt-2 text-xs text-destructive">Edition status unavailable. <button type="button" className="underline" onClick={() => void editions.refetch()}>Retry</button></p>
            : <p className="mt-2 text-xs text-muted-foreground">{edition
              ? `${market.toUpperCase()} · ${locale.toUpperCase()} · ${status} · saved revision ${edition.revisionNumber}`
              : `No saved ${market.toUpperCase()} · ${locale.toUpperCase()} edition. Source content is not automatically public here.`}</p>}
      </div>
       {!editions.isError && !editions.isLoading && (edition || source) && <Link href={href} className="inline-flex items-center gap-1 rounded border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {edition ? "Open editor" : "Set up edition"} <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
      </Link>}
       {!editions.isLoading && !editions.isError && !edition && !source && <p className="text-xs text-muted-foreground">No accessible saved source edition is available for setup.</p>}
    </div>
  </li>;
}

export default function RegionalEditorHub() {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const [recordLocales, setRecordLocales] = useState<Record<string, string[]>>({});
  const reportEditionLocales = useCallback((id: string, values: string[]) => {
    setRecordLocales((current) => {
      const existing = current[id] ?? [];
      if (existing.length === values.length && existing.every((value, index) => value === values[index])) return current;
      return { ...current, [id]: values };
    });
  }, []);
  const search = useSearch();
  const [, setLocation] = useLocation();
  const { data: session } = useGetSession();
  const markets = useListMarketEditions({ page: 1, pageSize: 100 });
  const publicConfiguration = useGetPublicConfiguration();
  const params = useMemo(() => new URLSearchParams(search), [search]);
  const availableContexts = contexts.filter((context) => canAccessAnyTopic(session?.user, context.kind, "view"));
  const requestedContext = contexts.find((context) => context.id === params.get("context"));
  const context = availableContexts.find((candidate) => candidate.id === requestedContext?.id) ?? availableContexts[0];
  useEffect(() => { setFilter(""); setPage(1); }, [context?.id]);
  const enabledMarkets = markets.data?.items.filter((market) => market.enabled) ?? [];
  const selectedMarket = enabledMarkets.find((market) => market.code === params.get("market")) ?? enabledMarkets[0];
  const locales = selectedMarket
    ? [...new Set([
      selectedMarket.defaultLocale,
      selectedMarket.fallbackLocale,
      ...(publicConfiguration.data?.markets.find((candidate) => candidate.code === selectedMarket.code)?.locales ?? []),
      ...Object.values(recordLocales).flat()
        .filter((candidate) => candidate.startsWith(`${selectedMarket.code}:`))
        .map((candidate) => candidate.slice(selectedMarket.code.length + 1)),
      // Keep a previously selected exact locale addressable even when its
      // publication configuration has not yet exposed it publicly.
      params.get("market") === selectedMarket.code ? params.get("locale") : null,
    ].filter((candidate): candidate is string => Boolean(candidate)))]
    : [];
  const locale = locales.find((candidate) => candidate === params.get("locale")) ?? locales[0] ?? "";
  const market = selectedMarket?.code ?? "";
  const documentParams = {
    kind: (context?.kind ?? "landing-page") as DocumentKind,
    page: context?.id === "home" ? 1 : page,
    pageSize: context?.id === "home" ? 100 : 20,
    search: context?.id === "home" ? undefined : filter.trim() || undefined,
  };
  const documents = useListDocuments(documentParams, {
    query: { queryKey: getListDocumentsQueryKey(documentParams), enabled: Boolean(context && market && locale), retry: false },
  });
  const landingParams = { kind: "landing-page" as DocumentKind, page: 1, pageSize: 100 };
  const landingPages = useListDocuments(landingParams, {
    query: { queryKey: getListDocumentsQueryKey(landingParams), enabled: Boolean(context && context.id !== "home" && market && locale), retry: false },
  });
  const collectionPagePath = context?.id === "people" ? "/about" : context?.id === "work" ? "/work" : "/insights";
  const collectionPage = context?.id === "home" ? undefined
    : landingPages.data?.items.find((item) => (item.content as { pagePath?: string })?.pagePath === collectionPagePath);
  const items = context?.id === "home"
    ? documents.data?.items.filter((item) => item.slug === "homepage" || (item.content as { pagePath?: string })?.pagePath === "/")
    : documents.data?.items;
  const switchSelection = (nextContext = context?.id ?? "home", nextMarket = market, nextLocale = locale) => {
    setLocation(regionalEditorHref(nextContext, nextMarket, nextLocale));
  };

  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 pb-12 sm:p-8">
    <header className="border-b pb-5">
      <p className="font-mono text-xs uppercase tracking-widest text-primary">Content / Regional editions</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">Regional editor</h1>
      <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Choose one market and language, then open the exact page or source record. Drafts, approvals, published editions, and the public release remain separate.</p>
    </header>
    {markets.isError ? <section role="alert" className="rounded-xl border border-destructive/40 p-5">
      Market editions could not be loaded. <Button variant="link" onClick={() => void markets.refetch()}>Retry</Button>
    </section> : markets.isLoading ? <p role="status">Loading regions…</p> : !context ? <p role="alert">Your account does not have access to these content topics.</p> : !selectedMarket ? <p role="status">No enabled markets are configured.</p> : <>
      <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 sm:p-5" aria-label="Exact edition">
        <label className="text-xs font-medium uppercase tracking-wide">Market
          <select className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal normal-case tracking-normal" value={market} onChange={(event) => {
            const next = enabledMarkets.find((candidate) => candidate.code === event.target.value);
            if (next) switchSelection(context.id, next.code, next.defaultLocale);
          }}>
            {enabledMarkets.map((candidate) => <option key={candidate.code} value={candidate.code}>{candidate.displayName}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium uppercase tracking-wide">Language
          <select className="mt-2 h-11 w-full rounded-md border bg-background px-3 text-sm font-normal normal-case tracking-normal" value={locale} onChange={(event) => switchSelection(context.id, market, event.target.value)}>
            {locales.map((candidate) => <option key={candidate} value={candidate}>{candidate.toUpperCase()}</option>)}
          </select>
        </label>
      </section>
      <nav aria-label="Page and collection contexts" className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {availableContexts.map((candidate) => <Link key={candidate.id} href={regionalEditorHref(candidate.id, market, locale)}
          aria-current={candidate.id === context.id ? "page" : undefined}
          className={`flex min-h-16 items-center gap-2 rounded-lg border px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${candidate.id === context.id ? "border-primary bg-primary/10 text-primary" : "bg-card hover:bg-muted"}`}>
          <candidate.icon aria-hidden="true" className="h-4 w-4 shrink-0" /> {candidate.label}
        </Link>)}
      </nav>
      <section aria-label={`${context.label} records`} className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div><h2 className="text-xl font-semibold">{context.label}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{context.id === "home"
              ? "The Homepage is its own page edition. Linked Industry cards are governed by their source records."
              : "Open a source record to edit its exact regional edition and check its saved preview."}</p>
          </div>
          <Link href={context.list} className="rounded border px-3 py-2 text-sm font-medium hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Manage {context.label} <ArrowUpRight className="ml-1 inline h-4 w-4" aria-hidden="true" /></Link>
        </div>
        {context.id !== "home" && <div className="space-y-2">
          <h3 className="text-sm font-semibold">Collection page · {collectionPagePath}</h3>
          {landingPages.isLoading ? <p role="status" className="rounded-xl border p-4 text-sm">Finding the page edition…</p>
            : landingPages.isError ? <p role="alert" className="rounded-xl border border-destructive/40 p-4 text-sm">Collection page could not be loaded. <button type="button" className="underline" onClick={() => void landingPages.refetch()}>Retry</button></p>
               : collectionPage ? <ul><EditionRow item={collectionPage} context={context} market={market} locale={locale} onEditionLocales={reportEditionLocales} /></ul>
                : <p className="rounded-xl border p-4 text-sm text-muted-foreground">No editable collection page was returned for this account. Source records below remain separate.</p>}
        </div>}
        {context.id !== "home" && <h3 className="text-sm font-semibold">Source records</h3>}
        {context.id !== "home" && <Input
          aria-label={`Search ${context.label}`}
          placeholder={`Search ${context.label.toLowerCase()} records`}
          value={filter}
          onChange={(event) => { setFilter(event.target.value); setPage(1); }}
          className="max-w-lg bg-card"
        />}
        {documents.isLoading ? <p role="status" className="rounded-xl border p-5">Loading records…</p>
          : documents.isError ? <p role="alert" className="rounded-xl border border-destructive/40 p-5">Records could not be loaded. <button type="button" className="underline" onClick={() => void documents.refetch()}>Retry</button></p>
            : !items?.length ? <p className="rounded-xl border p-5 text-sm">No {context.label.toLowerCase()} record is available for this account. Use “Manage {context.label}” to create or locate one; nothing has been made public automatically.</p>
               : <ul className="grid gap-3">{items.map((item) => <EditionRow key={item.id} item={item} context={context} market={market} locale={locale} onEditionLocales={reportEditionLocales} />)}</ul>}
        {context.id !== "home" && (documents.data?.totalPages ?? 0) > 1 && <nav aria-label={`${context.label} pages`} className="flex items-center gap-3 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
          <span>Page {page} of {documents.data?.totalPages}</span>
          <Button variant="outline" disabled={page >= (documents.data?.totalPages ?? 1)} onClick={() => setPage((current) => current + 1)}>Next</Button>
        </nav>}
        {context.id === "home" && (documents.data?.totalPages ?? 0) > 1 && <p className="text-xs text-muted-foreground">Showing the first 100 website pages. Open Website Pages to find more.</p>}
      </section>
    </>}
  </main>;
}