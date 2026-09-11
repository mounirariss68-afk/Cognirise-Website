import { Storage } from "@google-cloud/storage";
import sharp from "sharp";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";
import { setMaxListeners } from "node:events";
import { PassThrough, type Readable } from "node:stream";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "application/pdf",
  "video/mp4",
  "video/webm",
]);
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024;
export const MAX_VIDEO_BYTES = 250 * 1024 * 1024;
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const storage = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: {
        type: "json",
        subject_token_field_name: "access_token",
      },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});
const execFileAsync = promisify(execFile);

export class MediaObjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaObjectValidationError";
  }
}

function configuration() {
  const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const prefix = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!bucketName || !prefix) {
    throw new Error("Object Storage is not configured.");
  }
  return { bucket: storage.bucket(bucketName), bucketName, prefix };
}

export async function signMediaObjectUploadUrl(
  bucketName: string,
  objectPath: string,
  expiresAt: Date,
): Promise<string> {
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectPath,
        method: "PUT",
        expires_at: expiresAt.toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) {
    // Deliberately omit the response body: signing failures must never put a
    // signed URL, credentials, or provider detail into application logs.
    throw new Error(`Object storage signing service returned HTTP ${response.status}.`);
  }
  const payload = await response.json() as { signed_url?: unknown };
  if (typeof payload.signed_url !== "string" || !payload.signed_url.startsWith("https://")) {
    throw new Error("Object storage signing service returned an invalid response.");
  }
  return payload.signed_url;
}

export function assertMediaType(mimeType: string, size: number): void {
  const maximum = mimeType.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_MEDIA_BYTES;
  if (!allowedTypes.has(mimeType) || size < 1 || size > maximum) {
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
    if (hasValidMp4Structure(bytes)) return "video/mp4";
  }
  if (hasValidWebmHeader(bytes)) return "video/webm";
  if (bytes.length >= 5 && bytes.subarray(0, 5).toString("ascii") === "%PDF-") return "application/pdf";
  return null;
}

function readEbmlSize(bytes: Buffer, offset: number): { value: number; length: number } | null {
  if (offset >= bytes.length) return null;
  const first = bytes[offset];
  let mask = 0x80;
  let length = 1;
  while (length <= 8 && !(first & mask)) {
    mask >>= 1;
    length++;
  }
  if (length > 8 || offset + length > bytes.length) return null;
  let value = first & (mask - 1);
  for (let index = 1; index < length; index++) value = value * 256 + bytes[offset + index];
  return Number.isSafeInteger(value) ? { value, length } : null;
}

function hasValidWebmHeader(bytes: Buffer): boolean {
  if (
    bytes.length < 12 ||
    !bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]))
  ) return false;
  const headerSize = readEbmlSize(bytes, 4);
  if (!headerSize) return false;
  const start = 4 + headerSize.length;
  const end = start + headerSize.value;
  if (end > bytes.length || end - start > 4096) return false;
  const docType = bytes.indexOf(Buffer.from([0x42, 0x82]), start);
  if (docType < start || docType + 2 >= end) return false;
  const size = readEbmlSize(bytes, docType + 2);
  if (!size) return false;
  const valueStart = docType + 2 + size.length;
  return valueStart + size.value <= end &&
    bytes.subarray(valueStart, valueStart + size.value).toString("ascii") === "webm";
}

function hasValidMp4Structure(bytes: Buffer): boolean {
  let offset = 0;
  let hasMediaData = false;
  let hasMovie = false;
  while (offset + 8 <= bytes.length) {
    let size = bytes.readUInt32BE(offset);
    const type = bytes.subarray(offset + 4, offset + 8).toString("ascii");
    let header = 8;
    if (size === 1) {
      if (offset + 16 > bytes.length) return false;
      const large = bytes.readBigUInt64BE(offset + 8);
      if (large > BigInt(Number.MAX_SAFE_INTEGER)) return false;
      size = Number(large);
      header = 16;
    } else if (size === 0) {
      size = bytes.length - offset;
    }
    if (size < header || offset + size > bytes.length) return false;
    hasMediaData ||= type === "mdat";
    hasMovie ||= type === "moov" || type === "moof";
    offset += size;
  }
  return offset === bytes.length && hasMediaData && hasMovie;
}

