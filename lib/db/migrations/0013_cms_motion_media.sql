ALTER TABLE "cms_media_assets"
  ADD COLUMN IF NOT EXISTS "motion_metadata" jsonb;

ALTER TABLE "cms_media_assets"
  DROP CONSTRAINT IF EXISTS "cms_media_assets_collection_check",
  DROP CONSTRAINT IF EXISTS "cms_media_assets_collection_kind_check";

ALTER TABLE "cms_media_assets"
  ADD CONSTRAINT "cms_media_assets_collection_check"
    CHECK ("collection" IN ('website', 'linkedin', 'motion')),
  ADD CONSTRAINT "cms_media_assets_collection_kind_check"
    CHECK (
      ("collection" IN ('website', 'motion') AND "linkedin_asset_kind" IS NULL)
      OR
      ("collection" = 'linkedin' AND "linkedin_asset_kind" IN ('post', 'header'))
    ),
  ADD CONSTRAINT "cms_media_assets_motion_type_check"
    CHECK (
      ("collection" = 'motion' AND "media_type" IN ('video/mp4', 'video/webm'))
      OR
      ("collection" <> 'motion' AND "media_type" NOT IN ('video/mp4', 'video/webm'))
    ),
  ADD CONSTRAINT "cms_media_assets_motion_metadata_check"
    CHECK (
      ("collection" = 'motion' AND "motion_metadata" IS NOT NULL)
      OR
      ("collection" <> 'motion' AND "motion_metadata" IS NULL)
    );