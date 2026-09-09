import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { Readable } from "node:stream";
import test from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { pool } from "@workspace/db";
import {
  FinalizeMediaUploadBody,
  ListMediaQueryParams,
  RequestMediaUploadBody,
} from "@workspace/api-zod";
import {
  apiMediaStatus,
  appendMediaMetadataVersionSql,
  isPreviewableMediaStatus,
  isUsableMediaStatus,
  isValidMediaClassification,
  media,
  mediaStorage,
  protectedMediaFileSql,
  protectedMediaDelivery,
  selectMedia,
  default as mediaRouter,
} from "../src/routes/media.ts";
import * as auth from "../src/lib/auth.ts";
import * as security from "../src/lib/security.ts";
import { publicMediaUrl } from "../src/routes/public.ts";
import {
  MAX_MEDIA_BYTES,
  MAX_VIDEO_BYTES,
  assertMediaType,
  detectMediaSignature,
  parseByteRange,
  probeVideoBytes,
} from "../src/lib/object-storage.ts";

test("media contract accepts governed collection filters and classification", () => {
  const filters = ListMediaQueryParams.safeParse({
    collection: "linkedin",
    linkedinAssetKind: "header",
  });
  assert.equal(filters.success, true);
  assert.equal(filters.success && filters.data.collection, "linkedin");
  assert.equal(filters.success && filters.data.linkedinAssetKind, "header");

  const upload = RequestMediaUploadBody.safeParse({
    filename: "campaign.png",
    mimeType: "image/png",
    size: 1024,
    collection: "linkedin",
    linkedinAssetKind: "post",
    campaignMetadata: {
      campaign: "Pulse",
      title: "Governance",
      purpose: "Approved campaign artwork",
      pulseSource: "Governed AI / Control in motion",
    },
  });
  assert.equal(upload.success, true);
  assert.equal(upload.success && upload.data.collection, "linkedin");
  assert.equal(upload.success && upload.data.campaignMetadata?.title, "Governance");

  const finalize = FinalizeMediaUploadBody.safeParse({
    objectPath: "private/cms-media/id",
    collection: "linkedin",
    linkedinAssetKind: "header",
  });
  assert.equal(finalize.success, true);
  assert.equal(finalize.success && finalize.data.linkedinAssetKind, "header");
});

test("media classification requires a kind only for LinkedIn", () => {
  assert.equal(isValidMediaClassification({}), true);
  assert.equal(isValidMediaClassification({ collection: "website", linkedinAssetKind: null }), true);
  assert.equal(isValidMediaClassification({ collection: "website", linkedinAssetKind: "post" }), false);
  assert.equal(isValidMediaClassification({ collection: "linkedin" }), false);
  assert.equal(isValidMediaClassification({ collection: "linkedin", linkedinAssetKind: "post" }), true);
  assert.equal(isValidMediaClassification({ collection: "linkedin", linkedinAssetKind: "header" }), true);
});

test("campaign metadata rejects blank and excessively long values", () => {
  const baseUpload = {
    filename: "campaign.png",
    mimeType: "image/png",
    size: 1024,
    collection: "linkedin",
    linkedinAssetKind: "post",
  } as const;

  assert.equal(RequestMediaUploadBody.safeParse({
    ...baseUpload,
    campaignMetadata: { campaign: "   " },
  }).success, false);
  assert.equal(RequestMediaUploadBody.safeParse({
    ...baseUpload,
    campaignMetadata: { title: "x".repeat(161) },
  }).success, false);
  assert.equal(RequestMediaUploadBody.safeParse({
    ...baseUpload,
    campaignMetadata: { approvedUse: "x".repeat(301) },
  }).success, false);
});

