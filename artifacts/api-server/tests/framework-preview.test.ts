import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

test("protected preview returns only revision-pinned media with private response policy", async () => {
  const route = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  const previewRoute = route.slice(route.indexOf('"/preview/:token"'));

  assert.match(previewRoute, /authenticate,\s*requireMfa/);
  assert.match(previewRoute, /Cache-Control": "no-store, private"/);
  assert.match(previewRoute, /X-Robots-Tag": "noindex, nofollow, noarchive"/);
  assert.match(previewRoute, /cms_media_references/);
  assert.match(previewRoute, /ref\.field_path=\$2/);
  assert.match(previewRoute, /`revision:\$\{String\(row\.revision_id\)\}`/);
  assert.match(previewRoute, /r\.id=p\.revision_id/);
  assert.match(previewRoute, /previewMediaIds\(projectedDocument, row\.kind as CmsDocumentKind\)/);
  assert.match(previewRoute, /SELECT d\.id document_id,d\.kind,v\.storage_key/);
  assert.match(previewRoute, /\/api\/preview\/\$\{encodeURIComponent\(String\(req\.params\.token\)\)\}\/media/);
  assert.match(previewRoute, /"\/preview\/:token\/media\/:mediaId\/:versionId"/);
  assert.match(previewRoute, /p\.revoked_at IS NULL/);
});

test("preview media capability collection includes structured references for the authoritative kind", async () => {
  const { previewMediaIds } = await import("../src/routes/documents.ts");
  const hero = "00000000-0000-4000-8000-000000000101";
  const social = "00000000-0000-4000-8000-000000000102";
  const legacy = "00000000-0000-4000-8000-000000000103";
  const educatorImage = "00000000-0000-4000-8000-000000000104";
  const researchImage = "00000000-0000-4000-8000-000000000105";
  const payload = {
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "Preview fixture",
      body: [],
      author: "Preview fixture",
      publicationDate: "2026-10-01",
      heroMedia: { mediaId: hero, mediaVersionId: "00000000-0000-4000-8000-000000000201", role: "hero" },
      social: {
        imageMedia: {
          mediaId: social,
          mediaVersionId: "00000000-0000-4000-8000-000000000202",
          role: "og-image",
        },
      },
      educationPov: {
        imagery: {
          educatorPractice: {
            media: { mediaId: educatorImage, role: "supporting" },
          },
          researchCoordination: {
            media: { mediaId: researchImage, role: "supporting" },
          },
        },
      },
    },
    mediaIds: [legacy],
  };
  assert.deepEqual(previewMediaIds(payload, "industry"), [
    legacy, hero, educatorImage, researchImage, social,
  ]);
  // The old inference fallback must not make an unknown structured kind look
  // like a landing page; the capability route always supplies row.kind.
  assert.deepEqual(previewMediaIds(payload), [legacy, hero, social]);
});

test("protected Education preview projects the complete snapshot for requested and edition markets", async () => {
  const route = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  const previewRoute = route.slice(route.indexOf('"/preview/:token"'));

  assert.match(route, /projectIndustrySnapshotForMarket/);
  assert.match(previewRoute, /const requestedMarket = String\(row\.requested_market \?\? row\.market\)/);
  assert.match(previewRoute, /COALESCE\(e\.editorial_market,e\.market\) editorial_market/);
  assert.match(previewRoute, /const editionMarket = String\(row\.editorial_market \?\? row\.market\)/);
  assert.match(previewRoute, /projectPreviewDocument\([\s\S]*row\.payload,[\s\S]*requestedMarket,[\s\S]*editionMarket/);
  assert.match(previewRoute, /document: projectedDocument/);
  assert.match(previewRoute, /validateCmsSnapshotForDelivery\([\s\S]*projectedDocument,[\s\S]*"draft"/);
  assert.match(previewRoute, /url: `\/api\/preview\/\$\{encodeURIComponent/);
  assert.match(previewRoute, /caption: asset\.metadata\?\.caption \?\? null/);
  assert.match(previewRoute, /X-Robots-Tag": "noindex, nofollow, noarchive"/);
});

test("preview sessions distinguish expiry and revocation without weakening capability checks", async () => {
  const route = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  const previewRoute = route.slice(
    route.indexOf('"/preview/:token"'),
    route.indexOf('"/preview/:token/media/:mediaId/:versionId"'),
  );

  assert.match(previewRoute, /authenticate,\s*requireMfa/);
  assert.match(previewRoute, /p\.expires_at,p\.revoked_at/);
  assert.match(previewRoute, /WHERE p\.token_digest=\$1/);
  assert.match(previewRoute, /canAccessEditionTarget[\s\S]*row\.revoked_at/);
  assert.match(previewRoute, /status\(410\)\.json\(\{ error: "Preview session has been revoked\.", reason: "revoked" \}\)/);
  assert.match(previewRoute, /status\(410\)\.json\(\{ error: "Preview session has expired\.", reason: "expired" \}\)/);
  assert.match(previewRoute, /Cache-Control": "no-store, private"/);
  assert.match(previewRoute, /X-Robots-Tag": "noindex, nofollow, noarchive"/);
});

test("pending media is available through both protected preview stages, never through a public bypass", async () => {
  const route = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  const metadataRoute = route.slice(route.indexOf('"/preview/:token"'), route.indexOf('"/preview/:token/media/:mediaId/:versionId"'));
  const binaryRoute = route.slice(route.indexOf('"/preview/:token/media/:mediaId/:versionId"'));
  for (const stage of [metadataRoute, binaryRoute]) {
    assert.match(stage, /authenticate,\s*requireMfa/);
    assert.match(stage, /a\.status IN \('active','ready','pending-review'\)/);
    assert.match(stage, /canAccessEditionTarget/);
    assert.match(stage, /requested_locale/);
    assert.match(stage, /no-store, private/);
  }
  assert.match(metadataRoute, /row\.revoked_at/);
  assert.match(binaryRoute, /p\.revoked_at IS NULL/);
  assert.match(binaryRoute, /previewMediaIds\([\s\S]*asset\.rows\[0\]\.payload,[\s\S]*asset\.rows\[0\]\.kind as CmsDocumentKind/);
});