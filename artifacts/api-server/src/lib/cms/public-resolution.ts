import { cmsMarketEditionsTable } from "@workspace/db";
import { CANONICAL_MARKET, type CmsMarket } from "./security";

export type FallbackMode = "canonical" | "uaeFallback" | "override" | "unavailable";
export type PublicationState = "draft" | "review" | "approved" | "scheduled" | "published" | "expired" | "archived";

type PublicEditionState = Pick<
  typeof cmsMarketEditionsTable.$inferSelect,
  "market" | "fallbackMode" | "publicationState" | "publishAt" | "expiresAt"
>;

function live(edition: PublicEditionState, now: Date) {
  return edition.publicationState === "published" &&
    (!edition.publishAt || edition.publishAt <= now) &&
    (!edition.expiresAt || edition.expiresAt > now);
}

export function resolvePublicEdition(
  requested: PublicEditionState | undefined,
  uae: PublicEditionState | undefined,
  market: CmsMarket,
  now = new Date(),
): "requested" | "uae" | "unavailable" {
  if (!requested || !live(requested, now) || requested.fallbackMode === "unavailable") return "unavailable";
  if (requested.fallbackMode === "uaeFallback") {
    return uae && uae.fallbackMode === "canonical" && live(uae, now) ? "uae" : "unavailable";
  }
  return requested.fallbackMode === "override" ||
    (requested.fallbackMode === "canonical" && market === CANONICAL_MARKET)
    ? "requested"
    : "unavailable";
}