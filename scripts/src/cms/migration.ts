import { createHash } from "node:crypto";
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
  const fieldSlug = typeof record.fields.slug === "string"
    ? record.fields.slug
    : typeof record.fields.routeSlug === "string" ? record.fields.routeSlug : undefined;
  const slug = fieldSlug ?? `${slugify(record.name)}-${record.externalId.split(":")[1].slice(0, 8)}`;
  const kind: MigrationOperation["kind"] =
    record.type === "article" ? "publication" : record.type;
  const payload = {
    content: { name: record.name, ...record.fields },
    migration: {
      externalId: record.externalId,
      source: { file: record.sourceFile, route: record.route ?? null },
      review: record.review,
      importedAs: { kind, market: "uae", locale: "en" },
    },
  };
  const request = { externalId: record.externalId, kind, slug, title: record.name, payload };
  return {
    ...request,
    idempotencyKey: `cms-inventory-v1:${record.externalId}`,
    requestDigest: digest(request),
  };
}

export function migrationOperations(records: InventoryRecord[]) {
  return records
    .filter((record): record is MigratableRecord => record.type !== "asset")
    .map(migrationOperation);
}

export function resultDigest(value: unknown) {
  return digest(value);
}