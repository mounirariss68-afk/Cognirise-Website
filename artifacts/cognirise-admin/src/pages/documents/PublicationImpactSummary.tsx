import { ArrowUpRight, CheckCircle2, Circle } from "lucide-react";

export type PublicationImpactDestination = {
  market: string;
  locale?: string;
  displayName: string;
  pending?: boolean;
  stagedDecision?: string | null;
  publishedEffectiveAvailable?: boolean;
};

export function affectedPublicationDestinations(
  destinations: PublicationImpactDestination[],
) {
  return destinations.filter((item) => item.pending);
}

export function PublicationImpactSummary({
  destinations,
  sourceLabel,
  compact = false,
}: {
  destinations: PublicationImpactDestination[];
  sourceLabel: string;
  compact?: boolean;
}) {
  const affected = affectedPublicationDestinations(destinations);
  if (!affected.length) {
    return (
      <div className="flex items-center gap-2 rounded border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground" data-testid="publication-impact-summary">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
        <span>No destination changes are pending. Publishing affects {sourceLabel} only.</span>
      </div>
    );
  }

  const label = (item: PublicationImpactDestination) => (
    <span key={`${item.market}-${item.locale ?? ""}`} className="inline-flex items-center gap-1 rounded border bg-background px-1.5 py-0.5">
      {item.displayName}{item.locale ? ` · ${item.locale}` : ""}
      <span className="text-muted-foreground">
        ({item.stagedDecision === "off" ? "exclude" : "show"})
      </span>
    </span>
  );

  return (
    <section
      className="rounded border border-amber-300/70 bg-amber-50/50 px-3 py-2 text-[11px] text-amber-950"
      aria-label="Affected markets"
      data-testid="publication-impact-summary"
    >
      <div className="flex items-start gap-2">
        <ArrowUpRight className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <div className="min-w-0">
          <p className="font-medium">Publishing affects {affected.length} destination{affected.length === 1 ? "" : "s"}</p>
          <p className="mt-1 text-amber-900/80">
            {compact
              ? "The reviewed destination snapshot will be released with this source."
              : "Review this exact market list before submitting or publishing. Saving content does not release any destination."}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">{affected.map(label)}</div>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-amber-900/70">
        {destinations.filter((item) => !item.pending).slice(0, 4).map((item) => (
          <span key={`${item.market}-${item.locale ?? ""}`} className="inline-flex items-center gap-1">
            <Circle className="h-2.5 w-2.5" aria-hidden="true" /> {item.displayName} unchanged
          </span>
        ))}
      </div>
    </section>
  );
}
