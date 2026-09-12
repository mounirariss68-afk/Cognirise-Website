import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { cmsUsersTable } from "./cms-auth";
import { cmsDocumentsTable, cmsMarketEditionsTable, cmsRevisionsTable } from "./cms-content";

/** Append-only record of security, editorial, and publishing decisions. */
export const cmsAuditEventsTable = pgTable(
  "cms_audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorUserId: uuid("actor_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    actorLabel: text("actor_label").notNull(),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    outcome: text("outcome").notNull().default("success"),
    requestId: text("request_id"),
    ipDigest: text("ip_digest"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_audit_events_request_uidx").on(table.requestId),
    index("cms_audit_events_target_time_idx").on(
      table.targetType,
      table.targetId,
      table.occurredAt,
    ),
    index("cms_audit_events_actor_time_idx").on(
      table.actorUserId,
      table.occurredAt,
    ),
    index("cms_audit_events_action_time_idx").on(table.action, table.occurredAt),
  ],
);

/** Revocable preview capability. Only a one-way token digest is persisted. */
export const cmsPreviewSessionsTable = pgTable(
  "cms_preview_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tokenDigest: text("token_digest").notNull(),
    editionId: uuid("edition_id")
      .notNull()
      .references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
    revisionId: uuid("revision_id")
      .notNull()
      .references(() => cmsRevisionsTable.id, { onDelete: "cascade" }),
    requestedMarket: text("requested_market"),
    requestedLocale: text("requested_locale"),
    fallbackReason: text("fallback_reason"),
    navigationPolicyDigest: text("navigation_policy_digest"),
    navigationSnapshot: jsonb("navigation_snapshot").$type<Record<string, unknown>>(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_preview_sessions_token_uidx").on(table.tokenDigest),
    index("cms_preview_sessions_edition_expiry_idx").on(
      table.editionId,
      table.expiresAt,
    ),
    index("cms_preview_sessions_revision_idx").on(table.revisionId),
  ],
);

/** Durable idempotency ledger for mutation and webhook replay protection. */
export const cmsOperationReceiptsTable = pgTable(
  "cms_operation_receipts",
  {
    idempotencyKey: text("idempotency_key").primaryKey(),
    operation: text("operation").notNull(),
    subjectId: text("subject_id").notNull(),
    requestDigest: text("request_digest").notNull(),
    resultDigest: text("result_digest"),
    actorUserId: uuid("actor_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    response: jsonb("response").$type<Record<string, unknown>>(),
    statusCode: integer("status_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_operation_receipts_subject_idx").on(
      table.operation,
      table.subjectId,
    ),
  ],
);

export const cmsRedirectsTable = pgTable(
  "cms_redirects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market: text("market").notNull(),
    sourcePath: text("source_path").notNull(),
    destinationDocumentId: uuid("destination_document_id").references(
      () => cmsDocumentsTable.id,
      { onDelete: "restrict" },
    ),
    destinationUrl: text("destination_url"),
    httpStatus: text("http_status").notNull().default("308"),
    activeFrom: timestamp("active_from", { withTimezone: true }).notNull().defaultNow(),
    activeUntil: timestamp("active_until", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("cms_redirects_market_source_uidx").on(
      table.market,
      table.sourcePath,
    ),
    index("cms_redirects_active_idx").on(table.activeFrom, table.activeUntil),
  ],
);

export const insertCmsAuditEventSchema = createInsertSchema(
  cmsAuditEventsTable,
).omit({ id: true, occurredAt: true });
export const insertCmsPreviewSessionSchema = createInsertSchema(
  cmsPreviewSessionsTable,
).omit({ id: true, createdAt: true });
export const insertCmsOperationReceiptSchema = createInsertSchema(
  cmsOperationReceiptsTable,
).omit({ createdAt: true });
export const insertCmsRedirectSchema = createInsertSchema(cmsRedirectsTable).omit({
  id: true,
});

export type InsertCmsAuditEvent = z.infer<typeof insertCmsAuditEventSchema>;
export type CmsAuditEvent = typeof cmsAuditEventsTable.$inferSelect;
export type CmsPreviewSession = typeof cmsPreviewSessionsTable.$inferSelect;
export type CmsOperationReceipt = typeof cmsOperationReceiptsTable.$inferSelect;
export type CmsRedirect = typeof cmsRedirectsTable.$inferSelect;