ALTER TABLE "cms_navigation_editions"
  ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

ALTER TABLE "cms_page_availability"
  ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;

ALTER TABLE "cms_navigation_published_policies"
  ADD COLUMN IF NOT EXISTS "published_version" integer NOT NULL DEFAULT 1;