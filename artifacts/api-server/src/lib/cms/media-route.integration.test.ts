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
const expiredRightsMediaId = `${prefix}-expired-rights`;
const objectPath = "/test-bucket/cms-media/live/object";
const body = Buffer.from("public-media-body");

let server: Server;
let baseUrl: string;
let editionId: string;
let storageReads = 0;
let streamShouldFail = false;

const storage: CmsMediaStorage = {
  createPendingPath: () => objectPath,
  signPut: async () => "https://example.test/upload",
  fileMetadata: async () => undefined,
  file: () => ({
    getMetadata: async () => [{ contentType: "image/png", size: body.length }],
    createReadStream: () => {
      storageReads += 1;
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
  await db.delete(cmsMediaAssetsTable).where(inArray(cmsMediaAssetsTable.id, [liveMediaId, expiredRightsMediaId]));
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
      id: expiredRightsMediaId,
      kind: "image",
      title: "Expired rights media",
      lifecycleState: "published",
      rightsExpiresAt: new Date(Date.now() - 60_000),
      createdByPrincipalId: `${prefix}-principal`,
    },
  ]);
  await db.insert(cmsMediaVersionsTable).values([
    { mediaId: liveMediaId, version: 1, objectPath, contentType: "image/png", byteSize: body.length, createdByPrincipalId: `${prefix}-principal` },
    { mediaId: liveMediaId, version: 2, objectPath: `${objectPath}-newer`, contentType: "image/png", byteSize: body.length, createdByPrincipalId: `${prefix}-principal` },
    { mediaId: expiredRightsMediaId, version: 1, objectPath, contentType: "image/png", byteSize: body.length, createdByPrincipalId: `${prefix}-principal` },
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
  app.use(createCmsMediaRouter(storage));
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