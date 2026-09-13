import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Loader2, Send, UserRoundCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { localAssignmentDate, savedAssignmentDate } from "./assignment-dates";
import {
  clearEditionAssignment,
  editorialErrorMessage,
  listEligibleEditorialAssignees,
  listEditionAssignments,
  requestRevisionReview,
  saveEditionAssignment,
  type EditorialAssignment,
  type EditorialAssignee,
} from "@/lib/editorial-work";

type EditionAssignmentControlProps = {
  editionId: string | null | undefined;
  documentId: string;
  market: string;
  locale: string;
  currentRevisionId: string | null | undefined;
  currentRevisionNumber: number | null | undefined;
  canRequestReview: boolean;
  canManage: boolean;
  currentUser?: { id: string; name: string };
};

function memberId(member: EditorialAssignment["editor"] | undefined) {
  return member?.id ?? "";
}

function AssigneeOptions({ assignees, selectedId, current }: {
  assignees: EditorialAssignee[];
  selectedId: string;
  current: EditorialAssignment["editor"];
}) {
  const includesSelected = !selectedId || assignees.some((assignee) => assignee.id === selectedId);
  return (
    <>
      <option value="">Unassigned</option>
      {!includesSelected && <option value={selectedId}>{current?.name ?? selectedId} (current)</option>}
      {assignees.map((assignee) => <option key={assignee.id} value={assignee.id}>{assignee.name} · {assignee.role}</option>)}
    </>
  );
}

/**
 * Assignment never grants access. The API validates both the actor's market
 * scope and each selected user's exact-edition authority; the UI mirrors that
 * boundary by rendering a read-only summary for unauthorized users.
 */
