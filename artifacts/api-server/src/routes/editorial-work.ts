import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import { authenticate, requireCsrf, requireMfa, type AuthContext } from "../lib/auth";
import { audit } from "../lib/cms";
import { asyncRoute } from "../lib/http";
import { lockDocumentForMutation, revalidateMutationAuth } from "../lib/managed-market-lifecycle";
import { editorialDigestConfigured } from "../lib/editorial-work";
import { canAccessEditionTarget } from "./documents";
import type { CmsCapability } from "../lib/policy";

const router: IRouter = Router();
router.use("/editorial-work", authenticate, requireMfa);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const REVIEW_RECOVERY_BLOCKED_REASON = "The requested reviewer is unavailable or no longer authorized for this exact edition.";
type Queryable = { query: (sql: string, values?: unknown[]) => Promise<{ rows: any[]; rowCount?: number | null }> };

function uuid(value: unknown): value is string {
  return typeof value === "string" && UUID.test(value);
}
function optionalUuid(value: unknown): string | null | undefined {
  return value === null ? null : value === undefined ? undefined : uuid(value) ? value : undefined;
}
function link(documentId: string, market: string | null, locale: string | null): string {
  return `/documents/${documentId}${market ? `?market=${encodeURIComponent(market)}&locale=${encodeURIComponent(locale ?? "")}` : ""}`;
}
function assignmentJson(row: Record<string, any>) {
  return {
    id: String(row.id), documentId: String(row.document_id), editionId: row.edition_id ? String(row.edition_id) : null,
    editorId: row.editor_user_id ? String(row.editor_user_id) : null,
    reviewerId: row.reviewer_user_id ? String(row.reviewer_user_id) : null,
    editor: row.editor_user_id ? { id: String(row.editor_user_id), name: row.editor_name ?? "Assigned editor" } : null,
    reviewer: row.reviewer_user_id ? { id: String(row.reviewer_user_id), name: row.reviewer_name ?? "Assigned reviewer" } : null,
    dueAt: row.due_at, createdAt: row.created_at, updatedAt: row.updated_at,
    status: "active",
  };
}
function reviewJson(row: Record<string, any>) {
  return {
    id: String(row.id), editionId: String(row.edition_id), revisionId: String(row.revision_id),
    requesterId: String(row.requester_user_id), reviewerId: String(row.reviewer_user_id),
    status: row.status, note: row.note ?? null, decisionNote: row.decision_note ?? null,
    requestedAt: row.requested_at, decidedAt: row.decided_at ?? null,
    supersededAt: row.superseded_at ?? null, blockedReason: row.blocked_reason ?? null,
  };
}

async function editionTarget(client: Queryable, editionId: string, lock = false) {
  const result = await client.query(
    `SELECT e.id,e.document_id,e.market,e.locale,d.title,d.kind
       FROM cms_market_editions e JOIN cms_documents d ON d.id=e.document_id
      WHERE e.id=$1 ${lock ? "FOR UPDATE OF e" : ""}`,
    [editionId],
  );
  return result.rows[0] as Record<string, any> | undefined;
}
async function hasEditionAccess(
  client: Queryable,
  userId: string,
  role: string,
  target: Record<string, any>,
  capability: CmsCapability = "view",
) {
  const user = await client.query(
    `SELECT id,status,role
       FROM cms_users
      WHERE id=$1
      FOR SHARE`,
    [userId],
  );
  if (!user.rowCount || user.rows[0].status !== "active") return false;
  const assignments = await client.query(
    "SELECT market_code FROM cms_user_market_assignments WHERE user_id=$1 ORDER BY market_code",
    [userId],
  );
  // Delegate the subtle shared/adopted binding boundary to the same authority
  // routine that guards document mutations and previews. canAccessContent reads
  // the durable capability matrix by subject id, so a reviewer whose central
  // grant was revoked is denied even when a legacy market assignment remains.
  return canAccessEditionTarget(client, {
    id: "", tokenHash: "", mfaVerified: true, createdAt: new Date(0), expiresAt: new Date(0),
    user: {
      id: userId, name: "", email: "", role: (user.rows[0].role ?? role) as AuthContext["user"]["role"], status: "active",
      marketCodes: assignments.rows.map((row: { market_code: string }) => String(row.market_code)),
      capabilityMatrixConfigured: false, capabilityGrants: [], legacyAdministratorMarketCodes: [],
      mfaEnabled: true, mustRotate: false, lastLoginAt: null, createdAt: new Date(0), updatedAt: new Date(0),
    },
  }, String(target.document_id), String(target.market), String(target.locale), capability);
}
async function eligibleAssignee(client: Queryable, userId: string | null, target: Record<string, any>) {
  if (!userId) return true;
  const user = await client.query(
    `SELECT id,role,status FROM cms_users WHERE id=$1 FOR SHARE`,
    [userId],
  );
  if (!user.rowCount || user.rows[0].status !== "active") return false;
  return hasEditionAccess(client, userId, String(user.rows[0].role), target, "edit");
}
async function eligibleReviewer(client: Queryable, userId: string | null, target: Record<string, any>) {
  if (!userId) return true;
  const user = await client.query(
    `SELECT id,role,status FROM cms_users
      WHERE id=$1 AND status='active'
        AND role IN ('administrator','publisher') FOR SHARE`,
    [userId],
  );
  return Boolean(user.rowCount) && hasEditionAccess(client, userId, String(user.rows[0].role), target, "review");
}

/**
 * Reviewer routing is a central capability decision, not an assignment
 * lookup. The caller supplies the complete separation-of-duties set so a
 * recovery can never select the requester, revision author, accountable
 * editor, or the recovery actor.
 */
async function centralEligibleReviewer(
  client: Queryable,
  target: Record<string, any>,
  excludedReviewerIds: ReadonlySet<string>,
  requestedReviewerId?: string | null,
) {
  const candidates = await client.query(
    `SELECT id,role FROM cms_users
      WHERE status='active'
        AND role IN ('administrator','publisher')
       ORDER BY CASE WHEN role='publisher' THEN 0 ELSE 1 END,
                display_name NULLS LAST,email,id
      FOR SHARE`,
  );
  const orderedCandidates = requestedReviewerId
    ? [
      ...candidates.rows.filter((candidate) => String(candidate.id) === requestedReviewerId),
      ...candidates.rows.filter((candidate) => String(candidate.id) !== requestedReviewerId),
    ]
    : candidates.rows;
  for (const candidate of orderedCandidates) {
    const candidateId = String(candidate.id);
    if (excludedReviewerIds.has(candidateId)) continue;
    if (await hasEditionAccess(client, candidateId, String(candidate.role), target, "review")) {
      return candidateId;
    }
  }
  return null;
}

/**
 * A requester may recover its own exact request with Edit authority. A
 * publisher/administrator with current exact Review authority is the central
 * routing command path. Explicit matrix users with Review authority are also
 * treated as routing managers; read the grant again so a long-lived session
 * cannot make a newly granted command path unusable.
 */
