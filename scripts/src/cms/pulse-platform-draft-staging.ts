import { createHash } from "node:crypto";
import {
  cogniagentsPulseDraftContent,
  cognibasePulseDraftContent,
  validateCmsSnapshot,
} from "@workspace/api-zod";

export const PULSE_PLATFORM_DRAFT_STAGE_REASON =
  "Development-only system draft import of owner-supplied Pulse platform defaults; pending human editorial, factual, market, accessibility, rights, and administrator review. No review, approval, or publication was performed.";
export const PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL = "cms-inventory-migration@service.invalid";
export const PULSE_PLATFORM_DRAFT_STAGE_ACTOR_LABEL = "cms-pulse-platform-system-draft-import";
export const PULSE_PLATFORM_DRAFT_STAGE_ACTION = "cms.pulse-platform.system-draft-imported";
export const PULSE_PLATFORM_DRAFT_STAGE_OPERATION = "cms.pulse-platform.owner-defaults-v1";
const KNOWN_LEGACY_COGNIAGENTS_DIGEST = "8e19eb42d28b015413e6286261f7b1e477f46c773b9b890da4937e6fb01924a2";
const MARKET = "uae";
const LOCALE = "en";

const targets = [
  {
    slug: "cognibase",
    title: "CogniBase",
    content: cognibasePulseDraftContent,
  },
  {
    slug: "cogniagents",
    title: "CogniAgents",
    content: cogniagentsPulseDraftContent,
  },
] as const;

export type PulsePlatformTarget = (typeof targets)[number];
export type SqlRow = Record<string, any>;
export type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{
    rowCount: number | null;
    rows: SqlRow[];
  }>;
};

export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

export function pulsePlatformSnapshot(target: PulsePlatformTarget) {
  return {
    slug: target.slug,
    title: target.title,
    summary: target.content.summary,
    seo: { noIndex: true },
    content: target.content,
    mediaIds: [],
    markets: [MARKET],
  };
}

export function pulsePlatformSnapshotDigest(snapshot: unknown): string {
  return createHash("sha256").update(canonicalJson(snapshot)).digest("hex");
}

export function pulsePlatformRequestId(target: PulsePlatformTarget, snapshot: unknown): string {
  return `${PULSE_PLATFORM_DRAFT_STAGE_OPERATION}:${target.slug}:${pulsePlatformSnapshotDigest(snapshot)}`;
}

function assertValidSnapshot(target: PulsePlatformTarget, snapshot: unknown): void {
  const result = validateCmsSnapshot("platform", snapshot, "draft");
  if (!result.success) {
    throw new Error(`${target.title} owner-supplied draft fails the shared CMS schema: ${result.errors.join("; ")}`);
  }
  const candidate = result.data as Record<string, any>;
  if (
    candidate.slug !== target.slug
    || candidate.title !== target.title
    || candidate.markets?.length !== 1
    || candidate.markets[0] !== MARKET
    || candidate.content?.template !== target.content.template
    || candidate.content?.pulsePage?.variant !== target.content.template
  ) {
    throw new Error(`${target.title} snapshot does not match its exact document identity or UAE/en target.`);
  }
}

/**
 * This is the exact one-revision CogniAgents draft emitted by the historical
 * inventory-v2 platform import. It is the sole legacy snapshot eligible for
 * replacement; deliberately do not accept approximate/partial matches.
 */
export const knownLegacyCogniAgentsSnapshot = {
  slug: "cogniagents",
  title: "CogniAgents",
  summary: "Governed agents coordinating operational tasks.",
  content: {
    schemaVersion: 1,
    category: "Specialist Engines",
    summary: "Governed agents coordinating operational tasks.",
    template: "standard",
    sections: [],
    capabilities: [],
    differentiators: [],
    visibility: "public",
    order: 2,
    sources: [{
      label: "Compiled Cognirise public website (src/pages/PlatformsOverview.tsx)",
      accessedAt: "2026-09-06",
    }],
    relatedIds: [],
  },
  seo: { noIndex: false },
  mediaIds: [],
  markets: [MARKET],
};

