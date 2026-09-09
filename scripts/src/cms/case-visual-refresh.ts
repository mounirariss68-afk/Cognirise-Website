import { createHash } from "node:crypto";

export type CaseVisualRefreshPlan =
  | { action: "append"; nextVersionNumber: number }
  | { action: "replay" }
  | { action: "fail"; reason: string };

export function caseMediaRefreshKey(externalId: string, checksum: string) {
  return `cms-case-media-refresh-v1:${externalId}:${checksum}`;
}

export function casePublicationRefreshKey(externalId: string, checksum: string) {
  return `cms-case-visual-refresh-v1:${externalId}:${checksum}`;
}

export function caseRefreshDigest(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex");
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