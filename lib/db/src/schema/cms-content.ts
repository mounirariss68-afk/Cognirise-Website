import {
  AnyPgColumn,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
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

export const cmsLandingPageReconciliationTable = pgTable(
  "cms_landing_page_reconciliation",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    sourceKey: text("source_key").notNull(),
    compiledDigest: text("compiled_digest").notNull(),
    compiledPayload: jsonb("compiled_payload")
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    compiledVisualSources: jsonb("compiled_visual_sources")
      .$type<string[]>()
      .notNull()
      .default([]),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.documentId, table.sourceKey] }),
    index("cms_landing_page_reconciliation_digest_idx").on(
      table.sourceKey,
      table.compiledDigest,
    ),
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
    /**
     * Shared editions are the one editable source used by availability
     * destinations. Exact regional editions stay custom and never receive a
     * shared publication implicitly.
     */
    contentMode: text("content_mode").notNull().default("custom"),
    /**
     * Stable editorial origin for a shared edition whose market/locale are
     * relocated to an internal delivery address. `market` remains the address
     * used for delivery and routing.
     */
    editorialMarket: text("editorial_market"),
    customizedFromRevisionId: uuid("customized_from_revision_id").references(
      (): AnyPgColumn => cmsRevisionsTable.id,
      { onDelete: "set null" },
    ),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_market_editions_document_market_locale_uidx").on(
      table.documentId,
      table.market,
      table.locale,
    ),
    uniqueIndex("cms_market_editions_market_locale_slug_uidx").on(
      table.market,
      table.locale,
      table.localizedSlug,
    ),
    index("cms_market_editions_release_idx").on(
      table.publicationState,
      table.publishAt,
    ),
    index("cms_market_editions_published_revision_idx").on(table.publishedRevisionId),
    index("cms_market_editions_content_mode_idx").on(table.documentId, table.contentMode),
  ],
);

/**
 * An explicit delivery decision for a document in a configured market.
 * Absence of a row and `inherit` have the same delivery semantics, while
 * retaining `inherit` allows an editor's deliberate reset to be audited.
 */
export const cmsDocumentMarketAvailabilityTable = pgTable(
  "cms_document_market_availability",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    marketEditionId: uuid("market_edition_id")
      .notNull()
      .references(() => marketEditionsTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    publishedDecision: text("published_decision").notNull().default("off"),
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
    primaryKey({ columns: [table.documentId, table.marketEditionId, table.locale] }),
    check(
      "cms_document_market_availability_published_decision_check",
      sql`${table.publishedDecision} IN ('inherit', 'show', 'off')`,
    ),
    check(
      "cms_document_market_availability_draft_decision_check",
      sql`${table.draftDecision} IS NULL OR ${table.draftDecision} IN ('inherit', 'show', 'off')`,
    ),
    index("cms_document_market_availability_market_idx").on(table.marketEditionId),
  ],
);

