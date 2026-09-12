export const schemaPreparationSql = `
  -- Keep navigation's version columns available before schema push or any
  -- public-policy read. This replays the additive 0026 migration only.
  DO $$
  BEGIN
    IF to_regclass('cms_navigation_editions') IS NOT NULL THEN
      ALTER TABLE "cms_navigation_editions"
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
    END IF;
    IF to_regclass('cms_page_availability') IS NOT NULL THEN
      ALTER TABLE "cms_page_availability"
        ADD COLUMN IF NOT EXISTS "version" integer NOT NULL DEFAULT 1;
    END IF;
    IF to_regclass('cms_navigation_published_policies') IS NOT NULL THEN
      ALTER TABLE "cms_navigation_published_policies"
        ADD COLUMN IF NOT EXISTS "published_version" integer NOT NULL DEFAULT 1;
    END IF;
  END
  $$;

  -- Development-only merge preparation for the additive 0027 receipt/outbox
  -- migration. Production uses the checked-in migration chain; this block is
  -- intentionally limited to the pre-push helper and never runs at API
  -- startup. It creates only absent structures and is safe to replay.
  DO $$
  BEGIN
    CREATE TABLE IF NOT EXISTS "cms_operation_receipts" (
      "idempotency_key" text PRIMARY KEY NOT NULL,
      "operation" text NOT NULL,
      "subject_id" text NOT NULL,
      "request_digest" text NOT NULL,
      "result_digest" text,
      "actor_user_id" uuid,
      "response" jsonb,
      "status_code" integer,
      "created_at" timestamp with time zone NOT NULL DEFAULT now()
    );

    ALTER TABLE "cms_operation_receipts"
      ADD COLUMN IF NOT EXISTS "actor_user_id" uuid,
      ADD COLUMN IF NOT EXISTS "response" jsonb,
      ADD COLUMN IF NOT EXISTS "status_code" integer;

    IF to_regclass('cms_users') IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
          FROM pg_constraint
         WHERE conrelid = to_regclass('cms_operation_receipts')
           AND conname = 'cms_operation_receipts_actor_user_id_fkey'
      ) THEN
      ALTER TABLE "cms_operation_receipts"
        ADD CONSTRAINT "cms_operation_receipts_actor_user_id_fkey"
        FOREIGN KEY ("actor_user_id") REFERENCES "cms_users"("id") ON DELETE SET NULL;
    END IF;

    CREATE INDEX IF NOT EXISTS "cms_operation_receipts_actor_idx"
      ON "cms_operation_receipts" ("actor_user_id", "created_at");

    IF to_regclass('cms_access_delivery_jobs') IS NULL
      AND to_regclass('cms_users') IS NOT NULL
      AND to_regclass('cms_user_access_tokens') IS NOT NULL THEN
      CREATE TABLE "cms_access_delivery_jobs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
        "user_id" uuid NOT NULL REFERENCES "cms_users"("id") ON DELETE CASCADE,
        "access_token_id" uuid NOT NULL REFERENCES "cms_user_access_tokens"("id") ON DELETE CASCADE,
        "purpose" text NOT NULL,
        "status" text NOT NULL DEFAULT 'pending',
        "attempts" integer NOT NULL DEFAULT 0,
        "payload_ciphertext" text NOT NULL,
        "payload_expires_at" timestamp with time zone NOT NULL,
        "available_at" timestamp with time zone NOT NULL DEFAULT now(),
        "last_attempt_at" timestamp with time zone,
        "sent_at" timestamp with time zone,
        "failed_at" timestamp with time zone,
        "provider_message_id" text,
        "last_error" text,
        "created_at" timestamp with time zone NOT NULL DEFAULT now(),
        "updated_at" timestamp with time zone NOT NULL DEFAULT now()
      );
    ELSIF to_regclass('cms_access_delivery_jobs') IS NOT NULL THEN
      ALTER TABLE "cms_access_delivery_jobs"
        ADD COLUMN IF NOT EXISTS "id" uuid DEFAULT gen_random_uuid(),
        ADD COLUMN IF NOT EXISTS "user_id" uuid,
        ADD COLUMN IF NOT EXISTS "access_token_id" uuid,
        ADD COLUMN IF NOT EXISTS "purpose" text,
        ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'pending',
        ADD COLUMN IF NOT EXISTS "attempts" integer DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "payload_ciphertext" text,
        ADD COLUMN IF NOT EXISTS "payload_expires_at" timestamp with time zone,
        ADD COLUMN IF NOT EXISTS "available_at" timestamp with time zone DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "last_attempt_at" timestamp with time zone,
        ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone,
        ADD COLUMN IF NOT EXISTS "failed_at" timestamp with time zone,
        ADD COLUMN IF NOT EXISTS "provider_message_id" text,
        ADD COLUMN IF NOT EXISTS "last_error" text,
        ADD COLUMN IF NOT EXISTS "created_at" timestamp with time zone DEFAULT now(),
        ADD COLUMN IF NOT EXISTS "updated_at" timestamp with time zone DEFAULT now();
    END IF;

    IF to_regclass('cms_access_delivery_jobs') IS NOT NULL THEN
      CREATE INDEX IF NOT EXISTS "cms_access_delivery_jobs_due_idx"
        ON "cms_access_delivery_jobs" ("status", "available_at");
      CREATE INDEX IF NOT EXISTS "cms_access_delivery_jobs_user_idx"
        ON "cms_access_delivery_jobs" ("user_id", "created_at");
    END IF;
  END
  $$;

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