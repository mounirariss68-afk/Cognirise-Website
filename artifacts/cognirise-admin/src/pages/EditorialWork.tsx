import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { formatDistanceToNow } from "date-fns";
import { Bell, CheckCheck, CircleAlert, Clock3, Loader2, MailCheck, UserRoundCheck, UsersRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGetSession } from "@workspace/api-client-react";
import {
  editorialErrorMessage,
  decideReviewRequest,
  getDigestStatus,
  getEditorialNotifications,
  getMyEditorialWork,
  getTeamEditorialWork,
  markAllEditorialNotificationsRead,
  markEditorialNotificationRead,
  markEditorialNotificationUnread,
  saveDigestPreferences,
  type EditorialWorkItem,
  type EditorialWorkStatus,
} from "@/lib/editorial-work";
import { editorialAdminHref, isOverdue, revisionStateLabel } from "./editorial-work-state";

type Panel = "my-work" | "team" | "notifications";

function QueueCard({ item, canDecide, onDecision, deciding }: {
  item: EditorialWorkItem;
  canDecide: boolean;
  onDecision: (reviewRequestId: string, decision: "approved" | "rejected") => void;
  deciding: boolean;
}) {
  const href = editorialAdminHref(item.link, {
    documentId: item.documentId,
    market: item.market,
    locale: item.locale,
  });
  const overdue = isOverdue(item.dueAt);
  const pendingReviewRequest = item.reviewRequest?.status === "requested"
    ? item.reviewRequest
    : undefined;
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <Link href={href} className="font-semibold text-foreground hover:underline">{item.documentTitle}</Link>
          <p className="mt-1 text-[11px] font-mono uppercase tracking-wide text-muted-foreground">{item.documentKind} · {item.market === "shared-source" ? "Shared source" : item.market} · {item.locale}</p>
        </div>
        <Badge variant={item.status === "blocked" ? "destructive" : "outline"} className="font-mono text-[10px] uppercase">{item.status}</Badge>
      </div>
      <p className={`mt-3 text-xs ${item.publishedRevisionId && item.currentRevisionId !== item.publishedRevisionId ? "text-amber-700" : "text-muted-foreground"}`}>
        {revisionStateLabel(item)}
      </p>
      {item.blockedReason && <p className="mt-2 text-xs text-destructive">{item.blockedReason}</p>}
      <div className="mt-3 grid gap-1 border-t pt-3 text-xs text-muted-foreground sm:grid-cols-2">
        <span>Editor: <strong className="font-medium text-foreground">{item.editor?.name ?? "Unassigned"}</strong></span>
        <span>Reviewer: <strong className="font-medium text-foreground">{item.reviewer?.name ?? "Unassigned"}</strong></span>
        {item.dueAt && <span className={overdue ? "font-medium text-destructive" : ""}>Due {new Date(item.dueAt).toLocaleString()}{overdue ? " · overdue" : ""}</span>}
        {item.reviewRequest?.status && <span>Review: <strong className="font-medium text-foreground">{item.reviewRequest.status}</strong></span>}
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Link href={href} className="inline-block text-xs font-medium text-primary hover:underline">Open exact edition</Link>
        {pendingReviewRequest && canDecide && (
          <>
            <Button type="button" size="sm" variant="outline" disabled={deciding} onClick={() => onDecision(pendingReviewRequest.id, "approved")}>Approve revision</Button>
            <Button type="button" size="sm" variant="outline" className="text-destructive" disabled={deciding} onClick={() => onDecision(pendingReviewRequest.id, "rejected")}>Request changes</Button>
          </>
        )}
      </div>
    </article>
  );
}

