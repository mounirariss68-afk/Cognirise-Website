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