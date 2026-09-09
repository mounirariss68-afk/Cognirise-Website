import type { CmsRole } from "./auth";

const roleRank: Record<CmsRole, number> = {
  viewer: 0,
  editor: 1,
  publisher: 2,
  administrator: 3,
};

export function roleAtLeast(actual: CmsRole, required: CmsRole): boolean {
  return roleRank[actual] >= roleRank[required];
}

/**
 * Administrators are deliberately unrestricted. For every other role an empty
 * assignment set is deny-all, rather than accidentally becoming global access.
 */
export function canAccessAssignedMarket(
  role: CmsRole,
  assignments: readonly string[],
  market: string,
): boolean {
  return role === "administrator" || assignments.includes(market);
}

export function selectMarketWithUaeFallback(
  requestedMarket: string,
  availableMarkets: readonly string[],
): string | null {
  if (availableMarkets.includes(requestedMarket)) return requestedMarket;
  if (availableMarkets.includes("uae")) return "uae";
  return null;
}

export type MarketAvailabilityDecision = "inherit" | "show" | "off";

/** An explicit decision for the originally requested market is authoritative. */
export function selectMarketWithAvailability(
  requestedMarket: string,
  availableMarkets: readonly string[],
  requestedDecision: MarketAvailabilityDecision = "inherit",
): string | null {
  if (requestedDecision === "off") return null;
  return selectMarketWithUaeFallback(requestedMarket, availableMarkets);
}

export function canChangeCanonicalSlug(
  currentSlug: string,
  nextSlug: string | undefined,
  publishedRevisionId: string | null | undefined,
): boolean {
  return !nextSlug || nextSlug === currentSlug || !publishedRevisionId;
}

export function isPublicContentVisible(
  _kind: string,
  payload: Record<string, unknown>,
): boolean {
  const content = typeof payload.content === "object" && payload.content
    ? payload.content as Record<string, unknown>
    : {};
  const values = [payload.visibility, content.visibility];
  const confidentiality = [payload.confidential, content.confidential];
  return values.every((value) => value === undefined || value === "public") &&
    confidentiality.every((value) => value === undefined || (value !== true && value !== "true" && value !== "restricted"));
}

/** Service attribution rows do not count as a completed human CMS setup. */
export function isInitialSetupRequired(credentialedAccountCount: number): boolean {
  return credentialedAccountCount === 0;
}
