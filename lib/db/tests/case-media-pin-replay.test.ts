import assert from "node:assert/strict";
import test from "node:test";
import pg from "pg";
import { assessCaseMediaPin } from "../../../scripts/src/cms/case-visual-refresh.ts";

test("published media pins survive a later metadata-only version on importer replay", {
  skip: !process.env.DATABASE_URL,
}, async () => {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    await client.query("BEGIN");
    await client.query("SET LOCAL search_path TO pg_temp");
    await client.query(`
      CREATE TEMP TABLE cms_media_versions (
        id text PRIMARY KEY,
        asset_id text NOT NULL,
        version_number integer NOT NULL,
        checksum text NOT NULL,
        storage_key text NOT NULL
      );
      CREATE TEMP TABLE cms_media_references (
        asset_id text NOT NULL,
        media_version_id text,
        document_id text NOT NULL,
        field_path text NOT NULL
      );
      INSERT INTO cms_media_versions
        (id, asset_id, version_number, checksum, storage_key)
      VALUES
        ('version-1', 'asset-1', 1, 'same-binary', 'cms-media/version-1'),
        ('version-2', 'asset-1', 2, 'same-binary', 'cms-media/version-2');
      INSERT INTO cms_media_references
        (asset_id, media_version_id, document_id, field_path)
      VALUES
        ('asset-1', 'version-1', 'case-1', 'revision:published-1');
    `);
    const referenceResult = await client.query(`
      SELECT asset_id AS "assetId", media_version_id AS "mediaVersionId"
        FROM cms_media_references
       WHERE document_id = 'case-1'
         AND field_path = 'revision:published-1'
    `);
    const pinnedResult = await client.query(`
      SELECT id, asset_id AS "assetId", checksum, storage_key AS "storageKey"
        FROM cms_media_versions
       WHERE id = $1
         AND asset_id = 'asset-1'
    `, [referenceResult.rows[0].mediaVersionId]);
    const latestResult = await client.query(`
      SELECT id
        FROM cms_media_versions
       WHERE asset_id = 'asset-1'
         AND checksum = 'same-binary'
       ORDER BY version_number DESC
       LIMIT 1
    `);

    assert.equal(latestResult.rows[0].id, "version-2");
    assert.equal(referenceResult.rows[0].mediaVersionId, "version-1");
    assert.equal(assessCaseMediaPin({
      expectedAssetId: "asset-1",
      expectedChecksum: "same-binary",
      references: referenceResult.rows,
      pinnedVersion: pinnedResult.rows[0],
    }), "valid");
  } finally {
    await client.query("ROLLBACK").catch(() => {});
    await client.end();
  }
});