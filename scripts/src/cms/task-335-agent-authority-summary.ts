import { createHash } from "node:crypto";
import {
  collectCmsMediaReferences,
  type CmsCollectedMediaReference,
  type FrameworkGuardrailsSummary,
  validateCmsSnapshot,
} from "@workspace/api-zod";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const verify = args.includes("--verify-db");
const repairMedia = args.includes("--repair-media-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

export const TASK_335_SUMMARY_RECEIPT = "cms.agent-authority.guardrails-summary-v1";
export const TASK_335_SUMMARY_OPERATION = "cms.framework.guardrails-summary-draft-staged";
export const TASK_335_MEDIA_REPAIR_RECEIPT = "cms.agent-authority.guardrails-summary-media-repair-v1";
export const TASK_335_MEDIA_REPAIR_OPERATION = "cms.framework.guardrails-summary-media-repaired";
const STAGING_AUTHOR_EMAIL = "cms-agent-authority-guardrails-summary@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Agent Authority summary reconciliation";
const STAGING_REASON =
  "Task 335: staged the governed Guardrails and authority summary for UAE/English editorial review; no publication decision made.";
const TARGET_SLUG = "agent-authority-model";
const TARGET_TEMPLATE = "agent-authority";

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export const task335Summary: FrameworkGuardrailsSummary = {
  lead: "Guardrails enforce limits. The authority model decides who can do what, under which controls, and who is accountable.",
  handover: "A handover is the moment an agent's output becomes consequential for someone else.",
  rules: [
    {
      title: "Exposure sets the maximum autonomy",
      body: "Exposure sets the maximum autonomy. A more capable model or a generic safety filter cannot raise that ceiling.",
    },
    {
      title: "Measured evidence supports promotion",
      body: "Every handover launches one level below its target authority and moves up only on measured evidence within its exposure limit. An incident demotes it automatically.",
    },
    {
      title: "Required controls must be testable",
      body: "Required controls must be provable by a test, query or artefact—not an assurance—before the handover operates.",
    },
    {
      title: "Approved artefacts can carry authority",
      body: "An approved template, deterministic rule, whitelisted parameter range or blocking gate can carry authority instead of unrestricted agent discretion.",
    },
  ],
  caveat: "A compensating control raises the ceiling only when consequential content is constrained by construction. It does not make unrestricted agent discretion safe.",
  disclosureLabel: "Read the full explanation",
  firstFigure: {
    asset: "aam-guardrails-vs-authority.svg",
    altText: "One front-desk agent sends four handovers along a shared rail; each handover is governed separately by its consequence and required authority.",
    captionLabel: "Illustration 1 —",
    captionLead: "One common setting, or individually governed handovers—the Agent Authority Model governs each handover.",
    captionBody: "Illustrated pattern: one common setting can contain four handovers, but each is governed separately by consequence, exposure and authority. This is illustrative, not an agent-wide claim.",
  },
};

export type SummaryDraftResult = {
  disposition: "validated" | "staged" | "repaired" | "replayed";
  documentId?: string;
  editionId?: string;
  revisionId: string;
  sourceRevisionId?: string;
  publicationState: string;
  publishedRevisionId?: string | null;
};

type SummaryTarget = {
  kind: string;
  canonicalSlug: string;
  documentStatus?: string;
};

/**
 * Keep this operation tied to the exact framework contract. The SQL target
 * narrows the document row, while this guard prevents a mismatched payload
 * or a future template rename from being treated as safe additive content.
 */
export function assertTask335FrameworkSource(payload: unknown, target?: SummaryTarget) {
  if (target && (
    target.kind !== "framework"
    || target.canonicalSlug !== TARGET_SLUG
    || (target.documentStatus && target.documentStatus !== "active")
  )) {
    throw new Error("Task 335 requires the active framework document with canonical slug agent-authority-model.");
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("Task 335 requires an object payload for the Agent Authority Model framework.");
  }
  const source = payload as Record<string, any>;
  if (source.slug !== TARGET_SLUG) {
    throw new Error("Task 335 refuses a framework payload whose slug is not agent-authority-model.");
  }
  if (!source.content || typeof source.content !== "object" || Array.isArray(source.content)) {
    throw new Error("Task 335 requires an Agent Authority Model content object.");
  }
  if (source.content.template !== TARGET_TEMPLATE) {
    throw new Error("Task 335 refuses a framework payload whose template is not agent-authority.");
  }
}

export function assertCurrentSummarySource(input: {
  sourceId: string;
  sourceWorkflowState: string;
  sourceRevisionId: string | null;
  publishedRevisionId: string | null;
  publishedWorkflowState?: string | null;
  lineageIncludesPublished?: boolean;
}) {
  if (input.publishedRevisionId && input.publishedWorkflowState !== "approved") {
    throw new Error("Task 335 refuses a publication pointer that does not identify an approved revision.");
  }
  if (input.sourceId === input.publishedRevisionId) return;
  if (input.sourceWorkflowState !== "draft") {
    throw new Error("Task 335 refuses a non-draft revision that is not the current published source.");
  }
  if (input.publishedRevisionId && !input.lineageIncludesPublished) {
    throw new Error("Task 335 refuses a stale draft source that does not descend from the current published revision.");
  }
  if (!input.sourceRevisionId && input.publishedRevisionId) {
    throw new Error("Task 335 refuses a draft source with no published predecessor.");
  }
}

export function assertLatestReceiptRevision(latestRevisionId: string, receiptRevisionId: string) {
  if (latestRevisionId !== receiptRevisionId) {
    throw new Error("Task 335 summary receipt conflicts with a newer editorial revision; preserving the newer draft.");
  }
}

type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{
    rowCount: number | null;
    rows: Record<string, any>[];
  }>;
};

