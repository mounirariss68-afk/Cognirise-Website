import pg from "pg";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 1 });

try {
  await pool.query(`
    DO $$
    BEGIN
      IF to_regclass('cms_media_versions') IS NULL
         OR EXISTS (
           SELECT 1
             FROM pg_constraint
            WHERE conrelid = 'cms_media_versions'::regclass
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
  `);
} finally {
  await pool.end();
}