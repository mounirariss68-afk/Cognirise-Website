import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  CreateMarketEditionBody,
  GetDashboardKpisQueryParams,
  InviteUserBody,
  ListAuditEventsQueryParams,
  ListMarketEditionsQueryParams,
  ListUsersQueryParams,
  ResetUserPasswordBody,
  RevokeUserSessionsBody,
  UpdateMarketEditionBody,
  UpdateUserBody,
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
import { hashPassword, randomToken } from "../lib/security";

const router: IRouter = Router();
router.use(
  ["/dashboard", "/users", "/audit", "/market-editions"],
  authenticate,
  requireMfa,
);

function userFromRow(row: Record<string, any>) {
  return {
    id: String(row.id),
    name: row.display_name ?? row.name ?? row.email,
    email: row.email,
    role: row.role,
    status: row.status,
    mfaEnabled: Boolean(row.mfa_enabled),
    mustRotate: Boolean(row.must_rotate),
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

router.get(
  "/dashboard/kpis",
  asyncRoute(async (req, res) => {
    const raw = req.query;
    const parsed = GetDashboardKpisQueryParams.safeParse({
      period: raw.period,
      from: typeof raw.from === "string" ? new Date(raw.from) : undefined,
      to: typeof raw.to === "string" ? new Date(raw.to) : undefined,
    });
    if (!parsed.success) { res.status(400).json({ error: "Invalid dashboard period." }); return; }
    const period = parsed.data.period ?? "30d";
    if (period === "custom" && (!parsed.data.from || !parsed.data.to || parsed.data.from >= parsed.data.to)) {
      res.status(400).json({ error: "Custom dashboard ranges require a valid UTC from/to range." }); return;
    }
    const to = parsed.data.to ?? new Date();
    const days = period === "7d" ? 7 : period === "90d" ? 90 : 30;
    const from = parsed.data.from ?? new Date(to.getTime() - days * 86_400_000);
    const [documents, submissions, users, analytics, topPages, marketMix, sources, workflow, audit] = await Promise.all([
      pool.query("SELECT status,count(*)::int count FROM cms_documents GROUP BY status"),
      pool.query(
        `SELECT count(*) FILTER (WHERE status='new')::int new,
                count(*) FILTER (WHERE status IN ('new','open','contacted'))::int open,
                count(*) FILTER (WHERE created_at>=now()-interval '30 days')::int last_30_days
         FROM cms_submission_workflows`,
      ),
      pool.query(
        `SELECT count(*) FILTER (WHERE status='active')::int active,
                count(*) FILTER (WHERE status='invited')::int invited FROM cms_users`,
      ),
      pool.query(
        `SELECT count(DISTINCT NULLIF(session_id,''))::int sessions,
          count(*) FILTER (WHERE event_name='page_view')::int page_views,
          count(*) FILTER (WHERE event_name='cta_click')::int cta_clicks,
          count(*) FILTER (WHERE event_name='value_scan_submit')::int value_scan,
          count(*) FILTER (WHERE event_name='newsletter_subscribe')::int newsletter,
          count(*) FILTER (WHERE event_name='publication_view')::int publication_views,
          avg(NULLIF(properties->>'lcp','')::numeric) FILTER (WHERE event_name='web_vital') lcp,
          avg(NULLIF(properties->>'inp','')::numeric) FILTER (WHERE event_name='web_vital') inp,
          avg(NULLIF(properties->>'cls','')::numeric) FILTER (WHERE event_name='web_vital') cls
         FROM cms_analytics_events WHERE occurred_at >= $1 AND occurred_at < $2`, [from, to]),
      pool.query(`SELECT path,count(*)::int count FROM cms_analytics_events WHERE event_name='page_view' AND occurred_at >= $1 AND occurred_at < $2 GROUP BY path ORDER BY count DESC LIMIT 10`, [from,to]),
      pool.query(`SELECT market,count(*)::int count FROM cms_analytics_events WHERE event_name='page_view' AND occurred_at >= $1 AND occurred_at < $2 GROUP BY market ORDER BY count DESC LIMIT 10`, [from,to]),
      pool.query(`SELECT COALESCE(NULLIF(properties->>'utm_source',''),referrer_host,'direct') source,count(*)::int count FROM cms_analytics_events WHERE event_name='page_view' AND occurred_at >= $1 AND occurred_at < $2 GROUP BY 1 ORDER BY count DESC LIMIT 10`, [from,to]),
      pool.query(`SELECT count(*) FILTER (WHERE workflow_state='in-review')::int awaiting,
        count(*) FILTER (WHERE workflow_state='in-review' AND created_at < now()-interval '7 days')::int overdue FROM cms_revisions`),
      pool.query(`SELECT count(*) FILTER (WHERE action='document.published')::int activity,
        count(*) FILTER (WHERE action LIKE '%publish%' AND outcome <> 'success')::int failures
        FROM cms_audit_events WHERE occurred_at >= $1 AND occurred_at < $2`, [from,to]),
    ]);
    const counts = Object.fromEntries(
      documents.rows.map((row) => [row.status, Number(row.count)]),
    );
    res.json({
      documents: {
        draft: counts.draft ?? 0,
        inReview: counts["in-review"] ?? 0,
        scheduled: counts.scheduled ?? 0,
        published: counts.published ?? 0,
        archived: counts.archived ?? 0,
      },
      submissions: {
        new: submissions.rows[0].new,
        open: submissions.rows[0].open,
        last30Days: submissions.rows[0].last_30_days,
      },
      users: users.rows[0],
      analytics: {
        sessions: analytics.rows[0].sessions ?? 0, pageViews: analytics.rows[0].page_views ?? 0,
        topPages: topPages.rows, marketMix: marketMix.rows, sources: sources.rows,
        ctaClicks: analytics.rows[0].cta_clicks ?? 0,
        valueScanSubmissions: analytics.rows[0].value_scan ?? 0,
        newsletterSubscriptions: analytics.rows[0].newsletter ?? 0,
        ctaConversionRate: analytics.rows[0].cta_clicks ? Number(analytics.rows[0].value_scan ?? 0) / Number(analytics.rows[0].cta_clicks) : 0,
        newsletterConversionRate: analytics.rows[0].page_views ? Number(analytics.rows[0].newsletter ?? 0) / Number(analytics.rows[0].page_views) : 0,
        publicationViews: analytics.rows[0].publication_views ?? 0,
        coreWebVitals: { lcp: analytics.rows[0].lcp === null ? null : Number(analytics.rows[0].lcp), inp: analytics.rows[0].inp === null ? null : Number(analytics.rows[0].inp), cls: analytics.rows[0].cls === null ? null : Number(analytics.rows[0].cls) },
      },
      contentAwaitingReview: workflow.rows[0].awaiting ?? 0,
      overdueContentReview: workflow.rows[0].overdue ?? 0,
      publishActivity: audit.rows[0].activity ?? 0,
      publishFailures: audit.rows[0].failures ?? 0,
      definition: "UTC period metrics use consented analytics events; conversions are event-attributed and CWV values are mean reported values.",
      timezone: "UTC", period, from, to,
      generatedAt: new Date(),
    });
  }),
);

router.get(
  "/users",
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = ListUsersQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid user filters." });
      return;
    }
    const { page, pageSize, search, role, status } = parsed.data;
    const result = await pool.query(
      `SELECT u.*,p.must_rotate,EXISTS(SELECT 1 FROM cms_totp_credentials t WHERE t.user_id=u.id
        AND t.verified_at IS NOT NULL AND t.disabled_at IS NULL) mfa_enabled,
         count(*) OVER() total_count FROM cms_users u LEFT JOIN cms_password_credentials p ON p.user_id=u.id
        WHERE ($1::text IS NULL OR display_name ILIKE '%'||$1||'%' OR email ILIKE '%'||$1||'%')
          AND ($2::text IS NULL OR role=$2) AND ($3::text IS NULL OR status=$3)
        ORDER BY created_at DESC LIMIT $4 OFFSET $5`,
      [search ?? null, role ?? null, status ?? null, pageSize, (page - 1) * pageSize],
    );
    res.json(
      pageOf(
        result.rows.map(userFromRow),
        Number(result.rows[0]?.total_count ?? 0),
        page,
        pageSize,
      ),
    );
  }),
);