export type Task335MediaPin = {
  assetId: string;
  mediaVersionId: string;
};

function normalizeMediaPins(pins: readonly Task335MediaPin[]) {
  return [...pins]
    .map((pin) => ({ assetId: String(pin.assetId), mediaVersionId: String(pin.mediaVersionId) }))
    .sort((left, right) => `${left.assetId}:${left.mediaVersionId}`.localeCompare(`${right.assetId}:${right.mediaVersionId}`));
}

/**
 * Resolve every media id collected from the revision against the exact pins
 * carried by its source revision. No latest-version fallback is permitted.
 */
export function collectTask335MediaPins(
  payload: Record<string, any>,
  sourcePins: readonly Task335MediaPin[],
): Task335MediaPin[] {
  const collected = collectCmsMediaReferences(
    "framework",
    payload.content,
    Array.isArray(payload.mediaIds) ? payload.mediaIds : [],
  );
  const candidates = new Map<string, string | undefined>();
  for (const reference of collected as CmsCollectedMediaReference[]) {
    const assetId = String(reference.mediaId);
    const versionId = reference.mediaVersionId ? String(reference.mediaVersionId) : undefined;
    const prior = candidates.get(assetId);
    if (prior && versionId && prior !== versionId) {
      throw new Error(`Task 335 media contract has conflicting versions for asset ${assetId}.`);
    }
    candidates.set(assetId, versionId ?? prior);
  }
  const source = new Map<string, string>();
  for (const pin of sourcePins) {
    const assetId = String(pin.assetId);
    const versionId = String(pin.mediaVersionId);
    const prior = source.get(assetId);
    if (prior && prior !== versionId) {
      throw new Error(`Task 335 source revision has conflicting pins for asset ${assetId}.`);
    }
    source.set(assetId, versionId);
  }
  if (candidates.size !== source.size || [...candidates.keys()].some((assetId) => !source.has(assetId))) {
    throw new Error("Task 335 governed media set differs from the exact source-revision pins.");
  }
  return normalizeMediaPins([...candidates.entries()].map(([assetId, requestedVersion]) => {
    const sourceVersion = source.get(assetId);
    if (!sourceVersion || (requestedVersion && requestedVersion !== sourceVersion)) {
      throw new Error(`Task 335 media asset ${assetId} does not retain its exact source-revision pin.`);
    }
    return { assetId, mediaVersionId: sourceVersion };
  }));
}

