import { ArrowLeft } from "lucide-react";
import { useNavigationStore } from "@/store/navigation";

export type NavigationBackControlProps = {
  className?: string;
};

/**
 * A shared, same-tab Back action. It is a button rather than an anchor so a
 * stale or external referrer can never turn the control into an off-site link.
 */
export function NavigationBackControl({ className = "" }: NavigationBackControlProps) {
  const { canGoBack, goBack } = useNavigationStore();
  if (!canGoBack) return null;

  return (
    <div
      className={`mx-auto w-full max-w-[1440px] px-6 pt-3 md:px-[4.8vw] md:pt-4 ${className}`.trim()}
      data-navigation-back-container
    >
      <button
        type="button"
        onClick={() => { goBack(); }}
        aria-label="Back to previous page"
        data-testid="navigation-back"
        className="inline-flex items-center gap-1.5 rounded-sm py-1 text-[11px] font-semibold tracking-[0.04em] text-muted-foreground transition-colors hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="h-3 w-3" />
        Back
      </button>
    </div>
  );
}

export default NavigationBackControl;