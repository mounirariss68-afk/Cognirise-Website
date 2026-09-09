-- Preview capabilities must remain bound to the exact revision selected when
-- they are issued, even when another draft commits during the session.
DO $$
BEGIN
  -- Migration 0011 created this uniqueness as an index because PostgreSQL can
  -- use it as a composite FK target. Represent it as a constraint in place so
  -- schema push does not try to drop an index with dependent foreign keys.
  IF to_regclass('cms_media_versions') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
         FROM pg_constraint
        WHERE conrelid = 'cms_media_versions'::regclass
          AND conname = 'cms_media_versions_id_asset_uidx'
     ) THEN
    IF to_regclass('cms_media_versions_id_asset_uidx') IS NOT NULL THEN
      ALTER TABLE "cms_media_versions"
        ADD CONSTRAINT "cms_media_versions_id_asset_uidx"
        UNIQUE USING INDEX "cms_media_versions_id_asset_uidx";
    ELSE
      ALTER TABLE "cms_media_versions"
        ADD CONSTRAINT "cms_media_versions_id_asset_uidx"
        UNIQUE ("id", "asset_id");
    END IF;
  END IF;

  -- Some migration fixtures intentionally model only the subset of the CMS
  -- introduced after migration 0007. There is nothing to upgrade when the
  -- governed-preview table is outside that fixture.
  IF to_regclass('cms_preview_sessions') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE "cms_preview_sessions"
    ADD COLUMN "revision_id" uuid;

  UPDATE "cms_preview_sessions" preview
     SET "revision_id" = (
      SELECT candidate."id"
        FROM "cms_revisions" candidate
       WHERE candidate."edition_id" = preview."edition_id"
         AND candidate."created_at" <= preview."created_at"
       ORDER BY candidate."revision_number" DESC,
                candidate."created_at" DESC,
                candidate."id" DESC
       LIMIT 1
     );

  -- A legacy capability without any revision at issuance time cannot be made
  -- immutable safely. Remove it rather than allowing it to drift.
  DELETE FROM "cms_preview_sessions"
   WHERE "revision_id" IS NULL;

  ALTER TABLE "cms_preview_sessions"
    ALTER COLUMN "revision_id" SET NOT NULL;

  ALTER TABLE "cms_preview_sessions"
    ADD CONSTRAINT "cms_preview_sessions_revision_id_cms_revisions_id_fk"
    FOREIGN KEY ("revision_id")
    REFERENCES "cms_revisions"("id")
    ON DELETE cascade ON UPDATE no action;

  CREATE INDEX "cms_preview_sessions_revision_idx"
    ON "cms_preview_sessions" USING btree ("revision_id");
END
$$;