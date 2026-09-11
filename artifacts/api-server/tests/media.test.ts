import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PassThrough, Readable, pipeline as streamPipeline } from "node:stream";
import { once } from "node:events";
import test from "node:test";
import express from "express";
import cookieParser from "cookie-parser";
import { pool } from "@workspace/db";
import {
  FinalizeMediaUploadBody,
  ListMediaQueryParams,
  RequestMediaUploadBody,
  ReviewMediaBody,
} from "@workspace/api-zod";
import {
  apiMediaStatus,
  appendMediaMetadataVersionSql,
  isPreviewableMediaStatus,
  isUsableMediaStatus,
  isValidMediaClassification,
  media,
  mediaStorage,
  deterministicMediaId,
  protectedMediaDownloadSql,
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
  signMediaObjectUploadUrl,
  openMediaReadStream,
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

test("upload idempotency identities are deterministic and user scoped", () => {
  const first = deterministicMediaId("00000000-0000-4000-8000-000000000001", "batch:item-1");
  assert.equal(
    first,
    deterministicMediaId("00000000-0000-4000-8000-000000000001", "batch:item-1"),
  );
  assert.notEqual(
    first,
    deterministicMediaId("00000000-0000-4000-8000-000000000002", "batch:item-1"),
  );
  assert.notEqual(
    first,
    deterministicMediaId("00000000-0000-4000-8000-000000000001", "batch:item-2"),
  );
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("media upload signing uses the sidecar contract without leaking responses", async (t) => {
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request, init?: RequestInit) => {
    capturedUrl = String(input);
    capturedInit = init;
    return new Response(JSON.stringify({ signed_url: "https://storage.example/signed" }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });
  const expiresAt = new Date("2026-10-01T00:10:00.000Z");
  assert.equal(
    await signMediaObjectUploadUrl("bucket-id", "private/cms-media/staging/asset-id", expiresAt),
    "https://storage.example/signed",
  );
  assert.equal(capturedUrl, "http://127.0.0.1:1106/object-storage/signed-object-url");
  assert.equal(capturedInit?.method, "POST");
  assert.deepEqual(JSON.parse(String(capturedInit?.body)), {
    bucket_name: "bucket-id",
    object_name: "private/cms-media/staging/asset-id",
    method: "PUT",
    expires_at: expiresAt.toISOString(),
  });

  t.mock.restoreAll();
  t.mock.method(globalThis, "fetch", async () =>
    new Response("signed_url=https://secret.example/do-not-log", { status: 503 }));
  await assert.rejects(
    signMediaObjectUploadUrl("bucket-id", "private/cms-media/staging/asset-id", expiresAt),
    (error: Error) => error.message === "Object storage signing service returned HTTP 503.",
  );
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
  assert.equal(apiMediaStatus("rejected"), "rejected");
  // The route separately requires both confirmations. This parser currently
  // preserves optionality despite the OpenAPI required array.
  assert.equal(ReviewMediaBody.safeParse({ decision: "approve" }).success, true);
  assert.equal(ReviewMediaBody.safeParse({
    decision: "approve",
    sourceRightsApproved: true,
    accessibilityApproved: true,
  }).success, true);
  assert.equal(ReviewMediaBody.safeParse({
    decision: "approve",
    sourceRightsApproved: false,
    accessibilityApproved: true,
  }).success, true);
  assert.equal(ReviewMediaBody.safeParse({
    decision: "reject",
    sourceRightsApproved: false,
    accessibilityApproved: false,
  }).success, true);
  assert.equal(ReviewMediaBody.safeParse({ decision: "publish" }).success, false);

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
  const rejected = media({ ...base, status: "rejected" });
  assert.equal(rejected.status, "rejected");
  assert.equal(rejected.publicUrl, null);
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

test("early consumer abort lets GCS attach then cancels upstream without draining the object", async () => {
  const sdkUserStream = new PassThrough({ highWaterMark: 1024 });
  const consumer = openMediaReadStream(sdkUserStream);
  consumer.destroy();
  await once(consumer, "close");
  assert.equal(sdkUserStream.destroyed, false);

  const networkBody = new PassThrough();
  sdkUserStream.emit("response", {});
  const completed = new Promise<Error | null | undefined>((resolve) => {
    assert.doesNotThrow(() => {
      streamPipeline(networkBody, sdkUserStream, resolve);
    });
  });
  await Promise.resolve();
  assert.equal(sdkUserStream.destroyed, true);
  await completed;
  assert.equal(networkBody.destroyed, true);
  assert.equal(sdkUserStream.readableLength, 0);
  assert.ok(sdkUserStream.readableLength <= sdkUserStream.readableHighWaterMark);
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
  assert.match(protectedMediaDownloadSql, /ORDER BY version_number ASC LIMIT 1/);
  assert.match(protectedMediaDownloadSql, /a\.original_filename filename,a\.media_type/);
});

test("caption edits append metadata-only versions without moving pinned references", () => {
  assert.match(appendMediaMetadataVersionSql, /INSERT INTO cms_media_versions/);
  assert.match(appendMediaMetadataVersionSql, /latest\.version_number\+1/);
  assert.match(appendMediaMetadataVersionSql, /latest\.storage_key,latest\.checksum/);
  assert.match(appendMediaMetadataVersionSql, /\$2::jsonb/);
  assert.doesNotMatch(appendMediaMetadataVersionSql, /UPDATE cms_media_versions/);
  assert.doesNotMatch(appendMediaMetadataVersionSql, /cms_media_references/);
});

test("upload requests and renewals preserve identity, ownership and retry safety", {
  concurrency: false,
}, async (t) => {
  const now = new Date("2026-10-01T00:00:00Z");
  const assets = new Map<string, Record<string, any>>();
  const signed = new Map<string, number>();
  let failNextSigning = false;

  t.mock.method(mediaStorage, "createUpload", async (id: string) => {
    if (failNextSigning) {
      failNextSigning = false;
      throw new Error("signer unavailable");
    }
    const count = (signed.get(id) ?? 0) + 1;
    signed.set(id, count);
    return {
      objectPath: `private/cms-media/staging/${id}`,
      uploadUrl: `https://upload.example/${id}/${count}`,
      expiresAt: new Date(now.getTime() + count * 60_000),
    };
  });
  t.mock.method(mediaStorage, "renewUpload", async (path: string) => {
    const count = (signed.get(path) ?? 0) + 1;
    signed.set(path, count);
    return {
      objectPath: path,
      uploadUrl: `https://upload.example/renew/${count}`,
      expiresAt: new Date(now.getTime() + count * 60_000),
    };
  });
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      const tokenHash = String(values?.[0]);
      const identities = [
        ["owner-token", "owner-user", "editor"],
        ["other-token", "other-user", "editor"],
        ["admin-token", "admin-user", "administrator"],
        ["viewer-token", "viewer-user", "viewer"],
      ];
      const identity = identities.find(([token]) => security.hashToken(token) === tokenHash);
      if (!identity) return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          id: `${identity[1]}-session`,
          token_digest: tokenHash,
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: identity[1],
          name: identity[1],
          email: `${identity[1]}@example.com`,
          role: identity[2],
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    if (statement.includes("INSERT INTO cms_media_assets")) {
      const id = String(values?.[0]);
      if (assets.has(id)) return { rowCount: 0, rows: [] };
      const row = {
        id,
        storage_key: values?.[1],
        filename: values?.[2],
        original_filename: values?.[2],
        media_type: values?.[3],
        byte_size: values?.[4],
        checksum: values?.[5],
        status: "pending",
        uploaded_by_user_id: values?.[6],
        collection: values?.[7],
        linkedin_asset_kind: values?.[8],
        campaign_metadata: values?.[9],
        motion_metadata: values?.[10],
        created_at: now,
        updated_at: now,
      };
      assets.set(id, row);
      return { rowCount: 1, rows: [row] };
    }
    if (statement.includes("UPDATE cms_media_assets SET storage_key=$2")) {
      const row = assets.get(String(values?.[0]));
      if (row?.status === "pending") row.storage_key = values?.[1];
      return { rowCount: row ? 1 : 0, rows: [] };
    }
    if (statement.includes("SELECT * FROM cms_media_assets WHERE id=$1")) {
      const row = assets.get(String(values?.[0]));
      return { rowCount: row ? 1 : 0, rows: row ? [row] : [] };
    }
    return { rowCount: 1, rows: [] };
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.log = { error() {}, warn() {} } as typeof req.log;
    next();
  });
  app.use("/api", mediaRouter);
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(() => new Promise<void>((resolve, reject) =>
    server.close((error) => error ? reject(error) : resolve())
  ));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const headers = (token: string, key?: string) => {
    const csrf = auth.csrfForSession(security.hashToken(token));
    return {
      "content-type": "application/json",
      origin,
      "x-csrf-token": csrf,
      cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrf}`,
      ...(key ? { "idempotency-key": key } : {}),
    };
  };
  const body = { filename: "batch.png", mimeType: "image/png", size: 128 };
  const request = (token: string, key: string, input = body) => fetch(`${origin}/api/media/upload-requests`, {
    method: "POST",
    headers: headers(token, key),
    body: JSON.stringify(input),
  });
  const legacyRequest = () => fetch(`${origin}/api/media/upload-requests`, {
    method: "POST",
    headers: headers("owner-token"),
    body: JSON.stringify(body),
  });

  const legacyFirst = await legacyRequest();
  const legacyRetry = await legacyRequest();
  assert.equal(legacyFirst.status, 201);
  assert.equal(legacyRetry.status, 201);
  assert.notEqual(
    (await legacyFirst.json() as { media: { id: string } }).media.id,
    (await legacyRetry.json() as { media: { id: string } }).media.id,
  );

  const [first, racedRetry] = await Promise.all([
    request("owner-token", "batch-1"),
    request("owner-token", "batch-1"),
  ]);
  assert.deepEqual([first.status, racedRetry.status].sort(), [200, 201]);
  const firstBody = await first.json() as {
    media: { id: string };
    uploadUrl: string;
    headers: Record<string, string>;
  };
  const retryBody = await racedRetry.json() as { media: { id: string }; uploadUrl: string };
  assert.equal(firstBody.media.id, retryBody.media.id);
  assert.notEqual(firstBody.uploadUrl, retryBody.uploadUrl);
  assert.deepEqual(firstBody.headers, { "Content-Type": "image/png" });
  assert.equal(assets.size, 3);

  assert.equal((await request("owner-token", "batch-1", { ...body, filename: "changed.png" })).status, 409);
  assert.equal((await request("other-token", "batch-1")).status, 201);
  assert.equal(assets.size, 4);

  const mediaId = firstBody.media.id;
  const renew = (token: string) => fetch(`${origin}/api/media/${mediaId}/renew-upload`, {
    method: "POST",
    headers: headers(token),
  });
  assert.equal((await renew("viewer-token")).status, 403);
  assert.equal((await renew("other-token")).status, 403);
  assert.equal((await renew("owner-token")).status, 200);
  assert.equal((await renew("admin-token")).status, 200);
  assets.get(mediaId)!.status = "pending-review";
  assert.equal((await renew("owner-token")).status, 409);
  assert.equal((await request("owner-token", "batch-1")).status, 409);

  failNextSigning = true;
  assert.equal((await request("owner-token", "transient-signing")).status, 503);
  const recovered = await request("owner-token", "transient-signing");
  assert.equal(recovered.status, 200);
  assert.equal(assets.size, 5);
});

test("publisher-only review decisions enforce valid transitions and write audit events", {
  concurrency: false,
}, async (t) => {
  const now = new Date("2026-09-09T00:00:00Z");
  const assetId = "00000000-0000-4000-8000-000000000201";
  const rejectedAssetId = "00000000-0000-4000-8000-000000000202";
  const auditFailureAssetId = "00000000-0000-4000-8000-000000000203";
  const statuses = new Map([
    [assetId, "pending-review"],
    [rejectedAssetId, "pending-review"],
    [auditFailureAssetId, "pending-review"],
  ]);
  const audits: Array<{ action: string; assetId: string; metadata: unknown }> = [];

  const metadataVersions: Record<string, unknown>[] = [];
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      const editorDigest = security.hashToken("editor-token");
      const role = values?.[0] === editorDigest ? "editor" : "publisher";
      return {
        rowCount: 1,
        rows: [{
          id: `${role}-session`,
          token_digest: values?.[0],
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: `${role}-user`,
          name: role,
          email: `${role}@example.com`,
          role,
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });
  t.mock.method(pool, "connect", async () => {
    let transactionStatuses = new Map(statuses);
    const pendingAudits: typeof audits = [];
    return {
      query: async (sql: unknown, values?: unknown[]) => {
        const statement = String(sql);
        if (statement === "BEGIN") {
          transactionStatuses = new Map(statuses);
          return { rowCount: null, rows: [] };
        }
        if (statement === "COMMIT") {
          for (const [id, status] of transactionStatuses) statuses.set(id, status);
          audits.push(...pendingAudits);
          return { rowCount: null, rows: [] };
        }
        if (statement === "ROLLBACK") return { rowCount: null, rows: [] };
        if (statement.includes("UPDATE cms_media_assets") && statement.includes("status='pending-review'")) {
          const id = String(values?.[0]);
          if (transactionStatuses.get(id) !== "pending-review") return { rowCount: 0, rows: [] };
          transactionStatuses.set(id, String(values?.[1]));
          return { rowCount: 1, rows: [{ id }] };
        }
        if (statement.includes("SELECT metadata FROM cms_media_versions")) {
          return { rowCount: 1, rows: [{ metadata: { rightsStatus: "needs-review", accessibilityStatus: "needs-review" } }] };
        }
        if (statement.includes("INSERT INTO cms_media_versions")) {
          metadataVersions.push(values?.[1] as Record<string, unknown>);
          return { rowCount: 1, rows: [{ id: "approved-version" }] };
        }
        if (statement.includes("SELECT a.*,v.id version_id")) {
          const id = String(values?.[0]);
          const status = transactionStatuses.get(id);
          return status
            ? {
                rowCount: 1,
                rows: [{
                  id,
                  version_id: `${id.slice(0, -3)}101`,
                  filename: id === rejectedAssetId ? "reject-me.pdf" : "approve-me.png",
                  storage_key: `private/cms-media/${id}`,
                  media_type: id === rejectedAssetId ? "application/pdf" : "image/png",
                  byte_size: 1024,
                  checksum: "checksum",
                  status,
                  collection: "website",
                  linkedin_asset_kind: null,
                  campaign_metadata: null,
                  motion_metadata: null,
                  alt_text: "Governed asset",
                  credit: "Cognirise",
                  width: 100,
                  height: 50,
                  metadata: {},
                  created_at: now,
                  updated_at: now,
                }],
              }
            : { rowCount: 0, rows: [] };
        }
        if (statement.includes("INSERT INTO cms_audit_events")) {
          if (String(values?.[3]) === auditFailureAssetId) throw new Error("audit unavailable");
          pendingAudits.push({
            action: String(values?.[2]),
            assetId: String(values?.[3]),
            metadata: values?.[4],
          });
          return { rowCount: 1, rows: [] };
        }
        return { rowCount: 0, rows: [] };
      },
      release() {},
    } as never;
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
  const review = async (
    token: string,
    id: string,
    decision: "approve" | "reject",
    confirmations = decision === "approve"
      ? { sourceRightsApproved: true, accessibilityApproved: true }
      : { sourceRightsApproved: false, accessibilityApproved: false },
  ) => {
    const csrf = auth.csrfForSession(security.hashToken(token));
    return fetch(`${origin}/api/media/${id}/review`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin,
        "x-csrf-token": csrf,
        cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrf}`,
      },
      body: JSON.stringify({ decision, ...confirmations }),
    });
  };

  const forbidden = await review("editor-token", assetId, "approve");
  assert.equal(forbidden.status, 403);
  assert.equal(statuses.get(assetId), "pending-review");

  const approved = await review("publisher-token", assetId, "approve");
  assert.equal(approved.status, 200);
  assert.equal((await approved.json() as { status: string }).status, "ready");
  assert.equal(statuses.get(assetId), "active");
  assert.deepEqual(metadataVersions, [{
    rightsStatus: "approved-use",
    accessibilityStatus: "approved",
    sourceReview: {
      sourceRightsApproved: true,
      accessibilityApproved: true,
      reviewedBy: "publisher-user",
    },
  }]);

  const missingConfirmations = await review(
    "publisher-token",
    "00000000-0000-4000-8000-000000000204",
    "approve",
    {} as { sourceRightsApproved: boolean; accessibilityApproved: boolean },
  );
  assert.equal(missingConfirmations.status, 400);
  const repeated = await review("publisher-token", assetId, "reject");
  assert.equal(repeated.status, 409);
  assert.equal(statuses.get(assetId), "active");

  const rejected = await review("publisher-token", rejectedAssetId, "reject");
  assert.equal(rejected.status, 200);
  const rejectedBody = await rejected.json() as { status: string; publicUrl: string | null };
  assert.equal(rejectedBody.status, "rejected");
  assert.equal(rejectedBody.publicUrl, null);
  assert.deepEqual(audits.map(({ action, assetId: id }) => [action, id]), [
    ["media.approved", assetId],
    ["media.rejected", rejectedAssetId],
  ]);
  assert.deepEqual(audits[0].metadata, {
    previousStatus: "pending-review",
    nextStatus: "active",
    sourceRightsApproved: true,
    accessibilityApproved: true,
  });
  const failedAudit = await review("publisher-token", auditFailureAssetId, "approve");
  assert.equal(failedAudit.status, 500);
  assert.equal(statuses.get(auditFailureAssetId), "pending-review");
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
    original_filename: "uploaded-original.png",
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
  const latestMetadata = new Map<string, Record<string, unknown>>();
  let promotionCount = 0;
  let finalizedAudits = 0;
  let failPromotion = false;
  let failVersionInsert = false;
  let deliveredKey: string | undefined;
  let deliveryFailure: "missing" | "stream" | null = null;

  t.mock.method(mediaStorage, "promote", async (path: string) => {
    promotionCount++;
    if (failPromotion) {
      failPromotion = false;
      throw new Error("object storage temporarily unavailable");
    }
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
    if (deliveryFailure === "missing") throw new Error("object missing");
    if (deliveryFailure === "stream") {
      return new Readable({
        read() {
          this.destroy(new Error("stream interrupted"));
        },
      });
    }
    return Readable.from(objects.get(path)!);
  });
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      const isOtherEditor = values?.[0] === security.hashToken("other-editor-token");
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: isOtherEditor ? "other-user-id" : "user-id",
          name: isOtherEditor ? "Other editor" : "Administrator",
          email: isOtherEditor ? "other@example.com" : "admin@example.com",
          role: isOtherEditor ? "editor" : "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
        }],
      };
    }
    if (statement.includes("latest_metadata")) {
      const asset = assets.get(String(values![0]));
      return {
        rowCount: asset ? 1 : 0,
        rows: asset ? [{ ...asset, latest_metadata: latestMetadata.get(String(values![0])) }] : [],
      };
    }
    if (statement.includes("UPDATE cms_media_assets SET storage_key")) {
      const asset = assets.get(String(values![0]))!;
      Object.assign(asset, { storage_key: values![1], checksum: values![2], status: "pending-review" });
      return { rowCount: 1, rows: [asset] };
    }
    if (statement.includes("INSERT INTO cms_media_versions")) {
      persistedFinalKeys.add(String(values![1]));
      latestMetadata.set(String(values![0]), values![6] as Record<string, unknown>);
      assert.ok(values![1] === finalKey || values![1] === secondFinalKey);
      assert.ok(values![1] !== stagingKey && values![1] !== secondStagingKey);
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("'media.finalized'")) {
      finalizedAudits++;
      return { rowCount: 1, rows: [] };
    }
    if (statement === protectedMediaFileSql || statement === protectedMediaDownloadSql) {
      const asset = assets.get(String(values?.[0]));
      return asset
        ? { rowCount: 1, rows: [{
            storage_key: finalKey,
            byte_size: objects.get(finalKey)!.length,
            media_type: "image/png",
            filename: statement === protectedMediaDownloadSql
              ? asset.original_filename
              : asset.filename,
          }] }
        : { rowCount: 0, rows: [] };
    }
    if (statement.includes("SELECT a.*,v.id version_id")) {
      return { rowCount: 1, rows: [{ ...assets.get(String(values![0]))!, version_id: versionId, width: 100, height: 50, metadata: {} }] };
    }
    return { rowCount: 1, rows: [] };
  });
  t.mock.method(pool, "connect", async () => {
    let assetSnapshot = new Map<string, Record<string, any>>();
    let keySnapshot = new Set<string>();
    let metadataSnapshot = new Map<string, Record<string, unknown>>();
    let auditSnapshot = 0;
    return {
      query: async (sql: unknown, values?: unknown[]) => {
        const statement = String(sql);
        if (statement === "BEGIN") {
          assetSnapshot = new Map([...assets].map(([id, row]) => [id, { ...row }]));
          keySnapshot = new Set(persistedFinalKeys);
          metadataSnapshot = new Map(latestMetadata);
          auditSnapshot = finalizedAudits;
        }
        if (statement.includes("INSERT INTO cms_media_versions") && failVersionInsert) {
          failVersionInsert = false;
          throw new Error("database temporarily unavailable");
        }
        if (statement === "ROLLBACK") {
          assets.clear();
          for (const [id, row] of assetSnapshot) assets.set(id, row);
          persistedFinalKeys.clear();
          for (const key of keySnapshot) persistedFinalKeys.add(key);
          latestMetadata.clear();
          for (const [id, metadata] of metadataSnapshot) latestMetadata.set(id, metadata);
          finalizedAudits = auditSnapshot;
        }
        return pool.query(sql as never, values);
      },
      release() {},
    } as never;
  });

  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use((req, _res, next) => {
    req.log = { error() {}, warn() {} } as typeof req.log;
    next();
  });
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
  const otherCsrf = auth.csrfForSession(security.hashToken("other-editor-token"));
  const forbiddenFinalize = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      "x-csrf-token": otherCsrf,
      cookie: `${auth.SESSION_COOKIE}=other-editor-token; ${auth.CSRF_COOKIE}=${otherCsrf}`,
    },
    body: JSON.stringify({ objectPath: stagingKey }),
  });
  assert.equal(forbiddenFinalize.status, 403);
  assert.equal(promotionCount, 0);
  failPromotion = true;
  const transientPromotion = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: stagingKey }),
  });
  assert.equal(transientPromotion.status, 503);
  assert.equal(assets.get(assetId)!.status, "pending");
  assert.equal(persistedFinalKeys.size, 0);
  assert.equal(finalizedAudits, 0);

  failVersionInsert = true;
  const transientDatabase = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: stagingKey }),
  });
  assert.equal(transientDatabase.status, 503);
  assert.equal(assets.get(assetId)!.status, "pending");
  assert.equal(persistedFinalKeys.size, 0);
  assert.equal(finalizedAudits, 0);

  const finalized = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: stagingKey }),
  });
  assert.equal(finalized.status, 200);
  assert.equal(finalizedAudits, 1);
  assert.equal((await finalized.json() as { status: string }).status, "review");
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
  const repeatedFinalize = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: stagingKey }),
  });
  assert.equal(repeatedFinalize.status, 200);
  assert.equal(promotionCount, 4);
  const changedFinalize = await fetch(`${origin}/api/media/${assetId}/finalize`, {
    method: "POST",
    headers,
    body: JSON.stringify({ objectPath: stagingKey, caption: "changed after completion" }),
  });
  assert.equal(changedFinalize.status, 409);
  assert.equal(promotionCount, 4);

  // Simulate reuse of the still-valid signed PUT after finalization.
  objects.set(stagingKey, Buffer.from("attacker overwrite"));
  objects.set(secondStagingKey, Buffer.from("different attacker overwrite"));
  const delivered = await fetch(`${origin}/api/media/${assetId}/file`, {
    headers: { cookie: `${auth.SESSION_COOKIE}=session-token` },
  });
  assert.equal(delivered.status, 200);
  assert.equal(await delivered.text(), "verified image bytes");
  assert.equal(deliveredKey, finalKey);

  const download = await fetch(`${origin}/api/media/${assetId}/download`, {
    headers: {
      range: "bytes=0-7",
      cookie: `${auth.SESSION_COOKIE}=session-token`,
    },
  });
  assert.equal(download.status, 206);
  assert.equal(download.headers.get("content-range"), `bytes 0-7/${verifiedBytes.length}`);
  assert.equal(download.headers.get("content-type"), "image/png");
  assert.match(download.headers.get("content-disposition") ?? "", /attachment; filename="uploaded-original\.png"/);
  assert.equal(await download.text(), "verified");
  deliveryFailure = "missing";
  const unavailable = await fetch(`${origin}/api/media/${assetId}/download`, {
    headers: { cookie: `${auth.SESSION_COOKIE}=session-token` },
  });
  assert.equal(unavailable.status, 404);
  assert.deepEqual(await unavailable.json(), { error: "Media object not found." });
  deliveryFailure = "stream";
  await assert.rejects(async () => {
    const interrupted = await fetch(`${origin}/api/media/${assetId}/download`, {
      headers: { cookie: `${auth.SESSION_COOKIE}=session-token` },
    });
    await interrupted.arrayBuffer();
  });
  deliveryFailure = null;
  assert.equal(
    (await fetch(`${origin}/api/media/${assetId}/download`, {
      headers: { cookie: `${auth.SESSION_COOKIE}=session-token` },
    })).status,
    200,
  );
  assert.equal(
    (await fetch(`${origin}/api/media/00000000-0000-4000-8000-000000000099/download`, {
      headers: { cookie: `${auth.SESSION_COOKIE}=session-token` },
    })).status,
    404,
  );
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
