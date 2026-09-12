import { createHash } from "node:crypto";
import path from "node:path";
import { pathToFileURL } from "node:url";
import {
  collectCmsMediaReferences,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { emitJson, outputPath } from "./common.js";
import { canonicalResultDigest, FINANCIAL_SERVICES_GOVERNED_THESIS } from "./migration.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const write = args.includes("--write");
const reportBlocked = args.includes("--report-blocked");
const prepareDrafts = args.includes("--prepare-drafts");
const reconcileDrafts = args.includes("--reconcile-drafts");
const clearMediaRights = args.includes("--clear-media-rights");
const target = args.find((item) => item.startsWith("--target="))?.slice("--target=".length);

const TASK = 317;
const DOCUMENT_ID = "b05b2617-0584-4bf3-966d-8f78f3896027";
const UAE_EDITION_ID = "7e168f5d-9a00-407d-a63d-ae5f65faef89";
const PREVIOUS_PUBLISHED_REVISION_ID = "a9becd21-1772-4be7-afec-54b519ff13b5";
const AUTHORIZED_DRAFT_REVISION_ID = "d069afc1-f54b-4560-93bf-4db2abbac255";
const OPERATION = "cms.financial-services.task-317.uae-publication-and-localization";
const RECEIPT_KEY = "cms-financial-services-task-317:uae-only-v1";
const DRAFT_OPERATION = "cms.financial-services.task-317.uae-and-local-draft-preparation";
const DRAFT_RECEIPT_KEY = "cms-financial-services-task-317:uae-and-local-drafts-v1";
const DRAFT_RECONCILIATION_OPERATION = "cms.financial-services.task-317.localized-draft-isolation-reconciliation";
const DRAFT_RECONCILIATION_RECEIPT_KEY = "cms-financial-services-task-317:localized-draft-isolation-v2";
const CLEARANCE_OPERATION = "cms.financial-services.task-317.supporting-image-rights-clearance";
const CLEARANCE_RECEIPT_KEY = "cms-financial-services-task-317:supporting-image-rights-clearance-v1";
const SERVICE_EMAIL = "cms-task-317-financial-services@service.invalid";
const ACCEPTED_MEDIA_RIGHTS_STATUSES = new Set(["approved", "approved-use"]);

class CmsGovernanceBlockError extends Error {
  constructor(message: string, readonly details: Record<string, unknown>) {
    super(message);
  }
}

type Queryable = {
  query: (sql: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: any[] }>;
};

type Market = { id: string; code: string; locale: string };
type Pin = { assetId: string; mediaVersionId: string };
type PinReplacement = Pin & { priorMediaVersionId: string };

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function changedPaths(before: unknown, after: unknown, at = ""): string[] {
  if (Object.is(before, after)) return [];
  if (
    !before || !after || typeof before !== "object" || typeof after !== "object"
    || Array.isArray(before) !== Array.isArray(after)
  ) return [at || "<root>"];
  if (Array.isArray(before) && Array.isArray(after)) {
    if (before.length !== after.length) return [at || "<root>"];
    return before.flatMap((value, index) => changedPaths(value, after[index], `${at}[${index}]`));
  }
  const beforeRecord = before as Record<string, unknown>;
  const afterRecord = after as Record<string, unknown>;
  const keys = new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]);
  return [...keys].sort().flatMap((key) => changedPaths(
    beforeRecord[key],
    afterRecord[key],
    at ? `${at}.${key}` : key,
  ));
}

function replacePinnedVersions(value: unknown, replacements: Map<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => replacePinnedVersions(item, replacements));
  if (!value || typeof value !== "object") return value;
  const record = value as Record<string, unknown>;
  const output: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(record)) {
    output[key] = key === "mediaVersionId" && typeof item === "string" && replacements.has(item)
      ? replacements.get(item)!
      : replacePinnedVersions(item, replacements);
  }
  return output;
}

function localizedCopy(market: "europe" | "ksa" | "turkiye") {
  const copy = {
    europe: {
      place: "European",
      direction:
        "For European financial-services teams, make each AI-assisted workflow legible to the accountable owner: define authority, retain evidence, test change and route exceptions.",
    },
    ksa: {
      place: "Saudi",
      direction:
        "For Saudi financial-services teams, define the authority, evidence and escalation path around each AI-assisted workflow before scaling it.",
    },
    turkiye: {
      place: "Türkiye",
      direction:
        "For financial-services teams in Türkiye, start with bounded workflows whose permissions, evidence and human escalation routes remain clear.",
    },
  }[market];
  const body = `${copy.direction} This unpublished draft makes no claim of regulatory compliance, approval or realised outcome; local legal, risk and business owners must review it before release.`;
  return {
    summary: body,
    seoTitle: `Financial Services AI | ${copy.place} | Cognirise`,
    seoDescription:
      `Governed AI operating models for ${copy.place} financial-services teams, with accountable ownership, evidence and clear escalation.`,
    dek: copy.direction,
    gcc: body,
    opportunity:
      "Frame a bounded financial-services workflow with named authority, evidence, exception handling and measures before deciding whether to scale it.",
    firstMove: "Choose one bounded workflow and identify its accountable owner, evidence and exception path.",
    body,
  };
}

function foreignRegionalMarkers(value: unknown, market: "europe" | "ksa" | "turkiye") {
  const serialized = typeof value === "string" ? value : JSON.stringify(value);
  const markers: string[] = [];
  if (/\bUAE\b|United Arab Emirates|centralbank\.ae|\.gov\.ae\b/i.test(serialized)) {
    markers.push("UAE");
  }
  if (market !== "ksa" && /\bSaudi(?: Arabia| Arabian)?\b|\bKingdom\b|\bSDAIA\b|\.gov\.sa\b/i.test(serialized)) {
    markers.push("Saudi");
  }
  return markers;
}

function assertMarketIsolation(payload: Record<string, any>, market: "europe" | "ksa" | "turkiye") {
  const markers = foreignRegionalMarkers(payload, market);
  if (markers.length) {
    throw new Error(`${market} localized content retained forbidden regional marker(s): ${markers.join(", ")}.`);
  }
}

function localizedPayload(
  source: Record<string, any>,
  market: "europe" | "ksa" | "turkiye",
) {
  const localized = structuredClone(source);
  const copy = localizedCopy(market);
  const sourceTrail = Array.isArray(localized.content?.sources)
    ? localized.content.sources
      // Task 289 marked its whole source trail with the UAE edition marker,
      // including international sources. Remove only the UAE-specific source;
      // do not relabel a source as regional proof merely to make a draft fit.
      .filter((item: any) => item && typeof item === "object" && !foreignRegionalMarkers(item, market).length)
      .map(({ market: _market, ...item }: Record<string, unknown>) => item)
    : [];
  const sourceUrls = new Set(sourceTrail.map((item: any) => item?.url));
  const evidenceSignals = Array.isArray(localized.content?.bankingPov?.evidenceSignals)
    ? localized.content.bankingPov.evidenceSignals.filter((item: any) =>
      sourceUrls.has(item?.url) && !foreignRegionalMarkers(item, market).length)
    : [];
  const selectedEvidenceUrls = new Set(evidenceSignals.map((item: any) => item.url));
  const selectedSources = sourceTrail.filter((item: any) => selectedEvidenceUrls.has(item.url));
  if (!selectedSources.length || !evidenceSignals.length) {
    throw new Error(`Cannot prepare ${market}: no non-UAE, source-linked evidence remains after regional isolation.`);
  }
  localized.markets = [market];
  localized.summary = copy.summary;
  localized.seo = {
    ...localized.seo,
    title: copy.seoTitle,
    description: copy.seoDescription,
    noIndex: true,
  };
  localized.content = {
    ...localized.content,
    thesis: FINANCIAL_SERVICES_GOVERNED_THESIS,
    accent: "Governed work, visible accountability.",
    dek: copy.dek,
    gcc: copy.gcc,
    opportunity: copy.opportunity,
    service: {
      ...localized.content.service,
      label: "Value Scan",
      firstMove: copy.firstMove,
    },
    sources: selectedSources,
    bankingPov: {
      ...localized.content.bankingPov,
      market,
      descriptor: `Financial-services AI for ${market}: accountable operations before scale`,
      hero: {
        ...localized.content.bankingPov.hero,
        heading: FINANCIAL_SERVICES_GOVERNED_THESIS,
        body: copy.body,
      },
      cta: {
        ...localized.content.bankingPov.cta,
        heading: "Start with a bounded financial-services workflow",
        body: copy.body,
      },
      evidenceSignals,
    },
  };
  assertMarketIsolation(localized, market);
  return localized;
}

async function assertImmutableMediaPins(
  client: Queryable,
  revisionId: string,
  snapshot: Record<string, any>,
  requireApprovedRights: boolean,
) {
  const expected = collectCmsMediaReferences("industry", snapshot.content, snapshot.mediaIds ?? []);
  const expectedPins = new Map<string, string>();
  for (const reference of expected) {
    // `mediaIds` keeps the ordered legacy inventory and deliberately has no
    // version field. Its corresponding semantic media reference below is the
    // immutable authority for the same asset.
    if (!reference.mediaVersionId) continue;
    const prior = expectedPins.get(reference.mediaId);
    if (prior && prior !== reference.mediaVersionId) {
      throw new Error(`${reference.mediaId} is pinned to conflicting versions.`);
    }
    expectedPins.set(reference.mediaId, reference.mediaVersionId);
  }
  const mediaIds = Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [];
  if (
    expectedPins.size !== 6 || new Set(mediaIds).size !== 6
    || mediaIds.some((assetId) => !expectedPins.has(assetId))
  ) {
    throw new Error("The authorized UAE draft must retain exactly six immutable media pins.");
  }
  const pins = await client.query(
    `SELECT ref.asset_id::text asset_id,ref.media_version_id::text media_version_id,
            a.status,a.media_type,a.alt_text,v.width,v.height,v.metadata
       FROM cms_media_references ref
       JOIN cms_media_assets a ON a.id=ref.asset_id
       JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
      WHERE ref.document_id=$1 AND ref.field_path=$2`,
    [DOCUMENT_ID, `revision:${revisionId}`],
  );
  const actualPins = new Map(pins.rows.map((row) => [String(row.asset_id), String(row.media_version_id)]));
  if (
    pins.rowCount !== 6
    || actualPins.size !== expectedPins.size
    || [...expectedPins].some(([assetId, versionId]) => actualPins.get(assetId) !== versionId)
  ) {
    throw new Error("The authorized UAE draft does not have the exact six immutable media pins declared by its snapshot.");
  }
  const errors = pins.rows.flatMap((row) => {
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata as Record<string, unknown> : {};
    const rights = metadata.rights && typeof metadata.rights === "object"
      ? metadata.rights as Record<string, unknown>
      : {};
    const messages: string[] = [];
    if (!["active", "ready"].includes(String(row.status))) messages.push("asset is unavailable");
    if (!String(row.media_type).startsWith("image/")) messages.push("asset is not an image");
    if (!Number(row.width) || !Number(row.height)) messages.push("image dimensions are unavailable");
    if (!String(row.alt_text ?? metadata.altText ?? "").trim()) messages.push("alternative text is unavailable");
    // The publisher route writes `approved-use`; the older import contract
    // uses `approved`. Both are affirmative rights-review states.
    if (
      requireApprovedRights
      && !ACCEPTED_MEDIA_RIGHTS_STATUSES.has(String(metadata.rightsStatus ?? rights.status ?? ""))
    ) {
      messages.push("media rights are not approved");
    }
    return messages.map((message) => `${row.asset_id}: ${message}`);
  });
  if (errors.length) {
    throw new CmsGovernanceBlockError(
      `Normal CMS media-governance validation blocked publication: ${errors.join("; ")}`,
      {
        immutablePinsExact: true,
        requireApprovedRights,
        media: pins.rows.map((row) => {
          const metadata = row.metadata && typeof row.metadata === "object"
            ? row.metadata as Record<string, unknown>
            : {};
          const rights = metadata.rights && typeof metadata.rights === "object"
            ? metadata.rights as Record<string, unknown>
            : {};
          return {
            assetId: String(row.asset_id),
            mediaVersionId: String(row.media_version_id),
            assetStatus: row.status,
            rightsStatus: metadata.rightsStatus ?? rights.status ?? null,
            accessibilityStatus: metadata.accessibilityStatus ?? null,
          };
        }),
      },
    );
  }
  return [...expectedPins].map(([assetId, mediaVersionId]) => ({ assetId, mediaVersionId }));
}

