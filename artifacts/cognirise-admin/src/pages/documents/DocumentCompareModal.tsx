import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GitCommit, GitMerge, AlertCircle, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { SharedMarketComparison } from "@workspace/api-client-react";

type CompareConflict = {
  conflictId: string;
  path: string;
  previouslyAdopted: any;
  newShared: any;
  localOverride: any;
  message?: string;
  decision?: "adopt" | "keep";
};

type Props = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  comparison?: SharedMarketComparison;
  conflicts: CompareConflict[];
  onResolveConflict: (conflictId: string, decision: "adopt" | "keep") => void;
  onApplyDecisions: () => void;
  onResolve?: (action: "adopt" | "keep" | "reset" | "detach") => void;
  isApplying: boolean;
};

export function DocumentCompareModal({
  isOpen,
  onOpenChange,
  comparison,
  conflicts,
  onResolveConflict,
  onApplyDecisions,
  onResolve,
  isApplying,
}: Props) {
  const unresolvedCount = conflicts.filter(c => !c.decision).length;
  const hasUpdatesAvailable = Boolean(comparison && (
    comparison.baselineRevisionId !== comparison.binding.baselineRevisionId
    || JSON.stringify(comparison.previousSnapshot) !== JSON.stringify(comparison.currentSnapshot)
  ));
  
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] min-h-0 w-[calc(100%-1rem)] max-w-4xl flex-col gap-3 p-4 sm:max-h-[85vh] sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2 pr-6 sm:items-center">
            <GitMerge className="w-5 h-5 text-primary" />
            Compare with Shared Updates
          </DialogTitle>
          <DialogDescription>
            {hasUpdatesAvailable
              ? "New shared content is available. Review conflicts between your market-specific overrides and the updated shared content." 
              : "Compare your market-specific overrides against the adopted shared baseline."}
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="min-h-0 flex-1 px-0 sm:-mx-6 sm:px-6">
          <div className="space-y-6 py-4">
             {comparison && <div className="grid gap-3 rounded border bg-muted/20 p-3 text-xs sm:grid-cols-3 sm:gap-2">
               <Snapshot label="Previously adopted" value={comparison.previousSnapshot} />
               <Snapshot label="Current shared baseline" value={comparison.currentSnapshot} />
               <Snapshot label="Current local edition" value={comparison.localSnapshot} />
             </div>}
             {conflicts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Check className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-50" />
                <p>No conflicts found.</p>
                <p className="text-sm mt-1">Your market overrides do not intersect with the updated shared fields.</p>
              </div>
            ) : (
              conflicts.map((conflict, i) => (
                  <div key={conflict.conflictId} className="flex flex-col overflow-hidden rounded-lg border border-border">
                   <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border bg-muted/30 px-3 py-2">
                      <div className="min-w-0"><span className="break-words font-mono text-xs font-semibold">{conflict.path}</span>{conflict.message && <p className="mt-1 text-xs text-muted-foreground">{conflict.message}</p>}</div>
                    {conflict.decision && (
                      <Badge variant="outline" className={conflict.decision === 'adopt' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20'}>
                        {conflict.decision === 'adopt' ? 'Adopting Update' : 'Keeping Override'}
                      </Badge>
                    )}
                  </div>
                  
                   <div className="grid grid-cols-1 divide-y divide-border sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                    {/* Previously Adopted */}
                    <div className="p-3 bg-muted/10 opacity-70">
                      <div className="text-[10px] uppercase font-mono text-muted-foreground mb-2 flex items-center gap-1">
                        <GitCommit className="w-3 h-3" /> Adopted Baseline
                      </div>
                       <div className="break-words whitespace-pre-wrap text-xs font-mono text-muted-foreground">
                        {typeof conflict.previouslyAdopted === 'object' ? JSON.stringify(conflict.previouslyAdopted, null, 2) : String(conflict.previouslyAdopted)}
                      </div>
                    </div>
                    
                    {/* New Shared */}
                    <div className={`p-3 relative ${conflict.decision === 'adopt' ? 'bg-blue-500/5' : ''}`}>
                      <div className="text-[10px] uppercase font-mono text-blue-600 mb-2 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> New Shared Update
                      </div>
                       <div className="break-words whitespace-pre-wrap text-xs font-mono">
                        {typeof conflict.newShared === 'object' ? JSON.stringify(conflict.newShared, null, 2) : String(conflict.newShared)}
                      </div>
                      <div className="mt-4">
                        <Button 
                          size="sm" 
                          variant={conflict.decision === 'adopt' ? 'default' : 'outline'}
                           className="w-full whitespace-normal text-xs leading-tight"
                           onClick={() => onResolveConflict(conflict.conflictId, 'adopt')}
                        >
                          Adopt Update
                        </Button>
                      </div>
                    </div>
                    
                    {/* Local Override */}
                    <div className={`p-3 relative ${conflict.decision === 'keep' ? 'bg-amber-500/5' : ''}`}>
                      <div className="text-[10px] uppercase font-mono text-amber-600 mb-2 flex items-center gap-1">
                        Market Override
                      </div>
                       <div className="break-words whitespace-pre-wrap text-xs font-mono">
                        {typeof conflict.localOverride === 'object' ? JSON.stringify(conflict.localOverride, null, 2) : String(conflict.localOverride)}
                      </div>
                      <div className="mt-4">
                        <Button 
                          size="sm" 
                          variant={conflict.decision === 'keep' ? 'default' : 'outline'}
                           className="w-full whitespace-normal text-xs leading-tight"
                           onClick={() => onResolveConflict(conflict.conflictId, 'keep')}
                        >
                          Keep Override
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <DialogFooter className="mt-auto border-t border-border pt-3 sm:pt-4">
          <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs font-mono text-muted-foreground">
              {unresolvedCount > 0 ? `${unresolvedCount} conflict${unresolvedCount !== 1 ? 's' : ''} remaining` : "All conflicts resolved"}
            </span>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
              <Button className="w-full sm:w-auto" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
               {onResolve && <Button className="w-full sm:w-auto" variant="outline" disabled={isApplying} onClick={() => onResolve("detach")}>Detach as independent</Button>}
               {onResolve && <Button className="w-full sm:w-auto" variant="outline" disabled={isApplying} onClick={() => onResolve("reset")}>Reset to shared</Button>}
               {onResolve && <Button className="w-full whitespace-normal sm:w-auto" disabled={isApplying || unresolvedCount > 0} onClick={() => onResolve(comparison?.canAutoAdopt ? "adopt" : "keep")}>
                 {comparison?.canAutoAdopt ? "Adopt shared update" : "Keep frozen baseline"}
               </Button>}
              <Button
                className="w-full whitespace-normal sm:w-auto"
                onClick={onApplyDecisions} 
                disabled={unresolvedCount > 0 || isApplying}
              >
                {isApplying ? "Applying..." : "Apply & Save Draft"}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Snapshot({ label, value }: { label: string; value: unknown }) {
  return <div>
    <p className="mb-1 text-[10px] font-mono uppercase text-muted-foreground">{label}</p>
    <pre className="max-h-36 overflow-auto whitespace-pre-wrap break-words rounded bg-background p-2 text-[10px]">{JSON.stringify(value, null, 2)}</pre>
  </div>;
}
