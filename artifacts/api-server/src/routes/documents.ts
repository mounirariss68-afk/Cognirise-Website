import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  ArchiveDocumentBody,
  AddDocumentReviewCommentBody,
  collectCmsMediaReferences,
  type CmsDocumentKind,
  type CmsDocumentTopic,
  CreateDocumentBody,
  CreateDocumentEditionOverrideBody,
  ListDocumentsQueryParams,
  PublishDocumentAvailabilityBody,
  PublishDocumentBody,
  projectIndustrySnapshotForMarket,
  RejectDocumentRevisionBody,
  RollbackDocumentBody,
  SubmitDocumentBody,
  ReviewDocumentAvailabilityBody,
  SelectDocumentAvailabilitySourceBody,
  UpdateDocumentAvailabilityBody,
  UpdateDocumentBody,
  cmsSeoSchema,
  isCmsConfigurationIdentityValid,
  validateCmsSnapshot,
  validateCmsSnapshotForDelivery,
} from "@workspace/api-zod";
import {
  authenticate,
  requireCsrf,
  requireEditor,
  requireAdministrator,
  requireMfa,
  type AuthContext,
} from "../lib/auth";
import { audit, pageOf } from "../lib/cms";
import { asyncRoute } from "../lib/http";
import { hashToken, randomToken } from "../lib/security";
import {
  canAccessContent,
  canChangeCanonicalSlug,
  isCmsDocumentTopic,
  isPublicContentVisible,
  type CmsCapability,
} from "../lib/policy";
import { downloadMediaObject } from "../lib/object-storage";
import {
  approvedMediaVersionMetadataSql,
  mediaVersionReviewStatus,
} from "../lib/media-version-governance";
import { navigationCandidates, publishedNavigationPolicy } from "../lib/navigation-policy";
import {
  DELETE_DOCUMENT_SQL,
  DOCUMENT_SELECT_SQL,
} from "../lib/document-lifecycle-sql";
import {
  effectiveAvailability,
  industryDestinationEligibilityClause,
  managedMarketPublicDeliveryClause,
  publicPayloadEligibilityClause,
  type AvailabilityDecision,
  isAvailabilityDecision,
} from "../lib/availability";
import {
  materializeSharedMarketRevision,
  mediaPinsForNewSharedSnapshot,
  registerSharedMarketEditionRoutes,
  savedRevisionReadiness,
} from "../lib/shared-market-editions";
import {
  assertManagedMarketPublication,
  ensureManagedMarketRevision,
  lockDocumentForMutation,
  revalidateMutationAuth,
  synchronizeManagedMarketRevision,
} from "../lib/managed-market-lifecycle";
import { filterSharedMarketReadiness } from "../lib/shared-market-readiness";

const router: IRouter = Router();
export const previewMediaDelivery = {
  download: downloadMediaObject,
};
router.use("/documents", authenticate, requireMfa);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function canAccessMarket(auth: AuthContext, market: string): boolean {
  return auth.user.role === "administrator" || auth.user.marketCodes.includes(market);
}

registerSharedMarketEditionRoutes(router, {
  canAccessMarket,
  canAccessEditionTarget,
  revisionMediaGovernanceErrors,
  requireEditor,
  requireAdministrator,
  requireCsrf,
});

export function previewMediaIds(payload: unknown, documentKind?: CmsDocumentKind): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const snapshot = payload as Record<string, unknown>;
  const content = snapshot.content && typeof snapshot.content === "object" && !Array.isArray(snapshot.content)
    ? snapshot.content as Record<string, unknown>
    : {};
  const kind = documentKind
    ?? (typeof snapshot.kind === "string" ? snapshot.kind : "landing-page");
  const candidates = collectCmsMediaReferences(
    kind as CmsDocumentKind,
    content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.filter((value): value is string => typeof value === "string") : [],
    snapshot.seo,
  ).map((reference) => reference.mediaId);
  return [...new Set(candidates.filter((value): value is string => typeof value === "string" && UUID.test(value)))].slice(0, 50);
}

export function projectPreviewDocument(
  kind: CmsDocumentKind,
  payload: unknown,
  requestedMarket: string,
  editionMarket: string,
) {
  return kind === "industry"
    ? projectIndustrySnapshotForMarket(payload, requestedMarket, editionMarket)
    : payload;
}

function mapDocument(row: Record<string, any>) {
  const payload = row.payload ?? {};
  const status =
    row.root_status === "archived" || row.publication_state === "archived"
      ? "archived"
      : ["draft", "in-review"].includes(row.workflow_state)
        ? row.workflow_state
      : row.publication_state === "published"
        ? "published"
        : row.publication_state === "scheduled"
          ? "scheduled"
          : row.workflow_state === "in-review"
            ? "in-review"
            : row.workflow_state === "approved"
              ? "approved"
              : "draft";
  return {
    id: String(row.id),
    kind: row.kind,
    slug: payload.slug ?? row.canonical_slug,
    title: payload.title ?? row.title,
    summary: payload.summary ?? null,
    status,
    content: payload.content ?? {},
    seo: payload.seo,
    mediaIds: payload.mediaIds ?? [],
    markets: row.markets ?? [],
    revisionNumber: row.revision_number ?? 1,
    // The edition is the actual editorial target; exposing it avoids forcing
    // clients to infer an address from a market/locale pair.
    editionId: row.edition_id ? String(row.edition_id) : null,
    canPermanentlyDelete: Boolean(row.can_permanently_delete),
    currentRevisionId: row.revision_id ? String(row.revision_id) : null,
    publishedRevisionId: row.published_revision_id ? String(row.published_revision_id) : null,
    scheduledAt: row.publish_at,
    publishedAt: row.published_at,
    createdBy: row.owner_id ? String(row.owner_id) : undefined,
    updatedBy: row.owner_id ? String(row.owner_id) : undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    inherited: Boolean(row.inherited),
    effectiveMarket: row.effective_market ?? null,
    effectiveLocale: row.effective_locale ?? null,
  };
}

function payload(input: Record<string, any>) {
  return {
    slug: input.slug,
    title: input.title,
    summary: input.summary ?? null,
    content: input.content ?? {},
    seo: input.seo,
    mediaIds: input.mediaIds ?? [],
    markets: input.markets ?? [],
  };
}

