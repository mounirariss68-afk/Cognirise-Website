import { Router, type IRouter } from "express";
import {
  cmsWebhookReceiptsTable,
  cmsPreviewTokenNoncesTable,
  cmsWorkflowReceiptsTable,
  cmsWorkflowEventsTable,
  db,
} from "@workspace/db";
import { and, gt, isNull, eq, sql } from "drizzle-orm";
import {
  cmsConfigurationStatus,
  getPreviewPage,
  getPublishedPage,
  invalidatePublishedCache,
} from "../lib/cms/adapter";
import {
  parseCookie,
  parseMarket,
  isWebhookTimestampFresh,
  previewClaimsMatch,
  safeSlug,
  sha256,
  signPreviewToken,
  signPreviewSession,
  verifyPreviewToken,
  verifyWebhookSignature,
} from "../lib/cms/security";
import {
  authenticateWorkflow,
  dueActions,
  isMarketAssigned,
  parseTransitionInput,
  rollbackPage,
  transitionPage,
} from "../lib/cms/workflow";

const router: IRouter = Router();
const PREVIEW_COOKIE = "cognirise_cms_preview";

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function previewSecrets(): string[] {
  return (process.env.CMS_PREVIEW_SECRETS ?? "")
    .split(",")
    .map((secret) => secret.trim())
    .filter((secret) => secret.length >= 32);
}

router.get("/cms/pages/:market/:slug", async (req, res): Promise<void> => {
  const market = parseMarket(first(req.params.market));
  const slug = safeSlug(first(req.params.slug));
  if (!market || !slug) {
    res.status(400).json({ error: "Invalid market or page slug" });
    return;
  }
  try {
    res.json(await getPublishedPage(market, slug));
  } catch (error) {
    req.log.error({ error: error instanceof Error ? error.message : "unknown" }, "CMS published delivery failed");
    res.status(503).json({ error: "CMS published delivery is unavailable" });
  }
});

router.post("/cms/preview/exchange", async (req, res): Promise<void> => {
  const token =
    typeof req.body === "object" && req.body !== null && typeof req.body.token === "string"
      ? req.body.token
      : undefined;
  const claims = token ? verifyPreviewToken(token, previewSecrets()) : undefined;
  if (!claims || claims.purpose !== "exchange") {
    res.status(401).json({ error: "Preview token is invalid or expired" });
    return;
  }
  const maxAge = Math.max(0, claims.exp - Math.floor(Date.now() / 1000));
  const digest = sha256(token);
  const consumed = await db.transaction(async (tx) => {
    const rows = await tx.update(cmsPreviewTokenNoncesTable)
      .set({ consumedAt: new Date() })
      .where(and(
        eq(cmsPreviewTokenNoncesTable.digest, digest),
        isNull(cmsPreviewTokenNoncesTable.consumedAt),
        gt(cmsPreviewTokenNoncesTable.expiresAt, new Date()),
      ))
      .returning({ digest: cmsPreviewTokenNoncesTable.digest });
    await tx.insert(cmsWorkflowEventsTable).values({
      action: "preview_token_exchanged", actor: "preview-token",
      target: `page:${claims.slug}`, market: claims.market,
      outcome: rows.length === 1 ? "success" : "replay_rejected",
      metadata: { tokenDigest: digest.slice(0, 16) },
    });
    return rows.length === 1;
  });
  if (!consumed) {
    res.status(401).json({ error: "Preview token was already used or revoked" });
    return;
  }
  const sessionToken = signPreviewSession(
    { market: claims.market, slug: claims.slug },
    previewSecrets()[0]!,
    Math.floor(Date.now() / 1000),
    maxAge,
  );
  res.cookie(PREVIEW_COOKIE, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/api/cms/preview",
    maxAge: maxAge * 1000,
  });
  res.json({ status: "ready", market: claims.market, slug: claims.slug, expiresAt: claims.exp });
});

router.get("/cms/preview/pages/:market/:slug", async (req, res): Promise<void> => {
  res.setHeader("Cache-Control", "private, no-store");
  const market = parseMarket(first(req.params.market));
  const slug = safeSlug(first(req.params.slug));
  const cookie = parseCookie(req.headers.cookie, PREVIEW_COOKIE);
  const claims = cookie ? verifyPreviewToken(cookie, previewSecrets()) : undefined;
  if (!market || !slug || claims?.purpose !== "session" || !previewClaimsMatch(claims, market, slug)) {
    res.status(401).json({ error: "Preview authorization does not match this page" });
    return;
  }
  try {
    res.json(await getPreviewPage(market, slug));
  } catch (error) {
    req.log.error({ error: error instanceof Error ? error.message : "unknown" }, "CMS preview failed");
    res.status(503).json({ error: "CMS preview is unavailable" });
  }
});

