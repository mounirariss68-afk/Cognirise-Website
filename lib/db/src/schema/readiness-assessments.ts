import { jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const readinessAssessmentsTable = pgTable("readiness_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  answers: jsonb("answers").$type<Record<string, string>>().notNull(),
  decision: text("decision").notNull(),
  unresolvedConditionIds: text("unresolved_condition_ids").array().notNull(),
  deleteTokenHash: text("delete_token_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});

export const insertReadinessAssessmentSchema = createInsertSchema(
  readinessAssessmentsTable,
).omit({ id: true, createdAt: true });

export type InsertReadinessAssessment = z.infer<typeof insertReadinessAssessmentSchema>;
export type ReadinessAssessment = typeof readinessAssessmentsTable.$inferSelect;