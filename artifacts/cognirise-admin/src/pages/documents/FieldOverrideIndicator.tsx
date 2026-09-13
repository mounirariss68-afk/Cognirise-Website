import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, PenLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type FieldOverrideIndicatorProps = {
  label: string;
  isOverride: boolean;
  onResetToShared?: () => void;
  canEdit: boolean;
};

export function FieldOverrideIndicator({
  label,
  isOverride,
  onResetToShared,
  canEdit,
}: FieldOverrideIndicatorProps) {
  return (
    <div className="flex items-center justify-between group h-6 mb-1">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {isOverride ? (
          <Badge variant="outline" className="text-[9px] uppercase h-4 px-1 rounded-sm bg-blue-500/10 text-blue-500 border-blue-500/20">
            Market-specific
          </Badge>
        ) : (
          <Badge variant="outline" className="text-[9px] uppercase h-4 px-1 rounded-sm bg-muted text-muted-foreground font-normal">
            From Shared
          </Badge>
        )}
      </div>
      
      {isOverride && canEdit && onResetToShared && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                aria-label={`Reset ${label} to Shared`}
                onClick={onResetToShared}
              >
                <RotateCcw className="h-3 w-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Reset to Shared</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      
      {!isOverride && canEdit && (
         <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" 
              >
                <PenLine className="h-3 w-3 text-muted-foreground" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p className="text-xs">Edit to create a market override</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
    </div>
  );
}
