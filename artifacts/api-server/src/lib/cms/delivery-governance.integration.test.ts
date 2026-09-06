import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { and, eq, inArray } from "drizzle-orm";
import {
  cmsDocumentsTable,
  cmsMarketEditionsTable,
  cmsOutboxTable,
  cmsRevisionsTable,
  cmsWorkflowEventsTable,
  db,
  pool,
} from "@workspace/db";
import {
  getPublishedPage,
  getPublishedPublications,
  getPreviewRevision,
  getRuntime,
  getSitemap,
  sitemapPath,
  type FallbackMode,
  type PublicationState,
  type RouteKind,
} from "./adapter";
import {
  CmsForbiddenError,
  createDocument,
  updateEditionDraft,
} from "./editorial";
import { previewTokenIdentity } from "../../routes/cms";
import { signPreviewToken, verifyPreviewToken, type CmsMarket } from "./security";
import type { WorkflowPrincipal } from "./workflow";

const prefix = "test-cms-delivery-governance";
const ids = {
  navigation: `${prefix}-navigation`,
  navigationOverride: `${prefix}-navigation-override`,
  navigationUnavailable: `${prefix}-navigation-unavailable`,
  navigationMalformed: `${prefix}-navigation-malformed`,
  publication: `${prefix}-publication`,
  home: `${prefix}-home`,
  service: `${prefix}-service`,
  platform: `${prefix}-platform`,
  industry: `${prefix}-industry`,
  roleAuthor: `${prefix}-role-author`,
  roleRegional: `${prefix}-role-regional`,
  roleAdmin: `${prefix}-role-admin`,
  deniedReviewer: `${prefix}-denied-reviewer`,
  deniedPublisher: `${prefix}-denied-publisher`,
};
const allIds = Object.values(ids);
const owner = { owner: { id: `${prefix}-owner` }, sensitivity: "public" as const };

type SeedEdition = {
  market: CmsMarket;
  fallbackMode: FallbackMode;
  publicationState: PublicationState;
  localizedSlug: string;
  parityComplete?: boolean;
  content: Record<string, unknown>;
};

async function clean() {
  await db.delete(cmsWorkflowEventsTable).where(inArray(
    cmsWorkflowEventsTable.target,
    allIds.map((id) => `document:${id}`),
  ));
  await db.delete(cmsOutboxTable).where(inArray(cmsOutboxTable.aggregateId, allIds));
  await db.delete(cmsDocumentsTable).where(inArray(cmsDocumentsTable.id, allIds));
}

async function seedDocument(
  id: string,
  kind: string,
  canonicalSlug: string,
  routeKind: RouteKind | null,
  editions: SeedEdition[],
) {
  await db.insert(cmsDocumentsTable).values({ id, kind, canonicalSlug, routeKind, ownerId: `${prefix}-owner` });
  for (const seed of editions) {
    const payload = {
      schemaVersion: 1 as const,
      documentId: id,
      market: seed.market,
      fallbackMode: seed.fallbackMode,
      content: seed.content,
    };
    const [edition] = await db.insert(cmsMarketEditionsTable).values({
      documentId: id,
      market: seed.market,
      fallbackMode: seed.fallbackMode,
      publicationState: seed.publicationState,
      localizedSlug: seed.localizedSlug,
      parityComplete: seed.parityComplete ?? true,
    }).returning();
    const [revision] = await db.insert(cmsRevisionsTable).values({
      editionId: edition!.id,
      revisionNumber: 1,
      payload,
      contentDigest: `integration:${id}:${seed.market}`,
      createdByPrincipalId: `${prefix}-owner`,
      reason: "integration:seed",
    }).returning();
    await db.update(cmsMarketEditionsTable).set({
      draftRevisionId: revision!.id,
      liveRevisionId: revision!.id,
    }).where(eq(cmsMarketEditionsTable.id, edition!.id));
  }
}

function navigationContent(label: string, targetId = ids.service) {
  return {
    kind: "navigation",
    content: {
      placement: "primary",
      items: [{ label, internal: { id: targetId } }],
    },
    ownership: owner,
  };
}

function publicationContent(title: string, slug: string) {
  return {
    kind: "publication",
    title,
    canonicalSlug: slug,
    format: "article",
    body: [],
    authors: [{ id: `${prefix}-author` }],
    topics: [],
    ownership: owner,
  };
}

