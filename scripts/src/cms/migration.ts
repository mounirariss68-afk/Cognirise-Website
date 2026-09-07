import { createHash } from "node:crypto";
import { type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";
import { InventoryRecord } from "./common.js";

export type MigratableRecord = InventoryRecord & {
  type: "person" | "partner" | "platform" | "article" | "industry";
};

export interface MigrationOperation {
  externalId: string;
  idempotencyKey: string;
  kind: "person" | "partner" | "platform" | "publication" | "industry";
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

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

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
    idempotencyKey: `cms-inventory-v2:${record.externalId}`,
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
  if (mediaIds[0] && (operation.kind === "platform" || operation.kind === "publication" || operation.kind === "industry")) {
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