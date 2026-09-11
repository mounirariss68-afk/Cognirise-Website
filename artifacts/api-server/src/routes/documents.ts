import { createHash } from "node:crypto";
import { Router, type IRouter } from "express";
import { pool } from "@workspace/db";
import {
  ArchiveDocumentBody,
  AddDocumentReviewCommentBody,
  collectCmsMediaReferences,
  type CmsDocumentKind,
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
import { canAccessPendingPreviewMedia } from "../preview-access.js";
import {
  authenticate,
  requireCsrf,
  requireEditor,
  requireAdministrator,
  requireMfa,
  requirePublisher,
  type AuthContext,
} from "../lib/auth";
import { audit, pageOf } from "../lib/cms";
import { asyncRoute } from "../lib/http";
import { hashToken, randomToken } from "../lib/security";
import { canChangeCanonicalSlug } from "../lib/policy";
import { downloadMediaObject } from "../lib/object-storage";
import { navigationCandidates, publishedNavigationPolicy } from "../lib/navigation-policy";
import {
  DELETE_DOCUMENT_SQL,
  DOCUMENT_SELECT_SQL,
} from "../lib/document-lifecycle-sql";
import {
  effectiveAvailability,
  industryDestinationEligibilityClause,
  publicPayloadEligibilityClause,
  type AvailabilityDecision,
} from "../lib/availability";

const router: IRouter = Router();
export const previewMediaDelivery = {
  download: downloadMediaObject,
};
router.use("/documents", authenticate, requireMfa);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function canAccessMarket(auth: AuthContext, market: string): boolean {
  return auth.user.role === "administrator" || auth.user.marketCodes.includes(market);
}

export function previewMediaIds(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  const snapshot = payload as Record<string, unknown>;
  const content = snapshot.content && typeof snapshot.content === "object" && !Array.isArray(snapshot.content)
    ? snapshot.content as Record<string, unknown>
    : {};
  const kind = typeof snapshot.kind === "string" ? snapshot.kind : "landing-page";
  const candidates = collectCmsMediaReferences(
    kind as CmsDocumentKind,
    content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.filter((value): value is string => typeof value === "string") : [],
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
) {
  const references = collectCmsMediaReferences(
    snapshot.kind as CmsDocumentKind,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [],
  );
  const exactVersions = new Map(references
    .filter((reference): reference is typeof reference & { mediaVersionId: string } => Boolean(reference.mediaVersionId))
    .map((reference) => [reference.mediaId, reference.mediaVersionId]));
  for (const assetId of Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : []) {
    const exactVersionId = exactVersions.get(String(assetId)) ?? null;
    await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       SELECT asset.id,COALESCE(requested.id,prior.media_version_id,latest.id),$3,$4
         FROM cms_media_assets asset
          LEFT JOIN cms_media_versions requested
            ON requested.asset_id=asset.id AND requested.id=$2
          LEFT JOIN cms_media_references prior
            ON prior.asset_id=asset.id AND prior.document_id=$3
           AND prior.field_path=CASE WHEN $5::text IS NULL THEN '' ELSE 'revision:'||$5 END
          LEFT JOIN LATERAL (SELECT id FROM cms_media_versions
             WHERE asset_id=asset.id ORDER BY version_number DESC LIMIT 1) latest
            ON requested.id IS NULL AND prior.media_version_id IS NULL
         WHERE asset.id=$1 AND asset.status IN ('active','ready')
            AND ($2::uuid IS NULL OR requested.id IS NOT NULL)
            AND COALESCE(requested.id,prior.media_version_id,latest.id) IS NOT NULL
       ON CONFLICT DO NOTHING`,
      [assetId, exactVersionId, documentId, `revision:${revisionId}`, sourceRevisionId ?? null],
    );
  }
}

function validateSnapshot(kind: string, snapshot: unknown, mode: "draft" | "publish") {
  return validateCmsSnapshot(kind as CmsDocumentKind, snapshot, mode);
}

function expectedMedia(kind: CmsDocumentKind, snapshot: Record<string, any>) {
  return collectCmsMediaReferences(
    kind,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [],
  );
}

export function mediaGovernanceErrors(
  references: ReturnType<typeof expectedMedia>,
  rows: Array<Record<string, any>>,
): string[] {
  const errors: string[] = [];
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
    if (rightsStatus != null && rightsStatus !== "approved") {
      errors.push(`${reference.fieldPath}: media rights are not approved.`);
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
  return auth.user.role === "administrator" ? null : auth.user.marketCodes;
}

type Queryable = { query: (sql: string, values?: unknown[]) => Promise<any> };

/**
 * Shared source editions use an internal market/locale solely as an authoring
 * address. Authority is instead the authority to every enabled destination.
 * Custom editions retain their exact-market permission boundary.
 */
async function canAccessEditionTarget(
  client: Queryable,
  auth: AuthContext,
  documentId: string,
  market: string,
  locale: string,
): Promise<boolean> {
  if (auth.user.role === "administrator") return true;
  const edition = await client.query(
    `SELECT content_mode FROM cms_market_editions
      WHERE document_id=$1 AND market=$2 AND locale=$3
      ORDER BY created_at,id LIMIT 1`,
    [documentId, market, locale],
  );
  // Market permissions still govern a configured destination which has no
  // exact document edition yet. Once one exists, however, mode must come from
  // that exact market/locale target: another locale can be custom while this
  // one is shared (or vice versa).
  if (!edition.rowCount) return canAccessMarket(auth, market);
  if (edition.rows[0]?.content_mode !== "shared") return canAccessMarket(auth, market);
  const destinations = await client.query(
    "SELECT code FROM market_editions WHERE enabled=true",
  );
  return destinations.rows.length > 0
    && destinations.rows.every((row: { code: string }) => canAccessMarket(auth, String(row.code)));
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
    `SELECT draft_version,reviewed_version,published_version,reviewed_selections,
            shared_source_edition_id,shared_source_revision_id,published_source_revision_id
       FROM cms_document_availability_states WHERE document_id=$1`,
    [documentId],
  );
  const stateRow = state.rows[0] ?? {
    draft_version: 0, reviewed_version: null, published_version: 0, reviewed_selections: [],
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
  const items = (destinations.rows as Array<Record<string, any>>)
    .filter((row) => canAccessMarket(auth, String(row.market)))
    .map((row) => {
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
    canEditShared: Boolean(stateRow.shared_source_edition_id)
      && destinations.rows.length > 0
      && destinations.rows.every((row: { market: string }) => canAccessMarket(auth, String(row.market))),
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
    if (q.market && !canAccessMarket(auth, q.market)) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
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
      : auth.user.role === "administrator"
        ? []
        : auth.user.marketCodes;
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
    if (q.status) items = items.filter((item) => item.status === q.status);
    const total = items.length;
    items = items.slice((q.page - 1) * q.pageSize, q.page * q.pageSize);
    res.json(pageOf(items, total, q.page, q.pageSize));
  }),
);

router.post(
  "/documents/:documentId/editions",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const parsed = CreateDocumentEditionOverrideBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid edition override.", details: parsed.error.issues });
      return;
    }
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    if (!canAccessMarket(auth, parsed.data.market)) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
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
  requireEditor,
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
      res.status(422).json({ error: "Content contract validation failed.", details: validated.errors });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    if (parsed.data.markets.some((market) => !canAccessMarket(auth, market))) {
      res.status(403).json({ error: "You are not assigned to every requested market." });
      return;
    }
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const configuredMarkets = await client.query(
        "SELECT code FROM market_editions WHERE enabled=true FOR UPDATE",
      );
      if (configuredMarkets.rows.some((row) => !canAccessMarket(auth, String(row.code)))) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Creating shared content requires authority for every enabled destination market." });
        return;
      }
      const root = await client.query(
        `INSERT INTO cms_documents(kind,canonical_slug,title,owner_id,status)
         VALUES ($1,$2,$3,$4,'active') RETURNING id`,
        [parsed.data.kind, parsed.data.slug, parsed.data.title, auth.user.id],
      );
      const snapshot = validated.data;
      const sourceMarket = parsed.data.markets[0];
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
        [edition.rows[0].id, snapshot, digest(snapshot), auth.user.id],
      );
      await syncMediaReferences(client, String(root.rows[0].id), String(revision.rows[0].id), snapshot);
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
        [root.rows[0].id, parsed.data.markets, auth.user.id],
      );
      await client.query(
        `INSERT INTO cms_document_availability_states
          (document_id,draft_version,shared_source_edition_id,shared_source_revision_id,updated_by_user_id)
         VALUES ($1,1,$2,$3,$4)`,
        [root.rows[0].id, edition.rows[0].id, revision.rows[0].id, auth.user.id],
      );
      await client.query("COMMIT");
      const selectedMarket = sourceMarket;
      const selectedConfig = await pool.query(
        "SELECT default_locale FROM market_editions WHERE code=$1",
        [selectedMarket],
      );
      const document = await getDocument(
        String(root.rows[0].id),
        auth,
        selectedMarket,
        selectedConfig.rows[0]?.default_locale,
      );
      await audit(auth, "document.created", "document", String(root.rows[0].id));
      res.status(201).json(document);
    } catch (error) {
      await client.query("ROLLBACK");
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
      if (!canAccessMarket(auth, target.code)) continue;
      const locales = [...new Set([
        target.default_locale,
        target.fallback_locale,
        ...actualEditions.rows
          .filter((edition) => edition.market === target.code)
          .map((edition) => edition.locale),
      ].filter(Boolean))];
      for (const targetLocale of locales) {
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
            ORDER BY CASE WHEN e.locale=$3 THEN 0 ELSE 1 END,e.created_at,e.id LIMIT 1`,
          [documentId, candidate.market, candidate.locale],
        );
          if (found.rowCount && found.rows[0].revision_id) {
            effective = found.rows[0];
            fallbackReason = candidate.market === target.code
              ? (candidate.locale === targetLocale ? null : "locale")
              : "market-locale";
            break;
          }
        }
        const readinessPayload = exact?.payload;
        const readiness = readinessPayload
          ? validateSnapshot(document.rows[0].kind, readinessPayload, "publish")
          : { success: false as const, errors: ["No exact edition exists."] };
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
          ready: readiness.success,
          readinessErrors: readiness.success ? [] : readiness.errors,
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
  requireEditor,
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
      const exists = await client.query("SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE", [documentId]);
      if (!exists.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
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
      const denied = configured.rows.find((row) => !canAccessMarket(auth, String(row.code)));
      if (denied) {
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
          [documentId, destination.marketEditionId, destination.locale, destination.decision, auth.user.id],
        );
      }
      await client.query(
        `UPDATE cms_document_availability_states
            SET draft_version=draft_version+1,reviewed_version=NULL,
                reviewed_selections='[]'::jsonb,reviewed_source_revision_id=NULL,
                updated_by_user_id=$2,updated_at=now()
          WHERE document_id=$1`,
        [documentId, auth.user.id],
      );
      await client.query("COMMIT");
      await audit(auth, "document.availability.staged", "document", documentId, {
        version: parsed.data.version + 1,
        destinations: parsed.data.destinations,
      });
      res.json(await documentAvailability(pool, documentId, auth));
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
  requireEditor,
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
        "SELECT kind FROM cms_documents WHERE id=$1 FOR KEY SHARE",
        [documentId],
      );
      if (!kind.rowCount) {
        await client.query("ROLLBACK");
        res.status(404).json({ error: "Document not found." });
        return;
      }
      await ensureAvailabilityState(client, documentId);
      const state = await client.query(
        `SELECT draft_version,shared_source_revision_id FROM cms_document_availability_states
          WHERE document_id=$1 FOR UPDATE`,
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
      if (kind.rows[0].kind !== "person" && !state.rows[0].shared_source_revision_id) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Choose and save a shared source before sending destinations for review.",
        });
        return;
      }
      const rows = await client.query(
        `SELECT m.id,m.code,configured_locale.locale,
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
      if (rows.rows.some((row) => !canAccessMarket(auth, String(row.code)))) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Reviewing shared destinations requires authority for every affected market." });
        return;
      }
      const selections = rows.rows.map((row) => ({
        marketEditionId: String(row.id),
        locale: String(row.locale),
        decision: row.decision as AvailabilityDecision,
      }));
      await client.query(
        `UPDATE cms_document_availability_states
            SET reviewed_version=draft_version,reviewed_selections=$2::jsonb,
                reviewed_source_revision_id=$3,reviewed_by_user_id=$4,reviewed_at=now(),updated_at=now()
          WHERE document_id=$1`,
        [documentId, JSON.stringify(selections), state.rows[0].shared_source_revision_id, auth.user.id],
      );
      await client.query("COMMIT");
      await audit(auth, "document.availability.reviewed", "document", documentId, {
        version: parsed.data.version, destinations: selections,
      });
      res.json(await documentAvailability(pool, documentId, auth, parsed.data.version));
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
        `SELECT e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,r.id,r.payload
           FROM cms_revisions r
           JOIN cms_market_editions e ON e.id=r.edition_id
          WHERE e.document_id=$1 AND r.id=$2
          FOR UPDATE`,
        [documentId, parsed.data.sourceRevisionId],
      );
      if (!source.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The selected revision is not part of this document." });
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
          auth.user.id,
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
      );
      await client.query(
        `UPDATE cms_document_availability_states
            SET draft_version=draft_version+1,shared_source_edition_id=$2,shared_source_revision_id=$3,
                reviewed_version=NULL,reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,
                updated_by_user_id=$4,updated_at=now()
          WHERE document_id=$1`,
        [documentId, sharedEdition.rows[0].id, sharedRevision.rows[0].id, auth.user.id],
      );
      await client.query("COMMIT");
      await audit(auth, "document.availability.source_selected", "document", documentId, {
        version: parsed.data.version + 1,
        sourceRevisionId: parsed.data.sourceRevisionId,
        sharedEditionId: String(sharedEdition.rows[0].id),
        sharedRevisionId: String(sharedRevision.rows[0].id),
      });
      res.status(201).json(await documentAvailability(pool, documentId, auth));
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
  requireAdministrator,
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
      const state = await client.query(
        `SELECT draft_version,reviewed_version,reviewed_selections,
                shared_source_revision_id,reviewed_source_revision_id
           FROM cms_document_availability_states WHERE document_id=$1 FOR UPDATE`,
        [documentId],
      );
      if (document.rows[0].kind !== "person" || state.rows[0]?.shared_source_revision_id) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Shared availability is released only with its reviewed document revision. Use document publication.",
        });
        return;
      }
      if (!state.rowCount || Number(state.rows[0].reviewed_version) !== parsed.data.version
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
        `SELECT m.id,m.code,configured_locale.locale
           FROM market_editions m
           CROSS JOIN LATERAL (
             SELECT DISTINCT locale FROM unnest(ARRAY[m.default_locale,m.fallback_locale]) locale
              WHERE locale IS NOT NULL
           ) configured_locale
          WHERE m.enabled=true
          FOR UPDATE OF m`,
      );
      if (!availabilitySelectionKeysMatchDestinations(selections, markets.rows)) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Destination configuration changed since review. Reopen and review the complete destination matrix.",
        });
        return;
      }
      if (markets.rows.some((market) => !canAccessMarket(auth, String(market.code)))) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "Publishing shared destinations requires authority for every affected market." });
        return;
      }
      for (const selection of selections) {
        await client.query(
          `INSERT INTO cms_document_market_availability
             (document_id,market_edition_id,locale,published_decision,draft_decision,published_by_user_id,published_at)
           VALUES ($1,$2,$3,$4,NULL,$5,now())
           ON CONFLICT (document_id,market_edition_id,locale) DO UPDATE
             SET published_decision=EXCLUDED.published_decision,draft_decision=NULL,
                 published_by_user_id=EXCLUDED.published_by_user_id,published_at=now(),updated_at=now()`,
          [documentId, selection.marketEditionId, selection.locale, selection.decision, auth.user.id],
        );
      }
      await client.query(
        `UPDATE cms_document_availability_states
            SET published_version=reviewed_version,published_by_user_id=$2,published_at=now(),updated_at=now()
          WHERE document_id=$1`,
        [documentId, auth.user.id],
      );
      await client.query("COMMIT");
      await audit(auth, "document.availability.published", "document", documentId, {
        version: parsed.data.version, destinations: selections,
      });
      res.json(await documentAvailability(pool, documentId, auth, parsed.data.version));
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
  requireEditor,
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
    if (!canAccessMarket(auth, target.rows[0].market)) {
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
        [documentId, marketEditionId, target.rows[0].locale, decision, auth.user.id],
      );
      await client.query(
        `UPDATE cms_document_availability_states
            SET draft_version=draft_version+1,reviewed_version=NULL,reviewed_selections='[]'::jsonb,
                reviewed_source_revision_id=NULL,updated_by_user_id=$2,updated_at=now()
          WHERE document_id=$1`,
        [documentId, auth.user.id],
      );
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
    await audit(auth, "person.market_availability.staged", "document", documentId, {
      marketEditionId,
      market: target.rows[0].market,
      decision,
    });
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
      res.status(400).json({ error: "A reviewed destination selection version is required." });
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
      const state = await client.query(
        `SELECT reviewed_version,reviewed_selections,shared_source_revision_id,reviewed_source_revision_id
           FROM cms_document_availability_states WHERE document_id=$1 FOR UPDATE`,
        [documentId],
      );
      const targetMarket = await client.query(
        "SELECT default_locale FROM market_editions WHERE id=$1",
        [marketEditionId],
      );
      const reviewed = state.rowCount ? availabilitySelections(state.rows[0].reviewed_selections) : [];
      if (!state.rowCount || Number(state.rows[0].reviewed_version) !== version
        || state.rows[0].shared_source_revision_id
        || state.rows[0].reviewed_source_revision_id !== state.rows[0].shared_source_revision_id
        || !reviewed.some((selection) =>
          selection.marketEditionId === marketEditionId
            && selection.locale === targetMarket.rows[0]?.default_locale,
        )) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "This person decision is not part of the current reviewed destination selection.",
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
        [documentId, marketEditionId, auth.user.id],
      );
      if (!published.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "No pending reviewed person market availability decision exists." });
        return;
      }
      await client.query("COMMIT");
      const row = published.rows[0];
    await audit(auth, "person.market_availability.published", "document", documentId, {
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
  requireEditor,
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
      if (!await canAccessEditionTarget(client, auth, id, requestedMarket, requestedLocale)) {
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
        if (affectedMarkets.rows.some((row) => !canAccessMarket(auth, String(row.code)))) {
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
        res.status(422).json({ error: "Content contract validation failed.", details: validated.errors });
        return;
      }
      const snapshot = validated.data;
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
       );
      if (edition.rows[0].content_mode === "shared") {
        await ensureAvailabilityState(client, id);
        await client.query(
          `UPDATE cms_document_availability_states
              SET draft_version=draft_version+1,shared_source_revision_id=$2,reviewed_version=NULL,
                  reviewed_source_revision_id=NULL,reviewed_selections='[]'::jsonb,updated_at=now()
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
  requirePublisher,
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const access = await pool.query(
      "SELECT array_agg(market) markets FROM cms_market_editions WHERE document_id=$1",
      [id],
    );
    const deleteMarkets = (access.rows[0]?.markets ?? []).map(String);
    const deleteAuth = res.locals.auth as AuthContext;
    if (deleteAuth.user.role !== "administrator" && (
      !deleteMarkets.length || !deleteMarkets.every((market: string) => canAccessMarket(deleteAuth, market))
    )) {
      res.status(403).json({ error: "Deleting a document requires assignment to every edition market." });
      return;
    }
    const result = await pool.query(DELETE_DOCUMENT_SQL, [id]);
    if (!result.rowCount) {
      res.status(409).json({
        error: "Documents with publication history cannot be permanently deleted; use archive and restore instead.",
      });
      return;
    }
    await audit(res.locals.auth as AuthContext, "document.deleted", "document", id);
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

router.post(
  "/documents/:documentId/submit",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const parsed = SubmitDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review submission." });
      return;
    }
    const id = String(req.params.documentId);
    const candidate = await pool.query(
      `SELECT r.id,r.payload,r.workflow_state,d.kind,d.canonical_slug,e.market,e.locale FROM cms_revisions r
       JOIN cms_market_editions e ON e.id=r.edition_id
       JOIN cms_documents d ON d.id=e.document_id
       WHERE e.document_id=$1 AND r.id=$2
         AND r.revision_number=(SELECT max(x.revision_number) FROM cms_revisions x
                                WHERE x.edition_id=r.edition_id)`,
      [id, parsed.data.revisionId],
    );
    if (!candidate.rowCount) {
      res.status(409).json({ error: "Document has no draft revision." });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    if (!await canAccessEditionTarget(
      pool,
      auth,
      id,
      String(candidate.rows[0].market),
      String(candidate.rows[0].locale),
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    if (candidate.rows[0].workflow_state !== "draft" && candidate.rows[0].workflow_state !== "rejected") {
      res.status(409).json({ error: "Only the latest draft or rejected revision can be submitted." });
      return;
    }
    if (!isCmsConfigurationIdentityValid(
      candidate.rows[0].kind,
      candidate.rows[0].canonical_slug,
      candidate.rows[0].payload,
    )) {
      res.status(409).json({ error: "Site configuration does not match its canonical singleton identity." });
      return;
    }
    const validation = validateSnapshot(candidate.rows[0].kind, candidate.rows[0].payload, "publish");
    if (!validation.success) {
      res.status(422).json({ error: "Review readiness validation failed.", details: validation.errors });
      return;
    }
    // An asset may have been selected while awaiting its own approval. Resolve
    // the declared exact version now; legacy ids are pinned once for migration.
    await syncMediaReferences(
      pool,
      id,
      String(candidate.rows[0].id),
      validation.data as Record<string, any>,
    );
    const mediaErrors = await revisionMediaGovernanceErrors(
      pool,
      id,
      String(candidate.rows[0].id),
      candidate.rows[0].kind as CmsDocumentKind,
      candidate.rows[0].payload,
    );
    if (mediaErrors.length) {
      res.status(422).json({ error: "Review references unavailable or unapproved media.", details: mediaErrors });
      return;
    }
    await pool.query(
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
        FROM submitted WHERE e.id=submitted.edition_id`,
      [parsed.data.revisionId],
    );
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
  }),
);

router.post(
  "/documents/:documentId/review-comments",
  requireCsrf,
  requireEditor,
  asyncRoute(async (req, res) => {
    const parsed = AddDocumentReviewCommentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review comment.", details: parsed.error.issues });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const revisionAccess = await pool.query(
      `SELECT e.market,e.locale FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$2 AND e.document_id=$1`,
      [req.params.documentId, parsed.data.revisionId],
    );
    if (!revisionAccess.rowCount || !await canAccessEditionTarget(
      pool,
      auth,
      String(req.params.documentId),
      String(revisionAccess.rows[0].market),
      String(revisionAccess.rows[0].locale),
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const result = await pool.query(
      `INSERT INTO cms_review_comments(revision_id,author_user_id,body)
       SELECT r.id,$3,$4 FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$2 AND e.document_id=$1
       RETURNING id,revision_id,body,author_user_id,created_at`,
      [req.params.documentId, parsed.data.revisionId, auth.user.id, parsed.data.body],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Revision not found." });
      return;
    }
    const row = result.rows[0];
    await audit(auth, "document.review_commented", "document", String(req.params.documentId), {
      revisionId: parsed.data.revisionId,
      commentId: String(row.id),
    });
    res.status(201).json({
      id: String(row.id),
      revisionId: String(row.revision_id),
      body: row.body,
      authorId: String(row.author_user_id),
      createdAt: row.created_at,
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
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = RejectDocumentRevisionBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid rejection.", details: parsed.error.issues });
      return;
    }
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const rejected = await client.query(
        `UPDATE cms_revisions r SET workflow_state='rejected'
          FROM cms_market_editions e
         WHERE r.id=$2 AND r.edition_id=e.id AND e.document_id=$1
           AND r.workflow_state='in-review'
          RETURNING r.id,e.id edition_id,e.market,e.locale`,
        [req.params.documentId, parsed.data.revisionId],
      );
      if (!rejected.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only an in-review revision can be rejected." });
        return;
      }
      if (!await canAccessEditionTarget(
        client,
        auth,
        String(req.params.documentId),
        String(rejected.rows[0].market),
        String(rejected.rows[0].locale),
      )) {
        await client.query("ROLLBACK");
        res.status(403).json({ error: "You are not assigned to this market." });
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
        [rejected.rows[0].edition_id],
      );
      await client.query("COMMIT");
      await audit(auth, "document.rejected", "document", String(req.params.documentId), {
        revisionId: parsed.data.revisionId,
        market: rejected.rows[0].market,
        locale: rejected.rows[0].locale,
      });
      res.json(await getDocument(
        String(req.params.documentId),
        auth,
        rejected.rows[0].market,
        rejected.rows[0].locale,
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
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = PublishDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid publication request.", details: parsed.error.issues });
      return;
    }
    const id = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const client = await pool.connect();
    try {
    await client.query("BEGIN");
    const revision = await client.query(
      `SELECT r.id,r.edition_id,r.payload,d.kind,d.canonical_slug,r.workflow_state,
              e.market,e.locale,COALESCE(e.editorial_market,e.market) editorial_market,
              e.publication_state,e.content_mode
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
      auth,
      id,
      String(revision.rows[0].market),
      String(revision.rows[0].locale),
    )) {
      await client.query("ROLLBACK");
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    if (
      revision.rows[0].workflow_state !== "in-review" ||
      !["in-review", "published"].includes(String(revision.rows[0].publication_state))
    ) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "Only the latest exact-edition revision currently in review can be published." });
      return;
    }
    const validation = validateSnapshot(revision.rows[0].kind, revision.rows[0].payload, "publish");
    if (!validation.success) {
      await client.query("ROLLBACK");
      res.status(422).json({ error: "Publication governance validation failed.", details: validation.errors });
      return;
    }
    if (revision.rows[0].kind === "industry" && revision.rows[0].content_mode !== "shared") {
      const errors = industryDeliveryErrors(
        validation.data,
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
    const mediaIds = validation.data.mediaIds;
    const references = expectedMedia(
      revision.rows[0].kind as CmsDocumentKind,
      validation.data as Record<string, any>,
    );
    const expectedVersions = new Map<string, string>(references
      .filter((reference): reference is typeof reference & { mediaVersionId: string } =>
        Boolean(reference.mediaVersionId))
      .map((reference) => [reference.mediaId, reference.mediaVersionId]));
    const hero = revision.rows[0].kind === "site-configuration"
      ? (validation.data.content as Record<string, any>).hero as Record<string, any>
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
    if (revision.rows[0].content_mode === "shared") {
      const availabilityState = await client.query(
        `SELECT reviewed_version,published_version,reviewed_selections,reviewed_source_revision_id
           FROM cms_document_availability_states
          WHERE document_id=$1 FOR UPDATE`,
        [id],
      );
      if (!availabilityState.rowCount
        || availabilityState.rows[0].reviewed_source_revision_id !== parsed.data.revisionId) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "This shared revision must be reviewed with its exact destination selection before publication.",
        });
        return;
      }
      reviewedAvailabilityVersion = Number(availabilityState.rows[0].reviewed_version);
      reviewedAvailability = availabilitySelections(availabilityState.rows[0].reviewed_selections);
      if (!reviewedAvailability.length) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "The reviewed destination selection is empty." });
        return;
      }
      // Hold configuration stable through the revision and availability
      // release. SHARE blocks concurrent market inserts and enablement changes,
      // which row locks on the current enabled set cannot serialize.
      await client.query("LOCK TABLE market_editions IN SHARE MODE");
      const availabilityMarkets = await client.query(
        `SELECT m.id,m.code,configured_locale.locale,
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
          WHERE m.enabled=true
           FOR UPDATE OF m`,
        [id],
      );
      if (!availabilitySelectionKeysMatchDestinations(reviewedAvailability, availabilityMarkets.rows)) {
        await client.query("ROLLBACK");
        res.status(409).json({
          error: "Destination configuration changed since review. Reopen and review the complete destination matrix.",
        });
        return;
      }
      if (availabilityMarkets.rows.some((market) => !canAccessMarket(auth, String(market.code)))) {
        await client.query("ROLLBACK");
        res.status(403).json({
          error: "Publishing shared content requires authority for every reviewed destination market.",
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
          validation.data,
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
      if (revision.rows[0].kind === "person" && auth.user.role !== "administrator") {
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
    const approved = await client.query(
      `UPDATE cms_revisions SET workflow_state='approved',approved_by_user_id=$2,
       approved_at=now() WHERE id=$1 AND workflow_state='in-review'`,
      [parsed.data.revisionId, auth.user.id],
    );
    // Rejection and publication race on this exact revision.  The conditional
    // transition is the serialization point: never advance the edition's
    // public pointer unless this transaction actually won the transition.
    if (approved.rowCount !== 1) {
      await client.query("ROLLBACK");
      res.status(409).json({ error: "The selected revision is no longer in review." });
      return;
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
          [id, selection.marketEditionId, selection.locale, selection.decision, auth.user.id],
        );
      }
      await client.query(
        `UPDATE cms_document_availability_states
            SET published_version=$2,published_source_revision_id=$4,
                published_by_user_id=$3,published_at=now(),updated_at=now()
          WHERE document_id=$1 AND reviewed_version=$2
            AND reviewed_source_revision_id=$4`,
        [id, reviewedAvailabilityVersion, auth.user.id, parsed.data.revisionId],
      );
    }
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,metadata)
       VALUES ($1,$2,'document.published','document',$3,$4)`,
       [auth.user.id, auth.user.email, id, {
         scheduled: false,
         editionId: String(revision.rows[0].edition_id),
         revisionId: parsed.data.revisionId,
       }],
    );
    await client.query("COMMIT");
    res.json(await getDocument(
      id,
      auth,
      revision.rows[0].market,
      revision.rows[0].locale,
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
    const old = await pool.query(
      `SELECT r.payload,r.edition_id,d.kind,d.canonical_slug,e.market,e.locale FROM cms_revisions r
       JOIN cms_market_editions e ON e.id=r.edition_id
       JOIN cms_documents d ON d.id=e.document_id
       WHERE r.id=$1 AND e.document_id=$2`,
      [parsed.data.revisionId, id],
    );
    if (!old.rowCount) {
      res.status(409).json({ error: "The selected revision does not exist." });
      return;
    }
    if (!isCmsConfigurationIdentityValid(
      old.rows[0].kind,
      old.rows[0].canonical_slug,
      old.rows[0].payload,
    )) {
      res.status(409).json({ error: "Site configuration does not match its canonical singleton identity." });
      return;
    }
    const revision = await pool.query(
      `INSERT INTO cms_revisions
       (edition_id,revision_number,payload,content_digest,workflow_state,
        created_by_user_id,reason)
       SELECT $1,max(revision_number)+1,$2,$3,'draft',$4,$5
        FROM cms_revisions WHERE edition_id=$1 RETURNING id`,
      [old.rows[0].edition_id, old.rows[0].payload, digest(old.rows[0].payload), auth.user.id, parsed.data.note],
    );
    await pool.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       SELECT ref.asset_id,COALESCE(ref.media_version_id,latest.id),ref.document_id,$3
         FROM cms_media_references ref
         LEFT JOIN LATERAL (
           SELECT id FROM cms_media_versions
            WHERE asset_id=ref.asset_id ORDER BY version_number DESC LIMIT 1
         ) latest ON ref.media_version_id IS NULL
        WHERE ref.document_id=$1 AND ref.field_path=$2
       ON CONFLICT DO NOTHING`,
      [
        id,
        `revision:${parsed.data.revisionId}`,
        `revision:${String(revision.rows[0].id)}`,
      ],
    );
    await syncMediaReferences(
      pool,
      id,
      String(revision.rows[0].id),
      old.rows[0].payload,
    );
    await audit(auth, "document.rolled_back", "document", id);
    res.json(await getDocument(id, auth, old.rows[0].market, old.rows[0].locale));
  }),
);

