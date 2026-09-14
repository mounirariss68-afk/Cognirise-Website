/**
 * A guided reuse comparison has three distinct concurrency states:
 * undefined preserves the legacy binding route, null means no exact revision
 * existed at comparison time, and a string pins the exact revision inspected.
 */
export function destinationRevisionMatchesExpected(
  expectedRevisionId: string | null | undefined,
  currentRevisionId: string | null,
) {
  if (expectedRevisionId === undefined) return true;
  return expectedRevisionId === currentRevisionId;
}

/** `und` is a legacy non-language marker, never a wildcard. */
export function localeLanguageIdentity(locale: string) {
  const primary = locale.trim().split("-")[0]?.toLowerCase();
  return primary && /^[a-z]{2,8}$/.test(primary) && primary !== "und" ? primary : undefined;
}

export function sameLanguageLocale(left: string, right: string) {
  const leftLanguage = localeLanguageIdentity(left);
  return Boolean(leftLanguage && leftLanguage === localeLanguageIdentity(right));
}