import { createHash } from "node:crypto";
import { type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";
import { InventoryRecord } from "./common.js";

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
  rightsStatus?: string;
  accessibilityStatus?: string;
  sourceReviewApproved?: boolean;
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
    seo: { noIndex: false },
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
      ? `cms-industry-contract-v8:${record.externalId}`
      : record.type === "case-study"
        ? `cms-case-study-baseline-v1:${record.externalId}`
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
    const operation = {
      externalId: record.externalId,
      idempotencyKey: `cms-media-inventory-v3:${record.externalId}`,
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
      altText: accessibility.altText,
      credit: rights.owner,
      rightsStatus: typeof rights.status === "string" ? rights.status : undefined,
      accessibilityStatus: typeof accessibility.status === "string"
        ? accessibility.status
        : (typeof accessibility.altText === "string" && accessibility.altText.trim() ? "approved" : "needs-review"),
      sourceReviewApproved: record.review.status === "approved",
    };
    // Keep the v3 receipt digest stable for already-imported website binaries.
    // Classification lives in mutable asset fields/version metadata and does
    // not manufacture a replacement immutable binary version.
    const legacyDigestShape = {
      externalId: operation.externalId,
      idempotencyKey: operation.idempotencyKey,
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
    };
    return { ...operation, requestDigest: digest(legacyDigestShape) };
  });
}

export function resultDigest(value: unknown) {
  return digest(value);
}