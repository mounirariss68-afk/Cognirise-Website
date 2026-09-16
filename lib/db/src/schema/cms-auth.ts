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
import { sql } from "drizzle-orm";
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

export const cmsUserMarketAssignmentsTable = pgTable(
  "cms_user_market_assignments",
  {
    userId: uuid("user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    marketCode: text("market_code").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_user_market_assignments_user_market_uidx").on(table.userId, table.marketCode),
    index("cms_user_market_assignments_market_idx").on(table.marketCode),
  ],
);

/**
 * Explicit, central content authority.  The absence of rows intentionally
 * means "use the legacy role/market compatibility projection"; once an
 * administrator grants a capability, rows for that capability are allow-list
 * authority and no role may fill the gaps.
 *
 * `scope` keeps a shared source distinct from a regional destination.  A
 * shared grant is evaluated together with every affected source/destination
 * market, never as a shorthand for a single regional checkbox.
 */
export const cmsUserCapabilityGrantsTable = pgTable(
  "cms_user_capability_grants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    capability: text("capability").notNull(),
    scope: text("scope").notNull().default("regional"),
    marketCode: text("market_code").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_user_capability_grants_unique").on(
      table.userId,
      table.topic,
      table.capability,
      table.scope,
      table.marketCode,
    ),
    index("cms_user_capability_grants_lookup_idx").on(
      table.userId,
      table.capability,
      table.topic,
      table.marketCode,
    ),
  ],
);

/**
 * A durable sentinel distinguishes an intentionally empty matrix (deny all
 * content authority) from an account that has never left legacy role/market
 * compatibility. It must never be inferred from grant row count.
 */
export const cmsUserCapabilityConfigurationsTable = pgTable(
  "cms_user_capability_configurations",
  {
    userId: uuid("user_id").primaryKey().references(() => cmsUsersTable.id, {
      onDelete: "cascade",
    }),
    configuredByUserId: uuid("configured_by_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    configuredAt: timestamp("configured_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_user_capability_configurations_actor_idx").on(table.configuredByUserId),
  ],
);

/** Frozen enabled-market set for an unconfigured legacy administrator. */
export const cmsLegacyAdministratorMarketSnapshotsTable = pgTable(
  "cms_legacy_administrator_market_snapshots",
  {
    userId: uuid("user_id").primaryKey().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    marketCodes: text("market_codes").array().notNull().default(sql`'{}'::text[]`),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

/**
 * A dry-run access migration is deliberately a receipt, not an implicit
 * rewrite of legacy roles, market assignments, review work, or live content.
 * The before/after projections make an administrator's later explicit grant
 * decision recoverable and auditable.
 */
export const cmsCapabilityMigrationReceiptsTable = pgTable(
  "cms_capability_migration_receipts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    requestedByUserId: uuid("requested_by_user_id").notNull().references(() => cmsUsersTable.id, {
      onDelete: "restrict",
    }),
    targetUserId: uuid("target_user_id").references(() => cmsUsersTable.id, {
      onDelete: "set null",
    }),
    mode: text("mode").notNull().default("dry-run"),
    beforeSnapshot: jsonb("before_snapshot").notNull().$type<Record<string, unknown>>(),
    afterSnapshot: jsonb("after_snapshot").notNull().$type<Record<string, unknown>>(),
    disposition: text("disposition").notNull().default("no-persistent-access-change"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("cms_capability_migration_receipts_target_idx").on(table.targetUserId, table.createdAt),
    index("cms_capability_migration_receipts_requester_idx").on(table.requestedByUserId, table.createdAt),
  ],
);

export const cmsUserAccessTokensTable = pgTable(
  "cms_user_access_tokens",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    tokenDigest: text("token_digest").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdByUserId: uuid("created_by_user_id").references(() => cmsUsersTable.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("cms_user_access_tokens_digest_uidx").on(table.tokenDigest),
    index("cms_user_access_tokens_user_expiry_idx").on(table.userId, table.expiresAt),
  ],
);

export const insertCmsUserSchema = createInsertSchema(cmsUsersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

/**
 * An access-link delivery is persisted with the account/token transaction.
 * The payload is encrypted application data and is deliberately not exposed
 * through the audit trail or API responses.
 */
export const cmsAccessDeliveryJobsTable = pgTable(
  "cms_access_delivery_jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => cmsUsersTable.id, { onDelete: "cascade" }),
    accessTokenId: uuid("access_token_id")
      .notNull()
      .references(() => cmsUserAccessTokensTable.id, { onDelete: "cascade" }),
    purpose: text("purpose").notNull(),
    status: text("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    payloadCiphertext: text("payload_ciphertext"),
    payloadExpiresAt: timestamp("payload_expires_at", { withTimezone: true }).notNull(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    processingLease: uuid("processing_lease"),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    failedAt: timestamp("failed_at", { withTimezone: true }),
    providerMessageId: text("provider_message_id"),
    lastError: text("last_error"),
    ...timestamps,
  },
  (table) => [
    index("cms_access_delivery_jobs_due_idx").on(table.status, table.availableAt),
    index("cms_access_delivery_jobs_user_idx").on(table.userId, table.createdAt),
    index("cms_access_delivery_jobs_processing_lease_idx")
      .on(table.processingLease)
      .where(sql`${table.processingLease} IS NOT NULL`),
  ],
);
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
export const insertCmsAccessDeliveryJobSchema = createInsertSchema(
  cmsAccessDeliveryJobsTable,
).omit({ id: true, createdAt: true, updatedAt: true });

export type InsertCmsUser = z.infer<typeof insertCmsUserSchema>;
export type CmsUser = typeof cmsUsersTable.$inferSelect;
export type CmsPasswordCredential = typeof cmsPasswordCredentialsTable.$inferSelect;
export type CmsTotpCredential = typeof cmsTotpCredentialsTable.$inferSelect;
export type CmsRecoveryCode = typeof cmsRecoveryCodesTable.$inferSelect;
export type CmsSession = typeof cmsSessionsTable.$inferSelect;
export type CmsLoginAttempt = typeof cmsLoginAttemptsTable.$inferSelect;
export type CmsUserMarketAssignment = typeof cmsUserMarketAssignmentsTable.$inferSelect;
export type CmsUserCapabilityGrant = typeof cmsUserCapabilityGrantsTable.$inferSelect;
export type CmsUserCapabilityConfiguration = typeof cmsUserCapabilityConfigurationsTable.$inferSelect;
export type CmsLegacyAdministratorMarketSnapshot = typeof cmsLegacyAdministratorMarketSnapshotsTable.$inferSelect;
export type CmsCapabilityMigrationReceipt = typeof cmsCapabilityMigrationReceiptsTable.$inferSelect;
export type CmsUserAccessToken = typeof cmsUserAccessTokensTable.$inferSelect;
export type CmsAccessDeliveryJob = typeof cmsAccessDeliveryJobsTable.$inferSelect;