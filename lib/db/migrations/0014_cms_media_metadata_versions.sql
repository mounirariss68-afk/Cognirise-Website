-- Metadata-only revisions intentionally share immutable object bytes while
-- receiving a new version identity. Existing publication references stay pinned.
DROP INDEX IF EXISTS "cms_media_versions_storage_key_uidx";
CREATE INDEX IF NOT EXISTS "cms_media_versions_storage_key_idx"
  ON "cms_media_versions" USING btree ("storage_key");