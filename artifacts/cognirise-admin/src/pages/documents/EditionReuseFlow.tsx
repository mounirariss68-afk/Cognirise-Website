import { useEffect, useMemo, useState } from "react";
import type { SharedMarketBaseline, SharedMarketBinding, SharedMarketEditionMatrix } from "@workspace/api-client-react";
import { getDocumentRevision } from "@workspace/api-client-react";
import { AlertTriangle, Check, GitCompare, Loader2, LockKeyhole, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  buildEditionReusePlan,
  choiceHasCurrentInspection,
  createReuseRequests,
  localeLanguage,
  retainedReuseOutcomes,
  snapshotDifferences,
  type ReuseDestinationOutcome,
  type ReuseDestinationRequest,
  type ReuseExactEdition,
  type ReuseSourceCandidate,
  type ReuseMarket,
  type ReuseChoice,
  type SnapshotDifference,
} from "./edition-reuse";

export type EditionReuseFlowProps = {
  documentId: string;
  matrix?: SharedMarketEditionMatrix;
  markets: ReuseMarket[];
  exactEditions: ReuseExactEdition[];
  /** Current saved source plus an optional, distinct exact published source. */
  sourceCandidates?: ReuseSourceCandidate[];
  /** Read access is checked before a supplied source can be planned. */
  canReadSource?: (market: string, locale: string) => boolean;
  sourceRevisionId: string;
  currentRevisionId?: string | null;
  /** Legacy shared-source/und is a non-language pointer, not reusable content. */
  legacySharedSource?: boolean;
  /** Compatibility fallback for callers that do not yet supply source authority. */
  canManageBaselines: boolean;
  /**
   * Establishing a reusable source fans out to the same-language destinations.
   * The caller supplies the same source + affected-market authority decision
   * enforced by the API; it takes precedence over the legacy boolean.
   */
  canSaveReusableSource?: (sourceMarket: string, affectedDestinationMarkets: string[]) => boolean;
  canEditDestination: (market: string) => boolean;
  hasUnsaved: boolean;
  busy?: boolean;
  onOpenSource: (market: string, locale: string) => void;
  onSaveSource: (sourceRevisionId: string, locale: string, expectedRevisionNumber?: number) => void;
  onCompare: (binding: SharedMarketBinding) => void;
  onApply?: (baseline: SharedMarketBaseline, requests: ReuseDestinationRequest[]) => Promise<ReuseDestinationOutcome[]>;
};

const modePresentation = {
  available: { label: "Ready to use", className: "border-emerald-300 bg-emerald-50 text-emerald-800" },
  customized: { label: "Has customization", className: "border-amber-300 bg-amber-50 text-amber-800" },
  frozen: { label: "Compare required", className: "border-sky-300 bg-sky-50 text-sky-800" },
  "already-shared": { label: "Already using it", className: "border-muted bg-muted text-muted-foreground" },
};

export type ReuseSourceAuthority = {
  capabilityMatrixConfigured?: boolean;
  role?: string | null;
  marketCodes?: string[] | null;
  capabilityGrants?: Array<{
    topic: string;
    capability: string;
    scope: string;
    marketCode: string;
  }> | null;
};

/**
 * Mirrors the API's content policy for an explicit reusable source. A saved
 * matrix is deny-all outside its grants; legacy roles are used only until a
 * matrix is configured.
 */
export function canSaveReusableSourceFromAuthority(
  authority: ReuseSourceAuthority | undefined,
  topic: string | null | undefined,
  sourceMarket: string,
  affectedDestinationMarkets: readonly string[],
) {
  if (!authority || !topic || !affectedDestinationMarkets.length) return false;
  if (authority.capabilityMatrixConfigured) {
    const hasGrant = (scope: "shared" | "regional", market: string) => authority.capabilityGrants?.some((grant) => (
      grant.topic === topic
      && grant.capability === "edit"
      && grant.scope === scope
      && grant.marketCode === market
    ));
    return Boolean(hasGrant("shared", sourceMarket)
      && hasGrant("regional", sourceMarket)
      && affectedDestinationMarkets.every((market) => hasGrant("regional", market)));
  }
  return ["administrator", "publisher", "editor"].includes(authority.role ?? "")
    && [sourceMarket, ...affectedDestinationMarkets]
      .every((market) => authority.marketCodes?.includes(market));
}