export function assertExactTask335MediaPins(
  expected: readonly Task335MediaPin[],
  actual: readonly Task335MediaPin[],
) {
  if (canonicalJson(normalizeMediaPins(expected)) !== canonicalJson(normalizeMediaPins(actual))) {
    throw new Error("Task 335 staged revision media references do not match the complete governed source-revision pin set.");
  }
}

async function readTask335MediaPins(client: SqlClient, documentId: string, revisionId: string): Promise<Task335MediaPin[]> {
  const result = await client.query(
    `SELECT asset_id::text,media_version_id::text
       FROM cms_media_references
      WHERE document_id=$1 AND field_path=$2
      ORDER BY asset_id,media_version_id`,
    [documentId, `revision:${revisionId}`],
  );
  return result.rows.map((row) => {
    if (!row.media_version_id) {
      throw new Error(`Task 335 media reference for asset ${row.asset_id} has no immutable version pin.`);
    }
    return { assetId: String(row.asset_id), mediaVersionId: String(row.media_version_id) };
  });
}

async function expectedTask335MediaPins(
  client: SqlClient,
  documentId: string,
  revisionId: string,
  payload: Record<string, any>,
  sourceRevisionId: string,
): Promise<Task335MediaPin[]> {
  const sourceRevision = await client.query(
    `SELECT payload
       FROM cms_revisions
      WHERE id=$1 AND edition_id=(SELECT edition_id FROM cms_revisions WHERE id=$2)`,
    [sourceRevisionId, revisionId],
  );
  if (sourceRevision.rowCount !== 1) {
    throw new Error("Task 335 cannot prove the exact source revision for governed media pins.");
  }
  const sourcePins = await readTask335MediaPins(client, documentId, sourceRevisionId);
  return collectTask335MediaPins(payload, sourcePins)
    .map((pin) => ({ ...pin }));
}

