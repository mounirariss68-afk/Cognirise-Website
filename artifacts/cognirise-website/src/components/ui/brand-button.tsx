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
          <div className={cn(
            "pulse-signal-rail absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-[hsl(var(--brand-violet))] via-[hsl(var(--brand-pink))] to-[hsl(var(--brand-coral))] z-0 transition-all duration-300",
            variant === "submit" ? "w-full opacity-0 group-hover:opacity-100" : ""
          )} />

          {/* Hover surface layer */}
          <div className="absolute inset-0 bg-white/5 opacity-0 transition-opacity duration-300 group-hover:opacity-100 z-0 pointer-events-none" />

          <span className="relative z-10 flex items-center gap-4 transition-transform duration-300 group-hover:translate-x-1">
            {children}
            <span className="flex items-center justify-center transition-transform duration-300 group-hover:translate-x-1">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (icon || <ArrowRight className="h-4 w-4" />)}
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

      const baseClass = "pulse-action group relative inline-flex min-h-[46px] items-center overflow-hidden pl-6 pr-5 text-sm font-bold transition-all duration-300";
      
      const variantClasses = {
        primary: "bg-[hsl(var(--brand-deep))] text-white",
        inverse: "bg-white text-[hsl(var(--brand-deep))]",
        secondary: "bg-transparent text-foreground border border-foreground/20",
        submit: "bg-[hsl(var(--brand-deep))] text-white border border-transparent shadow-[4px_4px_0px_hsl(var(--brand-coral))] hover:-translate-y-1 hover:-translate-x-1 hover:shadow-[8px_8px_0px_hsl(var(--brand-coral))]",
        editorial: "" // Handled above
      };

      const variantClass = variantClasses[variant] || variantClasses.primary;

      return cn(
        baseClass,
        variantClass,
        "focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))] focus-visible:ring-offset-2 focus-visible:outline-none disabled:opacity-50 disabled:pointer-events-none",
        className
      );
    };

    if (href) {
      return (
        <Link
          href={href}
          className={getClasses()}
          onClick={props.onClick as any}
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
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
        style={{ ...props.style, color: forcedTextColor }}
      >
        {renderContent()}
      </button>
    );
  }
);
BrandButton.displayName = "BrandButton";