export async function probeVideoBytes(
  bytes: Buffer,
  expectedType: "video/mp4" | "video/webm",
): Promise<{ width: number; height: number; duration: number }> {
  if (detectMediaSignature(bytes) !== expectedType) {
    throw new Error("Video bytes do not match the expected container.");
  }
  const directory = await mkdtemp(join(tmpdir(), "cognirise-video-"));
  const file = join(directory, expectedType === "video/mp4" ? "upload.mp4" : "upload.webm");
  try {
    await writeFile(file, bytes, { mode: 0o600, flag: "wx" });
    const { stdout } = await execFileAsync("ffprobe", [
      "-v", "error",
      "-show_entries", "format=format_name,duration:stream=codec_type,width,height,duration",
      "-of", "json",
      file,
    ], {
      timeout: 15_000,
      maxBuffer: 256 * 1024,
      windowsHide: true,
    });
    const probe = JSON.parse(stdout) as {
      format?: { format_name?: unknown; duration?: unknown };
      streams?: Array<{ codec_type?: unknown; width?: unknown; height?: unknown; duration?: unknown }>;
    };
    const format = String(probe.format?.format_name ?? "").split(",");
    const validContainer = expectedType === "video/mp4"
      ? format.some((name) => name === "mov" || name === "mp4" || name === "m4a" || name === "3gp" || name === "3g2" || name === "mj2")
      : format.some((name) => name === "webm");
    const video = probe.streams?.find((stream) => stream.codec_type === "video");
    const width = Number(video?.width);
    const height = Number(video?.height);
    const duration = Number(video?.duration ?? probe.format?.duration);
    if (
      !validContainer ||
      !Number.isInteger(width) || width <= 0 ||
      !Number.isInteger(height) || height <= 0 ||
      !Number.isFinite(duration) || duration <= 0
    ) {
      throw new Error("Video probe did not find a valid playable stream.");
    }
    return { width, height, duration };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export type ByteRange = { start: number; end: number };

/** Parse the single byte range supported by media delivery. Multiple ranges are rejected. */
export function parseByteRange(header: string | undefined, size: number): ByteRange | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || size < 1 || (!match[1] && !match[2])) return "invalid";
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffix = Number(match[2]);
    if (!Number.isSafeInteger(suffix) || suffix < 1) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return "invalid";
  }
  if (start < 0 || start >= size || end < start) return "invalid";
  return { start, end: Math.min(end, size - 1) };
}

export async function createMediaUpload(
  id: string,
  mimeType: string,
  checksum?: string,
): Promise<{ objectPath: string; uploadUrl: string; expiresAt: Date }> {
  const { prefix } = configuration();
  // This is deliberately a disposable namespace. No version or delivery route
  // may ever retain this key because its signed URL remains valid for its TTL.
  const objectPath = `${prefix}/cms-media/staging/${id}`;
  return renewMediaUpload(objectPath, mimeType, checksum);
}

/** Re-sign the exact disposable staging key already bound to a pending row. */
export async function renewMediaUpload(
  objectPath: string,
  mimeType: string,
  checksum?: string,
): Promise<{ objectPath: string; uploadUrl: string; expiresAt: Date }> {
  const { bucketName, prefix } = configuration();
  const identity = objectPath.slice(`${prefix}/cms-media/staging/`.length);
  if (
    !objectPath.startsWith(`${prefix}/cms-media/staging/`) ||
    !identity ||
    identity.includes("/") ||
    objectPath.includes("..")
  ) {
    throw new MediaObjectValidationError("Invalid staging object path.");
  }
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  // The sidecar signs the object and method. Do not add unsigned x-goog-meta-*
  // headers to the client contract: GCS rejects them for these URLs. Integrity
  // is enforced by hashing the downloaded bytes during promotion.
  const uploadUrl = await signMediaObjectUploadUrl(bucketName, objectPath, expiresAt);
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
    throw new MediaObjectValidationError("Invalid object path.");
  }
  const [metadata] = await bucket.file(objectPath).getMetadata();
  const size = Number(metadata.size);
  const contentType = metadata.contentType;
  const checksum = metadata.metadata?.checksum ?? metadata.md5Hash ?? null;
  if (
    !allowedTypes.has(contentType ?? "") ||
    contentType !== expectedType ||
    size !== expectedSize ||
    size > (contentType?.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_MEDIA_BYTES)
  ) {
    throw new MediaObjectValidationError("Uploaded object metadata does not match the upload request.");
  }
  return {
    size,
    contentType,
    checksum,
    metadata: metadata.metadata ?? {},
  };
}

