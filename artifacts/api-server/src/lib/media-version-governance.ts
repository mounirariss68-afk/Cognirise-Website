export type MediaVersionReviewStatus = "pending" | "rejected" | null;

/**
 * A media asset can have an active latest version awaiting review while an
 * older, pinned version remains publishable. Keep the decision on the
 * immutable version metadata rather than the mutable asset row.
 */
export function mediaVersionReviewStatus(metadata: unknown): MediaVersionReviewStatus {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = metadata as Record<string, unknown>;
  const rights = value.rights && typeof value.rights === "object"
    ? value.rights as Record<string, unknown>
    : {};
  const accessibility = value.accessibility && typeof value.accessibility === "object"
    ? value.accessibility as Record<string, unknown>
    : {};
  const rightsStatus = value.rightsStatus ?? rights.status;
  const accessibilityStatus = value.accessibilityStatus ?? accessibility.status;
  if (rightsStatus === "needs-review" || accessibilityStatus === "needs-review") {
    return "pending";
  }
  if (rightsStatus === "rejected" || accessibilityStatus === "rejected") {
    return "rejected";
  }
  return null;
}

/**
 * Missing review fields are accepted for legacy immutable versions. New
 * versions written by the governed mutation always carry explicit statuses.
 */
export function approvedMediaVersionMetadataSql(metadataSql = "v.metadata"): string {
  return `(
    (COALESCE(${metadataSql}->>'rightsStatus',${metadataSql}->'rights'->>'status') IS NULL
      OR COALESCE(${metadataSql}->>'rightsStatus',${metadataSql}->'rights'->>'status')
        IN ('approved','approved-use'))
    AND (COALESCE(${metadataSql}->>'accessibilityStatus',${metadataSql}->'accessibility'->>'status') IS NULL
      OR COALESCE(${metadataSql}->>'accessibilityStatus',${metadataSql}->'accessibility'->>'status')='approved')
  )`;
}