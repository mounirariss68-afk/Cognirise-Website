import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { eq, inArray } from "drizzle-orm";
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
import { getPublishedPage, getPublishedPublications, type RouteKind } from "./adapter";

const prefix = "test-cms-public-hydration";
const ids = {
  page: `${prefix}-page`,
  publication: `${prefix}-publication`,
  person: `${prefix}-person`,
  organization: `${prefix}-organization`,
  claim: `${prefix}-claim`,
  proof: `${prefix}-proof`,
  draftPerson: `${prefix}-draft-person`,
  archivedPerson: `${prefix}-archived-person`,
  image: `${prefix}-image`,
  download: `${prefix}-download`,
  unpublishedMedia: `${prefix}-unpublished-media`,
  expiredMedia: `${prefix}-expired-media`,
};
const documentIds = [
  ids.page,
  ids.publication,
  ids.person,
  ids.organization,
  ids.claim,
  ids.proof,
  ids.draftPerson,
  ids.archivedPerson,
];
const mediaIds = [ids.image, ids.download, ids.unpublishedMedia, ids.expiredMedia];
const ownership = { owner: { id: `${prefix}-owner` }, sensitivity: "public" as const };

async function clean() {
  await db.delete(cmsDocumentsTable).where(inArray(cmsDocumentsTable.id, documentIds));
  await db.delete(cmsMediaAssetsTable).where(inArray(cmsMediaAssetsTable.id, mediaIds));
}

async function seedDocument(
  id: string,
  kind: string,
  canonicalSlug: string | null,
  routeKind: RouteKind | null,
  content: Record<string, unknown>,
  publicationState: "published" | "draft" = "published",
) {
  await db.insert(cmsDocumentsTable).values({
    id,
    kind,
    canonicalSlug,
    routeKind,
    ownerId: `${prefix}-owner`,
    contentClass: "public",
  });
  const [edition] = await db.insert(cmsMarketEditionsTable).values({
    documentId: id,
    market: "uae",
    fallbackMode: "canonical",
    publicationState,
    localizedSlug: canonicalSlug,
    parityComplete: true,
  }).returning();
  const [revision] = await db.insert(cmsRevisionsTable).values({
    editionId: edition!.id,
    revisionNumber: 1,
    payload: {
      schemaVersion: 1,
      documentId: id,
      market: "uae",
      fallbackMode: "canonical",
      content,
    },
    contentDigest: `integration:${id}`,
    createdByPrincipalId: `${prefix}-owner`,
    reason: "integration:public-hydration",
  }).returning();
  await db.update(cmsMarketEditionsTable).set({
    draftRevisionId: revision!.id,
    liveRevisionId: revision!.id,
  }).where(eq(cmsMarketEditionsTable.id, edition!.id));
  return revision!.id;
}

async function seedMedia(
  id: string,
  kind: "image" | "document",
  lifecycleState: "published" | "draft",
  version: { objectPath?: string; externalUrl?: string; contentType: string },
  rightsExpiresAt?: Date,
) {
  await db.insert(cmsMediaAssetsTable).values({
    id,
    kind,
    title: kind === "image" ? "Governed image" : "Governed download",
    altText: kind === "image" ? "A governed test image" : null,
    decorative: false,
    lifecycleState,
    rightsExpiresAt,
    createdByPrincipalId: `${prefix}-owner`,
  });
  await db.insert(cmsMediaVersionsTable).values({
    mediaId: id,
    version: 1,
    objectPath: version.objectPath,
    externalUrl: version.externalUrl,
    contentType: version.contentType,
    byteSize: 128,
    createdByPrincipalId: `${prefix}-owner`,
  });
}

before(clean);
after(async () => {
  await clean();
  await pool.end();
});

