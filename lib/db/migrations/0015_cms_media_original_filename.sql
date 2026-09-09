-- Preserve the upload-time filename independently from the editable library label.
ALTER TABLE "cms_media_assets"
  ADD COLUMN IF NOT EXISTS "original_filename" text;

UPDATE "cms_media_assets"
   SET "original_filename" = "filename"
 WHERE "original_filename" IS NULL;

ALTER TABLE "cms_media_assets"
  ALTER COLUMN "original_filename" SET NOT NULL;