import {
  AnyPgColumn,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cmsUsersTable } from "./cms-auth";
import { marketEditionsTable } from "./market-editions";

export const cmsDocumentsTable = pgTable(
  "cms_documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: text("kind").notNull(),
    canonicalSlug: text("canonical_slug"),
    title: text("title").notNull(),
    ownerId: uuid("owner_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_documents_canonical_slug_uidx").on(table.canonicalSlug),
    index("cms_documents_kind_status_idx").on(table.kind, table.status),
    index("cms_documents_owner_idx").on(table.ownerId),
  ],
);

export const cmsMarketEditionsTable = pgTable(
  "cms_market_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    market: text("market").notNull(),
    locale: text("locale").notNull(),
    localizedSlug: text("localized_slug"),
    publicationState: text("publication_state").notNull().default("draft"),
    fallbackMode: text("fallback_mode").notNull().default("none"),
    parityComplete: boolean("parity_complete").notNull().default(false),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    publishedRevisionId: uuid("published_revision_id").references(
      (): AnyPgColumn => cmsRevisionsTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_market_editions_document_market_uidx").on(
      table.documentId,
      table.market,
    ),
    uniqueIndex("cms_market_editions_market_slug_uidx").on(
      table.market,
      table.localizedSlug,
    ),
    index("cms_market_editions_release_idx").on(
      table.publicationState,
      table.publishAt,
    ),
    index("cms_market_editions_published_revision_idx").on(table.publishedRevisionId),
  ],
);

/**
 * An explicit delivery decision for a person in a configured market.
 * Absence of a row and `inherit` have the same delivery semantics, while
 * retaining `inherit` allows an editor's deliberate reset to be audited.
 */
export const cmsPersonMarketAvailabilityTable = pgTable(
  "cms_person_market_availability",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    marketEditionId: uuid("market_edition_id")
      .notNull()
      .references(() => marketEditionsTable.id, { onDelete: "cascade" }),
    /** Legacy pre-staging decision retained for an append-safe migration. */
    decision: text("decision").notNull().default("inherit"),
    publishedDecision: text("published_decision").notNull().default("inherit"),
    draftDecision: text("draft_decision"),
    updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    publishedByUserId: uuid("published_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.marketEditionId] }),
    check(
      "cms_person_market_availability_decision_check",
      sql`${table.decision} IN ('inherit', 'show', 'off')`,
    ),
    check(
      "cms_person_market_availability_published_decision_check",
      sql`${table.publishedDecision} IN ('inherit', 'show', 'off')`,
    ),
    check(
      "cms_person_market_availability_draft_decision_check",
      sql`${table.draftDecision} IS NULL OR ${table.draftDecision} IN ('inherit', 'show', 'off')`,
    ),
    index("cms_person_market_availability_market_idx").on(table.marketEditionId),
  ],
);

export const cmsRevisionsTable = pgTable(
  "cms_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id")
      .notNull()
      .references((): AnyPgColumn => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    payloadVersion: integer("payload_version").notNull().default(1),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    contentDigest: text("content_digest").notNull(),
    workflowState: text("workflow_state").notNull().default("draft"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => cmsUsersTable.id, { onDelete: "restrict" }),
    approvedByUserId: uuid("approved_by_user_id").references(
      () => cmsUsersTable.id,
      { onDelete: "set null" },
    ),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_revisions_edition_number_uidx").on(
      table.editionId,
      table.revisionNumber,
    ),
    index("cms_revisions_edition_state_idx").on(
      table.editionId,
      table.workflowState,
    ),
    index("cms_revisions_digest_idx").on(table.contentDigest),
  ],
);

export const cmsTaxonomiesTable = pgTable(
  "cms_taxonomies",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    key: text("key").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cms_taxonomies_key_uidx").on(table.key)],
);

