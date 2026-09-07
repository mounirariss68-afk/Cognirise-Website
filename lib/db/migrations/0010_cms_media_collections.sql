-- Existing CMS assets remain website assets. LinkedIn assets are governed by
-- an explicit post/header kind and carry the approved campaign card metadata.
ALTER TABLE "cms_media_assets"
  ADD COLUMN IF NOT EXISTS "collection" text NOT NULL DEFAULT 'website',
  ADD COLUMN IF NOT EXISTS "linkedin_asset_kind" text,
  ADD COLUMN IF NOT EXISTS "campaign_metadata" jsonb;

ALTER TABLE "cms_media_assets"
  ADD CONSTRAINT "cms_media_assets_collection_check"
    CHECK ("collection" IN ('website', 'linkedin')),
  ADD CONSTRAINT "cms_media_assets_collection_kind_check"
    CHECK (
      ("collection" = 'website' AND "linkedin_asset_kind" IS NULL)
      OR
      ("collection" = 'linkedin' AND "linkedin_asset_kind" IN ('post', 'header'))
    );

CREATE INDEX "cms_media_assets_collection_kind_idx"
  ON "cms_media_assets" USING btree ("collection", "linkedin_asset_kind");