CREATE TABLE IF NOT EXISTS "cms_user_market_assignments" (
  "user_id" uuid NOT NULL REFERENCES "cms_users"("id") ON DELETE CASCADE,
  "market_code" text NOT NULL REFERENCES "market_editions"("code") ON UPDATE CASCADE ON DELETE RESTRICT,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("user_id", "market_code")
);

CREATE INDEX IF NOT EXISTS "cms_user_market_assignments_market_idx"
  ON "cms_user_market_assignments" ("market_code");

CREATE TABLE IF NOT EXISTS "cms_user_access_tokens" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "cms_users"("id") ON DELETE CASCADE,
  "purpose" text NOT NULL CHECK ("purpose" IN ('invitation', 'password-reset')),
  "token_digest" text NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "consumed_at" timestamp with time zone,
  "created_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS "cms_user_access_tokens_digest_uidx"
  ON "cms_user_access_tokens" ("token_digest");
CREATE INDEX IF NOT EXISTS "cms_user_access_tokens_user_active_idx"
  ON "cms_user_access_tokens" ("user_id", "expires_at")
  WHERE "consumed_at" IS NULL;