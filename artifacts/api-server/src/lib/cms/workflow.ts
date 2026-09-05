import { constantTimeEqual, parseMarket, type CmsMarket } from "./security";

export const editorialRoles = ["author", "regionalEditor", "reviewer", "publisher", "admin"] as const;
export type EditorialRole = typeof editorialRoles[number];
export const editionStates = ["draft", "review", "approved", "scheduled", "published", "expired", "archived"] as const;
export type EditionState = typeof editionStates[number];
const transitions: Record<EditorialRole, ReadonlySet<string>> = {
  author: new Set(["draft:review"]),
  regionalEditor: new Set(["draft:review"]),
  reviewer: new Set(["review:approved"]),
  publisher: new Set(["approved:scheduled", "approved:published", "scheduled:published", "published:expired", "expired:archived"]),
  admin: new Set(["*"]),
};
export function canTransition(role: EditorialRole, from: EditionState, to: EditionState): boolean {
  return transitions[role].has("*") || transitions[role].has(`${from}:${to}`);
}

export interface WorkflowPrincipal { id: string; role: EditorialRole; markets: readonly CmsMarket[] | "all"; }
export function authenticateWorkflow(header: string | undefined): WorkflowPrincipal | undefined {
  if (!header?.startsWith("Bearer ")) return undefined;
  let values: unknown;
  try { values = JSON.parse(process.env.CMS_WORKFLOW_CREDENTIALS ?? "[]"); } catch { return undefined; }
  if (!Array.isArray(values)) return undefined;
  const supplied = header.slice(7);
  for (const item of values) {
    if (!record(item)) continue;
    const role = item.role as EditorialRole;
    const markets = Array.isArray(item.markets)
      ? item.markets.map(parseMarket).filter((market): market is CmsMarket => Boolean(market))
      : role === "admin" && item.markets === "all" ? "all" : undefined;
    if (typeof item.id === "string" && typeof item.key === "string" && item.key.length >= 32 &&
      editorialRoles.includes(role) && markets && (markets === "all" || markets.length > 0) &&
      constantTimeEqual(supplied, item.key)) {
      return { id: item.id, role, markets };
    }
  }
  return undefined;
}
export function isMarketAssigned(principal: WorkflowPrincipal, market: CmsMarket): boolean {
  return principal.markets === "all" || principal.markets.includes(market);
}
export function violatesSeparationOfDuties(
  principal: WorkflowPrincipal,
  edition: Record<string, unknown>,
  toState: EditionState,
): boolean {
  if (!["approved", "published"].includes(toState) || !["reviewer", "publisher", "admin"].includes(principal.role)) return false;
  return edition.lastEditorActor === principal.id || edition.lastRequesterActor === principal.id;
}

