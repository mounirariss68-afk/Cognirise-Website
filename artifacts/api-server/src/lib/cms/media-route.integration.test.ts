import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { after, before, test } from "node:test";
import type { Server } from "node:http";
import {
  cmsDocumentsTable,
  cmsMarketEditionsTable,
  cmsMediaAssetsTable,
  cmsMediaReferencesTable,
  cmsMediaVersionsTable,
  cmsOutboxTable,
  cmsRevisionsTable,
  cmsWorkflowEventsTable,
  cmsWorkflowReceiptsTable,
  db,
  pool,
} from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import express from "express";
import { createCmsMediaRouter, type CmsMediaStorage } from "../../routes/cms-media";
import { transitionPage } from "./workflow";

const prefix = "test-cms-media-route";
const documentId = `${prefix}-document`;
const liveMediaId = `${prefix}-live`;
const draftMediaId = `${prefix}-draft`;
const expiredRightsMediaId = `${prefix}-expired-rights`;
const objectPath = "/test-bucket/cms-media/live/object";
const body = Buffer.from("public-media-body");

let server: Server;
let baseUrl: string;
let editionId: string;
let storageReads = 0;
const storageReadGenerations: Array<string | undefined> = [];
let streamShouldFail = false;
let returnedStorageGeneration: string | undefined;

const storage: CmsMediaStorage = {
  createPendingPath: () => objectPath,
  signPut: async () => "https://example.test/upload",
  fileMetadata: async () => undefined,
  file: (_path, generation) => ({
    getMetadata: async () => [{ contentType: "image/png", size: body.length, generation: returnedStorageGeneration ?? generation, md5Hash: "test-checksum" }],
    createReadStream: () => {
      storageReads += 1;
      storageReadGenerations.push(generation);
      if (streamShouldFail) {
        return new Readable({
          read() {
            this.destroy(new Error("simulated storage read failure"));
          },
        });
      }
      return Readable.from([body]);
    },
  }),
};

async function clean() {
  await db.delete(cmsWorkflowReceiptsTable).where(eq(cmsWorkflowReceiptsTable.subjectId, documentId));
  await db.delete(cmsWorkflowEventsTable).where(eq(cmsWorkflowEventsTable.target, `document:${documentId}`));
  await db.delete(cmsOutboxTable).where(eq(cmsOutboxTable.aggregateId, documentId));
  await db.delete(cmsMediaAssetsTable).where(inArray(cmsMediaAssetsTable.id, [liveMediaId, draftMediaId, expiredRightsMediaId]));
  await db.delete(cmsDocumentsTable).where(eq(cmsDocumentsTable.id, documentId));
}