export type RevisionState = {
  id: string;
  revision_number: number;
  payload: unknown;
  content_digest: string;
  workflow_state: string;
  created_by_email: string;
  reason: string;
  approved_by_user_id: string | null;
  approved_at: unknown | null;
  source_revision_id: string | null;
};

export type EditionState = {
  id: string;
  document_id: string;
  market: string;
  locale: string;
  localized_slug: string | null;
  publication_state: string;
  published_revision_id: string | null;
  revisions: RevisionState[];
};

export type DocumentState = {
  id: string;
  kind: string;
  canonical_slug: string | null;
  title: string;
  status: string;
  editions: EditionState[];
};

export type TargetPlan =
  | { outcome: "create-document-and-draft"; snapshot: unknown; digest: string }
  | { outcome: "create-edition-and-draft"; documentId: string; snapshot: unknown; digest: string }
  | {
      outcome: "staged";
      documentId: string;
      editionId: string;
      revisionId: string;
      digest: string;
    }
  | {
      outcome: "replace-known-legacy-seed";
      documentId: string;
      editionId: string;
      revisionNumber: number;
      snapshot: unknown;
      digest: string;
    }
  | {
      outcome: "replayed";
      documentId: string;
      editionId: string;
      revisionId: string;
      digest: string;
    }
  | {
      outcome: "preserved";
      documentId: string;
      editionId: string;
      revisionId: string;
      digest: string;
    };

function isExactStageRevision(
  target: PulsePlatformTarget,
  revision: RevisionState,
  snapshot: unknown,
  digest: string,
): boolean {
  return canonicalJson(revision.payload) === canonicalJson(snapshot)
    && revision.content_digest === digest
    && revision.revision_number === (target.slug === "cogniagents" ? 2 : 1)
    && revision.reason === PULSE_PLATFORM_DRAFT_STAGE_REASON
    && revision.created_by_email === PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL
    && revision.source_revision_id === null;
}

function isExactLegacyCogniAgents(edition: EditionState, target: PulsePlatformTarget): boolean {
  if (target.slug !== "cogniagents") return false;
  const [legacy] = edition.revisions;
  return edition.publication_state === "draft"
    && edition.published_revision_id === null
    && edition.revisions.length === 1
    && legacy?.revision_number === 1
    && canonicalJson(legacy.payload) === canonicalJson(knownLegacyCogniAgentsSnapshot)
    && legacy.content_digest === KNOWN_LEGACY_COGNIAGENTS_DIGEST
    && legacy.workflow_state === "draft"
    && legacy.created_by_email === PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL
    && legacy.reason === "Inventory migration; pending editorial review."
    && legacy.approved_by_user_id === null
    && legacy.approved_at === null
    && legacy.source_revision_id === null;
}

export function planPulsePlatformTarget(
  target: PulsePlatformTarget,
  documentMatches: DocumentState[],
): TargetPlan {
  const snapshot = pulsePlatformSnapshot(target);
  assertValidSnapshot(target, snapshot);
  const digest = pulsePlatformSnapshotDigest(snapshot);

  if (documentMatches.length > 1) {
    throw new Error(`${target.title} has multiple documents with canonical slug ${target.slug}; refusing ambiguous staging.`);
  }
  const document = documentMatches[0];
  if (!document) return { outcome: "create-document-and-draft", snapshot, digest };
  if (
    document.kind !== "platform"
    || document.canonical_slug !== target.slug
    || document.title !== target.title
    || document.status !== "active"
  ) {
    throw new Error(`${target.title} document identity or status diverges from the exact owner-supplied target.`);
  }

  const marketEditions = document.editions.filter(
    (edition) => edition.market === MARKET && edition.locale === LOCALE,
  );
  if (marketEditions.length > 1) {
    throw new Error(`${target.title} has multiple UAE/en editions; refusing ambiguous staging.`);
  }
  const edition = marketEditions[0];
  if (!edition) {
    return { outcome: "create-edition-and-draft", documentId: document.id, snapshot, digest };
  }
  if (
    edition.document_id !== document.id
    || edition.market !== MARKET
    || edition.locale !== LOCALE
    || edition.localized_slug !== target.slug
  ) {
    throw new Error(`${target.title} UAE/en edition identity diverges from the exact target.`);
  }

  const existingStage = edition.revisions.find((revision) => isExactStageRevision(target, revision, snapshot, digest));
  if (existingStage) {
    const latest = edition.revisions.reduce(
      (current, revision) => revision.revision_number > current.revision_number ? revision : current,
      existingStage,
    );
    return {
      outcome: latest.id === existingStage.id ? "replayed" : "preserved",
      documentId: document.id,
      editionId: edition.id,
      revisionId: existingStage.id,
      digest,
    };
  }

  if (isExactLegacyCogniAgents(edition, target)) {
    return {
      outcome: "replace-known-legacy-seed",
      documentId: document.id,
      editionId: edition.id,
      revisionNumber: 2,
      snapshot,
      digest,
    };
  }

  throw new Error(
    `${target.title} UAE/en edition diverges from the absent target, exact known legacy seed, and this command's exact staged draft. No changes made.`,
  );
}

