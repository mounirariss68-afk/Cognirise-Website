/**
 * Page-top labels are presentation, not the source of regional editorial
 * content.  A published page can therefore keep its market-specific body
 * copy while the small hero label remains neutral.
 *
 * This helper is intentionally narrow: call it for an identified hero
 * eyebrow/breadcrumb only.  It must not be used as a general CMS text
 * sanitizer.
 */

export type HeroIdentifierOptions = {
  /** The currently selected market's configured display label, when known. */
  marketLocation?: string;
  /** Additional exact identifiers used by a particular hero. */
  identifiers?: readonly string[];
};

const BUILT_IN_IDENTIFIERS = [
  "uae",
  "u.a.e.",
  "united arab emirates",
  "dubai",
  "dubai uae",
  "ksa",
  "kingdom of saudi arabia",
  "saudi arabia",
  "riyadh",
  "riyadh kingdom of saudi arabia",
  "turkiye",
  "türkiye",
  "turkey",
  "tr",
  "europe",
  "eu",
  "united kingdom",
  "uk",
] as const;

const IDENTIFIER_SEPARATOR = /\s*(?:\/|\||·|•|—|–)\s*/;

function normalize(value: string) {
  return value
    .trim()
    .replace(/[·•—–|/]+/g, " ")
    .replace(/\s+/g, " ")
    .toLocaleLowerCase();
}

function isVersionIdentifier(value: string) {
  const normalized = value.trim();
  return (
    /^\d+(?:\.\d+)*$/.test(normalized)
    || /^(?:v|ver|version|rev|revision|edition)\s*[:.#-]?\s*\d+(?:\.\d+)*$/i.test(normalized)
  );
}

function identifierParts(value: string) {
  return value
    .split(IDENTIFIER_SEPARATOR)
    .map((part) => normalize(part))
    .filter(Boolean);
}

function isCountryIdentifier(value: string, identifiers: ReadonlySet<string>) {
  const normalized = normalize(value);
  return Boolean(normalized) && (
    identifiers.has(normalized)
    || identifierParts(value).some((part) => identifiers.has(part))
  );
}

/**
 * Remove only country/market and revision tokens from one hero label.
 *
 * Examples:
 *   `UAE / AI-native advisory & engineering` → `AI-native advisory & engineering`
 *   `Platforms / Riyadh · Kingdom of Saudi Arabia / v2` → `Platforms`
 *   `Market context / UAE` is unchanged unless this function is explicitly
 *   applied to that hero slot (which is why this is not a global text pass).
 */
export function cleanHeroIdentifier(
  value: string,
  options: HeroIdentifierOptions = {},
): string {
  const customIdentifiers = [
    ...(options.marketLocation ? [options.marketLocation] : []),
    ...(options.identifiers ?? []),
  ];
  const identifierSet = new Set<string>([
    ...BUILT_IN_IDENTIFIERS,
    ...customIdentifiers.flatMap(identifierParts),
    ...customIdentifiers.map(normalize),
  ]);

  const parts = value.split(IDENTIFIER_SEPARATOR);
  const kept = parts.filter((part) =>
    !isVersionIdentifier(part) && !isCountryIdentifier(part, identifierSet),
  );

  // Preserve the CMS value byte-for-byte when this hero does not contain an
  // identifier. This avoids changing meaningful punctuation or whitespace.
  if (kept.length === parts.length) return value;
  return kept.join(" / ").replace(/\s+/g, " ").trim();
}