import { and, desc, eq, inArray, isNull } from "drizzle-orm";
import {
  cmsDocumentsTable,
  cmsMarketEditionsTable,
  cmsMediaAssetsTable,
  cmsMediaReferencesTable,
  cmsMediaVersionsTable,
  cmsRevisionsTable,
  db,
} from "@workspace/db";
import {
  cmsEditionPayloadSchema,
  type CmsRevisionPayload,
} from "./contracts";
import { mediaReferences } from "./media-references";
import { resolvePublicEdition } from "./public-resolution";
import { CANONICAL_MARKET, type CmsMarket } from "./security";

type PageContent = Extract<CmsRevisionPayload, { kind: "page" }>;
type PublicationContent = Extract<CmsRevisionPayload, { kind: "publication" }>;
type PublicProjection = Record<string, unknown> & { id: string; _type: string };
type PublicMedia = Record<string, unknown> & { id: string; kind: string; url: string };

const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const string = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
const safeHttps = (value: unknown) => {
  if (typeof value !== "string") return;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : undefined;
  } catch {
    return;
  }
};

function linkDocumentIds(content: PageContent | PublicationContent): string[] {
  if (content.kind === "publication") return content.authors.map((author) => author.id);
  return content.sections.flatMap((section) => {
    if (section.type === "hero") {
      return section.primaryAction?.internal ? [section.primaryAction.internal.id] : [];
    }
    if (section.type === "cta") return section.action.internal ? [section.action.internal.id] : [];
    if (section.type === "claims") return section.claims.map((claim) => claim.id);
    if (section.type === "metrics") return section.proof.map((proof) => proof.id);
    if (section.type === "quote") return section.person ? [section.person.id] : [];
    if (section.type === "referenceGrid") return section.items.map((item) => item.id);
    return [];
  });
}

function narrowGenericProjection(
  id: string,
  kind: "claim" | "proof" | "referenceSource" | "globalSettings",
  content: Record<string, unknown>,
): PublicProjection {
  const projection: PublicProjection = { id, _type: kind };
  for (const field of ["title", "value", "statement", "context", "url"]) {
    const value = string(content[field]);
    if (value) projection[field] = value;
  }
  return projection;
}

async function resolveLiveDocumentProjections(
  referenceIds: readonly string[],
  market: CmsMarket,
  now: Date,
): Promise<Map<string, PublicProjection>> {
  const ids = [...new Set(referenceIds)].slice(0, 200);
  if (!ids.length) return new Map();
  const markets = market === CANONICAL_MARKET ? [CANONICAL_MARKET] : [market, CANONICAL_MARKET];
  const rows = await db.select({
    document: cmsDocumentsTable,
    edition: cmsMarketEditionsTable,
    revision: cmsRevisionsTable,
  })
    .from(cmsDocumentsTable)
    .innerJoin(cmsMarketEditionsTable, eq(cmsMarketEditionsTable.documentId, cmsDocumentsTable.id))
    .innerJoin(cmsRevisionsTable, eq(cmsRevisionsTable.id, cmsMarketEditionsTable.liveRevisionId))
    .where(and(
      inArray(cmsDocumentsTable.id, ids),
      inArray(cmsMarketEditionsTable.market, markets),
      eq(cmsDocumentsTable.contentClass, "public"),
      isNull(cmsDocumentsTable.archivedAt),
    ));
  const byDocumentMarket = new Map(rows.map((row) => [`${row.document.id}:${row.edition.market}`, row]));
  const projections = new Map<string, PublicProjection>();
  for (const id of ids) {
    const requested = byDocumentMarket.get(`${id}:${market}`);
    const uae = byDocumentMarket.get(`${id}:${CANONICAL_MARKET}`);
    if (!requested) continue;
    const delivery = resolvePublicEdition(requested.edition, uae?.edition, market, now);
    if (delivery === "unavailable") continue;
    const source = delivery === "uae" ? uae : requested;
    if (!source) continue;
    const parsed = cmsEditionPayloadSchema.safeParse(source.revision.payload);
    if (!parsed.success ||
      parsed.data.documentId !== source.document.id ||
      parsed.data.market !== source.edition.market ||
      parsed.data.fallbackMode !== source.edition.fallbackMode ||
      parsed.data.content.kind !== source.document.kind ||
      parsed.data.content.ownership.sensitivity !== "public") continue;
    const content = parsed.data.content;
    const slug = requested.edition.localizedSlug ?? source.document.canonicalSlug ?? undefined;
    if (content.kind === "page") {
      if (!source.document.routeKind ||
        ((source.edition.fallbackMode === "canonical" || source.edition.fallbackMode === "override") &&
          !source.edition.parityComplete)) continue;
      projections.set(id, {
        id,
        _type: "page",
        ...(slug ? { slug } : {}),
        routeKind: source.document.routeKind,
        title: content.title,
        ...(content.summary ? { summary: content.summary } : {}),
      });
    } else if (content.kind === "publication") {
      projections.set(id, {
        id,
        _type: "publication",
        ...(slug ? { slug } : {}),
        title: content.title,
        ...(content.dek ? { dek: content.dek } : {}),
      });
    } else if (content.kind === "person") {
      projections.set(id, {
        id,
        _type: "person",
        name: content.name,
        ...(content.role ? { role: content.role } : {}),
        ...(content.bio ? { bio: content.bio } : {}),
        expertise: content.expertise,
      });
    } else if (content.kind === "organization") {
      projections.set(id, {
        id,
        _type: "organization",
        name: content.name,
        ...(content.description ? { description: content.description } : {}),
        capabilities: content.capabilities,
        ...(content.website ? { website: content.website } : {}),
      });
    } else if (["claim", "proof", "referenceSource", "globalSettings"].includes(content.kind) &&
      record(content.content)) {
      projections.set(
        id,
        narrowGenericProjection(
          id,
          content.kind as "claim" | "proof" | "referenceSource" | "globalSettings",
          content.content,
        ),
      );
    }
  }
  return projections;
}

