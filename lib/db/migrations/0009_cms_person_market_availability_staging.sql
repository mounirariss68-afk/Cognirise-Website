-- Preserve decisions created by the initial availability migration as the
-- delivery state, then stage future changes until an administrator publishes.
ALTER TABLE "cms_person_market_availability"
  ADD COLUMN IF NOT EXISTS "published_decision" text NOT NULL DEFAULT 'inherit',
  ADD COLUMN IF NOT EXISTS "draft_decision" text,
  ADD COLUMN IF NOT EXISTS "published_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS "published_at" timestamp with time zone;

UPDATE "cms_person_market_availability"
   SET "published_decision" = "decision"
 WHERE "published_decision" = 'inherit' AND "decision" <> 'inherit';

ALTER TABLE "cms_person_market_availability"
  ADD CONSTRAINT "cms_person_market_availability_published_decision_check"
    CHECK ("published_decision" IN ('inherit', 'show', 'off')),
  ADD CONSTRAINT "cms_person_market_availability_draft_decision_check"
    CHECK ("draft_decision" IS NULL OR "draft_decision" IN ('inherit', 'show', 'off'));