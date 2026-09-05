import {
  getGetCmsRuntimeQueryKey,
  useGetCmsRuntime,
  type CmsRuntimeEnvelope,
} from "@workspace/api-client-react";
import type { Market } from "@/store/market";

export interface PublicNavigationItem {
  label: string;
  href: string;
  items?: PublicNavigationItem[];
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function safePublicHref(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  if (/^\/(?!\/)[A-Za-z0-9/_#?&=.%+-]*$/.test(value)) return value;
  try {
    const url = new URL(value);
    return ["https:", "mailto:", "tel:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function internalHref(internal: Record<string, unknown>): string | undefined {
  const slug = typeof internal.slug === "string" ? internal.slug : undefined;
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return undefined;
  if (internal._type === "publication") return `/insights/${slug}`;
  if (internal.routeKind === "home") return "/";
  if (internal.routeKind === "service") return `/what-we-do/${slug}`;
  if (internal.routeKind === "platform") return `/platforms/${slug}`;
  if (internal.routeKind === "industry") return `/industries/${slug}`;
  return `/${slug}`;
}

export function runtimeNavigation(envelope: CmsRuntimeEnvelope | undefined): PublicNavigationItem[] | undefined {
  const primary = envelope?.navigation.find((item) => item.placement === "primary");
  if (!primary) return undefined;
  const parseItems = (source: Record<string, unknown>[], depth = 0): PublicNavigationItem[] => source.flatMap((item) => {
    const label = typeof item.label === "string" ? item.label.trim() : "";
    const internal = record(item.internal) ? internalHref(item.internal) : undefined;
    const href = internal ?? safePublicHref(item.externalUrl);
    if (!label || !href) return [];
    const children = depth === 0 && Array.isArray(item.children)
      ? parseItems(item.children.filter(record), depth + 1)
      : undefined;
    return [{ label, href, ...(children?.length ? { items: children } : {}) }];
  });
  const items = parseItems(primary.items);
  return items.length ? items : undefined;
}

export function useCmsRuntime(market: Market) {
  return useGetCmsRuntime(market, {
    query: {
      queryKey: getGetCmsRuntimeQueryKey(market),
      staleTime: 60_000,
    },
  });
}