-- Task 307: make delivery availability a document-wide, versioned release
-- boundary. This migration is additive and deliberately does not collapse
-- existing regional editions or revise their publication pointers.
ALTER TABLE "cms_market_editions"
  ADD COLUMN IF NOT EXISTS "content_mode" text NOT NULL DEFAULT 'custom',
  ADD COLUMN IF NOT EXISTS "customized_from_revision_id" uuid;

ALTER TABLE "cms_revisions"
  ADD COLUMN IF NOT EXISTS "source_revision_id" uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='cms_market_editions_content_mode_check'
      AND conrelid='cms_market_editions'::regclass
  ) THEN
    ALTER TABLE "cms_market_editions"
      ADD CONSTRAINT "cms_market_editions_content_mode_check"
      CHECK ("content_mode" IN ('shared','custom'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='cms_market_editions_customized_from_revision_fk'
      AND conrelid='cms_market_editions'::regclass
  ) THEN
    ALTER TABLE "cms_market_editions"
      ADD CONSTRAINT "cms_market_editions_customized_from_revision_fk"
      FOREIGN KEY ("customized_from_revision_id") REFERENCES "cms_revisions"("id")
      ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname='cms_revisions_source_revision_fk'
      AND conrelid='cms_revisions'::regclass
  ) THEN
    ALTER TABLE "cms_revisions"
      ADD CONSTRAINT "cms_revisions_source_revision_fk"
      FOREIGN KEY ("source_revision_id") REFERENCES "cms_revisions"("id")
      ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "cms_market_editions_content_mode_idx"
  ON "cms_market_editions" ("document_id","content_mode");

CREATE TABLE IF NOT EXISTS "cms_document_market_availability" (
  "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE CASCADE,
  "market_edition_id" uuid NOT NULL REFERENCES "market_editions"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "published_decision" text NOT NULL DEFAULT 'inherit',
  "draft_decision" text,
  "updated_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "published_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "published_at" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_document_market_availability_pk" PRIMARY KEY ("document_id","market_edition_id","locale"),
  CONSTRAINT "cms_document_market_availability_published_decision_check"
    CHECK ("published_decision" IN ('inherit','show','off')),
  CONSTRAINT "cms_document_market_availability_draft_decision_check"
    CHECK ("draft_decision" IS NULL OR "draft_decision" IN ('inherit','show','off'))
);
CREATE INDEX IF NOT EXISTS "cms_document_market_availability_market_idx"
  ON "cms_document_market_availability" ("market_edition_id");

CREATE TABLE IF NOT EXISTS "cms_document_availability_states" (
  "document_id" uuid PRIMARY KEY REFERENCES "cms_documents"("id") ON DELETE CASCADE,
  "draft_version" integer NOT NULL DEFAULT 0,
  "reviewed_version" integer,
  "published_version" integer NOT NULL DEFAULT 0,
  "shared_source_edition_id" uuid REFERENCES "cms_market_editions"("id") ON DELETE SET NULL,
  "shared_source_revision_id" uuid REFERENCES "cms_revisions"("id") ON DELETE SET NULL,
  "published_source_revision_id" uuid REFERENCES "cms_revisions"("id") ON DELETE SET NULL,
  "reviewed_source_revision_id" uuid REFERENCES "cms_revisions"("id") ON DELETE SET NULL,
  "reviewed_selections" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "updated_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "reviewed_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "published_by_user_id" uuid REFERENCES "cms_users"("id") ON DELETE SET NULL,
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "reviewed_at" timestamp with time zone,
  "published_at" timestamp with time zone,
  CONSTRAINT "cms_document_availability_states_version_check"
    CHECK ("draft_version">=0 AND "published_version">=0
      AND ("reviewed_version" IS NULL OR "reviewed_version">=0))
);

