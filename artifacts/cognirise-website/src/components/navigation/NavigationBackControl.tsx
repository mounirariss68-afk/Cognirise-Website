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
      className={`mx-auto w-full max-w-[1440px] px-6 pt-5 md:px-12 md:pt-6 ${className}`.trim()}
      data-navigation-back-container
    >
      <button
        type="button"
        onClick={() => { goBack(); }}
        aria-label="Back to previous page"
        data-testid="navigation-back"
        className="inline-flex items-center gap-2 rounded-sm border border-border bg-white px-3 py-2 text-xs font-bold uppercase tracking-[0.14em] text-[hsl(var(--brand-deep))] transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2"
      >
        <ArrowLeft aria-hidden="true" className="h-3.5 w-3.5" />
        Back
      </button>
    </div>
  );
}

export default NavigationBackControl;