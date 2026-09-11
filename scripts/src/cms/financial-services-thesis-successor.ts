import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  canonicalResultDigest,
  financialServicesThesisSuccessorPlan,
  FINANCIAL_SERVICES_GOVERNED_THESIS,
  migrationOperations,
  type MigrationOperation,
} from "./migration.js";
import { emitJson, outputPath, repositoryRoot } from "./common.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const write = args.includes("--write");
const reportConflict = args.includes("--report-conflict");
const target = args.find((item) => item.startsWith("--target="))?.slice(9);
const destination = args.find((item) => item.startsWith("--out="))?.slice(6);
const input = args.find((item) => item.startsWith("--in="))?.slice(5)
  ?? "scripts/cms/output/inventory.json";
const baselinePath = args.find((item) => item.startsWith("--baseline="))?.slice(11)
  ?? path.join(repositoryRoot, "scripts/cms/output/banking-published-baseline.json");

const OPERATION = "cms.inventory.financial-services-thesis-successor-published";
const RECEIPT_PREFIX = "cms-industry-financial-services-thesis-v13:";

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");

interface Inventory {
  schemaVersion: number;
  manifestDigest: string;
  records: Array<{
    externalId: string;
    type: "person" | "partner" | "platform" | "article" | "case-study" | "industry" | "framework" | "asset";
    name: string;
    sourceFile: string;
    fields: Record<string, unknown>;
    review: { status: "needs-review" | "approved"; reasons: string[] };
  }>;
}

interface BankingBaseline {
  schemaVersion: number;
  capturedAt: string;
  scope: string;
  page: Array<{
    document_id: string;
    canonical_slug: string;
    edition_id: string;
    market: string;
    locale: string;
    publication_state: string;
    published_revision_id: string;
    revision_number: number;
    workflow_state: string;
    content_digest: string;
    payload: Record<string, unknown>;
  }>;
  cases: unknown[];
  immutableMediaPins: Array<{
    document_id: string;
    field_path: string;
    asset_id: string;
    media_version_id: string | null;
    checksum: string;
    byte_size: number;
  }>;
}

function receiptKey(operation: MigrationOperation) {
  return `${RECEIPT_PREFIX}${operation.externalId}`;
}

function resultDigest(input: {
  documentId: string;
  editionId: string;
  revisionId: string;
  candidateDigest: string;
}) {
  return digest({ ...input, publicationState: "published" });
}

async function readOperation() {
  const inventory = JSON.parse(await readFile(path.join(repositoryRoot, input), "utf8")) as Inventory;
  if (inventory.schemaVersion !== 2 || !inventory.manifestDigest || !Array.isArray(inventory.records)) {
    throw new Error("Unsupported or invalid CMS inventory file.");
  }
  const [operation] = migrationOperations(inventory.records).filter((candidate) =>
    candidate.kind === "industry" && candidate.slug === "financial-services",
  );
  if (!operation) throw new Error("Financial Services inventory operation is unavailable.");
  if (operation.idempotencyKey !== `${RECEIPT_PREFIX}${operation.externalId}`) {
    throw new Error(`Unexpected Financial Services successor operation key: ${operation.idempotencyKey}`);
  }
  if (
    (operation.payload.content as Record<string, unknown> | undefined)?.thesis
      !== FINANCIAL_SERVICES_GOVERNED_THESIS
  ) {
    throw new Error("Financial Services inventory does not contain the exact governed successor thesis.");
  }
  return operation;
}

async function readBaseline() {
  const stored = JSON.parse(await readFile(baselinePath, "utf8")) as BankingBaseline & { digest?: string };
  const { digest: baselineDigest, ...baseline } = stored;
  if (!baselineDigest || digest(baseline) !== baselineDigest) {
    throw new Error("Banking baseline receipt is missing or digest-invalid; take a new read-only snapshot before mutation.");
  }
  const page = baseline.page.find((item) =>
    item.canonical_slug === "financial-services" && item.market === "uae" && item.locale === "en",
  );
  if (
    !page
    || page.publication_state !== "published"
    || page.workflow_state !== "approved"
    || !page.published_revision_id
  ) {
    throw new Error("Banking baseline has no approved UAE/en Financial Services publication.");
  }
  return { baseline, baselineDigest, page };
}

