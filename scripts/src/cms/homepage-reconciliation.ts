import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { repositoryRoot } from "./common.js";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

export const HOMEPAGE_PATH = "/";
export const HOMEPAGE_SOURCE_KEY = "compiled:/";
export const HOMEPAGE_RECEIPT = "cms-homepage-task-330-v1:draft";
export const HOMEPAGE_REASON =
  "Task 330: reconciled the generated homepage parity draft without replacing published or regional editorial authority.";
const SERVICE_EMAIL = "cms-reconciliation@system.invalid";
export const RETIRED_HOMEPAGE_TEXT_SLOTS = [
  "home-framework-applications-label",
  "home-framework-authority-body",
  "home-framework-authority-title",
  "home-framework-autonomy-body",
  "home-framework-autonomy-title",
  "home-framework-label",
  "home-framework-promotion-body",
  "home-framework-promotion-title",
  "home-framework-teaser",
  "home-framework-title",
] as const;
export const HOMEPAGE_OVERLAY_CTA_SLOTS = [
  "home-framework-authority-cta",
  "home-framework-idao-cta",
  "home-framework-portfolio-cta",
  "home-image-ledger-first-cta",
  "home-image-ledger-second-cta",
  "home-image-ledger-third-cta",
] as const;
export const HOMEPAGE_CAPTION_SLOT = "home-image-ledger-first-caption";
export const HOMEPAGE_LEGACY_CAPTION = "Boundaries you can see.";

export interface SqlClient {
  query: (text: string, values?: unknown[]) => Promise<{
    rowCount: number | null;
    rows: Record<string, any>[];
  }>;
}

type HomepageSnapshot = Record<string, any>;

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

function migrationVisualSources(snapshot: HomepageSnapshot) {
  const sections = snapshot.content?.sections;
  return Array.isArray(sections)
    ? sections.filter((section) => section?.type === "migration-media")
    : [];
}

function sectionText(section: Record<string, any>) {
  return Array.isArray(section.body)
    && section.body.length === 1
    && section.body[0]?.type === "paragraph"
    && typeof section.body[0].text === "string"
    ? section.body[0].text
    : undefined;
}

export type HomepageSlotOverlay = {
  snapshot: HomepageSnapshot;
  customizedSlots: string[];
  addedSlots: string[];
};

/**
 * Apply only the Task 330 slot delta to an approved/current homepage
 * baseline. The baseline remains the authority for metadata, unrelated copy,
 * and immutable media references. A generated fallback is used only for a
 * missing governed slot or the exact retired caption default.
 */