async function isCentralReviewManager(client: Queryable, auth: AuthContext) {
  if (["publisher", "administrator"].includes(auth.user.role)) return true;
  try {
    const grant = await client.query(
      `SELECT 1 FROM cms_user_capability_grants
        WHERE user_id=$1 AND capability='review'
        LIMIT 1`,
      [auth.user.id],
    );
    return Boolean(grant.rowCount);
  } catch (error: any) {
    if (error?.code === "42P01") return false;
    throw error;
  }
}
async function queueRows(auth: AuthContext, team: boolean, includeUnassigned: boolean) {
  const result = await pool.query(
    `SELECT assignment.id,assignment.document_id,assignment.edition_id,assignment.editor_user_id,
            assignment.reviewer_user_id,assignment.due_at,assignment.created_at,assignment.updated_at,
             d.title document_title,d.kind document_kind,e.market,e.locale,e.published_revision_id,
             binding.mode binding_mode,binding.translation_state,binding.based_on_baseline_revision_id,baseline.active_revision_id active_baseline_revision_id,
            latest.id current_revision_id,latest.revision_number current_revision_number,latest.workflow_state,
            editor.display_name editor_name,reviewer.display_name reviewer_name,
            editor.status editor_status,reviewer.status reviewer_status,editor.role editor_role,reviewer.role reviewer_role,
            CASE WHEN assignment.editor_user_id IS NULL THEN true
                 WHEN editor.role='administrator' THEN true
                 WHEN e.market<>'shared-source' AND EXISTS (
                   SELECT 1 FROM cms_user_market_assignments access_assignment
                    WHERE access_assignment.user_id=assignment.editor_user_id
                      AND access_assignment.market_code=e.market) THEN true ELSE false END editor_access,
            CASE WHEN assignment.reviewer_user_id IS NULL THEN true
                 WHEN reviewer.role='administrator' THEN true
                 WHEN e.market<>'shared-source' AND EXISTS (
                   SELECT 1 FROM cms_user_market_assignments access_assignment
                    WHERE access_assignment.user_id=assignment.reviewer_user_id
                      AND access_assignment.market_code=e.market) THEN true ELSE false END reviewer_access,
             request.id review_request_id,request.status review_status,request.blocked_reason review_blocked_reason,request.revision_id review_revision_id,
             request.reviewer_user_id review_reviewer_user_id,
             request_reviewer.display_name review_reviewer_name,request_reviewer.status review_reviewer_status,request_reviewer.role review_reviewer_role,
             true accessible
       FROM cms_documents d
       LEFT JOIN cms_editorial_assignments assignment
         ON assignment.document_id=d.id AND assignment.edition_id IS NULL
       LEFT JOIN cms_market_editions e ON e.id=assignment.edition_id
        LEFT JOIN market_editions catalogue ON catalogue.code=e.market
        LEFT JOIN cms_market_edition_bindings binding ON binding.document_id=d.id
          AND binding.market_edition_id=catalogue.id AND binding.locale=e.locale
        LEFT JOIN cms_shared_baselines baseline ON baseline.id=binding.baseline_id
       LEFT JOIN LATERAL (
         SELECT id,revision_number,workflow_state FROM cms_revisions
          WHERE edition_id=assignment.edition_id ORDER BY revision_number DESC LIMIT 1
       ) latest ON true
        LEFT JOIN LATERAL (
          SELECT * FROM cms_review_requests candidate
           WHERE candidate.edition_id=assignment.edition_id
           ORDER BY candidate.requested_at DESC,candidate.id DESC LIMIT 1
        ) request ON true
       LEFT JOIN cms_users editor ON editor.id=assignment.editor_user_id
       LEFT JOIN cms_users reviewer ON reviewer.id=assignment.reviewer_user_id
        LEFT JOIN cms_users request_reviewer ON request_reviewer.id=request.reviewer_user_id
       WHERE assignment.id IS NOT NULL
          AND ($1::boolean OR assignment.editor_user_id=$2 OR assignment.reviewer_user_id=$2
                OR (request.reviewer_user_id=$2 AND request.status='requested')
                OR (request.requester_user_id=$2 AND request.status='requested'))
      UNION ALL
     SELECT assignment.id,assignment.document_id,assignment.edition_id,assignment.editor_user_id,
            assignment.reviewer_user_id,assignment.due_at,assignment.created_at,assignment.updated_at,
             d.title,d.kind,e.market,e.locale,e.published_revision_id,
             binding.mode,binding.translation_state,binding.based_on_baseline_revision_id,baseline.active_revision_id,
            latest.id,latest.revision_number,latest.workflow_state,
            editor.display_name,reviewer.display_name,editor.status,reviewer.status,editor.role,reviewer.role,
            CASE WHEN assignment.editor_user_id IS NULL THEN true
                 WHEN editor.role='administrator' THEN true
                 WHEN e.market<>'shared-source' AND EXISTS (
                   SELECT 1 FROM cms_user_market_assignments access_assignment
                    WHERE access_assignment.user_id=assignment.editor_user_id
                      AND access_assignment.market_code=e.market) THEN true ELSE false END,
            CASE WHEN assignment.reviewer_user_id IS NULL THEN true
                 WHEN reviewer.role='administrator' THEN true
                 WHEN e.market<>'shared-source' AND EXISTS (
                   SELECT 1 FROM cms_user_market_assignments access_assignment
                    WHERE access_assignment.user_id=assignment.reviewer_user_id
                      AND access_assignment.market_code=e.market) THEN true ELSE false END,
              request.id,request.status,request.blocked_reason,request.revision_id,
              request.reviewer_user_id,
              request_reviewer.display_name,request_reviewer.status,request_reviewer.role,
             true
       FROM cms_editorial_assignments assignment
       JOIN cms_documents d ON d.id=assignment.document_id
       JOIN cms_market_editions e ON e.id=assignment.edition_id
        LEFT JOIN market_editions catalogue ON catalogue.code=e.market
        LEFT JOIN cms_market_edition_bindings binding ON binding.document_id=d.id
          AND binding.market_edition_id=catalogue.id AND binding.locale=e.locale
        LEFT JOIN cms_shared_baselines baseline ON baseline.id=binding.baseline_id
       LEFT JOIN LATERAL (
         SELECT id,revision_number,workflow_state FROM cms_revisions
          WHERE edition_id=assignment.edition_id ORDER BY revision_number DESC LIMIT 1
       ) latest ON true
        LEFT JOIN LATERAL (
          SELECT * FROM cms_review_requests candidate
           WHERE candidate.edition_id=assignment.edition_id
           ORDER BY candidate.requested_at DESC,candidate.id DESC LIMIT 1
        ) request ON true
       LEFT JOIN cms_users editor ON editor.id=assignment.editor_user_id
       LEFT JOIN cms_users reviewer ON reviewer.id=assignment.reviewer_user_id
        LEFT JOIN cms_users request_reviewer ON request_reviewer.id=request.reviewer_user_id
       WHERE ($1::boolean OR assignment.editor_user_id=$2 OR assignment.reviewer_user_id=$2
               OR (request.reviewer_user_id=$2 AND request.status='requested'))
      ORDER BY due_at NULLS LAST,updated_at DESC`,
    [team, auth.user.id],
  );
  const rows = result.rows as Record<string, any>[];
  const reviewOnly = await pool.query(
    `SELECT NULL::uuid id,e.document_id,e.id edition_id,NULL::uuid editor_user_id,
            request.reviewer_user_id,NULL::timestamptz due_at,request.requested_at created_at,
            request.requested_at updated_at,d.title document_title,d.kind document_kind,e.market,e.locale,
             e.published_revision_id,binding.mode,binding.translation_state,binding.based_on_baseline_revision_id,baseline.active_revision_id,
             latest.id current_revision_id,latest.revision_number current_revision_number,
             latest.workflow_state,NULL::text editor_name,reviewer.display_name reviewer_name,
             NULL::text editor_status,reviewer.status reviewer_status,NULL::text editor_role,reviewer.role reviewer_role,
             true editor_access,true reviewer_access,request.id review_request_id,request.status review_status,request.blocked_reason review_blocked_reason,
            request.revision_id review_revision_id,
             request.reviewer_user_id review_reviewer_user_id,
             reviewer.display_name review_reviewer_name,reviewer.status review_reviewer_status,reviewer.role review_reviewer_role,
             true accessible
       FROM cms_review_requests request
       JOIN cms_market_editions e ON e.id=request.edition_id
       JOIN cms_documents d ON d.id=e.document_id
        LEFT JOIN cms_users reviewer ON reviewer.id=request.reviewer_user_id
       LEFT JOIN cms_editorial_assignments assignment ON assignment.edition_id=e.id
        LEFT JOIN market_editions catalogue ON catalogue.code=e.market
        LEFT JOIN cms_market_edition_bindings binding ON binding.document_id=d.id
          AND binding.market_edition_id=catalogue.id AND binding.locale=e.locale
        LEFT JOIN cms_shared_baselines baseline ON baseline.id=binding.baseline_id
       LEFT JOIN LATERAL (
         SELECT id,revision_number,workflow_state FROM cms_revisions
          WHERE edition_id=e.id ORDER BY revision_number DESC LIMIT 1
       ) latest ON true
         WHERE assignment.id IS NULL
          AND request.id=(SELECT newest.id FROM cms_review_requests newest
                           WHERE newest.edition_id=e.id
                           ORDER BY newest.requested_at DESC,newest.id DESC LIMIT 1)
           AND ($1::boolean OR (request.reviewer_user_id=$2 AND request.status='requested')
                OR (request.requester_user_id=$2 AND request.status='requested'))`,
    [team, auth.user.id],
  );
  rows.push(...reviewOnly.rows);
  if (team && includeUnassigned) {
    const unassigned = await pool.query(
      `SELECT NULL::uuid id,e.document_id,e.id edition_id,NULL::uuid editor_user_id,NULL::uuid reviewer_user_id,
              NULL::timestamptz due_at,e.created_at,e.updated_at,d.title document_title,d.kind document_kind,
               e.market,e.locale,e.published_revision_id,binding.mode,binding.translation_state,
               binding.based_on_baseline_revision_id,baseline.active_revision_id,latest.id current_revision_id,
              latest.revision_number current_revision_number,latest.workflow_state,
              NULL::text editor_name,NULL::text reviewer_name,NULL::text editor_status,NULL::text reviewer_status,
              NULL::text editor_role,NULL::text reviewer_role,
               true editor_access,true reviewer_access,NULL::uuid review_request_id,NULL::text review_status,NULL::text review_blocked_reason,
              NULL::uuid review_revision_id,
               true accessible
         FROM cms_market_editions e JOIN cms_documents d ON d.id=e.document_id
         LEFT JOIN cms_editorial_assignments assignment ON assignment.edition_id=e.id
          LEFT JOIN market_editions catalogue ON catalogue.code=e.market
          LEFT JOIN cms_market_edition_bindings binding ON binding.document_id=d.id
            AND binding.market_edition_id=catalogue.id AND binding.locale=e.locale
          LEFT JOIN cms_shared_baselines baseline ON baseline.id=binding.baseline_id
         LEFT JOIN LATERAL (
           SELECT id,revision_number,workflow_state FROM cms_revisions
            WHERE edition_id=e.id ORDER BY revision_number DESC LIMIT 1
         ) latest ON true
          WHERE assignment.id IS NULL
            AND NOT EXISTS (SELECT 1 FROM cms_review_requests request WHERE request.edition_id=e.id)`,
    );
    rows.push(...unassigned.rows);
  }
  const reviewIds = [...new Set(rows
    .map((row) => row.review_request_id ? String(row.review_request_id) : null)
    .filter((id): id is string => Boolean(id)))];
  const reviews = reviewIds.length
    ? await pool.query("SELECT * FROM cms_review_requests WHERE id=ANY($1::uuid[])", [reviewIds])
    : { rows: [] as any[] };
  const reviewsById = new Map(reviews.rows.map((review) => [String(review.id), reviewJson(review)]));
  const authorized = await Promise.all(rows.map(async (row) => Boolean(row.accessible)
    && Boolean(row.edition_id)
    && hasEditionAccess(pool, auth.user.id, auth.user.role, row)));
  const assigneeRights = await Promise.all(rows.map(async (row) => ({
    editor: !row.editor_user_id || !row.edition_id
      ? true
      : await hasEditionAccess(pool, String(row.editor_user_id), String(row.editor_role), row),
    reviewer: !row.reviewer_user_id
      ? !row.review_request_id
      : !row.edition_id
        ? true
      : await hasEditionAccess(pool, String(row.reviewer_user_id), String(row.reviewer_role), row),
    reviewRequestReviewer: !row.review_request_id || !row.review_reviewer_user_id || !row.edition_id
      ? !row.review_request_id
      : await hasEditionAccess(pool, String(row.review_reviewer_user_id), String(row.review_reviewer_role), row),
  })));
  return rows
    .filter((_row, index) => authorized[index])
    .filter((row) => includeUnassigned || row.editor_user_id || row.reviewer_user_id || row.review_request_id)
    .map((row, _filteredIndex) => {
      const rowIndex = rows.indexOf(row);
      const rights = assigneeRights[rowIndex];
      const requestReviewerBlocked = row.review_status === "requested"
        && (!row.review_reviewer_user_id
          || row.review_reviewer_status !== "active"
          || !rights?.reviewRequestReviewer);
      const assigneeBlocked = (row.editor_status && row.editor_status !== "active")
        || (row.reviewer_status && row.reviewer_status !== "active")
        || !rights?.editor || !rights?.reviewer;
      const sharedBlocked = ["shared", "adapted"].includes(String(row.binding_mode ?? ""))
        && (row.translation_state === "stale"
          || (row.active_baseline_revision_id
            && row.based_on_baseline_revision_id !== row.active_baseline_revision_id));
      const reviewBlocked = ["rejected", "superseded", "blocked"].includes(String(row.review_status));
      const completed = !assigneeBlocked && !sharedBlocked && !reviewBlocked
        && !requestReviewerBlocked
        && row.review_status !== "requested"
        && Boolean(row.current_revision_id)
        && (row.workflow_state === "approved" || row.published_revision_id === row.current_revision_id);
      const blockedReason = sharedBlocked
        ? "The shared baseline has changed and this edition must be updated."
        : requestReviewerBlocked
          ? REVIEW_RECOVERY_BLOCKED_REASON
        : assigneeBlocked
          ? "An assigned editor or reviewer is inactive or no longer has market access."
          : row.review_status === "rejected"
            ? "The latest review request was rejected."
            : row.review_status === "superseded"
              ? "The latest review request was superseded."
              : row.review_status === "blocked"
                ? (row.review_blocked_reason ?? "The latest review request is blocked.")
                : null;
       return {
      id: row.id ? String(row.id) : `unassigned:${row.edition_id}`, editionId: row.edition_id ? String(row.edition_id) : null,
      documentId: String(row.document_id), documentTitle: row.document_title, documentKind: row.document_kind,
      market: row.market ?? null, locale: row.locale ?? null,
       editor: row.editor_user_id ? { id: String(row.editor_user_id), name: row.editor_name, status: row.editor_status } : null,
       reviewer: row.review_request_id && row.review_reviewer_user_id
         ? {
           id: String(row.review_reviewer_user_id),
           name: row.review_reviewer_name ?? "Unavailable reviewer",
           status: row.review_reviewer_status ?? "unavailable",
         }
         : row.reviewer_user_id
           ? {
             id: String(row.reviewer_user_id),
             name: row.reviewer_name ?? "Unavailable reviewer",
             status: row.reviewer_status ?? "unavailable",
           }
           : null,
      dueAt: row.due_at, overdue: Boolean(row.due_at && new Date(row.due_at).getTime() < Date.now()),
      status: blockedReason ? "blocked" : completed ? "completed" : "active",
      blockedReason,
      reviewRequestId: row.review_request_id ? String(row.review_request_id) : null,
       reviewRequest: row.review_request_id ? reviewsById.get(String(row.review_request_id)) ?? null : null,
      reviewRevisionId: row.review_revision_id ? String(row.review_revision_id) : null,
      currentRevisionId: row.current_revision_id ? String(row.current_revision_id) : null,
      currentRevisionNumber: row.current_revision_number ?? null, workflowState: row.workflow_state ?? null,
      publishedRevisionId: row.published_revision_id ? String(row.published_revision_id) : null,
      link: link(String(row.document_id), row.market, row.locale),
       assignedToActor: String(row.editor_user_id ?? "") === auth.user.id
         || String(row.reviewer_user_id ?? "") === auth.user.id,
    };
    });
}

