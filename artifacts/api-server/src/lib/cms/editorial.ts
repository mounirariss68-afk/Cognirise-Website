import { and, desc, eq, inArray } from "drizzle-orm";
import {
  cmsDocumentsTable, cmsMarketEditionsTable, cmsMediaAssetsTable, cmsMediaReferencesTable, cmsMediaVersionsTable,
  cmsOutboxTable, cmsRevisionsTable, cmsWorkflowEventsTable, db,
} from "@workspace/db";
import { cmsEditionPayloadSchema, type CmsEditionPayload } from "./contracts";
import { mediaReferences } from "./media-references";
import { CMS_MARKETS, type CmsMarket, sha256 } from "./security";
import { isMarketAssigned, type WorkflowPrincipal } from "./workflow";

export class CmsConflictError extends Error {}
export class CmsForbiddenError extends Error {}
export class CmsValidationError extends Error {}

const canonical = (value: unknown) => JSON.stringify(value);
export { mediaReferences } from "./media-references";

function parsePayload(value: unknown, documentId: string, market: CmsMarket): CmsEditionPayload {
  const parsed = cmsEditionPayloadSchema.safeParse(value);
  if (!parsed.success || parsed.data.documentId !== documentId || parsed.data.market !== market) {
    throw new CmsValidationError("Edition payload does not satisfy the governed content contract");
  }
  return parsed.data;
}

async function persistMediaReferences(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], revisionId: string, payload: CmsEditionPayload) {
  const references = mediaReferences(payload.content);
  if (!references.length) return;
  const ids = [...new Set(references.map((item) => item.mediaId))];
  const assets = await tx.select({ id: cmsMediaAssetsTable.id }).from(cmsMediaAssetsTable)
    .where(and(inArray(cmsMediaAssetsTable.id, ids), eq(cmsMediaAssetsTable.lifecycleState, "published")));
  if (assets.length !== ids.length) throw new CmsValidationError("Referenced media must exist and be published");
  const versions = await tx.select({ mediaId: cmsMediaVersionsTable.mediaId, version: cmsMediaVersionsTable.version })
    .from(cmsMediaVersionsTable)
    .where(inArray(cmsMediaVersionsTable.mediaId, ids))
    .orderBy(desc(cmsMediaVersionsTable.version));
  const selectedVersions = new Map<string, number>();
  for (const version of versions) if (!selectedVersions.has(version.mediaId)) selectedVersions.set(version.mediaId, version.version);
  if (selectedVersions.size !== ids.length) throw new CmsValidationError("Referenced media must have a concrete version");
  await tx.insert(cmsMediaReferencesTable).values(references.map((item) => ({
    ...item,
    mediaVersion: selectedVersions.get(item.mediaId)!,
    revisionId,
  })));
}

export async function createDocument(
  principal: WorkflowPrincipal, documentId: string, payload: unknown,
) {
  if (!["author", "regionalEditor", "admin"].includes(principal.role)) {
    throw new CmsForbiddenError("Author, regional editor, or admin role required to create documents");
  }
  if (!/^[A-Za-z0-9._-]{3,200}$/.test(documentId)) throw new CmsValidationError("Document ID is invalid");
  const uae = parsePayload(payload, documentId, "uae");
  if (uae.content.kind !== (uae.content as { kind: string }).kind) throw new CmsValidationError("Document kind is invalid");
  return db.transaction(async (tx) => {
    const [document] = await tx.insert(cmsDocumentsTable).values({
      id: documentId, kind: uae.content.kind, canonicalSlug: "canonicalSlug" in uae.content ? uae.content.canonicalSlug : null,
      routeKind: uae.content.kind === "page" ? uae.content.routeKind : null, ownerId: principal.id,
    }).returning();
    const editions = [];
    for (const market of CMS_MARKETS) {
      if (!isMarketAssigned(principal, market)) throw new CmsForbiddenError("Principal is not assigned to every market required for document creation");
      const editionPayload = market === "uae" ? uae : { ...uae, market, fallbackMode: "uaeFallback" as const };
      const [edition] = await tx.insert(cmsMarketEditionsTable).values({
        documentId, market, fallbackMode: editionPayload.fallbackMode,
        localizedSlug: "canonicalSlug" in editionPayload.content ? editionPayload.content.canonicalSlug : null,
      }).returning();
      const [revision] = await tx.insert(cmsRevisionsTable).values({
        editionId: edition!.id, revisionNumber: 1, payload: editionPayload, contentDigest: sha256(canonical(editionPayload)),
        createdByPrincipalId: principal.id, reason: "document:create",
      }).returning();
      await tx.update(cmsMarketEditionsTable).set({ draftRevisionId: revision!.id }).where(eq(cmsMarketEditionsTable.id, edition!.id));
      await persistMediaReferences(tx, revision!.id, editionPayload);
      editions.push({ ...edition!, draftRevisionId: revision!.id });
    }
    await tx.insert(cmsWorkflowEventsTable).values({ action: "document_create", actor: principal.id, target: `document:${documentId}`, outcome: "success", metadata: {} });
    await tx.insert(cmsOutboxTable).values({ topic: "cms.invalidation", aggregateId: documentId, dedupeKey: `document:create:${documentId}`, payload: { action: "create" } });
    return { document: document!, editions };
  });
}