export function assertPulsePlatformDraftStageSafety(
  args: string[],
  environment: NodeJS.ProcessEnv = process.env,
): { apply: boolean } {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Pulse platform draft staging is disabled in production.");
  }
  if (args.some((argument) => argument === "--apply-db") && args.filter((argument) => argument === "--apply-db").length !== 1) {
    throw new Error("Specify --apply-db at most once.");
  }
  const targetArgs = args.filter((argument) => argument.startsWith("--target="));
  if (targetArgs.length > 1) throw new Error("Specify --target only once.");
  if (targetArgs.length === 1 && targetArgs[0] !== "--target=development") {
    throw new Error("Pulse platform draft staging only permits --target=development.");
  }
  const allowed = new Set(["--apply-db", "--target=development"]);
  const unknown = args.find((argument) => !allowed.has(argument));
  if (unknown) throw new Error(`Unsupported argument: ${unknown}`);
  if (args.includes("--apply-db") && targetArgs[0] !== "--target=development") {
    throw new Error("Database writes require the explicit --apply-db --target=development safeguards.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required for the configured development database.");
  return { apply: args.includes("--apply-db") };
}

export async function inspectPulsePlatformTargets(
  client: SqlClient,
  lockRows = false,
): Promise<Map<string, DocumentState[]>> {
  const lock = lockRows ? " FOR UPDATE" : "";
  const configuredMarket = await client.query(
    "SELECT code,default_locale,enabled FROM market_editions WHERE code=$1",
    [MARKET],
  );
  if (
    configuredMarket.rows.length !== 1
    || configuredMarket.rows[0].enabled !== true
    || configuredMarket.rows[0].default_locale !== LOCALE
  ) {
    throw new Error("Configured UAE market must be enabled with English as its default locale before staging.");
  }

  const result = new Map<string, DocumentState[]>();
  for (const target of targets) {
    const documents = await client.query(
      `SELECT id::text,kind,canonical_slug,title,status
         FROM cms_documents
        WHERE canonical_slug=$1
        ${lock}`,
      [target.slug],
    );
    const rows: DocumentState[] = [];
    for (const document of documents.rows) {
      const editions = await client.query(
        `SELECT id::text,document_id::text,market,locale,localized_slug,publication_state,
                published_revision_id::text
           FROM cms_market_editions
          WHERE document_id=$1 AND market=$2 AND locale=$3
          ${lock}`,
        [document.id, MARKET, LOCALE],
      );
      const editionStates: EditionState[] = [];
      for (const edition of editions.rows) {
        const revisions = await client.query(
          `SELECT r.id::text,r.revision_number,r.payload,r.content_digest,r.workflow_state,
                  u.email AS created_by_email,r.reason,r.approved_by_user_id::text,
                  r.approved_at,r.source_revision_id::text
             FROM cms_revisions r
             JOIN cms_users u ON u.id=r.created_by_user_id
            WHERE r.edition_id=$1
            ORDER BY r.revision_number ASC
            ${lockRows ? " FOR UPDATE OF r" : ""}`,
          [edition.id],
        );
        editionStates.push({
          id: String(edition.id),
          document_id: String(edition.document_id),
          market: String(edition.market),
          locale: String(edition.locale),
          localized_slug: edition.localized_slug == null ? null : String(edition.localized_slug),
          publication_state: String(edition.publication_state),
          published_revision_id: edition.published_revision_id == null
            ? null
            : String(edition.published_revision_id),
          revisions: revisions.rows as RevisionState[],
        });
      }
      rows.push({
        id: String(document.id),
        kind: String(document.kind),
        canonical_slug: document.canonical_slug == null ? null : String(document.canonical_slug),
        title: String(document.title),
        status: String(document.status),
        editions: editionStates,
      });
    }
    result.set(target.slug, rows);
  }
  return result;
}

