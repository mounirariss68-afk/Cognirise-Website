/**
 * Shared delivery availability primitives.
 *
 * A destination is the configured market edition plus its requested locale.
 * Callers must still keep their own market/locale candidate ordering so
 * availability never causes a cross-locale resolution.
 */
export type AvailabilityDecision = "inherit" | "show" | "off";

export interface AvailabilitySelection {
  marketEditionId: string;
  locale: string;
  decision: AvailabilityDecision;
}

export const AVAILABILITY_DECISIONS = ["inherit", "show", "off"] as const;

export function isAvailabilityDecision(value: unknown): value is AvailabilityDecision {
  return typeof value === "string" && (AVAILABILITY_DECISIONS as readonly string[]).includes(value);
}

/**
 * SQL correlated predicate for public document selection. `documentIdSql`
 * must be a trusted SQL identifier/expression and `requestedMarketParameter`
 * is a positional parameter (for example `$3`), never raw request input.
 *
 * `inherit` intentionally permits legacy fallback. Once a document has an
 * authoritative destination state, however, a destination with no published
 * row is fail-closed. This prevents a later configuration change (a market
 * enablement or an added locale) from exposing shared content that was never
 * reviewed for that destination, including a migrated legacy state whose
 * published version is zero. `off` remains authoritative for every document
 * kind, including people, and is evaluated before the caller ranks
 * exact/fallback content candidates.
 */
export function documentPublishedAvailabilityClause(
  documentIdSql: string,
  requestedMarketParameter: string,
  requestedLocaleParameter: string,
): string {
  return `(
    NOT EXISTS (
      SELECT 1
        FROM cms_document_availability_states authoritative
       WHERE authoritative.document_id=${documentIdSql}
    )
    OR EXISTS (
      SELECT 1
        FROM cms_document_market_availability availability
        JOIN market_editions requested
          ON requested.id=availability.market_edition_id
       WHERE availability.document_id=${documentIdSql}
         AND requested.code=${requestedMarketParameter}
         AND availability.locale=${requestedLocaleParameter}
         AND availability.published_decision IS DISTINCT FROM 'off'
    )
  )`;
}

/**
 * Shared SQL predicate for source selection on public CMS surfaces. Alias
 * arguments are trusted query aliases, never request input. Keeping this in a
 * route-independent module prevents list/detail/media/navigation selectors
 * from ranking a private or otherwise non-deliverable revision differently.
 */
export function publicPayloadEligibilityClause(documentAlias = "d", revisionAlias = "r"): string {
  return `(${revisionAlias}.payload->>'visibility' IS NULL OR ${revisionAlias}.payload->>'visibility'='public')
  AND (${revisionAlias}.payload->'content'->>'visibility' IS NULL OR ${revisionAlias}.payload->'content'->>'visibility'='public')
  AND (${revisionAlias}.payload->>'confidential' IS NULL OR ${revisionAlias}.payload->>'confidential' NOT IN ('true','restricted'))
  AND (${revisionAlias}.payload->'content'->>'confidential' IS NULL OR ${revisionAlias}.payload->'content'->>'confidential' NOT IN ('true','restricted'))
  AND (${revisionAlias}.payload->'content'->>'disclosure' IS NULL OR ${revisionAlias}.payload->'content'->>'disclosure'<>'restricted')
  AND (${documentAlias}.kind<>'case-study' OR ${revisionAlias}.payload->'content'->>'publicEvidenceStatus'='approved')
  AND NOT (
    ${documentAlias}.kind='landing-page'
    AND COALESCE(${revisionAlias}.payload->'content'->>'pagePath',${revisionAlias}.payload->>'pagePath') IN ('/work','/work/')
  )`;
}

/**
 * SQL pre-filter for the market-specific industry derivatives that can be
 * determined without executing the full JSON projection. Banking POV content
 * is regional: a shared source may only rank for its stable editorial market
 * and the POV's declared market. This keeps a KSA source from winning a UAE
 * query and failing only after selection.
 */
export function industryDestinationEligibilityClause(
  documentAlias: string,
  editionAlias: string,
  revisionAlias: string,
  requestedMarketSql: string,
): string {
  return `(
    ${documentAlias}.kind<>'industry'
    OR ${revisionAlias}.payload->'content'->'bankingPov' IS NULL
    OR (
      ${revisionAlias}.payload->'content'->'bankingPov'->>'market'=${requestedMarketSql}
      AND COALESCE(${editionAlias}.editorial_market,${editionAlias}.market)=${requestedMarketSql}
    )
  )`;
}

export function effectiveAvailability(
  publishedDecision: AvailabilityDecision | null | undefined,
  draftDecision?: AvailabilityDecision | null,
): { published: boolean; preview: boolean } {
  const published = (publishedDecision ?? "inherit") !== "off";
  return {
    published,
    preview: (draftDecision ?? publishedDecision ?? "inherit") !== "off",
  };
}