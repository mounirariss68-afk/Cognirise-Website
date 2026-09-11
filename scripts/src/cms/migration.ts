import { createHash } from "node:crypto";
import { type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";
import { InventoryRecord } from "./common.js";
import { acceptedLegacyMediaReceiptDigests } from "./media-receipt-history.js";
import { caseStudyRecords } from "./case-studies.js";

export type MigratableRecord = InventoryRecord & {
  type: "person" | "partner" | "platform" | "article" | "case-study" | "industry" | "framework";
};

export interface MigrationOperation {
  externalId: string;
  idempotencyKey: string;
  kind: "person" | "partner" | "platform" | "publication" | "case-study" | "industry" | "framework";
  slug: string;
  title: string;
  payload: Record<string, unknown>;
  mediaPaths: string[];
  requestDigest: string;
}

export interface MediaMigrationOperation {
  externalId: string;
  idempotencyKey: string;
  filename: string;
  sourceFile: string;
  publicPath: string;
  checksum: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  cmsOwnership: "cms-candidate" | "code-owned";
  usages: string[];
  collection: "website" | "linkedin";
  linkedinAssetKind: "post" | "header" | null;
  campaignMetadata: Record<string, unknown> | null;
  altText: string;
  credit: string;
  requestDigest: string;
  historicalReceipts: HistoricalMediaReceipt[];
  acceptedPriorRequestDigests: string[];
  rightsStatus?: string;
  accessibilityStatus?: string;
  sourceReviewApproved?: boolean;
}

export interface HistoricalMediaReceipt {
  externalId: string;
  idempotencyKey: string;
  replacementIdempotencyKey: string;
  requestDigest: string;
  acceptedRequestDigests: string[];
}

export interface PersonAvailabilityOperation {
  externalId: string;
  documentIdempotencyKey: string;
  idempotencyKey: string;
  market: string;
  decision: "show" | "off";
  requestDigest: string;
}

export interface PersonGovernanceOperation {
  externalId: string;
  documentIdempotencyKey: string;
  idempotencyKey: string;
  market: string;
  controlled: { role: "founder" | "leader" | "advisor"; title: string; order: number };
  legacyControlled: Array<{ role: "founder" | "advisor"; title: string; order: number }>;
  requestDigest: string;
}

const EDUCATION_V8_AUTHORITY_DIGEST =
  "99e765da04fa7ef70050ed29c4b3242b2ce3861e0ce8bd7fa62bfc02de3e43ca";
export const EDUCATION_SUCCESSOR_SEO = {
  title: "Education AI | K–12 & Higher Education | Cognirise",
  description: "Build shared AI capability across schools, universities and education authorities: better learning, stronger educators and researchers, and responsible service redesign.",
} as const;

export function educationSuccessorAction(input: {
  baselineAction: ReturnType<typeof industryBaselineAction>;
  latestNormalizedPayloadDigest: string | undefined;
  canonicalPayload: unknown;
}): "append-and-publish" | "reuse-complete" | "preserve-editorial" {
  const canonical = input.canonicalPayload as {
    seo?: Record<string, unknown>;
    content?: { educationPov?: Record<string, unknown> };
  } | null;
  const pov = canonical?.content?.educationPov;
  const isExactSuccessor = pov?.version === 2
    && Array.isArray(pov.valueDomains) && pov.valueDomains.length === 5
    && Array.isArray(pov.targetState) && pov.targetState.length === 7
    && canonical?.seo?.title === EDUCATION_SUCCESSOR_SEO.title
    && canonical?.seo?.description === EDUCATION_SUCCESSOR_SEO.description;
  if (!isExactSuccessor) return "preserve-editorial";
  if (input.baselineAction === "reuse-complete") return "reuse-complete";
  return input.baselineAction === "append-and-publish"
      && input.latestNormalizedPayloadDigest === EDUCATION_V8_AUTHORITY_DIGEST
    ? "append-and-publish"
    : "preserve-editorial";
}

export function industryBaselineAction(
  revisions: ReadonlyArray<{
    id: string;
    revisionNumber: number;
    reason: string | null;
    workflowState: string;
    hasOpportunity: boolean;
    provenanceValid: boolean;
    payloadFamilyDigest: string;
    matchesContractPayload: boolean;
    hasValidMediaPin: boolean;
    hasKnownV3UnpinnedRef: boolean;
    priorHasValidMediaPin: boolean;
  }>,
  publishedRevisionId: string | null | undefined,
  publicationState: string | null | undefined,
): "append-and-publish" | "repair-v3-media" | "reuse-complete" | "preserve-editorial" {
  if (!revisions.length || publicationState !== "published") return "preserve-editorial";
  const ordered = [...revisions].sort((left, right) => left.revisionNumber - right.revisionNumber);
  const latest = ordered.at(-1)!;
  if (
    publishedRevisionId !== latest.id
    || latest.workflowState !== "approved"
    || ordered.some((revision, index) =>
      revision.revisionNumber !== index + 1 || !revision.provenanceValid
    )
  ) return "preserve-editorial";

  const inventoryReason = "Inventory migration; pending editorial review.";
  const imageCutoverReason = "Approved Cognirise Pulse industry-image cutover; previous revisions and media preserved.";
  const v3Reason = "Approved broadened industry content contract baseline v3; prior revisions preserved.";
  const legacy = ordered.filter((revision) => !revision.hasOpportunity);
  const governedLegacy = legacy.length > 0 && legacy.every((revision, index) => {
    if (index === 0) {
      return revision.reason === inventoryReason
        && (revision.workflowState === "draft" || revision.workflowState === "approved");
    }
    return revision.reason === imageCutoverReason
      && revision.workflowState === "approved"
      && revision.payloadFamilyDigest === legacy[0].payloadFamilyDigest;
  });
  if (!governedLegacy) return "preserve-editorial";
  if (!latest.hasOpportunity) {
    return ordered.length === legacy.length && latest.hasValidMediaPin
      ? "append-and-publish"
      : "preserve-editorial";
  }
  if (latest.matchesContractPayload && latest.hasValidMediaPin) return "reuse-complete";
  if (latest.hasKnownV3UnpinnedRef && latest.reason === v3Reason) {
    if (!latest.priorHasValidMediaPin) return "preserve-editorial";
    return latest.matchesContractPayload ? "repair-v3-media" : "append-and-publish";
  }
  return latest.provenanceValid && latest.hasValidMediaPin
    ? "append-and-publish"
    : "preserve-editorial";
}

export function isApprovedFinancialServicesPunctuationReconciliation(
  publishedPayload: unknown,
  canonicalPayload: unknown,
): boolean {
  if (
    !publishedPayload
    || typeof publishedPayload !== "object"
    || !canonicalPayload
    || typeof canonicalPayload !== "object"
  ) return false;
  const published = structuredClone(publishedPayload) as {
    content?: Record<string, unknown>;
    mediaIds?: unknown[];
  };
  const canonical = structuredClone(canonicalPayload) as {
    content?: Record<string, unknown>;
    mediaIds?: unknown[];
  };
  const previousHeadline = "The model estate—not the chatbot—is where trust is won.";
  const approvedHeadline = "The model estate — not the chatbot — is where trust is won.";
  if (
    published.content?.thesis !== previousHeadline
    || canonical.content?.thesis !== approvedHeadline
  ) return false;

  published.content.thesis = approvedHeadline;
  published.mediaIds = [];
  canonical.mediaIds = [];
  delete published.content.heroMediaId;
  if (canonical.content) delete canonical.content.heroMediaId;
  return canonicalResultDigest(published) === canonicalResultDigest(canonical);
}

export function financialServicesPunctuationReconciliationPlan(input: {
  slug: string;
  publicationState: string | null | undefined;
  publishedRevisionId: string | null | undefined;
  latestRevision: { id: string; workflowState: string } | undefined;
  publishedPayload: unknown;
  canonicalPayload: unknown;
  publishedReferences: ReadonlyArray<{ assetId: string; mediaVersionId: string | null }>;
}): {
  payload: { content: Record<string, unknown>; mediaIds: unknown[] };
  references: Array<{ assetId: string; mediaVersionId: string | null }>;
} | null {
  if (
    input.slug !== "financial-services"
    || input.publicationState !== "published"
    || !input.publishedRevisionId
    || input.latestRevision?.id !== input.publishedRevisionId
    || input.latestRevision.workflowState !== "approved"
    || !isApprovedFinancialServicesPunctuationReconciliation(
      input.publishedPayload,
      input.canonicalPayload,
    )
  ) return null;

  const payload = structuredClone(input.publishedPayload) as {
    content?: Record<string, unknown>;
    mediaIds?: unknown[];
  };
  if (!payload.content || !Array.isArray(payload.mediaIds)) return null;
  payload.content.thesis = "The model estate — not the chatbot — is where trust is won.";
  return {
    payload: {
      ...payload,
      content: payload.content,
      mediaIds: payload.mediaIds,
    },
    references: input.publishedReferences.map(({ assetId, mediaVersionId }) => ({
      assetId,
      mediaVersionId,
    })),
  };
}

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

export const canonicalResultDigest = (value: unknown) => digest(canonicalize(value));

const acceptedMediaReplacementHistory = new Map<string, {
  checksum: string;
  priorRequestDigest: string;
}>([
  ["asset:756471849fafbe93e1b9", { checksum: "883ed6bb9c1e30549f290b696ed59fc4a74888d1ed5a544f567d6c850fb7fc50", priorRequestDigest: "02fc1d2a5261b118e1018f9935ae26a4efc07f1ce412a13581e51cdc52b26a07" }],
  ["asset:5d8da6b74c77327bf3a1", { checksum: "a798b751527e5ffe41958651d0c0c5e55a04a920b12a56f1e4de019c73dfc35e", priorRequestDigest: "92fb47068ed29b37f2e425b8f783ea63fc4633e01f2b5098a2d0d15b64ad4bd7" }],
  ["asset:1aa85e3f80b4199ec833", { checksum: "6ee4af35cc0bc38f7cb278ce2fbfe3304463bf7f9886605ad6c315348919f050", priorRequestDigest: "bc8af22a70af669b3c134df22e1090e87e172ff9c24c3b2c00fce2a4fbbb1d61" }],
  ["asset:963a3139d76ebb1cbd21", { checksum: "fc856d336a4780e5c7568f0cb1b9e96dda8ee7d4fd1f7967df9ce37c0be3a781", priorRequestDigest: "e38c7d76ba5cbb2d7556433092e9bc474fb2ebc0fc123e99d14d3b8e5d05a56e" }],
  ["asset:8e7e9479de6f42bcf2bc", { checksum: "6df89ba5ba9d3fc17254be728e5f658d626284dd08a1f69aec9cf47e7b9a504f", priorRequestDigest: "db7a1d993b894bea2ce6052ca48dd0bedae825cd4ae81285c16a39c4a1b41cbd" }],
  ["asset:5510debf4e4390420a56", { checksum: "75c105711b2c2d910aa0c19502947137c73624f6fbe6e78ac73f744ff591777d", priorRequestDigest: "2940d16740ef323cb372cede15faaa907ce1c0e10c2dbfe0bceade69f09e43bb" }],
  ["asset:1702a55d5a824fce8b1f", { checksum: "b6b763fec567e5117f55a47364797fe9b5c4ea4d6806e1f87c0a58cf1fac7efc", priorRequestDigest: "ab1d172ecaa94981eb2b86d98107449beecfd3ee33325d633fd836fd4f971cb7" }],
  ["asset:f6a19919d1de6e4dd655", { checksum: "7f462ae555d626662aa17f0654b0308cf1d869d704bb3032351ccf2ac03d35b7", priorRequestDigest: "e04eb4356721ca843961bcd4230edc82d6aecb22baf8e241420c156f6e6191b7" }],
  ["asset:cb22af24054d18218ace", { checksum: "3dc35c3b9d50a5782b2a30487f0e903cd716f9e6e803686f0b8c1dbaa1bca034", priorRequestDigest: "ec8c8ba3fc38d21f998fc6e854e0bb13f658bf0c0460e6b8900993a73bfc6fdf" }],
  ["asset:302ea3c4bf1fbfb78fed", { checksum: "0c0053392fe1823f2aafe053711bd07114cb4153dd8552a362a5ac2b2c8653b4", priorRequestDigest: "41b2ad264547742ed04c7a39696ac4af331b499100ee971af254a062ce967f33" }],
  ["asset:ac50e1fb2480a2f9caf5", { checksum: "1d1e44ef9c90cc89d22f5676cb6bbdb86cb5b02972e5d5ffcc05dca88b53be99", priorRequestDigest: "8640e8f6766123034d127a98d7019da239e4f734eb0703461ec4681096a43e6e" }],
]);

export function historicalMediaReceipts(records: InventoryRecord[]): HistoricalMediaReceipt[] {
  return mediaMigrationOperations(records)
    .flatMap((operation) => operation.historicalReceipts);
}

export function matchesGovernedCutoverSource(
  priorRevisionId: string,
  recordedSourceRevisionId: unknown,
) {
  return typeof recordedSourceRevisionId === "undefined"
    || recordedSourceRevisionId === priorRevisionId;
}

function slugify(value: string) {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "migration";
}

export function migrationOperation(record: MigratableRecord): MigrationOperation {
  const fieldSlug = typeof record.fields.slug === "string" ? record.fields.slug : undefined;
  const slug = fieldSlug ?? `${slugify(record.name)}-${record.externalId.split(":")[1].slice(0, 8)}`;
  const kind: MigrationOperation["kind"] =
    record.type === "article" ? "publication" : record.type;
  const mediaPaths = Array.isArray(record.fields.mediaPaths)
    ? record.fields.mediaPaths.filter((value): value is string => typeof value === "string")
    : [];
  const payload = {
    slug,
    title: record.name,
    summary: typeof record.fields.summary === "string" ? record.fields.summary : null,
    content: record.fields.content,
    seo: record.type === "industry" && record.fields.slug === "education"
      ? { ...EDUCATION_SUCCESSOR_SEO, noIndex: false }
      : { noIndex: false },
    mediaIds: [],
    markets: ["uae"],
  };
  const validation = validateCmsSnapshot(kind as CmsDocumentKind, payload, "draft");
  if (!validation.success) throw new Error(`${record.externalId}: ${validation.errors.join("; ")}`);
  const request = { externalId: record.externalId, kind, slug, title: record.name, payload };
  return {
    ...request,
    mediaPaths,
    // Industry contract expansions use a versioned receipt so corrected
    // reconciliation can preserve every earlier immutable baseline and receipt.
    idempotencyKey: record.type === "industry"
      ? record.fields.slug === "financial-services"
        ? `cms-industry-contract-v12:${record.externalId}`
        : record.fields.slug === "education"
          ? `cms-industry-education-successor-v10:${record.externalId}`
        : `cms-industry-contract-v8:${record.externalId}`
      : record.type === "case-study"
        ? `cms-case-study-baseline-v2:${record.externalId}`
        : `cms-inventory-v2:${record.externalId}`,
    requestDigest: digest(request),
  };
}

export function migrationOperations(records: InventoryRecord[]) {
  return records
    .filter((record): record is MigratableRecord => record.type !== "asset")
    .map(migrationOperation);
}

export function personAvailabilityOperations(records: InventoryRecord[]): PersonAvailabilityOperation[] {
  return records
    .filter((record) => record.type === "person")
    .map((record) => {
      const decision = record.fields.initialMarketAvailability;
      if (decision !== "show" && decision !== "off") {
        throw new Error(`${record.externalId}: missing initial person market availability.`);
      }
      const operation: Omit<PersonAvailabilityOperation, "requestDigest"> = {
        externalId: record.externalId,
        documentIdempotencyKey: `cms-inventory-v2:${record.externalId}`,
        idempotencyKey: `cms-person-availability-v1:${record.externalId}:uae`,
        market: "uae",
        decision,
      };
      return { ...operation, requestDigest: digest(operation) };
    });
}

const legacyPersonControls: Record<string, PersonGovernanceOperation["legacyControlled"]> = {
  "person:8a0e78e95b87db8e0acd": [{ role: "founder", title: "Founding Partner", order: 0 }],
  "person:8a26fa2024db762f831e": [{ role: "founder", title: "Founding Partner", order: 1 }],
  "person:f62fafba1d69ec9281e2": [{ role: "advisor", title: "Regional Senior Managing Director, Accenture Middle East", order: 0 }],
  "person:66893d0003c5bb956534": [{ role: "advisor", title: "Former CEO, Türk Telekom · Investor & Board Member", order: 1 }],
  "person:869b2b63e38d11b890d4": [{ role: "advisor", title: "Public & Government Affairs Director — IMEA & Türkiye, and Country Director Kuwait & Levant, Dow", order: 2 }],
};

export function personGovernanceOperations(records: InventoryRecord[]): PersonGovernanceOperation[] {
  return records.filter((record) => record.type === "person" && legacyPersonControls[record.externalId])
    .map((record) => {
      const content = record.fields.content as Record<string, unknown>;
      const role = content.role;
      const title = content.title;
      const order = content.order;
      if ((role !== "founder" && role !== "leader" && role !== "advisor") || typeof title !== "string" || typeof order !== "number") {
        throw new Error(`${record.externalId}: invalid controlled person governance fields.`);
      }
      const operation: Omit<PersonGovernanceOperation, "requestDigest"> = {
        externalId: record.externalId,
        documentIdempotencyKey: `cms-inventory-v2:${record.externalId}`,
        idempotencyKey: `cms-person-governance-v1:${record.externalId}`,
        market: "uae",
        controlled: { role: role as "founder" | "leader" | "advisor", title, order },
        legacyControlled: legacyPersonControls[record.externalId],
      };
      return { ...operation, requestDigest: digest(operation) };
    });
}

export function resolveMigrationMedia(operation: MigrationOperation, mediaByPath: Map<string, string>) {
  const mediaIds = operation.mediaPaths.map((mediaPath) => {
    const id = mediaByPath.get(mediaPath);
    if (!id) throw new Error(`No imported CMS media record for ${mediaPath}.`);
    return id;
  });
  const content = structuredClone(operation.payload.content) as Record<string, unknown>;
  if (mediaIds[0] && (operation.kind === "platform" || operation.kind === "publication" || operation.kind === "industry" || operation.kind === "framework")) {
    content.heroMediaId = mediaIds[0];
  }
  const payload = { ...operation.payload, content, mediaIds };
  const validation = validateCmsSnapshot(operation.kind as CmsDocumentKind, payload, "draft");
  if (!validation.success) throw new Error(`${operation.externalId}: ${validation.errors.join("; ")}`);
  return validation.data;
}

export function mediaMigrationOperations(records: InventoryRecord[]): MediaMigrationOperation[] {
  return records.filter((record) => record.type === "asset").map((record) => {
    const fields = record.fields;
    if (
      typeof fields.publicPath !== "string" ||
      typeof fields.checksum !== "string" ||
      typeof fields.mimeType !== "string" ||
      typeof fields.bytes !== "number" ||
      (fields.cmsOwnership !== "cms-candidate" && fields.cmsOwnership !== "code-owned")
    ) {
      throw new Error(`${record.externalId}: invalid asset manifest.`);
    }
    const accessibility = fields.accessibility as Record<string, unknown> | undefined;
    const rights = fields.rights as Record<string, unknown> | undefined;
    if ((fields.collection !== "website" && fields.collection !== "linkedin")
      || typeof accessibility?.altText !== "string" || typeof rights?.owner !== "string") {
      throw new Error(`${record.externalId}: missing governed collection, alt text, or credit.`);
    }
    const linkedinAssetKind = fields.linkedinAssetKind;
    if (fields.collection === "linkedin" && linkedinAssetKind !== "post" && linkedinAssetKind !== "header") {
      throw new Error(`${record.externalId}: LinkedIn media must be classified as post or header.`);
    }
    const replacementHistory = acceptedMediaReplacementHistory.get(record.externalId);
    if (replacementHistory && replacementHistory.checksum !== fields.checksum) {
      throw new Error(
        `${record.externalId}: the governed binary changed again; add a new explicit media replacement operation.`,
      );
    }
    const operation = {
      externalId: record.externalId,
      idempotencyKey: `cms-media-binary-v1:${record.externalId}:${fields.checksum}`,
      filename: record.name,
      sourceFile: record.sourceFile,
      publicPath: fields.publicPath,
      checksum: fields.checksum,
      mimeType: fields.mimeType,
      byteSize: fields.bytes,
      width: typeof fields.width === "number" ? fields.width : null,
      height: typeof fields.height === "number" ? fields.height : null,
      cmsOwnership: fields.cmsOwnership as "cms-candidate" | "code-owned",
      usages: Array.isArray(fields.usages)
        ? fields.usages.filter((value): value is string => typeof value === "string")
        : [],
      collection: fields.collection as "website" | "linkedin",
      linkedinAssetKind: fields.collection === "linkedin" ? linkedinAssetKind as "post" | "header" : null,
      campaignMetadata: fields.campaignMetadata && typeof fields.campaignMetadata === "object"
        ? fields.campaignMetadata as Record<string, unknown>
        : null,
      altText: caseVisualByPath.get(fields.publicPath)?.altText || accessibility.altText,
      credit: rights.owner,
      rightsStatus: typeof rights.status === "string" ? rights.status : undefined,
      accessibilityStatus: typeof accessibility.status === "string"
        ? accessibility.status
        : (typeof accessibility.altText === "string" && accessibility.altText.trim() ? "approved" : "needs-review"),
      sourceReviewApproved: record.review.status === "approved",
    };
    const binaryDigestShape = {
      externalId: operation.externalId,
      idempotencyKey: operation.idempotencyKey,
      checksum: operation.checksum,
      mimeType: operation.mimeType,
      byteSize: operation.byteSize,
      width: operation.width,
      height: operation.height,
    };
    const inventoryReceiptKey = `cms-media-inventory-v3:${operation.externalId}`;
    const inventoryDigests = acceptedLegacyMediaReceiptDigests.get(inventoryReceiptKey);
    const legacyInventoryDigest = digest({
      externalId: operation.externalId,
      idempotencyKey: inventoryReceiptKey,
      filename: operation.filename,
      sourceFile: operation.sourceFile,
      publicPath: operation.publicPath,
      checksum: operation.checksum,
      mimeType: operation.mimeType,
      byteSize: operation.byteSize,
      width: operation.width,
      height: operation.height,
      cmsOwnership: operation.cmsOwnership,
      usages: operation.usages,
    });
    const historicalReceipts: HistoricalMediaReceipt[] = inventoryDigests ? [{
      externalId: operation.externalId,
      idempotencyKey: inventoryReceiptKey,
      replacementIdempotencyKey: operation.idempotencyKey,
      requestDigest: inventoryDigests[0],
      acceptedRequestDigests: [...inventoryDigests],
    }] : [];
    if (replacementHistory) {
      const replacementReceiptKey =
        `cms-media-replacement-v1:${operation.externalId}:${operation.checksum}`;
      const replacementDigests = acceptedLegacyMediaReceiptDigests.get(replacementReceiptKey);
      if (replacementDigests) {
        historicalReceipts.push({
          externalId: operation.externalId,
          idempotencyKey: replacementReceiptKey,
          replacementIdempotencyKey: operation.idempotencyKey,
          requestDigest: replacementDigests[0],
          acceptedRequestDigests: [...replacementDigests],
        });
      }
    }
    const acceptedPriorRequestDigests = [
      ...new Set([
        ...historicalReceipts.flatMap((receipt) => receipt.acceptedRequestDigests),
        ...(inventoryDigests ? [legacyInventoryDigest] : []),
        ...(inventoryDigests ? [digest({
          ...binaryDigestShape,
          idempotencyKey: inventoryReceiptKey,
        })] : []),
      ]),
    ];
    return {
      ...operation,
      requestDigest: digest(binaryDigestShape),
      historicalReceipts,
      acceptedPriorRequestDigests,
    };
  });
}

export function resultDigest(value: unknown) {
  return digest(value);
}

const caseVisualByPath = new Map(caseStudyRecords().map((record) => {
  const fields = record.fields as {
    mediaPaths: string[];
    content: { visual: { altText: string } };
  };
  return [fields.mediaPaths[0], fields.content.visual] as const;
}));
