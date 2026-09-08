import assert from "node:assert/strict";
import test from "node:test";
import { contentRecord } from "./cms";

test("industry records render the pinned CMS hero instead of the compiled legacy image", () => {
  const record = contentRecord({
    id: "industry-id",
    slug: "public-sector",
    kind: "industry",
    market: "uae",
    locale: "en",
    title: "Public Sector",
    summary: null,
    content: {
      heroMediaId: "approved-media",
      image: "/images/legacy-public-sector.jpg",
      imageAlt: "Legacy alt text",
    },
    media: [{
      id: "approved-media",
      versionId: "approved-version",
      url: "/api/public/media/approved-media/approved-version",
      mimeType: "image/png",
      width: 1536,
      height: 1024,
      altText: "Citizens receiving documents at an accessible civic service centre.",
      caption: null,
      credit: "Cognirise",
    }],
    seo: { noIndex: false },
    publishedAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  } as any, "industry");

  assert.equal(record.image, "/api/public/media/approved-media/approved-version");
  assert.equal(record.imageAlt, "Citizens receiving documents at an accessible civic service centre.");
});

test("compiled industry imagery remains available when no published hero is present", () => {
  const record = contentRecord({
    id: "industry-id",
    slug: "public-sector",
    kind: "industry",
    market: "uae",
    locale: "en",
    title: "Public Sector",
    summary: null,
    content: {
      image: "/images/compiled-public-sector.jpg",
      imageAlt: "Compiled fallback",
    },
    media: [],
    seo: { noIndex: false },
    publishedAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  } as any, "industry");

  assert.equal(record.image, "/images/compiled-public-sector.jpg");
  assert.equal(record.imageAlt, "Compiled fallback");
});