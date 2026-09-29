export type InsightArticleCard = {
  number: string;
  title: string;
  copy: string;
  topics: string[];
  url: string;
};

type InsightDelivery = {
  market: string;
  locale: string;
  hasReleaseContext: boolean;
  isAuthoritative: boolean;
  delivery: string;
  published: InsightArticleCard[];
  approvedFallback: InsightArticleCard[];
};

export function selectInsightArticles({
  market,
  locale,
  hasReleaseContext,
  isAuthoritative,
  delivery,
  published,
  approvedFallback,
}: InsightDelivery): InsightArticleCard[] {
  if (isAuthoritative && (delivery === "api-error" || delivery === "contract-error")) return [];

  const mayUseApprovedFallback = market === "uae"
    && locale === "en"
    && !hasReleaseContext
    && !isAuthoritative
    && delivery === "intentional-empty";

  return mayUseApprovedFallback ? approvedFallback : published;
}

export function releasedInsightHref(
  candidate: string,
  articles: readonly InsightArticleCard[],
): string | undefined {
  return articles.some((article) => article.url === candidate) ? candidate : undefined;
}