async function ensureSystemDraftActor(client: SqlClient): Promise<string> {
  await client.query(
    `INSERT INTO cms_users(email,display_name,role,status)
     VALUES ($1,'CMS inventory migration service','viewer','suspended')
     ON CONFLICT (email) DO NOTHING`,
    [PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL],
  );
  const actor = await client.query(
    "SELECT id::text,display_name,role,status FROM cms_users WHERE email=$1",
    [PULSE_PLATFORM_DRAFT_STAGE_ACTOR_EMAIL],
  );
  const row = actor.rows[0];
  if (
    actor.rows.length !== 1
    || row.display_name !== "CMS inventory migration service"
    || row.role !== "viewer"
    || row.status !== "suspended"
  ) {
    throw new Error("The system draft-import attribution account is not the expected suspended viewer; refusing to alter or impersonate an editor.");
  }
  return row.id;
}

async function createDocumentAndEdition(
  client: SqlClient,
  target: PulsePlatformTarget,
): Promise<{ documentId: string; editionId: string }> {
  const document = await client.query(
    `INSERT INTO cms_documents(kind,canonical_slug,title,status)
     VALUES ('platform',$1,$2,'active') RETURNING id::text`,
    [target.slug, target.title],
  );
  const documentId = document.rows[0]?.id;
  if (!documentId) throw new Error(`Could not create ${target.title} platform document.`);
  const edition = await client.query(
    `INSERT INTO cms_market_editions(
       document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete
     ) VALUES ($1,$2,$3,$4,'draft','none',false) RETURNING id::text`,
    [documentId, MARKET, LOCALE, target.slug],
  );
  const editionId = edition.rows[0]?.id;
  if (!editionId) throw new Error(`Could not create ${target.title} UAE/en draft edition.`);
  return { documentId, editionId };
}

async function createDraftRevision(
  client: SqlClient,
  target: PulsePlatformTarget,
  actorId: string,
  documentId: string,
  editionId: string,
  revisionNumber: number,
  snapshot: unknown,
  digest: string,
): Promise<string> {
  const inserted = await client.query(
    `INSERT INTO cms_revisions(
       edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,reason
     ) VALUES ($1,$2,1,$3::jsonb,$4,'draft',$5,$6)
     RETURNING id::text`,
    [editionId, revisionNumber, JSON.stringify(snapshot), digest, actorId, PULSE_PLATFORM_DRAFT_STAGE_REASON],
  );
  const revisionId = inserted.rows[0]?.id;
  if (!revisionId) throw new Error(`Could not stage the ${target.title} draft revision.`);

  const requestId = pulsePlatformRequestId(target, snapshot);
  await client.query(
    `INSERT INTO cms_audit_events(
       actor_user_id,actor_label,action,target_type,target_id,request_id,metadata
     ) VALUES ($1,$2,$3,'platform',$4,$5,$6::jsonb)`,
    [
      actorId,
      PULSE_PLATFORM_DRAFT_STAGE_ACTOR_LABEL,
      PULSE_PLATFORM_DRAFT_STAGE_ACTION,
      documentId,
      requestId,
      JSON.stringify({
        reason: PULSE_PLATFORM_DRAFT_STAGE_REASON,
        importType: "system-draft-import",
        source: "shared-owner-supplied-pulse-platform-defaults",
        market: MARKET,
        locale: LOCALE,
        documentSlug: target.slug,
        editionId,
        revisionId,
        contentDigest: digest,
        workflowState: "draft",
        publicationState: "draft",
        approvalPerformed: false,
        publicationPerformed: false,
      }),
    ],
  );
  return revisionId;
}

