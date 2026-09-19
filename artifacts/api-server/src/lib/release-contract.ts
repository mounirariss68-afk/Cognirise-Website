import { createHash } from "node:crypto";
import { pool } from "@workspace/db";
import {
  CMS_RELEASE_REGISTRY,
  collectCmsMediaReferences,
  cmsPublicRoute,
  validateCmsSnapshotForDelivery,
  type CmsDocumentKind,
  type DestinationReference,
} from "@workspace/api-zod";
import { navigationCandidates } from "./navigation-policy";
import type { Queryable } from "./cms";

const digest = (value: unknown) => createHash("sha256")
  .update(JSON.stringify(value, (_key, item) =>
    item && typeof item === "object" && !Array.isArray(item)
      ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b)))
      : item))
  .digest("hex");

function collectDestinationReferences(value: unknown, path = "content"): Array<{ path: string; ref: DestinationReference }> {
  if (Array.isArray(value)) return value.flatMap((item, index) => collectDestinationReferences(item, `${path}.${index}`));
  if (!value || typeof value !== "object") return [];
  const record = value as Record<string, unknown>;
  const current = typeof record.destinationId === "string"
    ? [{ path, ref: { destinationId: record.destinationId, ...(typeof record.anchor === "string" ? { anchor: record.anchor } : {}), ...(record.query && typeof record.query === "object" ? { query: record.query as Record<string, string> } : {}) } }]
    : [];
  return current.concat(Object.entries(record).flatMap(([key, item]) =>
    key === "destinationId" || key === "anchor" || key === "query" ? [] : collectDestinationReferences(item, `${path}.${key}`)));
}

export function releaseInventory() {
  const routes = CMS_RELEASE_REGISTRY.routes;
  return {
    registryVersion: CMS_RELEASE_REGISTRY.version,
    routes,
    aliasesAndRedirects: routes.filter((route) => route.routeType === "alias" || route.routeType === "redirect"),
    compiledOnly: routes.filter((route) => route.compiledOnly),
    unrepresented: [],
    kinds: CMS_RELEASE_REGISTRY.kinds,
    parity: {
      complete: routes.every((route) => route.destinationId && route.rendererKey),
      compiledOnlyCount: routes.filter((route) => route.compiledOnly).length,
      unrepresentedCount: 0,
    },
  };
}