router.put("/editorial-work/editions/:editionId/assignment", requireCsrf, asyncRoute(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const editorId = optionalUuid(body.editorId);
  const reviewerId = optionalUuid(body.reviewerId);
  const dueAt = body.dueAt === null ? null : typeof body.dueAt === "string" && !Number.isNaN(Date.parse(body.dueAt)) ? body.dueAt : undefined;
  if (!uuid(req.params.editionId) || editorId === undefined || reviewerId === undefined || dueAt === undefined
    || (dueAt !== null && new Date(dueAt).getTime() <= Date.now())) {
    res.status(400).json({ error: "Invalid editorial assignment." }); return;
  }
  if (editorId && reviewerId && editorId === reviewerId) {
    res.status(409).json({ error: "The accountable editor cannot also review this edition." }); return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const address = await editionTarget(client, req.params.editionId);
    if (!address || !await lockDocumentForMutation(client, String(address.document_id))) {
      await client.query("ROLLBACK"); res.status(404).json({ error: "Edition not found." }); return;
    }
    const target = await editionTarget(client, req.params.editionId, true);
    const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
    if (!target) { await client.query("ROLLBACK"); res.status(404).json({ error: "Edition not found." }); return; }
    if (!auth || !await hasEditionAccess(client, auth.user.id, auth.user.role, target, "edit")) {
      await client.query("ROLLBACK"); res.status(403).json({ error: "You are not assigned to this market." }); return;
    }
    if (!await eligibleAssignee(client, editorId, target) || !await eligibleReviewer(client, reviewerId, target)) {
      await client.query("ROLLBACK"); res.status(409).json({ error: "Editors and reviewers must be active and explicitly authorized for this exact edition." }); return;
    }
    const result = await client.query(
      `INSERT INTO cms_editorial_assignments
        (document_id,edition_id,editor_user_id,reviewer_user_id,due_at,created_by_user_id,updated_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$6)
       ON CONFLICT (edition_id) WHERE edition_id IS NOT NULL DO UPDATE
         SET editor_user_id=EXCLUDED.editor_user_id,reviewer_user_id=EXCLUDED.reviewer_user_id,
             due_at=EXCLUDED.due_at,updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()
       RETURNING *,
         (SELECT display_name FROM cms_users WHERE id=editor_user_id) editor_name,
         (SELECT display_name FROM cms_users WHERE id=reviewer_user_id) reviewer_name`,
      [target.document_id, target.id, editorId, reviewerId, dueAt, auth.user.id],
    );
    const superseded = await client.query(
      `UPDATE cms_review_requests
          SET status='superseded',superseded_at=now(),
              blocked_reason='The accountable reviewer was reassigned.'
        WHERE edition_id=$1 AND status='requested'
          AND reviewer_user_id IS DISTINCT FROM $2
        RETURNING *`,
      [target.id, reviewerId],
    );
    for (const request of superseded.rows) {
      await client.query(
        `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,document_id,revision_id,review_request_id,title,message,link)
         VALUES ($1,$2,'review-superseded',$3,$4,$5,$6,'Review request superseded',
                 'The accountable reviewer was reassigned before this review was decided.',$7)
         ON CONFLICT (user_id,event_key) DO NOTHING`,
        [request.reviewer_user_id, `review-superseded:${request.id}:reassigned`,
          target.id, target.document_id, request.revision_id, request.id,
          link(String(target.document_id), target.market, target.locale)],
      );
    }
    for (const recipient of [...new Set([editorId, reviewerId].filter((id): id is string => Boolean(id) && id !== auth.user.id))]) {
      await client.query(
        `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,document_id,title,message,link)
         VALUES ($1,$2,'assignment',$3,$4,'Editorial assignment updated',
                 'You have an editorial assignment for this edition.',$5)
         ON CONFLICT (user_id,event_key) DO NOTHING`,
        [recipient, `assignment:${target.id}:${editorId ?? "none"}:${reviewerId ?? "none"}:${dueAt ?? "none"}`, target.id, target.document_id,
          link(String(target.document_id), target.market, target.locale)],
      );
    }
    await audit(auth, "editorial.assignment_updated", "edition", String(target.id), { editorId, reviewerId, dueAt }, client);
    await client.query("COMMIT");
    res.json({ assignment: assignmentJson(result.rows[0]) });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}));

