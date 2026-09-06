import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const cmsUsersTable = pgTable(
  "cms_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name"),
    role: text("role").notNull().default("editor"),
    status: text("status").notNull().default("active"),
    emailVerifiedAt: timestamp("email_verified_at", { withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("cms_users_email_uidx").on(table.email),
    index("cms_users_status_idx").on(table.status),
  ],
);

export const cmsPasswordCredentialsTable = pgTable(
  "cms_password_credentials",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    passwordHash: text("password_hash").notNull(),
    algorithm: text("algorithm").notNull().default("scrypt"),
    passwordVersion: integer("password_version").notNull().default(1),
    mustRotate: boolean("must_rotate").notNull().default(false),
    temporaryExpiresAt: timestamp("temporary_expires_at", { withTimezone: true }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const cmsTotpCredentialsTable = pgTable(
  "cms_totp_credentials",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    encryptedSecret: text("encrypted_secret").notNull(),
    encryptionKeyVersion: integer("encryption_key_version").notNull(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("cms_totp_credentials_user_uidx").on(table.userId)],
);

export const cmsRecoveryCodesTable = pgTable(
  "cms_recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    codeDigest: text("code_digest").notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_recovery_codes_digest_uidx").on(table.codeDigest),
    index("cms_recovery_codes_user_idx").on(table.userId),
  ],
);

export const cmsSessionsTable = pgTable(
  "cms_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    tokenDigest: text("token_digest").notNull(),
    ipDigest: text("ip_digest"),
    userAgent: text("user_agent"),
    mfaSatisfiedAt: timestamp("mfa_satisfied_at", { withTimezone: true }),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_sessions_token_digest_uidx").on(table.tokenDigest),
    index("cms_sessions_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

export const cmsLoginAttemptsTable = pgTable(
  "cms_login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    emailDigest: text("email_digest").notNull(),
    ipDigest: text("ip_digest"),
    outcome: text("outcome").notNull(),
    failureCode: text("failure_code"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>(),
    attemptedAt: timestamp("attempted_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_login_attempts_email_time_idx").on(table.emailDigest, table.attemptedAt),
    index("cms_login_attempts_ip_time_idx").on(table.ipDigest, table.attemptedAt),
  ],
);

export const insertCmsUserSchema = createInsertSchema(cmsUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertCmsPasswordCredentialSchema = createInsertSchema(
  cmsPasswordCredentialsTable,
);
export const insertCmsTotpCredentialSchema = createInsertSchema(
  cmsTotpCredentialsTable,
).omit({ id: true, createdAt: true });
export const insertCmsRecoveryCodeSchema = createInsertSchema(
  cmsRecoveryCodesTable,
).omit({ id: true, createdAt: true });
export const insertCmsSessionSchema = createInsertSchema(cmsSessionsTable).omit({
  id: true,
  createdAt: true,
});
export const insertCmsLoginAttemptSchema = createInsertSchema(
  cmsLoginAttemptsTable,
).omit({ id: true, attemptedAt: true });

export type InsertCmsUser = z.infer<typeof insertCmsUserSchema>;
export type CmsUser = typeof cmsUsersTable.$inferSelect;
export type CmsPasswordCredential = typeof cmsPasswordCredentialsTable.$inferSelect;
export type CmsTotpCredential = typeof cmsTotpCredentialsTable.$inferSelect;
export type CmsRecoveryCode = typeof cmsRecoveryCodesTable.$inferSelect;
export type CmsSession = typeof cmsSessionsTable.$inferSelect;
export type CmsLoginAttempt = typeof cmsLoginAttemptsTable.$inferSelect;