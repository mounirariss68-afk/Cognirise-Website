import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { heroConfiguration, heroConfigurationSnapshot, heroMedia, motionMetadata } from "./hero-media.js";

test("the governed manifest contains the site families and complete Platforms media", () => {
  assert.equal(heroMedia.length, 10);
  for (const slot of ["homepage", "industries"] as const) {
    assert.deepEqual(
      heroMedia.filter((item) => item.slot === slot).map((item) => item.role).sort(),
      ["mp4", "poster", "webm"],
    );
  }
  assert.deepEqual(
    heroMedia.filter((item) => item.slot === "platforms").map((item) => item.role).sort(),
    ["fallback", "mp4", "poster", "webm"],
  );
  assert.equal(new Set(heroMedia.map((item) => item.checksum)).size, 10);
  assert.ok(heroMedia.every((item) => item.sourceFile.startsWith("artifacts/cognirise-website/public/")));
});

test("every governed hero manifest binary matches its recorded bytes", async () => {
  for (const definition of heroMedia) {
    const bytes = await readFile(new URL(`../../../${definition.sourceFile}`, import.meta.url));
    assert.equal(bytes.length, definition.byteSize, definition.publicPath);
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      definition.checksum,
      definition.publicPath,
    );
  }
});

test("hero configuration pins every asset and immutable version", () => {
  const governed = heroMedia.map((definition, index) => ({
    definition,
    assetId: `asset-${index}`,
    versionId: `version-${index}`,
  }));
  const configuration = heroConfiguration("homepage", governed);
  assert.equal(configuration.hero.posterMediaVersionId, "version-0");
  assert.deepEqual(configuration.hero.sources.map((source) => source.mediaVersionId), ["version-1", "version-2"]);
  assert.deepEqual(configuration.mediaIds, ["asset-0", "asset-1", "asset-2"]);
});

test("reconciliation hero snapshot passes the shared publication validator", () => {
  const governed = heroMedia.map((definition, index) => ({
    definition,
    assetId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    versionId: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
  }));
  for (const slot of ["homepage", "industries"] as const) {
    const result = validateCmsSnapshot(
      "site-configuration",
      heroConfigurationSnapshot(slot, governed),
      "publish",
    );
    assert.equal(result.success, true, result.success ? undefined : result.errors.join("; "));
  }
});

test("motion metadata points at the reconciled poster and preserves reduced-motion behavior", () => {
  assert.deepEqual(motionMetadata("homepage", "poster-1"), {
    groupId: "homepage-hero",
    variant: "desktop",
    autoplay: true,
    loop: true,
    posterMediaId: "poster-1",
    reducedMotionMediaId: "poster-1",
    accessibility: {
      decorative: true,
      hasAudio: false,
    },
  });
  assert.equal(
    motionMetadata("platforms", "poster-1", "fallback-1").reducedMotionMediaId,
    "fallback-1",
  );
});

test("the executable is development-only, append-only, and receipt governed", async () => {
  const source = await readFile(new URL("./hero-reconciliation.ts", import.meta.url), "utf8");
  const manifest = await readFile(new URL("./hero-media.ts", import.meta.url), "utf8");
  assert.match(source, /NODE_ENV === "production"/);
  assert.match(source, /REPLIT_DEPLOYMENT === "1"/);
  assert.match(source, /--target=development/);
  assert.match(source, /cms_operation_receipts/);
  assert.match(source, /\(storage_key,filename,original_filename,media_type/);
  assert.match(source, /VALUES \(\$1,\$2,\$2,\$3/);
  assert.match(source, /media_version_id/);
  assert.match(source, /version_number=1/);
  assert.match(source, /collection.*motion/);
  assert.match(source, /motion_metadata/);
  assert.match(manifest, /reducedMotionMediaId/);
  assert.match(manifest, /accessibility/);
  assert.match(source, /workflow_state !== "approved"/);
  assert.match(source, /await reconcileObjects\(apply\)/);
  assert.match(source, /metadata\.contentType !== definition\.mimeType/);
  assert.match(source, /object\.download\(\)/);
  assert.match(source, /stored\.length !== definition\.byteSize/);
  assert.match(source, /storedChecksum !== definition\.checksum/);
  assert.match(source, /--media-only/);
  assert.match(source, /BEGIN READ ONLY/);
  assert.match(source, /if \(!mediaOnly\)/);
  assert.match(source, /pages untouched/);
  assert.match(source, /document_status !== "active"/);
  assert.match(source, /publication_state !== "published"/);
  assert.match(source, /published_revision_id !== receipt\.rows\[0\]\.subject_id/);
  assert.match(source, /references\.rowCount !== 3/);
  assert.doesNotMatch(source, /UPDATE cms_media_assets|UPDATE cms_media_versions|UPDATE cms_revisions/);
});

test("legacy hero authority has a controlled append-only v2 upgrade and replay", async () => {
  const source = await readFile(new URL("./hero-reconciliation.ts", import.meta.url), "utf8");
  assert.match(source, /cms-site-hero-reconciliation-v2/);
  assert.match(source, /cms\.site-hero\.configuration-published\.v2/);
  assert.match(source, /Legacy \$\{slot\} hero authority is not the exact task-owned configuration/);
  assert.match(source, /row\.revision_number !== 1/);
  assert.match(source, /row\.max_revision_number !== 1/);
  assert.match(source, /canonicalJson\(row\.payload\) !== canonicalJson\(legacyPayload\)/);
  assert.match(source, /VALUES \(\$1,2,1,\$2,\$3,'approved'/);
  assert.match(source, /upgradedFromRevisionId/);
  assert.match(source, /published_revision_id=\$2/);
  assert.match(source, /return "upgraded"/);
  assert.match(source, /return "replayed"/);
  assert.match(source, /result_digest/);
  assert.match(source, /no committed development media-only reconciliation exists/);
  assert.match(source, /cms-site-hero-motion-metadata-v1/);
  assert.match(source, /cms\.site-hero\.motion-metadata-reconciled/);
  assert.match(source, /version_number\+1/);
  assert.match(source, /media\.metadata-version-appended/);
  assert.match(source, /Unreceipted Platforms motion metadata version exists/);
  assert.doesNotMatch(source, /UPDATE cms_media_assets|UPDATE cms_media_versions|UPDATE cms_revisions/);
  assert.doesNotMatch(source, /UPDATE cms_operation_receipts|DELETE FROM cms_operation_receipts/);
  assert.doesNotMatch(source, /UPDATE cms_revisions|DELETE FROM cms_revisions/);
});