router.delete("/editorial-work/editions/:editionId/assignment", requireCsrf, asyncRoute(async (req, res) => {
  if (!uuid(req.params.editionId)) { res.status(400).json({ error: "Invalid edition." }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const address = await editionTarget(client, req.params.editionId);
    if (!address || !await lockDocumentForMutation(client, String(address.document_id))) {
      await client.query("ROLLBACK"); res.status(404).json({ error: "Edition not found." }); return;
    }
    const target = await editionTarget(client, req.params.editionId, true);
    const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
    if (!target) { await client.query("ROLLBACK"); res.status(404).json({ error: "Edition not found." }); return; }
    if (!auth || !await hasEditionAccess(client, auth.user.id, auth.user.role, target, "edit")) {
      await client.query("ROLLBACK"); res.status(403).json({ error: "You are not assigned to this market." }); return;
    }
    const superseded = await client.query(
      `UPDATE cms_review_requests
          SET status='superseded',superseded_at=now(),
              blocked_reason='The accountable reviewer assignment was cleared.'
        WHERE edition_id=$1 AND status='requested'
        RETURNING *`,
      [target.id],
    );
    for (const request of superseded.rows) {
      await client.query(
        `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,document_id,revision_id,review_request_id,title,message,link)
         VALUES ($1,$2,'review-superseded',$3,$4,$5,$6,'Review request superseded',
                 'The accountable reviewer assignment was cleared before this review was decided.',$7)
         ON CONFLICT (user_id,event_key) DO NOTHING`,
        [request.reviewer_user_id, `review-superseded:${request.id}:assignment-cleared`,
          target.id, target.document_id, request.revision_id, request.id,
          link(String(target.document_id), target.market, target.locale)],
      );
    }
    await client.query("DELETE FROM cms_editorial_assignments WHERE edition_id=$1", [target.id]);
    await audit(auth, "editorial.assignment_cleared", "edition", String(target.id), {}, client);
    await client.query("COMMIT"); res.status(204).end();
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}));

router.get("/editorial-work/assignments", asyncRoute(async (req, res) => {
  const editionId = typeof req.query.editionId === "string" ? req.query.editionId : null;
  if (!editionId || !uuid(editionId)) { res.status(400).json({ error: "An exact editionId is required." }); return; }
  const auth = res.locals.auth as AuthContext;
  const target = await editionTarget(pool, editionId);
  if (!target) { res.status(404).json({ error: "Edition not found." }); return; }
  if (!await hasEditionAccess(pool, auth.user.id, auth.user.role, target, "review")) {
    res.status(403).json({ error: "You are not assigned to this market." }); return;
  }
  const result = await pool.query(
    `SELECT assignment.*,
            editor.display_name editor_name,reviewer.display_name reviewer_name
       FROM cms_editorial_assignments assignment
       LEFT JOIN cms_users editor ON editor.id=assignment.editor_user_id
       LEFT JOIN cms_users reviewer ON reviewer.id=assignment.reviewer_user_id
      WHERE assignment.edition_id=$1
        AND ($2::boolean=false OR assignment.editor_user_id=$3 OR assignment.reviewer_user_id=$3)`,
    [editionId, req.query.mine === "true", auth.user.id],
  );
  res.json({ items: result.rows.map(assignmentJson) });
}));

router.get("/editorial-work/editions/:editionId/assignees", asyncRoute(async (req, res) => {
  if (!uuid(req.params.editionId)) { res.status(400).json({ error: "Invalid edition." }); return; }
  const auth = res.locals.auth as AuthContext;
  const target = await editionTarget(pool, req.params.editionId);
  if (!target) { res.status(404).json({ error: "Edition not found." }); return; }
  if (!await hasEditionAccess(pool, auth.user.id, auth.user.role, target)) {
    res.status(403).json({ error: "You are not assigned to this market." }); return;
  }
  const candidates = await pool.query(
    `SELECT id,display_name,role FROM cms_users
      WHERE status='active'
      ORDER BY display_name NULLS LAST,email,id`,
  );
  const authorized = await Promise.all(candidates.rows.map(async (candidate) =>
    hasEditionAccess(pool, String(candidate.id), String(candidate.role), target, "review")));
  res.json({ items: candidates.rows
    .filter((_candidate, index) => authorized[index])
    .map((candidate) => ({ id: String(candidate.id), name: candidate.display_name ?? "Unnamed user", role: candidate.role })) });
}));

router.post("/editorial-work/revisions/:revisionId/request-review", requireCsrf, asyncRoute(async (req, res) => {
  const body = req.body === undefined || req.body === null
    ? {}
    : typeof req.body === "object" && !Array.isArray(req.body)
      ? req.body as Record<string, unknown>
      : null;
  if (!body) { res.status(400).json({ error: "Invalid review request." }); return; }
  const reviewerProvided = Object.prototype.hasOwnProperty.call(body, "reviewerId");
  const reviewerId = optionalUuid(body.reviewerId);
  const note = typeof body.note === "string" && body.note.trim().length <= 2000 ? body.note.trim() || null : body.note === undefined ? null : undefined;
  if (!uuid(req.params.revisionId) || (reviewerProvided && reviewerId === undefined) || note === undefined) { res.status(400).json({ error: "Invalid review request." }); return; }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const address = await client.query(
      `SELECT e.document_id FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id WHERE r.id=$1`,
      [req.params.revisionId],
    );
    if (!address.rowCount || !await lockDocumentForMutation(client, String(address.rows[0].document_id))) {
      await client.query("ROLLBACK"); res.status(404).json({ error: "Revision not found." }); return;
    }
    const revision = await client.query(
      `SELECT r.id,r.edition_id,r.workflow_state,r.created_by_user_id,e.document_id,e.market,e.locale
         FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$1
        FOR UPDATE OF r,e`, [req.params.revisionId]);
    const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
    if (!revision.rowCount) { await client.query("ROLLBACK"); res.status(404).json({ error: "Revision not found." }); return; }
    const target = revision.rows[0];
    if (!auth) {
      await client.query("ROLLBACK"); res.status(403).json({ error: "You are not assigned to this market." }); return;
    }
    const latest = await client.query(
      "SELECT id FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1",
      [target.edition_id],
    );
    if (String(latest.rows[0]?.id) !== String(target.id) || target.workflow_state !== "in-review") {
      await client.query("ROLLBACK"); res.status(409).json({ error: "Review requests require the current revision already submitted for review." }); return;
    }
    const exactEdit = await hasEditionAccess(client, auth.user.id, auth.user.role, target, "edit");
    const exactReview = await hasEditionAccess(client, auth.user.id, auth.user.role, target, "review");
    const reviewManager = await isCentralReviewManager(client, auth) && exactReview;
    if (!exactEdit && !reviewManager) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "Only the exact editor or an authorized central review manager can route this revision." });
      return;
    }
    // A retry is a read of the durable exact-revision request, not a new
    // reviewer-selection operation while the frozen reviewer remains eligible.
    // A request whose reviewer has since lost authority is the one narrow
    // recovery path: it is repaired in this same transaction, retaining the
    // request id and all original attribution.
    const existing = await client.query(
      `SELECT * FROM cms_review_requests
        WHERE revision_id=$1
        ORDER BY requested_at DESC,id DESC
        LIMIT 1
        FOR UPDATE`,
      [target.id],
    );
    const prior = existing.rows[0];
    if (prior) {
      if (prior.status !== "requested") {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "This exact revision already has a decided or superseded review request and cannot be rerouted.",
        });
        return;
      }
      const priorReviewerIsEligible = await eligibleReviewer(client, String(prior.reviewer_user_id), target);
      if (priorReviewerIsEligible) {
        if (reviewerId && String(prior.reviewer_user_id) !== String(reviewerId)) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "This revision already has an open review request. Reviewer reassignment requires a separate privileged action.",
          });
          return;
        }
        await client.query("COMMIT");
        res.json({ reviewRequest: reviewJson(prior) });
        return;
      }
      const isOriginalRequester = String(prior.requester_user_id) === auth.user.id && exactEdit;
      if (!isOriginalRequester && !reviewManager) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Only the original exact editor or an authorized central review manager can recover this review request." });
        return;
      }
      const assignment = await client.query(
        `SELECT editor_user_id FROM cms_editorial_assignments
          WHERE document_id=$1 AND (edition_id=$2 OR edition_id IS NULL)
          ORDER BY (edition_id=$2) DESC
          LIMIT 1`,
        [target.document_id, target.edition_id],
      );
      const excludedReviewerIds = new Set([
        String(prior.requester_user_id),
        String(target.created_by_user_id),
        prior.accountable_editor_user_id ? String(prior.accountable_editor_user_id) : null,
        assignment.rows[0]?.editor_user_id ? String(assignment.rows[0].editor_user_id) : null,
        auth.user.id,
      ].filter((value): value is string => Boolean(value)));
      let recipient: string | null = null;
      if (reviewerId) {
        if (excludedReviewerIds.has(String(reviewerId))
          || !await eligibleReviewer(client, String(reviewerId), target)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Choose an active, authorized reviewer other than the requester, revision author, accountable editor, or routing actor." });
          return;
        }
        recipient = String(reviewerId);
      } else {
        recipient = await centralEligibleReviewer(client, target, excludedReviewerIds);
      }
      if (!recipient) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "No eligible reviewer is available. A Users administrator must grant an active user review access to this exact destination.",
        });
        return;
      }
      const rerouted = await client.query(
        `UPDATE cms_review_requests
            SET reviewer_user_id=$2,blocked_reason=NULL
          WHERE id=$1 AND status='requested'
          RETURNING *`,
        [prior.id, recipient],
      );
      if (!rerouted.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The review request changed while it was being recovered. Reload the exact revision." });
        return;
      }
      const recoveredRequest = rerouted.rows[0];
      await client.query(
        `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,document_id,revision_id,review_request_id,title,message,link)
         VALUES ($1,$2,'review-requested',$3,$4,$5,$6,'Review request rerouted',
                 'An exact submitted revision was rerouted and needs your review.',$7)
         ON CONFLICT (user_id,event_key) DO NOTHING`,
        [recipient, `review-rerouted:${recoveredRequest.id}:${recipient}`, target.edition_id, target.document_id,
          target.id, recoveredRequest.id, link(String(target.document_id), target.market, target.locale)],
      );
      await audit(auth, "editorial.review_rerouted", "review-request", String(recoveredRequest.id), {
        reviewRequestId: String(recoveredRequest.id),
        revisionId: String(target.id),
        previousReviewerId: String(prior.reviewer_user_id),
        reviewerId: recipient,
      }, client);
      await client.query("COMMIT");
      res.json({ reviewRequest: reviewJson(recoveredRequest) });
      return;
    }
    // A frozen edition assignment is the preferred exact reviewer. If there
    // is none, routing chooses the first independently eligible reviewer.
    const assignment = await client.query(
      `SELECT editor_user_id,reviewer_user_id FROM cms_editorial_assignments
        WHERE document_id=$1 AND (edition_id=$2 OR edition_id IS NULL)
        ORDER BY (edition_id=$2) DESC
        LIMIT 1`,
      [target.document_id, target.edition_id],
    );
    const excludedReviewerIds = new Set([
      auth.user.id,
      String(target.created_by_user_id),
      assignment.rows[0]?.editor_user_id ? String(assignment.rows[0].editor_user_id) : null,
    ].filter((value): value is string => Boolean(value)));
    let recipient = reviewerId ?? (assignment.rows[0]?.reviewer_user_id
      ? String(assignment.rows[0].reviewer_user_id) : null);
    if (recipient) {
      if (excludedReviewerIds.has(String(recipient))
        || !await eligibleReviewer(client, String(recipient), target)) {
        if (reviewerProvided) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Choose an active, authorized reviewer other than the requester, revision author, or accountable editor." });
          return;
        }
        recipient = null;
      }
    }
    if (!recipient) {
      recipient = await centralEligibleReviewer(client, target, excludedReviewerIds);
      if (!recipient) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "No eligible reviewer is available. A Users administrator must grant an active user review access to this exact destination.",
        });
        return;
      }
    }
    const request = (await client.query(
      `INSERT INTO cms_review_requests
         (edition_id,revision_id,requester_user_id,reviewer_user_id,accountable_editor_user_id,note)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [target.edition_id, target.id, auth.user.id, recipient, assignment.rows[0]?.editor_user_id ?? null, note],
    )).rows[0];
    await client.query(
      `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,document_id,revision_id,review_request_id,title,message,link)
       VALUES ($1,$2,'review-requested',$3,$4,$5,$6,'Review requested',
               'A specific submitted revision needs your review.',$7)
       ON CONFLICT (user_id,event_key) DO NOTHING`,
      [recipient, `review-requested:${request.id}`, target.edition_id, target.document_id, target.id, request.id,
        link(String(target.document_id), target.market, target.locale)],
    );
    await audit(auth, "editorial.review_requested", "revision", String(target.id), { reviewRequestId: String(request.id), reviewerId: recipient }, client);
    await client.query("COMMIT"); res.status(201).json({ reviewRequest: reviewJson(request) });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}));

router.post("/editorial-work/review-requests/:reviewRequestId/decision", requireCsrf, asyncRoute(async (req, res) => {
  const body = req.body as Record<string, unknown>;
  const decision = body.decision === "approved" || body.decision === "rejected" ? body.decision : null;
  const note = typeof body.note === "string" && body.note.trim().length <= 2000 ? body.note.trim() || null : body.note === undefined ? null : undefined;
  if (!uuid(req.params.reviewRequestId) || !decision || note === undefined
    || (decision === "rejected" && !note)) {
    res.status(400).json({ error: decision === "rejected" ? "A rejection requires a review comment." : "Invalid review decision." }); return;
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const address = await client.query(
      `SELECT e.document_id
         FROM cms_review_requests request
         JOIN cms_market_editions e ON e.id=request.edition_id
        WHERE request.id=$1`,
      [req.params.reviewRequestId],
    );
    if (!address.rowCount || !await lockDocumentForMutation(client, String(address.rows[0].document_id))) {
      await client.query("ROLLBACK"); res.status(404).json({ error: "Review request not found." }); return;
    }
    const request = await client.query(
      `SELECT request.*,e.document_id,e.market,e.locale,r.created_by_user_id
         FROM cms_review_requests request
         JOIN cms_market_editions e ON e.id=request.edition_id
         JOIN cms_revisions r ON r.id=request.revision_id
        WHERE request.id=$1 FOR UPDATE OF request,e,r`, [req.params.reviewRequestId]);
    const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
    if (!request.rowCount) { await client.query("ROLLBACK"); res.status(404).json({ error: "Review request not found." }); return; }
    const row = request.rows[0];
    if (!auth || !await hasEditionAccess(client, auth.user.id, auth.user.role, row, "review")
      || String(row.reviewer_user_id) !== auth.user.id
      || String(row.created_by_user_id) === auth.user.id
      || String(row.requester_user_id) === auth.user.id
      || String(row.accountable_editor_user_id) === auth.user.id) {
      await client.query("ROLLBACK"); res.status(403).json({ error: "You cannot decide this review request." }); return;
    }
    if ((row.status === decision) && (row.decision_note ?? null) === note) {
      await client.query("COMMIT"); res.json({ reviewRequest: reviewJson(row) }); return;
    }
    if (row.status !== "requested") {
      await client.query("ROLLBACK"); res.status(409).json({ error: "Only a currently requested review can be decided." }); return;
    }
    const latest = await client.query(
      `SELECT id FROM cms_revisions WHERE edition_id=$1
        ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
      [row.edition_id],
    );
    if (String(latest.rows[0]?.id) !== String(row.revision_id)) {
      await client.query("ROLLBACK"); res.status(409).json({ error: "A newer revision exists; this review request was superseded." }); return;
    }
    const transitioned = await client.query(
      `UPDATE cms_revisions
          SET workflow_state=$2,
              approved_by_user_id=CASE WHEN $2='approved' THEN $3 ELSE approved_by_user_id END,
              approved_at=CASE WHEN $2='approved' THEN now() ELSE approved_at END
        WHERE id=$1 AND workflow_state='in-review'
        RETURNING id`,
      [row.revision_id, decision, auth.user.id],
    );
    if (!transitioned.rowCount) { await client.query("ROLLBACK"); res.status(409).json({ error: "The requested revision is no longer in review." }); return; }
    if (decision === "rejected") {
      await client.query(
        `INSERT INTO cms_review_comments(revision_id,author_user_id,body) VALUES ($1,$2,$3)`,
        [row.revision_id, auth.user.id, note],
      );
      await client.query(
        `UPDATE cms_market_editions
            SET publication_state=CASE WHEN publication_state='published' THEN 'published' ELSE 'draft' END,
                updated_at=now()
          WHERE id=$1`,
        [row.edition_id],
      );
    }
    const result = await client.query(
      `UPDATE cms_review_requests
          SET status=$2,decision_note=$3,decided_at=COALESCE(decided_at,now())
         WHERE id=$1 RETURNING *`, [row.id, decision, note]);
    await audit(auth, "editorial.review_decided", "review-request", String(row.id), { decision }, client);
    await client.query("COMMIT"); res.json({ reviewRequest: reviewJson(result.rows[0]) });
  } catch (error) { await client.query("ROLLBACK").catch(() => undefined); throw error; } finally { client.release(); }
}));

