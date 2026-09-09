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