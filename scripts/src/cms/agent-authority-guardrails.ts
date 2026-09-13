import { createHash } from "node:crypto";
import {
  type FrameworkGuardrailsSubsection,
  validateCmsSnapshot,
} from "@workspace/api-zod";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const verify = args.includes("--verify-db");
const publish = args.includes("--publish-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

export const AGENT_AUTHORITY_GUARDRAILS_RECEIPT = "cms.agent-authority.guardrails-v1";
export const AGENT_AUTHORITY_GUARDRAILS_OPERATION = "cms.framework.guardrails-draft-staged";
export const AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT =
  "cms.agent-authority.guardrails-published-v1";
export const AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_OPERATION =
  "cms.framework.guardrails-published";
export const AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT =
  "cms.agent-authority.guardrails-media-correction-v1";
export const AGENT_AUTHORITY_GUARDRAILS_CORRECTION_OPERATION =
  "cms.framework.guardrails-media-corrected";
const STAGING_REASON = "Task 324: staged Guardrails and authority subsection for editorial review; no publication decision made.";
const STAGING_AUTHOR_EMAIL = "cms-agent-authority-guardrails@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Agent Authority guardrails reconciliation";
const PUBLICATION_REASON =
  "Task 324: scoped operator publication authorized by the current user; preserved the existing static hero bytes while migrating its stale legacy import to an immutable approved CMS pin.";
const CORRECTION_REASON =
  "Task 324: corrected the hero review record to reflect repository provenance and scoped approved-use without asserting legal ownership.";
const STATIC_HERO_FILENAME = "cognirise-pulse-governance.jpg";
const STATIC_HERO_SOURCE = "/images/cognirise/cognirise-pulse-governance.jpg";
const STATIC_HERO_CHECKSUM =
  "7f462ae555d626662aa17f0654b0308cf1d869d704bb3032351ccf2ac03d35b7";
const STATIC_HERO_ALT_TEXT = "cognirise pulse governance";
const STATIC_HERO_REPOSITORY_COMMIT = "08646cd7534146487c4267b42d87eb9852f3c2cc";
const STATIC_HERO_RENDERER_COMMIT = "0bf31ab69c58390d3cb2e00927352effcd0053ac";
const PUBLICATION_ACTOR_ENV = "CMS_AUTOMATION_ACTOR_EMAIL";

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
    const publicationReceipt = await client.query(
      `SELECT operation,subject_id::text,result_digest
         FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT],
    );
    const publicationAlreadyCommitted = publicationReceipt.rowCount === 1
      && document.publication_state === "published";
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
      || (!publicationAlreadyCommitted && metadata?.publicationState !== document.publication_state)
      || (!publicationAlreadyCommitted && metadata?.publishedRevisionId !== document.published_revision_id)
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

async function correctPublishedHero(
  client: SqlClient,
  actor: { id: string; email: string },
  live: Record<string, any>,
  originalPublicationReceipt: Record<string, any>,
) {
  const correctionReceipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts
      WHERE idempotency_key=$1
      FOR UPDATE`,
    [AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT],
  );
  if (correctionReceipt.rowCount) {
    if (
      correctionReceipt.rowCount !== 1
      || correctionReceipt.rows[0].operation !== AGENT_AUTHORITY_GUARDRAILS_CORRECTION_OPERATION
      || live.published_revision_id !== correctionReceipt.rows[0].subject_id
    ) {
      throw new Error("The corrected hero receipt conflicts with the live published revision.");
    }
    return {
      disposition: "replayed" as const,
      revisionId: correctionReceipt.rows[0].subject_id,
      publicationState: live.publication_state,
    };
  }
  if (
    live.publication_state !== "published"
    || live.published_revision_id !== originalPublicationReceipt.subject_id
    || live.workflow_state !== "approved"
  ) {
    throw new Error("The live hero correction target changed outside the recorded publication.");
  }
  const hero = await client.query(
    `SELECT a.id::text asset_id,a.filename,a.status,a.media_type,a.storage_key,
            a.checksum,a.byte_size,a.alt_text,a.credit,
            latest.id::text latest_version_id,latest.version_number,
            latest.width,latest.height,latest.metadata latest_metadata,
            source.metadata source_metadata
       FROM cms_media_assets a
       JOIN LATERAL (
         SELECT v.* FROM cms_media_versions v
          WHERE v.asset_id=a.id
          ORDER BY v.version_number DESC
          LIMIT 1
       ) latest ON true
       JOIN LATERAL (
         SELECT v.metadata FROM cms_media_versions v
          WHERE v.asset_id=a.id
          ORDER BY v.version_number ASC
          LIMIT 1
       ) source ON true
      WHERE a.filename=$1 AND a.checksum=$2
      FOR UPDATE OF a`,
    [STATIC_HERO_FILENAME, STATIC_HERO_CHECKSUM],
  );
  if (
    hero.rowCount !== 1
    || hero.rows[0].status !== "active"
    || hero.rows[0].media_type !== "image/jpeg"
    || !hero.rows[0].storage_key
    || !Number(hero.rows[0].width)
    || !Number(hero.rows[0].height)
  ) {
    throw new Error("The published hero correction lacks the exact active repository asset.");
  }
  const heroRow = hero.rows[0];
  const sourceMetadata = heroRow.source_metadata && typeof heroRow.source_metadata === "object"
    ? heroRow.source_metadata as Record<string, unknown>
    : {};
  const sourceRights = sourceMetadata.rights && typeof sourceMetadata.rights === "object"
    && !Array.isArray(sourceMetadata.rights)
    ? sourceMetadata.rights as Record<string, unknown>
    : {};
  const altText = heroRow.alt_text || STATIC_HERO_ALT_TEXT;
  const correctedMetadata = {
    ...sourceMetadata,
    rightsStatus: "approved-use",
    accessibilityStatus: "approved",
    rights: {
      ...sourceRights,
      status: "approved-use",
      source: STATIC_HERO_SOURCE,
      scope: "Agent Authority Model UAE/English hero only",
      reviewBasis: {
        checksum: STATIC_HERO_CHECKSUM,
        repositoryFile: STATIC_HERO_SOURCE,
        repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
        existingStaticUse: "AgentAuthorityModel.tsx hero fallback and CMS hero resolution",
        rendererCommit: STATIC_HERO_RENDERER_COMMIT,
      },
    },
    sourceReview: {
      sourceRightsApproved: true,
      accessibilityApproved: true,
      reviewedBy: String(actor.id),
      scope: "Agent Authority Model UAE/English hero only",
      reviewBasis: {
        checksum: STATIC_HERO_CHECKSUM,
        repositoryFile: STATIC_HERO_SOURCE,
        repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
        existingStaticUse: "AgentAuthorityModel.tsx hero fallback and CMS hero resolution",
        rendererCommit: STATIC_HERO_RENDERER_COMMIT,
        altText,
      },
      ownershipClaim: "none; original credit retained without asserting legal ownership",
    },
  };
  const appended = await client.query(
    `INSERT INTO cms_media_versions
      (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
     VALUES ($1,
             (SELECT COALESCE(max(version_number),0)+1 FROM cms_media_versions WHERE asset_id=$1),
             $2,$3,$4,$5,$6,$7)
    RETURNING id::text,version_number`,
    [
      heroRow.asset_id,
      heroRow.storage_key,
      heroRow.checksum,
      heroRow.byte_size,
      heroRow.width,
      heroRow.height,
      correctedMetadata,
    ],
  );
  if (appended.rowCount !== 1) {
    throw new Error("The corrected hero review did not create one immutable metadata version.");
  }
  const correctedHeroVersionId = String(appended.rows[0].id);
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'media.metadata-corrected','media',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      heroRow.asset_id,
      `${AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT}:media`,
      {
        previousVersionId: heroRow.latest_version_id,
        correctedVersionId: correctedHeroVersionId,
        source: STATIC_HERO_SOURCE,
        checksum: STATIC_HERO_CHECKSUM,
        scope: "Agent Authority Model UAE/English hero only",
        repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
        rendererCommit: STATIC_HERO_RENDERER_COMMIT,
        altText,
        ownershipClaim: "none; original credit retained without asserting legal ownership",
        supersedesReviewAuditRequestId: `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:media-review`,
        correction: "Removed an unsupported owner/evidence attribution from the prior review metadata.",
      },
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'media.review-audit-corrected','media',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      heroRow.asset_id,
      `${AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT}:media-audit`,
      {
        supersedesReviewAuditRequestId: `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:media-review`,
        correction: "The prior media review audit used unsupported owner/evidence wording. The live immutable review uses repository checksum, existing static use, and the retained original credit only.",
        scope: "Agent Authority Model UAE/English hero only",
        ownershipClaim: "none; original credit retained without asserting legal ownership",
      },
    ],
  );

  const correctedPayload = JSON.parse(JSON.stringify(live.payload)) as Record<string, any>;
  const correctedContent = correctedPayload.content;
  const priorHero = correctedContent?.heroMedia;
  if (
    !priorHero
    || priorHero.mediaId !== heroRow.asset_id
    || priorHero.mediaVersionId !== heroRow.latest_version_id
  ) {
    throw new Error("The live payload no longer points to the reviewed hero version.");
  }
  correctedContent.heroMedia = {
    ...priorHero,
    mediaVersionId: correctedHeroVersionId,
    altText,
  };
  const correctedValidation = validateCmsSnapshot("framework", correctedPayload, "publish");
  if (!correctedValidation.success) {
    throw new Error(`The corrected published payload is invalid: ${correctedValidation.errors.join("; ")}`);
  }
  const correctedDigest = digest(correctedPayload);
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,approved_by_user_id,approved_at,source_revision_id,reason)
     VALUES ($1,$2,1,$3,$4,'approved',$5,$5,now(),$6,$7)
     RETURNING id::text`,
    [
      live.edition_id,
      Number(live.revision_number) + 1,
      correctedPayload,
      correctedDigest,
      actor.id,
      live.revision_id,
      CORRECTION_REASON,
    ],
  );
  if (revision.rowCount !== 1) throw new Error("The corrected hero publication did not create one revision.");
  const correctedRevisionId = String(revision.rows[0].id);
  await client.query(
    `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
     VALUES ($1,$2,$3,$4)`,
    [heroRow.asset_id, correctedHeroVersionId, live.document_id, `revision:${correctedRevisionId}`],
  );
  const switched = await client.query(
    `UPDATE cms_market_editions
        SET published_revision_id=$2,published_at=now(),updated_at=now()
      WHERE id=$1 AND publication_state='published' AND published_revision_id=$3
      RETURNING id::text`,
    [live.edition_id, correctedRevisionId, live.revision_id],
  );
  if (switched.rowCount !== 1) {
    throw new Error("The live edition changed before the corrected hero revision could be selected.");
  }
  await client.query(
    `UPDATE cms_document_availability_states
        SET shared_source_revision_id=$2,reviewed_source_revision_id=$2,
            published_source_revision_id=$2,
            updated_by_user_id=$3,updated_at=now()
      WHERE document_id=$1
        AND shared_source_revision_id=$4
        AND reviewed_source_revision_id=$4
        AND published_source_revision_id=$4`,
    [live.document_id, correctedRevisionId, actor.id, live.revision_id],
  );
  await client.query(
    `UPDATE cms_documents SET updated_at=now() WHERE id=$1`,
    [live.document_id],
  );
  const result = {
    documentId: live.document_id,
    editionId: live.edition_id,
    revisionId: correctedRevisionId,
    correctedFromRevisionId: live.revision_id,
    heroMediaId: heroRow.asset_id,
    heroMediaVersionId: correctedHeroVersionId,
    originalHeroMediaVersionId: heroRow.latest_version_id,
    publicationState: "published",
    market: "uae",
    locale: "en",
  };
  const requestDigest = digest({
    sourceRevisionId: live.revision_id,
    checksum: STATIC_HERO_CHECKSUM,
    repositoryFile: STATIC_HERO_SOURCE,
    repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
    rendererCommit: STATIC_HERO_RENDERER_COMMIT,
    scope: "Agent Authority Model UAE/English hero only",
  });
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT,
      AGENT_AUTHORITY_GUARDRAILS_CORRECTION_OPERATION,
      correctedRevisionId,
      requestDigest,
      digest(result),
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.availability-review-rebound','document',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      live.document_id,
      `${AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT}:availability`,
      {
        previousSourceRevisionId: live.revision_id,
        correctedSourceRevisionId: correctedRevisionId,
        reason: "The published hero metadata correction created a successor immutable page revision; availability decisions were unchanged.",
        scope: "Agent Authority Model UAE/English only",
      },
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.publication-corrected','document',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      live.document_id,
      `${AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT}:published`,
      {
        ...result,
        scope: "Agent Authority Model UAE/English hero only",
        reason: CORRECTION_REASON,
        originalPublicationReceipt: AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT,
        supersedesPublicationAuditRequestId: `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:published`,
        publicationApproach: "scoped SQL operator reconciliation; not the normal CMS HTTP lifecycle",
      },
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.publication-audit-corrected','document',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      live.document_id,
      `${AGENT_AUTHORITY_GUARDRAILS_CORRECTION_RECEIPT}:audit`,
      {
        supersedesPublicationAuditRequestId: `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:published`,
        publicationApproach: "scoped SQL operator reconciliation; not the normal CMS HTTP lifecycle",
        normalCmsLifecycle: false,
        correction: "The prior publication audit label was not a record of a normal CMS HTTP publication route. The committed publication used the explicitly scoped automation SQL operator reconciliation.",
        scope: "Agent Authority Model UAE/English only",
      },
    ],
  );
  return { disposition: "corrected" as const, ...result };
}

async function publishScoped(client: SqlClient, stagedRevisionId: string) {
  const actorEmail = process.env[PUBLICATION_ACTOR_ENV];
  if (!actorEmail) {
    throw new Error(
      `Publication requires ${PUBLICATION_ACTOR_ENV} to identify the disposable automation administrator.`,
    );
  }
  const actorResult = await client.query(
    `SELECT id::text,email,role,status
       FROM cms_users
      WHERE email=$1
      FOR UPDATE`,
    [actorEmail],
  );
  if (
    actorResult.rowCount !== 1
    || actorResult.rows[0].email !== actorEmail
    || actorResult.rows[0].role !== "administrator"
    || actorResult.rows[0].status !== "active"
  ) {
    throw new Error("The publication actor must be one active administrator automation identity.");
  }
  const actor = actorResult.rows[0];

  const publicationReceipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts
      WHERE idempotency_key=$1
      FOR UPDATE`,
    [AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT],
  );
  if (publicationReceipt.rowCount === 1) {
    const live = await client.query(
      `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
              e.id::text edition_id,e.market,e.locale,e.publication_state,
              e.published_revision_id::text,
              r.id::text revision_id,r.revision_number,r.payload,r.workflow_state
         FROM cms_documents d
         JOIN cms_market_editions e
           ON e.document_id=d.id AND e.market='uae' AND e.locale='en'
         JOIN cms_revisions r
           ON r.id=e.published_revision_id AND r.edition_id=e.id
        WHERE d.canonical_slug='agent-authority-model'
        FOR UPDATE OF d,e,r`,
    );
    if (live.rowCount === 1) {
      return await correctPublishedHero(
        client,
        { id: String(actor.id), email: String(actor.email) },
        live.rows[0],
        publicationReceipt.rows[0],
      );
    }
  }
  const target = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.id::text edition_id,e.market,e.locale,e.content_mode,
            e.publication_state,e.published_revision_id::text,
            r.id::text revision_id,r.revision_number,r.payload,r.workflow_state
       FROM cms_documents d
       JOIN cms_market_editions e
         ON e.document_id=d.id AND e.market='uae' AND e.locale='en'
       JOIN cms_revisions r ON r.id=$1 AND r.edition_id=e.id
      WHERE d.canonical_slug='agent-authority-model'
      FOR UPDATE OF d,e,r`,
    [stagedRevisionId],
  );
  if (
    target.rowCount !== 1
    || target.rows[0].kind !== "framework"
    || target.rows[0].document_status !== "active"
    || target.rows[0].revision_id !== stagedRevisionId
  ) {
    throw new Error("The scoped publication target no longer matches the staged UAE framework.");
  }
  const document = target.rows[0];

  if (publicationReceipt.rowCount) {
    if (
      publicationReceipt.rowCount !== 1
      || publicationReceipt.rows[0].operation !== AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_OPERATION
      || document.publication_state !== "published"
      || document.published_revision_id !== publicationReceipt.rows[0].subject_id
    ) {
      throw new Error("The Guardrails publication receipt conflicts with the live target.");
    }
    return {
      disposition: "replayed" as const,
      revisionId: publicationReceipt.rows[0].subject_id,
      publicationState: document.publication_state,
    };
  }

  if (
    document.publication_state !== "draft"
    || document.published_revision_id !== null
    || document.workflow_state !== "draft"
    || Number(document.revision_number) !== 2
  ) {
    throw new Error(
      "Refusing to replace an existing Agent Authority publication or an unexpected draft history.",
    );
  }

  const hero = await client.query(
    `SELECT a.id::text asset_id,a.filename,a.status,a.media_type,a.storage_key,
            a.checksum,a.byte_size,a.alt_text,
            latest.id::text version_id,latest.version_number,latest.width,latest.height,
            latest.metadata,
            provenance.metadata provenance_metadata
       FROM cms_media_assets a
       JOIN LATERAL (
         SELECT v.* FROM cms_media_versions v
          WHERE v.asset_id=a.id
          ORDER BY v.version_number DESC
          LIMIT 1
       ) latest ON true
       JOIN LATERAL (
         SELECT v.metadata FROM cms_media_versions v
          WHERE v.asset_id=a.id
          ORDER BY v.version_number ASC
          LIMIT 1
       ) provenance ON true
      WHERE a.filename=$1 AND a.checksum=$2
      FOR UPDATE OF a`,
    [STATIC_HERO_FILENAME, STATIC_HERO_CHECKSUM],
  );
  if (
    hero.rowCount !== 1
    || hero.rows[0].media_type !== "image/jpeg"
    || hero.rows[0].storage_key === null
    || !Number(hero.rows[0].width)
    || !Number(hero.rows[0].height)
  ) {
    throw new Error(
      `The existing static hero ${STATIC_HERO_SOURCE} is not uniquely available with its expected checksum.`,
    );
  }
  const heroRow = hero.rows[0];
  const priorMetadata = heroRow.provenance_metadata && typeof heroRow.provenance_metadata === "object"
    ? heroRow.provenance_metadata as Record<string, unknown>
    : {};
  const priorRights = priorMetadata.rights && typeof priorMetadata.rights === "object"
    && !Array.isArray(priorMetadata.rights)
    ? priorMetadata.rights as Record<string, unknown>
    : {};
  const latestMetadata = heroRow.metadata && typeof heroRow.metadata === "object"
    ? heroRow.metadata as Record<string, unknown>
    : {};
  const latestRights = latestMetadata.rights && typeof latestMetadata.rights === "object"
    && !Array.isArray(latestMetadata.rights)
    ? latestMetadata.rights as Record<string, unknown>
    : {};
  const rightsStatus = latestMetadata.rightsStatus ?? latestRights.status;
  const accessibilityStatus = latestMetadata.accessibilityStatus;
  let heroVersionId = String(heroRow.version_id);
  if (
    heroRow.status !== "active"
    || !["approved", "approved-use"].includes(String(rightsStatus))
    || accessibilityStatus !== "approved"
  ) {
    // Preserve the asset's original provenance metadata and exact bytes while
    // recording a scoped approved-use review. This does not assert ownership.
    const approvedMetadata = {
      ...priorMetadata,
      rightsStatus: "approved-use",
      accessibilityStatus: "approved",
      rights: {
        ...priorRights,
        status: "approved-use",
        source: STATIC_HERO_SOURCE,
        scope: "Agent Authority Model UAE/English hero only",
        reviewBasis: {
          checksum: STATIC_HERO_CHECKSUM,
          repositoryFile: STATIC_HERO_SOURCE,
          repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
          existingStaticUse: "AgentAuthorityModel.tsx hero fallback and CMS hero resolution",
          rendererCommit: STATIC_HERO_RENDERER_COMMIT,
        },
      },
      sourceReview: {
        sourceRightsApproved: true,
        accessibilityApproved: true,
        reviewedBy: String(actor.id),
        scope: "Agent Authority Model UAE/English hero only",
        reviewBasis: {
          checksum: STATIC_HERO_CHECKSUM,
          repositoryFile: STATIC_HERO_SOURCE,
          repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
          existingStaticUse: "AgentAuthorityModel.tsx hero fallback and CMS hero resolution",
          rendererCommit: STATIC_HERO_RENDERER_COMMIT,
          altText: heroRow.alt_text || STATIC_HERO_ALT_TEXT,
        },
        ownershipClaim: "none; original credit retained without asserting legal ownership",
      },
    };
    const reviewedAsset = await client.query(
      `UPDATE cms_media_assets
          SET status='active',updated_at=now()
        WHERE id=$1 AND status IN ('pending-review','active','ready')
      RETURNING id::text`,
      [heroRow.asset_id],
    );
    if (reviewedAsset.rowCount !== 1) {
      throw new Error("The existing static hero changed before its authorized media review.");
    }
    const appended = await client.query(
      `INSERT INTO cms_media_versions
        (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,
               (SELECT COALESCE(max(version_number),0)+1 FROM cms_media_versions WHERE asset_id=$1),
               $2,$3,$4,$5,$6,$7)
      RETURNING id::text,version_number`,
      [
        heroRow.asset_id,
        heroRow.storage_key,
        heroRow.checksum,
        heroRow.byte_size,
        heroRow.width,
        heroRow.height,
        approvedMetadata,
      ],
    );
    if (appended.rowCount !== 1) {
      throw new Error("The authorized static hero metadata review did not create one immutable version.");
    }
    heroVersionId = String(appended.rows[0].id);
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES ($1,$2,'media.approved','media',$3,$4,$5)`,
      [
        actor.id,
        actor.email,
        heroRow.asset_id,
        `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:media-review`,
        {
          mediaVersionId: heroVersionId,
          previousStatus: heroRow.status,
          nextStatus: "active",
          sourceRightsApproved: true,
          accessibilityApproved: true,
          source: STATIC_HERO_SOURCE,
          scope: "Agent Authority Model UAE/English hero only",
          reviewBasis: {
            checksum: STATIC_HERO_CHECKSUM,
            repositoryFile: STATIC_HERO_SOURCE,
            repositoryCommit: STATIC_HERO_REPOSITORY_COMMIT,
            existingStaticUse: "AgentAuthorityModel.tsx hero fallback and CMS hero resolution",
            rendererCommit: STATIC_HERO_RENDERER_COMMIT,
            altText: heroRow.alt_text || STATIC_HERO_ALT_TEXT,
          },
          ownershipClaim: "none; original credit retained without asserting legal ownership",
        },
      ],
    );
  }

  const stagedPayload = JSON.parse(JSON.stringify(document.payload)) as Record<string, any>;
  const stagedContent = stagedPayload.content;
  if (!stagedContent || typeof stagedContent !== "object" || Array.isArray(stagedContent)) {
    throw new Error("The staged Agent Authority revision has no content object to save.");
  }
  if (stagedContent.heroMediaId !== heroRow.asset_id) {
    throw new Error("The staged legacy hero reference no longer matches the existing static hero.");
  }
  delete stagedContent.heroMediaId;
  stagedContent.heroMedia = {
    mediaId: heroRow.asset_id,
    mediaVersionId: heroVersionId,
    role: "hero",
    altText: heroRow.alt_text || STATIC_HERO_ALT_TEXT,
  };
  stagedPayload.mediaIds = [heroRow.asset_id];
  const savedDraft = validateCmsSnapshot("framework", stagedPayload, "draft");
  if (!savedDraft.success) {
    throw new Error(`The ordinary CMS save payload is invalid: ${savedDraft.errors.join("; ")}`);
  }
  const savedPublication = validateCmsSnapshot("framework", stagedPayload, "publish");
  if (!savedPublication.success) {
    throw new Error(`The saved publication payload is invalid: ${savedPublication.errors.join("; ")}`);
  }
  const saveDigest = digest(stagedPayload);
  const saved = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,source_revision_id,reason)
     VALUES ($1,$2,1,$3,$4,'draft',$5,$6,$7)
     RETURNING id::text`,
    [
      document.edition_id,
      Number(document.revision_number) + 1,
      stagedPayload,
      saveDigest,
      actor.id,
      stagedRevisionId,
      PUBLICATION_REASON,
    ],
  );
  if (saved.rowCount !== 1) throw new Error("The ordinary CMS save did not create one successor revision.");
  const savedRevisionId = String(saved.rows[0].id);
  await client.query(
    `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
     VALUES ($1,$2,$3,$4)`,
    [heroRow.asset_id, heroVersionId, document.document_id, `revision:${savedRevisionId}`],
  );
  const state = await client.query(
    `SELECT draft_version,shared_source_edition_id::text,shared_source_revision_id::text
       FROM cms_document_availability_states
      WHERE document_id=$1
      FOR UPDATE`,
    [document.document_id],
  );
  if (
    state.rowCount !== 1
    || state.rows[0].shared_source_edition_id !== document.edition_id
  ) {
    throw new Error("The destination source pointer changed before the ordinary CMS save.");
  }
  if (state.rows[0].shared_source_revision_id) {
    const source = await client.query(
      `SELECT 1 FROM cms_revisions
        WHERE id=$1 AND edition_id=$2`,
      [state.rows[0].shared_source_revision_id, document.edition_id],
    );
    if (source.rowCount !== 1) {
      throw new Error("The destination source pointer no longer belongs to the target edition.");
    }
  }
  await client.query(
    `UPDATE cms_document_availability_states
        SET draft_version=draft_version+1,shared_source_revision_id=$2,
            reviewed_version=NULL,reviewed_source_revision_id=NULL,
            reviewed_selections='[]'::jsonb,updated_by_user_id=$3,updated_at=now()
      WHERE document_id=$1`,
    [document.document_id, savedRevisionId, actor.id],
  );
  await client.query(
    `UPDATE cms_documents SET updated_at=now() WHERE id=$1`,
    [document.document_id],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.updated','document',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      document.document_id,
      `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:save`,
      {
        revisionId: savedRevisionId,
        sourceRevisionId: stagedRevisionId,
        market: "uae",
        locale: "en",
        reason: PUBLICATION_REASON,
        preservedStaticHero: STATIC_HERO_SOURCE,
        clearedLegacyHeroMediaId: heroRow.asset_id,
        mediaVersionId: heroVersionId,
      },
    ],
  );

  const destinations = await client.query(
    `SELECT m.id::text market_edition_id,m.code,configured_locale.locale,
            a.published_decision,a.draft_decision
       FROM market_editions m
       CROSS JOIN LATERAL (
         SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
          WHERE locale IS NOT NULL
       ) configured_locale
       LEFT JOIN cms_document_market_availability a
         ON a.document_id=$1 AND a.market_edition_id=m.id
        AND a.locale=configured_locale.locale
      WHERE m.enabled=true
      ORDER BY m.code,configured_locale.locale
      FOR UPDATE OF m`,
    [document.document_id],
  );
  if (!destinations.rowCount) throw new Error("No enabled CMS destinations exist for availability review.");
  const selections = destinations.rows.map((destination: Record<string, any>) => ({
    marketEditionId: String(destination.market_edition_id),
    locale: String(destination.locale),
    decision: destination.code === "uae" && destination.locale === "en"
      ? "show"
      : (destination.draft_decision ?? destination.published_decision ?? "inherit"),
  }));
  for (const selection of selections) {
    const destination = destinations.rows.find((row: Record<string, any>) =>
      String(row.market_edition_id) === selection.marketEditionId
      && String(row.locale) === selection.locale);
    await client.query(
      `INSERT INTO cms_document_market_availability
        (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (document_id,market_edition_id,locale) DO UPDATE
         SET draft_decision=EXCLUDED.draft_decision,
             updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()`,
      [
        document.document_id,
        selection.marketEditionId,
        selection.locale,
        destination?.published_decision ?? "off",
        selection.decision,
        actor.id,
      ],
    );
  }
  const stagedAvailability = await client.query(
    `UPDATE cms_document_availability_states
        SET draft_version=draft_version+1,reviewed_version=NULL,
            reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
            updated_by_user_id=$2,updated_at=now()
      WHERE document_id=$1
      RETURNING draft_version`,
    [document.document_id, actor.id],
  );
  if (stagedAvailability.rowCount !== 1) {
    throw new Error("The UAE-only availability staging did not advance one destination version.");
  }
  const availabilityVersion = Number(stagedAvailability.rows[0].draft_version);
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.availability.staged','document',$3,$4,$5)`,
    [actor.id, actor.email, document.document_id, `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:availability-staged`, {
      version: availabilityVersion,
      destinations: selections,
      requestedPublicationMarket: "uae",
      requestedPublicationLocale: "en",
    }],
  );
  await client.query(
    `UPDATE cms_document_availability_states
        SET reviewed_version=draft_version,reviewed_selections=$2::jsonb,
            reviewed_source_revision_id=$3,reviewed_by_user_id=$4,
            reviewed_at=now(),updated_at=now()
      WHERE document_id=$1 AND draft_version=$5`,
    [
      document.document_id,
      JSON.stringify(selections),
      savedRevisionId,
      actor.id,
      availabilityVersion,
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.availability.reviewed','document',$3,$4,$5)`,
    [actor.id, actor.email, document.document_id, `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:availability-reviewed`, {
      version: availabilityVersion,
      destinations: selections,
      sourceRevisionId: savedRevisionId,
    }],
  );

  await client.query(
    `UPDATE cms_revisions
        SET workflow_state='approved',approved_by_user_id=$2,approved_at=now()
      WHERE id=$1 AND workflow_state='draft'`,
    [savedRevisionId, actor.id],
  );
  const published = await client.query(
    `UPDATE cms_market_editions
        SET publication_state='published',parity_complete=true,
            published_revision_id=$2,published_at=now(),updated_at=now()
      WHERE id=$1 AND publication_state='draft' AND published_revision_id IS NULL
      RETURNING id::text`,
    [document.edition_id, savedRevisionId],
  );
  if (published.rowCount !== 1) {
    throw new Error("The UAE edition changed before the scoped publication could commit.");
  }
  for (const selection of selections) {
    await client.query(
      `UPDATE cms_document_market_availability
          SET published_decision=$4,draft_decision=NULL,
              published_by_user_id=$5,published_at=now(),updated_at=now()
        WHERE document_id=$1 AND market_edition_id=$2 AND locale=$3`,
      [
        document.document_id,
        selection.marketEditionId,
        selection.locale,
        selection.decision,
        actor.id,
      ],
    );
  }
  await client.query(
    `UPDATE cms_document_availability_states
        SET published_version=$2,published_source_revision_id=$3,
            published_by_user_id=$4,published_at=now(),updated_at=now()
      WHERE document_id=$1 AND draft_version=$2
        AND shared_source_revision_id=$3`,
    [document.document_id, availabilityVersion, savedRevisionId, actor.id],
  );
  const result = {
    documentId: document.document_id,
    editionId: document.edition_id,
    revisionId: savedRevisionId,
    sourceRevisionId: stagedRevisionId,
    heroMediaId: heroRow.asset_id,
    heroMediaVersionId: heroVersionId,
    availabilityVersion,
    publicationState: "published",
    market: "uae",
    locale: "en",
  };
  const requestDigest = digest({
    guardrails: agentAuthorityGuardrails,
    sourceRevisionId: stagedRevisionId,
    heroMedia: {
      filename: STATIC_HERO_FILENAME,
      checksum: STATIC_HERO_CHECKSUM,
    },
    market: "uae",
    locale: "en",
  });
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT,
      AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_OPERATION,
      savedRevisionId,
      requestDigest,
      digest(result),
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.published','document',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      document.document_id,
      `${AGENT_AUTHORITY_GUARDRAILS_PUBLICATION_RECEIPT}:published`,
      {
        ...result,
        scopedOperatorReconciliation: true,
        normalCmsLifecycle: false,
        reviewed: true,
        availabilitySelections: selections,
        reason: PUBLICATION_REASON,
      },
    ],
  );
  return { disposition: "published" as const, ...result };
}

async function main() {
  if (!apply && !verify && !publish) {
    console.log(JSON.stringify({ receipt: AGENT_AUTHORITY_GUARDRAILS_RECEIPT, guardrails: agentAuthorityGuardrails }, null, 2));
    console.error("Dry run: pass --apply-db, --verify-db, or --publish-db with --target=development.");
    return;
  }
  assertDevelopmentTarget();
  const mutating = apply || publish;
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query(mutating ? "BEGIN" : "BEGIN READ ONLY");
    const result = await reconcile(client, mutating);
    const publication = publish ? await publishScoped(client, result.revisionId) : null;
    if (mutating) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(
      `Task 324 Guardrails and authority ${result.disposition}; revision=${result.revisionId}; `
      + `publication=${publication?.disposition ?? result.publicationState}${mutating ? "" : " (rolled back)"}.`,
    );
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