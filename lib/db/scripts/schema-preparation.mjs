export const schemaPreparationSql = `
  DO $$
  BEGIN
    IF to_regclass('cms_media_versions') IS NULL THEN
      RETURN;
    END IF;

    IF EXISTS (
      SELECT 1
        FROM pg_constraint
       WHERE conrelid = to_regclass('cms_media_versions')
         AND conname = 'cms_media_versions_id_asset_uidx'
    ) THEN
      RETURN;
    END IF;

    IF to_regclass('cms_media_versions_id_asset_uidx') IS NOT NULL THEN
      ALTER TABLE "cms_media_versions"
        ADD CONSTRAINT "cms_media_versions_id_asset_uidx"
        UNIQUE USING INDEX "cms_media_versions_id_asset_uidx";
    ELSE
      ALTER TABLE "cms_media_versions"
        ADD CONSTRAINT "cms_media_versions_id_asset_uidx"
        UNIQUE ("id", "asset_id");
    END IF;
  END
  $$;

  DO $$
  BEGIN
    IF to_regclass('cms_media_assets') IS NULL THEN
      RETURN;
    END IF;

    ALTER TABLE "cms_media_assets"
      ADD COLUMN IF NOT EXISTS "original_filename" text;

    UPDATE "cms_media_assets"
       SET "original_filename" = "filename"
     WHERE "original_filename" IS NULL;

    ALTER TABLE "cms_media_assets"
      ALTER COLUMN "original_filename" SET NOT NULL;
  END
  $$;

  -- The motion-media migration is deliberately narrow and idempotent. Some
  -- development databases are maintained through schema push rather than
  -- Drizzle migration history, so make the existing 0013 constraints present
  -- before a non-destructive schema synchronization or media reconciliation.
  DO $$
  BEGIN
    IF to_regclass('cms_media_assets') IS NULL
      OR NOT EXISTS (
        SELECT 1
          FROM pg_attribute
         WHERE attrelid = to_regclass('cms_media_assets')
           AND attname = 'collection'
           AND NOT attisdropped
      ) THEN
      RETURN;
    END IF;

    ALTER TABLE "cms_media_assets"
      ADD COLUMN IF NOT EXISTS "motion_metadata" jsonb;

    ALTER TABLE "cms_media_assets"
      DROP CONSTRAINT IF EXISTS "cms_media_assets_collection_check",
      DROP CONSTRAINT IF EXISTS "cms_media_assets_collection_kind_check",
      DROP CONSTRAINT IF EXISTS "cms_media_assets_motion_type_check",
      DROP CONSTRAINT IF EXISTS "cms_media_assets_motion_metadata_check";

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
  END
  $$;
`;