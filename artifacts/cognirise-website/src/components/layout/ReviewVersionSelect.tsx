import React from "react";
import type { PublicMarket } from "@/store/market";

/** Native select supplies the same keyboard and touch behavior in both menus. */
export function ReviewVersionSelect({
  markets, market, onSelect,
}: {
  markets: ReadonlyArray<PublicMarket>;
  market: string;
  onSelect: (code: string, locale?: string) => void;
}) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      Review version
      <select
        aria-label="Review version"
        value={market}
        onChange={(event) => {
          const option = markets.find(({ code }) => code === event.target.value);
          if (option) onSelect(option.code, option.defaultLocale);
        }}
        className="h-9 w-full max-w-[180px] rounded-sm border border-border bg-white px-2 text-xs font-semibold normal-case tracking-normal text-[hsl(var(--brand-deep))] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--brand-pink))]"
      >
        {markets.map((option) => (
          <option key={option.code} value={option.code}>{option.displayName || option.code.toUpperCase()}</option>
        ))}
      </select>
    </label>
  );
}