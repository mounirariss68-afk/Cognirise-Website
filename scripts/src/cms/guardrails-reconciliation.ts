import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { guardrailsFixture } from "./guardrails-fixture.js";

const apply = process.argv.includes("--apply-db");
const verify = process.argv.includes("--verify-db");
const target = process.argv.find((argument) => argument.startsWith("--target="))?.slice(9);
export const GUARDRAILS_STAGE_RECEIPT = "cms.guardrails.page.stage-v1";
const OPERATION = "cms.framework.guardrails-page-staged";
const STAGING_AUTHOR_EMAIL = "cms-guardrails-framework@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Guardrails Framework draft reconciliation";

const canonical = (value: unknown) => JSON.stringify(value, (_key, item) => {
  if (!item || typeof item !== "object" || Array.isArray(item)) return item;
  return Object.fromEntries(Object.entries(item as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)));
});
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const snapshot = {
  slug: guardrailsFixture.slug,
  title: guardrailsFixture.title,
  summary: guardrailsFixture.summary,
  content: guardrailsFixture.content,
  seo: guardrailsFixture.seo,
  mediaIds: guardrailsFixture.mediaIds,
  markets: guardrailsFixture.markets,
};
const requestDigest = digest(snapshot);

function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Guardrails draft staging is disabled in production.");
  }
  if (target !== "development") throw new Error("Database work requires --target=development.");
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

async function reconcile() {
  const validation = validateCmsSnapshot("framework", snapshot, "draft");
  if (!validation.success) throw new Error(`Guardrails fixture violates the CMS contract: ${validation.errors.join("; ")}`);
  if (!apply && !verify) {
    console.log("Guardrails reconciliation is dry-run only. Use --verify-db or --apply-db.");
    return;
  }
  assertDevelopmentTarget();
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    // The transaction advisory lock covers the absent-document case as well as
    // row locks, so two post-merge runners cannot create competing editions.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [GUARDRAILS_STAGE_RECEIPT]);
    const receipt = await client.query(
      `SELECT operation,subject_id,request_digest,result_digest FROM cms_operation_receipts
        WHERE idempotency_key=$1 FOR UPDATE`,
      [GUARDRAILS_STAGE_RECEIPT],
    );
    if (receipt.rowCount) {
      if (receipt.rowCount !== 1 || receipt.rows[0].operation !== OPERATION || receipt.rows[0].request_digest !== requestDigest) {
        throw new Error("Guardrails staging receipt conflicts with this reviewed fixture; no content was changed.");
      }
      const revision = await client.query(
        `SELECT revision.payload,revision.workflow_state,edition.publication_state
           FROM cms_revisions revision
           JOIN cms_market_editions edition ON edition.id=revision.edition_id
          WHERE revision.id=$1`,
        [receipt.rows[0].subject_id],
      );
      if (
        revision.rowCount !== 1
        || revision.rows[0].workflow_state !== "draft"
        || revision.rows[0].publication_state !== "draft"
        || digest(revision.rows[0].payload) !== receipt.rows[0].result_digest
      ) throw new Error("Guardrails staging receipt no longer identifies its immutable hidden draft.");
      await client.query("COMMIT");
      console.log(`Verified staged Guardrails revision ${receipt.rows[0].subject_id}; no preview capability was created.`);
      return;
    }
    if (verify) throw new Error("Guardrails stage receipt is absent; run the reviewed --apply-db operation first.");
    const actor = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
       VALUES ($1,$2,'editor','active',now())
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id::text,email`,
      [STAGING_AUTHOR_EMAIL, STAGING_AUTHOR_LABEL],
    );
    if (actor.rowCount !== 1) throw new Error("Could not provision the controlled Guardrails draft reconciliation editor.");
    const existing = await client.query(
      `SELECT id::text,kind,status FROM cms_documents WHERE canonical_slug=$1 FOR UPDATE`,
      [guardrailsFixture.slug],
    );
    let documentId: string;
    if (!existing.rowCount) {
      const inserted = await client.query(
        `INSERT INTO cms_documents(kind,canonical_slug,title,status)
          VALUES ('framework',$1,$2,'active') RETURNING id::text`,
        [guardrailsFixture.slug, guardrailsFixture.title],
      );
      documentId = inserted.rows[0].id;
    } else {
      if (existing.rowCount !== 1 || existing.rows[0].kind !== "framework" || existing.rows[0].status !== "active") {
        throw new Error("The guardrails slug is already owned by a different or inactive document; refusing to overwrite it.");
      }
      documentId = existing.rows[0].id;
    }
    const edition = await client.query(
      `SELECT id::text,publication_state FROM cms_market_editions
        WHERE document_id=$1 AND market='uae' AND locale='en' FOR UPDATE`,
      [documentId],
    );
    let editionId: string;
    if (!edition.rowCount) {
      const inserted = await client.query(
      `INSERT INTO cms_market_editions(document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete)
          VALUES ($1,'uae','en',$2,'draft','none',false) RETURNING id::text`,
        [documentId, guardrailsFixture.slug],
      );
      editionId = inserted.rows[0].id;
    } else {
      if (edition.rowCount !== 1 || edition.rows[0].publication_state !== "draft") {
        throw new Error("The Guardrails UAE/English edition is not a draft; reconciliation never modifies a published destination.");
      }
      editionId = edition.rows[0].id;
    }
    const priorRevisions = await client.query(
      "SELECT id FROM cms_revisions WHERE edition_id=$1 LIMIT 1",
      [editionId],
    );
    if (priorRevisions.rowCount) {
      throw new Error("The Guardrails edition already has editorial work without this staging receipt; refusing to supersede it.");
    }
    const revision = await client.query(
      `INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason)
        SELECT $1,COALESCE(max(revision_number),0)+1,1,$2,$3,'draft',$4,$5 FROM cms_revisions WHERE edition_id=$1
        RETURNING id::text,payload`,
      [editionId, snapshot, digest(snapshot), actor.rows[0].id,
        "Guardrails page review-stage reconciliation. Sources, factual claims, verification, and review dates remain outstanding; no publication or preview capability was authorized."],
    );
    const revisionId = revision.rows[0].id;
    const resultDigest = digest(revision.rows[0].payload);
    await client.query(
      `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
        VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
      [GUARDRAILS_STAGE_RECEIPT, OPERATION, revisionId, requestDigest, resultDigest, actor.rows[0].id,
        { documentId, editionId, revisionId, publicationState: "draft", preview: "issue through the authenticated CMS preview endpoint" }],
    );
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
        VALUES ($1,$2,'document.draft-staged','document',$3,$4,$5)`,
      [actor.rows[0].id, actor.rows[0].email, documentId, GUARDRAILS_STAGE_RECEIPT, {
        editionId, revisionId, publicationState: "draft", sourceReview: "outstanding",
        note: "No preview token is persisted in a receipt or source file.",
      }],
    );
    await client.query("COMMIT");
    console.log(`Staged hidden Guardrails revision ${revisionId}. Issue a short-lived authorized browser preview through the CMS.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

void reconcile().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});