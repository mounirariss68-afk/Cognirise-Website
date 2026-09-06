import { createHash } from "node:crypto";
import { type CmsDocumentKind, validateCmsSnapshot } from "@workspace/api-zod";
import { InventoryRecord } from "./common.js";

export type MigratableRecord = InventoryRecord & {
  type: "person" | "partner" | "platform" | "article";
};

export interface MigrationOperation {
  externalId: string;
  idempotencyKey: string;
  kind: "person" | "partner" | "platform" | "publication";
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
    const operation = {
      externalId: record.externalId,
      idempotencyKey: `cms-media-inventory-v2:${record.externalId}`,
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
    };
    return { ...operation, requestDigest: digest(operation) };
  });
}

export function resultDigest(value: unknown) {
  return digest(value);
}