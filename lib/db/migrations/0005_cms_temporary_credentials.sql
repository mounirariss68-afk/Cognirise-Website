ALTER TABLE "cms_password_credentials"
  ADD COLUMN IF NOT EXISTS "temporary_expires_at" timestamp with time zone;