async function syncMediaReferences(
  client: { query: (sql: string, values?: unknown[]) => Promise<any> },
  documentId: string,
  revisionId: string,
  snapshot: Record<string, any>,
  sourceRevisionId?: string,
  documentKind?: CmsDocumentKind,
) {
  const references = collectCmsMediaReferences(
    documentKind ?? snapshot.kind as CmsDocumentKind,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [],
    snapshot.seo,
  );
  // A governed reference can live inside content (for example heroMedia or
  // educationPov imagery), not only in the legacy top-level mediaIds list.
  // Keep one pin per asset, preferring an explicit immutable version if the
  // same asset is present in both representations.
  const media = new Map<string, string | null>();
  for (const reference of references) {
    const assetId = String(reference.mediaId);
    const exactVersionId = reference.mediaVersionId ? String(reference.mediaVersionId) : null;
    if (!media.has(assetId) || exactVersionId) media.set(assetId, exactVersionId);
  }
  for (const [assetId, exactVersionId] of media) {
    await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       SELECT asset.id,COALESCE(requested.id,prior.media_version_id,latest.id),$3,$4
         FROM cms_media_assets asset
          LEFT JOIN cms_media_versions requested
            ON requested.asset_id=asset.id AND requested.id=$2::uuid
          LEFT JOIN cms_media_references prior
            ON prior.asset_id=asset.id AND prior.document_id=$3::uuid
           AND prior.field_path=CASE WHEN $5::text IS NULL THEN '' ELSE 'revision:'||$5 END
          LEFT JOIN LATERAL (SELECT id FROM cms_media_versions
             WHERE asset_id=asset.id ORDER BY version_number DESC LIMIT 1) latest
             ON requested.id IS NULL AND prior.asset_id IS NULL
          WHERE asset.id=$1::uuid AND (
            asset.status IN ('active','ready')
            OR (
              asset.status='pending-review'
              AND requested.id IS NOT NULL
              AND $5::uuid IS NOT NULL
              AND EXISTS (
                SELECT 1
                  FROM cms_media_references carried
                  JOIN cms_revisions predecessor
                    ON predecessor.id=$5::uuid
                  JOIN cms_revisions successor
                    ON successor.id=$6::uuid
                 WHERE carried.document_id=$3::uuid
                   AND carried.field_path='revision:'||$5::text
                   AND carried.asset_id=asset.id
                   AND carried.media_version_id=requested.id
                   AND predecessor.edition_id=successor.edition_id
              )
            )
          )
            AND ($2::uuid IS NULL OR requested.id IS NOT NULL)
            AND COALESCE(requested.id,prior.media_version_id,latest.id) IS NOT NULL
       ON CONFLICT DO NOTHING`,
      [assetId, exactVersionId, documentId, `revision:${revisionId}`, sourceRevisionId ?? null, revisionId],
    );
  }
}

function validateSnapshot(kind: string, snapshot: unknown, mode: "draft" | "publish") {
  return validateCmsSnapshot(kind as CmsDocumentKind, snapshot, mode);
}

/** Keep the long-standing string details contract and add structured issues separately. */
function validationErrorBody(validation: { success: false; errors: string[]; issues?: unknown[] }) {
  return { details: validation.errors, issues: validation.issues ?? [] };
}

/**
 * A legacy verificationDate is historical evidence, not a statement by a
 * known actor about this immutable payload. An explicit confirmation for the
 * exact revision/digest is therefore required for review or publication. It
 * may satisfy the old date-only gate, but never any other publish check.
 */
async function validateSnapshotWithAccuracyConfirmation(
  client: Queryable,
  kind: string,
  snapshot: unknown,
  revisionId: string,
  contentDigest: string,
) {
  const confirmation = await client.query(
    `SELECT 1 FROM cms_revision_accuracy_confirmations
      WHERE revision_id=$1 AND content_digest=$2 LIMIT 1`,
    [revisionId, contentDigest],
  );
  const hasConfirmation = confirmation.rowCount > 0;
  const validation = validateSnapshot(kind, snapshot, "publish");
  if (validation.success) {
    if (hasConfirmation) return validation;
    return {
      success: false as const,
      errors: ["An explicit accuracy confirmation is required before review or publication."],
      issues: [{
        code: "CMS_PUBLISH_ACCURACY_CONFIRMATION_REQUIRED",
        path: "settings.accuracyConfirmation",
        message: "Confirm the accuracy of this exact saved revision in Settings before review or publication.",
        scope: "publish" as const,
        action: "focus-content-field" as const,
      }],
    };
  }
  const remainingIssues = (validation.issues ?? []).filter((issue: any) =>
    issue?.path !== "content.verificationDate");
  // The only legacy rule a confirmation supersedes is the uncredited date.
  // Re-parse in draft mode solely to recover the already structurally valid
  // snapshot; all other publish failures above remain authoritative.
  if (hasConfirmation && validation.issues?.length && remainingIssues.length === 0) {
    const draft = validateSnapshot(kind, snapshot, "draft");
    if (draft.success) return draft;
  }
  return validation;
}

function accuracyConfirmationJson(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    revisionId: String(row.revision_id),
    contentDigest: String(row.content_digest),
    confirmedByUserId: String(row.confirmed_by_user_id),
    confirmedAt: row.confirmed_at,
  };
}

function expectedMedia(kind: CmsDocumentKind, snapshot: Record<string, any>) {
  return collectCmsMediaReferences(
    kind,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [],
    snapshot.seo,
  );
}

/** A pending-review asset is never a new draft-time selection. The one narrow
 * exception is a normal successor save retaining an exact version already
 * pinned by the immediately preceding revision of the same locked edition. */
async function pendingMediaCarryForwardErrors(
  client: { query: (sql: string, values?: unknown[]) => Promise<any> },
  documentId: string,
  editionId: string,
  predecessorRevisionId: string,
  kind: CmsDocumentKind,
  snapshot: Record<string, any>,
): Promise<string[]> {
  const references = expectedMedia(kind, snapshot);
  const exactReferences = references.filter((reference) => reference.mediaVersionId);
  if (!exactReferences.length) return [];
  const assetIds = [...new Set(exactReferences.map((reference) => reference.mediaId))];
  const selected = await client.query(
    `SELECT asset.id::text asset_id,asset.status,version.id::text version_id
       FROM cms_media_assets asset
       JOIN cms_media_versions version ON version.asset_id=asset.id
      WHERE asset.id::text=ANY($1::text[])
        AND version.id::text=ANY($2::text[])`,
    [assetIds, [...new Set(exactReferences.map((reference) => reference.mediaVersionId!))]],
  );
  const pending = new Set(
    selected.rows
      .filter((row: Record<string, unknown>) => row.status === "pending-review")
      .map((row: Record<string, unknown>) => `${row.asset_id}:${row.version_id}`),
  );
  if (!pending.size) return [];
  const carried = await client.query(
    `SELECT reference.asset_id::text asset_id,reference.media_version_id::text version_id
       FROM cms_media_references reference
       JOIN cms_revisions predecessor
         ON predecessor.id=$2 AND predecessor.edition_id=$3
      WHERE reference.document_id=$1
        AND reference.field_path='revision:'||$2::text`,
    [documentId, predecessorRevisionId, editionId],
  );
  const carriedPins = new Set(carried.rows.map((row: Record<string, unknown>) => `${row.asset_id}:${row.version_id}`));
  return exactReferences
    .filter((reference) => pending.has(`${reference.mediaId}:${reference.mediaVersionId}`))
    .filter((reference) => !carriedPins.has(`${reference.mediaId}:${reference.mediaVersionId}`))
    .map((reference) => `${reference.fieldPath}: pending-review media must retain the exact version pinned by the preceding revision of this edition.`);
}

export function mediaGovernanceErrors(
  references: ReturnType<typeof expectedMedia>,
  rows: Array<Record<string, any>>,
): string[] {
  const errors: string[] = [];
  // The publisher approval endpoint writes `approved-use`; older imports use
  // `approved`. Both are affirmative rights-review states. Keeping both here
  // prevents a publisher-approved exact version from being rejected solely by
  // a vocabulary mismatch, while every other governance check still applies.
  const approvedRightsStatuses = new Set(["approved", "approved-use"]);
  const byAsset = new Map(rows.map((row) => [String(row.id), row]));
  for (const reference of references) {
    const row = byAsset.get(reference.mediaId);
    if (!row || (row.status != null && !["active", "ready"].includes(String(row.status)))) {
      errors.push(`${reference.fieldPath}: approved media is unavailable.`);
      continue;
    }
    if (reference.mediaVersionId && String(row.version_id) !== reference.mediaVersionId) {
      errors.push(`${reference.fieldPath}: the selected media version is unavailable.`);
      continue;
    }
    const mimeType = String(row.media_type ?? "");
    if (reference.role === "document" && mimeType !== "application/pdf") {
      errors.push(`${reference.fieldPath}: a PDF asset is required.`);
    }
    if (
      reference.role && reference.role !== "document" &&
      reference.role !== "background" && !mimeType.startsWith("image/")
    ) {
      errors.push(`${reference.fieldPath}: an image asset is required.`);
    }
    if (
      mimeType.startsWith("image/") &&
      (Object.hasOwn(row, "width") || Object.hasOwn(row, "height")) &&
      (!Number(row.width) || !Number(row.height))
    ) {
      errors.push(`${reference.fieldPath}: image dimensions are unavailable.`);
    }
    const metadata = row.metadata && typeof row.metadata === "object" ? row.metadata : {};
    const decorative = metadata.decorative === true ||
      (metadata.accessibility && typeof metadata.accessibility === "object" &&
        metadata.accessibility.decorative === true);
    const altText = reference.altText ?? metadata.altText ?? row.alt_text;
    if (
      mimeType.startsWith("image/") && !decorative &&
      (Object.hasOwn(row, "alt_text") || Object.hasOwn(row, "metadata")) &&
      (typeof altText !== "string" || !altText.trim())
    ) {
      errors.push(`${reference.fieldPath}: non-decorative imagery requires alternative text.`);
    }
    const rights = metadata.rights && typeof metadata.rights === "object" ? metadata.rights : {};
    const rightsStatus = metadata.rightsStatus ?? rights.status;
    if (rightsStatus != null && !approvedRightsStatuses.has(String(rightsStatus))) {
      errors.push(`${reference.fieldPath}: media rights are not approved.`);
    }
    const accessibility = metadata.accessibility && typeof metadata.accessibility === "object"
      ? metadata.accessibility as Record<string, unknown>
      : {};
    const accessibilityStatus = metadata.accessibilityStatus ?? accessibility.status;
    if (accessibilityStatus != null && accessibilityStatus !== "approved") {
      errors.push(`${reference.fieldPath}: media accessibility review is not approved.`);
    }
    const rightsExpiry = metadata.rightsExpiresAt ?? rights.expiresAt;
    if (typeof rightsExpiry === "string" && Date.parse(rightsExpiry) < Date.now()) {
      errors.push(`${reference.fieldPath}: media rights have expired.`);
    }
  }
  return [...new Set(errors)];
}

async function revisionMediaGovernanceErrors(
  client: { query: (sql: string, values?: unknown[]) => Promise<any> },
  documentId: string,
  revisionId: string,
  kind: CmsDocumentKind,
  snapshot: Record<string, any>,
) {
  const references = expectedMedia(kind, snapshot);
  const ids = [...new Set(references.map((reference) => reference.mediaId))];
  if (!ids.length) return [];
  const selected = await client.query(
    `SELECT a.id::text id,a.status,a.media_type,a.alt_text,
            v.id::text version_id,v.width,v.height,v.metadata
       FROM cms_media_references ref
       JOIN cms_media_assets a ON a.id=ref.asset_id
       JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
      WHERE ref.document_id=$2 AND ref.field_path=$3
        AND a.id::text=ANY($1::text[])`,
    [ids, documentId, `revision:${revisionId}`],
  );
  return mediaGovernanceErrors(references, selected.rows);
}

const digest = (value: unknown) =>
  createHash("sha256").update(JSON.stringify(value)).digest("base64url");

function scopedDocumentSelect(
  marketParameter: number,
  localeParameter: number,
  allowedMarketsParameter: number,
) {
  return DOCUMENT_SELECT_SQL
    .replace(
      "ARRAY(SELECT DISTINCT market FROM cms_market_editions WHERE document_id=d.id) markets",
      `ARRAY(SELECT DISTINCT market FROM cms_market_editions
        WHERE document_id=d.id
          AND ($${allowedMarketsParameter}::text[] IS NULL OR market=ANY($${allowedMarketsParameter}::text[]))) markets`,
    )
    .replace(
      "WHERE e.document_id=d.id",
      `WHERE e.document_id=d.id
         AND ($${marketParameter}::text IS NULL OR e.market=$${marketParameter})
         AND ($${localeParameter}::text IS NULL OR e.locale=$${localeParameter})
         AND ($${allowedMarketsParameter}::text[] IS NULL OR e.market=ANY($${allowedMarketsParameter}::text[]))`,
    );
}

function requesterMarkets(auth: AuthContext): string[] | null {
  // Legacy administrators retain their documented compatibility projection.
  // Once the durable configuration sentinel is set, including for an empty
  // matrix, role must never widen scope.  The list hydration below performs
  // the authoritative exact topic/capability check before any row is emitted.
  if (auth.user.role === "administrator" && !auth.user.capabilityMatrixConfigured) return null;
  // Explicit capability grants may name a market that is not present in the
  // legacy assignment projection, so include both as a SQL pre-filter.
  return [...new Set([
    ...auth.user.marketCodes,
    ...auth.user.capabilityGrants.map((grant) => grant.marketCode),
  ])];
}

async function canAccessMarkets(
  auth: AuthContext,
  topic: CmsDocumentTopic,
  capability: CmsCapability,
  markets: readonly string[],
): Promise<boolean> {
  const uniqueMarkets = [...new Set(markets.filter(Boolean))];
  return uniqueMarkets.length > 0 && (await Promise.all(uniqueMarkets.map((marketCode) =>
    canAccessContent(auth.user, { topic, capability, marketCode }),
  ))).every(Boolean);
}

/**
 * A destination-wide shared snapshot is authorized per destination. Each
 * destination must carry its own exact Shared grant as well as its Regional
 * grant; checking only the source market would let one Shared grant project
 * across an otherwise unauthorized fan-out.
 */
async function canAccessSharedDestinationMatrix(
  auth: AuthContext,
  topic: CmsDocumentTopic,
  capability: CmsCapability,
  markets: readonly string[],
): Promise<boolean> {
  const uniqueMarkets = [...new Set(markets.filter(Boolean))];
  return uniqueMarkets.length > 0 && (await Promise.all(uniqueMarkets.map((marketCode) =>
    canAccessContent(auth.user, {
      topic,
      capability,
      marketCode,
      scope: "shared",
      sourceMarketCode: marketCode,
      destinationMarketCodes: uniqueMarkets,
    }),
  ))).every(Boolean);
}

async function listedDocumentForAuth(
  auth: AuthContext,
  documentId: string,
  requestedMarket?: string,
  requestedLocale?: string,
): Promise<ReturnType<typeof mapDocument> | null> {
  // List results are already ranked for the requested destination. Authorize
  // that exact destination rather than re-checking only the document's stored
  // source editions; otherwise an assigned market cannot see an inherited
  // fallback whose source lives in another geography.
  if (requestedMarket && requestedLocale) {
    if (!await canAccessEditionTarget(
      pool,
      auth,
      documentId,
      requestedMarket,
      requestedLocale,
      "view",
    )) return null;
    return getDocument(documentId, auth, requestedMarket, requestedLocale);
  }
  const editions = await pool.query(
    `SELECT market,locale FROM cms_market_editions
      WHERE document_id=$1 ORDER BY created_at,id`,
    [documentId],
  );
  for (const edition of editions.rows) {
    if (await canAccessEditionTarget(
      pool, auth, documentId, String(edition.market), String(edition.locale), "view",
    )) return getDocument(documentId, auth, String(edition.market), String(edition.locale));
  }
  return null;
}

type Queryable = { query: (sql: string, values?: unknown[]) => Promise<any> };

/**
 * Shared source editions use an internal market/locale solely as an authoring
 * address. Authority is instead the authority to every enabled destination.
 * A managed shared/adapted exact edition additionally inherits the authority
 * boundary of the immutable baseline source it adopted. Custom and independent
 * editions retain their exact-market permission boundary.
 */
export async function canAccessEditionTarget(
  client: Queryable,
  auth: AuthContext,
  documentId: string,
  market: string,
  locale: string,
  capability: CmsCapability = "view",
): Promise<boolean> {
  const edition = await client.query(
    `SELECT e.id edition_id,e.content_mode,d.kind FROM cms_documents d
      LEFT JOIN cms_market_editions e
        ON e.document_id=d.id AND e.market=$2 AND e.locale=$3
      WHERE d.id=$1
      ORDER BY e.created_at,e.id LIMIT 1`,
    [documentId, market, locale],
  );
  const topic = edition.rows[0]?.kind;
  if (!isCmsDocumentTopic(topic)) return false;
  const regional = (marketCode: string) => canAccessContent(auth.user, {
    topic,
    capability,
    marketCode,
  });
  // Market permissions still govern a configured destination which has no
  // exact document edition yet. Once one exists, however, mode must come from
  // that exact market/locale target: another locale can be custom while this
  // one is shared (or vice versa).
  if (!edition.rows[0]?.edition_id) return regional(market);
  // Non-shared editions have an unambiguous exact-market boundary, so reject
  // them before binding discovery. A legacy shared source can be addressed at
  // the internal `shared-source` market, which is deliberately not an editor
  // assignment; it needs binding classification before its destination-wide
  // authority can be evaluated.
  const isLegacySharedSource = edition.rows[0]?.content_mode === "shared";
  if (!isLegacySharedSource && !await regional(market)) return false;
  const managedBinding = await client.query(
    `SELECT binding.mode,adopted.id baseline_id,
            adopted.source_revision_id baseline_source_revision_id,
            source_edition.market source_market
       FROM cms_market_edition_bindings binding
       JOIN market_editions destination ON destination.id=binding.market_edition_id
       LEFT JOIN cms_shared_baseline_revisions adopted
         ON adopted.id=binding.based_on_baseline_revision_id
       LEFT JOIN cms_revisions source_revision ON source_revision.id=adopted.source_revision_id
       LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
       WHERE binding.document_id=$1 AND destination.code=$2 AND binding.locale=$3
       FOR UPDATE OF binding`,
    [documentId, market, locale],
  );
  // A legacy source may still be physically addressed at a real market/locale.
  // Once that address has a managed binding, it represents the binding's exact
  // materialization—not the document-wide shared source. Preserve both the
  // exact destination and adopted baseline-source permission checks below.
  if (isLegacySharedSource && !managedBinding.rowCount) {
    const destinations = await client.query(
      "SELECT code FROM market_editions WHERE enabled=true",
    );
    const destinationMarkets: string[] = destinations.rows.map((row: { code: string }) => String(row.code));
    if (!destinationMarkets.length) return false;
    // `shared-source/und` is an internal legacy authoring address, not a
    // geography that an account may be granted. It carries the same strict
    // destination-wide authority as an intentionally neutral baseline: for
    // every enabled real destination, require its Shared grant and the full
    // regional fan-out. A real legacy shared edition retains its recorded
    // source-market authority below.
    if (market === "shared-source" && locale === "und") {
      return (await Promise.all(destinationMarkets.map((destinationMarket) =>
        canAccessContent(auth.user, {
          topic,
          capability,
          marketCode: destinationMarket,
          scope: "shared",
          sourceMarketCode: destinationMarket,
          destinationMarketCodes: destinationMarkets,
        })
      ))).every(Boolean);
    }
    return canAccessContent(auth.user, {
      topic,
      capability,
      marketCode: market,
      scope: "shared",
      sourceMarketCode: market,
      destinationMarketCodes: destinationMarkets,
    });
  }
  // A managed materialization is a real exact destination, even when its
  // legacy source row retained content_mode='shared'.
  if (!await regional(market)) return false;
  // An independent binding is an exact destination by definition; it has no
  // inherited source boundary. This also classifies a legacy storage row that
  // was later detached, rather than mistaking it for a document-wide source.
  if (managedBinding.rows[0]?.mode === "independent") return true;
  // A managed shared/adapted binding without a recoverable adopted baseline
  // source is fail-closed rather than silently destination-only.
  if (!managedBinding.rowCount) return true;
  if (managedBinding.rows[0]?.baseline_id
    && managedBinding.rows[0]?.baseline_source_revision_id == null) return true;
  const sourceMarket = managedBinding.rows[0]?.source_market;
  return typeof sourceMarket === "string" && canAccessContent(auth.user, {
    topic,
    capability,
    marketCode: market,
    scope: "shared",
    sourceMarketCode: sourceMarket,
    destinationMarketCodes: [market],
  });
}

/**
 * Resolve the accountable reviewer for an atomic submit from the central
 * review pool.  An explicitly assigned, still-valid reviewer is retained for
 * attribution; otherwise administrators remain an eligible recovery/fallback
 * audience, but a dedicated publisher reviewer is the deterministic first
 * choice when both users have the same exact capability grant.  Never route
 * work back to the requester, revision author, or accountable editor.
 */
async function chooseEligibleReviewer(
  client: Queryable,
  auth: AuthContext,
  target: {
    documentId: string;
    market: string;
    locale: string;
    revisionAuthorId?: string | null;
    accountableEditorId?: string | null;
    preferredReviewerId?: string | null;
  },
): Promise<string | null> {
  const excludedReviewerIds = new Set([
    auth.user.id,
    target.revisionAuthorId ? String(target.revisionAuthorId) : null,
    target.accountableEditorId ? String(target.accountableEditorId) : null,
  ].filter((value): value is string => Boolean(value)));
  const candidates = await client.query(
    `SELECT id,role FROM cms_users
       WHERE status='active' AND role IN ('publisher','administrator')
       ORDER BY CASE WHEN role='publisher' THEN 0 ELSE 1 END,
                display_name NULLS LAST,email,id
       FOR SHARE`,
  );
  const orderedCandidates = target.preferredReviewerId
    ? [
      ...candidates.rows.filter((candidate: Record<string, any>) =>
        String(candidate.id) === String(target.preferredReviewerId)),
      ...candidates.rows.filter((candidate: Record<string, any>) =>
        String(candidate.id) !== String(target.preferredReviewerId)),
    ]
    : candidates.rows;
  for (const candidate of orderedCandidates) {
    const candidateId = String(candidate.id);
    if (excludedReviewerIds.has(candidateId)) continue;
    const reviewerMarkets = await client.query(
      "SELECT market_code FROM cms_user_market_assignments WHERE user_id=$1 ORDER BY market_code",
      [candidateId],
    );
    if (await canAccessEditionTarget(
      client,
      {
        ...auth,
        user: {
          ...auth.user,
          id: candidateId,
          role: candidate.role as AuthContext["user"]["role"],
          marketCodes: reviewerMarkets.rows.map((row: { market_code: string }) => String(row.market_code)),
        },
      },
      target.documentId,
      target.market,
      target.locale,
      "review",
    )) return candidateId;
  }
  return null;
}

/**
 * A released managed revision keeps the baseline source that produced that
 * immutable materialization. Do not authorize release from the binding's
 * current adopted source: a later draft can legitimately advance that pointer.
 * Missing lineage is ambiguous and therefore fail-closed.
 */
async function canAccessManagedPublishedRevisionSource(
  client: Queryable,
  auth: AuthContext,
  bindingId: string,
  revisionId: string,
  topic: CmsDocumentTopic,
  destinationMarketCode: string,
  capability: CmsCapability,
): Promise<boolean> {
  const source = await client.query(
    `SELECT resolved.baseline_revision_id::text baseline_revision_id,
            baseline.source_revision_id baseline_source_revision_id,
            source_edition.market source_market,
            EXISTS (
              SELECT 1 FROM cms_audit_events publication
               WHERE publication.action='document.published'
                 AND publication.metadata->>'managedBindingId'=resolved.binding_id::text
                 AND publication.metadata->>'revisionId'=resolved.cms_revision_id::text
                 AND publication.metadata->>'managedBindingMode'='independent'
            ) independently_published
       FROM cms_resolved_market_revisions resolved
       LEFT JOIN cms_shared_baseline_revisions baseline
         ON baseline.id=resolved.baseline_revision_id
       LEFT JOIN cms_revisions source_revision ON source_revision.id=baseline.source_revision_id
       LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
      WHERE resolved.binding_id=$1 AND resolved.cms_revision_id=$2
      FOR KEY SHARE OF resolved`,
    [bindingId, revisionId],
  );
  if (source.rowCount !== 1) return false;
  const lineage = source.rows[0];
  // An independent revision is the only valid NULL-baseline materialization.
  // Its immutable publication receipt records that fact at publication time;
  // mutable binding.mode is deliberately never used as historical evidence.
  if (!lineage.baseline_revision_id) return lineage.independently_published === true;
  if (lineage.baseline_source_revision_id == null) return true;
  return typeof lineage.source_market === "string"
    && await canAccessContent(auth.user, {
      topic,
      capability,
      marketCode: destinationMarketCode,
      scope: "shared",
      sourceMarketCode: String(lineage.source_market),
      destinationMarketCodes: [destinationMarketCode],
    });
}

function availabilitySelections(value: unknown): Array<{ marketEditionId: string; locale: string; decision: AvailabilityDecision }> {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    return typeof row.marketEditionId === "string" && typeof row.locale === "string"
      && ["inherit", "show", "off"].includes(String(row.decision))
      ? [{ marketEditionId: row.marketEditionId, locale: row.locale, decision: row.decision as AvailabilityDecision }]
      : [];
  });
}

/**
 * Market authority is required for every newly visible destination and for
 * every destination whose released decision changes. An absent or malformed
 * published row is deliberately treated as unknown rather than as `off`, so
 * a scoped actor cannot use an all-off review/publish to bypass authorization.
 * Explicit, unchanged published-off rows are the only rows that may remain
 * outside the actor's market scope.
 */
function availabilityDestinationRequiresMarketAuthority(
  decision: unknown,
  publishedDecision: unknown,
  hasPublishedRow: boolean,
): boolean {
  const publishedStateKnown = hasPublishedRow && isAvailabilityDecision(publishedDecision);
  return decision !== "off" || !publishedStateKnown || decision !== publishedDecision;
}

export function reviewedAvailabilityDiffersFromPublished(
  reviewed: Array<{ marketEditionId: string; locale: string; decision: AvailabilityDecision }>,
  published: Array<{ marketEditionId: string; locale: string; decision: AvailabilityDecision }>,
): boolean {
  const publishedByDestination = new Map(
    published.map((selection) => [
      `${selection.marketEditionId}|${selection.locale}`,
      selection.decision,
    ]),
  );
  return reviewed.some((selection) =>
    selection.decision !== (publishedByDestination.get(
      `${selection.marketEditionId}|${selection.locale}`,
    ) ?? "inherit"),
  );
}

export function availabilitySelectionKeysMatchDestinations(
  selections: Array<{ marketEditionId: string; locale: string; decision: AvailabilityDecision }>,
  destinations: Array<{ id: unknown; locale: unknown }>,
): boolean {
  const selectionKeys = selections.map((selection) => `${selection.marketEditionId}|${selection.locale}`);
  const destinationKeys = destinations.map((destination) => `${String(destination.id)}|${String(destination.locale)}`);
  const destinationKeySet = new Set(destinationKeys);
  return selectionKeys.length === destinationKeys.length
    && new Set(selectionKeys).size === selectionKeys.length
    && new Set(destinationKeys).size === destinationKeys.length
    && selectionKeys.every((key) => destinationKeySet.has(key));
}

type AvailabilityDestinationPin = {
  marketEditionId: string;
  locale: string;
  editionId: string | null;
  revisionId: string | null;
  contentDigest: string | null;
  bindingId: string | null;
  materializedRevisionId: string | null;
  resolvedRevisionId: string | null;
};

function availabilityDestinationPins(value: unknown): AvailabilityDestinationPin[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];
    const row = entry as Record<string, unknown>;
    if (typeof row.marketEditionId !== "string" || typeof row.locale !== "string") return [];
    return [{
      marketEditionId: row.marketEditionId,
      locale: row.locale,
      editionId: typeof row.editionId === "string" ? row.editionId : null,
      revisionId: typeof row.revisionId === "string" ? row.revisionId : null,
      contentDigest: typeof row.contentDigest === "string" ? row.contentDigest : null,
      bindingId: typeof row.bindingId === "string" ? row.bindingId : null,
      materializedRevisionId: typeof row.materializedRevisionId === "string"
        ? row.materializedRevisionId : null,
      resolvedRevisionId: typeof row.resolvedRevisionId === "string" ? row.resolvedRevisionId : null,
    }];
  });
}

/**
 * Capture the exact local edition and immutable revision that an availability
 * receipt authorizes.  Managed destinations additionally pin their resolved
 * materialization.  The old reviewed_selections field remains the client
 * compatibility projection; these pins are the stale-approval boundary.
 */
async function currentAvailabilityDestinationPins(
  client: Queryable,
  documentId: string,
): Promise<AvailabilityDestinationPin[]> {
  const result = await client.query(
    `SELECT m.id market_edition_id,configured_locale.locale,
            exact.id edition_id,exact.published_revision_id revision_id,
            exact_revision.content_digest,
            binding.id binding_id,binding.materialized_revision_id materialized_revision_id,
            resolved.cms_revision_id resolved_revision_id,
            resolved.content_digest resolved_content_digest
       FROM market_editions m
       CROSS JOIN LATERAL (
         SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
          WHERE locale IS NOT NULL
       ) configured_locale
       LEFT JOIN cms_market_editions exact
         ON exact.document_id=$1 AND exact.market=m.code AND exact.locale=configured_locale.locale
       LEFT JOIN cms_revisions exact_revision
         ON exact_revision.id=exact.published_revision_id AND exact_revision.edition_id=exact.id
       LEFT JOIN cms_market_edition_bindings binding
         ON binding.document_id=$1 AND binding.market_edition_id=m.id AND binding.locale=configured_locale.locale
       LEFT JOIN cms_resolved_market_revisions resolved
         ON resolved.binding_id=binding.id
        AND resolved.cms_revision_id=exact.published_revision_id
      WHERE m.enabled=true
      ORDER BY m.is_canonical DESC,m.display_name,m.code`,
    [documentId],
  );
  return result.rows.map((row: Record<string, unknown>) => ({
    marketEditionId: String(row.market_edition_id),
    locale: String(row.locale),
    editionId: row.edition_id == null ? null : String(row.edition_id),
    revisionId: row.revision_id == null ? null : String(row.revision_id),
    contentDigest: (row.resolved_content_digest ?? row.content_digest) == null
      ? null : String(row.resolved_content_digest ?? row.content_digest),
    bindingId: row.binding_id == null ? null : String(row.binding_id),
    materializedRevisionId: row.materialized_revision_id == null
      ? null : String(row.materialized_revision_id),
    resolvedRevisionId: row.resolved_revision_id == null ? null : String(row.resolved_revision_id),
  }));
}

export function availabilityDestinationPinsMatch(
  reviewed: AvailabilityDestinationPin[],
  current: AvailabilityDestinationPin[],
): boolean {
  if (reviewed.length !== current.length) return false;
  const key = (pin: AvailabilityDestinationPin) => `${pin.marketEditionId}|${pin.locale}`;
  if (
    new Set(reviewed.map(key)).size !== reviewed.length
    || new Set(current.map(key)).size !== current.length
  ) return false;
  const currentByKey = new Map(current.map((pin) => [key(pin), pin]));
  return reviewed.every((pin) => {
    const candidate = currentByKey.get(key(pin));
    return candidate != null
      && candidate.editionId === pin.editionId
      && candidate.revisionId === pin.revisionId
      && candidate.contentDigest === pin.contentDigest
      && candidate.bindingId === pin.bindingId
      && candidate.materializedRevisionId === pin.materializedRevisionId
      && candidate.resolvedRevisionId === pin.resolvedRevisionId;
  });
}

/**
 * Shared/adapted delivery has a document-wide governing source.  Independent
 * bindings and custom editions deliberately do not: their exact destination
 * revision is the authority instead.
 */
async function availabilityRequiresSharedSource(
  client: Queryable,
  documentId: string,
): Promise<boolean> {
  const result = await client.query(
    `SELECT EXISTS (
       SELECT 1
         FROM cms_market_edition_bindings binding
         LEFT JOIN cms_shared_baseline_revisions baseline
           ON baseline.id=binding.based_on_baseline_revision_id
        WHERE binding.document_id=$1 AND binding.mode IN ('shared','adapted')
          AND (
            baseline.id IS NULL
            OR COALESCE(baseline.governing_source_revision_id,baseline.source_revision_id) IS NOT NULL
          )
     ) OR EXISTS (
       SELECT 1
         FROM cms_market_editions edition
        WHERE edition.document_id=$1
          AND edition.content_mode='shared'
          AND edition.market<>'shared-source'
          AND NOT EXISTS (
            SELECT 1 FROM cms_market_edition_bindings managed_binding
             JOIN market_editions destination ON destination.id=managed_binding.market_edition_id
            WHERE managed_binding.document_id=$1
              AND managed_binding.mode IN ('shared','adapted','independent')
              AND destination.code=edition.market
              AND managed_binding.locale=edition.locale
          )
     ) requires_shared_source`,
    [documentId],
  );
  return result.rows[0]?.requires_shared_source === true
    || result.rows[0]?.requires_shared_source === "t";
}

type IndustryDeliveryDestination = {
  market: string;
  locale: string;
  hasPublishedCustom?: boolean;
};

/**
 * A shared industry revision is stored once but can be delivered at multiple
 * destinations. Validate the exact derivative that each destination would
 * receive before making that source public. An already-published exact custom
 * edition remains independent and wins public source selection, so it does
 * not consume the shared revision.
 */
export function industryDeliveryErrors(
  snapshot: unknown,
  editorialMarket: string,
  destinations: IndustryDeliveryDestination[],
): Array<{ market: string; locale: string; error: string }> {
  return destinations.flatMap((destination) => {
    if (destination.hasPublishedCustom) return [];
    try {
      const projected = projectIndustrySnapshotForMarket(
        snapshot,
        destination.market,
        editorialMarket,
      );
      const validation = validateCmsSnapshotForDelivery("industry", projected, "publish");
      return validation.success
        ? []
        : validation.errors.map((error) => ({
            market: destination.market,
            locale: destination.locale,
            error,
       }));
    } catch (error) {
      return [{
        market: destination.market,
        locale: destination.locale,
        error: error instanceof Error ? error.message : "Industry market projection failed.",
      }];
    }
  });
}

export function publishedCustomIndustryWinnerClause(
  documentIdSql: string,
  destinationMarketSql: string,
  destinationLocaleSql: string,
): string {
  return `EXISTS(
    SELECT 1
      FROM cms_market_editions custom
      JOIN cms_revisions custom_revision
        ON custom_revision.id=custom.published_revision_id
       AND custom_revision.edition_id=custom.id
       AND custom_revision.workflow_state='approved'
      JOIN cms_documents custom_document
        ON custom_document.id=custom.document_id
     WHERE custom.document_id=${documentIdSql}
       AND custom.market=${destinationMarketSql}
       AND custom.locale=${destinationLocaleSql}
       AND custom.content_mode='custom'
       AND custom.publication_state='published'
       AND custom.published_at<=now()
       AND ${publicPayloadEligibilityClause("custom_document", "custom_revision")}
       AND ${industryDestinationEligibilityClause(
         "custom_document",
         "custom",
         "custom_revision",
         destinationMarketSql,
       )}
  )`;
}

async function documentAvailability(
  client: Queryable,
  documentId: string,
  auth: AuthContext,
  affectedVersion?: number | null,
) {
  const state = await client.query(
    `SELECT state.draft_version,state.reviewed_version,state.published_version,state.reviewed_selections,
             state.reviewed_destination_pins,
            shared_source_edition_id,shared_source_revision_id,published_source_revision_id
             ,state.updated_by_user_id,d.kind
       FROM cms_document_availability_states state
       JOIN cms_documents d ON d.id=state.document_id
      WHERE state.document_id=$1`,
    [documentId],
  );
  const stateRow = state.rows[0] ?? {
    draft_version: 0, reviewed_version: null, published_version: 0, reviewed_selections: [],
     updated_by_user_id: null, reviewed_destination_pins: [],
  };
  const reviewed = new Map(
    availabilitySelections(stateRow.reviewed_selections)
      .map((selection) => [`${selection.marketEditionId}|${selection.locale}`, selection.decision]),
  );
  const destinations = await client.query(
    `SELECT m.id market_edition_id,m.code market,configured_locale.locale,m.display_name,
            CASE WHEN a.market_edition_id IS NULL THEN 'off'
                 ELSE COALESCE(a.draft_decision,a.published_decision,'inherit') END staged_decision,
            CASE WHEN a.market_edition_id IS NULL THEN 'off'
                 ELSE COALESCE(a.published_decision,'inherit') END published_decision,
            EXISTS(
              SELECT 1 FROM cms_market_editions exact
               WHERE exact.document_id=$1 AND exact.market=m.code
                 AND exact.locale=configured_locale.locale AND exact.content_mode='custom'
            ) customized
       FROM market_editions m
       CROSS JOIN LATERAL (
         SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
          WHERE locale IS NOT NULL
       ) configured_locale
       LEFT JOIN cms_document_market_availability a
         ON a.document_id=$1 AND a.market_edition_id=m.id AND a.locale=configured_locale.locale
      WHERE m.enabled=true
      ORDER BY m.is_canonical DESC,m.display_name,m.code`,
    [documentId],
  );
  const visibleDestinations = [];
  for (const row of destinations.rows as Array<Record<string, any>>) {
    if (await canAccessContent(auth.user, {
      topic: stateRow.kind as CmsDocumentTopic,
      capability: "view",
      marketCode: String(row.market),
    })) visibleDestinations.push(row);
  }
  const items = visibleDestinations.map((row) => {
      const marketEditionId = String(row.market_edition_id);
      const publishedDecision = String(row.published_decision) as AvailabilityDecision;
      const stagedDecision = String(row.staged_decision) as AvailabilityDecision;
      const values = effectiveAvailability(publishedDecision, stagedDecision);
      const reviewedDecision = reviewed.get(`${marketEditionId}|${row.locale}`) ?? null;
      return {
        marketEditionId,
        market: row.market,
        locale: row.locale,
        displayName: row.display_name,
        stagedDecision,
        reviewedDecision,
        publishedDecision,
        publishedEffectiveAvailable: values.published,
        pending: stagedDecision !== publishedDecision,
        customized: Boolean(row.customized),
      };
    });
  const changed = items.filter((item) =>
    affectedVersion === stateRow.reviewed_version
      ? item.reviewedDecision !== null && item.reviewedDecision !== item.publishedDecision
      : item.stagedDecision !== item.publishedDecision,
  );
  const source = stateRow.shared_source_edition_id
    ? await client.query(
        `SELECT e.id,e.market,e.locale,
                COALESCE(r.source_revision_id,e.customized_from_revision_id) source_revision_id
           FROM cms_market_editions e
           LEFT JOIN cms_revisions r ON r.id=$3 AND r.edition_id=e.id
          WHERE e.id=$1 AND e.document_id=$2 AND e.content_mode='shared'`,
        [stateRow.shared_source_edition_id, documentId, stateRow.shared_source_revision_id],
      )
    : { rows: [] };
  const requiresSharedSource = Boolean(
    stateRow.shared_source_revision_id || stateRow.shared_source_edition_id,
  )
    || await availabilityRequiresSharedSource(client, documentId);
  const configuredMarketCodes: string[] = [...new Set<string>(
    destinations.rows.map((row: Record<string, unknown>) => String(row.market)),
  )];
  // These are the exact server decisions used by the review and publication
  // mutations below.  In particular, do not project them from marketCodes or
  // from the team-work response: a shared action needs each exact Shared and
  // Regional destination grant. The author check is part of the
  // availability snapshot authority, not document/revision authorship.
  const regionalReview = await canAccessMarkets(
    auth,
    stateRow.kind as CmsDocumentTopic,
    "review",
    configuredMarketCodes,
  );
  const sharedReview = await canAccessSharedDestinationMatrix(
    auth,
    stateRow.kind as CmsDocumentTopic,
    "review",
    configuredMarketCodes,
  );
  const regionalPublish = await canAccessMarkets(
    auth,
    stateRow.kind as CmsDocumentTopic,
    "publish",
    configuredMarketCodes,
  );
  const sharedPublish = await canAccessSharedDestinationMatrix(
    auth,
    stateRow.kind as CmsDocumentTopic,
    "publish",
    configuredMarketCodes,
  );
  const isAvailabilitySnapshotAuthor = Boolean(
    stateRow.updated_by_user_id
    && String(stateRow.updated_by_user_id) === String(auth.user.id),
  );
  const reviewBlockedReason = isAvailabilitySnapshotAuthor
    ? "self-review" as const
    : !regionalReview
      ? "missing-regional-grant" as const
      : requiresSharedSource && !sharedReview
        ? "missing-shared-grant" as const
        : null;
  return {
    documentId,
    draftVersion: Number(stateRow.draft_version),
    reviewedVersion: stateRow.reviewed_version === null ? null : Number(stateRow.reviewed_version),
    publishedVersion: Number(stateRow.published_version),
    sharedSource: source.rows[0] ? {
      editionId: String(source.rows[0].id),
      revisionId: stateRow.shared_source_revision_id
        ? String(stateRow.shared_source_revision_id)
        : null,
      publishedRevisionId: stateRow.published_source_revision_id
        ? String(stateRow.published_source_revision_id)
        : null,
      sourceRevisionId: source.rows[0].source_revision_id
        ? String(source.rows[0].source_revision_id)
        : null,
      market: source.rows[0].market,
      locale: source.rows[0].locale,
    } : null,
    // Destination staging is document-wide. A legacy shared-source pointer is
    // required only to release legacy shared delivery, not to stage the full
    // market matrix for a neutral-baseline managed edition.
    canEditShared: await canAccessMarkets(
      auth,
      stateRow.kind as CmsDocumentTopic,
      "edit",
      destinations.rows.map((row: { market: string }) => String(row.market)),
    ),
    canReviewShared: !isAvailabilitySnapshotAuthor && regionalReview
      && (!requiresSharedSource || sharedReview),
    reviewBlockedReason,
    canPublishShared: regionalPublish && (!requiresSharedSource || sharedPublish),
    items,
    affectedEditions: changed.map((item) => `${item.market}/${item.locale}`),
  };
}

async function ensureAvailabilityState(client: Queryable, documentId: string) {
  await client.query(
    `INSERT INTO cms_document_availability_states(document_id)
     VALUES ($1) ON CONFLICT (document_id) DO NOTHING`,
    [documentId],
  );
}

async function getDocument(
  id: string,
  auth: AuthContext,
  market?: string,
  locale?: string,
) {
  const sql = scopedDocumentSelect(2, 3, 4);
  let result = await pool.query(`${sql} WHERE d.id=$1`, [
    id,
    market ?? null,
    locale ?? null,
    requesterMarkets(auth),
  ]);
  // A shared source may deliberately use the internal shared-source/und
  // address, which is not an editor market assignment. Re-query unscoped only
  // after the destination-wide shared-source authorization succeeds.
  if (!result.rows[0]?.revision_id && market && locale
    && await canAccessEditionTarget(pool, auth, id, market, locale)) {
    result = await pool.query(`${sql} WHERE d.id=$1`, [
      id,
      market,
      locale ?? null,
      null,
    ]);
  }
  return result.rows[0] ? mapDocument(result.rows[0]) : null;
}

router.get(
  "/documents",
  asyncRoute(async (req, res) => {
    const parsed = ListDocumentsQueryParams.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document filters." });
      return;
    }
    const q = parsed.data;
    const auth = res.locals.auth as AuthContext;
    const scopedSelect = scopedDocumentSelect(4, 5, 6);
    const result = await pool.query(
      `${scopedSelect}
       WHERE ($1::text IS NULL OR d.title ILIKE '%'||$1||'%' OR d.canonical_slug ILIKE '%'||$1||'%')
         AND ($2::text IS NULL OR d.kind=$2)
         AND ($3::text IS NULL OR EXISTS(SELECT 1 FROM cms_market_editions me
              WHERE me.document_id=d.id AND me.market=$3
                AND ($6::text[] IS NULL OR me.market=ANY($6::text[]))))
         AND EXISTS(SELECT 1 FROM cms_market_editions visible
              WHERE visible.document_id=d.id
                AND ($4::text IS NULL OR visible.market=$4)
                AND ($5::text IS NULL OR visible.locale=$5)
                AND ($6::text[] IS NULL OR visible.market=ANY($6::text[])))
       ORDER BY d.updated_at DESC`,
      [
        q.search ?? null,
        q.kind ?? null,
        q.market ?? null,
        q.market ?? null,
        q.locale ?? null,
        requesterMarkets(auth),
      ],
    );
    let items = result.rows.map(mapDocument);
    const discoveryMarkets = q.market
      ? [q.market]
      : requesterMarkets(auth) ?? (await pool.query(
        "SELECT code FROM market_editions WHERE enabled=true ORDER BY code",
      )).rows.map((row: { code: string }) => String(row.code));
    if (discoveryMarkets.length) {
      const inheritedItems = [];
      for (const targetMarket of discoveryMarkets) {
        const targetLocaleResult = q.locale
          ? { rows: [{ default_locale: q.locale }] }
          : await pool.query(
              "SELECT default_locale FROM market_editions WHERE code=$1 AND enabled=true",
              [targetMarket],
            );
        const targetLocale = targetLocaleResult.rows[0]?.default_locale;
        if (!targetLocale) continue;
        const candidates = await navigationCandidates(targetMarket, String(targetLocale));
        if (!candidates) continue;
        const inherited = await pool.query(
          `WITH inherited AS (
            SELECT DISTINCT ON (d.id)
                  d.id,d.kind,d.canonical_slug,d.title,d.owner_id,d.status root_status,
                  d.created_at,d.updated_at,
                   ARRAY[$1::text]::text[] markets,
                  false can_permanently_delete,
                  e.id edition_id,r.id revision_id,r.revision_number,r.payload,r.workflow_state,
                  e.publication_state,e.publish_at,e.published_at,e.published_revision_id,
                  true inherited,e.market effective_market,e.locale effective_locale
             FROM unnest($3::text[],$4::text[]) WITH ORDINALITY
                    AS candidate(market,locale,rank)
             JOIN cms_market_editions e
                ON e.market=candidate.market AND e.locale=candidate.locale
              AND e.publication_state='published' AND e.published_at<=now()
             JOIN cms_documents d ON d.id=e.document_id AND d.status='active'
             JOIN cms_revisions r
               ON r.id=e.published_revision_id AND r.edition_id=e.id
              AND r.workflow_state='approved'
            WHERE (candidate.market<>$1 OR candidate.locale<>$2)
              AND NOT EXISTS (
                SELECT 1 FROM cms_market_editions exact
                 WHERE exact.document_id=d.id
                   AND exact.market=$1 AND exact.locale=$2
              )
              AND ($5::text IS NULL OR d.kind=$5)
              AND ($6::text IS NULL OR r.payload->>'title' ILIKE '%'||$6||'%'
                   OR r.payload->>'slug' ILIKE '%'||$6||'%')
            ORDER BY d.id,candidate.rank
         )
         SELECT * FROM inherited ORDER BY updated_at DESC`,
          [
            targetMarket,
            targetLocale,
            candidates.map((candidate) => candidate.market),
            candidates.map((candidate) => candidate.locale),
            q.kind ?? null,
            q.search ?? null,
          ],
        );
        inheritedItems.push(...inherited.rows.map(mapDocument));
      }
      const existing = new Set(items.map((item) => item.id));
      for (const item of inheritedItems) {
        if (existing.has(item.id)) continue;
        existing.add(item.id);
        items.push(item);
      }
    }
    // The SQL market pre-filter is intentionally only an optimization.  It
    // cannot decide a topic capability (and administrators may have an empty
    // configured matrix), so never serialize a revision-derived list item
    // until its exact edition has passed the authoritative view check.
    items = (await Promise.all(items.map(async (item) => {
      if (item.inherited && q.market && q.locale) {
        return await canAccessEditionTarget(
          pool,
          auth,
          item.id,
          q.market,
          q.locale,
          "view",
        ) ? item : null;
      }
      return listedDocumentForAuth(auth, item.id, q.market, q.locale);
    })))
      .filter((item): item is typeof items[number] => item !== null);
    if (q.status) items = items.filter((item) => item.status === q.status);
    // Readiness is evaluated for every eligible document before pagination.
    // It is intentionally opt-in while operations coordinates application of
    // the additive shared-market migration.
    if (q.readiness) {
      const matchingIds = await filterSharedMarketReadiness(
        pool, items.map((item) => item.id), q.readiness, requesterMarkets(res.locals.auth),
        q.market, q.locale,
      );
      items = items.filter((item) => matchingIds.has(item.id));
    }
    const total = items.length;
    items = items.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    res.json(pageOf(items, total, q.page, q.pageSize));
  }),
);

router.post(
  "/documents/:documentId/editions",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = CreateDocumentEditionOverrideBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid edition override.", details: parsed.error.issues });
      return;
    }
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, documentId)) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      // Creating a regional copy is authorized by the requested destination,
      // not by the internal shared-source address. If this target currently is
      // the shared source's legacy real-market address, the transaction below
      // moves that *same* source edition to shared-source/und before creating
      // the independent regional draft.
      const source = await client.query(
        `SELECT d.kind,r.id,r.payload,e.id edition_id,e.market,e.locale,
                COALESCE(e.editorial_market,e.market) editorial_market
           FROM cms_documents d
           JOIN cms_document_availability_states state ON state.document_id=d.id
           JOIN cms_market_editions e
             ON e.id=state.shared_source_edition_id AND e.document_id=d.id
               AND e.content_mode='shared'
           JOIN cms_revisions r ON r.edition_id=e.id
          WHERE d.id=$1
            AND ($2::uuid IS NULL OR r.id=$2)
          ORDER BY CASE WHEN r.id=state.shared_source_revision_id THEN 0 ELSE 1 END,
                   r.revision_number DESC,r.created_at DESC,r.id DESC
           LIMIT 1
           FOR UPDATE OF e,r`,
        [documentId, parsed.data.sourceRevisionId ?? null],
      );
      if (!source.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "No saved shared source is available for this customization." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        documentId,
        String(source.rows[0].market),
        String(source.rows[0].locale),
        "edit",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You do not have Edit access to the selected source edition." });
        return;
      }
      if (!isCmsDocumentTopic(String(source.rows[0].kind)) || !await canAccessContent(transactionAuth.user, {
        topic: source.rows[0].kind as CmsDocumentTopic,
        capability: "edit",
        marketCode: parsed.data.market,
      })) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You do not have Edit access to this destination." });
        return;
      }
      const existingTarget = await client.query(
        `SELECT id,content_mode FROM cms_market_editions
          WHERE document_id=$1 AND market=$2 AND locale=$3
          ORDER BY created_at,id LIMIT 1
          FOR UPDATE`,
        [documentId, parsed.data.market, parsed.data.locale],
      );
      let relocatedSource: { market: string; locale: string } | null = null;
      if (existingTarget.rowCount) {
        if (String(existingTarget.rows[0].id) !== String(source.rows[0].edition_id)
          || existingTarget.rows[0].content_mode !== "shared") {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "That exact market and locale edition already exists." });
          return;
        }
        relocatedSource = {
          market: String(source.rows[0].market),
          locale: String(source.rows[0].locale),
        };
        await client.query(
          `UPDATE cms_market_editions
              SET editorial_market=COALESCE(editorial_market,market),
                  market='shared-source',locale='und',localized_slug=NULL,updated_at=now()
            WHERE id=$1 AND document_id=$2 AND content_mode='shared'`,
          [source.rows[0].edition_id, documentId],
        );
      }
      const edition = await client.query(
        `INSERT INTO cms_market_editions
          (document_id,market,locale,localized_slug,publication_state,fallback_mode,content_mode,customized_from_revision_id)
         VALUES ($1,$2,$3,$4,'draft','none','custom',$5) RETURNING id`,
        [documentId, parsed.data.market, parsed.data.locale, source.rows[0].payload.slug, source.rows[0].id],
      );
      const revision = await client.query(
        `INSERT INTO cms_revisions
          (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
         VALUES ($1,1,$2,$3,'draft',$4,$5,$6) RETURNING id,revision_number,created_at`,
        [
          edition.rows[0].id,
          source.rows[0].payload,
          digest(source.rows[0].payload),
          auth.user.id,
           `Customized from ${source.rows[0].market}/${source.rows[0].locale}`,
           source.rows[0].id,
        ],
      );
      await syncMediaReferences(
        client,
        documentId,
        String(revision.rows[0].id),
        source.rows[0].payload,
        String(source.rows[0].id),
        source.rows[0].kind as CmsDocumentKind,
      );
      await client.query("COMMIT");
      await audit(auth, "document.edition_override_created", "document", documentId, {
        market: parsed.data.market,
        locale: parsed.data.locale,
        sourceRevisionId: String(source.rows[0].id),
      });
      if (relocatedSource) {
        await audit(auth, "document.shared_source_relocated", "document", documentId, {
          from: relocatedSource,
          to: { market: "shared-source", locale: "und" },
          sourceEditionId: String(source.rows[0].edition_id),
          sourceRevisionId: String(source.rows[0].id),
          reason: "regional customization of the legacy shared-source destination",
        });
      }
      res.status(201).json({
        id: String(revision.rows[0].id),
        documentId,
        number: revision.rows[0].revision_number,
        market: parsed.data.market,
        locale: parsed.data.locale,
        snapshot: source.rows[0].payload,
        note: `Customized from ${source.rows[0].market}/${source.rows[0].locale}`,
        createdBy: auth.user.id,
        createdAt: revision.rows[0].created_at,
      });
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        res.status(409).json({ error: "That exact market and locale edition already exists." });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents",
  requireCsrf,
  asyncRoute(async (req, res) => {
    if (req.body?.seo !== undefined && !cmsSeoSchema.safeParse(req.body.seo).success) {
      const seo = cmsSeoSchema.safeParse(req.body.seo);
      res.status(400).json({
        error: "Invalid document SEO metadata.",
        details: seo.success ? [] : seo.error.issues.map((issue) => ({ ...issue, path: ["seo", ...issue.path] })),
      });
      return;
    }
    const parsed = CreateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document.", details: parsed.error.issues });
      return;
    }
    if (
      !isCmsConfigurationIdentityValid(parsed.data.kind, parsed.data.slug, parsed.data.content)
    ) {
      res.status(409).json({ error: "Contact email configuration must use its canonical singleton slug." });
      return;
    }
    const validated = validateSnapshot(parsed.data.kind, payload(parsed.data), "draft");
    if (!validated.success) {
      res.status(422).json({ error: "Content contract validation failed.", ...validationErrorBody(validated) });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      // Freeze destination configuration while the selected-market authority
      // snapshot is checked and all dependent rows are inserted.
      await client.query("LOCK TABLE market_editions IN SHARE MODE");
      const configuredMarkets = await client.query(
        "SELECT code FROM market_editions WHERE enabled=true FOR UPDATE",
      );
      if (parsed.data.sharedLocale !== undefined) {
        if (parsed.data.kind === "person") {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "Person documents retain their independent market lifecycle and cannot opt into a neutral shared source.",
          });
          return;
        }
        const selectedMarkets = await client.query(
          `SELECT id,code,default_locale,fallback_locale
             FROM market_editions
            WHERE enabled=true AND code=ANY($1::text[])
            FOR UPDATE`,
          [parsed.data.markets],
        );
        if (selectedMarkets.rows.length !== parsed.data.markets.length) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Every requested shared destination market must be enabled and configured." });
          return;
        }
        // A deliberately neutral baseline has no country master. Its creation
        // requires the shared and regional capability at every destination,
        // rather than selecting the first requested country as an authority.
        if (!(await Promise.all(parsed.data.markets.map((market) => canAccessContent(transactionAuth.user, {
          topic: parsed.data.kind as CmsDocumentTopic,
          capability: "edit",
          marketCode: market,
          scope: "shared",
          sourceMarketCode: market,
          destinationMarketCodes: parsed.data.markets,
        })))).every(Boolean)) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to every requested market." });
          return;
        }
        if (selectedMarkets.rows.some((market) =>
          ![market.default_locale, market.fallback_locale].includes(parsed.data.sharedLocale),
        )) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "The neutral shared locale must be configured as the default or fallback locale of every selected destination, and every destination must remain assigned.",
          });
          return;
        }
        const root = await client.query(
          `INSERT INTO cms_documents(kind,canonical_slug,title,owner_id,status)
           VALUES ($1,$2,$3,$4,'active') RETURNING id`,
          [parsed.data.kind, parsed.data.slug, parsed.data.title, transactionAuth.user.id],
        );
        const documentId = String(root.rows[0].id);
        const snapshot = validated.data;
        const baseline = await client.query(
          `INSERT INTO cms_shared_baselines(document_id,locale,created_by_user_id)
           VALUES ($1,$2,$3) RETURNING id,created_at`,
          [documentId, parsed.data.sharedLocale, transactionAuth.user.id],
        );
        const mediaReferences = await mediaPinsForNewSharedSnapshot(
          client,
          snapshot,
          parsed.data.kind,
        );
        const baselineRevision = await client.query(
          `INSERT INTO cms_shared_baseline_revisions
             (baseline_id,revision_number,snapshot,media_references,content_digest,
              source_revision_id,created_by_user_id)
           VALUES ($1,1,$2,$3,$4,NULL,$5)
           RETURNING id,revision_number`,
          [
            baseline.rows[0].id,
            snapshot,
            JSON.stringify(mediaReferences),
            digest(snapshot),
            transactionAuth.user.id,
          ],
        );
        await client.query(
          `UPDATE cms_shared_baselines
              SET active_revision_id=$2,updated_at=now()
            WHERE id=$1`,
          [baseline.rows[0].id, baselineRevision.rows[0].id],
        );
        for (const market of selectedMarkets.rows) {
          const binding = await client.query(
            `INSERT INTO cms_market_edition_bindings
               (document_id,market_edition_id,locale,mode,baseline_id,
                based_on_baseline_revision_id,override_operations,version,
                translation_state,updated_by_user_id)
             VALUES ($1,$2,$3,'shared',$4,$5,'[]'::jsonb,1,'current',$6)
             RETURNING id`,
            [
              documentId,
              market.id,
              parsed.data.sharedLocale,
              baseline.rows[0].id,
              baselineRevision.rows[0].id,
              transactionAuth.user.id,
            ],
          );
          const revisionId = await materializeSharedMarketRevision(client, {
            documentId,
            market: String(market.code),
            locale: String(parsed.data.sharedLocale),
            snapshot,
            baselineRevisionId: String(baselineRevision.rows[0].id),
            bindingId: String(binding.rows[0].id),
            userId: transactionAuth.user.id,
            mediaReferences,
          });
          await client.query(
            `UPDATE cms_market_edition_bindings
                SET materialized_revision_id=$2
              WHERE id=$1`,
            [binding.rows[0].id, revisionId],
          );
        }
        await audit(transactionAuth, "shared-neutral-baseline-created", "shared-baseline",
          String(baseline.rows[0].id), {
            documentId,
            baselineRevisionId: String(baselineRevision.rows[0].id),
            locale: parsed.data.sharedLocale,
            destinationMarkets: parsed.data.markets,
            authorityProof: "explicit-shared-and-regional-all-destinations",
          }, client);
        await client.query(
          `INSERT INTO cms_document_market_availability
             (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
           SELECT $1,m.id,configured_locale.locale,'off',
                  CASE WHEN m.code=ANY($2::text[]) AND configured_locale.locale=$3
                       THEN 'show' ELSE 'off' END,$4
             FROM market_editions m
             CROSS JOIN LATERAL (
               SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
                WHERE locale IS NOT NULL
             ) configured_locale
            WHERE m.enabled=true`,
          [documentId, parsed.data.markets, parsed.data.sharedLocale, transactionAuth.user.id],
        );
        await client.query(
          `INSERT INTO cms_document_availability_states
             (document_id,draft_version,shared_source_edition_id,shared_source_revision_id,updated_by_user_id)
           VALUES ($1,1,NULL,NULL,$2)`,
          [documentId, transactionAuth.user.id],
        );
        await client.query("COMMIT");
        const selectedMarket = String(parsed.data.markets[0]);
        await audit(transactionAuth, "document.created", "document", documentId, {
          sharedLocale: parsed.data.sharedLocale,
          destinationMarkets: parsed.data.markets,
        });
        const document = await getDocument(
          documentId,
          transactionAuth,
          selectedMarket,
          parsed.data.sharedLocale,
        );
        res.status(201).json(document);
        return;
      }
      const configuredMarketCodes = configuredMarkets.rows.map((row) => String(row.code));
      const sourceMarket = parsed.data.markets[0];
      if (!await canAccessContent(transactionAuth.user, {
        topic: parsed.data.kind as CmsDocumentTopic,
        capability: "edit",
        marketCode: sourceMarket,
        scope: "shared",
        sourceMarketCode: sourceMarket,
        destinationMarketCodes: configuredMarketCodes,
      })) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Creating shared content requires authority for every enabled destination market." });
        return;
      }
      const root = await client.query(
        `INSERT INTO cms_documents(kind,canonical_slug,title,owner_id,status)
         VALUES ($1,$2,$3,$4,'active') RETURNING id`,
        [parsed.data.kind, parsed.data.slug, parsed.data.title, transactionAuth.user.id],
      );
      const snapshot = validated.data;
      const edition = await client.query(
        `INSERT INTO cms_market_editions
          (document_id,market,locale,localized_slug,publication_state,content_mode)
         SELECT $1,m.code,m.default_locale,$3,'draft','shared'
           FROM market_editions m WHERE m.code=$2 AND m.enabled=true
         RETURNING id,market,locale`,
        [root.rows[0].id, sourceMarket, parsed.data.slug],
      );
      if (!edition.rowCount) throw new Error(`Enabled market ${sourceMarket} does not exist.`);
      const revision = await client.query(
        `INSERT INTO cms_revisions
          (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
         VALUES ($1,1,$2,$3,'draft',$4,'Initial shared draft') RETURNING id`,
        [edition.rows[0].id, snapshot, digest(snapshot), transactionAuth.user.id],
      );
      await syncMediaReferences(
        client,
        String(root.rows[0].id),
        String(revision.rows[0].id),
        snapshot,
        undefined,
        parsed.data.kind,
      );
      await client.query(
        `INSERT INTO cms_document_market_availability
           (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
         SELECT $1,m.id,configured_locale.locale,
                'off',CASE WHEN m.code=ANY($2::text[]) THEN 'show' ELSE 'off' END,$3
           FROM market_editions m
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
              WHERE locale IS NOT NULL
           ) configured_locale
          WHERE m.enabled=true`,
        [root.rows[0].id, parsed.data.markets, transactionAuth.user.id],
      );
      await client.query(
        `INSERT INTO cms_document_availability_states
          (document_id,draft_version,shared_source_edition_id,shared_source_revision_id,updated_by_user_id)
         VALUES ($1,1,$2,$3,$4)`,
        [root.rows[0].id, edition.rows[0].id, revision.rows[0].id, transactionAuth.user.id],
      );
      await client.query("COMMIT");
      const selectedMarket = sourceMarket;
      const selectedConfig = await pool.query(
        "SELECT default_locale FROM market_editions WHERE code=$1",
        [selectedMarket],
      );
      const document = await getDocument(
        String(root.rows[0].id),
        transactionAuth,
        selectedMarket,
        selectedConfig.rows[0]?.default_locale,
      );
      await audit(transactionAuth, "document.created", "document", String(root.rows[0].id));
      res.status(201).json(document);
    } catch (error) {
      await client.query("ROLLBACK");
      if (error instanceof Error && (
        error.message.includes("Snapshot media asset")
        || error.message.includes("immutable media version")
      )) {
        res.status(422).json({ error: error.message });
        return;
      }
      if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
        res.status(409).json({ error: "That URL slug is already in use. Choose a different slug and try again." });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.get(
  "/documents/:documentId",
  asyncRoute(async (req, res) => {
    const market = typeof req.query.market === "string" ? req.query.market : "";
    const locale = typeof req.query.locale === "string" ? req.query.locale : "";
    if (!market || !locale) {
      res.status(400).json({ error: "Both market and locale are required." });
      return;
    }
    if (!await canAccessEditionTarget(
      pool, res.locals.auth as AuthContext, String(req.params.documentId), market, locale,
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const document = await getDocument(
      String(req.params.documentId),
      res.locals.auth as AuthContext,
      market,
      locale,
    );
    if (!document) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    if (!document.currentRevisionId) {
      res.status(404).json({ error: "Exact document edition not found." });
      return;
    }
    // Access was already checked against the exact requested edition above.
    // In particular, `shared-source/und` is an internal authoring address,
    // not a market assignment. Re-checking mapDocument().markets here would
    // reject an editor who is authorized for every real destination solely
    // because they are not (and must not be) assigned to `shared-source`.
    res.json(document);
  }),
);

router.get(
  "/documents/:documentId/editions",
  asyncRoute(async (req, res) => {
    const documentId = String(req.params.documentId);
    const document = await pool.query("SELECT kind FROM cms_documents WHERE id=$1", [documentId]);
    if (!document.rowCount) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const configured = await pool.query(
      `SELECT code,default_locale,fallback_market_code,fallback_locale
         FROM market_editions WHERE enabled=true
        ORDER BY is_canonical DESC,display_name,code`,
    );
    const actualEditions = await pool.query(
      `SELECT DISTINCT e.market,e.locale
         FROM cms_market_editions e
         JOIN market_editions m ON m.code=e.market AND m.enabled=true
        WHERE e.document_id=$1
        ORDER BY e.market,e.locale`,
      [documentId],
    );
    const items = [];
    for (const target of configured.rows) {
      const locales = [...new Set([
        target.default_locale,
        target.fallback_locale,
        ...actualEditions.rows
          .filter((edition) => edition.market === target.code)
          .map((edition) => edition.locale),
      ].filter(Boolean))];
      for (const targetLocale of locales) {
        // This listing carries exact revision/workflow metadata. Apply the
        // same managed adopted-source guard as the editor read route rather
        // than exposing a managed destination to a destination-only editor.
        if (!await canAccessEditionTarget(
          pool,
          auth,
          documentId,
          String(target.code),
          String(targetLocale),
        )) continue;
        const candidates = await navigationCandidates(target.code, String(targetLocale)) ?? [];
        const exactResult = await pool.query(
        `SELECT e.publication_state,e.published_revision_id,
                latest.id revision_id,latest.revision_number,latest.workflow_state,latest.payload
           FROM cms_market_editions e
           LEFT JOIN LATERAL (
             SELECT r.id,r.revision_number,r.workflow_state,r.payload
               FROM cms_revisions r WHERE r.edition_id=e.id
              ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC LIMIT 1
           ) latest ON true
          WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
          ORDER BY e.created_at,e.id LIMIT 1`,
          [documentId, target.code, targetLocale],
        );
        const exact = exactResult.rows[0] ?? null;
        let effective: Record<string, any> | null = null;
        let fallbackReason: string | null = null;
        for (const candidate of candidates) {
          const found = await pool.query(
          `SELECT e.market,e.locale,e.publication_state,
                  published.id revision_id,published.revision_number,
                   published.workflow_state,published.payload
             FROM cms_market_editions e
             LEFT JOIN LATERAL (
               SELECT r.* FROM cms_revisions r
                WHERE r.id=e.published_revision_id
                  AND r.workflow_state='approved'
                  AND e.publication_state='published'
                  AND e.published_at<=now()
                LIMIT 1
             ) published ON true
            WHERE e.document_id=$1 AND e.market=$2
              AND ($3::text IS NULL OR e.locale=$3)
               AND ${managedMarketPublicDeliveryClause("e.document_id", "e", "$4", "$5")}
            ORDER BY CASE WHEN e.locale=$3 THEN 0 ELSE 1 END,e.created_at,e.id LIMIT 1`,
           [documentId, candidate.market, candidate.locale, target.code, targetLocale],
        );
          if (found.rowCount && found.rows[0].revision_id) {
            effective = found.rows[0];
            fallbackReason = candidate.market === target.code
              ? (candidate.locale === targetLocale ? null : "locale")
              : "market-locale";
            break;
          }
        }
        let readiness = exact?.payload
          ? savedRevisionReadiness(document.rows[0].kind, exact.payload, exact.workflow_state)
          : {
            ready: false,
            readinessErrors: ["No exact edition exists."],
            readinessIssues: [{
              category: "missing" as const,
              message: "No exact edition exists.",
              action: "create" as const,
            }],
          };
        if (exact?.payload && exact.revision_id) {
          const mediaErrors = await revisionMediaGovernanceErrors(
            pool,
            documentId,
            String(exact.revision_id),
            document.rows[0].kind as CmsDocumentKind,
            exact.payload as Record<string, any>,
          );
          if (mediaErrors.length) {
            readiness = {
              ready: false,
              readinessErrors: [...readiness.readinessErrors, ...mediaErrors],
              readinessIssues: [
                ...readiness.readinessIssues,
                ...mediaErrors.map((message) => ({
                  category: "validation" as const,
                  message,
                  action: "edit" as const,
                })),
              ],
            };
          }
        }
        items.push({
          market: target.code,
          locale: targetLocale,
          exact: Boolean(exact),
          effectiveMarket: effective?.market ?? null,
          effectiveLocale: effective?.locale ?? null,
          usedFallback: Boolean(effective && (
            effective.market !== target.code || effective.locale !== targetLocale
          )),
          fallbackReason,
          publicationState: exact?.publication_state ?? null,
          workflowState: exact?.workflow_state ?? null,
          revisionId: exact?.revision_id ? String(exact.revision_id) : null,
          revisionNumber: exact?.revision_number ?? null,
          effectivePublicationState: effective?.publication_state ?? null,
          effectiveWorkflowState: effective?.workflow_state ?? null,
          effectiveRevisionId: effective?.revision_id ? String(effective.revision_id) : null,
          effectiveRevisionNumber: effective?.revision_number ?? null,
          hasEffectivePublishedRevision: Boolean(effective?.revision_id),
          ready: readiness.ready,
          readinessErrors: readiness.readinessErrors,
          readinessIssues: readiness.readinessIssues,
        });
      }
    }
    res.json({ documentId, items });
  }),
);

router.get(
  "/documents/:documentId/market-availability",
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const document = await pool.query(
      "SELECT kind FROM cms_documents WHERE id=$1",
      [id],
    );
    if (!document.rowCount) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    if (document.rows[0].kind !== "person") {
      res.status(409).json({ error: "Market availability is only supported for people." });
      return;
    }
    const result = await pool.query(
      `SELECT m.id market_edition_id,m.code market,m.display_name,m.enabled,
              COALESCE(a.published_decision,'inherit') published_decision,
              a.draft_decision,
              EXISTS(SELECT 1 FROM cms_market_editions e
                WHERE e.document_id=$1 AND e.market=m.code) has_edition,
              COALESCE(a.published_decision,'inherit')<>'off' published_effective_available,
              COALESCE(a.draft_decision,a.published_decision,'inherit')<>'off' preview_effective_available,
              a.updated_at,a.published_at
         FROM market_editions m
          LEFT JOIN cms_document_market_availability a
            ON a.document_id=$1 AND a.market_edition_id=m.id AND a.locale=m.default_locale
        ORDER BY m.is_canonical DESC,m.display_name,m.code`,
      [id],
    );
    const auth = res.locals.auth as AuthContext;
    const visibleRows = [];
    for (const row of result.rows) {
      if (await canAccessEditionTarget(
        pool,
        auth,
        String(req.params.documentId),
        String(row.market),
        String(row.locale),
      )) {
        visibleRows.push(row);
      }
    }
    res.json({
      documentId: id,
      items: visibleRows.map((row) => ({
        marketEditionId: String(row.market_edition_id),
        market: row.market,
        displayName: row.display_name,
        enabled: row.enabled,
        publishedDecision: row.published_decision,
        publishedEffectiveAvailable: row.published_effective_available,
        pendingDecision: row.draft_decision ?? null,
        previewEffectiveAvailable: row.preview_effective_available,
        hasEdition: row.has_edition,
        updatedAt: row.updated_at ?? null,
        publishedAt: row.published_at ?? null,
      })),
    });
  }),
);

router.get(
  "/documents/:documentId/availability",
  asyncRoute(async (req, res) => {
    const documentId = String(req.params.documentId);
    const exists = await pool.query("SELECT 1 FROM cms_documents WHERE id=$1", [documentId]);
    if (!exists.rowCount) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    res.json(await documentAvailability(pool, documentId, res.locals.auth as AuthContext));
  }),
);

router.put(
  "/documents/:documentId/availability",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = UpdateDocumentAvailabilityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid shared-content availability.", details: parsed.error.issues });
      return;
    }
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const ids = parsed.data.destinations.map((destination) => destination.marketEditionId);
    if (new Set(parsed.data.destinations.map((destination) =>
      `${destination.marketEditionId}|${destination.locale}`,
    )).size !== ids.length) {
      res.status(400).json({ error: "A configured edition can only be selected once." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const exists = await client.query("SELECT id,kind FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      if (!exists.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      await ensureAvailabilityState(client, documentId);
      const state = await client.query(
        `SELECT draft_version FROM cms_document_availability_states
          WHERE document_id=$1 FOR UPDATE`,
        [documentId],
      );
      if (Number(state.rows[0].draft_version) !== parsed.data.version) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Destination selection has been changed by another user. Reload before saving." });
        return;
      }
      await client.query("LOCK TABLE market_editions IN SHARE MODE");
      const configured = await client.query(
        `SELECT m.id,m.code,configured_locale.locale
           FROM market_editions m
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
              WHERE locale IS NOT NULL
           ) configured_locale
          WHERE m.enabled=true
          FOR UPDATE OF m`,
      );
      if (!availabilitySelectionKeysMatchDestinations(parsed.data.destinations, configured.rows)) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Destination configuration changed. Reopen the complete matrix and choose every destination.",
        });
        return;
      }
      if (!await canAccessMarkets(
        transactionAuth,
        exists.rows[0].kind as CmsDocumentTopic,
        "edit",
        configured.rows.map((row) => String(row.code)),
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to every selected market." });
        return;
      }
      for (const destination of parsed.data.destinations) {
        await client.query(
          `INSERT INTO cms_document_market_availability
            (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
           VALUES ($1,$2,$3,'off',$4,$5)
           ON CONFLICT (document_id,market_edition_id,locale) DO UPDATE
             SET draft_decision=EXCLUDED.draft_decision,
                 updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()`,
          [documentId, destination.marketEditionId, destination.locale, destination.decision, transactionAuth.user.id],
        );
      }
      await client.query(
        `UPDATE cms_document_availability_states
            SET draft_version=draft_version+1,reviewed_version=NULL,
                reviewed_selections='[]'::jsonb,reviewed_destination_pins='[]'::jsonb,
                reviewed_source_revision_id=NULL,
                updated_by_user_id=$2,updated_at=now()
          WHERE document_id=$1`,
        [documentId, transactionAuth.user.id],
      );
      await client.query("COMMIT");
      await audit(transactionAuth, "document.availability.staged", "document", documentId, {
        version: parsed.data.version + 1,
        destinations: parsed.data.destinations,
      });
      res.json(await documentAvailability(pool, documentId, transactionAuth));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/availability/review",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = ReviewDocumentAvailabilityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid destination review version." });
      return;
    }
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const kind = await client.query(
        "SELECT kind FROM cms_documents WHERE id=$1 FOR UPDATE",
        [documentId],
      );
      if (!kind.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      await ensureAvailabilityState(client, documentId);
      const state = await client.query(
        `SELECT state.draft_version,state.shared_source_revision_id,state.updated_by_user_id,
                EXISTS (
                  SELECT 1
                    FROM cms_market_edition_bindings neutral_binding
                    JOIN cms_shared_baseline_revisions neutral_baseline
                      ON neutral_baseline.id=neutral_binding.based_on_baseline_revision_id
                   WHERE neutral_binding.document_id=state.document_id
                     AND neutral_binding.mode IN ('shared','adapted')
                     AND neutral_baseline.source_revision_id IS NULL
                ) neutral_managed,
                source_edition.editorial_market shared_source_market
           FROM cms_document_availability_states state
           LEFT JOIN cms_revisions source_revision ON source_revision.id=state.shared_source_revision_id
           LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
          WHERE state.document_id=$1 FOR UPDATE OF state`,
        [documentId],
      );
      if (!state.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      if (Number(state.rows[0].draft_version) !== parsed.data.version) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Destination selection has changed. Reload before sending for review." });
        return;
      }
      if (String(state.rows[0].updated_by_user_id ?? "") === transactionAuth.user.id) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "An independent reviewer must review destination availability staged by another user.",
        });
        return;
      }
       const requiresSharedSource = Boolean(
         state.rows[0].shared_source_revision_id || state.rows[0].shared_source_edition_id,
       )
         || await availabilityRequiresSharedSource(client, documentId);
       if (requiresSharedSource && !state.rows[0].shared_source_revision_id) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Choose and save a shared source before sending destinations for review.",
        });
        return;
      }
      const rows = await client.query(
        `SELECT m.id,m.code,configured_locale.locale,
                a.market_edition_id availability_id,a.published_decision,
                CASE WHEN a.market_edition_id IS NULL THEN 'off'
                     ELSE COALESCE(a.draft_decision,a.published_decision,'inherit') END decision
           FROM market_editions m
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
              WHERE locale IS NOT NULL
           ) configured_locale
           LEFT JOIN cms_document_market_availability a
             ON a.document_id=$1 AND a.market_edition_id=m.id AND a.locale=configured_locale.locale
          WHERE m.enabled=true FOR UPDATE OF m`,
        [documentId],
      );
      const configuredDestinationMarkets = rows.rows.map((row) => String(row.code));
       const hasReviewAuthority = requiresSharedSource
         ? await canAccessSharedDestinationMatrix(
           transactionAuth,
           kind.rows[0].kind as CmsDocumentTopic,
           "review",
           configuredDestinationMarkets,
         )
         : await canAccessMarkets(
           transactionAuth,
           kind.rows[0].kind as CmsDocumentTopic,
           "review",
           configuredDestinationMarkets,
         );
       if (!hasReviewAuthority) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: requiresSharedSource
            ? "Reviewing shared destinations requires authority for every affected market."
            : "Reviewing destinations requires authority for every affected market.",
        });
        return;
      }
      const selections = rows.rows.map((row) => ({
        marketEditionId: String(row.id),
        locale: String(row.locale),
        decision: row.decision as AvailabilityDecision,
      }));
       const destinationPins = await currentAvailabilityDestinationPins(client, documentId);
      await client.query(
        `UPDATE cms_document_availability_states
             SET reviewed_version=draft_version,reviewed_selections=$2::jsonb,
                 reviewed_destination_pins=$3::jsonb,reviewed_source_revision_id=$4,
                 reviewed_by_user_id=$5,reviewed_at=now(),updated_at=now()
          WHERE document_id=$1`,
         [
           documentId,
           JSON.stringify(selections),
           JSON.stringify(destinationPins),
           state.rows[0].shared_source_revision_id,
           transactionAuth.user.id,
         ],
      );
      await client.query("COMMIT");
      await audit(transactionAuth, "document.availability.reviewed", "document", documentId, {
        version: parsed.data.version, destinations: selections,
      });
      res.json(await documentAvailability(pool, documentId, transactionAuth, parsed.data.version));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/availability/source",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = SelectDocumentAvailabilitySourceBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "An exact source revision and selection version are required." });
      return;
    }
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const document = await client.query(
        "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE",
        [documentId],
      );
      if (!document.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth, "administrator");
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      await ensureAvailabilityState(client, documentId);
      const state = await client.query(
        `SELECT draft_version,shared_source_edition_id
           FROM cms_document_availability_states WHERE document_id=$1 FOR UPDATE`,
        [documentId],
      );
      if (Number(state.rows[0].draft_version) !== parsed.data.version) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Destination selection has been changed by another user. Reload before selecting a source." });
        return;
      }
      if (state.rows[0].shared_source_edition_id) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "A shared source is already selected. Existing source metadata is immutable." });
        return;
      }
      const source = await client.query(
        `SELECT e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,
                d.kind,r.id,r.payload
           FROM cms_revisions r
           JOIN cms_market_editions e ON e.id=r.edition_id
           JOIN cms_documents d ON d.id=e.document_id
          WHERE e.document_id=$1 AND r.id=$2
          FOR UPDATE`,
        [documentId, parsed.data.sourceRevisionId],
      );
      if (!source.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected revision is not part of this document." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        documentId,
        String(source.rows[0].market),
        String(source.rows[0].locale),
        "edit",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You do not have Edit access to the selected source edition." });
        return;
      }
      const sharedEdition = await client.query(
        `INSERT INTO cms_market_editions
           (document_id,market,locale,editorial_market,localized_slug,publication_state,fallback_mode,content_mode,customized_from_revision_id)
         VALUES ($1,'shared-source','und',$2,NULL,'draft','none','shared',$3)
         RETURNING id`,
        [documentId, source.rows[0].editorial_market, parsed.data.sourceRevisionId],
      );
      const sharedRevision = await client.query(
        `INSERT INTO cms_revisions
           (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
         VALUES ($1,1,$2,$3,'draft',$4,$5,$6)
         RETURNING id`,
        [
          sharedEdition.rows[0].id,
          source.rows[0].payload,
          digest(source.rows[0].payload),
          transactionAuth.user.id,
          `Explicit shared source from ${source.rows[0].market}/${source.rows[0].locale}`,
          parsed.data.sourceRevisionId,
        ],
      );
      await syncMediaReferences(
        client,
        documentId,
        String(sharedRevision.rows[0].id),
        source.rows[0].payload,
        parsed.data.sourceRevisionId,
        source.rows[0].kind as CmsDocumentKind,
      );
      await client.query(
        `UPDATE cms_document_availability_states
            SET draft_version=draft_version+1,shared_source_edition_id=$2,shared_source_revision_id=$3,
                reviewed_version=NULL,reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
                reviewed_destination_pins='[]'::jsonb,
                updated_by_user_id=$4,updated_at=now()
          WHERE document_id=$1`,
        [documentId, sharedEdition.rows[0].id, sharedRevision.rows[0].id, transactionAuth.user.id],
      );
      await client.query("COMMIT");
      await audit(transactionAuth, "document.availability.source_selected", "document", documentId, {
        version: parsed.data.version + 1,
        sourceRevisionId: parsed.data.sourceRevisionId,
        sharedEditionId: String(sharedEdition.rows[0].id),
        sharedRevisionId: String(sharedRevision.rows[0].id),
      });
      res.status(201).json(await documentAvailability(pool, documentId, transactionAuth));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/availability/publish",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = PublishDocumentAvailabilityBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid destination publication version." });
      return;
    }
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const document = await client.query("SELECT id,kind FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      if (!document.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      const state = await client.query(
         `SELECT state.draft_version,state.reviewed_version,state.reviewed_selections,
                  state.reviewed_destination_pins,
                shared_source_edition_id,shared_source_revision_id,published_source_revision_id,
                reviewed_source_revision_id,source_edition.editorial_market shared_source_market
           FROM cms_document_availability_states state
           LEFT JOIN cms_revisions source_revision ON source_revision.id=state.shared_source_revision_id
           LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
          WHERE state.document_id=$1 FOR UPDATE OF state`,
        [documentId],
      );
       const requiresSharedSource = state.rowCount && (
         Boolean(state.rows[0].shared_source_revision_id || state.rows[0].shared_source_edition_id)
         || await availabilityRequiresSharedSource(client, documentId)
       );
       if (!state.rowCount || Number(state.rows[0].reviewed_version) !== parsed.data.version
         || (requiresSharedSource && !state.rows[0].shared_source_revision_id)
         || state.rows[0].reviewed_source_revision_id !== state.rows[0].shared_source_revision_id) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "That reviewed destination selection is no longer available to publish." });
        return;
      }
      const selections = availabilitySelections(state.rows[0].reviewed_selections);
      if (!selections.length) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "A non-empty reviewed destination selection is required." });
        return;
      }
      // A table-level SHARE lock prevents a newly inserted market or a
      // disabled market being enabled between the matrix read and release.
      // Row locks alone cannot prevent that phantom configuration change.
      await client.query("LOCK TABLE market_editions IN SHARE MODE");
      const markets = await client.query(
        `SELECT m.id,m.code,configured_locale.locale,
                a.market_edition_id availability_id,a.published_decision
           FROM market_editions m
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
              WHERE locale IS NOT NULL
           ) configured_locale
           LEFT JOIN cms_document_market_availability a
             ON a.document_id=$1 AND a.market_edition_id=m.id AND a.locale=configured_locale.locale
           WHERE m.enabled=true
           FOR UPDATE OF m`,
        [documentId],
      );
      if (!availabilitySelectionKeysMatchDestinations(selections, markets.rows)) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Destination configuration changed since review. Reopen and review the complete destination matrix.",
        });
        return;
      }
       const reviewedPins = availabilityDestinationPins(state.rows[0].reviewed_destination_pins);
       const currentPins = await currentAvailabilityDestinationPins(client, documentId);
       if (!reviewedPins.length || !availabilityDestinationPinsMatch(reviewedPins, currentPins)) {
         await client.query("ROLLBACK");
         res.status(409).json({
           error: "Destination content changed since review. Reopen and review the complete destination matrix.",
         });
         return;
       }
      const affectedDestinationMarkets = markets.rows.flatMap((market) => {
        const selection = selections.find((candidate) =>
          candidate.marketEditionId === String(market.id)
          && candidate.locale === String(market.locale)
        );
        return selection
          && availabilityDestinationRequiresMarketAuthority(
            selection.decision,
            market.published_decision,
            market.availability_id != null,
          )
          ? [String(market.code)] : [];
      });
       const hasPublishAuthority = requiresSharedSource
         ? await canAccessSharedDestinationMatrix(
           transactionAuth,
           document.rows[0].kind as CmsDocumentTopic,
           "publish",
           markets.rows.map((market) => String(market.code)),
         )
         : await canAccessMarkets(
           transactionAuth,
           document.rows[0].kind as CmsDocumentTopic,
           "publish",
           markets.rows.map((market) => String(market.code)),
         );
       if (!hasPublishAuthority) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: requiresSharedSource
            ? "Publishing shared destinations requires authority for every affected market."
            : "Publishing destinations requires authority for every affected market.",
        });
        return;
      }
      const editions = await client.query(
        `SELECT e.id::text edition_id,e.market,e.locale,e.editorial_market,e.content_mode,
                e.publication_state,e.published_revision_id::text,r.id::text revision_id,
                r.workflow_state,r.payload
           FROM cms_market_editions e
           LEFT JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
          WHERE e.document_id=$1
          FOR UPDATE OF e`,
        [documentId],
      );
      const bindings = await client.query(
        `SELECT binding.id::text binding_id,binding.mode,destination.code market,binding.locale,
                resolved.cms_revision_id::text revision_id
           FROM cms_market_edition_bindings binding
           JOIN market_editions destination ON destination.id=binding.market_edition_id
           LEFT JOIN cms_resolved_market_revisions resolved ON resolved.binding_id=binding.id
          WHERE binding.document_id=$1
          FOR UPDATE OF binding`,
        [documentId],
      );
      const byDestination = new Map(
        editions.rows.map((edition: Record<string, unknown>) => [
          `${String(edition.market)}|${String(edition.locale)}`,
          edition,
        ]),
      );
      const resolvedBindings = new Set(
        bindings.rows.map((binding: Record<string, unknown>) =>
          `${String(binding.market)}|${String(binding.locale)}|${String(binding.revision_id)}`),
      );
      const bindingByDestination = new Map(
        bindings.rows.map((binding: Record<string, unknown>) => [
          `${String(binding.market)}|${String(binding.locale)}`,
          binding,
        ]),
      );
      const source = state.rows[0].shared_source_edition_id
        ? editions.rows.find((edition: Record<string, unknown>) =>
          String(edition.edition_id) === String(state.rows[0].shared_source_edition_id))
        : undefined;
      const sourceIsAlreadyLive = Boolean(
        source
        && state.rows[0].shared_source_revision_id
        && state.rows[0].shared_source_revision_id === state.rows[0].published_source_revision_id
        && source.content_mode === "shared"
        && source.publication_state === "published"
        && source.published_revision_id === state.rows[0].published_source_revision_id
        && source.revision_id === state.rows[0].published_source_revision_id
        && source.workflow_state === "approved",
      );
      const validateLiveRevision = async (edition: Record<string, unknown>) => {
        if (!edition.revision_id || !edition.payload
          || !validateCmsSnapshotForDelivery(document.rows[0].kind as CmsDocumentKind, edition.payload, "publish").success
          || !isPublicContentVisible(String(document.rows[0].kind), edition.payload as Record<string, unknown>)) {
          return false;
        }
        const mediaErrors = await revisionMediaGovernanceErrors(
          client,
          documentId,
          String(edition.revision_id),
          document.rows[0].kind as CmsDocumentKind,
          edition.payload as Record<string, unknown>,
        );
        return mediaErrors.length === 0;
      };
      // Availability publication is deliberately not a content publication.
      // Every non-off destination must already have an approved, published
      // exact revision (including a sealed managed materialization), or reuse
      // the immutable shared source that is already publicly live. A staged
      // source pointer, draft, or newly changed source can never become public
      // through this endpoint.
      const liveSourceValid = sourceIsAlreadyLive && await validateLiveRevision(source!);
      if (liveSourceValid && !await canAccessContent(transactionAuth.user, {
        topic: document.rows[0].kind as CmsDocumentTopic,
        capability: "publish",
        marketCode: String(source!.editorial_market ?? source!.market),
        scope: "shared",
        sourceMarketCode: String(source!.editorial_market ?? source!.market),
        destinationMarketCodes: affectedDestinationMarkets,
      })) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to the already-live shared source market." });
        return;
      }
      const managedBindingIds = new Set<string>();
      for (const selection of selections.filter((selection) => selection.decision !== "off")) {
        const market = markets.rows.find((candidate: Record<string, unknown>) =>
          String(candidate.id) === selection.marketEditionId && String(candidate.locale) === selection.locale);
        const edition = market
          ? byDestination.get(`${String(market.code)}|${selection.locale}`)
          : undefined;
        const exactIsAlreadyPublished = Boolean(
          edition
          && edition.publication_state === "published"
          && edition.revision_id === edition.published_revision_id
          && edition.workflow_state === "approved"
          && (
            edition.content_mode === "custom"
            || resolvedBindings.has(`${String(market?.code)}|${selection.locale}|${String(edition.revision_id)}`)
          )
          && await validateLiveRevision(edition),
        );
        if (!exactIsAlreadyPublished && !liveSourceValid) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "Every shown destination must already resolve to approved published exact content or an unchanged live shared source.",
          });
          return;
        }
        if (edition && exactIsAlreadyPublished) {
          const binding = bindingByDestination.get(`${String(market!.code)}|${selection.locale}`);
          if (!await canAccessEditionTarget(client, transactionAuth, documentId, String(market!.code), selection.locale, "publish")) {
            await client.query("ROLLBACK");
            res.status(403).json({ error: "You are not assigned to the exact source authority for every shown destination." });
            return;
          }
          // Historical classification comes from the published resolved row
          // and sealed publication receipt, never the mutable current binding
          // mode: an adapted A may later detach into independent draft B.
          if (binding) {
            if (!await canAccessManagedPublishedRevisionSource(
              client,
              transactionAuth,
              String(binding.binding_id),
              String(edition.revision_id),
               document.rows[0].kind as CmsDocumentTopic,
               String(market!.code),
               "publish",
            )) {
              await client.query("ROLLBACK");
              res.status(403).json({
                error: "You are not assigned to the published managed revision's historical source market.",
              });
              return;
            }
            managedBindingIds.add(String(binding.binding_id));
          }
        }
      }
      for (const selection of selections) {
        await client.query(
          `INSERT INTO cms_document_market_availability
             (document_id,market_edition_id,locale,published_decision,draft_decision,published_by_user_id,published_at)
           VALUES ($1,$2,$3,$4,NULL,$5,now())
           ON CONFLICT (document_id,market_edition_id,locale) DO UPDATE
             SET published_decision=EXCLUDED.published_decision,draft_decision=NULL,
                 published_by_user_id=EXCLUDED.published_by_user_id,published_at=now(),updated_at=now()`,
           [documentId, selection.marketEditionId, selection.locale, selection.decision, transactionAuth.user.id],
        );
      }
      await client.query(
        `UPDATE cms_document_availability_states
            SET published_version=reviewed_version,published_by_user_id=$2,published_at=now(),updated_at=now()
          WHERE document_id=$1`,
        [documentId, transactionAuth.user.id],
      );
      // This is an availability authority receipt, not a content publication:
      // it records which already-published managed exact materializations may
      // now be selected by public delivery. It never changes an edition,
      // revision, source pointer, or binding.
      for (const managedBindingId of managedBindingIds) {
        await audit(transactionAuth, "document.availability.published", "document", documentId, {
          version: parsed.data.version,
          managedBindingId,
        }, client);
      }
      await client.query("COMMIT");
      await audit(transactionAuth, "document.availability.published", "document", documentId, {
        version: parsed.data.version, destinations: selections,
      });
      res.json(await documentAvailability(pool, documentId, transactionAuth, parsed.data.version));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.put(
  "/documents/:documentId/market-availability/:marketEditionId",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const decision = req.body?.decision;
    const version = req.body?.version;
    if (!["inherit", "show", "off"].includes(decision)) {
      res.status(400).json({ error: "Invalid market availability decision." });
      return;
    }
    const documentId = String(req.params.documentId);
    const marketEditionId = String(req.params.marketEditionId);
    const auth = res.locals.auth as AuthContext;
    const target = await pool.query(
       `SELECT d.kind,m.code market,m.default_locale locale
         FROM cms_documents d CROSS JOIN market_editions m
        WHERE d.id=$1 AND m.id=$2`,
      [documentId, marketEditionId],
    );
    if (!target.rowCount) {
      res.status(404).json({ error: "Person or market edition not found." });
      return;
    }
    if (target.rows[0].kind !== "person") {
      res.status(409).json({ error: "Market availability is only supported for people." });
      return;
    }
    if (!await canAccessContent(auth.user, {
      topic: "person",
      capability: "edit",
      marketCode: String(target.rows[0].market),
    })) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    if (!Number.isInteger(version) || version < 0) {
      res.status(400).json({ error: "A destination selection version is required." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, documentId)) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      const lockedTarget = await client.query(
        `SELECT d.kind,m.code market,m.default_locale locale
           FROM cms_documents d CROSS JOIN market_editions m
          WHERE d.id=$1 AND m.id=$2
          FOR KEY SHARE OF m`,
        [documentId, marketEditionId],
      );
      if (!lockedTarget.rowCount || lockedTarget.rows[0].kind !== "person") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Market availability is only supported for people." });
        return;
      }
      if (!await canAccessContent(transactionAuth.user, {
        topic: "person",
        capability: "edit",
        marketCode: String(lockedTarget.rows[0].market),
      })) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      await ensureAvailabilityState(client, documentId);
      const state = await client.query(
        "SELECT draft_version FROM cms_document_availability_states WHERE document_id=$1 FOR UPDATE",
        [documentId],
      );
      if (Number(state.rows[0].draft_version) !== version) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Destination selection has been changed by another user. Reload before saving." });
        return;
      }
      await client.query(
        `INSERT INTO cms_document_market_availability
          (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
         VALUES ($1,$2,$3,'off',$4,$5)
         ON CONFLICT (document_id,market_edition_id,locale) DO UPDATE
          SET draft_decision=EXCLUDED.draft_decision,updated_by_user_id=EXCLUDED.updated_by_user_id,
              updated_at=now()`,
        [documentId, marketEditionId, lockedTarget.rows[0].locale, decision, transactionAuth.user.id],
      );
      await client.query(
        `UPDATE cms_document_availability_states
            SET draft_version=draft_version+1,reviewed_version=NULL,reviewed_selections='[]'::jsonb,
                reviewed_destination_pins='[]'::jsonb,reviewed_source_revision_id=NULL,
                updated_by_user_id=$2,updated_at=now()
          WHERE document_id=$1`,
        [documentId, transactionAuth.user.id],
      );
      await client.query("COMMIT");
      await audit(transactionAuth, "person.market_availability.staged", "document", documentId, {
        marketEditionId,
        market: lockedTarget.rows[0].market,
        decision,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    const updated = await pool.query(
       `SELECT m.id market_edition_id,m.code market,m.display_name,m.enabled,
              a.published_decision,a.draft_decision,
              a.published_decision<>'off' published_effective_available,
              COALESCE(a.draft_decision,a.published_decision)<>'off' preview_effective_available,
              EXISTS(SELECT 1 FROM cms_market_editions e
                WHERE e.document_id=$1 AND e.market=m.code) has_edition,
              a.updated_at,a.published_at
          FROM market_editions m JOIN cms_document_market_availability a
            ON a.market_edition_id=m.id AND a.document_id=$1 AND a.locale=m.default_locale
        WHERE m.id=$2`,
      [documentId, marketEditionId],
    );
    const row = updated.rows[0];
    res.json({
      marketEditionId: String(row.market_edition_id),
      market: row.market,
      displayName: row.display_name,
      enabled: row.enabled,
      publishedDecision: row.published_decision,
      publishedEffectiveAvailable: row.published_effective_available,
      pendingDecision: row.draft_decision ?? null,
      previewEffectiveAvailable: row.preview_effective_available,
      hasEdition: row.has_edition,
      updatedAt: row.updated_at,
      publishedAt: row.published_at ?? null,
    });
  }),
);

router.post(
  "/documents/:documentId/market-availability/:marketEditionId/publish",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const documentId = String(req.params.documentId);
    const marketEditionId = String(req.params.marketEditionId);
    const auth = res.locals.auth as AuthContext;
    const version = req.body?.version;
    if (!Number.isInteger(version) || version < 0) {
      res.status(400).json({ error: "A saved destination selection version is required." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const document = await client.query("SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      if (!document.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth, "administrator");
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      const state = await client.query(
        `SELECT draft_version,reviewed_version,reviewed_selections,shared_source_revision_id,reviewed_source_revision_id
           FROM cms_document_availability_states WHERE document_id=$1 FOR UPDATE`,
        [documentId],
      );
      const targetMarket = await client.query(
        "SELECT code,default_locale FROM market_editions WHERE id=$1 FOR KEY SHARE",
        [marketEditionId],
      );
      if (!targetMarket.rowCount || !await canAccessContent(transactionAuth.user, {
        topic: "person",
        capability: "publish",
        marketCode: String(targetMarket.rows[0].code),
      })) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You do not have Publish access to this person market." });
        return;
      }
      const reviewed = state.rowCount ? availabilitySelections(state.rows[0].reviewed_selections) : [];
      const directSavedDecision = state.rowCount
        && Number(state.rows[0].draft_version) === version
        && !state.rows[0].shared_source_revision_id;
      const reviewedDecision = state.rowCount
        && Number(state.rows[0].reviewed_version) === version
        && !state.rows[0].shared_source_revision_id
        && state.rows[0].reviewed_source_revision_id === state.rows[0].shared_source_revision_id
        && reviewed.some((selection) =>
          selection.marketEditionId === marketEditionId
            && selection.locale === targetMarket.rows[0]?.default_locale,
        );
      if (!directSavedDecision && !reviewedDecision) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "This person decision is not part of the current saved destination selection.",
        });
        return;
      }
      const published = await client.query(
       `UPDATE cms_document_market_availability a
          SET published_decision=a.draft_decision,draft_decision=NULL,
              published_by_user_id=$3,published_at=now(),updated_at=now()
         FROM cms_documents d,market_editions m
         WHERE a.document_id=$1 AND a.market_edition_id=$2 AND a.locale=m.default_locale
          AND d.id=a.document_id AND d.kind='person' AND m.id=a.market_edition_id
          AND a.draft_decision IS NOT NULL
      RETURNING m.code market,a.published_decision,a.published_at`,
        [documentId, marketEditionId, transactionAuth.user.id],
      );
      if (!published.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "No pending reviewed person market availability decision exists." });
        return;
      }
      await client.query("COMMIT");
      const row = published.rows[0];
    await audit(transactionAuth, "person.market_availability.published", "document", documentId, {
      marketEditionId,
      market: row.market,
      decision: row.published_decision,
    });
    res.status(204).end();
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.patch(
  "/documents/:documentId",
  requireCsrf,
  asyncRoute(async (req, res) => {
    if (
      req.body?.seo !== undefined
      && req.body.seo !== null
      && !cmsSeoSchema.safeParse(req.body.seo).success
    ) {
      const seo = cmsSeoSchema.safeParse(req.body.seo);
      res.status(400).json({
        error: "Invalid document SEO metadata.",
        details: seo.success ? [] : seo.error.issues.map((issue) => ({ ...issue, path: ["seo", ...issue.path] })),
      });
      return;
    }
    const parsed = UpdateDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid document update.", details: parsed.error.issues });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const requestedMarket = parsed.data.market;
    const requestedLocale = parsed.data.locale;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, id)) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: `The ${requestedMarket}/${requestedLocale} edition does not exist.` });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this edition's destinations." });
        return;
      }
      const lockedEdition = await client.query(
        `SELECT id FROM cms_market_editions
          WHERE document_id=$1 AND market=$2 AND locale=$3
          ORDER BY created_at,id LIMIT 1
          FOR UPDATE`,
        [id, requestedMarket, requestedLocale],
      );
      if (!lockedEdition.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: `The ${requestedMarket}/${requestedLocale} edition does not exist.` });
        return;
      }
      // This must be a separate statement after acquiring the edition lock.
      // Under READ COMMITTED it receives a fresh snapshot, so a waiter sees the
      // revision committed by the request which held the lock before it.
      const edition = await client.query(
        `SELECT e.id,e.published_revision_id,e.content_mode,d.kind,r.id revision_id,r.payload,
                r.revision_number,r.workflow_state
           FROM cms_market_editions e
           JOIN cms_documents d ON d.id=e.document_id
         LEFT JOIN LATERAL (SELECT id,payload,revision_number,workflow_state FROM cms_revisions
           WHERE edition_id=e.id ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1) r ON true
         WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
          ORDER BY e.created_at,e.id LIMIT 1`,
        [id, requestedMarket, requestedLocale],
      );
      if (!edition.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: `The ${requestedMarket}/${requestedLocale} edition does not exist.` });
        return;
      }
      if (!await canAccessEditionTarget(client, transactionAuth, id, requestedMarket, requestedLocale, "edit")) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this edition's destinations." });
        return;
      }
      if (parsed.data.expectedRevisionId !== undefined
        && String(edition.rows[0].revision_id) !== parsed.data.expectedRevisionId) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "This edition was replaced or changed by another user. Reopen it before saving your draft.",
        });
        return;
      }
      if (edition.rows[0].content_mode === "shared") {
        const affectedMarkets = await client.query(
          `SELECT DISTINCT m.code
             FROM market_editions m
             CROSS JOIN LATERAL (
               SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
                WHERE locale IS NOT NULL
             ) destination
             LEFT JOIN cms_document_market_availability a
               ON a.document_id=$1 AND a.market_edition_id=m.id
              AND a.locale=destination.locale
            WHERE m.enabled=true
               AND CASE WHEN a.market_edition_id IS NULL THEN 'off'
                        ELSE COALESCE(a.draft_decision,a.published_decision,'inherit') END <> 'off'`,
          [id],
        );
        if (!await canAccessMarkets(
          transactionAuth,
          edition.rows[0].kind as CmsDocumentTopic,
          "edit",
          affectedMarkets.rows.map((row) => String(row.code)),
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({
            error: "Editing shared content requires authority for every destination currently using it.",
          });
          return;
        }
      }
      const current = mapDocument({
        id,
        kind: edition.rows[0].kind,
        payload: edition.rows[0].payload,
        revision_id: edition.rows[0].revision_id,
        revision_number: edition.rows[0].revision_number,
        workflow_state: edition.rows[0].workflow_state,
        published_revision_id: edition.rows[0].published_revision_id,
        markets: [requestedMarket],
      });
      if (!canChangeCanonicalSlug(current.slug, parsed.data.slug, current.publishedRevisionId)) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Published document slugs are immutable without an explicit redirect.",
        });
        return;
      }
      if (edition.rows[0].revision_number !== parsed.data.revisionNumber) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected edition has been changed by another user." });
        return;
      }
      if (!["draft", "rejected", "approved"].includes(String(edition.rows[0].workflow_state))) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "An in-review edition revision cannot be updated." });
        return;
      }
      const base = edition.rows[0].payload ?? payload(current);
      const next = { ...base, ...parsed.data };
      delete next.market;
      delete next.locale;
      delete next.revisionNumber;
      delete next.expectedRevisionId;
      if (parsed.data.seo === null) delete next.seo;
      if (!isCmsConfigurationIdentityValid(current.kind, next.slug, next.content)) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Contact email configuration must use its canonical singleton slug." });
        return;
      }
      const validated = validateSnapshot(current.kind, next, "draft");
      if (!validated.success) {
        await client.query("ROLLBACK");
        res.status(422).json({ error: "Content contract validation failed.", ...validationErrorBody(validated) });
        return;
      }
      const snapshot = validated.data;
      const pendingCarryErrors = await pendingMediaCarryForwardErrors(
        client,
        id,
        String(edition.rows[0].id),
        String(edition.rows[0].revision_id),
        current.kind as CmsDocumentKind,
        snapshot,
      );
      if (pendingCarryErrors.length) {
        await client.query("ROLLBACK");
        res.status(422).json({
          error: "Pending-review media can only be carried forward from the exact preceding pin.",
          details: pendingCarryErrors,
        });
        return;
      }
      const revision = await client.query(
        `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,
          created_by_user_id,reason)
          SELECT $1,COALESCE(max(revision_number),0)+1,$2,$3,'draft',$4,'Edited'
          FROM cms_revisions WHERE edition_id=$1 RETURNING id`,
        [edition.rows[0].id, snapshot, digest(snapshot), auth.user.id],
      );
      await syncMediaReferences(
        client,
        id,
        String(revision.rows[0].id),
        snapshot,
        String(edition.rows[0].revision_id),
        current.kind as CmsDocumentKind,
      );
      await synchronizeManagedMarketRevision(client, {
        documentId: id,
        market: requestedMarket,
        locale: requestedLocale,
        revisionId: String(revision.rows[0].id),
        snapshot,
        kind: current.kind as CmsDocumentKind,
        userId: auth.user.id,
        sourceRevisionId: String(edition.rows[0].revision_id),
      });
      if (edition.rows[0].content_mode === "shared") {
        await ensureAvailabilityState(client, id);
        await client.query(
          `UPDATE cms_document_availability_states
              SET draft_version=draft_version+1,shared_source_revision_id=$2,reviewed_version=NULL,
                  reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
                  reviewed_destination_pins='[]'::jsonb,updated_at=now()
            WHERE document_id=$1 AND shared_source_edition_id=$3`,
          [id, revision.rows[0].id, edition.rows[0].id],
        );
      }
      await client.query(
        `UPDATE cms_documents SET canonical_slug=$2,title=$3,updated_at=now() WHERE id=$1`,
        [id, snapshot.slug, snapshot.title],
      );
      await client.query("COMMIT");
    } catch (error: any) {
      await client.query("ROLLBACK");
      if (error?.code === "23505") {
        res.status(409).json({ error: "The selected edition has been changed by another user." });
        return;
      }
      throw error;
    } finally {
      client.release();
    }
    try {
      await audit(auth, "document.updated", "document", id);
      const saved = await getDocument(id, auth, requestedMarket, requestedLocale);
      if (!saved) throw new Error("Committed document could not be reloaded.");
      res.json(saved);
    } catch (error) {
      req.log.error({ err: error, documentId: id }, "Document saved but response hydration failed");
      res.status(500).json({
        code: "DOCUMENT_SAVE_COMMITTED",
        committed: true,
        error: "The document was saved, but its confirmation could not be loaded. Reload this edition before saving again.",
      });
    }
  }),
);

router.delete(
  "/documents/:documentId",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const client = await pool.connect();
    let deleteAuth: AuthContext | null = null;
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, id)) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Authentication is no longer valid." });
        return;
      }
      const editions = await client.query(
        `SELECT market,locale FROM cms_market_editions
          WHERE document_id=$1 FOR UPDATE`,
        [id],
      );
      if (!editions.rowCount || !(await Promise.all(editions.rows.map((edition) =>
        canAccessEditionTarget(
          client, transactionAuth, id, String(edition.market), String(edition.locale), "publish",
        ),
      ))).every(Boolean)) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Deleting a document requires Publish access to every exact edition." });
        return;
      }
      const result = await client.query(DELETE_DOCUMENT_SQL, [id]);
      if (!result.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Documents with publication history cannot be permanently deleted; use archive and restore instead.",
        });
        return;
      }
      deleteAuth = transactionAuth;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    await audit(deleteAuth!, "document.deleted", "document", id);
    res.status(204).end();
  }),
);

router.get(
  "/documents/:documentId/revisions",
  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT r.*,e.document_id,e.market,e.locale FROM cms_revisions r JOIN cms_market_editions e
       ON e.id=r.edition_id WHERE e.document_id=$1
       ORDER BY CASE WHEN e.market='uae' THEN 0 ELSE 1 END,
         r.revision_number DESC,r.created_at DESC,r.id DESC`,
      [req.params.documentId],
    );
    const auth = res.locals.auth as AuthContext;
    const visibleRows = [];
    for (const row of result.rows) {
      if (await canAccessEditionTarget(
        pool,
        auth,
        String(req.params.documentId),
        String(row.market),
        String(row.locale),
      )) {
        visibleRows.push(row);
      }
    }
    if (result.rows.length && !visibleRows.length) {
      res.status(403).json({ error: "You are not assigned to this document's markets." });
      return;
    }
    const items = visibleRows.map((row) => ({
      id: String(row.id),
      documentId: String(row.document_id),
      number: row.revision_number,
      market: row.market,
      locale: row.locale,
      snapshot: row.payload,
      note: row.reason,
      createdBy: String(row.created_by_user_id),
      createdAt: row.created_at,
    }));
    res.json(pageOf(items, items.length, 1, Math.max(items.length, 1)));
  }),
);

