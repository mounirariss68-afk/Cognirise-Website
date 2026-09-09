CREATE TABLE "cms_navigation_published_policies" (
  "market" text NOT NULL REFERENCES "market_editions"("code") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "items" jsonb NOT NULL,
  "pages" jsonb NOT NULL,
  "published_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "published_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("market", "locale"),
  CHECK (jsonb_typeof("items") = 'array'),
  CHECK (jsonb_typeof("pages") = 'array')
);