import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Durable provenance for editorial-assistant executions. Each request owns one
 * row that advances from running to a terminal status. Inputs are redacted
 * before persistence; provider credentials and source text are never stored.
 */
export const cmsAssistantRunsTable = pgTable(
  "cms_assistant_runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: text("request_id").notNull().unique(),
    actor: text("actor").notNull(),
    market: text("market").notNull(),
    subjectId: text("subject_id").notNull(),
    operation: text("operation").notNull(),
    targetContext: jsonb("target_context").$type<{
      fieldPath: string;
      contentType: string;
      language: string;
      maxLength: number;
      revisionId: string;
      contentClass: "public" | "internal";
    }>().notNull(),
    status: text("status").notNull(),
    provider: text("provider"),
    model: text("model"),
    policyVersion: text("policy_version").notNull(),
    promptTemplateVersion: text("prompt_template_version").notNull(),
    inputDigest: text("input_digest").notNull(),
    sourceProvenance: jsonb("source_provenance").$type<unknown>().notNull(),
    redactions: jsonb("redactions").$type<unknown>().notNull(),
    result: jsonb("result").$type<unknown>(),
    promptTokens: integer("prompt_tokens").notNull().default(0),
    completionTokens: integer("completion_tokens").notNull().default(0),
    estimatedCostMicros: integer("estimated_cost_micros").notNull().default(0),
    latencyMs: integer("latency_ms"),
    failureCode: text("failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
  },
  (table) => [
    index("cms_assistant_runs_actor_created_idx").on(table.actor, table.createdAt),
    index("cms_assistant_runs_created_idx").on(table.createdAt),
  ],
);

/** Human acceptance/rejection ledger. No automated acceptance path exists. */
export const cmsAssistantDecisionsTable = pgTable(
  "cms_assistant_decisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestId: text("request_id").notNull().unique(),
    subjectId: text("subject_id").notNull(),
    market: text("market").notNull(),
    actor: text("actor").notNull(),
    decision: text("decision").notNull(),
    reason: text("reason").notNull(),
    resultingRevisionId: text("resulting_revision_id"),
    wasEdited: boolean("was_edited").notNull().default(false),
    auditStatus: text("audit_status").notNull().default("pending"),
    auditFailureCode: text("audit_failure_code"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_assistant_decisions_created_idx").on(table.createdAt),
    index("cms_assistant_decisions_subject_audit_idx").on(table.subjectId, table.auditStatus),
  ],
);

export const insertCmsAssistantRunSchema = createInsertSchema(cmsAssistantRunsTable)
  .omit({ id: true, createdAt: true });
export const insertCmsAssistantDecisionSchema = createInsertSchema(cmsAssistantDecisionsTable)
  .omit({ id: true, createdAt: true });
export type CmsAssistantRun = typeof cmsAssistantRunsTable.$inferSelect;
export type CmsAssistantDecision = typeof cmsAssistantDecisionsTable.$inferSelect;
export type InsertCmsAssistantRun = z.infer<typeof insertCmsAssistantRunSchema>;
export type InsertCmsAssistantDecision = z.infer<typeof insertCmsAssistantDecisionSchema>;