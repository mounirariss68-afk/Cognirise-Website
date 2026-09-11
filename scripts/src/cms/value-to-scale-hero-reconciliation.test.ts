import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { assetRecords, repositoryRoot } from "./common.js";
import {
  assertNoLegacyHeroAssociations,
  resolveReceiptedImmutableVersion,
} from "./value-to-scale-hero-reconciliation.js";
import { mediaMigrationOperations } from "./migration.js";

const sourceUrl = new URL("./value-to-scale-hero-reconciliation.ts", import.meta.url);

test("Value-to-Scale hero manifest identifies the supplied bytes exactly", async () => {
  const bytes = await readFile(
    `${repositoryRoot}/artifacts/cognirise-website/public/images/cognirise/method-vts-v2.jpg`,
  );
  assert.equal(bytes.length, 1_160_096);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    "ad0ddce310568b7161ee26c1cab7ef5348db2e8252413eecb12a0860853733d5",
  );
});

test("Value-to-Scale reconciliation is targeted, append-only, and review gated", async () => {
  const source = await readFile(sourceUrl, "utf8");
  assert.match(source, /NODE_ENV === "production"/);
  assert.match(source, /REPLIT_DEPLOYMENT === "1"/);
  assert.match(source, /--target=development/);
  assert.match(source, /cms-value-to-scale-hero-reconciliation-v1:media/);
  assert.match(source, /pending-review/);
  assert.match(source, /rightsStatus: "needs-review"/);
  assert.match(source, /accessibilityStatus: "needs-review"/);
  assert.match(source, /object\.download\(\)/);
  assert.match(source, /sourceAuthorization/);
  assert.match(source, /cms_media_references/);
  assert.match(source, /receiptedVersions/);
  assert.doesNotMatch(source, /INSERT INTO cms_media_references/);
  assert.doesNotMatch(source, /UPDATE cms_media_assets/);
  assert.doesNotMatch(source, /UPDATE cms_media_versions/);
  assert.doesNotMatch(source, /UPDATE cms_revisions/);
  assert.doesNotMatch(source, /DELETE FROM/);
});

test("fresh generic inventory excludes the targeted hero from generic creation", async () => {
  const records = await assetRecords();
  const hero = records.find((record) =>
    record.fields.publicPath === "/images/cognirise/method-vts-v2.jpg"
  );
  assert.ok(hero);
  assert.equal(hero.fields.cmsOwnership, "code-owned");
  assert.equal(
    hero.fields.cmsOwnershipReason,
    "Excluded from generic inventory import; owned by cms:reconcile-value-to-scale-hero.",
  );
  assert.equal(
    records.filter((record) =>
      record.fields.publicPath === "/images/cognirise/method-vts-v2.jpg"
      && record.fields.cmsOwnership === "cms-candidate"
    ).length,
    0,
  );
  const genericOperations = mediaMigrationOperations([hero]);
  assert.equal(genericOperations.length, 1);
  assert.equal(genericOperations[0].cmsOwnership, "code-owned");
  assert.equal(
    genericOperations.filter((operation) => operation.cmsOwnership === "cms-candidate").length,
    0,
  );
});

test("replay resolves immutable v1 while preserving later editor versions", () => {
  const assetId = "asset-1";
  const version1 = {
    id: "version-1",
    asset_id: assetId,
    version_number: 1,
    storage_key: "original",
    checksum: "ad0ddce310568b7161ee26c1cab7ef5348db2e8252413eecb12a0860853733d5",
    byte_size: 1_160_096,
    width: 3_072,
    height: 3_072,
    metadata: { rightsStatus: "needs-review" },
  };
  const laterEditorVersion = {
    ...version1,
    id: "version-2",
    version_number: 2,
    storage_key: "replacement",
    checksum: "editor-replacement-checksum",
    metadata: { altText: "An editor-controlled replacement." },
  };
  // The digest is the canonical SHA-256 used by the receipt implementation.
  const receiptDigest = createHash("sha256").update(
    '{"assetId":"asset-1","checksum":"ad0ddce310568b7161ee26c1cab7ef5348db2e8252413eecb12a0860853733d5","versionId":"version-1"}',
  ).digest("hex");
  assert.deepEqual(
    resolveReceiptedImmutableVersion(
      receiptDigest,
      assetId,
      [version1, laterEditorVersion],
    ),
    [version1],
  );
});

test("association inspection fails visibly for a referenced original hero", () => {
  assert.throws(
    () => assertNoLegacyHeroAssociations([{
      document_id: "document-1",
      field_path: "revision:revision-1",
    }]),
    /Unexpected immutable CMS reference/,
  );
  assert.doesNotThrow(() => assertNoLegacyHeroAssociations([]));
});