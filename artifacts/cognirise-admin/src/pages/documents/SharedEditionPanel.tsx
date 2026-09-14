import { useMemo, useState } from "react";
import type { SharedMarketBaseline, SharedMarketBinding, SharedMarketEditionMatrix } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Check, GitCompare, Link2, Loader2 } from "lucide-react";
import { FieldOverrideIndicator } from "./FieldOverrideIndicator";
import { EditionReuseFlow } from "./EditionReuseFlow";
import { localeLanguage, type ReuseDestinationOutcome, type ReuseDestinationRequest } from "./edition-reuse";

export type ExactEdition = {
  market: string;
  locale: string;
  revisionId: string | null;
  revisionNumber: number | null;
};

export type Market = {
  id: string;
  code: string;
  displayName: string;
  defaultLocale?: string;
  fallbackLocale?: string | null;
};
type Mode = "shared" | "adapted" | "independent";

export type SharedEditionPanelProps = {
  documentId: string;
  matrix?: SharedMarketEditionMatrix;
  markets: Market[];
  exactEditions: ExactEdition[];
  selectedMarket: string;
  selectedLocale: string;
  currentRevisionId?: string | null;
  currentRevisionNumber?: number | null;
  canEdit: boolean;
  canManageBaselines: boolean;
  hasUnsaved?: boolean;
  busy?: boolean;
  onSelectEdition: (market: string, locale: string) => void;
  onEstablishBaseline: (sourceRevisionId: string, locale: string, expectedRevisionNumber?: number) => void;
  onEditBaseline: (baseline: SharedMarketBaseline) => void;
  onBind: (input: {
    marketEditionId: string;
    locale: string;
    mode: Mode;
    baseline?: SharedMarketBaseline;
    /** Frozen IDs used only by a translation acknowledgement for an existing binding. */
    bindingBaselineId?: string | null;
    bindingBaselineRevisionId?: string | null;
    independentRevisionId?: string;
    expectedDestinationRevisionId?: string | null;
    expectedActiveBaselineRevisionId?: string;
    translationSourceRevisionId?: string;
    version: number;
  }) => void;
  onCompare: (binding: SharedMarketBinding) => void;
  onResetOverride: (path: string) => void;
  /**
   * Runs one explicitly selected, same-language reuse request per destination.
   * The caller owns the authorized API mutations and must retain the outcome
   * for every request rather than treating a partial result as a success.
   */
  onApplyReuse?: (
    baseline: SharedMarketBaseline,
    requests: ReuseDestinationRequest[],
  ) => Promise<ReuseDestinationOutcome[]>;
  /** Destination-specific UI permission. The server still verifies each call. */
  canEditDestination?: (market: string) => boolean;
};

function overrideLabel(path: string) {
  const friendly = path
    .replace(/\[id=([^\]]+)\]/g, " ($1)")
    .replace(/\./g, " · ")
    .replace(/([a-z])([A-Z])/g, "$1 $2");
  return friendly.charAt(0).toUpperCase() + friendly.slice(1);
}

/**
 * Deliberately separate from the normal edition editor.  It only changes
 * shared-market lineage after an explicit confirmation; ordinary draft saves
 * remain ordinary PATCH saves and are never promoted to a baseline here.
 */
