import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import { and, desc, eq, sql } from "drizzle-orm";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  canonicalResultDigest,
  resultDigest,
} from "./migration.js";
import {
  emitJson,
  outputPath,
} from "./common.js";

/**
 * This is deliberately a single-person recovery.  It is not a second people
 * importer and it must not be widened to the entire roster without a new,
 * versioned authority decision.
 *
 * The source is the last approved public About page that contained the full
 * profile treatment before the compiled roster was removed:
 *   2ea600a573849c954374ebcd3b0aee3df72023f8
 *   artifacts/cognirise-website/src/pages/AboutPeople.tsx:14-35
 *
 * Keep the source text here rather than reading a mutable working-tree file.
 * That makes the operation reproducible after the fallback has been removed.
 */
export const HISTORICAL_MOUNIR_SOURCE = Object.freeze({
  commit: "2ea600a573849c954374ebcd3b0aee3df72023f8",
  file: "artifacts/cognirise-website/src/pages/AboutPeople.tsx",
  lines: "14-35",
});

export const MOUNIR_EXTERNAL_ID = "person:8a0e78e95b87db8e0acd";
export const MOUNIR_SLUG = "mounir-ariss";
export const MOUNIR_MARKET = "uae";
export const MOUNIR_LOCALE = "en";

export const HISTORICAL_MOUNIR_RECOVERY = Object.freeze({
  biography:
    "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage. A career built on framing the decision architecture that makes enterprise-scale change possible, now focused entirely on the agentic enterprise.",
  contribution:
    "The conviction that AI is an operating discipline, not a science experiment — grounded in thirty years of framing consequential transformation for the region's largest enterprises.",
});

/**
 * Complete contribution authority from the historical roster.  This is used
 * for read-only comparison of every historical person, not as permission to
 * overwrite every current person.  Only Mounir's scoped recovery below may
 * create a revision; non-empty current values remain newer/editorial values.
 */
export const HISTORICAL_PEOPLE_ROSTER = Object.freeze([
  {
    slug: "mounir-ariss",
    name: "Mounir Ariss",
    role: "Founding Partner",
    biography:
      "Three decades helping enterprises across the region and beyond turn technology shifts into operating advantage. A career built on framing the decision architecture that makes enterprise-scale change possible, now focused entirely on the agentic enterprise.",
    contribution:
      "The conviction that AI is an operating discipline, not a science experiment — grounded in thirty years of framing consequential transformation for the region's largest enterprises.",
  },
  {
    slug: "bulent-egrilmez",
    name: "Bülent Eğrilmez",
    role: "CTO & Co-Founder",
    biography:
      "A track record of engineering production-grade AI systems and multi-agent architectures that actually ship. Technical leadership bridging deep LLM/RAG capability, enterprise transformation, and the rigorous product delivery required to run consequential work.",
    contribution:
      "The engineering truth. The ability to architect AI systems that survive contact with real enterprise complexity, ensuring our platforms execute with the discipline of traditional enterprise software.",
  },
  {
    slug: "hisham-nofal-phd",
    name: "Hisham Nofal, PhD",
    role: "Education Sector Lead",
    biography:
      "More than 20 years across education consulting, sector leadership, and academia, focused on GCC and MENA systems. Former Education Sector Lead at KPMG Saudi Arabia, bringing deep domain expertise in national-scale learning transformation. Holds a PhD from Texas Tech.",
    contribution:
      "The domain authority to redesign national education systems for an AI-native future, grounded in the realities of how ministries, universities, and regulators actually operate in the region.",
  },
  {
    slug: "alexis-lecanuet",
    name: "Alexis Lecanuet",
    role: "Advisory Board Member",
    biography:
      "A 24-year Accenture career culminating in leadership of the firm's Middle East business — strategy execution, client portfolio leadership and regional operations. Previously built and expanded Accenture's products portfolio across the Middle East and Türkiye, with deep roots in consumer, retail and large-scale digital transformation.",
    contribution:
      "The incumbent's playbook, from the inside: how global consultancies win, price and scale in this region — so our senior-led, platform-powered model is sharpened precisely where the traditional model is weakest.",
  },
  {
    slug: "rami-aslan",
    name: "Rami Aslan",
    role: "Advisory Board Member",
    biography:
      "More than 25 years across North America, Europe, the Middle East and Africa. CEO of Türk Telekom (2013–2017) — Türkiye's largest telecom operator — after leading Oger Telecom as CEO and executive board member. Earlier, head of M&A and corporate finance at the Oger Group, following banking roles at Citigroup and TD. McGill BCom and MBA.",
    contribution:
      "The operator's seat: what transformation looks like when you're accountable for 35,000 people and a nation's network — plus an investor's discipline on our economics and a telecom depth that anchors one of our core industries.",
  },
  {
    slug: "fadi-mattar",
    name: "Fadi Mattar",
    role: "Advisory Board Member",
    biography:
      "A senior corporate-affairs and country leader at Dow, responsible for public and government affairs across India, the Middle East, Africa and Türkiye, and for Dow's business in Kuwait and the Levant. His decade spans public affairs, government relations and country leadership; bridging energy & petrochemicals, financial services, and the corridors where business meets government.",
    contribution:
      "The stakeholder map: how large industrials and governments actually make decisions — sharpening our energy & resources proposition, our public-sector posture, and how the Cognirise story lands with boards and ministries.",
  },
] as const);

/**
 * These values are the compiled fallback that was imported into the current
 * inventory after the historical profile treatment disappeared.  They are
 * replacement-safe only when an exact match is found.  Any other non-empty
 * value is a newer/editorial value and is preserved as a conflict.
 */
export const KNOWN_COMPILED_MOUNIR_VALUES = Object.freeze({
  contribution:
    "Strategic judgment, practical transformation leadership and a focus on turning consequential AI decisions into operating results.",
});

export const PEOPLE_RECOVERY_KEY =
  `cms-people-history-recovery-v1:${MOUNIR_EXTERNAL_ID}`;
export const INVENTORY_IMPORT_KEY = `cms-inventory-v2:${MOUNIR_EXTERNAL_ID}`;
// Compatibility is intentionally limited to the one receipt digest created
// before source access-date metadata was removed.  No coordinate-only digest
// mismatch is accepted.
export const LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST =
  "5df6b3295c2b18697e882e5a660f673a42b6b1c79b89608a58d33970cdd2dfb8";

type JsonObject = Record<string, unknown>;

export type RecoveryConflict = {
  field: "content.biography" | "content.contribution" | "marketAvailability";
  actual: unknown;
  expected: unknown;
  reason: string;
};

export type HistoricalMergePlan = {
  decision: "apply" | "apply-with-conflicts" | "already-current" | "conflict" | "invalid";
  payload: JsonObject;
  changedFields: string[];
  conflicts: RecoveryConflict[];
};

