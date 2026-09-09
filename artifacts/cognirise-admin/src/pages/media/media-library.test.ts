import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildHeroDraftContent,
  EMPTY_HERO_SELECTION,
  mergeHeroAssetRecords,
  type HeroAssetRecord,
} from "./hero-assignment.ts";

const adminRoot = new URL("../../../", import.meta.url);

test("media library separates website, LinkedIn, and video collections in list and upload contracts", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /type MediaCollection = "website" \| "linkedin" \| "motion"/);
  assert.match(source, /collection,/);
  assert.match(source, /linkedinAssetKind:/);
  assert.match(source, /<TabsTrigger value="website"/);
  assert.match(source, /<TabsTrigger value="linkedin"/);
  assert.match(source, /<TabsTrigger value="motion"/);
  assert.match(source, /grid-cols-1 gap-2 bg-transparent p-0 sm:grid-cols-3/);
  assert.match(source, /collectionCounts\.website/);
  assert.match(source, /collectionCounts\.linkedin/);
  assert.match(source, /collectionCounts\.motion/);
  assert.match(source, /<SelectItem value="motion">Videos &amp; animations<\/SelectItem>/);
  assert.match(source, /<SelectItem value="post">Post image<\/SelectItem>/);
  assert.match(source, /<SelectItem value="header">Profile header<\/SelectItem>/);
});

test("video uploads accept only MP4 and WebM with an explicit 250MB limit", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /const VIDEO_UPLOAD_LIMIT = 250 \* 1024 \* 1024/);
  assert.match(source, /const VIDEO_ACCEPT = "video\/mp4,video\/webm"/);
  assert.match(source, /\["video\/mp4", "video\/webm"\]\.includes\(file\.type\)/);
  assert.match(source, /Maximum video file size is 250MB/);
  assert.match(source, /accept=\{uploadCollection === "motion" \? VIDEO_ACCEPT : IMAGE_ACCEPT\}/);
});

test("video assets have a playable, accessible preview and governed metadata", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /<video/);
  assert.match(source, /controls/);
  assert.match(source, /preload="metadata"/);
  assert.match(source, /aria-label=\{asset\.altText \|\| asset\.filename\}/);
  for (const field of ["groupId", "variant", "posterMediaId", "reducedMotionMediaId", "captionsMediaId", "transcript", "audioDescription"]) {
    assert.match(source, new RegExp(`${field}:`));
  }
  assert.match(source, /motionMetadata: finalizeAsset\.collection === "motion"/);
  assert.match(source, /caption: usage \|\| undefined/);
  assert.match(source, /credit: credit \|\| undefined/);
  assert.match(source, /Configure motion upload/);
  assert.match(source, /Edit video metadata/);
  assert.match(source, /buildMotionMetadata\(motionFields, motionVariant, motionFlags\)/);
});