async function repairTask335MediaPins(
  client: SqlClient,
  document: Record<string, any>,
  revision: Record<string, any>,
  expectedPins: readonly Task335MediaPin[],
  actualPins: readonly Task335MediaPin[],
): Promise<SummaryDraftResult> {
  const repairReceipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts
      WHERE idempotency_key=$1
      FOR UPDATE`,
    [TASK_335_MEDIA_REPAIR_RECEIPT],
  );
  if ((repairReceipt.rowCount ?? 0) > 1) {
    throw new Error("Task 335 media repair has duplicate receipts; preserving the staged revision.");
  }
  const repairRequest = {
    revisionId: String(revision.id),
    sourceRevisionId: String(revision.source_revision_id),
    mediaPins: normalizeMediaPins(expectedPins),
  };
  const expectedResult = {
    disposition: "repaired" as const,
    documentId: String(document.document_id),
    editionId: String(document.edition_id),
    revisionId: String(revision.id),
    sourceRevisionId: String(revision.source_revision_id),
    publicationState: String(document.publication_state),
    publishedRevisionId: document.published_revision_id ? String(document.published_revision_id) : null,
    mediaPins: normalizeMediaPins(expectedPins),
  };
  if (repairReceipt.rowCount === 1) {
    const audit = await client.query(
      `SELECT metadata
         FROM cms_audit_events
        WHERE request_id=$1 AND action='document.media-references-repaired'
          AND target_type='document' AND target_id=$2
        ORDER BY occurred_at DESC LIMIT 2`,
      [TASK_335_MEDIA_REPAIR_RECEIPT, document.document_id],
    );
    if (audit.rowCount !== 1
      || repairReceipt.rows[0].operation !== TASK_335_MEDIA_REPAIR_OPERATION
      || repairReceipt.rows[0].subject_id !== revision.id
      || repairReceipt.rows[0].request_digest !== digest(repairRequest)
      || repairReceipt.rows[0].result_digest !== digest(expectedResult)
      || canonicalJson(audit.rows[0].metadata) !== canonicalJson(expectedResult)
    ) {
      throw new Error("Task 335 media repair receipt conflicts with its governed audit evidence.");
    }
    assertExactTask335MediaPins(expectedPins, actualPins);
    return { ...expectedResult, disposition: "replayed" };
  }
  const expectedByAsset = new Map(expectedPins.map((pin) => [pin.assetId, pin.mediaVersionId]));
  for (const pin of actualPins) {
    if (expectedByAsset.get(pin.assetId) !== pin.mediaVersionId) {
      throw new Error("Task 335 media repair found an unexpected or mismatched immutable pin; no reference was changed.");
    }
  }
  const actor = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
     VALUES ($1,$2,'editor','active',now())
     ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
     RETURNING id::text,email`,
    [STAGING_AUTHOR_EMAIL, `${STAGING_AUTHOR_LABEL} media pin repair`],
  );
  if (actor.rowCount !== 1) throw new Error("Task 335 could not provision its governed media repair editor.");
  const actualKeys = new Set(actualPins.map((pin) => `${pin.assetId}:${pin.mediaVersionId}`));
  for (const pin of expectedPins) {
    if (actualKeys.has(`${pin.assetId}:${pin.mediaVersionId}`)) continue;
    const inserted = await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)
       RETURNING id::text`,
      [pin.assetId, pin.mediaVersionId, document.document_id, `revision:${revision.id}`],
    );
    if (inserted.rowCount !== 1) {
      throw new Error(`Task 335 could not repair media pin ${pin.assetId} without an approval mutation.`);
    }
  }
  const repairedPins = await readTask335MediaPins(client, String(document.document_id), String(revision.id));
  assertExactTask335MediaPins(expectedPins, repairedPins);
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      TASK_335_MEDIA_REPAIR_RECEIPT,
      TASK_335_MEDIA_REPAIR_OPERATION,
      revision.id,
      digest(repairRequest),
      digest(expectedResult),
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.media-references-repaired','document',$3,$4,$5)`,
    [
      actor.rows[0].id,
      `${STAGING_AUTHOR_LABEL} media pin repair`,
      document.document_id,
      TASK_335_MEDIA_REPAIR_RECEIPT,
      expectedResult,
    ],
  );
  return expectedResult;
}

type SummaryReplayInput = {
  receipt: { operation: string; subjectId: string; requestDigest: string; resultDigest: string };
  revision: {
    id: string;
    editionId: string;
    payload: Record<string, any>;
    contentDigest: string;
    workflowState: string;
    sourceRevisionId: string | null;
  };
  auditMetadata: Record<string, any> | undefined;
  document: {
    documentId: string;
    editionId: string;
    kind: string;
    canonicalSlug: string;
    documentStatus: string;
    publicationState: string;
    publishedRevisionId: string | null;
  };
};

/**
 * Add only the new summary to an existing subsection. A missing subsection
 * or an existing summary is a conflict, not a reason to invent defaults.
 */
export function stagedSummaryFrameworkPayload(payload: unknown) {
  assertTask335FrameworkSource(payload);
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The current Agent Authority Model revision has no safe payload object.");
  }
  const next = JSON.parse(JSON.stringify(payload)) as Record<string, any>;
  const content = next.content;
  if (!content || typeof content !== "object" || Array.isArray(content)) {
    throw new Error("The current Agent Authority Model revision has no safe content object.");
  }
  const guardrails = content.guardrails;
  if (!guardrails || typeof guardrails !== "object" || Array.isArray(guardrails)) {
    throw new Error("The current Agent Authority Model revision has no existing guardrails subsection to extend.");
  }
  if (Object.hasOwn(guardrails, "summary")) {
    throw new Error("The current Agent Authority Model revision already has guardrails summary content; preserving the editorial revision.");
  }
  content.guardrails = { ...guardrails, summary: task335Summary };
  const validation = validateCmsSnapshot("framework", next, "draft");
  if (!validation.success) {
    throw new Error(`The Task 335 Guardrails summary draft is invalid: ${validation.errors.join("; ")}`);
  }
  return next;
}

