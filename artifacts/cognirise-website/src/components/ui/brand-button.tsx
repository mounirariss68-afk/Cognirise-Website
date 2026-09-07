import * as React from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { trackEvent } from "@/lib/analytics";
import { useMarketStore } from "@/store/market";

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
    const { market } = useMarketStore();
    const isUnavailable = disabled || isLoading;
    const forcedTextColor =
      variant === "primary" || variant === "submit"
        ? "#ffffff"
        : variant === "inverse"
          ? "hsl(var(--brand-deep))"
          : undefined;

    const renderContent = () => {
      if (variant === "editorial") {
        return (
          <>
            <span>{children}</span>
            <span className="pulse-editorial-icon" aria-hidden="true">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon || <ArrowRight className="h-4 w-4" />)}
            </span>
          </>
        );
      }

      return (
        <>
          <span className="pulse-action-sheen" aria-hidden="true" />
          <span className="pulse-action-layout">
            <span className="pulse-action-label">{children}</span>
            <span className="pulse-action-icon" aria-hidden="true">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon || <ArrowRight className="h-4 w-4" />)}
            </span>
          </span>
        </>
      );
    };

    const getClasses = () => {
      if (variant === "editorial") {
        return cn(
          "group relative inline-flex items-center gap-3 border-b-2 border-foreground/20 pb-2 text-sm font-bold text-foreground transition-all hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))] focus-visible:rounded-sm focus-visible:border-[hsl(var(--brand-pink))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-coral))] focus-visible:ring-offset-4 disabled:pointer-events-none disabled:opacity-50",
          className
        );
      }

      const baseClass = "pulse-action relative inline-flex min-h-[52px] min-w-[11rem] items-center overflow-hidden rounded-full text-sm font-bold";
      
      const variantClasses = {
        primary: "pulse-action-primary",
        inverse: "pulse-action-inverse",
        secondary: "pulse-action-secondary",
        submit: "pulse-action-submit",
        editorial: "" // Handled above
      };

      const variantClass = variantClasses[variant] || variantClasses.primary;

      return cn(
        baseClass,
        variantClass,
        "focus-visible:outline-none disabled:pointer-events-none",
        className
      );
    };

    if (href) {
      const anchorProps = props as React.AnchorHTMLAttributes<HTMLAnchorElement>;

      return (
        <Link
          {...anchorProps}
          ref={ref as React.ForwardedRef<HTMLAnchorElement>}
          href={href}
          className={getClasses()}
          aria-busy={isLoading || undefined}
          aria-disabled={isUnavailable || undefined}
          tabIndex={isUnavailable ? -1 : anchorProps.tabIndex}
          onClick={(event) => {
            if (isUnavailable) {
              event.preventDefault();
              return;
            }
            trackEvent("cta_click", market, {
              label: typeof children === "string" ? children : undefined,
              destination: href,
            });
            anchorProps.onClick?.(event);
          }}
          style={{ ...anchorProps.style, color: forcedTextColor }}
        >
          {renderContent()}
        </Link>
      );
    }

    return (
      <button
        ref={ref as React.ForwardedRef<HTMLButtonElement>}
        className={getClasses()}
        disabled={isUnavailable}
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