test("public delivery hydrates only governed live references and versioned media", async () => {
  await seedDocument(ids.person, "person", null, null, {
    kind: "person",
    name: "Governed Author",
    role: "Author",
    profileType: "author",
    expertise: ["Governance"],
    ownership,
  });
  await seedDocument(ids.organization, "organization", null, null, {
    kind: "organization",
    name: "Governed Organization",
    organizationType: "institution",
    capabilities: ["Assurance"],
    ownership,
  });
  await seedDocument(ids.claim, "claim", null, null, {
    kind: "claim",
    content: {
      statement: "A supported public claim.",
      context: "Validated in the delivery fixture.",
      internalOnly: "must not be projected",
    },
    ownership,
  });
  await seedDocument(ids.proof, "proof", null, null, {
    kind: "proof",
    content: {
      title: "Verified outcome",
      value: "42%",
      context: "Governed evidence.",
      privateNotes: "must not be projected",
    },
    ownership,
  });
  await seedDocument(ids.draftPerson, "person", null, null, {
    kind: "person",
    name: "Draft Person",
    profileType: "author",
    expertise: [],
    ownership,
  }, "draft");
  await seedDocument(ids.archivedPerson, "person", null, null, {
    kind: "person",
    name: "Archived Person",
    profileType: "author",
    expertise: [],
    ownership,
  });
  await db.update(cmsDocumentsTable).set({ archivedAt: new Date() })
    .where(eq(cmsDocumentsTable.id, ids.archivedPerson));

  await seedMedia(ids.image, "image", "published", {
    objectPath: `private/cms/${prefix}/image.webp`,
    contentType: "image/webp",
  });
  await seedMedia(ids.download, "document", "published", {
    externalUrl: "https://cdn.example.test/governed-report.pdf",
    contentType: "application/pdf",
  });
  await seedMedia(ids.unpublishedMedia, "image", "draft", {
    objectPath: `private/cms/${prefix}/draft.webp`,
    contentType: "image/webp",
  });
  await seedMedia(ids.expiredMedia, "image", "published", {
    objectPath: `private/cms/${prefix}/expired.webp`,
    contentType: "image/webp",
  }, new Date(Date.now() - 60_000));

  const pageRevisionId = await seedDocument(ids.page, "page", `${prefix}-page`, "landing", {
    kind: "page",
    title: "Hydrated governed page",
    routeKind: "landing",
    canonicalSlug: `${prefix}-page`,
    topics: [],
    sections: [
      {
        id: `${prefix}-claims`,
        type: "claims",
        heading: "Claims",
        claims: [{ id: ids.claim }, { id: ids.proof }, { id: ids.draftPerson }],
      },
      {
        id: `${prefix}-metrics`,
        type: "metrics",
        heading: "Proof",
        proof: [{ id: ids.proof }],
      },
      {
        id: `${prefix}-references`,
        type: "referenceGrid",
        heading: "People and organizations",
        items: [
          { id: ids.person },
          { id: ids.organization },
          { id: ids.draftPerson },
          { id: ids.archivedPerson },
          { id: ids.claim },
        ],
      },
      {
        id: `${prefix}-media`,
        type: "media",
        heading: "Published media",
        media: { id: ids.image },
      },
      {
        id: `${prefix}-unpublished`,
        type: "media",
        heading: "Unpublished media",
        media: { id: ids.unpublishedMedia },
      },
      {
        id: `${prefix}-expired`,
        type: "hero",
        heading: "Expired media",
        media: { id: ids.expiredMedia },
      },
      {
        id: `${prefix}-download`,
        type: "downloadGate",
        heading: "Download",
        asset: { id: ids.download },
      },
      {
        id: `${prefix}-quote`,
        type: "quote",
        heading: "Wrong-kind quote attribution",
        quote: "This attribution must fail closed.",
        person: { id: ids.proof },
      },
    ],
    seo: {
      noIndex: false,
      openGraphImage: { id: ids.image },
    },
    ownership,
  });
  await db.insert(cmsMediaReferencesTable).values([
    { revisionId: pageRevisionId, mediaId: ids.image, mediaVersion: 1, fieldPath: "/sections/3/media" },
    { revisionId: pageRevisionId, mediaId: ids.unpublishedMedia, mediaVersion: 1, fieldPath: "/sections/4/media" },
    { revisionId: pageRevisionId, mediaId: ids.expiredMedia, mediaVersion: 1, fieldPath: "/sections/5/media" },
    { revisionId: pageRevisionId, mediaId: ids.download, mediaVersion: 1, fieldPath: "/sections/6/asset" },
    { revisionId: pageRevisionId, mediaId: ids.image, mediaVersion: 1, fieldPath: "/seo/openGraphImage" },
  ]);

  const publicationRevisionId = await seedDocument(
    ids.publication,
    "publication",
    `${prefix}-publication`,
    null,
    {
      kind: "publication",
      title: "Hydrated governed publication",
      canonicalSlug: `${prefix}-publication`,
      format: "report",
      body: [],
      authors: [{ id: ids.person }, { id: ids.draftPerson }],
      topics: ["governance"],
      media: { id: ids.image },
      download: { id: ids.download },
      gated: false,
      ownership,
    },
  );
  await db.insert(cmsMediaReferencesTable).values([
    { revisionId: publicationRevisionId, mediaId: ids.image, mediaVersion: 1, fieldPath: "/media" },
    { revisionId: publicationRevisionId, mediaId: ids.download, mediaVersion: 1, fieldPath: "/download" },
  ]);

  const envelope = await getPublishedPage("uae", `${prefix}-page`, "landing");
  assert.equal(envelope.page?.title, "Hydrated governed page");
  const sections = envelope.page?.sections ?? [];
  assert.deepEqual(sections[0]?.claims, [{
    id: ids.claim,
    _type: "claim",
    statement: "A supported public claim.",
    context: "Validated in the delivery fixture.",
  }]);
  assert.deepEqual(sections[1]?.proof, [{
    id: ids.proof,
    _type: "proof",
    title: "Verified outcome",
    value: "42%",
    context: "Governed evidence.",
  }]);
  assert.deepEqual(
    (sections[2]?.items as Array<{ _type: string; name: string }>).map(({ _type, name }) => ({ _type, name })),
    [
      { _type: "person", name: "Governed Author" },
      { _type: "organization", name: "Governed Organization" },
    ],
  );
  assert.equal((sections[3]?.media as { url: string }).url, `/api/cms/media/${ids.image}/versions/1`);
  assert.equal("media" in (sections[4] ?? {}), false);
  assert.equal("media" in (sections[5] ?? {}), false);
  assert.equal((sections[6]?.asset as { url: string }).url, "https://cdn.example.test/governed-report.pdf");
  assert.equal("person" in (sections[7] ?? {}), false);
  assert.equal((envelope.page?.seo?.openGraphImage as { url: string }).url, `/api/cms/media/${ids.image}/versions/1`);

  const publication = await getPublishedPublications("uae", `${prefix}-publication`);
  assert.equal(publication?.authors.length, 1);
  assert.equal(publication?.authors[0]?.name, "Governed Author");
  assert.equal(publication?.media?.url, `/api/cms/media/${ids.image}/versions/1`);
  assert.equal(publication?.download?.url, "https://cdn.example.test/governed-report.pdf");

  const serialized = JSON.stringify({ envelope, publication });
  assert.equal(serialized.includes("private/cms/"), false);
  assert.equal(serialized.includes("internalOnly"), false);
  assert.equal(serialized.includes("privateNotes"), false);
  assert.equal(serialized.includes(ids.draftPerson), false);
  assert.equal(serialized.includes(ids.archivedPerson), false);
  assert.equal(serialized.includes(ids.unpublishedMedia), false);
  assert.equal(serialized.includes(ids.expiredMedia), false);
  assert.equal(serialized.includes("\"ownership\""), false);
});