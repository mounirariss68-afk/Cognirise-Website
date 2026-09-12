import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  ExportSubmissionsBody,
  ListSubmissionsQueryParams,
  UpdateSubmissionBody,
} from "@workspace/api-zod";
import {
  authenticate,
  requireAdministrator,
  requireCsrf,
  requireMfa,
  type AuthContext,
} from "../lib/auth";
import { audit, pageOf } from "../lib/cms";
import { asyncRoute } from "../lib/http";

const router: IRouter = Router();
router.use("/submissions", authenticate, requireMfa, requireAdministrator);

function submission(row: Record<string, any>) {
  return {
    id: String(row.id),
    kind: row.kind,
    name: row.name,
    email: row.email,
    organization: row.organization,
    role: row.role,
    market: row.market,
    processArea: row.process_area,
    challenge: row.challenge,
    status: row.status,
    ownerId: row.owner_id ? String(row.owner_id) : null,
    notes: row.notes,
    sourcePage: row.source_page,
    consent: row.consent,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get(
  "/submissions",
  asyncRoute(async (req, res) => {
    const parsed = ListSubmissionsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid submission filters." });
      return;
    }
    const q = parsed.data;
    const result = await pool.query(
      `WITH submissions AS (
        SELECT w.id,'enquiry'::text kind,e.name,e.email,e.organization,e.role,e.market,
          e.process_area,e.challenge,w.status,w.assigned_to_user_id owner_id,
          w.notes->>'text' notes,e.source_page,e.consent,e.created_at,w.updated_at
        FROM cms_submission_workflows w JOIN website_enquiries e ON e.id=w.source_id
        WHERE w.source_type='enquiry'
        UNION ALL
        SELECT w.id,'newsletter',NULL,n.email,NULL,NULL,n.market,NULL,NULL,w.status,
          w.assigned_to_user_id,w.notes->>'text',n.source_page,n.consent,n.created_at,w.updated_at
        FROM cms_submission_workflows w JOIN newsletter_subscriptions n ON n.id=w.source_id
        WHERE w.source_type='newsletter'
      )
      SELECT *,count(*) OVER() total_count FROM submissions
       WHERE ($1::text IS NULL OR name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%'
              OR organization ILIKE '%'||$1||'%')
         AND ($2::text IS NULL OR kind=$2) AND ($3::text IS NULL OR status=$3)
         AND ($4::text IS NULL OR market=$4)
         AND ($5::timestamptz IS NULL OR created_at >= $5)
         AND ($6::timestamptz IS NULL OR created_at <= $6)
       ORDER BY created_at DESC LIMIT $7 OFFSET $8`,
      [q.search ?? null, q.kind ?? null, q.status ?? null, q.market ?? null, q.from ?? null, q.to ?? null, q.pageSize, (q.page - 1) * q.pageSize],
    );
    res.json(pageOf(result.rows.map(submission), Number(result.rows[0]?.total_count ?? 0), q.page, q.pageSize));
  }),
);

router.patch(
  "/submissions/:submissionId",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = UpdateSubmissionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid submission update." });
      return;
    }
    const input = parsed.data;
    const hasStatus = Object.hasOwn(input, "status");
    const hasOwner = Object.hasOwn(input, "ownerId");
    const hasNotes = Object.hasOwn(input, "notes");
    if (!hasStatus && !hasOwner && !hasNotes) {
      res.status(400).json({ error: "At least one submission field must be changed." });
      return;
    }

    // Keep workflow updates and their immutable history in one transaction. In
    // addition to making the inbox refresh safe, this prevents a successful
    // status/owner edit from losing the corresponding workflow event.
    const client = await pool.connect();
    let result;
    let previous: Record<string, any> | undefined;
    try {
      await client.query("BEGIN");
      const current = await client.query(
        `SELECT id,status,assigned_to_user_id owner_id,notes
           FROM cms_submission_workflows WHERE id=$1 FOR UPDATE`,
        [req.params.submissionId],
      );
      if (!current.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Submission not found." });
        return;
      }
      previous = current.rows[0];

      if (hasOwner && input.ownerId && String(input.ownerId) !== String(previous!.owner_id ?? "")) {
        const owner = await client.query(
          "SELECT id,status FROM cms_users WHERE id=$1",
          [input.ownerId],
        );
        if (!owner.rowCount) {
          await client.query("ROLLBACK");
          res.status(400).json({ error: "The selected owner does not exist." });
          return;
        }
        if (owner.rows[0].status !== "active") {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Only an active CMS user can own a submission." });
          return;
        }
      }

      result = await client.query(
        `UPDATE cms_submission_workflows SET status=CASE WHEN $2 THEN $3 ELSE status END,
         assigned_to_user_id=CASE WHEN $4 THEN $5 ELSE assigned_to_user_id END,
         notes=CASE WHEN $6 THEN CASE WHEN $7::text IS NULL OR btrim($7::text)='' THEN NULL
           ELSE jsonb_build_object('text',$7::text) END ELSE notes END,
         resolved_at=CASE WHEN $2 AND $3='resolved' THEN now()
           WHEN $2 AND $3 IN ('new','open','contacted') THEN NULL ELSE resolved_at END,
         first_responded_at=CASE WHEN $2 AND $3='contacted' AND first_responded_at IS NULL
           THEN now() ELSE first_responded_at END,
         updated_at=now() WHERE id=$1 RETURNING id`,
        [
          req.params.submissionId,
          hasStatus,
          input.status ?? null,
          hasOwner,
          input.ownerId ?? null,
          hasNotes,
          input.notes ?? null,
        ],
      );
      await client.query(
        `INSERT INTO cms_submission_events
          (workflow_id,actor_user_id,event_type,from_status,to_status,details)
         VALUES ($1,$2,'workflow.updated',$3,$4,$5::jsonb)`,
        [
          req.params.submissionId,
          (res.locals.auth as AuthContext).user.id,
          previous!.status,
          input.status ?? previous!.status,
          JSON.stringify({
            ...(hasOwner ? { ownerId: input.ownerId ?? null } : {}),
            ...(hasNotes ? { notesChanged: true } : {}),
          }),
        ],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (!result?.rowCount) {
      res.status(404).json({ error: "Submission not found." });
      return;
    }
    await audit(res.locals.auth as AuthContext, "submission.updated", "submission", String(req.params.submissionId), input);
    const detail = await pool.query(
      `SELECT w.id,w.source_type kind,
        CASE WHEN w.source_type='enquiry' THEN e.name END name,
        COALESCE(e.email,n.email) email,e.organization,e.role,COALESCE(e.market,n.market) market,
        e.process_area,e.challenge,w.status,w.assigned_to_user_id owner_id,w.notes->>'text' notes,
        COALESCE(e.source_page,n.source_page) source_page,COALESCE(e.consent,n.consent) consent,
        COALESCE(e.created_at,n.created_at) created_at,w.updated_at
       FROM cms_submission_workflows w
       LEFT JOIN website_enquiries e ON w.source_type='enquiry' AND e.id=w.source_id
       LEFT JOIN newsletter_subscriptions n ON w.source_type='newsletter' AND n.id=w.source_id
       WHERE w.id=$1`,
      [req.params.submissionId],
    );
    res.json(submission(detail.rows[0]));
  }),
);

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;
}