router.get(
  "/documents/:documentId/revisions/:revisionId",
  asyncRoute(async (req, res) => {
    const result = await pool.query(
      `SELECT r.*,e.document_id,e.market,e.locale FROM cms_revisions r JOIN cms_market_editions e
       ON e.id=r.edition_id WHERE r.id=$1 AND e.document_id=$2`,
      [req.params.revisionId, req.params.documentId],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Revision not found." });
      return;
    }
    const row = result.rows[0];
      if (!await canAccessEditionTarget(
        pool,
        res.locals.auth as AuthContext,
        String(req.params.documentId),
        String(row.market),
        String(row.locale),
      )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    res.json({
      id: String(row.id),
      documentId: String(row.document_id),
      number: row.revision_number,
      market: row.market,
      locale: row.locale,
      snapshot: row.payload,
      note: row.reason,
      createdBy: String(row.created_by_user_id),
      createdAt: row.created_at,
    });
  }),
);

router.get(
  "/documents/:documentId/revisions/:revisionId/accuracy-confirmation",
  asyncRoute(async (req, res) => {
    const revision = await pool.query(
      `SELECT r.id,e.document_id,e.market,e.locale
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$1 AND e.document_id=$2`,
      [req.params.revisionId, req.params.documentId],
    );
    if (!revision.rowCount) {
      res.status(404).json({ error: "Revision not found." });
      return;
    }
    const target = revision.rows[0];
    if (!await canAccessEditionTarget(
      pool,
      res.locals.auth as AuthContext,
      String(target.document_id),
      String(target.market),
      String(target.locale),
      "edit",
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const confirmation = await pool.query(
      `SELECT id,revision_id,content_digest,confirmed_by_user_id,confirmed_at
         FROM cms_revision_accuracy_confirmations
        WHERE revision_id=$1
        ORDER BY confirmed_at DESC,id DESC
        LIMIT 1`,
      [req.params.revisionId],
    );
    res.json({ confirmation: confirmation.rows[0] ? accuracyConfirmationJson(confirmation.rows[0]) : null });
  }),
);

router.post(
  "/documents/:documentId/revisions/:revisionId/accuracy-confirmation",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, String(req.params.documentId))) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
      const revision = await client.query(
        `SELECT r.id,r.content_digest,r.revision_number,e.document_id,e.market,e.locale
           FROM cms_revisions r
           JOIN cms_market_editions e ON e.id=r.edition_id
          WHERE r.id=$1 AND e.document_id=$2
          FOR UPDATE OF r,e`,
        [req.params.revisionId, req.params.documentId],
      );
      if (!revision.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Revision not found." });
        return;
      }
      const target = revision.rows[0];
      if (!auth || !await canAccessEditionTarget(
        client,
        auth,
        String(target.document_id),
        String(target.market),
        String(target.locale),
        "edit",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      const current = await client.query(
        `SELECT id FROM cms_revisions
          WHERE edition_id=(SELECT edition_id FROM cms_revisions WHERE id=$1)
          ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
        [target.id],
      );
      if (String(current.rows[0]?.id) !== String(target.id)) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only the current saved revision can be confirmed. Reload the latest revision before confirming its accuracy." });
        return;
      }
      const stored = await client.query(
        `INSERT INTO cms_revision_accuracy_confirmations(revision_id,content_digest,confirmed_by_user_id)
         VALUES ($1,$2,$3)
         ON CONFLICT(revision_id,confirmed_by_user_id,content_digest)
         DO UPDATE SET confirmed_at=now()
         RETURNING id,revision_id,content_digest,confirmed_by_user_id,confirmed_at`,
        [target.id, target.content_digest, auth.user.id],
      );
      const confirmation = accuracyConfirmationJson(stored.rows[0]);
      await audit(auth, "document.accuracy_confirmed", "revision", String(target.id), {
        confirmationId: confirmation.id,
        contentDigest: confirmation.contentDigest,
        revisionNumber: target.revision_number,
      }, client);
      await client.query("COMMIT");
      res.json(confirmation);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/submit",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = SubmitDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review submission." });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    let candidate: any;
    try {
      await client.query("BEGIN");
      await lockDocumentForMutation(client, id);
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      // Lock the exact edition before reading its latest revision. A single
      // statement which waits inside a lateral latest-revision query can keep
      // its pre-wait snapshot under READ COMMITTED and submit a stale draft.
      const lockedEdition = await client.query(
        `SELECT e.id
           FROM cms_revisions r
           JOIN cms_market_editions e ON e.id=r.edition_id
          WHERE r.id=$2 AND e.document_id=$1
          FOR UPDATE OF e`,
        [id, parsed.data.revisionId],
      );
      if (!lockedEdition.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected revision does not exist for this document." });
        return;
      }
      candidate = await client.query(
         `SELECT r.id,r.edition_id,r.payload,r.content_digest,r.workflow_state,r.created_by_user_id,
                d.kind,d.canonical_slug,e.market,e.locale FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
         JOIN cms_documents d ON d.id=e.document_id
         WHERE e.document_id=$1 AND r.id=$2
           AND r.revision_number=(SELECT max(x.revision_number) FROM cms_revisions x
                                  WHERE x.edition_id=r.edition_id)`,
        [id, parsed.data.revisionId],
      );
      if (!candidate.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected revision is stale. Reload the latest draft before submitting." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        id,
        String(candidate.rows[0].market),
        String(candidate.rows[0].locale),
        "edit",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      if (candidate.rows[0].workflow_state !== "draft" && candidate.rows[0].workflow_state !== "rejected") {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only the latest draft or rejected revision can be submitted." });
        return;
      }
      if (!isCmsConfigurationIdentityValid(
        candidate.rows[0].kind,
        candidate.rows[0].canonical_slug,
        candidate.rows[0].payload,
      )) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Site configuration does not match its canonical singleton identity." });
        return;
      }
      const validation = await validateSnapshotWithAccuracyConfirmation(
        client,
        candidate.rows[0].kind,
        candidate.rows[0].payload,
        String(candidate.rows[0].id),
        String(candidate.rows[0].content_digest),
      );
      const restoreReleaseReceipt = await client.query(
        `SELECT id
           FROM cms_restore_release_receipts
          WHERE document_id=$1 AND edition_id=$2 AND revision_id=$3
            AND content_digest=$4
            AND authorized_actor_user_id=$5
            AND authorized_transition='restore-successor-release'
            AND consumed_at IS NULL
          FOR UPDATE`,
        [
          id,
          candidate.rows[0].edition_id,
          candidate.rows[0].id,
          candidate.rows[0].content_digest,
          transactionAuth.user.id,
        ],
      );
      const restoredSuccessorSubmit = restoreReleaseReceipt.rowCount === 1;
      if (!validation.success) {
        await client.query("ROLLBACK");
        res.status(422).json({ error: "Review readiness validation failed.", ...validationErrorBody(validation) });
        return;
      }
      const submittedSnapshot = validation.success
        ? validation.data
        : candidate.rows[0].payload as Record<string, any>;
      // An asset may have been selected while awaiting its own approval. Resolve
      // the declared exact version now; legacy ids are pinned once for migration.
      await syncMediaReferences(
        client,
        id,
        String(candidate.rows[0].id),
         submittedSnapshot,
        undefined,
        candidate.rows[0].kind as CmsDocumentKind,
      );
      try {
        await ensureManagedMarketRevision(client, {
          documentId: id,
          market: String(candidate.rows[0].market),
          locale: String(candidate.rows[0].locale),
          revisionId: String(candidate.rows[0].id),
           snapshot: submittedSnapshot,
          kind: candidate.rows[0].kind as CmsDocumentKind,
          userId: auth.user.id,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: error instanceof Error
            ? error.message
            : "Managed market revision could not be sealed for review.",
        });
        return;
      }
      const mediaErrors = await revisionMediaGovernanceErrors(
        client,
        id,
        String(candidate.rows[0].id),
        candidate.rows[0].kind as CmsDocumentKind,
        candidate.rows[0].payload,
      );
      if (mediaErrors.length) {
        await client.query("ROLLBACK");
        res.status(422).json({ error: "Review references unavailable or unapproved media.", details: mediaErrors });
        return;
      }
      // Root-archived legacy editions predate the editorial request ledger.
      // Restore records an auditable exact-digest acknowledgement above; keep
      // the historical restore/submit transition available even when that
      // legacy fixture has no reviewer directory rows. New revisions never
      // enter this branch and always require an independent exact reviewer.
      if (restoredSuccessorSubmit) {
        const submitted = await client.query(
          `WITH submitted AS (
             UPDATE cms_revisions SET workflow_state='in-review'
              WHERE id=$1 AND workflow_state IN ('draft','rejected')
              RETURNING edition_id
           )
           UPDATE cms_market_editions e
              SET publication_state=CASE
                    WHEN e.publication_state='published' THEN 'published'
                    ELSE 'in-review'
                  END,
                  updated_at=now()
            FROM submitted WHERE e.id=submitted.edition_id
            RETURNING e.id`,
          [parsed.data.revisionId],
        );
        if (!submitted.rowCount) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The selected revision is no longer a draft." });
          return;
        }
        await audit(transactionAuth, "document.submitted", "document", id, {
          ...parsed.data,
          market: candidate.rows[0].market,
          locale: candidate.rows[0].locale,
          legacyRestore: true,
        }, client);
        await client.query("COMMIT");
        try {
          await audit(auth, "document.submitted", "document", id, {
            ...parsed.data,
            market: candidate.rows[0].market,
            locale: candidate.rows[0].locale,
            legacyRestore: true,
          });
          res.json(await getDocument(
            id,
            auth,
            candidate.rows[0].market,
            candidate.rows[0].locale,
          ));
        } catch (error) {
          req.log.error({ err: error, documentId: id, revisionId: parsed.data.revisionId }, "Document submitted but response hydration failed");
          res.status(500).json({
            code: "DOCUMENT_SUBMIT_COMMITTED",
            committed: true,
            error: "The document was submitted, but its confirmation could not be loaded. Reload this edition before trying again.",
          });
        }
        return;
      }
      // Resolve and freeze review independence before changing workflow state.
      // A submitted revision must never exist briefly without a durable,
      // exact-revision review request that could otherwise be bypassed.
      const accountable = await client.query(
        `SELECT editor_user_id,reviewer_user_id
           FROM cms_editorial_assignments
          WHERE document_id=$1 AND (edition_id=$2 OR edition_id IS NULL)
          ORDER BY (edition_id=$2) DESC
          LIMIT 1
          FOR SHARE`,
        [id, lockedEdition.rows[0].id],
      );
      const accountableEditorId = accountable.rows[0]?.editor_user_id
        ? String(accountable.rows[0].editor_user_id)
        : null;
      const reviewerId = await chooseEligibleReviewer(client, transactionAuth, {
        documentId: id,
        market: String(candidate.rows[0].market),
        locale: String(candidate.rows[0].locale),
        revisionAuthorId: candidate.rows[0].created_by_user_id,
        accountableEditorId,
        preferredReviewerId: accountable.rows[0]?.reviewer_user_id
          ? String(accountable.rows[0].reviewer_user_id)
          : null,
      });
      if (!reviewerId) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "No eligible reviewer is available. A Users administrator must grant an active user Review access to this exact destination.",
        });
        return;
      }
      const submitted = await client.query(
        `WITH submitted AS (
           UPDATE cms_revisions SET workflow_state='in-review'
            WHERE id=$1 AND workflow_state IN ('draft','rejected')
            RETURNING edition_id
         )
         UPDATE cms_market_editions e
            SET publication_state=CASE
                  WHEN e.publication_state='published' THEN 'published'
                  ELSE 'in-review'
                END,
                updated_at=now()
          FROM submitted WHERE e.id=submitted.edition_id
          RETURNING e.id`,
        [parsed.data.revisionId],
      );
      if (!submitted.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected revision is no longer a draft." });
        return;
      }
      const reviewRequest = await client.query(
        `INSERT INTO cms_review_requests
           (edition_id,revision_id,requester_user_id,reviewer_user_id,accountable_editor_user_id)
         VALUES ($1,$2,$3,$4,$5)
         RETURNING id`,
        [
          lockedEdition.rows[0].id,
          parsed.data.revisionId,
          transactionAuth.user.id,
          reviewerId,
          accountableEditorId,
        ],
      );
      await client.query(
        `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,document_id,revision_id,review_request_id,title,message,link)
         VALUES ($1,$2,'review-requested',$3,$4,$5,$6,'Review requested',
                 'A specific submitted revision needs your review.',$7)
         ON CONFLICT (user_id,event_key) DO NOTHING`,
        [
          reviewerId,
          `review-requested:${reviewRequest.rows[0].id}`,
          lockedEdition.rows[0].id,
          id,
          parsed.data.revisionId,
          reviewRequest.rows[0].id,
          `/documents/${id}?market=${encodeURIComponent(String(candidate.rows[0].market))}&locale=${encodeURIComponent(String(candidate.rows[0].locale))}`,
        ],
      );
      await audit(transactionAuth, "editorial.review_requested", "revision", String(parsed.data.revisionId), {
        reviewRequestId: String(reviewRequest.rows[0].id),
        reviewerId,
        accountableEditorId,
      }, client);
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    try {
      await audit(auth, "document.submitted", "document", id, {
        ...parsed.data,
        market: candidate.rows[0].market,
        locale: candidate.rows[0].locale,
      });
      res.json(await getDocument(
        id,
        auth,
        candidate.rows[0].market,
        candidate.rows[0].locale,
      ));
    } catch (error) {
      req.log.error({ err: error, documentId: id, revisionId: parsed.data.revisionId }, "Document submitted but response hydration failed");
      res.status(500).json({
        code: "DOCUMENT_SUBMIT_COMMITTED",
        committed: true,
        error: "The document was submitted, but its confirmation could not be loaded. Reload this edition before trying again.",
      });
    }
  }),
);

router.post(
  "/documents/:documentId/review-comments",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = AddDocumentReviewCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review comment.", details: parsed.error.issues });
      return;
    }
    const documentId = String(req.params.documentId);
    const client = await pool.connect();
    let auth: AuthContext | null = null;
    let row: Record<string, any> | null = null;
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, documentId)) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
      const revisionAccess = await client.query(
        `SELECT e.market,e.locale FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id
          WHERE r.id=$2 AND e.document_id=$1 FOR KEY SHARE OF r,e`,
        [documentId, parsed.data.revisionId],
      );
      if (!auth || !revisionAccess.rowCount || !await canAccessEditionTarget(
        client, auth, documentId, String(revisionAccess.rows[0].market), String(revisionAccess.rows[0].locale), "review",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You do not have Review access to this exact edition." });
        return;
      }
      const result = await client.query(
        `INSERT INTO cms_review_comments(revision_id,author_user_id,body)
         VALUES ($1,$2,$3) RETURNING id,revision_id,body,author_user_id,created_at`,
        [parsed.data.revisionId, auth.user.id, parsed.data.body],
      );
      row = result.rows[0];
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
    await audit(auth!, "document.review_commented", "document", documentId, {
      revisionId: parsed.data.revisionId,
      commentId: String(row!.id),
    });
    res.status(201).json({
      id: String(row!.id),
      revisionId: String(row!.revision_id),
      body: row!.body,
      authorId: String(row!.author_user_id),
      createdAt: row!.created_at,
    });
  }),
);

router.get(
  "/documents/:documentId/review-comments",
  asyncRoute(async (req, res) => {
    const revisionId = typeof req.query.revisionId === "string" ? req.query.revisionId : null;
    const result = await pool.query(
      `SELECT c.id,c.revision_id,c.body,c.author_user_id,c.created_at,e.market,e.locale
         FROM cms_review_comments c
         JOIN cms_revisions r ON r.id=c.revision_id
         JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE e.document_id=$1 AND ($2::uuid IS NULL OR c.revision_id=$2)
        ORDER BY c.created_at,c.id`,
      [req.params.documentId, revisionId],
    );
    const auth = res.locals.auth as AuthContext;
    const visibleRows = [];
    for (const row of result.rows) {
      if (await canAccessEditionTarget(
        pool,
        auth,
        String(req.params.documentId),
        String(row.market),
        String(row.locale),
        "review",
      )) {
        visibleRows.push(row);
      }
    }
    if (result.rows.length && !visibleRows.length) {
      res.status(403).json({ error: "You are not assigned to this document's markets." });
      return;
    }
    res.json(visibleRows.map((row) => ({
      id: String(row.id),
      revisionId: String(row.revision_id),
      body: row.body,
      authorId: String(row.author_user_id),
      createdAt: row.created_at,
    })));
  }),
);

router.post(
  "/documents/:documentId/reject",
  requireCsrf,
  asyncRoute(async (req, res) => {
    // Review decisions are exclusively performed through editorial-work so
    // that the frozen, exact reviewer snapshot cannot be bypassed.
    if (res.locals.auth) {
      res.status(403).json({
        error: "Use the assigned editorial review request to reject this revision.",
      });
      return;
    }
    const parsed = RejectDocumentRevisionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid rejection.", details: parsed.error.issues });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await lockDocumentForMutation(client, String(req.params.documentId));
      const transactionAuth = await revalidateMutationAuth(client, auth);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      const candidate = await client.query(
        `SELECT r.id,r.created_by_user_id,e.id edition_id,e.market,e.locale
           FROM cms_revisions r
           JOIN cms_market_editions e ON e.id=r.edition_id
          WHERE r.id=$2 AND e.document_id=$1 AND r.workflow_state='in-review'
          FOR UPDATE OF e`,
        [req.params.documentId, parsed.data.revisionId],
      );
      if (!candidate.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only an in-review revision can be rejected." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        String(req.params.documentId),
        String(candidate.rows[0].market),
        String(candidate.rows[0].locale),
        "review",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      const pendingReview = await client.query(
        `SELECT requester_user_id,reviewer_user_id,accountable_editor_user_id
           FROM cms_review_requests
           WHERE revision_id=$1
           ORDER BY requested_at DESC,id DESC
           LIMIT 1
          FOR UPDATE`,
        [parsed.data.revisionId],
      );
      if (pendingReview.rowCount) {
        const review = pendingReview.rows[0];
        const actorId = transactionAuth.user.id;
        if (
          String(review.reviewer_user_id) !== actorId
          || String(candidate.rows[0].created_by_user_id) === actorId
          || String(review.requester_user_id) === actorId
            || String(review.accountable_editor_user_id ?? "") === actorId
        ) {
          await client.query("ROLLBACK");
          res.status(403).json({
            error: "Only the designated independent reviewer may reject this pending exact-edition review.",
          });
          return;
        }
      }
      // Legacy records may predate exact review requests.  When they retain a
      // routed assignment, it is still an immutable reviewer constraint rather
      // than a mutable market-role bypass.
      if (!pendingReview.rowCount) {
        const assigned = await client.query(
          `SELECT reviewer_user_id
             FROM cms_editorial_assignments
            WHERE edition_id=$1
            ORDER BY updated_at DESC,id DESC
            LIMIT 1`,
          [candidate.rows[0].edition_id],
        );
        if (assigned.rowCount && String(assigned.rows[0].reviewer_user_id ?? "") !== transactionAuth.user.id) {
          await client.query("ROLLBACK");
          res.status(403).json({
            error: "Only the designated independent reviewer may reject this routed revision.",
          });
          return;
        }
      }
      const rejected = await client.query(
        `UPDATE cms_revisions SET workflow_state='rejected'
          WHERE id=$1 AND workflow_state='in-review'
          RETURNING id`,
        [parsed.data.revisionId],
      );
      if (!rejected.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only an in-review revision can be rejected." });
        return;
      }
      await client.query(
        `INSERT INTO cms_review_comments(revision_id,author_user_id,body) VALUES ($1,$2,$3)`,
        [parsed.data.revisionId, auth.user.id, parsed.data.body],
      );
      await client.query(
        `UPDATE cms_market_editions
            SET publication_state=CASE
                  WHEN publication_state='published' THEN 'published'
                  ELSE 'draft'
                END,
                updated_at=now()
          WHERE id=$1`,
        [candidate.rows[0].edition_id],
      );
      await client.query("COMMIT");
      await audit(auth, "document.rejected", "document", String(req.params.documentId), {
        revisionId: parsed.data.revisionId,
        market: candidate.rows[0].market,
        locale: candidate.rows[0].locale,
      });
      res.json(await getDocument(
        String(req.params.documentId),
        auth,
        candidate.rows[0].market,
        candidate.rows[0].locale,
      ));
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/publish",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = PublishDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid publication request.", details: parsed.error.issues });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    let publicationCommitted = false;
    try {
    await client.query("BEGIN");
    await lockDocumentForMutation(client, id);
    const transactionAuth = await revalidateMutationAuth(client, auth);
    if (!transactionAuth) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    // Serialize publication with saves on the exact edition before reading the
    // latest revision. Otherwise a waiter can retain a pre-wait snapshot and
    // publish an older revision or report a false conflict.
    const lockedEdition = await client.query(
      `SELECT e.id
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$1 AND e.document_id=$2
        FOR UPDATE OF e`,
      [parsed.data.revisionId, id],
    );
    if (!lockedEdition.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "The selected revision does not exist for this document." });
      return;
    }
    const revision = await client.query(
      `SELECT r.id,r.edition_id,r.payload,r.content_digest,d.kind,d.canonical_slug,r.workflow_state,
              e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,
              e.publication_state,e.content_mode,
               EXISTS(
                 SELECT 1 FROM cms_review_requests request
                  WHERE request.revision_id=r.id AND request.edition_id=e.id
                    AND request.status='approved'
               ) has_approved_exact_review,
               EXISTS(
                  SELECT 1 FROM cms_review_requests request
                   WHERE request.revision_id=r.id AND request.edition_id=e.id
               ) has_exact_review
         FROM cms_revisions r JOIN cms_market_editions e
        ON e.id=r.edition_id JOIN cms_documents d ON d.id=e.document_id
        WHERE r.id=$1 AND e.document_id=$2
          AND r.id=(
            SELECT latest.id FROM cms_revisions latest
             WHERE latest.edition_id=e.id
             ORDER BY latest.revision_number DESC,latest.created_at DESC,latest.id DESC LIMIT 1
          )
        FOR UPDATE OF e,r`,
      [parsed.data.revisionId, id],
    );
    if (!revision.rowCount) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "The selected revision does not exist." });
      return;
    }
    if (!isCmsConfigurationIdentityValid(
      revision.rows[0].kind,
      revision.rows[0].canonical_slug,
      revision.rows[0].payload,
    )) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Site configuration does not match its canonical singleton identity." });
      return;
    }
    if (!await canAccessEditionTarget(
      client,
      transactionAuth,
      id,
      String(revision.rows[0].market),
      String(revision.rows[0].locale),
       "publish",
    )) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    let managedBinding: { bindingId: string; mode: string } | null = null;
    try {
      managedBinding = await assertManagedMarketPublication(client, {
        documentId: id,
        market: String(revision.rows[0].market),
        locale: String(revision.rows[0].locale),
        revisionId: parsed.data.revisionId,
      });
    } catch (error) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: error instanceof Error
          ? error.message
          : "Managed market publication requires its current immutable materialization.",
      });
      return;
    }
    const directAdministratorPublish = transactionAuth.user.role === "administrator"
      && ["draft", "rejected"].includes(String(revision.rows[0].workflow_state))
      && ["draft", "published"].includes(String(revision.rows[0].publication_state))
      && !Boolean(revision.rows[0].has_exact_review);
    const reviewedPublish = revision.rows[0].workflow_state === "approved"
      && Boolean(revision.rows[0].has_approved_exact_review)
      && ["in-review", "published"].includes(String(revision.rows[0].publication_state));
    if (Boolean(revision.rows[0].has_exact_review) && !reviewedPublish) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "An exact review request must be resolved before this revision can be published.",
      });
      return;
    }
    if (managedBinding && !reviewedPublish) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "A managed market revision must complete exact-edition review before publication.",
      });
      return;
    }
    // A restore-release receipt is fallback authority only. Ordinary direct
    // administrator and completed exact-review releases must not query this
    // additive table, preserving compatibility with older strict DB adapters.
    let restoreReleaseReceipt: Record<string, unknown> | null = null;
    let restoredSuccessorPublish = false;
    if (!directAdministratorPublish && !reviewedPublish) {
      const restoreReleaseReceipts = await client.query(
        `SELECT id,revision_id::text revision_id,content_digest,
                authorized_actor_user_id::text authorized_actor_user_id
           FROM cms_restore_release_receipts
          WHERE document_id=$1 AND edition_id=$2 AND revision_id=$3
            AND authorized_transition='restore-successor-release'
            AND consumed_at IS NULL
          FOR UPDATE`,
        [id, revision.rows[0].edition_id, revision.rows[0].id],
      );
      restoreReleaseReceipt = restoreReleaseReceipts.rows.find(
        (receipt: Record<string, unknown>) =>
          String(receipt.revision_id) === String(revision.rows[0].id)
          && String(receipt.content_digest) === String(revision.rows[0].content_digest),
      ) ?? null;
      restoredSuccessorPublish = Boolean(
        restoreReleaseReceipt
        && String(restoreReleaseReceipt.authorized_actor_user_id) === String(transactionAuth.user.id),
      );
      if (restoreReleaseReceipts.rowCount && (
        !restoreReleaseReceipt
        || !restoredSuccessorPublish
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Only the actor who restored this exact revision may release it.",
        });
        return;
      }
    }
    if (!directAdministratorPublish && !restoredSuccessorPublish && !reviewedPublish) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: "Only the latest revision approved by its matching exact-edition review request can be published.",
      });
      return;
    }
    const validation = await validateSnapshotWithAccuracyConfirmation(
      client,
      revision.rows[0].kind,
      revision.rows[0].payload,
      String(revision.rows[0].id),
      String(revision.rows[0].content_digest),
    );
    if (!validation.success) {
      if (directAdministratorPublish && validation.errors.includes(
        "An explicit accuracy confirmation is required before review or publication.",
      )) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Only the latest revision approved by its matching exact-edition review request can be published.",
        });
      } else {
        await client.query("ROLLBACK");
        res.status(422).json({ error: "Publication governance validation failed.", ...validationErrorBody(validation) });
      }
      return;
    }
    const publicationSnapshot = validation.success
      ? validation.data
      : revision.rows[0].payload as Record<string, any>;
    if (revision.rows[0].kind === "industry" && revision.rows[0].content_mode !== "shared") {
      const errors = industryDeliveryErrors(
        publicationSnapshot,
        String(revision.rows[0].editorial_market ?? revision.rows[0].market),
        [{
          market: String(revision.rows[0].market),
          locale: String(revision.rows[0].locale),
        }],
      );
      if (errors.length) {
        await client.query("ROLLBACK");
        res.status(422).json({
          error: "Publication cannot deliver this industry revision to its exact destination. Update the regional fields before publishing.",
          details: errors,
        });
        return;
      }
    }
    const references = expectedMedia(
      revision.rows[0].kind as CmsDocumentKind,
      publicationSnapshot,
    );
    const mediaIds = [...new Set(references.map((reference) => reference.mediaId))];
    const expectedVersions = new Map<string, string>(references
      .filter((reference): reference is typeof reference & { mediaVersionId: string } =>
        Boolean(reference.mediaVersionId))
      .map((reference) => [reference.mediaId, reference.mediaVersionId]));
    const hero = revision.rows[0].kind === "site-configuration"
      ? (publicationSnapshot.content as Record<string, any>).hero as Record<string, any>
      : null;
    const expectedMediaTypes = new Map<string, readonly string[]>(hero ? [
      [hero.posterMediaId, ["image/jpeg", "image/png", "image/webp", "image/avif"]],
      ...hero.sources.map((source: { mediaId: string; mimeType: string }) =>
        [source.mediaId, [source.mimeType]] as [string, string[]]),
    ] : []);
    if (mediaIds.length) {
      await client.query(
        `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
          SELECT asset.id,version.id,$2,$3
           FROM cms_media_assets asset
           JOIN LATERAL (
             SELECT id FROM cms_media_versions
               WHERE asset_id=asset.id
                 AND ($4::jsonb->>asset.id::text IS NULL OR id::text=$4::jsonb->>asset.id::text)
               ORDER BY version_number DESC LIMIT 1
           ) version ON true
          WHERE asset.id::text=ANY($1::text[])
            AND asset.status IN ('active','ready')
         ON CONFLICT DO NOTHING`,
         [mediaIds, id, `revision:${parsed.data.revisionId}`, Object.fromEntries(expectedVersions)],
      );
    }
    const readyMedia = mediaIds.length
      ? await client.query(
           `SELECT a.id::text id,COALESCE(pinned.id,latest.id)::text version_id,
                    a.status,a.media_type,COALESCE(pinned.width,latest.width) width,
                    COALESCE(pinned.height,latest.height) height,
                    COALESCE(pinned.metadata,latest.metadata) metadata,a.alt_text
             FROM cms_media_assets a
             JOIN cms_media_references ref ON ref.asset_id=a.id
               AND ref.document_id=$2 AND ref.field_path=$3
             LEFT JOIN cms_media_versions pinned
               ON pinned.id=ref.media_version_id AND pinned.asset_id=a.id
             LEFT JOIN LATERAL (
               SELECT id,width,height,metadata FROM cms_media_versions
                WHERE asset_id=a.id ORDER BY version_number DESC LIMIT 1
             ) latest ON ref.media_version_id IS NULL
            WHERE a.id::text=ANY($1::text[]) AND a.status IN ('active','ready')
              AND ${approvedMediaVersionMetadataSql("COALESCE(pinned.metadata,latest.metadata)")}
              AND COALESCE(pinned.id,latest.id) IS NOT NULL`,
          [mediaIds, id, `revision:${parsed.data.revisionId}`],
        )
      : { rows: [] };
    const readyIds = new Set(readyMedia.rows.map((row: { id: string }) => row.id));
    const unavailable = mediaIds.filter((mediaId) => !readyIds.has(mediaId));
    for (const row of readyMedia.rows) {
      const expected = expectedVersions.get(String(row.id));
      if (expected && expected !== String(row.version_id)) unavailable.push(String(row.id));
      const expectedTypes = expectedMediaTypes.get(String(row.id));
      if (expectedTypes && !expectedTypes.includes(String(row.media_type))) {
        unavailable.push(String(row.id));
      }
    }
    if (unavailable.length) {
      await client.query("ROLLBACK");
      res.status(422).json({ error: "Publication references unavailable media.", details: unavailable });
      return;
    }
    const governanceErrors = mediaGovernanceErrors(references, readyMedia.rows);
    if (governanceErrors.length) {
      await client.query("ROLLBACK");
      res.status(422).json({ error: "Publication media governance validation failed.", details: governanceErrors });
      return;
    }
    let reviewedAvailability: Array<{ marketEditionId: string; locale: string; decision: AvailabilityDecision }> = [];
    let reviewedAvailabilityVersion: number | null = null;
    // A legacy shared source may retain an exact real-market address. Once
    // that exact address is the current materialization of a managed binding,
    // it follows the ordinary exact-edition review/publish path instead of the
    // document-wide shared-source availability confirmation. The immutable
    // managed-binding check above remains the authority for that distinction.
    if (revision.rows[0].content_mode === "shared" && !managedBinding) {
      const availabilityState = await client.query(
         `SELECT draft_version,reviewed_version,published_version,reviewed_selections,
                 reviewed_destination_pins,
                 shared_source_revision_id,reviewed_source_revision_id
           FROM cms_document_availability_states
          WHERE document_id=$1 FOR UPDATE`,
        [id],
      );
      if (!availabilityState.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "This shared revision has no destination availability state.",
        });
        return;
      }
      const availabilityRow = availabilityState.rows[0];
      const requestedAvailabilityVersion = parsed.data.availabilityVersion;
      if (
        requestedAvailabilityVersion === undefined
        || Number(availabilityRow.draft_version) !== requestedAvailabilityVersion
      ) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Destination selection changed since publication confirmation opened. Reload and confirm the current destination version.",
        });
        return;
      }
      if (directAdministratorPublish) {
        if (availabilityRow.shared_source_revision_id !== parsed.data.revisionId) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "This shared revision is no longer the current saved source.",
          });
          return;
        }
        // Direct publication freezes the current saved destination draft. It
        // intentionally does not turn that draft into independent-review
        // evidence; the version and source checks above are its race guards.
        reviewedAvailabilityVersion = Number(availabilityRow.draft_version);
      } else {
        if (availabilityRow.reviewed_source_revision_id !== parsed.data.revisionId) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "This shared revision must be reviewed with its exact destination selection before publication.",
          });
          return;
        }
        if (Number(availabilityRow.draft_version) !== Number(availabilityRow.reviewed_version)) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "Newer destination changes are staged after review. Review the current destination version before publication.",
          });
          return;
        }
        reviewedAvailabilityVersion = Number(availabilityRow.reviewed_version);
        reviewedAvailability = availabilitySelections(availabilityRow.reviewed_selections);
        if (!reviewedAvailability.length) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The reviewed destination selection is empty." });
          return;
        }
      }
      // Hold configuration stable through the revision and availability
      // release. SHARE blocks concurrent market inserts and enablement changes,
      // which row locks on the current enabled set cannot serialize.
      await client.query("LOCK TABLE market_editions IN SHARE MODE");
      const availabilityMarkets = await client.query(
        `SELECT m.id,m.code,configured_locale.locale,
                CASE WHEN a.market_edition_id IS NULL THEN 'off'
                     ELSE COALESCE(a.draft_decision,a.published_decision,'inherit') END staged_decision,
                ${publishedCustomIndustryWinnerClause(
                  "$1",
                  "m.code",
                  "configured_locale.locale",
                )} has_published_custom
           FROM market_editions m
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
              WHERE locale IS NOT NULL
           ) configured_locale
           LEFT JOIN cms_document_market_availability a
             ON a.document_id=$1 AND a.market_edition_id=m.id
            AND a.locale=configured_locale.locale
          WHERE m.enabled=true
           FOR UPDATE OF m`,
        [id],
      );
      if (directAdministratorPublish) {
        reviewedAvailability = availabilitySelections(
          availabilityMarkets.rows.map((destination: Record<string, unknown>) => ({
            marketEditionId: String(destination.id),
            locale: String(destination.locale),
            decision: String(destination.staged_decision) as AvailabilityDecision,
          })),
        );
      }
      if (!availabilitySelectionKeysMatchDestinations(reviewedAvailability, availabilityMarkets.rows)) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Destination configuration changed since review. Reopen and review the complete destination matrix.",
        });
        return;
      }
      // Atomic source publication also releases destination availability. Keep
      // the reviewed receipt tied to the exact local edition, published
      // revision, managed materialization, binding, and content digest; a
      // destination change after review must not be made public by this
      // transaction.
      if (!directAdministratorPublish) {
        const reviewedDestinationPins = availabilityDestinationPins(
          availabilityRow.reviewed_destination_pins,
        );
        const currentDestinationPins = await currentAvailabilityDestinationPins(client, id);
        if (!reviewedDestinationPins.length
          || !availabilityDestinationPinsMatch(reviewedDestinationPins, currentDestinationPins)) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "Destination content changed since review. Reopen and review the complete destination matrix.",
          });
          return;
        }
      }
      if (!await canAccessSharedDestinationMatrix(
        transactionAuth,
        revision.rows[0].kind as CmsDocumentTopic,
        "publish",
        availabilityMarkets.rows.map((market) => String(market.code)),
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: directAdministratorPublish
            ? "Publishing shared content requires authority for every selected destination market."
            : "Publishing shared content requires authority for every reviewed destination market.",
        });
        return;
      }
      if (revision.rows[0].kind === "industry") {
        const reviewedByDestination = new Map(
          reviewedAvailability.map((selection) => [
            `${selection.marketEditionId}|${selection.locale}`,
            selection,
          ]),
        );
        const errors = industryDeliveryErrors(
          publicationSnapshot,
          String(revision.rows[0].editorial_market ?? revision.rows[0].market),
          availabilityMarkets.rows.flatMap((destination: Record<string, unknown>) => {
            const selection = reviewedByDestination.get(
              `${String(destination.id)}|${String(destination.locale)}`,
            );
            return selection && selection.decision !== "off"
              ? [{
                  market: String(destination.code),
                  locale: String(destination.locale),
                  hasPublishedCustom: Boolean(destination.has_published_custom),
                }]
              : [];
          }),
        );
        if (errors.length) {
          await client.query("ROLLBACK");
          res.status(422).json({
            error: "Shared publication cannot deliver this industry revision to every selected destination. Customize incompatible destinations before publishing.",
            details: errors,
          });
          return;
        }
      }
      // Person destination availability has historically required an
      // administrator. A publisher may still release a reviewed shared person
      // revision when its reviewed destinations are identical to live delivery,
      // but cannot use the atomic document release to alter that matrix.
      if (revision.rows[0].kind === "person" && transactionAuth.user.role !== "administrator") {
        const liveAvailability = await client.query(
          `SELECT market_edition_id::text market_edition_id,locale,
                  COALESCE(published_decision,'inherit') decision
             FROM cms_document_market_availability
            WHERE document_id=$1
              AND market_edition_id::text=ANY($2::text[])`,
          [id, reviewedAvailability.map((selection) => selection.marketEditionId)],
        );
        if (reviewedAvailabilityDiffersFromPublished(
          reviewedAvailability,
          liveAvailability.rows.map((row: Record<string, unknown>) => ({
            marketEditionId: String(row.market_edition_id),
            locale: String(row.locale),
            decision: String(row.decision) as AvailabilityDecision,
          })),
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({
            error: "Only administrators can publish changed person destination availability.",
          });
          return;
        }
      }
    }
    if (mediaIds.length) {
      const selectedVersionIds = readyMedia.rows.map(
        (row: { version_id: string }) => row.version_id,
      );
      await client.query(
        `UPDATE cms_media_references ref
            SET media_version_id=selected.id
           FROM cms_media_versions selected
          WHERE selected.id::text=ANY($1::text[])
            AND ref.asset_id=selected.asset_id
            AND ref.document_id=$2
            AND ref.field_path=$3
            AND ref.media_version_id IS NULL`,
        [selectedVersionIds, id, `revision:${parsed.data.revisionId}`],
      );
    }
    // Editorial work owns the approval transition for reviewed releases and
    // preserves the designated reviewer's evidence.  The established direct
    // administrator exception performs its own conditional transition under
    // the same edition/document lock, making a concurrent state change a 409
    // instead of advancing the public pointer from a stale snapshot.
    const approved = directAdministratorPublish
      ? await client.query(
        `UPDATE cms_revisions SET workflow_state='approved',approved_by_user_id=$2,approved_at=now()
          WHERE id=$1 AND workflow_state IN ('draft','rejected')
          RETURNING id`,
        [parsed.data.revisionId, transactionAuth.user.id],
      )
      : restoredSuccessorPublish
      ? await client.query(
        `UPDATE cms_revisions SET workflow_state='approved',approved_by_user_id=$2,approved_at=now()
          WHERE id=$1 AND workflow_state IN ('draft','rejected','in-review')
          RETURNING id`,
        [parsed.data.revisionId, transactionAuth.user.id],
      )
      : await client.query(
        "SELECT id FROM cms_revisions WHERE id=$1 AND workflow_state='approved'",
        [parsed.data.revisionId],
      );
    if (approved.rowCount !== 1) {
      await client.query("ROLLBACK");
      res.status(409).json({
        error: directAdministratorPublish
          ? "The selected saved revision changed before direct publication."
          : "The selected revision is no longer approved.",
      });
      return;
    }
    if (restoredSuccessorPublish && restoreReleaseReceipt) {
      const consumed = await client.query(
        `UPDATE cms_restore_release_receipts
            SET consumed_at=now(),consumed_by_user_id=$2
          WHERE id=$1
            AND document_id=$3 AND edition_id=$4 AND revision_id=$5
            AND content_digest=$6 AND authorized_actor_user_id=$2
            AND authorized_transition='restore-successor-release'
            AND consumed_at IS NULL
          RETURNING id`,
        [
          restoreReleaseReceipt.id,
          transactionAuth.user.id,
          id,
          revision.rows[0].edition_id,
          revision.rows[0].id,
          revision.rows[0].content_digest,
        ],
      );
      if (consumed.rowCount !== 1) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "The restore-release receipt has already been consumed.",
        });
        return;
      }
    }
    await client.query(
      `UPDATE cms_market_editions SET publication_state=$2,publish_at=$3,
        published_revision_id=$4,published_at=CASE WHEN $2='published' THEN now() ELSE published_at END,
       updated_at=now() WHERE id=$1`,
       [revision.rows[0].edition_id, "published", null, parsed.data.revisionId],
    );
    if (reviewedAvailabilityVersion !== null) {
      for (const selection of reviewedAvailability) {
        await client.query(
          `INSERT INTO cms_document_market_availability
             (document_id,market_edition_id,locale,published_decision,draft_decision,published_by_user_id,published_at)
           VALUES ($1,$2,$3,$4,NULL,$5,now())
           ON CONFLICT (document_id,market_edition_id,locale) DO UPDATE
             SET published_decision=EXCLUDED.published_decision,draft_decision=NULL,
                 published_by_user_id=EXCLUDED.published_by_user_id,published_at=now(),updated_at=now()`,
          [id, selection.marketEditionId, selection.locale, selection.decision, transactionAuth.user.id],
        );
      }
      await client.query(
        directAdministratorPublish
          ? `UPDATE cms_document_availability_states
               SET published_version=$2,published_source_revision_id=$4,
                   published_by_user_id=$3,published_at=now(),updated_at=now()
             WHERE document_id=$1 AND draft_version=$2
               AND shared_source_revision_id=$4`
          : `UPDATE cms_document_availability_states
               SET published_version=$2,published_source_revision_id=$4,
                   published_by_user_id=$3,published_at=now(),updated_at=now()
             WHERE document_id=$1 AND reviewed_version=$2
               AND reviewed_source_revision_id=$4`,
        [id, reviewedAvailabilityVersion, transactionAuth.user.id, parsed.data.revisionId],
      );
    }
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,metadata)
       VALUES ($1,$2,'document.published','document',$3,$4)`,
       [transactionAuth.user.id, transactionAuth.user.email, id, {
         scheduled: false,
          directAdministratorPublish,
         editionId: String(revision.rows[0].edition_id),
         revisionId: parsed.data.revisionId,
          managedBindingId: managedBinding?.bindingId ?? null,
          managedBindingMode: managedBinding?.mode ?? null,
       }],
    );
    await client.query("COMMIT");
     publicationCommitted = true;
     try {
       res.json(await getDocument(
         id,
         transactionAuth,
         revision.rows[0].market,
         revision.rows[0].locale,
       ));
     } catch (error) {
       req.log.error({ err: error, documentId: id, revisionId: parsed.data.revisionId }, "Document published but response hydration failed");
       res.status(500).json({
         code: "DOCUMENT_PUBLISH_COMMITTED",
         committed: true,
         error: "The document was published, but its confirmation could not be loaded. Reload this edition before trying again.",
       });
     }
    } catch (error) {
      if (publicationCommitted) {
        if (!res.headersSent) {
          res.status(500).json({
            code: "DOCUMENT_PUBLISH_COMMITTED",
            committed: true,
            error: "The document was published, but its confirmation could not be loaded. Reload this edition before trying again.",
          });
        }
        return;
      }
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }),
);

