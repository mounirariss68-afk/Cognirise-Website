import { useGetPublishedContent, useListPublishedContent } from "@workspace/api-client-react";
import type { DocumentKind, PublishedContent } from "@workspace/api-client-react";
import { useMarketStore } from "@/store/market";

export type CmsRecord = Record<string, unknown>;

export function contentRecord(item: PublishedContent): CmsRecord {
  return {
    ...item.content,
    id: item.id,
    slug: item.slug,
    title: item.title,
    summary: item.summary,
    media: item.media,
    seo: item.seo,
    publishedAt: item.publishedAt,
    updatedAt: item.updatedAt,
  };
}

export function text(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value : fallback;
}

export function stringList(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : fallback;
}

export function tupleList(value: unknown, fallback: string[][]): string[][] {
  return Array.isArray(value) &&
    value.every((row) => Array.isArray(row) && row.every((item) => typeof item === "string"))
    ? value
    : fallback;
}

/**
 * Public CMS collection with an explicit, always-renderable local fallback.
 * A mapper validates the intentionally schema-less CMS content at the page edge.
 */
export function useCmsCollection<T>(
  kind: DocumentKind,
  fallback: T[],
  mapper: (item: PublishedContent, index: number) => T | null,
) {
  const { market } = useMarketStore();
  const query = useListPublishedContent({ kind, market, locale: "en", pageSize: 100 });
  const mapped = query.data?.items
    .map(mapper)
    .filter((item): item is T => item !== null);

  return {
    ...query,
    data: mapped?.length ? mapped : fallback,
    isFallback: !mapped?.length,
  };
}

export function useCmsEntry(kind: DocumentKind, slug: string) {
  const { market } = useMarketStore();
  return useGetPublishedContent(market, "en", kind, slug);
}