router.post(
  "/submissions/export",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = ExportSubmissionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid export request." });
      return;
    }
    const q = parsed.data;
    const result = await pool.query(
      `WITH submissions AS (
        SELECT w.id,'enquiry'::text kind,e.name,e.email,e.organization,e.role,e.market,
          e.process_area,w.status,w.assigned_to_user_id owner_id,w.notes->>'text' notes,
          e.source_page,e.consent,e.created_at
        FROM cms_submission_workflows w JOIN website_enquiries e ON e.id=w.source_id
        WHERE w.source_type='enquiry'
        UNION ALL
        SELECT w.id,'newsletter',NULL,n.email,NULL,NULL,n.market,NULL,w.status,
          w.assigned_to_user_id,w.notes->>'text',n.source_page,n.consent,n.created_at
        FROM cms_submission_workflows w JOIN newsletter_subscriptions n ON n.id=w.source_id
        WHERE w.source_type='newsletter'
      )
      SELECT id,kind,name,email,organization,role,market,process_area,status,
              owner_id,notes,source_page,consent,created_at
       FROM submissions WHERE ($1::text IS NULL OR kind=$1)
         AND ($2::text IS NULL OR status=$2) AND ($3::text IS NULL OR market=$3)
         AND ($4::timestamptz IS NULL OR created_at >= $4)
         AND ($5::timestamptz IS NULL OR created_at <= $5)
       ORDER BY created_at DESC LIMIT 10000`,
      [q.kind ?? null, q.status ?? null, q.market ?? null, q.from ?? null, q.to ?? null],
    );
    const columns = ["id", "kind", "name", "email", "organization", "role", "market", "process_area", "status", "owner_id", "notes", "source_page", "consent", "created_at"];
    const csv = [columns.join(","), ...result.rows.map((row) => columns.map((column) => csvCell(row[column])).join(","))].join("\r\n");
    const id = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    await audit(res.locals.auth as AuthContext, "submissions.exported", "submission-export", id, { count: result.rows.length });
    res.status(202).json({
      id,
      status: "ready",
      downloadUrl: `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`,
      expiresAt,
    });
  }),
);

export default router;