export type HistoricalRosterComparison = {
  source: {
    commit: string;
    file: string;
    lines: string;
  };
  historical: Array<{
    slug: string;
    name: string;
    currentDocumentId: string | null;
    currentEditionId: string | null;
    currentRevisionId: string | null;
    currentRevisionNumber: number | null;
    currentWorkflowState: string | null;
    publicationState: string | null;
    availabilityDecision: string | null;
    visibility: "published-show" | "published-hidden" | "draft-show" | "draft-hidden" | "unavailable";
    contributionStatus: "missing-profile" | "missing-field" | "exact" | "newer";
    biographyStatus: "missing-profile" | "missing-field" | "exact" | "newer";
    newerFields: string[];
    safeRecoveryFields: string[];
    recoveryDecision:
      | "recovered-mounir"
      | "safe-mounir-target"
      | "already-current"
      | "preserved-newer"
      | "missing-profile"
      | "not-authorized";
  }>;
  currentOnly: Array<{
    slug: string;
    name: string;
    documentId: string;
    editionId: string | null;
    publicationState: string | null;
    availabilityDecision: string | null;
    visibility: "published-show" | "published-hidden" | "draft-show" | "draft-hidden" | "unavailable";
    status: "hidden" | "unpublished" | "not-in-historical-roster";
  }>;
  summary: {
    historicalCount: number;
    matchedCount: number;
    missingProfileCount: number;
    missingFieldCount: number;
    exactContributionCount: number;
    newerContributionCount: number;
    currentOnlyCount: number;
    hiddenCurrentOnlyCount: number;
    safeRecoveryCount: number;
  };
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function clone<T>(value: T): T {
  return structuredClone(value);
}

/**
 * Merge only the proven omitted fields.  This function is intentionally
 * field-level: a newer biography, title, visibility, order, source, identity
 * asset, or any other editorial field is never replaced by this recovery.
 */
export function planHistoricalMounirMerge(input: unknown): HistoricalMergePlan {
  if (!isObject(input) || !isObject(input.content)) {
    return {
      decision: "invalid",
      payload: isObject(input) ? clone(input) : {},
      changedFields: [],
      conflicts: [{
        field: "content.contribution",
        actual: input,
        expected: HISTORICAL_MOUNIR_RECOVERY.contribution,
        reason: "The stored revision is not a CMS snapshot with an object content field.",
      }],
    };
  }

  const payload = clone(input);
  const content = payload.content as JsonObject;
  const changedFields: string[] = [];
  const conflicts: RecoveryConflict[] = [];

  const actualContribution = content.contribution;
  if (actualContribution === HISTORICAL_MOUNIR_RECOVERY.contribution) {
    // Already reconciled.
  } else if (
    typeof actualContribution !== "string"
    || !actualContribution.trim()
    || actualContribution === KNOWN_COMPILED_MOUNIR_VALUES.contribution
  ) {
    content.contribution = HISTORICAL_MOUNIR_RECOVERY.contribution;
    changedFields.push("content.contribution");
  } else {
    conflicts.push({
      field: "content.contribution",
      actual: actualContribution,
      expected: HISTORICAL_MOUNIR_RECOVERY.contribution,
      reason: "A non-empty value differs from both the historical authority and the known compiled fallback.",
    });
  }

  const actualBiography = content.biography;
  if (actualBiography === HISTORICAL_MOUNIR_RECOVERY.biography) {
    // Already reconciled.
  } else if (
    typeof actualBiography === "undefined"
    || actualBiography === null
    || (typeof actualBiography === "string" && !actualBiography.trim())
  ) {
    content.biography = HISTORICAL_MOUNIR_RECOVERY.biography;
    changedFields.push("content.biography");
  } else {
    conflicts.push({
      field: "content.biography",
      actual: actualBiography,
      expected: HISTORICAL_MOUNIR_RECOVERY.biography,
      reason: "Existing biography copy is non-empty and is preserved as newer editorial content.",
    });
  }

  return {
    decision: conflicts.length
      ? changedFields.length
        ? "apply-with-conflicts"
        : "conflict"
      : changedFields.length
        ? "apply"
        : "already-current",
    payload,
    changedFields,
    conflicts,
  };
}

export type PeopleRecoveryReport = {
  schemaVersion: 1;
  operation: string;
  mode: "read-only" | "apply";
  target: { externalId: string; slug: string; market: string; locale: string };
  source: typeof HISTORICAL_MOUNIR_SOURCE;
  authority: {
    fields: string[];
    historicalDigest: string;
    knownCompiledValuesDigest: string;
  };
  state: {
    documentId: string | null;
    editionId: string | null;
    latestRevisionId: string | null;
    latestRevisionNumber: number | null;
    latestWorkflowState: string | null;
    publicationState: string | null;
    publishedRevisionId: string | null;
    availabilityDecision: string | null;
  };
  decision: HistoricalMergePlan["decision"] | "missing";
  changedFields: string[];
  conflicts: RecoveryConflict[];
  validationErrors: string[];
  pinnedMediaReferences: number;
  receipt: { recovery: string | null };
  historicalRoster: HistoricalRosterComparison;
};

function emptyHistoricalRosterComparison(): HistoricalRosterComparison {
  return {
    source: {
      commit: HISTORICAL_MOUNIR_SOURCE.commit,
      file: HISTORICAL_MOUNIR_SOURCE.file,
      lines: HISTORICAL_MOUNIR_SOURCE.lines,
    },
    historical: [],
    currentOnly: [],
    summary: {
      historicalCount: HISTORICAL_PEOPLE_ROSTER.length,
      matchedCount: 0,
      missingProfileCount: 0,
      missingFieldCount: 0,
      exactContributionCount: 0,
      newerContributionCount: 0,
      currentOnlyCount: 0,
      hiddenCurrentOnlyCount: 0,
      safeRecoveryCount: 0,
    },
  };
}

function emptyReport(mode: PeopleRecoveryReport["mode"]): PeopleRecoveryReport {
  return {
    schemaVersion: 1,
    operation: PEOPLE_RECOVERY_KEY,
    mode,
    target: {
      externalId: MOUNIR_EXTERNAL_ID,
      slug: MOUNIR_SLUG,
      market: MOUNIR_MARKET,
      locale: MOUNIR_LOCALE,
    },
    source: HISTORICAL_MOUNIR_SOURCE,
    authority: {
      fields: ["content.biography", "content.contribution"],
      historicalDigest: canonicalResultDigest(HISTORICAL_MOUNIR_RECOVERY),
      knownCompiledValuesDigest: canonicalResultDigest(KNOWN_COMPILED_MOUNIR_VALUES),
    },
    state: {
      documentId: null,
      editionId: null,
      latestRevisionId: null,
      latestRevisionNumber: null,
      latestWorkflowState: null,
      publicationState: null,
      publishedRevisionId: null,
      availabilityDecision: null,
    },
    decision: "missing",
    changedFields: [],
    conflicts: [],
    validationErrors: [],
    pinnedMediaReferences: 0,
    receipt: { recovery: null },
    historicalRoster: emptyHistoricalRosterComparison(),
  };
}

async function loadDatabase() {
  return import("@workspace/db");
}

type DatabaseBindings = Awaited<ReturnType<typeof loadDatabase>>;

async function readAvailability(
  source: any,
  database: DatabaseBindings,
  documentId: string,
) {
  const markets = await source.select({
    id: database.marketEditionsTable.id,
  }).from(database.marketEditionsTable).where(
    eq(database.marketEditionsTable.code, MOUNIR_MARKET),
  );
  if (markets.length > 1) {
    throw new Error(`Expected one market definition for ${MOUNIR_MARKET}.`);
  }
  const market = markets[0];
  if (!market) return { decision: null as string | null, digest: canonicalResultDigest([]) };
  const rows = await source.select({
    locale: database.cmsDocumentMarketAvailabilityTable.locale,
    publishedDecision: database.cmsDocumentMarketAvailabilityTable.publishedDecision,
    draftDecision: database.cmsDocumentMarketAvailabilityTable.draftDecision,
  }).from(database.cmsDocumentMarketAvailabilityTable).where(and(
    eq(database.cmsDocumentMarketAvailabilityTable.documentId, documentId),
    eq(database.cmsDocumentMarketAvailabilityTable.marketEditionId, market.id),
    eq(database.cmsDocumentMarketAvailabilityTable.locale, MOUNIR_LOCALE),
  ));
  return {
    decision: rows[0]?.publishedDecision ?? null,
    digest: canonicalResultDigest(rows),
  };
}

async function resolveInventoryDocument(source: any, database: DatabaseBindings) {
  const [receipt] = await source.select().from(database.cmsOperationReceiptsTable).where(
    eq(database.cmsOperationReceiptsTable.idempotencyKey, INVENTORY_IMPORT_KEY),
  );
  if (!receipt || receipt.operation !== "cms.inventory.import" || !receipt.subjectId) {
    throw new Error(`Immutable inventory receipt ${INVENTORY_IMPORT_KEY} is missing; refusing slug-based recovery.`);
  }
  const [document] = await source.select().from(database.cmsDocumentsTable).where(
    eq(database.cmsDocumentsTable.id, receipt.subjectId),
  );
  if (
    !document
    || document.kind !== "person"
    || document.canonicalSlug !== MOUNIR_SLUG
    || document.title !== "Mounir Ariss"
  ) {
    throw new Error("The immutable Mounir inventory receipt does not resolve to the expected person document.");
  }
  return { receipt, document };
}

async function findCurrentState(database: DatabaseBindings) {
  const { document } = await resolveInventoryDocument(database.db, database);

  const editions = await database.db.select().from(database.cmsMarketEditionsTable).where(and(
    eq(database.cmsMarketEditionsTable.documentId, document.id),
    eq(database.cmsMarketEditionsTable.market, MOUNIR_MARKET),
    eq(database.cmsMarketEditionsTable.locale, MOUNIR_LOCALE),
  ));
  if (editions.length > 1) {
    throw new Error(`Expected one ${MOUNIR_MARKET}/${MOUNIR_LOCALE} edition for ${MOUNIR_SLUG}.`);
  }
  const edition = editions[0];
  if (!edition) return { document, edition: null, latest: null, availability: null };
  const [latest] = await database.db.select().from(database.cmsRevisionsTable).where(
    eq(database.cmsRevisionsTable.editionId, edition.id),
  ).orderBy(
    desc(database.cmsRevisionsTable.revisionNumber),
    desc(database.cmsRevisionsTable.createdAt),
  ).limit(1);
  const availability = await readAvailability(database.db, database, document.id);
  return { document, edition, latest, availability };
}

async function findPersonInventory(database: DatabaseBindings) {
  const documents = await database.db.select().from(database.cmsDocumentsTable).where(
    eq(database.cmsDocumentsTable.kind, "person"),
  );
  const inventory = [];
  for (const document of documents) {
    const editions = await database.db.select().from(database.cmsMarketEditionsTable).where(and(
      eq(database.cmsMarketEditionsTable.documentId, document.id),
      eq(database.cmsMarketEditionsTable.market, MOUNIR_MARKET),
      eq(database.cmsMarketEditionsTable.locale, MOUNIR_LOCALE),
    ));
    if (editions.length > 1) {
      throw new Error(`Expected one ${MOUNIR_MARKET}/${MOUNIR_LOCALE} edition for document ${document.id}.`);
    }
    const edition = editions[0] ?? null;
    if (!edition) {
      inventory.push({ document, edition: null, latest: null, availability: null });
      continue;
    }
    const [latest] = await database.db.select().from(database.cmsRevisionsTable).where(
      eq(database.cmsRevisionsTable.editionId, edition.id),
    ).orderBy(
      desc(database.cmsRevisionsTable.revisionNumber),
      desc(database.cmsRevisionsTable.createdAt),
    ).limit(1);
    const availability = await readAvailability(database.db, database, document.id);
    inventory.push({
      document,
      edition,
      latest: latest ?? null,
      availability,
    });
  }
  return inventory;
}

function fillReportState(
  report: PeopleRecoveryReport,
  state: Awaited<ReturnType<typeof findCurrentState>>,
) {
  report.state.documentId = state.document ? String(state.document.id) : null;
  report.state.editionId = state.edition ? String(state.edition.id) : null;
  report.state.latestRevisionId = state.latest ? String(state.latest.id) : null;
  report.state.latestRevisionNumber = state.latest?.revisionNumber ?? null;
  report.state.latestWorkflowState = state.latest?.workflowState ?? null;
  report.state.publicationState = state.edition?.publicationState ?? null;
  report.state.publishedRevisionId = state.edition?.publishedRevisionId
    ? String(state.edition.publishedRevisionId)
    : null;
  report.state.availabilityDecision = state.availability?.decision ?? null;
}

type PersonVisibility = HistoricalRosterComparison["historical"][number]["visibility"];

function personVisibility(
  edition: { publicationState: string; publishedRevisionId: string | null } | null,
  availability: { decision: string | null } | null,
): PersonVisibility {
  if (!edition) return "unavailable";
  const hidden = availability?.decision === "off";
  const published = edition.publicationState === "published" && Boolean(edition.publishedRevisionId);
  if (published) return hidden ? "published-hidden" : "published-show";
  if (availability?.decision === "show") return hidden ? "draft-hidden" : "draft-show";
  return hidden ? "draft-hidden" : "unavailable";
}

function contentField(
  latest: { payload: unknown } | null,
  field: "biography" | "contribution",
) {
  if (!latest || !isObject(latest.payload) || !isObject(latest.payload.content)) return undefined;
  return (latest.payload.content as JsonObject)[field];
}

function fieldStatus(actual: unknown, historical: string) {
  if (typeof actual === "undefined" || actual === null || (typeof actual === "string" && !actual.trim())) {
    return "missing-field" as const;
  }
  return actual === historical ? "exact" as const : "newer" as const;
}

async function buildHistoricalRosterComparison(
  database: DatabaseBindings,
): Promise<HistoricalRosterComparison> {
  const inventory = await findPersonInventory(database);
  const entriesBySlug = new Map<string, typeof inventory>();
  for (const entry of inventory) {
    if (!entry.document.canonicalSlug) continue;
    const entries = entriesBySlug.get(entry.document.canonicalSlug) ?? [];
    entries.push(entry);
    entriesBySlug.set(entry.document.canonicalSlug, entries);
  }
  for (const [slug, entries] of entriesBySlug) {
    if (entries.length > 1) {
      throw new Error(`Historical people comparison found ${entries.length} CMS documents for slug ${slug}; refusing arbitrary roster matching.`);
    }
  }
  const bySlug = new Map(
    [...entriesBySlug].map(([slug, entries]) => [slug, entries[0]!]),
  );
  const [recoveryReceipt] = await database.db.select({
    operation: database.cmsOperationReceiptsTable.operation,
  }).from(database.cmsOperationReceiptsTable).where(
    eq(database.cmsOperationReceiptsTable.idempotencyKey, PEOPLE_RECOVERY_KEY),
  );
  const historical = HISTORICAL_PEOPLE_ROSTER.map((authority) => {
    const current = bySlug.get(authority.slug);
    const currentContribution = contentField(current?.latest ?? null, "contribution");
    const currentBiography = contentField(current?.latest ?? null, "biography");
    const contributionStatus = current
      ? fieldStatus(currentContribution, authority.contribution)
      : "missing-profile" as const;
    const biographyStatus = current
      ? fieldStatus(currentBiography, authority.biography)
      : "missing-profile" as const;
    const visibility = personVisibility(
      current?.edition
        ? {
          publicationState: current.edition.publicationState,
          publishedRevisionId: current.edition.publishedRevisionId,
        }
        : null,
      current?.availability ?? null,
    );
    const newerFields = [
      contributionStatus === "newer" ? "content.contribution" : null,
      biographyStatus === "newer" ? "content.biography" : null,
    ].filter((field): field is string => Boolean(field));
    const canRecoverMounir = authority.slug === MOUNIR_SLUG
      && contributionStatus === "missing-field"
      && current?.document.status === "active"
      && current.availability?.decision === "show";
    const safeRecoveryFields = canRecoverMounir ? ["content.contribution"] : [];
    let recoveryDecision: HistoricalRosterComparison["historical"][number]["recoveryDecision"];
    if (!current) {
      recoveryDecision = "missing-profile";
    } else if (
      authority.slug === MOUNIR_SLUG
      && contributionStatus === "exact"
      && recoveryReceipt?.operation === "cms.people.history-recovery.reconciled"
    ) {
      recoveryDecision = "recovered-mounir";
    } else if (newerFields.length) {
      recoveryDecision = "preserved-newer";
    } else if (safeRecoveryFields.length) {
      recoveryDecision = "safe-mounir-target";
    } else {
      recoveryDecision = "already-current";
    }
    return {
      slug: authority.slug,
      name: authority.name,
      currentDocumentId: current ? String(current.document.id) : null,
      currentEditionId: current?.edition ? String(current.edition.id) : null,
      currentRevisionId: current?.latest ? String(current.latest.id) : null,
      currentRevisionNumber: current?.latest?.revisionNumber ?? null,
      currentWorkflowState: current?.latest?.workflowState ?? null,
      publicationState: current?.edition?.publicationState ?? null,
      availabilityDecision: current?.availability?.decision ?? null,
      visibility,
      contributionStatus,
      biographyStatus,
      newerFields,
      safeRecoveryFields,
      recoveryDecision,
    };
  });
  const historicalSlugs = new Set<string>(HISTORICAL_PEOPLE_ROSTER.map((authority) => authority.slug));
  const currentOnly = inventory
    .filter((entry) => entry.document.canonicalSlug && !historicalSlugs.has(entry.document.canonicalSlug))
    .map((entry) => {
      const visibility = personVisibility(
        entry.edition
          ? {
            publicationState: entry.edition.publicationState,
            publishedRevisionId: entry.edition.publishedRevisionId,
          }
          : null,
        entry.availability,
      );
      return {
        slug: entry.document.canonicalSlug ?? String(entry.document.id),
        name: entry.document.title,
        documentId: String(entry.document.id),
        editionId: entry.edition ? String(entry.edition.id) : null,
        publicationState: entry.edition?.publicationState ?? null,
        availabilityDecision: entry.availability?.decision ?? null,
        visibility,
        status: (visibility === "published-hidden" || visibility === "draft-hidden")
          ? "hidden" as const
          : (visibility === "published-show"
            ? "not-in-historical-roster" as const
            : "unpublished" as const),
      };
    });
  return {
    source: {
      commit: HISTORICAL_MOUNIR_SOURCE.commit,
      file: HISTORICAL_MOUNIR_SOURCE.file,
      lines: HISTORICAL_MOUNIR_SOURCE.lines,
    },
    historical,
    currentOnly,
    summary: {
      historicalCount: historical.length,
      matchedCount: historical.filter((entry) => entry.currentDocumentId).length,
      missingProfileCount: historical.filter((entry) => entry.contributionStatus === "missing-profile").length,
      missingFieldCount: historical.filter((entry) => (
        entry.contributionStatus === "missing-field" || entry.biographyStatus === "missing-field"
      )).length,
      exactContributionCount: historical.filter((entry) => entry.contributionStatus === "exact").length,
      newerContributionCount: historical.filter((entry) => entry.contributionStatus === "newer").length,
      currentOnlyCount: currentOnly.length,
      hiddenCurrentOnlyCount: currentOnly.filter((entry) => entry.status === "hidden").length,
      safeRecoveryCount: historical.filter((entry) => entry.safeRecoveryFields.length > 0).length,
    },
  };
}

function requestDigest() {
  return createHash("sha256").update(JSON.stringify({
    operation: PEOPLE_RECOVERY_KEY,
    source: HISTORICAL_MOUNIR_SOURCE,
    target: {
      externalId: MOUNIR_EXTERNAL_ID,
      slug: MOUNIR_SLUG,
      market: MOUNIR_MARKET,
      locale: MOUNIR_LOCALE,
    },
    authority: HISTORICAL_MOUNIR_RECOVERY,
    fields: ["content.biography", "content.contribution"],
  })).digest("hex");
}

function acceptsHistoricalRecoveryReceipt(
  receipt: { operation: string; requestDigest: string; subjectId: string },
  auditMetadata: unknown,
  documentId: string,
) {
  if (receipt.subjectId !== documentId) return false;
  if (receipt.requestDigest === requestDigest()) return true;
  if (
    receipt.operation !== "cms.people.history-recovery.reconciled"
    || receipt.requestDigest !== LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST
    || !isObject(auditMetadata)
    || !isObject(auditMetadata.source)
  ) return false;
  return (
    auditMetadata.source.commit === HISTORICAL_MOUNIR_SOURCE.commit
    && auditMetadata.source.file === HISTORICAL_MOUNIR_SOURCE.file
    && auditMetadata.source.lines === HISTORICAL_MOUNIR_SOURCE.lines
  );
}

export function recoveryReceiptAuthorityStatus(
  receipt: { operation: string; subjectId: string; requestDigest: string },
  auditMetadata: unknown,
  documentId: string,
) {
  return acceptsHistoricalRecoveryReceipt(receipt, auditMetadata, documentId);
}

export type RecoveryLineageRow = {
  id: string;
  editionId: string;
  sourceRevisionId: string | null;
  payload: unknown;
};

export function validateRecoveryRevisionLineage(
  revisions: RecoveryLineageRow[],
  editionId: string,
  recoveredRevisionId: string,
  latestRevisionId: string,
) {
  const byId = new Map<string, RecoveryLineageRow>(
    revisions
      .filter((revision) => String(revision.editionId) === editionId)
      .map((revision) => [String(revision.id), revision]),
  );
  const errors: string[] = [];
  const recovered = byId.get(recoveredRevisionId);
  if (!recovered) {
    errors.push("The audit-owned recovery revision is not present on the exact Mounir UAE/en edition.");
  } else {
    const content = isObject(recovered.payload) && isObject(recovered.payload.content)
      ? recovered.payload.content
      : {};
    if (content.contribution !== HISTORICAL_MOUNIR_RECOVERY.contribution) {
      errors.push("The audit-owned recovery revision no longer contains the exact historical contribution.");
    }
  }
  let cursor = byId.get(latestRevisionId);
  if (!cursor) {
    errors.push("The current Mounir revision is not present on the exact UAE/en edition.");
  } else if (recovered) {
    const visited = new Set<string>();
    while (String(cursor.id) !== recoveredRevisionId) {
      const cursorId = String(cursor.id);
      const cursorContent = isObject(cursor.payload) && isObject(cursor.payload.content)
        ? cursor.payload.content
        : {};
      if (cursorContent.contribution !== HISTORICAL_MOUNIR_RECOVERY.contribution) {
        errors.push(`Revision ${cursorId} does not preserve the exact historical contribution.`);
      }
      if (visited.has(cursorId)) {
        errors.push("The current Mounir revision has a cyclic revision lineage.");
        break;
      }
      visited.add(cursorId);
      const parentId = cursor.sourceRevisionId ? String(cursor.sourceRevisionId) : null;
      if (!parentId) {
        errors.push("The current Mounir revision is not a descendant of the audit-owned recovery revision.");
        break;
      }
      const parent = byId.get(parentId);
      if (!parent) {
        errors.push("The current Mounir revision has a missing or cross-edition source revision.");
        break;
      }
      cursor = parent;
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

async function recoveryRevisionLineage(
  source: any,
  database: DatabaseBindings,
  editionId: string,
  recoveredRevisionId: string,
  latestRevisionId: string,
) {
  type SelectedRecoveryLineageRow = {
    id: string;
    editionId: string;
    sourceRevisionId: string | null;
    payload: unknown;
  };
  const revisions = await source.select({
    id: database.cmsRevisionsTable.id,
    editionId: database.cmsRevisionsTable.editionId,
    sourceRevisionId: database.cmsRevisionsTable.sourceRevisionId,
    payload: database.cmsRevisionsTable.payload,
  }).from(database.cmsRevisionsTable).where(
    eq(database.cmsRevisionsTable.editionId, editionId),
  );
  return validateRecoveryRevisionLineage(
    revisions as SelectedRecoveryLineageRow[],
    editionId,
    recoveredRevisionId,
    latestRevisionId,
  );
}

async function countPinnedMediaReferences(
  source: any,
  database: DatabaseBindings,
  documentId: string,
  revisionId: string,
) {
  const references = await source.select({
    id: database.cmsMediaReferencesTable.id,
  }).from(database.cmsMediaReferencesTable).where(and(
    eq(database.cmsMediaReferencesTable.documentId, documentId),
    eq(database.cmsMediaReferencesTable.fieldPath, `revision:${revisionId}`),
  ));
  return references.length;
}

async function recoveryAuditOwnership(
  source: any,
  database: DatabaseBindings,
  receipt: { operation: string; subjectId: string; requestDigest: string },
  documentId: string,
  editionId: string,
) {
  const errors: string[] = [];
  if (receipt.subjectId !== documentId) {
    errors.push("The people recovery receipt subject is not the immutable Mounir document.");
  }
  if (
    receipt.requestDigest !== requestDigest()
    && receipt.requestDigest !== LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST
  ) {
    errors.push("The people recovery receipt digest is not the current authority or the one approved legacy digest.");
  }
  const audits = await source.select().from(database.cmsAuditEventsTable).where(
    eq(database.cmsAuditEventsTable.requestId, PEOPLE_RECOVERY_KEY),
  );
  if (receipt.operation !== "cms.people.history-recovery.reconciled") {
    return { errors, audit: null, metadata: null, revisionId: null, pinnedMediaReferences: 0 };
  }
  const exactAudits = audits.filter((candidate: {
    targetId: string;
    action: string;
  }) => (
    candidate.targetId === documentId
    && candidate.action === "cms.people.history-recovery.reconciled"
  ));
  if (exactAudits.length !== 1) {
    errors.push("The reconciled recovery receipt has no exact audit event for the Mounir document.");
    return { errors, audit: exactAudits[0] ?? null, metadata: exactAudits[0]?.metadata ?? null, revisionId: null, pinnedMediaReferences: 0 };
  }
  const [audit] = exactAudits;
  const metadata = audit.metadata;
  const auditSourceMatches = isObject(metadata)
    && isObject(metadata.source)
    && metadata.source.commit === HISTORICAL_MOUNIR_SOURCE.commit
    && metadata.source.file === HISTORICAL_MOUNIR_SOURCE.file
    && metadata.source.lines === HISTORICAL_MOUNIR_SOURCE.lines;
  if (receipt.requestDigest === LEGACY_PEOPLE_RECOVERY_REQUEST_DIGEST && !auditSourceMatches) {
    errors.push("The explicit legacy receipt digest has mismatched historical source metadata.");
  }
  const revisionId = isObject(metadata) && typeof metadata.revisionId === "string"
    ? metadata.revisionId
    : null;
  if (!revisionId) {
    errors.push("The reconciled recovery audit must name its recovered revision.");
    return { errors, audit, metadata, revisionId: null, pinnedMediaReferences: 0 };
  }
  if (isObject(metadata) && metadata.draftOnly === false) {
    errors.push("The reconciled recovery audit is marked as having published content.");
  }
  if (
    !isObject(metadata)
    || !Array.isArray(metadata.changedFields)
    || !metadata.changedFields.includes("content.contribution")
  ) {
    errors.push("The reconciled recovery audit does not own the recovered contribution field.");
  }
  if (!isObject(metadata) || String(metadata.editionId ?? "") !== editionId) {
    errors.push("The reconciled recovery audit is not owned by the exact Mounir UAE/en edition.");
  }
  const [recoveredRevision] = await source.select().from(database.cmsRevisionsTable).where(
    eq(database.cmsRevisionsTable.id, revisionId),
  );
  if (!recoveredRevision || String(recoveredRevision.editionId) !== editionId) {
    errors.push("The reconciled recovery audit revision is not the exact Mounir UAE/en revision.");
  } else {
    if (String(recoveredRevision.createdByUserId) !== String(audit.actorUserId)) {
      errors.push("The audit-owned recovery revision was not created by the recovery audit actor.");
    }
    const content = isObject(recoveredRevision.payload) && isObject(recoveredRevision.payload.content)
      ? recoveredRevision.payload.content
      : {};
    if (content.contribution !== HISTORICAL_MOUNIR_RECOVERY.contribution) {
      errors.push("The audit-owned recovery revision does not contain the exact historical contribution.");
    }
  }
  const publicationAudits = await source.select().from(database.cmsAuditEventsTable).where(and(
    eq(database.cmsAuditEventsTable.targetId, documentId),
    eq(database.cmsAuditEventsTable.action, "document.published"),
  ));
  if (publicationAudits.some((candidate: { actorUserId: string; metadata: unknown }) => (
    String(candidate.actorUserId) === String(audit.actorUserId)
    && isObject(candidate.metadata)
    && candidate.metadata.revisionId === revisionId
  ))) {
    errors.push("The recovery service audit actor published the recovery revision; recovery must remain draft-only.");
  }
  const pinnedMediaReferences = await countPinnedMediaReferences(
    source,
    database,
    documentId,
    revisionId,
  );
  if (
    isObject(metadata)
    && Object.hasOwn(metadata, "pinnedMediaReferences")
    && metadata.pinnedMediaReferences !== pinnedMediaReferences
  ) {
    errors.push("The recovery audit pin count does not match persisted media references.");
  }
  return {
    errors,
    audit,
    metadata,
    revisionId,
    pinnedMediaReferences,
  };
}

/**
 * Kept separate from the transaction implementation so tests can validate
 * merge behavior without opening a database connection.
 */
export function recoveryRequestDigest() {
  return requestDigest();
}

async function inspect(database: DatabaseBindings, mode: PeopleRecoveryReport["mode"]) {
  const report = emptyReport(mode);
  report.historicalRoster = await buildHistoricalRosterComparison(database);
  const state = await findCurrentState(database);
  fillReportState(report, state);
  if (!state.document || !state.edition || !state.latest) return report;
  const plan = planHistoricalMounirMerge(state.latest.payload);
  report.decision = plan.decision;
  report.changedFields = plan.changedFields;
  report.conflicts = plan.conflicts;
  const validation = validateCmsSnapshot("person", plan.payload, "draft");
  if (!validation.success) report.validationErrors = validation.errors;
  const [receipt] = await database.db.select().from(database.cmsOperationReceiptsTable).where(
    eq(database.cmsOperationReceiptsTable.idempotencyKey, PEOPLE_RECOVERY_KEY),
  );
  report.receipt.recovery = receipt?.operation ?? null;
  let recoveryMetadata: unknown = null;
  if (receipt) {
    const ownership = await recoveryAuditOwnership(
      database.db,
      database,
      receipt,
      String(state.document.id),
      String(state.edition.id),
    );
    recoveryMetadata = ownership.metadata;
    report.pinnedMediaReferences = ownership.pinnedMediaReferences;
    if (ownership.errors.length) report.validationErrors.push(...ownership.errors);
  }
  const recoveredRevisionId = isObject(recoveryMetadata) && typeof recoveryMetadata.revisionId === "string"
    ? recoveryMetadata.revisionId
    : null;
  let recoveryStateConflict = false;
  if (
    receipt?.operation === "cms.people.history-recovery.reconciled"
    && recoveredRevisionId
  ) {
    const lineage = await recoveryRevisionLineage(
      database.db,
      database,
      String(state.edition.id),
      recoveredRevisionId,
      String(state.latest.id),
    );
    if (!lineage.valid) {
      recoveryStateConflict = true;
      report.decision = "conflict";
      report.conflicts = [{
        field: "content.contribution",
        actual: state.latest.id,
        expected: recoveredRevisionId,
        reason: lineage.errors.join(" "),
      }];
    }
  }
  // A safe contribution recovery may intentionally coexist with a newer
  // non-empty biography. Once the audit-owned recovery revision is a valid
  // ancestor of the current revision, that preserved conflict is no longer
  // an incomplete recovery.
  if (
    !recoveryStateConflict
    &&
    plan.decision === "conflict"
    && receipt?.operation === "cms.people.history-recovery.reconciled"
    && !plan.conflicts.some((conflict) => conflict.field === "content.contribution")
  ) {
    report.decision = "already-current";
  }
  return report;
}

function missingReportError(report: PeopleRecoveryReport) {
  return !report.state.documentId
    ? "The governed Mounir CMS document is missing. Run the established CMS inventory reconciliation first."
    : !report.state.editionId
      ? "The governed Mounir UAE/en edition is missing; no recovery was applied."
      : !report.state.latestRevisionId
        ? "The governed Mounir edition has no revision; no recovery was applied."
        : null;
}

async function pinInheritedMediaReferences(
  tx: any,
  database: DatabaseBindings,
  documentId: string,
  sourceRevisionId: string,
  recoveryRevisionId: string,
) {
  const inherited = await tx.select({
    assetId: database.cmsMediaReferencesTable.assetId,
    mediaVersionId: database.cmsMediaReferencesTable.mediaVersionId,
  }).from(database.cmsMediaReferencesTable).where(and(
    eq(database.cmsMediaReferencesTable.documentId, documentId),
    eq(database.cmsMediaReferencesTable.fieldPath, `revision:${sourceRevisionId}`),
  ));
  if (!inherited.length) return 0;
  await tx.insert(database.cmsMediaReferencesTable).values(
    inherited.map((reference: { assetId: string; mediaVersionId: string | null }) => ({
      assetId: reference.assetId,
      mediaVersionId: reference.mediaVersionId,
      documentId,
      fieldPath: `revision:${recoveryRevisionId}`,
    })),
  ).onConflictDoNothing();
  return inherited.length;
}

async function stageDraftSharedSourcePointer(
  tx: any,
  database: DatabaseBindings,
  documentId: string,
  editionId: string,
  priorRevisionId: string,
  recoveryRevisionId: string,
): Promise<{ changed: boolean; error: string | null }> {
  const [state] = await tx.select().from(database.cmsDocumentAvailabilityStatesTable).where(
    eq(database.cmsDocumentAvailabilityStatesTable.documentId, documentId),
  );
  if (!state) {
    return {
      changed: false,
      error: "The shared Mounir edition has no availability state; recovery will not invent a source pointer.",
    };
  }
  if (String(state.sharedSourceEditionId ?? "") !== editionId) {
    return {
      changed: false,
      error: "The Mounir edition is not the exact configured shared source; recovery will not move availability.",
    };
  }
  if (String(state.sharedSourceRevisionId ?? "") === recoveryRevisionId) {
    return { changed: false, error: null };
  }
  if (String(state.sharedSourceRevisionId ?? "") !== priorRevisionId) {
    return {
      changed: false,
      error: "The shared source pointer changed after the locked prior revision; recovery will not overwrite it.",
    };
  }
  const [updated] = await tx.update(database.cmsDocumentAvailabilityStatesTable).set({
    draftVersion: state.draftVersion + 1,
    sharedSourceRevisionId: recoveryRevisionId,
    reviewedVersion: null,
    reviewedSourceRevisionId: null,
    reviewedSelections: [],
    updatedAt: new Date(),
  }).where(and(
    eq(database.cmsDocumentAvailabilityStatesTable.documentId, documentId),
    eq(database.cmsDocumentAvailabilityStatesTable.sharedSourceEditionId, editionId),
    eq(database.cmsDocumentAvailabilityStatesTable.sharedSourceRevisionId, priorRevisionId),
  )).returning({
    documentId: database.cmsDocumentAvailabilityStatesTable.documentId,
  });
  if (!updated) {
    return {
      changed: false,
      error: "The shared source pointer changed concurrently; recovery did not overwrite availability.",
    };
  }
  return { changed: true, error: null };
}

async function applyRecovery(
  database: DatabaseBindings,
): Promise<PeopleRecoveryReport> {
  const report = emptyReport("apply");
  const result = await database.db.transaction(async (tx) => {
    const { document } = await resolveInventoryDocument(tx, database);
    const [edition] = await tx.select().from(database.cmsMarketEditionsTable).where(and(
      eq(database.cmsMarketEditionsTable.documentId, document.id),
      eq(database.cmsMarketEditionsTable.market, MOUNIR_MARKET),
      eq(database.cmsMarketEditionsTable.locale, MOUNIR_LOCALE),
    ));
    if (!edition) return { report, status: "missing" as const };
    const lockedEdition = await tx.execute(sql`
      SELECT id
        FROM cms_market_editions
       WHERE id = ${edition.id}
         AND document_id = ${document.id}
       FOR UPDATE
    `);
    if (!lockedEdition.rows.length) {
      throw new Error("The Mounir UAE/en edition disappeared before recovery could lock it.");
    }
    // The lock is acquired before this read. Any normal CMS save/publication
    // that honors edition locking must therefore serialize behind this exact
    // latest-state check.
    const [latest] = await tx.select().from(database.cmsRevisionsTable).where(
      eq(database.cmsRevisionsTable.editionId, edition.id),
    ).orderBy(
      desc(database.cmsRevisionsTable.revisionNumber),
      desc(database.cmsRevisionsTable.createdAt),
    ).limit(1);
    if (!latest) return { report, status: "missing" as const };

    const availability = await readAvailability(tx, database, document.id);
    fillReportState(report, { document, edition, latest, availability });

    const [existingReceipt] = await tx.select().from(database.cmsOperationReceiptsTable).where(
      eq(database.cmsOperationReceiptsTable.idempotencyKey, PEOPLE_RECOVERY_KEY),
    );
    let existingOwnership: Awaited<ReturnType<typeof recoveryAuditOwnership>> | null = null;
    if (existingReceipt) {
      const [existingAudit] = await tx.select().from(database.cmsAuditEventsTable).where(
        eq(database.cmsAuditEventsTable.requestId, PEOPLE_RECOVERY_KEY),
      );
      if (!acceptsHistoricalRecoveryReceipt(existingReceipt, existingAudit?.metadata, String(document.id))) {
        throw new Error("The existing people recovery receipt has an unexpected subject or authority digest; refusing to reuse the key.");
      }
      existingOwnership = await recoveryAuditOwnership(
        tx,
        database,
        existingReceipt,
        String(document.id),
        String(edition.id),
      );
      report.pinnedMediaReferences = existingOwnership.pinnedMediaReferences;
      if (existingOwnership.errors.length) {
        report.validationErrors = existingOwnership.errors;
        return { report, status: "blocked" as const };
      }
    }
    if (existingReceipt?.operation === "cms.people.history-recovery.conflict-preserved") {
      report.decision = "conflict";
      report.conflicts = [{
        field: "content.contribution",
        actual: null,
        expected: HISTORICAL_MOUNIR_RECOVERY.contribution,
        reason: "An earlier run recorded a preserved editorial conflict for this immutable recovery key.",
      }];
      report.receipt.recovery = existingReceipt.operation;
      return { report, status: "conflict" as const };
    }

    const plan = planHistoricalMounirMerge(latest.payload);
    report.decision = plan.decision;
    report.changedFields = plan.changedFields;
    report.conflicts = plan.conflicts;
    if (existingReceipt?.operation === "cms.people.history-recovery.reconciled") {
      const recoveredRevisionId = existingOwnership?.revisionId;
      if (!recoveredRevisionId) {
        report.validationErrors = ["The reconciled recovery receipt has no audit-owned revision lineage."];
        return { report, status: "blocked" as const };
      }
      const lineage = await recoveryRevisionLineage(
        tx,
        database,
        String(edition.id),
        recoveredRevisionId,
        String(latest.id),
      );
      if (!lineage.valid) {
        report.decision = "conflict";
        report.conflicts = [{
          field: "content.contribution",
          actual: latest.id,
          expected: recoveredRevisionId,
          reason: lineage.errors.join(" "),
        }];
        return { report, status: "conflict" as const };
      }
      if (edition.contentMode === "shared" && String(latest.id) === recoveredRevisionId) {
        const priorRevisionId = latest.sourceRevisionId
          ? String(latest.sourceRevisionId)
          : null;
        if (!priorRevisionId) {
          report.validationErrors = ["The shared recovery revision has no exact prior source revision; availability was not changed."];
          return { report, status: "blocked" as const };
        }
        const staged = await stageDraftSharedSourcePointer(
          tx,
          database,
          String(document.id),
          String(edition.id),
          priorRevisionId,
          String(latest.id),
        );
        if (staged.error) {
          report.validationErrors = [staged.error];
          return { report, status: "blocked" as const };
        }
      }
    }
    const validation = validateCmsSnapshot("person", plan.payload, "draft");
    if (!validation.success) {
      report.validationErrors = validation.errors;
      return { report, status: "blocked" as const };
    }
    if (plan.decision === "conflict" && existingReceipt?.operation !== "cms.people.history-recovery.reconciled") {
      if (!existingReceipt) {
        const [account] = await tx.insert(database.cmsUsersTable).values({
          email: "cms-people-history-recovery@service.invalid",
          displayName: "CMS people history recovery service",
          role: "viewer",
          status: "suspended",
        }).onConflictDoUpdate({
          target: database.cmsUsersTable.email,
          set: {
            displayName: "CMS people history recovery service",
            role: "viewer",
            status: "suspended",
          },
        }).returning({ id: database.cmsUsersTable.id });
        if (!account) throw new Error("Could not provision people recovery attribution account.");
        await tx.insert(database.cmsOperationReceiptsTable).values({
          idempotencyKey: PEOPLE_RECOVERY_KEY,
          operation: "cms.people.history-recovery.conflict-preserved",
          subjectId: String(document.id),
          requestDigest: requestDigest(),
          resultDigest: resultDigest({
            documentId: document.id,
            revisionId: latest.id,
            conflicts: plan.conflicts,
          }),
        });
        await tx.insert(database.cmsAuditEventsTable).values({
          actorUserId: account.id,
          actorLabel: "cms-people-history-recovery",
          action: "cms.people.history-recovery.conflict-preserved",
          targetType: "person",
          targetId: String(document.id),
          requestId: PEOPLE_RECOVERY_KEY,
          metadata: {
            editionId: String(edition.id),
            revisionId: String(latest.id),
            source: HISTORICAL_MOUNIR_SOURCE,
            conflicts: plan.conflicts,
            preservedAvailabilityDigest: availability.digest,
          },
        });
      }
      report.receipt.recovery = "cms.people.history-recovery.conflict-preserved";
      return { report, status: "conflict" as const };
    }
    if (
      plan.decision === "conflict"
      && existingReceipt?.operation === "cms.people.history-recovery.reconciled"
      && plan.conflicts.some((conflict) => conflict.field === "content.contribution")
    ) {
      report.decision = "conflict";
      return { report, status: "conflict" as const };
    }
    if (
      plan.decision === "already-current"
      || (
        plan.decision === "conflict"
        && existingReceipt?.operation === "cms.people.history-recovery.reconciled"
        && !plan.conflicts.some((conflict) => conflict.field === "content.contribution")
      )
    ) {
      if (plan.decision === "conflict") report.decision = "already-current";
      report.receipt.recovery = existingReceipt?.operation ?? null;
      return { report, status: "already-current" as const };
    }
    if (existingReceipt) {
      const audits = await tx.select().from(database.cmsAuditEventsTable).where(
        eq(database.cmsAuditEventsTable.requestId, PEOPLE_RECOVERY_KEY),
      );
      const metadata = audits[0]?.metadata;
      const recoveredRevisionId = isObject(metadata) && typeof metadata.revisionId === "string"
        ? metadata.revisionId
        : null;
      if (!recoveredRevisionId) {
        throw new Error("The people recovery receipt has no auditable revision id.");
      }
      const lineage = await recoveryRevisionLineage(
        tx,
        database,
        String(edition.id),
        recoveredRevisionId,
        String(latest.id),
      );
      if (!lineage.valid) {
        report.conflicts = [{
          field: "content.contribution",
          actual: latest.id,
          expected: recoveredRevisionId,
          reason: lineage.errors.join(" "),
        }];
        report.decision = "conflict";
        return { report, status: "conflict" as const };
      }
      report.receipt.recovery = existingReceipt.operation;
      return { report, status: "already-current" as const };
    }

    const [account] = await tx.insert(database.cmsUsersTable).values({
      email: "cms-people-history-recovery@service.invalid",
      displayName: "CMS people history recovery service",
      role: "viewer",
      status: "suspended",
    }).onConflictDoUpdate({
      target: database.cmsUsersTable.email,
      set: {
        displayName: "CMS people history recovery service",
        role: "viewer",
        status: "suspended",
      },
    }).returning({ id: database.cmsUsersTable.id });
    if (!account) throw new Error("Could not provision people recovery attribution account.");

    const [revision] = await tx.insert(database.cmsRevisionsTable).values({
      editionId: edition.id,
      revisionNumber: latest.revisionNumber + 1,
      payloadVersion: latest.payloadVersion,
      payload: plan.payload,
      contentDigest: resultDigest(plan.payload),
      workflowState: "draft",
      createdByUserId: account.id,
      sourceRevisionId: latest.id,
      reason: "Historical Mounir people copy recovery; exact approved source fields restored.",
    }).returning({ id: database.cmsRevisionsTable.id });
    if (!revision) throw new Error("Could not create the Mounir recovery revision.");
    await pinInheritedMediaReferences(
      tx,
      database,
      document.id,
      latest.id,
      revision.id,
    );
    if (edition.contentMode === "shared") {
      const staged = await stageDraftSharedSourcePointer(
        tx,
        database,
        String(document.id),
        String(edition.id),
        String(latest.id),
        String(revision.id),
      );
      if (staged.error) throw new Error(staged.error);
    }
    // Read back the persisted rows rather than trusting the inherited count.
    report.pinnedMediaReferences = await countPinnedMediaReferences(
      tx,
      database,
      document.id,
      revision.id,
    );
    await tx.insert(database.cmsOperationReceiptsTable).values({
      idempotencyKey: PEOPLE_RECOVERY_KEY,
      operation: "cms.people.history-recovery.reconciled",
      subjectId: String(document.id),
      requestDigest: requestDigest(),
      resultDigest: resultDigest({
        documentId: document.id,
        editionId: edition.id,
        revisionId: revision.id,
        changedFields: plan.changedFields,
        pinnedMediaReferences: report.pinnedMediaReferences,
      }),
    });
    await tx.insert(database.cmsAuditEventsTable).values({
      actorUserId: account.id,
      actorLabel: "cms-people-history-recovery",
      action: "cms.people.history-recovery.reconciled",
      targetType: "person",
      targetId: String(document.id),
      requestId: PEOPLE_RECOVERY_KEY,
      metadata: {
        editionId: String(edition.id),
        revisionId: String(revision.id),
        source: HISTORICAL_MOUNIR_SOURCE,
        changedFields: plan.changedFields,
        pinnedMediaReferences: report.pinnedMediaReferences,
        draftOnly: true,
        preservedAvailabilityDigest: availability.digest,
      },
    });
    report.receipt.recovery = "cms.people.history-recovery.reconciled";
    report.state.latestRevisionId = String(revision.id);
    report.state.latestRevisionNumber = latest.revisionNumber + 1;
    report.state.latestWorkflowState = "draft";
    return { report, status: "reconciled" as const };
  });
  return result.report;
}

export async function recoverPeople(options: {
  applyDatabase: boolean;
}) {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("People copy recovery is disabled in production.");
  }
  const database = await loadDatabase();
  try {
    if (!options.applyDatabase) return await inspect(database, "read-only");
    const report = await applyRecovery(database);
    report.historicalRoster = await buildHistoricalRosterComparison(database);
    return report;
  } finally {
    await database.pool.end();
  }
}

export async function verifyPeopleRecovery() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("People copy recovery verification is disabled in production.");
  }
  const database = await loadDatabase();
  try {
    const report = await inspect(database, "read-only");
    const errors: string[] = [];
    if (!report.state.documentId) errors.push("Mounir document is missing.");
    if (!report.state.editionId) errors.push("Mounir UAE/en edition is missing.");
    if (!report.receipt.recovery) errors.push("No people recovery receipt exists.");
    if (report.receipt.recovery === "cms.people.history-recovery.conflict-preserved") {
      errors.push("People recovery is blocked by a preserved editorial conflict.");
    }
    if (report.decision === "conflict") errors.push("The latest revision still differs from the historical authority.");
    if (report.validationErrors.length) errors.push(...report.validationErrors);
    if (errors.length) {
      return { ok: false, report, errors };
    }
    return { ok: true, report, errors: [] as string[] };
  } finally {
    await database.pool.end();
  }
}

function assertDevelopmentTarget(target: string | undefined) {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("People copy recovery is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("People copy recovery requires the explicit --target=development safeguard.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

async function main() {
  const args = process.argv.slice(2);
  const applyDatabase = args.includes("--apply-db");
  if (args.includes("--publish")) {
    throw new Error("People recovery is draft-only; --publish was removed. Use the authenticated normal CMS Publish workflow after governance approvals.");
  }
  const shouldWrite = args.includes("--write");
  const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);
  assertDevelopmentTarget(target);
  const report = await recoverPeople({ applyDatabase });
  const error = missingReportError(report);
  if (error) throw new Error(error);
  const destination = outputPath(
    args.find((argument) => argument.startsWith("--out="))?.slice(6),
    "people-recovery-report.json",
  );
  await emitJson(report, destination, shouldWrite);
  if (
    report.decision === "conflict"
    || report.decision === "invalid"
    || report.validationErrors.length
  ) process.exitCode = 2;
}

// Importing this module in focused tests must not open the project database.
if (
  process.argv[1]
  && import.meta.url === pathToFileURL(process.argv[1]).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}