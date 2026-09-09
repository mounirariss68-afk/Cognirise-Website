import { createHash } from "node:crypto";

export type CaseVisualRefreshPlan =
  | { action: "append"; nextVersionNumber: number }
  | { action: "replay" }
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