export async function downloadMediaObject(objectPath: string, range?: { start: number; end: number }) {
  const { bucket, prefix } = configuration();
  if (!objectPath.startsWith(`${prefix}/cms-media/`) || objectPath.includes("..")) {
    throw new Error("Invalid object path.");
  }
  const file = bucket.file(objectPath);
  await file.getMetadata();
  return openMediaReadStream(file.createReadStream(range));
}

/**
 * Isolate the GCS SDK's deferred response stream from an HTTP consumer.
 *
 * GCS returns its user stream before its response callback pipes the network
 * body into it. Destroying that user stream during this window makes the SDK's
 * later pipeline call throw synchronously. A separate pass-through lets an
 * aborted HTTP response close immediately while the SDK finishes setup. Cancel
 * upstream immediately after that safe point, rather than draining a whole file.
 */
export function openMediaReadStream(source: Readable): Readable {
  const output = new PassThrough();
  let ready = false;
  let cancelled = false;
  const cancelWhenReady = () => {
    if (ready && cancelled && !source.destroyed) source.destroy();
  };
  source.once("response", () => {
    // GCS emits response immediately BEFORE attaching its internal pipeline.
    queueMicrotask(() => {
      ready = true;
      cancelWhenReady();
    });
  });
  source.once("data", () => {
    // Also support ordinary readables without the GCS response event.
    ready = true;
    if (cancelled) {
      source.pause();
      queueMicrotask(cancelWhenReady);
    }
  });
  const onSourceError = (error: Error) => {
    if (!output.destroyed) output.destroy(error);
  };
  source.once("error", onSourceError);
  source.once("end", () => source.removeListener("error", onSourceError));
  output.once("close", () => {
    if (source.destroyed || source.readableEnded) return;
    cancelled = true;
    source.unpipe(output);
    if (ready) cancelWhenReady();
    else {
      // Permit only the first readiness signal; its callback cancels upstream.
      source.resume();
    }
  });
  source.pipe(output);
  return output;
}

export async function inspectMediaObject(objectPath: string, expectedType: string) {
  const { bucket, prefix } = configuration();
  if (!objectPath.startsWith(`${prefix}/cms-media/`) || objectPath.includes("..")) {
    throw new Error("Invalid object path.");
  }
  const [bytes] = await bucket.file(objectPath).download();
  const maximum = expectedType.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_MEDIA_BYTES;
  if (bytes.length > maximum || detectMediaSignature(bytes) !== expectedType) {
    throw new Error("Uploaded object bytes do not match the requested media type.");
  }
  const checksum = createHash("sha256").update(bytes).digest("hex");
  const sourceIdentity = createHash("sha256").update(objectPath).digest("hex");
  return inspectVerifiedBytes(
    bytes,
    expectedType,
    `${prefix}/cms-media/objects/reconciliation-${sourceIdentity}/sha256/${checksum}`,
  );
}

async function saveImmutableObject(
  objectPath: string,
  bytes: Buffer,
  contentType: string,
): Promise<void> {
  const { bucket } = configuration();
  const file = bucket.file(objectPath);
  try {
    await file.save(bytes, {
      resumable: false,
      contentType,
      metadata: { cacheControl: "private, max-age=31536000, immutable" },
      preconditionOpts: { ifGenerationMatch: 0 },
    });
  } catch (error) {
    // A content-addressed object can legitimately already exist. Only reuse it
    // after comparing the complete stored bytes; do not trust its name alone.
    let existing: Buffer;
    try {
      [existing] = await file.download();
    } catch {
      throw error;
    }
    if (!existing.equals(bytes)) {
      throw new Error("Existing immutable media object does not match its digest.");
    }
  }
}

