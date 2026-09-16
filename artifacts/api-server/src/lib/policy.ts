import type { CmsRole } from "./auth";
import { pool } from "@workspace/db";

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

export const cmsDocumentTopics = [
  "person",
  "partner",
  "platform",
  "publication",
  "case-study",
  "industry",
  "framework",
  "office",
  "landing-page",
  "site-configuration",
] as const;
export type CmsDocumentTopic = typeof cmsDocumentTopics[number];

export const cmsCapabilities = ["view", "edit", "review", "publish"] as const;
export type CmsCapability = typeof cmsCapabilities[number];
export type CmsCapabilityScope = "regional" | "shared";

export type CapabilityGrant = {
  topic: CmsDocumentTopic;
  capability: CmsCapability;
  scope: CmsCapabilityScope;
  marketCode: string;
};

export type CapabilitySubject = {
  role: CmsRole;
  marketCodes: readonly string[];
  id?: string;
};

export type ContentAuthorityRequest = {
  topic: CmsDocumentTopic;
  capability: CmsCapability;
  marketCode: string;
  /** Shared operations must name the source and every affected destination. */
  scope?: CmsCapabilityScope;
  sourceMarketCode?: string;
  destinationMarketCodes?: readonly string[];
};

const topicSet = new Set<string>(cmsDocumentTopics);
const capabilitySet = new Set<string>(cmsCapabilities);

export function isCmsDocumentTopic(value: string): value is CmsDocumentTopic {
  return topicSet.has(value);
}

export function isCmsCapability(value: string): value is CmsCapability {
  return capabilitySet.has(value);
}

/**
 * Roles are a compatibility projection only. It deliberately preserves the
 * previous editor/reviewer and publisher/release behavior until a central
 * matrix is explicitly configured for that account.
 */
export function legacyCapabilitiesForRole(role: CmsRole): readonly CmsCapability[] {
  if (role === "administrator") return cmsCapabilities;
  if (role === "publisher") return cmsCapabilities;
  if (role === "editor") return ["view", "edit", "review"];
  return ["view"];
}

export function capabilityPrerequisites(capability: CmsCapability): readonly CmsCapability[] {
  if (capability === "edit" || capability === "review") return ["view"];
  if (capability === "publish") return ["view", "review"];
  return [];
}

function grantKey(grant: CapabilityGrant): string {
  return `${grant.topic}\u0000${grant.capability}\u0000${grant.scope}\u0000${grant.marketCode}`;
}

/**
 * A matrix may grant review without edit, but no privileged right without
 * view and no release without review. Invalid capability writes are rejected
 * before replacing any current grants.
 */
export function capabilityGrantPrerequisiteErrors(grants: readonly CapabilityGrant[]): string[] {
  const keys = new Set(grants.map(grantKey));
  const errors = new Set<string>();
  for (const grant of grants) {
    for (const prerequisite of capabilityPrerequisites(grant.capability)) {
      const prerequisiteKey = grantKey({ ...grant, capability: prerequisite });
      if (!keys.has(prerequisiteKey)) {
        errors.add(
          `${grant.topic}/${grant.marketCode}/${grant.scope}: ${grant.capability} requires ${prerequisite}.`,
        );
      }
    }
  }
  return [...errors];
}

export function canAccessExplicitGrant(
  grants: readonly CapabilityGrant[],
  request: ContentAuthorityRequest,
): boolean {
  const scope = request.scope ?? "regional";
  const sourceMarket = request.sourceMarketCode ?? request.marketCode;
  const includes = (capability: CmsCapability, grantScope: CmsCapabilityScope, marketCode: string) =>
    grants.some((grant) =>
      grant.capability === capability &&
      grant.topic === request.topic &&
      grant.scope === grantScope &&
      grant.marketCode === marketCode,
    );

  if (scope === "regional") return includes(request.capability, "regional", request.marketCode);

  // A shared source is intentionally not a global right. It needs a dedicated
  // shared grant for its source plus the same capability at every affected
  // regional destination, so a local checkbox cannot alter a fan-out source.
  const destinations = [...new Set(request.destinationMarketCodes ?? [])];
  return includes(request.capability, "shared", sourceMarket) &&
    destinations.length > 0 &&
    destinations.every((marketCode) => includes(request.capability, "regional", marketCode));
}

export function canAccessLegacyContent(
  subject: CapabilitySubject,
  request: ContentAuthorityRequest,
): boolean {
  if (!legacyCapabilitiesForRole(subject.role).includes(request.capability)) return false;
  if (subject.role === "administrator") return true;
  if ((request.scope ?? "regional") === "regional") {
    return subject.marketCodes.includes(request.marketCode);
  }
  const sourceMarket = request.sourceMarketCode ?? request.marketCode;
  const affected = [sourceMarket, ...(request.destinationMarketCodes ?? [])];
  return affected.length > 1 && affected.every((marketCode) => subject.marketCodes.includes(marketCode));
}

