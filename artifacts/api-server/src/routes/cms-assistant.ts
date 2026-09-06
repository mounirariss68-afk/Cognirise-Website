import { Router, type IRouter } from "express";
import {
  cmsAssistantDecisionsTable,
  cmsAssistantRunsTable,
  cmsDocumentsTable,
  cmsMarketEditionsTable,
  cmsRevisionsTable,
  cmsWorkflowEventsTable,
  db,
} from "@workspace/db";
import { and, desc, eq, gt, isNull, sql } from "drizzle-orm";
import { DecideCmsEditorialAssistantRunBody, RunCmsEditorialAssistantBody } from "@workspace/api-zod";
import { isMarketAssigned } from "../lib/cms/workflow";
import { principalForRequest, requireSameOrigin } from "../lib/cms/auth";
import {
  ASSISTANT_POLICY_VERSION, PROMPT_TEMPLATE_VERSION, AssistantFailure,
  OpenAiCompatibleProvider, assistantEnabled, assistantLimits, buildGroundedPrompt,
  digest, estimatedProviderCostMicros, operationEnabled, parseAssistantInput, redact,
  restrictedReason, validateOutput, assistantDecisionGuard, type ApprovedSource, type AssistantInput,
} from "../lib/cms/editorial-assistant";
import { applyAssistantDecision, setValue, valueAt } from "../lib/cms/assistant-decision";
import { copyRevisionMediaReferences } from "../lib/cms/revision-media";

const router: IRouter = Router();
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const asText = (value: unknown) => typeof value === "string" ? value : undefined;

function payloadContent(payload: Record<string, unknown>): Record<string, unknown> | undefined {
  return record(payload.content) ? payload.content : undefined;
}


async function loadTarget(input: AssistantInput) {
  const rows = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable, revision: cmsRevisionsTable })
    .from(cmsMarketEditionsTable)
    .innerJoin(cmsDocumentsTable, eq(cmsDocumentsTable.id, cmsMarketEditionsTable.documentId))
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.draftRevisionId))
    .where(and(eq(cmsMarketEditionsTable.documentId, input.subjectId), eq(cmsMarketEditionsTable.market, input.market)))
    .limit(1);
  const target = rows[0];
  if (!target || target.edition.publicationState !== "draft" || target.revision.id !== input.target.revisionId ||
    target.document.kind !== input.target.contentType || target.document.contentClass !== input.contentClass) {
    throw new AssistantFailure("target_revision_mismatch");
  }
  const content = payloadContent(target.revision.payload);
  if (!content || valueAt(content, input.target.fieldPath) !== input.draft) throw new AssistantFailure("target_revision_mismatch");
  if (input.target.fieldPath.startsWith("marketEditions[") && !valueAt(content, input.target.fieldPath)) {
    throw new AssistantFailure("target_market_mismatch");
  }
  return { ...target, content };
}

async function approvedSources(ids: string[], market: string, contentClass: string): Promise<ApprovedSource[]> {
  const rows = await db.select({ document: cmsDocumentsTable, edition: cmsMarketEditionsTable, revision: cmsRevisionsTable })
    .from(cmsDocumentsTable).innerJoin(cmsMarketEditionsTable, eq(cmsMarketEditionsTable.documentId, cmsDocumentsTable.id))
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.draftRevisionId))
    .where(and(eq(cmsDocumentsTable.kind, "approvedSource"), eq(cmsMarketEditionsTable.market, market)));
  const sources = new Map<string, ApprovedSource>();
  for (const row of rows) {
    const content = payloadContent(row.revision.payload);
    if (!content || content.approvalStatus !== "approved" || row.document.contentClass !== contentClass) continue;
    const title = asText(content.title); const source = asText(content.content);
    const markets = Array.isArray(content.marketsApproved) ? content.marketsApproved.filter((v): v is string => typeof v === "string") : [];
    const approvedAt = asText(content.approvedAt); const verifiedAt = asText(content.verifiedAt);
    const expiresAt = asText(content.expiresAt); const now = Date.now();
    if (!title || !source || !approvedAt || !verifiedAt || !markets.includes(market) || Date.parse(approvedAt) > now ||
      Date.parse(verifiedAt) > now || (expiresAt && Date.parse(expiresAt) <= now)) continue;
    sources.set(row.document.id, { id: row.document.id, revision: row.revision.id, title, content: source, approvedAt, verifiedAt, expiresAt, markets, contentClass: row.document.contentClass as "public" | "internal" });
  }
  if (ids.some((id) => !sources.has(id))) throw new AssistantFailure("source_not_approved");
  return ids.map((id) => sources.get(id)!);
}