async function inspectVerifiedBytes(
  bytes: Buffer,
  expectedType: string,
  finalObjectPath: string,
) {
  if (expectedType === "application/pdf") {
    return { width: null, height: null, duration: null, rendition: null };
  }
  if (expectedType === "video/mp4" || expectedType === "video/webm") {
    try {
      return { ...await probeVideoBytes(bytes, expectedType), rendition: null };
    } catch (error) {
      if (error instanceof MediaObjectValidationError) throw error;
      throw new MediaObjectValidationError("Uploaded video could not be validated.");
    }
  }
  let dimensions: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  let renditionBytes: Buffer;
  try {
    dimensions = await sharp(bytes, { failOn: "error" }).metadata();
    if (!dimensions.width || !dimensions.height) {
      throw new Error("Image dimensions could not be read.");
    }
    renditionBytes = await sharp(bytes)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    throw new MediaObjectValidationError("Uploaded image could not be validated.");
  }
  const renditionChecksum = createHash("sha256").update(renditionBytes).digest("hex");
  const renditionPath = `${finalObjectPath.slice(0, finalObjectPath.lastIndexOf("/"))}/${renditionChecksum}-web-1600.webp`;
  await saveImmutableObject(renditionPath, renditionBytes, "image/webp");
  return {
    width: dimensions.width,
    height: dimensions.height,
    duration: null,
    rendition: {
      storageKey: renditionPath,
      byteSize: renditionBytes.length,
      checksum: renditionChecksum,
    },
  };
}

/**
 * Download a disposable upload exactly once, validate that Buffer, then copy
 * those same bytes into the server-only immutable namespace.
 */
export async function promoteMediaObject(
  stagingPath: string,
  expectedType: string,
  expectedSize: number,
  expectedChecksum?: string,
) {
  const { bucket, prefix } = configuration();
  if (
    !stagingPath.startsWith(`${prefix}/cms-media/staging/`) ||
    stagingPath.includes("..")
  ) {
    throw new MediaObjectValidationError("Invalid staging object path.");
  }
  const uploadIdentity = stagingPath.slice(`${prefix}/cms-media/staging/`.length);
  if (!uploadIdentity || uploadIdentity.includes("/")) {
    throw new MediaObjectValidationError("Invalid staging object path.");
  }
  // Metadata is useful for type/size screening, but a client-controlled custom
  // metadata checksum is never proof of content identity. The SHA-256 is
  // computed from the downloaded bytes and compared below.
  await verifyMediaObject(stagingPath, expectedType, expectedSize);
  const [bytes] = await bucket.file(stagingPath).download();
  const maximum = expectedType.startsWith("video/") ? MAX_VIDEO_BYTES : MAX_MEDIA_BYTES;
  if (
    bytes.length !== expectedSize ||
    bytes.length < 1 ||
    bytes.length > maximum ||
    detectMediaSignature(bytes) !== expectedType
  ) {
    throw new MediaObjectValidationError("Uploaded object bytes do not match the upload request.");
  }
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (expectedChecksum && checksum !== expectedChecksum) {
    throw new MediaObjectValidationError("Uploaded object checksum does not match the upload request.");
  }
  const storageKey = `${prefix}/cms-media/objects/${uploadIdentity}/sha256/${checksum}`;
  const inspected = await inspectVerifiedBytes(bytes, expectedType, storageKey);
  await saveImmutableObject(storageKey, bytes, expectedType);
  return {
    storageKey,
    checksum,
    size: bytes.length,
    ...inspected,
  };
}

export async function deleteMediaStagingObject(stagingPath: string): Promise<void> {
  const { bucket, prefix } = configuration();
  if (!stagingPath.startsWith(`${prefix}/cms-media/staging/`) || stagingPath.includes("..")) return;
  await bucket.file(stagingPath).delete({ ignoreNotFound: true });
}
