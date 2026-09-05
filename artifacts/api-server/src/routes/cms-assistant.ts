import { Router, type IRouter } from "express";
import {
  cmsAssistantDecisionsTable,
  cmsAssistantRunsTable,
  cmsWorkflowEventsTable,
  db,
} from "@workspace/db";
import { and, eq, gt, sql } from "drizzle-orm";
import {
  DecideCmsEditorialAssistantRunBody,
  RunCmsEditorialAssistantBody,
} from "@workspace/api-zod";
import { authenticateWorkflow, isMarketAssigned } from "../lib/cms/workflow";
import {
  ASSISTANT_POLICY_VERSION,
  PROMPT_TEMPLATE_VERSION,
  AssistantFailure,
  OpenAiCompatibleProvider,
  assistantEnabled,
  assistantLimits,
  buildGroundedPrompt,
  digest,
  estimatedProviderCostMicros,
  parseAssistantInput,
  operationEnabled,
  redact,
  restrictedReason,
  validateOutput,
  type ApprovedSource,
  type AssistantInput,
} from "../lib/cms/editorial-assistant";

const router: IRouter = Router();
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function sanityConfig() {
  const projectId = process.env.SANITY_PROJECT_ID;
  const dataset = process.env.SANITY_DATASET;
  const token = process.env.SANITY_API_TOKEN;
  if (!projectId || !dataset || !token || !/^[a-z0-9-]+$/.test(projectId) ||
    !/^[A-Za-z0-9_-]+$/.test(dataset)) throw new AssistantFailure("source_store_unconfigured");
  return { projectId, dataset, token };
}
async function approvedSources(ids: string[]): Promise<ApprovedSource[]> {
  const config = sanityConfig();
  const query = `*[_type == "approvedSource" && _id in $ids && approvalStatus == "approved"]{
    _id, _rev, title, content, approvalStatus, approvedAt, expiresAt,
    "markets": marketsApproved[]->code, verifiedAt,
    "reviewDueAt": ownership.reviewDueAt, contentClass
  }`;
  const search = new URLSearchParams({ query, perspective: "published", "$ids": JSON.stringify(ids) });
  const response = await fetch(
    `https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${encodeURIComponent(config.dataset)}?${search}`,
    { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(8_000) },
  );
  if (!response.ok) throw new AssistantFailure("source_store_unavailable");
  const body = await response.json() as unknown;
  if (!record(body) || !Array.isArray(body.result)) throw new AssistantFailure("source_store_invalid_response");
  const now = Date.now();
  const sources = body.result.flatMap((item): ApprovedSource[] => {
    const approvedAt = record(item) && typeof item.approvedAt === "string" ? Date.parse(item.approvedAt) : NaN;
    const verifiedAt = record(item) && typeof item.verifiedAt === "string" ? Date.parse(item.verifiedAt) : NaN;
    const reviewDueAt = record(item) && typeof item.reviewDueAt === "string" ? Date.parse(item.reviewDueAt) : NaN;
    const expiresAt = record(item) && typeof item.expiresAt === "string" ? Date.parse(item.expiresAt) : undefined;
    if (!record(item) || typeof item._id !== "string" || typeof item._rev !== "string" ||
      typeof item.title !== "string" || typeof item.content !== "string" ||
      typeof item.approvedAt !== "string" || typeof item.verifiedAt !== "string" ||
      typeof item.reviewDueAt !== "string" ||
      (item.contentClass !== "public" && item.contentClass !== "internal") ||
      !Array.isArray(item.markets) || item.markets.some((market) => typeof market !== "string") ||
      !Number.isFinite(approvedAt) || approvedAt > now ||
      !Number.isFinite(verifiedAt) || verifiedAt > now ||
      !Number.isFinite(reviewDueAt) || reviewDueAt <= now ||
      (expiresAt !== undefined && (!Number.isFinite(expiresAt) || expiresAt <= now))) return [];
    return [{
      id: item._id, revision: item._rev, title: item.title, content: item.content,
      approvedAt: item.approvedAt,
      markets: item.markets as string[],
      verifiedAt: item.verifiedAt,
      reviewDueAt: item.reviewDueAt,
      contentClass: item.contentClass,
      ...(typeof item.expiresAt === "string" ? { expiresAt: item.expiresAt } : {}),
    }];
  });
  const returned = new Set(sources.map((source) => source.id));
  if (ids.some((id) => !returned.has(id))) throw new AssistantFailure("source_not_approved");
  return ids.map((id) => sources.find((source) => source.id === id)!);
}