export async function updateEditionDraft(principal: WorkflowPrincipal, documentId: string, market: CmsMarket, expectedVersion: number, rawPayload: unknown) {
  if (!["author", "regionalEditor", "admin"].includes(principal.role)) {
    throw new CmsForbiddenError("Author, regional editor, or admin role required to update drafts");
  }
  if (!isMarketAssigned(principal, market)) throw new CmsForbiddenError("Principal is not assigned to this market");
  const payload = parsePayload(rawPayload, documentId, market);
  return db.transaction(async (tx) => {
    const [edition] = await tx.select().from(cmsMarketEditionsTable).where(and(eq(cmsMarketEditionsTable.documentId, documentId), eq(cmsMarketEditionsTable.market, market))).limit(1);
    if (!edition) throw new CmsValidationError("Edition was not found");
    if (edition.version !== expectedVersion) throw new CmsConflictError("Edition has changed; reload before saving");
    const [current] = await tx.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, edition.draftRevisionId!)).limit(1);
    if (!current) throw new CmsValidationError("Draft revision is missing");
    const digest = sha256(canonical(payload));
    const [revision] = await tx.insert(cmsRevisionsTable).values({
      editionId: edition.id, revisionNumber: current.revisionNumber + 1, payload: payload, contentDigest: digest,
      createdByPrincipalId: principal.id, reason: "draft:update",
    }).returning();
    await persistMediaReferences(tx, revision!.id, payload);
    const [updated] = await tx.update(cmsMarketEditionsTable).set({
      draftRevisionId: revision!.id, version: expectedVersion + 1, publicationState: "draft",
      fallbackMode: payload.fallbackMode, localizedSlug: "canonicalSlug" in payload.content ? payload.content.canonicalSlug : null,
      approvedAt: null, approvedByPrincipalId: null, lastApprovalPrincipalId: null, lastEditorPrincipalId: principal.id,
    }).where(and(eq(cmsMarketEditionsTable.id, edition.id), eq(cmsMarketEditionsTable.version, expectedVersion))).returning();
    if (!updated) throw new CmsConflictError("Edition has changed; reload before saving");
    await tx.insert(cmsWorkflowEventsTable).values({ action: "draft_update", actor: principal.id, target: `document:${documentId}`, market, outcome: "success", metadata: { revisionId: revision!.id } });
    await tx.insert(cmsOutboxTable).values({ topic: "cms.invalidation", aggregateId: documentId, dedupeKey: `draft:${revision!.id}`, payload: { market, revisionId: revision!.id } });
    return { edition: updated, revision: revision! };
  });
}

export async function rollbackEdition(principal: WorkflowPrincipal, documentId: string, market: CmsMarket, revisionId: string, expectedVersion: number) {
  if (!isMarketAssigned(principal, market) || !["regionalEditor", "admin"].includes(principal.role)) throw new CmsForbiddenError("Rollback is not permitted");
  const [revision] = await db.select().from(cmsRevisionsTable).where(eq(cmsRevisionsTable.id, revisionId)).limit(1);
  if (!revision) throw new CmsValidationError("Revision was not found");
  return updateEditionDraft(principal, documentId, market, expectedVersion, revision.payload);
}