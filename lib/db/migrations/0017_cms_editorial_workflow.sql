-- Make locale part of the document edition release boundary and retain review
-- discussion against the immutable revision it concerns.
DROP INDEX IF EXISTS "cms_market_editions_document_market_uidx";
DROP INDEX IF EXISTS "cms_market_editions_market_slug_uidx";
CREATE UNIQUE INDEX IF NOT EXISTS "cms_market_editions_document_market_locale_uidx"
  ON "cms_market_editions" ("document_id", "market", "locale");
CREATE UNIQUE INDEX IF NOT EXISTS "cms_market_editions_market_locale_slug_uidx"
  ON "cms_market_editions" ("market", "locale", "localized_slug");

CREATE TABLE IF NOT EXISTS "cms_review_comments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "revision_id" uuid NOT NULL REFERENCES "cms_revisions"("id") ON DELETE CASCADE,
  "author_user_id" uuid NOT NULL REFERENCES "cms_users"("id") ON DELETE RESTRICT,
  "body" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "cms_review_comments_body_check"
    CHECK (char_length(btrim("body")) BETWEEN 1 AND 2000)
);
CREATE INDEX IF NOT EXISTS "cms_review_comments_revision_idx"
  ON "cms_review_comments" ("revision_id", "created_at");

DO $$
BEGIN
  IF to_regclass('cms_preview_sessions') IS NOT NULL THEN
    ALTER TABLE "cms_preview_sessions"
      ADD COLUMN IF NOT EXISTS "requested_market" text,
      ADD COLUMN IF NOT EXISTS "requested_locale" text,
      ADD COLUMN IF NOT EXISTS "fallback_reason" text;
  END IF;
END
$$;