router.post(
  "/documents/:documentId/archive",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = ArchiveDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid archive request." });
      return;
    }
    const id = String(req.params.documentId);
    if (!await canAccessEditionTarget(
      pool,
      res.locals.auth as AuthContext,
      id,
      parsed.data.market,
      parsed.data.locale,
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const result = await pool.query(
      `UPDATE cms_market_editions SET publication_state='archived',updated_at=now()
        WHERE document_id=$1 AND market=$2 AND locale=$3
        RETURNING id`,
      [id, parsed.data.market, parsed.data.locale],
    );
    if (!result.rowCount) {
      res.status(404).json({ error: "Exact document edition not found." });
      return;
    }
    await audit(res.locals.auth as AuthContext, "document.archived", "document", id, parsed.data);
    res.json(await getDocument(
      id,
      res.locals.auth as AuthContext,
      parsed.data.market,
      parsed.data.locale,
    ));
  }),
);

router.post(
  "/documents/:documentId/restore",
  requireCsrf,
  requirePublisher,
  asyncRoute(async (req, res) => {
    const parsed = ArchiveDocumentBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid restore request." });
      return;
    }
    const id = String(req.params.documentId);
    if (!await canAccessEditionTarget(
      pool,
      res.locals.auth as AuthContext,
      id,
      parsed.data.market,
      parsed.data.locale,
    )) {
      res.status(403).json({ error: "You are not assigned to this market." });
      return;
    }
    const client = await pool.connect();
    let successorRevisionId: string | null = null;
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
      const legacyRootArchive = root.rows[0].status === "archived";
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
      const selected = await client.query(
        `SELECT e.id,e.published_revision_id,d.kind,
                latest.id revision_id,latest.revision_number,latest.workflow_state,latest.payload
           FROM cms_market_editions e
           JOIN cms_documents d ON d.id=e.document_id
           LEFT JOIN LATERAL (
             SELECT r.id,r.revision_number,r.workflow_state,r.payload
               FROM cms_revisions r WHERE r.edition_id=e.id
              ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC LIMIT 1
           ) latest ON true
          WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
            AND e.publication_state='archived'
          FOR UPDATE OF e`,
        [id, parsed.data.market, parsed.data.locale],
      );
      if (!selected.rowCount) {
        await client.query("ROLLBACK");
        res.status(409).json({ error: "Only an archived exact edition can be restored." });
        return;
      }
      const edition = selected.rows[0];
      if (!["draft", "rejected"].includes(String(edition.workflow_state))) {
        const sourceRevisionId = edition.published_revision_id ?? edition.revision_id;
        if (!sourceRevisionId) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The archived edition has no revision to restore." });
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
           RETURNING id,payload`,
          [
            edition.id,
            sourceRevisionId,
            (res.locals.auth as AuthContext).user.id,
          ],
        );
        if (!successor.rowCount) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The archived edition's published history is unavailable." });
          return;
        }
        successorRevisionId = String(successor.rows[0].id);
        await syncMediaReferences(
          client,
          id,
          successorRevisionId,
          successor.rows[0].payload,
          String(sourceRevisionId),
        );
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
    await audit(res.locals.auth as AuthContext, "document.restored", "document", id, {
      ...parsed.data,
      successorRevisionId,
    });
    res.json(await getDocument(
      id,
      res.locals.auth as AuthContext,
      parsed.data.market,
      parsed.data.locale,
    ));
  }),
);

router.get(
  "/documents/:documentId/preview",
  requireEditor,
  asyncRoute(async (req, res) => {
    const id = String(req.params.documentId);
    const market = typeof req.query.market === "string" ? req.query.market : "";
    const locale = typeof req.query.locale === "string" ? req.query.locale : "";
    if (!market || !locale) {
      res.status(400).json({ error: "Both market and locale are required for an exact preview." });
      return;
    }
    if (!await canAccessEditionTarget(
      pool, res.locals.auth as AuthContext, id, market, locale,
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
              p.navigation_policy_digest,p.navigation_snapshot
         FROM cms_preview_sessions p
         JOIN cms_market_editions e ON e.id=p.edition_id
         JOIN cms_documents d ON d.id=e.document_id
         JOIN cms_revisions r ON r.id=p.revision_id AND r.edition_id=e.id
        WHERE p.token_digest=$1 AND p.expires_at>now() AND p.revoked_at IS NULL`,
      [hashToken(String(req.params.token))],
    );
    if (!preview.rowCount) {
      res.status(404).json({ error: "Preview not found or expired." });
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
    const pending = await pool.query(
      `SELECT 1 FROM cms_media_references ref
        JOIN cms_media_assets a ON a.id=ref.asset_id
       WHERE ref.document_id=$1 AND ref.field_path='revision:'||$2::text
         AND a.status='pending-review' LIMIT 1`,
      [String(row.document_id), String(row.revision_id)],
    );
    if (pending.rowCount && !canAccessPendingPreviewMedia((res.locals.auth as AuthContext).user.role)) {
      res.status(403).json({ error: "Pending-review preview media requires editor, publisher, or administrator access." });
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
    const mediaIds = validation.success ? validation.data.mediaIds : previewMediaIds(projectedDocument);
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
        altText: asset.alt_text ?? null,
        caption: asset.metadata?.caption ?? null,
        credit: asset.credit ?? null,
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
      `SELECT d.id document_id,v.storage_key,r.payload,e.market,e.locale,
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
    if (!asset.rowCount || !previewMediaIds(asset.rows[0].payload).includes(String(req.params.mediaId))) {
      res.status(404).json({ error: "Preview media not found or expired." });
      return;
    }
    if (asset.rows[0].status === "pending-review"
      && !canAccessPendingPreviewMedia((res.locals.auth as AuthContext).user.role)) {
      res.status(403).json({ error: "Pending-review preview media requires editor, publisher, or administrator access." });
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