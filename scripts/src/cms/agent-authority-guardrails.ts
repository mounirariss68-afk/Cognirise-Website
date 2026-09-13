import { createHash } from "node:crypto";
import {
  type FrameworkGuardrailsSubsection,
  validateCmsSnapshot,
} from "@workspace/api-zod";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const verify = args.includes("--verify-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

export const AGENT_AUTHORITY_GUARDRAILS_RECEIPT = "cms.agent-authority.guardrails-v1";
export const AGENT_AUTHORITY_GUARDRAILS_OPERATION = "cms.framework.guardrails-draft-staged";
const STAGING_REASON = "Task 324: staged Guardrails and authority subsection for editorial review; no publication decision made.";
const STAGING_AUTHOR_EMAIL = "cms-agent-authority-guardrails@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Agent Authority guardrails reconciliation";

export const agentAuthorityGuardrails: FrameworkGuardrailsSubsection = {
  heading: "Guardrails are not an authority model",
  opening: "Most teams that have built guardrails believe they have governance. They have not, and the gap is expensive.",
  definition: "A guardrail is a mechanism: an output filter, a rate limit, a system prompt, an approval step. An authority model is the thing that decides which mechanisms are required, where each one sits, and who is answerable when one fails. The first is a component. The second is a delegation.",
  bankExample: {
    beforeQuote: "Every bank already runs this distinction without thinking about it. Its delegation of authority says a relationship manager may approve up to a limit, a committee above it, and anything touching a sanctioned party goes to compliance regardless of size. The four-eyes check and the screening filter are the guardrails. Nobody would say ",
    quote: "\"we have four-eyes checks, therefore we have a delegation of authority.\"",
    afterQuote: " That is precisely what is being said when a team points at a content filter and calls it AI governance.",
  },
  comparisonHeading: "Three differences that matter",
  comparisonColumns: {
    guardrails: "Guardrails",
    authorityModel: "The Agent Authority Model",
  },
  comparisonRows: [
    {
      label: "What it attaches to",
      guardrails: "The agent or the model — one filter, one prompt, one limit, applied to everything it does",
      authorityModel: "The handover — the moment an output leaves the agent and becomes consequential for someone else",
      guardrailsEmphasis: "plain",
      authorityModelEmphasis: "plain",
    },
    {
      label: "Where it comes from",
      guardrails: "Chosen, usually from a vendor's feature list or from whatever has already gone wrong",
      authorityModel: "Derived from the handover's profile: what is handed over, who is present, and what is at stake",
      guardrailsEmphasis: "plain",
      authorityModelEmphasis: "plain",
    },
    {
      label: "What it answers",
      guardrails: "What stops it doing something bad?",
      authorityModel: "Who authorised it to do this — and what must it prove before it is allowed to do more?",
      guardrailsEmphasis: "italic",
      authorityModelEmphasis: "italic",
    },
  ],
  unit: {
    heading: "Why the unit is the whole argument",
    paragraphs: [
      "A single agent does several things of very different consequence. A front-desk agent answers questions, books appointments, cancels them and issues refunds. Guardrail thinking gives all four the same protection, because the protection was attached to the agent. The refund is then defended exactly as well as the opening-hours question — which is to say, the riskiest thing the agent does inherits the posture appropriate to the safest.",
      "Govern the handover instead and each of the four is rated on its own: what kind of thing is being handed over, who is standing there when it happens, how hard it is to undo, and who is exposed if it is wrong. Same agent, same model, same guardrail technology — but the refund is now governed as a refund.",
    ],
    emphasis: "In engineering terms: authority attaches to the tool, not the agent.",
  },
  firstFigure: {
    asset: "aam-guardrails-vs-authority.svg",
    altText: "Left: one agent inside a single guardrail perimeter, with four acts of different consequence all leaving under the same authority. Right: the same four acts governed separately as handovers, each with its own type, exposure rating and authority level.",
    captionLabel: "Illustration 1 —",
    captionLead: "Guardrails govern the agent; the Agent Authority Model governs the handover.",
    captionBody: "Four acts of very different consequence, protected identically on the left and rated individually on the right. Handovers shown are illustrative.",
  },
  interaction: {
    heading: "How the two interact",
    introduction: "Two rules bind them.",
    exposure: {
      lead: "Exposure sets the ceiling.",
      body: "How hard an output is to undo, and how far its effects reach, determine the maximum authority a handover may hold. Capability does not enter into it. A more accurate model does not earn more authority; a smaller blast radius does.",
    },
    evidence: {
      lead: "Evidence earns the climb.",
      body: "Every handover launches one level below its target authority and is promoted only on measured performance, with demotion automatic on incident. Guardrails have no concept of promotion — they are static by nature. This is the question no published framework asks, and it is the one that turns a classification into an operating model.",
    },
    controlsIntroduction: "Guardrails then enter in two distinct ways, and keeping them apart is the whole of the discipline.",
    requiredControls: {
      lead: "As required controls.",
      bodyBeforeExamples: "Once a handover has a profile, its control set follows from that profile rather than from preference — universal controls, plus those set by type, by authority level and by exposure band. Each must be provable by a test, a query or an artefact, never by an assurance.",
      assuranceExample: "\"The team ensures the agent does not give medical advice\" is not a control.",
      controlExample: "\"An output filter independent of the model blocks each prohibited class, and a test suite attempts every one of them\" is.",
      conclusion: "A guardrail you cannot test is not a guardrail; it is an intention.",
    },
    compensatingControls: {
      lead: "As compensating controls that raise the ceiling.",
      bodyBeforeContent: "This is the mechanism that makes the model workable rather than merely restrictive. A handover may hold authority above its exposure ceiling where the ",
      content: "content",
      bodyAfterContent: " of the handover is constrained by construction rather than by trust in the agent. An agent sending messages to patients with no human present sits above the ceiling for an irreversible, customer-affecting handover. It can still be correct — if it writes no free text, renders a clinician-approved template through a whitelist of variables, and passes a blocking gate on every send. The authority there is carried by the approved template. The agent is a dispatcher.",
    },
  },
  secondFigure: {
    asset: "aam-how-they-interact.svg",
    altText: "A chart with authority rising vertically from in the loop to out of the loop, and exposure rising left to right. A descending staircase marks the ceiling exposure sets on authority. Required controls sit in the permitted region below it, an arrow shows a handover promoted upward on measured evidence, and a marker above the ceiling shows a compensating control where authority is carried by an approved template rather than by the agent.",
    captionLabel: "Illustration 2 —",
    captionLead: "Exposure sets the ceiling; evidence earns the climb.",
    captionBody: "Everything under the staircase is permitted, and that is where required controls sit. Promotion moves a handover up within the permitted region. Only a compensating control — a guardrail that carries the authority itself — moves the ceiling.",
  },
  designRule: {
    heading: "The design rule this produces",
    quote: "Where an agent operates above its exposure ceiling, the design must name the artefact that carries the authority instead — an approved template, a whitelisted parameter range, a deterministic rule set, or a gate with the power to block.",
    conclusion: "That is the cleanest test of the relationship between the two. A guardrail that merely constrains the agent does not move the ceiling; it has made a risky thing somewhat less risky. A guardrail that carries the authority itself does move it, because the consequential content no longer originates with the model at all. Most teams cannot say which kind theirs is. That, usually, is the finding.",
    failure: "The failure runs in both directions. An authority model with unenforceable controls is a register of good intentions. Controls without an authority model are a pile of features nobody can justify to a regulator. Each is load-bearing for the other.",
    closingEmphasis: "Authority is earned, not configured.",
  },
};

type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: Record<string, any>[] }>;
};

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

