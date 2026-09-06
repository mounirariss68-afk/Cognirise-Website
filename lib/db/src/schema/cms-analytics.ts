import {
  bigint,
  boolean,
  date,
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

export const cmsAnalyticsConsentsTable = pgTable(
  "cms_analytics_consents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectDigest: text("subject_digest").notNull(),
    policyVersion: text("policy_version").notNull(),
    analyticsAllowed: boolean("analytics_allowed").notNull().default(false),
    marketingAllowed: boolean("marketing_allowed").notNull().default(false),
    source: text("source").notNull(),
    country: text("country"),
    grantedAt: timestamp("granted_at", { withTimezone: true }).notNull().defaultNow(),
    withdrawnAt: timestamp("withdrawn_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("cms_analytics_consents_subject_policy_uidx").on(
      table.subjectDigest,
      table.policyVersion,
    ),
    index("cms_analytics_consents_subject_time_idx").on(
      table.subjectDigest,
      table.grantedAt,
    ),
  ],
);

export const cmsAnalyticsEventsTable = pgTable(
  "cms_analytics_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventName: text("event_name").notNull(),
    anonymousId: text("anonymous_id").notNull(),
    sessionId: text("session_id"),
    consentId: uuid("consent_id").references(() => cmsAnalyticsConsentsTable.id, {
      onDelete: "set null",
    }),
    market: text("market").notNull(),
    path: text("path").notNull(),
    referrerHost: text("referrer_host"),
    properties: jsonb("properties").$type<Record<string, unknown>>(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_analytics_events_name_time_idx").on(
      table.eventName,
      table.occurredAt,
    ),
    index("cms_analytics_events_market_time_idx").on(
      table.market,
      table.occurredAt,
    ),
    index("cms_analytics_events_anonymous_time_idx").on(
      table.anonymousId,
      table.occurredAt,
    ),
  ],
);

export const cmsAnalyticsDailyTable = pgTable(
  "cms_analytics_daily",
  {
    day: date("day").notNull(),
    market: text("market").notNull(),
    path: text("path").notNull(),
    eventName: text("event_name").notNull(),
    eventCount: bigint("event_count", { mode: "number" }).notNull().default(0),
    uniqueVisitors: integer("unique_visitors").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.day, table.market, table.path, table.eventName],
    }),
    index("cms_analytics_daily_event_day_idx").on(table.eventName, table.day),
  ],
);

export const insertCmsAnalyticsConsentSchema = createInsertSchema(
  cmsAnalyticsConsentsTable,
).omit({ id: true });
export const insertCmsAnalyticsEventSchema = createInsertSchema(
  cmsAnalyticsEventsTable,
).omit({ id: true, receivedAt: true });
export const insertCmsAnalyticsDailySchema = createInsertSchema(
  cmsAnalyticsDailyTable,
);

export type InsertCmsAnalyticsConsent = z.infer<
  typeof insertCmsAnalyticsConsentSchema
>;
export type CmsAnalyticsConsent = typeof cmsAnalyticsConsentsTable.$inferSelect;
export type InsertCmsAnalyticsEvent = z.infer<
  typeof insertCmsAnalyticsEventSchema
>;
export type CmsAnalyticsEvent = typeof cmsAnalyticsEventsTable.$inferSelect;
export type CmsAnalyticsDaily = typeof cmsAnalyticsDailyTable.$inferSelect;