router.post(
  "/documents/:documentId/rollback",
  requireCsrf,
  requireAdministrator,
  asyncRoute(async (req, res) => {
    const parsed = RollbackDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid rollback request." });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    let old: any;
    try {
      await client.query("BEGIN");
      await lockDocumentForMutation(client, id);
      const transactionAuth = await revalidateMutationAuth(client, auth, "administrator");
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      old = await client.query(
        `SELECT r.payload,r.edition_id,d.kind,d.canonical_slug,e.market,e.locale,e.content_mode
           FROM cms_revisions r
           JOIN cms_market_editions e ON e.id=r.edition_id
           JOIN cms_documents d ON d.id=e.document_id
          WHERE r.id=$1 AND e.document_id=$2
          FOR UPDATE OF e`,
        [parsed.data.revisionId, id],
      );
      if (!old.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected revision does not exist." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        id,
        String(old.rows[0].market),
        String(old.rows[0].locale),
        "edit",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      if (!isCmsConfigurationIdentityValid(
        old.rows[0].kind,
        old.rows[0].canonical_slug,
        old.rows[0].payload,
      )) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Site configuration does not match its canonical singleton identity." });
        return;
      }
      const revision = await client.query(
        `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,
          created_by_user_id,reason)
         SELECT $1,max(revision_number)+1,$2,$3,'draft',$4,$5
         FROM cms_revisions WHERE edition_id=$1 RETURNING id`,
        [old.rows[0].edition_id, old.rows[0].payload, digest(old.rows[0].payload), auth.user.id, parsed.data.note],
      );
      await syncMediaReferences(
        client,
        id,
        String(revision.rows[0].id),
        old.rows[0].payload,
        parsed.data.revisionId,
        old.rows[0].kind as CmsDocumentKind,
      );
      await synchronizeManagedMarketRevision(client, {
        documentId: id,
        market: String(old.rows[0].market),
        locale: String(old.rows[0].locale),
        revisionId: String(revision.rows[0].id),
        snapshot: old.rows[0].payload,
        kind: old.rows[0].kind as CmsDocumentKind,
        userId: auth.user.id,
        sourceRevisionId: parsed.data.revisionId,
      });
      if (old.rows[0].content_mode === "shared") {
        await ensureAvailabilityState(client, id);
        await client.query(
          `UPDATE cms_document_availability_states
              SET draft_version=draft_version+1,shared_source_revision_id=$2,reviewed_version=NULL,
                  reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
                  reviewed_destination_pins='[]'::jsonb,
                  updated_by_user_id=$3,updated_at=now()
            WHERE document_id=$1 AND shared_source_edition_id=$4`,
          [id, revision.rows[0].id, auth.user.id, old.rows[0].edition_id],
        );
      }
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(auth, "document.rolled_back", "document", id);
    res.json(await getDocument(id, auth, old!.rows[0].market, old!.rows[0].locale));
  }),
);

router.post(
  "/documents/:documentId/archive",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = ArchiveDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid archive request." });
      return;
    }
    const id = String(req.params.documentId);
    const client = await pool.connect();
    let archivedAuth: AuthContext | null = null;
    try {
      await client.query("BEGIN");
      if (!await lockDocumentForMutation(client, id)) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      archivedAuth = transactionAuth;
      const edition = await client.query(
        `SELECT id FROM cms_market_editions
          WHERE document_id=$1 AND market=$2 AND locale=$3
          FOR UPDATE`,
        [id, parsed.data.market, parsed.data.locale],
      );
      if (!edition.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Exact document edition not found." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        id,
        parsed.data.market,
        parsed.data.locale,
        "publish",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      await client.query(
        `UPDATE cms_market_editions SET publication_state='archived',updated_at=now() WHERE id=$1`,
        [edition.rows[0].id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(archivedAuth!, "document.archived", "document", id, parsed.data);
    res.json(await getDocument(
      id,
      archivedAuth!,
      parsed.data.market,
      parsed.data.locale,
    ));
  }),
);

router.post(
  "/documents/:documentId/restore",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const parsed = ArchiveDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid restore request." });
      return;
    }
    const id = String(req.params.documentId);
    const client = await pool.connect();
    let successorRevisionId: string | null = null;
    let restoreReleaseReceiptId: string | null = null;
    let restoredAuth: AuthContext | null = null;
    try {
      await client.query("BEGIN");
      const root = await client.query(
        "SELECT status FROM cms_documents WHERE id=$1 FOR UPDATE",
        [id],
      );
      if (!root.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      const transactionAuth = await revalidateMutationAuth(
        client,
        res.locals.auth as AuthContext,
      );
      if (!transactionAuth) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      restoredAuth = transactionAuth;
      const legacyRootArchive = root.rows[0].status === "archived";
      const selected = await client.query(
        `SELECT e.id,e.published_revision_id,e.content_mode,d.kind,
                latest.id revision_id,latest.revision_number,latest.workflow_state,latest.payload
           FROM cms_market_editions e
           JOIN cms_documents d ON d.id=e.document_id
           LEFT JOIN LATERAL (
             SELECT r.id,r.revision_number,r.workflow_state,r.payload
               FROM cms_revisions r WHERE r.edition_id=e.id
              ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC LIMIT 1
           ) latest ON true
           WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
             AND (e.publication_state='archived' OR $4::boolean)
          FOR UPDATE OF e`,
        [id, parsed.data.market, parsed.data.locale, legacyRootArchive],
      );
      if (!selected.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only an archived exact edition can be restored." });
        return;
      }
      const edition = selected.rows[0];
      if (!await canAccessEditionTarget(
        client,
        transactionAuth,
        id,
        parsed.data.market,
        parsed.data.locale,
        "publish",
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
        return;
      }
      if (edition.published_revision_id) {
        const publishedOrigin = await client.query(
          `SELECT COALESCE(baseline_edition.market,direct_edition.market) source_market
             FROM cms_revisions published
             LEFT JOIN cms_resolved_market_revisions resolved ON resolved.cms_revision_id=published.id
             LEFT JOIN cms_shared_baseline_revisions baseline ON baseline.id=resolved.baseline_revision_id
             LEFT JOIN cms_revisions baseline_source ON baseline_source.id=baseline.source_revision_id
             LEFT JOIN cms_market_editions baseline_edition ON baseline_edition.id=baseline_source.edition_id
             LEFT JOIN cms_revisions direct_source ON direct_source.id=published.source_revision_id
             LEFT JOIN cms_market_editions direct_edition ON direct_edition.id=direct_source.edition_id
            WHERE published.id=$1 AND published.edition_id=$2
            FOR KEY SHARE OF published`,
          [edition.published_revision_id, edition.id],
        );
        if (!publishedOrigin.rowCount
          || (publishedOrigin.rows[0].source_market
            && !await canAccessContent(transactionAuth.user, {
              topic: edition.kind as CmsDocumentTopic,
              capability: "publish",
              marketCode: String(publishedOrigin.rows[0].source_market),
            }))) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to the approved revision's historical source market." });
          return;
        }
      }
      if (legacyRootArchive) {
        await client.query(
          `UPDATE cms_market_editions
              SET publication_state='archived',updated_at=now()
            WHERE document_id=$1`,
          [id],
        );
        await client.query(
          "UPDATE cms_documents SET status='active',updated_at=now() WHERE id=$1",
          [id],
        );
      }
      // A published edition always recovers the immutable approved publication,
      // never whichever newer draft/rejected revision happens to sort latest.
      // A never-published archive has no approved history to clone: recovery
      // deliberately retains its existing draft/rejected work as a draft.
      if (edition.published_revision_id) {
        const sourceRevisionId = edition.published_revision_id;
        const source = await client.query(
          `SELECT id,payload,content_digest FROM cms_revisions
            WHERE id=$1 AND edition_id=$2 AND workflow_state='approved'
            FOR KEY SHARE`,
          [sourceRevisionId, edition.id],
        );
        if (!source.rowCount) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The archived edition's approved published history is unavailable." });
          return;
        }
        const successor = await client.query(
          `INSERT INTO cms_revisions
            (edition_id,revision_number,payload,content_digest,workflow_state,
             created_by_user_id,reason)
           SELECT e.id,COALESCE(max(existing.revision_number),0)+1,source.payload,source.content_digest,
                  'draft',$3,'Restored from archived published history'
             FROM cms_market_editions e
             JOIN cms_revisions source ON source.id=$2 AND source.edition_id=e.id
             LEFT JOIN cms_revisions existing ON existing.edition_id=e.id
            WHERE e.id=$1
            GROUP BY e.id,source.payload,source.content_digest
             RETURNING id,payload,content_digest`,
          [
            edition.id,
            sourceRevisionId,
            transactionAuth.user.id,
          ],
        );
        if (!successor.rowCount) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The archived edition's published history is unavailable." });
          return;
        }
        successorRevisionId = String(successor.rows[0].id);
        const restoreReleaseReceipt = await client.query(
          `INSERT INTO cms_restore_release_receipts
             (document_id,edition_id,revision_id,content_digest,
              authorized_actor_user_id,authorized_transition)
           VALUES ($1,$2,$3,$4,$5,'restore-successor-release')
           RETURNING id`,
          [
            id,
            edition.id,
            successorRevisionId,
            successor.rows[0].content_digest,
            transactionAuth.user.id,
          ],
        );
        restoreReleaseReceiptId = String(restoreReleaseReceipt.rows[0].id);
        // Recovery is also an explicit accuracy acknowledgement for the exact
        // immutable successor. Both records are durable and commit together.
        await client.query(
          `INSERT INTO cms_revision_accuracy_confirmations
             (revision_id,content_digest,confirmed_by_user_id)
           VALUES ($1,$2,$3)
           ON CONFLICT(revision_id,confirmed_by_user_id,content_digest)
           DO UPDATE SET confirmed_at=now()`,
          [successorRevisionId, successor.rows[0].content_digest, transactionAuth.user.id],
        );
        await syncMediaReferences(
          client,
          id,
          successorRevisionId,
          successor.rows[0].payload,
          String(sourceRevisionId),
          edition.kind as CmsDocumentKind,
        );
        await synchronizeManagedMarketRevision(client, {
          documentId: id,
          market: parsed.data.market,
          locale: parsed.data.locale,
          revisionId: successorRevisionId,
          snapshot: successor.rows[0].payload,
          kind: edition.kind as CmsDocumentKind,
          userId: transactionAuth.user.id,
          sourceRevisionId: String(sourceRevisionId),
        });
        if (edition.content_mode === "shared") {
          await ensureAvailabilityState(client, id);
          await client.query(
            `UPDATE cms_document_availability_states
                SET draft_version=draft_version+1,shared_source_revision_id=$2,reviewed_version=NULL,
                    reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
                    reviewed_destination_pins='[]'::jsonb,
                    updated_by_user_id=$3,updated_at=now()
              WHERE document_id=$1 AND shared_source_edition_id=$4`,
            [id, successorRevisionId, transactionAuth.user.id, edition.id],
          );
        }
      } else if (!edition.revision_id || !["draft", "rejected"].includes(String(edition.workflow_state))) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "A never-published archived edition can be recovered only when it retains a draft or rejected revision.",
        });
        return;
      }
      await client.query(
        `UPDATE cms_market_editions
            SET publication_state='draft',publish_at=NULL,published_at=NULL,updated_at=now()
          WHERE id=$1`,
        [edition.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(restoredAuth!, "document.restored", "document", id, {
      ...parsed.data,
      successorRevisionId,
      restoreReleaseReceiptId,
    });
    res.json(await getDocument(
      id,
      restoredAuth!,
      parsed.data.market,
      parsed.data.locale,
    ));
  }),
);

