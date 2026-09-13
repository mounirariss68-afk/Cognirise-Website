import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Check, CheckCircle2, AlertTriangle, GitCompare, CircleDotDashed, CircleOff, Clock3 } from "lucide-react";

type Props = {
  selectedMarket: string;
  selectedLocale: string;
  markets: { market: string; displayName: string; locale?: string }[];
  onSelectEdition: (market: string, locale: string) => void;
  mode?: "shared" | "adapted" | "independent" | "unbound";
  isPending: boolean;
  onCompare: () => void;
  readinessBlockers: number;
  readinessWarnings: number;
  workflowState?: string | null;
  publicationState?: string | null;
  availabilityPending?: boolean;
  availableInMarket?: boolean | null;
};

export function DocumentEditorContext({
  selectedMarket,
  selectedLocale,
  markets,
  onSelectEdition,
  mode = "unbound",
  isPending,
  onCompare,
  readinessBlockers,
  readinessWarnings,
  workflowState,
  publicationState,
  availabilityPending = false,
  availableInMarket,
}: Props) {
  const status = (() => {
    if (availableInMarket === false) return { label: "Not available", icon: CircleOff, className: "text-muted-foreground" };
    if (availabilityPending) return { label: "Availability pending", icon: Clock3, className: "text-amber-600" };
    if (workflowState === "archived") return { label: "Archived", icon: CircleOff, className: "text-muted-foreground" };
    if (workflowState === "in-review") return { label: "In review", icon: Clock3, className: "text-amber-600" };
    if (workflowState === "approved") return { label: "Approved", icon: CheckCircle2, className: "text-emerald-600" };
    if (publicationState === "published" || workflowState === "published") return { label: "Published", icon: Check, className: "text-emerald-600" };
    if (workflowState === "draft") return { label: "Draft", icon: CircleDotDashed, className: "text-blue-600" };
    return { label: "Status unavailable", icon: CircleDotDashed, className: "text-muted-foreground" };
  })();
  const StatusIcon = status.icon;

  return (
    <div className="bg-card border-b border-border p-4 flex flex-wrap items-center justify-between gap-4 shrink-0">
      <div className="flex items-center gap-4">
        <Select 
          value={`${selectedMarket}|${selectedLocale}`} 
          onValueChange={(val) => {
            const [m, l] = val.split("|");
            onSelectEdition(m, l);
          }}
          disabled={isPending}
        >
          <SelectTrigger className="w-[200px] h-9 bg-background">
            <SelectValue placeholder="Select edition" />
          </SelectTrigger>
          <SelectContent>
            {markets.map(m => (
              <SelectItem key={`${m.market}|${m.locale || 'und'}`} value={`${m.market}|${m.locale || 'und'}`}>
                <span className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[9px] uppercase bg-blue-500/10 text-blue-500 border-blue-500/20">Exact</Badge> {m.displayName}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex items-center gap-3 border-l border-border pl-4">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Source</span>
            <span className="text-xs font-medium">
              {mode === "shared" ? "Shared baseline" : mode === "adapted" ? "Market adaptation" : mode === "independent" ? "Independent" : "Unbound exact edition"}
            </span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-mono uppercase text-muted-foreground">Status</span>
            <span className={`text-xs font-medium flex items-center gap-1 ${status.className}`}>
              <StatusIcon className="w-3 h-3" /> {status.label}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-sm font-mono">
          {readinessBlockers > 0 ? (
            <span className="flex items-center gap-1.5 text-destructive bg-destructive/10 px-2 py-1 rounded-sm">
              <AlertTriangle className="w-4 h-4" />
              {readinessBlockers} Blocker{readinessBlockers !== 1 && "s"}
            </span>
          ) : readinessWarnings > 0 ? (
            <span className="flex items-center gap-1.5 text-amber-600 bg-amber-500/10 px-2 py-1 rounded-sm">
              <AlertTriangle className="w-4 h-4" />
              {readinessWarnings} Warning{readinessWarnings !== 1 && "s"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-500/10 px-2 py-1 rounded-sm">
              <CheckCircle2 className="w-4 h-4" />
              Ready
            </span>
          )}
        </div>

        {mode === "adapted" && (
          <Button variant="outline" size="sm" onClick={onCompare} className="gap-2">
            <GitCompare className="w-4 h-4" />
            Compare to Shared
          </Button>
        )}
      </div>
    </div>
  );
}