router.post(
  "/users/invitations",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = InviteUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid invitation." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const temporaryPassword = `Tmp!${randomToken().slice(0, 18)}a1`;
    try {
      const result = await pool.query(
        `INSERT INTO cms_users
         (display_name,email,role,status)
         VALUES ($1,lower($2),$3,'invited') RETURNING *`,
        [
          parsed.data.name,
          parsed.data.email,
          parsed.data.role,
        ],
      );
      const user = userFromRow(result.rows[0]);
      await pool.query(
        `INSERT INTO cms_password_credentials(user_id,password_hash,must_rotate,temporary_expires_at,changed_at)
         VALUES ($1,$2,true,now()+interval '72 hours',now())`,
        [user.id, await hashPassword(temporaryPassword)],
      );
      user.mustRotate = true;
      await audit(auth, "user.invited", "user", user.id);
      res.status(201).json({
        id: user.id,
        user,
        // This service has no mail delivery integration; an administrator must
        // copy this one-time displayed credential through an approved channel.
        temporaryPassword,
        expiresAt: new Date(Date.now() + 72 * 60 * 60_000),
        createdAt: user.createdAt,
      });
    } catch (error: any) {
      if (error?.code === "23505") {
        res.status(409).json({ error: "A user with that email already exists." });
        return;
      }
      throw error;
    }
  }),
);

