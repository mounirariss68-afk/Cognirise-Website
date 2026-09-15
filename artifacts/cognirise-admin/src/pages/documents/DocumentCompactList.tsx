import { type Document } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DocumentCompactRow } from "./DocumentCompactRow";

type Props = {
  kind: string;
  documents: Document[];
  isLoading?: boolean;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
};

export function DocumentCompactList({
  kind,
  documents,
  isLoading = false,
  page = 1,
  pageSize = 20,
  total = documents.length,
  totalPages = 1,
  onPageChange,
}: Props) {
  return (
    <section className="mb-8 rounded-xl border border-border bg-card shadow-sm flex min-h-[24rem] max-h-[70vh] flex-col overflow-hidden">
      <div className="min-h-0 flex-1 overflow-auto overscroll-contain">
        <Table aria-label={`${kind} content list`} className="table-fixed sm:table-auto">
          <TableHeader className="hidden sm:table-header-group bg-muted/30 sticky top-0 backdrop-blur-sm z-10">
            <TableRow className="border-border">
              <TableHead scope="col" className="font-mono text-xs uppercase tracking-wider">Name</TableHead>
              <TableHead scope="col" className="w-[150px] font-mono text-xs uppercase tracking-wider">Status</TableHead>
              <TableHead scope="col" className="w-[200px] font-mono text-xs uppercase tracking-wider">Markets</TableHead>
              <TableHead scope="col" className="w-[80px] text-right"><span className="sr-only">Actions</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="block sm:table-row-group">
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center">
                  <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="h-32 text-center font-mono text-sm text-muted-foreground">
                  No {kind}s found.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => (
                <DocumentCompactRow key={doc.id} document={doc} />
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
            <Button variant="outline" size="sm" aria-label="Go to previous page" disabled={page === 1} onClick={() => onPageChange(page - 1)}>Prev</Button>
            <Button variant="outline" size="sm" aria-label="Go to next page" disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>Next</Button>
          </div>
        </div>
      )}
    </section>
  );
}
