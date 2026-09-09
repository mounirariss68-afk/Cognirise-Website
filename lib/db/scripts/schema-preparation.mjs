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
`;