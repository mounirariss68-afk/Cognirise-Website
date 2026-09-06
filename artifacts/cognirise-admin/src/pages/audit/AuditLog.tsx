import { useState } from "react";
import { useListAuditEvents, getListAuditEventsQueryKey } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, History, Lock } from "lucide-react";
import { format } from "date-fns";

export default function AuditLog() {
  const [page, setPage] = useState(1);
  
  const { data, isLoading, isError, error } = useListAuditEvents({
    page,
    pageSize: 50
  }, { query: { queryKey: getListAuditEventsQueryKey({ page, pageSize: 50 }) } });

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card rounded-xl border border-destructive/20 shadow-sm max-w-2xl mx-auto mt-8">
        <Lock className="w-12 h-12 text-destructive mb-4 opacity-50" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Failed to load audit log</h2>
        <p className="text-sm text-muted-foreground font-mono">
          {(error as any)?.error || "You do not have permission to view the system audit log."}
        </p>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <History className="w-6 h-6 text-primary" /> Audit Log
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Immutable history of system actions</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[180px]">Timestamp</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[200px]">Actor</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Action</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Entity</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">IP Address</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground font-mono text-sm">
                    No events found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(event => (
                  <TableRow key={event.id} className="hover:bg-muted/20">
                    <TableCell className="text-[11px] font-mono text-muted-foreground">
                      {format(new Date(event.createdAt), "yyyy-MM-dd HH:mm:ss")}
                    </TableCell>
                    <TableCell>
                      {event.actor ? (
                        <div>
                          <div className="font-medium text-xs">{event.actor.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono truncate">{event.actor.email}</div>
                        </div>
                      ) : (
                        <span className="text-xs italic text-muted-foreground">System</span>
                      )}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">
                      {event.action}
                    </TableCell>
                    <TableCell>
                      <div className="font-mono text-[10px] uppercase text-muted-foreground mb-0.5">{event.entityType}</div>
                      <div className="font-mono text-xs truncate max-w-[200px]" title={event.entityId}>{event.entityId}</div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {event.ipAddress || "-"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