async function validateApprovedTarget(input: AssistantInput): Promise<void> {
  const config = sanityConfig();
  const query = `coalesce(
    *[_id == "drafts." + $id][0],
    *[_id == $id][0]
  ){
    ...,
    "assistantMarkets": marketsApproved[]->code,
    "assistantEditions": marketEditions[]{_key, "market": market->code}
  }`;
  const search = new URLSearchParams({
    query,
    perspective: "drafts",
    "$id": JSON.stringify(input.subjectId),
  });
  const response = await fetch(
    `https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${encodeURIComponent(config.dataset)}?${search}`,
    { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(8_000) },
  );
  const body = response.ok ? await response.json() as unknown : undefined;
  if (!record(body) || !record(body.result)) throw new AssistantFailure("target_unavailable");
  const target = body.result;
  if (target._type !== input.target.contentType ||
    target._rev !== input.target.revisionId) throw new AssistantFailure("target_revision_mismatch");
  if (target.assistantContentClass !== input.contentClass ||
    !["public", "internal"].includes(String(target.assistantContentClass))) {
    throw new AssistantFailure("target_classification_mismatch");
  }
  const currentValue = targetValue(target, input.target.fieldPath);
  if (currentValue === undefined || currentValue !== input.draft) {
    throw new AssistantFailure("target_revision_mismatch");
  }
  const editionMatch = /^marketEditions\[_key=="([^"]+)"\]\./.exec(input.target.fieldPath);
  if (editionMatch) {
    const editions = Array.isArray(target.assistantEditions)
      ? target.assistantEditions.filter(record)
      : [];
    if (!editions.some((edition) =>
      edition._key === editionMatch[1] && edition.market === input.market)) {
      throw new AssistantFailure("target_market_mismatch");
    }
  } else {
    const markets = Array.isArray(target.assistantMarkets)
      ? target.assistantMarkets.filter((market): market is string => typeof market === "string")
      : [];
    if (markets.length ? !markets.includes(input.market) : input.market !== "uae") {
      throw new AssistantFailure("target_market_mismatch");
    }
  }
}
async function internalLinksExist(suggestion: string): Promise<boolean> {
  const paths = [...suggestion.matchAll(/\[[^\]]+\]\(([^)\s?#]*)\)/g)].map((match) => match[1]!);
  if (!paths.length || paths.some((path) => !/^\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(path))) return false;
  const config = sanityConfig();
  const search = new URLSearchParams({
    query: `*[_type == "page" && defined(slug.current)]{"path": "/" + slug.current}`,
    perspective: "published",
  });
  const response = await fetch(
    `https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${encodeURIComponent(config.dataset)}?${search}`,
    { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(8_000) },
  );
  const body = response.ok ? await response.json() as unknown : undefined;
  if (!record(body) || !Array.isArray(body.result)) throw new AssistantFailure("source_store_unavailable");
  const valid = new Set(body.result.filter((path): path is string => typeof path === "string"));
  return paths.every((path) => valid.has(path));
}

function targetValue(document: Record<string, unknown>, fieldPath: string): string | undefined {
  const editionMatch = /^marketEditions\[_key=="([^"]+)"\]\.([A-Za-z]+)$/.exec(fieldPath);
  if (editionMatch && Array.isArray(document.marketEditions)) {
    const edition = document.marketEditions.find((item) =>
      record(item) && item._key === editionMatch[1]);
    return record(edition) && typeof edition[editionMatch[2]!] === "string"
      ? edition[editionMatch[2]!] as string
      : undefined;
  }
  let value: unknown = document;
  for (const part of fieldPath.split(".")) {
    if (!record(value)) return;
    value = value[part];
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value) && value.every(record)) {
    return value.flatMap((block) => {
      const children = block.children;
      return Array.isArray(children)
        ? children.map((child) =>
          record(child) && typeof child.text === "string" ? child.text : "").join("")
        : [];
    }).join("\n");
  }
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value.join(", ")
    : undefined;
}

async function verifyDecisionRevision(
  subjectId: string,
  requestId: string,
  decision: "accepted" | "rejected",
  fieldPath: string,
  suggestion: string,
  revisionId?: string,
): Promise<boolean> {
  if (decision === "rejected") return false;
  const config = sanityConfig();
  const search = new URLSearchParams({
    query: `*[_id == "drafts." + $id][0]`,
    perspective: "drafts", "$id": JSON.stringify(subjectId),
  });
  const check = await fetch(
    `https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${encodeURIComponent(config.dataset)}?${search}`,
    { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(8_000) },
  );
  const body = check.ok ? await check.json() as unknown : undefined;
  if (!record(body) || !record(body.result) || body.result._rev !== revisionId ||
    !record(body.result.assistantReview) ||
    body.result.assistantReview.requestId !== requestId ||
    body.result.assistantReview.fieldPath !== fieldPath) {
    throw new AssistantFailure("resulting_revision_mismatch");
  }
  const acceptedValue = targetValue(body.result, fieldPath);
  if (acceptedValue === undefined) throw new AssistantFailure("resulting_revision_mismatch");
  return acceptedValue !== suggestion;
}

async function sanityDecisionAuditExists(requestId: string): Promise<boolean> {
  const config = sanityConfig();
  const search = new URLSearchParams({
    query: `defined(*[_id == $id][0])`,
    perspective: "published",
    "$id": JSON.stringify(`auditEvent.assistant.${requestId}`),
  });
  const response = await fetch(
    `https://${config.projectId}.api.sanity.io/v2025-02-19/data/query/${encodeURIComponent(config.dataset)}?${search}`,
    { headers: { Authorization: `Bearer ${config.token}` }, signal: AbortSignal.timeout(8_000) },
  );
  const body = response.ok ? await response.json() as unknown : undefined;
  if (!record(body) || typeof body.result !== "boolean") {
    throw new AssistantFailure("source_store_unavailable");
  }
  return body.result;
}

async function recordSanityDecisionAudit(input: {
  subjectId: string;
  requestId: string;
  actor: string;
  decision: "accepted" | "rejected";
  fieldPath: string;
  revisionId?: string;
  wasEdited: boolean;
}): Promise<void> {
  const { subjectId, requestId, actor, decision, fieldPath, revisionId, wasEdited } = input;
  const config = sanityConfig();
  const mutations: Array<Record<string, unknown>> = [{
    createIfNotExists: {
      _id: `auditEvent.assistant.${requestId}`, _type: "auditEvent",
      eventId: `assistant.${requestId}`, occurredAt: new Date().toISOString(),
      actorId: actor, action: `assistant_${decision}`, subjectId,
      metadata: JSON.stringify({
        requestId, resultingRevisionId: revisionId ?? null, fieldPath, wasEdited,
      }),
    },
  }];
  if (decision === "accepted") {
    mutations.push({
      patch: {
        id: `drafts.${subjectId}`,
        ifRevisionID: revisionId,
        unset: ["assistantReview"],
      },
    });
  }
  const response = await fetch(
    `https://${config.projectId}.api.sanity.io/v2025-02-19/data/mutate/${encodeURIComponent(config.dataset)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${config.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: `assistant-decision-${requestId}`,
        mutations,
      }),
      signal: AbortSignal.timeout(10_000),
    },
  );
  if (!response.ok) throw new AssistantFailure("source_store_unavailable");
}

function publicFailure(code: string): { status: number; message: string } {
  if (code === "restricted_content") return { status: 422, message: "Request contains restricted content" };
  if (code === "sensitive_output") return { status: 422, message: "Provider output contained sensitive or restricted content" };
  if (code === "source_not_approved") return { status: 422, message: "Every source must be current and approved" };
  if (code === "source_market_mismatch") return { status: 422, message: "Approved sources do not cover the requested market" };
  if (code === "source_classification_mismatch") return { status: 422, message: "Approved sources do not match the requested content classification" };
  if (code === "source_budget_exceeded") return { status: 422, message: "Approved source material exceeds the bounded request budget" };
  if (code === "target_classification_mismatch") return { status: 422, message: "Target content is not approved for this processing boundary" };
  if (code === "target_market_mismatch") return { status: 422, message: "Target field does not belong to the requested market" };
  if (code === "target_revision_mismatch") return { status: 409, message: "Target field or revision changed before assistance could run" };
  if (code === "quality_gate_failed") return { status: 422, message: "Editorial assistant output failed deterministic quality gates" };
  if (code === "rate_limit" || code === "cost_limit" || code === "provider_rate_limited") {
    return { status: 429, message: "Editorial assistant limit reached" };
  }
  if (code === "resulting_revision_mismatch") return { status: 409, message: "Resulting CMS revision could not be verified" };
  if (code === "duplicate_request") return { status: 409, message: "Request ID was already used" };
  return { status: 503, message: "Editorial assistant failed safely; no content was changed" };
}

async function recordFailedRun(
  input: NonNullable<ReturnType<typeof parseAssistantInput>>,
  actor: string,
  code: string,
): Promise<void> {
  const redactedDraft = redact(input.draft);
  const redactedInstructions = redact(input.instructions ?? "");
  const inputDigest = digest(JSON.stringify({
    ...input,
    draft: redactedDraft.text,
    instructions: redactedInstructions.text,
  }));
  await db.update(cmsAssistantRunsTable).set({
    status: "failed", failureCode: code, completedAt: new Date(),
  }).where(eq(cmsAssistantRunsTable.requestId, input.requestId));
  await db.insert(cmsAssistantRunsTable).values({
    requestId: input.requestId,
    actor,
    market: input.market,
    subjectId: input.subjectId,
    operation: input.operation,
    targetContext: { ...input.target, contentClass: input.contentClass },
    status: "failed",
    policyVersion: ASSISTANT_POLICY_VERSION,
    promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
    inputDigest,
    sourceProvenance: input.sourceIds.map((id) => ({ id })),
    redactions: { draft: redactedDraft.findings, instructions: redactedInstructions.findings },
    estimatedCostMicros: 0,
    failureCode: code,
    completedAt: new Date(),
  }).onConflictDoNothing();
}

router.post("/cms/editorial-assistant/runs", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  if (!principal) {
    res.status(401).json({ error: "CMS workflow authorization required" });
    return;
  }
  const contractInput = RunCmsEditorialAssistantBody.safeParse(req.body);
  const input = contractInput.success ? parseAssistantInput(req.body) : undefined;
  if (!input) {
    res.status(400).json({ error: "Editorial assistant input is invalid" });
    return;
  }
  if (!isMarketAssigned(principal, input.market)) {
    res.status(403).json({ error: "Workflow principal is not assigned to this market" });
    return;
  }
  if (!assistantEnabled()) {
    await recordFailedRun(input, principal.id, "assistant_disabled").catch(() => undefined);
    res.status(503).json({ error: "Editorial assistant is disabled" });
    return;
  }
  if (!operationEnabled(input.operation)) {
    await recordFailedRun(input, principal.id, "operation_disabled").catch(() => undefined);
    res.status(503).json({ error: "This editorial assistant operation is not enabled for rollout" });
    return;
  }
  const redactedDraft = redact(input.draft);
  const redactedInstructions = redact(input.instructions ?? "");
  const inputDigest = digest(JSON.stringify({
    ...input,
    draft: redactedDraft.text,
    instructions: redactedInstructions.text,
  }));
  const existing = await db.select({
    actor: cmsAssistantRunsTable.actor,
    inputDigest: cmsAssistantRunsTable.inputDigest,
    status: cmsAssistantRunsTable.status,
    result: cmsAssistantRunsTable.result,
  })
    .from(cmsAssistantRunsTable).where(eq(cmsAssistantRunsTable.requestId, input.requestId)).limit(1);
  if (existing.length) {
    const replayMatches = existing[0]!.actor === principal.id &&
      existing[0]!.inputDigest === inputDigest;
    res.status(replayMatches && existing[0]!.status === "completed" ? 200 : 409)
      .json(replayMatches && existing[0]!.status === "completed"
        ? existing[0]!.result
        : { error: "Request ID was already used for a different or incomplete action" });
    return;
  }

  const prohibited = restrictedReason(`${input.draft}\n${input.instructions ?? ""}`);
  const now = new Date();
  const hourAgo = new Date(now.getTime() - 60 * 60_000);
  const dayAgo = new Date(now.getTime() - 24 * 60 * 60_000);
  let providerStartedAt: number | undefined;
  try {
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"cms-assistant-request:" + input.requestId}))`);
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"cms-assistant:" + principal.id}))`);
      const raced = await tx.select({ requestId: cmsAssistantRunsTable.requestId })
        .from(cmsAssistantRunsTable)
        .where(eq(cmsAssistantRunsTable.requestId, input.requestId))
        .limit(1);
      if (raced.length) throw new AssistantFailure("duplicate_request");
      const [hourly] = await tx.select({ count: sql<number>`count(*)::int` }).from(cmsAssistantRunsTable)
        .where(and(eq(cmsAssistantRunsTable.actor, principal.id), gt(cmsAssistantRunsTable.createdAt, hourAgo)));
      if ((hourly?.count ?? 0) >= assistantLimits.hourlyRequests()) throw new AssistantFailure("rate_limit");
      await tx.insert(cmsAssistantRunsTable).values({
        requestId: input.requestId, actor: principal.id, market: input.market,
        subjectId: input.subjectId, operation: input.operation, status: "running",
        targetContext: { ...input.target, contentClass: input.contentClass },
        policyVersion: ASSISTANT_POLICY_VERSION, promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
        inputDigest,
        sourceProvenance: input.sourceIds.map((id) => ({ id })),
        redactions: { draft: redactedDraft.findings, instructions: redactedInstructions.findings },
        estimatedCostMicros: 0,
      });
    });
    if (prohibited) throw new AssistantFailure(prohibited);
    await validateApprovedTarget(input);
    const approved = await approvedSources(input.sourceIds);
    if (approved.reduce((total, source) => total + source.content.length, 0) >
      assistantLimits.maxSourceChars()) throw new AssistantFailure("source_budget_exceeded");
    const sourceRedactions = approved.map((source) => ({
      id: source.id,
      title: redact(source.title).findings,
      content: redact(source.content).findings,
    }));
    await db.update(cmsAssistantRunsTable).set({
      sourceProvenance: approved.map(({
        id, revision, approvedAt, expiresAt, verifiedAt, reviewDueAt, markets, contentClass,
      }) => ({
        id, revision, approvedAt, expiresAt: expiresAt ?? null,
        verifiedAt, reviewDueAt, markets, contentClass,
      })),
      redactions: {
        draft: redactedDraft.findings,
        instructions: redactedInstructions.findings,
        sources: sourceRedactions,
      },
    }).where(eq(cmsAssistantRunsTable.requestId, input.requestId));
    if (approved.some((source) => restrictedReason(`${source.title}\n${source.content}`))) {
      throw new AssistantFailure("restricted_content");
    }
    const providerSources = approved.map((source) => ({
      ...source,
      title: redact(source.title).text,
      content: redact(source.content).text,
    }));
    if (approved.some((source) =>
      source.contentClass === "internal" && input.contentClass === "public")) {
      throw new AssistantFailure("source_classification_mismatch");
    }
    if (approved.some((source) => {
      return !source.markets?.includes(input.market);
    })) throw new AssistantFailure("source_market_mismatch");
    const safeInput = { ...input, instructions: redactedInstructions.text };
    const prompt = buildGroundedPrompt(safeInput, redactedDraft.text, providerSources);
    const maximumOutputTokens = Math.min(8192, Math.max(256, Math.ceil(input.target.maxLength / 2)));
    const reservationMicros = estimatedProviderCostMicros(
      Buffer.byteLength(prompt, "utf8"),
      maximumOutputTokens,
    );
    await db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"cms-assistant-global-budget"}))`);
      const [daily] = await tx.select({
        cost: sql<number>`coalesce(sum(${cmsAssistantRunsTable.estimatedCostMicros}), 0)::int`,
      }).from(cmsAssistantRunsTable).where(gt(cmsAssistantRunsTable.createdAt, dayAgo));
      if ((daily?.cost ?? 0) + reservationMicros > assistantLimits.dailyCostMicros()) {
        throw new AssistantFailure("cost_limit");
      }
      await tx.update(cmsAssistantRunsTable)
        .set({ estimatedCostMicros: reservationMicros })
        .where(eq(cmsAssistantRunsTable.requestId, input.requestId));
    });
    providerStartedAt = Date.now();
    const providerResult = await new OpenAiCompatibleProvider().generate(
      prompt,
      assistantLimits.timeoutMs(),
      input.target.maxLength,
    );
    const output = validateOutput(
      providerResult.value,
      redactedDraft.text,
      approved,
      input.target,
      input.operation,
    );
    output.qualityGates.push(
      { gate: "source-freshness", passed: true, detail: "all sources current at request time" },
      { gate: "market-consistency", passed: true, detail: `all sources approved for ${input.market}` },
      { gate: "content-classification", passed: true, detail: `all sources allowed within the ${input.contentClass} processing boundary` },
    );
    if (input.operation === "internal-links") {
      const linksValid = await internalLinksExist(output.suggestion);
      output.qualityGates.push({
        gate: "internal-links",
        passed: linksValid,
        detail: linksValid ? "all suggested links resolve to published pages" : "missing or broken internal reference",
      });
      if (!linksValid) throw new AssistantFailure("quality_gate_failed");
    }
    const estimatedCostMicros = estimatedProviderCostMicros(
      providerResult.promptTokens,
      providerResult.completionTokens,
    );
    await db.transaction(async (tx) => {
      await tx.update(cmsAssistantRunsTable).set({
        status: "completed", provider: providerResult.provider, model: providerResult.model,
        promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
        sourceProvenance: approved.map(({
          id, revision, approvedAt, expiresAt, verifiedAt, reviewDueAt, markets, contentClass,
        }) => ({
          id, revision, approvedAt, expiresAt: expiresAt ?? null,
          verifiedAt, reviewDueAt, markets, contentClass,
        })),
        result: output, promptTokens: providerResult.promptTokens,
        completionTokens: providerResult.completionTokens, estimatedCostMicros,
        latencyMs: Date.now() - (providerStartedAt ?? Date.now()),
        completedAt: new Date(),
      }).where(eq(cmsAssistantRunsTable.requestId, input.requestId));
      await tx.insert(cmsWorkflowEventsTable).values({
        action: "assistant_run", actor: principal.id,
        target: `${input.target.contentType}:${input.subjectId}`,
        market: input.market, outcome: "completed",
        metadata: {
          requestId: input.requestId,
          purpose: input.operation,
          policyVersion: ASSISTANT_POLICY_VERSION,
          promptTemplateVersion: PROMPT_TEMPLATE_VERSION,
          provider: providerResult.provider,
          model: providerResult.model,
          sourceIds: approved.map((source) => source.id).join(","),
        },
      });
    });
    res.status(201).json(output);
  } catch (error) {
    const code = error instanceof AssistantFailure ? error.code :
      error instanceof Error && error.name === "TimeoutError" ? "provider_timeout" : "internal_failure";
    if (code !== "duplicate_request") {
      await recordFailedRun(input, principal.id, code).catch(() => undefined);
      if (providerStartedAt) {
        await db.update(cmsAssistantRunsTable).set({
          latencyMs: Date.now() - providerStartedAt,
        }).where(eq(cmsAssistantRunsTable.requestId, input.requestId)).catch(() => undefined);
      }
    }
    req.log.warn({ requestId: input.requestId, failureCode: code }, "Editorial assistant request failed safely");
    const failure = publicFailure(code);
    res.status(failure.status).json({ error: failure.message, code });
  }
});

