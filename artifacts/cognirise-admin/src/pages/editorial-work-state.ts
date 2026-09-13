import type { EditorialWorkItem } from "@/lib/editorial-work";

/**
 * Queue links are server-provided authenticated admin links. Older API paths
 * used `/documents`; the cockpit route is `/content`, while query parameters
 * (especially shared-source/und) must remain byte-for-byte addressable.
 */
export function editorialAdminHref(
  link: string | null | undefined,
  fallback?: { documentId: string; market: string; locale: string },
) {
  const fallbackHref = fallback
    ? `/content/${encodeURIComponent(fallback.documentId)}?${new URLSearchParams({ market: fallback.market, locale: fallback.locale }).toString()}`
    : "/editorial-work";
  if (!link || !link.startsWith("/") || link.startsWith("//")) return fallbackHref;
  return link.replace(/^\/documents\/([^/?#]+)/, "/content/$1");
}

export function revisionStateLabel(item: Pick<EditorialWorkItem, "currentRevisionId" | "currentRevisionNumber" | "publishedRevisionId" | "workflowState">) {
  const hasSuccessor = Boolean(
    item.publishedRevisionId
    && item.currentRevisionId
    && item.publishedRevisionId !== item.currentRevisionId,
  );
  if (hasSuccessor) {
    return `Live revision remains published · successor draft${item.currentRevisionNumber ? ` r${item.currentRevisionNumber}` : ""}`;
  }
  if (item.publishedRevisionId) return "Current revision is live";
  return item.workflowState ? item.workflowState.replace(/-/g, " ") : "Draft";
}

export function isOverdue(dueAt: string | null, now = Date.now()) {
  return Boolean(dueAt && Date.parse(dueAt) < now);
}