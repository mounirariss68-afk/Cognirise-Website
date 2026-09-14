import type { Document } from "@workspace/api-client-react";

/**
 * The relationship editor only needs discovery metadata. Keeping this shape
 * separate from the full document response makes it harder for the picker to
 * accidentally treat an association as a content-reuse operation.
 */
export type RelationshipRecord = Pick<
  Document,
  "id" | "title" | "slug" | "kind" | "status" | "markets"
>;

export function toRelationshipRecord(document: Document): RelationshipRecord {
  return {
    id: document.id,
    title: document.title,
    slug: document.slug,
    kind: document.kind,
    status: document.status,
    markets: document.markets,
  };
}

/**
 * Merge authorized catalogue responses without changing the order in which
 * records were discovered. A record can appear in both the current suggestions
 * and the independent selected-record lookup.
 */
export function mergeRelationshipRecords(
  ...groups: readonly (readonly RelationshipRecord[])[]
): RelationshipRecord[] {
  const seen = new Set<string>();
  const merged: RelationshipRecord[] = [];
  for (const group of groups) {
    for (const record of group) {
      if (seen.has(record.id)) continue;
      seen.add(record.id);
      merged.push(record);
    }
  }
  return merged;
}

export function relationshipRecordLabel(record: RelationshipRecord): string {
  return record.title || record.slug || record.id;
}

/**
 * Keep navigation as a real anchor. DocumentDetail's capture-phase navigation
 * guard can then protect unsaved edits before the browser leaves the editor.
 */
export function relationshipRecordHref(id: string): string {
  return `/content/${encodeURIComponent(id)}`;
}