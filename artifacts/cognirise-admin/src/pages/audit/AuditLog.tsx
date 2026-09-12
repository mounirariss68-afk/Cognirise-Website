import { FormEvent, useMemo, useState } from "react";
import { getListAuditEventsQueryKey, useListAuditEvents, useListUsers } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, History, Lock, Search, X } from "lucide-react";
import { format } from "date-fns";

const PAGE_SIZE = 50;

function errorMessage(error: unknown) {
  if (!error || typeof error !== "object") return "You do not have permission to view the system audit log.";
  const candidate = error as { data?: { error?: unknown } | string; error?: unknown; message?: unknown };
  if (candidate.data && typeof candidate.data === "object" && typeof candidate.data.error === "string") return candidate.data.error;
  if (typeof candidate.data === "string" && candidate.data.trim()) return candidate.data;
  if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error;
  if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
  return "You do not have permission to view the system audit log.";
}

function asUtc(value: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? undefined : date.toISOString();
}

export default function AuditLog() {
  const [page, setPage] = useState(1);
  const [actorDraft, setActorDraft] = useState("");
  const [entityTypeDraft, setEntityTypeDraft] = useState("");
  const [entityIdDraft, setEntityIdDraft] = useState("");
  const [actionDraft, setActionDraft] = useState("");
  const [fromDraft, setFromDraft] = useState("");
  const [toDraft, setToDraft] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    actorId: undefined as string | undefined,
    entityType: undefined as string | undefined,
    entityId: undefined as string | undefined,
    action: undefined as string | undefined,
    from: undefined as string | undefined,
    to: undefined as string | undefined,
  });
  const users = useListUsers({ page: 1, pageSize: 100 });
  const params = useMemo(() => ({ page, pageSize: PAGE_SIZE, ...filters }), [filters, page]);
  const { data, isLoading, isError, error } = useListAuditEvents(params, {
    query: { queryKey: getListAuditEventsQueryKey(params) },
  });

  const applyFilters = (event: FormEvent) => {
    event.preventDefault();
    const from = asUtc(fromDraft);
    const to = asUtc(toDraft);
    if ((fromDraft && !from) || (toDraft && !to)) {
      setFilterError("Enter valid UTC date and time values.");
      return;
    }
    if (from && to && from > to) {
      setFilterError("The audit range must end after it starts.");
      return;
    }
    setFilterError(null);
    setPage(1);
    setFilters({
      actorId: actorDraft || undefined,
      entityType: entityTypeDraft.trim() || undefined,
      entityId: entityIdDraft.trim() || undefined,
      action: actionDraft.trim() || undefined,
      from,
      to,
    });
  };

  const clearFilters = () => {
    setActorDraft("");
    setEntityTypeDraft("");
    setEntityIdDraft("");
    setActionDraft("");
    setFromDraft("");
    setToDraft("");
    setFilterError(null);
    setPage(1);
    setFilters({ actorId: undefined, entityType: undefined, entityId: undefined, action: undefined, from: undefined, to: undefined });
  };

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-card rounded-xl border border-destructive/20 shadow-sm max-w-2xl mx-auto mt-8" role="alert">
        <Lock className="w-12 h-12 text-destructive mb-4 opacity-50" />
        <h2 className="text-xl font-bold tracking-tight mb-2">Failed to load audit log</h2>
        <p className="text-sm text-muted-foreground font-mono">{errorMessage(error)}</p>
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
        <form onSubmit={applyFilters} className="grid gap-3 border-b border-border bg-muted/20 p-4 md:grid-cols-2 lg:grid-cols-4">
          <Select value={actorDraft || "__all"} onValueChange={(value) => setActorDraft(value === "__all" ? "" : value)}>
            <SelectTrigger aria-label="Filter by actor"><SelectValue placeholder="All actors" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all">All actors</SelectItem>
              {users.data?.items.map((user) => <SelectItem key={user.id} value={user.id}>{user.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input aria-label="Filter by entity type" placeholder="Entity type (e.g. document)" value={entityTypeDraft} onChange={(event) => setEntityTypeDraft(event.target.value)} />
          <Input aria-label="Filter by entity ID" placeholder="Entity ID" value={entityIdDraft} onChange={(event) => setEntityIdDraft(event.target.value)} />
          <Input aria-label="Filter by action" placeholder="Action (e.g. document.updated)" value={actionDraft} onChange={(event) => setActionDraft(event.target.value)} />
          <label className="text-xs text-muted-foreground">
            From
            <Input className="mt-1" type="datetime-local" value={fromDraft} onChange={(event) => setFromDraft(event.target.value)} />
          </label>
          <label className="text-xs text-muted-foreground">
            To
            <Input className="mt-1" type="datetime-local" value={toDraft} onChange={(event) => setToDraft(event.target.value)} />
          </label>
          <div className="flex items-end gap-2 lg:col-span-2">
            <Button type="submit" className="gap-2"><Search className="h-4 w-4" /> Apply filters</Button>
            <Button type="button" variant="ghost" onClick={clearFilters}><X className="h-4 w-4" /> Clear</Button>
          </div>
          {filterError && <p className="text-xs text-destructive md:col-span-2 lg:col-span-4" role="alert">{filterError}</p>}
        </form>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[180px]">Timestamp</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[200px]">Actor</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Action</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Entity</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">IP Address</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Metadata</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
              ) : data?.items.length === 0 ? (
                <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono text-sm">No events match these filters.</TableCell></TableRow>
              ) : (
                data?.items.map((event) => (
                  <TableRow key={event.id} className="hover:bg-muted/20">
                    <TableCell className="text-[11px] font-mono text-muted-foreground">{format(new Date(event.createdAt), "yyyy-MM-dd HH:mm:ss")}</TableCell>
                    <TableCell>
                      {event.actor ? <div><div className="font-medium text-xs">{event.actor.name}</div><div className="text-[10px] text-muted-foreground font-mono truncate">{event.actor.email}</div></div> : <span className="text-xs italic text-muted-foreground">System</span>}
                    </TableCell>
                    <TableCell className="font-mono text-xs font-semibold text-foreground">{event.action}</TableCell>
                    <TableCell><div className="font-mono text-[10px] uppercase text-muted-foreground mb-0.5">{event.entityType}</div><div className="font-mono text-xs truncate max-w-[200px]" title={event.entityId}>{event.entityId}</div></TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">{event.ipAddress || "-"}</TableCell>
                    <TableCell className="max-w-[260px]">
                      <details>
                        <summary className="cursor-pointer text-xs text-primary">Inspect</summary>
                        <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap break-all rounded bg-muted p-2 text-[10px]">{JSON.stringify(event.metadata, null, 2)}</pre>
                      </details>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {data && (
          <div className="flex items-center justify-between border-t border-border bg-muted/10 p-4 text-sm font-mono text-muted-foreground">
            <span>{data.total === 0 ? "No events" : `Showing ${((page - 1) * PAGE_SIZE) + 1} to ${Math.min(page * PAGE_SIZE, data.total)} of ${data.total}`}</span>
            {data.totalPages > 1 && <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page >= data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>}
          </div>
        )}
      </div>
    </div>
  );
}