CREATE TABLE IF NOT EXISTS "cms_document_availability_migration_reports" (
  "document_id" uuid NOT NULL REFERENCES "cms_documents"("id") ON DELETE CASCADE,
  "market_edition_id" uuid NOT NULL REFERENCES "market_editions"("id") ON DELETE CASCADE,
  "locale" text NOT NULL,
  "legacy_decision" text,
  "legacy_published_decision" text,
  "legacy_draft_decision" text,
  "published_decision" text NOT NULL,
  "draft_decision" text,
  "visibility_preserved" boolean NOT NULL,
  "legacy_resolvable" boolean NOT NULL,
  "published_resolvable" boolean NOT NULL,
  "resolvability_preserved" boolean NOT NULL,
  "reconciled_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "cms_document_availability_migration_reports_pk"
    PRIMARY KEY ("document_id","market_edition_id","locale")
);

-- Reports are migration receipts, not a mutable description of whatever the
-- current release happens to resolve to. Older development databases already
-- contain the first form of this receipt, so retain it and enrich new receipts
-- with the concrete source identity used for the comparison.
ALTER TABLE "cms_document_availability_migration_reports"
  ADD COLUMN IF NOT EXISTS "legacy_selected_edition_id" uuid,
  ADD COLUMN IF NOT EXISTS "legacy_selected_revision_id" uuid,
  ADD COLUMN IF NOT EXISTS "published_selected_edition_id" uuid,
  ADD COLUMN IF NOT EXISTS "published_selected_revision_id" uuid,
  ADD COLUMN IF NOT EXISTS "selection_preserved" boolean NOT NULL DEFAULT true;

-- A release-level receipt distinguishes this historical conversion from
-- documents authored afterwards. Existing development installations already
-- have per-destination receipts from the earlier 0024 shape; acknowledge
-- those receipts without recomputing or publishing a new baseline.
CREATE TABLE IF NOT EXISTS "cms_document_availability_migration_control" (
  "migration_key" text PRIMARY KEY,
  "completed_at" timestamp with time zone NOT NULL DEFAULT now()
);
INSERT INTO "cms_document_availability_migration_control" ("migration_key")
SELECT '0024-cms-document-availability'
 WHERE EXISTS (SELECT 1 FROM "cms_document_availability_migration_reports")
ON CONFLICT ("migration_key") DO NOTHING;

CREATE OR REPLACE FUNCTION "cms_document_availability_candidates"(
  requested_market text,
  requested_locale text
)
RETURNS TABLE ("market" text,"locale" text,"candidate_rank" integer)
LANGUAGE sql STABLE AS $$
  -- Keep this in lockstep with navigationCandidates: requested locale,
  -- requested default, every recursive fallback using its parent's configured
  -- fallback locale, then an otherwise independent canonical market.
  WITH RECURSIVE requested AS (
    SELECT code,default_locale,fallback_market_code,fallback_locale
      FROM market_editions
     WHERE code=requested_market AND enabled=true
  ), chain AS (
    SELECT code,fallback_market_code,fallback_locale,ARRAY[code]::text[] path,0 depth
      FROM requested
    UNION ALL
    SELECT next.code,next.fallback_market_code,next.fallback_locale,
           chain.path||next.code,chain.depth+1
      FROM chain
      JOIN market_editions next
        ON next.code=chain.fallback_market_code AND next.enabled=true
     WHERE chain.fallback_market_code IS NOT NULL
       AND NOT next.code=ANY(chain.path)
       AND chain.depth<14
  ), raw_candidates AS (
    SELECT requested.code market,requested_locale locale,0 ordering
      FROM requested
    UNION ALL
    SELECT requested.code,requested.default_locale,1
      FROM requested
     WHERE requested_locale<>requested.default_locale
    UNION ALL
    SELECT next.code,COALESCE(chain.fallback_locale,next.default_locale),chain.depth+2
      FROM chain
      JOIN market_editions next
        ON next.code=chain.fallback_market_code AND next.enabled=true
     WHERE chain.fallback_market_code IS NOT NULL AND chain.depth<15
  ), deduplicated AS (
    SELECT market,locale,min(ordering) ordering
      FROM raw_candidates
     WHERE locale IS NOT NULL
     GROUP BY market,locale
  ), limited AS (
    SELECT market,locale,ordering
      FROM (
        SELECT market,locale,ordering,
               row_number() OVER (ORDER BY ordering,market,locale) ordinal
          FROM deduplicated
      ) ranked
     WHERE ordinal<=16
  ), with_canonical AS (
    SELECT market,locale,ordering FROM limited
    UNION ALL
    SELECT canonical.code,canonical.default_locale,32
      FROM market_editions canonical
     WHERE canonical.enabled=true AND canonical.is_canonical=true
       AND NOT EXISTS (
         SELECT 1 FROM limited
          WHERE limited.market=canonical.code
            AND limited.locale=canonical.default_locale
       )
  ), ordered AS (
    SELECT market,locale,
           row_number() OVER (ORDER BY ordering,market,locale)::integer-1 candidate_rank
      FROM with_canonical
  )
  SELECT market,locale,candidate_rank
    FROM ordered
   ORDER BY candidate_rank