export function EditionReuseFlow({
  documentId, matrix, markets, exactEditions, sourceCandidates, canReadSource, sourceRevisionId, currentRevisionId, legacySharedSource, canManageBaselines,
  canSaveReusableSource, canEditDestination, hasUnsaved, busy, onOpenSource, onSaveSource, onCompare, onApply,
}: EditionReuseFlowProps) {
  const plan = useMemo(() => buildEditionReusePlan({
    sourceRevisionId, markets, exactEditions, matrix, canEditDestination, sourceCandidates, canReadSource,
  }), [canEditDestination, canReadSource, exactEditions, markets, matrix, sourceCandidates, sourceRevisionId]);
  const [choices, setChoices] = useState<Record<string, ReuseChoice>>({});
  const [outcomes, setOutcomes] = useState<ReuseDestinationOutcome[]>([]);
  const [inspections, setInspections] = useState<Record<string, {
    loading?: boolean;
    error?: string;
    differences?: SnapshotDifference[];
  }>>({});
  const [applying, setApplying] = useState(false);
  const [retryNotice, setRetryNotice] = useState<string | null>(null);
  const [retryBlockedByUncertainty, setRetryBlockedByUncertainty] = useState(false);
  const candidateRequests = useMemo(() => createReuseRequests(plan, choices), [choices, plan]);
  // A rejected response names exactly which destination did not mutate, so it
  // can be retried after a new comparison. A thrown/incomplete response does
  // not: keep every request blocked until the editor reloads fresh state.
  const requests = retryBlockedByUncertainty ? [] : candidateRequests.filter((request) =>
    !outcomes.some((outcome) => outcome.key === request.key && outcome.status !== "failed"));
  // A bounded exact published source is immutable and can be frozen directly.
  // Do not navigate to the newer editor draft and imply it is that revision.
  const sourceIsOpen = plan.source?.revisionId === currentRevisionId
    || plan.source?.sourceKind === "published"
    || plan.source?.sourceKind === "shared";
  const activeLocaleBaseline = (matrix?.baselines ?? []).find((baseline) => (
    localeLanguage(baseline.locale) === localeLanguage(plan.source?.locale ?? "")
  ));
  const prospectiveDestinationMarkets = [...new Set(plan.targets.map((target) => target.market.code))];
  // A successor inherits the server-recorded binding scope. A first baseline
  // has no authoritative scope yet, so retain the prospective same-language
  // destination check.
  const affectedDestinationMarkets = activeLocaleBaseline?.affectedDestinationMarkets !== undefined
    ? [...new Set(activeLocaleBaseline.affectedDestinationMarkets)]
    : prospectiveDestinationMarkets;
  const canSaveSource = plan.source
    ? canSaveReusableSource?.(plan.source.market, affectedDestinationMarkets)
      ?? canManageBaselines
    : false;
  const sourceIssue = legacySharedSource && plan.source?.sourceKind !== "shared"
    ? "The legacy shared-source / und pointer has no language. Open a localized exact edition and explicitly choose it as the reuse source."
    : plan.sourceIssue;

  // Invalidation after a 409 can replace an exact revision or binding version
  // while this component remains mounted. Never let a prior confirmation
  // silently turn into a confirmation for that newer state.
  useEffect(() => {
    const targets = new Map(plan.targets.map((target) => [target.key, target]));
    setChoices((current) => {
      let changed = false;
      const next = { ...current };
      for (const [key, choice] of Object.entries(current)) {
        const target = targets.get(key);
        if (choice.inspectedBindingVersion !== undefined
          && (!target || !choiceHasCurrentInspection(target, choice, plan.baseline?.revisionId))) {
          next[key] = {
            ...choice,
            inspectedDestinationRevisionId: undefined,
            inspectedBindingVersion: undefined,
            inspectedBaselineRevisionId: undefined,
            replaceCustomization: false,
          };
          changed = true;
        }
      }
      return changed ? next : current;
    });
    setInspections((current) => {
      let changed = false;
      const next = { ...current };
      for (const [key, inspection] of Object.entries(current)) {
        const target = targets.get(key);
        const choice = choices[key];
        if (choice?.inspectedBindingVersion !== undefined
          && (!target || !choiceHasCurrentInspection(target, choice, plan.baseline?.revisionId))) {
          next[key] = {
            error: "This destination changed after comparison. Inspect its current saved differences before confirming again.",
          };
          changed = true;
        } else if (!target && inspection) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  // `plan.targets` changes only when its matrix/edition inputs change. Choices
  // are deliberately read from the render that observed that refetch.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.targets]);

  const changeChoice = (key: string, change: Partial<ReuseChoice>) => {
    setChoices((current) => {
      const prior = current[key] ?? { selected: false, replaceCustomization: false };
      return { ...current, [key]: { ...prior, ...change } };
    });
    // A completed destination is durable feedback for this bulk operation.
    // Do not make a partial application look like it never happened merely
    // because an editor starts the separately-authorized failed-only retry.
    setOutcomes((current) => current.filter((outcome) =>
      outcome.key !== key || outcome.status === "success"));
    setRetryNotice(null);
  };
  const inspect = async (target: typeof plan.targets[number]) => {
    if (!plan.source?.revisionId || !target.exactEdition?.revisionId) return;
    setInspections((current) => ({ ...current, [target.key]: { loading: true } }));
    try {
      // Reuse materializes the frozen baseline, not the mutable source
      // edition. Compare that exact persisted snapshot to the target so the
      // confirmation describes precisely what the mutation would replace.
      const savedDestination = await getDocumentRevision(documentId, target.exactEdition.revisionId);
       const differences = snapshotDifferences(plan.baseline?.snapshot, savedDestination.snapshot);
      setInspections((current) => ({ ...current, [target.key]: { differences } }));
       changeChoice(target.key, {
         inspectedDestinationRevisionId: target.exactEdition.revisionId,
         inspectedBindingVersion: target.binding?.version ?? 0,
         inspectedBaselineRevisionId: plan.baseline?.revisionId,
       });
    } catch (error) {
      setInspections((current) => ({
        ...current,
        [target.key]: { error: error instanceof Error ? error.message : "Saved revisions could not be compared. Reload and try again." },
      }));
    }
  };
  const recordOutcomes = (next: ReuseDestinationOutcome[]) => {
    setOutcomes((current) => [...new Map([...current, ...next].map((outcome) => [outcome.key, outcome])).values()]);
  };
  const apply = async () => {
    if (!plan.baseline || !onApply || requests.length === 0) return;
    setApplying(true);
    setOutcomes((current) => current.filter((outcome) => outcome.status !== "failed"));
    setRetryNotice(null);
    try {
      const applied = await onApply(plan.baseline, requests);
      const outcomeByKey = new Map(applied.map((outcome) => [outcome.key, outcome]));
      const complete = requests.every((request) => outcomeByKey.has(request.key));
      // A consumer which cannot account for every request has an uncertain
      // transport outcome. It is unsafe to infer which mutation can be
      // repeated, even if it did return a subset of responses.
      if (!complete) {
        const message = "Could not confirm every destination result. Reload destination data and inspect/consent again before retrying; nothing is retried automatically.";
        recordOutcomes([
          ...requests.map<ReuseDestinationOutcome>((request) => ({
            key: request.key, market: request.market, locale: request.locale, status: "failed", message,
          })),
          ...retainedReuseOutcomes(plan, choices),
        ]);
        setChoices((current) => clearReuseChoices(current, requests.map((request) => request.key)));
        setInspections((current) => invalidateReuseInspections(current, requests.map((request) => request.key), message));
        setRetryBlockedByUncertainty(true);
        setRetryNotice(message);
        return;
      }
      const failedKeys = requests
        .filter((request) => outcomeByKey.get(request.key)?.status === "failed")
        .map((request) => request.key);
      const completedKeys = requests
        .filter((request) => outcomeByKey.get(request.key)?.status !== "failed")
        .map((request) => request.key);
      // Never offer a completed request again. Failed replacement consent is
      // tied to the old comparison/version and must be rebuilt from a fresh
      // destination inspection before it can form another request.
      if (completedKeys.length || failedKeys.length) {
        setChoices((current) => {
          const next = clearReuseChoices(current, completedKeys);
          return clearReuseChoices(next, failedKeys);
        });
      }
      if (failedKeys.length) {
        const message = "This destination was not changed. Refresh its saved state, inspect differences again, and make a new replacement choice before retrying.";
        setInspections((current) => invalidateReuseInspections(current, failedKeys, message));
        setRetryNotice(
          completedKeys.length
            ? `${completedKeys.length} completed destination${completedKeys.length === 1 ? " is" : "s are"} retained; ${failedKeys.length} failed destination${failedKeys.length === 1 ? " needs" : "s need"} fresh inspection before a failed-only retry.`
            : `${failedKeys.length} destination${failedKeys.length === 1 ? " needs" : "s need"} fresh inspection before retrying.`,
        );
      }
       recordOutcomes([...applied, ...retainedReuseOutcomes(plan, choices)]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : "The request outcome could not be confirmed.";
      const message = `Could not confirm whether any selected destination changed (${detail}). Reload destination data and inspect/consent again before retrying; nothing is retried automatically.`;
       recordOutcomes([...requests.map<ReuseDestinationOutcome>((request) => ({
        key: request.key, market: request.market, locale: request.locale, status: "failed", message,
      })), ...retainedReuseOutcomes(plan, choices)]);
      setChoices((current) => clearReuseChoices(current, requests.map((request) => request.key)));
      setInspections((current) => invalidateReuseInspections(
        current,
        requests.map((request) => request.key),
        message,
      ));
      setRetryBlockedByUncertainty(true);
      setRetryNotice(message);
    } finally {
      setApplying(false);
    }
  };

  return (
    <section className="space-y-3" aria-label="Use this content in other editions">
      <div>
        <h3 className="text-sm font-semibold">Use this content in other editions</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Reuse starts from a saved {plan.source?.locale ?? "same-language"} source. It creates or updates drafts only; destination visibility and reviewed publication stay separate.
        </p>
      </div>
       {sourceIssue ? <p className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">{sourceIssue}</p> : !plan.source ? <p className="text-xs text-muted-foreground">Choose a saved exact edition as the source to see eligible destinations.</p> : (
        <>
          <div className="rounded border bg-muted/20 p-3 text-xs">
            <p><strong>Saved source:</strong> {plan.source.sourceKind === "shared" ? "SHARED BASELINE" : plan.source.market.toUpperCase()} · {plan.source.locale} · revision {plan.source.revisionNumber}</p>
            <p className="mt-1 text-muted-foreground">Different-language editions are not translated or changed by this action.</p>
          </div>
          {!plan.baseline ? (
            <div className="rounded border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950">
              <p>This saved source is not yet reusable shared content. Save a frozen reusable version first; ordinary drafts are never promoted automatically.</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {!sourceIsOpen && <Button type="button" size="sm" variant="outline" onClick={() => onOpenSource(plan.source!.market, plan.source!.locale)} disabled={busy || hasUnsaved}>Open saved source</Button>}
                {sourceIsOpen && <Button type="button" size="sm" onClick={() => onSaveSource(plan.source!.revisionId, plan.source!.locale, activeLocaleBaseline?.revisionNumber)} disabled={!canSaveSource || busy || hasUnsaved}>
                  {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Save reusable content
                </Button>}
              </div>
              {!canSaveSource && <p className="mt-2">You do not have authority to save this reusable source and every affected destination. Your local draft remains unchanged.</p>}
              {hasUnsaved && <p className="mt-2">Save or discard this editor's local changes before changing reuse lineage.</p>}
            </div>
          ) : (
            <>
              <p className="text-xs text-muted-foreground">Using frozen reusable version {plan.baseline.revisionNumber}. Later shared changes need an explicit comparison and adoption.</p>
              <div className="space-y-2" role="list" aria-label="Same-language reuse destinations">
                {plan.targets.map((target) => {
                  const presentation = modePresentation[target.mode];
                  const choice = choices[target.key] ?? { selected: false, replaceCustomization: false };
                  const inspection = inspections[target.key];
                   const inspectionCurrent = choiceHasCurrentInspection(target, choice, plan.baseline?.revisionId);
                  const selectable = target.mode === "available" || target.mode === "customized";
                  return <div key={target.key} className="rounded border p-3" role="listitem">
                    <div className="flex items-start gap-3">
                      {selectable && <Checkbox
                        id={`reuse-${target.key}`}
                        checked={choice.selected}
                        disabled={!target.permitted || busy || applying || hasUnsaved}
                        onCheckedChange={(checked) => changeChoice(target.key, { selected: checked === true, retainCustomization: false })}
                        aria-label={`Use saved content in ${target.market.displayName}`}
                      />}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <label htmlFor={`reuse-${target.key}`} className="text-sm font-medium">{target.market.displayName} · {target.locale}</label>
                          <Badge variant="outline" className={presentation.className}>{presentation.label}</Badge>
                          {!target.permitted && <Badge variant="outline"><LockKeyhole className="mr-1 h-3 w-3" />No permission</Badge>}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">{target.reason}</p>
                        {target.exactEdition?.revisionId && target.mode !== "already-shared" && (
                          <div className="mt-2">
                            <Button type="button" size="sm" variant="outline" disabled={inspection?.loading || busy || applying} onClick={() => void inspect(target)}>
                              {inspection?.loading ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <GitCompare className="mr-1 h-3.5 w-3.5" />}
                              Inspect saved differences
                            </Button>
                            {inspection?.error && <p className="mt-1 text-xs text-destructive">{inspection.error}</p>}
                            {inspection?.differences && <div className="mt-2 rounded border bg-muted/20 p-2 text-xs">
                              <p className="font-medium">{inspection.differences.length ? `Saved differences (${inspection.differences.length}${inspection.differences.length === 20 ? "+" : ""})` : "No saved field differences"}</p>
                              {inspection.differences.length > 0 && <ul className="mt-1 space-y-1">
                                {inspection.differences.map((difference) => <li key={difference.path} className="break-words">
                                  <strong>{difference.path}</strong>: source {displayValue(difference.source)} → destination {displayValue(difference.destination)}
                                </li>)}
                              </ul>}
                              <p className="mt-1 text-muted-foreground">Compared the frozen reusable content with this saved destination. A new destination save will require another comparison.</p>
                            </div>}
                          </div>
                        )}
                         {target.mode === "customized" && choice.selected && (
                           inspectionCurrent ? <label className="mt-3 flex cursor-pointer items-start gap-2 text-xs">
                              <Checkbox checked={choice.replaceCustomization} onCheckedChange={(checked) => changeChoice(target.key, { replaceCustomization: checked === true, retainCustomization: false })} />
                              <span><strong>Replace this customization.</strong> Its saved revision remains in history, but this destination will instead use the selected frozen content.</span>
                            </label>
                            : <p className="mt-2 text-xs text-amber-700">Inspect the actual saved differences before confirming replacement.</p>
                        )}
                        {target.mode === "customized" && !choice.selected && (
                          <Button type="button" size="sm" variant={choice.retainCustomization ? "secondary" : "outline"} className="mt-2" disabled={busy || applying || hasUnsaved} onClick={() => changeChoice(target.key, { retainCustomization: true })}>
                            {choice.retainCustomization ? <Check className="mr-1 h-3.5 w-3.5" /> : null} Retain customization
                          </Button>
                        )}
                        {target.mode === "frozen" && target.binding && <Button type="button" size="sm" variant="outline" className="mt-2" onClick={() => onCompare(target.binding!)} disabled={busy || hasUnsaved}><GitCompare className="mr-1 h-3.5 w-3.5" /> Compare and decide</Button>}
                      </div>
                    </div>
                  </div>;
                })}
              </div>
              {!plan.targets.length && <p className="text-xs text-muted-foreground">No other permitted same-language destinations are configured.</p>}
              {plan.otherLanguageEditions.length > 0 && <p className="rounded border border-dashed p-2 text-xs text-muted-foreground">Not included because the language differs: {plan.otherLanguageEditions.map((edition) => `${edition.market.toUpperCase()} · ${edition.locale}`).join(", ")}. Translate and review those editions separately.</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" size="sm" disabled={!onApply || requests.length === 0 || busy || applying || hasUnsaved} onClick={() => void apply()}>
                  {(busy || applying) && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />} Use saved content in {requests.length} edition{requests.length === 1 ? "" : "s"}
                </Button>
                {!onApply && <span className="text-xs text-amber-700">Reuse is unavailable until this editor supplies an authorized destination action.</span>}
              </div>
               {retryNotice && <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950" role="alert">{retryNotice}</p>}
               {retryBlockedByUncertainty && (
                 <div className="space-y-1">
                   <Button type="button" size="sm" variant="outline" disabled={hasUnsaved || busy || applying} onClick={() => window.location.reload()}>
                     <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reload saved versions before retry
                   </Button>
                   {hasUnsaved && <p className="text-xs text-amber-700">Save or explicitly discard your unsaved writing before reloading. It has not been discarded.</p>}
                 </div>
               )}
              {outcomes.length > 0 && <div className="space-y-2 rounded border p-3 text-xs" role="status" aria-live="polite">
                 <p className="font-medium">
                   {outcomes.some((outcome) => outcome.status !== "failed") && outcomes.some((outcome) => outcome.status === "failed")
                     ? "Partial reuse result — completed destinations are retained; failed destinations require a fresh retry."
                     : "Reuse results — no destination was published."}
                 </p>
                {outcomes.map((outcome) => <p key={outcome.key} className={outcome.status === "failed" ? "text-destructive" : outcome.status === "skipped" ? "text-amber-700" : "text-emerald-700"}>
                  {outcome.status === "success" ? <Check className="mr-1 inline h-3.5 w-3.5" /> : outcome.status === "failed" ? <AlertTriangle className="mr-1 inline h-3.5 w-3.5" /> : <RefreshCw className="mr-1 inline h-3.5 w-3.5" />}
                  {outcome.market.toUpperCase()} · {outcome.locale}: {outcome.message}
                </p>)}
              </div>}
            </>
          )}
        </>
      )}
    </section>
  );
}

function clearReuseChoices(
  choices: Record<string, ReuseChoice>,
  keys: readonly string[],
): Record<string, ReuseChoice> {
  if (!keys.length) return choices;
  const next = { ...choices };
  for (const key of keys) delete next[key];
  return next;
}

function invalidateReuseInspections(
  inspections: Record<string, { loading?: boolean; error?: string; differences?: SnapshotDifference[] }>,
  keys: readonly string[],
  message: string,
) {
  const next = { ...inspections };
  for (const key of keys) next[key] = { error: message };
  return next;
}

function displayValue(value: unknown) {
  if (value === undefined) return "not set";
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return serialized.length > 180 ? `${serialized.slice(0, 177)}…` : serialized;
}