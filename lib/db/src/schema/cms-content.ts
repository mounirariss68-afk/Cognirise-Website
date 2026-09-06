import {
  boolean,
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
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * The CMS persistence model deliberately uses stable IDs for relationships.
 * Slugs are delivery indexes only and are never used as foreign keys.
 * State/kind fields are text rather than PostgreSQL enums so deployments can
 * evolve workflow policy without a vendor-specific enum migration.
 */
export const cmsDocumentsTable = pgTable(
  "cms_documents",
  {
    id: text("id").primaryKey(),
    kind: text("kind").notNull(),
    canonicalSlug: text("canonical_slug"),
    routeKind: text("route_kind"),
    ownerId: text("owner_id"),
    contentClass: text("content_class").notNull().default("public"),
    currentVersion: integer("current_version").notNull().default(1),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    index("cms_documents_kind_idx").on(table.kind),
    uniqueIndex("cms_documents_kind_canonical_slug_idx").on(table.kind, table.canonicalSlug),
  ],
);

/** One independent editorial/release boundary per document and market. */
export const cmsMarketEditionsTable = pgTable(
  "cms_market_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    documentId: text("document_id").notNull().references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
    market: text("market").notNull(),
    fallbackMode: text("fallback_mode").notNull(),
    publicationState: text("publication_state").notNull().default("draft"),
    localizedSlug: text("localized_slug"),
    parityComplete: boolean("parity_complete").notNull().default(false),
    version: integer("version").notNull().default(1),
    draftRevisionId: uuid("draft_revision_id"),
    liveRevisionId: uuid("live_revision_id"),
    approvedByPrincipalId: text("approved_by_principal_id"),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    lastEditorPrincipalId: text("last_editor_principal_id"),
    lastRequesterPrincipalId: text("last_requester_principal_id"),
    lastApprovalPrincipalId: text("last_approval_principal_id"),
    lastPublisherPrincipalId: text("last_publisher_principal_id"),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("cms_market_editions_document_market_idx").on(table.documentId, table.market),
    uniqueIndex("cms_market_editions_market_slug_idx").on(table.market, table.localizedSlug),
    index("cms_market_editions_due_idx").on(table.publicationState, table.publishAt, table.expiresAt),
  ],
);

/** Immutable, versioned content snapshots. `payload` is validated before write. */
export const cmsRevisionsTable = pgTable(
  "cms_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    editionId: uuid("edition_id").notNull().references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
    revisionNumber: integer("revision_number").notNull(),
    payloadVersion: integer("payload_version").notNull().default(1),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    contentDigest: text("content_digest").notNull(),
    createdByPrincipalId: text("created_by_principal_id").notNull(),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_revisions_edition_number_idx").on(table.editionId, table.revisionNumber),
    index("cms_revisions_edition_created_idx").on(table.editionId, table.createdAt),
  ],
);