router.get(
  "/documents/:documentId/preview",
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const market = typeof req.query.market === "string" ? req.query.market : "";
    const locale = typeof req.query.locale === "string" ? req.query.locale : "";
    if (!market || !locale) {
      res.status(400).json({ error: "Both market and locale are required for an exact preview." });
      return;
    }
    if (!await canAccessEditionTarget(
      pool, res.locals.auth as AuthContext, id, market, locale, "edit",
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const document = await getDocument(
      id,
      res.locals.auth as AuthContext,
      market,
      locale,
    );
    if (!document) {
      res.status(404).json({ error: "Document not found." });
      return;
    }
    const edition = await pool.query(
      `SELECT e.id,e.market,e.locale,NULL::text fallback_reason,false used_fallback
         FROM cms_market_editions e
        WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
        ORDER BY e.created_at,e.id LIMIT 1`,
      [id, market, locale],
    );
    if (!edition.rowCount) {
      res.status(404).json({ error: "Exact document edition not found." });
      return;
    }
    const requestedRevisionId = typeof req.query.revisionId === "string" ? req.query.revisionId : null;
    const revision = await pool.query(
      `SELECT id,payload,revision_number FROM cms_revisions
        WHERE edition_id=$1 AND ($2::uuid IS NULL OR id=$2)
        ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
      [edition.rows[0].id, requestedRevisionId],
    );
    if (!revision.rowCount) {
      res.status(404).json({ error: "Document has no revision." });
      return;
    }
    const token = randomToken();
    const expiresAt = new Date(Date.now() + 10 * 60_000);
    const effectiveNavigation = await publishedNavigationPolicy(market, locale);
    const navigationSnapshot = effectiveNavigation ?? {
      market,
      locale,
      requestedMarket: market,
      requestedLocale: locale,
      usedFallback: false,
      publishedAt: null,
      items: [],
      pages: [],
    };
    const navigationPolicyDigest = digest(navigationSnapshot);
    await pool.query(
      `INSERT INTO cms_preview_sessions
        (token_digest,edition_id,revision_id,created_by_user_id,expires_at,
         requested_market,requested_locale,fallback_reason,navigation_policy_digest,navigation_snapshot)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
      [
        hashToken(token),
        edition.rows[0].id,
        revision.rows[0].id,
        (res.locals.auth as AuthContext).user.id,
        expiresAt,
        market,
        locale,
        edition.rows[0].fallback_reason ?? null,
        navigationPolicyDigest,
        navigationSnapshot,
      ],
    );
    const validation = validateSnapshot(document.kind, revision.rows[0].payload, "draft");
    res.set({
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    res.json({
      document: revision.rows[0].payload,
      previewUrl: `/preview/${token}`,
      expiresAt,
      requestedMarket: market,
      requestedLocale: locale,
      market: edition.rows[0].market,
      locale: edition.rows[0].locale,
      revisionId: String(revision.rows[0].id),
      revisionNumber: revision.rows[0].revision_number,
      usedFallback: edition.rows[0].used_fallback,
      fallbackReason: edition.rows[0].fallback_reason ?? null,
      navigationPolicyDigest,
      navigation: navigationSnapshot,
      warnings: validation.success ? [] : validation.errors,
    });
  }),
);

router.get(
  "/preview/:token",
  authenticate,
  requireMfa,
  asyncRoute(async (req, res) => {
    const preview = await pool.query(
      `SELECT d.id document_id,d.kind,e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,
              r.id revision_id,r.payload,r.revision_number,
              p.requested_market,p.requested_locale,p.fallback_reason,
              p.navigation_policy_digest,p.navigation_snapshot,p.expires_at,p.revoked_at
         FROM cms_preview_sessions p
         JOIN cms_market_editions e ON e.id=p.edition_id
         JOIN cms_documents d ON d.id=e.document_id
         JOIN cms_revisions r ON r.id=p.revision_id AND r.edition_id=e.id
         WHERE p.token_digest=$1`,
      [hashToken(String(req.params.token))],
    );
    if (!preview.rowCount) {
      res.status(404).json({ error: "Preview not found." });
      return;
    }
    res.set({
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    const row = preview.rows[0];
    if (!await canAccessEditionTarget(
      pool,
      res.locals.auth as AuthContext,
      String(row.document_id),
      String(row.requested_market ?? row.market),
      String(row.requested_locale ?? row.locale),
    )) {
      res.status(403).json({ error: "You are not assigned to this preview market." });
      return;
    }
    if (row.revoked_at) {
      res.status(410).json({ error: "Preview session has been revoked.", reason: "revoked" });
      return;
    }
    if (new Date(row.expires_at).getTime() <= Date.now()) {
      res.status(410).json({ error: "Preview session has expired.", reason: "expired" });
      return;
    }
    const pending = await pool.query(
      `SELECT 1 FROM cms_media_references ref
        JOIN cms_media_assets a ON a.id=ref.asset_id
        JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
       WHERE ref.document_id=$1 AND ref.field_path='revision:'||$2::text
         AND (
           a.status='pending-review'
           OR v.metadata->>'rightsStatus'='needs-review'
           OR v.metadata->>'accessibilityStatus'='needs-review'
         )
        LIMIT 1`,
      [String(row.document_id), String(row.revision_id)],
    );
    if (pending.rowCount && !await canAccessEditionTarget(
      pool,
      res.locals.auth as AuthContext,
      String(row.document_id),
      String(row.requested_market ?? row.market),
      String(row.requested_locale ?? row.locale),
      "edit",
    )) {
      res.status(403).json({ error: "Pending-review preview media requires Edit access to this exact edition." });
      return;
    }
    const requestedMarket = String(row.requested_market ?? row.market);
    const editionMarket = String(row.editorial_market ?? row.market);
    const projectedDocument = projectPreviewDocument(
      row.kind as CmsDocumentKind,
      row.payload,
      requestedMarket,
      editionMarket,
    );
    const validation = validateCmsSnapshotForDelivery(
      row.kind as CmsDocumentKind,
      projectedDocument,
      "draft",
    );
    // Delivery validation intentionally does not carry the document kind or
    // every structured media reference. Re-collect from the authoritative
    // kind and snapshot so hero/logo/PDF/social and other governed references
    // receive the same exact pinned-version capability as legacy mediaIds.
    const mediaIds = previewMediaIds(projectedDocument, row.kind as CmsDocumentKind);
    const availableMedia = mediaIds.length ? await pool.query(
      `SELECT a.id,v.id version_id,v.width,v.height,v.metadata,
          a.media_type,a.alt_text,a.credit
         FROM cms_media_references ref
         JOIN cms_media_assets a ON a.id=ref.asset_id
         JOIN cms_media_versions v ON v.id=ref.media_version_id AND v.asset_id=a.id
        WHERE ref.document_id=$1
          AND ref.field_path=$2
          AND a.id::text=ANY($3::text[])
           -- Preview sessions are authenticated, MFA-protected, market-scoped,
           -- and no-store. They may render review-pending assets so editorial
           -- review can assess a complete draft; public delivery never does.
           AND a.status IN ('active','ready','pending-review')`,
      [
        String(row.document_id),
        `revision:${String(row.revision_id)}`,
        mediaIds,
      ],
    ) : { rows: [] };
    const availableIds = new Set(availableMedia.rows.map((asset) => String(asset.id)));
    res.json({
      kind: row.kind,
      document: projectedDocument,
      market: row.market,
      locale: row.locale,
      requestedMarket: row.requested_market ?? row.market,
      requestedLocale: row.requested_locale ?? row.locale,
      revisionId: String(row.revision_id),
      revisionNumber: row.revision_number,
      usedFallback: Boolean(row.fallback_reason),
      fallbackReason: row.fallback_reason ?? null,
      navigationPolicyDigest: row.navigation_policy_digest,
      navigation: row.navigation_snapshot,
      media: availableMedia.rows.map((asset) => ({
        id: String(asset.id),
        versionId: String(asset.version_id),
        url: `/api/preview/${encodeURIComponent(String(req.params.token))}/media/${String(asset.id)}/${String(asset.version_id)}`,
        mimeType: asset.media_type,
        width: asset.width ?? null,
        height: asset.height ?? null,
          altText: Object.hasOwn(asset.metadata ?? {}, "altText")
            ? asset.metadata.altText
            : asset.alt_text ?? null,
        caption: asset.metadata?.caption ?? null,
          credit: Object.hasOwn(asset.metadata ?? {}, "credit")
            ? asset.metadata.credit
            : asset.credit ?? null,
          focalPoint: Object.hasOwn(asset.metadata ?? {}, "focalPoint")
            ? asset.metadata.focalPoint
            : null,
      })),
      missingMediaIds: mediaIds.filter((id) => !availableIds.has(id)),
      validationWarnings: validation.success ? [] : validation.errors,
    });
  }),
);

router.get(
  "/preview/:token/media/:mediaId/:versionId",
  authenticate,
  requireMfa,
  asyncRoute(async (req, res) => {
    const asset = await pool.query(
      `SELECT d.id document_id,d.kind,v.storage_key,v.metadata,r.payload,e.market,e.locale,
              p.requested_market,p.requested_locale,a.status,
          CASE WHEN v.metadata->>'rendition'='webp-1600' THEN 'image/webp' ELSE a.media_type END media_type
         FROM cms_preview_sessions p
         JOIN cms_market_editions e ON e.id=p.edition_id
         JOIN cms_documents d ON d.id=e.document_id
         JOIN cms_revisions r ON r.id=p.revision_id AND r.edition_id=e.id
         JOIN cms_media_references ref ON ref.document_id=d.id
           AND ref.field_path='revision:'||r.id::text
         JOIN cms_media_assets a ON a.id=ref.asset_id
         JOIN cms_media_versions v ON v.asset_id=a.id AND v.id=ref.media_version_id
        WHERE p.token_digest=$1 AND p.expires_at>now()
          AND p.revoked_at IS NULL
          AND a.id=$2 AND v.id=$3 AND a.status IN ('active','ready','pending-review')
        LIMIT 1`,
      [
        hashToken(String(req.params.token)),
        req.params.mediaId,
        req.params.versionId,
      ],
    );
    if (!asset.rowCount || !previewMediaIds(
      asset.rows[0].payload,
      asset.rows[0].kind as CmsDocumentKind,
    ).includes(String(req.params.mediaId))) {
      res.status(404).json({ error: "Preview media not found or expired." });
      return;
    }
    if ((asset.rows[0].status === "pending-review"
      || mediaVersionReviewStatus(asset.rows[0].metadata) === "pending")
      && !await canAccessEditionTarget(
        pool,
        res.locals.auth as AuthContext,
        String(asset.rows[0].document_id),
        String(asset.rows[0].requested_market ?? asset.rows[0].market),
        String(asset.rows[0].requested_locale ?? asset.rows[0].locale),
        "edit",
      )) {
      res.status(403).json({ error: "Pending-review preview media requires Edit access to this exact edition." });
      return;
    }
    if (!await canAccessEditionTarget(
      pool,
      res.locals.auth as AuthContext,
      String(asset.rows[0].document_id),
      String(asset.rows[0].requested_market ?? asset.rows[0].market),
      String(asset.rows[0].requested_locale ?? asset.rows[0].locale),
    )) {
      res.status(403).json({ error: "You are not assigned to this preview market." });
      return;
    }
    res.set({
      "Cache-Control": "no-store, private",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    });
    res.type(asset.rows[0].media_type);
    const stream = await previewMediaDelivery.download(asset.rows[0].storage_key);
    stream.on("error", () => res.destroy());
    stream.pipe(res);
  }),
);

export default router;