router.patch(
  "/users/:userId",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = UpdateUserBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid user update." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    if (req.params.userId === auth.user.id && parsed.data.status === "suspended") {
      res.status(409).json({ error: "You cannot suspend your own account." });
      return;
    }
    const result = await pool.query(
      `UPDATE cms_users SET display_name=COALESCE($2,display_name),role=COALESCE($3,role),
       status=COALESCE($4,status),updated_at=now() WHERE id=$1 RETURNING *`,
      [
        req.params.userId,
        parsed.data.name ?? null,
        parsed.data.role ?? null,
        parsed.data.status ?? null,
      ],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    if (parsed.data.status === "suspended") {
      await pool.query(
        "UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
        [req.params.userId],
      );
    }
    await audit(auth, "user.updated", "user", String(req.params.userId), parsed.data);
    res.json(userFromRow(result.rows[0]));
  }),
);

router.post(
  "/users/:userId/password-reset",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = ResetUserPasswordBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid reset request." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const temporaryPassword = `Tmp!${randomToken().slice(0, 18)}a1`;
    const user = await pool.query("SELECT id FROM cms_users WHERE id=$1", [req.params.userId]);
    if (!user.rowCount) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    await pool.query(
      `INSERT INTO cms_password_credentials(user_id,password_hash,must_rotate,temporary_expires_at,changed_at)
       VALUES ($1,$2,true,now()+interval '1 hour',now())
       ON CONFLICT (user_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,
         must_rotate=true,temporary_expires_at=EXCLUDED.temporary_expires_at,changed_at=now(),
         password_version=cms_password_credentials.password_version+1`,
      [req.params.userId, await hashPassword(temporaryPassword)],
    );
    await pool.query(
      "UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
      [req.params.userId],
    );
    await audit(auth, "user.password_reset", "user", String(req.params.userId), {
      delivery: "administrator-copy",
    });
    res.status(202).json({
      id: String(req.params.userId),
      temporaryPassword,
      expiresAt: new Date(Date.now() + 60 * 60_000),
    });
  }),
);

router.post(
  "/users/:userId/sessions/revoke",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = RevokeUserSessionsBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid revocation request." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const now = new Date();
    const result = await pool.query(
      `UPDATE cms_sessions SET revoked_at=$3
        WHERE user_id=$1 AND revoked_at IS NULL AND ($2::boolean=false OR id<>$4)
        RETURNING id`,
      [req.params.userId, parsed.data.exceptCurrent, now, auth.id],
    );
    await audit(auth, "sessions.revoked", "user", String(req.params.userId), {
      count: result.rowCount ?? 0,
    });
    res.json({ revokedCount: result.rowCount ?? 0, revokedAt: now });
  }),
);

