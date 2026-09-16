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
  DryRunUserCapabilityMigrationBody,
} from "@workspace/api-zod";
import {
  authenticate,
  requireAdministrator,
  requireCsrf,
  requireMfa,
  type AuthContext,
} from "../lib/auth";
import {
  audit,
  existingOperationReceipt,
  operationDigest,
  pageOf,
  requestDigest,
  reserveOperationReceipt,
  saveOperationReceipt,
} from "../lib/cms";
import { asyncRoute } from "../lib/http";
import { logger } from "../lib/logger";
import { hashToken, randomToken } from "../lib/security";
import {
  AccessDeliveryError,
  createAccessDeliveryJob,
  deliverAccessDeliveryJob,
  getAccessDeliveryJob,
  publicAccessDeliveryJob,
  retryAccessDeliveryJob,
} from "../lib/access-delivery";
import {
  capabilityGrantPrerequisiteErrors,
  capabilityProjection,
  type CapabilityGrant,
} from "../lib/policy";

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
    marketCodes: row.market_codes ?? [],
    legacyAdministratorMarketCodes: row.legacy_administrator_market_codes ?? [],
    capabilityGrants: row.capability_grants ?? [],
    capabilityMatrixConfigured: Boolean(row.capability_matrix_configured),
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
      `SELECT u.*,p.must_rotate,COALESCE((SELECT array_agg(a.market_code ORDER BY a.market_code)
          FROM cms_user_market_assignments a WHERE a.user_id=u.id),'{}') market_codes,
        COALESCE((SELECT jsonb_agg(jsonb_build_object(
          'topic',g.topic,'capability',g.capability,'scope',g.scope,'marketCode',g.market_code
        ) ORDER BY g.topic,g.capability,g.scope,g.market_code)
          FROM cms_user_capability_grants g WHERE g.user_id=u.id),'[]'::jsonb) capability_grants,
        COALESCE((SELECT snapshot.market_codes
          FROM cms_legacy_administrator_market_snapshots snapshot WHERE snapshot.user_id=u.id),'{}') legacy_administrator_market_codes,
        EXISTS(SELECT 1 FROM cms_user_capability_configurations c WHERE c.user_id=u.id)
          capability_matrix_configured,
        EXISTS(SELECT 1 FROM cms_totp_credentials t WHERE t.user_id=u.id
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
    if (!(await marketCodesValid(parsed.data.marketCodes ?? []))) {
      res.status(400).json({ error: "One or more market assignments are invalid." });
      return;
    }
    const capabilityError = await validateCapabilityGrants(
      parsed.data.capabilityGrants,
      parsed.data.marketCodes ?? [],
      parsed.data.role,
    );
    if (capabilityError) {
      res.status(400).json({ error: capabilityError });
      return;
    }
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 72 * 60 * 60_000);
    const idempotencyHeader = req.header("idempotency-key");
    const bodyDigest = requestDigest(parsed.data);
    const operationKey = idempotencyHeader
      ? operationDigest(auth.user.id, "user.invited", parsed.data.email.toLowerCase(), idempotencyHeader)
      : null;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (operationKey) {
        const prior = await existingOperationReceipt(
          client,
          operationKey,
          "user.invited",
          parsed.data.email.toLowerCase(),
          bodyDigest,
          auth.user.id,
        );
        if (prior) {
          await client.query("ROLLBACK");
          res.status(prior.statusCode ?? 201).json(prior.response);
          return;
        }
        const reserved = await reserveOperationReceipt(client, {
          idempotencyKey: operationKey,
          operation: "user.invited",
          subjectId: parsed.data.email.toLowerCase(),
          requestDigest: bodyDigest,
          actorUserId: auth.user.id,
        });
        if (!reserved) {
          const committed = await existingOperationReceipt(
            client,
            operationKey,
            "user.invited",
            parsed.data.email.toLowerCase(),
            bodyDigest,
            auth.user.id,
          );
          if (committed) {
            await client.query("ROLLBACK");
            res.status(committed.statusCode ?? 201).json(committed.response);
            return;
          }
          throw Object.assign(new Error("Idempotency-Key is already associated with an in-progress operation."), {
            code: "IDEMPOTENCY_CONFLICT",
          });
        }
      }
      const result = await client.query(
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
      await replaceMarketAssignments(client, user.id, parsed.data.marketCodes ?? []);
      user.marketCodes = parsed.data.marketCodes ?? [];
       if (parsed.data.capabilityGrants !== undefined) {
         await replaceCapabilityGrants(client, user.id, parsed.data.capabilityGrants, auth.user.id);
         user.capabilityGrants = parsed.data.capabilityGrants;
         user.capabilityMatrixConfigured = true;
       }
      const tokenResult = await client.query(
        `INSERT INTO cms_user_access_tokens
          (user_id,purpose,token_digest,expires_at,created_by_user_id)
          VALUES ($1,'invitation',$2,$3,$4) RETURNING id`,
        [user.id, hashToken(token), expiresAt, auth.user.id],
      );
      const deliveryId = await createAccessDeliveryJob(client, {
        userId: user.id,
        accessTokenId: String(tokenResult.rows[0].id),
        email: user.email,
        name: user.name,
        purpose: "invitation",
        token,
        expiresAt,
      });
      const response = {
        id: user.id,
        user,
        delivery: "email" as const,
        deliveryId,
        deliveryStatus: "pending" as const,
        expiresAt,
        createdAt: user.createdAt,
      };
      await audit(auth, "user.invited", "user", user.id, {
        deliveryId,
        deliveryStatus: "pending",
      }, client);
      if (operationKey) {
        await saveOperationReceipt(client, {
          idempotencyKey: operationKey,
          operation: "user.invited",
          subjectId: parsed.data.email.toLowerCase(),
          requestDigest: bodyDigest,
          actorUserId: auth.user.id,
          statusCode: 201,
          response,
        });
      }
      await client.query("COMMIT");
      void deliverAccessDeliveryJob(deliveryId).catch((error) => {
        logger.error({ err: error, deliveryId }, "Access delivery dispatch failed");
      });
      res.status(201).json(response);
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error instanceof AccessDeliveryError) {
        res.status(503).json({ error: error.message, outcome: "rejected" });
        return;
      }
      if (error?.code === "IDEMPOTENCY_CONFLICT") {
        res.status(409).json({ error: error.message });
        return;
      }
      if (error?.code === "23505") {
        res.status(409).json({ error: "A user with that email already exists." });
        return;
      }
      throw error;
    } finally {
      client.release();
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
    const userId = String(req.params.userId);
    if (userId === auth.user.id && parsed.data.status === "suspended") {
      res.status(409).json({ error: "You cannot suspend your own account." });
      return;
    }
    if (userId === auth.user.id && parsed.data.role && parsed.data.role !== "administrator") {
      res.status(409).json({ error: "You cannot remove your own administrator role." });
      return;
    }
    if (parsed.data.marketCodes !== undefined && !(await marketCodesValid(parsed.data.marketCodes))) {
      res.status(400).json({ error: "One or more market assignments are invalid." });
      return;
    }
    const currentUser = await pool.query(
      `SELECT u.*,COALESCE((SELECT array_agg(a.market_code ORDER BY a.market_code)
          FROM cms_user_market_assignments a WHERE a.user_id=u.id),'{}') market_codes
          ,COALESCE((SELECT snapshot.market_codes
             FROM cms_legacy_administrator_market_snapshots snapshot
            WHERE snapshot.user_id=u.id),'{}') legacy_administrator_market_codes
          ,EXISTS(SELECT 1 FROM cms_user_capability_configurations c WHERE c.user_id=u.id)
            capability_matrix_configured
       FROM cms_users u WHERE u.id=$1`,
      [userId],
    );
    if (!currentUser.rowCount) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const nextMarkets = parsed.data.marketCodes ?? currentUser.rows[0].market_codes ?? [];
    const nextRole = parsed.data.role ?? currentUser.rows[0].role;
    const currentGrants = await capabilityGrants(userId);
    const currentConfigured = Boolean(currentUser.rows[0].capability_matrix_configured);
    const capabilityError = await validateCapabilityGrants(
      parsed.data.capabilityGrants ?? currentGrants,
      nextMarkets,
      nextRole,
    );
    if (capabilityError) {
      res.status(400).json({ error: capabilityError });
      return;
    }
    const client = await pool.connect();
    await client.query("BEGIN");
    let result;
    try {
      result = await client.query(
        `UPDATE cms_users SET display_name=COALESCE($2,display_name),role=COALESCE($3,role),
         status=COALESCE($4,status),updated_at=now() WHERE id=$1 RETURNING *`,
        [userId, parsed.data.name ?? null, parsed.data.role ?? null, parsed.data.status ?? null],
      );
      if (result.rowCount && parsed.data.marketCodes !== undefined) {
        await replaceMarketAssignments(client, userId, parsed.data.marketCodes);
      }
      if (result.rowCount && parsed.data.capabilityGrants !== undefined) {
        await replaceCapabilityGrants(client, userId, parsed.data.capabilityGrants, auth.user.id);
        // Policy reads grants per operation, but revoking active sessions also
        // prevents stale clients from retaining any unrelated privileged state.
        await client.query(
          "UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [userId],
        );
      }
      if (result.rowCount && parsed.data.status === "suspended") {
        await client.query(
          "UPDATE cms_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL",
          [userId],
        );
      }
      if (result.rowCount) {
        await audit(res.locals.auth as AuthContext, "user.updated", "user", userId, parsed.data, client);
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    if (!result.rowCount) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const updated = userFromRow(result.rows[0]);
    updated.marketCodes = parsed.data.marketCodes ?? (await marketAssignments(userId));
    updated.capabilityGrants = await capabilityGrants(userId);
    updated.capabilityMatrixConfigured = parsed.data.capabilityGrants !== undefined || currentConfigured;
    res.json(updated);
  }),
);

router.post(
  "/users/:userId/capability-migration/dry-run",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = DryRunUserCapabilityMigrationBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid capability migration dry run." });
      return;
    }
    const userId = String(req.params.userId);
    const target = await pool.query(
      `SELECT u.*,COALESCE((SELECT array_agg(a.market_code ORDER BY a.market_code)
          FROM cms_user_market_assignments a WHERE a.user_id=u.id),'{}') market_codes
          ,EXISTS(SELECT 1 FROM cms_user_capability_configurations c WHERE c.user_id=u.id)
            capability_matrix_configured
       FROM cms_users u WHERE u.id=$1`,
      [userId],
    );
    if (!target.rowCount) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const capabilityError = await validateCapabilityGrants(
      parsed.data.capabilityGrants,
      target.rows[0].market_codes ?? [],
      target.rows[0].role,
    );
    if (capabilityError) {
      res.status(400).json({ error: capabilityError });
      return;
    }
    const enabledMarkets = await pool.query(
      "SELECT code FROM market_editions WHERE enabled=true ORDER BY code",
    );
    const beforeGrants = await capabilityGrants(userId);
    const frozenLegacyAdministrator = target.rows[0].role === "administrator"
      && !target.rows[0].capability_matrix_configured;
    const subject = {
      id: userId,
      // `canAccessLegacyContent` has an administrator compatibility shortcut.
      // Project the frozen 0040 scope as publisher compatibility instead, so
      // a receipt cannot claim every currently enabled market for a legacy
      // administrator merely because a later market was enabled.
      role: frozenLegacyAdministrator ? "publisher" : target.rows[0].role,
      marketCodes: frozenLegacyAdministrator
        ? target.rows[0].legacy_administrator_market_codes ?? []
        : target.rows[0].market_codes ?? [],
    };
    const markets = enabledMarkets.rows.map((row) => row.code);
    const beforeSnapshot = capabilityProjection(
      subject,
      beforeGrants,
      frozenLegacyAdministrator ? subject.marketCodes : markets,
      Boolean(target.rows[0].capability_matrix_configured),
    );
    const afterSnapshot = capabilityProjection(subject, parsed.data.capabilityGrants, markets, true);
    const auth = res.locals.auth as AuthContext;
    const receipt = await pool.query(
      `INSERT INTO cms_capability_migration_receipts(
        requested_by_user_id,target_user_id,before_snapshot,after_snapshot
       ) VALUES ($1,$2,$3::jsonb,$4::jsonb)
       RETURNING id,mode,disposition,before_snapshot,after_snapshot,created_at`,
      [auth.user.id, userId, JSON.stringify(beforeSnapshot), JSON.stringify(afterSnapshot)],
    );
    await audit(auth, "user.capability_migration_dry_run", "user", userId, {
      receiptId: String(receipt.rows[0].id),
      disposition: "no-persistent-access-change",
    });
    const row = receipt.rows[0];
    res.status(201).json({
      id: String(row.id),
      mode: row.mode,
      disposition: row.disposition,
      beforeSnapshot: row.before_snapshot,
      afterSnapshot: row.after_snapshot,
      createdAt: row.created_at,
    });
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
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 60 * 60_000);
    const user = await pool.query("SELECT id,email,display_name FROM cms_users WHERE id=$1", [req.params.userId]);
    if (!user.rowCount) {
      res.status(404).json({ error: "User not found." });
      return;
    }
    const idempotencyHeader = req.header("idempotency-key");
    const bodyDigest = requestDigest(parsed.data);
    const subjectId = String(req.params.userId);
    const operationKey = idempotencyHeader
      ? operationDigest(auth.user.id, "user.password_reset", subjectId, idempotencyHeader)
      : null;
    const client = await pool.connect();
    let deliveryId = "";
    let response: Record<string, unknown>;
    try {
      await client.query("BEGIN");
      if (operationKey) {
        const prior = await existingOperationReceipt(
          client,
          operationKey,
          "user.password_reset",
          subjectId,
          bodyDigest,
          auth.user.id,
        );
        if (prior) {
          await client.query("ROLLBACK");
          res.status(prior.statusCode ?? 202).json(prior.response);
          return;
        }
        const reserved = await reserveOperationReceipt(client, {
          idempotencyKey: operationKey,
          operation: "user.password_reset",
          subjectId,
          requestDigest: bodyDigest,
          actorUserId: auth.user.id,
        });
        if (!reserved) {
          const committed = await existingOperationReceipt(
            client,
            operationKey,
            "user.password_reset",
            subjectId,
            bodyDigest,
            auth.user.id,
          );
          if (committed) {
            await client.query("ROLLBACK");
            res.status(committed.statusCode ?? 202).json(committed.response);
            return;
          }
          throw Object.assign(new Error("Idempotency-Key is already associated with an in-progress operation."), {
            code: "IDEMPOTENCY_CONFLICT",
          });
        }
      }
      await client.query(
        "UPDATE cms_user_access_tokens SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL",
        [req.params.userId],
      );
      const tokenResult = await client.query(
        `INSERT INTO cms_user_access_tokens
          (user_id,purpose,token_digest,expires_at,created_by_user_id)
          VALUES ($1,'password-reset',$2,$3,$4) RETURNING id`,
        [req.params.userId, hashToken(token), expiresAt, auth.user.id],
      );
      deliveryId = await createAccessDeliveryJob(client, {
        userId: subjectId,
        accessTokenId: String(tokenResult.rows[0].id),
        email: user.rows[0].email,
        name: user.rows[0].display_name ?? user.rows[0].email,
        purpose: "password-reset",
        token,
        expiresAt,
      });
      response = {
        id: subjectId,
        delivery: "email" as const,
        deliveryId,
        deliveryStatus: "pending" as const,
        expiresAt,
      };
      await audit(auth, "user.password_reset", "user", subjectId, {
        deliveryId,
        deliveryStatus: "pending",
      }, client);
      if (operationKey) {
        await saveOperationReceipt(client, {
          idempotencyKey: operationKey,
          operation: "user.password_reset",
          subjectId,
          requestDigest: bodyDigest,
          actorUserId: auth.user.id,
          statusCode: 202,
          response,
        });
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof AccessDeliveryError) {
        res.status(503).json({ error: error.message, outcome: "rejected" });
        return;
      }
      if ((error as any)?.code === "IDEMPOTENCY_CONFLICT") {
        res.status(409).json({ error: (error as Error).message });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
    void deliverAccessDeliveryJob(deliveryId).catch((error) => {
      logger.error({ err: error, deliveryId }, "Access delivery dispatch failed");
    });
    res.status(202).json(response);
  }),
);

router.get(
  "/users/:userId/access-delivery/:deliveryId",
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const job = await getAccessDeliveryJob(
      pool,
      String(req.params.deliveryId),
      String(req.params.userId),
    );
    if (!job) {
      res.status(404).json({ error: "Access delivery job not found." });
      return;
    }
    res.json(publicAccessDeliveryJob(job));
  }),
);

router.post(
  "/users/:userId/access-delivery/:deliveryId/retry",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    let job: Record<string, any> | null = null;
    try {
      await client.query("BEGIN");
      job = await retryAccessDeliveryJob(
        client,
        String(req.params.deliveryId),
        String(req.params.userId),
      );
      if (!job) {
        // retryAccessDeliveryJob also atomically purges an expired payload.
        // Commit that terminal transition even though the retry itself was
        // rejected, rather than rolling the secure purge back.
        await client.query("COMMIT");
        res.status(409).json({ error: "This access delivery is not eligible for retry." });
        return;
      }
      await audit(auth, "user.access_delivery_retry", "user", String(req.params.userId), {
        deliveryId: String(req.params.deliveryId),
      }, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    void deliverAccessDeliveryJob(String(req.params.deliveryId)).catch((error) => {
      logger.error({ err: error, deliveryId: String(req.params.deliveryId) }, "Access delivery retry failed");
    });
    res.status(202).json(publicAccessDeliveryJob(job));
  }),
);

type QueryClient = { query: (sql: string, values?: unknown[]) => Promise<any> };

async function replaceMarketAssignments(client: QueryClient, userId: string, marketCodes: string[]) {
  const uniqueCodes = [...new Set(marketCodes)];
  if (uniqueCodes.length) {
    const valid = await client.query(
      "SELECT code FROM market_editions WHERE enabled=true AND code=ANY($1::text[])",
      [uniqueCodes],
    );
    if (valid.rowCount !== uniqueCodes.length) {
      const error = new Error("One or more market assignments are invalid.");
      (error as any).code = "INVALID_MARKET_ASSIGNMENT";
      throw error;
    }
  }
  await client.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1", [userId]);
  for (const code of uniqueCodes) {
    await client.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,$2)",
      [userId, code],
    );
  }
}

async function capabilityGrants(userId: string): Promise<CapabilityGrant[]> {
  const result = await pool.query(
    `SELECT topic,capability,scope,market_code FROM cms_user_capability_grants
      WHERE user_id=$1 ORDER BY topic,capability,scope,market_code`,
    [userId],
  );
  return result.rows.map((row) => ({
    topic: row.topic,
    capability: row.capability,
    scope: row.scope,
    marketCode: row.market_code,
  })) as CapabilityGrant[];
}

async function validateCapabilityGrants(
  grants: CapabilityGrant[] | undefined,
  marketCodes: string[],
  role: string,
): Promise<string | null> {
  if (grants === undefined) return null;
  const duplicate = new Set<string>();
  for (const grant of grants) {
    const key = `${grant.topic}/${grant.capability}/${grant.scope}/${grant.marketCode}`;
    if (duplicate.has(key)) return "Capability grants must be unique.";
    duplicate.add(key);
  }
  const prerequisiteErrors = capabilityGrantPrerequisiteErrors(grants);
  if (prerequisiteErrors.length) return prerequisiteErrors[0];
  if (!(await marketCodesValid(grants.map((grant) => grant.marketCode)))) {
    return "One or more capability grant geographies are invalid or disabled.";
  }
  if (role !== "administrator" && grants.some((grant) => !marketCodes.includes(grant.marketCode))) {
    return "Capability grants must use geographies assigned to the user.";
  }
  return null;
}

async function replaceCapabilityGrants(
  client: QueryClient,
  userId: string,
  grants: CapabilityGrant[],
  actorUserId: string,
) {
  await client.query(
    `INSERT INTO cms_user_capability_configurations(user_id,configured_by_user_id,configured_at)
     VALUES ($1,$2,now())
     ON CONFLICT (user_id) DO UPDATE
       SET configured_by_user_id=excluded.configured_by_user_id,configured_at=excluded.configured_at`,
    [userId, actorUserId],
  );
  await client.query("DELETE FROM cms_user_capability_grants WHERE user_id=$1", [userId]);
  for (const grant of grants) {
    await client.query(
      `INSERT INTO cms_user_capability_grants(
        user_id,topic,capability,scope,market_code,created_by_user_id
       ) VALUES ($1,$2,$3,$4,$5,$6)`,
      [userId, grant.topic, grant.capability, grant.scope, grant.marketCode, actorUserId],
    );
  }
}

async function marketAssignments(userId: string): Promise<string[]> {
  const result = await pool.query(
    "SELECT market_code FROM cms_user_market_assignments WHERE user_id=$1 ORDER BY market_code",
    [userId],
  );
  return result.rows.map((row) => row.market_code);
}

async function marketCodesValid(marketCodes: string[]): Promise<boolean> {
  const uniqueCodes = [...new Set(marketCodes)];
  if (!uniqueCodes.length) return true;
  const result = await pool.query(
    "SELECT code FROM market_editions WHERE enabled=true AND code=ANY($1::text[])",
    [uniqueCodes],
  );
  return result.rowCount === uniqueCodes.length;
}

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
    const client = await pool.connect();
    let result;
    try {
      await client.query("BEGIN");
      result = await client.query(
        `UPDATE cms_sessions SET revoked_at=$3
          WHERE user_id=$1 AND revoked_at IS NULL AND ($2::boolean=false OR id<>$4)
          RETURNING id`,
        [req.params.userId, parsed.data.exceptCurrent, now, auth.id],
      );
      await audit(auth, "sessions.revoked", "user", String(req.params.userId), {
        count: result.rowCount ?? 0,
      }, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
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
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const result = await client.query(
        `INSERT INTO market_editions
          (code,display_name,default_locale,fallback_market_code,fallback_locale,is_canonical,enabled)
          VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [input.code,input.displayName,input.defaultLocale,input.fallbackMarketCode ?? null,input.fallbackLocale ?? null,input.isCanonical,input.enabled],
      );
      await audit(auth, "market.created", "market", String(result.rows[0].id), {}, client);
      await client.query("COMMIT");
      res.status(201).json(marketFromRow(result.rows[0]));
    } catch (error: any) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error?.code === "23505" || error?.code === "23503") {
        res.status(409).json({ error: "Market configuration conflicts with an existing market." });
        return;
      }
      throw error;
    } finally {
      client.release();
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
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        const result = await client.query(
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
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Market edition not found." });
          return;
        }
        await audit(res.locals.auth as AuthContext, "market.updated", "market", String(req.params.marketEditionId), {}, client);
        await client.query("COMMIT");
        res.json(marketFromRow(result.rows[0]));
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
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
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const references = await client.query(
        `SELECT m.is_canonical,m.code,
          EXISTS(SELECT 1 FROM market_editions x WHERE x.fallback_market_code=m.code) global_ref,
          EXISTS(SELECT 1 FROM cms_market_editions x WHERE x.market=m.code) content_ref
         FROM market_editions m WHERE m.id=$1 FOR UPDATE`,
        [req.params.marketEditionId],
      );
      if (!references.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Market edition not found." });
        return;
      }
      if (references.rows[0].is_canonical || references.rows[0].code === "uae" || references.rows[0].global_ref || references.rows[0].content_ref) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Referenced or canonical market cannot be deleted." });
        return;
      }
      const result = await client.query("DELETE FROM market_editions WHERE id=$1 AND NOT is_canonical AND code<>'uae' RETURNING id", [req.params.marketEditionId]);
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Market edition not found." });
        return;
      }
      await audit(res.locals.auth as AuthContext, "market.deleted", "market", String(req.params.marketEditionId), {}, client);
      await client.query("COMMIT");
      res.status(204).end();
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
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