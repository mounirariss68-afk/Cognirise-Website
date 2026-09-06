import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { cmsMediaHref } from "../src/lib/cms-media.ts";

test("CMS media URLs allow only governed versions or HTTPS", () => {
  assert.equal(
    cmsMediaHref("/api/cms/media/media-report_1/versions/3"),
    "/api/cms/media/media-report_1/versions/3",
  );
  assert.equal(cmsMediaHref("https://cdn.example.test/report.pdf"), "https://cdn.example.test/report.pdf");
  assert.equal(cmsMediaHref("/private/cms/report.pdf"), undefined);
  assert.equal(cmsMediaHref("http://cdn.example.test/report.pdf"), undefined);
  assert.equal(cmsMediaHref("/api/cms/media/report/versions/latest"), undefined);
});

test("download gates use the same governed media URL policy", async () => {
  const renderer = await readFile(
    new URL("../src/components/cms/CmsPageRenderer.tsx", import.meta.url),
    "utf8",
  );
  assert.match(renderer, /const href = cmsMediaHref\(asset\?\.url\)/);
  assert.doesNotMatch(renderer, /href\?\.startsWith\("https:"\)/);
});