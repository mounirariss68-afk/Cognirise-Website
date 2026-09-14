import * as React from "react";

export function Kicker({ children, inverse = false, className = "" }: { children: React.ReactNode; inverse?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-3 text-[length:var(--gf-text-kicker)] font-bold uppercase tracking-[var(--gf-tracking-kicker)] ${inverse ? "text-[var(--gf-ink-muted)]" : "text-[var(--gf-ink)]"} ${className}`}>
      <span className="h-[var(--gf-kicker-line-height)] w-[var(--gf-kicker-line-width)] bg-gradient-to-r from-[var(--gf-accent-violet)] via-[var(--gf-accent)] to-[var(--gf-accent-coral)] shrink-0" />
      {children}
    </div>
  );
}