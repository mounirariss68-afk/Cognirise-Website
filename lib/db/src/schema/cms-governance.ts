import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Append-only application audit trail. The application intentionally exposes
 * no update/delete path for this table.
 */
export const cmsWorkflowEventsTable = pgTable(
  "cms_workflow_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    action: text("action").notNull(),
    actor: text("actor").notNull(),
    target: text("target").notNull(),
    market: text("market"),
    outcome: text("outcome").notNull(),
    metadata: jsonb("metadata").$type<Record<string, string | number | boolean | null>>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_workflow_events_created_at_idx").on(table.createdAt),
    index("cms_workflow_events_action_idx").on(table.action),
  ],
);

/** Durable webhook replay/idempotency ledger. */
export const cmsWebhookReceiptsTable = pgTable("cms_webhook_receipts", {
  eventId: text("event_id").primaryKey(),
  payloadDigest: text("payload_digest").notNull(),
  receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
});

/** One-time preview capability ledger. Only a digest is retained. */
export const cmsPreviewTokenNoncesTable = pgTable("cms_preview_token_nonces", {
  digest: text("digest").primaryKey(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  consumedAt: timestamp("consumed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/** Idempotency key ledger for trusted workflow mutations. */
export const cmsWorkflowReceiptsTable = pgTable("cms_workflow_receipts", {
  requestId: text("request_id").primaryKey(),
  action: text("action").notNull(),
  subjectId: text("subject_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCmsWorkflowEventSchema = createInsertSchema(
  cmsWorkflowEventsTable,
).omit({ id: true, createdAt: true });
export const insertCmsWebhookReceiptSchema = createInsertSchema(
  cmsWebhookReceiptsTable,
).omit({ receivedAt: true });

export type InsertCmsWorkflowEvent = z.infer<
  typeof insertCmsWorkflowEventSchema
>;
export type CmsWorkflowEvent = typeof cmsWorkflowEventsTable.$inferSelect;
export type InsertCmsWebhookReceipt = z.infer<
  typeof insertCmsWebhookReceiptSchema
>;
export type CmsWebhookReceipt = typeof cmsWebhookReceiptsTable.$inferSelect;
export type CmsPreviewTokenNonce = typeof cmsPreviewTokenNoncesTable.$inferSelect;
export type CmsWorkflowReceipt = typeof cmsWorkflowReceiptsTable.$inferSelect;