import { Badge } from "@/components/ui/badge";

export type MarketSourceState = "shared" | "adapted" | "independent" | "legacy-fallback" | "missing";
export type MarketDeliveryState = "live" | "not-live" | "pending" | "updates-available" | "translation-stale";

const sourceStatePresentation: Record<MarketSourceState, {
  label: string;
  description: string;
  className: string;
}> = {
  shared: {
    label: "Shared",
    description: "Uses a pinned shared baseline.",
    className: "",
  },
  adapted: {
    label: "Adapted",
    description: "Uses a pinned shared baseline with local overrides.",
    className: "border-blue-500/20 bg-blue-500/10 text-blue-600",
  },
  independent: {
    label: "Independent",
    description: "An explicit market edition; no shared baseline is required.",
    className: "border-amber-500/20 bg-amber-500/10 text-amber-700",
  },
  "legacy-fallback": {
    label: "Legacy fallback",
    description: "The server reports that this address resolves through a legacy fallback.",
    className: "border-violet-500/20 bg-violet-500/10 text-violet-700",
  },
  missing: {
    label: "Missing",
    description: "No exact edition exists for this market and language.",
    className: "border-dashed border-muted-foreground/40 bg-muted/20 text-muted-foreground",
  },
};

export function sourceStateForEdition(input: {
  binding?: { mode: string; operations: unknown[] } | undefined;
  edition?: { exact: boolean; usedFallback: boolean } | undefined;
}): MarketSourceState {
  if (input.binding) {
    if (input.binding.mode === "independent") return "independent";
    return input.binding.operations.length ? "adapted" : "shared";
  }
  if (input.edition?.exact) return "independent";
  if (input.edition?.usedFallback) return "legacy-fallback";
  return "missing";
}

export function MarketSourceBadge({ state, testId }: { state: MarketSourceState; testId?: string }) {
  const presentation = sourceStatePresentation[state];
  return <Badge variant="outline" className={presentation.className} data-testid={testId ?? `status-source-${state}`}>
    {presentation.label}
  </Badge>;
}

const deliveryStatePresentation: Record<MarketDeliveryState, { label: string; className: string }> = {
  live: { label: "Live", className: "text-emerald-700" },
  "not-live": { label: "Not live", className: "text-muted-foreground" },
  pending: { label: "Pending", className: "" },
  "updates-available": { label: "Updates available", className: "text-amber-800" },
  "translation-stale": { label: "Translation stale", className: "text-amber-800" },
};

export function MarketDeliveryStatus({ state, testId }: { state: MarketDeliveryState; testId?: string }) {
  const presentation = deliveryStatePresentation[state];
  return <span className={presentation.className} data-testid={testId ?? `status-delivery-${state}`}>{presentation.label}</span>;
}

export function MarketStatusLegend() {
  return (
    <div className="mt-2 space-y-1 text-[11px] text-muted-foreground" aria-label="Market status legend" data-testid="market-status-legend">
      <p><strong className="font-medium text-foreground">Source</strong> describes where the edition resolves; it is separate from workflow and delivery.</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {(Object.keys(sourceStatePresentation) as MarketSourceState[]).map((state) => {
          const presentation = sourceStatePresentation[state];
          return <span key={state} className="flex items-center gap-1">
            <MarketSourceBadge state={state} testId={`legend-status-source-${state}`} /> {presentation.description}
          </span>;
        })}
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        <span><MarketDeliveryStatus state="live" testId="legend-status-delivery-live" /> is currently delivered.</span>
        <span><MarketDeliveryStatus state="not-live" testId="legend-status-delivery-not-live" /> is not currently delivered.</span>
        <span><MarketDeliveryStatus state="pending" testId="legend-status-delivery-pending" /> means either a staged availability change or a saved draft; it is not live delivery.</span>
        <span><MarketDeliveryStatus state="updates-available" testId="legend-status-delivery-updates-available" /> means a newer shared baseline is available.</span>
        <span><MarketDeliveryStatus state="translation-stale" testId="legend-status-delivery-translation-stale" /> means translation lineage needs acknowledgement or resolution.</span>
        <span><strong className="font-medium text-destructive">Saved-revision blockers</strong> are validation or workflow requirements reported for that exact revision.</span>
      </div>
    </div>
  );
}