async function resolvePublishedMedia(
  mediaIds: readonly string[],
  revisionId: string,
  now: Date,
): Promise<Map<string, PublicMedia>> {
  const ids = [...new Set(mediaIds)].slice(0, 100);
  if (!ids.length) return new Map();
  const indexed = await db.select({
    mediaId: cmsMediaReferencesTable.mediaId,
    mediaVersion: cmsMediaReferencesTable.mediaVersion,
  })
    .from(cmsMediaReferencesTable)
    .where(and(
      eq(cmsMediaReferencesTable.revisionId, revisionId),
      inArray(cmsMediaReferencesTable.mediaId, ids),
    ));
  const selectedVersions = new Map<string, Set<number>>();
  for (const item of indexed) {
    if (!item.mediaVersion) continue;
    const versions = selectedVersions.get(item.mediaId) ?? new Set<number>();
    versions.add(item.mediaVersion);
    selectedVersions.set(item.mediaId, versions);
  }
  const approvedIds = [...selectedVersions.entries()]
    .filter(([, versions]) => versions.size === 1)
    .map(([mediaId]) => mediaId);
  if (!approvedIds.length) return new Map();
  const [assets, versions] = await Promise.all([
    db.select().from(cmsMediaAssetsTable)
      .where(and(
        inArray(cmsMediaAssetsTable.id, approvedIds),
        eq(cmsMediaAssetsTable.lifecycleState, "published"),
      )),
    db.select().from(cmsMediaVersionsTable)
      .where(inArray(cmsMediaVersionsTable.mediaId, approvedIds))
      .orderBy(desc(cmsMediaVersionsTable.version)),
  ]);
  const indexedVersion = new Map(versions.map((version) => [`${version.mediaId}:${version.version}`, version]));
  const media = new Map<string, PublicMedia>();
  for (const asset of assets) {
    if (asset.rightsExpiresAt && asset.rightsExpiresAt <= now) continue;
    const selectedVersion = [...(selectedVersions.get(asset.id) ?? [])][0];
    const version = selectedVersion ? indexedVersion.get(`${asset.id}:${selectedVersion}`) : undefined;
    if (!version) continue;
    const externalUrl = safeHttps(version.externalUrl);
    const url = externalUrl ?? (version.objectPath
      ? `/api/cms/media/${encodeURIComponent(asset.id)}/versions/${version.version}`
      : undefined);
    if (!url) continue;
    media.set(asset.id, {
      id: asset.id,
      kind: asset.kind,
      url,
      title: asset.title,
      ...(asset.altText ? { altText: asset.altText } : {}),
      decorative: asset.decorative,
      ...(asset.caption ? { caption: asset.caption } : {}),
    });
  }
  return media;
}

function hydrateLink(
  link: { label: string; internal?: { id: string }; externalUrl?: string; children?: unknown[] },
  projections: ReadonlyMap<string, PublicProjection>,
): Record<string, unknown> | undefined {
  if (link.externalUrl) return { label: link.label, externalUrl: link.externalUrl };
  if (!link.internal) return;
  const target = projections.get(link.internal.id);
  if (!target || !string(target.slug) || !["page", "publication"].includes(target._type)) return;
  return {
    label: link.label,
    internal: {
      id: target.id,
      _type: target._type,
      slug: target.slug,
      ...(target.routeKind ? { routeKind: target.routeKind } : {}),
    },
  };
}

