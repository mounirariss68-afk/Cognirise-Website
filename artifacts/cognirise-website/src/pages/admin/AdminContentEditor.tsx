import React, { useState, useEffect, useRef } from "react";
import { 
  useGetCmsAdminDocument, 
  useGetCmsAdminEdition, 
  useUpdateCmsAdminEdition,
  useTransitionCmsAdminWorkflow,
  useIssueCmsAdminPreview,
  useListCmsAdminEditionRevisions,
  useRollbackCmsAdminEdition,
  useGetCmsAdminRevisionDiff,
  useGetCmsAdminRevision,
  getGetCmsAdminDocumentQueryKey,
  getGetCmsAdminEditionQueryKey,
  getGetCmsAdminRevisionDiffQueryKey,
  getGetCmsAdminRevisionQueryKey,
  getListCmsAdminEditionRevisionsQueryKey
} from "@workspace/api-client-react";
import { useParams, useLocation } from "wouter";
import { Loader2, Save, ExternalLink, ArrowLeft, GitCommit, PlayCircle, ShieldCheck, CheckCircle2, History, RotateCcw, Activity } from "lucide-react";
import { queryClient } from "@/lib/queryClient";
import { buildCmsPreviewUrl } from "@/lib/cms-preview";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { format } from "date-fns";

function DiffViewer({ currentRevisionId, againstRevisionId }: { currentRevisionId: string, againstRevisionId: string }) {
  const { data, isLoading } = useGetCmsAdminRevisionDiff(currentRevisionId, againstRevisionId, { query: { enabled: !!currentRevisionId && !!againstRevisionId, queryKey: getGetCmsAdminRevisionDiffQueryKey(currentRevisionId, againstRevisionId) } });

  if (isLoading) return <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-white/50" /></div>;
  if (!data || data.changes.length === 0) return <div className="p-4 text-white/50 text-sm">No changes found.</div>;

  return (
    <div className="space-y-2 p-2">
      {data.changes.map((change, i) => (
        <div key={i} className="bg-black/20 p-2 rounded border border-white/5 font-mono text-xs">
          <div className="text-white/60 mb-1">{change.path}</div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-1.5 rounded whitespace-pre-wrap break-words">{JSON.stringify(change.before)}</div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-200 p-1.5 rounded whitespace-pre-wrap break-words">{JSON.stringify(change.after)}</div>
          </div>
        </div>
      ))}
    </div>
  );
}

function RevisionDetail({ revisionId }: { revisionId: string | null }) {
  const detail = useGetCmsAdminRevision(revisionId ?? "", {
    query: {
      enabled: Boolean(revisionId),
      queryKey: getGetCmsAdminRevisionQueryKey(revisionId ?? ""),
    },
  });
  if (!revisionId) return null;
  if (detail.isLoading) return <p className="text-xs text-white/50">Loading revision details…</p>;
  if (detail.isError || !detail.data) return <p className="text-xs text-red-300">Revision details are unavailable.</p>;
  return <p className="text-xs text-white/50">Revision {detail.data.revision.revisionNumber} · {detail.data.revision.contentDigest.slice(0, 12)}</p>;
}

