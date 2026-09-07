-- Draft references continue to identify a stable asset. Publication pins each
-- reference to the exact immutable object version approved with that revision.
ALTER TABLE "cms_media_references"
  ADD COLUMN "media_version_id" uuid;
--> statement-breakpoint
CREATE UNIQUE INDEX "cms_media_versions_id_asset_uidx"
  ON "cms_media_versions" USING btree ("id", "asset_id");
--> statement-breakpoint
ALTER TABLE "cms_media_references"
  ADD CONSTRAINT "cms_media_references_version_asset_fk"
  FOREIGN KEY ("media_version_id", "asset_id")
  REFERENCES "cms_media_versions"("id", "asset_id")
  ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "cms_media_references_version_idx"
  ON "cms_media_references" USING btree ("media_version_id");
--> statement-breakpoint
INSERT INTO "cms_media_references"
  ("asset_id", "media_version_id", "document_id", "field_path")
SELECT asset."id", version."id", edition."document_id",
       'revision:' || revision."id"::text
  FROM "cms_market_editions" edition
  JOIN "cms_revisions" revision
    ON revision."id" = edition."published_revision_id"
 CROSS JOIN LATERAL jsonb_array_elements_text(
   COALESCE(revision."payload"->'mediaIds', '[]'::jsonb)
 ) media("asset_id")
  JOIN "cms_media_assets" asset
    ON asset."id"::text = media."asset_id"
  JOIN LATERAL (
    SELECT candidate."id"
      FROM "cms_media_versions" candidate
     WHERE candidate."asset_id" = asset."id"
       AND candidate."created_at" <= COALESCE(edition."published_at", revision."approved_at")
     ORDER BY candidate."created_at" DESC, candidate."version_number" DESC
     LIMIT 1
  ) version ON true
ON CONFLICT DO NOTHING;
--> statement-breakpoint
UPDATE "cms_media_references" ref
   SET "media_version_id" = (
     SELECT version."id"
       FROM "cms_media_versions" version
       JOIN "cms_market_editions" edition
         ON edition."document_id" = ref."document_id"
       JOIN "cms_revisions" revision
         ON revision."id" = edition."published_revision_id"
      WHERE version."asset_id" = ref."asset_id"
        AND ref."field_path" = 'revision:' || revision."id"::text
        AND version."created_at" <= COALESCE(edition."published_at", revision."approved_at")
      ORDER BY version."created_at" DESC, version."version_number" DESC
      LIMIT 1
   )
 WHERE EXISTS (
   SELECT 1
     FROM "cms_market_editions" edition
     JOIN "cms_revisions" revision
       ON revision."id" = edition."published_revision_id"
    WHERE edition."document_id" = ref."document_id"
      AND ref."field_path" = 'revision:' || revision."id"::text
 );
--> statement-breakpoint
UPDATE "cms_media_references" ref
   SET "media_version_id" = (
     SELECT version."id"
       FROM "cms_media_versions" version
       JOIN "cms_revisions" revision
         ON ref."field_path" = 'revision:' || revision."id"::text
      WHERE version."asset_id" = ref."asset_id"
        AND version."created_at" <= revision."created_at"
      ORDER BY version."created_at" DESC, version."version_number" DESC
      LIMIT 1
   )
 WHERE ref."media_version_id" IS NULL
   AND ref."field_path" LIKE 'revision:%';
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM "cms_market_editions" edition
      JOIN "cms_revisions" revision
        ON revision."id" = edition."published_revision_id"
     CROSS JOIN LATERAL jsonb_array_elements_text(
       COALESCE(revision."payload"->'mediaIds', '[]'::jsonb)
     ) media("asset_id")
      LEFT JOIN "cms_media_references" ref
        ON ref."document_id" = edition."document_id"
       AND ref."field_path" = 'revision:' || revision."id"::text
       AND ref."asset_id"::text = media."asset_id"
     WHERE ref."id" IS NULL OR ref."media_version_id" IS NULL
  ) THEN
    RAISE EXCEPTION 'Published CMS media cannot be pinned to a version from its publication history';
  END IF;
END;
$$;
--> statement-breakpoint
CREATE FUNCTION "cms_keep_media_versions_immutable"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'CMS media versions are immutable';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "cms_media_versions_keep_immutable"
BEFORE UPDATE ON "cms_media_versions"
FOR EACH ROW EXECUTE FUNCTION "cms_keep_media_versions_immutable"();
--> statement-breakpoint
CREATE FUNCTION "cms_keep_pinned_media_reference"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD."media_version_id" IS NOT NULL THEN
    RAISE EXCEPTION 'A pinned CMS media reference is immutable';
  END IF;
  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "cms_media_references_keep_pinned"
BEFORE UPDATE ON "cms_media_references"
FOR EACH ROW EXECUTE FUNCTION "cms_keep_pinned_media_reference"();