router.get("/editorial-work/my", asyncRoute(async (_req, res) => {
  const auth = res.locals.auth as AuthContext;
  const rows = await queueRows(auth, false, false);
  const centralReviewManager = await isCentralReviewManager(pool, auth);
  const items = (await Promise.all(rows.map(async (item) =>
    await hasEditionAccess(pool, auth.user.id, auth.user.role, {
      document_id: item.documentId, market: item.market, locale: item.locale,
    }, "review")
      && item.assignedToActor ? item : (
        item.status === "blocked"
        && item.blockedReason === REVIEW_RECOVERY_BLOCKED_REASON
        && item.reviewRequest?.status === "requested"
        && item.reviewRequest.requesterId === auth.user.id
        && item.reviewRevisionId === item.currentRevisionId
        && (
          await hasEditionAccess(pool, auth.user.id, auth.user.role, {
            document_id: item.documentId, market: item.market, locale: item.locale,
          }, "edit")
          || (centralReviewManager && await hasEditionAccess(pool, auth.user.id, auth.user.role, {
            document_id: item.documentId, market: item.market, locale: item.locale,
          }, "review"))
        )
      ) ? item : null,
  ))).filter((item): item is NonNullable<typeof item> => item !== null);
  res.json({ items: items.map(({ assignedToActor: _assignedToActor, ...item }) => item), emptyState: items.length ? null : "no-work" });
}));
router.get("/editorial-work/team", asyncRoute(async (req, res) => {
  const auth = res.locals.auth as AuthContext;
  let items = (await Promise.all((await queueRows(auth, true, req.query.includeUnassigned !== "false")).map(async (item) =>
    await hasEditionAccess(pool, auth.user.id, auth.user.role, {
      document_id: item.documentId, market: item.market, locale: item.locale,
    }, "review") ? item : null,
  ))).filter((item): item is NonNullable<typeof item> => item !== null);
  if (typeof req.query.market === "string") items = items.filter((item) => item.market === req.query.market);
  if (typeof req.query.assigneeId === "string") {
    items = items.filter((item) => item.editor?.id === req.query.assigneeId || item.reviewer?.id === req.query.assigneeId);
  }
  if (req.query.status === "active" || req.query.status === "blocked" || req.query.status === "completed") {
    items = items.filter((item) => item.status === req.query.status);
  }
  res.json({ items: items.map(({ assignedToActor: _assignedToActor, ...item }) => item), emptyState: items.length ? null : "no-work" });
}));

