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

  -- Development-only preparation for additive migration 0029. This mirrors
  -- the checked-in migration for schema-push databases that do not replay
  -- Drizzle history. It never runs at API startup and creates only absent
  -- shared-market structures; production remains migration-chain driven.
  DO $$
  BEGIN
    IF to_regclass('cms_documents') IS NULL
      OR to_regclass('cms_revisions') IS NULL
      OR to_regclass('cms_users') IS NULL
      OR to_regclass('market_editions') IS NULL THEN
      RETURN;
    END IF;

    CREATE TABLE IF NOT EXISTS cms_shared_baselines (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE CASCADE,
      locale text NOT NULL,
      active_revision_id uuid,
      created_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (document_id, locale)
    );
    CREATE TABLE IF NOT EXISTS cms_shared_baseline_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      baseline_id uuid NOT NULL REFERENCES cms_shared_baselines(id) ON DELETE CASCADE,
      revision_number integer NOT NULL,
      snapshot jsonb NOT NULL,
      media_references jsonb NOT NULL DEFAULT '[]'::jsonb,
      content_digest text NOT NULL,
      source_revision_id uuid REFERENCES cms_revisions(id) ON DELETE SET NULL,
      created_by_user_id uuid NOT NULL REFERENCES cms_users(id) ON DELETE RESTRICT,
      created_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (baseline_id, revision_number)
    );
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
       WHERE conrelid=to_regclass('cms_shared_baselines')
         AND conname='cms_shared_baselines_active_revision_fk'
    ) THEN
      ALTER TABLE cms_shared_baselines
        ADD CONSTRAINT cms_shared_baselines_active_revision_fk
        FOREIGN KEY (active_revision_id) REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL;
    END IF;
    CREATE INDEX IF NOT EXISTS cms_shared_baselines_active_revision_idx
      ON cms_shared_baselines(active_revision_id);
    CREATE INDEX IF NOT EXISTS cms_shared_baseline_revisions_source_idx
      ON cms_shared_baseline_revisions(source_revision_id);

    CREATE TABLE IF NOT EXISTS cms_market_edition_bindings (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id uuid NOT NULL REFERENCES cms_documents(id) ON DELETE CASCADE,
      market_edition_id uuid NOT NULL REFERENCES market_editions(id) ON DELETE CASCADE,
      locale text NOT NULL,
      mode text NOT NULL CHECK (mode IN ('shared','adapted','independent')),
      baseline_id uuid REFERENCES cms_shared_baselines(id) ON DELETE SET NULL,
      based_on_baseline_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
      override_operations jsonb NOT NULL DEFAULT '[]'::jsonb,
      held_baseline_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
      materialized_revision_id uuid REFERENCES cms_revisions(id) ON DELETE SET NULL,
      version integer NOT NULL DEFAULT 1 CHECK (version > 0),
      translation_state text NOT NULL DEFAULT 'current'
        CHECK (translation_state IN ('current','stale','not-applicable')),
      translation_source_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
      updated_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      UNIQUE (document_id, market_edition_id, locale),
      CHECK (
        (mode='independent' AND baseline_id IS NULL)
        OR (mode IN ('shared','adapted') AND baseline_id IS NOT NULL)
      )
    );
    CREATE INDEX IF NOT EXISTS cms_market_edition_bindings_baseline_idx
      ON cms_market_edition_bindings(baseline_id,locale);
    CREATE INDEX IF NOT EXISTS cms_market_edition_bindings_materialized_idx
      ON cms_market_edition_bindings(materialized_revision_id);

    CREATE TABLE IF NOT EXISTS cms_resolved_market_revisions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      binding_id uuid NOT NULL REFERENCES cms_market_edition_bindings(id) ON DELETE CASCADE,
      cms_revision_id uuid NOT NULL UNIQUE REFERENCES cms_revisions(id) ON DELETE CASCADE,
      baseline_revision_id uuid REFERENCES cms_shared_baseline_revisions(id) ON DELETE SET NULL,
      snapshot jsonb NOT NULL,
      media_references jsonb NOT NULL DEFAULT '[]'::jsonb,
      content_digest text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cms_resolved_market_revisions_binding_idx
      ON cms_resolved_market_revisions(binding_id,created_at);

    CREATE TABLE IF NOT EXISTS cms_shared_edition_migration_receipts (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      document_id uuid REFERENCES cms_documents(id) ON DELETE CASCADE,
      requested_by_user_id uuid REFERENCES cms_users(id) ON DELETE SET NULL,
      dry_run boolean NOT NULL,
      report jsonb NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE INDEX IF NOT EXISTS cms_shared_edition_migration_receipts_document_idx
      ON cms_shared_edition_migration_receipts(document_id,created_at);

    CREATE OR REPLACE FUNCTION cms_reject_shared_history_mutation() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF TG_OP = 'DELETE' AND pg_trigger_depth() > 1 THEN
        RETURN OLD;
      END IF;
      RAISE EXCEPTION 'shared edition history is immutable';
    END;
    $fn$;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_shared_baseline_revisions')
         AND tgname='cms_shared_baseline_revisions_immutable'
    ) THEN
      CREATE TRIGGER cms_shared_baseline_revisions_immutable
        BEFORE UPDATE OR DELETE ON cms_shared_baseline_revisions
        FOR EACH ROW EXECUTE FUNCTION cms_reject_shared_history_mutation();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_resolved_market_revisions')
         AND tgname='cms_resolved_market_revisions_immutable'
    ) THEN
      CREATE TRIGGER cms_resolved_market_revisions_immutable
        BEFORE UPDATE OR DELETE ON cms_resolved_market_revisions
        FOR EACH ROW EXECUTE FUNCTION cms_reject_shared_history_mutation();
    END IF;
  END
  $$;

  -- Development-only preparation for additive migration 0031. This is
  -- intentionally narrow: production receives the checked-in migration, and
  -- a schema-push database is changed only after its existing shared rows
  -- prove they already satisfy the new ownership rules.
  DO $$
  BEGIN
    IF to_regclass('cms_shared_baselines') IS NULL
      OR to_regclass('cms_shared_baseline_revisions') IS NULL
      OR to_regclass('cms_market_edition_bindings') IS NULL
      OR to_regclass('cms_resolved_market_revisions') IS NULL
      OR to_regclass('cms_documents') IS NULL
      OR to_regclass('cms_market_editions') IS NULL
      OR to_regclass('cms_revisions') IS NULL
      OR to_regclass('market_editions') IS NULL THEN
      RETURN;
    END IF;

    IF EXISTS (
      SELECT 1 FROM cms_shared_baselines b
       WHERE b.active_revision_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM cms_shared_baseline_revisions r
            WHERE r.id=b.active_revision_id AND r.baseline_id=b.id
         )
    ) THEN
      RAISE EXCEPTION 'cannot prepare shared pointer integrity: a baseline active revision belongs to another baseline';
    END IF;

    IF EXISTS (
      SELECT 1 FROM cms_shared_baseline_revisions r
       WHERE r.source_revision_id IS NOT NULL
         AND NOT EXISTS (
           SELECT 1
             FROM cms_shared_baselines b
             JOIN cms_revisions source_revision ON source_revision.id=r.source_revision_id
             JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
            WHERE b.id=r.baseline_id
              AND source_edition.document_id=b.document_id
              AND source_edition.locale=b.locale
              AND source_edition.market<>'shared-source'
              AND source_edition.locale<>'und'
         )
    ) THEN
      RAISE EXCEPTION 'cannot prepare shared pointer integrity: a baseline revision source is not an exact real-market revision';
    END IF;

    IF EXISTS (
      SELECT 1 FROM cms_market_edition_bindings binding
       WHERE (binding.baseline_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM cms_shared_baselines baseline
                 WHERE baseline.id=binding.baseline_id
                   AND baseline.document_id=binding.document_id
                   AND baseline.locale=binding.locale
              ))
          OR (binding.mode<>'independent' AND (
                binding.based_on_baseline_revision_id IS NULL OR NOT EXISTS (
                  SELECT 1 FROM cms_shared_baseline_revisions revision
                   WHERE revision.id=binding.based_on_baseline_revision_id
                     AND revision.baseline_id=binding.baseline_id
                )
              ))
          OR (binding.mode='independent' AND binding.based_on_baseline_revision_id IS NOT NULL)
          OR (binding.held_baseline_revision_id IS NOT NULL AND NOT EXISTS (
                SELECT 1 FROM cms_shared_baseline_revisions revision
                 WHERE revision.id=binding.held_baseline_revision_id
                   AND revision.baseline_id=binding.baseline_id
              ))
          OR (binding.translation_source_revision_id IS NOT NULL AND NOT EXISTS (
                SELECT 1
                  FROM cms_shared_baseline_revisions revision
                  JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
                 WHERE revision.id=binding.translation_source_revision_id
                   AND baseline.document_id=binding.document_id
              ))
          OR binding.materialized_revision_id IS NULL
          OR NOT EXISTS (
            SELECT 1
              FROM cms_revisions materialized
              JOIN cms_market_editions destination ON destination.id=materialized.edition_id
              JOIN market_editions market ON market.id=binding.market_edition_id
             WHERE materialized.id=binding.materialized_revision_id
               AND destination.document_id=binding.document_id
               AND destination.market=market.code
               AND destination.locale=binding.locale
          )
          OR NOT EXISTS (
            SELECT 1 FROM cms_resolved_market_revisions resolved
             WHERE resolved.binding_id=binding.id
               AND resolved.cms_revision_id=binding.materialized_revision_id
          )
    ) THEN
      RAISE EXCEPTION 'cannot prepare shared pointer integrity: a binding pointer is incoherent';
    END IF;

    IF EXISTS (
      SELECT 1
        FROM cms_resolved_market_revisions resolved
        JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
       WHERE NOT EXISTS (
               SELECT 1
                 FROM cms_revisions materialized
                 JOIN cms_market_editions destination ON destination.id=materialized.edition_id
                 JOIN market_editions market ON market.id=binding.market_edition_id
                WHERE materialized.id=resolved.cms_revision_id
                  AND destination.document_id=binding.document_id
                  AND destination.market=market.code
                  AND destination.locale=binding.locale
             )
          OR (resolved.baseline_revision_id IS NOT NULL AND NOT EXISTS (
               SELECT 1
                 FROM cms_shared_baseline_revisions baseline_revision
                 JOIN cms_shared_baselines baseline ON baseline.id=baseline_revision.baseline_id
                WHERE baseline_revision.id=resolved.baseline_revision_id
                  AND baseline.document_id=binding.document_id
                  AND baseline.locale=binding.locale
             ))
    ) THEN
      RAISE EXCEPTION 'cannot prepare shared pointer integrity: resolved history does not match its binding';
    END IF;

    CREATE OR REPLACE FUNCTION cms_reject_shared_history_mutation() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF pg_trigger_depth() > 1 THEN
        IF TG_OP = 'DELETE' THEN
          RETURN OLD;
        END IF;
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'shared edition history is immutable';
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION cms_assert_shared_baseline_integrity() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    DECLARE
      baseline cms_shared_baselines%ROWTYPE;
    BEGIN
      SELECT * INTO baseline FROM cms_shared_baselines WHERE id=NEW.id;
      IF NOT FOUND THEN
        RETURN NULL;
      END IF;
      IF baseline.active_revision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM cms_shared_baseline_revisions revision
         WHERE revision.id=baseline.active_revision_id AND revision.baseline_id=baseline.id
      ) THEN
        RAISE EXCEPTION 'shared baseline active revision must belong to its baseline';
      END IF;
      IF EXISTS (
        SELECT 1
          FROM cms_shared_baseline_revisions revision
          LEFT JOIN cms_revisions source_revision ON source_revision.id=revision.source_revision_id
          LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
         WHERE revision.baseline_id=baseline.id
           AND revision.source_revision_id IS NOT NULL
           AND (source_edition.document_id IS DISTINCT FROM baseline.document_id
             OR source_edition.locale IS DISTINCT FROM baseline.locale
             OR source_edition.market='shared-source'
             OR source_edition.locale='und')
      ) THEN
        RAISE EXCEPTION 'shared baseline document and locale must continue to match its revision sources';
      END IF;
      IF EXISTS (
        SELECT 1 FROM cms_market_edition_bindings binding
         WHERE binding.baseline_id=baseline.id
           AND (binding.document_id IS DISTINCT FROM baseline.document_id
             OR binding.locale IS DISTINCT FROM baseline.locale)
      ) OR EXISTS (
        SELECT 1
          FROM cms_resolved_market_revisions resolved
          JOIN cms_shared_baseline_revisions revision ON revision.id=resolved.baseline_revision_id
          JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
         WHERE revision.baseline_id=baseline.id
           AND (binding.document_id IS DISTINCT FROM baseline.document_id
             OR binding.locale IS DISTINCT FROM baseline.locale)
      ) THEN
        RAISE EXCEPTION 'shared baseline document and locale must continue to match dependent bindings and history';
      END IF;
      RETURN NULL;
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION cms_assert_shared_baseline_revision_integrity() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM cms_shared_baseline_revisions WHERE id=NEW.id) THEN
        RETURN NULL;
      END IF;
      IF NEW.source_revision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM cms_shared_baselines baseline
          JOIN cms_revisions source_revision ON source_revision.id=NEW.source_revision_id
          JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
         WHERE baseline.id=NEW.baseline_id
           AND source_edition.document_id=baseline.document_id
           AND source_edition.locale=baseline.locale
           AND source_edition.market<>'shared-source'
           AND source_edition.locale<>'und'
      ) THEN
        RAISE EXCEPTION 'shared baseline revision source must be an exact real-market revision for its document and locale';
      END IF;
      RETURN NULL;
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION cms_assert_shared_binding_integrity() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    DECLARE
      binding cms_market_edition_bindings%ROWTYPE;
    BEGIN
      SELECT * INTO binding FROM cms_market_edition_bindings WHERE id=NEW.id;
      IF NOT FOUND THEN
        RETURN NULL;
      END IF;
      IF binding.baseline_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM cms_shared_baselines baseline
         WHERE baseline.id=binding.baseline_id
           AND baseline.document_id=binding.document_id
           AND baseline.locale=binding.locale
      ) THEN
        RAISE EXCEPTION 'shared binding baseline must match its document and locale';
      END IF;
      IF binding.mode<>'independent' AND (
        binding.based_on_baseline_revision_id IS NULL OR NOT EXISTS (
          SELECT 1 FROM cms_shared_baseline_revisions revision
           WHERE revision.id=binding.based_on_baseline_revision_id
             AND revision.baseline_id=binding.baseline_id
        )
      ) THEN
        RAISE EXCEPTION 'shared binding adopted baseline revision must belong to its baseline';
      END IF;
      IF binding.mode='independent' AND binding.based_on_baseline_revision_id IS NOT NULL THEN
        RAISE EXCEPTION 'independent binding cannot retain an adopted baseline revision';
      END IF;
      IF binding.held_baseline_revision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM cms_shared_baseline_revisions revision
         WHERE revision.id=binding.held_baseline_revision_id
           AND revision.baseline_id=binding.baseline_id
      ) THEN
        RAISE EXCEPTION 'shared binding held baseline revision must belong to its baseline';
      END IF;
      IF binding.translation_source_revision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM cms_shared_baseline_revisions revision
          JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
         WHERE revision.id=binding.translation_source_revision_id
           AND baseline.document_id=binding.document_id
      ) THEN
        RAISE EXCEPTION 'shared binding translation source must belong to its document';
      END IF;
      IF binding.materialized_revision_id IS NULL OR NOT EXISTS (
        SELECT 1
          FROM cms_revisions materialized
          JOIN cms_market_editions destination ON destination.id=materialized.edition_id
          JOIN market_editions market ON market.id=binding.market_edition_id
         WHERE materialized.id=binding.materialized_revision_id
           AND destination.document_id=binding.document_id
           AND destination.market=market.code
           AND destination.locale=binding.locale
      ) THEN
        RAISE EXCEPTION 'shared binding materialized revision must match its exact destination';
      END IF;
      IF NOT EXISTS (
        SELECT 1 FROM cms_resolved_market_revisions resolved
         WHERE resolved.binding_id=binding.id
           AND resolved.cms_revision_id=binding.materialized_revision_id
      ) THEN
        RAISE EXCEPTION 'shared binding materialized revision must have matching resolved history';
      END IF;
      IF EXISTS (
        SELECT 1
          FROM cms_resolved_market_revisions resolved
          JOIN cms_revisions materialized ON materialized.id=resolved.cms_revision_id
          JOIN cms_market_editions destination ON destination.id=materialized.edition_id
          JOIN market_editions market ON market.id=binding.market_edition_id
          LEFT JOIN cms_shared_baseline_revisions baseline_revision ON baseline_revision.id=resolved.baseline_revision_id
          LEFT JOIN cms_shared_baselines baseline ON baseline.id=baseline_revision.baseline_id
         WHERE resolved.binding_id=binding.id
           AND (destination.document_id IS DISTINCT FROM binding.document_id
             OR destination.market IS DISTINCT FROM market.code
             OR destination.locale IS DISTINCT FROM binding.locale
             OR (resolved.baseline_revision_id IS NOT NULL
               AND (baseline.document_id IS DISTINCT FROM binding.document_id
                 OR baseline.locale IS DISTINCT FROM binding.locale)))
      ) THEN
        RAISE EXCEPTION 'shared binding must continue to match all resolved history';
      END IF;
      RETURN NULL;
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION cms_assert_resolved_market_revision_integrity() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM cms_resolved_market_revisions WHERE id=NEW.id) THEN
        RETURN NULL;
      END IF;
      IF NOT EXISTS (
        SELECT 1
          FROM cms_market_edition_bindings binding
          JOIN cms_revisions materialized ON materialized.id=NEW.cms_revision_id
          JOIN cms_market_editions destination ON destination.id=materialized.edition_id
          JOIN market_editions market ON market.id=binding.market_edition_id
         WHERE binding.id=NEW.binding_id
           AND destination.document_id=binding.document_id
           AND destination.market=market.code
           AND destination.locale=binding.locale
      ) THEN
        RAISE EXCEPTION 'resolved market revision must match its binding document, destination, and locale';
      END IF;
      IF NEW.baseline_revision_id IS NOT NULL AND NOT EXISTS (
        SELECT 1
          FROM cms_market_edition_bindings binding
          JOIN cms_shared_baseline_revisions baseline_revision ON baseline_revision.id=NEW.baseline_revision_id
          JOIN cms_shared_baselines baseline ON baseline.id=baseline_revision.baseline_id
         WHERE binding.id=NEW.binding_id
           AND baseline.document_id=binding.document_id
           AND baseline.locale=binding.locale
      ) THEN
        RAISE EXCEPTION 'resolved market revision baseline must match its binding document and locale';
      END IF;
      RETURN NULL;
    END;
    $fn$;

    CREATE OR REPLACE FUNCTION cms_assert_shared_pointer_dependency_integrity() RETURNS trigger
    LANGUAGE plpgsql AS $fn$
    BEGIN
      IF EXISTS (
        SELECT 1
          FROM cms_shared_baseline_revisions revision
          JOIN cms_shared_baselines baseline ON baseline.id=revision.baseline_id
          LEFT JOIN cms_revisions source_revision ON source_revision.id=revision.source_revision_id
          LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
         WHERE revision.source_revision_id IS NOT NULL
           AND (source_edition.document_id IS DISTINCT FROM baseline.document_id
             OR source_edition.locale IS DISTINCT FROM baseline.locale
             OR source_edition.market='shared-source'
             OR source_edition.locale='und')
      ) THEN
        RAISE EXCEPTION 'shared baseline revision source must remain an exact real-market revision for its document and locale';
      END IF;
      IF EXISTS (
        SELECT 1
          FROM cms_resolved_market_revisions resolved
          JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
          JOIN cms_revisions materialized ON materialized.id=resolved.cms_revision_id
          JOIN cms_market_editions destination ON destination.id=materialized.edition_id
          JOIN market_editions market ON market.id=binding.market_edition_id
         WHERE destination.document_id IS DISTINCT FROM binding.document_id
            OR destination.market IS DISTINCT FROM market.code
            OR destination.locale IS DISTINCT FROM binding.locale
      ) THEN
        RAISE EXCEPTION 'resolved market revision must remain at its binding document, destination, and locale';
      END IF;
      IF EXISTS (
        SELECT 1
          FROM cms_market_edition_bindings binding
         WHERE binding.materialized_revision_id IS NULL
            OR NOT EXISTS (
                 SELECT 1
                   FROM cms_revisions materialized
                   JOIN cms_market_editions destination ON destination.id=materialized.edition_id
                   JOIN market_editions market ON market.id=binding.market_edition_id
                  WHERE materialized.id=binding.materialized_revision_id
                    AND destination.document_id=binding.document_id
                    AND destination.market=market.code
                    AND destination.locale=binding.locale
               )
            OR NOT EXISTS (
                 SELECT 1 FROM cms_resolved_market_revisions resolved
                  WHERE resolved.binding_id=binding.id
                    AND resolved.cms_revision_id=binding.materialized_revision_id
               )
      ) THEN
        RAISE EXCEPTION 'shared binding materialized revision must remain coherent';
      END IF;
      RETURN NULL;
    END;
    $fn$;

    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_shared_baselines')
         AND tgname='cms_shared_baselines_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER cms_shared_baselines_integrity
        AFTER INSERT OR UPDATE ON cms_shared_baselines
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_baseline_integrity();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_shared_baseline_revisions')
         AND tgname='cms_shared_baseline_revisions_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER cms_shared_baseline_revisions_integrity
        AFTER INSERT OR UPDATE ON cms_shared_baseline_revisions
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_baseline_revision_integrity();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_market_edition_bindings')
         AND tgname='cms_market_edition_bindings_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER cms_market_edition_bindings_integrity
        AFTER INSERT OR UPDATE ON cms_market_edition_bindings
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_binding_integrity();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_resolved_market_revisions')
         AND tgname='cms_resolved_market_revisions_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER cms_resolved_market_revisions_integrity
        AFTER INSERT OR UPDATE ON cms_resolved_market_revisions
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_resolved_market_revision_integrity();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_revisions')
         AND tgname='cms_revisions_shared_pointer_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER cms_revisions_shared_pointer_integrity
        AFTER UPDATE ON cms_revisions
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_pointer_dependency_integrity();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('cms_market_editions')
         AND tgname='cms_market_editions_shared_pointer_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER cms_market_editions_shared_pointer_integrity
        AFTER UPDATE ON cms_market_editions
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_pointer_dependency_integrity();
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_trigger
       WHERE tgrelid=to_regclass('market_editions')
         AND tgname='market_editions_shared_pointer_integrity'
    ) THEN
      CREATE CONSTRAINT TRIGGER market_editions_shared_pointer_integrity
        AFTER UPDATE ON market_editions
        DEFERRABLE INITIALLY DEFERRED
        FOR EACH ROW EXECUTE FUNCTION cms_assert_shared_pointer_dependency_integrity();
    END IF;
  END
  $$;
`;