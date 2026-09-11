import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  canonicalJson,
  immutableVersionMetadata,
  methodologiesHeroMedia,
  resolveMethodologiesSnapshot,
} from "./methodologies-media.js";
import { assertLiveMethodologiesDelivery } from "./methodologies-reconciliation.js";

const compiled = {
  slug: "methodologies",
  title: "Methodologies",
  summary: "Unchanged summary",
  markets: ["uae"],
  mediaIds: [],
  content: {
    schemaVersion: 1,
    pagePath: "/methodologies",
    template: "methodologies",
    narrative: "Unchanged narrative",
    sections: [
      {
        type: "narrative",
        id: "hero",
        order: 0,
        heading: "Unchanged heading",
        body: [{ type: "paragraph", text: "Unchanged body" }],
      },
      {
        type: "migration-media",
        id: "methodologies-hero-media",
        order: 1,
        sourcePath: "/images/cognirise/method-overview.jpg",
        altText: "Existing fallback",
        ownership: "compiled-landing",
        resolution: "unresolved",
      },
      {
        type: "cta",
        id: "primary-action",
        order: 2,
        label: "Find your situation",
        href: "/methodologies#route-navigator",
        style: "primary",
      },
    ],
    cta: {
      label: "Find your situation",
      href: "/methodologies#route-navigator",
      style: "primary",
    },
    seo: {},
    legal: {},
    visualReferences: [],
    visibility: "public",
    order: 0,
    sources: [{ label: "Compiled Methodologies page", url: "https://www.cognirise.com/methodologies" }],
    verificationDate: "2026-09-09",
    reviewDate: "2027-03-09",
    relatedIds: [],
  },
};

test("Task 294 manifest identifies the exact supplied bytes and truthful authority", () => {
  assert.deepEqual(
    [
      methodologiesHeroMedia.sourceFile,
      methodologiesHeroMedia.checksum,
      methodologiesHeroMedia.byteSize,
      methodologiesHeroMedia.width,
      methodologiesHeroMedia.height,
    ],
    [
      "attached_assets/cognirise-industry-education_1789039954658.png",
      "d44641810913d36924887248667011d826348ea6f7a3ca8b41a2eb475c5dd5a8",
      1_813_277,
      1024,
      1024,
    ],
  );
  const metadata = immutableVersionMetadata();
  assert.equal(metadata.rights.status, "approved");
  assert.equal(metadata.rights.basis, "explicit-user-publishing-request");
  assert.equal(metadata.rights.source, "user-supplied attached asset");
  assert.doesNotMatch(canonicalJson(metadata), /owner|copyright|Cognirise.*owner/i);
});

test("resolution changes only the requested media slot and immutable media inventory", () => {
  const resolved = resolveMethodologiesSnapshot(compiled, "asset-id", "version-id");
  assert.deepEqual(resolved.mediaIds, ["asset-id"]);
  assert.deepEqual(resolved.content.sections[0], compiled.content.sections[0]);
  assert.deepEqual(resolved.content.sections[2], compiled.content.sections[2]);
  assert.deepEqual(resolved.content.sections[1], {
    id: "methodologies-hero-media",
    order: 1,
    type: "media",
    references: [{
      mediaId: "asset-id",
      mediaVersionId: "version-id",
      role: "hero",
      altText: methodologiesHeroMedia.altText,
    }],
  });
});

test("the generated /methodologies authority resolves to a publishable immutable snapshot", async () => {
  const inventory = JSON.parse(await readFile(
    new URL("../../../lib/db/landing-page-inventory.json", import.meta.url),
    "utf8",
  )) as Array<{ path: string; snapshot: typeof compiled }>;
  const authority = inventory.find((item) => item.path === "/methodologies");
  assert.ok(authority);
  const resolved = resolveMethodologiesSnapshot(
    authority.snapshot,
    "00000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000001",
  );
  const validation = validateCmsSnapshot("landing-page", resolved, "publish");
  assert.equal(validation.success, true, validation.success ? undefined : validation.errors.join("; "));
});

test("resolution fails closed for absent, duplicate, or already-resolved slots", () => {
  const without = structuredClone(compiled);
  without.content.sections.splice(1, 1);
  assert.throws(() => resolveMethodologiesSnapshot(without, "a", "v"), /exactly one unresolved/);
  const duplicate = structuredClone(compiled);
  duplicate.content.sections.push(structuredClone(duplicate.content.sections[1]));
  assert.throws(() => resolveMethodologiesSnapshot(duplicate, "a", "v"), /exactly one unresolved/);
  const resolved = structuredClone(compiled);
  resolved.content.sections[1].type = "media";
  assert.throws(() => resolveMethodologiesSnapshot(resolved, "a", "v"), /exactly one unresolved/);
});

