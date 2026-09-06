ALTER TABLE "cms_market_editions"
  ADD COLUMN IF NOT EXISTS "published_revision_id" uuid;
-- Deliberately do not guess which historical approved revision was published.
-- Existing rows fail closed until an administrator explicitly republishes a
-- reviewed revision and records the exact release pointer.
ALTER TABLE "cms_market_editions"
  ADD CONSTRAINT "cms_market_editions_published_revision_id_cms_revisions_id_fk"
  FOREIGN KEY ("published_revision_id") REFERENCES "cms_revisions"("id") ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS "cms_market_editions_published_revision_idx"
  ON "cms_market_editions" ("published_revision_id");