/** Verify a replay against the immutable draft, receipt, audit, and live pointer. */
export function verifySummaryReplay(input: SummaryReplayInput): SummaryDraftResult {
  const { receipt, revision, auditMetadata, document } = input;
  assertTask335FrameworkSource(revision.payload, {
    kind: document.kind,
    canonicalSlug: document.canonicalSlug,
    documentStatus: document.documentStatus,
  });
  if (
    receipt.operation !== TASK_335_SUMMARY_OPERATION
    || receipt.requestDigest !== digest(task335Summary)
    || revision.id !== receipt.subjectId
    || revision.editionId !== document.editionId
    || revision.workflowState !== "draft"
    || revision.sourceRevisionId === null
    || revision.contentDigest !== digest(revision.payload)
    || canonicalJson(revision.payload.content?.guardrails?.summary) !== canonicalJson(task335Summary)
    || !auditMetadata
    || digest(auditMetadata) !== receipt.resultDigest
    || auditMetadata.revisionId !== receipt.subjectId
    || auditMetadata.editionId !== document.editionId
    || auditMetadata.publicationState !== document.publicationState
    || auditMetadata.publishedRevisionId !== document.publishedRevisionId
  ) {
    throw new Error("Task 335 summary staging receipt conflicts with its immutable draft revision.");
  }
  return { disposition: "replayed", revisionId: receipt.subjectId, publicationState: document.publicationState };
}