test("active and ready media are usable while pending and failed stay explicit", () => {
  assert.equal(isUsableMediaStatus("active"), true);
  assert.equal(isUsableMediaStatus("ready"), true);
  assert.equal(isUsableMediaStatus("pending-review"), false);
  assert.equal(isUsableMediaStatus("pending"), false);
  assert.equal(isUsableMediaStatus("failed"), false);
  assert.equal(isPreviewableMediaStatus("pending-review"), true);
  assert.equal(isPreviewableMediaStatus("pending"), false);
  assert.equal(apiMediaStatus("pending-review"), "review");

  const base = {
    id: "asset-id",
    filename: "campaign.png",
    storage_key: "private/cms-media/asset-id",
    media_type: "image/png",
    byte_size: 1024,
    checksum: "sha256",
    collection: "linkedin",
    linkedin_asset_kind: "post",
    campaign_metadata: {
      campaign: "Pulse",
      title: "Governance",
      purpose: "Approved campaign artwork",
      pulseSource: "Governed AI / Control in motion",
    },
    uploaded_by_user_id: "user-id",
    created_at: new Date("2026-01-01T00:00:00Z"),
    updated_at: new Date("2026-01-01T00:00:00Z"),
  };
  const active = media({ ...base, status: "active" });
  assert.equal(active.status, "ready");
  assert.equal(active.publicUrl, "/api/media/asset-id/file");
  assert.equal(active.collection, "linkedin");
  assert.equal(active.linkedinAssetKind, "post");
  assert.equal(active.campaignMetadata?.title, "Governance");

  const pending = media({ ...base, status: "pending" });
  assert.equal(pending.status, "pending");
  assert.equal(pending.publicUrl, null);
  const pendingReview = media({ ...base, status: "pending-review" });
  assert.equal(pendingReview.status, "review");
  assert.equal(pendingReview.publicUrl, "/api/media/asset-id/file");
  const failed = media({ ...base, status: "failed" });
  assert.equal(failed.status, "failed");
  assert.equal(failed.publicUrl, null);
});

test("published media URLs identify the immutable approved version", () => {
  assert.equal(
    publicMediaUrl("asset-id", "version-id"),
    "/api/public/media/asset-id/version-id",
  );
});

test("video upload limits are practical and distinct from still media", () => {
  assert.doesNotThrow(() => assertMediaType("image/png", MAX_MEDIA_BYTES));
  assert.throws(() => assertMediaType("image/png", MAX_MEDIA_BYTES + 1));
  assert.doesNotThrow(() => assertMediaType("video/mp4", MAX_VIDEO_BYTES));
  assert.throws(() => assertMediaType("video/mp4", MAX_VIDEO_BYTES + 1));
});

test("MP4 and WebM are accepted from bytes rather than a claimed content type", () => {
  const box = (type: string, body = Buffer.alloc(0)) => {
    const output = Buffer.alloc(8 + body.length);
    output.writeUInt32BE(output.length, 0);
    output.write(type, 4, "ascii");
    body.copy(output, 8);
    return output;
  };
  const mp4 = Buffer.concat([
    box("ftyp", Buffer.from("isom0000", "ascii")),
    box("moov"),
    box("mdat", Buffer.from([1])),
  ]);
  assert.equal(detectMediaSignature(mp4), "video/mp4");
  assert.equal(detectMediaSignature(mp4.subarray(0, mp4.length - 1)), null);
  assert.equal(
    detectMediaSignature(Buffer.concat([
      Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84]),
      Buffer.from("webm", "ascii"),
    ])),
    "video/webm",
  );
  assert.equal(detectMediaSignature(Buffer.from("not a video")), null);
});

test("single HTTP byte ranges support open, bounded and suffix forms", () => {
  assert.equal(parseByteRange(undefined, 100), null);
  assert.deepEqual(parseByteRange("bytes=10-19", 100), { start: 10, end: 19 });
  assert.deepEqual(parseByteRange("bytes=90-", 100), { start: 90, end: 99 });
  assert.deepEqual(parseByteRange("bytes=-10", 100), { start: 90, end: 99 });
  assert.equal(parseByteRange("bytes=100-101", 100), "invalid");
  assert.equal(parseByteRange("bytes=0-1,4-5", 100), "invalid");
});