export function overlayHomepageSlots(
  baseline: HomepageSnapshot,
  generated: HomepageSnapshot,
): HomepageSlotOverlay {
  if (baseline.content?.pagePath !== HOMEPAGE_PATH || generated.content?.pagePath !== HOMEPAGE_PATH) {
    throw new Error("Homepage slot overlay requires two root-page snapshots.");
  }
  if (!Array.isArray(baseline.content.sections) || !Array.isArray(generated.content.sections)) {
    throw new Error("Homepage slot overlay requires section inventories.");
  }
  const generatedById = new Map<string, Record<string, any>>(
    generated.content.sections.map((section: Record<string, any>) => [section.id, section] as const),
  );
  const customizedSlots: string[] = [];
  const addedSlots: string[] = [];
  const retired = new Set<string>(RETIRED_HOMEPAGE_TEXT_SLOTS);
  const sections = baseline.content.sections
    .filter((section: Record<string, any>) => !retired.has(section.id))
    .map((section: Record<string, any>) => structuredClone(section));
  const sectionById = new Map<string, Record<string, any>>(
    sections.map((section: Record<string, any>) => [section.id, section] as const),
  );
  const usedOrders = new Set(
    sections
      .map((section: Record<string, any>) => section.order)
      .filter((order: unknown): order is number => Number.isInteger(order)),
  );
  const numericOrders = Array.from(usedOrders) as number[];
  let nextOrder = Math.max(-1, ...numericOrders) + 1;
  const addGeneratedSection = (section: Record<string, any>) => {
    let order = Number.isInteger(section.order) && section.order >= 0 && section.order <= 10_000
      ? section.order
      : Math.min(nextOrder, 10_000);
    let attempts = 0;
    while (usedOrders.has(order)) {
      order = (order + 1) % 10_001;
      attempts += 1;
      if (attempts > 10_000) throw new Error("Homepage slot overlay has no available section order.");
    }
    nextOrder = Math.max(nextOrder, order + 1);
    const added = { ...structuredClone(section), order } as Record<string, any>;
    sections.push(added);
    usedOrders.add(order);
    sectionById.set(added.id, added);
    addedSlots.push(added.id);
  };

  for (const slotId of HOMEPAGE_OVERLAY_CTA_SLOTS) {
    const generatedSection = generatedById.get(slotId);
    if (!generatedSection || generatedSection.type !== "cta") {
      throw new Error(`Generated homepage is missing required CTA slot "${slotId}".`);
    }
    const existing = sectionById.get(slotId);
    if (existing) {
      if (
        existing.label !== generatedSection.label
        || existing.href !== generatedSection.href
        || (existing.style ?? "primary") !== (generatedSection.style ?? "primary")
      ) customizedSlots.push(slotId);
      continue;
    }
    addGeneratedSection(generatedSection);
  }

  const generatedCaption = generatedById.get(HOMEPAGE_CAPTION_SLOT);
  if (!generatedCaption || generatedCaption.type !== "narrative") {
    throw new Error(`Generated homepage is missing required caption slot "${HOMEPAGE_CAPTION_SLOT}".`);
  }
  const existingCaption = sectionById.get(HOMEPAGE_CAPTION_SLOT);
  if (!existingCaption) {
    addGeneratedSection(generatedCaption);
  } else if (sectionText(existingCaption) === HOMEPAGE_LEGACY_CAPTION) {
    existingCaption.body = structuredClone(generatedCaption.body);
  } else if (sectionText(existingCaption) !== sectionText(generatedCaption)) {
    customizedSlots.push(HOMEPAGE_CAPTION_SLOT);
  }

  const result = structuredClone(baseline);
  result.content = {
    ...baseline.content,
    sections,
  };
  return { snapshot: result, customizedSlots, addedSlots };
}

export async function loadCompiledHomepage() {
  const inventory = JSON.parse(await readFile(
    `${repositoryRoot}/lib/db/landing-page-inventory.json`,
    "utf8",
  )) as Array<{
    sourceKey?: unknown;
    slug?: unknown;
    path?: unknown;
    title?: unknown;
    snapshot?: unknown;
  }>;
  const matches = inventory.filter((item) =>
    item.sourceKey === HOMEPAGE_SOURCE_KEY
    && item.slug === "homepage"
    && item.path === HOMEPAGE_PATH
    && item.title === "Homepage"
  );
  if (matches.length !== 1 || !matches[0].snapshot) {
    throw new Error("Generated inventory must contain exactly one compiled homepage authority.");
  }
  const snapshot = matches[0].snapshot as HomepageSnapshot;
  const validation = validateCmsSnapshot("landing-page", snapshot, "draft");
  if (!validation.success) {
    throw new Error(`Generated homepage authority is invalid: ${validation.errors.join("; ")}`);
  }
  if ((validation.data.content as { pagePath?: unknown }).pagePath !== HOMEPAGE_PATH) {
    throw new Error("Generated homepage authority does not identify the root page path.");
  }
  return snapshot;
}

export function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Task 330 homepage reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Homepage database work requires the explicit --target=development safeguard.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

export type HomepageReconciliationPlan = {
  action: "replay" | "update-authority" | "append-draft" | "report-conflict";
  reason: string;
};

/**
 * Selects the only safe draft operation. The generated source is treated as a
 * slot delta; approved and current eligible revisions are overlaid rather than
 * replaced wholesale. An in-review revision is reported and left untouched.
 */