/** One optimistic-lock boundary for all of a shared document's destinations. */
export const cmsDocumentAvailabilityStatesTable = pgTable(
  "cms_document_availability_states",
  {
    documentId: uuid("document_id")
      .primaryKey()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    draftVersion: integer("draft_version").notNull().default(0),
    reviewedVersion: integer("reviewed_version"),
    publishedVersion: integer("published_version").notNull().default(0),
    sharedSourceEditionId: uuid("shared_source_edition_id").references(
      () => cmsMarketEditionsTable.id,
      { onDelete: "set null" },
    ),
    sharedSourceRevisionId: uuid("shared_source_revision_id").references(
      () => cmsRevisionsTable.id,
      { onDelete: "set null" },
    ),
    publishedSourceRevisionId: uuid("published_source_revision_id").references(
      () => cmsRevisionsTable.id,
      { onDelete: "set null" },
    ),
    reviewedSourceRevisionId: uuid("reviewed_source_revision_id").references(
      () => cmsRevisionsTable.id,
      { onDelete: "set null" },
    ),
    reviewedSelections: jsonb("reviewed_selections")
      .$type<Array<{ marketEditionId: string; locale: string; decision: "inherit" | "show" | "off" }>>()
      .notNull()
      .default([]),
    updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    reviewedByUserId: uuid("reviewed_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    publishedByUserId: uuid("published_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
  },
);

/** Idempotently reconciled migration evidence for delivery parity audits. */
export const cmsDocumentAvailabilityMigrationReportsTable = pgTable(
  "cms_document_availability_migration_reports",
  {
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    marketEditionId: uuid("market_edition_id")
      .notNull()
      .references(() => marketEditionsTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    legacyDecision: text("legacy_decision"),
    legacyPublishedDecision: text("legacy_published_decision"),
    legacyDraftDecision: text("legacy_draft_decision"),
    publishedDecision: text("published_decision").notNull(),
    draftDecision: text("draft_decision"),
    visibilityPreserved: boolean("visibility_preserved").notNull(),
    legacyResolvable: boolean("legacy_resolvable").notNull(),
    publishedResolvable: boolean("published_resolvable").notNull(),
    resolvabilityPreserved: boolean("resolvability_preserved").notNull(),
    legacySelectedEditionId: uuid("legacy_selected_edition_id"),
    legacySelectedRevisionId: uuid("legacy_selected_revision_id"),
    publishedSelectedEditionId: uuid("published_selected_edition_id"),
    publishedSelectedRevisionId: uuid("published_selected_revision_id"),
    selectionPreserved: boolean("selection_preserved").notNull().default(true),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.marketEditionId, table.locale] })],
);