test("motion collection requires video metadata and rejects video elsewhere", () => {
  const motionMetadata = {
    groupId: "homepage-hero",
    variant: "desktop",
    accessibility: { decorative: true, hasAudio: false },
  };
  assert.equal(isValidMediaClassification({
    collection: "motion",
    motionMetadata,
  }, "video/mp4"), true);
  assert.equal(isValidMediaClassification({ collection: "motion" }, "video/webm"), false);
  assert.equal(isValidMediaClassification({ collection: "website" }, "video/mp4"), false);
  assert.equal(RequestMediaUploadBody.safeParse({
    filename: "hero.webm",
    mimeType: "video/webm",
    size: 80 * 1024 * 1024,
    collection: "motion",
    motionMetadata,
  }).success, true);
});

test("protected media selection exposes latest version byte size for ranges", () => {
  assert.match(selectMedia, /SELECT id,width,height,metadata FROM cms_media_versions/);
  assert.match(protectedMediaFileSql, /COALESCE\(v\.byte_size,a\.byte_size\) byte_size/);
  assert.match(protectedMediaFileSql, /SELECT storage_key,byte_size,metadata FROM cms_media_versions/);
});

test("caption edits append metadata-only versions without moving pinned references", () => {
  assert.match(appendMediaMetadataVersionSql, /INSERT INTO cms_media_versions/);
  assert.match(appendMediaMetadataVersionSql, /latest\.version_number\+1/);
  assert.match(appendMediaMetadataVersionSql, /latest\.storage_key,latest\.checksum/);
  assert.match(appendMediaMetadataVersionSql, /\$2::jsonb/);
  assert.doesNotMatch(appendMediaMetadataVersionSql, /UPDATE cms_media_versions/);
  assert.doesNotMatch(appendMediaMetadataVersionSql, /cms_media_references/);
});

