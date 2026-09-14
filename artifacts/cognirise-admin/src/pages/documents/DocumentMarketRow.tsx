import {
  type Document, type MarketEdition, getGetDocumentAvailabilityQueryKey,
  getGetSharedMarketEditionMatrixQueryKey, getListDocumentEditionsQueryKey, getListDocumentRevisionsQueryKey,
  getGetDocumentMarketCopyCandidatesQueryKey, useCopyDocumentMarketEdition,
  useGetDocumentAvailability, useGetDocumentMarketCopyCandidates, useGetSharedMarketEditionMatrix, useListDocumentEditions,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { MarketAvailabilityChecklist, type AvailabilitySelectionDraft } from "./MarketAvailabilityChecklist";
import { MarketDeliveryStatus, MarketSourceBadge, sourceStateForEdition } from "./market-status";

function blockerAction(error: string) {
  return /\b(review|approve|approval|workflow|submit|in-review)\b/i.test(error)
    ? "workflow"
    : "validation";
}

type SavedRevisionIssue = {
  message: string;
  category: "missing" | "validation" | "workflow";
  action: "create" | "edit" | "review";
};

function savedRevisionIssues(edition: {
  readinessErrors: string[];
  readinessIssues?: Array<{ message: string; category: string; action: string }>;
} | undefined): SavedRevisionIssue[] {
  if (edition?.readinessIssues?.length) {
    return edition.readinessIssues.map((issue): SavedRevisionIssue => ({
      message: issue.message,
      category: issue.category === "workflow" || issue.category === "missing" ? issue.category : "validation",
      action: issue.action === "review" || issue.action === "create" ? issue.action : "edit",
    })).filter((issue) => issue.category !== "missing" && issue.action !== "create");
  }
  return (edition?.readinessErrors ?? []).map((message) => ({
    message,
    category: blockerAction(message) === "workflow" ? "workflow" : "validation",
    action: blockerAction(message) === "workflow" ? "review" : "edit",
  }));
}

function missingContentIssues(edition: {
  readinessIssues?: Array<{ message: string; category: string; action: string }>;
} | undefined) {
  return (edition?.readinessIssues ?? []).filter((issue) => issue.category === "missing" || issue.action === "create");
}

function errorMessage(error: unknown) {
  if (error && typeof error === "object") {
    const value = error as { status?: number; error?: string; message?: string; data?: { error?: string } };
    return { status: value.status, message: value.data?.error ?? value.error ?? value.message };
  }
  return { message: undefined };
}

function MissingMarketCopyAction({
  documentId,
  destinationMarketEditionId,
  destinationMarket,
  destinationName,
  destinationLocale,
  canStart,
  expandRequest,
  onOpen,
}: {
  documentId: string;
  destinationMarketEditionId: string;
  destinationMarket: string;
  destinationName: string;
  destinationLocale: string;
  canStart: boolean;
  expandRequest: number;
  onOpen: (market: string, locale: string, focus?: "editor" | "review" | "editions") => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [sourceRevisionId, setSourceRevisionId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [recovery, setRecovery] = useState<string | null>(null);
  const candidates = useGetDocumentMarketCopyCandidates(documentId, destinationMarket, destinationLocale, {
    query: {
      enabled: open && canStart,
      queryKey: getGetDocumentMarketCopyCandidatesQueryKey(documentId, destinationMarket, destinationLocale),
    },
  });
  const copy = useCopyDocumentMarketEdition();
  const selected = candidates.data?.candidates.find((candidate) => candidate.revisionId === sourceRevisionId);
  const sourcePublication = selected?.publicationState === "published"
    ? "published"
    : "saved draft";
  const reset = () => {
    setSourceRevisionId("");
    setConfirming(false);
    setRecovery(null);
  };
  useEffect(() => {
    if (!expandRequest || !canStart) return;
    setOpen(true);
    reset();
  }, [expandRequest, canStart]);
  const create = () => {
    if (!selected || copy.isPending) return;
    setRecovery(null);
    copy.mutate({
      documentId,
      data: {
        destinationMarketEditionId,
        destinationLocale,
        sourceRevisionId: selected.revisionId,
        expectedSourceRevisionId: selected.revisionId,
      },
    }, {
      onSuccess: (created) => {
        if (created.market !== destinationMarket
          || created.locale !== destinationLocale
          || created.sourceRevisionId !== selected.revisionId) {
          setRecovery("The server response did not confirm the selected source and target. Reload the matrix before retrying; no editor was opened.");
          return;
        }
        void Promise.all([
          queryClient.invalidateQueries({ queryKey: getListDocumentEditionsQueryKey(documentId) }),
          queryClient.invalidateQueries({ queryKey: getListDocumentRevisionsQueryKey(documentId) }),
          queryClient.invalidateQueries({ queryKey: getGetDocumentAvailabilityQueryKey(documentId) }),
          queryClient.invalidateQueries({ queryKey: getGetSharedMarketEditionMatrixQueryKey(documentId) }),
          queryClient.invalidateQueries({ queryKey: getGetDocumentMarketCopyCandidatesQueryKey(documentId, destinationMarket, destinationLocale) }),
        ]).finally(() => {
          reset();
          setOpen(false);
          onOpen(created.market, created.locale);
        });
      },
      onError: (error) => {
        const failure = errorMessage(error);
        setConfirming(false);
        setRecovery(failure.status === 409
          ? "The selected source or destination changed. Reload compatible sources and confirm again; an existing destination was not overwritten."
          : failure.status === 403
            ? "You do not have permission to copy this source into the selected destination. Ask a market editor with both assignments to complete it."
            : failure.message ?? "The copy outcome could not be confirmed. Reload the matrix before retrying so you do not duplicate work.");
      },
    });
  };

  if (!canStart) {
    return <p className="mt-2 text-[10px] text-muted-foreground">You do not have permission to create a market draft for this missing edition.</p>;
  }
  return (
    <div className="mt-2" data-testid={`market-copy-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>
      <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={() => {
        setOpen((value) => !value);
        reset();
      }} data-testid={`button-copy-from-market-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>
        Copy from another market
      </Button>
      {open && <div className="mt-2 space-y-2 rounded border bg-muted/10 p-2 text-xs">
        <p><strong>New target:</strong> {destinationName} · {destinationLocale.toUpperCase()}</p>
        {candidates.isLoading && <p role="status">Loading compatible saved source revisions…</p>}
        {candidates.isError && <div role="alert" className="text-destructive">
          {errorMessage(candidates.error).status === 403
            ? "You do not have permission to inspect compatible source editions for this target."
            : "Compatible source editions could not be loaded. The target remains missing."}
          <Button type="button" variant="link" size="sm" className="ml-1 h-auto p-0 text-xs" onClick={() => void candidates.refetch()} data-testid={`button-retry-copy-sources-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>Retry</Button>
        </div>}
        {!candidates.isLoading && !candidates.isError && candidates.data?.candidates.length === 0 && (
          <p className="text-muted-foreground">No compatible authorized saved source revision is available. This server does not offer blank-draft creation from this matrix.</p>
        )}
        {candidates.data?.candidates.length ? <>
          <label className="block font-medium" htmlFor={`copy-source-${destinationMarketEditionId}-${destinationLocale}`}>Saved source revision</label>
          <select id={`copy-source-${destinationMarketEditionId}-${destinationLocale}`} value={sourceRevisionId}
            onChange={(event) => { setSourceRevisionId(event.target.value); setConfirming(false); setRecovery(null); }}
            className="w-full rounded border bg-background p-2" data-testid={`select-copy-source-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>
            <option value="">Choose an explicit source…</option>
            {candidates.data.candidates.map((candidate) => (
              <option key={candidate.revisionId} value={candidate.revisionId}>
                {candidate.market.toUpperCase()} · {candidate.locale.toUpperCase()} · revision {candidate.revisionNumber} · {candidate.publicationState === "published" ? "published" : "saved draft"}
              </option>
            ))}
          </select>
          {selected && <p className="text-[10px] text-muted-foreground">
            Selected: {selected.market.toUpperCase()} · {selected.locale.toUpperCase()} · saved revision {selected.revisionNumber} · {sourcePublication} · workflow {selected.workflowState}.
            {!selected.ready && " This source has saved-revision blockers; the new target will remain an unpublished draft."}
          </p>}
          {!confirming ? <Button type="button" size="sm" variant="outline" disabled={!selected || copy.isPending} onClick={() => setConfirming(true)} data-testid={`button-confirm-copy-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>
            Continue to confirmation
          </Button> : <div className="rounded border border-amber-400/60 bg-amber-50 p-2 text-amber-950">
            <p>Copy saved revision {selected!.revisionNumber} from {selected!.market.toUpperCase()} · {selected!.locale.toUpperCase()} into {destinationName} · {destinationLocale.toUpperCase()}?</p>
            <p className="mt-1 text-[10px]">This creates an editable unpublished draft. It preserves the source, immutable media pins, and audit lineage; it does not copy approval, publish content, or overwrite an existing target.</p>
            <div className="mt-2 flex gap-2">
              <Button type="button" size="sm" disabled={copy.isPending} onClick={create} data-testid={`button-create-market-copy-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>
                {copy.isPending ? "Creating draft…" : "Create unpublished draft"}
              </Button>
              <Button type="button" size="sm" variant="outline" disabled={copy.isPending} onClick={() => setConfirming(false)} data-testid={`button-cancel-market-copy-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>Cancel</Button>
            </div>
          </div>}
        </> : null}
        {recovery && <div role="alert" className="rounded border border-destructive/30 bg-destructive/5 p-2 text-destructive">
          {recovery}
          <Button type="button" variant="link" size="sm" className="ml-1 h-auto p-0 text-xs" onClick={() => {
            reset();
            void candidates.refetch();
          }} data-testid={`button-reload-copy-sources-${documentId}-${destinationMarketEditionId}-${destinationLocale}`}>Reload sources</Button>
        </div>}
      </div>}
    </div>
  );
}

export function DocumentMarketRow({ document, markets, locale, canManageMarket, isAdministrator, draft, onDraftChange, onOpen }: {
  document: Document;
  markets: MarketEdition[];
  locale: string;
  canManageMarket: (market: string) => boolean;
  isAdministrator: boolean;
  draft?: AvailabilitySelectionDraft;
  onDraftChange: (draft: AvailabilitySelectionDraft) => void;
  onOpen: (market?: string, locale?: string, focus?: "editor" | "review" | "editions") => void;
}) {
  const shared = useGetSharedMarketEditionMatrix(document.id, { query: {
    queryKey: getGetSharedMarketEditionMatrixQueryKey(document.id),
  } });
  const availability = useGetDocumentAvailability(document.id, { query: {
    queryKey: getGetDocumentAvailabilityQueryKey(document.id),
  } });
  const editions = useListDocumentEditions(document.id, { query: {
    queryKey: getListDocumentEditionsQueryKey(document.id),
  } });
  const failed = shared.isError || availability.isError || editions.isError;
  const loading = shared.isLoading || availability.isLoading || editions.isLoading;
  const [copyRequests, setCopyRequests] = useState<Record<string, number>>({});
  return <TableRow className="align-top">
    <TableCell className="min-w-[14rem]">
      <Button variant="link" className="h-auto max-w-[20rem] whitespace-normal p-0 text-left" onClick={() => onOpen()}>
        {document.title}
      </Button>
      <span className="mt-1 block text-xs text-muted-foreground">{document.slug}</span>
      <span className="mt-2 block text-xs text-muted-foreground" data-testid={`text-source-context-${document.id}`}>
        {shared.data?.baselines.some((baseline) => baseline.locale === locale)
          ? `Shared baseline available · ${locale.toUpperCase()}`
          : "Independent editions are valid without a shared baseline. Legacy fallback is shown only when reported by the server."}
      </span>
      {failed && <div role="alert" className="mt-2 text-xs text-destructive">Could not load market status.
        <Button variant="link" size="sm" onClick={() => {
          void shared.refetch(); void availability.refetch(); void editions.refetch();
        }}>Retry</Button>
      </div>}
      {draft?.saveFailed && <p role="alert" className="mt-2 text-xs text-destructive">Availability is not saved. Your selection is retained; retry in its market cell.</p>}
    </TableCell>
    {markets.map((market) => {
      const canManage = canManageMarket(market.code);
      const destination = availability.data?.items.find((item) => item.marketEditionId === market.id && item.locale === locale);
      const binding = shared.data?.bindings.find((item) => item.marketEditionId === market.id && item.locale === locale);
      const edition = editions.data?.items.find((item) => item.market === market.code && item.locale === locale);
      const baseline = shared.data?.baselines.find((item) => item.id === binding?.baselineId);
      const hasUpdate = binding && binding.mode !== "independent" && baseline
        && baseline.revisionId !== binding.baselineRevisionId
        && baseline.revisionId !== binding.heldBaselineRevisionId;
      const source = sourceStateForEdition({ binding, edition });
      const isLive = Boolean(destination?.publishedEffectiveAvailable && edition?.hasEffectivePublishedRevision);
      const blockerContext = `${market.displayName} · ${locale.toUpperCase()} · saved revision ${edition?.revisionNumber ?? edition?.effectiveRevisionNumber ?? "unavailable"}`;
      const blockers = savedRevisionIssues(edition);
      const missingContent = missingContentIssues(edition);
      const copyRequestKey = `${market.id}-${locale}`;
      return <TableCell key={market.id} className="min-w-[11rem] p-3">
        {loading ? <span role="status" className="text-xs">Loading…</span> : failed ? <span className="text-xs text-muted-foreground">Status unavailable</span> : <>
          <MarketSourceBadge state={source} testId={`status-source-${document.id}-${market.id}-${locale}`} />
          {source === "legacy-fallback" && <p className="mt-1 text-[10px] text-violet-800" data-testid={`text-legacy-fallback-${market.id}`}>
            {edition?.fallbackReason ?? "Server-reported legacy fallback. Select an explicit source or establish a baseline only if needed."}
          </p>}
          {source === "independent" && !binding && <p className="mt-1 text-[10px] text-muted-foreground">Explicit market edition; it does not need a shared baseline.</p>}
          {source === "independent" && !binding && isAdministrator && (
            <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-[10px]" onClick={() => onOpen(market.code, locale, "editions")} data-testid={`button-open-baseline-setup-${document.id}-${market.id}-${locale}`}>
              Open source &amp; baseline setup
            </Button>
          )}
          <div className="my-2 flex flex-wrap gap-1 text-xs" aria-label={`${market.displayName} publication status`}>
            <span className={isLive ? "text-emerald-700" : "text-muted-foreground"}>
              <MarketDeliveryStatus state={isLive ? "live" : "not-live"} testId={`status-delivery-${document.id}-${market.id}-${locale}`} />
            </span>
            {(destination?.pending || (edition?.exact && edition.workflowState === "draft")) && <span>· <MarketDeliveryStatus state="pending" testId={`status-pending-${document.id}-${market.id}-${locale}`} /></span>}
            {hasUpdate && <span>· <MarketDeliveryStatus state="updates-available" testId={`status-updates-${document.id}-${market.id}-${locale}`} /></span>}
            {binding?.translationState === "stale" && <span>· <MarketDeliveryStatus state="translation-stale" testId={`status-translation-stale-${document.id}-${market.id}-${locale}`} /></span>}
          </div>
          {blockers.length > 0 && (
            <details className="mb-2 rounded border border-destructive/30 bg-destructive/5 p-2" data-testid={`details-blockers-${document.id}-${market.id}-${locale}`}>
              <summary className="cursor-pointer text-xs font-medium text-destructive" aria-label={`Show ${blockers.length} saved-revision blocker${blockers.length === 1 ? "" : "s"} for ${blockerContext}`} data-testid={`button-blockers-${document.id}-${market.id}-${locale}`}>
                {blockers.length} saved-revision blocker{blockers.length === 1 ? "" : "s"}
              </summary>
              <p className="mt-2 text-[10px] text-muted-foreground">{blockerContext}</p>
              <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
                {blockers.map((issue, index) => {
                  const workflowRequirement = issue.category === "workflow" || issue.action === "review";
                  const nextAction = issue.action === "review" ? "Open review controls"
                    : issue.action === "create" ? "Open draft creation controls"
                      : "Open editing controls";
                  return <li key={`${issue.message}-${index}`}>
                    <span>{issue.message}</span>
                    <p className="mt-1 text-[10px] text-muted-foreground">
                      {workflowRequirement
                        ? "Workflow requirement: submit, review, or approve this saved revision; approval cannot repair invalid content."
                        : "Validation requirement: fix the saved content or media before this revision can enter review."}
                    </p>
                    {canManage
                      ? <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-[10px]" onClick={() => onOpen(market.code, locale, issue.action === "review" ? "review" : "editor")} data-testid={`button-${issue.action}-blocker-${document.id}-${market.id}-${locale}-${index}`}>{nextAction}</Button>
                      : <p className="mt-1 text-[10px] text-muted-foreground">You can inspect this issue but do not have permission to change this edition.</p>}
                  </li>;
                })}
              </ul>
            </details>
          )}
          {missingContent.length > 0 && (
            <div className="mb-2 rounded border border-amber-400/60 bg-amber-50 p-2 text-xs text-amber-950" data-testid={`missing-content-${document.id}-${market.id}-${locale}`}>
              <p className="font-medium">Market content is missing; no saved revision exists for {market.displayName} · {locale.toUpperCase()}.</p>
              <ul className="mt-1 list-disc pl-4">
                {missingContent.map((issue, index) => <li key={`${issue.message}-${index}`}>{issue.message}</li>)}
              </ul>
              {canManage
                ? <Button type="button" variant="link" size="sm" className="mt-1 h-auto p-0 text-xs" onClick={() => setCopyRequests((current) => ({ ...current, [copyRequestKey]: (current[copyRequestKey] ?? 0) + 1 }))} data-testid={`button-choose-create-source-${document.id}-${market.id}-${locale}`}>
                  Choose an authorized saved source to create this market edition
                </Button>
                : <p className="mt-1 text-[10px]">You can inspect this missing-content requirement but do not have permission to create this market edition.</p>}
            </div>
          )}
          {!edition?.exact && <MissingMarketCopyAction
            documentId={document.id}
            destinationMarketEditionId={market.id}
            destinationMarket={market.code}
            destinationName={market.displayName}
            destinationLocale={locale}
            canStart={canManage}
            expandRequest={copyRequests[copyRequestKey] ?? 0}
            onOpen={onOpen}
          />}
          {destination && <MarketAvailabilityChecklist
            documentId={document.id}
            destinations={[{ market: market.code, displayName: market.displayName, locale }]}
            canManageMarket={() => canManage && Boolean(availability.data?.canEditShared)}
            isAdministrator={isAdministrator}
            selectionDraft={draft}
            onSelectionDraftChange={onDraftChange}
            onOpenSharedContent={() => onOpen(market.code, locale)}
            compact
          />}
          {edition?.exact && <Button variant="link" size="sm" className="mt-1 h-auto p-0" onClick={() => onOpen(market.code, locale)}>
            Open {market.displayName} · {locale.toUpperCase()}
          </Button>}
        </>}
      </TableCell>;
    })}
  </TableRow>;
}