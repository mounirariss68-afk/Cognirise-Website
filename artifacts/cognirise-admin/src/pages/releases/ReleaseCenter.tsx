import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Eye, FileDiff, Loader2, RotateCcw, Rocket, ShieldCheck } from "lucide-react";
import { useListMarketEditions } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  createReleaseCandidate,
  getActiveRelease,
  getReleaseImpact,
  getReleaseHistory,
  getReleaseReadiness,
  publishReleaseCandidate,
  releaseError,
  releaseKey,
  rollbackRelease,
  type ActiveRelease,
  type ReleaseCandidate,
  type ReleaseImpact,
  type ReleaseReceipt,
  type ReleaseHistoryItem,
  type ReleaseScope,
} from "@/lib/releases";

type ScopeState = {
  readiness?: Awaited<ReturnType<typeof getReleaseReadiness>>;
  impact?: ReleaseImpact;
  active?: ActiveRelease | null;
  candidate?: ReleaseCandidate;
  receipt?: ReleaseReceipt;
  history?: ReleaseHistoryItem[];
  error?: string;
};

const newKey = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Date.now()}`;

function count(value: unknown[] | undefined) {
  return value?.length ?? 0;
}

function ScopeResult({ scope, state, rollingBack, onRollback }: {
  scope: ReleaseScope;
  state?: ScopeState;
  rollingBack: boolean;
  onRollback: (release: ReleaseHistoryItem) => void;
}) {
  const candidate = state?.candidate;
  const manifest = candidate?.manifest ?? state?.readiness?.manifest;
  const live = state?.active?.manifest;
  const validation = candidate?.validation ?? state?.readiness?.validation;
  return (
    <article className="rounded-lg border bg-card p-4" aria-label={`${scope.market} ${scope.locale} release state`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">{scope.market.toUpperCase()} · {scope.locale}</h3>
          <p className="mt-1 text-xs text-muted-foreground">Atomic release scope. Other selected scopes can succeed or fail independently.</p>
        </div>
        {state?.receipt ? <Badge className="bg-emerald-600">Released #{state.receipt.releaseNumber}</Badge>
          : validation?.ready && candidate?.separationValid ? <Badge className="bg-emerald-600">Candidate ready</Badge>
            : validation ? <Badge variant="destructive">Blocked</Badge> : <Badge variant="outline">Not checked</Badge>}
      </div>
      {state?.error && <p role="alert" className="mt-3 rounded border border-destructive/30 bg-destructive/5 p-3 text-xs text-destructive">{state.error}</p>}
      {manifest && (
        <dl className="mt-4 grid grid-cols-2 gap-2 text-xs sm:grid-cols-4">
          <div><dt className="text-muted-foreground">Documents</dt><dd className="font-semibold">{count(manifest.revisions)}</dd></div>
          <div><dt className="text-muted-foreground">Links</dt><dd className="font-semibold">{count(manifest.resolvedLinks)}</dd></div>
          <div><dt className="text-muted-foreground">Media pins</dt><dd className="font-semibold">{count(manifest.mediaPins)}</dd></div>
          <div><dt className="text-muted-foreground">People</dt><dd className="font-semibold">{count(manifest.peopleSelections)}</dd></div>
        </dl>
      )}
      {manifest && (
        <div className="mt-4 rounded border bg-muted/20 p-3 text-xs">
          <p className="flex items-center gap-1 font-medium"><FileDiff className="h-3.5 w-3.5" /> Live versus candidate</p>
          <p className="mt-1 text-muted-foreground">
            {live
              ? `${Math.abs(count(manifest.revisions) - count(live.revisions))} document-count change · ${Math.abs(count(manifest.resolvedLinks) - count(live.resolvedLinks))} link-count change · ${Math.abs(count(manifest.mediaPins) - count(live.mediaPins))} media-count change`
              : "No live release exists. Publishing creates the first complete manifest for this scope."}
          </p>
          <p className="mt-1 text-muted-foreground">Registry {manifest.registryVersion} · exact availability, navigation, people, links, and immutable media pins are included.</p>
        </div>
      )}
      {state?.impact && (
        <div className="mt-3 text-xs text-muted-foreground">
          Internal-link effects: {count(state.impact.links)} resolved, {count(state.impact.unavailableLinks)} blocked · Media propagation: {count(state.impact.media)} pinned, {count(state.impact.orphanedMedia)} orphaned
        </div>
      )}
      {validation && (validation.errors.length > 0 || validation.warnings.length > 0) && (
        <details className="mt-3 text-xs" open={validation.errors.length > 0}>
          <summary className="cursor-pointer font-medium">{validation.errors.length} blocker(s) · {validation.warnings.length} warning(s)</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-destructive">{validation.errors.map((item) => <li key={item}>{item}</li>)}</ul>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-amber-800">{validation.warnings.map((item) => <li key={item}>{item}</li>)}</ul>
        </details>
      )}
      {state?.receipt && <p className="mt-3 break-all font-mono text-[10px] text-muted-foreground">Receipt {state.receipt.id} · integrity {state.receipt.integrityDigest}</p>}
      {state?.history && state.history.length > 0 && (
        <details className="mt-4 rounded border p-3 text-xs">
          <summary className="cursor-pointer font-medium">Release history and rollback</summary>
          <div className="mt-3 space-y-2">
            {state.history.map((item) => (
              <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 border-t pt-2 first:border-0 first:pt-0">
                <span>#{item.releaseNumber} · {item.status} · {new Date(item.releasedAt).toLocaleString()} {item.active ? "· active" : ""}</span>
                {!item.active && (
                  <Button type="button" size="sm" variant="outline" disabled={rollingBack} onClick={() => onRollback(item)}>
                    <RotateCcw className="mr-1 h-3.5 w-3.5" />Restore this receipt
                  </Button>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
    </article>
  );
}

export default function ReleaseCenter() {
  const markets = useListMarketEditions({ page: 1, pageSize: 100 });
  const scopes = useMemo(() => (markets.data?.items ?? []).filter((item) => item.enabled).flatMap((market) =>
    [...new Set([market.defaultLocale, market.fallbackLocale].filter(Boolean))].map((locale) => ({
      market: market.code,
      locale: locale as string,
    }))), [markets.data?.items]);
  const [selected, setSelected] = useState<string[]>([]);
  const [states, setStates] = useState<Record<string, ScopeState>>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const chosen = scopes.filter((scope) => selected.includes(releaseKey(scope)));

  const prepare = useMutation({
    mutationFn: async (targets: ReleaseScope[]) => Promise.all(targets.map(async (scope) => {
      const key = releaseKey(scope);
      try {
        const [readiness, impact, active, history] = await Promise.all([
          getReleaseReadiness(scope), getReleaseImpact(scope), getActiveRelease(scope), getReleaseHistory(scope),
        ]);
        const candidate = await createReleaseCandidate(scope);
        return [key, { readiness, impact, active, history: history.items, candidate }] as const;
      } catch (error) {
        return [key, { error: releaseError(error, "Candidate preparation failed. The other scopes are unchanged.") }] as const;
      }
    })),
    onSuccess: (results) => setStates((current) => ({ ...current, ...Object.fromEntries(results) })),
  });
  const publish = useMutation({
    mutationFn: async (targets: ReleaseScope[]) => {
      const results = [];
      for (const scope of targets) {
        const key = releaseKey(scope);
        const candidate = states[key]?.candidate;
        if (!candidate?.validation.ready || !candidate.separationValid) {
          results.push([key, { ...states[key], error: "This exact candidate is blocked and was not published." }] as const);
          continue;
        }
        try {
          const receipt = await publishReleaseCandidate(candidate.id, newKey(`publish-${key}`));
          const [active, history] = await Promise.all([getActiveRelease(scope), getReleaseHistory(scope)]);
          results.push([key, { ...states[key], receipt, active, history: history.items, candidate: undefined, error: undefined }] as const);
        } catch (error) {
          results.push([key, { ...states[key], error: releaseError(error, "This scope failed. Successful scopes remain released; prepare a fresh candidate before retrying.") }] as const);
        }
      }
      return results;
    },
    onSuccess: (results) => {
      setStates((current) => ({ ...current, ...Object.fromEntries(results) }));
      setConfirmOpen(false);
    },
  });
  const rollback = useMutation({
    mutationFn: async ({ scope, target }: { scope: ReleaseScope; target: ReleaseHistoryItem }) => {
      const key = releaseKey(scope);
      if (target.active) throw new Error("Choose a non-active receipt to restore.");
      const receipt = await rollbackRelease(target.id, newKey(`rollback-${key}`));
      const [active, history] = await Promise.all([getActiveRelease(scope), getReleaseHistory(scope)]);
      return { key, receipt, active, history: history.items };
    },
    onSuccess: ({ key, receipt, active, history }) => setStates((current) => ({
      ...current,
      [key]: { ...current[key], receipt, active, history, candidate: undefined, error: undefined },
    })),
    onError: (error, { scope }) => {
      const key = releaseKey(scope);
      setStates((current) => ({
        ...current,
        [key]: {
          ...current[key],
          error: releaseError(error, "Rollback failed. The active release is unchanged; refresh history and retry the same target."),
        },
      }));
    },
  });
  const allReady = chosen.length > 0 && chosen.every((scope) => {
    const candidate = states[releaseKey(scope)]?.candidate;
    return candidate?.validation.ready && candidate.separationValid;
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 p-5 md:p-8">
      <header>
        <p className="font-mono text-xs uppercase tracking-[.16em] text-muted-foreground">Scoped publication authority</p>
        <h1 className="mt-2 text-3xl font-semibold">Release center</h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">Preview and publish the exact market-and-locale manifest. Content, destination availability, navigation, people, internal links, and pinned media release together in one receipt.</p>
      </header>
      <section className="rounded-xl border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><h2 className="font-semibold">1. Choose release scopes</h2><p className="mt-1 text-xs text-muted-foreground">Each scope is atomic. A multi-scope run reports partial outcomes and leaves failed scopes recoverable.</p></div>
          <div className="flex gap-2">
            <Button variant="outline" disabled={!chosen.length || prepare.isPending} onClick={() => prepare.mutate(chosen)}>
              {prepare.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Eye className="mr-2 h-4 w-4" />}Build exact candidate
            </Button>
            <Button disabled={!allReady || publish.isPending} onClick={() => setConfirmOpen(true)}><Rocket className="mr-2 h-4 w-4" />Publish selected</Button>
          </div>
        </div>
        {markets.isError ? <p role="alert" className="mt-4 text-sm text-destructive">Configured markets could not be loaded.</p> : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {scopes.map((scope) => {
              const key = releaseKey(scope);
              return <label key={key} className="flex min-h-11 items-center gap-2 rounded border p-3 text-sm"><Checkbox checked={selected.includes(key)} onCheckedChange={(checked) => setSelected((current) => checked ? [...current, key] : current.filter((item) => item !== key))} />{scope.market.toUpperCase()} · {scope.locale}</label>;
            })}
          </div>
        )}
      </section>
      <section>
        <div className="mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><h2 className="font-semibold">2. Candidate evidence and outcomes</h2></div>
        {!chosen.length ? <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">Choose at least one configured market and locale.</div>
          : <div className="grid gap-4 lg:grid-cols-2">{chosen.map((scope) => (
            <ScopeResult
              key={releaseKey(scope)}
              scope={scope}
              state={states[releaseKey(scope)]}
              rollingBack={rollback.isPending}
              onRollback={(target) => rollback.mutate({ scope, target })}
            />
          ))}</div>}
      </section>
      <Dialog open={confirmOpen} onOpenChange={(open) => !publish.isPending && setConfirmOpen(open)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Publish {chosen.length} scoped release{chosen.length === 1 ? "" : "s"}?</DialogTitle><DialogDescription>Each ready candidate is committed independently. If one scope fails, successful scopes stay live and the failed scope will show a recoverable error.</DialogDescription></DialogHeader>
          <div className="space-y-2 rounded border bg-muted/20 p-3 text-sm">{chosen.map((scope) => <p key={releaseKey(scope)} className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" />{scope.market.toUpperCase()} · {scope.locale} · candidate {states[releaseKey(scope)]?.candidate?.id}</p>)}</div>
          <p className="flex items-start gap-2 text-xs text-muted-foreground"><CircleAlert className="mt-0.5 h-4 w-4 shrink-0" />The resulting immutable receipt is the only claim that this exact candidate is live.</p>
          <DialogFooter><Button variant="outline" disabled={publish.isPending} onClick={() => setConfirmOpen(false)}>Cancel</Button><Button disabled={!allReady || publish.isPending} onClick={() => publish.mutate(chosen)}>{publish.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Confirm scoped publication</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