export async function capabilityGrantsForUser(userId: string): Promise<CapabilityGrant[]> {
  let result;
  try {
    result = await pool.query(
      `SELECT topic,capability,scope,market_code
         FROM cms_user_capability_grants
        WHERE user_id=$1
        ORDER BY topic,capability,scope,market_code`,
      [userId],
    );
  } catch (error: any) {
    // Additive rolling-deploy compatibility: without the table there cannot
    // be an explicit grant, so callers use the conservative legacy path.
    if (error?.code === "42P01") return [];
    throw error;
  }
  return result.rows
    .filter((row) => isCmsDocumentTopic(row.topic) && isCmsCapability(row.capability) &&
      (row.scope === "regional" || row.scope === "shared"))
    .map((row) => ({
      topic: row.topic as CmsDocumentTopic,
      capability: row.capability as CmsCapability,
      scope: row.scope as CmsCapabilityScope,
      marketCode: row.market_code,
    }));
}

/**
 * Matrix mode is a durable state, not a property derived from the number of
 * grant rows. A configured empty matrix is an intentional deny-all policy.
 */
export async function capabilityMatrixConfiguredForUser(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      "SELECT 1 FROM cms_user_capability_configurations WHERE user_id=$1 LIMIT 1",
      [userId],
    );
    return Boolean(result.rowCount);
  } catch (error: any) {
    // The sentinel is additive after grants. Before its migration is visible,
    // existing non-empty grants retain their original explicit behavior while
    // an empty grant set is necessarily legacy-compatible.
    if (error?.code === "42P01") {
      return (await capabilityGrantsForUser(userId)).length > 0;
    }
    throw error;
  }
}

async function legacyAdministratorMarkets(userId: string): Promise<string[]> {
  try {
    const result = await pool.query(
      `SELECT market_codes FROM cms_legacy_administrator_market_snapshots
        WHERE user_id=$1`,
      [userId],
    );
    // A missing snapshot is fail-closed.  It must be created by 0040 rather
    // than turning a pre-migration administrator into permanent global access.
    return Array.isArray(result.rows[0]?.market_codes) ? result.rows[0].market_codes : [];
  } catch (error: any) {
    if (error?.code === "42P01") return [];
    throw error;
  }
}

/**
 * A saved matrix configuration makes the account explicit-grant-only,
 * including a deliberately empty deny-all matrix. This prevents a role change
 * or a newly enabled market from silently broadening authority.
 */
export async function canAccessContent(
  subject: CapabilitySubject,
  request: ContentAuthorityRequest,
): Promise<boolean> {
  if (!subject.id) return canAccessLegacyContent(subject, request);
  const configured = await capabilityMatrixConfiguredForUser(subject.id);
  const grants = await capabilityGrantsForUser(subject.id);
  return configured
    ? canAccessExplicitGrant(grants, request)
    : subject.role === "administrator"
      ? canAccessLegacyContent(
        { ...subject, role: "publisher", marketCodes: await legacyAdministratorMarkets(subject.id) },
        request,
      )
      : canAccessLegacyContent(subject, request);
}

/**
 * Used only for unbound draft assets, before there is a document reference to
 * evaluate. Bound records must always use `canAccessContent` with their exact
 * topic and geography instead. This prevents the media library from becoming
 * a cross-topic authority shortcut.
 */
export async function canAccessAnyContentCapability(
  subject: CapabilitySubject,
  capability: CmsCapability,
): Promise<boolean> {
  if (!subject.id) {
    return legacyCapabilitiesForRole(subject.role).includes(capability) &&
      subject.marketCodes.length > 0;
  }
  const [configured, grants] = await Promise.all([
    capabilityMatrixConfiguredForUser(subject.id),
    capabilityGrantsForUser(subject.id),
  ]);
  if (configured) return grants.some((grant) => grant.capability === capability);
  const markets = subject.role === "administrator"
    ? await legacyAdministratorMarkets(subject.id)
    : subject.marketCodes;
  return legacyCapabilitiesForRole(subject.role).includes(capability) &&
    markets.length > 0;
}

export function capabilityProjection(
  subject: CapabilitySubject,
  grants: readonly CapabilityGrant[],
  markets: readonly string[],
  configured = grants.length > 0,
) {
  const explicit = configured;
  return {
    mode: explicit ? "explicit" : subject.role === "administrator" ? "administrator" : "legacy",
    explicit,
    capabilities: cmsCapabilities.map((capability) => ({
      capability,
      regional: cmsDocumentTopics.flatMap((topic) => markets.map((marketCode) => ({
        topic,
        marketCode,
        allowed: explicit
          ? canAccessExplicitGrant(grants, { topic, capability, marketCode })
          : canAccessLegacyContent(subject, { topic, capability, marketCode }),
      }))),
    })),
  };
}
