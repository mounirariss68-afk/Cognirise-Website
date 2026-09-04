import {
  boolean,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const websiteEnquiriesTable = pgTable("website_enquiries", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  organization: text("organization").notNull(),
  role: text("role"),
  market: text("market").notNull(),
  processArea: text("process_area").notNull(),
  challenge: text("challenge").notNull(),
  consent: boolean("consent").notNull(),
  sourcePage: text("source_page").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const newsletterSubscriptionsTable = pgTable("newsletter_subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  market: text("market").notNull(),
  consent: boolean("consent").notNull(),
  sourcePage: text("source_page").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWebsiteEnquirySchema = createInsertSchema(
  websiteEnquiriesTable,
).omit({ id: true, createdAt: true });

export const insertNewsletterSubscriptionSchema = createInsertSchema(
  newsletterSubscriptionsTable,
).omit({ id: true, createdAt: true });

export type InsertWebsiteEnquiry = z.infer<typeof insertWebsiteEnquirySchema>;
export type WebsiteEnquiry = typeof websiteEnquiriesTable.$inferSelect;
export type InsertNewsletterSubscription = z.infer<
  typeof insertNewsletterSubscriptionSchema
>;
export type NewsletterSubscription =
  typeof newsletterSubscriptionsTable.$inferSelect;