router.post("/cms/workflow/preview-tokens", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  if (!principal) {
    res.status(401).json({ error: "Workflow authorization required" });
    return;
  }
  const market = parseMarket(req.body?.market);
  const slug = safeSlug(req.body?.slug);
  const secret = previewSecrets()[0];
  if (!market || !slug) {
    res.status(400).json({ error: "Invalid market or page slug" });
    return;
  }
  if (!isMarketAssigned(principal, market)) {
    res.status(403).json({ error: "Workflow principal is not assigned to this market" });
    return;
  }
  if (!secret || !process.env.SANITY_API_TOKEN) {
    res.status(503).json({ error: "CMS preview is not configured" });
    return;
  }
  const token = signPreviewToken({ market, slug }, secret);
  const claims = verifyPreviewToken(token, [secret]);
  if (!claims) throw new Error("Generated preview token failed verification");
  const digest = sha256(token);
  await db.transaction(async (tx) => {
    await tx.insert(cmsPreviewTokenNoncesTable).values({
      digest, expiresAt: new Date(claims.exp * 1000),
    });
    await tx.insert(cmsWorkflowEventsTable).values({
      action: "preview_token_issued",
      actor: principal.id,
      target: `page:${slug}`, market, outcome: "success",
      metadata: { tokenDigest: digest.slice(0, 16) },
    });
  });
  res.status(201).json({ token, market, slug });
});

router.post("/cms/workflow/transitions", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  if (!principal) {
    res.status(401).json({ error: "Workflow authorization required" });
    return;
  }
  const input = parseTransitionInput(req.body);
  if (!input) {
    res.status(400).json({ error: "Workflow transition input is invalid" });
    return;
  }
  const existing = await db.select({ requestId: cmsWorkflowReceiptsTable.requestId })
    .from(cmsWorkflowReceiptsTable).where(eq(cmsWorkflowReceiptsTable.requestId, input.requestId)).limit(1);
  if (existing.length) {
    res.status(200).json({ status: "duplicate", requestId: input.requestId });
    return;
  }
  try {
    const result = await transitionPage(input, principal);
    await db.transaction(async (tx) => {
      await tx.insert(cmsWorkflowReceiptsTable).values({
        requestId: input.requestId, action: `transition:${input.toState}`, subjectId: input.subjectId,
      });
      await tx.insert(cmsWorkflowEventsTable).values({
        action: "workflow_transition", actor: principal.id, target: `page:${input.subjectId}`,
        market: input.market, outcome: "success",
        metadata: { requestId: input.requestId, role: principal.role, fromState: result.fromState, toState: result.toState },
      });
    });
    invalidatePublishedCache();
    res.status(202).json({ status: "accepted", requestId: input.requestId, ...result });
  } catch (error) {
    req.log.warn({ error: error instanceof Error ? error.message : "unknown" }, "CMS transition rejected");
    await db.insert(cmsWorkflowEventsTable).values({
      action: "workflow_transition", actor: principal.id, target: `page:${input.subjectId}`,
      market: input.market, outcome: "rejected",
      metadata: { requestId: input.requestId, role: principal.role, toState: input.toState },
    });
    res.status(409).json({ error: error instanceof Error ? error.message : "Workflow transition failed" });
  }
});

router.post("/cms/workflow/rollbacks", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  const { subjectId, revisionId, requestId } =
    typeof req.body === "object" && req.body !== null ? req.body : {};
  if (!principal) {
    res.status(401).json({ error: "Workflow authorization required" });
    return;
  }
  if (principal.role !== "admin" || principal.markets !== "all") {
    res.status(409).json({ error: "Rollback requires an all-market admin" });
    return;
  }
  if (typeof requestId !== "string") {
    res.status(400).json({ error: "Rollback input is invalid" });
    return;
  }
  try {
    const outcome = await db.transaction(async (tx) => {
      await tx.execute(
        sql`select pg_advisory_xact_lock(hashtext(${"cms-rollback:" + requestId}))`,
      );
      const existing = await tx
        .select({
          requestId: cmsWorkflowReceiptsTable.requestId,
          action: cmsWorkflowReceiptsTable.action,
          subjectId: cmsWorkflowReceiptsTable.subjectId,
        })
        .from(cmsWorkflowReceiptsTable)
        .where(eq(cmsWorkflowReceiptsTable.requestId, requestId))
        .limit(1);
      if (existing.length > 0) {
        if (
          existing[0]?.action === `rollback:${revisionId}` &&
          existing[0]?.subjectId === subjectId
        ) return "duplicate" as const;
        throw new Error("Rollback request ID conflicts with another operation");
      }
      await rollbackPage(subjectId, revisionId, requestId, principal);
      await tx.insert(cmsWorkflowReceiptsTable).values({
        requestId,
        action: `rollback:${revisionId}`,
        subjectId,
      });
      await tx.insert(cmsWorkflowEventsTable).values({
        action: "workflow_rollback", actor: principal.id, target: `page:${subjectId}`,
        outcome: "success", metadata: { requestId, revisionId, role: principal.role },
      });
      return "accepted" as const;
    });
    if (outcome === "duplicate") {
      res.status(200).json({ status: "duplicate", requestId });
      return;
    }
    invalidatePublishedCache();
    res.status(202).json({ status: "accepted", requestId });
  } catch (error) {
    req.log.warn({ error: error instanceof Error ? error.message : "unknown" }, "CMS rollback rejected");
    await db.insert(cmsWorkflowEventsTable).values({
      action: "workflow_rollback", actor: principal.id,
      target: `page:${typeof subjectId === "string" ? subjectId : "invalid"}`,
      outcome: "rejected", metadata: { role: principal.role },
    });
    res.status(409).json({ error: error instanceof Error ? error.message : "Rollback failed" });
  }
});