test("LinkedIn media exposes campaign, dimensions, accessibility, rights and status metadata", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /campaignMetadata/);
  for (const field of ["campaign", "edition", "title", "purpose", "pulseSource", "approvedUse"]) {
    assert.match(source, new RegExp(`${field}:`));
  }
  assert.match(source, /asset\.width && asset\.height/);
  assert.match(source, /asset\.altText \|\| "No alt text provided"/);
  assert.match(source, /asset\.credit \? `Credit:/);
  assert.match(source, /<StatusBadge status=\{asset\.status\}/);
});

test("LinkedIn-only campaign metadata is captured during finalization and remains editable", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /finalizeAsset\?\.collection === "linkedin"/);
  assert.match(source, /campaignMetadata: finalizeAsset\.collection === "linkedin"/);
  assert.match(source, /useUpdateMedia/);
  assert.match(source, /Edit LinkedIn campaign metadata/);
  assert.match(source, /maxLength=\{field\.maxLength\}/);
  assert.match(source, /setQueriesData/);
});

test("grid, list, and review previews render assets while replacing pending, failed, missing and broken files with explicit states", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /asset\.status === "pending"/);
  assert.match(source, /asset\.status === "review"/);
  assert.match(source, /label: "Awaiting review"/);
  assert.match(source, /asset\.status === "failed"/);
  assert.match(source, /"Preview unavailable"/);
  assert.match(source, /"File unavailable"/);
  assert.match(source, /onError=\{onError\}/);
  assert.equal((source.match(/<AssetPreview/g) ?? []).length, 3);
});

test("authorized governance owners can inspect, approve, or reject awaiting-review assets", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /useGetSession/);
  assert.match(source, /session\?\.user\?\.role === "administrator"/);
  assert.match(source, /session\?\.user\?\.role === "publisher"/);
  assert.match(source, /useReviewMedia/);
  assert.match(source, /Review media asset/);
  assert.match(source, /Inspect the preview and governed metadata/);
  assert.match(source, /data: \{ decision: reviewDecision \}/);
  assert.match(source, /Confirm \{reviewDecision === "approve" \? "approval" : "rejection"\}/);
  assert.match(source, /Awaiting a publisher review/);
  assert.match(source, /Asset approved/);
  assert.match(source, /Asset rejected/);
});

test("grid and list views label protected per-asset downloads and report unavailable files", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /const downloadUrl = `\/api\/media\/\$\{encodeURIComponent\(asset\.id\)\}\/download`/);
  assert.match(source, /headers: \{ Range: "bytes=0-0" \}/);
  assert.match(source, /preflight\.body\?\.cancel\(\)/);
  assert.match(source, /anchor\.download = asset\.filename/);
  assert.match(source, /Download unavailable/);
  assert.match(source, /The file may be missing from storage/);
  assert.match(source, /aria-label=\{`Download \$\{asset\.filename\}`\}/);
  assert.match(source, /\{assetActions\(asset\)\}/);
  assert.match(source, /\{assetActions\(asset, true\)\}/);
});

test("video workspace stages governed Homepage and Industries hero revisions without a publish bypass", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");
  assert.match(source, /Website hero assignments/);
  assert.match(source, /"Homepage"/);
  assert.match(source, /"Industries"/);
  assert.match(source, /Search active hero media/);
  assert.match(source, /Poster image/);
  assert.match(source, /MP4 source/);
  assert.match(source, /WebM source/);
  assert.match(source, /publishedRevisionId/);
  assert.match(source, /useGetDocumentRevision/);
  assert.match(source, /buildHeroDraftContent\(slot, selection\[slot\]\)/);
  assert.match(source, /useGetMedia\(publishedIds\.homepage\.poster/);
  assert.match(source, /useCreateDocument/);
  assert.match(source, /useUpdateDocument/);
  assert.match(source, /useSubmitDocument/);
  assert.doesNotMatch(source, /usePublishDocument/);
  assert.match(source, /Save draft &amp; submit for review/);
  assert.match(source, /Open publisher control/);
  assert.match(source, /role="alert"/);
});

test("hero selections retain complete records across searches and out-of-page prefill", () => {
  const poster: HeroAssetRecord = {
    id: "poster",
    versionId: "poster-v1",
    filename: "poster.webp",
    mimeType: "image/webp",
    status: "ready",
  };
  const mp4: HeroAssetRecord = {
    id: "mp4",
    versionId: "mp4-v1",
    filename: "hero.mp4",
    mimeType: "video/mp4",
    status: "ready",
  };
  const webm: HeroAssetRecord = {
    id: "webm",
    versionId: "webm-v1",
    filename: "hero.webm",
    mimeType: "video/webm",
    status: "ready",
  };

  const firstSearch = mergeHeroAssetRecords(new Map(), [poster, mp4]);
  const laterSearch = mergeHeroAssetRecords(firstSearch, [webm]);
  assert.equal(laterSearch.get("poster"), poster);
  assert.equal(laterSearch.get("mp4"), mp4);
  assert.equal(laterSearch.get("webm"), webm);

  const outOfPagePublished = mergeHeroAssetRecords(laterSearch, [{
    ...poster,
    id: "published-poster",
    versionId: "published-poster-v7",
  }]);
  const result = buildHeroDraftContent("homepage", {
    ...EMPTY_HERO_SELECTION,
    poster: outOfPagePublished.get("published-poster")!,
    mp4: laterSearch.get("mp4")!,
    webm: laterSearch.get("webm")!,
  });
  assert.equal(result.content.hero.posterMediaVersionId, "published-poster-v7");
  assert.deepEqual(result.mediaIds, ["published-poster", "mp4", "webm"]);
});

test("hero draft construction rejects incomplete records before reading versions", () => {
  assert.throws(
    () => buildHeroDraftContent("industries", EMPTY_HERO_SELECTION),
    /Choose a poster image, MP4 source, WebM source/,
  );
});