export async function buildReleaseCandidate(
  executor: Queryable,
  market: string,
  locale: string,
  actorId: string,
) {
  const marketRow = await executor.query(
    `SELECT code,default_locale,fallback_market_code,fallback_locale
       FROM market_editions WHERE code=$1 AND enabled=true`,
    [market],
  );
  const errors: string[] = [];
  if (!marketRow.rowCount) errors.push(`Market ${market} is not enabled.`);
  const candidates = await navigationCandidates(market, locale);
  if (!candidates) errors.push(`Locale ${locale} is not configured for ${market}.`);

  const documents = await executor.query(
    `SELECT d.id::text,d.kind,d.canonical_slug,e.id::text edition_id,
            e.published_revision_id::text,r.payload,r.content_digest,r.revision_number,
            e.published_at,e.updated_at,
            r.created_by_user_id::text submitter_user_id,r.approved_by_user_id::text,
            review.reviewer_user_id::text
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id
       LEFT JOIN LATERAL (
         SELECT reviewer_user_id FROM cms_review_requests
          WHERE edition_id=e.id AND revision_id=r.id AND status='approved'
          ORDER BY decided_at DESC,id DESC LIMIT 1
       ) review ON true
      WHERE d.status<>'archived' AND e.market=$1 AND e.locale=$2
        AND e.publication_state='published' AND r.workflow_state='approved'
      ORDER BY d.kind,d.canonical_slug,d.id`,
    [market, locale],
  );
  const navigation = await executor.query(
    `SELECT items,pages,published_version FROM cms_navigation_published_policies
      WHERE market=$1 AND locale=$2`,
    [market, locale],
  );
  const availability = await executor.query(
    `SELECT a.document_id::text,a.locale,a.published_decision,a.published_version
       FROM cms_document_market_availability a
       JOIN market_editions m ON m.id=a.market_edition_id
      WHERE m.code=$1 AND a.locale=$2 ORDER BY a.document_id`,
    [market, locale],
  );
  const people = await executor.query(
    `SELECT d.id::text,r.id::text revision_id
       FROM cms_documents d JOIN cms_market_editions e ON e.document_id=d.id
       JOIN cms_revisions r ON r.id=e.published_revision_id
      WHERE d.kind='person' AND e.market=$1 AND e.locale=$2
        AND e.publication_state='published' ORDER BY d.id`,
    [market, locale],
  );

  const routeById = new Map(CMS_RELEASE_REGISTRY.routes.map((route) => [route.destinationId, route]));
  const availableDestinations = new Set<string>();
  for (const row of documents.rows) {
    const validation = validateCmsSnapshotForDelivery(row.kind as CmsDocumentKind, row.payload, "publish");
    if (!validation.success) continue;
    const path = cmsPublicRoute(row.kind as CmsDocumentKind, validation.data.slug, validation.data.content);
    const destination = path ? (
      CMS_RELEASE_REGISTRY.routes.find((entry) => entry.routeType !== "dynamic" && entry.path === path)
      ?? CMS_RELEASE_REGISTRY.routes.find((entry) =>
        entry.routeType === "dynamic" && path.startsWith(entry.path.replace("/:slug", "/")))
    ) : null;
    if (destination) availableDestinations.add(destination.destinationId);
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const route of CMS_RELEASE_REGISTRY.routes) {
      if (
        route.routeType === "redirect"
        && route.destinationIdTarget
        && availableDestinations.has(route.destinationIdTarget)
        && !availableDestinations.has(route.destinationId)
      ) {
        availableDestinations.add(route.destinationId);
        changed = true;
      }
    }
  }
  const revisions = [];
  const resolvedLinks = [];
  const mediaPins = [];
  const actorProvenance: Array<{
    documentId: string;
    submitterId: string | null;
    reviewerId: string | null;
    approverId: string | null;
  }> = [];
  for (const row of documents.rows) {
    const validation = validateCmsSnapshotForDelivery(row.kind as CmsDocumentKind, row.payload, "publish");
    if (!validation.success) {
      errors.push(...validation.errors.map((message) => `${row.kind}/${row.canonical_slug}: ${message}`));
      continue;
    }
    const route = cmsPublicRoute(row.kind as CmsDocumentKind, row.payload.slug, row.payload.content);
    const destination = route ? (
      CMS_RELEASE_REGISTRY.routes.find((entry) => entry.routeType !== "dynamic" && entry.path === route)
      ?? CMS_RELEASE_REGISTRY.routes.find((entry) =>
        entry.routeType === "dynamic" && route.startsWith(entry.path.replace("/:slug", "/")))
    ) : null;
    if (route && !destination) errors.push(`${route}: no registry destination represents this published revision.`);
    const links = collectDestinationReferences(row.payload.content);
    for (const link of links) {
      if (!routeById.has(link.ref.destinationId)) {
        errors.push(`${row.kind}/${row.canonical_slug}/${link.path}: unknown destination ${link.ref.destinationId}.`);
      } else if (!availableDestinations.has(link.ref.destinationId)) {
        errors.push(`${row.kind}/${row.canonical_slug}/${link.path}: destination ${link.ref.destinationId} is unavailable in ${market}/${locale}.`);
      } else {
        resolvedLinks.push({ documentId: row.id, fieldPath: link.path, ...link.ref });
      }
    }
    const refs = collectCmsMediaReferences(row.kind, row.payload.content, row.payload.mediaIds ?? [], row.payload.seo);
    const pins = refs.filter((ref) => ref.mediaVersionId);
    if (refs.some((ref) => !ref.mediaVersionId)) {
      errors.push(`${row.kind}/${row.canonical_slug}: every released media reference must pin an immutable version.`);
    }
    mediaPins.push(...pins.map((ref) => ({ documentId: row.id, ...ref })));
    const actors = {
      documentId: String(row.id),
      submitterId: row.submitter_user_id ? String(row.submitter_user_id) : null,
      reviewerId: row.reviewer_user_id ? String(row.reviewer_user_id) : null,
      approverId: row.approved_by_user_id ? String(row.approved_by_user_id) : null,
    };
    actorProvenance.push(actors);
    const ids = [actors.submitterId, actors.reviewerId, actors.approverId, actorId];
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) {
      errors.push(`${row.kind}/${row.canonical_slug}: submitter, reviewer, approver, and publisher must all be present and distinct.`);
    }
    const deliveredMedia = pins.length ? await executor.query(
      `SELECT a.id::text id,v.id::text version_id,a.media_type,
              v.width,v.height,v.metadata,a.alt_text,a.credit
         FROM cms_media_references ref
         JOIN cms_media_assets a ON a.id=ref.asset_id
         JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
        WHERE ref.document_id=$1 AND ref.field_path=$2
          AND a.status IN ('active','ready')
          AND v.id::text=ANY($3::text[])`,
      [row.id, `revision:${row.published_revision_id}`, pins.map((pin) => pin.mediaVersionId)],
    ) : { rows: [] };
    revisions.push({
      documentId: row.id, editionId: row.edition_id, revisionId: row.published_revision_id,
      contentDigest: row.content_digest, route, actors,
      destinationId: destination?.destinationId ?? null,
      rendererKey: destination?.rendererKey ?? null,
      kind: row.kind,
      revision: Number(row.revision_number),
      publishedAt: row.published_at,
      updatedAt: row.updated_at,
      snapshot: validation.data,
      media: deliveredMedia.rows.map((asset) => ({
        id: String(asset.id),
        versionId: String(asset.version_id),
        url: `/api/public/media/${String(asset.id)}/${String(asset.version_id)}`,
        mimeType: asset.media_type,
        width: asset.width ?? null,
        height: asset.height ?? null,
        duration: Object.hasOwn(asset.metadata ?? {}, "duration") ? asset.metadata.duration : null,
        caption: Object.hasOwn(asset.metadata ?? {}, "caption") ? asset.metadata.caption : null,
        altText: Object.hasOwn(asset.metadata ?? {}, "altText") ? asset.metadata.altText : asset.alt_text ?? null,
        credit: Object.hasOwn(asset.metadata ?? {}, "credit") ? asset.metadata.credit : asset.credit ?? null,
        motionMetadata: Object.hasOwn(asset.metadata ?? {}, "motionMetadata") ? asset.metadata.motionMetadata : null,
        focalPoint: Object.hasOwn(asset.metadata ?? {}, "focalPoint") ? asset.metadata.focalPoint : null,
      })),
    });
  }
  const separationValid = actorProvenance.length > 0 && actorProvenance.every((actors) => {
    const ids = [actors.submitterId, actors.reviewerId, actors.approverId, actorId];
    return ids.every(Boolean) && new Set(ids).size === ids.length;
  });
  const manifest = {
    scope: { market, locale },
    registryVersion: CMS_RELEASE_REGISTRY.version,
    generatedAt: new Date().toISOString(),
    revisions,
    availability: availability.rows,
    navigation: navigation.rows[0] ?? { items: [], pages: [], published_version: 0 },
    peopleSelections: people.rows,
    resolvedLinks,
    mediaPins,
    fallback: { candidates: candidates ?? [], canonicalMarketFallback: false },
  };
  const validation = { ready: errors.length === 0, errors, warnings: releaseInventory().compiledOnly.map((route) => `${route.path} remains compiled-only until parity cutover.`) };
  return {
    manifest, validation, validationDigest: digest({ manifest, validation }),
    actors: { revisions: actorProvenance, publisherId: actorId },
    separationValid,
  };
}

export async function publicReleaseManifest(market: string, locale: string) {
  const result = await pool.query(
    `SELECT receipt.id::text,receipt.release_number,receipt.registry_version,
            receipt.manifest,receipt.validation_digest,receipt.integrity_digest,receipt.released_at
       FROM cms_active_releases active
       JOIN cms_release_receipts receipt ON receipt.id=active.release_id
      WHERE active.market=$1 AND active.locale=$2`,
    [market, locale],
  );
  return result.rows[0] ?? null;
}

export const releaseDigest = digest;