function publicSeo(
  seo: PageContent["seo"] | PublicationContent["seo"],
  media: ReadonlyMap<string, PublicMedia>,
) {
  if (!seo) return;
  return {
    ...(seo.metaTitle ? { metaTitle: seo.metaTitle } : {}),
    ...(seo.metaDescription ? { metaDescription: seo.metaDescription } : {}),
    ...(seo.canonicalUrl ? { canonicalUrl: seo.canonicalUrl } : {}),
    noIndex: seo.noIndex,
    ...(seo.structuredDataType ? { structuredDataType: seo.structuredDataType } : {}),
    ...(seo.openGraphImage && media.has(seo.openGraphImage.id)
      ? { openGraphImage: media.get(seo.openGraphImage.id)! }
      : {}),
  };
}

export async function hydratePublicPage(
  content: PageContent,
  revisionId: string,
  market: CmsMarket,
  now = new Date(),
): Promise<PageContent> {
  const mediaIds = mediaReferences(content).map((item) => item.mediaId);
  const [projections, media] = await Promise.all([
    resolveLiveDocumentProjections(linkDocumentIds(content), market, now),
    resolvePublishedMedia(mediaIds, revisionId, now),
  ]);
  const sections = content.sections.map((section): Record<string, unknown> => {
    if (section.type === "hero") {
      const { primaryAction: _primaryAction, media: _media, ...publicSection } = section;
      return {
        ...publicSection,
        ...(section.primaryAction ? { primaryAction: hydrateLink(section.primaryAction, projections) } : {}),
        ...(section.media && media.has(section.media.id) ? { media: media.get(section.media.id)! } : {}),
      };
    }
    if (section.type === "cta") return { ...section, action: hydrateLink(section.action, projections) };
    if (section.type === "claims") {
      return { ...section, claims: section.claims.map((item) => projections.get(item.id)).filter((item) => item?._type === "claim") };
    }
    if (section.type === "metrics") {
      return { ...section, proof: section.proof.map((item) => projections.get(item.id)).filter((item) => item?._type === "proof") };
    }
    if (section.type === "quote") {
      const { person: _person, ...publicSection } = section;
      const person = section.person ? projections.get(section.person.id) : undefined;
      return { ...publicSection, ...(person?._type === "person" ? { person } : {}) };
    }
    if (section.type === "referenceGrid") {
      return {
        ...section,
        items: section.items
          .map((item) => projections.get(item.id))
          .filter((item) => item && ["person", "organization", "page", "publication"].includes(item._type)),
      };
    }
    if (section.type === "media") {
      const { media: _media, ...publicSection } = section;
      const resolved = media.get(section.media.id);
      return { ...publicSection, ...(resolved ? { media: resolved } : {}) };
    }
    if (section.type === "downloadGate") {
      const { asset: _asset, ...publicSection } = section;
      const asset = section.asset ? media.get(section.asset.id) : undefined;
      return { ...publicSection, ...(asset ? { asset } : {}) };
    }
    return section;
  });
  return {
    ...content,
    sections: sections as PageContent["sections"],
    ...(content.seo ? { seo: publicSeo(content.seo, media) as PageContent["seo"] } : {}),
  };
}

export async function hydratePublicPublication(
  content: PublicationContent,
  revisionId: string,
  market: CmsMarket,
  now = new Date(),
) {
  const mediaIds = mediaReferences(content).map((item) => item.mediaId);
  const [projections, media] = await Promise.all([
    resolveLiveDocumentProjections(linkDocumentIds(content), market, now),
    resolvePublishedMedia(mediaIds, revisionId, now),
  ]);
  return {
    kind: "publication" as const,
    title: content.title,
    format: content.format,
    ...(content.dek ? { dek: content.dek } : {}),
    body: content.body,
    authors: content.authors
      .map((author) => projections.get(author.id))
      .filter((author) => author?._type === "person"),
    topics: content.topics,
    ...(content.media && media.has(content.media.id) ? { media: media.get(content.media.id)! } : {}),
    ...(content.download && media.has(content.download.id) ? { download: media.get(content.download.id)! } : {}),
    gated: content.gated,
    ...(content.eventStartsAt ? { eventStartsAt: content.eventStartsAt } : {}),
    ...(content.publishedAt ? { publishedAt: content.publishedAt } : {}),
    ...(content.readingMinutes ? { readingMinutes: content.readingMinutes } : {}),
    ...(content.seo ? { seo: publicSeo(content.seo, media) } : {}),
  };
}