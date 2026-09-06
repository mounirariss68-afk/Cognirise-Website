import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Global market delivery configuration. This is intentionally separate from
 * `cms_market_editions`, whose rows are the per-document release boundary.
 */
export const marketEditionsTable = pgTable(
  "market_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    code: text("code").notNull(),
    displayName: text("display_name").notNull(),
    defaultLocale: text("default_locale").notNull(),
    // Kept as a governed code rather than a self-referencing FK so the
    // canonical and fallback rows can be inserted atomically on first setup.
    fallbackMarketCode: text("fallback_market_code"),
    fallbackLocale: text("fallback_locale"),
    isCanonical: boolean("is_canonical").notNull().default(false),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("market_editions_code_uidx").on(table.code),
    uniqueIndex("market_editions_one_canonical_uidx")
      .on(table.isCanonical)
      .where(sql`${table.isCanonical}`),
    index("market_editions_delivery_idx").on(table.enabled, table.isCanonical),
  ],
);

export const insertMarketEditionSchema = createInsertSchema(marketEditionsTable).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
  },
);

export type InsertMarketEdition = z.infer<typeof insertMarketEditionSchema>;
export type MarketEdition = typeof marketEditionsTable.$inferSelect;