import { EDUCATION_SAUDI_EVIDENCE } from "./education-saudi-evidence.js";

const EDUCATION_MARKETS = new Set(["uae", "ksa", "turkiye", "europe"]);
const UAE_LEAK_PATTERN = /\bUAE\b|United Arab Emirates|\bNOVA\b|(?:^|[./])(?:ai|www\.moe)\.gov\.ae(?:[/:]|$)/i;
const SAUDI_LEAK_PATTERN = /\bSaudi(?: Arabia| Arabian)?\b|\bSDAIA\b|https?:\/\/[^"\s]*\.gov\.sa\b/i;
const NEUTRAL_REGIONAL_DIRECTION =
  "Responsible adoption depends on educational purpose, educator capability, safeguarding, trusted infrastructure and evidence—not technology adoption for its own sake.";
const NEUTRAL_FIFTH_CONVICTION = {
  title: "Make responsible adoption an institutional capability",
  body: "Connect educational purpose, educator capability, safeguarding, trusted infrastructure and evaluation so useful practices can scale with accountable human ownership.",
};

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function educationContent(payload: unknown) {
  if (!isObject(payload) || !isObject(payload.content)) return false;
  if (payload.slug !== "education" && payload.content.name !== "Education") return false;
  return payload.content;
}

function bankingContent(payload: unknown) {
  if (!isObject(payload) || !isObject(payload.content)) return false;
  if (payload.slug !== "financial-services" && payload.content.name !== "Financial Services") return false;
  const pov = payload.content.bankingPov;
  return isObject(pov) && typeof pov.market === "string" ? { content: payload.content, pov } : false;
}

function publicSectorContent(payload: unknown) {
  if (!isObject(payload) || !isObject(payload.content)) return false;
  if (payload.slug !== "public-sector" && payload.content.name !== "Public Sector") return false;
  const pov = payload.content.publicSectorNative ?? payload.content.publicSectorPov;
  return isObject(pov) && typeof pov.market === "string" ? { content: payload.content, pov } : false;
}

function isEducationV2Payload(payload: unknown) {
  const content = educationContent(payload);
  if (!content) return false;
  const pov = content.educationPov;
  return isObject(pov)
    && pov.version === 2
    && typeof pov.introduction === "string"
    && typeof pov.strategicShift === "string"
    && typeof pov.patternQuote === "string"
    && typeof pov.globalDirection === "string"
    && Array.isArray(pov.applications);
}

function projectValue(value: unknown, market: string): unknown {
  if (Array.isArray(value)) {
    return value
      .filter((item) => {
        if (!isObject(item) || typeof item.market !== "string") return true;
        return item.market === market;
      })
      .map((item) => projectValue(item, market));
  }
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== "market")
      .map(([key, item]) => [key, projectValue(item, market)]),
  );
}

function containsForeignRegionalContent(value: unknown, requestedMarket: string) {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  return (requestedMarket !== "uae" && UAE_LEAK_PATTERN.test(serialized))
    || (requestedMarket !== "ksa" && SAUDI_LEAK_PATTERN.test(serialized));
}

/**
 * Projects a complete Education v2 snapshot for the requested market. Market
 * markers are editorial selectors and are never exposed publicly. Legacy
 * Education revisions and every other content kind pass through unchanged.
 */
function projectLegacyEducation<T>(payload: T, requestedMarket: string): T {
  const projected = JSON.parse(JSON.stringify(payload)) as {
    content?: JsonObject;
    markets?: unknown;
  };
  projected.markets = [requestedMarket];
  const content = projected.content;
  if (!content) return projected as T;
  if (
    typeof content.gcc !== "string"
    || containsForeignRegionalContent(content.gcc, requestedMarket)
  ) {
    content.gcc = NEUTRAL_REGIONAL_DIRECTION;
  }
  if (Array.isArray(content.sources)) {
    content.sources = content.sources.filter((source) =>
      !containsForeignRegionalContent(source, requestedMarket)
    );
  }
  const pov = isObject(content.educationPov) ? content.educationPov : undefined;
  if (pov) {
    if (Array.isArray(pov.convictions)) {
      const originalConvictionCount = pov.convictions.length;
      const convictions = pov.convictions.filter((item) =>
        !containsForeignRegionalContent(item, requestedMarket)
      );
      pov.convictions = convictions.length < 5
        && (requestedMarket !== "uae" || convictions.length !== originalConvictionCount)
        ? [...convictions, { ...NEUTRAL_FIFTH_CONVICTION }]
        : convictions;
    }
    if (Array.isArray(pov.signals)) {
      pov.signals = pov.signals.filter((item) =>
        !containsForeignRegionalContent(item, requestedMarket)
      );
    }
    if (Array.isArray(pov.valueDomains)) {
      pov.valueDomains = pov.valueDomains.map((domain) => {
        if (!isObject(domain) || !Array.isArray(domain.examples)) return domain;
        const examples = domain.examples.filter((example) =>
          !containsForeignRegionalContent(example, requestedMarket)
        );
        return {
          ...domain,
          examples: examples.length ? examples : [String(domain.body ?? "")],
        };
      });
    }
  }
  return projected as T;
}

function assertNoForeignRegionalLeak(payload: unknown, requestedMarket: string) {
  if (containsForeignRegionalContent(payload, requestedMarket)) {
    throw new Error(`Education projection retained foreign regional content for ${requestedMarket}.`);
  }
}