export function planHomepageDraftReconciliation({
  compiledPayload,
  generatedPayload,
  latestPayload,
  latestRevisionId,
  latestWorkflowState,
  publishedRevisionId,
  receiptExists,
}: {
  compiledPayload?: unknown;
  generatedPayload: unknown;
  latestPayload?: unknown;
  latestRevisionId?: string;
  latestWorkflowState?: string;
  publishedRevisionId?: string | null;
  receiptExists?: boolean;
}): HomepageReconciliationPlan {
  if (receiptExists) {
    return {
      action: "replay",
      reason: "The receipt already proves this exact generated homepage draft reconciliation.",
    };
  }
  if (latestPayload === undefined) {
    return {
      action: "append-draft",
      reason: "The canonical homepage edition has no revision; creating its first generated draft.",
    };
  }
  if (latestWorkflowState === "in-review") {
    return {
      action: "report-conflict",
      reason: "The latest homepage revision is in review; preserving it for the current editorial workflow.",
    };
  }
  if (!["approved", "draft", "rejected"].includes(String(latestWorkflowState))) {
    return {
      action: "report-conflict",
      reason: "The latest homepage revision is not an eligible approved or editable baseline; preserving it.",
    };
  }
  const overlay = overlayHomepageSlots(
    latestPayload as HomepageSnapshot,
    generatedPayload as HomepageSnapshot,
  );
  if (canonicalJson(overlay.snapshot) === canonicalJson(latestPayload)) {
    return {
      action: "update-authority",
      reason: "The latest homepage revision already contains the homepage slot delta; recording its source authority.",
    };
  }
  return {
    action: "append-draft",
    reason: publishedRevisionId && latestRevisionId === publishedRevisionId
      ? "The published homepage is immutable; staging the slot overlay as a new draft."
      : "Staging the slot overlay on the latest eligible homepage editorial baseline.",
  };
}

function assertHomepageAuthority(row: Record<string, any>) {
  if (
    row.kind !== "landing-page"
    || row.canonical_slug !== "homepage"
    || row.document_status !== "active"
    || row.market !== "uae"
    || row.locale !== "en"
    || row.localized_slug !== "homepage"
  ) {
    throw new Error("Expected one active UAE/English compiled homepage landing authority.");
  }
}

async function ensureServiceAccount(client: SqlClient, allowCreate: boolean) {
  let result = await client.query(
    `SELECT id::text,email,status FROM cms_users WHERE email=$1 ${allowCreate ? "FOR UPDATE" : ""}`,
    [SERVICE_EMAIL],
  );
  if (!result.rowCount) {
    if (!allowCreate) throw new Error("The homepage reconciliation service account is missing.");
    result = await client.query(
      `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
       VALUES ($1,'CMS reconciliation','editor','active',now())
       RETURNING id::text,email,status`,
      [SERVICE_EMAIL],
    );
  }
  if (
    result.rowCount !== 1
    || result.rows[0].email !== SERVICE_EMAIL
    || result.rows[0].status !== "active"
  ) {
    throw new Error("The homepage reconciliation service account is not active.");
  }
  return result.rows[0] as { id: string; email: string; status: string };
}

