CREATE TABLE IF NOT EXISTS "cms_person_market_availability" (
  "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE CASCADE,
  "market_edition_id" uuid NOT NULL REFERENCES "market_editions"("id") ON DELETE CASCADE,
  "decision" text NOT NULL DEFAULT 'inherit',
  "updated_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_person_market_availability_pk" PRIMARY KEY ("document_id", "market_edition_id"),
  CONSTRAINT "cms_person_market_availability_decision_check"
    CHECK ("decision" IN ('inherit', 'show', 'off'))
);

CREATE INDEX IF NOT EXISTS "cms_person_market_availability_market_idx"
  ON "cms_person_market_availability" ("market_edition_id");