export const cmsPrincipalsTable = pgTable("cms_principals", {
  id: text("id").primaryKey(),
  clerkUserId: text("clerk_user_id").notNull().unique(),
  role: text("role").notNull().default("author"),
  displayName: text("display_name"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const cmsPrincipalMarketsTable = pgTable(
  "cms_principal_markets",
  {
    principalId: text("principal_id").notNull().references(() => cmsPrincipalsTable.id, { onDelete: "cascade" }),
    market: text("market").notNull(),
    assignedAt: timestamp("assigned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.principalId, table.market] })],
);

export const cmsMediaAssetsTable = pgTable("cms_media_assets", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  title: text("title").notNull(),
  altText: text("alt_text"),
  decorative: boolean("decorative").notNull().default(false),
  caption: text("caption"),
  rightsOwner: text("rights_owner"),
  rightsExpiresAt: timestamp("rights_expires_at", { withTimezone: true }),
  lifecycleState: text("lifecycle_state").notNull().default("draft"),
  /** Upload intents are private, short lived, and may only be finalized by this exact path. */
  pendingObjectPath: text("pending_object_path"),
  pendingContentType: text("pending_content_type"),
  pendingByteSize: integer("pending_byte_size"),
  pendingExpiresAt: timestamp("pending_expires_at", { withTimezone: true }),
  createdByPrincipalId: text("created_by_principal_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const cmsMediaVersionsTable = pgTable(
  "cms_media_versions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    mediaId: text("media_id").notNull().references(() => cmsMediaAssetsTable.id, { onDelete: "cascade" }),
    version: integer("version").notNull(),
    objectPath: text("object_path"),
    externalUrl: text("external_url"),
    contentType: text("content_type"),
    byteSize: integer("byte_size"),
    checksum: text("checksum"),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>().notNull().default({}),
    createdByPrincipalId: text("created_by_principal_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cms_media_versions_media_version_idx").on(table.mediaId, table.version)],
);

/** References are retained independently of JSON payloads for impact analysis. */
export const cmsMediaReferencesTable = pgTable(
  "cms_media_references",
  {
    mediaId: text("media_id").notNull().references(() => cmsMediaAssetsTable.id, { onDelete: "cascade" }),
    /** Concrete immutable version selected when this revision was written. */
    mediaVersion: integer("media_version").notNull(),
    revisionId: uuid("revision_id").notNull().references(() => cmsRevisionsTable.id, { onDelete: "cascade" }),
    fieldPath: text("field_path").notNull(),
  },
  (table) => [primaryKey({ columns: [table.mediaId, table.revisionId, table.fieldPath] })],
);

export const cmsRedirectsTable = pgTable(
  "cms_redirects",
  {
    id: text("id").primaryKey(),
    market: text("market"),
    sourcePath: text("source_path").notNull(),
    destinationPath: text("destination_path").notNull(),
    statusCode: integer("status_code").notNull(),
    active: boolean("active").notNull().default(false),
    state: text("state").notNull().default("draft"),
    version: integer("version").notNull().default(1),
    publishAt: timestamp("publish_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
  },
  (table) => [uniqueIndex("cms_redirects_market_source_idx").on(table.market, table.sourcePath)],
);

export const cmsPreviewSessionsTable = pgTable("cms_preview_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  nonceDigest: text("nonce_digest").notNull().unique(),
  editionId: uuid("edition_id").notNull().references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
  revisionId: uuid("revision_id").notNull().references(() => cmsRevisionsTable.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** One-time exchange consumption; distinct from operator revocation. */
  exchangedAt: timestamp("exchanged_at", { withTimezone: true }),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  createdByPrincipalId: text("created_by_principal_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Transactional invalidation/event hand-off. A dispatcher owns delivery state. */
export const cmsOutboxTable = pgTable(
  "cms_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    topic: text("topic").notNull(),
    aggregateId: text("aggregate_id").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    dedupeKey: text("dedupe_key").notNull().unique(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("cms_outbox_dispatch_idx").on(table.processedAt, table.availableAt)],
);

export const insertCmsDocumentSchema = createInsertSchema(cmsDocumentsTable).omit({ createdAt: true, updatedAt: true });
export const insertCmsMarketEditionSchema = createInsertSchema(cmsMarketEditionsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCmsRevisionSchema = createInsertSchema(cmsRevisionsTable).omit({ id: true, createdAt: true });
export type CmsDocument = typeof cmsDocumentsTable.$inferSelect;
export type CmsMarketEdition = typeof cmsMarketEditionsTable.$inferSelect;
export type CmsRevision = typeof cmsRevisionsTable.$inferSelect;
export type CmsPrincipal = typeof cmsPrincipalsTable.$inferSelect;
export type InsertCmsDocument = z.infer<typeof insertCmsDocumentSchema>;
export type InsertCmsMarketEdition = z.infer<typeof insertCmsMarketEditionSchema>;
export type InsertCmsRevision = z.infer<typeof insertCmsRevisionSchema>;