export function SharedEditionPanel({
  documentId,
  matrix,
  markets,
  exactEditions,
  selectedMarket,
  selectedLocale,
  currentRevisionId,
  currentRevisionNumber,
  canEdit,
  canManageBaselines,
  hasUnsaved = false,
  busy,
  onSelectEdition,
  onEstablishBaseline,
  onEditBaseline,
  onBind,
  onCompare,
  onResetOverride,
  onApplyReuse,
  canEditDestination,
}: SharedEditionPanelProps) {
  const market = markets.find((item) => item.code === selectedMarket);
  const binding = matrix?.bindings.find((item) => item.marketEditionId === market?.id && item.locale === selectedLocale);
  const localeBaselines = useMemo(
    () => (matrix?.baselines ?? []).filter((item) => localeLanguage(item.locale) === localeLanguage(selectedLocale)),
    [matrix?.baselines, selectedLocale],
  );
  const sourceCandidates = useMemo(
    () => exactEditions.filter((item) => Boolean(item.revisionId)
      && localeLanguage(item.locale) === localeLanguage(selectedLocale)
      && item.market !== "shared-source"),
    [exactEditions, selectedLocale],
  );
  const [sourceRevisionId, setSourceRevisionId] = useState("");
  const [mode, setMode] = useState<Mode>("adapted");
  const [baselineRevisionId, setBaselineRevisionId] = useState("");
  const [translationRevisionId, setTranslationRevisionId] = useState("");
  const [confirming, setConfirming] = useState(false);

  const source = sourceCandidates.find((item) => item.revisionId === sourceRevisionId)
    ?? sourceCandidates.find((item) => item.revisionId === currentRevisionId);
  const baseline = localeBaselines.find((item) => item.revisionId === baselineRevisionId)
    ?? localeBaselines.find((item) => item.revisionId === binding?.baselineRevisionId);
  const selectedIsSource = Boolean(source && source.market === selectedMarket && source.locale === selectedLocale);
  const currentExactEdition = exactEditions.find((item) => (
    item.market === selectedMarket && item.locale === selectedLocale
  ));
  const bindingMode = binding?.mode ?? "unbound";
  const frozenBinding = binding?.mode === "shared" || binding?.mode === "adapted";
  const translationBaseline = (matrix?.baselines ?? []).find((item) => item.revisionId === translationRevisionId);
  const destinationPermission = canEditDestination
    ?? ((marketCode: string) => canEdit && marketCode === selectedMarket);

  const requestBind = () => {
    if (!market || !currentRevisionId) return;
    if (mode !== "independent" && !baseline) return;
    // Shared/Adapted binding materializes a draft. A saved destination must
    // instead use the inspected guided path below.
    if (mode !== "independent" && currentExactEdition?.revisionId) return;
    setConfirming(true);
  };
  const confirmBind = () => {
    if (!market || !currentRevisionId || (mode !== "independent" && !baseline)) return;
    if (mode !== "independent" && currentExactEdition?.revisionId) return;
    onBind({
      marketEditionId: market.id,
      locale: selectedLocale,
      mode,
      baseline,
      independentRevisionId: mode === "independent" ? currentRevisionId : undefined,
      expectedDestinationRevisionId: mode === "independent"
        ? undefined : currentExactEdition?.revisionId ?? null,
      expectedActiveBaselineRevisionId: mode === "independent" ? undefined : baseline?.revisionId,
      translationSourceRevisionId: mode === "independent" ? undefined : (translationRevisionId || undefined),
      version: binding?.version ?? 0,
    });
    setConfirming(false);
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4" aria-label="Content reuse and shared edition">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">Content reuse</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Saved content, market visibility, and reviewed publication are separate. Reuse changes drafts and never moves a live pointer.
          </p>
        </div>
        <Badge variant="outline" className="uppercase">{bindingMode}</Badge>
      </div>

      {!market && <p className="rounded border border-amber-400/50 bg-amber-50 p-2 text-xs text-amber-900">This selected market is not in the market catalog, so it cannot be bound to shared content.</p>}
      <div className="space-y-1">
        <Label className="text-xs">Saved source</Label>
        <Select value={sourceRevisionId || currentRevisionId || ""} onValueChange={setSourceRevisionId}>
          <SelectTrigger aria-label="Saved source for reuse"><SelectValue placeholder="Choose a saved same-language edition" /></SelectTrigger>
          <SelectContent>
            {sourceCandidates.map((candidate) => (
              <SelectItem key={candidate.revisionId!} value={candidate.revisionId!}>
                {candidate.market.toUpperCase()} · {candidate.locale} · saved revision {candidate.revisionNumber}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">Choose the exact saved content to reuse. This does not select where it appears on the website.</p>
      </div>
      <EditionReuseFlow
        key={sourceRevisionId || currentRevisionId || "no-source"}
        documentId={documentId}
        matrix={matrix}
        markets={markets}
        exactEditions={exactEditions}
        sourceRevisionId={sourceRevisionId || currentRevisionId || ""}
        currentRevisionId={currentRevisionId}
          legacySharedSource={selectedMarket === "shared-source" && selectedLocale === "und"}
        canManageBaselines={canManageBaselines}
        canEditDestination={destinationPermission}
        hasUnsaved={hasUnsaved}
        busy={busy}
        onOpenSource={onSelectEdition}
        onSaveSource={onEstablishBaseline}
        onCompare={onCompare}
        onApply={onApplyReuse}
      />
      {!frozenBinding && mode !== "independent" && currentExactEdition?.revisionId && (
        <p className="rounded border border-amber-300 bg-amber-50 p-2 text-xs text-amber-950">
          This exact destination already has saved content. To replace it, choose the source above and use the inspected “Use this content in other editions” flow; advanced binding never overwrites a customization.
        </p>
      )}

      {canEdit && market && (
        <details className="rounded border bg-muted/10 p-3">
          <summary className="cursor-pointer text-xs font-semibold">Advanced lineage details</summary>
          <div className="mt-3 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs">Neutral baseline source</Label>
              <Select value={sourceRevisionId} onValueChange={setSourceRevisionId}>
                <SelectTrigger aria-label="Neutral baseline source"><SelectValue placeholder="Current exact editions only" /></SelectTrigger>
                <SelectContent>
                  {sourceCandidates.map((candidate) => (
                    <SelectItem key={candidate.revisionId!} value={candidate.revisionId!}>
                      {candidate.market.toUpperCase()} · {candidate.locale} · Rev {candidate.revisionNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
             <div className="flex flex-wrap items-end gap-2">
               {!selectedIsSource && source && <Button type="button" size="sm" variant="outline" className="max-w-full whitespace-normal text-left leading-tight" onClick={() => onSelectEdition(source.market, source.locale)}>Open selected source</Button>}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!canManageBaselines || !selectedIsSource || !source?.revisionId || busy || hasUnsaved}
                 onClick={() => onEstablishBaseline(source!.revisionId!, source!.locale, localeBaselines.find((item) => item.locale === source!.locale)?.revisionNumber)}
              >
                {busy && <Loader2 className="mr-1 h-3 w-3 animate-spin" />} Save neutral baseline
              </Button>
            </div>
          </div>

          {!frozenBinding && <><div className="grid gap-3 border-t pt-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs">Binding mode</Label>
              <Select value={mode} onValueChange={(value) => setMode(value as Mode)}>
                <SelectTrigger aria-label="Shared binding mode"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="shared">Shared</SelectItem>
                  <SelectItem value="adapted">Adapted</SelectItem>
                  <SelectItem value="independent">Independent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {mode !== "independent" && <div className="space-y-1">
              <Label className="text-xs">Frozen baseline revision</Label>
              <Select value={baselineRevisionId} onValueChange={setBaselineRevisionId}>
                <SelectTrigger aria-label="Frozen baseline revision"><SelectValue placeholder="Choose baseline" /></SelectTrigger>
                <SelectContent>{localeBaselines.map((item) => <SelectItem key={item.revisionId} value={item.revisionId}>Baseline rev {item.revisionNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
            {mode !== "independent" && <div className="space-y-1">
              <Label className="text-xs">Translation lineage</Label>
              <Select value={translationRevisionId} onValueChange={setTranslationRevisionId}>
                <SelectTrigger aria-label="Translation source"><SelectValue placeholder="No acknowledgement" /></SelectTrigger>
                <SelectContent>{(matrix?.baselines ?? []).map((item) => <SelectItem key={item.revisionId} value={item.revisionId}>Acknowledge {item.locale.toUpperCase()} baseline rev {item.revisionNumber}</SelectItem>)}</SelectContent>
              </Select>
            </div>}
          </div>
          </>}
           {localeBaselines.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 rounded border bg-muted/20 p-2 text-xs">
             <span className="min-w-0 flex-1">Active neutral baseline revision {localeBaselines[0]!.revisionNumber}; source revision remains pinned in lineage.</span>
             {canManageBaselines && <Button type="button" size="sm" variant="outline" className="shrink-0" disabled={busy || hasUnsaved} onClick={() => onEditBaseline(localeBaselines[0]!)}>Edit Shared</Button>}
          </div>}
          {binding && <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Frozen baseline: {binding.baselineRevisionId ?? "none"}</span>
            <span>· source lineage: {binding.translationSourceRevisionId ?? "not acknowledged"}</span>
            <span>· translation: {binding.translationState}</span>
            {binding.mode !== "independent" && <Button type="button" size="sm" variant="ghost" className="h-7" onClick={() => onCompare(binding)}><GitCompare className="mr-1 h-3 w-3" /> Compare / resolve</Button>}
          </div>}
          {frozenBinding && <div className="space-y-2 rounded border bg-muted/20 p-3">
            <p className="text-xs text-muted-foreground">This {binding!.mode} binding is frozen. To adopt another baseline, reset overrides, or detach, use Compare / resolve. Ordinary field saves derive local adaptations automatically; do not rebind this edition.</p>
             <div className="flex flex-wrap items-end gap-2">
               <div className="min-w-0 flex-1 space-y-1 sm:min-w-56">
                <Label className="text-xs">Translation lineage acknowledgement</Label>
                <Select value={translationRevisionId} onValueChange={setTranslationRevisionId}>
                  <SelectTrigger aria-label="Translation source acknowledgement"><SelectValue placeholder="Choose shared baseline revision" /></SelectTrigger>
                  <SelectContent>{(matrix?.baselines ?? []).map((item) => <SelectItem key={item.revisionId} value={item.revisionId}>Acknowledge {item.locale.toUpperCase()} baseline rev {item.revisionNumber}</SelectItem>)}</SelectContent>
                </Select>
              </div>
                 <Button
                type="button"
                size="sm"
                  className="max-w-full whitespace-normal leading-tight"
                disabled={busy || hasUnsaved || !translationBaseline || translationBaseline.revisionId === binding?.translationSourceRevisionId}
                onClick={() => onBind({
                  marketEditionId: market.id,
                  locale: selectedLocale,
                  mode: binding!.mode as Mode,
                  // The frozen baseline may be historical and intentionally absent
                  // from the active baseline list. ACK must never derive it from
                  // the translation source or current active options.
                  bindingBaselineId: binding!.baselineId,
                  bindingBaselineRevisionId: binding!.baselineRevisionId,
                  translationSourceRevisionId: translationBaseline!.revisionId,
                   expectedDestinationRevisionId: currentExactEdition?.revisionId ?? null,
                  version: binding!.version,
                })}
              >
                Acknowledge translation lineage
              </Button>
            </div>
            {!translationBaseline && <p className="text-xs text-muted-foreground">Choose a shared baseline revision to acknowledge translation lineage; the adopted baseline remains unchanged.</p>}
          </div>}
           {!frozenBinding && <Button type="button" size="sm" disabled={busy || hasUnsaved || !currentRevisionId || (mode !== "independent" && (!baseline || Boolean(currentExactEdition?.revisionId)))} onClick={requestBind}>
            <Link2 className="mr-1 h-3.5 w-3.5" /> Bind selected exact edition
          </Button>}
          </div>
        </details>
      )}
      {binding?.mode === "adapted" && binding.operations.length > 0 && (
        <section className="space-y-2 border-t pt-3" aria-label="Market-specific fields">
          <div>
            <h4 className="text-xs font-semibold">Market-specific fields</h4>
            <p className="text-xs text-muted-foreground">Every sparse adaptation is listed here, including structured and repeatable-content paths.</p>
          </div>
          <div className="grid gap-2">
            {binding.operations.map((operation, index) => (
              <div key={`${operation.op}:${operation.path}:${index}`} className="rounded border bg-muted/20 px-2 py-1">
                <FieldOverrideIndicator
                  label={overrideLabel(operation.path)}
                  isOverride
                  canEdit={canEdit && !busy && !hasUnsaved}
                  onResetToShared={() => onResetOverride(operation.path)}
                />
                <p className="font-mono text-[10px] text-muted-foreground">{operation.op} · {operation.path}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {confirming && <div className="rounded border border-amber-400/60 bg-amber-50 p-3 text-xs text-amber-950">
        <div className="flex gap-2"><AlertTriangle className="h-4 w-4 shrink-0" /><p>Confirm {mode} mode for this exact {selectedMarket.toUpperCase()} · {selectedLocale} revision. The selected baseline revision is frozen; later shared changes require a separate compare and resolution.</p></div>
        <div className="mt-3 flex gap-2"><Button type="button" size="sm" onClick={confirmBind}>Confirm binding</Button><Button type="button" size="sm" variant="outline" onClick={() => setConfirming(false)}>Cancel</Button></div>
      </div>}
      {!canEdit && <p className="text-xs text-muted-foreground">You can inspect lineage, but do not have permission to change this market binding.</p>}
      {hasUnsaved && <p className="text-xs text-amber-700">Save or discard this exact market draft before changing shared lineage. This prevents a baseline from claiming an older source revision.</p>}
      {binding?.translationState === "stale" && <p className="flex items-center gap-1 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5" /> Translation lineage is stale; compare the frozen and current baseline before publishing.</p>}
      {binding?.translationState === "current" && <p className="flex items-center gap-1 text-xs text-emerald-700"><Check className="h-3.5 w-3.5" /> Translation lineage acknowledged.</p>}
    </section>
  );
}