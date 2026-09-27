import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  getListDocumentEditionsQueryKey,
  getListDocumentsQueryKey,
  useListDocumentEditions,
  useListDocuments,
  type Document,
  type DocumentEdition,
} from "@workspace/api-client-react";
import { RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PAGE_SIZE = 20;

function editionStatus(edition: DocumentEdition): string {
  const live = edition.publicationState === "published" && edition.hasEffectivePublishedRevision;
  if (edition.workflowState === "draft" || edition.workflowState === "in-review") {
    return live ? "Live with pending changes" : edition.workflowState === "in-review" ? "In review" : "Draft";
  }
  return live ? "Live" : edition.workflowState === "approved" ? "Approved, not live" : "Not live";
}

function WebsitePageRow({ page }: { page: Document }) {
  const content = page.content as { pagePath?: unknown };
  const editions = useListDocumentEditions(page.id, {
    query: { queryKey: getListDocumentEditionsQueryKey(page.id), retry: false },
  });
  const exactEditions = editions.data?.items.filter((edition) => edition.exact && edition.revisionId) ?? [];

  return (
    <li className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <h2 className="text-lg font-semibold text-foreground">
          <Link href={`/content/${page.id}`} className="rounded-sm hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            {page.title}
          </Link>
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {typeof content.pagePath === "string" ? content.pagePath : page.slug}
        </p>
      </div>
      {editions.isLoading ? (
        <p role="status" className="mt-4 text-sm text-muted-foreground">Loading market editions…</p>
      ) : editions.isError ? (
        <div role="alert" className="mt-4 text-sm text-destructive">
          Market editions could not be loaded.{" "}
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void editions.refetch()}>Retry</Button>
        </div>
      ) : exactEditions.length ? (
        <div className="mt-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Available editions</p>
          <div className="flex flex-wrap gap-2">
            {exactEditions.map((edition) => (
              <Link
                key={`${edition.market}-${edition.locale}`}
                href={`/content/${page.id}?market=${encodeURIComponent(edition.market)}&locale=${encodeURIComponent(edition.locale)}`}
                className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span className="font-medium">{edition.market.toUpperCase()} · {edition.locale.toUpperCase()}</span>
                <span className="ml-2 text-muted-foreground">{editionStatus(edition)}</span>
              </Link>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">No saved edition is available to your account.</p>
      )}
    </li>
  );
}

export default function WebsitePages() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const params = { kind: "landing-page" as const, page, pageSize: PAGE_SIZE, search: search.trim() || undefined };
  const documents = useListDocuments(params, {
    query: { queryKey: getListDocumentsQueryKey(params), retry: false },
  });
  const totalPages = documents.data?.totalPages ?? 0;
  const refresh = () => {
    for (const item of documents.data?.items ?? []) {
      void queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(item.id) });
    }
    void documents.refetch();
  };

  return (
    <main className="mx-auto flex min-h-full w-full max-w-5xl flex-col p-4 sm:p-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Website Pages</h1>
        <p className="mt-1 text-sm text-muted-foreground">Find a governed page, then open the exact market and language edition to review or edit it.</p>
      </header>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-lg flex-1">
          <Search aria-hidden="true" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search website pages"
            placeholder="Search pages by name or slug"
            value={search}
            onChange={(event) => { setSearch(event.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Button variant="outline" onClick={refresh} className="gap-2">
          <RefreshCw aria-hidden="true" className="h-4 w-4" />Refresh
        </Button>
      </div>
      {documents.isLoading ? (
        <p role="status" className="text-sm text-muted-foreground">Loading website pages…</p>
      ) : documents.isError ? (
        <div role="alert" className="rounded-lg border border-destructive/30 p-4 text-sm text-destructive">
          Website pages could not be loaded.{" "}
          <Button variant="link" size="sm" className="h-auto p-0" onClick={() => void documents.refetch()}>Retry</Button>
        </div>
      ) : !documents.data?.items.length ? (
        <p className="rounded-lg border border-border p-6 text-sm text-muted-foreground">
          {search.trim() ? "No pages match that search." : "No website pages are available to your account."}
        </p>
      ) : (
        <>
          <ul className="space-y-3" aria-label="Website pages">
            {documents.data.items.map((item) => <WebsitePageRow key={item.id} page={item} />)}
          </ul>
          {totalPages > 1 && (
            <nav aria-label="Website pages pagination" className="mt-6 flex items-center justify-between gap-4 text-sm">
              <Button variant="outline" disabled={page <= 1} onClick={() => setPage((current) => current - 1)}>Previous</Button>
              <span>Page {page} of {totalPages}</span>
              <Button variant="outline" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}