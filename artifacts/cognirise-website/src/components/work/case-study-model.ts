export type RelatedCase = {
  slug: string;
  sector?: string;
  sectors?: string[];
  industrySlugs?: string[];
  relatedIndustries?: string[];
  publicEvidenceStatus?: string;
  approvedForIndustry?: boolean;
  disclosure?: string;
  visibility?: string;
};

export function caseSectors(item: RelatedCase) {
  return [...(item.sectors || []), ...(item.industrySlugs || []), ...(item.sector ? [item.sector] : [])];
}

export function normalizeCaseFilterValue(value: string) {
  return value === "All" ? "all" : value;
}

/**
 * The public endpoint already limits this collection to published records for
 * the selected market. Keep the remaining publication gates together here so
 * the overview cannot accidentally expose a restricted, hidden, or
 * unapproved record when the CMS payload changes.
 */
export function approvedPublishedCases<T extends RelatedCase>(cases: T[]): T[] {
  const seen = new Set<string>();
  return cases.filter((item) => {
    const slug = item.slug?.trim();
    if (
      !slug
      || seen.has(slug)
      || item.disclosure === "restricted"
      || item.visibility === "hidden"
      || item.approvedForIndustry === false
      || item.publicEvidenceStatus !== "approved"
    ) return false;
    seen.add(slug);
    return true;
  });
}