router.post("/cms/editorial-assistant/decisions", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  if (!principal || !["reviewer", "publisher", "admin"].includes(principal.role)) {
    res.status(401).json({ error: "Reviewer workflow authorization required" });
    return;
  }
  const contractDecision = DecideCmsEditorialAssistantRunBody.safeParse(req.body);
  const value: Record<string, unknown> =
    contractDecision.success && record(req.body) ? req.body : {};
  const decisionKeys = new Set(["requestId", "decision", "reason", "resultingRevisionId"]);
  if (Object.keys(value).some((key) => !decisionKeys.has(key))) {
    res.status(400).json({ error: "Editorial decision input is invalid" });
    return;
  }
  const requestId = typeof value.requestId === "string" && /^[A-Za-z0-9_-]{8,120}$/.test(value.requestId) ? value.requestId : undefined;
  const decision = value.decision === "accepted" || value.decision === "rejected" ? value.decision : undefined;
  const reason = typeof value.reason === "string" && value.reason.length >= 3 && value.reason.length <= 1_000 ? value.reason : undefined;
  const revision = typeof value.resultingRevisionId === "string" && /^[A-Za-z0-9._-]{3,200}$/.test(value.resultingRevisionId)
    ? value.resultingRevisionId : undefined;
  if (!contractDecision.success || !requestId || !decision || !reason || (decision === "accepted" && !revision)) {
    res.status(400).json({ error: "Editorial decision input is invalid" });
    return;
  }
  const [run] = await db.select().from(cmsAssistantRunsTable)
    .where(eq(cmsAssistantRunsTable.requestId, requestId)).limit(1);
  if (!run || run.status !== "completed") {
    res.status(409).json({ error: "Only a completed assistant run can be decided" });
    return;
  }
  if (run.actor === principal.id) {
    res.status(409).json({ error: "Separation of duties prevents deciding your own assistant run" });
    return;
  }
  if (!isMarketAssigned(principal, run.market as Parameters<typeof isMarketAssigned>[1])) {
    res.status(403).json({ error: "Workflow principal is not assigned to this market" });
    return;
  }
  try {
    const runResult = record(run.result) && typeof run.result.suggestion === "string"
      ? run.result.suggestion
      : undefined;
    if (!runResult) throw new AssistantFailure("resulting_revision_mismatch");
    const redactedReason = redact(reason).text;
    const confirmDecision = async (wasEdited: boolean) => {
      await db.transaction(async (tx) => {
        await tx.update(cmsAssistantDecisionsTable).set({
          auditStatus: "confirmed",
          auditFailureCode: null,
        }).where(eq(cmsAssistantDecisionsTable.requestId, requestId));
        await tx.insert(cmsWorkflowEventsTable).values({
          action: "assistant_decision", actor: principal.id,
          target: `${run.targetContext.contentType}:${run.subjectId}`,
          market: run.market, outcome: decision,
          metadata: { requestId, resultingRevisionId: revision ?? null, wasEdited },
        });
      });
    };
    const [existingDecision] = await db.select()
      .from(cmsAssistantDecisionsTable)
      .where(eq(cmsAssistantDecisionsTable.requestId, requestId))
      .limit(1);
    if (existingDecision) {
      const replayMatches = existingDecision.actor === principal.id &&
        existingDecision.decision === decision &&
        existingDecision.reason === redactedReason &&
        existingDecision.resultingRevisionId === (revision ?? null);
      if (!replayMatches) {
        res.status(409).json({ error: "Assistant run already has a different decision" });
        return;
      }
      if (existingDecision.auditStatus !== "confirmed") {
        if (!(await sanityDecisionAuditExists(requestId))) {
          await recordSanityDecisionAudit({
            subjectId: run.subjectId,
            requestId,
            actor: principal.id,
            decision,
            fieldPath: run.targetContext.fieldPath,
            revisionId: revision,
            wasEdited: existingDecision.wasEdited,
          });
        }
        await confirmDecision(existingDecision.wasEdited);
      }
      res.status(200).json({
        requestId,
        decision,
        resultingRevisionId: revision ?? null,
        wasEdited: existingDecision.wasEdited,
      });
      return;
    }
    const wasEdited = await verifyDecisionRevision(
      run.subjectId,
      requestId,
      decision,
      run.targetContext.fieldPath,
      runResult,
      revision,
    );
    const inserted = await db.insert(cmsAssistantDecisionsTable).values({
      requestId,
      subjectId: run.subjectId,
      market: run.market,
      actor: principal.id,
      decision,
      reason: redactedReason,
      resultingRevisionId: revision,
      wasEdited,
      auditStatus: "pending",
    }).onConflictDoNothing().returning({ requestId: cmsAssistantDecisionsTable.requestId });
    if (!inserted.length) {
      res.status(409).json({ error: "Assistant decision is already being recorded" });
      return;
    }
    try {
      await recordSanityDecisionAudit({
        subjectId: run.subjectId,
        requestId,
        actor: principal.id,
        decision,
        fieldPath: run.targetContext.fieldPath,
        revisionId: revision,
        wasEdited,
      });
    } catch (error) {
      await db.update(cmsAssistantDecisionsTable).set({
        auditStatus: "audit_failed",
        auditFailureCode: error instanceof AssistantFailure ? error.code : "internal_failure",
      }).where(eq(cmsAssistantDecisionsTable.requestId, requestId));
      throw error;
    }
    await confirmDecision(wasEdited);
    res.status(201).json({ requestId, decision, resultingRevisionId: revision ?? null, wasEdited });
  } catch (error) {
    const code = error instanceof AssistantFailure ? error.code : "internal_failure";
    req.log.warn({ requestId, failureCode: code }, "Editorial assistant decision failed safely");
    const failure = publicFailure(code);
    res.status(failure.status).json({ error: failure.message, code });
  }
});