function publicFailure(code: string) {
  const mapped: Record<string, [number, string]> = {
    restricted_content: [422, "Request contains restricted content"], sensitive_output: [422, "Provider output contained sensitive or restricted content"],
    source_not_approved: [422, "Every source must be current and approved"], source_market_mismatch: [422, "Approved sources do not cover the requested market"],
    source_classification_mismatch: [422, "Approved sources do not match the requested content classification"], source_budget_exceeded: [422, "Approved source material exceeds the bounded request budget"],
    target_market_mismatch: [422, "Target field does not belong to the requested market"], target_revision_mismatch: [409, "Target field or revision changed before assistance could run"],
    quality_gate_failed: [422, "Editorial assistant output failed deterministic quality gates"], duplicate_request: [409, "Request ID was already used"],
    resulting_revision_mismatch: [409, "Resulting CMS revision could not be verified"],
    self_decision: [409, "Separation of duties prevents deciding your own assistant run"],
    stale_target: [409, "Target draft changed before this suggestion could be accepted"],
  };
  const item = mapped[code] ?? (["rate_limit", "cost_limit", "provider_rate_limited"].includes(code) ? [429, "Editorial assistant limit reached"] : [503, "Editorial assistant failed safely; no content was changed"]);
  return { status: item[0], message: item[1] };
}

async function fail(input: AssistantInput, actor: string, code: string) {
  await db.update(cmsAssistantRunsTable).set({ status: "failed", failureCode: code, completedAt: new Date() })
    .where(eq(cmsAssistantRunsTable.requestId, input.requestId));
}

router.post("/cms/editorial-assistant/runs", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) {
    if (!res.headersSent) res.status(403).json({ error: "Cross-origin CMS mutation rejected" });
    return;
  }
  const principal = await principalForRequest(req);
  const parsed = RunCmsEditorialAssistantBody.safeParse(req.body);
  const input = parsed.success ? parseAssistantInput(req.body) : undefined;
  if (!principal) { res.status(401).json({ error: "CMS workflow authorization required" }); return; }
  if (!input) { res.status(400).json({ error: "Editorial assistant input is invalid" }); return; }
  if (!isMarketAssigned(principal, input.market)) { res.status(403).json({ error: "Workflow principal is not assigned to this market" }); return; }
  if (!assistantEnabled() || !operationEnabled(input.operation)) { res.status(503).json({ error: "Editorial assistant is disabled" }); return; }
  const redactedDraft = redact(input.draft); const redactedInstructions = redact(input.instructions ?? "");
  const inputDigest = digest(JSON.stringify({ ...input, draft: redactedDraft.text, instructions: redactedInstructions.text }));
  try {
    const existing = await db.select().from(cmsAssistantRunsTable).where(eq(cmsAssistantRunsTable.requestId, input.requestId)).limit(1);
    if (existing.length) { res.status(existing[0]!.actor === principal.id && existing[0]!.inputDigest === inputDigest && existing[0]!.status === "completed" ? 200 : 409).json(existing[0]!.result ?? { error: "Request ID was already used" }); return; }
    if (restrictedReason(`${input.draft}\n${input.instructions ?? ""}`)) throw new AssistantFailure("restricted_content");
    const target = await loadTarget(input);
    const sources = await approvedSources(input.sourceIds, input.market, input.contentClass);
    if (sources.reduce((n, source) => n + source.content.length, 0) > assistantLimits.maxSourceChars()) throw new AssistantFailure("source_budget_exceeded");
    if (sources.some((source) => restrictedReason(`${source.title}\n${source.content}`))) throw new AssistantFailure("restricted_content");
    await db.insert(cmsAssistantRunsTable).values({ requestId: input.requestId, actor: principal.id, market: input.market, subjectId: input.subjectId, operation: input.operation, targetContext: { ...input.target, contentClass: input.contentClass }, status: "running", policyVersion: ASSISTANT_POLICY_VERSION, promptTemplateVersion: PROMPT_TEMPLATE_VERSION, inputDigest, sourceProvenance: sources.map((source) => ({ id: source.id, revision: source.revision, approvedAt: source.approvedAt })), redactions: { draft: redactedDraft.findings, instructions: redactedInstructions.findings }, estimatedCostMicros: 0 });
    const prompt = buildGroundedPrompt({ ...input, instructions: redactedInstructions.text }, redactedDraft.text, sources.map((source) => ({ ...source, title: redact(source.title).text, content: redact(source.content).text })));
    const started = Date.now();
    const provider = await new OpenAiCompatibleProvider().generate(prompt, assistantLimits.timeoutMs(), input.target.maxLength);
    const output = validateOutput(provider.value, redactedDraft.text, sources, input.target, input.operation);
    await db.update(cmsAssistantRunsTable).set({ status: "completed", provider: provider.provider, model: provider.model, result: output, promptTokens: provider.promptTokens, completionTokens: provider.completionTokens, estimatedCostMicros: estimatedProviderCostMicros(provider.promptTokens, provider.completionTokens), latencyMs: Date.now() - started, completedAt: new Date() }).where(eq(cmsAssistantRunsTable.requestId, input.requestId));
    await db.insert(cmsWorkflowEventsTable).values({ action: "assistant_run", actor: principal.id, target: `${target.document.kind}:${input.subjectId}`, market: input.market, outcome: "completed", metadata: { requestId: input.requestId, revisionId: target.revision.id, sourceIds: sources.map((source) => source.id).join(",") } });
    res.status(201).json(output);
  } catch (error) {
    const code = error instanceof AssistantFailure ? error.code : "internal_failure";
    await fail(input, principal.id, code).catch(() => undefined);
    req.log.warn({ requestId: input.requestId, failureCode: code }, "Editorial assistant request failed safely");
    const failure = publicFailure(code); res.status(failure.status).json({ error: failure.message, code });
  }
});