export const cmsDocumentAvailabilityMigrationControlTable = pgTable(
  "cms_document_availability_migration_control",
  {
    migrationKey: text("migration_key").primaryKey(),
    completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** Reconciliation evidence for internal shared-source editorial origins. */
export const cmsEditorialMarketMigrationReportsTable = pgTable(
  "cms_editorial_market_migration_reports",
  {
    marketEditionId: uuid("market_edition_id")
      .primaryKey()
      .references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
    candidateCount: integer("candidate_count").notNull(),
    resolvedMarket: text("resolved_market"),
    ambiguous: boolean("ambiguous").notNull(),
    reconciledAt: timestamp("reconciled_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/** @deprecated Read-only legacy compatibility model; use cmsDocumentMarketAvailabilityTable. */
export const cmsPersonMarketAvailabilityTable = pgTable(
  "cms_person_market_availability",
  {
    documentId: uuid("document_id").notNull(),
    marketEditionId: uuid("market_edition_id").notNull(),
    decision: text("decision").notNull(),
    publishedDecision: text("published_decision").notNull().default("inherit"),
    draftDecision: text("draft_decision"),
    updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    publishedByUserId: uuid("published_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.documentId, table.marketEditionId] })],
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
    sourceRevisionId: uuid("source_revision_id").references(
      (): AnyPgColumn => cmsRevisionsTable.id,
      { onDelete: "set null" },
    ),
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

/**
 * A neutral baseline is deliberately not a cms_market_editions row.  It never
 * participates in legacy delivery/source selection and therefore cannot turn a
 * regional historical edition into a newly public shared source.
 */
export const cmsSharedBaselinesTable = pgTable(
  "cms_shared_baselines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    activeRevisionId: uuid("active_revision_id"),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => cmsUsersTable.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_shared_baselines_document_locale_uidx").on(table.documentId, table.locale),
    index("cms_shared_baselines_active_revision_idx").on(table.activeRevisionId),
  ],
);

/** Immutable snapshots and explicit source lineage for neutral baselines. */
export const cmsSharedBaselineRevisionsTable = pgTable(
  "cms_shared_baseline_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    baselineId: uuid("baseline_id")
      .notNull()
      .references(() => cmsSharedBaselinesTable.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    mediaReferences: jsonb("media_references").$type<Record<string, unknown>[]>().notNull().default([]),
    contentDigest: text("content_digest").notNull(),
    sourceRevisionId: uuid("source_revision_id").references(() => cmsRevisionsTable.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id").notNull().references(() => cmsUsersTable.id, {
      onDelete: "restrict",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_shared_baseline_revisions_number_uidx").on(
      table.baselineId,
      table.revisionNumber,
    ),
    index("cms_shared_baseline_revisions_source_idx").on(table.sourceRevisionId),
  ],
);

/**
 * Exact market bindings are additive metadata. Their mode is independent from
 * legacy cms_market_editions.content_mode so no existing legacy publication
 * pointer or availability state is reinterpreted by this feature.
 */
export const cmsMarketEditionBindingsTable = pgTable(
  "cms_market_edition_bindings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id")
      .notNull()
      .references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    marketEditionId: uuid("market_edition_id")
      .notNull()
      .references(() => marketEditionsTable.id, { onDelete: "cascade" }),
    locale: text("locale").notNull(),
    mode: text("mode").notNull(),
    baselineId: uuid("baseline_id").references(() => cmsSharedBaselinesTable.id, {
      onDelete: "set null",
    }),
    basedOnBaselineRevisionId: uuid("based_on_baseline_revision_id").references(
      () => cmsSharedBaselineRevisionsTable.id,
      { onDelete: "set null" },
    ),
    overrideOperations: jsonb("override_operations").$type<Record<string, unknown>[]>().notNull().default([]),
    heldBaselineRevisionId: uuid("held_baseline_revision_id").references(
      () => cmsSharedBaselineRevisionsTable.id,
      { onDelete: "set null" },
    ),
    materializedRevisionId: uuid("materialized_revision_id").references(() => cmsRevisionsTable.id, {
      onDelete: "set null",
    }),
    version: integer("version").notNull().default(1),
    translationState: text("translation_state").notNull().default("current"),
    translationSourceRevisionId: uuid("translation_source_revision_id").references(
      () => cmsSharedBaselineRevisionsTable.id,
      { onDelete: "set null" },
    ),
    updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_market_edition_bindings_address_uidx").on(
      table.documentId,
      table.marketEditionId,
      table.locale,
    ),
    check("cms_market_edition_bindings_mode_check", sql`${table.mode} IN ('shared','adapted','independent')`),
    check(
      "cms_market_edition_bindings_baseline_check",
      sql`(${table.mode}='independent' AND ${table.baselineId} IS NULL)
        OR (${table.mode} IN ('shared','adapted') AND ${table.baselineId} IS NOT NULL)`,
    ),
    check(
      "cms_market_edition_bindings_translation_state_check",
      sql`${table.translationState} IN ('current','stale','not-applicable')`,
    ),
    index("cms_market_edition_bindings_baseline_idx").on(table.baselineId, table.locale),
    index("cms_market_edition_bindings_materialized_idx").on(table.materializedRevisionId),
  ],
);

/** Immutable evidence of the exact resolved snapshot and its media pins. */
export const cmsResolvedMarketRevisionsTable = pgTable(
  "cms_resolved_market_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bindingId: uuid("binding_id")
      .notNull()
      .references(() => cmsMarketEditionBindingsTable.id, { onDelete: "cascade" }),
    cmsRevisionId: uuid("cms_revision_id")
      .notNull()
      .references(() => cmsRevisionsTable.id, { onDelete: "cascade" }),
    baselineRevisionId: uuid("baseline_revision_id").references(() => cmsSharedBaselineRevisionsTable.id, {
      onDelete: "set null",
    }),
    snapshot: jsonb("snapshot").$type<Record<string, unknown>>().notNull(),
    mediaReferences: jsonb("media_references").$type<Record<string, unknown>[]>().notNull().default([]),
    contentDigest: text("content_digest").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_resolved_market_revisions_cms_revision_uidx").on(table.cmsRevisionId),
    index("cms_resolved_market_revisions_binding_idx").on(table.bindingId, table.createdAt),
  ],
);

/** Immutable dry-run/report receipts; no migration action creates a baseline. */
export const cmsSharedEditionMigrationReceiptsTable = pgTable(
  "cms_shared_edition_migration_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: uuid("document_id").references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    dryRun: boolean("dry_run").notNull(),
    report: jsonb("report").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cms_shared_edition_migration_receipts_document_idx").on(table.documentId, table.createdAt)],
);

export const cmsReviewCommentsTable = pgTable(
  "cms_review_comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    revisionId: uuid("revision_id").notNull().references(() => cmsRevisionsTable.id, {
      onDelete: "cascade",
    }),
    authorUserId: uuid("author_user_id").notNull().references(() => cmsUsersTable.id, {
      onDelete: "restrict",
    }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check("cms_review_comments_body_check", sql`char_length(btrim(${table.body})) BETWEEN 1 AND 2000`),
    index("cms_review_comments_revision_idx").on(table.revisionId, table.createdAt),
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
    originalFilename: text("original_filename").notNull(),
    mediaType: text("media_type").notNull(),
    byteSize: integer("byte_size").notNull(),
    checksum: text("checksum").notNull(),
    altText: text("alt_text"),
    credit: text("credit"),
    collection: text("collection").notNull().default("website"),
    linkedinAssetKind: text("linkedin_asset_kind"),
    campaignMetadata: jsonb("campaign_metadata").$type<Record<string, unknown>>(),
    motionMetadata: jsonb("motion_metadata").$type<Record<string, unknown>>(),
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
    index("cms_media_assets_collection_kind_idx").on(
      table.collection,
      table.linkedinAssetKind,
    ),
    check(
      "cms_media_assets_collection_check",
      sql`${table.collection} IN ('website', 'linkedin', 'motion')`,
    ),
    check(
      "cms_media_assets_collection_kind_check",
      sql`(${table.collection} IN ('website', 'motion') AND ${table.linkedinAssetKind} IS NULL)
        OR (${table.collection} = 'linkedin' AND ${table.linkedinAssetKind} IN ('post', 'header'))`,
    ),
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
    unique("cms_media_versions_id_asset_uidx").on(table.id, table.assetId),
    index("cms_media_versions_storage_key_idx").on(table.storageKey),
  ],
);

