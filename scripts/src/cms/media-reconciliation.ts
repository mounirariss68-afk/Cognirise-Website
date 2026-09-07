export interface ExpectedMediaObject {
  checksum: string;
  byteSize: number;
  storageKey: string;
}

export interface StoredMediaState {
  checksum: string;
  byteSize: number;
  storageKey: string;
  objectExists: boolean;
  objectChecksum?: string;
  objectByteSize?: number;
}

export type MediaDisposition = "created" | "repaired" | "reused" | "invalid";

export function mediaDisposition(
  expected: ExpectedMediaObject,
  stored?: StoredMediaState,
): MediaDisposition {
  if (!stored) return "created";
  if (stored.storageKey.startsWith("deferred/")) return "repaired";
  if (!stored.objectExists) return "repaired";
  if (stored.checksum !== expected.checksum || stored.byteSize !== expected.byteSize
    || stored.objectChecksum !== expected.checksum || stored.objectByteSize !== expected.byteSize) {
    return "invalid";
  }
  return "reused";
}