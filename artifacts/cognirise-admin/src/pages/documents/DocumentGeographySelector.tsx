import { useMemo } from "react";
import { Globe2, Languages, MapPin } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type GeographyMarket = {
  code: string;
  displayName: string;
  enabled?: boolean;
  defaultLocale?: string;
  locales?: string[];
};

export type GeographyEdition = {
  market: string;
  locale: string;
  exact?: boolean;
  revisionId?: string | null;
};

export type DocumentGeographySelectorProps = {
  markets: GeographyMarket[];
  editions: GeographyEdition[];
  selectedMarket: string;
  selectedLocale: string;
  sharedLocale?: string;
  sharedLocales?: string[];
  sharedAvailable?: boolean;
  disabled?: boolean;
  onSelectEdition: (market: string, locale: string) => void;
  onSelectShared?: (locale: string) => void;
  /** Retained for compatibility; selecting Shared is part of Version below. */
  showSourceControl?: boolean;
};

function localeLabel(locale: string) {
  if (locale === "und") return "Neutral";
  try {
    const display = new Intl.DisplayNames(["en"], { type: "language" }).of(locale.split("-")[0]);
    return display ? `${display} (${locale})` : locale;
  } catch {
    return locale;
  }
}

export function marketLocaleOptions(
  market: GeographyMarket | undefined,
  editions: GeographyEdition[],
) {
  const fromMarket = market?.locales ?? [];
  const fromEditions = editions
    .filter((edition) => edition.market === market?.code && edition.locale)
    .map((edition) => edition.locale);
  return [...new Set([...fromMarket, ...fromEditions])].sort();
}

/**
 * One edition selector establishes whether the editor is acting on neutral
 * shared content or one named regional version. Language is deliberately a
 * separate selector: it never implies a destination or a translation action.
 */
export function DocumentGeographySelector({
  markets,
  editions,
  selectedMarket,
  selectedLocale,
  sharedLocale,
  sharedLocales = [],
  sharedAvailable = false,
  disabled = false,
  onSelectEdition,
  onSelectShared,
}: DocumentGeographySelectorProps) {
  const enabledMarkets = useMemo(
    () => markets.filter((market) => market.enabled !== false),
    [markets],
  );
  const selectedMarketConfig = enabledMarkets.find((market) => market.code === selectedMarket);
  const localeOptions = marketLocaleOptions(selectedMarketConfig, editions);
  const effectiveSharedLocale = sharedLocale && sharedLocale !== "und"
    ? sharedLocale
    : undefined;
  const isShared = selectedMarket === "shared-source";
  const selectedDisplay = isShared
    ? `Shared content${effectiveSharedLocale ? ` · ${effectiveSharedLocale}` : ""}`
    : selectedMarketConfig?.displayName ?? selectedMarket;

  const selectMarket = (market: string) => {
    if (market === "shared-source") {
      onSelectShared?.(effectiveSharedLocale ?? sharedLocale ?? "en");
      return;
    }
    const target = enabledMarkets.find((item) => item.code === market);
    const locales = marketLocaleOptions(target, editions);
    const nextLocale = locales.includes(selectedLocale)
      ? selectedLocale
      : target?.defaultLocale ?? locales[0] ?? "en";
    onSelectEdition(market, nextLocale);
  };

  const selectLocale = (locale: string) => {
    if (isShared) {
      onSelectShared?.(locale);
      return;
    }
    onSelectEdition(selectedMarket, locale);
  };

  return (
    <section
      aria-label="Editing context"
      className="rounded-lg border border-primary/20 bg-primary/[0.025] p-3 sm:p-4"
      data-testid="document-geography-selector"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
            <Globe2 className="h-3.5 w-3.5" aria-hidden="true" />
            Editing context
          </p>
          <p className="mt-1 text-sm font-semibold">{selectedDisplay || "Choose a destination"}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {isShared
              ? "Shared content is the neutral source for this language. It does not publish or change a market by itself."
              : "This market resolves the content below. Choose Customize only when this region needs a local difference."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="geography-market" className="flex items-center gap-1.5 text-xs">
            <MapPin className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            Version
          </Label>
          <Select value={selectedMarket || undefined} onValueChange={selectMarket} disabled={disabled}>
            <SelectTrigger id="geography-market" aria-label="Content version">
              <SelectValue placeholder="Choose Shared or a region" />
            </SelectTrigger>
            <SelectContent>
              {sharedAvailable && <SelectItem value="shared-source">Shared content</SelectItem>}
              {enabledMarkets.map((market) => (
                <SelectItem key={market.code} value={market.code}>
                  {market.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="geography-language" className="flex items-center gap-1.5 text-xs">
            <Languages className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            Language
          </Label>
          <Select
            value={isShared ? (effectiveSharedLocale ?? sharedLocale ?? undefined) : (selectedLocale || undefined)}
            onValueChange={selectLocale}
            disabled={disabled}
          >
            <SelectTrigger id="geography-language" aria-label="Language">
              <SelectValue placeholder="Choose a language" />
            </SelectTrigger>
            <SelectContent>
              {(isShared
                ? [...new Set([
                    ...sharedLocales,
                    sharedLocale,
                  ].filter((locale): locale is string => Boolean(locale && locale !== "und")))]
                : localeOptions
              ).map((locale) => (
                <SelectItem key={locale} value={locale}>
                  {localeLabel(locale)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-muted-foreground">
        Choose Shared for the neutral source or a named region for its exact saved version. Source lineage and destination visibility are managed under Regions.
      </p>
    </section>
  );
}