async function assertReplayAudit(client: SqlClient, target: PulsePlatformTarget, plan: TargetPlan): Promise<void> {
  if (plan.outcome !== "replayed" && plan.outcome !== "preserved") return;
  const result = await client.query(
    `SELECT actor_label,action,target_type,target_id,metadata
       FROM cms_audit_events
      WHERE request_id=$1`,
    [pulsePlatformRequestId(target, pulsePlatformSnapshot(target))],
  );
  const event = result.rows[0];
  if (
    result.rows.length !== 1
    || event.actor_label !== PULSE_PLATFORM_DRAFT_STAGE_ACTOR_LABEL
    || event.action !== PULSE_PLATFORM_DRAFT_STAGE_ACTION
    || event.target_type !== "platform"
    || event.target_id !== plan.documentId
    || event.metadata?.revisionId !== plan.revisionId
    || event.metadata?.editionId !== plan.editionId
    || event.metadata?.contentDigest !== plan.digest
    || event.metadata?.reason !== PULSE_PLATFORM_DRAFT_STAGE_REASON
    || event.metadata?.importType !== "system-draft-import"
  ) {
    throw new Error(`${target.title} staged revision has no matching system draft-import audit event; refusing replay.`);
  }
}

export async function stagePulsePlatformDrafts(
  client: SqlClient,
  apply: boolean,
): Promise<TargetPlan[]> {
  if (apply) {
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [PULSE_PLATFORM_DRAFT_STAGE_OPERATION]);
  }
  const inspected = await inspectPulsePlatformTargets(client, apply);
  const plans = targets.map((target) => planPulsePlatformTarget(target, inspected.get(target.slug) ?? []));
  for (let index = 0; index < plans.length; index++) {
    await assertReplayAudit(client, targets[index], plans[index]);
  }
  if (!apply) return plans;

  const needsActor = plans.some((plan) =>
    plan.outcome === "create-document-and-draft"
    || plan.outcome === "create-edition-and-draft"
    || plan.outcome === "replace-known-legacy-seed"
  );
  const actorId = needsActor ? await ensureSystemDraftActor(client) : null;
  const output: TargetPlan[] = [];
  for (let index = 0; index < plans.length; index++) {
    const target = targets[index];
    const plan = plans[index];
    if (plan.outcome === "create-document-and-draft") {
      const { documentId, editionId } = await createDocumentAndEdition(client, target);
      const revisionId = await createDraftRevision(
        client, target, actorId!, documentId, editionId, 1, plan.snapshot, plan.digest,
      );
      output.push({ outcome: "staged", documentId, editionId, revisionId, digest: plan.digest });
    } else if (plan.outcome === "create-edition-and-draft") {
      const editionResult = await client.query(
        `INSERT INTO cms_market_editions(
           document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete
         ) VALUES ($1,$2,$3,$4,'draft','none',false) RETURNING id::text`,
        [plan.documentId, MARKET, LOCALE, target.slug],
      );
      const editionId = editionResult.rows[0]?.id;
      if (!editionId) throw new Error(`Could not create ${target.title} UAE/en draft edition.`);
      const revisionId = await createDraftRevision(
        client, target, actorId!, plan.documentId, editionId, 1, plan.snapshot, plan.digest,
      );
      output.push({
        outcome: "staged",
        documentId: plan.documentId,
        editionId,
        revisionId,
        digest: plan.digest,
      });
    } else if (plan.outcome === "replace-known-legacy-seed") {
      const revisionId = await createDraftRevision(
        client,
        target,
        actorId!,
        plan.documentId,
        plan.editionId,
        plan.revisionNumber,
        plan.snapshot,
        plan.digest,
      );
      output.push({
        outcome: "staged",
        documentId: plan.documentId,
        editionId: plan.editionId,
        revisionId,
        digest: plan.digest,
      });
    } else {
      output.push(plan);
    }
  }
  return output;
}

export const PULSE_PLATFORM_DRAFT_TARGETS = targets;
export const PULSE_PLATFORM_DRAFT_MARKET = MARKET;
export const PULSE_PLATFORM_DRAFT_LOCALE = LOCALE;