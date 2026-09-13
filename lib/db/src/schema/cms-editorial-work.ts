import {
  boolean,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { cmsUsersTable } from "./cms-auth";
import { cmsDocumentsTable, cmsMarketEditionsTable, cmsRevisionsTable } from "./cms-content";

export const cmsEditorialAssignmentsTable = pgTable("cms_editorial_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  documentId: uuid("document_id").notNull().references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
  editionId: uuid("edition_id").references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
  editorUserId: uuid("editor_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  reviewerUserId: uuid("reviewer_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  dueAt: timestamp("due_at", { withTimezone: true }),
  createdByUserId: uuid("created_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cms_editorial_assignments_edition_uidx").on(table.editionId).where(sql`${table.editionId} IS NOT NULL`),
  index("cms_editorial_assignments_editor_idx").on(table.editorUserId, table.dueAt),
  index("cms_editorial_assignments_reviewer_idx").on(table.reviewerUserId, table.dueAt),
]);

export const cmsReviewRequestsTable = pgTable("cms_review_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  editionId: uuid("edition_id").notNull().references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
  revisionId: uuid("revision_id").notNull().references(() => cmsRevisionsTable.id, { onDelete: "cascade" }),
  requesterUserId: uuid("requester_user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "restrict" }),
  reviewerUserId: uuid("reviewer_user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "restrict" }),
  status: text("status").notNull().default("requested"),
  note: text("note"),
  decisionNote: text("decision_note"),
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  supersededAt: timestamp("superseded_at", { withTimezone: true }),
  blockedReason: text("blocked_reason"),
}, (table) => [
  uniqueIndex("cms_review_requests_open_revision_uidx").on(table.revisionId).where(sql`${table.status}='requested'`),
  index("cms_review_requests_reviewer_idx").on(table.reviewerUserId, table.status, table.requestedAt),
]);

export const cmsEditorialNotificationsTable = pgTable("cms_editorial_notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
  eventKey: text("event_key").notNull(),
  type: text("type").notNull(),
  editionId: uuid("edition_id").references(() => cmsMarketEditionsTable.id, { onDelete: "cascade" }),
  documentId: uuid("document_id").references(() => cmsDocumentsTable.id, { onDelete: "cascade" }),
  revisionId: uuid("revision_id").references(() => cmsRevisionsTable.id, { onDelete: "cascade" }),
  reviewRequestId: uuid("review_request_id").references(() => cmsReviewRequestsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  link: text("link").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  digestDeliveredAt: timestamp("digest_delivered_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cms_editorial_notifications_event_uidx").on(table.userId, table.eventKey),
  index("cms_editorial_notifications_user_idx").on(table.userId, table.readAt, table.createdAt),
]);

export const cmsEditorialDigestPreferencesTable = pgTable("cms_editorial_digest_preferences", {
  userId: uuid("user_id").primaryKey().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
  enabled: boolean("enabled").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsEditorialDigestJobsTable = pgTable("cms_editorial_digest_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
  digestDate: date("digest_date").notNull(),
  status: text("status").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
  processingLease: uuid("processing_lease"),
  lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  lastError: text("last_error"),
  deliveryProvider: text("delivery_provider"),
  deliveryConfigurationFingerprint: text("delivery_configuration_fingerprint"),
  deliveryConnectionId: text("delivery_connection_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex("cms_editorial_digest_jobs_user_date_uidx").on(table.userId, table.digestDate),
  index("cms_editorial_digest_jobs_due_idx").on(table.status, table.availableAt),
]);

export const cmsEditorialDigestJobNotificationsTable = pgTable("cms_editorial_digest_job_notifications", {
  jobId: uuid("job_id").notNull().references(() => cmsEditorialDigestJobsTable.id, { onDelete: "cascade" }),
  notificationId: uuid("notification_id").notNull().references(() => cmsEditorialNotificationsTable.id, { onDelete: "restrict" }),
}, (table) => [
  primaryKey({ columns: [table.jobId, table.notificationId] }),
  uniqueIndex("cms_editorial_digest_job_notifications_notification_uidx").on(table.notificationId),
]);