function baselineReferences(
  baseline: BankingBaseline,
  page: BankingBaseline["page"][number],
) {
  return baseline.immutableMediaPins
    .filter((pin) =>
      pin.document_id === page.document_id
      && pin.field_path === `revision:${page.published_revision_id}`,
    )
    .map(({ asset_id: assetId, media_version_id: mediaVersionId }) => ({
      assetId,
      mediaVersionId,
    }));
}

async function dryRun(operation: MigrationOperation, baseline: Awaited<ReturnType<typeof readBaseline>>) {
  const references = baselineReferences(baseline.baseline, baseline.page);
  const plan = financialServicesThesisSuccessorPlan({
    slug: baseline.page.canonical_slug,
    market: baseline.page.market,
    locale: baseline.page.locale,
    publicationState: baseline.page.publication_state,
    publishedRevisionId: baseline.page.published_revision_id,
    latestRevision: {
      id: baseline.page.published_revision_id,
      workflowState: baseline.page.workflow_state,
    },
    publishedPayload: baseline.page.payload,
    canonicalPayload: operation.payload,
    publishedReferences: references,
  });
  if (!plan) throw new Error("Financial Services baseline is not the exact approved thesis predecessor.");
  const validation = validateCmsSnapshot("industry", plan.payload, "publish");
  if (!validation.success) {
    throw new Error(`Financial Services thesis successor is not publication-ready: ${validation.errors.join("; ")}`);
  }
  return {
    task: 316,
    mode: "dry-run",
    disposition: "would-append-and-publish",
    operation: operation.idempotencyKey,
    requestDigest: operation.requestDigest,
    baselineDigest: baseline.baselineDigest,
    candidateDigest: canonicalResultDigest(validation.data),
    action: "Append one UAE/en successor revision changing only content.thesis; preserve the historical punctuation revision and its immutable media references.",
    publication: "Development only; no database or publication mutation occurred.",
  };
}