export function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Task 324 guardrails staging is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database work requires the explicit --target=development safeguard.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

export function stagedFrameworkPayload(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error("The current Agent Authority Model revision has no safe payload object.");
  }
  const next = JSON.parse(JSON.stringify(payload)) as Record<string, unknown>;
  if (!next.content || typeof next.content !== "object" || Array.isArray(next.content)) {
    throw new Error("The current Agent Authority Model revision has no safe content object.");
  }
  const content = next.content as Record<string, unknown>;
  if (Object.hasOwn(content, "guardrails")) {
    throw new Error("The current Agent Authority Model revision already has guardrails content; preserving the editorial revision.");
  }
  content.guardrails = agentAuthorityGuardrails;
  const validation = validateCmsSnapshot("framework", next, "draft");
  if (!validation.success) {
    throw new Error(`The staged Guardrails and authority draft is invalid: ${validation.errors.join("; ")}`);
  }
  // Validation proves the additive payload is safe. Keep the cloned source,
  // rather than its normalized derivative, so no existing payload field or
  // legacy media ordering is silently rewritten by this staging operation.
  return next;
}

async function reconcile(client: SqlClient, shouldApply: boolean) {
  if (shouldApply) {
    // The advisory lock serializes this operation with another staging attempt.
    // Verification is deliberately read-only and must not acquire a write lock.
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [AGENT_AUTHORITY_GUARDRAILS_RECEIPT]);
  }
  const targetDocument = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.id::text edition_id,e.publication_state,e.published_revision_id::text
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae' AND e.locale='en'
      WHERE d.canonical_slug='agent-authority-model'
      ${shouldApply ? "FOR UPDATE OF d,e" : ""}`,
  );
  const document = targetDocument.rows[0];
  if (
    targetDocument.rowCount !== 1
    || document.kind !== "framework"
    || document.document_status !== "active"
  ) {
    throw new Error("Expected one active UAE/English Agent Authority Model framework document.");
  }

  const existing = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
        FROM cms_operation_receipts WHERE idempotency_key=$1 ${shouldApply ? "FOR UPDATE" : ""}`,
    [AGENT_AUTHORITY_GUARDRAILS_RECEIPT],
  );
  const requestDigest = digest(agentAuthorityGuardrails);
  if (existing.rowCount) {
    if (existing.rowCount !== 1) {
      throw new Error("Task 324 staging has duplicate idempotency receipts; preserving the document without guessing an authority.");
    }
    const receipt = existing.rows[0];
    const revision = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.payload,r.content_digest,r.workflow_state,
              r.source_revision_id::text
         FROM cms_revisions r WHERE r.id=$1`,
      [receipt.subject_id],
    );
    const audit = await client.query(
      `SELECT metadata
         FROM cms_audit_events
        WHERE request_id=$1 AND action='document.draft-staged'
          AND target_type='document' AND target_id=$2
         ORDER BY occurred_at DESC LIMIT 2`,
      [AGENT_AUTHORITY_GUARDRAILS_RECEIPT, document.document_id],
    );
    const metadata = audit.rows[0]?.metadata;
    if (
      receipt.operation !== AGENT_AUTHORITY_GUARDRAILS_OPERATION
      || receipt.request_digest !== requestDigest
      || revision.rowCount !== 1
      || revision.rows[0].edition_id !== document.edition_id
      || revision.rows[0].workflow_state !== "draft"
      || revision.rows[0].content_digest !== digest(revision.rows[0].payload)
      || revision.rows[0].source_revision_id === null
      || canonicalJson((revision.rows[0].payload?.content ?? {}).guardrails) !== canonicalJson(agentAuthorityGuardrails)
      || audit.rowCount !== 1
      || digest(metadata) !== receipt.result_digest
      || metadata?.revisionId !== receipt.subject_id
      || metadata?.editionId !== document.edition_id
      || metadata?.publicationState !== document.publication_state
      || metadata?.publishedRevisionId !== document.published_revision_id
    ) {
      throw new Error("Task 324 staging receipt conflicts with its immutable draft revision.");
    }
    return { disposition: "replayed" as const, revisionId: receipt.subject_id, publicationState: document.publication_state };
  }

  const latest = await client.query(
    `SELECT id::text,revision_number,payload,content_digest,workflow_state
        FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1
        ${shouldApply ? "FOR UPDATE" : ""}`,
    [document.edition_id],
  );
  if (latest.rowCount !== 1) {
    throw new Error("The Agent Authority Model has no existing revision to extend.");
  }
  const source = latest.rows[0];
  const staged = stagedFrameworkPayload(source.payload);
  const contentDigest = digest(staged);
  if (!shouldApply) {
    return { disposition: "validated" as const, revisionId: source.id, publicationState: document.publication_state };
  }
  const actor = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
     VALUES ($1,$2,'editor','active',now())
     ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
     RETURNING id::text,email`,
    [STAGING_AUTHOR_EMAIL, STAGING_AUTHOR_LABEL],
  );
  if (actor.rowCount !== 1) throw new Error("Task 324 could not provision its controlled reconciliation editor.");
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,source_revision_id,reason)
     VALUES ($1,$2,1,$3,$4,'draft',$5,$6,$7) RETURNING id::text`,
    [document.edition_id, Number(source.revision_number) + 1, staged, contentDigest, actor.rows[0].id, source.id, STAGING_REASON],
  );
  if (revision.rowCount !== 1) throw new Error("Task 324 could not create its review-only draft revision.");
  const result = {
    documentId: document.document_id,
    editionId: document.edition_id,
    revisionId: revision.rows[0].id,
    sourceRevisionId: source.id,
    publicationState: document.publication_state,
    publishedRevisionId: document.published_revision_id,
  };
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [AGENT_AUTHORITY_GUARDRAILS_RECEIPT, AGENT_AUTHORITY_GUARDRAILS_OPERATION, result.revisionId, requestDigest, digest(result)],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.draft-staged','document',$3,$4,$5)`,
    [actor.rows[0].id, STAGING_AUTHOR_LABEL, document.document_id, AGENT_AUTHORITY_GUARDRAILS_RECEIPT, result],
  );
  return { disposition: "staged" as const, ...result };
}

async function main() {
  if (!apply && !verify) {
    console.log(JSON.stringify({ receipt: AGENT_AUTHORITY_GUARDRAILS_RECEIPT, guardrails: agentAuthorityGuardrails }, null, 2));
    console.error("Dry run: pass --apply-db or --verify-db with --target=development.");
    return;
  }
  assertDevelopmentTarget();
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const result = await reconcile(client, apply);
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(`Task 324 Guardrails and authority ${result.disposition}; revision=${result.revisionId}; publication=${result.publicationState}${apply ? "" : " (rolled back)"}.`);
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