const CURRENT_QUERY = `(select(
  $preferPublished => *[_type == "page" && _id == $id][0],
  coalesce(*[_type == "page" && _id == "drafts." + $id][0], *[_type == "page" && _id == $id][0])
)){
  ..., "resolvedMarkets": marketEditions[]{
    _key, "code": market->code, publicationState, fallbackMode, title,
    approvedBy, approvedAt, publishAt, expiresAt,
    lastEditorActor, lastRequesterActor, lastApprovalActor
  }
}`;
const REVISION_QUERY = `*[_type == "revisionRecord" && subjectId == $id && revisionId == $revisionId][0]{snapshot, reason}`;
const DUE_QUERY = `*[_type == "page" && count(marketEditions[
  (publicationState == "scheduled" && defined(publishAt) && publishAt <= $now) ||
  (publicationState == "published" && defined(expiresAt) && expiresAt <= $now)
]) > 0]{
  _id, marketEditions[]{_key, "market": market->code, publicationState, publishAt, expiresAt}
}`;
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function config() {
  const projectId = process.env.SANITY_PROJECT_ID, dataset = process.env.SANITY_DATASET, token = process.env.SANITY_API_TOKEN;
  if (!projectId || !dataset || !token) throw new Error("Trusted CMS workflow is not configured");
  if (!/^[a-z0-9-]+$/.test(projectId) || !/^[a-zA-Z0-9_-]+$/.test(dataset)) throw new Error("Invalid CMS configuration");
  return { projectId, dataset, token };
}
async function query(queryText: string, params: Record<string, unknown>): Promise<unknown> {
  const cms = config();
  const search = new URLSearchParams({ query: queryText, perspective: "drafts" });
  for (const [key, value] of Object.entries(params)) search.set(`$${key}`, JSON.stringify(value));
  const response = await fetch(`https://${cms.projectId}.api.sanity.io/v2025-02-19/data/query/${encodeURIComponent(cms.dataset)}?${search}`, {
    headers: { Authorization: `Bearer ${cms.token}` }, signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) throw new Error(`CMS workflow query failed with status ${response.status}`);
  const body = await response.json() as unknown;
  if (!record(body) || !("result" in body)) throw new Error("CMS workflow query response is invalid");
  return body.result;
}
async function mutate(mutations: readonly Record<string, unknown>[], transactionId: string) {
  const cms = config();
  const response = await fetch(`https://${cms.projectId}.api.sanity.io/v2025-02-19/data/mutate/${encodeURIComponent(cms.dataset)}`, {
    method: "POST", headers: { Authorization: `Bearer ${cms.token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ mutations, transactionId }), signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`CMS workflow mutation failed with status ${response.status}`);
}
function validId(value: unknown, subject = false): string | undefined {
  const pattern = subject ? /^[A-Za-z0-9._-]{3,200}$/ : /^[A-Za-z0-9_-]{8,120}$/;
  return typeof value === "string" && pattern.test(value) && !value.startsWith("drafts.") ? value : undefined;
}
function state(value: unknown): EditionState | undefined {
  return typeof value === "string" && editionStates.includes(value as EditionState) ? value as EditionState : undefined;
}
export interface TransitionInput {
  requestId: string; subjectId: string; market: CmsMarket; toState: EditionState;
  publishAt?: string; expiresAt?: string;
}
export function parseTransitionInput(value: unknown): TransitionInput | undefined {
  if (!record(value)) return undefined;
  const allowed = new Set(["requestId", "subjectId", "market", "toState", "publishAt", "expiresAt"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) return undefined;
  const requestId = validId(value.requestId), subjectId = validId(value.subjectId, true);
  const market = parseMarket(value.market), toState = state(value.toState);
  const publishAt = typeof value.publishAt === "string" && Number.isFinite(Date.parse(value.publishAt)) ? value.publishAt : undefined;
  const expiresAt = typeof value.expiresAt === "string" && Number.isFinite(Date.parse(value.expiresAt)) ? value.expiresAt : undefined;
  if (!requestId || !subjectId || !market || !toState) return undefined;
  return { requestId, subjectId, market, toState, ...(publishAt ? { publishAt } : {}), ...(expiresAt ? { expiresAt } : {}) };
}
function publishableSnapshot(raw: Record<string, unknown>, id: string) {
  const copy = structuredClone(raw);
  delete copy._rev; delete copy._createdAt; delete copy._updatedAt; delete copy.resolvedMarkets;
  copy._id = id;
  return copy;
}
function governanceRecords(input: TransitionInput, principal: WorkflowPrincipal, from: EditionState, raw: Record<string, unknown>, now: string) {
  return [
    { createIfNotExists: { _id: `revisionRecord.${input.requestId}`, _type: "revisionRecord", subjectId: input.subjectId, revisionId: input.requestId, snapshot: JSON.stringify(raw), createdAt: now, createdBy: principal.id, reason: `${from}:${input.toState}` } },
    { createIfNotExists: { _id: `auditEvent.${input.requestId}`, _type: "auditEvent", eventId: input.requestId, occurredAt: now, actorId: principal.id, action: "workflow_transition", subjectId: input.subjectId, marketCode: input.market, fromState: from, toState: input.toState, metadata: "{}" } },
  ];
}
export function publishWithDraftSynchronization(
  records: readonly Record<string, unknown>[],
  published: Record<string, unknown>,
  draft: Record<string, unknown>,
  targetKey: string,
): readonly Record<string, unknown>[] {
  const mutations: Record<string, unknown>[] = [...records, { createOrReplace: published }];
  if (
    typeof draft._id === "string" &&
    draft._id.startsWith("drafts.") &&
    typeof draft._rev === "string"
  ) {
    const targetPath = `marketEditions[_key=="${targetKey}"]`;
    mutations.push({
      patch: {
        id: draft._id,
        ifRevisionID: draft._rev,
        set: { [`${targetPath}.publicationState`]: "draft" },
        unset: [
          `${targetPath}.approvedBy`,
          `${targetPath}.approvedAt`,
          `${targetPath}.lastApprovalActor`,
          `${targetPath}.publishAt`,
          `${targetPath}.expiresAt`,
        ],
      },
    });
  }
  return mutations;
}

export function composeMarketRelease(
  draft: Record<string, unknown>,
  currentPublished: unknown,
  subjectId: string,
  targetKey: string,
  toState: EditionState,
  publishAt?: string,
  expiresAt?: string,
): Record<string, unknown> {
  const draftEditions = Array.isArray(draft.marketEditions)
    ? draft.marketEditions.filter(record)
    : [];
  const sourceTarget = draftEditions.find((item) => item._key === targetKey);
  if (!sourceTarget) throw new Error("Requested market edition disappeared");
  const hasPublishedBase =
    record(currentPublished) &&
    currentPublished._type === "page" &&
    Array.isArray(currentPublished.marketEditions);
  const published = publishableSnapshot(
    hasPublishedBase ? currentPublished : draft,
    subjectId,
  );
  const editions = hasPublishedBase
    ? (published.marketEditions as unknown[]).filter(record)
    : [];
  const releasedTarget = structuredClone(sourceTarget);
  releasedTarget.publicationState = toState;
  if (publishAt) releasedTarget.publishAt = publishAt;
  if (expiresAt) releasedTarget.expiresAt = expiresAt;
  const targetIndex = editions.findIndex((item) => item._key === targetKey);
  if (targetIndex >= 0) editions[targetIndex] = releasedTarget;
  else editions.push(releasedTarget);
  published.marketEditions = editions;
  return published;
}
export async function transitionPage(input: TransitionInput, principal: WorkflowPrincipal, now = new Date()) {
  const raw = await query(CURRENT_QUERY, {
    id: input.subjectId,
    preferPublished: input.toState === "expired" || input.toState === "archived",
  });
  if (!record(raw) || raw._type !== "page" || !Array.isArray(raw.marketEditions) || !Array.isArray(raw.resolvedMarkets)) throw new Error("Page is invalid or missing");
  const resolved = raw.resolvedMarkets.find((item) => record(item) && item.code === input.market);
  if (!record(resolved) || typeof resolved._key !== "string" || !/^[A-Za-z0-9_-]+$/.test(resolved._key)) throw new Error("Requested market edition is missing");
  const edition = raw.marketEditions.find((item) => record(item) && item._key === resolved._key);
  if (!record(edition)) throw new Error("Requested market edition is invalid");
  const from = state(edition.publicationState);
  if (!isMarketAssigned(principal, input.market)) throw new Error("Principal is not assigned to this market");
  if (!from || !canTransition(principal.role, from, input.toState)) throw new Error("Workflow transition is not permitted");
  if (violatesSeparationOfDuties(principal, edition, input.toState)) throw new Error("Separation of duties prevents self-approval or self-publication");
  if (input.toState === "approved" && edition.fallbackMode === "override" && typeof edition.title !== "string") {
    throw new Error("A market override requires local content before approval");
  }
  if (input.toState === "scheduled" && (!input.publishAt || Date.parse(input.publishAt) <= now.getTime())) throw new Error("Scheduling requires a future publishAt");
  const effectivePublishAt = input.publishAt ??
    (typeof edition.publishAt === "string" ? edition.publishAt : undefined);
  const effectiveExpiresAt = input.expiresAt ??
    (typeof edition.expiresAt === "string" ? edition.expiresAt : undefined);
  if (input.expiresAt && Date.parse(input.expiresAt) <= now.getTime()) throw new Error("expiresAt must be in the future");
  if (
    effectivePublishAt &&
    effectiveExpiresAt &&
    Date.parse(effectiveExpiresAt) <= Date.parse(effectivePublishAt)
  ) throw new Error("expiresAt must be later than publishAt");
  if (["scheduled", "published"].includes(input.toState)) {
    if (!record(raw.ownership) || !raw.ownership.owner) throw new Error("A content owner is required");
    if (!edition.approvedBy || typeof edition.approvedAt !== "string") throw new Error("Recorded market approval is required");
  }
  if (input.toState === "published") {
    if (effectivePublishAt && Date.parse(effectivePublishAt) > now.getTime()) throw new Error("Publication is not due");
    if (effectiveExpiresAt && Date.parse(effectiveExpiresAt) <= now.getTime()) throw new Error("Expired content cannot be published");
  }
  const path = `marketEditions[_key=="${resolved._key}"]`;
  const set: Record<string, unknown> = { [`${path}.publicationState`]: input.toState };
  if (input.publishAt) set[`${path}.publishAt`] = input.publishAt;
  if (input.expiresAt) set[`${path}.expiresAt`] = input.expiresAt;
  if (input.toState === "approved") {
    set[`${path}.approvedAt`] = now.toISOString();
    set[`${path}.approvedBy`] = { _type: "reference", _ref: principal.id };
    set[`${path}.lastApprovalActor`] = principal.id;
  }
  if (input.toState === "review") {
    set[`${path}.lastEditorActor`] = principal.id;
    set[`${path}.lastRequesterActor`] = principal.id;
  }
  const nowIso = now.toISOString();
  if (input.toState === "published" || input.toState === "expired" || input.toState === "archived") {
    const currentPublished = input.toState === "published"
      ? await query(CURRENT_QUERY, { id: input.subjectId, preferPublished: true })
      : raw;
    const published = composeMarketRelease(
      raw,
      currentPublished,
      input.subjectId,
      resolved._key,
      input.toState,
      input.publishAt,
      input.expiresAt,
    );
    const records = governanceRecords(input, principal, from, published, nowIso);
    await mutate(
      input.toState === "published"
        ? publishWithDraftSynchronization(records, published, raw, resolved._key)
        : [...records, { createOrReplace: published }],
      input.requestId,
    );
  } else {
    const records = governanceRecords(input, principal, from, raw, nowIso);
    await mutate([...records, { patch: { id: String(raw._id), ifRevisionID: raw._rev, set } }], input.requestId);
  }
  return { fromState: from, toState: input.toState };
}
export async function rollbackPage(subjectId: string, revisionId: string, requestId: string, principal: WorkflowPrincipal) {
  if (!validId(subjectId, true) || !validId(revisionId) || !validId(requestId) ||
    principal.role !== "admin" || principal.markets !== "all") throw new Error("Rollback requires an all-market admin");
  const [revision, current] = await Promise.all([
    query(REVISION_QUERY, { id: subjectId, revisionId }),
    query(CURRENT_QUERY, { id: subjectId, preferPublished: true }),
  ]);
  if (
    !record(revision) ||
    typeof revision.snapshot !== "string" ||
    typeof revision.reason !== "string" ||
    (!revision.reason.endsWith(":published") && !revision.reason.startsWith("rollback:")) ||
    !record(current)
  ) throw new Error("Immutable published revision is missing");
  const historical = JSON.parse(revision.snapshot) as unknown;
  if (!record(historical) || historical._type !== "page") throw new Error("Immutable revision is invalid");
  const now = new Date().toISOString();
  await mutate([
    { createIfNotExists: { _id: `revisionRecord.${requestId}`, _type: "revisionRecord", subjectId, revisionId: requestId, snapshot: JSON.stringify(current), createdAt: now, createdBy: principal.id, reason: `rollback:${revisionId}` } },
    { createIfNotExists: { _id: `auditEvent.${requestId}`, _type: "auditEvent", eventId: requestId, occurredAt: now, actorId: principal.id, action: "rollback", subjectId, metadata: JSON.stringify({ revisionId }) } },
    { createOrReplace: publishableSnapshot(historical, subjectId) },
  ], requestId);
}
export async function dueActions(now = new Date()): Promise<TransitionInput[]> {
  const raw = await query(DUE_QUERY, { now: now.toISOString() });
  if (!Array.isArray(raw)) throw new Error("Due workflow response is invalid");
  return dueActionsFromDocuments(raw, now);
}
export function dueActionsFromDocuments(raw: readonly unknown[], now = new Date()): TransitionInput[] {
  const actions: TransitionInput[] = [];
  for (const doc of raw) {
    if (!record(doc) || typeof doc._id !== "string" || !Array.isArray(doc.marketEditions)) continue;
    for (const edition of doc.marketEditions) {
      if (!record(edition) || typeof edition._key !== "string" || !/^[A-Za-z0-9_-]+$/.test(edition._key)) continue;
      const market = parseMarket(edition.market);
      if (!market) continue;
      const scheduled = edition.publicationState === "scheduled" && typeof edition.publishAt === "string" && Date.parse(edition.publishAt) <= now.getTime();
      const expired = edition.publicationState === "published" && typeof edition.expiresAt === "string" && Date.parse(edition.expiresAt) <= now.getTime();
      if (scheduled || expired) actions.push({
        requestId: `due_${edition._key}_${now.getTime()}`,
        subjectId: doc._id.replace(/^drafts\./, ""),
        market,
        toState: scheduled ? "published" : "expired",
      });
    }
  }
  return actions;
}