$$;

-- First copy the person-specific release decision exactly. Explicit
-- exclusions remain exclusions and staged person changes remain staged.
INSERT INTO "cms_document_market_availability"
  ("document_id","market_edition_id","locale","published_decision","draft_decision",
   "updated_by_user_id","published_by_user_id","published_at","created_at","updated_at")
SELECT legacy."document_id",legacy."market_edition_id",locale."locale",legacy."published_decision",legacy."draft_decision",
       legacy."updated_by_user_id",legacy."published_by_user_id",legacy."published_at",
       legacy."created_at",legacy."updated_at"
  FROM "cms_person_market_availability" legacy
  JOIN "market_editions" market ON market."id"=legacy."market_edition_id"
 CROSS JOIN LATERAL (
   SELECT DISTINCT locale FROM unnest(ARRAY[market."default_locale",market."fallback_locale"]) locale
   WHERE locale IS NOT NULL
 ) locale
 WHERE NOT EXISTS (
   SELECT 1 FROM "cms_document_availability_migration_control"
    WHERE "migration_key"='0024-cms-document-availability'
 )
ON CONFLICT ("document_id","market_edition_id","locale") DO NOTHING;

-- Legacy non-person delivery had unrestricted fallback. Materialize inherit
-- decisions for every currently enabled configured destination. The baseline
-- below changes only previously unreachable destinations to `off`.
INSERT INTO "cms_document_market_availability" ("document_id","market_edition_id","locale","published_decision")
SELECT d."id",m."id",locale."locale",'inherit'
  FROM "cms_documents" d CROSS JOIN "market_editions" m
 CROSS JOIN LATERAL (
   SELECT DISTINCT locale FROM unnest(ARRAY[m."default_locale",m."fallback_locale"]) locale
   WHERE locale IS NOT NULL
 ) locale
 WHERE m."enabled"=true
   AND NOT EXISTS (
     SELECT 1 FROM "cms_document_availability_migration_control"
      WHERE "migration_key"='0024-cms-document-availability'
   )
ON CONFLICT ("document_id","market_edition_id","locale") DO NOTHING;

-- Only records without an availability state are historical migration
-- candidates. On a rerun, this prevents a later single custom edition from
-- being silently converted into a shared source.
UPDATE "cms_market_editions" target
   SET "content_mode"='shared'
 WHERE (
   SELECT count(*) FROM "cms_market_editions" sibling
    WHERE sibling."document_id"=target."document_id"
 )=1
   AND NOT EXISTS (
     SELECT 1 FROM "cms_document_availability_migration_control"
      WHERE "migration_key"='0024-cms-document-availability'
   )
   AND NOT EXISTS (
     SELECT 1 FROM "cms_document_availability_states" state
      WHERE state."document_id"=target."document_id"
   );

INSERT INTO "cms_document_availability_states" ("document_id")
SELECT "id" FROM "cms_documents"
 WHERE NOT EXISTS (
   SELECT 1 FROM "cms_document_availability_migration_control"
    WHERE "migration_key"='0024-cms-document-availability'
 )
ON CONFLICT ("document_id") DO NOTHING;