async function readPlan(client: Queryable) {
  const source = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,e.id::text edition_id,e.market,e.locale,
            e.content_mode,e.editorial_market,e.publication_state,e.published_revision_id::text,
            r.id::text revision_id,r.revision_number,r.payload_version,r.workflow_state,r.payload,r.content_digest,
            state.shared_source_edition_id::text,state.shared_source_revision_id::text,
            state.published_source_revision_id::text,state.draft_version,state.reviewed_version,state.published_version
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_revisions r ON r.edition_id=e.id
       JOIN cms_document_availability_states state ON state.document_id=d.id
      WHERE d.id=$1 AND e.id=$2 AND r.id=$3
      FOR UPDATE OF d,e,r,state`,
    [DOCUMENT_ID, UAE_EDITION_ID, AUTHORIZED_DRAFT_REVISION_ID],
  );
  const row = source.rows[0] as Record<string, any> | undefined;
  if (
    !row || row.kind !== "industry" || row.canonical_slug !== "financial-services"
    || row.market !== "uae" || row.locale !== "en" || row.content_mode !== "shared"
    || row.editorial_market !== "uae" || row.publication_state !== "published"
    || row.published_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
    || row.revision_number !== 7 || row.workflow_state !== "draft"
    || row.shared_source_edition_id !== UAE_EDITION_ID
    || row.shared_source_revision_id !== AUTHORIZED_DRAFT_REVISION_ID
    || row.published_source_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
  ) {
    throw new Error("The exact UAE draft/publication chain changed; refusing Task 317 rather than advancing a stale or non-latest successor.");
  }
  const latest = await client.query(
    `SELECT id::text,revision_number,workflow_state
       FROM cms_revisions WHERE edition_id=$1
      ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1 FOR UPDATE`,
    [UAE_EDITION_ID],
  );
  if (
    latest.rowCount !== 1 || latest.rows[0].id !== AUTHORIZED_DRAFT_REVISION_ID
    || Number(latest.rows[0].revision_number) !== 7 || latest.rows[0].workflow_state !== "draft"
  ) {
    throw new Error("The authorized UAE draft is no longer the latest revision; refusing to force an older automatic successor forward.");
  }
  const validation = validateCmsSnapshot("industry", row.payload, "publish");
  if (!validation.success) throw new Error(`Authorized UAE draft is not publication-ready: ${validation.errors.join("; ")}`);
  const sourcePayload = validation.data as Record<string, any>;
  if (sourcePayload.content.thesis !== "One bank. Three levels of AI value.") {
    throw new Error("The authorized UAE draft no longer has the expected pre-Task-317 thesis; refusing an ambiguous replacement.");
  }
  const published = structuredClone(sourcePayload);
  published.content.thesis = FINANCIAL_SERVICES_GOVERNED_THESIS;
  const publishedValidation = validateCmsSnapshot("industry", published, "publish");
  if (!publishedValidation.success) throw new Error(`Task 317 UAE candidate is invalid: ${publishedValidation.errors.join("; ")}`);
  const publishedPayload = publishedValidation.data as Record<string, any>;
  const differences = changedPaths(sourcePayload, publishedPayload);
  if (differences.length !== 1 || differences[0] !== "content.thesis") {
    throw new Error(`Task 317 would change fields beyond the authorized thesis: ${differences.join(", ")}`);
  }
  await client.query("LOCK TABLE market_editions IN SHARE MODE");
  const configured = await client.query(
    `SELECT m.id::text id,m.code,configured_locale.locale
       FROM market_editions m
       CROSS JOIN LATERAL (
         SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
          WHERE locale IS NOT NULL
       ) configured_locale
      WHERE m.enabled=true ORDER BY m.code,configured_locale.locale FOR UPDATE OF m`,
  );
  const markets = configured.rows as Market[];
  const expectedMarkets = ["europe", "ksa", "turkiye", "uae"];
  if (
    markets.length !== expectedMarkets.length
    || markets.some((market) => !expectedMarkets.includes(market.code) || market.locale !== "en")
  ) {
    throw new Error("Enabled market configuration changed; Task 317 only localizes the reviewed Europe, KSA, Türkiye and UAE matrix.");
  }
  const localized = markets
    .filter((market) => market.code !== "uae")
    .map((market) => {
      const code = market.code as "europe" | "ksa" | "turkiye";
      const payload = localizedPayload(publishedPayload, code);
      const localizedValidation = validateCmsSnapshot("industry", payload, "draft");
      if (!localizedValidation.success) throw new Error(`${code} localized draft is invalid: ${localizedValidation.errors.join("; ")}`);
      return { market, payload: localizedValidation.data, digest: canonicalResultDigest(localizedValidation.data) };
    });
  return {
    row,
    latest: latest.rows[0],
    markets,
    publishedPayload,
    candidateDigest: canonicalResultDigest(publishedPayload),
    localized,
  };
}

async function readPreparedPublicationPlan(client: Queryable) {
  const preparation = await client.query(
    `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [DRAFT_RECEIPT_KEY],
  );
  if (!preparation.rowCount) return null;
  if (
    preparation.rows[0].operation !== DRAFT_OPERATION
    || preparation.rows[0].subject_id !== DOCUMENT_ID
  ) {
    throw new Error("Task 317 draft-preparation receipt conflicts with this document; publication will not infer replacement authority.");
  }
  const preparationAudit = await client.query(
    `SELECT metadata FROM cms_audit_events WHERE request_id=$1 FOR SHARE`,
    [`${DRAFT_RECEIPT_KEY}:uae`],
  );
  const prepared = preparationAudit.rows[0]?.metadata as Record<string, any> | undefined;
  let uaeRevisionId = String(prepared?.uaeDraftRevisionId ?? "");
  let clearance: Record<string, any> | undefined;
  let localizedDrafts = Array.isArray(prepared?.localizedDrafts) ? prepared.localizedDrafts : [];
  if (!uaeRevisionId || localizedDrafts.length !== 3) {
    throw new Error("Task 317 draft-preparation audit is incomplete; publication will not guess a draft or local-edition authority.");
  }
  const clearanceReceipt = await client.query(
    `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [CLEARANCE_RECEIPT_KEY],
  );
  if (clearanceReceipt.rowCount) {
    if (clearanceReceipt.rows[0].operation !== CLEARANCE_OPERATION || clearanceReceipt.rows[0].subject_id !== DOCUMENT_ID) {
      throw new Error("Task 317 media-clearance receipt conflicts with this document.");
    }
    const clearanceAudit = await client.query(
      `SELECT metadata FROM cms_audit_events WHERE request_id=$1 FOR SHARE`,
      [`${CLEARANCE_RECEIPT_KEY}:complete`],
    );
    clearance = clearanceAudit.rows[0]?.metadata as Record<string, any> | undefined;
    if (
      !clearance || clearance.predecessorUaeRevisionId !== uaeRevisionId
      || typeof clearance.uaeClearanceRevisionId !== "string"
      || !Array.isArray(clearance.pinReplacements) || clearance.pinReplacements.length !== 5
    ) {
      throw new Error("Task 317 media-clearance audit is incomplete; publication will not infer a replacement pin set.");
    }
    uaeRevisionId = clearance.uaeClearanceRevisionId;
  }
  const reconciliation = await client.query(
    `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [DRAFT_RECONCILIATION_RECEIPT_KEY],
  );
  if (reconciliation.rowCount) {
    if (
      reconciliation.rows[0].operation !== DRAFT_RECONCILIATION_OPERATION
      || reconciliation.rows[0].subject_id !== DOCUMENT_ID
    ) {
      throw new Error("Task 317 localized-draft reconciliation receipt conflicts with this document.");
    }
    const reconciliationAudit = await client.query(
      `SELECT metadata FROM cms_audit_events WHERE request_id=$1 FOR SHARE`,
      [`${DRAFT_RECONCILIATION_RECEIPT_KEY}:complete`],
    );
    const corrected = reconciliationAudit.rows[0]?.metadata?.correctedDrafts;
    if (!Array.isArray(corrected) || corrected.length !== 3) {
      throw new Error("Task 317 localized-draft reconciliation audit is incomplete; publication remains blocked.");
    }
    localizedDrafts = corrected;
  }
  if (!localizedDrafts.every((draft: any) =>
    typeof draft?.market === "string" && typeof draft?.editionId === "string" && typeof draft?.revisionId === "string"
  )) {
    throw new Error("Task 317 prepared localized-draft identities are incomplete.");
  }
  const preparedUae = await client.query(
    `SELECT d.kind,d.canonical_slug,e.id::text edition_id,e.market,e.locale,e.content_mode,e.editorial_market,
            e.publication_state,e.published_revision_id::text,
            latest.id::text revision_id,latest.revision_number,latest.payload_version,latest.workflow_state,latest.payload,
            latest.source_revision_id::text source_revision_id,
            source.payload source_payload,
            state.shared_source_edition_id::text,state.shared_source_revision_id::text,
            state.published_source_revision_id::text,state.draft_version,state.reviewed_version,state.published_version
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_document_availability_states state ON state.document_id=d.id
       JOIN LATERAL (
         SELECT * FROM cms_revisions WHERE edition_id=e.id
          ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
       ) latest ON true
       JOIN cms_revisions source ON source.id=$3
      WHERE d.id=$1 AND e.id=$2 FOR UPDATE OF d,e,state,latest,source`,
    [DOCUMENT_ID, UAE_EDITION_ID, AUTHORIZED_DRAFT_REVISION_ID],
  );
  const row = preparedUae.rows[0] as Record<string, any> | undefined;
  if (
    !row || row.kind !== "industry" || row.canonical_slug !== "financial-services"
    || row.market !== "uae" || row.locale !== "en" || row.content_mode !== "shared"
    || row.editorial_market !== "uae" || row.publication_state !== "published"
    || row.published_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
    || row.revision_id !== uaeRevisionId || row.workflow_state !== "draft"
    || row.source_revision_id !== (clearance ? clearance.predecessorUaeRevisionId : AUTHORIZED_DRAFT_REVISION_ID)
    || row.shared_source_edition_id !== UAE_EDITION_ID
    || row.shared_source_revision_id !== AUTHORIZED_DRAFT_REVISION_ID
    || row.published_source_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
    || row.payload?.content?.thesis !== FINANCIAL_SERVICES_GOVERNED_THESIS
  ) {
    throw new Error("Task 317 prepared UAE draft is no longer the exact latest draft on its recorded publication baseline; preserving newer editorial work.");
  }
  if (clearance) {
    const predecessor = await client.query("SELECT payload FROM cms_revisions WHERE id=$1 FOR KEY SHARE", [clearance.predecessorUaeRevisionId]);
    const replacements = new Map<string, string>(
      clearance.pinReplacements.map((pin: any): [string, string] => [String(pin.priorMediaVersionId), String(pin.mediaVersionId)]),
    );
    const expected = replacePinnedVersions(predecessor.rows[0]?.payload, replacements);
    const changes = changedPaths(predecessor.rows[0]?.payload, row.payload);
    if (
      canonicalResultDigest(expected) !== canonicalResultDigest(row.payload)
      || changes.length !== 5 || changes.some((change) => !change.endsWith("mediaVersionId"))
    ) {
      throw new Error("Task 317 clearance successor changed content beyond the five authorized media-version pins.");
    }
  } else if (changedPaths(row.source_payload, row.payload).join("|") !== "content.thesis") {
    throw new Error("Task 317 prepared UAE successor changed content beyond the authorized thesis.");
  }
  const localRows = await client.query(
    `SELECT e.id::text edition_id,e.market,e.locale,e.publication_state,e.content_mode,e.published_revision_id::text,
            latest.id::text revision_id,latest.workflow_state,latest.source_revision_id::text source_revision_id,latest.payload
       FROM cms_market_editions e
       JOIN LATERAL (
         SELECT * FROM cms_revisions WHERE edition_id=e.id
          ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
       ) latest ON true
      WHERE e.document_id=$1 AND e.market=ANY($2::text[]) FOR UPDATE OF e,latest`,
    [DOCUMENT_ID, ["europe", "ksa", "turkiye"]],
  );
  if (
    localRows.rowCount !== 3
    || localRows.rows.some((local) => {
      const expected = localizedDrafts.find((draft: any) => draft.market === local.market);
      return !expected || expected.editionId !== local.edition_id || expected.revisionId !== local.revision_id
        || local.publication_state !== "draft" || local.content_mode !== "custom"
        || local.published_revision_id !== null || local.workflow_state !== "draft"
        || local.source_revision_id !== (expected.previousRevisionId ?? uaeRevisionId)
        || !Array.isArray(local.payload?.markets) || local.payload.markets[0] !== local.market
        || local.payload?.content?.bankingPov?.market !== local.market
        || foreignRegionalMarkers(local.payload, local.market).length !== 0;
    })
  ) {
    throw new Error("Task 317 prepared localized drafts are no longer the exact latest isolated drafts; preserving newer local editorial work.");
  }
  await client.query("LOCK TABLE market_editions IN SHARE MODE");
  const configured = await client.query(
    `SELECT m.id::text id,m.code,configured_locale.locale
       FROM market_editions m
       CROSS JOIN LATERAL (
         SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
          WHERE locale IS NOT NULL
       ) configured_locale
      WHERE m.enabled=true ORDER BY m.code,configured_locale.locale FOR UPDATE OF m`,
  );
  const markets = configured.rows as Market[];
  if (
    markets.length !== 4
    || markets.some((market) => !["europe", "ksa", "turkiye", "uae"].includes(market.code) || market.locale !== "en")
  ) {
    throw new Error("Enabled market configuration changed; reopen the full Task 317 destination review.");
  }
  return {
    row,
    latest: { id: row.revision_id, revision_number: row.revision_number, workflow_state: row.workflow_state },
    markets,
    publishedPayload: row.payload as Record<string, any>,
    candidateDigest: canonicalResultDigest(row.payload),
    localized: localizedDrafts,
    uaeRevisionId,
    localizedDrafts,
  };
}