before(async () => {
  await clean();
  await db.insert(cmsDocumentsTable).values({
    id: documentId,
    kind: "page",
    canonicalSlug: prefix,
    routeKind: "landing",
    ownerId: `${prefix}-author`,
    contentClass: "public",
  });
  const [edition] = await db.insert(cmsMarketEditionsTable).values({
    documentId,
    market: "uae",
    fallbackMode: "canonical",
    publicationState: "approved",
    localizedSlug: prefix,
    parityComplete: true,
    approvedAt: new Date(Date.now() - 60_000),
    approvedByPrincipalId: `${prefix}-reviewer`,
    lastApprovalPrincipalId: `${prefix}-reviewer`,
    lastEditorPrincipalId: `${prefix}-author`,
    lastRequesterPrincipalId: `${prefix}-author`,
    publishAt: new Date(Date.now() - 60_000),
    expiresAt: new Date(Date.now() + 60_000),
  }).returning();
  editionId = edition!.id;
  const [revision] = await db.insert(cmsRevisionsTable).values({
    editionId,
    revisionNumber: 1,
    payload: {
      schemaVersion: 1,
      documentId,
      market: "uae",
      fallbackMode: "canonical",
      content: {
        kind: "page",
        title: "Media route integration",
        canonicalSlug: prefix,
        routeKind: "landing",
        topics: [],
        sections: [
          { id: `${prefix}-hero`, type: "hero", heading: "Live media", media: { id: liveMediaId } },
          { id: `${prefix}-expired`, type: "media", heading: "Expired media", media: { id: expiredRightsMediaId } },
        ],
        ownership: { owner: { id: `${prefix}-author` }, sensitivity: "public" },
      },
    },
    contentDigest: `${prefix}-digest`,
    createdByPrincipalId: `${prefix}-principal`,
    reason: "integration test",
  }).returning();
  await db.update(cmsMarketEditionsTable)
    .set({ draftRevisionId: revision!.id })
    .where(eq(cmsMarketEditionsTable.id, editionId));

  await db.insert(cmsMediaAssetsTable).values([
    {
      id: liveMediaId,
      kind: "image",
      title: "Live media",
      lifecycleState: "published",
      createdByPrincipalId: `${prefix}-principal`,
    },
    {
      id: draftMediaId,
      kind: "image",
      title: "Draft media",
      lifecycleState: "draft",
      createdByPrincipalId: `${prefix}-principal`,
    },
    {
      id: expiredRightsMediaId,
      kind: "image",
      title: "Expired rights media",
      lifecycleState: "published",
      rightsExpiresAt: new Date(Date.now() - 60_000),
      createdByPrincipalId: `${prefix}-principal`,
    },
  ]);
  await db.insert(cmsMediaVersionsTable).values([
    { mediaId: liveMediaId, version: 1, objectPath, contentType: "image/png", byteSize: body.length, checksum: "test-checksum", metadata: { storageGeneration: "101" }, createdByPrincipalId: `${prefix}-principal` },
    { mediaId: liveMediaId, version: 2, objectPath: `${objectPath}-newer`, contentType: "image/png", byteSize: body.length, checksum: "test-checksum", metadata: { storageGeneration: "102" }, createdByPrincipalId: `${prefix}-principal` },
    { mediaId: draftMediaId, version: 1, objectPath: `${objectPath}-draft`, contentType: "image/png", byteSize: body.length, checksum: "test-checksum", metadata: { storageGeneration: "201" }, createdByPrincipalId: `${prefix}-principal` },
    { mediaId: expiredRightsMediaId, version: 1, objectPath, contentType: "image/png", byteSize: body.length, checksum: "test-checksum", metadata: { storageGeneration: "301" }, createdByPrincipalId: `${prefix}-principal` },
  ]);
  await db.insert(cmsMediaReferencesTable).values([
    { mediaId: liveMediaId, mediaVersion: 1, revisionId: revision!.id, fieldPath: "/sections/0/media" },
    { mediaId: expiredRightsMediaId, mediaVersion: 1, revisionId: revision!.id, fieldPath: "/sections/1/media" },
  ]);
  await transitionPage({
    requestId: `${prefix}-publish`,
    subjectId: documentId,
    market: "uae",
    toState: "published",
    expectedVersion: 1,
  }, {
    id: `${prefix}-publisher`,
    role: "publisher",
    markets: ["uae"],
  });
  const [publishedEdition] = await db.select().from(cmsMarketEditionsTable)
    .where(eq(cmsMarketEditionsTable.id, editionId)).limit(1);
  assert.equal(publishedEdition?.publicationState, "published");
  assert.notEqual(publishedEdition?.liveRevisionId, revision!.id);
  const copiedReferences = await db.select().from(cmsMediaReferencesTable)
    .where(eq(cmsMediaReferencesTable.revisionId, publishedEdition!.liveRevisionId!));
  assert.deepEqual(
    copiedReferences.map(({ mediaId, mediaVersion, fieldPath }) => ({ mediaId, mediaVersion, fieldPath }))
      .sort((left, right) => left.mediaId.localeCompare(right.mediaId)),
    [
      { mediaId: expiredRightsMediaId, mediaVersion: 1, fieldPath: "/sections/1/media" },
      { mediaId: liveMediaId, mediaVersion: 1, fieldPath: "/sections/0/media" },
    ],
  );

  const app = express();
  app.use(createCmsMediaRouter(storage, async (req) => {
    const principalId = req.get("x-test-principal");
    if (!principalId) return undefined;
    return { id: principalId, role: principalId.endsWith("-reviewer") ? "reviewer" : "author", markets: ["uae"] };
  }));
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
  if (server) await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  await clean();
  await pool.end();
});

