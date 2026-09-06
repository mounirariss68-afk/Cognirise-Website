import React, { useEffect, useMemo, useState } from "react";
import { 
  useRunCmsEditorialAssistant, 
  useDecideCmsEditorialAssistantRun, 
  useGetCmsEditorialAssistantMonitoring,
  useListCmsEditorialAssistantPendingRuns,
  useGetCmsAdminAccess,
  useListCmsAdminDocuments,
  useGetCmsAdminEdition,
  getGetCmsAdminEditionQueryKey,
  getGetCmsEditorialAssistantMonitoringQueryKey,
  getListCmsEditorialAssistantPendingRunsQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Bot, Check, X, Zap, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { assistantTargets, type AssistantOperation } from "@/lib/assistant-targets";

function AssistantRunWorkspace() {
  const { data: docs } = useListCmsAdminDocuments();
  const [selectedDoc, setSelectedDoc] = useState("");
  const [market, setMarket] = useState("uae");
  
  const editionQuery = useGetCmsAdminEdition(selectedDoc, market as any, { query: { enabled: !!selectedDoc, queryKey: getGetCmsAdminEditionQueryKey(selectedDoc, market as any) } });
  
  const targets = useMemo(() => {
    const document = docs?.documents.find((item) => item.id === selectedDoc);
    return assistantTargets(document?.kind, editionQuery.data?.draft?.payload);
  }, [docs?.documents, editionQuery.data?.draft?.payload, selectedDoc]);
  const [fieldPath, setFieldPath] = useState("");
  const selectedTarget = targets.find((target) => target.fieldPath === fieldPath) ?? targets[0];
  const [operation, setOperation] = useState<AssistantOperation>("quality-review");
  const [instructions, setInstructions] = useState("");
  const [sourceId, setSourceId] = useState("");
  
  const runAssistant = useRunCmsEditorialAssistant();
  const decideRun = useDecideCmsEditorialAssistantRun();
  const access = useGetCmsAdminAccess();
  const canReview = access.data
    ? ["reviewer", "publisher", "admin"].includes(access.data.principal.role)
    : false;
  const reviewQueue = useListCmsEditorialAssistantPendingRuns({
    query: {
      enabled: canReview,
      queryKey: getListCmsEditorialAssistantPendingRunsQueryKey(),
    },
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [lastResult, setLastResult] = useState<any>(null);

  useEffect(() => {
    const target = targets[0];
    setFieldPath(target?.fieldPath ?? "");
    setOperation(target?.operations[0] ?? "quality-review");
  }, [selectedDoc, editionQuery.data?.draft?.id, targets]);

  useEffect(() => {
    if (selectedTarget && !selectedTarget.operations.includes(operation)) setOperation(selectedTarget.operations[0]);
  }, [operation, selectedTarget]);

  const handleRun = () => {
    if (!selectedDoc || !editionQuery.data?.draft || !selectedTarget) return;
    if (!sourceId) {
      toast({ title: "Select an approved source", description: "Assistant runs require at least one governed source.", variant: "destructive" });
      return;
    }
    const reqId = `run_${crypto.randomUUID()}`;
    
    runAssistant.mutate({
      data: {
        requestId: reqId,
        subjectId: selectedDoc,
        market: market as any,
        operation,
        draft: selectedTarget.value,
        sourceIds: [sourceId],
        contentClass: "public",
        instructions,
        target: {
          fieldPath: selectedTarget.fieldPath,
          contentType: selectedTarget.contentType,
          language: "en",
          maxLength: selectedTarget.maxLength,
          revisionId: editionQuery.data.draft.id
        }
      }
    }, {
      onSuccess: (res) => {
        setLastResult(res);
        void queryClient.invalidateQueries({ queryKey: reviewQueue.queryKey });
        toast({ title: "Analysis complete", description: "Review the suggestions below." });
      },
      onError: (err: any) => {
        toast({ title: "Run failed", description: err.message, variant: "destructive" });
      }
    });
  };

  const handleDecision = (decision: "accepted" | "rejected", requestId: string, targetRevisionId: string, actor: string) => {
    if (!requestId) return;
    if (actor === access.data?.principal.id) {
      toast({ title: "Independent decision required", description: "The author of a run cannot accept or reject it.", variant: "destructive" });
      return;
    }
    decideRun.mutate({
      data: {
        requestId,
        decision,
        reason: decision === "accepted" ? "Independent review: grounded suggestion approved." : "Independent review: suggestion was not suitable.",
        ...(decision === "accepted" ? { expectedRevisionId: targetRevisionId } : {}),
      }
    }, {
      onSuccess: () => {
        toast({ title: `Suggestion ${decision}`, description: "Decision recorded." });
        setLastResult(null);
        void queryClient.invalidateQueries({ queryKey: reviewQueue.queryKey });
        void queryClient.invalidateQueries({ queryKey: getGetCmsAdminEditionQueryKey(selectedDoc, market as any) });
        void queryClient.invalidateQueries({ queryKey: getGetCmsEditorialAssistantMonitoringQueryKey() });
      },
      onError: (err: any) => {
        toast({ title: "Failed to record decision", description: err.message, variant: "destructive" });
      }
    });
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-8">
      <h2 className="text-lg font-medium mb-4 text-white">New Request</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">Document</label>
          <select 
            value={selectedDoc}
            onChange={(e) => setSelectedDoc(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-coral))] focus:ring-1 focus:ring-[hsl(var(--brand-coral))]"
          >
            <option value="">Select document...</option>
            {docs?.documents.map(d => (
              <option key={d.id} value={d.id}>{d.canonicalSlug} ({d.id})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">Market</label>
          <select 
            value={market}
            onChange={(e) => setMarket(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-coral))] focus:ring-1 focus:ring-[hsl(var(--brand-coral))]"
          >
            <option value="uae">UAE</option>
            <option value="ksa">KSA</option>
            <option value="turkiye">Türkiye</option>
            <option value="europe">Europe</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">Target field</label>
          <select value={selectedTarget?.fieldPath ?? ""} onChange={(e) => setFieldPath(e.target.value)} disabled={!targets.length} data-testid="select-assistant-target"
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white disabled:opacity-50">
            {!targets.length && <option value="">No supported text fields</option>}
            {targets.map((target) => <option key={target.fieldPath} value={target.fieldPath}>{target.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-white/80 mb-1.5">Operation</label>
          <select value={operation} onChange={(e) => setOperation(e.target.value as AssistantOperation)} disabled={!selectedTarget} data-testid="select-assistant-operation"
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white disabled:opacity-50">
            {selectedTarget?.operations.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-1.5">Approved source</label>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-coral))] focus:ring-1 focus:ring-[hsl(var(--brand-coral))]"
          >
            <option value="">Select approved source...</option>
            {docs?.documents.filter((document) => document.kind === "approvedSource").map((document) => (
              <option key={document.id} value={document.id}>{document.canonicalSlug ?? document.id}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-white/80 mb-1.5">Instructions</label>
          <textarea 
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Rewrite section 2 to be more concise."
            rows={3}
            className="w-full bg-black/20 border border-white/10 rounded-md py-2 px-3 text-sm text-white focus:outline-none focus:border-[hsl(var(--brand-coral))] focus:ring-1 focus:ring-[hsl(var(--brand-coral))] resize-none"
          />
        </div>
      </div>
      
      <div className="flex justify-end">
        <button 
          onClick={handleRun}
          disabled={!selectedDoc || !sourceId || !selectedTarget || runAssistant.isPending}
          className="px-4 py-2 bg-[hsl(var(--brand-coral))] hover:bg-[hsl(var(--brand-coral))/90] text-white rounded text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {runAssistant.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          Run Assistant
        </button>
      </div>

      {lastResult && (
        <div className="mt-6 border-t border-white/10 pt-6">
          <h3 className="font-medium text-white mb-3">Suggestion</h3>
          <div className="bg-black/20 p-4 rounded text-sm text-white/80 mb-4 whitespace-pre-wrap">
            {lastResult.suggestion}
          </div>
            <div className="text-xs text-white/60 space-y-2">
              <p><strong className="text-white/80">Citations:</strong> {lastResult.citations?.map((citation: any) => `${citation.sourceId}: ${citation.quote}`).join(" · ") || "None"}</p>
              {lastResult.uncertainties?.length > 0 && <p><strong className="text-white/80">Uncertainties:</strong> {lastResult.uncertainties.join(" · ")}</p>}
              <p>This run is now in the persisted review queue. A different reviewer must accept or reject it.</p>
            </div>
        </div>
      )}
      <div className="mt-6 border-t border-white/10 pt-6">
        <h3 className="font-medium text-white mb-3">Persisted review queue</h3>
        {!canReview && <p className="text-sm text-white/60">Reviewer, publisher, or administrator access is required to decide completed runs.</p>}
        {canReview && reviewQueue.isLoading && <p className="text-sm text-white/60">Loading completed runs…</p>}
        {canReview && reviewQueue.isError && <p className="text-sm text-red-200">The review queue could not be loaded.</p>}
        {canReview && reviewQueue.data?.runs.length === 0 && <p className="text-sm text-white/60">No runs are waiting for review.</p>}
        {reviewQueue.data?.runs.filter((run) => !run.decided).map((run) => (
          <div key={run.requestId} className="bg-black/20 rounded p-4 mb-3 text-sm text-white/80">
            <p><strong>{run.operation}</strong> · {run.subjectId} · {run.targetContext.fieldPath}</p>
            <p className="whitespace-pre-wrap mt-2">{run.result.suggestion}</p>
            <p className="text-xs text-white/50 mt-2">
              {run.actor === access.data?.principal.id
                ? "You created this run. A different reviewer must decide."
                : "Created by another editor. Your decision will be recorded in the audit trail."}
            </p>
            <div className="flex gap-3 mt-3">
              <button onClick={() => handleDecision("rejected", run.requestId, run.targetContext.revisionId, run.actor)} disabled={decideRun.isPending || run.actor === access.data?.principal.id} className="px-3 py-1 bg-white/5 rounded">Reject</button>
              <button onClick={() => handleDecision("accepted", run.requestId, run.targetContext.revisionId, run.actor)} disabled={decideRun.isPending || run.actor === access.data?.principal.id} className="px-3 py-1 bg-emerald-500 rounded">Accept</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminAssistant() {
  const access = useGetCmsAdminAccess();
  const canMonitor = access.data?.principal.role === "admin" &&
    access.data.principal.markets === "all";
  const monitoring = useGetCmsEditorialAssistantMonitoring({
    query: {
      enabled: canMonitor,
      queryKey: getGetCmsEditorialAssistantMonitoringQueryKey(),
    },
  });

  if (access.isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[hsl(var(--brand-coral))]" />
      </div>
    );
  }

  if (access.error || !access.data) {
    return (
      <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-200">
        Failed to load editorial-assistant access.
      </div>
    );
  }

  const costMicrosToUsd = (micros: number) => (micros / 1000000).toFixed(4);
  const data = monitoring.data;

  return (
    <div className="space-y-6 fade-in animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-display font-bold tracking-tight mb-2 text-white">Editorial Assistant</h1>
        <p className="text-white/60">Grounded AI assistance for governed content editing.</p>
      </div>
      
      <AssistantRunWorkspace />

      {canMonitor && monitoring.isLoading && (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[hsl(var(--brand-coral))]" />
        </div>
      )}
      {canMonitor && monitoring.error && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-6 text-red-200">
          Failed to load monitoring data.
        </div>
      )}
      {canMonitor && data && (
        <>
      <h2 className="text-xl font-display font-semibold text-white mt-8 mb-4">Monitoring ({data.windowHours}h)</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2">
            <Bot className="h-4 w-4" /> Runs
          </div>
          <div className="text-4xl font-display font-bold tracking-tight text-white">{data.runs}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2 text-emerald-400">
            <Check className="h-4 w-4" /> Accepted
          </div>
          <div className="text-4xl font-display font-bold tracking-tight text-white">{data.decisions.accepted}</div>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-xl p-5">
          <div className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2 text-[hsl(var(--brand-coral))]">
            <X className="h-4 w-4" /> Rejected
          </div>
          <div className="text-4xl font-display font-bold tracking-tight text-white">{data.decisions.rejected}</div>
        </div>

        <div className="bg-gradient-to-b from-[hsl(var(--brand-coral))/10] to-transparent border border-[hsl(var(--brand-coral))/20] rounded-xl p-5">
          <div className="text-sm font-medium text-white/60 mb-2 flex items-center gap-2 text-[hsl(var(--brand-coral))]">
            <Zap className="h-4 w-4" /> Estimated Cost
          </div>
          <div className="text-4xl font-display font-bold tracking-tight text-white">${costMicrosToUsd(data.spendMicros)}</div>
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6">
        <h2 className="text-lg font-medium mb-4 text-white">Acceptance Rate</h2>
        <div className="h-4 w-full bg-black/40 rounded-full overflow-hidden flex">
          {data.decisions.accepted > 0 && (
            <div 
              className="h-full bg-emerald-500 transition-all" 
              style={{ width: `${(data.decisions.accepted / (data.decisions.accepted + data.decisions.rejected)) * 100}%` }} 
            />
          )}
          {data.decisions.rejected > 0 && (
            <div 
              className="h-full bg-[hsl(var(--brand-coral))] transition-all" 
              style={{ width: `${(data.decisions.rejected / (data.decisions.accepted + data.decisions.rejected)) * 100}%` }} 
            />
          )}
        </div>
        <div className="flex justify-between text-xs text-white/40 mt-2">
          <span>Accepted</span>
          <span>Rejected</span>
        </div>
      </div>
        </>
      )}
    </div>
  );
}