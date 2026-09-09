import assert from "node:assert/strict";
import test from "node:test";
import { contentRecord, resolvePublishedHeroFilm, type HeroFilmSources } from "./cms";

const localFilm: HeroFilmSources = {
  mp4: "/videos/local.mp4",
  webm: "/videos/local.webm",
  poster: "/images/local.jpg",
};

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

test("published hero film resolves only a complete governed source set", () => {
  const resolved = resolvePublishedHeroFilm({
    slot: "home",
    poster: { id: "poster-id", versionId: "v1", mimeType: "image/jpeg", url: "/api/public/media/poster/version" },
    sources: [
      { id: "mp4-id", mimeType: "video/mp4", url: "/api/public/media/mp4/version" },
      { id: "webm-id", mimeType: "video/webm", url: "/api/public/media/webm/version" },
    ],
  }, localFilm);

  assert.deepEqual(resolved, {
    mp4: "/api/public/media/mp4/version",
    webm: "/api/public/media/webm/version",
    poster: "/api/public/media/poster/version",
  });
});

test("hero film retains checked-in sources for incomplete or invalid published media", () => {
  const incomplete = resolvePublishedHeroFilm({
    slot: "home",
    poster: { id: "poster-id", versionId: "v1", mimeType: "image/jpeg", url: "/api/public/media/poster/version" },
    sources: [
      { id: "mp4-id", mimeType: "video/mp4", url: "/api/public/media/mp4/version" },
    ],
  }, localFilm);
  const wrongType = resolvePublishedHeroFilm({
    slot: "home",
    poster: { id: "poster-id", versionId: "v1", mimeType: "image/jpeg", url: "/api/public/media/poster/version" },
    sources: [
      { id: "mp4-id", mimeType: "video/mp4", url: "/api/public/media/mp4/version" },
      { id: "webm-id", mimeType: "video/quicktime", url: "/api/public/media/webm/version" },
    ],
  }, localFilm);

  assert.equal(incomplete, localFilm);
  assert.equal(wrongType, localFilm);
  assert.equal(resolvePublishedHeroFilm(undefined, localFilm), localFilm);
});