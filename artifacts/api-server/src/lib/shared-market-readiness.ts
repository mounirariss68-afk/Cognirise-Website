import { mergeSharedBaselineUpdate, validateCmsSnapshot, type CmsDocumentKind } from "@workspace/api-zod";
import type { Queryable } from "./cms";

/**
 * Readiness is a set of independent facts, not a single status. A page can
 * have a live revision, pending changes and an update available simultaneously.
 * Scope destinations before computing facts so another market cannot leak into
 * a restricted editor's filters.
 */
export async function filterSharedMarketReadiness(
  client: Queryable,
  documentIds: string[],
  filter: string,
  allowedMarkets: string[] | null,
  market?: string,
  locale?: string,
): Promise<Set<string>> {
  if (!documentIds.length) return new Set();
  const result = await client.query(
    `SELECT d.id::text document_id,d.kind,b.id baseline_id,
            binding.mode,binding.translation_state,
            binding.based_on_baseline_revision_id,binding.held_baseline_revision_id,
            b.active_revision_id,binding.override_operations,
            CASE WHEN $5 IN ('blocker','needs-resolution','ready') THEN adopted.snapshot END adopted_snapshot,
            CASE WHEN $5 IN ('blocker','needs-resolution','ready') THEN current_base.snapshot END current_snapshot,
            latest.id latest_revision_id,latest.workflow_state,e.published_revision_id,
            CASE WHEN $5 IN ('blocker','ready') THEN latest.payload END draft_snapshot,
            a.draft_decision,a.published_decision,
            EXISTS(SELECT 1 FROM cms_market_editions shared
                    WHERE shared.document_id=d.id AND shared.content_mode='shared'
                      AND (shared.locale=target.locale OR shared.locale='und')) legacy_shared
       FROM cms_documents d
       CROSS JOIN market_editions m
       CROSS JOIN LATERAL (
         SELECT DISTINCT value locale
           FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) value
          WHERE value IS NOT NULL
       ) target
       LEFT JOIN cms_market_editions e
         ON e.document_id=d.id AND e.market=m.code AND e.locale=target.locale
       LEFT JOIN LATERAL (
         SELECT r.id,r.workflow_state,r.payload FROM cms_revisions r WHERE r.edition_id=e.id
          ORDER BY r.revision_number DESC LIMIT 1
       ) latest ON true
       LEFT JOIN cms_document_market_availability a
         ON a.document_id=d.id AND a.market_edition_id=m.id AND a.locale=target.locale
       LEFT JOIN cms_shared_baselines b ON b.document_id=d.id AND b.locale=target.locale
       LEFT JOIN cms_market_edition_bindings binding
         ON binding.document_id=d.id AND binding.market_edition_id=m.id AND binding.locale=target.locale
       LEFT JOIN cms_shared_baseline_revisions adopted ON adopted.id=binding.based_on_baseline_revision_id
       LEFT JOIN cms_shared_baseline_revisions current_base ON current_base.id=b.active_revision_id
      WHERE d.id=ANY($1::uuid[]) AND m.enabled=true
        AND ($2::text[] IS NULL OR m.code=ANY($2::text[]))
        AND ($3::text IS NULL OR m.code=$3)
        AND ($4::text IS NULL OR target.locale=$4)`,
    [documentIds, allowedMarkets, market ?? null, locale ?? null, filter],
  );
  const facts = new Map<string, Set<string>>();
  for (const row of result.rows) {
    const flags = facts.get(String(row.document_id)) ?? new Set<string>();
    facts.set(String(row.document_id), flags);
    if (!row.baseline_id && row.mode !== "independent") flags.add("needs-baseline");
    const intended = (row.draft_decision ?? row.published_decision ?? "off") !== "off";
    if (intended && !row.latest_revision_id && !row.legacy_shared) flags.add("missing");
    if ((row.latest_revision_id && row.latest_revision_id !== row.published_revision_id)
      || (row.draft_decision != null && row.draft_decision !== row.published_decision)) {
      flags.add("pending");
    }
    const hasUpdate = ["shared", "adapted"].includes(row.mode)
      && row.active_revision_id !== row.based_on_baseline_revision_id
      && row.active_revision_id !== row.held_baseline_revision_id;
    if (hasUpdate) flags.add("updates");
    if (row.translation_state === "stale") flags.add("translation-stale");
    const conflict = hasUpdate && row.adopted_snapshot && row.current_snapshot
      && mergeSharedBaselineUpdate(
        row.adopted_snapshot, row.current_snapshot, row.override_operations ?? [],
      ).conflicts.length > 0;
    const invalidDraft = row.draft_snapshot && row.kind
      && !validateCmsSnapshot(row.kind as CmsDocumentKind, row.draft_snapshot, "publish").success;
    if (row.workflow_state === "rejected" || conflict || invalidDraft) flags.add("blocker");
    if (hasUpdate || conflict) flags.add("needs-resolution");
  }
  return new Set([...facts].filter(([, flags]) => filter === "ready"
    ? !["missing", "pending", "blocker", "updates", "translation-stale"].some((flag) => flags.has(flag))
    : flags.has(filter)).map(([id]) => id));
}