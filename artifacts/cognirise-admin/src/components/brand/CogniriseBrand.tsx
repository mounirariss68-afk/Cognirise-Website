import { cn } from "@/lib/utils";

type CogniriseBrandProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

function PulseMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative grid h-9 w-9 shrink-0 grid-cols-3 grid-rows-3 gap-[2px] rounded-[11px] bg-white/95 p-[5px] shadow-sm ring-1 ring-brand-violet/15",
        className,
      )}
    >
      <span className="col-start-1 row-start-2 rounded-full bg-brand-violet" />
      <span className="col-start-2 row-start-1 rounded-full bg-brand-violet" />
      <span className="col-start-2 row-start-2 rounded-full bg-brand-pink" />
      <span className="col-start-2 row-start-3 rounded-full bg-brand-pink" />
      <span className="col-start-3 row-start-1 rounded-full bg-brand-coral" />
      <span className="col-start-3 row-start-2 rounded-full bg-brand-coral" />
    </span>
  );
}

export function CogniriseBrand({
  inverse = false,
  compact = false,
  className,
}: CogniriseBrandProps) {
  return (
    <div className={cn("flex min-w-0 items-center gap-3", className)}>
      <PulseMark className={compact ? "h-8 w-8 rounded-[10px]" : undefined} />
      <div className="min-w-0">
        <div
          className={cn(
            "font-display text-[17px] font-bold leading-none tracking-[-0.045em]",
            inverse ? "text-sidebar-foreground" : "text-foreground",
          )}
        >
          cognirise
        </div>
        <div
          className={cn(
            "mt-1 font-mono text-[8px] font-semibold uppercase leading-none tracking-[0.2em]",
            inverse ? "text-sidebar-foreground/55" : "text-muted-foreground",
          )}
        >
          Editorial control
        </div>
      </div>
    </div>
  );
}