export const cmsMediaReferencesTable = pgTable(
  "cms_media_references",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    assetId: uuid("asset_id")
      .notNull()
      .references(() => cmsMediaAssetsTable.id, { onDelete: "restrict" }),
    mediaVersionId: uuid("media_version_id"),
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
    foreignKey({
      columns: [table.mediaVersionId, table.assetId],
      foreignColumns: [cmsMediaVersionsTable.id, cmsMediaVersionsTable.assetId],
      name: "cms_media_references_version_asset_fk",
    }).onDelete("restrict"),
    index("cms_media_references_asset_idx").on(table.assetId),
    index("cms_media_references_version_idx").on(table.mediaVersionId),
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
export type CmsDocumentMarketAvailability =
  typeof cmsDocumentMarketAvailabilityTable.$inferSelect;
export type CmsDocumentAvailabilityState =
  typeof cmsDocumentAvailabilityStatesTable.$inferSelect;
export type CmsRevision = typeof cmsRevisionsTable.$inferSelect;
export type CmsSharedBaseline = typeof cmsSharedBaselinesTable.$inferSelect;
export type CmsSharedBaselineRevision = typeof cmsSharedBaselineRevisionsTable.$inferSelect;
export type CmsMarketEditionBinding = typeof cmsMarketEditionBindingsTable.$inferSelect;
export type CmsResolvedMarketRevision = typeof cmsResolvedMarketRevisionsTable.$inferSelect;
export type CmsReviewComment = typeof cmsReviewCommentsTable.$inferSelect;
export type CmsTaxonomy = typeof cmsTaxonomiesTable.$inferSelect;
export type CmsTaxonomyTerm = typeof cmsTaxonomyTermsTable.$inferSelect;
export type CmsMediaAsset = typeof cmsMediaAssetsTable.$inferSelect;
export type CmsMediaVersion = typeof cmsMediaVersionsTable.$inferSelect;