function QueueState({
  isLoading,
  isError,
  error,
  emptyState,
  items,
  onRetry,
  canDecide,
  onDecision,
  deciding,
}: {
  isLoading: boolean;
  isError: boolean;
  error: unknown;
  emptyState?: string;
  items?: EditorialWorkItem[];
  onRetry: () => void;
  canDecide?: (item: EditorialWorkItem) => boolean;
  onDecision?: (reviewRequestId: string, decision: "approved" | "rejected") => void;
  deciding?: boolean;
}) {
  if (isLoading) return <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (isError) return <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">Work queue could not be loaded. {editorialErrorMessage(error, "Check your access and try again.")} <Button variant="link" className="h-auto p-1 text-destructive" onClick={onRetry}>Retry</Button></div>;
  if (emptyState === "no-access") return <div role="alert" className="rounded-lg border border-amber-400/50 bg-amber-50 p-5 text-sm text-amber-950">You do not have access to this queue. Access is not represented as an empty work list.</div>;
  if (!items?.length) return <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">{emptyState === "load-failed" ? "The server could not load this queue. Retry to see current work." : "No editorial work matches this queue."}</div>;
  return <div className="grid gap-3 lg:grid-cols-2">{items.map((item) => <QueueCard key={item.id} item={item} canDecide={Boolean(canDecide?.(item))} onDecision={onDecision ?? (() => {})} deciding={Boolean(deciding)} />)}</div>;
}