router.get("/editorial-work/notifications", asyncRoute(async (req, res) => {
  const auth = res.locals.auth as AuthContext;
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const requestedOffset = Number(req.query.offset);
  const offset = Number.isSafeInteger(requestedOffset) && requestedOffset > 0 ? requestedOffset : 0;
  const unreadOnly = req.query.unreadOnly === "true";
  const result = await pool.query(
    `SELECT n.*,e.document_id edition_document_id,e.market,e.locale FROM cms_editorial_notifications n
      LEFT JOIN cms_market_editions e ON e.id=n.edition_id
      WHERE n.user_id=$1 AND ($2::boolean=false OR n.read_at IS NULL)
       ORDER BY n.created_at DESC,n.id DESC`,
    [auth.user.id, unreadOnly],
  );
  const access = await Promise.all(result.rows.map((row) => !row.edition_id || hasEditionAccess(
    pool, auth.user.id, auth.user.role,
    { document_id: row.edition_document_id, market: row.market, locale: row.locale },
  )));
  const visible = result.rows.filter((_row, index) => access[index]);
  const page = visible.slice(offset, offset + limit);
  res.json({ items: page.map((row) => ({
    id: String(row.id), type: row.type, title: row.title, message: row.message, link: row.link,
    createdAt: row.created_at, readAt: row.read_at, deliveryStatus: "in-app",
  })), nextOffset: offset + page.length < visible.length ? offset + page.length : null });
}));

