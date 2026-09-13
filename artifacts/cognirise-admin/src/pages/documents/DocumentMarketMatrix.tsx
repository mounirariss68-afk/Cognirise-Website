import { useEffect, useState } from "react";
import { type Document, type MarketEdition } from "@workspace/api-client-react";
import { Lock, Loader2, Check, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DocumentMarketRow } from "./DocumentMarketRow";
import type { AvailabilitySelectionDraft } from "./MarketAvailabilityChecklist";

type Props = {
  kind: string;
  documents: Document[];
  markets: MarketEdition[];
  canManage: boolean;
  isAdministrator: boolean;
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

export function DocumentMarketMatrix({
  kind,
  documents,
  markets,
  canManage,
  isAdministrator,
  isLoading = false,
  page = 1,
  pageSize = 20,
  total = documents.length,
  totalPages = 1,
  onPageChange,
}: Props) {
  const [, setLocation] = useLocation();
  const [locale, setLocale] = useState("en");
  const [drafts, setDrafts] = useState<Record<string, AvailabilitySelectionDraft>>({});
  const hasUnsaved = Object.values(drafts).some((draft) => draft.saveFailed || Object.keys(draft.selections).length > 0);
  useEffect(() => {
    if (!hasUnsaved) return;
    const guard = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", guard);
    return () => window.removeEventListener("beforeunload", guard);
  }, [hasUnsaved]);
  const open = (documentId: string, market?: string, language?: string) => {
    if (hasUnsaved && !window.confirm("Availability changes have not finished saving. Leave this page?")) return;
    setLocation(`/content/${documentId}${market ? `?market=${encodeURIComponent(market)}&locale=${encodeURIComponent(language || locale)}` : ""}`);
  };

  return (
    <section className="mb-8 rounded-xl border border-border bg-card shadow-sm flex min-h-[24rem] max-h-[70vh] flex-col overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border p-5 shrink-0">
        <div>
          <p className="text-sm">Ticks stage availability only. Content source and live publication are shown separately.</p>
          <label className="mt-3 flex items-center gap-2 text-sm">Language
            <select aria-label="Market matrix language" className="rounded border bg-background p-2" value={locale}
              disabled={hasUnsaved} onChange={(event) => setLocale(event.target.value)}>
              {[...new Set(["en", "ar", ...markets.flatMap((market) => [market.defaultLocale, market.fallbackLocale])])].filter((value): value is string => Boolean(value)).map((value) =>
                <option key={value} value={value}>{value.toUpperCase()}</option>)}
            </select>
          </label>
          {hasUnsaved && <p role="status" className="mt-2 text-xs text-amber-800">Finish or retry the availability save before changing pages or language.</p>}
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Availability legend">
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] uppercase h-4 px-1 rounded-sm">Shared</Badge> Inherits shared baseline</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] uppercase h-4 px-1 rounded-sm bg-blue-500/10 text-blue-500 border-blue-500/20">Adapted</Badge> Local overrides</span>
            <span className="flex items-center gap-1"><Badge variant="outline" className="text-[9px] uppercase h-4 px-1 rounded-sm bg-amber-500/10 text-amber-500 border-amber-500/20">Indep</Badge> Independent branch</span>
            <span className="flex items-center gap-1"><Check className="w-3 h-3 text-emerald-500" /> Live</span>
            <span className="flex items-center gap-1"><AlertCircle className="w-3 h-3 text-amber-500" /> Pending</span>
          </div>
        </div>
      </div>
      
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <Table aria-label={`${kind} content and market availability`}>
          <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm z-10">
            <TableRow className="border-border">
              <TableHead scope="col" className="min-w-[15rem] font-mono text-xs uppercase tracking-wider">Title & Slug</TableHead>
               {markets.map((market) => (
                 <TableHead key={market.id} scope="col" className="min-w-[9rem] whitespace-nowrap px-2 text-center font-mono text-xs uppercase tracking-wider">
                   {market.displayName}
                 </TableHead>
               ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                  <TableCell colSpan={markets.length + 1} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                  <TableCell colSpan={markets.length + 1} className="h-32 text-center font-mono text-sm text-muted-foreground">
                  No {kind}s found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <DocumentMarketRow key={doc.id} document={doc} markets={markets} locale={locale}
                  canManage={canManage} isAdministrator={isAdministrator} draft={drafts[doc.id]}
                  onDraftChange={(draft) => setDrafts((previous) => ({ ...previous, [doc.id]: draft }))}
                  onOpen={(market, language) => open(doc.id, market, language)} />
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-border bg-muted/10 p-4 text-sm font-mono text-muted-foreground shrink-0">
          <div>
            Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, total)} of {total}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" aria-label="Go to previous page" disabled={hasUnsaved || page === 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" aria-label="Go to next page" disabled={hasUnsaved || page === totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </section>
  );
}
