import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { repositoryRoot } from "./common.js";

const output = process.argv.slice(2).find((argument) => argument.startsWith("--out="))?.slice(6)
  ?? path.join(repositoryRoot, "scripts/cms/output/banking-published-baseline.json");

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

/**
 * Captures the delivered CMS authority before a Financial Services successor
 * is authored. The snapshot deliberately copies case payloads and immutable
 * pins verbatim: it is a comparison receipt, never a case migration source.
 */
async function main() {
  const { pool } = await import("@workspace/db");
  try {
    const page = await pool.query(
      `SELECT d.id::text document_id,d.canonical_slug,e.id::text edition_id,e.market,e.locale,
              e.publication_state,e.published_revision_id::text,r.revision_number,r.workflow_state,
              r.content_digest,r.payload
         FROM cms_documents d
         JOIN cms_market_editions e ON e.document_id=d.id
         LEFT JOIN cms_revisions r ON r.id=e.published_revision_id
         WHERE d.kind='industry' AND d.canonical_slug='financial-services'
           AND e.market='uae' AND e.locale='en'
         ORDER BY e.market,e.locale`,
    );
    const caseRows = await pool.query(
      `SELECT d.id::text document_id,d.canonical_slug,e.id::text edition_id,e.market,e.locale,
              e.publication_state,e.published_revision_id::text,r.revision_number,r.workflow_state,
              r.content_digest,r.payload
         FROM cms_documents d
         JOIN cms_market_editions e ON e.document_id=d.id
         JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE d.kind='case-study'
          AND e.publication_state='published'
          AND r.workflow_state='approved'
           AND e.market='uae'
           AND e.locale='en'
          AND COALESCE(r.payload->'content'->>'visibility','public')='public'
          AND COALESCE(r.payload->'content'->>'disclosure','restricted')<>'restricted'
          AND COALESCE(r.payload->'content'->'relatedIndustries','[]'::jsonb) ? 'financial-services'
        ORDER BY e.market,e.locale,(r.payload->'content'->>'order')::int,d.canonical_slug`,
    );
    const revisionIds = [
      ...page.rows.map((row) => String(row.published_revision_id ?? "")).filter(Boolean),
      ...caseRows.rows.map((row) => String(row.published_revision_id)),
    ];
    const pins = revisionIds.length
      ? await pool.query(
        `SELECT ref.document_id::text,ref.field_path,ref.asset_id::text,ref.media_version_id::text,
                a.checksum,a.byte_size,v.storage_key,v.width,v.height
           FROM cms_media_references ref
           JOIN cms_media_assets a ON a.id=ref.asset_id
           JOIN cms_media_versions v ON v.id=ref.media_version_id
          WHERE ref.field_path = ANY($1::text[])
          ORDER BY ref.document_id,ref.field_path,ref.asset_id`,
        [revisionIds.map((revisionId) => `revision:${revisionId}`)],
      )
      : { rows: [] };
    const baseline = {
      schemaVersion: 1,
      capturedAt: new Date().toISOString(),
      scope: "Published UAE/en Financial Services page and its UAE/en public selected-work case payloads; read-only comparison receipt.",
      page: page.rows,
      cases: caseRows.rows,
      immutableMediaPins: pins.rows,
    };
    const receipt = { ...baseline, digest: digest(baseline) };
    await mkdir(path.dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, { mode: 0o600 });
    console.log(`Captured Financial Services published baseline: pageEditions=${page.rowCount ?? 0} cases=${caseRows.rowCount ?? 0} ${output}`);
  } finally {
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});