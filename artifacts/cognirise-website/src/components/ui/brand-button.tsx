import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "editorial" | "inverse" | "submit";
  icon?: React.ReactNode;
  href?: string;
  className?: string;
  isLoading?: boolean;
}

export const BrandButton = React.forwardRef<HTMLButtonElement | HTMLAnchorElement, BrandButtonProps & React.AnchorHTMLAttributes<HTMLAnchorElement>>(
  ({ children, variant = "primary", className, icon, href, isLoading, disabled, ...props }, ref) => {
    const forcedTextColor =
      variant === "primary" || variant === "submit"
        ? "#ffffff"
        : variant === "inverse"
          ? "hsl(var(--brand-deep))"
          : undefined;
    
    // Core styling logic
    const renderContent = () => {
      if (variant === "editorial") {
        return (
          <>
            {children}
            <div className="text-[hsl(var(--brand-coral))] transition-transform group-hover:translate-x-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon || <ArrowRight className="h-4 w-4" />)}
            </div>
          </>
        );
      }

      return (
        <>
          {/* Signal Rail edge */}
          <span
            aria-hidden="true"
            className="pulse-signal-rail absolute inset-y-0 left-0 z-0 w-1 bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))]"
          />

          {/* Hover surface layer */}
          <span
            aria-hidden="true"
            className={cn(
              "pulse-action-hover absolute inset-0 z-0 opacity-0 pointer-events-none",
              variant === "inverse" ? "bg-[hsl(var(--brand-deep))]/6" : "bg-white/7"
            )}
          />

          <span className="pulse-action-content relative z-10 flex min-w-0 items-center gap-3.5">
            <span className="min-w-0 whitespace-normal text-left leading-snug">{children}</span>
            <span aria-hidden="true" className="pulse-action-icon flex shrink-0 items-center justify-center">
              {isLoading ? <Loader2 className="h-[17px] w-[17px] animate-spin" /> : (icon || <ArrowRight className="h-[17px] w-[17px]" strokeWidth={2} />)}
            </span>
          </span>
        </>
      );
    };

    const getClasses = () => {
      if (variant === "editorial") {
        return cn(
          "group relative inline-flex items-center gap-3 border-b-2 border-foreground/20 pb-2 text-sm font-bold text-foreground transition-all hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:border-[hsl(var(--brand-pink))] disabled:opacity-50 disabled:pointer-events-none",
          className
        );
      }

      const baseClass = "pulse-action group relative inline-flex min-h-12 max-w-full cursor-pointer items-center overflow-hidden border border-transparent py-3 pl-6 pr-5 text-[13px] font-bold tracking-[-0.01em]";
      
      const variantClasses = {
        primary: "bg-[hsl(var(--brand-deep))] text-white",
        inverse: "bg-white text-[hsl(var(--brand-deep))]",
        secondary: "bg-transparent text-foreground border-foreground/20",
        submit: "bg-[hsl(var(--brand-deep))] text-white",
        editorial: "" // Handled above
      };

      const variantClass = variantClasses[variant] || variantClasses.primary;

      return cn(
        baseClass,
        variantClass,
        "focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[hsl(var(--brand-coral))] focus-visible:ring-offset-[3px] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-45",
        className
      );
    };

    if (href) {
      return (
        <Link
          {...(props as React.AnchorHTMLAttributes<HTMLAnchorElement>)}
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          href={href}
          className={getClasses()}
          aria-busy={isLoading || undefined}
          aria-disabled={disabled || isLoading || undefined}
          tabIndex={disabled || isLoading ? -1 : props.tabIndex}
          onClick={(event) => {
            if (disabled || isLoading) {
              event.preventDefault();
              return;
            }
            props.onClick?.(event as any);
          }}
          style={{ ...props.style, color: forcedTextColor }}
        >
          {renderContent()}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        className={getClasses()}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        style={{ ...props.style, color: forcedTextColor }}
      >
        {renderContent()}
      </button>
    );
  }
);
BrandButton.displayName = "BrandButton";