function marketFromRow(row: Record<string, any>) {
  return {
    id: String(row.id),
    code: row.code,
    displayName: row.display_name,
    defaultLocale: row.default_locale,
    fallbackMarketCode: row.fallback_market_code,
    fallbackLocale: row.fallback_locale,
    isCanonical: row.is_canonical,
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function assertMarketFallbackSafe(ownCode: string, fallbackCode: string | null | undefined) {
  if (!fallbackCode) return;
  if (fallbackCode === ownCode) throw new Error("A market cannot fall back to itself.");
  const fallback = await pool.query("SELECT code,enabled FROM market_editions WHERE code=$1", [fallbackCode]);
  if (!fallback.rowCount || !fallback.rows[0].enabled) throw new Error("Fallback market code does not exist or is disabled.");
  const cycle = await pool.query(
    `WITH RECURSIVE chain AS (
       SELECT code,fallback_market_code FROM market_editions WHERE code=$1
        UNION SELECT m.code,m.fallback_market_code FROM market_editions m JOIN chain c ON m.code=c.fallback_market_code
     ) SELECT 1 FROM chain WHERE code=$2 LIMIT 1`,
    [fallbackCode, ownCode],
  );
  if (cycle.rowCount) throw new Error("Fallback market would create a cycle.");
}

router.get(
  "/market-editions",
  asyncRoute(async (req, res) => {
    const parsed = ListMarketEditionsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid pagination." });
      return;
    }
    const { page, pageSize } = parsed.data;
    const result = await pool.query(
      `SELECT *,count(*) OVER() total_count FROM market_editions
       ORDER BY is_canonical DESC,code LIMIT $1 OFFSET $2`,
      [pageSize, (page - 1) * pageSize],
    );
    res.json(
      pageOf(
        result.rows.map(marketFromRow),
        Number(result.rows[0]?.total_count ?? 0),
        page,
        pageSize,
      ),
    );
  }),
);

router.post(
  "/market-editions",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = CreateMarketEditionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid market edition." });
      return;
    }
    const input = parsed.data;
    try { await assertMarketFallbackSafe(input.code, input.fallbackMarketCode); } catch (error: any) { res.status(400).json({ error: error.message }); return; }
    try {
      const result = await pool.query(
        `INSERT INTO market_editions
          (code,display_name,default_locale,fallback_market_code,fallback_locale,is_canonical,enabled)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [input.code,input.displayName,input.defaultLocale,input.fallbackMarketCode ?? null,input.fallbackLocale ?? null,input.isCanonical,input.enabled],
      );
      await audit(res.locals.auth as AuthContext, "market.created", "market", String(result.rows[0].id));
      res.status(201).json(marketFromRow(result.rows[0]));
    } catch (error: any) {
      if (error?.code === "23505" || error?.code === "23503") {
        res.status(409).json({ error: "Market configuration conflicts with an existing market." });
        return;
      }
      throw error;
    }
  }),
);

router.get(
  "/market-editions/:marketEditionId",
  asyncRoute(async (req, res) => {
    const result = await pool.query("SELECT * FROM market_editions WHERE id=$1", [req.params.marketEditionId]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Market edition not found." });
      return;
    }
    res.json(marketFromRow(result.rows[0]));
  }),
);

router.patch(
  "/market-editions/:marketEditionId",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = UpdateMarketEditionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid market edition." });
      return;
    }
    const i = parsed.data;
    const current = await pool.query("SELECT * FROM market_editions WHERE id=$1", [req.params.marketEditionId]);
    if (!current.rowCount) { res.status(404).json({ error: "Market edition not found." }); return; }
    if ((current.rows[0].is_canonical || current.rows[0].code === "uae") && (i.enabled === false || (i.code && i.code !== "uae") || i.isCanonical === false)) {
      res.status(409).json({ error: "The canonical UAE market cannot be disabled or reassigned." }); return;
    }
    const nextCode = i.code ?? current.rows[0].code;
    try { await assertMarketFallbackSafe(nextCode, Object.hasOwn(i, "fallbackMarketCode") ? i.fallbackMarketCode : current.rows[0].fallback_market_code); } catch (error: any) { res.status(400).json({ error: error.message }); return; }
    const codeChanging = i.code !== undefined && i.code !== current.rows[0].code;
    const disabling = current.rows[0].enabled && i.enabled === false;
    if (codeChanging || disabling) {
      const references = await pool.query(
        `SELECT 1 FROM market_editions WHERE fallback_market_code=$1
         UNION ALL SELECT 1 FROM cms_market_editions WHERE market=$1 LIMIT 1`,
        [current.rows[0].code],
      );
      if (references.rowCount) { res.status(409).json({ error: "Market is referenced and cannot be renamed or disabled." }); return; }
    }
    try {
      const result = await pool.query(
        `UPDATE market_editions SET code=COALESCE($2,code),display_name=COALESCE($3,display_name),
          default_locale=COALESCE($4,default_locale),fallback_market_code=CASE WHEN $5 THEN $6 ELSE fallback_market_code END,
          fallback_locale=CASE WHEN $7 THEN $8 ELSE fallback_locale END,is_canonical=COALESCE($9,is_canonical),
          enabled=COALESCE($10,enabled),updated_at=now()
         WHERE id=$1 RETURNING *`,
        [req.params.marketEditionId,i.code ?? null,i.displayName ?? null,i.defaultLocale ?? null,
         Object.hasOwn(i,"fallbackMarketCode"),i.fallbackMarketCode ?? null,Object.hasOwn(i,"fallbackLocale"),
         i.fallbackLocale ?? null,i.isCanonical ?? null,i.enabled ?? null],
      );
      if (!result.rowCount) {
        res.status(404).json({ error: "Market edition not found." });
        return;
      }
      await audit(res.locals.auth as AuthContext, "market.updated", "market", String(req.params.marketEditionId));
      res.json(marketFromRow(result.rows[0]));
    } catch (error: any) {
      if (error?.code === "23505" || error?.code === "23503") {
        res.status(409).json({ error: "Market configuration conflicts with an existing market." });
        return;
      }
      throw error;
    }
  }),
);

router.delete(
  "/market-editions/:marketEditionId",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const references = await pool.query(
      `SELECT m.is_canonical,m.code,
        EXISTS(SELECT 1 FROM market_editions x WHERE x.fallback_market_code=m.code) global_ref,
        EXISTS(SELECT 1 FROM cms_market_editions x WHERE x.market=m.code) content_ref
       FROM market_editions m WHERE m.id=$1`,
      [req.params.marketEditionId],
    );
    if (!references.rowCount) { res.status(404).json({ error: "Market edition not found." }); return; }
    if (references.rows[0].is_canonical || references.rows[0].code === "uae" || references.rows[0].global_ref || references.rows[0].content_ref) {
      res.status(409).json({ error: "Referenced or canonical market cannot be deleted." }); return;
    }
    const result = await pool.query("DELETE FROM market_editions WHERE id=$1 AND NOT is_canonical AND code<>'uae' RETURNING id", [req.params.marketEditionId]);
    if (!result.rowCount) {
      res.status(404).json({ error: "Market edition not found." });
      return;
    }
    await audit(res.locals.auth as AuthContext, "market.deleted", "market", String(req.params.marketEditionId));
    res.status(204).end();
  }),
);

router.get(
  "/audit",
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = ListAuditEventsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid audit filters." });
      return;
    }
    const q = parsed.data;
    const result = await pool.query(
      `SELECT a.*,u.display_name actor_name,u.email actor_email,count(*) OVER() total_count
       FROM cms_audit_events a LEFT JOIN cms_users u ON u.id=a.actor_user_id
       WHERE ($1::uuid IS NULL OR a.actor_user_id=$1) AND ($2::text IS NULL OR a.target_type=$2)
         AND ($3::text IS NULL OR a.target_id=$3) AND ($4::text IS NULL OR a.action=$4)
         AND ($5::timestamptz IS NULL OR a.occurred_at >= $5)
         AND ($6::timestamptz IS NULL OR a.occurred_at <= $6)
       ORDER BY a.occurred_at DESC LIMIT $7 OFFSET $8`,
      [q.actorId ?? null, q.entityType ?? null, q.entityId ?? null, q.action ?? null, q.from ?? null, q.to ?? null, q.pageSize, (q.page - 1) * q.pageSize],
    );
    res.json(pageOf(result.rows.map((row) => ({
      id: String(row.id),
      actor: row.actor_user_id ? { id: String(row.actor_user_id), name: row.actor_name, email: row.actor_email } : null,
      action: row.action,
      entityType: row.target_type,
      entityId: String(row.target_id),
      metadata: row.metadata ?? {},
      ipAddress: null,
      createdAt: row.occurred_at,
    })), Number(result.rows[0]?.total_count ?? 0), q.page, q.pageSize));
  }),
);

export default router;