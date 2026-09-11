-- Preserve a shared edition's editorial regional origin when its delivery
-- address is relocated. `market` remains the live delivery address; public
-- industry projection uses this stable origin instead.
ALTER TABLE "cms_market_editions"
  ADD COLUMN IF NOT EXISTS "editorial_market" text;

-- New availability rows are unpublished until an explicit reviewed release.
-- Existing migration receipts retain their explicit inherited decisions.
ALTER TABLE "cms_document_market_availability"
  ALTER COLUMN "published_decision" SET DEFAULT 'off';

-- A real delivery address is its own editorial origin. This deliberately
-- repairs any earlier development replay that inferred a custom edition's
-- origin from its source revision: regional custom content must retain its
-- own published projection behavior.
UPDATE "cms_market_editions"
   SET "editorial_market"="market"
 WHERE "market"<>'shared-source'
   AND "editorial_market" IS DISTINCT FROM "market";

-- Only an internal shared-source address has lost its real editorial market.
-- Recover it from the revision's own source chain or the relocation audit;
-- never infer it from an arbitrary real/custom destination.
CREATE TABLE IF NOT EXISTS "cms_editorial_market_migration_reports" (
  "market_edition_id" uuid PRIMARY KEY REFERENCES "cms_market_editions"("id") ON DELETE CASCADE,
  "candidate_count" integer NOT NULL,
  "resolved_market" text,
  "ambiguous" boolean NOT NULL,
  "reconciled_at" timestamp with time zone NOT NULL DEFAULT now()
);

DELETE FROM "cms_editorial_market_migration_reports" report
 USING "cms_market_editions" e
 WHERE report."market_edition_id"=e."id"
   AND e."market"<>'shared-source';

WITH RECURSIVE revision_lineage AS (
  SELECT e."id" AS target_edition_id,
         COALESCE(e."published_revision_id",e."customized_from_revision_id") AS revision_id,
         ARRAY[COALESCE(e."published_revision_id",e."customized_from_revision_id")]::uuid[] AS visited
    FROM "cms_market_editions" e
   WHERE e."market"='shared-source'
     AND e."editorial_market" IS NULL
     AND COALESCE(e."published_revision_id",e."customized_from_revision_id") IS NOT NULL
  UNION ALL
  SELECT lineage.target_edition_id,r."source_revision_id",
         lineage.visited || r."source_revision_id"
    FROM revision_lineage lineage
    JOIN "cms_revisions" r ON r."id"=lineage.revision_id
   WHERE r."source_revision_id" IS NOT NULL
     AND NOT r."source_revision_id"=ANY(lineage.visited)
),
lineage_origins AS (
  SELECT lineage.target_edition_id,source_edition."market"
    FROM revision_lineage lineage
    JOIN "cms_revisions" terminal ON terminal."id"=lineage.revision_id
    JOIN "cms_market_editions" source_edition ON source_edition."id"=terminal."edition_id"
   WHERE terminal."source_revision_id" IS NULL
     AND source_edition."market"<>'shared-source'
),
relocation_audit_origins AS (
  SELECT lineage.target_edition_id,
         audit."metadata"->'from'->>'market' AS market
    FROM revision_lineage lineage
    JOIN "cms_revisions" source_revision ON source_revision."id"=lineage.revision_id
    JOIN "cms_market_editions" source_edition ON source_edition."id"=source_revision."edition_id"
    JOIN "cms_audit_events" audit
      ON audit."action"='document.shared_source_relocated'
     AND audit."metadata"->>'sourceEditionId'=source_edition."id"::text
   WHERE source_edition."market"='shared-source'
     AND NULLIF(audit."metadata"->'from'->>'market','') IS NOT NULL
),
candidate_origins AS (
  SELECT * FROM lineage_origins
  UNION
  SELECT * FROM relocation_audit_origins
),
resolution AS (
  SELECT e."id" AS market_edition_id,
         count(DISTINCT candidate_origins.market)::int AS candidate_count,
         min(candidate_origins.market) AS resolved_market
    FROM "cms_market_editions" e
    LEFT JOIN candidate_origins ON candidate_origins.target_edition_id=e."id"
   WHERE e."market"='shared-source'
     AND e."editorial_market" IS NULL
   GROUP BY e."id"
),
updated AS (
  UPDATE "cms_market_editions" e
     SET "editorial_market"=resolution.resolved_market
    FROM resolution
   WHERE e."id"=resolution.market_edition_id
     AND resolution.candidate_count=1
   RETURNING e."id"
)
INSERT INTO "cms_editorial_market_migration_reports"
  ("market_edition_id","candidate_count","resolved_market","ambiguous","reconciled_at")
SELECT market_edition_id,candidate_count,
       CASE WHEN candidate_count=1 THEN resolved_market ELSE NULL END,
       candidate_count<>1,now()
  FROM resolution
ON CONFLICT ("market_edition_id") DO UPDATE
  SET "candidate_count"=EXCLUDED."candidate_count",
      "resolved_market"=EXCLUDED."resolved_market",
      "ambiguous"=EXCLUDED."ambiguous",
      "reconciled_at"=EXCLUDED."reconciled_at";

DO $$
DECLARE
  ambiguous_count integer;
BEGIN
  SELECT count(*)::int INTO ambiguous_count
    FROM "cms_editorial_market_migration_reports"
   WHERE "ambiguous";
  RAISE NOTICE 'CMS editorial-market reconciliation left % ambiguous origins unresolved.', ambiguous_count;
END $$;
