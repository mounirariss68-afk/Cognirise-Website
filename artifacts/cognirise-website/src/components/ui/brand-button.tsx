import * as React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface BrandButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: "primary" | "secondary" | "underlined";
  icon?: React.ReactNode;
}

export const BrandButton = React.forwardRef<HTMLButtonElement, BrandButtonProps>(
  ({ children, variant = "primary", className, icon, ...props }, ref) => {
    if (variant === "underlined") {
      return (
        <button
          ref={ref}
          className={cn(
            "group inline-flex items-center gap-2 border-b border-foreground pb-2 text-sm font-bold transition-colors hover:border-[hsl(var(--brand-pink))] hover:text-[hsl(var(--brand-pink))]",
            className
          )}
          {...props}
        >
          {children}
          {icon || <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />}
        </button>
      );
    }

    if (variant === "secondary") {
      return (
        <button
          ref={ref}
          className={cn(
            "group inline-flex min-h-[46px] items-center gap-4 overflow-hidden border border-foreground bg-transparent pl-4 pr-1 text-sm font-bold text-foreground transition-all hover:-translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_hsl(var(--brand-coral))]",
            className
          )}
          {...props}
        >
          {children}
          <div className="flex h-9 w-9 items-center justify-center bg-foreground text-background transition-colors group-hover:bg-[hsl(var(--brand-coral))] group-hover:text-white">
            {icon || <ArrowRight className="h-4 w-4" />}
          </div>
        </button>
      );
    }

    return (
      <button
        ref={ref}
        className={cn(
          "group relative inline-flex min-h-[46px] items-center gap-4 overflow-hidden border border-foreground bg-foreground pl-4 pr-1 text-sm font-bold text-white transition-all hover:-translate-y-[2px] hover:translate-x-[-2px] hover:shadow-[4px_4px_0px_hsl(var(--brand-coral))]",
          className
        )}
        {...props}
      >
        {/* Gradient hover background */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(105deg,hsl(var(--brand-violet)),hsl(var(--brand-pink)),hsl(var(--brand-coral)))] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        
        {/* Content wrapper to stay above gradient */}
        <span className="relative z-10">{children}</span>
        
        {/* Icon tile */}
        <div className="relative z-10 flex h-9 w-9 items-center justify-center bg-white text-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:bg-[hsl(var(--brand-coral))] group-hover:text-white">
          {icon || <ArrowRight className="h-4 w-4" />}
        </div>
      </button>
    );
  }
);
BrandButton.displayName = "BrandButton";
