CREATE TABLE "cms_navigation_editions" (
  "market" text NOT NULL REFERENCES "market_editions"("code") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "item_id" text NOT NULL,
  "label" text NOT NULL,
  "parent_id" text,
  "sort_order" integer NOT NULL DEFAULT 0,
  "destination" text NOT NULL,
  "visible" boolean NOT NULL DEFAULT true,
  "workflow_state" text NOT NULL DEFAULT 'approved',
  "updated_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("market", "locale", "item_id"),
  CHECK ("destination" ~ '^/[^[:space:]]*$'),
  CHECK ("parent_id" IS NULL OR "parent_id" <> "item_id")
  ,CHECK ("workflow_state" IN ('draft','in-review','approved'))
);
DO $$
BEGIN
  IF to_regclass('cms_navigation_items') IS NOT NULL THEN
    ALTER TABLE "cms_navigation_items" ADD COLUMN IF NOT EXISTS "visible" boolean;
    UPDATE "cms_navigation_items" SET "visible" = "enabled" WHERE "visible" IS NULL;
    ALTER TABLE "cms_navigation_items" ALTER COLUMN "visible" SET DEFAULT true;
  END IF;
END
$$;
CREATE INDEX "cms_navigation_editions_delivery_idx" ON "cms_navigation_editions" ("market", "locale", "sort_order");
CREATE TABLE "cms_page_availability" (
  "market" text NOT NULL REFERENCES "market_editions"("code") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "path" text NOT NULL,
  "enabled" boolean NOT NULL DEFAULT true,
  "workflow_state" text NOT NULL DEFAULT 'approved',
  "updated_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("market", "locale", "path"),
  CHECK ("path" ~ '^/[^?#[:space:]]*$')
  ,CHECK ("workflow_state" IN ('draft','in-review','approved'))
);