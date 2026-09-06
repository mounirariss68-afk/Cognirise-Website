import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { cmsUsersTable } from "./cms-auth";

export const cmsNavigationItemsTable = pgTable("cms_navigation_items", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(true),
  updatedByUserId: uuid("updated_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});