export async function reconcileTask335Summary(
  client: SqlClient,
  shouldApply: boolean,
  repairMedia = false,
): Promise<SummaryDraftResult> {
  if (shouldApply) {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [TASK_335_SUMMARY_RECEIPT]);
  }
  const targetDocument = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.id::text edition_id,e.publication_state,e.published_revision_id::text,
            published.workflow_state published_workflow_state
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae' AND e.locale='en'
       LEFT JOIN cms_revisions published
         ON published.id=e.published_revision_id AND published.edition_id=e.id
      WHERE d.canonical_slug='agent-authority-model'
      ${shouldApply ? "FOR UPDATE OF d,e" : ""}`,
  );
  const document = targetDocument.rows[0];
  if (targetDocument.rowCount !== 1) {
    throw new Error("Expected one active UAE/English Agent Authority Model framework document.");
  }
  assertTask335FrameworkSource(
    { slug: TARGET_SLUG, content: { template: TARGET_TEMPLATE } },
    {
      kind: String(document.kind),
      canonicalSlug: String(document.canonical_slug),
      documentStatus: String(document.document_status),
    },
  );

  const existing = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts
      WHERE idempotency_key=$1
      ${shouldApply ? "FOR UPDATE" : ""}`,
    [TASK_335_SUMMARY_RECEIPT],
  );
  if ((existing.rowCount ?? 0) > 1) {
    throw new Error("Task 335 summary staging has duplicate idempotency receipts; preserving the document without guessing an authority.");
  }
  if (repairMedia && existing.rowCount !== 1) {
    throw new Error("Task 335 media repair requires the existing summary staging receipt; no normal staging is permitted.");
  }
  const latest = await client.query(
    `SELECT id::text,revision_number,payload,content_digest,workflow_state,source_revision_id::text
       FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1
       ${shouldApply ? "FOR UPDATE" : ""}`,
    [document.edition_id],
  );
  if (latest.rowCount !== 1) {
    throw new Error("The Agent Authority Model has no existing revision to verify against the Task 335 summary receipt.");
  }
  if (existing.rowCount === 1) {
    const receiptRow = existing.rows[0];
    assertLatestReceiptRevision(String(latest.rows[0].id), String(receiptRow.subject_id));
    const revision = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.payload,r.content_digest,r.workflow_state,r.source_revision_id::text
         FROM cms_revisions r WHERE r.id=$1`,
      [receiptRow.subject_id],
    );
    const audit = await client.query(
      `SELECT metadata
         FROM cms_audit_events
        WHERE request_id=$1 AND action='document.draft-staged'
          AND target_type='document' AND target_id=$2
        ORDER BY occurred_at DESC LIMIT 2`,
      [TASK_335_SUMMARY_RECEIPT, document.document_id],
    );
    if (revision.rowCount !== 1 || audit.rowCount !== 1) {
      throw new Error("Task 335 summary staging receipt is missing its immutable draft or audit evidence.");
    }
    const replay = verifySummaryReplay({
      receipt: {
        operation: String(receiptRow.operation),
        subjectId: String(receiptRow.subject_id),
        requestDigest: String(receiptRow.request_digest),
        resultDigest: String(receiptRow.result_digest),
      },
      revision: {
        id: String(revision.rows[0].id),
        editionId: String(revision.rows[0].edition_id),
        payload: revision.rows[0].payload,
        contentDigest: String(revision.rows[0].content_digest),
        workflowState: String(revision.rows[0].workflow_state),
        sourceRevisionId: revision.rows[0].source_revision_id ? String(revision.rows[0].source_revision_id) : null,
      },
      auditMetadata: audit.rows[0].metadata,
      document: {
        documentId: String(document.document_id),
        editionId: String(document.edition_id),
        kind: String(document.kind),
        canonicalSlug: String(document.canonical_slug),
        documentStatus: String(document.document_status),
        publicationState: String(document.publication_state),
        publishedRevisionId: document.published_revision_id ? String(document.published_revision_id) : null,
      },
    });
    const stagedRevision = revision.rows[0];
    if (!stagedRevision.source_revision_id) {
      throw new Error("Task 335 summary revision has no exact source revision for governed media repair.");
    }
    const expectedPins = await expectedTask335MediaPins(
      client,
      String(document.document_id),
      String(stagedRevision.id),
      stagedRevision.payload,
      String(stagedRevision.source_revision_id),
    );
    const actualPins = await readTask335MediaPins(client, String(document.document_id), String(stagedRevision.id));
    try {
      assertExactTask335MediaPins(expectedPins, actualPins);
    } catch (error) {
      if (!repairMedia) throw error;
      if (!shouldApply) {
        throw new Error("Task 335 media repair requires --apply-db; read-only verification cannot mutate pins.");
      }
      return repairTask335MediaPins(client, document, stagedRevision, expectedPins, actualPins);
    }
    return replay;
  }

  const source = latest.rows[0];
  assertTask335FrameworkSource(source.payload, {
    kind: String(document.kind),
    canonicalSlug: String(document.canonical_slug),
    documentStatus: String(document.document_status),
  });
  let lineageIncludesPublished = false;
  if (document.published_revision_id && String(source.id) !== String(document.published_revision_id)) {
    const lineage = await client.query(
      `WITH RECURSIVE ancestry AS (
         SELECT id::text,source_revision_id::text
           FROM cms_revisions
          WHERE id=$1 AND edition_id=$2
         UNION ALL
         SELECT r.id::text,r.source_revision_id::text
           FROM cms_revisions r
           JOIN ancestry a ON r.id=a.source_revision_id
          WHERE r.edition_id=$2
       )
       SELECT 1 FROM ancestry WHERE id=$3 LIMIT 1`,
      [source.id, document.edition_id, document.published_revision_id],
    );
    lineageIncludesPublished = lineage.rowCount === 1;
  }
  assertCurrentSummarySource({
    sourceId: String(source.id),
    sourceWorkflowState: String(source.workflow_state),
    sourceRevisionId: source.source_revision_id ? String(source.source_revision_id) : null,
    publishedRevisionId: document.published_revision_id ? String(document.published_revision_id) : null,
    publishedWorkflowState: document.published_workflow_state ? String(document.published_workflow_state) : null,
    lineageIncludesPublished,
  });
  const staged = stagedSummaryFrameworkPayload(source.payload);
  const sourcePins = await readTask335MediaPins(client, String(document.document_id), String(source.id));
  const expectedPins = collectTask335MediaPins(staged, sourcePins);
  if (!shouldApply) {
    return {
      disposition: "validated",
      revisionId: String(source.id),
      publicationState: String(document.publication_state),
      publishedRevisionId: document.published_revision_id ? String(document.published_revision_id) : null,
    };
  }
  const actor = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
     VALUES ($1,$2,'editor','active',now())
     ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
     RETURNING id::text,email`,
    [STAGING_AUTHOR_EMAIL, STAGING_AUTHOR_LABEL],
  );
  if (actor.rowCount !== 1) throw new Error("Task 335 could not provision its controlled reconciliation editor.");
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,source_revision_id,reason)
     VALUES ($1,$2,1,$3,$4,'draft',$5,$6,$7) RETURNING id::text`,
    [
      document.edition_id,
      Number(source.revision_number) + 1,
      staged,
      digest(staged),
      actor.rows[0].id,
      source.id,
      STAGING_REASON,
    ],
  );
  if (revision.rowCount !== 1) throw new Error("Task 335 could not create its review-only draft revision.");
  for (const pin of expectedPins) {
    const pinned = await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)
       RETURNING id::text`,
      [pin.assetId, pin.mediaVersionId, document.document_id, `revision:${revision.rows[0].id}`],
    );
    if (pinned.rowCount !== 1) {
      throw new Error(`Task 335 could not pin governed media asset ${pin.assetId} to its staged revision.`);
    }
  }
  const result: SummaryDraftResult = {
    disposition: "staged",
    documentId: String(document.document_id),
    editionId: String(document.edition_id),
    revisionId: String(revision.rows[0].id),
    sourceRevisionId: String(source.id),
    publicationState: String(document.publication_state),
    publishedRevisionId: document.published_revision_id ? String(document.published_revision_id) : null,
  };
  const receiptResult = { ...result };
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [TASK_335_SUMMARY_RECEIPT, TASK_335_SUMMARY_OPERATION, result.revisionId, digest(task335Summary), digest(receiptResult)],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.draft-staged','document',$3,$4,$5)`,
    [actor.rows[0].id, STAGING_AUTHOR_LABEL, document.document_id, TASK_335_SUMMARY_RECEIPT, receiptResult],
  );
  return result;
}

function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Task 335 summary staging is disabled in production.");
  }
  if (target !== "development") throw new Error("Database work requires the explicit --target=development safeguard.");
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

async function main() {
  if (!apply && !verify && !repairMedia) {
    console.log(JSON.stringify({ receipt: TASK_335_SUMMARY_RECEIPT, operation: TASK_335_SUMMARY_OPERATION, summary: task335Summary }, null, 2));
    console.error("Dry run: pass --apply-db or --verify-db with --target=development. Use --repair-media-db --apply-db only for the receipted media-pin repair.");
    return;
  }
  if (repairMedia && !apply) {
    throw new Error("Task 335 media repair requires the explicit --apply-db safeguard.");
  }
  assertDevelopmentTarget();
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const result = await reconcileTask335Summary(client, apply, repairMedia);
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(`Task 335 Guardrails summary ${result.disposition}; revision=${result.revisionId}; publication=${result.publicationState}${apply ? "" : " (rolled back)"}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}