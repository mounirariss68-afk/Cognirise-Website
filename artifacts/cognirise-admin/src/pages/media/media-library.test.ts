import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("media library separates website and LinkedIn collections in list and upload contracts", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /type MediaCollection = "website" \| "linkedin"/);
  assert.match(source, /collection,/);
  assert.match(source, /linkedinAssetKind:/);
  assert.match(source, /<TabsTrigger value="website"/);
  assert.match(source, /<TabsTrigger value="linkedin"/);
  assert.match(source, /<SelectItem value="post">Post image<\/SelectItem>/);
  assert.match(source, /<SelectItem value="header">Profile header<\/SelectItem>/);
});

test("LinkedIn media exposes campaign, dimensions, accessibility, rights and status metadata", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /campaignTitle/);
  assert.match(source, /campaignTheme/);
  assert.match(source, /campaignMetadata/);
  assert.match(source, /asset\.width && asset\.height/);
  assert.match(source, /asset\.altText \|\| "No alt text provided"/);
  assert.match(source, /asset\.credit \? `Credit:/);
  assert.match(source, /<StatusBadge status=\{asset\.status\}/);
});

test("grid and list previews replace pending, failed, missing and broken images with explicit states", async () => {
  const source = await readFile(new URL("src/pages/media/MediaLibrary.tsx", adminRoot), "utf8");

  assert.match(source, /asset\.status === "pending"/);
  assert.match(source, /asset\.status === "failed"/);
  assert.match(source, /"Preview unavailable"/);
  assert.match(source, /"File unavailable"/);
  assert.match(source, /onError=\{onError\}/);
  assert.equal((source.match(/<AssetPreview/g) ?? []).length, 2);
});