router.post("/cms/editorial-assistant/decisions", async (req, res): Promise<void> => {
  if (!requireSameOrigin(req, res)) {
    if (!res.headersSent) res.status(403).json({ error: "Cross-origin CMS mutation rejected" });
    return;
  }
  const principal = await principalForRequest(req);
  const parsed = DecideCmsEditorialAssistantRunBody.safeParse(req.body);
  const value = record(req.body) ? req.body : {};
  const requestId = asText(value.requestId); const decision = value.decision === "accepted" || value.decision === "rejected" ? value.decision : undefined;
  const reason = asText(value.reason); const expectedRevision = asText(value.expectedRevisionId);
  if (!principal) { res.status(401).json({ error: "Reviewer workflow authorization required" }); return; }
  if (!["reviewer", "publisher", "admin"].includes(principal.role)) { res.status(403).json({ error: "Reviewer role is required" }); return; }
  if (!parsed.success || !requestId || !decision || !reason || (decision === "accepted" && !expectedRevision)) { res.status(400).json({ error: "Editorial decision input is invalid" }); return; }
  try {
    const [run] = await db.select().from(cmsAssistantRunsTable).where(eq(cmsAssistantRunsTable.requestId, requestId)).limit(1);
    if (!run || run.status !== "completed") throw new AssistantFailure("resulting_revision_mismatch");
    const actorGuard = assistantDecisionGuard(run.actor, principal.id, run.targetContext.revisionId, run.targetContext.revisionId, expectedRevision ?? run.targetContext.revisionId);
    if (actorGuard === "self_decision") { res.status(409).json({ error: "Separation of duties prevents deciding your own assistant run" }); return; }
    if (!isMarketAssigned(principal, run.market as Parameters<typeof isMarketAssigned>[1])) { res.status(403).json({ error: "Workflow principal is not assigned to this market" }); return; }
    const existing = await db.select().from(cmsAssistantDecisionsTable).where(eq(cmsAssistantDecisionsTable.requestId, requestId)).limit(1);
    if (existing.length) { res.status(409).json({ error: "Assistant run already has a decision" }); return; }
    let resultingRevisionId: string | null = null; let wasEdited = false;
    await db.transaction(async (tx) => {
      if (decision === "accepted") {
        const target = run.targetContext;
        const suggestion = record(run.result) ? asText(run.result.suggestion) : undefined;
        const editionRows = await tx.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, run.subjectId), eq(cmsMarketEditionsTable.market, run.market))).limit(1);
        const edition = editionRows[0];
        if (!edition || !edition.draftRevisionId || edition.publicationState !== "draft" || !suggestion) throw new AssistantFailure("resulting_revision_mismatch");
        const [current] = await tx.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition.draftRevisionId)).limit(1);
        const content = current && payloadContent(current.payload);
        if (!current || !content) throw new AssistantFailure("resulting_revision_mismatch");
        const applied = applyAssistantDecision(run.actor, principal.id, edition.draftRevisionId, target.revisionId, expectedRevision, "accepted", content, target.fieldPath, suggestion);
        const updated = applied.content!;
        wasEdited = applied.wasEdited;
        const payload = { ...current.payload, content: updated };
        const [next] = await tx.insert(cmsRevisionsTable).values({ editionId: edition.id, revisionNumber: current.revisionNumber + 1, payloadVersion: current.payloadVersion, payload, contentDigest: digest(JSON.stringify(payload)), createdByPrincipalId: principal.id, reason: `assistant:${requestId}` }).returning();
        const updatedEdition = await tx.update(cmsMarketEditionsTable)
          .set({ draftRevisionId: next!.id, version: edition.version + 1, lastEditorPrincipalId: principal.id })
          .where(and(
            eq(cmsMarketEditionsTable.id, edition.id),
            eq(cmsMarketEditionsTable.version, edition.version),
            eq(cmsMarketEditionsTable.draftRevisionId, current.id),
          ))
          .returning({ id: cmsMarketEditionsTable.id });
        if (!updatedEdition.length) throw new AssistantFailure("resulting_revision_mismatch");
        await copyRevisionMediaReferences(tx, current.id, next!.id, updated)
          .catch(() => { throw new AssistantFailure("resulting_revision_mismatch"); });
        resultingRevisionId = next!.id;
      }
      await tx.insert(cmsAssistantDecisionsTable).values({ requestId, subjectId: run.subjectId, market: run.market, actor: principal.id, decision, reason: redact(reason).text, resultingRevisionId, wasEdited, auditStatus: "confirmed" });
      await tx.insert(cmsWorkflowEventsTable).values({ action: "assistant_decision", actor: principal.id, target: `${run.subjectId}`, market: run.market, outcome: decision, metadata: { requestId, resultingRevisionId, wasEdited } });
    });
    res.status(201).json({ requestId, decision, resultingRevisionId, wasEdited });
  } catch (error) {
    const code = error instanceof AssistantFailure ? error.code : "internal_failure";
    req.log.warn({ requestId, failureCode: code }, "Editorial assistant decision failed safely");
    const failure = publicFailure(code); res.status(failure.status).json({ error: failure.message, code });
  }
});