-- Record only an unambiguous saved shared source. Documents with independent
-- legacy editions deliberately have no source until an editor chooses one.
UPDATE "cms_document_availability_states" state
   SET "shared_source_edition_id"=source."id",
       "shared_source_revision_id"=source."revision_id",
       "published_source_revision_id"=source."published_revision_id"
  FROM (
    SELECT e."document_id",e."id",e."published_revision_id",
           (
             SELECT r."id" FROM "cms_revisions" r
              WHERE r."edition_id"=e."id"
              ORDER BY r."revision_number" DESC,r."created_at" DESC,r."id" DESC
              LIMIT 1
           ) AS "revision_id"
      FROM "cms_market_editions" e
     WHERE e."content_mode"='shared'
  ) source
 WHERE state."document_id"=source."document_id"
    AND state."shared_source_edition_id" IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM "cms_document_availability_migration_control"
       WHERE "migration_key"='0024-cms-document-availability'
    );

-- Capture the legacy public selector before deriving the new availability
-- boundary. This deliberately models the complete navigation candidate chain,
-- published time/pointer, and public payload predicate rather than merely
-- asking whether an exact or direct-fallback edition exists.
CREATE TEMP TABLE "cms_document_availability_legacy_baseline"
  ON COMMIT DROP AS
WITH destinations AS (
  SELECT market."id" AS market_edition_id,market."code" AS market,locale."locale"
    FROM market_editions market
   CROSS JOIN LATERAL (
     SELECT DISTINCT configured_locale AS locale
       FROM unnest(ARRAY[market."default_locale",market."fallback_locale"]) configured_locale
      WHERE configured_locale IS NOT NULL
   ) locale
   WHERE market."enabled"=true
)
SELECT d."id" AS document_id,destination.market_edition_id,destination.locale,
       COALESCE(person."decision",'inherit') AS legacy_decision,
       COALESCE(person."published_decision",'inherit') AS legacy_published_decision,
       person."draft_decision" AS legacy_draft_decision,
       source.selected_edition_id AS legacy_selected_edition_id,
       source.selected_revision_id AS legacy_selected_revision_id,
       (source.selected_revision_id IS NOT NULL) AS legacy_resolvable
  FROM cms_documents d
 CROSS JOIN destinations destination
 LEFT JOIN cms_person_market_availability person
   ON person."document_id"=d."id"
  AND person."market_edition_id"=destination.market_edition_id
 LEFT JOIN LATERAL (
   SELECT e."id" AS selected_edition_id,r."id" AS selected_revision_id
     FROM "cms_market_editions" e
     JOIN "cms_revisions" r
       ON r."id"=e."published_revision_id"
      AND r."edition_id"=e."id"
      AND r."workflow_state"='approved'
     JOIN "cms_document_availability_candidates"(destination.market,destination.locale) candidate
       ON candidate."market"=e."market" AND candidate."locale"=e."locale"
    WHERE e."document_id"=d."id"
      AND e."publication_state"='published' AND e."published_at"<=now()
      AND (d."kind"<>'person' OR COALESCE(person."published_decision",'inherit')<>'off')
      AND (r."payload"->>'visibility' IS NULL OR r."payload"->>'visibility'='public')
      AND (r."payload"->'content'->>'visibility' IS NULL OR r."payload"->'content'->>'visibility'='public')
      AND (r."payload"->>'confidential' IS NULL OR r."payload"->>'confidential' NOT IN ('true','restricted'))
      AND (r."payload"->'content'->>'confidential' IS NULL OR r."payload"->'content'->>'confidential' NOT IN ('true','restricted'))
      AND (r."payload"->'content'->>'disclosure' IS NULL OR r."payload"->'content'->>'disclosure'<>'restricted')
      AND (d."kind"<>'case-study' OR r."payload"->'content'->>'publicEvidenceStatus'='approved')
      AND NOT (
        d."kind"='landing-page'
        AND COALESCE(r."payload"->'content'->>'pagePath',r."payload"->>'pagePath') IN ('/work','/work/')
      )
    ORDER BY candidate."candidate_rank",e."updated_at" DESC,e."id"
    LIMIT 1
 ) source ON true
 WHERE d."status"<>'archived'
   AND NOT EXISTS (
     SELECT 1 FROM "cms_document_availability_migration_control"
      WHERE "migration_key"='0024-cms-document-availability'
   );

