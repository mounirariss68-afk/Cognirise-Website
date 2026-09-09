import assert from "node:assert/strict";
import test from "node:test";
import { pool } from "@workspace/db";
import {
  DELETE_DOCUMENT_SQL,
  DOCUMENT_SELECT_SQL,
  PUBLIC_KIND_CONFIGURATION_SQL,
} from "../src/lib/document-lifecycle-sql";

test("PostgreSQL preserves office publication authority across archive and restore", {
  concurrency: false,
  skip: !process.env.DATABASE_URL,
}, async () => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TEMP TABLE cms_documents (
        id uuid PRIMARY KEY,
        kind text NOT NULL,
        canonical_slug text,
        title text NOT NULL,
        owner_id uuid,
        status text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      ) ON COMMIT DROP
    `);
    await client.query(`
      CREATE TEMP TABLE cms_market_editions (
        id uuid PRIMARY KEY,
        document_id uuid NOT NULL,
        market text NOT NULL,
        locale text NOT NULL,
        localized_slug text,
        publication_state text NOT NULL,
        publish_at timestamptz,
        published_at timestamptz,
        published_revision_id uuid,
        created_at timestamptz NOT NULL DEFAULT now()
      ) ON COMMIT DROP
    `);
    await client.query(`
      CREATE TEMP TABLE cms_revisions (
        id uuid PRIMARY KEY,
        edition_id uuid NOT NULL,
        revision_number integer NOT NULL,
        payload jsonb NOT NULL,
        workflow_state text NOT NULL
      ) ON COMMIT DROP
    `);
    await client.query(`
      CREATE TEMP TABLE cms_audit_events (
        target_type text NOT NULL,
        target_id text NOT NULL,
        action text NOT NULL,
        metadata jsonb
      ) ON COMMIT DROP
    `);

    const publishedOfficeId = "00000000-0000-4000-8000-000000000101";
    const publishedEditionId = "00000000-0000-4000-8000-000000000102";
    const publishedRevisionId = "00000000-0000-4000-8000-000000000103";
    await client.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,status)
       VALUES ($1,'office','office-published','Published office','active')`,
      [publishedOfficeId],
    );
    await client.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,localized_slug,publication_state)
       VALUES ($1,$2,'uae','en','office-published','draft')`,
      [publishedEditionId, publishedOfficeId],
    );
    await client.query(
      `INSERT INTO cms_revisions
         (id,edition_id,revision_number,payload,workflow_state)
       VALUES ($1,$2,1,'{}'::jsonb,'approved')`,
      [publishedRevisionId, publishedEditionId],
    );

    const configured = async () => {
      const result = await client.query(PUBLIC_KIND_CONFIGURATION_SQL, ["office"]);
      return Boolean(result.rows[0]?.is_configured);
    };
    assert.equal(await configured(), false, "approval is not publication history");

    await client.query(
      `UPDATE cms_market_editions
          SET publication_state='scheduled',publish_at=now() + interval '1 day'
        WHERE id=$1`,
      [publishedEditionId],
    );
    await client.query(
      `INSERT INTO cms_audit_events(target_type,target_id,action,metadata)
       VALUES ('document',$1,'document.published','{"scheduled":true}'::jsonb)`,
      [publishedOfficeId],
    );
    assert.equal(await configured(), false, "scheduling is not completed publication history");

    await client.query(
      `UPDATE cms_market_editions
          SET publication_state='published',publish_at=NULL,published_at=now(),
              published_revision_id=$2
        WHERE id=$1`,
      [publishedEditionId, publishedRevisionId],
    );
    await client.query(
      `INSERT INTO cms_audit_events(target_type,target_id,action,metadata)
       VALUES ('document',$1,'document.published','{"scheduled":false}'::jsonb)`,
      [publishedOfficeId],
    );
    assert.equal(await configured(), true);

    const listed = await client.query(
      `${DOCUMENT_SELECT_SQL} WHERE d.id=$1`,
      [publishedOfficeId],
    );
    assert.equal(listed.rowCount, 1);
    assert.equal(listed.rows[0].can_permanently_delete, false);

    await client.query(
      "UPDATE cms_documents SET status='archived' WHERE id=$1",
      [publishedOfficeId],
    );
    await client.query(
      "UPDATE cms_market_editions SET publication_state='archived' WHERE document_id=$1",
      [publishedOfficeId],
    );
    await client.query(
      "UPDATE cms_documents SET status='active' WHERE id=$1",
      [publishedOfficeId],
    );
    await client.query(
      `UPDATE cms_market_editions
          SET publication_state='draft',publish_at=NULL,published_at=NULL,
              published_revision_id=NULL
        WHERE document_id=$1`,
      [publishedOfficeId],
    );
    const restored = await client.query(
      `${DOCUMENT_SELECT_SQL} WHERE d.id=$1`,
      [publishedOfficeId],
    );
    assert.equal(restored.rowCount, 1);
    assert.equal(restored.rows[0].can_permanently_delete, false);
    assert.equal(await configured(), true, "restore cannot reactivate compiled fallback");
    assert.equal(
      (await client.query(DELETE_DOCUMENT_SQL, [publishedOfficeId])).rowCount,
      0,
    );

    const neverPublishedOfficeId = "00000000-0000-4000-8000-000000000201";
    const neverPublishedEditionId = "00000000-0000-4000-8000-000000000202";
    await client.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,status)
       VALUES ($1,'office','office-never-published','Never-published office','active')`,
      [neverPublishedOfficeId],
    );
    await client.query(
      `INSERT INTO cms_market_editions
         (id,document_id,market,locale,localized_slug,publication_state)
       VALUES ($1,$2,'uae','en','office-never-published','draft')`,
      [neverPublishedEditionId, neverPublishedOfficeId],
    );
    const neverPublished = await client.query(
      `${DOCUMENT_SELECT_SQL} WHERE d.id=$1`,
      [neverPublishedOfficeId],
    );
    assert.equal(neverPublished.rowCount, 1);
    assert.equal(neverPublished.rows[0].can_permanently_delete, true);
    assert.equal(
      (await client.query(DELETE_DOCUMENT_SQL, [neverPublishedOfficeId])).rowCount,
      1,
    );
  } finally {
    await client.query("ROLLBACK");
    client.release();
  }
});