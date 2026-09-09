export type RelatedCase = {
  slug: string;
  sector?: string;
  sectors?: string[];
  industrySlugs?: string[];
  relatedIndustries?: string[];
  publicEvidenceStatus?: string;
  approvedForIndustry?: boolean;
  disclosure?: string;
};

export function caseSectors(item: RelatedCase) {
  return [...(item.sectors || []), ...(item.industrySlugs || []), ...(item.sector ? [item.sector] : [])];
}

export function normalizeCaseFilterValue(value: string) {
  return value === "All" ? "all" : value;
}

export function directlyRelatedCases<T extends RelatedCase>(cases: T[], industrySlug: string): T[] {
  if (industrySlug === "energy-resources" || industrySlug === "education") return [];
  return cases.filter((item) =>
    item.approvedForIndustry !== false &&
    item.publicEvidenceStatus === "approved" &&
    (item.relatedIndustries || item.industrySlugs || []).includes(industrySlug) &&
    item.disclosure !== "restricted");
}