// Schema push does not run the historical landing seed migration. Restore
// only absent identities inside the caller's transaction, never a publication.
export async function ensureHomepageIdentity(client: SqlClient) {
  await client.query("SELECT pg_advisory_xact_lock(hashtext('cms:seed:compiled:/'))");
  let document = await client.query(
    "SELECT id::text,kind,status FROM cms_documents WHERE canonical_slug='homepage' FOR UPDATE",
  );
  if (!document.rowCount) {
    document = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,status)
       VALUES ('landing-page','homepage','Homepage','active')
       RETURNING id::text,kind,status`,
    );
  }
  if (document.rowCount !== 1 || document.rows[0].kind !== "landing-page" || document.rows[0].status !== "active") {
    throw new Error("Conflicting homepage document identity; preserving existing content.");
  }
  const documentId = document.rows[0].id;
  const editions = await client.query(
    `SELECT document_id::text,localized_slug FROM cms_market_editions
      WHERE market='uae' AND locale='en'
        AND (document_id=$1 OR localized_slug='homepage') FOR UPDATE`,
    [documentId],
  );
  if (!editions.rowCount) {
    await client.query(
      `INSERT INTO cms_market_editions
        (document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete)
       VALUES ($1,'uae','en','homepage','draft','none',false)`,
      [documentId],
    );
  } else if (editions.rowCount !== 1 || editions.rows[0].document_id !== documentId || editions.rows[0].localized_slug !== "homepage") {
    throw new Error("Conflicting UAE/English homepage route; preserving existing content.");
  }
}

async function reconcileHomepage(
  client: SqlClient,
  actor: { id: string; email: string },
  generated: HomepageSnapshot,
  allowCreate: boolean,
) {
  if (allowCreate) await ensureHomepageIdentity(client);
  const authority = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.id::text edition_id,e.market,e.locale,e.localized_slug,
            e.publication_state,e.published_revision_id::text
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
        AND e.market='uae' AND e.locale='en'
      WHERE d.canonical_slug='homepage'
      ${allowCreate ? "FOR UPDATE OF d,e" : ""}`,
  );
  if (authority.rowCount !== 1) {
    throw new Error("Expected exactly one UAE/English homepage landing edition.");
  }
  const row = authority.rows[0];
  assertHomepageAuthority(row);
  // Do not read a lateral latest-revision row in the same statement as the
  // edition lock: PostgreSQL can retain the pre-wait snapshot for that row
  // while another editor commits. The edition lock above is the concurrency
  // boundary; this second query observes the settled latest revision.
  const latest = await client.query(
    `SELECT id::text latest_revision_id,revision_number latest_revision_number,
            payload latest_payload,workflow_state latest_workflow_state
       FROM cms_revisions
      WHERE edition_id=$1
      ORDER BY revision_number DESC,created_at DESC,id DESC
      LIMIT 1`,
    [row.edition_id],
  );
  const latestRow = latest.rows[0];
  row.latest_revision_id = latestRow?.latest_revision_id;
  row.latest_revision_number = latestRow?.latest_revision_number;
  row.latest_payload = latestRow?.latest_payload;
  row.latest_workflow_state = latestRow?.latest_workflow_state;

  const reconciliation = await client.query(
    `SELECT source_key,compiled_digest,compiled_payload
       FROM cms_landing_page_reconciliation
      WHERE document_id=$1 AND source_key=$2
      ${allowCreate ? "FOR UPDATE" : ""}`,
    [row.document_id, HOMEPAGE_SOURCE_KEY],
  );
  if (reconciliation.rowCount && reconciliation.rowCount !== 1) {
    throw new Error("Homepage compiled authority has duplicate reconciliation rows.");
  }
  const compiledPayload = reconciliation.rows[0]?.compiled_payload as HomepageSnapshot | undefined;
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [HOMEPAGE_RECEIPT],
  );
  if (receipt.rowCount && receipt.rowCount !== 1) {
    throw new Error("Homepage reconciliation receipt is duplicated.");
  }
  const requestDigest = digest(generated);

  if (receipt.rowCount) {
    const revision = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.payload,e.document_id::text
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$1`,
      [receipt.rows[0].subject_id],
    );
    const revisionPayloadDigest = revision.rowCount === 1
      ? digest(revision.rows[0].payload)
      : "";
    const expectedResultDigest = digest({
      documentId: row.document_id,
      editionId: row.edition_id,
      revisionId: receipt.rows[0].subject_id,
      payloadDigest: revisionPayloadDigest,
    });
    if (
      receipt.rows[0].operation !== "cms.homepage.draft-reconciled"
      || revision.rowCount !== 1
      || receipt.rows[0].request_digest !== revisionPayloadDigest
      || receipt.rows[0].result_digest !== expectedResultDigest
      || revision.rows[0].edition_id !== row.edition_id
      || revision.rows[0].document_id !== row.document_id
    ) {
      throw new Error("Homepage reconciliation receipt no longer proves its resulting draft.");
    }
    return { action: "replayed", revisionId: String(receipt.rows[0].subject_id) };
  }

  const plan = planHomepageDraftReconciliation({
    compiledPayload,
    generatedPayload: generated,
    latestPayload: row.latest_payload,
    latestRevisionId: row.latest_revision_id,
    latestWorkflowState: row.latest_workflow_state,
    publishedRevisionId: row.published_revision_id,
  });
  if (plan.action === "replay") {
    throw new Error("Unexpected homepage replay plan without a receipt.");
  }
  if (plan.action === "report-conflict") {
    return {
      action: plan.action,
      revisionId: row.latest_revision_id,
      reason: plan.reason,
    };
  }

  if (!reconciliation.rowCount) {
    if (!allowCreate) throw new Error("The compiled homepage reconciliation seed is missing.");
    await client.query(
      `INSERT INTO cms_landing_page_reconciliation
        (document_id,source_key,compiled_digest,compiled_payload,compiled_visual_sources)
       VALUES ($1,$2,$3,$4,$5)`,
      [
        row.document_id,
        HOMEPAGE_SOURCE_KEY,
        requestDigest,
        generated,
        JSON.stringify(migrationVisualSources(generated)),
      ],
    );
  } else if (canonicalJson(compiledPayload) !== canonicalJson(generated)) {
    if (!allowCreate) {
      throw new Error("Generated homepage authority differs from the stored compiled baseline.");
    }
    await client.query(
      `UPDATE cms_landing_page_reconciliation
          SET compiled_digest=$3,compiled_payload=$4,compiled_visual_sources=$5,reconciled_at=now()
        WHERE document_id=$1 AND source_key=$2`,
      [
        row.document_id,
        HOMEPAGE_SOURCE_KEY,
        requestDigest,
        generated,
        JSON.stringify(migrationVisualSources(generated)),
      ],
    );
  }

  const overlay = row.latest_payload
    ? overlayHomepageSlots(row.latest_payload, generated)
    : { snapshot: generated, customizedSlots: [], addedSlots: [] };
  const resulting = overlay.snapshot;
  const resultingDigest = digest(resulting);
  const currentAlreadyMatches = Boolean(
    row.latest_payload
    && canonicalJson(row.latest_payload) === canonicalJson(resulting),
  );
  let revisionId = row.latest_revision_id;
  if (plan.action === "append-draft") {
    const revision = await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
         created_by_user_id,reason)
       VALUES ($1,$2,1,$3,$4,'draft',$5,$6)
       RETURNING id::text`,
      [
        row.edition_id,
        Number(row.latest_revision_number ?? 0) + 1,
        resulting,
        resultingDigest,
        actor.id,
        HOMEPAGE_REASON,
      ],
    );
    if (revision.rowCount !== 1) throw new Error("Could not create the homepage generated draft.");
    revisionId = String(revision.rows[0].id);
  }
  if (!revisionId) throw new Error("Homepage reconciliation did not identify a revision.");

  const resultDigest = digest({
    documentId: row.document_id,
    editionId: row.edition_id,
    revisionId,
    payloadDigest: resultingDigest,
  });
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,'cms.homepage.draft-reconciled',$2,$3,$4)`,
    [HOMEPAGE_RECEIPT, revisionId, resultingDigest, resultDigest],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.draft-reconciled','document',$3,$4,$5)`,
    [actor.id, actor.email, row.document_id, HOMEPAGE_RECEIPT, {
      task: 330,
      sourceKey: HOMEPAGE_SOURCE_KEY,
      revisionId,
      publishedRevisionId: row.published_revision_id ?? null,
      regionalEditionsUntouched: true,
      resultingDigest,
      generatedDigest: requestDigest,
      customizedSlots: overlay.customizedSlots,
      addedSlots: overlay.addedSlots,
      reason: HOMEPAGE_REASON,
    }],
  );
  return {
    action: currentAlreadyMatches ? "update-authority" : plan.action,
    revisionId,
    customizedSlots: overlay.customizedSlots,
  };
}

async function run() {
  const generated = await loadCompiledHomepage();
  if (!shouldApply) {
    console.log(JSON.stringify({
      sourceKey: HOMEPAGE_SOURCE_KEY,
      pagePath: HOMEPAGE_PATH,
      digest: digest(generated),
      sections: generated.content.sections.length,
      dryRun: true,
    }, null, 2));
    console.error("Dry run: pass --apply-db --target=development to reconcile the homepage draft.");
    return;
  }
  assertDevelopmentTarget();
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const actor = await ensureServiceAccount(client, true);
    const outcome = await reconcileHomepage(client, actor, generated, true);
    await client.query("COMMIT");
    console.log(
      `Task 330 homepage draft reconciliation: ${outcome.action}`
      + `${outcome.revisionId ? ` revision=${outcome.revisionId}` : ""}.`
      + `${"reason" in outcome ? ` ${outcome.reason}` : ""}`
      + `${"customizedSlots" in outcome && outcome.customizedSlots?.length
        ? ` Preserved customized slots: ${outcome.customizedSlots.join(", ")}.`
        : ""}`,
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
  run().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}