export const cmsTaxonomyTermsTable = pgTable(
  "cms_taxonomy_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    taxonomyId: uuid("taxonomy_id")
      .notNull()
      .references(() => cmsTaxonomiesTable.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references(
      (): AnyPgColumn => cmsTaxonomyTermsTable.id,
      { onDelete: "set null" },
    ),
    slug: text("slug").notNull(),
    label: text("label").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    active: boolean("active").notNull().default(true),
  },
  (table) => [
    uniqueIndex("cms_taxonomy_terms_taxonomy_slug_uidx").on(
      table.taxonomyId,
      table.slug,
    ),
    index("cms_taxonomy_terms_parent_idx").on(table.parentId),
  ],
);

export const cmsDocumentTermsTable = pgTable(
  "cms_document_terms",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    termId: uuid("term_id")
      .notNull()
      .references(() => cmsTaxonomyTermsTable.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.termId] }),
    index("cms_document_terms_term_idx").on(table.termId),
  ],
);

export const cmsDocumentReferencesTable = pgTable(
  "cms_document_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceDocumentId: uuid("source_document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    targetDocumentId: uuid("target_document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "restrict" }),
    relation: text("relation").notNull().default("related"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_document_references_edge_uidx").on(
      table.sourceDocumentId,
      table.targetDocumentId,
      table.relation,
    ),
    index("cms_document_references_target_idx").on(table.targetDocumentId),
  ],
);

export const cmsMediaAssetsTable = pgTable(
  "cms_media_assets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storageKey: text("storage_key").notNull(),
    filename: text("filename").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    checksum: text("checksum").notNull(),
    altText: text("alt_text"),
    credit: text("credit"),
    status: text("status").notNull().default("active"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(
      () => cmsUsersTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_media_assets_storage_key_uidx").on(table.storageKey),
    index("cms_media_assets_checksum_idx").on(table.checksum),
    index("cms_media_assets_status_idx").on(table.status),
  ],
);

/** Immutable object versions keep published revisions reproducible. */
export const cmsMediaVersionsTable = pgTable(
  "cms_media_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => cmsMediaAssetsTable.id, { onDelete: "cascade" }),
    versionNumber: integer("version_number").notNull(),
    storageKey: text("storage_key").notNull(),
    checksum: text("checksum").notNull(),
    byteSize: integer("byte_size").notNull(),
    width: integer("width"),
    height: integer("height"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_media_versions_asset_version_uidx").on(
      table.assetId,
      table.versionNumber,
    ),
    uniqueIndex("cms_media_versions_storage_key_uidx").on(table.storageKey),
  ],
);

export const cmsMediaReferencesTable = pgTable(
  "cms_media_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => cmsMediaAssetsTable.id, { onDelete: "restrict" }),
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    fieldPath: text("field_path").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_media_references_location_uidx").on(
      table.documentId,
      table.fieldPath,
      table.assetId,
    ),
    index("cms_media_references_asset_idx").on(table.assetId),
  ],
);

export const insertCmsDocumentSchema = createInsertSchema(cmsDocumentsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCmsMarketEditionSchema = createInsertSchema(
  cmsMarketEditionsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCmsRevisionSchema = createInsertSchema(cmsRevisionsTable).omit({
  id: true,
  createdAt: true,
});
export const insertCmsTaxonomySchema = createInsertSchema(cmsTaxonomiesTable).omit({
  id: true,
  createdAt: true,
});
export const insertCmsTaxonomyTermSchema = createInsertSchema(
  cmsTaxonomyTermsTable,
).omit({ id: true });
export const insertCmsMediaAssetSchema = createInsertSchema(
  cmsMediaAssetsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertCmsDocument = z.infer<typeof insertCmsDocumentSchema>;
export type CmsDocument = typeof cmsDocumentsTable.$inferSelect;
export type CmsMarketEdition = typeof cmsMarketEditionsTable.$inferSelect;
export type CmsPersonMarketAvailability =
  typeof cmsPersonMarketAvailabilityTable.$inferSelect;
export type CmsRevision = typeof cmsRevisionsTable.$inferSelect;
export type CmsTaxonomy = typeof cmsTaxonomiesTable.$inferSelect;
export type CmsTaxonomyTerm = typeof cmsTaxonomyTermsTable.$inferSelect;
export type CmsMediaAsset = typeof cmsMediaAssetsTable.$inferSelect;
export type CmsMediaVersion = typeof cmsMediaVersionsTable.$inferSelect;