router.get("/cms/editorial-assistant/runs/pending", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "Reviewer workflow authorization required" }); return; }
  if (!["reviewer", "publisher", "admin"].includes(principal.role)) { res.status(403).json({ error: "Reviewer role is required" }); return; }
  const rows = await db.select({ run: cmsAssistantRunsTable, decision: cmsAssistantDecisionsTable })
    .from(cmsAssistantRunsTable)
    .leftJoin(cmsAssistantDecisionsTable, eq(cmsAssistantDecisionsTable.requestId, cmsAssistantRunsTable.requestId))
    .where(and(
      eq(cmsAssistantRunsTable.status, "completed"),
      isNull(cmsAssistantDecisionsTable.requestId),
    ))
    .orderBy(desc(cmsAssistantRunsTable.completedAt))
    .limit(100);
  const runs = rows.filter(({ run }) => isMarketAssigned(principal, run.market as Parameters<typeof isMarketAssigned>[1]))
    .map(({ run }) => ({
      requestId: run.requestId, actor: run.actor, market: run.market, subjectId: run.subjectId,
      operation: run.operation, targetContext: {
        revisionId: run.targetContext.revisionId, fieldPath: run.targetContext.fieldPath,
        contentType: run.targetContext.contentType,
      },
      result: run.result, createdAt: run.createdAt, completedAt: run.completedAt,
      decided: false,
    }));
  res.json({ runs });
});

router.get("/cms/editorial-assistant/monitoring", async (req, res): Promise<void> => {
  const principal = await principalForRequest(req);
  if (!principal) { res.status(401).json({ error: "All-market administrator authorization required" }); return; }
  if (principal.role !== "admin" || principal.markets !== "all") { res.status(403).json({ error: "All-market administrator role is required" }); return; }
  const since = new Date(Date.now() - 86_400_000);
  const [runs, decisions] = await Promise.all([
    db.select({ total: sql<number>`count(*)::int`, failed: sql<number>`count(*) filter (where ${cmsAssistantRunsTable.status} = 'failed')::int`, spend: sql<number>`coalesce(sum(${cmsAssistantRunsTable.estimatedCostMicros}), 0)::int` }).from(cmsAssistantRunsTable).where(gt(cmsAssistantRunsTable.createdAt, since)),
    db.select({ accepted: sql<number>`count(*) filter (where ${cmsAssistantDecisionsTable.decision} = 'accepted')::int`, rejected: sql<number>`count(*) filter (where ${cmsAssistantDecisionsTable.decision} = 'rejected')::int` }).from(cmsAssistantDecisionsTable).where(gt(cmsAssistantDecisionsTable.createdAt, since)),
  ]);
  res.json({ windowHours: 24, runs: runs[0]?.total ?? 0, failures: runs[0]?.failed ?? 0, spendMicros: runs[0]?.spend ?? 0, decisions: { accepted: decisions[0]?.accepted ?? 0, rejected: decisions[0]?.rejected ?? 0 } });
});

export default router;