function RollbackModal({ open, onOpenChange, editionId, expectedVersion, currentDraftId, documentId, market }: { open: boolean, onOpenChange: (o: boolean) => void, editionId: string, expectedVersion: number, currentDraftId: string, documentId: string, market: any }) {
  const { data, isLoading } = useListCmsAdminEditionRevisions(documentId, market, { query: { enabled: open, queryKey: getListCmsAdminEditionRevisionsQueryKey(documentId, market) } });
  const rollback = useRollbackCmsAdminEdition();
  const { toast } = useToast();
  const [selectedRev, setSelectedRev] = useState<string | null>(null);

  const handleRollback = (revId: string) => {
    rollback.mutate({
      documentId,
      market,
      data: {
        expectedVersion,
        revisionId: revId
      }
    }, {
      onSuccess: (res) => {
        toast({ title: "Rolled back successfully", description: "The edition has been restored." });
        queryClient.invalidateQueries({ queryKey: getGetCmsAdminEditionQueryKey(documentId, market) });
        onOpenChange(false);
      },
      onError: (err: any) => {
        toast({ title: "Rollback failed", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0A101C] border-white/10 text-white sm:max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Revision History</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pt-4 space-y-2">
          {isLoading ? (
            <div className="p-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--brand-violet))]" /></div>
          ) : data?.revisions.map((rev) => (
            <div key={rev.id} className="bg-white/5 border border-white/10 rounded p-3 text-sm flex flex-col">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-mono text-white/80">{rev.id.substring(0,8)} <span className="text-white/40 ml-2">v{rev.revisionNumber}</span></div>
                  <div className="text-white/50 text-xs mt-1">{format(new Date(rev.createdAt), "MMM d, HH:mm")} &bull; {rev.reason}</div>
                </div>
                {rev.id !== currentDraftId ? (
                  <button 
                    onClick={() => handleRollback(rev.id)}
                    disabled={rollback.isPending}
                    className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded text-xs transition-colors flex items-center gap-1.5"
                  >
                    <RotateCcw className="h-3 w-3" /> Restore
                  </button>
                ) : (
                  <span className="text-xs text-[hsl(var(--brand-violet))] font-medium bg-[hsl(var(--brand-violet))/10] px-2 py-1 rounded">Current Draft</span>
                )}
              </div>
              
              {rev.id !== currentDraftId && (
                <div className="mt-2 pt-2 border-t border-white/5">
                   <button onClick={() => setSelectedRev(selectedRev === rev.id ? null : rev.id)} className="text-xs text-white/60 hover:text-white flex items-center gap-1">
                    <Activity className="h-3 w-3" /> {selectedRev === rev.id ? "Hide diff" : "Show diff vs current draft"}
                  </button>
                  {selectedRev === rev.id && (
                    <div className="mt-2 max-h-48 overflow-y-auto rounded bg-black/40">
                       <RevisionDetail revisionId={rev.id} />
                      <DiffViewer currentRevisionId={currentDraftId} againstRevisionId={rev.id} />
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminContentEditor() {
  const { documentId, market } = useParams<{ documentId: string, market: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const docQuery = useGetCmsAdminDocument(documentId || "", { query: { enabled: !!documentId, queryKey: getGetCmsAdminDocumentQueryKey(documentId || "") } });
  const editionQuery = useGetCmsAdminEdition(documentId || "", market as any, { query: { enabled: !!documentId && !!market, queryKey: getGetCmsAdminEditionQueryKey(documentId || "", market as any) } });
  
  const updateMutation = useUpdateCmsAdminEdition();
  const transitionMutation = useTransitionCmsAdminWorkflow();
  const previewMutation = useIssueCmsAdminPreview();

  const [payloadStr, setPayloadStr] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const initializedFor = useRef<string | null>(null);

  const doc = docQuery.data?.document;
  const edition = editionQuery.data?.edition;
  const draft = editionQuery.data?.draft;

  useEffect(() => {
    if (draft && edition && initializedFor.current !== `${documentId}-${market}-${edition.version}`) {
      initializedFor.current = `${documentId}-${market}-${edition.version}`;
      setPayloadStr(JSON.stringify(draft.payload, null, 2));
    }
  }, [draft, edition, documentId, market]);

  const savedPayload = draft ? JSON.stringify(draft.payload, null, 2) : "";
  const hasUnsavedChanges = Boolean(payloadStr && payloadStr !== savedPayload);
  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!hasUnsavedChanges) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [hasUnsavedChanges]);

  if (docQuery.isLoading || editionQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-violet))]" />
      </div>
    );
  }

  if (docQuery.isError || editionQuery.isError || !doc || !edition) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        Failed to load document or edition.
      </div>
    );
  }

  const handleSave = () => {
    try {
      const parsed = JSON.parse(payloadStr);
      updateMutation.mutate({
        documentId: documentId as string,
        market: market as any,
        data: {
          expectedVersion: edition.version,
          payload: parsed
        }
      }, {
        onSuccess: (res) => {
          queryClient.setQueryData(getGetCmsAdminEditionQueryKey(documentId || "", market as any), res);
          toast({ title: "Saved successfully", description: "Your changes have been recorded immutably." });
        },
        onError: (err: any) => {
          toast({ title: "Failed to save", description: err.message || "Conflict error", variant: "destructive" });
        }
      });
    } catch (e: any) {
      toast({ title: "Invalid JSON", description: "Please ensure the payload is valid JSON.", variant: "destructive" });
    }
  };

  const handlePreview = () => {
    if (!draft) return;
    previewMutation.mutate({
      documentId: documentId as string,
      market: market as any,
      data: { revisionId: draft.id }
    }, {
      onSuccess: (res) => {
        const previewUrl = buildCmsPreviewUrl({
          basePath: import.meta.env.BASE_URL,
          market: market as string,
          localizedSlug: edition.localizedSlug,
          canonicalSlug: doc.canonicalSlug,
          routeKind: doc.routeKind,
          token: res.token,
        });
        if (!previewUrl) {
          toast({ title: "Preview unavailable", description: "This document needs a valid slug and route kind.", variant: "destructive" });
          return;
        }
        window.open(previewUrl, "_blank", "noopener,noreferrer");
      },
      onError: (err: any) => {
        toast({ title: "Preview failed", description: err.message || "You may not have access to preview this edition.", variant: "destructive" });
      }
    });
  };

  const handleTransition = (toState: any) => {
    transitionMutation.mutate({
      data: {
        requestId: `req_${crypto.randomUUID()}`,
        subjectId: documentId as string,
        market: market as any,
        expectedVersion: edition.version,
        toState
      }
    }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetCmsAdminEditionQueryKey(documentId || "", market as any) });
        toast({ title: `Moved to ${toState}`, description: `Workflow transitioned successfully.` });
      },
      onError: (err: any) => {
        toast({ title: "Transition failed", description: err.message || "Conflict or permission error.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500 h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-4">
          <button 
            aria-label="Back to content list"
              onClick={() => {
                if (!hasUnsavedChanges || window.confirm("Discard unsaved changes?")) setLocation("/admin/content");
              }}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/60 hover:text-white shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-display font-bold tracking-tight text-white flex items-center gap-3 truncate">
              <span className="truncate">{doc.canonicalSlug || "Untitled"}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-[hsl(var(--brand-coral))/50] text-[hsl(var(--brand-coral))] shrink-0">
                {market}
              </span>
            </h1>
            <p className="text-white/60 text-sm flex items-center gap-2 mt-1">
              <span className="uppercase text-xs font-mono">{doc.kind}</span>
              <span>&bull;</span>
              <span>v{edition.version}</span>
              <span>&bull;</span>
              <span className="capitalize">{edition.publicationState}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={previewMutation.isPending || updateMutation.isPending}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded font-medium text-sm transition-colors"
          >
            <ExternalLink className="h-4 w-4" />
            Preview
          </button>
          
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-white/5 hover:bg-white/10 text-white rounded font-medium text-sm transition-colors"
          >
            <History className="h-4 w-4" />
            History
          </button>

          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded font-medium text-sm transition-colors"
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Save Draft
          </button>

          {edition.publicationState === "draft" && (
            <button
              onClick={() => handleTransition("review")}
              disabled={transitionMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--brand-pink))] hover:bg-[hsl(var(--brand-pink))/90] text-white rounded font-medium text-sm transition-colors"
            >
              Submit for Review
            </button>
          )}

          {edition.publicationState === "review" && (
            <button
              onClick={() => handleTransition("approved")}
              disabled={transitionMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-[hsl(var(--brand-violet))] hover:bg-[hsl(var(--brand-violet))/90] text-white rounded font-medium text-sm transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              Approve
            </button>
          )}

          {(edition.publicationState === "approved" || edition.publicationState === "scheduled") && (
            <button
              onClick={() => handleTransition("published")}
              disabled={transitionMutation.isPending}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-medium text-sm transition-colors"
            >
              <CheckCircle2 className="h-4 w-4" />
              Publish Now
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl overflow-hidden flex flex-col font-mono text-sm">
          <div className="h-10 border-b border-white/10 bg-white/5 flex items-center px-4 shrink-0 text-white/50">
            payload.json
          </div>
          <textarea
            value={payloadStr}
            onChange={(e) => setPayloadStr(e.target.value)}
            className="flex-1 w-full bg-transparent p-4 text-white/90 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(var(--brand-violet))] leading-relaxed"
            spellCheck={false}
          />
        </div>
        
        <div className="lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto">
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Versions</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="mt-0.5"><GitCommit className="h-4 w-4 text-[hsl(var(--brand-pink))]" /></div>
                <div>
                  <div className="text-sm text-white">Current Draft</div>
                  <div className="text-xs text-white/40 mt-0.5">{draft?.id.substring(0,8)}</div>
                </div>
              </div>
              {edition.liveRevisionId && (
                <div className="flex gap-3">
                  <div className="mt-0.5"><PlayCircle className="h-4 w-4 text-emerald-400" /></div>
                  <div>
                    <div className="text-sm text-white">Live Version</div>
                    <div className="text-xs text-white/40 mt-0.5">{edition.liveRevisionId.substring(0,8)}</div>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="bg-white/5 border border-white/10 rounded-xl p-4">
            <h3 className="text-sm font-medium text-white mb-3">Properties</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-white/50">Fallback</span>
                <span className="text-white capitalize">{edition.fallbackMode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/50">Parity</span>
                <span className={edition.parityComplete ? "text-emerald-400" : "text-amber-400"}>
                  {edition.parityComplete ? "Complete" : "Incomplete"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {draft && (
        <RollbackModal 
          open={historyOpen} 
          onOpenChange={setHistoryOpen} 
          editionId={edition.id} 
          expectedVersion={edition.version}
          currentDraftId={draft.id}
          documentId={documentId as string}
          market={market as any}
        />
      )}
    </div>
  );
}
