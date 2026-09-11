import type { MediaMigrationOperation } from "./migration.js";

/**
 * Inventory metadata is authoritative while creating an asset or repairing an
 * incomplete binary. A valid immutable replay must not overwrite editor data.
 */
export function mediaMetadataUpdate(operation: Pick<
  MediaMigrationOperation,
  "altText" | "credit" | "collection" | "linkedinAssetKind" | "campaignMetadata"
>) {
  return {
    altText: operation.altText,
    credit: operation.credit,
    collection: operation.collection,
    linkedinAssetKind: operation.linkedinAssetKind,
    campaignMetadata: operation.campaignMetadata,
  };
}

export function shouldUpdateMediaMetadata(state: {
  assetExists: boolean;
  immutableVersionIsCurrent: boolean;
}) {
  return !state.assetExists || !state.immutableVersionIsCurrent;
}

/**
 * A reviewer clears a media asset for a particular immutable binary. Import
 * retries must compare the asset pointer and its newest immutable version
 * before deciding that a new review is needed. In particular, a matching
 * checksum alone is not enough: a deferred version or a changed MIME/size
 * must never inherit the previous clearance.
 */
export function mediaVersionIsExactCurrent(input: {
  asset: {
    checksum: string;
    byteSize: number;
    mediaType: string;
  };
  version: {
    checksum: string;
    byteSize: number;
    storageKey: string;
  } | null | undefined;
  expected: {
    checksum: string;
    byteSize: number;
    mediaType: string;
  };
}) {
  return Boolean(
    input.version
      && !input.version.storageKey.startsWith("deferred/")
      && input.asset.checksum === input.expected.checksum
      && input.asset.byteSize === input.expected.byteSize
      && input.asset.mediaType === input.expected.mediaType
      && input.version.checksum === input.expected.checksum
      && input.version.byteSize === input.expected.byteSize,
  );
}

/**
 * Only an explicitly approved governed refresh may make a newly appended
 * binary active. An exact current version returns an empty update so an
 * already-reviewed asset (including an active v2) is never reset on replay.
 */
export function mediaReviewStatusUpdate(input: {
  exactCurrentVersion: boolean;
  explicitlyApproved: boolean;
}) {
  if (input.exactCurrentVersion) return {};
  return {
    status: input.explicitlyApproved ? "active" as const : "pending-review" as const,
  };
}