router.get("/cms/editorial-assistant/monitoring", async (req, res): Promise<void> => {
  const principal = authenticateWorkflow(req.headers.authorization);
  if (!principal || principal.role !== "admin" || principal.markets !== "all") {
    res.status(401).json({ error: "All-market administrator authorization required" });
    return;
  }
  try {
    const since = new Date(Date.now() - 24 * 60 * 60_000);
    const [runs, decisions] = await Promise.all([
      db.select({
        total: sql<number>`count(*)::int`,
        failed: sql<number>`count(*) filter (where ${cmsAssistantRunsTable.status} = 'failed')::int`,
        spendMicros: sql<number>`coalesce(sum(${cmsAssistantRunsTable.estimatedCostMicros}), 0)::int`,
        averageLatencyMs: sql<number | null>`avg(${cmsAssistantRunsTable.latencyMs})::int`,
      }).from(cmsAssistantRunsTable).where(gt(cmsAssistantRunsTable.createdAt, since)),
      db.select({
        accepted: sql<number>`count(*) filter (where ${cmsAssistantDecisionsTable.decision} = 'accepted')::int`,
        rejected: sql<number>`count(*) filter (where ${cmsAssistantDecisionsTable.decision} = 'rejected')::int`,
        editedAccepted: sql<number>`count(*) filter (
          where ${cmsAssistantDecisionsTable.decision} = 'accepted'
          and ${cmsAssistantDecisionsTable.wasEdited} = true
        )::int`,
        pendingAudit: sql<number>`count(*) filter (
          where ${cmsAssistantDecisionsTable.auditStatus} <> 'confirmed'
        )::int`,
      }).from(cmsAssistantDecisionsTable).where(gt(cmsAssistantDecisionsTable.createdAt, since)),
    ]);
    res.json({
      windowHours: 24, runs: runs[0]?.total ?? 0, failures: runs[0]?.failed ?? 0,
      spendMicros: runs[0]?.spendMicros ?? 0, averageLatencyMs: runs[0]?.averageLatencyMs ?? null,
       decisions: {
         accepted: decisions[0]?.accepted ?? 0,
         rejected: decisions[0]?.rejected ?? 0,
         editedAccepted: decisions[0]?.editedAccepted ?? 0,
         pendingAudit: decisions[0]?.pendingAudit ?? 0,
       },
    });
  } catch (error) {
    req.log.error({ error: error instanceof Error ? error.message : "unknown" }, "Assistant monitoring unavailable");
    res.status(503).json({ error: "Editorial assistant monitoring is unavailable" });
  }
});

export default router;