-- A singleton becomes globally eligible when it is promoted to shared. Make
-- every destination which was not historically resolvable explicitly off
-- before that global source can leak into it. Once a receipt exists, it is the
-- immutable authority: a rerun never rewrites a later editorial selection.
UPDATE "cms_document_market_availability" current
   SET "published_decision"='off',"updated_at"=now()
  FROM "cms_document_availability_legacy_baseline" legacy
 WHERE current."document_id"=legacy.document_id
   AND current."market_edition_id"=legacy.market_edition_id
   AND current."locale"=legacy.locale
   AND legacy.legacy_resolvable=false
   AND current."published_decision"='inherit'
   AND current."draft_decision" IS NULL
   AND NOT EXISTS (
     SELECT 1
       FROM "cms_document_availability_migration_reports" receipt
      WHERE receipt."document_id"=legacy.document_id
        AND receipt."market_edition_id"=legacy.market_edition_id
        AND receipt."locale"=legacy.locale
   );

-- Reconcile every previously deliverable document/destination, not just the
-- people records that had an explicit legacy decision. The receipt records the
-- actual legacy and post-migration selected revision, not just existence.
INSERT INTO "cms_document_availability_migration_reports"
  ("document_id","market_edition_id","locale","legacy_decision","legacy_published_decision",
   "legacy_draft_decision","published_decision","draft_decision","visibility_preserved",
   "legacy_resolvable","published_resolvable","resolvability_preserved",
   "legacy_selected_edition_id","legacy_selected_revision_id",
   "published_selected_edition_id","published_selected_revision_id","selection_preserved")
SELECT legacy.document_id,legacy.market_edition_id,legacy.locale,
       legacy.legacy_decision,legacy.legacy_published_decision,legacy.legacy_draft_decision,
       current."published_decision",current."draft_decision",
       legacy.legacy_resolvable=published_delivery.resolvable,
       legacy.legacy_resolvable,published_delivery.resolvable,
       legacy.legacy_resolvable=published_delivery.resolvable,
       legacy.legacy_selected_edition_id,legacy.legacy_selected_revision_id,
       published_delivery.selected_edition_id,published_delivery.selected_revision_id,
       legacy.legacy_selected_edition_id IS NOT DISTINCT FROM published_delivery.selected_edition_id
         AND legacy.legacy_selected_revision_id IS NOT DISTINCT FROM published_delivery.selected_revision_id
  FROM "cms_document_availability_legacy_baseline" legacy
  JOIN "cms_document_market_availability" current
     ON current."document_id"=legacy.document_id
    AND current."market_edition_id"=legacy.market_edition_id
    AND current."locale"=legacy.locale
 CROSS JOIN LATERAL (
    SELECT source.selected_edition_id,source.selected_revision_id,
           (source.selected_revision_id IS NOT NULL) AS resolvable
      FROM "cms_documents" d
      LEFT JOIN "cms_document_availability_states" state
        ON state."document_id"=d."id"
      LEFT JOIN LATERAL (
        SELECT e."id" AS selected_edition_id,r."id" AS selected_revision_id
          FROM "cms_market_editions" e
          JOIN "cms_revisions" r
            ON r."id"=e."published_revision_id"
           AND r."edition_id"=e."id"
           AND r."workflow_state"='approved'
          LEFT JOIN "cms_document_availability_candidates"(
            (SELECT code FROM market_editions WHERE id=legacy.market_edition_id),
            legacy.locale
          ) candidate
            ON candidate."market"=e."market" AND candidate."locale"=e."locale"
         WHERE d."id"=legacy.document_id
           AND current."published_decision"<>'off'
           AND e."publication_state"='published' AND e."published_at"<=now()
           AND (
             (e."content_mode"='custom' AND candidate."market" IS NOT NULL)
             OR (
               e."content_mode"='shared'
               AND e."id"=state."shared_source_edition_id"
               AND e."published_revision_id"=state."published_source_revision_id"
             )
           )
           AND (r."payload"->>'visibility' IS NULL OR r."payload"->>'visibility'='public')
           AND (r."payload"->'content'->>'visibility' IS NULL OR r."payload"->'content'->>'visibility'='public')
           AND (r."payload"->>'confidential' IS NULL OR r."payload"->>'confidential' NOT IN ('true','restricted'))
           AND (r."payload"->'content'->>'confidential' IS NULL OR r."payload"->'content'->>'confidential' NOT IN ('true','restricted'))
           AND (r."payload"->'content'->>'disclosure' IS NULL OR r."payload"->'content'->>'disclosure'<>'restricted')
           AND (d."kind"<>'case-study' OR r."payload"->'content'->>'publicEvidenceStatus'='approved')
           AND NOT (
             d."kind"='landing-page'
             AND COALESCE(r."payload"->'content'->>'pagePath',r."payload"->>'pagePath') IN ('/work','/work/')
           )
         ORDER BY CASE
                    WHEN e."content_mode"='custom'
                     AND e."market"=(SELECT code FROM market_editions WHERE id=legacy.market_edition_id)
                     AND e."locale"=legacy.locale THEN 0
                    WHEN e."content_mode"='shared' THEN 1
                    ELSE 2
                  END,
                  candidate."candidate_rank",e."updated_at" DESC,e."id"
         LIMIT 1
      ) source ON true
     WHERE d."id"=legacy.document_id
 ) published_delivery
