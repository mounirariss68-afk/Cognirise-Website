import {
  type Document, type MarketEdition, getGetDocumentAvailabilityQueryKey,
  getGetSharedMarketEditionMatrixQueryKey, getListDocumentEditionsQueryKey,
  useGetDocumentAvailability, useGetSharedMarketEditionMatrix, useListDocumentEditions,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { MarketAvailabilityChecklist, type AvailabilitySelectionDraft } from "./MarketAvailabilityChecklist";

export function DocumentMarketRow({ document, markets, locale, canManage, isAdministrator, draft, onDraftChange, onOpen }: {
  document: Document;
  markets: MarketEdition[];
  locale: string;
  canManage: boolean;
  isAdministrator: boolean;
  draft?: AvailabilitySelectionDraft;
  onDraftChange: (draft: AvailabilitySelectionDraft) => void;
  onOpen: (market?: string, locale?: string) => void;
}) {
  const shared = useGetSharedMarketEditionMatrix(document.id, { query: {
    queryKey: getGetSharedMarketEditionMatrixQueryKey(document.id),
  } });
  const availability = useGetDocumentAvailability(document.id, { query: {
    queryKey: getGetDocumentAvailabilityQueryKey(document.id),
  } });
  const editions = useListDocumentEditions(document.id, { query: {
    queryKey: getListDocumentEditionsQueryKey(document.id),
  } });
  const failed = shared.isError || availability.isError || editions.isError;
  const loading = shared.isLoading || availability.isLoading || editions.isLoading;
  return <TableRow className="align-top">
    <TableCell className="min-w-[14rem]">
      <Button variant="link" className="h-auto max-w-[20rem] whitespace-normal p-0 text-left" onClick={() => onOpen()}>
        {document.title}
      </Button>
      <span className="mt-1 block text-xs text-muted-foreground">{document.slug}</span>
      <span className="mt-2 block text-xs text-muted-foreground">
        {shared.data?.baselines.some((baseline) => baseline.locale === locale) ? `Shared baseline · ${locale.toUpperCase()}` : "Market-only or legacy content"}
      </span>
      {failed && <div role="alert" className="mt-2 text-xs text-destructive">Could not load market status.
        <Button variant="link" size="sm" onClick={() => {
          void shared.refetch(); void availability.refetch(); void editions.refetch();
        }}>Retry</Button>
      </div>}
      {draft?.saveFailed && <p role="alert" className="mt-2 text-xs text-destructive">Availability is not saved. Your selection is retained; retry in its market cell.</p>}
    </TableCell>
    {markets.map((market) => {
      const destination = availability.data?.items.find((item) => item.marketEditionId === market.id && item.locale === locale);
      const binding = shared.data?.bindings.find((item) => item.marketEditionId === market.id && item.locale === locale);
      const edition = editions.data?.items.find((item) => item.market === market.code && item.locale === locale);
      const baseline = shared.data?.baselines.find((item) => item.id === binding?.baselineId);
      const hasUpdate = binding && binding.mode !== "independent" && baseline
        && baseline.revisionId !== binding.baselineRevisionId
        && baseline.revisionId !== binding.heldBaselineRevisionId;
      const source = binding
        ? binding.mode === "independent" ? "Independent" : binding.operations.length ? "Adapted" : "Shared"
        : edition?.exact ? "Independent" : edition?.usedFallback ? "Legacy source" : "Missing";
      return <TableCell key={market.id} className="min-w-[11rem] p-3">
        {loading ? <span role="status" className="text-xs">Loading…</span> : failed ? <span className="text-xs text-muted-foreground">Status unavailable</span> : <>
          <Badge variant="outline">{source}</Badge>
          <div className="my-2 flex flex-wrap gap-1 text-xs" aria-label={`${market.displayName} publication status`}>
            <span className={destination?.publishedEffectiveAvailable ? "text-emerald-700" : "text-muted-foreground"}>
              {destination?.publishedEffectiveAvailable ? "Live" : "Not live"}
            </span>
            {(destination?.pending || (edition?.exact && edition.workflowState === "draft")) && <span>· Pending</span>}
            {hasUpdate && <span className="text-amber-800">· Updates available</span>}
            {binding?.translationState === "stale" && <span className="text-amber-800">· Translation stale</span>}
            {edition?.readinessErrors.length ? <span className="text-destructive">· {edition.readinessErrors.length} review blockers</span> : null}
          </div>
          {destination && <MarketAvailabilityChecklist
            documentId={document.id}
            destinations={[{ market: market.code, displayName: market.displayName, locale }]}
            canManageMarket={() => canManage && Boolean(availability.data?.canEditShared)}
            isAdministrator={isAdministrator}
            selectionDraft={draft}
            onSelectionDraftChange={onDraftChange}
            onOpenSharedContent={() => onOpen(market.code, locale)}
            compact
          />}
          <Button variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => onOpen(market.code, locale)}>
            Open {market.displayName} · {locale.toUpperCase()}
          </Button>
        </>}
      </TableCell>;
    })}
  </TableRow>;
}