router.post("/cms/workflow/process-due", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  if (!principal || !["publisher", "admin"].includes(principal.role)) {
    res.status(401).json({ error: "Publisher workflow authorization required" });
    return;
  }
  let actions;
  try {
    actions = await dueActions();
  } catch (error) {
    req.log.error({ error: error instanceof Error ? error.message : "unknown" }, "CMS due processing unavailable");
    res.status(503).json({ error: "CMS due processing is unavailable" });
    return;
  }
  let processed = 0;
  for (const action of actions) {
    try {
      const result = await transitionPage(action, principal);
      await db.transaction(async (tx) => {
        await tx.insert(cmsWorkflowReceiptsTable).values({
          requestId: action.requestId, action: `due:${action.toState}`, subjectId: action.subjectId,
        }).onConflictDoNothing();
        await tx.insert(cmsWorkflowEventsTable).values({
          action: "workflow_due_processed", actor: principal.id, target: `page:${action.subjectId}`,
          market: action.market, outcome: "success",
          metadata: { requestId: action.requestId, fromState: result.fromState, toState: result.toState },
        });
      });
      processed++;
    } catch (error) {
      req.log.warn({ subjectId: action.subjectId, error: error instanceof Error ? error.message : "unknown" }, "Due CMS action failed");
      await db.insert(cmsWorkflowEventsTable).values({
        action: "workflow_due_processed", actor: principal.id, target: `page:${action.subjectId}`,
        market: action.market, outcome: "failed",
        metadata: { requestId: action.requestId, toState: action.toState },
      });
    }
  }
  if (processed) invalidatePublishedCache();
  res.status(200).json({
    status: processed === actions.length ? "complete" : "partial",
    discovered: actions.length, processed,
  });
});

router.post("/cms/webhooks/publish", async (req, res): Promise<void> => {
  const secret = process.env.SANITY_WEBHOOK_SECRET;
  if (!secret) {
    res.status(503).json({ error: "CMS webhook is not configured" });
    return;
  }
  if (!Buffer.isBuffer(req.body)) {
    res.status(415).json({ error: "Webhook requires an application/json body" });
    return;
  }
  const timestamp = first(req.headers["sanity-webhook-timestamp"]);
  const signature = first(req.headers["sanity-webhook-signature"]);
  const eventId = first(req.headers["sanity-webhook-id"]);
  if (
    !timestamp ||
    !signature ||
    !eventId ||
    !/^[A-Za-z0-9._:-]{8,200}$/.test(eventId) ||
    !isWebhookTimestampFresh(timestamp) ||
    !verifyWebhookSignature(req.body, timestamp, signature, secret)
  ) {
    res.status(401).json({ error: "Webhook signature, timestamp, or id is invalid" });
    return;
  }
  try {
    const payload = JSON.parse(req.body.toString("utf8")) as unknown;
    if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
      res.status(400).json({ error: "Webhook payload is invalid" });
      return;
    }
  } catch {
    res.status(400).json({ error: "Webhook payload is invalid JSON" });
    return;
  }

  const digest = sha256(req.body);
  const result = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(cmsWebhookReceiptsTable)
      .values({ eventId, payloadDigest: digest })
      .onConflictDoNothing()
      .returning({ eventId: cmsWebhookReceiptsTable.eventId });
    if (inserted.length === 0) {
      const existing = await tx
        .select({ payloadDigest: cmsWebhookReceiptsTable.payloadDigest })
        .from(cmsWebhookReceiptsTable)
        .where(eq(cmsWebhookReceiptsTable.eventId, eventId))
        .limit(1);
      return existing[0]?.payloadDigest === digest ? "duplicate" as const : "conflict" as const;
    }
    await tx.insert(cmsWorkflowEventsTable).values({
      action: "published_content_changed",
      actor: "sanity-webhook",
      target: `event:${eventId}`,
      outcome: "accepted",
      metadata: { payloadDigest: digest },
    });
    return "accepted" as const;
  });
  if (result === "duplicate") {
    res.status(200).json({ status: "duplicate" });
    return;
  }
  if (result === "conflict") {
    res.status(409).json({ error: "Webhook event ID conflicts with an earlier payload" });
    return;
  }
  const invalidatedEntries = invalidatePublishedCache();
  res.status(202).json({ status: "accepted", invalidatedEntries });
});

router.get("/cms/health", (_req, res): void => {
  const status = cmsConfigurationStatus();
  res.status(status.configured ? 200 : 503).json({
    status: status.configured ? "configured" : "unconfigured",
    ...status,
    canonicalMarket: "uae",
  });
});

export default router;