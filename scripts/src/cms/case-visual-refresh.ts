import { createHash } from "node:crypto";

export type CaseVisualRefreshPlan =
  | { action: "append"; nextVersionNumber: number }
  | { action: "replay" }
  | { action: "fail"; reason: string };

export type PublishedPinRepairPlan =
  | { action: "repair" }
  | { action: "preserve" }
  | { action: "fail"; reason: string };

export type CasePublicationRefreshEntryPlan =
  | { action: "inspect-published" }
  | { action: "fresh-install" }
  | { action: "replay" }
  | { action: "fail"; reason: string };

export type CaseMediaPinState = "valid" | "historical" | "missing" | "conflict";

export function caseMediaRefreshKey(externalId: string, checksum: string) {
  return `cms-case-media-refresh-v1:${externalId}:${checksum}`;
}

export function casePublicationRefreshKey(externalId: string, checksum: string) {
  return `cms-case-visual-refresh-v1:${externalId}:${checksum}`;
}

export function caseRefreshDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function planCasePublicationRefreshEntry(input: {
  refreshReceiptDigest: string | null;
  expectedRefreshDigest: string;
  documentKind: string | null;
}): CasePublicationRefreshEntryPlan {
  if (input.refreshReceiptDigest) {
    return input.refreshReceiptDigest === input.expectedRefreshDigest
      ? { action: "replay" }
      : { action: "fail", reason: "publication refresh receipt conflicts" };
  }
  if (!input.documentKind) return { action: "fresh-install" };
  if (input.documentKind !== "case-study") {
    return { action: "fail", reason: "current case document gate failed" };
  }
  return { action: "inspect-published" };
}

export function assessCaseMediaPin(input: {
  expectedAssetId: string;
  expectedChecksum: string;
  references: Array<{ assetId: string; mediaVersionId: string | null }>;
  pinnedVersion: {
    id: string;
    assetId: string;
    checksum: string;
    storageKey: string;
  } | null;
}): CaseMediaPinState {
  if (!input.references.length) return "missing";
  if (input.references.length !== 1) return "conflict";
  const [reference] = input.references;
  if (
    reference.assetId !== input.expectedAssetId
    || !reference.mediaVersionId
    || !input.pinnedVersion
    || input.pinnedVersion.id !== reference.mediaVersionId
    || input.pinnedVersion.assetId !== input.expectedAssetId
    || input.pinnedVersion.storageKey.startsWith("deferred/")
  ) return "conflict";
  return input.pinnedVersion.checksum === input.expectedChecksum ? "valid" : "historical";
}

/**
 * Receipted publication replays are safe only when the currently published
 * revision still pins the exact asset/version that the receipt approved.
 */
export function hasExactCasePublicationPin(input: {
  expectedAssetId: string;
  expectedMediaVersionId: string;
  expectedChecksum: string;
  mediaIds: unknown;
  references: Array<{ assetId: string; mediaVersionId: string | null }>;
  pinnedVersion: {
    id: string;
    assetId: string;
    checksum: string;
    storageKey: string;
  } | null;
}) {
  return Array.isArray(input.mediaIds)
    && input.mediaIds.length === 1
    && input.mediaIds[0] === input.expectedAssetId
    && input.references.length === 1
    && input.references[0].assetId === input.expectedAssetId
    && input.references[0].mediaVersionId === input.expectedMediaVersionId
    && input.pinnedVersion?.id === input.expectedMediaVersionId
    && input.pinnedVersion.assetId === input.expectedAssetId
    && input.pinnedVersion.checksum === input.expectedChecksum
    && !input.pinnedVersion.storageKey.startsWith("deferred/");
}

/**
 * Narrative fields belong to editors after the initial baseline. A governed
 * visual update may be reconciled against an edited payload only when its
 * visual descriptor is exactly the approved replacement descriptor.
 */
export function hasExpectedCaseVisual(
  publishedPayload: Record<string, unknown>,
  replacementPayload: Record<string, unknown>,
) {
  const publishedContent = publishedPayload.content;
  const replacementContent = replacementPayload.content;
  if (
    !publishedContent || typeof publishedContent !== "object" || Array.isArray(publishedContent)
    || !replacementContent || typeof replacementContent !== "object" || Array.isArray(replacementContent)
  ) return false;
  const publishedVisual = (publishedContent as Record<string, unknown>).visual;
  const replacementVisual = (replacementContent as Record<string, unknown>).visual;
  return Boolean(replacementVisual)
    && JSON.stringify(publishedVisual) === JSON.stringify(replacementVisual);
}