test("live verification allows a legitimate later approved publication", () => {
  const assetId = "00000000-0000-4000-8000-000000000009";
  const versionId = "10000000-0000-4000-8000-000000000009";
  const payload = resolveMethodologiesSnapshot(compiled, assetId, versionId);
  const live = assertLiveMethodologiesDelivery({
    document_id: "document",
    kind: "landing-page",
    canonical_slug: "methodologies",
    document_status: "active",
    publication_state: "published",
    published_revision_id: "later-revision",
    revision_id: "later-revision",
    revision_number: 9,
    workflow_state: "approved",
    payload,
  }, [{
    asset_id: assetId,
    media_version_id: versionId,
    reference_document_id: "document",
    field_path: "revision:later-revision",
    version_asset_id: assetId,
    asset_status: "active",
    media_type: "image/webp",
    storage_key: "private/cms-media/editorial-replacement",
    checksum: "a".repeat(64),
    byte_size: 1234,
    width: 1600,
    height: 900,
    metadata: { rightsStatus: "approved-use" },
  }]);
  assert.equal(live.revisionNumber, 9);
  assert.equal(live.versionId, versionId);
});

test("live verification fails closed for a missing pointer or exact media pin", () => {
  const payload = resolveMethodologiesSnapshot(
    compiled,
    "00000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000002",
  );
  const delivery = {
    document_id: "document",
    kind: "landing-page",
    canonical_slug: "methodologies",
    document_status: "active",
    publication_state: "published",
    published_revision_id: "revision",
    revision_id: "revision",
    revision_number: 2,
    workflow_state: "approved",
    payload,
  };
  assert.throws(
    () => assertLiveMethodologiesDelivery(
      { ...delivery, published_revision_id: null },
      [],
    ),
    /approved published revision/,
  );
  assert.throws(
    () => assertLiveMethodologiesDelivery(delivery, []),
    /active, approved immutable media version/,
  );
});

test("executable verifies object readback and preserves seeded and editorial history", async () => {
  const source = await readFile(
    new URL("./methodologies-reconciliation.ts", import.meta.url),
    "utf8",
  );
  assert.match(source, /NODE_ENV === "production"/);
  assert.match(source, /REPLIT_DEPLOYMENT === "1"/);
  assert.match(source, /--target=development/);
  assert.match(source, /object\.download\(\)/);
  assert.match(source, /createHash\("sha256"\)\.update\(stored\)/);
  assert.match(source, /metadata\.metadata\?\.checksum/);
  assert.match(source, /metadata\.cacheControl/);
  assert.match(source, /cms_operation_receipts/);
  assert.match(source, /cms_landing_page_reconciliation/);
  assert.match(source, /landing-page-inventory\.json/);
  assert.match(source, /Drizzle schema push synchronizes table shape but does not execute migration/);
  assert.match(source, /INSERT INTO cms_documents\(kind,canonical_slug,title,status\)/);
  assert.match(source, /Existing \/methodologies compiled authority differs from generated inventory/);
  assert.match(source, /revision_number\) !== 1/);
  assert.match(source, /VALUES \(\$1,2,1,\$2,\$3,'approved'/);
  assert.match(source, /Refusing to replace an existing/);
  assert.match(source, /editorial history; preserving it/);
  assert.match(source, /FOR UPDATE OF d,e/);
  assert.match(source, /"BEGIN READ ONLY"/);
  assert.match(source, /Concurrent \/methodologies publication change detected/);
  assert.match(source, /media_version_id/);
  assert.doesNotMatch(source, /UPDATE cms_revisions|DELETE FROM cms_revisions/);
  assert.doesNotMatch(source, /UPDATE cms_operation_receipts|DELETE FROM cms_operation_receipts/);
  assert.doesNotMatch(source, /UPDATE cms_media_assets|UPDATE cms_media_versions/);
});

test("post-merge does not rely on Drizzle push executing generated seed SQL", async () => {
  const [hook, databasePackage, preparation, migration] = await Promise.all([
    readFile(new URL("../../post-merge.sh", import.meta.url), "utf8"),
    readFile(new URL("../../../lib/db/package.json", import.meta.url), "utf8"),
    readFile(new URL("../../../lib/db/scripts/schema-preparation.mjs", import.meta.url), "utf8"),
    readFile(new URL("../../../lib/db/migrations/0019_cms_landing_page_contract.sql", import.meta.url), "utf8"),
  ]);
  assert.match(databasePackage, /drizzle-kit push --force/);
  assert.doesNotMatch(preparation, /cms_landing_page_reconciliation|compiled:\/methodologies/);
  assert.ok(
    hook.indexOf("push-force") < hook.indexOf("cms:reconcile-methodologies-hero"),
    "narrow reconciliation must run after table-shape synchronization",
  );
  assert.match(
    hook,
    /cms:reconcile-methodologies-hero -- --apply-db --target=development/,
  );
  assert.ok(
    hook.indexOf("--apply-db --target=development")
      < hook.indexOf("--verify-db --target=development"),
    "post-merge must verify live delivery after applying reconciliation",
  );
  assert.match(
    hook,
    /cms:reconcile-methodologies-hero -- --verify-db --target=development/,
  );
  assert.match(migration, /compiled:\/methodologies/);
  assert.match(migration, /methodologies-hero-media/);
});