async function applySuccessor(
  operation: MigrationOperation,
  baseline: Awaited<ReturnType<typeof readBaseline>>,
) {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Financial Services thesis successor is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");

  const { pool } = await import("@workspace/db");
  const key = receiptKey(operation);
  const historicalOperationKey = `cms-industry-contract-v12:${operation.externalId}`;
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [key]);

    const livePage = await client.query(
      `SELECT d.id::text document_id,d.canonical_slug,e.id::text edition_id,e.market,e.locale,e.publication_state,
              e.published_revision_id::text,r.id::text revision_id,r.revision_number,
              r.payload_version,r.workflow_state,r.content_digest,r.payload
         FROM cms_documents d
         JOIN cms_market_editions e ON e.document_id=d.id
         JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE e.id=$1 AND d.canonical_slug='financial-services'
        FOR UPDATE OF e,r`,
      [baseline.page.edition_id],
    );
    const live = livePage.rows[0];
    if (
      !live
      || live.market !== "uae"
      || live.locale !== "en"
      || live.publication_state !== "published"
      || live.workflow_state !== "approved"
    ) {
      throw new Error("Financial Services UAE/en publication no longer matches the approved baseline.");
    }

    const latestResult = await client.query(
      `SELECT id::text,revision_number,payload_version,workflow_state,payload,content_digest
         FROM cms_revisions
        WHERE edition_id=$1
        ORDER BY revision_number DESC
        LIMIT 1
        FOR UPDATE`,
      [live.edition_id],
    );
    const latest = latestResult.rows[0];
    if (!latest) throw new Error("Financial Services has no revision chain.");

    const receiptResult = await client.query(
      `SELECT idempotency_key,operation,subject_id,request_digest,result_digest
         FROM cms_operation_receipts
        WHERE idempotency_key=$1`,
      [key],
    );
    const existingReceipt = receiptResult.rows[0];
    if (existingReceipt) {
      if (
        existingReceipt.request_digest !== operation.requestDigest
        || existingReceipt.subject_id !== live.document_id
        || existingReceipt.operation !== OPERATION
      ) {
        throw new Error("Financial Services thesis successor receipt conflicts with the stored operation.");
      }
      const auditResult = await client.query(
        `SELECT metadata
           FROM cms_audit_events
          WHERE request_id=$1
          ORDER BY created_at DESC
          LIMIT 1`,
        [key],
      );
      const metadata = auditResult.rows[0]?.metadata as Record<string, unknown> | undefined;
      const revisionId = typeof metadata?.revisionId === "string" ? metadata.revisionId : "";
      const candidateDigest = typeof metadata?.candidateDigest === "string"
        ? metadata.candidateDigest
        : "";
      if (
        latest.id !== live.revision_id
        || live.revision_id !== revisionId
        || latest.workflow_state !== "approved"
        || canonicalResultDigest(live.payload) !== candidateDigest
        || existingReceipt.result_digest !== resultDigest({
          documentId: live.document_id,
          editionId: live.edition_id,
          revisionId,
          candidateDigest,
        })
      ) {
        throw new Error(
          `Financial Services has a newer draft/review revision (latest=${latest.id}, published=${live.revision_id}, state=${latest.workflow_state}); preserving editorial authority.`,
        );
      }
      await client.query("COMMIT");
      transactionOpen = false;
      return {
        task: 316,
        mode: "apply",
        disposition: "replayed",
        operation: operation.idempotencyKey,
        requestDigest: operation.requestDigest,
        baselineDigest: baseline.baselineDigest,
        publishedRevisionId: revisionId,
        candidateDigest,
        publication: "The exact governed successor was already published; no new revision or media pin was created.",
      };
    }

    // This is the fail-closed authority check. A draft or review revision
    // after the approved publication is editorial work, not a merge target.
    if (latest.id !== live.revision_id || latest.workflow_state !== "approved") {
      throw new Error(
        `Financial Services has a newer draft/review revision (latest=${latest.id}, published=${live.revision_id}, state=${latest.workflow_state}); preserving editorial authority.`,
      );
    }
    if (
      live.content_digest !== baseline.page.content_digest
      || canonicalResultDigest(live.payload) !== canonicalResultDigest(baseline.page.payload)
    ) {
      throw new Error("Financial Services published payload changed since banking-published-baseline.json; preserving editorial authority.");
    }

    const historicalReceipt = await client.query(
      `SELECT operation,subject_id,request_digest
         FROM cms_operation_receipts
        WHERE idempotency_key=$1`,
      [historicalOperationKey],
    );
    if (historicalReceipt.rows[0] && (
      historicalReceipt.rows[0].subject_id !== live.document_id
      || ![
        "cms.inventory.industry-contract-baseline-published",
        "cms.inventory.industry-contract-editorial-preserved",
      ].includes(historicalReceipt.rows[0].operation)
    )) {
      throw new Error("Historical financial-services punctuation receipt is incompatible; no successor was written.");
    }

    const publishedPayload = live.payload as Record<string, unknown>;
    const publishedMediaIds = Array.isArray(publishedPayload.mediaIds)
      ? publishedPayload.mediaIds.filter((item): item is string => typeof item === "string")
      : [];
    const referencesResult = await client.query(
      `SELECT asset_id::text,media_version_id::text
         FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2
        ORDER BY asset_id`,
      [live.document_id, `revision:${live.revision_id}`],
    );
    const references = referencesResult.rows.map((reference: { asset_id: string; media_version_id: string | null }) => ({
      assetId: reference.asset_id,
      mediaVersionId: reference.media_version_id,
    }));
    const referenceIds = references.map((reference) => reference.assetId).sort();
    if (
      JSON.stringify([...publishedMediaIds].sort()) !== JSON.stringify(referenceIds)
      || references.some((reference) => !reference.mediaVersionId)
    ) {
      throw new Error("Financial Services published media references are not a complete immutable pin set.");
    }

    const plan = financialServicesThesisSuccessorPlan({
      slug: live.canonical_slug ?? "financial-services",
      market: live.market,
      locale: live.locale,
      publicationState: live.publication_state,
      publishedRevisionId: live.revision_id,
      latestRevision: { id: latest.id, workflowState: latest.workflow_state },
      publishedPayload,
      canonicalPayload: operation.payload,
      publishedReferences: references,
    });
    if (!plan) throw new Error("Financial Services baseline is not the exact approved thesis predecessor.");
    const validation = validateCmsSnapshot("industry", plan.payload, "publish");
    if (!validation.success) {
      throw new Error(`Financial Services thesis successor is not publication-ready: ${validation.errors.join("; ")}`);
    }
    const nextPayload = validation.data;
    const candidateDigest = canonicalResultDigest(nextPayload);
    const author = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status)
       VALUES('cms-financial-services-thesis-v13@service.invalid','Financial Services thesis successor service','viewer','suspended')
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id::text`,
    );
    const inserted = await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
         created_by_user_id,approved_by_user_id,approved_at,reason)
       VALUES($1,$2,$3,$4,$5,'approved',$6,$6,NOW(),
              'Task 316 governed Financial Services thesis successor; historical punctuation and immutable media preserved.')
       RETURNING id::text`,
      [
        live.edition_id,
        Number(latest.revision_number) + 1,
        Number(latest.payload_version ?? 1),
        nextPayload,
        digest(nextPayload),
        author.rows[0].id,
      ],
    );
    const revisionId = inserted.rows[0]?.id as string | undefined;
    if (!revisionId) throw new Error("Could not append the Financial Services thesis successor.");
    for (const reference of references) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
         VALUES($1,$2,$3,$4)`,
        [reference.assetId, reference.mediaVersionId, live.document_id, `revision:${revisionId}`],
      );
    }
    await client.query(
      `UPDATE cms_market_editions
           SET publication_state='published',published_revision_id=$1,
              published_at=NOW(),updated_at=NOW()
        WHERE id=$2`,
      [revisionId, live.edition_id],
    );
    const successorResultDigest = resultDigest({
      documentId: live.document_id,
      editionId: live.edition_id,
      revisionId,
      candidateDigest,
    });
    await client.query(
      `INSERT INTO cms_operation_receipts
        (idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES($1,$2,$3,$4,$5)`,
      [key, OPERATION, live.document_id, operation.requestDigest, successorResultDigest],
    );
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES($1,'cms-financial-services-thesis-v13',$2,'industry',$3,$4,$5)`,
      [
        author.rows[0].id,
        OPERATION,
        live.document_id,
        key,
        {
          task: 316,
          baselineDigest: baseline.baselineDigest,
          historicalReceiptKey: historicalOperationKey,
          previousRevisionId: live.revision_id,
          revisionId,
          candidateDigest,
          thesis: FINANCIAL_SERVICES_GOVERNED_THESIS,
          market: live.market,
          locale: live.locale,
          preservedMediaReferenceCount: references.length,
          publicationState: "published",
        },
      ],
    );
    await client.query("COMMIT");
    transactionOpen = false;
    return {
      task: 316,
      mode: "apply",
      disposition: "published",
      operation: operation.idempotencyKey,
      requestDigest: operation.requestDigest,
      baselineDigest: baseline.baselineDigest,
      previousRevisionId: live.revision_id,
      publishedRevisionId: revisionId,
      candidateDigest,
      preservedMediaReferenceCount: references.length,
      publication: "Published the exact UAE/en thesis successor through the development CMS transaction; all unrelated payload fields and immutable media pins were copied unchanged.",
    };
  } catch (error) {
    if (transactionOpen) await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  const operation = await readOperation();
  const baseline = await readBaseline();
  const outcome = apply ? await applySuccessor(operation, baseline) : await dryRun(operation, baseline);
  await emitJson(outcome, outputPath(destination, "financial-services-thesis-successor-receipt.json"), write);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (reportConflict) {
      await emitJson({
        task: 316,
        mode: apply ? "apply" : "dry-run",
        disposition: "preserved-conflict",
        error: message,
        action: "No Financial Services draft, publication pointer, unrelated payload field, media pin, historical receipt, or market override was overwritten.",
        recommendedEditorialResolution: "Have the editorial owner incorporate the approved thesis into the existing Financial Services draft without discarding its other edits, then review and publish it through the normal CMS controls. Rejecting a draft alone does not make this automatic successor eligible; it requires latest revision to equal the approved published revision.",
      }, outputPath(destination, "financial-services-thesis-successor-receipt.json"), true);
      console.error(`Financial Services thesis successor preserved editorial state: ${message}`);
      return;
    }
    console.error(message);
    process.exitCode = 1;
  });
}