export default function EditorialWork() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: session } = useGetSession();
  const canViewTeam = session?.user.role === "publisher" || session?.user.role === "administrator";
  const [panel, setPanel] = useState<Panel>("my-work");
  const [teamMarket, setTeamMarket] = useState("");
  const [teamAssigneeId, setTeamAssigneeId] = useState("");
  const [teamStatus, setTeamStatus] = useState<EditorialWorkStatus | undefined>();
  const [includeUnassigned, setIncludeUnassigned] = useState(true);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [decisionTarget, setDecisionTarget] = useState<{ reviewRequestId: string; decision: "approved" | "rejected" } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");

  const myWork = useQuery({
    queryKey: ["editorial-work", "my", false],
    queryFn: () => getMyEditorialWork(false),
    staleTime: 15_000,
  });
  const teamWork = useQuery({
    queryKey: ["editorial-work", "team", teamMarket, teamAssigneeId, teamStatus, includeUnassigned],
    queryFn: () => getTeamEditorialWork({
      market: teamMarket.trim() || undefined,
      assigneeId: teamAssigneeId.trim() || undefined,
      status: teamStatus,
      includeUnassigned,
    }),
    enabled: canViewTeam && panel === "team",
    staleTime: 15_000,
  });
  const notifications = useQuery({
    queryKey: ["editorial-work", "notifications", unreadOnly],
    queryFn: () => getEditorialNotifications(unreadOnly),
    staleTime: 15_000,
  });
  const digest = useQuery({
    queryKey: ["editorial-work", "digest-status"],
    queryFn: getDigestStatus,
    staleTime: 30_000,
  });
  const markRead = useMutation({
    mutationFn: markEditorialNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["editorial-work", "notifications"] });
    },
    onError: (error) => toast({ title: "Notification was not updated", description: editorialErrorMessage(error, "Try again."), variant: "destructive" }),
  });
  const markAllRead = useMutation({
    mutationFn: markAllEditorialNotificationsRead,
    onSuccess: async ({ count }) => {
      await queryClient.invalidateQueries({ queryKey: ["editorial-work", "notifications"] });
      toast({ title: count ? `${count} notifications marked read` : "No unread notifications" });
    },
    onError: (error) => toast({ title: "Notifications were not updated", description: editorialErrorMessage(error, "Try again."), variant: "destructive" }),
  });
  const markUnread = useMutation({
    mutationFn: markEditorialNotificationUnread,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["editorial-work", "notifications"] });
    },
    onError: (error) => toast({ title: "Notification was not updated", description: editorialErrorMessage(error, "Try again."), variant: "destructive" }),
  });
  const updateDigest = useMutation({
    mutationFn: saveDigestPreferences,
    onSuccess: async (status) => {
      await queryClient.setQueryData(["editorial-work", "digest-status"], status);
      toast({ title: status.enabled ? "Digest enabled" : "Digest disabled" });
    },
    onError: (error) => toast({ title: "Digest preference was not saved", description: editorialErrorMessage(error, "Try again."), variant: "destructive" }),
  });
  const decideReview = useMutation({
    mutationFn: ({ reviewRequestId, decision, note }: { reviewRequestId: string; decision: "approved" | "rejected"; note?: string }) =>
      decideReviewRequest(reviewRequestId, { decision, note }),
    onSuccess: async () => {
      setDecisionTarget(null);
      setDecisionNote("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["editorial-work", "my"] }),
        queryClient.invalidateQueries({ queryKey: ["editorial-work", "team"] }),
        queryClient.invalidateQueries({ queryKey: ["editorial-work", "notifications"] }),
      ]);
      toast({ title: "Review decision saved" });
    },
    onError: (error) => toast({
      title: "Review decision was not saved",
      description: editorialErrorMessage(error, "Only the designated reviewer may decide this exact revision."),
      variant: "destructive",
    }),
  });
  const unreadCount = notifications.data?.items.filter((item) => !item.readAt).length ?? 0;
  const canDecide = (item: EditorialWorkItem) => Boolean(
    session?.user.id && item.reviewRequest?.reviewerId === session.user.id
    && ["publisher", "administrator"].includes(session.user.role),
  );

  return (
    <div className="mx-auto w-full max-w-7xl p-6 md:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight"><UserRoundCheck className="h-6 w-6 text-primary" />Editorial work</h1>
          <p className="mt-1 text-sm text-muted-foreground">Assignments, exact revision reviews, and delivery signals.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant={panel === "my-work" ? "default" : "outline"} size="sm" onClick={() => setPanel("my-work")}>My work</Button>
          {canViewTeam && <Button variant={panel === "team" ? "default" : "outline"} size="sm" onClick={() => setPanel("team")}><UsersRound className="mr-1 h-3.5 w-3.5" />Team queue</Button>}
          <Button variant={panel === "notifications" ? "default" : "outline"} size="sm" onClick={() => setPanel("notifications")}><Bell className="mr-1 h-3.5 w-3.5" />Notifications{unreadCount ? ` (${unreadCount})` : ""}</Button>
        </div>
      </div>

      <section className="mt-6 rounded-xl border bg-card p-4 shadow-sm" aria-label="Digest delivery">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold"><MailCheck className="h-4 w-4" />Optional notification digest</h2>
            {digest.isLoading ? <p className="mt-1 text-xs text-muted-foreground">Loading digest delivery status…</p> : digest.isError ? <p role="alert" className="mt-1 text-xs text-destructive">Digest status could not be loaded. {editorialErrorMessage(digest.error, "Try again.")}</p> : (
              <p className="mt-1 text-xs text-muted-foreground">
                {digest.data?.configured ? (digest.data.enabled ? "Opted in to the configured digest." : "Opt out is active; no digest will be sent.") : "Digest delivery is not configured. No email is sent."}
                {digest.data?.lastSentAt ? ` Last sent ${formatDistanceToNow(new Date(digest.data.lastSentAt), { addSuffix: true })}.` : ""}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={Boolean(digest.data?.enabled)}
              disabled={!digest.data?.configured || updateDigest.isPending || digest.isLoading || digest.isError}
              onCheckedChange={(enabled) => updateDigest.mutate(enabled)}
              aria-label="Opt in to notification digest"
            />
            <span className="text-xs font-medium">{digest.data?.enabled ? "Enabled" : "Disabled"}</span>
          </div>
        </div>
        {digest.data?.lastError && <p role="alert" className="mt-3 flex items-center gap-1 rounded border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"><CircleAlert className="h-3.5 w-3.5" />Last delivery failed: {digest.data.lastError}</p>}
      </section>

      <section className="mt-6">
        {panel === "my-work" && <>
          <div className="mb-3 flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">My work</h2></div>
          <QueueState isLoading={myWork.isLoading} isError={myWork.isError} error={myWork.error} emptyState={myWork.data?.emptyState} items={myWork.data?.items} onRetry={() => void myWork.refetch()} canDecide={canDecide} deciding={decideReview.isPending} onDecision={(reviewRequestId, decision) => { setDecisionNote(""); setDecisionTarget({ reviewRequestId, decision }); }} />
        </>}
        {panel === "team" && canViewTeam && <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Team queue</h2></div><label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={includeUnassigned} onCheckedChange={setIncludeUnassigned} />Include unassigned</label></div>
          <div className="mb-4 flex flex-wrap gap-2 rounded-lg border bg-muted/20 p-3">
            <Input className="h-8 w-36" aria-label="Filter team queue by market" placeholder="Market code" value={teamMarket} onChange={(event) => setTeamMarket(event.target.value)} />
            <Input className="h-8 min-w-52 flex-1" aria-label="Filter team queue by assignee ID" placeholder="Assignee UUID" value={teamAssigneeId} onChange={(event) => setTeamAssigneeId(event.target.value)} />
            <Select value={teamStatus ?? "all"} onValueChange={(value) => setTeamStatus(value === "all" ? undefined : value as EditorialWorkStatus)}>
              <SelectTrigger className="h-8 w-36" aria-label="Filter team queue by status"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">All statuses</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="blocked">Blocked</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent>
            </Select>
          </div>
          <QueueState isLoading={teamWork.isLoading} isError={teamWork.isError} error={teamWork.error} emptyState={teamWork.data?.emptyState} items={teamWork.data?.items} onRetry={() => void teamWork.refetch()} canDecide={canDecide} deciding={decideReview.isPending} onDecision={(reviewRequestId, decision) => { setDecisionNote(""); setDecisionTarget({ reviewRequestId, decision }); }} />
        </>}
        {panel === "notifications" && <>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Bell className="h-4 w-4 text-muted-foreground" /><h2 className="text-sm font-semibold">Notifications</h2></div><div className="flex items-center gap-2"><label className="flex items-center gap-2 text-xs text-muted-foreground"><Switch checked={unreadOnly} onCheckedChange={setUnreadOnly} />Unread only</label><Button size="sm" variant="outline" disabled={markAllRead.isPending || !unreadCount} onClick={() => markAllRead.mutate()}><CheckCheck className="mr-1 h-3.5 w-3.5" />Mark all read</Button></div></div>
          {notifications.isLoading ? <div className="flex min-h-48 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> : notifications.isError ? <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">Notifications could not be loaded. {editorialErrorMessage(notifications.error, "Try again.")} <Button variant="link" className="h-auto p-1 text-destructive" onClick={() => void notifications.refetch()}>Retry</Button></div> : !notifications.data?.items.length ? <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">No {unreadOnly ? "unread " : ""}notifications.</div> : <div className="space-y-2">{notifications.data.items.map((notification) => <article key={notification.id} className={`flex flex-wrap items-start justify-between gap-3 rounded-lg border p-4 ${notification.readAt ? "bg-card" : "border-primary/40 bg-primary/[0.03]"}`}><div className="min-w-0 flex-1"><div className="flex items-center gap-2"><p className="text-sm font-medium">{notification.title}</p>{!notification.readAt && <Badge className="text-[9px] uppercase">Unread</Badge>}</div><p className="mt-1 text-xs text-muted-foreground">{notification.message}</p><p className="mt-2 text-[10px] font-mono text-muted-foreground">{formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })} · {notification.deliveryStatus}</p>{notification.link && <Link className="mt-2 inline-block text-xs font-medium text-primary hover:underline" href={editorialAdminHref(notification.link)}>Open exact edition</Link>}</div>{notification.readAt ? <Button size="sm" variant="outline" disabled={markUnread.isPending} onClick={() => markUnread.mutate(notification.id)}>Mark unread</Button> : <Button size="sm" variant="outline" disabled={markRead.isPending} onClick={() => markRead.mutate(notification.id)}>Mark read</Button>}</article>)}</div>}
        </>}
      </section>
      <Dialog open={Boolean(decisionTarget)} onOpenChange={(open) => { if (!open && !decideReview.isPending) setDecisionTarget(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decisionTarget?.decision === "rejected" ? "Request changes" : "Approve exact revision"}</DialogTitle>
            <DialogDescription>Approval does not publish content. A newer revision requires a fresh review.</DialogDescription>
          </DialogHeader>
          <label className="text-sm" htmlFor="editorial-decision-note">Review comment{decisionTarget?.decision === "rejected" ? " (required)" : " (optional)"}</label>
          <Textarea id="editorial-decision-note" value={decisionNote} onChange={(event) => setDecisionNote(event.target.value)} maxLength={2000} disabled={decideReview.isPending} />
          {decideReview.isError && <p role="alert" className="text-sm text-destructive">{editorialErrorMessage(decideReview.error, "The decision was not saved. Your comment is preserved.")}</p>}
          <DialogFooter>
            <Button variant="outline" disabled={decideReview.isPending} onClick={() => setDecisionTarget(null)}>Cancel</Button>
            <Button disabled={!decisionTarget || decideReview.isPending || (decisionTarget.decision === "rejected" && !decisionNote.trim())} onClick={() => { if (decisionTarget) decideReview.mutate({ ...decisionTarget, note: decisionNote.trim() || undefined }); }}>
              {decideReview.isPending ? "Saving…" : "Confirm decision"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}