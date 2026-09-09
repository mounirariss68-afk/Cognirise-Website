import { boolean, integer, jsonb, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cmsUsersTable } from "./cms-auth";

export const cmsNavigationItemsTable = pgTable("cms_navigation_items", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  visible: boolean("visible").notNull().default(true),
  updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const cmsNavigationEditionsTable = pgTable("cms_navigation_editions", {
  market: text("market").notNull(),
  locale: text("locale").notNull(),
  itemId: text("item_id").notNull(),
  label: text("label").notNull(),
  parentId: text("parent_id"),
  sortOrder: integer("sort_order").notNull().default(0),
  destination: text("destination").notNull(),
  visible: boolean("visible").notNull().default(true),
  workflowState: text("workflow_state").notNull().default("approved"),
  updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.market, table.locale, table.itemId] })]);

export const cmsPageAvailabilityTable = pgTable("cms_page_availability", {
  market: text("market").notNull(),
  locale: text("locale").notNull(),
  path: text("path").notNull(),
  enabled: boolean("enabled").notNull().default(true),
  workflowState: text("workflow_state").notNull().default("approved"),
  updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.market, table.locale, table.path] })]);

export const cmsNavigationPublishedPoliciesTable = pgTable("cms_navigation_published_policies", {
  market: text("market").notNull(),
  locale: text("locale").notNull(),
  items: jsonb("items").notNull(),
  pages: jsonb("pages").notNull(),
  publishedByUserId: uuid("published_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [primaryKey({ columns: [table.market, table.locale] })]);