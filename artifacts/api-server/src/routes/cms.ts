import { Router, type IRouter, type Response } from "express";
import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import { cmsDocumentsTable, cmsMarketEditionsTable, cmsPreviewSessionsTable, cmsRevisionsTable, cmsWorkflowEventsTable, db } from "@workspace/db";
import { getPreviewRevision, getPublishedPage, getPublishedPublications, getRuntime, getSitemap, cmsConfigurationStatus } from "../lib/cms/adapter";
import { principalForRequest, requireSameOrigin } from "../lib/cms/auth";
import { dueActions, isMarketAssigned, parseTransitionInput, transitionPage, withDueProcessingLease } from "../lib/cms/workflow";
import { canExchangePreviewSession, canReadPreviewSession, parseMarket, parseRouteKind, safeSlug, sha256, signPreviewToken, verifyPreviewToken, parseCookie, type CmsMarket } from "../lib/cms/security";
import { CmsConflictError, CmsForbiddenError, CmsValidationError, createDocument, rollbackEdition, updateEditionDraft } from "../lib/cms/editorial";

const router: IRouter = Router();
const previewCookie = "cognirise_cms_preview";
const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] : value;
const secrets = () => (process.env.CMS_PREVIEW_SECRETS ?? process.env.SESSION_SECRET ?? "").split(",").map((v) => v.trim()).filter((v) => v.length >= 32);
const authorized = (principal: NonNullable<Awaited<ReturnType<typeof principalForRequest>>>, market: string) => principal.markets === "all" || principal.markets.includes(market as "uae" | "ksa" | "turkiye" | "europe");
function adminError(res: Response, error: unknown): void {
  if (error instanceof CmsForbiddenError) { res.status(403).json({ error: error.message }); return; }
  if (error instanceof CmsConflictError) { res.status(409).json({ error: error.message }); return; }
  if (error instanceof CmsValidationError) { res.status(400).json({ error: error.message }); return; }
  res.status(500).json({ error: "CMS operation failed" });
}
function diffPayload(before: unknown, after: unknown, path = ""): Array<{ path: string; before: unknown; after: unknown }> {
  if (JSON.stringify(before) === JSON.stringify(after)) return [];
  if (!before || !after || typeof before !== "object" || typeof after !== "object" || Array.isArray(before) || Array.isArray(after)) return [{ path: path || "/", before, after }];
  const left = before as Record<string, unknown>; const right = after as Record<string, unknown>;
  return [...new Set([...Object.keys(left), ...Object.keys(right)])].flatMap((key) => diffPayload(left[key], right[key], `${path}/${key}`));
}
export function previewTokenIdentity(
  market: CmsMarket,
  edition: { localizedSlug: string | null },
  page: { canonicalSlug?: string; routeKind?: string },
) {
  const slug = safeSlug(edition.localizedSlug ?? page.canonicalSlug);
  const routeKind = parseRouteKind(page.routeKind);
  return slug && routeKind ? { market, slug, routeKind } : undefined;
}

