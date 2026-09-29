import {
  documentPublishedAvailabilityClause,
  industryDestinationEligibilityClause,
  industryExactMarketDeliveryClause,
  managedMarketPublicDeliveryClause,
  publicPayloadEligibilityClause,
} from "./availability";

type Queryable = { query: (sql: string, values?: unknown[]) => Promise<any> };

export type HomepageIndustryValidation =
  | { success: true }
  | {
      success: false;
      errors: string[];
      issues: Array<{
        code: string;
        path: string;
        message: string;
        scope: "publish";
        action: "focus-content-field";
      }>;
    };

/**
 * Check homepage industry placements against the exact authorized delivery
 * edition. This intentionally does not resolve fallback editions: a selected
 * card must have an approved, published, publicly eligible industry revision
 * and published availability for this market/locale.
 */
export async function validateHomepageIndustrySelections(
  executor: Queryable,
  snapshot: unknown,
  market: string,
  locale: string,
): Promise<HomepageIndustryValidation> {
  if (!snapshot || typeof snapshot !== "object" || Array.isArray(snapshot)) return { success: true };
  const payload = snapshot as Record<string, any>;
  if (payload.content?.pagePath !== "/") return { success: true };
  const sections = payload.content?.sections;
  if (!Array.isArray(sections)) return { success: true };

  const selected: Array<{ slug: string; path: string }> = [];
  for (const [sectionIndex, section] of sections.entries()) {
    if (
      section?.type !== "narrative"
      || section.id !== "home-industries"
      || !Array.isArray(section.industryIds)
    ) continue;
    for (const [industryIndex, slug] of section.industryIds.entries()) {
      if (typeof slug === "string") {
        selected.push({
          slug,
          path: `content.sections.${sectionIndex}.industryIds.${industryIndex}`,
        });
      }
    }
  }
  if (!selected.length) return { success: true };

  const eligible = await executor.query(
    `SELECT d.canonical_slug
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
      WHERE d.kind='industry'
        AND d.canonical_slug=ANY($1::text[])
        AND e.market=$2 AND e.locale=$3
        AND e.publication_state='published' AND e.published_at<=now()
        AND r.workflow_state='approved'
        AND ${publicPayloadEligibilityClause("d", "r")}
        AND ${documentPublishedAvailabilityClause("d.id", "$2", "$3")}
        AND ${industryDestinationEligibilityClause("d", "e", "r", "$2")}
        AND ${industryExactMarketDeliveryClause("d", "e", "$2")}
        AND ${managedMarketPublicDeliveryClause("d.id", "e", "$2", "$3")}`,
    [[...new Set(selected.map(({ slug }) => slug))], market, locale],
  );
  const eligibleSlugs = new Set(eligible.rows.map((row: Record<string, unknown>) => String(row.canonical_slug)));
  const invalid = selected.filter(({ slug }) => !eligibleSlugs.has(slug));
  if (!invalid.length) return { success: true };

  const issues = invalid.map(({ slug, path }) => ({
    code: "CMS_PUBLISH_HOMEPAGE_INDUSTRY_UNAVAILABLE",
    path,
    message: `Industry ${slug} is not published and available in the exact ${market}/${locale} edition.`,
    scope: "publish" as const,
    action: "focus-content-field" as const,
  }));
  return {
    success: false,
    errors: issues.map((issue) => `${issue.path}: ${issue.message}`),
    issues,
  };
}