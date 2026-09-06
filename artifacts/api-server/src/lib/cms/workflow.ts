import { and, eq, lte, or, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { cmsMarketEditionsTable, cmsMediaReferencesTable, cmsOutboxTable, cmsRevisionsTable, cmsWorkflowEventsTable, cmsWorkflowReceiptsTable, db } from "@workspace/db";
import type { CmsMarket } from "./security";

export const editorialRoles = ["author", "regionalEditor", "reviewer", "publisher", "admin"] as const;
export type EditorialRole = typeof editorialRoles[number];
export const editionStates = ["draft", "review", "approved", "scheduled", "published", "expired", "archived"] as const;
export type EditionState = typeof editionStates[number];
export interface WorkflowPrincipal { id: string; role: EditorialRole; markets: readonly CmsMarket[] | "all"; }
export interface TransitionInput { requestId: string; subjectId: string; market: CmsMarket; toState: EditionState; expectedVersion: number; publishAt?: string; expiresAt?: string; }
const permissions: Record<EditorialRole, ReadonlySet<string>> = {
  author: new Set(["draft:review"]), regionalEditor: new Set(["draft:review"]), reviewer: new Set(["review:approved"]),
  publisher: new Set(["approved:scheduled", "approved:published", "scheduled:published", "published:expired", "expired:archived"]), admin: new Set(["*"]),
};
export const isMarketAssigned = (principal: WorkflowPrincipal, market: CmsMarket) => principal.markets === "all" || principal.markets.includes(market);
export const canTransition = (role: EditorialRole, from: EditionState, to: EditionState) => permissions[role].has("*") || permissions[role].has(`${from}:${to}`);
export const hasEditionConflict = (actualVersion: number, expectedVersion: number) => actualVersion !== expectedVersion;
export const violatesSeparationOfDuties = (
  principal: WorkflowPrincipal,
  edition: Pick<typeof cmsMarketEditionsTable.$inferSelect, "lastEditorPrincipalId" | "lastRequesterPrincipalId">,
  toState: EditionState,
) => ["approved", "published"].includes(toState) &&
  (edition.lastEditorPrincipalId === principal.id || edition.lastRequesterPrincipalId === principal.id);
const canonicalDate = (value: string | undefined) => value ? new Date(value).toISOString() : null;
/** Stable request identity retained with every workflow receipt. */
export function workflowRequestDigest(input: TransitionInput, principal: WorkflowPrincipal): string {
  return createHash("sha256").update(JSON.stringify({
    actor: principal.id,
    expectedVersion: input.expectedVersion,
    expiresAt: canonicalDate(input.expiresAt),
    market: input.market,
    publishAt: canonicalDate(input.publishAt),
    subjectId: input.subjectId,
    toState: input.toState,
  })).digest("hex");
}
export function lifecycleDateError(
  existing: { publishAt: Date | null; expiresAt: Date | null },
  input: TransitionInput,
  now = new Date(),
): string | undefined {
  if (!["scheduled", "published"].includes(input.toState)) return;
  const publishAt = input.publishAt ? new Date(input.publishAt) : existing.publishAt;
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : existing.expiresAt;
  if (input.toState === "scheduled" && (!publishAt || publishAt <= now)) return "Scheduling requires a future publishAt";
  if (input.toState === "published" && publishAt && publishAt > now) return "Publication is not due";
  const effectivePublishAt = publishAt ?? now;
  if (input.toState === "published" && expiresAt && expiresAt <= now) return "Publication expiry must be in the future";
  if (expiresAt && expiresAt <= effectivePublishAt) return "Expiry must be strictly later than publication";
  return undefined;
}
export function parseTransitionInput(value: unknown): TransitionInput | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return;
  const v = value as Record<string, unknown>;
  if (Object.keys(v).some((key) => !["requestId", "subjectId", "market", "toState", "expectedVersion", "publishAt", "expiresAt"].includes(key))) return;
  if (typeof v.requestId !== "string" || !/^[A-Za-z0-9_-]{8,120}$/.test(v.requestId) || typeof v.subjectId !== "string" || typeof v.expectedVersion !== "number" || !Number.isInteger(v.expectedVersion) || !editionStates.includes(v.toState as EditionState) || !["uae", "ksa", "turkiye", "europe"].includes(v.market as string)) return;
  if (
    (v.publishAt !== undefined && (typeof v.publishAt !== "string" || !Number.isFinite(Date.parse(v.publishAt)))) ||
    (v.expiresAt !== undefined && (typeof v.expiresAt !== "string" || !Number.isFinite(Date.parse(v.expiresAt))))
  ) return;
  return { requestId: v.requestId, subjectId: v.subjectId, market: v.market as CmsMarket, toState: v.toState as EditionState, expectedVersion: v.expectedVersion, ...(typeof v.publishAt === "string" ? { publishAt: v.publishAt } : {}), ...(typeof v.expiresAt === "string" ? { expiresAt: v.expiresAt } : {}) };
}
export async function transitionPage(input: TransitionInput, principal: WorkflowPrincipal, now = new Date()) {
  if (!isMarketAssigned(principal, input.market)) throw new Error("Principal is not assigned to this market");
  const requestDigest = workflowRequestDigest(input, principal);
  return db.transaction(async (tx) => {
    const [duplicate] = await tx.select().from(cmsWorkflowReceiptsTable).where(eq(cmsWorkflowReceiptsTable.requestId, input.requestId)).limit(1);
    if (duplicate) {
      if (!duplicate.requestDigest || duplicate.requestDigest !== requestDigest) throw new Error("Workflow request ID was already used with a different identity");
      return { duplicate: true as const, fromState: undefined, toState: input.toState };
    }
    const [edition] = await tx.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, input.subjectId), eq(cmsMarketEditionsTable.market, input.market))).limit(1);
    if (!edition || hasEditionConflict(edition.version, input.expectedVersion)) throw new Error("Edition has changed; reload before transitioning");
    const from = edition.publicationState as EditionState;
    if (!canTransition(principal.role, from, input.toState)) throw new Error("Workflow transition is not permitted");
    if (violatesSeparationOfDuties(principal, edition, input.toState)) throw new Error("Separation of duties prevents self-approval or self-publication");
    if (["scheduled", "published"].includes(input.toState) && !edition.approvedAt) throw new Error("Recorded independent approval is required");
    const datesError = lifecycleDateError(edition, input, now);
    if (datesError) throw new Error(datesError);
    const [snapshot] = await tx.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition.draftRevisionId!)).limit(1);
    if (!snapshot) throw new Error("Draft revision is missing");
    const [immutable] = await tx.insert(cmsRevisionsTable).values({ editionId: edition.id, revisionNumber: snapshot.revisionNumber + 1, payloadVersion: snapshot.payloadVersion, payload: snapshot.payload, contentDigest: snapshot.contentDigest, createdByPrincipalId: principal.id, reason: `${from}:${input.toState}` }).returning();
    const mediaReferences = await tx.select().from(cmsMediaReferencesTable)
      .where(eq(cmsMediaReferencesTable.revisionId, snapshot.id));
    if (mediaReferences.length) {
      await tx.insert(cmsMediaReferencesTable).values(mediaReferences.map((reference) => ({
        mediaId: reference.mediaId,
        mediaVersion: reference.mediaVersion,
        revisionId: immutable!.id,
        fieldPath: reference.fieldPath,
      })));
    }
    const update = await tx.update(cmsMarketEditionsTable).set({
      publicationState: input.toState, version: edition.version + 1, draftRevisionId: immutable!.id,
      ...(input.toState === "published" ? { liveRevisionId: immutable!.id, lastPublisherPrincipalId: principal.id } : {}),
      ...(input.toState === "approved" ? { approvedAt: now, approvedByPrincipalId: principal.id, lastApprovalPrincipalId: principal.id } : {}),
      ...(input.toState === "review" ? { lastEditorPrincipalId: principal.id, lastRequesterPrincipalId: principal.id } : {}),
      ...(input.publishAt ? { publishAt: new Date(input.publishAt) } : {}), ...(input.expiresAt ? { expiresAt: new Date(input.expiresAt) } : {}),
    }).where(and(eq(cmsMarketEditionsTable.id, edition.id), eq(cmsMarketEditionsTable.version, input.expectedVersion))).returning();
    if (!update.length) throw new Error("Edition has changed; reload before transitioning");
    await tx.insert(cmsWorkflowReceiptsTable).values({ requestId: input.requestId, requestDigest, action: `transition:${input.toState}`, subjectId: input.subjectId });
    await tx.insert(cmsWorkflowEventsTable).values({ action: "workflow_transition", actor: principal.id, target: `document:${input.subjectId}`, market: input.market, outcome: "success", metadata: { fromState: from, toState: input.toState, revisionId: immutable!.id } });
    await tx.insert(cmsOutboxTable).values({ topic: "cms.invalidation", aggregateId: input.subjectId, dedupeKey: `transition:${input.requestId}`, payload: { market: input.market, state: input.toState, revisionId: immutable!.id } });
    return { duplicate: false as const, fromState: from, toState: input.toState };
  });
}
export async function dueActions(now = new Date()): Promise<TransitionInput[]> {
  // Keep the advisory-locked scheduler pass deliberately short; the next pass
  // picks up any remaining due editions and receipts make retries idempotent.
  const editions = await db.select().from(cmsMarketEditionsTable).where(or(
    and(eq(cmsMarketEditionsTable.publicationState, "scheduled"), lte(cmsMarketEditionsTable.publishAt, now)),
    and(eq(cmsMarketEditionsTable.publicationState, "published"), lte(cmsMarketEditionsTable.expiresAt, now)),
  )).limit(100);
  return editions.map((edition) => ({ requestId: `due_${edition.id}_${edition.version}`, subjectId: edition.documentId, market: edition.market as CmsMarket, expectedVersion: edition.version, toState: edition.publicationState === "scheduled" ? "published" : "expired" }));
}
/** Holds a transaction-scoped PostgreSQL advisory lease while a scheduler pass runs. */
export async function withDueProcessingLease<T>(work: () => Promise<T>): Promise<{ acquired: boolean; result?: T }> {
  return db.transaction(async (tx) => {
    const lease = (await tx.execute(sql<{ acquired: boolean }>`select pg_try_advisory_xact_lock(8675310) as acquired`)).rows[0];
    if (!lease?.acquired) return { acquired: false };
    return { acquired: true, result: await work() };
  });
}