test("public media route streams a Node Readable only for currently eligible media", async () => {
  const response = await fetch(`${baseUrl}/cms/media/${liveMediaId}/versions/1`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "image/png");
  assert.equal(response.headers.get("content-length"), String(body.length));
  assert.equal(response.headers.get("cache-control"), "public, max-age=31536000, immutable");
  assert.deepEqual(Buffer.from(await response.arrayBuffer()), body);
  assert.equal(storageReads, 1);
  assert.equal(storageReadGenerations.at(-1), "101");

  const unboundVersionResponse = await fetch(`${baseUrl}/cms/media/${liveMediaId}/versions/2`);
  assert.equal(unboundVersionResponse.status, 404);
  assert.equal(storageReads, 1);

  const [publishedEdition] = await db.select().from(cmsMarketEditionsTable)
    .where(eq(cmsMarketEditionsTable.id, editionId)).limit(1);
  const [liveRevision] = await db.select().from(cmsRevisionsTable)
    .where(eq(cmsRevisionsTable.id, publishedEdition!.liveRevisionId!)).limit(1);
  const publicPayload = liveRevision!.payload;
  const restrictedPayload = structuredClone(publicPayload) as {
    content: { ownership: { sensitivity: string } };
  };
  restrictedPayload.content.ownership.sensitivity = "restricted";
  await db.update(cmsRevisionsTable).set({ payload: restrictedPayload })
    .where(eq(cmsRevisionsTable.id, liveRevision!.id));
  const restrictedResponse = await fetch(`${baseUrl}/cms/media/${liveMediaId}/versions/1`);
  assert.equal(restrictedResponse.status, 404);
  assert.equal(storageReads, 1);
  await db.update(cmsRevisionsTable).set({ payload: publicPayload })
    .where(eq(cmsRevisionsTable.id, liveRevision!.id));

  const expiredRightsResponse = await fetch(`${baseUrl}/cms/media/${expiredRightsMediaId}/versions/1`);
  assert.equal(expiredRightsResponse.status, 404);
  assert.equal(storageReads, 1);

  streamShouldFail = true;
  const missingObjectResponse = await fetch(`${baseUrl}/cms/media/${liveMediaId}/versions/1`);
  assert.equal(missingObjectResponse.status, 404);
  streamShouldFail = false;
  assert.equal(storageReads, 2);

  await db.update(cmsMarketEditionsTable)
    .set({ expiresAt: new Date(Date.now() - 1_000) })
    .where(eq(cmsMarketEditionsTable.id, editionId));
  const expiredEditionResponse = await fetch(`${baseUrl}/cms/media/${liveMediaId}/versions/1`);
  assert.equal(expiredEditionResponse.status, 404);
  assert.equal(storageReads, 2);

  await db.update(cmsMarketEditionsTable)
    .set({ expiresAt: new Date(Date.now() + 60_000) })
    .where(eq(cmsMarketEditionsTable.id, editionId));
  await db.update(cmsDocumentsTable).set({ archivedAt: new Date() })
    .where(eq(cmsDocumentsTable.id, documentId));
  const archivedDocumentResponse = await fetch(`${baseUrl}/cms/media/${liveMediaId}/versions/1`);
  assert.equal(archivedDocumentResponse.status, 404);
  assert.equal(storageReads, 2);
});