async function clearSupportingImageRights(keepPoolOpen = false) {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Task 317 media clearance is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [CLEARANCE_RECEIPT_KEY]);
    const prior = await client.query(
      `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [CLEARANCE_RECEIPT_KEY],
    );
    if (prior.rowCount) {
      if (prior.rows[0].operation !== CLEARANCE_OPERATION || prior.rows[0].subject_id !== DOCUMENT_ID) {
        throw new Error("Task 317 media-clearance receipt conflicts with this document.");
      }
      const audit = await client.query(
        `SELECT metadata FROM cms_audit_events WHERE request_id=$1 FOR SHARE`,
        [`${CLEARANCE_RECEIPT_KEY}:complete`],
      );
      if (!audit.rowCount) throw new Error("Task 317 media-clearance receipt lacks its audit evidence.");
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        task: TASK,
        mode: "media-clearance",
        disposition: "replayed",
        receiptKey: CLEARANCE_RECEIPT_KEY,
        originalEvidence: audit.rows[0].metadata,
      };
    }
    const prepared = await readPreparedPublicationPlan(client);
    if (!prepared || prepared.uaeRevisionId !== String((await client.query(
      `SELECT metadata->>'uaeDraftRevisionId' id FROM cms_audit_events WHERE request_id=$1`,
      [`${DRAFT_RECEIPT_KEY}:uae`],
    )).rows[0]?.id ?? "")) {
      throw new Error("Task 317 must have its exact prepared UAE thesis draft before supporting-image clearance.");
    }
    const predecessorUaeRevisionId = prepared.uaeRevisionId;
    const before = prepared.publishedPayload;
    const beforePins = await assertImmutableMediaPins(client, predecessorUaeRevisionId, before, false);
    const supporting = beforePins.filter((pin) => pin.mediaVersionId !== "7753ca81-860c-440c-b3ae-8a156c2de516");
    if (supporting.length !== 5) throw new Error("Task 317 expected exactly five non-hero supporting image pins.");
    const mediaRows = await client.query(
      `SELECT ref.asset_id::text asset_id,ref.media_version_id::text media_version_id,
              a.status,a.media_type,a.alt_text,v.version_number,v.storage_key,v.checksum,v.byte_size,v.width,v.height,v.metadata
         FROM cms_media_references ref
         JOIN cms_media_assets a ON a.id=ref.asset_id
         JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
        WHERE ref.document_id=$1 AND ref.field_path=$2 FOR UPDATE OF a,v`,
      [DOCUMENT_ID, `revision:${predecessorUaeRevisionId}`],
    );
    if (
      mediaRows.rowCount !== 6
      || mediaRows.rows.some((row) => !["active", "ready"].includes(String(row.status))
        || !String(row.media_type).startsWith("image/") || !String(row.alt_text ?? "").trim()
        || !Number(row.width) || !Number(row.height))
    ) {
      throw new Error("Supporting-image clearance requires active image assets with verified dimensions and non-empty alt text.");
    }
    const service = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status)
       VALUES($1,'Task 317 CMS maintenance service','viewer','suspended')
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id::text`,
      [SERVICE_EMAIL],
    );
    const serviceId = String(service.rows[0].id);
    const pinReplacements: PinReplacement[] = [];
    for (const row of mediaRows.rows) {
      if (row.media_version_id === "7753ca81-860c-440c-b3ae-8a156c2de516") continue;
      const latest = await client.query(
        `SELECT id::text,storage_key,checksum,byte_size,width,height,metadata
           FROM cms_media_versions WHERE asset_id=$1
          ORDER BY version_number DESC LIMIT 1 FOR UPDATE`,
        [row.asset_id],
      );
      const approvedExisting = latest.rows[0];
      if (
        approvedExisting && approvedExisting.id !== row.media_version_id
        && ACCEPTED_MEDIA_RIGHTS_STATUSES.has(String(approvedExisting.metadata?.rightsStatus ?? ""))
      ) {
        if (
          approvedExisting.storage_key !== row.storage_key || approvedExisting.checksum !== row.checksum
          || Number(approvedExisting.byte_size) !== Number(row.byte_size)
          || Number(approvedExisting.width) !== Number(row.width) || Number(approvedExisting.height) !== Number(row.height)
        ) {
          throw new Error(`Existing approval version for ${row.asset_id} does not preserve the source binary identity.`);
        }
        pinReplacements.push({
          assetId: row.asset_id,
          priorMediaVersionId: row.media_version_id,
          mediaVersionId: approvedExisting.id,
        });
        await client.query(
          `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
           VALUES($1,'Task 317 CMS maintenance service','media.rights_clearance_confirmed','media',$2,$3,$4)`,
          [serviceId, row.asset_id, `${CLEARANCE_RECEIPT_KEY}:${row.asset_id}`, {
            task: TASK, priorMediaVersionId: row.media_version_id, approvedMediaVersionId: approvedExisting.id,
            ownerChatClearance: "Project owner confirmed the five supporting images are cleared for website use.",
            approvalVersionPreexisted: true, binaryIdentityPreserved: true,
            verifiedAltText: true, verifiedDimensions: { width: row.width, height: row.height },
          }],
        );
        continue;
      }
      if (approvedExisting && approvedExisting.id !== row.media_version_id) {
        throw new Error(`A newer unapproved version already exists for ${row.asset_id}; refusing to append a divergent approval version.`);
      }
      const metadata = row.metadata && typeof row.metadata === "object" ? structuredClone(row.metadata) : {};
      const approvedMetadata = {
        ...metadata,
        rightsStatus: "approved-use",
        sourceRightsClearance: {
          basis: "Project-owner chat confirmation for Task 317",
          statement: "Clear the five supporting Financial Services source images for website use.",
          scope: "website use",
          recordedBy: "Task 317 CMS maintenance service",
        },
        // Accessibility status is deliberately retained. This operation only
        // validates existing alt text and dimensions; it does not attest to an
        // accessibility review that the owner did not provide.
        accessibilityStatus: metadata.accessibilityStatus,
      };
      const appended = await client.query(
        `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         SELECT asset_id,version_number+1,storage_key,checksum,byte_size,width,height,$2::jsonb
           FROM cms_media_versions WHERE id=$1 RETURNING id::text,storage_key,checksum,byte_size,width,height`,
        [row.media_version_id, approvedMetadata],
      );
      if (appended.rowCount !== 1) throw new Error(`Could not append approval metadata version for ${row.asset_id}.`);
      const next = appended.rows[0];
      if (
        next.storage_key !== row.storage_key || next.checksum !== row.checksum
        || Number(next.byte_size) !== Number(row.byte_size) || Number(next.width) !== Number(row.width)
        || Number(next.height) !== Number(row.height)
      ) {
        throw new Error(`Approval version for ${row.asset_id} changed binary identity or dimensions.`);
      }
      pinReplacements.push({
        assetId: row.asset_id,
        priorMediaVersionId: row.media_version_id,
        mediaVersionId: next.id,
      });
      await client.query(
        `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
         VALUES($1,'Task 317 CMS maintenance service','media.rights_cleared','media',$2,$3,$4)`,
        [serviceId, row.asset_id, `${CLEARANCE_RECEIPT_KEY}:${row.asset_id}`, {
          task: TASK, priorMediaVersionId: row.media_version_id, approvedMediaVersionId: next.id,
          ownerChatClearance: "Project owner confirmed the five supporting images are cleared for website use.",
          existingAccessibilityStatus: metadata.accessibilityStatus ?? null,
          verifiedAltText: true, verifiedDimensions: { width: row.width, height: row.height },
          binaryIdentityPreserved: true,
        }],
      );
    }
    const replacements = new Map(pinReplacements.map((pin) => [pin.priorMediaVersionId, pin.mediaVersionId]));
    const candidate = replacePinnedVersions(before, replacements) as Record<string, any>;
    const valid = validateCmsSnapshot("industry", candidate, "publish");
    if (!valid.success) throw new Error(`Cleared UAE successor is not publication-ready: ${valid.errors.join("; ")}`);
    const changes = changedPaths(before, valid.data);
    if (changes.length !== 5 || changes.some((change) => !change.endsWith("mediaVersionId"))) {
      throw new Error(`Media-clearance successor changed fields beyond five authorized pin versions: ${changes.join(", ")}`);
    }
    const inserted = await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
       SELECT edition_id,revision_number+1,payload_version,$2,$3,'draft',$4,$5,id
         FROM cms_revisions WHERE id=$1 RETURNING id::text`,
      [predecessorUaeRevisionId, valid.data, digest(valid.data), serviceId,
        "Task 317: immutable UAE successor updates only five supporting-image pins to owner-cleared, binary-identical approval metadata versions."],
    );
    if (inserted.rowCount !== 1) throw new Error("Could not append the UAE pin-clearance successor.");
    const uaeClearanceRevisionId = String(inserted.rows[0].id);
    const finalPins = beforePins.map((pin) => ({
      assetId: pin.assetId,
      mediaVersionId: replacements.get(pin.mediaVersionId) ?? pin.mediaVersionId,
    }));
    for (const pin of finalPins) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES($1,$2,$3,$4)`,
        [pin.assetId, pin.mediaVersionId, DOCUMENT_ID, `revision:${uaeClearanceRevisionId}`],
      );
    }
    await assertImmutableMediaPins(client, uaeClearanceRevisionId, valid.data as Record<string, any>, true);
    const evidence = {
      task: TASK, operation: CLEARANCE_OPERATION, predecessorUaeRevisionId, uaeClearanceRevisionId,
      pinReplacements, heroPinUnchanged: beforePins.find((pin) => pin.assetId === "83037506-bfde-4473-84ad-4337aeaf34f6"),
      ownerChatClearance: "Yes—clear the images, update the pins, and publish UAE only.",
      accessibility: "No accessibility approval was invented; existing non-empty alt text and image dimensions were validated.",
      binaryIdentityPreserved: true,
    };
    await client.query(
      `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES($1,$2,$3,$4,$5)`,
      [CLEARANCE_RECEIPT_KEY, CLEARANCE_OPERATION, DOCUMENT_ID, digest(evidence), digest({ uaeClearanceRevisionId, pinReplacements })],
    );
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES($1,'Task 317 CMS maintenance service','document.media_pins_cleared','document',$2,$3,$4)`,
      [serviceId, DOCUMENT_ID, `${CLEARANCE_RECEIPT_KEY}:complete`, evidence],
    );
    await client.query("COMMIT");
    transactionOpen = false;
    return { mode: "media-clearance", disposition: "cleared-five-supporting-images", receiptKey: CLEARANCE_RECEIPT_KEY, ...evidence };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    if (!keepPoolOpen) await pool.end();
  }
}

async function execute() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Task 317 is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [RECEIPT_KEY]);
    const receipt = await client.query(
      `SELECT operation,subject_id::text,request_digest,result_digest
         FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [RECEIPT_KEY],
    );
    if (receipt.rowCount) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        task: TASK,
        mode: "apply",
        disposition: "replayed",
        receiptKey: RECEIPT_KEY,
        action: "The Task 317 release was already recorded; no revision, pin, destination or localized draft was changed.",
      };
    }
    const prepared = await readPreparedPublicationPlan(client);
    const plan = prepared ?? await readPlan(client);
    const resumingPreparedDrafts = Boolean(prepared);
    const publicationRevisionId = prepared?.uaeRevisionId ?? AUTHORIZED_DRAFT_REVISION_ID;
    let pins: Pin[];
    try {
      pins = await assertImmutableMediaPins(client, publicationRevisionId, plan.publishedPayload, true);
    } catch (error) {
      if (error instanceof CmsGovernanceBlockError) {
        error.details.authorizedDraftRevisionId = publicationRevisionId;
        error.details.previousPublishedRevisionId = PREVIOUS_PUBLISHED_REVISION_ID;
        error.details.plannedThesis = FINANCIAL_SERVICES_GOVERNED_THESIS;
        error.details.changedPathsFromAuthorizedDraft = ["content.thesis"];
        error.details.localizedDraftMarkets = resumingPreparedDrafts
          ? prepared!.localizedDrafts.map((item: any) => item.market)
          : plan.localized.map((item: any) => item.market.code);
        error.details.destinationPlan = plan.markets.map((market) => ({
          market: market.code,
          locale: market.locale,
          decision: market.code === "uae" ? "show" : "off",
        }));
      }
      throw error;
    }

    const existingLocalized = !resumingPreparedDrafts ? await client.query(
      `SELECT e.market,e.locale,e.id::text edition_id,
              latest.id::text latest_revision_id,latest.revision_number
         FROM cms_market_editions e
         LEFT JOIN LATERAL (
           SELECT id,revision_number FROM cms_revisions
            WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
         ) latest ON true
        WHERE e.document_id=$1 AND e.market=ANY($2::text[])
        FOR UPDATE OF e`,
      [DOCUMENT_ID, ["europe", "ksa", "turkiye"]],
    ) : null;
    if (existingLocalized?.rowCount) {
      throw new Error("A localized Financial Services edition already exists; refusing to overwrite newer local draft work.");
    }
    const service = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status)
       VALUES($1,'Task 317 CMS maintenance service','viewer','suspended')
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id::text`,
      [SERVICE_EMAIL],
    );
    const serviceId = String(service.rows[0].id);
    const nextRevision = !resumingPreparedDrafts ? await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
       VALUES($1,$2,$3,$4,$5,'draft',$6,$7,$8)
       RETURNING id::text`,
      [
        UAE_EDITION_ID,
        Number(plan.latest.revision_number) + 1,
        Number(plan.row.payload_version),
        plan.publishedPayload,
        digest(plan.publishedPayload),
        serviceId,
        "Task 317: chat-approved UAE-only publication candidate; changes only the governed thesis from the latest draft.",
        AUTHORIZED_DRAFT_REVISION_ID,
      ],
    ) : null;
    const uaeRevisionId = resumingPreparedDrafts
      ? prepared!.uaeRevisionId
      : String(nextRevision!.rows[0].id);
    if (!resumingPreparedDrafts) for (const pin of pins) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
         VALUES($1,$2,$3,$4)`,
        [pin.assetId, pin.mediaVersionId, DOCUMENT_ID, `revision:${uaeRevisionId}`],
      );
    }
    const localizedDrafts: Array<any> = resumingPreparedDrafts ? [...prepared!.localizedDrafts] : [];
    if (!resumingPreparedDrafts) for (const local of plan.localized as Array<any>) {
      const edition = await client.query(
        `INSERT INTO cms_market_editions
          (document_id,market,locale,editorial_market,localized_slug,publication_state,fallback_mode,content_mode,
           customized_from_revision_id,parity_complete)
         VALUES($1,$2,$3,$2,'financial-services','draft','none','custom',$4,false)
         RETURNING id::text`,
        [DOCUMENT_ID, local.market.code, local.market.locale, uaeRevisionId],
      );
      const localEditionId = String(edition.rows[0].id);
      const revision = await client.query(
        `INSERT INTO cms_revisions
          (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
          VALUES($1,1,$2,$3,$4,'draft',$5,$6,$7)
         RETURNING id::text`,
        [
          localEditionId,
          Number(plan.row.payload_version),
          local.payload,
          digest(local.payload),
          serviceId,
          `Task 317: ${local.market.code} localized Financial Services draft; unpublished and awaiting local editorial, legal and risk review.`,
          uaeRevisionId,
        ],
      );
      const localRevisionId = String(revision.rows[0].id);
      for (const pin of pins) {
        await client.query(
          `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
           VALUES($1,$2,$3,$4)`,
          [pin.assetId, pin.mediaVersionId, DOCUMENT_ID, `revision:${localRevisionId}`],
        );
      }
      localizedDrafts.push({
        market: local.market.code,
        locale: local.market.locale,
        editionId: localEditionId,
        revisionId: localRevisionId,
        candidateDigest: local.digest,
      });
    }

    // Equivalent to save → submit → source selection → destination stage →
    // availability review → publisher approval. The chat request supplies
    // editorial approval only; media approval was checked above and cannot be
    // inferred here.
    const submitted = await client.query(
      `UPDATE cms_revisions SET workflow_state='in-review'
        WHERE id=$1 AND workflow_state='draft'`,
      [uaeRevisionId],
    );
    if (submitted.rowCount !== 1) throw new Error("The UAE candidate was not available for the required submit transition.");
    const sourceSelected = await client.query(
      `UPDATE cms_document_availability_states
          SET draft_version=draft_version+1,shared_source_revision_id=$2,
              reviewed_version=NULL,reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
              updated_by_user_id=$3,updated_at=now()
        WHERE document_id=$1
        RETURNING draft_version`,
      [DOCUMENT_ID, uaeRevisionId, serviceId],
    );
    if (sourceSelected.rowCount !== 1) throw new Error("Could not bind the new UAE revision as the shared source.");
    const selections = plan.markets.map((market) => ({
      marketEditionId: market.id,
      locale: market.locale,
      decision: market.code === "uae" ? "show" : "off",
    }));
    for (const selection of selections) {
      await client.query(
        `INSERT INTO cms_document_market_availability
          (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
         VALUES($1,$2,$3,'off',$4,$5)
         ON CONFLICT(document_id,market_edition_id,locale) DO UPDATE
           SET draft_decision=EXCLUDED.draft_decision,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()`,
        [DOCUMENT_ID, selection.marketEditionId, selection.locale, selection.decision, serviceId],
      );
    }
    const staged = await client.query(
      `UPDATE cms_document_availability_states
          SET draft_version=draft_version+1,reviewed_version=NULL,
              reviewed_selections='[]'::jsonb,reviewed_source_revision_id=NULL,
              updated_by_user_id=$2,updated_at=now()
        WHERE document_id=$1
        RETURNING draft_version`,
      [DOCUMENT_ID, serviceId],
    );
    if (staged.rowCount !== 1) throw new Error("Could not stage the UAE-only destination selection.");
    const reviewed = await client.query(
      `UPDATE cms_document_availability_states
          SET reviewed_version=draft_version,reviewed_selections=$2::jsonb,
              reviewed_source_revision_id=shared_source_revision_id,
              reviewed_by_user_id=$3,reviewed_at=now(),updated_at=now()
        WHERE document_id=$1 AND shared_source_revision_id=$4
        RETURNING reviewed_version`,
      [DOCUMENT_ID, JSON.stringify(selections), serviceId, uaeRevisionId],
    );
    if (reviewed.rowCount !== 1) throw new Error("Could not review the exact UAE source and complete destination selection.");
    const approved = await client.query(
      `UPDATE cms_revisions
          SET workflow_state='approved',approved_by_user_id=$2,approved_at=now()
        WHERE id=$1 AND workflow_state='in-review'`,
      [uaeRevisionId, serviceId],
    );
    if (approved.rowCount !== 1) throw new Error("The UAE candidate was not available for the required approved transition.");
    const publishedEdition = await client.query(
      `UPDATE cms_market_editions
          SET publication_state='published',published_revision_id=$2,published_at=now(),updated_at=now()
        WHERE id=$1`,
      [UAE_EDITION_ID, uaeRevisionId],
    );
    if (publishedEdition.rowCount !== 1) throw new Error("Could not advance the UAE edition's published pointer.");
    for (const selection of selections) {
      await client.query(
        `INSERT INTO cms_document_market_availability
          (document_id,market_edition_id,locale,published_decision,draft_decision,published_by_user_id,published_at)
         VALUES($1,$2,$3,$4,NULL,$5,now())
         ON CONFLICT(document_id,market_edition_id,locale) DO UPDATE
           SET published_decision=EXCLUDED.published_decision,draft_decision=NULL,
               published_by_user_id=EXCLUDED.published_by_user_id,published_at=now(),updated_at=now()`,
        [DOCUMENT_ID, selection.marketEditionId, selection.locale, selection.decision, serviceId],
      );
    }
    const releasedState = await client.query(
      `UPDATE cms_document_availability_states
          SET published_version=$2,published_source_revision_id=$3,published_by_user_id=$4,published_at=now(),updated_at=now()
        WHERE document_id=$1 AND reviewed_version=$2 AND reviewed_source_revision_id=$3`,
      [DOCUMENT_ID, Number(reviewed.rows[0].reviewed_version), uaeRevisionId, serviceId],
    );
    if (releasedState.rowCount !== 1) throw new Error("Could not atomically release the reviewed UAE source and destination selection.");
    const uaeReadback = await client.query(
      `SELECT e.published_revision_id::text published_revision_id,r.workflow_state,
              state.shared_source_revision_id::text shared_source_revision_id,
              state.published_source_revision_id::text published_source_revision_id
         FROM cms_market_editions e
         JOIN cms_revisions r ON r.id=e.published_revision_id
         JOIN cms_document_availability_states state ON state.document_id=e.document_id
        WHERE e.id=$1 FOR KEY SHARE`,
      [UAE_EDITION_ID],
    );
    const uae = uaeReadback.rows[0];
    if (
      !uae || uae.published_revision_id !== uaeRevisionId || uae.workflow_state !== "approved"
      || uae.shared_source_revision_id !== uaeRevisionId || uae.published_source_revision_id !== uaeRevisionId
    ) {
      throw new Error("UAE publication readback did not resolve to the exact reviewed Task 317 revision.");
    }
    const destinationReadback = await client.query(
      `SELECT market.code,availability.locale,availability.published_decision
         FROM cms_document_market_availability availability
         JOIN market_editions market ON market.id=availability.market_edition_id
        WHERE availability.document_id=$1 AND availability.market_edition_id::text=ANY($2::text[])`,
      [DOCUMENT_ID, selections.map((selection) => selection.marketEditionId)],
    );
    const publishedDestination = new Map(destinationReadback.rows.map((item) =>
      [`${item.code}/${item.locale}`, item.published_decision],
    ));
    if (
      publishedDestination.size !== selections.length
      || selections.some((selection) =>
        publishedDestination.get(`${plan.markets.find((market) => market.id === selection.marketEditionId)!.code}/${selection.locale}`)
          !== selection.decision)
    ) {
      throw new Error("Destination release readback does not prove UAE show and all non-UAE destinations off.");
    }
    const uaePins = await client.query(
      `SELECT asset_id::text asset_id,media_version_id::text media_version_id
         FROM cms_media_references WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id`,
      [DOCUMENT_ID, `revision:${uaeRevisionId}`],
    );
    if (
      uaePins.rowCount !== pins.length
      || uaePins.rows.some((pin) => !pins.some((expected) =>
        expected.assetId === pin.asset_id && expected.mediaVersionId === pin.media_version_id))
    ) {
      throw new Error("UAE publication readback did not preserve the six source pins byte-for-byte.");
    }
    const localReadback = await client.query(
      `SELECT e.id::text edition_id,e.market,e.locale,e.publication_state,e.content_mode,
              e.published_revision_id::text published_revision_id,r.id::text revision_id,r.workflow_state,r.payload
         FROM cms_market_editions e
         JOIN cms_revisions r ON r.edition_id=e.id
         WHERE e.id::text=ANY($1::text[]) AND r.id::text=ANY($2::text[])`,
       [localizedDrafts.map((draft) => draft.editionId), localizedDrafts.map((draft) => draft.revisionId)],
    );
    if (
      localReadback.rowCount !== localizedDrafts.length
      || localReadback.rows.some((local) =>
        local.publication_state !== "draft" || local.content_mode !== "custom"
        || local.published_revision_id !== null || local.workflow_state !== "draft"
        || !Array.isArray(local.payload?.markets) || local.payload.markets.length !== 1
        || local.payload.markets[0] !== local.market || local.payload?.content?.bankingPov?.market !== local.market)
    ) {
      throw new Error("Localized-edition readback did not preserve independent unpublished custom drafts.");
    }
    const nonUaePublished = await client.query(
      `SELECT 1 FROM cms_market_editions
        WHERE document_id=$1 AND market<>'uae' AND publication_state='published' LIMIT 1`,
      [DOCUMENT_ID],
    );
    if (nonUaePublished.rowCount) throw new Error("A non-UAE Financial Services edition was unexpectedly published.");
    const requestDigest = digest({
      task: TASK,
      documentId: DOCUMENT_ID,
      authorizedDraftRevisionId: AUTHORIZED_DRAFT_REVISION_ID,
      exactThesis: FINANCIAL_SERVICES_GOVERNED_THESIS,
      destinations: selections,
    });
    const result = {
      uaeRevisionId,
      uaeCandidateDigest: plan.candidateDigest,
      pins,
      localizedDrafts,
      destinations: selections,
    };
    await client.query(
      `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES($1,$2,$3,$4,$5)`,
      [RECEIPT_KEY, OPERATION, DOCUMENT_ID, requestDigest, digest(result)],
    );
    const provenance = {
      task: TASK,
      serviceAttribution: "Task 317 CMS maintenance service",
      chatApproval:
        "Project-owner chat instruction: then publish it only for uae and prepare versions for the other geos.",
      editorialApprovalBasis: "replit.md user preference: explicit project-owner publish instruction is editorial approval.",
      authorizedDraftRevisionId: AUTHORIZED_DRAFT_REVISION_ID,
      previousPublishedRevisionId: PREVIOUS_PUBLISHED_REVISION_ID,
      publishedRevisionId: uaeRevisionId,
      thesis: FINANCIAL_SERVICES_GOVERNED_THESIS,
      changedPathsFromAuthorizedDraft: ["content.thesis"],
      immutablePins: pins,
      localizedDrafts,
      destinations: selections,
      publicationScope: "UAE/en only; Europe, KSA and Türkiye are explicit off destinations with unpublished custom drafts.",
    };
    for (const [action, metadata] of [
      ["document.submitted", { revisionId: uaeRevisionId, market: "uae", locale: "en", ...provenance }],
      ["document.availability.source_selected", { version: Number(sourceSelected.rows[0].draft_version), sourceRevisionId: uaeRevisionId }],
      ["document.availability.staged", { version: Number(staged.rows[0].draft_version), destinations: selections }],
      ["document.availability.reviewed", { version: Number(reviewed.rows[0].reviewed_version), destinations: selections }],
      ["document.published", provenance],
    ] as const) {
      await client.query(
        `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
         VALUES($1,'Task 317 CMS maintenance service',$2,'document',$3,$4,$5)`,
        [serviceId, action, DOCUMENT_ID, `${RECEIPT_KEY}:${action}`, metadata],
      );
    }
    await client.query("COMMIT");
    transactionOpen = false;
    return {
      task: TASK,
      mode: "apply",
      disposition: "published-uae-and-created-local-drafts",
      receiptKey: RECEIPT_KEY,
      requestDigest,
      ...result,
      verification: {
        uae: "Published source and approved immutable pins are bound to the Task 317 revision.",
        otherMarkets: "Europe, KSA and Türkiye have only custom draft editions and explicit off published destination decisions.",
        note: "This maintenance job does not start or probe an API server; public endpoint verification remains an external API operation.",
      },
    };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function reconcileLocalizedDraftIsolation() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Task 317 localized-draft reconciliation is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DRAFT_RECONCILIATION_RECEIPT_KEY]);
    const publishedReceipt = await client.query(
      `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [RECEIPT_KEY],
    );
    if (publishedReceipt.rowCount) {
      if (publishedReceipt.rows[0].operation !== OPERATION || publishedReceipt.rows[0].subject_id !== DOCUMENT_ID) {
        throw new Error("Task 317 publication receipt conflicts with this document.");
      }
      const publishedAudit = await client.query(
        `SELECT metadata FROM cms_audit_events WHERE request_id=$1 FOR SHARE`,
        [`${RECEIPT_KEY}:document.published`],
      );
      const evidence = publishedAudit.rows[0]?.metadata as Record<string, any> | undefined;
      const publishedRevisionId = String(evidence?.publishedRevisionId ?? "");
      const released = await client.query(
        `SELECT e.published_revision_id::text published_revision_id,r.workflow_state,
                state.shared_source_revision_id::text shared_source_revision_id,
                state.published_source_revision_id::text published_source_revision_id
           FROM cms_market_editions e
           JOIN cms_revisions r ON r.id=e.published_revision_id
           JOIN cms_document_availability_states state ON state.document_id=e.document_id
          WHERE e.id=$1 FOR KEY SHARE`,
        [UAE_EDITION_ID],
      );
      const nonUae = await client.query(
        `SELECT 1 FROM cms_market_editions WHERE document_id=$1 AND market<>'uae' AND publication_state='published' LIMIT 1`,
        [DOCUMENT_ID],
      );
      if (
        !publishedRevisionId || !released.rowCount || released.rows[0].published_revision_id !== publishedRevisionId
        || released.rows[0].workflow_state !== "approved" || released.rows[0].shared_source_revision_id !== publishedRevisionId
        || released.rows[0].published_source_revision_id !== publishedRevisionId || nonUae.rowCount
      ) {
        throw new Error("Task 317 published receipt no longer matches the exact UAE-only release; refusing post-merge reconciliation.");
      }
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        task: TASK,
        mode: "localized-draft-reconciliation",
        disposition: "published-release-verified",
        receiptKey: RECEIPT_KEY,
        action: "The recorded UAE-only release remains exact; no post-merge draft mutation was attempted.",
      };
    }
    const completed = await client.query(
      `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [DRAFT_RECONCILIATION_RECEIPT_KEY],
    );
    if (completed.rowCount) {
      if (
        completed.rows[0].operation !== DRAFT_RECONCILIATION_OPERATION
        || completed.rows[0].subject_id !== DOCUMENT_ID
      ) {
        throw new Error("Task 317 localized-draft reconciliation receipt conflicts with this document or operation.");
      }
      const audit = await client.query(
        `SELECT metadata FROM cms_audit_events WHERE request_id=$1`,
        [`${DRAFT_RECONCILIATION_RECEIPT_KEY}:complete`],
      );
      const metadata = audit.rows[0]?.metadata as Record<string, any> | undefined;
      const revised = Array.isArray(metadata?.correctedDrafts) ? metadata.correctedDrafts : [];
      if (!metadata || revised.length !== 3) {
        throw new Error("Task 317 localized-draft reconciliation receipt lacks complete audit evidence.");
      }
      const latest = await client.query(
        `SELECT e.market,r.id::text revision_id,r.workflow_state,r.payload
           FROM cms_market_editions e
           JOIN LATERAL (
             SELECT id,workflow_state,payload FROM cms_revisions
              WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
           ) r ON true
          WHERE e.document_id=$1 AND e.market=ANY($2::text[])`,
        [DOCUMENT_ID, ["europe", "ksa", "turkiye"]],
      );
      if (
        latest.rowCount !== 3
        || latest.rows.some((row) => {
          const expected = revised.find((draft: any) => draft.market === row.market);
          return !expected || expected.revisionId !== row.revision_id || row.workflow_state !== "draft"
            || foreignRegionalMarkers(row.payload, row.market).length !== 0;
        })
      ) {
        throw new Error("Task 317 localized draft has newer or altered editorial work; refusing to replay over it.");
      }
      const expectedPins = Array.isArray(metadata.immutablePins) ? metadata.immutablePins : [];
      const copiedPins = await client.query(
        `SELECT asset_id::text asset_id,media_version_id::text media_version_id
           FROM cms_media_references
          WHERE document_id=$1 AND field_path=ANY($2::text[])`,
        [DOCUMENT_ID, revised.map((draft: any) => `revision:${draft.revisionId}`)],
      );
      if (
        expectedPins.length !== 6 || copiedPins.rowCount !== 18
        || copiedPins.rows.some((pin) => !expectedPins.some((expected: any) =>
          expected.assetId === pin.asset_id && expected.mediaVersionId === pin.media_version_id))
      ) {
        throw new Error("Task 317 localized draft pin evidence no longer matches; refusing to replay over altered media.");
      }
      const live = await client.query(
        `SELECT e.published_revision_id::text published_revision_id,latest.id::text latest_revision_id,latest.workflow_state,
                state.shared_source_revision_id::text shared_source_revision_id,
                state.published_source_revision_id::text published_source_revision_id,
                state.draft_version,state.reviewed_version,state.published_version
           FROM cms_market_editions e
           JOIN cms_document_availability_states state ON state.document_id=e.document_id
           JOIN LATERAL (
             SELECT id,workflow_state FROM cms_revisions WHERE edition_id=e.id
              ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
           ) latest ON true
          WHERE e.id=$1 FOR KEY SHARE`,
        [UAE_EDITION_ID],
      );
      if (
        !live.rowCount || live.rows[0].published_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
        || live.rows[0].latest_revision_id !== metadata.uaeDraftRevisionId || live.rows[0].workflow_state !== "draft"
        || live.rows[0].shared_source_revision_id !== AUTHORIZED_DRAFT_REVISION_ID
        || live.rows[0].published_source_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
        || Number(live.rows[0].draft_version) !== 0 || live.rows[0].reviewed_version !== null
        || Number(live.rows[0].published_version) !== 0
      ) {
        throw new Error("Task 317 reconciliation found newer live publication or availability state; refusing to replay.");
      }
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        task: TASK,
        mode: "localized-draft-reconciliation",
        disposition: "replayed",
        receiptKey: DRAFT_RECONCILIATION_RECEIPT_KEY,
        originalEvidence: metadata,
      };
    }
    const preparationReceipt = await client.query(
      `SELECT operation,subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [DRAFT_RECEIPT_KEY],
    );
    if (!preparationReceipt.rowCount) {
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        task: TASK,
        mode: "localized-draft-reconciliation",
        disposition: "not-initialized",
        action: "No Task 317 draft-preparation receipt exists in this environment. No work was silently reconciled; explicitly run --prepare-drafts after confirming the current source baseline.",
      };
    }
    if (
      preparationReceipt.rows[0].operation !== DRAFT_OPERATION
      || preparationReceipt.rows[0].subject_id !== DOCUMENT_ID
    ) {
      throw new Error("Task 317 initial draft receipt conflicts with this document or operation.");
    }
    const preparationAudit = await client.query(
      `SELECT metadata FROM cms_audit_events WHERE request_id=$1 FOR SHARE`,
      [`${DRAFT_RECEIPT_KEY}:uae`],
    );
    const prepared = preparationAudit.rows[0]?.metadata as Record<string, any> | undefined;
    const originalDrafts = Array.isArray(prepared?.localizedDrafts) ? prepared.localizedDrafts : [];
    const uaeDraftRevisionId = String(prepared?.uaeDraftRevisionId ?? "");
    if (
      !prepared || !uaeDraftRevisionId || originalDrafts.length !== 3
      || !originalDrafts.every((draft: any) => typeof draft?.editionId === "string" && typeof draft?.revisionId === "string")
    ) {
      throw new Error("Task 317 initial draft receipt is missing; localized reconciliation will not infer or overwrite draft authority.");
    }
    const uae = await client.query(
      `SELECT e.publication_state,e.published_revision_id::text published_revision_id,
              latest.id::text latest_revision_id,latest.workflow_state
         FROM cms_market_editions e
         JOIN LATERAL (
           SELECT id,workflow_state FROM cms_revisions WHERE edition_id=e.id
            ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
         ) latest ON true
        WHERE e.id=$1 FOR KEY SHARE`,
      [UAE_EDITION_ID],
    );
    if (
      !uae.rowCount || uae.rows[0].publication_state !== "published"
      || uae.rows[0].published_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
      || uae.rows[0].latest_revision_id !== uaeDraftRevisionId || uae.rows[0].workflow_state !== "draft"
    ) {
      throw new Error("UAE draft/publication authority changed after preparation; refusing localized correction.");
    }
    const locals = await client.query(
      `SELECT e.id::text edition_id,e.market,e.locale,e.publication_state,e.content_mode,
              r.id::text revision_id,r.revision_number,r.payload_version,r.payload,r.workflow_state,
              r.source_revision_id::text source_revision_id
         FROM cms_market_editions e
         JOIN cms_revisions r ON r.edition_id=e.id
        WHERE e.document_id=$1 AND e.market=ANY($2::text[])
          AND r.revision_number=(SELECT max(x.revision_number) FROM cms_revisions x WHERE x.edition_id=e.id)
        FOR UPDATE OF e,r`,
      [DOCUMENT_ID, ["europe", "ksa", "turkiye"]],
    );
    if (
      locals.rowCount !== 3
      || locals.rows.some((local) => {
        const original = originalDrafts.find((draft: any) => draft.market === local.market);
        return !original || original.editionId !== local.edition_id || original.revisionId !== local.revision_id
          || local.publication_state !== "draft" || local.content_mode !== "custom"
          || local.workflow_state !== "draft" || local.source_revision_id !== uaeDraftRevisionId;
      })
    ) {
      throw new Error("Localized draft authority changed after preparation; refusing to replace newer editorial work.");
    }
    const uaePayload = await client.query(
      "SELECT payload FROM cms_revisions WHERE id=$1 FOR KEY SHARE",
      [uaeDraftRevisionId],
    );
    const pins = await assertImmutableMediaPins(client, uaeDraftRevisionId, uaePayload.rows[0]?.payload, false);
    const corrections = locals.rows.map((local) => {
      const market = String(local.market) as "europe" | "ksa" | "turkiye";
      const candidate = localizedPayload(local.payload, market);
      const valid = validateCmsSnapshot("industry", candidate, "draft");
      if (!valid.success) throw new Error(`${market} corrected localized draft is invalid: ${valid.errors.join("; ")}`);
      const changed = changedPaths(local.payload, valid.data);
      if (
        changed.length !== 2
        || !changed.includes("content.sources")
        || !changed.includes("content.bankingPov.evidenceSignals")
      ) {
        throw new Error(`${market} corrective successor would change fields beyond its market-isolation source trail: ${changed.join(", ")}`);
      }
      assertMarketIsolation(valid.data as Record<string, any>, market);
      return { local, market, payload: valid.data, digest: canonicalResultDigest(valid.data) };
    });
    const service = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status)
       VALUES($1,'Task 317 CMS maintenance service','viewer','suspended')
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id::text`,
      [SERVICE_EMAIL],
    );
    const serviceId = String(service.rows[0].id);
    const correctedDrafts: Array<{
      market: "europe" | "ksa" | "turkiye";
      locale: string;
      editionId: string;
      previousRevisionId: string;
      revisionId: string;
      changedPaths: string[];
      candidateDigest: string;
    }> = [];
    for (const correction of corrections) {
      const inserted = await client.query(
        `INSERT INTO cms_revisions
          (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
         VALUES($1,$2,$3,$4,$5,'draft',$6,$7,$8)
         RETURNING id::text`,
        [
          correction.local.edition_id,
          Number(correction.local.revision_number) + 1,
          Number(correction.local.payload_version),
          correction.payload,
          digest(correction.payload),
          serviceId,
          `Task 317: ${correction.market} corrective draft successor removes foreign regional wording from source-linked evidence; remains unpublished.`,
          correction.local.revision_id,
        ],
      );
      const revisionId = String(inserted.rows[0].id);
      for (const pin of pins) {
        await client.query(
          `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
           VALUES($1,$2,$3,$4)`,
          [pin.assetId, pin.mediaVersionId, DOCUMENT_ID, `revision:${revisionId}`],
        );
      }
      correctedDrafts.push({
        market: correction.market,
        locale: correction.local.locale,
        editionId: correction.local.edition_id,
        previousRevisionId: correction.local.revision_id,
        revisionId,
        changedPaths: ["content.sources", "content.bankingPov.evidenceSignals"],
        candidateDigest: correction.digest,
      });
    }
    const readback = await client.query(
      `SELECT e.market,e.publication_state,e.content_mode,e.published_revision_id::text published_revision_id,
              r.id::text revision_id,r.workflow_state,r.payload
         FROM cms_market_editions e
         JOIN LATERAL (
           SELECT id,workflow_state,payload FROM cms_revisions WHERE edition_id=e.id
            ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
         ) r ON true
        WHERE e.document_id=$1 AND e.market=ANY($2::text[])`,
      [DOCUMENT_ID, ["europe", "ksa", "turkiye"]],
    );
    if (
      readback.rowCount !== 3
      || readback.rows.some((local) => {
        const expected = correctedDrafts.find((draft) => draft.market === local.market);
        return !expected || local.revision_id !== expected.revisionId || local.workflow_state !== "draft"
          || local.publication_state !== "draft" || local.content_mode !== "custom"
          || local.published_revision_id !== null
          || foreignRegionalMarkers(local.payload, local.market).length !== 0;
      })
    ) {
      throw new Error("Corrected local-draft readback did not retain isolated unpublished successors.");
    }
    for (const corrected of correctedDrafts) {
      const copied = await client.query(
        `SELECT asset_id::text asset_id,media_version_id::text media_version_id
           FROM cms_media_references WHERE document_id=$1 AND field_path=$2`,
        [DOCUMENT_ID, `revision:${corrected.revisionId}`],
      );
      if (
        copied.rowCount !== pins.length
        || copied.rows.some((pin) => !pins.some((source) =>
          source.assetId === pin.asset_id && source.mediaVersionId === pin.media_version_id))
      ) {
        throw new Error(`Corrected ${corrected.market} draft did not preserve its immutable media pins.`);
      }
    }
    const requestDigest = digest({
      task: TASK,
      operation: DRAFT_RECONCILIATION_OPERATION,
      uaeDraftRevisionId,
      correctedDrafts: correctedDrafts.map((draft) => ({
        market: draft.market,
        previousRevisionId: draft.previousRevisionId,
        changedPaths: draft.changedPaths,
      })),
    });
    await client.query(
      `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES($1,$2,$3,$4,$5)`,
      [DRAFT_RECONCILIATION_RECEIPT_KEY, DRAFT_RECONCILIATION_OPERATION, DOCUMENT_ID, requestDigest, digest(correctedDrafts)],
    );
    const auditEvidence = {
      task: TASK,
      operation: DRAFT_RECONCILIATION_OPERATION,
      uaeDraftRevisionId,
      correctedDrafts,
      reason: "Corrected an inherited UK qualification that said 'not a UAE ... estimate'; historic drafts were preserved and no live pointer or availability was changed.",
      immutablePins: pins,
      publication: "Not attempted; normal publication media governance remains fail-closed.",
    };
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES($1,'Task 317 CMS maintenance service','document.localized_drafts_reconciled','document',$2,$3,$4)`,
      [serviceId, DOCUMENT_ID, `${DRAFT_RECONCILIATION_RECEIPT_KEY}:complete`, auditEvidence],
    );
    await client.query("COMMIT");
    transactionOpen = false;
    return {
      mode: "localized-draft-reconciliation",
      disposition: "created-corrective-unpublished-successors",
      receiptKey: DRAFT_RECONCILIATION_RECEIPT_KEY,
      requestDigest,
      ...auditEvidence,
    };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function executeDraftPreparation() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Task 317 draft preparation is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [DRAFT_RECEIPT_KEY]);
    const priorReceipt = await client.query(
      `SELECT operation,subject_id::text,request_digest,result_digest
         FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [DRAFT_RECEIPT_KEY],
    );
    if (priorReceipt.rowCount) {
      const stored = priorReceipt.rows[0];
      if (stored.operation !== DRAFT_OPERATION || stored.subject_id !== DOCUMENT_ID) {
        throw new Error("Task 317 draft-preparation receipt conflicts with this document or operation.");
      }
      const priorAudit = await client.query(
        `SELECT metadata FROM cms_audit_events WHERE request_id=$1`,
        [`${DRAFT_RECEIPT_KEY}:uae`],
      );
      if (!priorAudit.rowCount) {
        throw new Error("Task 317 draft-preparation receipt has no matching UAE audit evidence.");
      }
      const evidence = priorAudit.rows[0].metadata as Record<string, any>;
      const uaeDraftRevisionId = String(evidence.uaeDraftRevisionId ?? "");
      const localizedDrafts = Array.isArray(evidence.localizedDrafts) ? evidence.localizedDrafts : [];
      const expectedPins = Array.isArray(evidence.immutablePins) ? evidence.immutablePins : [];
      if (
        !uaeDraftRevisionId
        || localizedDrafts.length !== 3
        || expectedPins.length !== 6
        || !localizedDrafts.every((draft: any) =>
          typeof draft?.editionId === "string" && typeof draft?.revisionId === "string")
      ) {
        throw new Error("Task 317 draft-preparation audit evidence is incomplete; refusing to treat it as a safe replay.");
      }
      const replayUae = await client.query(
        `SELECT e.publication_state,e.published_revision_id::text published_revision_id,
                latest.id::text latest_revision_id,latest.workflow_state,latest.payload,
                prior.payload prior_payload
           FROM cms_market_editions e
           JOIN LATERAL (
             SELECT id,workflow_state,payload FROM cms_revisions
              WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
           ) latest ON true
           JOIN cms_revisions prior ON prior.id=$2
          WHERE e.id=$1 FOR KEY SHARE`,
        [UAE_EDITION_ID, AUTHORIZED_DRAFT_REVISION_ID],
      );
      const replayUaeRow = replayUae.rows[0];
      if (
        !replayUaeRow || replayUaeRow.publication_state !== "published"
        || replayUaeRow.published_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
        || replayUaeRow.latest_revision_id !== uaeDraftRevisionId || replayUaeRow.workflow_state !== "draft"
        || changedPaths(replayUaeRow.prior_payload, replayUaeRow.payload).join("|") !== "content.thesis"
        || replayUaeRow.payload?.content?.thesis !== FINANCIAL_SERVICES_GOVERNED_THESIS
      ) {
        throw new Error("Task 317 replay found a newer or altered UAE draft; preserving subsequent editorial work.");
      }
      const replayLocals = await client.query(
        `SELECT e.id::text edition_id,e.market,e.locale,e.publication_state,e.content_mode,
                e.published_revision_id::text published_revision_id,r.id::text revision_id,r.workflow_state,r.payload
           FROM cms_market_editions e
           JOIN cms_revisions r ON r.edition_id=e.id
          WHERE e.id::text=ANY($1::text[]) FOR KEY SHARE`,
        [localizedDrafts.map((draft: any) => draft.editionId)],
      );
      if (
        replayLocals.rowCount !== 3
        || replayLocals.rows.some((local) => {
          const expected = localizedDrafts.find((draft: any) => draft.editionId === local.edition_id);
          return !expected || expected.revisionId !== local.revision_id
            || local.publication_state !== "draft" || local.content_mode !== "custom"
            || local.published_revision_id !== null || local.workflow_state !== "draft"
            || local.payload?.content?.bankingPov?.market !== local.market;
        })
      ) {
        throw new Error("Task 317 replay found altered or published local drafts; preserving subsequent local editorial work.");
      }
      const replayPins = await client.query(
        `SELECT field_path,asset_id::text asset_id,media_version_id::text media_version_id
           FROM cms_media_references
          WHERE document_id=$1 AND field_path=ANY($2::text[])`,
        [
          DOCUMENT_ID,
          [
            `revision:${uaeDraftRevisionId}`,
            ...localizedDrafts.map((draft: any) => `revision:${draft.revisionId}`),
          ],
        ],
      );
      if (
        replayPins.rowCount !== 24
        || replayPins.rows.some((pin) => !expectedPins.some((expected: any) =>
          expected.assetId === pin.asset_id && expected.mediaVersionId === pin.media_version_id))
      ) {
        throw new Error("Task 317 replay found altered immutable media pins; preserving subsequent editorial work.");
      }
      const replayState = await client.query(
        `SELECT shared_source_revision_id::text,published_source_revision_id::text,draft_version,reviewed_version,published_version
           FROM cms_document_availability_states WHERE document_id=$1 FOR KEY SHARE`,
        [DOCUMENT_ID],
      );
      const replayAvailability = await client.query(
        `SELECT market.code,availability.locale,availability.published_decision,availability.draft_decision
           FROM cms_document_market_availability availability
           JOIN market_editions market ON market.id=availability.market_edition_id
          WHERE availability.document_id=$1 ORDER BY market.code,availability.locale FOR SHARE`,
        [DOCUMENT_ID],
      );
      if (
        replayState.rowCount !== 1
        || replayState.rows[0].shared_source_revision_id !== AUTHORIZED_DRAFT_REVISION_ID
        || replayState.rows[0].published_source_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
        || Number(replayState.rows[0].draft_version) !== 0
        || replayState.rows[0].reviewed_version !== null
        || Number(replayState.rows[0].published_version) !== 0
        || replayAvailability.rowCount !== 4
        || replayAvailability.rows.some((item) =>
          item.locale !== "en" || item.published_decision !== "inherit" || item.draft_decision !== null)
      ) {
        throw new Error("Task 317 replay found changed live availability; preserving the newer release state.");
      }
      await client.query("ROLLBACK");
      transactionOpen = false;
      return {
        task: TASK,
        mode: "draft-preparation",
        disposition: "replayed",
        receiptKey: DRAFT_RECEIPT_KEY,
        action: "The independent UAE and localized draft preparation is already recorded; no draft was changed.",
        originalEvidence: evidence,
        verification: {
          uaeDraft: "The thesis-only UAE revision remains the exact latest unpublished successor.",
          localizedDrafts: "All three market drafts remain independent custom drafts with their recorded revisions and pins.",
          live: "Published UAE pointer and all availability state/decisions remain at their pre-preparation values.",
        },
      };
    }
    const plan = await readPlan(client);
    // A draft may preserve an existing immutable pin but must never silently
    // substitute a later asset version. Rights approval is deliberately not a
    // prerequisite for creating an unpublished draft.
    const pins = await assertImmutableMediaPins(client, AUTHORIZED_DRAFT_REVISION_ID, plan.row.payload, false);
    const availabilityBefore = await client.query(
      `SELECT market_edition_id::text market_edition_id,locale,published_decision,draft_decision
         FROM cms_document_market_availability
        WHERE document_id=$1 ORDER BY market_edition_id,locale FOR SHARE`,
      [DOCUMENT_ID],
    );
    const existingLocalized = await client.query(
      `SELECT e.market,e.locale,e.id::text edition_id,
              latest.id::text latest_revision_id,latest.revision_number
         FROM cms_market_editions e
         LEFT JOIN LATERAL (
           SELECT id,revision_number FROM cms_revisions
            WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
         ) latest ON true
        WHERE e.document_id=$1 AND e.market=ANY($2::text[])
        FOR UPDATE OF e`,
      [DOCUMENT_ID, ["europe", "ksa", "turkiye"]],
    );
    if (existingLocalized.rowCount) {
      throw new Error("A localized Financial Services edition already exists; refusing to overwrite local draft work.");
    }
    const service = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status)
       VALUES($1,'Task 317 CMS maintenance service','viewer','suspended')
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id::text`,
      [SERVICE_EMAIL],
    );
    const serviceId = String(service.rows[0].id);
    const nextRevision = await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
       VALUES($1,$2,$3,$4,$5,'draft',$6,$7,$8)
       RETURNING id::text`,
      [
        UAE_EDITION_ID,
        Number(plan.latest.revision_number) + 1,
        Number(plan.row.payload_version),
        plan.publishedPayload,
        digest(plan.publishedPayload),
        serviceId,
        "Task 317: chat-approved UAE thesis draft; changes only content.thesis and remains unpublished pending normal CMS media review.",
        AUTHORIZED_DRAFT_REVISION_ID,
      ],
    );
    const uaeDraftRevisionId = String(nextRevision.rows[0].id);
    for (const pin of pins) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
         VALUES($1,$2,$3,$4)`,
        [pin.assetId, pin.mediaVersionId, DOCUMENT_ID, `revision:${uaeDraftRevisionId}`],
      );
    }
    const localizedDrafts: Array<{
      market: string;
      locale: string;
      editionId: string;
      revisionId: string;
      candidateDigest: string;
    }> = [];
    for (const local of plan.localized) {
      const edition = await client.query(
        `INSERT INTO cms_market_editions
          (document_id,market,locale,editorial_market,localized_slug,publication_state,fallback_mode,content_mode,
           customized_from_revision_id,parity_complete)
         VALUES($1,$2,$3,$2,'financial-services','draft','none','custom',$4,false)
         RETURNING id::text`,
        [DOCUMENT_ID, local.market.code, local.market.locale, uaeDraftRevisionId],
      );
      const editionId = String(edition.rows[0].id);
      const revision = await client.query(
        `INSERT INTO cms_revisions
          (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
         VALUES($1,1,$2,$3,$4,'draft',$5,$6,$7)
         RETURNING id::text`,
        [
          editionId,
          Number(plan.row.payload_version),
          local.payload,
          digest(local.payload),
          serviceId,
          `Task 317: ${local.market.code} localized Financial Services draft; unpublished pending local editorial, legal and risk review.`,
          uaeDraftRevisionId,
        ],
      );
      const revisionId = String(revision.rows[0].id);
      for (const pin of pins) {
        await client.query(
          `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
           VALUES($1,$2,$3,$4)`,
          [pin.assetId, pin.mediaVersionId, DOCUMENT_ID, `revision:${revisionId}`],
        );
      }
      localizedDrafts.push({
        market: local.market.code,
        locale: local.market.locale,
        editionId,
        revisionId,
        candidateDigest: local.digest,
      });
    }
    const uaeReadback = await client.query(
      `SELECT e.publication_state,e.published_revision_id::text published_revision_id,
              latest.id::text latest_revision_id,latest.workflow_state,latest.payload,
              latest.source_revision_id::text source_revision_id
         FROM cms_market_editions e
         JOIN LATERAL (
           SELECT id,workflow_state,payload,source_revision_id FROM cms_revisions
            WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1
         ) latest ON true
        WHERE e.id=$1 FOR KEY SHARE`,
      [UAE_EDITION_ID],
    );
    const uae = uaeReadback.rows[0];
    if (
      !uae || uae.publication_state !== "published" || uae.published_revision_id !== PREVIOUS_PUBLISHED_REVISION_ID
      || uae.latest_revision_id !== uaeDraftRevisionId || uae.workflow_state !== "draft"
      || uae.source_revision_id !== AUTHORIZED_DRAFT_REVISION_ID
      || changedPaths(plan.row.payload, uae.payload).join("|") !== "content.thesis"
      || uae.payload?.content?.thesis !== FINANCIAL_SERVICES_GOVERNED_THESIS
    ) {
      throw new Error("UAE draft readback failed the thesis-only or live-pointer-preservation check.");
    }
    for (const revisionId of [uaeDraftRevisionId, ...localizedDrafts.map((draft) => draft.revisionId)]) {
      const copied = await client.query(
        `SELECT asset_id::text asset_id,media_version_id::text media_version_id
           FROM cms_media_references WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id`,
        [DOCUMENT_ID, `revision:${revisionId}`],
      );
      if (
        copied.rowCount !== pins.length
        || copied.rows.some((pin) => !pins.some((source) =>
          source.assetId === pin.asset_id && source.mediaVersionId === pin.media_version_id))
      ) {
        throw new Error(`Immutable pin readback failed for draft revision ${revisionId}.`);
      }
    }
    const localReadback = await client.query(
      `SELECT e.id::text edition_id,e.market,e.locale,e.publication_state,e.content_mode,
              e.published_revision_id::text published_revision_id,r.id::text revision_id,r.workflow_state,r.payload
         FROM cms_market_editions e
         JOIN cms_revisions r ON r.edition_id=e.id
        WHERE e.id::text=ANY($1::text[])`,
      [localizedDrafts.map((draft) => draft.editionId)],
    );
    if (
      localReadback.rowCount !== localizedDrafts.length
      || localReadback.rows.some((local) =>
        local.publication_state !== "draft" || local.content_mode !== "custom"
        || local.published_revision_id !== null || local.workflow_state !== "draft"
        || !Array.isArray(local.payload?.markets) || local.payload.markets.length !== 1
        || local.payload.markets[0] !== local.market || local.payload?.content?.bankingPov?.market !== local.market)
    ) {
      throw new Error("Localized draft readback did not preserve independent unpublished custom editions.");
    }
    const stateReadback = await client.query(
      `SELECT shared_source_revision_id::text,published_source_revision_id::text,draft_version,reviewed_version,published_version
         FROM cms_document_availability_states WHERE document_id=$1 FOR KEY SHARE`,
      [DOCUMENT_ID],
    );
    if (
      canonicalResultDigest(stateReadback.rows[0]) !== canonicalResultDigest({
        shared_source_revision_id: plan.row.shared_source_revision_id,
        published_source_revision_id: plan.row.published_source_revision_id,
        draft_version: plan.row.draft_version,
        reviewed_version: plan.row.reviewed_version,
        published_version: plan.row.published_version,
      })
    ) {
      throw new Error("Draft preparation changed the live availability state.");
    }
    const availabilityAfter = await client.query(
      `SELECT market_edition_id::text market_edition_id,locale,published_decision,draft_decision
         FROM cms_document_market_availability
        WHERE document_id=$1 ORDER BY market_edition_id,locale FOR SHARE`,
      [DOCUMENT_ID],
    );
    if (canonicalResultDigest(availabilityAfter.rows) !== canonicalResultDigest(availabilityBefore.rows)) {
      throw new Error("Draft preparation changed a live or staged availability decision.");
    }
    const mediaStatus = await client.query(
      `SELECT ref.asset_id::text asset_id,ref.media_version_id::text media_version_id,
              v.metadata->>'rightsStatus' rights_status,v.metadata->'rights'->>'status' nested_rights_status
         FROM cms_media_references ref
         JOIN cms_media_versions v ON v.id=ref.media_version_id
        WHERE ref.document_id=$1 AND ref.field_path=$2 ORDER BY ref.asset_id`,
      [DOCUMENT_ID, `revision:${AUTHORIZED_DRAFT_REVISION_ID}`],
    );
    const exactMediaApprovalAudits = await client.query(
      `SELECT request_id FROM cms_audit_events
        WHERE action='media.approved' AND metadata::text LIKE ANY($1::text[])`,
      [pins.map((pin) => `%${pin.mediaVersionId}%`)],
    );
    const requestDigest = digest({
      task: TASK,
      draftPreparation: true,
      documentId: DOCUMENT_ID,
      authorizedDraftRevisionId: AUTHORIZED_DRAFT_REVISION_ID,
      thesis: FINANCIAL_SERVICES_GOVERNED_THESIS,
      pins,
      localizedMarkets: localizedDrafts.map((draft) => draft.market),
    });
    const result = { uaeDraftRevisionId, pins, localizedDrafts };
    await client.query(
      `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES($1,$2,$3,$4,$5)`,
      [DRAFT_RECEIPT_KEY, DRAFT_OPERATION, DOCUMENT_ID, requestDigest, digest(result)],
    );
    const mediaPublicationBlocker = {
      liveRouteAcceptedRightsStatuses: [...ACCEPTED_MEDIA_RIGHTS_STATUSES],
      exactMediaApprovalAuditCount: exactMediaApprovalAudits.rowCount ?? 0,
      exactPinnedVersionRights: mediaStatus.rows,
      conclusion:
        "The hero's legacy approved-use label is now compatible with the publisher's own approval vocabulary, but five supporting pinned versions remain needs-review. No media approval was manufactured.",
    };
    const provenance = {
      task: TASK,
      serviceAttribution: "Task 317 CMS maintenance service",
      chatApproval:
        "Project-owner chat instruction: then publish it only for uae and prepare versions for the other geos.",
      editorialApprovalBasis: "replit.md permits the explicit project-owner instruction as editorial approval.",
      mediaPublicationStatus: mediaPublicationBlocker,
      authorizedDraftRevisionId: AUTHORIZED_DRAFT_REVISION_ID,
      uaeDraftRevisionId,
      thesis: FINANCIAL_SERVICES_GOVERNED_THESIS,
      changedPathsFromAuthorizedDraft: ["content.thesis"],
      immutablePins: pins,
      localizedDrafts,
      livePublicationPreserved: true,
      liveAvailabilityPreserved: true,
    };
    for (const [requestId, metadata] of [
      [`${DRAFT_RECEIPT_KEY}:uae`, { ...provenance, market: "uae", locale: "en", revisionId: uaeDraftRevisionId }],
      ...localizedDrafts.map((draft) => [
        `${DRAFT_RECEIPT_KEY}:${draft.market}`,
        {
          ...provenance,
          market: draft.market,
          locale: draft.locale,
          editionId: draft.editionId,
          revisionId: draft.revisionId,
          localizedDraftProvenance: "Independent custom edition; unpublished and requires local review.",
        },
      ] as const),
    ] as const) {
      await client.query(
        `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
         VALUES($1,'Task 317 CMS maintenance service','document.draft_prepared','document',$2,$3,$4)`,
        [serviceId, DOCUMENT_ID, requestId, metadata],
      );
    }
    await client.query("COMMIT");
    transactionOpen = false;
    return {
      task: TASK,
      mode: "draft-preparation",
      disposition: "created-independent-unpublished-drafts",
      operation: DRAFT_OPERATION,
      receiptKey: DRAFT_RECEIPT_KEY,
      requestDigest,
      ...result,
      publication: "Not attempted: media publication checks remain fail-closed.",
      mediaPublicationBlocker,
      verification: {
        uaeDraft: "The latest UAE revision is an unpublished thesis-only successor with the six source pins copied exactly.",
        localizedDrafts: "Europe, KSA and Türkiye are independent custom draft editions, each with matching market selectors and immutable pins.",
        live: "The UAE published revision and all live/staged availability state remained unchanged.",
        api: "No API server was started or probed.",
      },
    };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  if ([prepareDrafts, reconcileDrafts, clearMediaRights].filter(Boolean).length > 1) {
    throw new Error("Use only one of --prepare-drafts, --reconcile-drafts, or --clear-media-rights.");
  }
  if (!apply) {
    await emitJson({
      task: TASK,
      mode: "dry-run",
      operation: OPERATION,
      receiptKey: RECEIPT_KEY,
      action: "Would lock the exact UAE revision chain, verify all six media pins and CMS media governance, append a thesis-only UAE revision, and create unpublished localized custom drafts.",
    }, outputPath(undefined, "task-317-uae-publication-and-localization-receipt.json"), write);
    return;
  }
  if (clearMediaRights) {
    const clearance = await clearSupportingImageRights(true);
    await emitJson(
      clearance,
      outputPath(
        undefined,
        clearance.disposition === "replayed"
          ? "task-317-supporting-image-clearance-replay-receipt.json"
          : "task-317-supporting-image-clearance-receipt.json",
      ),
      write,
    );
  }
  const outcome = reconcileDrafts
    ? await reconcileLocalizedDraftIsolation()
    : prepareDrafts
      ? await executeDraftPreparation()
      : await execute();
  await emitJson(
    outcome,
    outputPath(
      undefined,
      reconcileDrafts
        ? outcome.disposition === "published-release-verified"
          ? "task-317-uae-publication-release-verification-receipt.json"
          : "task-317-localized-draft-isolation-reconciliation-receipt.json"
        : clearMediaRights
          ? "task-317-uae-publication-receipt.json"
        : "task-317-uae-publication-and-localization-receipt.json",
    ),
    write,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    if (reportBlocked) {
      const mediaBlocked = error instanceof CmsGovernanceBlockError;
      await emitJson({
        task: TASK,
        mode: apply ? "apply" : "dry-run",
        disposition: mediaBlocked
          ? "blocked-by-normal-cms-media-governance"
          : "preserved-newer-draft-or-publication-conflict",
        receiptKey: RECEIPT_KEY,
        error: message,
        evidence: mediaBlocked ? error.details : undefined,
        action: "No UAE revision, publication pointer, market destination, local draft, immutable media pin, historical receipt, or human attribution was changed.",
        requiredResolution: mediaBlocked
          ? "A properly authorized CMS publisher must independently approve the exact immutable versions' media rights. Editorial chat approval cannot substitute for media-rights approval."
          : "Do not overwrite the newer Task 317 UAE draft. Resolve its normal review and media-governance requirements before any publication.",
      }, outputPath(undefined, "task-317-uae-publication-and-localization-receipt.json"), true);
      console.error(`Task 317 blocked without mutation: ${message}`);
      return;
    }
    console.error(message);
    process.exitCode = 1;
  });
}