router.get("/cms/pages/:market/:slug", async (req, res): Promise<void> => {
  const market = parseMarket(first(req.params.market)); const slug = safeSlug(first(req.params.slug)); const kind = parseRouteKind(req.query.routeKind);
  if (!market || !slug || !kind) { res.status(400).json({ error: "Invalid market, slug, or route kind" }); return; }
  res.json(await getPublishedPage(market, slug, kind));
});
router.get("/cms/runtime/:market", async (req, res): Promise<void> => {
  const market = parseMarket(first(req.params.market));
  if (!market) { res.status(400).json({ error: "Invalid market" }); return; }
  res.json(await getRuntime(market));
});
router.get("/cms/publications/:market", async (req, res): Promise<void> => {
  const market = parseMarket(first(req.params.market));
  if (!market) { res.status(400).json({ error: "Invalid market" }); return; }
  res.json({ publications: await getPublishedPublications(market), meta: { market, source: "postgres" } });
});
router.get("/cms/publications/:market/:slug", async (req, res): Promise<void> => {
  const market = parseMarket(first(req.params.market)); const slug = safeSlug(first(req.params.slug));
  if (!market || !slug) { res.status(400).json({ error: "Invalid market or slug" }); return; }
  res.json({ publication: await getPublishedPublications(market, slug), meta: { market, source: "postgres" } });
});
router.get("/cms/sitemap.xml", async (_req, res): Promise<void> => {
  try {
    const urls = await getSitemap();
    const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
    res.type("application/xml").send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map((url) => `<url><loc>${escapeXml(url)}</loc></url>`).join("")}</urlset>`);
  } catch (error) {
    res.status(503).json({ error: error instanceof Error ? error.message : "Sitemap configuration failed" });
  }
});

router.post("/cms/preview/exchange", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const token = typeof req.body?.token === "string" ? req.body.token : "";
  const claims = verifyPreviewToken(token, secrets());
  if (!claims || claims.purpose !== "exchange") { res.status(401).json({ error: "Preview token is invalid or expired" }); return; }
  // The issuing API records an exact revision in the server session. Tokens contain
  // only an opaque nonce and cannot be widened by changing a requested slug.
  const [session] = await db.select().from(cmsPreviewSessionsTable).where(eq(cmsPreviewSessionsTable.nonceDigest, sha256(token))).limit(1);
  if (!canExchangePreviewSession(session)) { res.status(401).json({ error: "Preview token was used, revoked, or expired" }); return; }
  const consumed = await db.update(cmsPreviewSessionsTable).set({ exchangedAt: new Date() }).where(and(eq(cmsPreviewSessionsTable.id, session.id), isNull(cmsPreviewSessionsTable.exchangedAt), isNull(cmsPreviewSessionsTable.revokedAt))).returning({ id: cmsPreviewSessionsTable.id });
  if (!consumed.length) { res.status(401).json({ error: "Preview token was already used or revoked" }); return; }
  res.cookie(previewCookie, session.id, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/cms/preview", maxAge: Math.max(0, session.expiresAt.getTime() - Date.now()) });
  res.json({ status: "ready", market: claims.market, slug: claims.slug, routeKind: claims.routeKind, expiresAt: Math.floor(session.expiresAt.getTime() / 1000) });
});

router.get("/cms/preview/pages/:market/:slug", async (req, res): Promise<void> => {
  res.set("Cache-Control", "private, no-store");
  const market = parseMarket(first(req.params.market)); const slug = safeSlug(first(req.params.slug)); const kind = parseRouteKind(req.query.routeKind);
  const sessionId = parseCookie(req.headers.cookie, previewCookie);
  if (!market || !slug || !kind || !sessionId) { res.status(401).json({ error: "Preview authorization does not match this page" }); return; }
  const [session] = await db.select().from(cmsPreviewSessionsTable).where(eq(cmsPreviewSessionsTable.id, sessionId)).limit(1);
  if (!canReadPreviewSession(session)) { res.status(401).json({ error: "Preview authorization is invalid or expired" }); return; }
  const page = await getPreviewRevision((await db.select({ documentId: cmsMarketEditionsTable.documentId }).from(cmsMarketEditionsTable).where(eq(cmsMarketEditionsTable.id, session.editionId)).limit(1))[0]?.documentId ?? "", session.editionId, session.revisionId);
  if (!page || page.page?.market !== market || page.page.slug !== slug || page.page.routeKind !== kind) { res.status(401).json({ error: "Preview authorization does not match this page" }); return; }
  res.json(page);
});

router.post("/cms/admin/workflow/transitions", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const input = parseTransitionInput(req.body);
  if (!input) { res.status(400).json({ error: "Workflow transition input is invalid" }); return; }
  try {
    const outcome = await transitionPage(input, principal);
    res.status(outcome.duplicate ? 200 : 202).json({ status: outcome.duplicate ? "duplicate" : "accepted", requestId: input.requestId, ...outcome });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Workflow transition failed";
    res.status(/not assigned|not permitted|Separation of duties/.test(message) ? 403 : 409).json({ error: message });
  }
});

router.post("/cms/admin/workflow/process-due", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  if (!["publisher", "admin"].includes(principal.role)) { res.status(403).json({ error: "Publisher role required" }); return; }
  const lease = await withDueProcessingLease(async () => {
    const actions = await dueActions(); let processed = 0;
    for (const action of actions) {
      if (!isMarketAssigned(principal, action.market)) continue;
      try { if (!(await transitionPage(action, principal)).duplicate) processed++; } catch { /* stale/due races are safely idempotent */ }
    }
    return { discovered: actions.length, processed };
  });
  if (!lease.acquired) { res.status(202).json({ status: "leased", discovered: 0, processed: 0 }); return; }
  const result = lease.result!;
  res.json({ status: result.processed === result.discovered ? "complete" : "partial", ...result });
});

router.get("/cms/admin/documents", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const editions = await db.select().from(cmsMarketEditionsTable);
  const permitted = editions.filter((edition) => authorized(principal, edition.market));
  const ids = [...new Set(permitted.map((edition) => edition.documentId))];
  const documents = ids.length ? await db.select().from(cmsDocumentsTable).where(inArray(cmsDocumentsTable.id, ids)).orderBy(desc(cmsDocumentsTable.updatedAt)) : [];
  res.json({ documents, editions: permitted });
});
router.get("/cms/admin/access", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  res.json({ principal: { id: principal.id, role: principal.role, markets: principal.markets } });
});
router.get("/cms/admin/dashboard", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const editions = (await db.select().from(cmsMarketEditionsTable)).filter((edition) => authorized(principal, edition.market));
  const counts = Object.fromEntries(["draft", "review", "approved", "scheduled", "published", "expired", "archived"].map((state) => [state, editions.filter((edition) => edition.publicationState === state).length]));
  res.json({ documents: new Set(editions.map((edition) => edition.documentId)).size, editions: editions.length, states: counts });
});
router.post("/cms/admin/documents", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const body = req.body as Record<string, unknown>;
  try {
    if (!body || typeof body.documentId !== "string") throw new CmsValidationError("documentId is required");
    res.status(201).json(await createDocument(principal, body.documentId, body.payload));
  } catch (error) { adminError(res, error); }
});
router.get("/cms/admin/documents/:documentId", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const id = first(req.params.documentId); const [document] = await db.select().from(cmsDocumentsTable).where(eq(cmsDocumentsTable.id, id ?? "")).limit(1);
  if (!document) { res.status(404).json({ error: "Document not found" }); return; }
  const editions = (await db.select().from(cmsMarketEditionsTable).where(eq(cmsMarketEditionsTable.documentId, document.id))).filter((edition) => authorized(principal, edition.market));
  if (!editions.length) { res.status(403).json({ error: "Document is outside assigned markets" }); return; }
  res.json({ document, editions });
});
router.get("/cms/admin/documents/:documentId/editions/:market", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req); const market = parseMarket(first(req.params.market));
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  if (!market || !authorized(principal, market)) { res.status(403).json({ error: "Market access denied" }); return; }
  const [edition] = await db.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, first(req.params.documentId) ?? ""), eq(cmsMarketEditionsTable.market, market))).limit(1);
  if (!edition) { res.status(404).json({ error: "Edition not found" }); return; }
  const [draft] = await db.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition.draftRevisionId!)).limit(1);
  res.json({ edition, draft });
});
router.patch("/cms/admin/documents/:documentId/editions/:market", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const principal = await principalForRequest(req); const market = parseMarket(first(req.params.market)); const body = req.body as Record<string, unknown>;
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  try {
    if (!market || !Number.isInteger(body?.expectedVersion)) throw new CmsValidationError("market and expectedVersion are required");
    res.json(await updateEditionDraft(principal, first(req.params.documentId) ?? "", market, body.expectedVersion as number, body.payload));
  } catch (error) { adminError(res, error); }
});
router.get("/cms/admin/documents/:documentId/editions/:market/revisions", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req); const market = parseMarket(first(req.params.market));
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  if (!market || !authorized(principal, market)) { res.status(403).json({ error: "Market access denied" }); return; }
  const [edition] = await db.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, first(req.params.documentId) ?? ""), eq(cmsMarketEditionsTable.market, market))).limit(1);
  if (!edition) { res.status(404).json({ error: "Edition not found" }); return; }
  res.json({ revisions: await db.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.editionId, edition.id)).orderBy(desc(cmsRevisionsTable.revisionNumber)) });
});
router.post("/cms/admin/documents/:documentId/editions/:market/rollback", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const principal = await principalForRequest(req); const market = parseMarket(first(req.params.market)); const body = req.body as Record<string, unknown>;
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  try {
    if (!market || typeof body?.revisionId !== "string" || !Number.isInteger(body.expectedVersion)) throw new CmsValidationError("revisionId and expectedVersion are required");
    res.json(await rollbackEdition(principal, first(req.params.documentId) ?? "", market, body.revisionId, body.expectedVersion as number));
  } catch (error) { adminError(res, error); }
});
router.get("/cms/admin/revisions/:revisionId", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const [revision] = await db.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, first(req.params.revisionId) ?? "")).limit(1);
  if (!revision) { res.status(404).json({ error: "Revision not found" }); return; }
  const [edition] = await db.select().from(cmsMarketEditionsTable).where(eq(cmsMarketEditionsTable.id, revision.editionId)).limit(1);
  if (!edition || !authorized(principal, edition.market)) { res.status(403).json({ error: "Market access denied" }); return; }
  res.json({ revision, edition });
});
router.get("/cms/admin/revisions/:revisionId/diff/:againstRevisionId", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const ids = [first(req.params.revisionId) ?? "", first(req.params.againstRevisionId) ?? ""];
  const revisions = await db.select().from(cmsRevisionsTable).where(inArray(cmsRevisionsTable.id, ids));
  const current = revisions.find((item) => item.id === ids[0]); const against = revisions.find((item) => item.id === ids[1]);
  if (!current || !against || current.editionId !== against.editionId) { res.status(404).json({ error: "Comparable revisions not found" }); return; }
  const [edition] = await db.select().from(cmsMarketEditionsTable).where(eq(cmsMarketEditionsTable.id, current.editionId)).limit(1);
  if (!edition || !authorized(principal, edition.market)) { res.status(403).json({ error: "Market access denied" }); return; }
  res.json({ revisionId: current.id, againstRevisionId: against.id, changes: diffPayload(against.payload, current.payload) });
});
router.get("/cms/admin/audit-events", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  const events = await db.select().from(cmsWorkflowEventsTable).orderBy(desc(cmsWorkflowEventsTable.createdAt));
  res.json({ events: events.filter((event) => !event.market || authorized(principal, event.market)) });
});
router.post("/cms/admin/documents/:documentId/editions/:market/preview", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) return;
  const principal = await principalForRequest(req); const market = parseMarket(first(req.params.market)); const body = req.body as Record<string, unknown>;
  if (!principal) { res.status(401).json({ error: "CMS authentication required" }); return; }
  if (!market || !authorized(principal, market)) { res.status(403).json({ error: "Market access denied" }); return; }
  if (typeof body?.revisionId !== "string") { res.status(400).json({ error: "revisionId is required" }); return; }
  const secret = secrets()[0];
  if (!secret) { res.status(503).json({ error: "Preview signing is not configured" }); return; }
  const [edition] = await db.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, first(req.params.documentId) ?? ""), eq(cmsMarketEditionsTable.market, market))).limit(1);
  const [revision] = edition ? await db.select().from(cmsRevisionsTable).where(and(eq(cmsRevisionsTable.id, body.revisionId), eq(cmsRevisionsTable.editionId, edition.id))).limit(1) : [];
  const page = (revision?.payload as unknown as { content?: { kind?: string; canonicalSlug?: string; routeKind?: string } } | undefined)?.content;
  if (!edition || !revision || page?.kind !== "page" || !page.canonicalSlug || !parseRouteKind(page.routeKind)) { res.status(400).json({ error: "Preview requires an exact page revision" }); return; }
  const identity = previewTokenIdentity(market, edition, page);
  if (!identity) { res.status(400).json({ error: "Preview requires a valid localized or canonical slug" }); return; }
  const token = signPreviewToken(identity, secret, undefined, 10 * 60);
  const expiresAt = new Date(Date.now() + 10 * 60_000);
  await db.insert(cmsPreviewSessionsTable).values({ nonceDigest: sha256(token), editionId: edition.id, revisionId: revision.id, expiresAt, createdByPrincipalId: principal.id });
  res.status(201).json({ token, expiresAt });
});
router.get("/cms/health", (_req, res): void => { const status = cmsConfigurationStatus(); res.status(status.configured ? 200 : 503).json({ status: status.configured ? "configured" : "unconfigured", ...status, canonicalMarket: "uae" }); });
export default router;