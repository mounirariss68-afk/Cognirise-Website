import assert from "node:assert/strict";
import test from "node:test";
import {
  FinalizeMediaUploadBody,
  ListMediaQueryParams,
  RequestMediaUploadBody,
} from "@workspace/api-zod";
import {
  apiMediaStatus,
  isUsableMediaStatus,
  isValidMediaClassification,
  media,
} from "../src/routes/media.ts";
import { publicMediaUrl } from "../src/routes/public.ts";

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
  assert.equal(isUsableMediaStatus("pending"), false);
  assert.equal(isUsableMediaStatus("failed"), false);
  assert.equal(apiMediaStatus("pending-review"), "pending");

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