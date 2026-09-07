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

export async function mapWithConcurrency<T, R>(
  items: readonly T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Concurrency must be a positive integer.");
  }
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++;
      results[index] = await mapper(items[index], index);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, items.length) }, () => worker()),
  );
  return results;
}

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