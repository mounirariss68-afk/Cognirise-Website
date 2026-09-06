import { Storage } from "@google-cloud/storage";
import sharp from "sharp";
import { createHash } from "node:crypto";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
]);
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
const storage = new Storage();

function configuration() {
  const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const prefix = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!bucketName || !prefix) {
    throw new Error("Object Storage is not configured.");
  }
  return { bucket: storage.bucket(bucketName), prefix };
}

export function assertMediaType(mimeType: string, size: number): void {
  if (!allowedTypes.has(mimeType) || size < 1 || size > MAX_MEDIA_BYTES) {
    throw new Error("Unsupported media type or size.");
  }
}

/** Identify content from bytes, never from an untrusted object Content-Type. */
export function detectMediaSignature(bytes: Buffer): string | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
  if (bytes.length >= 12 && bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
  if (bytes.length >= 12 && bytes.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = bytes.subarray(8, 12).toString("ascii").toLowerCase();
    if (brand === "avif" || brand === "avis") return "image/avif";
  }
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

export async function createMediaUpload(
  id: string,
  mimeType: string,
  checksum?: string,
): Promise<{ objectPath: string; uploadUrl: string; expiresAt: Date }> {
  const { bucket, prefix } = configuration();
  const objectPath = `${prefix}/cms-media/${id}`;
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  const [uploadUrl] = await bucket.file(objectPath).getSignedUrl({
    version: "v4",
    action: "write",
    expires: expiresAt,
    contentType: mimeType,
    extensionHeaders: checksum ? { "x-goog-meta-checksum": checksum } : undefined,
  });
  return { objectPath, uploadUrl, expiresAt };
}

export async function verifyMediaObject(
  objectPath: string,
  expectedType: string,
  expectedSize: number,
  expectedChecksum?: string,
) {
  const { bucket, prefix } = configuration();
  if (!objectPath.startsWith(`${prefix}/cms-media/`) || objectPath.includes("..")) {
    throw new Error("Invalid object path.");
  }
  const [metadata] = await bucket.file(objectPath).getMetadata();
  const size = Number(metadata.size);
  const contentType = metadata.contentType;
  const checksum = metadata.metadata?.checksum ?? metadata.md5Hash ?? null;
  if (
    !allowedTypes.has(contentType ?? "") ||
    contentType !== expectedType ||
    size !== expectedSize ||
    size > MAX_MEDIA_BYTES ||
    (expectedChecksum && checksum !== expectedChecksum)
  ) {
    throw new Error("Uploaded object metadata does not match the upload request.");
  }
  return {
    size,
    contentType,
    checksum,
    metadata: metadata.metadata ?? {},
  };
}

export async function downloadMediaObject(objectPath: string) {
  const { bucket, prefix } = configuration();
  if (!objectPath.startsWith(`${prefix}/cms-media/`) || objectPath.includes("..")) {
    throw new Error("Invalid object path.");
  }
  return bucket.file(objectPath).createReadStream();
}

export async function inspectMediaObject(objectPath: string, expectedType: string) {
  const { bucket, prefix } = configuration();
  if (!objectPath.startsWith(`${prefix}/cms-media/`) || objectPath.includes("..")) {
    throw new Error("Invalid object path.");
  }
  const [bytes] = await bucket.file(objectPath).download();
  if (bytes.length > MAX_MEDIA_BYTES || detectMediaSignature(bytes) !== expectedType) {
    throw new Error("Uploaded object bytes do not match the requested media type.");
  }
  if (expectedType === "application/pdf") return { width: null, height: null, rendition: null };
  const dimensions = await sharp(bytes, { failOn: "error" }).metadata();
  if (!dimensions.width || !dimensions.height) throw new Error("Image dimensions could not be read.");
  const renditionBytes = await sharp(bytes)
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  const renditionPath = `${objectPath}-web-1600.webp`;
  await bucket.file(renditionPath).save(renditionBytes, {
    resumable: false,
    contentType: "image/webp",
    metadata: { cacheControl: "private, max-age=31536000, immutable" },
  });
  return {
    width: dimensions.width,
    height: dimensions.height,
    rendition: {
      storageKey: renditionPath,
      byteSize: renditionBytes.length,
      checksum: createHash("sha256").update(renditionBytes).digest("hex"),
    },
  };
}
