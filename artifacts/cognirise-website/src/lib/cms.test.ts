import assert from "node:assert/strict";
import test from "node:test";
import {
  COMPILED_CONTACT_EMAIL,
  contentRecord,
  landingMedia,
  governedLandingDelivery,
  publicContactConfigurationParams,
  resolveCmsMedia,
  cmsMediaObjectPosition,
  resolvePublishedContactEmail,
  resolvePublishedHeroFilm,
  type HeroFilmSources,
} from "./cms";

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
      image: "/images/compiled-public-sector.jpg",
      imageAlt: "Compiled fallback",
      heroMedia: {
        mediaId: "approved-media",
        mediaVersionId: "approved-version",
        role: "hero",
        altText: "Citizens receiving documents at an accessible civic service centre.",
      },
    },
    media: [{
      id: "approved-media",
      versionId: "approved-version",
      url: "/api/public/media/approved-media/approved-version",
      altText: "Delivered alt",
    }],
    seo: { noIndex: false },
    publishedAt: "2026-09-08T00:00:00.000Z",
    updatedAt: "2026-09-08T00:00:00.000Z",
  } as any, "industry");

  assert.equal(record.image, "/api/public/media/approved-media/approved-version");
  assert.equal(record.imageAlt, "Citizens receiving documents at an accessible civic service centre.");
});

test("structured media replacement wins over a stale legacy asset ID", () => {
  const delivered = resolveCmsMedia([
    { id: "legacy-media", versionId: "old-version", url: "/api/public/media/legacy-media/old-version" },
    { id: "replacement-media", versionId: "replacement-version", url: "/api/public/media/replacement-media/replacement-version" },
  ] as any, {
    mediaId: "replacement-media",
    mediaVersionId: "replacement-version",
  }, "legacy-media");

  assert.equal(delivered?.url, "/api/public/media/replacement-media/replacement-version");
});

test("structured media never degrades to legacy or a different delivered version", () => {
  const delivered = resolveCmsMedia([
    { id: "legacy-media", versionId: "old-version", url: "/api/public/media/legacy-media/old-version" },
    { id: "replacement-media", versionId: "wrong-version", url: "/api/public/media/replacement-media/wrong-version" },
  ] as any, {
    mediaId: "replacement-media",
    mediaVersionId: "expected-version",
  }, "legacy-media");

  assert.equal(delivered, undefined);
});

test("immutable public and preview media focal metadata becomes a bounded crop position", () => {
  assert.equal(cmsMediaObjectPosition({ focalPoint: { x: 0.2, y: 0.8 } }), "20% 80%");
  assert.equal(cmsMediaObjectPosition({ focalPoint: { x: -1, y: 2 } }), "0% 100%");
  assert.equal(cmsMediaObjectPosition({ focalPoint: null }), undefined);
  assert.equal(cmsMediaObjectPosition(undefined), undefined);
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

  assert.deepEqual(incomplete, localFilm);
  assert.deepEqual(wrongType, localFilm);
});

test("migration landing media is allowed only before publication", () => {
  const landing = {
    pagePath: "/about",
    narrative: "About",
    sections: [
      { type: "narrative", id: "copy", order: 0, body: [{ type: "paragraph", text: "Delivered copy" }] },
      { type: "cta", id: "action", order: 1, label: "Delivered CTA", href: "/contact", style: "primary" },
      { type: "media", id: "visual", order: 2, references: [{ mediaId: "asset", mediaVersionId: "version", altText: "Governed alt" }] },
    ],
    media: [{ id: "asset", versionId: "version", url: "/delivered/version.jpg", altText: "Delivered alt" }],
    publishedAt: "2026-09-08T00:00:00.000Z",
  } as any;
  const migration = {
    ...landing,
    publishedAt: "",
    sections: [{ type: "migration-media", id: "visual", order: 0, sourcePath: "/compiled.jpg", altText: "Compiled", ownership: "compiled-landing", resolution: "unresolved" }],
  };
  assert.deepEqual(landingMedia(migration, "visual", { src: "/fallback.jpg", alt: "Fallback" }), { src: "/compiled.jpg", alt: "Compiled" });
  assert.throws(() => landingMedia({ ...migration, publishedAt: landing.publishedAt }, "visual", { src: "/fallback.jpg", alt: "Fallback" }), /published content contains unresolved migration media/);
});

test("published contact email resolves one value or the safe compiled fallback", () => {
  assert.equal(resolvePublishedContactEmail({ contactEmail: "team@cognirise.ai" }), "team@cognirise.ai");
  assert.equal(resolvePublishedContactEmail(undefined), COMPILED_CONTACT_EMAIL);
  assert.equal(resolvePublishedContactEmail({ contactEmail: "   " }), COMPILED_CONTACT_EMAIL);
});

test("contact delivery keys requests by the selected runtime locale", () => {
  const englishRequest = publicContactConfigurationParams("uae", "en");
  const arabicRequest = publicContactConfigurationParams("uae", "ar");

  assert.deepEqual(englishRequest, { market: "uae", locale: "en" });
  assert.deepEqual(arabicRequest, { market: "uae", locale: "ar" });
  assert.notDeepEqual(englishRequest, arabicRequest);
  assert.equal(resolvePublishedContactEmail({ contactEmail: "hello@cognirise.ai" }), "hello@cognirise.ai");
  assert.equal(resolvePublishedContactEmail({ contactEmail: "marhaba@cognirise.ai" }), "marhaba@cognirise.ai");
});

test("landing cutover is isolated to each page publication history", () => {
  const aboutOnly = ["/about"];
  assert.equal(governedLandingDelivery("cms", aboutOnly, "/about", true), "cms");
  for (const path of ["/", "/partners", "/platforms", "/insights"]) {
    assert.equal(governedLandingDelivery("cms", aboutOnly, path, false), "compiled-fallback");
  }

  assert.equal(
    governedLandingDelivery("intentional-empty", aboutOnly, "/about", false),
    "intentional-empty",
    "an archived or unavailable About remains fail closed",
  );
  assert.equal(
    governedLandingDelivery("cms", ["/"], "/partners", false),
    "compiled-fallback",
    "publishing Home does not cut Partners over",
  );
  assert.equal(
    governedLandingDelivery("compiled-fallback", [], "/about", false),
    "compiled-fallback",
    "draft-only inventory does not cut About over",
  );
});
