DO $$
BEGIN
  IF to_regclass('cms_preview_sessions') IS NOT NULL THEN
    ALTER TABLE "cms_preview_sessions"
      ADD COLUMN IF NOT EXISTS "navigation_policy_digest" text,
      ADD COLUMN IF NOT EXISTS "navigation_snapshot" jsonb;
  END IF;
END
$$;