function pagePayload(documentId: string, slug: string, routeKind: RouteKind, title: string) {
  return {
    schemaVersion: 1,
    documentId,
    market: "uae",
    fallbackMode: "canonical",
    content: {
      kind: "page",
      title,
      routeKind,
      canonicalSlug: slug,
      topics: [],
      sections: [],
      ownership: owner,
    },
  };
}

const principal = (id: string, role: WorkflowPrincipal["role"]): WorkflowPrincipal => ({
  id,
  role,
  markets: "all",
});

before(clean);
after(async () => {
  await clean();
  await pool.end();
});

test("seeded PostgreSQL delivery and trusted writes enforce governance end to end", async () => {
  await seedDocument(ids.navigation, "navigation", `${prefix}-navigation`, null, [
    {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      localizedSlug: `${prefix}-navigation`,
      content: navigationContent("Canonical navigation"),
    },
    {
      market: "ksa",
      fallbackMode: "uaeFallback",
      publicationState: "published",
      localizedSlug: `${prefix}-navigation`,
      content: navigationContent("Unapproved KSA navigation"),
    },
  ]);
  await seedDocument(ids.navigationOverride, "navigation", `${prefix}-navigation-override`, null, [
    {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      localizedSlug: `${prefix}-navigation-override`,
      content: navigationContent("Canonical override candidate"),
    },
    {
      market: "ksa",
      fallbackMode: "override",
      publicationState: "published",
      localizedSlug: `${prefix}-navigation-override`,
      content: navigationContent("Approved KSA navigation"),
    },
  ]);
  await seedDocument(ids.navigationUnavailable, "navigation", `${prefix}-navigation-unavailable`, null, [
    {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      localizedSlug: `${prefix}-navigation-unavailable`,
      content: navigationContent("Canonical unavailable candidate"),
    },
    {
      market: "europe",
      fallbackMode: "unavailable",
      publicationState: "published",
      localizedSlug: `${prefix}-navigation-unavailable`,
      content: navigationContent("Unavailable Europe navigation"),
    },
  ]);
  await seedDocument(ids.navigationMalformed, "navigation", `${prefix}-navigation-malformed`, null, [{
    market: "uae",
    fallbackMode: "canonical",
    publicationState: "published",
    localizedSlug: `${prefix}-navigation-malformed`,
    content: {
      kind: "navigation",
      content: { placement: "primary", items: "not-an-array" },
      ownership: owner,
    },
  }]);
  await seedDocument(ids.publication, "publication", `${prefix}-publication`, null, [
    {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      localizedSlug: `${prefix}-publication`,
      content: publicationContent("Canonical publication", `${prefix}-publication`),
    },
    {
      market: "ksa",
      fallbackMode: "uaeFallback",
      publicationState: "published",
      localizedSlug: `${prefix}-publication-ksa`,
      content: publicationContent("Unapproved KSA publication", `${prefix}-publication`),
    },
    {
      market: "turkiye",
      fallbackMode: "override",
      publicationState: "published",
      localizedSlug: `${prefix}-publication-tr`,
      content: publicationContent("Approved Türkiye publication", `${prefix}-publication-tr`),
    },
    {
      market: "europe",
      fallbackMode: "unavailable",
      publicationState: "published",
      localizedSlug: `${prefix}-publication-eu`,
      content: publicationContent("Unavailable Europe publication", `${prefix}-publication-eu`),
    },
  ]);
  await seedDocument(ids.home, "page", `${prefix}-home`, "home", [{
    market: "uae",
    fallbackMode: "canonical",
    publicationState: "published",
    localizedSlug: `${prefix}-home`,
    content: pagePayload(ids.home, `${prefix}-home`, "home", "Integration home").content,
  }]);
  await seedDocument(ids.service, "page", `${prefix}-service`, "service", [{
    market: "uae",
    fallbackMode: "canonical",
    publicationState: "published",
    localizedSlug: `${prefix}-service`,
    content: pagePayload(ids.service, `${prefix}-service`, "service", "Integration service").content,
  }, {
    market: "ksa",
    fallbackMode: "uaeFallback",
    publicationState: "published",
    localizedSlug: `${prefix}-service-ksa`,
    content: pagePayload(ids.service, `${prefix}-service`, "service", "Unapproved KSA service").content,
  }]);
  await seedDocument(ids.platform, "page", `${prefix}-platform`, "platform", [{
    market: "uae",
    fallbackMode: "canonical",
    publicationState: "published",
    localizedSlug: `${prefix}-platform`,
    content: pagePayload(ids.platform, `${prefix}-platform`, "platform", "Integration platform").content,
  }]);
  await seedDocument(ids.industry, "page", `${prefix}-industry`, "industry", [{
    market: "uae",
    fallbackMode: "canonical",
    publicationState: "published",
    localizedSlug: `${prefix}-industry`,
    content: pagePayload(ids.industry, `${prefix}-industry`, "industry", "Integration industry").content,
  }]);

  const runtime = await getRuntime("ksa");
  const navigation = runtime.navigation.find((item) => item.id === ids.navigation);
  assert.equal(navigation?.placement, "primary");
  assert.equal((navigation?.items as Array<{ label: string }>)[0]?.label, "Canonical navigation");
  assert.deepEqual((navigation?.items as Array<{ internal: Record<string, unknown> }>)[0]?.internal, {
    id: ids.service,
    _type: "page",
    slug: `${prefix}-service-ksa`,
    routeKind: "service",
  });
  assert.equal("content" in (navigation ?? {}), false);
  assert.equal(
    runtime.navigation.find((item) => item.id === ids.navigationOverride)?.items[0]?.label,
    "Approved KSA navigation",
  );
  assert.equal(
    (await getRuntime("europe")).navigation.some((item) => item.id === ids.navigationUnavailable),
    false,
  );
  assert.equal(
    (await getRuntime("uae")).navigation.some((item) => item.id === ids.navigationMalformed),
    false,
  );

  let publications = await getPublishedPublications("ksa");
  assert.equal(publications.find((item) => item.id === ids.publication)?.title, "Canonical publication");
  assert.equal(publications.find((item) => item.id === ids.publication)?.slug, `${prefix}-publication-ksa`);
  assert.equal(
    (await getPublishedPublications("ksa", `${prefix}-publication-ksa`))?.title,
    "Canonical publication",
  );
  publications = await getPublishedPublications("turkiye");
  assert.equal(publications.find((item) => item.id === ids.publication)?.title, "Approved Türkiye publication");
  publications = await getPublishedPublications("europe");
  assert.equal(publications.some((item) => item.id === ids.publication), false);
  const fallbackPage = await getPublishedPage("ksa", `${prefix}-service-ksa`, "service");
  assert.equal(fallbackPage.page?.title, "Integration service");
  assert.equal(fallbackPage.page?.slug, `${prefix}-service-ksa`);
  assert.equal(fallbackPage.page?.market, "ksa");
  assert.equal(fallbackPage.meta.resolvedMarket, "uae");
  assert.equal(fallbackPage.meta.marketFallback, true);

  const [ksaPreviewBinding] = await db.select({
    edition: cmsMarketEditionsTable,
    revision: cmsRevisionsTable,
  }).from(cmsMarketEditionsTable)
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.draftRevisionId))
    .where(and(
      eq(cmsMarketEditionsTable.documentId, ids.service),
      eq(cmsMarketEditionsTable.market, "ksa"),
    )).limit(1);
  assert.ok(ksaPreviewBinding);
  const preview = await getPreviewRevision(
    ids.service,
    ksaPreviewBinding.edition.id,
    ksaPreviewBinding.revision.id,
  );
  assert.equal(preview?.page?.revision, ksaPreviewBinding.revision.id);
  assert.equal(preview?.page?.slug, `${prefix}-service-ksa`);
  const previewContent = (ksaPreviewBinding.revision.payload as {
    content: { canonicalSlug: string; routeKind: RouteKind };
  }).content;
  assert.equal(previewContent.canonicalSlug, `${prefix}-service`);
  const previewSecret = "integration-preview-secret-that-is-at-least-32-characters";
  const previewIdentity = previewTokenIdentity("ksa", ksaPreviewBinding.edition, previewContent);
  assert.ok(previewIdentity);
  const previewToken = signPreviewToken(previewIdentity, previewSecret, 100, 60);
  const previewClaims = verifyPreviewToken(previewToken, [previewSecret], 120);
  assert.deepEqual(previewClaims && {
    market: previewClaims.market,
    slug: previewClaims.slug,
    routeKind: previewClaims.routeKind,
  }, {
    market: preview?.page?.market,
    slug: preview?.page?.slug,
    routeKind: preview?.page?.routeKind,
  });

  const sitemap = await getSitemap("https://example.test");
  assert.ok(sitemap.includes("https://example.test/"));
  assert.ok(sitemap.includes(`https://example.test/what-we-do/${prefix}-service`));
  assert.ok(sitemap.includes(`https://example.test/what-we-do/${prefix}-service-ksa`));
  assert.ok(sitemap.includes(`https://example.test/platforms/${prefix}-platform`));
  assert.ok(sitemap.includes(`https://example.test/industries/${prefix}-industry`));
  assert.ok(sitemap.includes(`https://example.test/insights/${prefix}-publication`));
  assert.ok(sitemap.includes(`https://example.test/insights/${prefix}-publication-ksa`));
  assert.ok(sitemap.every((url) => url.startsWith("https://example.test/")));
  assert.equal(sitemap.filter((url) => url === `https://example.test/insights/${prefix}-publication`).length, 1);
  assert.equal(sitemapPath("service", "what-we-do"), "/what-we-do");
  assert.equal(sitemapPath("platform", "platforms"), "/platforms");
  assert.equal(sitemapPath("industry", "industries"), "/industries");
  assert.equal(sitemapPath("caseStudy", "work"), "/work");
  assert.equal(sitemapPath("about", "about"), "/about");
  assert.equal(sitemapPath("contact", "contact"), "/contact");
  assert.equal(sitemapPath("landing", "value-scan"), "/value-scan");
  assert.equal(sitemapPath("landing", "unapproved-root"), undefined);
  assert.equal(sitemapPath("legal", "privacy"), undefined);

  await db.update(cmsMarketEditionsTable).set({ publicationState: "draft" })
    .where(and(
      eq(cmsMarketEditionsTable.documentId, ids.navigation),
      eq(cmsMarketEditionsTable.market, "uae"),
    ));
  assert.equal((await getRuntime("ksa")).navigation.some((item) => item.id === ids.navigation), false);
  await db.update(cmsMarketEditionsTable).set({ publicationState: "published" })
    .where(and(
      eq(cmsMarketEditionsTable.documentId, ids.navigation),
      eq(cmsMarketEditionsTable.market, "uae"),
    ));

  await db.update(cmsMarketEditionsTable).set({ publicationState: "draft" }).where(and(
    eq(cmsMarketEditionsTable.documentId, ids.publication),
    eq(cmsMarketEditionsTable.market, "uae"),
  ));
  assert.equal((await getPublishedPublications("ksa")).some((item) => item.id === ids.publication), false);
  await db.update(cmsMarketEditionsTable).set({ publicationState: "published" }).where(and(
    eq(cmsMarketEditionsTable.documentId, ids.publication),
    eq(cmsMarketEditionsTable.market, "uae"),
  ));

  const deniedPayloads = [
    [principal(`${prefix}-reviewer`, "reviewer"), ids.deniedReviewer],
    [principal(`${prefix}-publisher`, "publisher"), ids.deniedPublisher],
  ] as const;
  for (const [actor, documentId] of deniedPayloads) {
    const payload = pagePayload(documentId, documentId, "landing", "Denied document");
    await assert.rejects(() => createDocument(actor, documentId, payload), CmsForbiddenError);
    await assert.rejects(
      () => updateEditionDraft(actor, ids.home, "uae", 1, pagePayload(ids.home, `${prefix}-home`, "home", "Denied update")),
      CmsForbiddenError,
    );
  }

  const allowed = [
    [principal(`${prefix}-author`, "author"), ids.roleAuthor],
    [principal(`${prefix}-regional`, "regionalEditor"), ids.roleRegional],
    [principal(`${prefix}-admin`, "admin"), ids.roleAdmin],
  ] as const;
  for (const [actor, documentId] of allowed) {
    const created = await createDocument(actor, documentId, pagePayload(documentId, documentId, "landing", "Allowed document"));
    assert.equal(created.document.id, documentId);
    const updated = await updateEditionDraft(
      actor,
      documentId,
      "uae",
      1,
      pagePayload(documentId, documentId, "landing", "Allowed update"),
    );
    assert.equal(updated.edition.version, 2);
  }
});