ON CONFLICT ("document_id","market_edition_id","locale") DO NOTHING;

CREATE OR REPLACE FUNCTION "cms_document_availability_migration_receipt_immutable"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'document availability migration receipts are immutable';
END $$;
DROP TRIGGER IF EXISTS "cms_document_availability_migration_receipt_immutable"
  ON "cms_document_availability_migration_reports";
CREATE TRIGGER "cms_document_availability_migration_receipt_immutable"
BEFORE UPDATE OR DELETE ON "cms_document_availability_migration_reports"
FOR EACH ROW EXECUTE FUNCTION "cms_document_availability_migration_receipt_immutable"();

INSERT INTO "cms_document_availability_migration_control" ("migration_key")
VALUES ('0024-cms-document-availability')
ON CONFLICT ("migration_key") DO NOTHING;

-- Keep the former people-only projection in sync during the delivery rollout.
-- Public consumers that have not yet switched to the shared predicate retain
-- exact published behavior; the new document table remains the write source.
CREATE OR REPLACE FUNCTION "sync_document_availability_to_person_legacy"()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."locale" = (
    SELECT default_locale FROM market_editions WHERE id=NEW."market_edition_id"
  ) AND EXISTS (
    SELECT 1 FROM cms_documents WHERE id=NEW."document_id" AND kind='person'
  ) THEN
    INSERT INTO cms_person_market_availability
      (document_id,market_edition_id,decision,published_decision,draft_decision,
       updated_by_user_id,published_by_user_id,published_at,updated_at)
    VALUES
      (NEW.document_id,NEW.market_edition_id,NEW.published_decision,NEW.published_decision,
       NEW.draft_decision,NEW.updated_by_user_id,NEW.published_by_user_id,NEW.published_at,now())
    ON CONFLICT (document_id,market_edition_id) DO UPDATE
      SET decision=EXCLUDED.decision,published_decision=EXCLUDED.published_decision,
          draft_decision=EXCLUDED.draft_decision,updated_by_user_id=EXCLUDED.updated_by_user_id,
          published_by_user_id=EXCLUDED.published_by_user_id,published_at=EXCLUDED.published_at,
          updated_at=now();
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS "cms_document_availability_person_legacy_sync"
  ON "cms_document_market_availability";
CREATE TRIGGER "cms_document_availability_person_legacy_sync"
AFTER INSERT OR UPDATE ON "cms_document_market_availability"
FOR EACH ROW EXECUTE FUNCTION "sync_document_availability_to_person_legacy"();