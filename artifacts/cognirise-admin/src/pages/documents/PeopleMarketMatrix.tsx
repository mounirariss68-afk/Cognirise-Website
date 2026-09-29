import { type Document, type MarketEdition } from "@workspace/api-client-react";
import { Lock, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PeopleTableRow } from "./PeopleTableRow";

type Props = {
  people: Document[];
  markets: MarketEdition[];
  canManage: boolean;
  isAdministrator: boolean;
  canManageMarket?: (market: string) => boolean;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

/**
 * The People surface deliberately owns the identity list and availability
 * presentation together. DocumentList supplies the already-filtered,
 * server-paginated page; there is no uncapped matrix query beside it.
 */
export function PeopleMarketMatrix({
  people,
  markets,
  canManage,
  isAdministrator,
  canManageMarket,
  isLoading = false,
  page = 1,
  pageSize = 20,
  total = people.length,
  totalPages = 1,
  onPageChange,
}: Props) {
  const [, setLocation] = useLocation();
  return (
    <section className="mb-8 rounded-xl border border-border bg-card shadow-sm" aria-labelledby="people-market-heading">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5">
        <div>
          <h2 id="people-market-heading" className="font-semibold">People</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            A checked market means its visibility setting is published, not that the person's profile is live. Each person also needs an approved, published content edition for that market/language and a ready scoped release. A dashed tick with an asterisk is only a pending visibility change.
          </p>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Availability legend">
            <span><strong aria-hidden="true">✓</strong> Visibility published</span>
            <span><strong aria-hidden="true">*</strong> Pending change</span>
            <span>Expand locale exceptions for non-default locales</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Open a person's editor to check the exact edition status and submit it for review. Once content and visibility are published, {isAdministrator ? <a href={`${import.meta.env.BASE_URL.replace(/\/$/, "")}/releases`} className="underline underline-offset-2">build a release candidate</a> : "ask an administrator to build a release candidate"} for the matching market and language.</p>
          {!canManage && (
            <p className="mt-2 flex items-center gap-1 text-xs text-amber-700">
              <Lock className="h-3 w-3" aria-hidden="true" /> Editor, publisher, or administrator permission is required to stage availability.
            </p>
          )}
        </div>
      </div>
      <div className="min-h-[16rem] overflow-x-auto">
        <Table aria-label="People identity and market availability">
          <caption className="sr-only">People identity, market availability, publication state, and actions</caption>
          <TableHeader className="bg-muted/30">
            <TableRow className="border-border">
              <TableHead scope="col" className="min-w-[13rem] font-mono text-xs uppercase tracking-wider">Person</TableHead>
               {markets.map((market) => (
                 <TableHead key={market.id} scope="col" className="min-w-[7.5rem] whitespace-nowrap px-2 text-center font-mono text-xs uppercase tracking-wider">
                   {market.displayName}
                 </TableHead>
               ))}
              <TableHead scope="col" className="min-w-[12rem] font-mono text-xs uppercase tracking-wider">Next step</TableHead>
              <TableHead scope="col" className="font-mono text-xs uppercase tracking-wider">Updated</TableHead>
              <TableHead scope="col" className="w-[7rem]"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                 <TableCell colSpan={markets.length + 4} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" aria-label="Loading people" />
                </TableCell>
              </TableRow>
            ) : people.length === 0 ? (
              <TableRow>
                 <TableCell colSpan={markets.length + 4} className="h-32 text-center font-mono text-sm text-muted-foreground">
                  No people found matching the current search and status filters.
                </TableCell>
              </TableRow>
            ) : (
              people.map((person) => (
                <PeopleTableRow
                  key={person.id}
                  person={person}
                  markets={markets}
                  canManage={canManage}
                  isAdministrator={isAdministrator}
                  canManageMarket={canManageMarket}
                  // MarketAvailabilityChecklist is rendered by each PeopleTableRow.
                  onOpenSharedContent={() => setLocation(`/content/${person.id}`)}
                />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-border bg-muted/10 p-4 text-sm font-mono text-muted-foreground">
          <div>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Go to previous people page"
              disabled={page === 1}
              onClick={() => onPageChange(page - 1)}
            >
              Prev
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              aria-label="Go to next people page"
              disabled={page === totalPages}
              onClick={() => onPageChange(page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </section>
  );
}