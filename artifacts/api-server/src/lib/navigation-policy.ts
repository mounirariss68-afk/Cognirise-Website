import { pool } from "@workspace/db";
import { NavigationPolicySnapshotSchema } from "@workspace/api-zod";

export type PolicyCandidate = { market: string; locale: string };

export async function navigationCandidates(market: string, locale: string): Promise<PolicyCandidate[] | null> {
  const result = await pool.query(
    `SELECT code,default_locale,fallback_market_code,fallback_locale,is_canonical
       FROM market_editions WHERE enabled=true`,
  );
  const markets = new Map(result.rows.map((row) => [String(row.code), row]));
  const requested = markets.get(market);
  if (!requested) return null;
  const supportedLocales = new Set(result.rows.flatMap((row) =>
    [row.default_locale, row.fallback_locale].filter(Boolean).map(String)
  ));
  if (!supportedLocales.has(locale)) return null;
  const values: PolicyCandidate[] = [];
  const add = (candidateMarket: string, candidateLocale: string) => {
    if (!values.some((value) => value.market === candidateMarket && value.locale === candidateLocale)) {
      values.push({ market: candidateMarket, locale: candidateLocale });
    }
  };
  add(market, locale);
  if (locale !== requested.default_locale) add(market, String(requested.default_locale));
  const visited = new Set<string>();
  let current = requested;
  while (current?.fallback_market_code && !visited.has(String(current.code)) && values.length < 16) {
    visited.add(String(current.code));
    const fallback = markets.get(String(current.fallback_market_code));
    if (!fallback) break;
    add(String(fallback.code), String(current.fallback_locale || fallback.default_locale));
    current = fallback;
  }
  const canonical = result.rows.find((row) => row.is_canonical);
  if (canonical) add(String(canonical.code), String(canonical.default_locale));
  return values;
}

export async function publishedNavigationPolicy(market: string, locale: string) {
  const candidates = await navigationCandidates(market, locale);
  if (!candidates) return null;
  for (const candidate of candidates) {
    const result = await pool.query(
      `SELECT items,pages,published_at FROM cms_navigation_published_policies
        WHERE market=$1 AND locale=$2`,
      [candidate.market, candidate.locale],
    );
    if (!result.rowCount) continue;
    const parsed = NavigationPolicySnapshotSchema.safeParse({
      items: result.rows[0].items,
      pages: result.rows[0].pages,
    });
    if (!parsed.success) {
      throw new Error(`Published navigation policy is invalid: ${parsed.error.issues[0]?.message ?? "invalid hierarchy"}`);
    }
    return {
      ...parsed.data,
      market: candidate.market,
      locale: candidate.locale,
      requestedMarket: market,
      requestedLocale: locale,
      usedFallback: candidate.market !== market || candidate.locale !== locale,
      publishedAt: result.rows[0].published_at,
    };
  }
  return null;
}

export async function isPublishedPageAvailable(path: string, market: string, locale: string) {
  const policy = await publishedNavigationPolicy(market, locale);
  // No published snapshot is an explicit compatibility/unconfigured state.
  // Once a snapshot exists, every surface uses its page decision.
  if (!policy) return true;
  return policy.pages.find((page) => page.path === path)?.enabled ?? true;
}