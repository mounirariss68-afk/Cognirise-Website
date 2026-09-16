export type ContentTopic =
  | "person"
  | "partner"
  | "platform"
  | "publication"
  | "case-study"
  | "industry"
  | "framework"
  | "office"
  | "landing-page"
  | "site-configuration";

export type ContentCapability = "view" | "edit" | "review" | "publish";
export type ContentScope = "regional" | "shared";

export type ContentGrant = {
  topic: ContentTopic;
  capability: ContentCapability;
  scope: ContentScope;
  marketCode: string;
};

export type ContentUser = {
  role?: string;
  marketCodes?: readonly string[];
  legacyAdministratorMarketCodes?: readonly string[];
  capabilityMatrixConfigured?: boolean;
  capabilityGrants?: readonly ContentGrant[];
};

function hasConfiguredMatrix(user: ContentUser | null | undefined): boolean {
  return Boolean(user?.capabilityMatrixConfigured || user?.capabilityGrants?.length);
}

/**
 * Before the capability configuration sentinel existed, a non-empty grants
 * projection still meant explicit mode. Only that compatibility case may
 * project the current assignment list for a legacy administrator. Once the
 * server provides a frozen snapshot, it is the only geography used here.
 */
export function legacyAdministratorMarkets(user: ContentUser | null | undefined): readonly string[] {
  if (!user || user.role !== "administrator") return [];
  if (hasConfiguredMatrix(user)) return [];
  return user.legacyAdministratorMarketCodes
    ?? (user.capabilityMatrixConfigured === undefined && user.capabilityGrants === undefined
      ? user.marketCodes ?? []
      : []);
}

function roleAllows(user: ContentUser, capability: ContentCapability): boolean {
  if (user.role === "administrator" || user.role === "publisher") return true;
  if (user.role === "editor") return capability === "view" || capability === "edit" || capability === "review";
  return capability === "view";
}

export function canAccessContent(
  user: ContentUser | null | undefined,
  request: {
    topic: ContentTopic;
    capability: ContentCapability;
    marketCode: string;
    scope?: ContentScope;
    sourceMarketCode?: string;
    destinationMarketCodes?: readonly string[];
  },
): boolean {
  if (!user) return false;
  const scope = request.scope ?? "regional";
  const source = request.sourceMarketCode ?? request.marketCode;
  const destinations = [...new Set(request.destinationMarketCodes ?? [])];
  if (hasConfiguredMatrix(user)) {
    const grant = (capability: ContentCapability, grantScope: ContentScope, marketCode: string) =>
      (user.capabilityGrants ?? []).some((candidate) =>
        candidate.topic === request.topic
        && candidate.capability === capability
        && candidate.scope === grantScope
        && candidate.marketCode === marketCode,
      );
    if (scope === "regional") return grant(request.capability, "regional", request.marketCode);
    return Boolean(
      grant(request.capability, "shared", source)
      && destinations.length > 0
      && destinations.every((market) => grant(request.capability, "regional", market)),
    );
  }
  if (!roleAllows(user, request.capability)) return false;
  const markets = user.role === "administrator"
    ? legacyAdministratorMarkets(user)
    : user.marketCodes ?? [];
  if (scope === "regional") return markets.includes(request.marketCode);
  return destinations.length > 0
    && [source, ...destinations].every((market) => markets.includes(market));
}

export function canAccessAnyContentCapability(
  user: ContentUser | null | undefined,
  capability: ContentCapability,
): boolean {
  if (!user) return false;
  if (hasConfiguredMatrix(user)) {
    return (user.capabilityGrants ?? []).some((grant) => grant.capability === capability);
  }
  if (!roleAllows(user, capability)) return false;
  return (user.role === "administrator" ? legacyAdministratorMarkets(user) : user.marketCodes ?? []).length > 0;
}

export function marketsForContentCapability(
  user: ContentUser | null | undefined,
  topic: ContentTopic,
  capability: ContentCapability,
  markets: readonly string[],
): string[] {
  return markets.filter((market) => canAccessContent(user, {
    topic,
    capability,
    marketCode: market,
  }));
}

export function canAccessAnyTopic(
  user: ContentUser | null | undefined,
  topic: ContentTopic,
  capability: ContentCapability = "view",
  markets?: readonly string[],
): boolean {
  const candidates = markets
    ?? (hasConfiguredMatrix(user)
      ? [...new Set((user?.capabilityGrants ?? [])
        .filter((grant) => grant.topic === topic && grant.capability === capability)
        .map((grant) => grant.marketCode))]
      : (user?.role === "administrator" ? legacyAdministratorMarkets(user) : user?.marketCodes ?? []));
  return candidates.some((market) => canAccessContent(user, {
    topic,
    capability,
    marketCode: market,
  }));
}