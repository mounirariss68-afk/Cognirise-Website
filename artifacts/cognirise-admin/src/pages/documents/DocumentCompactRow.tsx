import { type Document, useGetDocumentAvailability, getGetDocumentAvailabilityQueryKey, useListDocumentEditions, getListDocumentEditionsQueryKey } from "@workspace/api-client-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

type Props = {
  document: Document;
};

export function DocumentCompactRow({ document }: Props) {
  const [, setLocation] = useLocation();

  const availability = useGetDocumentAvailability(document.id, { query: {
    queryKey: getGetDocumentAvailabilityQueryKey(document.id),
  } });
  const editions = useListDocumentEditions(document.id, { query: {
    queryKey: getListDocumentEditionsQueryKey(document.id),
  } });

  const isDataLoading = availability.isLoading || editions.isLoading;
  const failed = availability.isError || editions.isError;

  // Compute concise states
  let isLive = false;
  let hasDraftOrPending = false;

  if (availability.data && editions.data) {
    for (const item of availability.data.items) {
      const edition = editions.data.items.find((e) => e.market === item.market && e.locale === item.locale);
      if (item.publishedEffectiveAvailable && edition?.hasEffectivePublishedRevision) {
        isLive = true;
      }
      if (item.pending || (edition && edition.publicationState !== "published" && edition.workflowState !== null) || (!edition?.hasEffectivePublishedRevision && edition?.revisionId)) {
        hasDraftOrPending = true;
      }
    }
  }

  return (
    <TableRow className="grid grid-cols-[minmax(0,1fr)_auto] sm:table-row border-border/50 hover:bg-muted/20 transition-colors">
      <TableCell className="block min-w-0 pb-1 sm:table-cell sm:pb-4">
        <Link
          href={`/content/${document.id}`}
          className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring flex flex-col"
        >
          <span className="font-medium text-foreground break-words">{document.title}</span>
          <span className="text-xs text-muted-foreground font-mono mt-0.5 break-all">{document.slug}</span>
        </Link>
      </TableCell>
      <TableCell className="block col-start-1 py-1 sm:table-cell sm:py-4">
        {isDataLoading ? (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        ) : failed ? <div className="text-xs" role="alert">Status unavailable <Button size="sm" variant="link" onClick={() => { void availability.refetch(); void editions.refetch(); }}>Retry</Button></div> : (
          <div className="flex gap-1 flex-wrap">
            {isLive && (
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider rounded-sm bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                Live
              </Badge>
            )}
            {hasDraftOrPending && (
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider rounded-sm bg-amber-500/10 text-amber-600 border-amber-500/20">
                {isLive ? "Pending" : editions.data?.items.some((edition) => edition.exact && edition.workflowState === "in-review") ? "In review" : "Draft"}
              </Badge>
            )}
            {!isLive && !hasDraftOrPending && document.status === "draft" && (
              <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider rounded-sm bg-muted text-muted-foreground border-border">
                Draft
              </Badge>
            )}
            {!isLive && !hasDraftOrPending && document.status !== "draft" && <span className="text-xs capitalize">{document.status.replaceAll("-", " ")}</span>}
          </div>
        )}
      </TableCell>
      <TableCell className="block col-start-1 pt-1 sm:table-cell sm:pt-4">
        <div className="flex gap-1 flex-wrap">
          {availability.data ? [...new Set(availability.data.items.filter((item) => item.stagedDecision === "show" || item.publishedEffectiveAvailable).map((item) => item.market))].map((market) => {
            const items = availability.data.items.filter((item) => item.market === market);
            const live = items.some((item) => item.publishedEffectiveAvailable && editions.data?.items.some((edition) => edition.market === item.market && edition.locale === item.locale && edition.hasEffectivePublishedRevision));
            const pending = items.some((item) => item.pending);
            return <span key={market} className="text-xs" title={`${live ? "Live" : "Not live"}${pending ? " · Pending change" : ""}`}>
              {items[0].displayName || market}{pending ? " · pending" : ""}
            </span>;
          }) : document.markets.map((market) => <span key={market} className="text-xs">{market}</span>)}
        </div>
      </TableCell>
      <TableCell className="block col-start-2 row-start-1 row-span-3 self-center sm:table-cell text-right">
        <Button variant="ghost" size="sm" className="font-mono text-xs" onClick={() => setLocation(`/content/${document.id}`)}>
          Edit
        </Button>
      </TableCell>
    </TableRow>
  );
}
