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
  assert.match(previewRoute, /\/api\/preview\/\$\{encodeURIComponent\(String\(req\.params\.token\)\)\}\/media/);
  assert.match(previewRoute, /"\/preview\/:token\/media\/:mediaId\/:versionId"/);
  assert.match(previewRoute, /p\.revoked_at IS NULL/);
});

test("protected Education preview projects the complete snapshot for requested and edition markets", async () => {
  const route = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  const previewRoute = route.slice(route.indexOf('"/preview/:token"'));

  assert.match(route, /projectIndustrySnapshotForMarket/);
  assert.match(previewRoute, /const requestedMarket = String\(row\.requested_market \?\? row\.market\)/);
  assert.match(previewRoute, /const editionMarket = String\(row\.market\)/);
  assert.match(previewRoute, /projectPreviewDocument\([\s\S]*row\.payload,[\s\S]*requestedMarket,[\s\S]*editionMarket/);
  assert.match(previewRoute, /document: projectedDocument/);
  assert.match(previewRoute, /validateCmsSnapshotForDelivery\([\s\S]*projectedDocument,[\s\S]*"draft"/);
  assert.match(previewRoute, /url: `\/api\/preview\/\$\{encodeURIComponent/);
  assert.match(previewRoute, /caption: asset\.metadata\?\.caption \?\? null/);
  assert.match(previewRoute, /X-Robots-Tag": "noindex, nofollow, noarchive"/);
});

test("pending media is available through both protected preview stages, never through a public bypass", async () => {
  const route = await readFile(resolve(process.cwd(), "src/routes/documents.ts"), "utf8");
  const metadataRoute = route.slice(route.indexOf('"/preview/:token"'), route.indexOf('"/preview/:token/media/:mediaId/:versionId"'));
  const binaryRoute = route.slice(route.indexOf('"/preview/:token/media/:mediaId/:versionId"'));
  for (const stage of [metadataRoute, binaryRoute]) {
    assert.match(stage, /authenticate,\s*requireMfa/);
    assert.match(stage, /a\.status IN \('active','ready','pending-review'\)/);
    assert.match(stage, /canAccessMarket/);
    assert.match(stage, /p\.revoked_at IS NULL/);
    assert.match(stage, /no-store, private/);
  }
  assert.match(binaryRoute, /previewMediaIds\(asset\.rows\[0\]\.payload\)\.includes/);
});