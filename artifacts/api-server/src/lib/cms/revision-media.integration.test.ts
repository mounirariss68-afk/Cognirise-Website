import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq } from "drizzle-orm";
import {
  cmsDocumentsTable,
  cmsMarketEditionsTable,
  cmsMediaAssetsTable,
  cmsMediaReferencesTable,
  cmsMediaVersionsTable,
  cmsRevisionsTable,
  db,
  pool,
} from "@workspace/db";
import { copyRevisionMediaReferences } from "./revision-media";

const prefix = "test-cms-revision-media";
const documentId = `${prefix}-document`;
const mediaId = `${prefix}-asset`;

async function clean() {
  await db.delete(cmsDocumentsTable).where(eq(cmsDocumentsTable.id, documentId));
  await db.delete(cmsMediaAssetsTable).where(eq(cmsMediaAssetsTable.id, mediaId));
}

before(clean);
after(async () => {
  await clean();
  await pool.end();
});

test("text-only immutable snapshots preserve stable-reference paths and concrete media versions", async () => {
  await db.insert(cmsDocumentsTable).values({
    id: documentId,
    kind: "page",
    canonicalSlug: prefix,
    routeKind: "landing",
  });
  const [edition] = await db.insert(cmsMarketEditionsTable).values({
    documentId,
    market: "uae",
    fallbackMode: "canonical",
    localizedSlug: prefix,
  }).returning();
  const targetContent = {
    kind: "page",
    title: "Media-bearing assistant target",
    canonicalSlug: prefix,
    routeKind: "landing",
    topics: [],
    sections: [{
      id: `${prefix}-hero`,
      type: "hero",
      heading: "Updated text",
      media: { id: mediaId },
    }],
    ownership: { owner: { id: `${prefix}-owner` }, sensitivity: "public" },
  };
  const revisions = await db.insert(cmsRevisionsTable).values([
    {
      editionId: edition!.id,
      revisionNumber: 1,
      payload: { content: targetContent },
      contentDigest: `${prefix}-source`,
      createdByPrincipalId: `${prefix}-author`,
      reason: "integration source",
    },
    {
      editionId: edition!.id,
      revisionNumber: 2,
      payload: { content: targetContent },
      contentDigest: `${prefix}-target`,
      createdByPrincipalId: `${prefix}-reviewer`,
      reason: "integration assistant snapshot",
    },
    {
      editionId: edition!.id,
      revisionNumber: 3,
      payload: { content: { ...targetContent, sections: [] } },
      contentDigest: `${prefix}-mismatch`,
      createdByPrincipalId: `${prefix}-reviewer`,
      reason: "integration mismatch",
    },
  ]).returning();
  await db.insert(cmsMediaAssetsTable).values({
    id: mediaId,
    kind: "image",
    title: "Version-bound media",
    lifecycleState: "published",
    createdByPrincipalId: `${prefix}-author`,
  });
  await db.insert(cmsMediaVersionsTable).values({
    mediaId,
    version: 4,
    objectPath: `/private/${prefix}/asset.webp`,
    contentType: "image/webp",
    createdByPrincipalId: `${prefix}-author`,
  });
  await db.insert(cmsMediaReferencesTable).values({
    mediaId,
    mediaVersion: 4,
    revisionId: revisions[0]!.id,
    fieldPath: "/sections/0/media",
  });

  await db.transaction((tx) =>
    copyRevisionMediaReferences(tx, revisions[0]!.id, revisions[1]!.id, targetContent));
  const copied = await db.select().from(cmsMediaReferencesTable)
    .where(eq(cmsMediaReferencesTable.revisionId, revisions[1]!.id));
  assert.deepEqual(copied.map(({ mediaId: id, mediaVersion, fieldPath }) => ({
    mediaId: id,
    mediaVersion,
    fieldPath,
  })), [{
    mediaId,
    mediaVersion: 4,
    fieldPath: "/sections/0/media",
  }]);

  await assert.rejects(
    () => db.transaction((tx) =>
      copyRevisionMediaReferences(tx, revisions[0]!.id, revisions[2]!.id, {
        ...targetContent,
        sections: [],
      })),
    /media references changed unexpectedly/,
  );
});