router.post("/editorial-work/notifications/:notificationId/read", requireCsrf, asyncRoute(async (req, res) => {
  if (!uuid(req.params.notificationId)) { res.status(400).json({ error: "Invalid notification." }); return; }
  const auth = res.locals.auth as AuthContext;
  const existing = await pool.query(
    "SELECT * FROM cms_editorial_notifications WHERE id=$1 AND user_id=$2",
    [req.params.notificationId, auth.user.id],
  );
  const notification = existing.rows[0];
  if (!notification) { res.status(404).json({ error: "Notification not found." }); return; }
  if (notification.edition_id) {
    const target = await editionTarget(pool, String(notification.edition_id));
    if (!target || !await hasEditionAccess(pool, auth.user.id, auth.user.role, target)) {
      res.status(404).json({ error: "Notification not found." }); return;
    }
  }
  const result = await pool.query(
    `UPDATE cms_editorial_notifications SET read_at=COALESCE(read_at,now())
      WHERE id=$1 AND user_id=$2 RETURNING *`, [req.params.notificationId, auth.user.id]);
  if (!result.rowCount) { res.status(404).json({ error: "Notification not found." }); return; }
  const row = result.rows[0];
  res.json({ notification: { id: String(row.id), type: row.type, title: row.title, message: row.message, link: row.link, createdAt: row.created_at, readAt: row.read_at, deliveryStatus: "in-app" } });
}));
router.post("/editorial-work/notifications/:notificationId/unread", requireCsrf, asyncRoute(async (req, res) => {
  if (!uuid(req.params.notificationId)) { res.status(400).json({ error: "Invalid notification." }); return; }
  const auth = res.locals.auth as AuthContext;
  const existing = await pool.query(
    "SELECT * FROM cms_editorial_notifications WHERE id=$1 AND user_id=$2",
    [req.params.notificationId, auth.user.id],
  );
  const notification = existing.rows[0];
  if (!notification) { res.status(404).json({ error: "Notification not found." }); return; }
  if (notification.edition_id) {
    const target = await editionTarget(pool, String(notification.edition_id));
    if (!target || !await hasEditionAccess(pool, auth.user.id, auth.user.role, target)) {
      res.status(404).json({ error: "Notification not found." }); return;
    }
  }
  const result = await pool.query(
    `UPDATE cms_editorial_notifications SET read_at=NULL
      WHERE id=$1 AND user_id=$2 RETURNING *`, [req.params.notificationId, auth.user.id]);
  if (!result.rowCount) { res.status(404).json({ error: "Notification not found." }); return; }
  const row = result.rows[0];
  res.json({ notification: { id: String(row.id), type: row.type, title: row.title, message: row.message, link: row.link, createdAt: row.created_at, readAt: null, deliveryStatus: "in-app" } });
}));
router.post("/editorial-work/notifications/read-all", requireCsrf, asyncRoute(async (_req, res) => {
  const auth = res.locals.auth as AuthContext;
  const pending = await pool.query(
    `SELECT n.id,n.edition_id FROM cms_editorial_notifications n
      WHERE n.user_id=$1 AND n.read_at IS NULL`,
    [auth.user.id],
  );
  const readable = await Promise.all(pending.rows.map(async (notification) => !notification.edition_id
    || await (async () => {
      const target = await editionTarget(pool, String(notification.edition_id));
      if (!target) return false;
      return hasEditionAccess(pool, auth.user.id, auth.user.role, target);
    })()));
  const ids = pending.rows.filter((_notification, index) => readable[index]).map((notification) => String(notification.id));
  const result = ids.length
    ? await pool.query("UPDATE cms_editorial_notifications SET read_at=now() WHERE id=ANY($1::uuid[])", [ids])
    : { rowCount: 0 };
  res.json({ count: result.rowCount ?? 0 });
}));

