import {
  boolean,
  index,
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

/**
 * Workflow sidecar for first-party forms. `sourceType` and `sourceId` identify
 * the immutable source record without coupling the workflow to one form table.
 */
export const cmsSubmissionWorkflowsTable = pgTable(
  "cms_submission_workflows",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sourceType: text("source_type").notNull(),
    sourceId: uuid("source_id").notNull(),
    status: text("status").notNull().default("new"),
    priority: text("priority").notNull().default("normal"),
    assignedToUserId: uuid("assigned_to_user_id").references(
      () => cmsUsersTable.id,
      { onDelete: "set null" },
    ),
    consentGranted: boolean("consent_granted").notNull(),
    consentPolicyVersion: text("consent_policy_version").notNull(),
    consentCapturedAt: timestamp("consent_captured_at", {
      withTimezone: true,
    }).notNull(),
    firstRespondedAt: timestamp("first_responded_at", { withTimezone: true }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    deletionDueAt: timestamp("deletion_due_at", { withTimezone: true }).notNull(),
    notes: jsonb("notes").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_submission_workflows_source_uidx").on(
      table.sourceType,
      table.sourceId,
    ),
    index("cms_submission_workflows_queue_idx").on(
      table.status,
      table.priority,
      table.createdAt,
    ),
    index("cms_submission_workflows_assignee_idx").on(
      table.assignedToUserId,
      table.status,
    ),
    index("cms_submission_workflows_deletion_idx").on(table.deletionDueAt),
  ],
);

export const cmsSubmissionEventsTable = pgTable(
  "cms_submission_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workflowId: uuid("workflow_id")
      .notNull()
      .references(() => cmsSubmissionWorkflowsTable.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    eventType: text("event_type").notNull(),
    fromStatus: text("from_status"),
    toStatus: text("to_status"),
    details: jsonb("details").$type<Record<string, unknown>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_submission_events_workflow_time_idx").on(
      table.workflowId,
      table.createdAt,
    ),
  ],
);

export const insertCmsSubmissionWorkflowSchema = createInsertSchema(
  cmsSubmissionWorkflowsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export const insertCmsSubmissionEventSchema = createInsertSchema(
  cmsSubmissionEventsTable,
).omit({ id: true, createdAt: true });

export type InsertCmsSubmissionWorkflow = z.infer<
  typeof insertCmsSubmissionWorkflowSchema
>;
export type CmsSubmissionWorkflow =
  typeof cmsSubmissionWorkflowsTable.$inferSelect;
export type CmsSubmissionEvent = typeof cmsSubmissionEventsTable.$inferSelect;