export function EditionAssignmentControl({
  editionId,
  documentId,
  market,
  locale,
  currentRevisionId,
  currentRevisionNumber,
  canRequestReview,
  canManage,
  currentUser,
}: EditionAssignmentControlProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const assignmentQuery = useQuery({
    queryKey: ["editorial-work", "assignments", editionId],
    queryFn: () => listEditionAssignments(editionId!),
    enabled: Boolean(editionId),
    staleTime: 15_000,
  });
  const assignment = assignmentQuery.data?.items[0];
  const assigneesQuery = useQuery({
    queryKey: ["editorial-work", "eligible-assignees", editionId],
    queryFn: () => listEligibleEditorialAssignees(editionId!),
    enabled: Boolean(editionId && canManage),
    staleTime: 15_000,
  });
  const [editorId, setEditorId] = useState("");
  const [reviewerId, setReviewerId] = useState("");
  const [dueAt, setDueAt] = useState("");
  const [reviewNote, setReviewNote] = useState("");

  useEffect(() => {
    setEditorId(memberId(assignment?.editor));
    setReviewerId(memberId(assignment?.reviewer));
    setDueAt(localAssignmentDate(assignment?.dueAt));
  }, [assignment?.editor, assignment?.reviewer, assignment?.dueAt, editionId]);

  const invalidateWork = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["editorial-work", "assignments", editionId] }),
    queryClient.invalidateQueries({ queryKey: ["editorial-work", "my"] }),
    queryClient.invalidateQueries({ queryKey: ["editorial-work", "team"] }),
    queryClient.invalidateQueries({ queryKey: ["editorial-work", "notifications"] }),
  ]);

  const saveAssignment = useMutation({
    mutationFn: () => saveEditionAssignment(editionId!, {
      editorId: editorId.trim() || null,
      reviewerId: reviewerId.trim() || null,
      dueAt: savedAssignmentDate(dueAt, assignment?.dueAt),
    }),
    onSuccess: async () => {
      await invalidateWork();
      toast({ title: "Edition assignment saved", description: `${market.toUpperCase()} · ${locale} now has its current assignment.` });
    },
    onError: (error) => toast({
      title: "Assignment was not saved",
      description: editorialErrorMessage(error, "Check the selected users' active status and access to this exact edition."),
      variant: "destructive",
    }),
  });
  const removeAssignment = useMutation({
    mutationFn: () => clearEditionAssignment(editionId!),
    onSuccess: async () => {
      await invalidateWork();
      toast({ title: "Edition assignment cleared" });
    },
    onError: (error) => toast({ title: "Assignment could not be cleared", description: editorialErrorMessage(error, "Try again."), variant: "destructive" }),
  });
  const review = useMutation({
    mutationFn: () => requestRevisionReview(currentRevisionId!, {
      reviewerId: reviewerId.trim() || undefined,
      note: reviewNote.trim() || undefined,
    }),
    onSuccess: async () => {
      setReviewNote("");
      await invalidateWork();
      toast({ title: "Review requested", description: `Revision ${currentRevisionNumber ?? ""} is now an exact review request.`.trim() });
    },
    onError: (error) => toast({
      title: "Review was not requested",
      description: editorialErrorMessage(error, "Save an assigned reviewer first, or provide an eligible reviewer ID."),
      variant: "destructive",
    }),
  });

  if (!editionId) {
    return (
      <section className="rounded-lg border bg-card p-4" aria-label="Edition assignment">
        <h2 className="text-sm font-semibold">Edition assignment</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Assignment is unavailable until this exact {market.toUpperCase()} · {locale} edition has a saved target identity.
        </p>
      </section>
    );
  }

  const busy = saveAssignment.isPending || removeAssignment.isPending || review.isPending;
  const eligibleAssignees = assigneesQuery.data?.items ?? [];
  const eligibleReviewers = eligibleAssignees.filter((assignee) => assignee.id !== editorId && (assignee.role === "publisher" || assignee.role === "administrator"));
  const assigneeControlsDisabled = busy || assigneesQuery.isLoading || assigneesQuery.isError;
  return (
    <section className="rounded-lg border bg-card p-4" aria-label="Edition assignment">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold"><UserRoundCheck className="h-4 w-4" /> Edition assignment</h2>
          <p className="mt-1 text-xs text-muted-foreground">Exact target: {market === "shared-source" ? "Shared source" : market.toUpperCase()} · {locale}</p>
        </div>
        {assignment?.status && <span className="rounded border px-2 py-0.5 text-[10px] font-mono uppercase">{assignment.status}</span>}
      </div>

      {assignmentQuery.isLoading ? <p className="mt-3 text-xs text-muted-foreground">Loading assignment…</p> : null}
      {assignmentQuery.isError ? (
        <p role="alert" className="mt-3 text-xs text-destructive">
          Assignment could not be loaded. {editorialErrorMessage(assignmentQuery.error, "Check your access and retry.")}
          <Button type="button" variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => void assignmentQuery.refetch()}>Retry</Button>
        </p>
      ) : null}
      {canManage && assigneesQuery.isLoading && <p className="mt-3 text-xs text-muted-foreground">Loading eligible assignees…</p>}
      {canManage && assigneesQuery.isError && (
        <p role="alert" className="mt-3 text-xs text-destructive">
          Eligible assignees could not be loaded. {editorialErrorMessage(assigneesQuery.error, "Check your access and retry.")}
          <Button type="button" variant="link" size="sm" className="h-auto px-1 text-xs" onClick={() => void assigneesQuery.refetch()}>Retry</Button>
        </p>
      )}
      {!assignmentQuery.isLoading && !assignmentQuery.isError && !canManage && (
        <p className="mt-3 text-xs text-muted-foreground">
          Editor: {assignment?.editor?.name ?? "Unassigned"} · Reviewer: {assignment?.reviewer?.name ?? "Unassigned"}
          {assignment?.dueAt ? ` · Due ${new Date(assignment.dueAt).toLocaleDateString()}` : ""}. You can inspect this assignment but cannot change it for this market.
        </p>
      )}

      {canManage && !assignmentQuery.isError && !assigneesQuery.isError && (
        <div className="mt-3 space-y-3 border-t pt-3">
          <div className="grid gap-2 sm:grid-cols-3">
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Editor</span>
              <select aria-label="Assigned editor" value={editorId} onChange={(event) => { setEditorId(event.target.value); if (reviewerId === event.target.value) setReviewerId(""); }} disabled={assigneeControlsDisabled} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                <AssigneeOptions assignees={eligibleAssignees} selectedId={editorId} current={assignment?.editor ?? null} />
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Reviewer</span>
              <select aria-label="Assigned reviewer" value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} disabled={assigneeControlsDisabled} className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm">
                <AssigneeOptions assignees={eligibleReviewers} selectedId={reviewerId} current={assignment?.reviewer ?? null} />
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-[10px] font-mono uppercase text-muted-foreground">Due</span>
              <Input aria-label="Assignment due date" type="datetime-local" value={dueAt} onChange={(event) => setDueAt(event.target.value)} disabled={assigneeControlsDisabled} />
            </label>
          </div>
          <div className="flex flex-wrap gap-2">
            {currentUser && eligibleAssignees.some((assignee) => assignee.id === currentUser.id) && <Button type="button" variant="outline" size="sm" disabled={assigneeControlsDisabled} onClick={() => setEditorId(currentUser.id)}>Assign me as editor</Button>}
            <Button type="button" size="sm" disabled={assigneeControlsDisabled} onClick={() => saveAssignment.mutate()}>
              {saveAssignment.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="mr-1 h-3.5 w-3.5" />} Save assignment
            </Button>
            {assignment && <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={() => removeAssignment.mutate()}><X className="mr-1 h-3.5 w-3.5" />Clear</Button>}
          </div>
          {saveAssignment.isError && (
            <p role="alert" className="text-xs text-destructive">
              Assignment was not saved. {editorialErrorMessage(saveAssignment.error, "Check the selected users' access and retry.")}
            </p>
          )}

          {currentRevisionId && (
            <div className="grid gap-2 rounded border bg-muted/20 p-3 sm:grid-cols-[1fr_auto]">
              <label className="space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground">Review note (optional)</span>
                <Textarea aria-label="Review request note" rows={2} maxLength={2000} value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} disabled={busy} placeholder="The reviewer receives this exact saved revision." />
              </label>
              <Button type="button" size="sm" className="self-end" disabled={busy || !canRequestReview} onClick={() => review.mutate()}>
                {review.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />} Request review
              </Button>
              {!canRequestReview && <p className="text-xs text-muted-foreground sm:col-span-2">Submit this exact saved revision for review before creating its reviewer request.</p>}
            </div>
          )}
        </div>
      )}
    </section>
  );
}