test("admin media metadata and previews are authenticated, exact, no-store, and rights-aware", async () => {
  const unauthenticated = await fetch(`${baseUrl}/cms/admin/media`);
  assert.equal(unauthenticated.status, 401);

  const headers = { "x-test-principal": `${prefix}-principal` };
  const listResponse = await fetch(`${baseUrl}/cms/admin/media`, { headers });
  assert.equal(listResponse.status, 200);
  assert.equal(listResponse.headers.get("cache-control"), "no-store");
  const list = await listResponse.json() as {
    media: Array<{ id: string; latestVersion: { version: number; previewUrl: string } | null }>;
  };
  const listedLiveMedia = list.media.find((item) => item.id === liveMediaId);
  assert.equal(listedLiveMedia?.latestVersion?.version, 2);
  assert.equal(
    listedLiveMedia?.latestVersion?.previewUrl,
    `/api/cms/admin/media/${liveMediaId}/versions/2/preview`,
  );
  assert.equal(JSON.stringify(list).includes(objectPath), false);
  const listedDraftMedia = list.media.find((item) => item.id === draftMediaId);
  assert.equal(listedDraftMedia?.latestVersion?.version, 1);

  const metadataResponse = await fetch(`${baseUrl}/cms/admin/media/${liveMediaId}/versions/1`, { headers });
  assert.equal(metadataResponse.status, 200);
  assert.equal(metadataResponse.headers.get("cache-control"), "no-store");
  const metadata = await metadataResponse.json() as { mediaId: string; version: number; previewUrl: string };
  assert.deepEqual(metadata, {
    mediaId: liveMediaId,
    version: 1,
    contentType: "image/png",
    byteSize: body.length,
    checksum: "test-checksum",
    metadata: { storageGeneration: "101" },
    createdAt: metadata.createdAt,
    previewUrl: `/api/cms/admin/media/${liveMediaId}/versions/1/preview`,
  });

  const readsBeforePreview = storageReads;
  const previewResponse = await fetch(`${baseUrl}${metadata.previewUrl.replace(/^\/api/, "")}`, { headers });
  assert.equal(previewResponse.status, 200);
  assert.equal(previewResponse.headers.get("cache-control"), "no-store");
  assert.equal(previewResponse.headers.get("content-disposition"), "inline");
  assert.deepEqual(Buffer.from(await previewResponse.arrayBuffer()), body);
  assert.equal(storageReads, readsBeforePreview + 1);
  assert.equal(storageReadGenerations.at(-1), "101");

  const missingVersion = await fetch(`${baseUrl}/cms/admin/media/${liveMediaId}/versions/99/preview`, { headers });
  assert.equal(missingVersion.status, 404);
  assert.equal(storageReads, readsBeforePreview + 1);

  returnedStorageGeneration = "overwritten";
  const overwrittenVersion = await fetch(`${baseUrl}/cms/admin/media/${liveMediaId}/versions/1/preview`, { headers });
  assert.equal(overwrittenVersion.status, 404);
  assert.equal(storageReads, readsBeforePreview + 1);
  returnedStorageGeneration = undefined;

  const denied = await fetch(`${baseUrl}/cms/admin/media/${liveMediaId}/versions/1/preview`, {
    headers: { "x-test-principal": `${prefix}-other` },
  });
  assert.equal(denied.status, 403);
  assert.equal(storageReads, readsBeforePreview + 1);

  const expiredRights = await fetch(`${baseUrl}/cms/admin/media/${expiredRightsMediaId}/versions/1/preview`, { headers });
  assert.equal(expiredRights.status, 403);
  assert.equal(storageReads, readsBeforePreview + 1);

  const reviewer = await fetch(`${baseUrl}/cms/admin/media`, {
    headers: { "x-test-principal": `${prefix}-reviewer` },
  });
  assert.equal(reviewer.status, 403);
  assert.equal(reviewer.headers.get("cache-control"), "no-store");
});