export function historicalCasePinReceiptIsValid(input: {
  receiptRequestDigest: string | null;
  expectedRequestDigest: string;
  receiptSubjectId: string | null;
  publishedRevisionId: string;
}) {
  return input.receiptRequestDigest === input.expectedRequestDigest
    && input.receiptSubjectId === input.publishedRevisionId;
}

export function planCaseVisualRefresh(input: {
  receiptExists: boolean;
  currentVersionNumber: number;
  currentChecksum: string;
  expectedChecksum: string;
  currentImmutableVersionValid: boolean;
  sourceReviewApproved: boolean;
  rightsApproved: boolean;
  accessibilityApproved: boolean;
  publicationValid: boolean;
  evidenceApproved: boolean;
}) : CaseVisualRefreshPlan {
  if (input.receiptExists) return { action: "replay" };
  if (!input.currentImmutableVersionValid) return { action: "fail", reason: "current immutable media pin is invalid" };
  if (!input.sourceReviewApproved || !input.rightsApproved || !input.accessibilityApproved) {
    return { action: "fail", reason: "governed reconstruction approval gates failed" };
  }
  if (!input.publicationValid || !input.evidenceApproved) {
    return { action: "fail", reason: "current publication or evidence gates failed" };
  }
  if (input.currentChecksum === input.expectedChecksum) return { action: "replay" };
  return { action: "append", nextVersionNumber: input.currentVersionNumber + 1 };
}

export function copyPublishedCasePayload<T>(payload: T): T {
  return structuredClone(payload);
}

/**
 * A visual refresh must never replace post-baseline editorial work. Preserve
 * the currently published case payload and replace only the governed visual
 * descriptor and its media reference.
 */
export function mergePublishedCaseVisualPayload(
  publishedPayload: Record<string, unknown>,
  replacementPayload: Record<string, unknown>,
  targetMediaId: string,
) {
  const published = copyPublishedCasePayload(publishedPayload);
  const replacement = copyPublishedCasePayload(replacementPayload);
  const publishedContent = published.content;
  const replacementContent = replacement.content;
  const replacementContentRecord = replacementContent as Record<string, unknown> | undefined;
  if (
    !publishedContent || typeof publishedContent !== "object" || Array.isArray(publishedContent)
    || !replacementContent || typeof replacementContent !== "object" || Array.isArray(replacementContent)
    || !replacementContentRecord?.visual
    || typeof replacementContentRecord.visual !== "object"
    || Array.isArray(replacementContentRecord.visual)
  ) throw new Error("A governed case visual refresh requires valid published and replacement content.");
  (publishedContent as Record<string, unknown>).visual = replacementContentRecord.visual;
  published.mediaIds = [targetMediaId];
  return published;
}

export function caseRefreshAssetBinaryUpdate(operation: {
  storageKey: string;
  mediaType: string;
  byteSize: number;
  checksum: string;
}) {
  return {
    storageKey: operation.storageKey,
    mediaType: operation.mediaType,
    byteSize: operation.byteSize,
    checksum: operation.checksum,
  };
}

export function planPublishedPinRepair(input: {
  mediaId: string;
  references: Array<{ assetId: string; mediaVersionId: string | null }>;
  pinnedVersionExists: boolean;
}): PublishedPinRepairPlan {
  if (!input.references.length) return { action: "repair" };
  if (input.references.length !== 1) {
    return { action: "fail", reason: "published revision has multiple media references" };
  }
  const [reference] = input.references;
  if (reference.assetId !== input.mediaId || !reference.mediaVersionId) {
    return { action: "fail", reason: "published revision media reference is invalid" };
  }
  if (!input.pinnedVersionExists) {
    return { action: "fail", reason: "published revision immutable media version is missing" };
  }
  return { action: "preserve" };
}

export function publishedRevisionPinnedMediaVersion<T extends { id: string }>(input: {
  revisionId: string;
  versions: T[];
  audits: Array<{ action: string; metadata: unknown }>;
}): T | null {
  const approvedActions = new Set([
    "cms.inventory.case-study-summary-published",
    "cms.inventory.case-visual-refresh-published",
  ]);
  const versionIds = new Set(input.audits.flatMap((audit) => {
    if (!approvedActions.has(audit.action)
      || !audit.metadata
      || typeof audit.metadata !== "object"
      || Array.isArray(audit.metadata)) return [];
    const metadata = audit.metadata as Record<string, unknown>;
    return metadata.revisionId === input.revisionId
      && typeof metadata.mediaVersionId === "string"
      ? [metadata.mediaVersionId]
      : [];
  }));
  if (versionIds.size !== 1) return null;
  const [versionId] = versionIds;
  return input.versions.find((version) => version.id === versionId) ?? null;
}