function addSaudiEvidence(content: JsonObject, pov: JsonObject) {
  const evidence = projectValue(EDUCATION_SAUDI_EVIDENCE, "ksa") as {
    sources: Array<{ url: string } & JsonObject>;
    conviction: JsonObject;
    signal: JsonObject;
    application: JsonObject;
  };
  if (Array.isArray(content.sources)) {
    const existingUrls = new Set(content.sources.flatMap((source) =>
      isObject(source) && typeof source.url === "string" ? [source.url] : []
    ));
    content.sources = [
      ...content.sources,
      ...evidence.sources.filter((source) => !existingUrls.has(source.url)),
    ];
  }
  if (
    Array.isArray(pov.convictions)
    && !pov.convictions.some((item) =>
      isObject(item) && item.title === evidence.conviction.title
    )
  ) {
    pov.convictions = [...pov.convictions, evidence.conviction];
  }
  if (
    Array.isArray(pov.signals)
    && !pov.signals.some((item) =>
      isObject(item) && item.institution === evidence.signal.institution
    )
  ) {
    pov.signals = [...pov.signals, evidence.signal];
  }
  if (Array.isArray(pov.applications) && pov.applications.length) {
    const applicationGroups = pov.applications.map((group) =>
      isObject(group) ? { ...group } : group
    );
    const higherEducationGroup = applicationGroups.find((group) =>
      isObject(group) && group.title === "Higher education and research"
    );
    if (isObject(higherEducationGroup) && Array.isArray(higherEducationGroup.items)) {
      const hasApplication = higherEducationGroup.items.some((item) =>
        isObject(item) && item.title === evidence.application.title
      );
      if (!hasApplication) {
        higherEducationGroup.items = [...higherEducationGroup.items, evidence.application];
      }
    } else if (applicationGroups.length < 6) {
      applicationGroups.push({
        title: "Saudi Arabia evidence",
        items: [evidence.application],
      });
    }
    pov.applications = applicationGroups;
  }
}

export function projectIndustrySnapshotForMarket<T>(
  payload: T,
  requestedMarket: string,
  editionMarket?: string,
): T {
  if (!EDUCATION_MARKETS.has(requestedMarket)) return payload;
  const payloadMarkets = isObject(payload) && Array.isArray(payload.markets)
    ? payload.markets.filter((market): market is string => typeof market === "string")
    : [];
  const sourceEditionMarket = editionMarket
    ?? (payloadMarkets.length === 1 ? payloadMarkets[0] : undefined);
  const publicSector = publicSectorContent(payload);
  if (publicSector) {
    if (
      publicSector.pov.market !== requestedMarket
      || (sourceEditionMarket && sourceEditionMarket !== requestedMarket)
      || (payloadMarkets.length > 0 && (
        payloadMarkets.length !== 1
        || payloadMarkets[0] !== publicSector.pov.market
      ))
    ) {
      throw new Error(
        `Public Sector delivery cannot fall back from ${publicSector.pov.market} to ${requestedMarket}; publish an explicitly reviewed exact market edition.`,
      );
    }
    const projected = JSON.parse(JSON.stringify(payload)) as { markets?: unknown };
    projected.markets = [requestedMarket];
    return projected as T;
  }
  const banking = bankingContent(payload);
  if (banking) {
    if (banking.pov.market !== requestedMarket || (sourceEditionMarket && sourceEditionMarket !== requestedMarket)) {
      throw new Error(`Banking delivery cannot fall back from ${banking.pov.market} to ${requestedMarket}; publish an explicitly reviewed market edition.`);
    }
    const projected = JSON.parse(JSON.stringify(payload)) as { markets?: unknown };
    projected.markets = [requestedMarket];
    if (containsForeignRegionalContent(projected, requestedMarket)) {
      throw new Error(`Banking projection retained foreign regional content for ${requestedMarket}.`);
    }
    return projected as T;
  }
  if (!educationContent(payload)) return payload;
  if (!isEducationV2Payload(payload)) {
    const legacy = projectLegacyEducation(payload, requestedMarket);
    assertNoForeignRegionalLeak(legacy, requestedMarket);
    return legacy;
  }
  const projected = projectValue(payload, requestedMarket) as {
    content?: JsonObject;
    markets?: unknown;
  };
  projected.markets = [requestedMarket];
  const content = projected.content;
  const pov = content && isObject(content.educationPov) ? content.educationPov : undefined;
  if (
    content
    && pov
    && requestedMarket === "ksa"
    && sourceEditionMarket !== requestedMarket
    && Array.isArray(pov.convictions)
    && pov.convictions.length < 5
    && !SAUDI_LEAK_PATTERN.test(JSON.stringify(projected))
  ) {
    addSaudiEvidence(content, pov);
  }
  if (pov && Array.isArray(pov.convictions) && pov.convictions.length < 5) {
    pov.convictions = [...pov.convictions, { ...NEUTRAL_FIFTH_CONVICTION }];
  }
  if (
    content
    && (typeof content.gcc !== "string"
      || containsForeignRegionalContent(content.gcc, requestedMarket))
  ) {
    content.gcc = requestedMarket === "ksa"
      ? EDUCATION_SAUDI_EVIDENCE.gcc
      : NEUTRAL_REGIONAL_DIRECTION;
  }
  assertNoForeignRegionalLeak(projected, requestedMarket);
  return projected as T;
}