router.get("/editorial-work/digest-status", asyncRoute(async (_req, res) => {
  const auth = res.locals.auth as AuthContext;
  const result = await pool.query(
    `SELECT p.enabled,j.status,j.sent_at,j.last_error FROM cms_editorial_digest_preferences p
      LEFT JOIN LATERAL (SELECT * FROM cms_editorial_digest_jobs WHERE user_id=p.user_id ORDER BY digest_date DESC LIMIT 1) j ON true
      WHERE p.user_id=$1`, [auth.user.id]);
  const row = result.rows[0];
  res.json({ enabled: Boolean(row?.enabled), configured: editorialDigestConfigured(), status: row?.status ?? "disabled", lastSentAt: row?.sent_at ?? null, lastError: row?.last_error ?? null });
}));
router.put("/editorial-work/digest-preferences", requireCsrf, asyncRoute(async (req, res) => {
  if (typeof req.body?.enabled !== "boolean") { res.status(400).json({ error: "Invalid digest preference." }); return; }
  if (req.body.enabled && !editorialDigestConfigured()) {
    res.status(409).json({ code: "DIGEST_NOT_CONFIGURED", error: "Editorial digest delivery is not configured." }); return;
  }
  const auth = res.locals.auth as AuthContext;
  await pool.query(
    `INSERT INTO cms_editorial_digest_preferences(user_id,enabled) VALUES ($1,$2)
     ON CONFLICT (user_id) DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=now()`,
    [auth.user.id, req.body.enabled]);
  res.json({
    enabled: req.body.enabled,
    configured: editorialDigestConfigured(),
    status: req.body.enabled ? "pending" : "disabled",
    lastSentAt: null,
    lastError: null,
  });
}));

export default router;