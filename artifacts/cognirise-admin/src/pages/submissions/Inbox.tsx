import { useState } from "react";
import { useListSubmissions, getListSubmissionsQueryKey, SubmissionStatus, useExportSubmissions } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, Inbox as InboxIcon, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";

export default function Inbox() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<SubmissionStatus | undefined>();
  const { toast } = useToast();

  const { data, isLoading } = useListSubmissions({
    page,
    pageSize: 20,
    search: search || undefined,
    status
  }, { query: { queryKey: getListSubmissionsQueryKey({ page, pageSize: 20, search: search || undefined, status }) } });

  const exportSubmissions = useExportSubmissions();

  const handleExport = () => {
    exportSubmissions.mutate({
      data: {
        format: "csv",
        status
      }
    }, {
      onSuccess: (res) => {
        if (res.downloadUrl) {
          window.open(res.downloadUrl, "_blank");
        } else {
          toast({ title: "Export queued", description: "You will be notified when ready." });
        }
      },
      onError: (err) => {
        toast({ title: "Export failed", description: (err as any).error, variant: "destructive" });
      }
    });
  };

  const getStatusColor = (s: SubmissionStatus) => {
    switch (s) {
      case "new": return "bg-blue-500 text-white border-transparent";
      case "open": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "contacted": return "bg-primary/10 text-primary border-primary/20";
      case "resolved": return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
      case "spam": return "bg-destructive/10 text-destructive border-destructive/20";
      default: return "bg-muted text-muted-foreground border-border";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <InboxIcon className="w-6 h-6 text-primary" /> Inbox
          </h1>
          <p className="text-sm text-muted-foreground font-mono mt-1">Website enquiries and subscriptions</p>
        </div>
        <Button onClick={handleExport} disabled={exportSubmissions.isPending} variant="outline" className="gap-2 font-mono uppercase tracking-wider text-xs">
          {exportSubmissions.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Export CSV
        </Button>
      </div>

      <div className="bg-card border border-border rounded-xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-border flex items-center gap-4 bg-muted/20">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input 
              placeholder="Search email, name or organization..." 
              className="pl-9 bg-background"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={status || "all"} onValueChange={(v) => setStatus(v === "all" ? undefined : v as SubmissionStatus)}>
            <SelectTrigger className="w-[180px] bg-background">
              <Filter className="w-4 h-4 mr-2 text-muted-foreground" />
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex-1 overflow-auto custom-scrollbar">
          <Table>
            <TableHeader className="bg-muted/30 sticky top-0 backdrop-blur-sm">
              <TableRow>
                <TableHead className="font-mono text-xs uppercase tracking-wider w-[100px]">Status</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Contact</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Kind</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider">Market</TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-right">Received</TableHead>
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
                    No submissions found.
                  </TableCell>
                </TableRow>
              ) : (
                data?.items.map(sub => (
                  <TableRow key={sub.id} className="hover:bg-muted/20 cursor-pointer">
                    <TableCell>
                      <Badge variant="outline" className={`font-mono text-[10px] uppercase tracking-wider rounded-sm ${getStatusColor(sub.status)}`}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-foreground">{sub.name || "Unknown"}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">{sub.email}</div>
                      {sub.organization && <div className="text-[10px] font-mono text-muted-foreground mt-1 opacity-70">{sub.organization}</div>}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="font-mono text-[10px] uppercase rounded-sm bg-secondary/50">
                        {sub.kind}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs uppercase text-muted-foreground">
                      {sub.market}
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground text-right">
                      {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {data && data.totalPages > 1 && (
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between text-sm font-mono text-muted-foreground">
            <div>Showing {((page - 1) * 20) + 1} to {Math.min(page * 20, data.total)} of {data.total}</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Prev</Button>
              <Button variant="outline" size="sm" disabled={page === data.totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