test("distinct assets promote identical bytes to isolated immutable keys", {
  concurrency: false,
}, async (t) => {
  const assetId = "00000000-0000-4000-8000-000000000001";
  const secondAssetId = "00000000-0000-4000-8000-000000000002";
  const versionId = "00000000-0000-4000-8000-000000000101";
  const stagingKey = "private/cms-media/staging/upload-request";
  const secondStagingKey = "private/cms-media/staging/second-upload-request";
  const finalKey = "private/cms-media/objects/upload-request/sha256/verified";
  const secondFinalKey = "private/cms-media/objects/second-upload-request/sha256/verified";
  const verifiedBytes = Buffer.from("verified image bytes");
  const objects = new Map<string, Buffer>([
    [stagingKey, verifiedBytes],
    [secondStagingKey, verifiedBytes],
  ]);
  const now = new Date();
  const makeAsset = (id: string, storageKey: string) => ({
    id,
    storage_key: storageKey,
    filename: "governed.png",
    media_type: "image/png",
    byte_size: verifiedBytes.length,
    checksum: "pending",
    status: "pending",
    collection: "website",
    linkedin_asset_kind: null,
    campaign_metadata: null,
    motion_metadata: null,
    uploaded_by_user_id: "user-id",
    created_at: now,
    updated_at: now,
  });
  const assets = new Map([
    [assetId, makeAsset(assetId, stagingKey)],
    [secondAssetId, makeAsset(secondAssetId, secondStagingKey)],
  ]);
  const persistedFinalKeys = new Set<string>();
  let deliveredKey: string | undefined;

  t.mock.method(mediaStorage, "promote", async (path: string) => {
    const verified = Buffer.from(objects.get(path)!);
    const promotedKey = path === stagingKey ? finalKey : secondFinalKey;
    objects.set(promotedKey, verified);
    return {
      storageKey: promotedKey,
      checksum: "verified",
      size: verified.length,
      width: 100,
      height: 50,
      duration: null,
      rendition: null,
    };
  });
  t.mock.method(mediaStorage, "deleteStaging", async () => {});
  t.mock.method(protectedMediaDelivery, "download", async (path: string) => {
    deliveredKey = path;
    return Readable.from(objects.get(path)!);
  });
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "Administrator",
          email: "admin@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    if (statement.includes("SELECT * FROM cms_media_assets")) {
      const asset = assets.get(String(values![0]));
      return { rowCount: asset ? 1 : 0, rows: asset ? [asset] : [] };
    }
    if (statement.includes("UPDATE cms_media_assets SET storage_key")) {
      const asset = assets.get(String(values![0]))!;
      Object.assign(asset, { storage_key: values![1], checksum: values![2], status: "active" });
      return { rowCount: 1, rows: [asset] };
    }
    if (statement.includes("INSERT INTO cms_media_versions")) {
      persistedFinalKeys.add(String(values![1]));
      assert.ok(values![1] === finalKey || values![1] === secondFinalKey);
      assert.ok(values![1] !== stagingKey && values![1] !== secondStagingKey);
      return { rowCount: 1, rows: [] };
    }
    if (statement === protectedMediaFileSql) {
      return { rowCount: 1, rows: [{ storage_key: finalKey, byte_size: objects.get(finalKey)!.length, media_type: "image/png" }] };
    }
    if (statement.includes("SELECT a.*,v.id version_id")) {
      return { rowCount: 1, rows: [{ ...assets.get(String(values![0]))!, version_id: versionId, width: 100, height: 50, metadata: {} }] };
    }
    return { rowCount: 1, rows: [] };
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use("/api", mediaRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  ));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };
  const finalized = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: stagingKey }),
  });
  assert.equal(finalized.status, 200);
  const secondFinalized = await fetch(`${origin}/api/media/${secondAssetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: secondStagingKey }),
  });
  assert.equal(secondFinalized.status, 200);
  assert.equal(assets.get(assetId)!.storage_key, finalKey);
  assert.equal(assets.get(secondAssetId)!.storage_key, secondFinalKey);
  assert.notEqual(finalKey, secondFinalKey);
  assert.deepEqual(persistedFinalKeys, new Set([finalKey, secondFinalKey]));

  // Simulate reuse of the still-valid signed PUT after finalization.
  objects.set(stagingKey, Buffer.from("attacker overwrite"));
  objects.set(secondStagingKey, Buffer.from("different attacker overwrite"));
  const delivered = await fetch(`${origin}/api/media/${assetId}/file`, {
    headers: { cookie: `${auth.SESSION_COOKIE}=session-token` },
  });
  assert.equal(delivered.status, 200);
  assert.equal(await delivered.text(), "verified image bytes");
  assert.equal(deliveredKey, finalKey);
});

test("ffprobe accepts checked-in playable MP4 and WebM and rejects empty containers", async () => {
  const videos = "../../artifacts/cognirise-website/public/videos/cognirise";
  const mp4 = await readFile(`${videos}/pulse-hero-motion.mp4`);
  const webm = await readFile(`${videos}/pulse-hero-motion.webm`);
  const mp4Probe = await probeVideoBytes(mp4, "video/mp4");
  const webmProbe = await probeVideoBytes(webm, "video/webm");
  assert.ok(mp4Probe.width > 0 && mp4Probe.height > 0 && mp4Probe.duration > 0);
  assert.ok(webmProbe.width > 0 && webmProbe.height > 0 && webmProbe.duration > 0);

  const box = (type: string, body = Buffer.alloc(0)) => {
    const output = Buffer.alloc(8 + body.length);
    output.writeUInt32BE(output.length, 0);
    output.write(type, 4, "ascii");
    body.copy(output, 8);
    return output;
  };
  const emptyMp4 = Buffer.concat([
    box("ftyp", Buffer.from("isom0000", "ascii")),
    box("moov"),
    box("mdat", Buffer.from([1])),
  ]);
  const emptyWebm = Buffer.concat([
    Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x87, 0x42, 0x82, 0x84]),
    Buffer.from("webm", "ascii"),
  ]);
  await assert.rejects(probeVideoBytes(emptyMp4, "video/mp4"));
  await assert.rejects(probeVideoBytes(emptyWebm, "video/webm"));
});