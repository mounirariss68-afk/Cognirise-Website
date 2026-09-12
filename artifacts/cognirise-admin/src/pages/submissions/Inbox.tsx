import { useMemo, useState } from "react";
import {
  getListSubmissionsQueryKey,
  getListUsersQueryKey,
  SubmissionKind,
  SubmissionStatus,
  useExportSubmissions,
  useListSubmissions,
  useListUsers,
  useUpdateSubmission,
  type Submission,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Search, Filter, Inbox as InboxIcon, Download, ExternalLink, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

const PAGE_SIZE = 20;
const STATUSES = Object.values(SubmissionStatus) as SubmissionStatus[];

function errorMessage(error: unknown, fallback: string) {
  if (!error || typeof error !== "object") return fallback;
  const candidate = error as {
    data?: { error?: unknown; detail?: unknown } | string;
    error?: unknown;
    message?: unknown;
  };
  if (candidate.data && typeof candidate.data === "object") {
    if (typeof candidate.data.error === "string") return candidate.data.error;
    if (typeof candidate.data.detail === "string") return candidate.data.detail;
  }
  if (typeof candidate.data === "string" && candidate.data.trim()) return candidate.data;
  if (typeof candidate.error === "string" && candidate.error.trim()) return candidate.error;
  if (typeof candidate.message === "string" && candidate.message.trim()) return candidate.message;
  return fallback;
}

function statusLabel(status: SubmissionStatus) {
  return status.replace("-", " ");
}

export default function Inbox() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubmissionStatus | undefined>();
  const [kind, setKind] = useState<SubmissionKind | undefined>();
  const [selected, setSelected] = useState<Submission | null>(null);
  const [statusDraft, setStatusDraft] = useState<SubmissionStatus>("new");
  const [ownerDraft, setOwnerDraft] = useState("__unassigned");
  const [notesDraft, setNotesDraft] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const listParams = {
    page,
    pageSize: PAGE_SIZE,
    search: search || undefined,
    status,
    kind,
  };
  const { data, isLoading, isError, error } = useListSubmissions(listParams, {
    query: { queryKey: getListSubmissionsQueryKey(listParams) },
  });
  const users = useListUsers(
    { page: 1, pageSize: 100 },
    { query: { queryKey: getListUsersQueryKey({ page: 1, pageSize: 100 }) } },
  );
  const updateSubmission = useUpdateSubmission();
  const exportSubmissions = useExportSubmissions();

  const ownerOptions = useMemo(() => {
    const all = users.data?.items ?? [];
    const current = selected?.ownerId;
    return all.filter((user) => user.status === "active" || user.id === current);
  }, [selected?.ownerId, users.data?.items]);

  const openSubmission = (submission: Submission) => {
    setSelected(submission);
    setStatusDraft(submission.status);
    setOwnerDraft(submission.ownerId ?? "__unassigned");
    setNotesDraft(submission.notes ?? "");
  };

  const saveSubmission = async () => {
    if (!selected) return;
    try {
      const updated = await updateSubmission.mutateAsync({
        submissionId: selected.id,
        data: {
          status: statusDraft,
          ownerId: ownerDraft === "__unassigned" ? null : ownerDraft,
          notes: notesDraft.trim() || null,
        },
      });
      setSelected(updated);
      setStatusDraft(updated.status);
      setOwnerDraft(updated.ownerId ?? "__unassigned");
      setNotesDraft(updated.notes ?? "");
      await queryClient.invalidateQueries({ queryKey: getListSubmissionsQueryKey() });
      toast({ title: "Submission updated", description: "The workflow status, owner, and notes were saved." });
    } catch (error) {
      toast({
        title: "Submission update failed",
        description: errorMessage(error, "Your changes were not saved. Refresh and try again."),
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    if (isLoading || isError) {
      toast({
        title: "Export unavailable",
        description: isError ? "The submission list failed to load. Fix the list error before exporting." : "Wait for the submission list to finish loading.",
        variant: "destructive",
      });
      return;
    }
    exportSubmissions.mutate(
      {
        data: {
          format: "csv",
          status,
          kind,
        },
      },
      {
        onSuccess: (response) => {
          if (response.status === "ready" && response.downloadUrl) {
            const anchor = document.createElement("a");
            anchor.href = response.downloadUrl;
            anchor.download = `submissions-${new Date().toISOString().slice(0, 10)}.csv`;
            anchor.rel = "noopener";
            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();
            toast({ title: "Export download started", description: "The CSV contains the filters currently selected." });
          } else if (response.status === "queued") {
            toast({
              title: "Export queued",
              description: "The export is not ready yet; no download link is available.",
            });
          } else {
            toast({
              title: "Export unavailable",
              description: "The API marked the export ready but did not provide a download link. No file was downloaded.",
              variant: "destructive",
            });
          }
        },
        onError: (error) => {
          toast({
            title: "Export failed",
            description: errorMessage(error, "The CSV could not be prepared."),
            variant: "destructive",
          });
        },
      },
    );
  };

  const getStatusColor = (submissionStatus: SubmissionStatus) => {
    switch (submissionStatus) {
      case "new": return "bg-blue-500 text-white border-transparent";
      case "open": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "contacted": return "bg-primary/10 text-primary border-primary/20";
      case "resolved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "spam": return "bg-destructive/10 text-destructive border-destructive/20";
      case "unsubscribed": return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <InboxIcon className="w-6 h-6 text-primary" /> Inbox
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Website enquiries and subscriptions</p>
        </div>
        <Button onClick={handleExport} disabled={exportSubmissions.isPending || isLoading || isError} variant="outline" className="gap-2 font-mono uppercase tracking-wider text-xs" title={isError ? "Fix the list error before exporting" : undefined}>
          {exportSubmissions.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-border flex flex-wrap items-center gap-4 bg-muted/20">
          <div className="relative flex-1 min-w-60 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search email, name or organization..."
              className="pl-9 bg-background"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
            />
          </div>
          <Select value={kind || "all"} onValueChange={(value) => { setKind(value === "all" ? undefined : value as SubmissionKind); setPage(1); }}>
            <SelectTrigger className="w-[150px] bg-background"><SelectValue placeholder="All kinds" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All kinds</SelectItem>
              <SelectItem value="enquiry">Enquiries</SelectItem>
              <SelectItem value="newsletter">Newsletter</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status || "all"} onValueChange={(value) => { setStatus(value === "all" ? undefined : value as SubmissionStatus); setPage(1); }}>
            <SelectTrigger className="w-[180px] bg-background">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {STATUSES.map((value) => <SelectItem key={value} value={value}>{statusLabel(value)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isError ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 p-8 text-center" role="alert">
            <InboxIcon className="w-10 h-10 text-destructive/60" />
            <p className="font-medium text-destructive">Submissions could not be loaded.</p>
            <p className="max-w-md text-sm text-muted-foreground">{errorMessage(error, "Check your administrator session and try again.")}</p>
          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
                <TableRow>
                  <TableHead className="font-mono text-xs uppercase tracking-wider w-[110px]">Status</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Contact</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Kind</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Owner</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider">Market</TableHead>
                  <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Received</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></TableCell></TableRow>
                ) : data?.items.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground font-mono text-sm">No submissions found.</TableCell></TableRow>
                ) : (
                  data?.items.map((submission) => (
                    <TableRow
                      key={submission.id}
                      className="hover:bg-muted/20 cursor-pointer"
                      tabIndex={0}
                      onClick={() => openSubmission(submission)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" || event.key === " ") {
                          event.preventDefault();
                          openSubmission(submission);
                        }
                      }}
                      aria-label={`Open submission from ${submission.email}`}
                    >
                      <TableCell><Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider rounded-sm ${getStatusColor(submission.status)}`}>{statusLabel(submission.status)}</Badge></TableCell>
                      <TableCell>
                        <div className="font-medium text-foreground">{submission.name || "Unknown"}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{submission.email}</div>
                        {submission.organization && <div className="text-[10px] font-mono text-muted-foreground mt-1 opacity-70">{submission.organization}</div>}
                      </TableCell>
                      <TableCell><Badge variant="secondary" className="font-mono text-[10px] uppercase rounded-sm bg-secondary/50">{submission.kind}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{ownerOptions.find((owner) => owner.id === submission.ownerId)?.name ?? (submission.ownerId ? "Assigned user" : "Unassigned")}</TableCell>
                      <TableCell className="font-mono text-xs uppercase text-muted-foreground">{submission.market}</TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground text-right">{format(new Date(submission.createdAt), "MMM d, yyyy")}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {data && (
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between text-sm font-mono text-muted-foreground">
            <div>{data.total === 0 ? "No submissions" : `Showing ${((page - 1) * PAGE_SIZE) + 1} to ${Math.min(page * PAGE_SIZE, data.total)} of ${data.total}`}</div>
            {data.totalPages > 1 && <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((current) => current - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage((current) => current + 1)}>Next</Button>
            </div>}
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && !updateSubmission.isPending && setSelected(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Submission details</DialogTitle>
            <DialogDescription>
              {selected?.email} • Received {selected && format(new Date(selected.createdAt), "MMM d, yyyy HH:mm")}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-5 py-2">
              <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-4 text-sm sm:grid-cols-2">
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Contact</p><p>{selected.name || "Unknown"}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Type</p><p>{selected.kind}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Market</p><p>{selected.market}</p></div>
                <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Source</p><p className="break-all">{selected.sourcePage}</p></div>
                {selected.organization && <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Organization</p><p>{selected.organization}</p></div>}
                {selected.role && <div><p className="text-[10px] font-mono uppercase text-muted-foreground">Role</p><p>{selected.role}</p></div>}
                {selected.processArea && <div className="sm:col-span-2"><p className="text-[10px] font-mono uppercase text-muted-foreground">Process area</p><p>{selected.processArea}</p></div>}
                {selected.challenge && <div className="sm:col-span-2"><p className="text-[10px] font-mono uppercase text-muted-foreground">Challenge</p><p className="whitespace-pre-wrap">{selected.challenge}</p></div>}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Status</span>
                  <Select value={statusDraft} onValueChange={(value) => setStatusDraft(value as SubmissionStatus)} disabled={updateSubmission.isPending}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUSES.map((value) => <SelectItem key={value} value={value}>{statusLabel(value)}</SelectItem>)}</SelectContent>
                  </Select>
                </label>
                <label className="space-y-2">
                  <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Owner</span>
                  <Select value={ownerDraft} onValueChange={setOwnerDraft} disabled={updateSubmission.isPending || users.isError || users.isLoading}>
                    <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__unassigned">Unassigned</SelectItem>
                      {ownerOptions.map((owner) => <SelectItem key={owner.id} value={owner.id}>{owner.name} ({owner.role})</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {users.isError && <p className="text-xs text-destructive">Owners could not be loaded; status and notes can still be saved.</p>}
                </label>
              </div>
              <label className="space-y-2 block">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">Internal notes</span>
                <Textarea value={notesDraft} onChange={(event) => setNotesDraft(event.target.value)} maxLength={4000} rows={5} placeholder="Add a follow-up note for the editorial team…" disabled={updateSubmission.isPending} />
                <span className="block text-right text-[10px] font-mono text-muted-foreground">{notesDraft.length}/4000</span>
              </label>
            </div>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
            {selected?.sourcePage ? <Button variant="ghost" asChild><a href={selected.sourcePage} target="_blank" rel="noreferrer"><ExternalLink className="mr-2 h-4 w-4" />Open source page</a></Button> : <span />}
            <Button onClick={saveSubmission} disabled={!selected || updateSubmission.isPending}>
              {updateSubmission.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save workflow
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}