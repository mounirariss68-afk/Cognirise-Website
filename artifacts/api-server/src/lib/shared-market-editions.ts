import { createHash } from "node:crypto";
import { isDeepStrictEqual } from "node:util";
import type { IRouter } from "express";
import { pool } from "@workspace/db";
import {
  BindSharedMarketEditionBody,
  CopyDocumentMarketEditionBody,
  CompareSharedMarketBaselineParams,
  EstablishSharedMarketBaselineBody,
  GetDocumentMarketCopyCandidatesParams,
  ReportSharedMarketMigrationBody,
  ResolveSharedMarketBaselineUpdateBody,
  SaveSharedMarketOverridesBody,
  applySharedOverrideOperations,
  collectCmsMediaReferences,
  mergeSharedBaselineUpdate,
  resolveSharedBaselineUpdate,
  type SharedOverrideOperation,
  type CmsCapability,
  type CmsDocumentKind,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { audit, type Queryable } from "./cms";
import type { AuthContext } from "./auth";
import { asyncRoute } from "./http";
import {
  lockDocumentForMutation,
  revalidateMutationAuth,
} from "./managed-market-lifecycle";
import { destinationRevisionMatchesExpected, localeLanguageIdentity } from "./shared-market-reuse-guard";
import { canAccessContent } from "./policy";

type BindingRow = Record<string, any>;
const digest = (snapshot: unknown) => createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

class InvalidImmutableMediaPinsError extends Error {}

type ReadinessIssue = {
  category: "missing" | "validation" | "workflow";
  message: string;
  action: "create" | "edit" | "review";
  path?: string;
  code?: string;
};

export function savedRevisionReadiness(kind: string, snapshot: unknown, workflowState: unknown) {
  const validation = validateCmsSnapshot(kind as any, snapshot, "publish");
  const issues: ReadinessIssue[] = validation.success
    ? []
    : (("issues" in validation ? validation.issues : undefined) ?? validation.errors.map((message) => ({
      code: "CMS_LEGACY_VALIDATION",
      path: "content",
      message,
      scope: "publish" as const,
    }))).map((issue) => ({
      category: "validation" as const,
      message: issue.message,
      action: "edit" as const,
      path: issue.path,
      code: issue.code,
    }));
  if (workflowState !== "approved") {
    issues.push({
      category: "workflow",
      action: "review",
      message: workflowState === "rejected"
        ? "This saved revision was rejected and must be edited and submitted for review again."
        : workflowState === "in-review"
          ? "This saved revision is awaiting review and approval."
          : "This saved revision must be submitted and approved before publication.",
    });
  }
  return {
    ready: issues.length === 0,
    readinessErrors: issues.map((issue) => issue.message),
    readinessIssues: issues,
  };
}

function copyResponse(
  documentId: string,
  destination: Record<string, any>,
  source: Record<string, any>,
  replayed: boolean,
) {
  return {
    documentId,
    editionId: String(destination.edition_id),
    revisionId: String(destination.revision_id),
    revisionNumber: Number(destination.revision_number),
    market: String(destination.market),
    locale: String(destination.locale),
    sourceRevisionId: String(source.id),
    sourceMarket: String(source.market),
    sourceLocale: String(source.locale),
    sourceWorkflowState: String(source.workflow_state),
    sourcePublicationState: String(source.source_revision_status),
    replayed,
  };
}

/**
 * A resolved market revision is immutable history. Its source authority must
 * therefore come from the baseline revision captured with that exact revision,
 * not the mutable binding pointer used for ordinary editor access.
 */
async function canAccessCopiedRevisionLineage(
  client: Queryable,
  auth: AuthContext,
  documentId: string,
  revisionId: string,
  capability: CmsCapability,
  canAccessEditionTarget: (
    client: Queryable, auth: AuthContext, documentId: string, market: string, locale: string,
    capability: CmsCapability,
  ) => Promise<boolean>,
  proposedDestination?: { market: string; locale: string },
) {
  const resolved = await client.query(
    `SELECT resolved.baseline_revision_id,
            binding.mode,
             COALESCE(baseline.governing_source_revision_id,baseline.source_revision_id) baseline_source_revision_id,
             source_edition.market source_market,source_edition.locale source_locale
       FROM cms_resolved_market_revisions resolved
       JOIN cms_market_edition_bindings binding ON binding.id=resolved.binding_id
       LEFT JOIN cms_shared_baseline_revisions baseline
         ON baseline.id=resolved.baseline_revision_id
        LEFT JOIN cms_revisions source_revision
          ON source_revision.id=COALESCE(baseline.governing_source_revision_id,baseline.source_revision_id)
       LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
      WHERE resolved.cms_revision_id=$1
      FOR KEY SHARE OF resolved,binding`,
    [revisionId],
  );
  if (!resolved.rows[0]) return true;
  const lineage = resolved.rows[0];
  // A null source revision identifies a deliberately neutral baseline. Its
  // destination authority is checked by the exact binding target; there is no
  // legacy source market to inherit.
  if (!lineage.baseline_revision_id) return lineage.mode === "independent";
  if (lineage.source_market == null) return true;
  return typeof lineage.source_market === "string"
    && typeof lineage.source_locale === "string"
    && await canAccessEditionTarget(
      client, auth, documentId, String(lineage.source_market), String(lineage.source_locale), capability,
    );
}

function mediaPinsForSnapshot(
  snapshot: Record<string, unknown>,
  kind: string,
  inherited: Array<Record<string, unknown>>,
) {
  const references = collectCmsMediaReferences(
    kind as any,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.filter((id): id is string => typeof id === "string") : [],
    snapshot.seo,
  );
  const explicitVersions = new Map<string, string>();
  const inheritedVersions = new Map<string, string>();
  const addVersion = (versions: Map<string, string>, assetId: string, mediaVersionId: string) => {
    const existing = versions.get(assetId);
    if (existing && existing !== mediaVersionId) {
      throw new InvalidImmutableMediaPinsError(
        `Snapshot references asset ${assetId} with conflicting immutable media versions (${existing} and ${mediaVersionId}).`,
      );
    }
    versions.set(assetId, mediaVersionId);
  };
  for (const reference of references) {
    if (reference.mediaVersionId) addVersion(explicitVersions, reference.mediaId, reference.mediaVersionId);
  }
  for (const pin of inherited) {
    if (typeof pin.assetId === "string" && typeof pin.mediaVersionId === "string") {
      addVersion(inheritedVersions, pin.assetId, pin.mediaVersionId);
    }
  }
  const pins = new Map<string, { assetId: string; mediaVersionId: string }>();
  for (const reference of references) {
    const mediaVersionId = explicitVersions.get(reference.mediaId) ?? inheritedVersions.get(reference.mediaId);
    if (!mediaVersionId) {
      throw new InvalidImmutableMediaPinsError(
        `Snapshot media asset ${reference.mediaId} has no immutable media version pin.`,
      );
    }
    pins.set(reference.mediaId, { assetId: reference.mediaId, mediaVersionId });
  }
  return [...pins.values()];
}

/**
 * Resolve legacy media IDs to the latest immutable version when a neutral
 * source is created directly. Existing baseline successors inherit pins from
 * their exact source revision; this helper is only for the opt-in create
 * path, where no CMS revision exists yet to carry those pins.
 */
export async function mediaPinsForNewSharedSnapshot(
  client: Queryable,
  snapshot: Record<string, unknown>,
  kind: string,
) {
  const references = collectCmsMediaReferences(
    kind as any,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.filter((id): id is string => typeof id === "string") : [],
    snapshot.seo,
  );
  const assetIds = [...new Set(references.map((reference) => reference.mediaId))];
  const inherited = assetIds.length
    ? await client.query(
      `SELECT DISTINCT ON (version.asset_id)
              version.asset_id::text "assetId",version.id::text "mediaVersionId"
         FROM cms_media_versions version
        WHERE version.asset_id::text=ANY($1::text[])
        ORDER BY version.asset_id,version.version_number DESC,version.id DESC`,
      [assetIds],
    )
    : { rows: [] as Array<Record<string, unknown>> };
  return mediaPinsForSnapshot(snapshot, kind, inherited.rows);
}

async function sourceMarketAllowed(
  client: Queryable,
  auth: AuthContext,
  documentId: string,
  row: Record<string, any>,
  capability: CmsCapability,
  canAccessEditionTarget: (
    client: Queryable, auth: AuthContext, documentId: string, market: string, locale: string,
    capability: CmsCapability,
  ) => Promise<boolean>,
  proposedDestination?: { market: string; locale: string },
) {
  if (typeof row.source_market === "string" && row.source_market.length > 0
    && typeof row.source_locale === "string") {
    return await canAccessEditionTarget(client, auth, documentId, row.source_market, row.source_locale, capability);
  }
  const baselineRevisionId = row.based_on_baseline_revision_id ?? row.baseline_revision_id ?? row.revision_id ?? row.id;
  if (typeof baselineRevisionId !== "string") return false;
  // A null source is never implicitly neutral. Only an audit proof pinned to
  // this immutable baseline revision grants the countryless authority path.
  const neutral = await client.query(
    `SELECT d.kind,b.id baseline_id,b.locale
       FROM cms_shared_baseline_revisions revision
       JOIN cms_shared_baselines b ON b.id=revision.baseline_id
       JOIN cms_documents d ON d.id=b.document_id
      WHERE revision.id=$1 AND b.document_id=$2
        AND EXISTS (
          SELECT 1 FROM cms_audit_events proof
           WHERE proof.action='shared-neutral-baseline-created'
             AND proof.target_type='shared-baseline'
             AND proof.target_id=b.id::text
             AND proof.metadata->>'documentId'=b.document_id::text
             AND proof.metadata->>'baselineRevisionId'=revision.id::text
             AND proof.metadata->>'locale'=b.locale
             AND proof.metadata->>'authorityProof'='explicit-shared-and-regional-all-destinations'
        )`,
    [baselineRevisionId, documentId],
  );
  if (!neutral.rows[0]) return false;
  let targets = await client.query(
    `SELECT market.code market,binding.locale
       FROM cms_market_edition_bindings binding
       JOIN market_editions market ON market.id=binding.market_edition_id
      WHERE binding.document_id=$1 AND binding.baseline_id=$2
        AND binding.mode IN ('shared','adapted')`,
    [documentId, neutral.rows[0].baseline_id],
  );
  if (!targets.rows.length) {
    targets = await client.query(
      `SELECT market.code market,supported.locale
         FROM market_editions market
         CROSS JOIN LATERAL (
           SELECT DISTINCT configured_locale locale
             FROM unnest(ARRAY[market.default_locale,market.fallback_locale]) configured_locale
            WHERE configured_locale IS NOT NULL
              AND lower(split_part(configured_locale,'-',1))
                  = lower(split_part($1,'-',1))
         ) supported
        WHERE market.enabled=true`,
      [neutral.rows[0].locale],
    );
  }
  const targetRows = [...targets.rows];
  if (proposedDestination && !targetRows.some((target) =>
    String(target.market) === proposedDestination.market && String(target.locale) === proposedDestination.locale,
  )) {
    targetRows.push(proposedDestination);
  }
  if (!targetRows.length) return false;
  const markets = targetRows.map((target) => String(target.market));
  return (await Promise.all(targetRows.map(async (target) =>
    await canAccessEditionTarget(client, auth, documentId, String(target.market), String(target.locale), capability)
    && await canAccessContent(auth.user, {
      topic: neutral.rows[0].kind as CmsDocumentKind, capability,
      marketCode: String(target.market), scope: "shared",
      sourceMarketCode: String(target.market), destinationMarketCodes: markets,
    })
  ))).every(Boolean);
}

async function assertExactImmutableMediaPins(
  client: Queryable,
  references: Array<Record<string, unknown>>,
) {
  const versionsByAsset = new Map<string, string>();
  for (const reference of references) {
    if (typeof reference.assetId !== "string" || typeof reference.mediaVersionId !== "string") continue;
    const existingVersion = versionsByAsset.get(reference.assetId);
    if (existingVersion && existingVersion !== reference.mediaVersionId) {
      throw new InvalidImmutableMediaPinsError(
        `Snapshot references asset ${reference.assetId} with conflicting immutable media versions (${existingVersion} and ${reference.mediaVersionId}).`,
      );
    }
    versionsByAsset.set(reference.assetId, reference.mediaVersionId);
  }
  if (!versionsByAsset.size) return;
  const pins = await client.query(
    `SELECT id::text,asset_id::text FROM cms_media_versions
      WHERE id=ANY($1::uuid[])`,
    [[...versionsByAsset.values()]],
  );
  const assetByVersion = new Map(pins.rows.map((pin) => [String(pin.id), String(pin.asset_id)]));
  for (const [assetId, mediaVersionId] of versionsByAsset) {
    if (assetByVersion.get(mediaVersionId) !== assetId) {
      throw new InvalidImmutableMediaPinsError(
        `Snapshot media asset ${assetId} is not pinned to its declared immutable media version ${mediaVersionId}.`,
      );
    }
  }
}

function mapBinding(row: BindingRow) {
  return {
    id: String(row.id),
    documentId: String(row.document_id),
    marketEditionId: String(row.market_edition_id),
    locale: row.locale,
    mode: row.mode,
    baselineId: row.baseline_id ? String(row.baseline_id) : null,
    baselineRevisionId: row.based_on_baseline_revision_id
      ? String(row.based_on_baseline_revision_id) : null,
    heldBaselineRevisionId: row.held_baseline_revision_id
      ? String(row.held_baseline_revision_id) : null,
    translationSourceRevisionId: row.translation_source_revision_id
      ? String(row.translation_source_revision_id) : null,
    version: Number(row.version),
    operations: row.override_operations ?? [],
    materializedRevisionId: row.materialized_revision_id ? String(row.materialized_revision_id) : null,
    translationState: row.translation_state,
    updatedAt: row.updated_at,
  };
}

async function copyMediaPins(
  client: Queryable,
  documentId: string,
  revisionId: string,
  references: Array<Record<string, unknown>>,
) {
  await assertExactImmutableMediaPins(client, references);
  for (const reference of references) {
    if (typeof reference.assetId !== "string" || typeof reference.mediaVersionId !== "string") continue;
    await client.query(
      `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4) ON CONFLICT (document_id,field_path,asset_id) DO NOTHING`,
      [reference.assetId, reference.mediaVersionId, documentId, `revision:${revisionId}`],
    );
  }
}

/** Lock the ordinary exact edition before its managed binding. Existing
 * shared/adapted bindings always have a materialized exact edition; an absent
 * row is treated as corrupted lineage rather than creating state for a failed
 * mutation. */
async function lockManagedExactEdition(
  client: Queryable,
  documentId: string,
  market: string,
  locale: string,
) {
  const edition = await client.query(
    `SELECT id FROM cms_market_editions
      WHERE document_id=$1 AND market=$2 AND locale=$3
      FOR UPDATE`,
    [documentId, market, locale],
  );
  return edition.rows[0] ?? null;
}

export async function materializeSharedMarketRevision(
  client: Queryable,
  input: {
    documentId: string;
    market: string;
    locale: string;
    snapshot: Record<string, unknown>;
    baselineRevisionId: string | null;
    bindingId: string;
    userId: string;
    mediaReferences: Array<Record<string, unknown>>;
  },
) {
  const edition = await client.query(
    `INSERT INTO cms_market_editions(document_id,market,locale,publication_state,content_mode)
     VALUES ($1,$2,$3,'draft','custom')
     ON CONFLICT (document_id,market,locale) DO UPDATE SET updated_at=now()
     RETURNING id`,
    [input.documentId, input.market, input.locale],
  );
  const revision = await client.query(
    `INSERT INTO cms_revisions(edition_id,revision_number,payload,content_digest,workflow_state,
                               created_by_user_id,source_revision_id,reason)
     SELECT $1,COALESCE(max(revision_number),0)+1,$2,$3,'draft',$4,NULL,
            'Materialized shared-market binding'
       FROM cms_revisions WHERE edition_id=$1
     RETURNING id`,
    [edition.rows[0]!.id, input.snapshot, digest(input.snapshot), input.userId],
  );
  const revisionId = String(revision.rows[0]!.id);
  await copyMediaPins(client, input.documentId, revisionId, input.mediaReferences);
  await client.query(
    `INSERT INTO cms_resolved_market_revisions(binding_id,cms_revision_id,baseline_revision_id,
                                                snapshot,media_references,content_digest)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [input.bindingId, revisionId, input.baselineRevisionId, input.snapshot, JSON.stringify(input.mediaReferences), digest(input.snapshot)],
  );
  return revisionId;
}

/**
 * The ordinary document lifecycle calls this after saving an exact independent
 * market revision.  Shared/Adapted snapshots are only created by the routes
 * below so normal draft saves can never silently sever their baseline lineage.
 */
export async function recordIndependentBindingRevision(
  client: Queryable,
  input: {
    documentId: string;
    marketEditionId: string;
    locale: string;
    revisionId: string;
    snapshot: Record<string, unknown>;
    mediaReferences: Array<Record<string, unknown>>;
  },
) {
  const binding = await client.query(
    `SELECT id FROM cms_market_edition_bindings
      WHERE document_id=$1 AND market_edition_id=$2 AND locale=$3 AND mode='independent'
      FOR UPDATE`,
    [input.documentId, input.marketEditionId, input.locale],
  );
  if (!binding.rows[0]) return false;
  const existing = await client.query(
    `SELECT binding_id::text FROM cms_resolved_market_revisions
      WHERE cms_revision_id=$1 FOR KEY SHARE`,
    [input.revisionId],
  );
  if (existing.rows[0] && String(existing.rows[0].binding_id) !== String(binding.rows[0].id)) {
    throw new Error("This revision is already sealed to another market binding.");
  }
  await client.query(
    `INSERT INTO cms_resolved_market_revisions(binding_id,cms_revision_id,baseline_revision_id,
                                                snapshot,media_references,content_digest)
     VALUES ($1,$2,NULL,$3,$4,$5)
     ON CONFLICT (cms_revision_id) DO NOTHING`,
    [binding.rows[0].id, input.revisionId, input.snapshot, JSON.stringify(input.mediaReferences), digest(input.snapshot)],
  );
  await client.query(
    `UPDATE cms_market_edition_bindings
        SET materialized_revision_id=$2,updated_at=now()
      WHERE id=$1`,
    [binding.rows[0].id, input.revisionId],
  );
  return true;
}

/**
 * Register only additive shared-market routes. Person availability and legacy
 * shared-source pointers remain governed separately: person materialization
 * creates a draft exact edition but never publishes or changes availability.
 */
export function registerSharedMarketEditionRoutes(
  router: IRouter,
  options: {
    canAccessMarket: (auth: AuthContext, market: string) => boolean;
    canAccessEditionTarget: (
      client: Queryable,
      auth: AuthContext,
      documentId: string,
      market: string,
      locale: string,
      capability: CmsCapability,
    ) => Promise<boolean>;
    revisionMediaGovernanceErrors: (
      client: Queryable,
      documentId: string,
      revisionId: string,
      kind: CmsDocumentKind,
      snapshot: Record<string, any>,
    ) => Promise<string[]>;
    requireEditor: any;
    requireAdministrator: any;
    requireCsrf: any;
  },
) {
  router.get(
    "/documents/:documentId/market-copy-candidates/:targetMarket/:targetLocale",
    asyncRoute(async (req, res) => {
      const parsed = GetDocumentMarketCopyCandidatesParams.safeParse(req.params);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid market copy target.", details: parsed.error.issues });
        return;
      }
      const { documentId, targetMarket, targetLocale } = parsed.data;
      const auth = res.locals.auth as AuthContext;
      const target = await pool.query(
        `SELECT id,code,default_locale,fallback_locale FROM market_editions WHERE code=$1 AND enabled=true`,
        [targetMarket],
      );
      if (!target.rows[0]) {
        res.status(404).json({ error: "The destination market edition is unavailable." });
        return;
      }
      if (!await options.canAccessEditionTarget(pool, auth, documentId, targetMarket, targetLocale, "view")) {
        res.status(403).json({ error: "You are not authorized to view the destination market." });
        return;
      }
      if (![target.rows[0].default_locale, target.rows[0].fallback_locale].includes(targetLocale)) {
        res.status(409).json({ error: "The destination locale is not configured for this market edition." });
        return;
      }
      const existing = await pool.query(
        `SELECT id FROM cms_market_editions
          WHERE document_id=$1 AND market=$2 AND locale=$3`,
        [documentId, targetMarket, targetLocale],
      );
      if (existing.rows[0]) {
        res.status(409).json({ error: "That exact market and locale edition already exists." });
        return;
      }
      const candidates = await pool.query(
        `SELECT d.kind,e.id edition_id,e.market,e.locale,e.published_revision_id,
                selected.id revision_id,selected.revision_number,selected.workflow_state,selected.payload,
                CASE WHEN selected.id=e.published_revision_id THEN 'published' ELSE 'saved' END source_revision_status
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id
           JOIN LATERAL (
             SELECT r.id,r.revision_number,r.workflow_state,r.payload
               FROM cms_revisions r
              WHERE r.edition_id=e.id
                AND (r.id=e.published_revision_id OR r.id=(
                  SELECT latest.id FROM cms_revisions latest WHERE latest.edition_id=e.id
                   ORDER BY latest.revision_number DESC,latest.created_at DESC,latest.id DESC LIMIT 1
                ))
           ) selected ON true
          WHERE d.id=$1 AND e.market<>'shared-source' AND e.market<>$2 AND e.locale=$3
            AND ($4::text[] IS NULL OR e.market=ANY($4::text[]))
          ORDER BY e.market,e.id,
                   CASE WHEN selected.id=e.published_revision_id THEN 1 ELSE 0 END,
                   selected.revision_number DESC`,
        [
          documentId,
          targetMarket,
          targetLocale,
          null,
        ],
      );
      const authorizedCandidates = [];
      for (const candidate of candidates.rows) {
        if (!await options.canAccessEditionTarget(
          pool, auth, documentId, String(candidate.market), String(candidate.locale), "view",
        )) continue;
        if (!await canAccessCopiedRevisionLineage(
          pool, auth, documentId, String(candidate.revision_id), "view", options.canAccessEditionTarget,
        )) continue;
        const readiness = savedRevisionReadiness(
          candidate.kind,
          candidate.payload,
          candidate.workflow_state,
        );
        const mediaErrors = await options.revisionMediaGovernanceErrors(
          pool,
          documentId,
          String(candidate.revision_id),
          candidate.kind as CmsDocumentKind,
          candidate.payload as Record<string, any>,
        );
        authorizedCandidates.push({
          ...candidate,
          readiness: mediaErrors.length
            ? {
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
            }
            : readiness,
        });
      }
      res.json({
        documentId,
        targetMarket,
        targetLocale,
        candidates: authorizedCandidates.map((candidate) => ({
          editionId: String(candidate.edition_id),
          market: candidate.market,
          locale: candidate.locale,
          revisionId: String(candidate.revision_id),
          revisionNumber: Number(candidate.revision_number),
          workflowState: candidate.workflow_state,
          publicationState: candidate.source_revision_status,
          publishedRevisionId: candidate.published_revision_id
            ? String(candidate.published_revision_id)
            : null,
          ...candidate.readiness,
        })),
      });
    }),
  );

  router.post(
    "/documents/:documentId/market-edition-copies",
    options.requireCsrf,
    asyncRoute(async (req, res) => {
      const parsed = CopyDocumentMarketEditionBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid market edition copy.", details: parsed.error.issues });
        return;
      }
      const documentId = String(req.params.documentId);
      const body = parsed.data;
      if (body.sourceRevisionId !== body.expectedSourceRevisionId) {
        res.status(409).json({ error: "The selected source revision changed; reopen copy candidates and try again." });
        return;
      }
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
          res.status(403).json({ error: "Authentication is no longer valid." });
          return;
        }
        const destinationMarket = await client.query(
          `SELECT id,code,default_locale,fallback_locale
             FROM market_editions WHERE id=$1 AND enabled=true FOR KEY SHARE`,
          [body.destinationMarketEditionId],
        );
        const destinationMarketRow = destinationMarket.rows[0];
        if (!destinationMarketRow) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "The destination market edition is unavailable." });
          return;
        }
        const destinationMarketCode = String(destinationMarketRow.code);
        if (!await options.canAccessEditionTarget(
          client, transactionAuth, documentId, destinationMarketCode, body.destinationLocale, "edit",
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to the destination market." });
          return;
        }
        if (![destinationMarketRow.default_locale, destinationMarketRow.fallback_locale].includes(body.destinationLocale)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The destination locale is not configured for this market edition." });
          return;
        }
        const sourceResult = await client.query(
          `SELECT d.kind,r.id,r.revision_number,r.workflow_state,r.payload,e.id edition_id,
                  e.market,e.locale,
                  latest.id latest_revision_id,e.published_revision_id,
                  CASE WHEN r.id=e.published_revision_id THEN 'published' ELSE 'saved' END source_revision_status
             FROM cms_revisions r
             JOIN cms_market_editions e ON e.id=r.edition_id
             JOIN cms_documents d ON d.id=e.document_id
             JOIN LATERAL (
               SELECT current.id FROM cms_revisions current WHERE current.edition_id=e.id
                ORDER BY current.revision_number DESC,current.created_at DESC,current.id DESC LIMIT 1
             ) latest ON true
            WHERE d.id=$1 AND r.id=$2 AND e.market<>'shared-source'
            FOR KEY SHARE OF r,e`,
          [documentId, body.sourceRevisionId],
        );
        const source = sourceResult.rows[0];
        if (!source) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "The selected source revision is not an exact geo revision in this document." });
          return;
        }
        if (!await options.canAccessEditionTarget(
          client, transactionAuth, documentId, String(source.market), String(source.locale), "edit",
        ) || !await canAccessCopiedRevisionLineage(
          client, transactionAuth, documentId, String(source.id), "edit", options.canAccessEditionTarget,
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not authorized for the selected source revision and its immutable lineage." });
          return;
        }
        if (String(source.locale) !== body.destinationLocale || String(source.market) === destinationMarketCode) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Copy requires distinct same-locale source and destination geo editions." });
          return;
        }
        const existing = await client.query(
          `SELECT e.id edition_id,e.market,e.locale,latest.id revision_id,latest.revision_number,
                  latest.source_revision_id,latest.workflow_state,e.publication_state,e.published_revision_id
             FROM cms_market_editions e
             LEFT JOIN LATERAL (
               SELECT r.id,r.revision_number,r.source_revision_id,r.workflow_state
                 FROM cms_revisions r WHERE r.edition_id=e.id
                ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC LIMIT 1
             ) latest ON true
            WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
            ORDER BY e.created_at,e.id LIMIT 1
            FOR UPDATE OF e`,
          [documentId, destinationMarketCode, body.destinationLocale],
        );
        if (existing.rows[0]) {
          const prior = existing.rows[0];
          const isInitialUnpublishedCopy = String(prior.source_revision_id) === String(source.id)
            && Number(prior.revision_number) === 1
            && prior.workflow_state === "draft"
            && prior.publication_state === "draft"
            && prior.published_revision_id == null;
          const receipt = isInitialUnpublishedCopy
            ? await client.query(
              `SELECT 1 FROM cms_audit_events
                WHERE target_type='document' AND target_id=$1::text
                  AND action='document.market_edition_copied'
                  AND metadata->>'sourceRevisionId'=$2
                  AND metadata->>'destinationRevisionId'=$3
                  AND metadata->>'destinationMarket'=$4
                  AND metadata->>'destinationLocale'=$5
                LIMIT 1`,
              [
                documentId,
                String(source.id),
                String(prior.revision_id),
                destinationMarketCode,
                body.destinationLocale,
              ],
            )
            : { rows: [] };
          if (isInitialUnpublishedCopy && receipt.rows[0]) {
            await client.query("COMMIT");
            res.json(copyResponse(documentId, prior, source, true));
            return;
          }
          await client.query("ROLLBACK");
          res.status(409).json({ error: "That exact market and locale edition already exists; use its deliberate editing workflow." });
          return;
        }
        if (String(source.latest_revision_id) !== String(source.id)
          && String(source.published_revision_id) !== String(source.id)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The selected source is no longer its saved or published copy candidate; reopen and select a current source explicitly." });
          return;
        }
        const validation = validateCmsSnapshot(source.kind, source.payload, "draft");
        if (!validation.success) {
          await client.query("ROLLBACK");
          res.status(422).json({
            error: "The selected saved source revision fails the destination draft content contract.",
            details: validation.errors,
          });
          return;
        }
        const pins = await client.query(
          `SELECT asset_id "assetId",media_version_id "mediaVersionId"
             FROM cms_media_references
            WHERE document_id=$1 AND field_path=$2 AND media_version_id IS NOT NULL`,
          [documentId, `revision:${source.id}`],
        );
        const mediaReferences = mediaPinsForSnapshot(validation.data, String(source.kind), pins.rows);
        await assertExactImmutableMediaPins(client, mediaReferences);
        const edition = await client.query(
          `INSERT INTO cms_market_editions
             (document_id,market,locale,localized_slug,publication_state,fallback_mode,content_mode,customized_from_revision_id)
           VALUES ($1,$2,$3,$4,'draft','none','custom',$5)
           RETURNING id,market,locale`,
          [documentId, destinationMarketCode, body.destinationLocale, validation.data.slug ?? null, source.id],
        );
        const revision = await client.query(
          `INSERT INTO cms_revisions
             (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id)
           VALUES ($1,1,$2,$3,'draft',$4,$5,$6)
           RETURNING id,revision_number`,
          [
            edition.rows[0].id,
            validation.data,
            digest(validation.data),
            transactionAuth.user.id,
            `Explicit geo copy from ${source.market}/${source.locale} revision ${source.revision_number}`,
            source.id,
          ],
        );
        const destination = {
          edition_id: edition.rows[0].id,
          market: edition.rows[0].market,
          locale: edition.rows[0].locale,
          revision_id: revision.rows[0].id,
          revision_number: revision.rows[0].revision_number,
        };
        await copyMediaPins(client, documentId, String(revision.rows[0].id), mediaReferences);
        await audit(transactionAuth, "document.market_edition_copied", "document", documentId, {
          sourceRevisionId: String(source.id),
          sourceMarket: String(source.market),
          sourceLocale: String(source.locale),
          destinationMarket: destinationMarketCode,
          destinationLocale: body.destinationLocale,
          destinationRevisionId: String(revision.rows[0].id),
        }, client);
        await client.query("COMMIT");
        res.status(201).json(copyResponse(documentId, destination, source, false));
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof InvalidImmutableMediaPinsError) {
          res.status(422).json({ error: error.message });
          return;
        }
        if (typeof error === "object" && error !== null && "code" in error && error.code === "23505") {
          res.status(409).json({ error: "That exact market and locale edition was created concurrently; reopen it before retrying." });
          return;
        }
        throw error;
      } finally {
        client.release();
      }
    }),
  );

  router.get("/documents/:documentId/shared-market", asyncRoute(async (req, res) => {
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    // Matrix grants, rather than the legacy assignment list, decide which
    // exact shared targets may be returned below.
    const permittedMarkets: string[] | null = null;
    const [baselines, bindings] = await Promise.all([
      pool.query(
         `SELECT b.id,b.document_id,b.locale,d.kind,r.id revision_id,r.revision_number,r.source_revision_id,
                  r.governing_source_revision_id,
                  CASE WHEN source_edition.id IS NOT NULL
                    THEN COALESCE(r.governing_source_revision_id,r.source_revision_id)
                  END effective_governing_source_revision_id,
                  neutral_proof.intentional_neutral,
                 r.snapshot,r.media_references,b.created_at,
                 source_edition.market source_market,source_edition.locale source_locale
           FROM cms_shared_baselines b
            JOIN cms_documents d ON d.id=b.document_id
           JOIN cms_shared_baseline_revisions r ON r.id=b.active_revision_id
            LEFT JOIN cms_revisions source_revision
              ON source_revision.id=COALESCE(r.governing_source_revision_id,r.source_revision_id)
            LEFT JOIN cms_market_editions source_edition
              ON source_edition.id=source_revision.edition_id
              AND source_edition.document_id=b.document_id
             AND source_edition.market NOT IN ('shared-source','und')
             LEFT JOIN LATERAL (
               SELECT true intentional_neutral
                 FROM cms_audit_events proof
                WHERE proof.action='shared-neutral-baseline-created'
                  AND proof.target_type='shared-baseline'
                  AND proof.target_id=b.id::text
                  AND proof.metadata->>'documentId'=b.document_id::text
                  AND proof.metadata->>'baselineRevisionId'=r.id::text
                  AND proof.metadata->>'locale'=b.locale
                  AND proof.metadata->>'authorityProof'='explicit-shared-and-regional-all-destinations'
                LIMIT 1
             ) neutral_proof ON true
           WHERE b.document_id=$1
             AND (
               (
                  source_edition.id IS NOT NULL
                 AND source_edition.market IS NOT NULL
                 AND ($2::text[] IS NULL OR source_edition.market=ANY($2::text[]))
               )
               OR (
                  source_edition.id IS NULL
                  AND (
                    neutral_proof.intentional_neutral IS TRUE
                    OR EXISTS (
                   SELECT 1
                     FROM cms_market_edition_bindings neutral_binding
                     JOIN market_editions neutral_target
                       ON neutral_target.id=neutral_binding.market_edition_id
                    WHERE neutral_binding.document_id=b.document_id
                      AND neutral_binding.baseline_id=b.id
                      AND neutral_binding.mode IN ('shared','adapted')
                      AND ($2::text[] IS NULL OR neutral_target.code=ANY($2::text[]))
                    )
                  )
               )
             )
           ORDER BY b.locale`,
        [documentId, permittedMarkets],
      ),
      pool.query(
         `SELECT binding.*,target.code market,
                 source_edition.market source_market,source_edition.locale source_locale
           FROM cms_market_edition_bindings binding
           JOIN market_editions target ON target.id=binding.market_edition_id
           LEFT JOIN cms_shared_baseline_revisions adopted ON adopted.id=binding.based_on_baseline_revision_id
           LEFT JOIN cms_revisions source_revision
             ON source_revision.id=COALESCE(adopted.governing_source_revision_id,adopted.source_revision_id)
           LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
          WHERE binding.document_id=$1
             AND ($2::text[] IS NULL OR target.code=ANY($2::text[]))
             AND (
               binding.mode='independent'
               OR (
                 adopted.id IS NOT NULL
                 AND (
                    source_edition.id IS NULL
                   OR (
                     source_edition.market IS NOT NULL
                     AND ($2::text[] IS NULL OR source_edition.market=ANY($2::text[]))
                   )
                 )
               )
             )
          ORDER BY binding.locale,binding.market_edition_id`,
        [documentId, permittedMarkets],
      ),
    ]);
    const visibleBindings = (await Promise.all(bindings.rows.map(async (binding) =>
      await options.canAccessEditionTarget(
        pool, auth, documentId, String(binding.market), String(binding.locale), "view",
      ) && (binding.source_market == null || await sourceMarketAllowed(
        pool, auth, documentId, binding, "view", options.canAccessEditionTarget,
      )) ? binding : null,
    ))).filter((binding): binding is Record<string, any> => binding !== null);
    const visibleBaselineIds = new Set(visibleBindings.map((binding) => String(binding.baseline_id)));
    const visibleBaselines = (await Promise.all(baselines.rows.map(async (baseline) => {
       if (baseline.source_market == null) {
         return baseline.intentional_neutral === true || visibleBaselineIds.has(String(baseline.id))
           ? baseline : null;
       }
      return await options.canAccessEditionTarget(
        pool, auth, documentId, String(baseline.source_market), String(baseline.source_locale), "view",
      ) ? baseline : null;
    }))).filter((baseline): baseline is Record<string, any> => baseline !== null);
    const baselineAuthority = new Map<string, {
      affectedDestinationMarkets: string[]; canView: boolean; canEdit: boolean; editReason: string | null;
    }>();
    await Promise.all(visibleBaselines.map(async (baseline) => {
      const bound = (await pool.query(
        `SELECT target.code market,binding.locale
           FROM cms_market_edition_bindings binding
           JOIN market_editions target ON target.id=binding.market_edition_id
          WHERE binding.document_id=$1 AND binding.baseline_id=$2
            AND binding.mode IN ('shared','adapted')`,
        [documentId, baseline.id],
      )).rows;
      const targets = bound.length ? bound : (await pool.query(
        `SELECT market.code market,supported.locale
           FROM market_editions market
           CROSS JOIN LATERAL (
             SELECT DISTINCT configured_locale locale
               FROM unnest(ARRAY[market.default_locale,market.fallback_locale]) configured_locale
              WHERE configured_locale IS NOT NULL
                AND lower(split_part(configured_locale,'-',1))=lower(split_part($1,'-',1))
           ) supported
          WHERE market.enabled=true`,
        [baseline.locale],
      )).rows;
      const markets = targets.map((target) => String(target.market));
       const intentionalNeutral = baseline.intentional_neutral === true;
       if (!baseline.effective_governing_source_revision_id && !intentionalNeutral) {
        baselineAuthority.set(String(baseline.id), {
           affectedDestinationMarkets: markets, canView: false, canEdit: false,
          editReason: "Select an exact saved source revision; this baseline has no durable real-market origin.",
        });
        return;
      }
       const destinationsAllowed = targets.length > 0 && (await Promise.all(targets.map((target) =>
         options.canAccessEditionTarget(pool, auth, documentId, String(target.market), String(target.locale), "edit"),
       ))).every(Boolean);
       if (intentionalNeutral) {
         const neutralSharedAllowed = async (capability: CmsCapability) =>
           (await Promise.all(markets.map((market) => canAccessContent(auth.user, {
             topic: baseline.kind as CmsDocumentKind,
             capability, marketCode: market, scope: "shared",
             sourceMarketCode: market, destinationMarketCodes: markets,
           })))).every(Boolean);
         const viewTargetsAllowed = targets.length > 0 && (await Promise.all(targets.map((target) =>
           options.canAccessEditionTarget(pool, auth, documentId, String(target.market), String(target.locale), "view"),
         ))).every(Boolean);
         const canView = Boolean(viewTargetsAllowed && await neutralSharedAllowed("view"));
         const canEdit = Boolean(destinationsAllowed && await neutralSharedAllowed("edit"));
         baselineAuthority.set(String(baseline.id), {
           affectedDestinationMarkets: markets, canView, canEdit,
           editReason: canEdit ? null : "You need Shared and regional Edit access to every affected destination.",
         });
         return;
       }
      const sourceAllowed = await options.canAccessEditionTarget(
        pool, auth, documentId, String(baseline.source_market), String(baseline.source_locale), "edit",
      ) && await canAccessContent(auth.user, {
        topic: baseline.kind as CmsDocumentKind,
        capability: "edit", marketCode: String(baseline.source_market), scope: "shared",
        sourceMarketCode: String(baseline.source_market), destinationMarketCodes: markets,
      });
      baselineAuthority.set(String(baseline.id), {
         affectedDestinationMarkets: markets, canView: true, canEdit: Boolean(sourceAllowed && destinationsAllowed),
        editReason: sourceAllowed && destinationsAllowed ? null : "You need Edit access to the governing source, shared source, and every affected destination.",
      });
    }));
    res.json({
      baselines: visibleBaselines.map((row) => ({
        id: String(row.id), documentId: String(row.document_id), locale: row.locale,
        revisionId: String(row.revision_id), revisionNumber: Number(row.revision_number),
        sourceRevisionId: row.source_revision_id ? String(row.source_revision_id) : null,
         governingSourceRevisionId: row.effective_governing_source_revision_id
           ? String(row.effective_governing_source_revision_id) : null,
         authorityKind: row.effective_governing_source_revision_id
           ? "regional"
           : row.intentional_neutral === true ? "neutral" : "unresolved",
        // A local binding may remain readable through its materialized
        // regional revision, but it must not grant raw neutral-baseline
        // content when that baseline has no resolvable governing source.
        // Keep the baseline record visible for recovery guidance while
        // redacting payload and media pins.
         snapshot: (row.effective_governing_source_revision_id && row.source_market)
           || baselineAuthority.get(String(row.id))?.canView ? row.snapshot : null,
         mediaReferences: (row.effective_governing_source_revision_id && row.source_market)
           || baselineAuthority.get(String(row.id))?.canView ? row.media_references ?? [] : [],
        affectedDestinationMarkets: baselineAuthority.get(String(row.id))?.affectedDestinationMarkets ?? [],
        canEdit: baselineAuthority.get(String(row.id))?.canEdit ?? false,
        editReason: baselineAuthority.get(String(row.id))?.editReason ?? "Baseline authority is unavailable.",
        createdAt: row.created_at,
      })),
      bindings: visibleBindings.map(mapBinding),
    });
  }));

  router.post("/documents/:documentId/shared-market", options.requireCsrf,
    asyncRoute(async (req, res) => {
      const parsed = EstablishSharedMarketBaselineBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid neutral baseline.", details: parsed.error.issues });
        return;
      }
      const documentId = String(req.params.documentId);
      const body = parsed.data;
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (!await lockDocumentForMutation(client, documentId)) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Document not found." });
          return;
        }
        const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
        if (!auth) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "Authentication is no longer valid." });
          return;
        }
        const existing = await client.query(
          `SELECT b.id,b.created_at,b.active_revision_id,
                  r.revision_number,r.snapshot,r.media_references,r.source_revision_id,
                  COALESCE(r.governing_source_revision_id,r.source_revision_id) governing_source_revision_id,
                   neutral_proof.intentional_neutral,
                  d.kind
             FROM cms_shared_baselines b
             JOIN cms_documents d ON d.id=b.document_id
             LEFT JOIN cms_shared_baseline_revisions r ON r.id=b.active_revision_id
              LEFT JOIN LATERAL (
                SELECT true intentional_neutral
                  FROM cms_audit_events proof
                 WHERE proof.action='shared-neutral-baseline-created'
                   AND proof.target_type='shared-baseline'
                   AND proof.target_id=b.id::text
                   AND proof.metadata->>'documentId'=b.document_id::text
                   AND proof.metadata->>'baselineRevisionId'=r.id::text
                   AND proof.metadata->>'locale'=b.locale
                   AND proof.metadata->>'authorityProof'='explicit-shared-and-regional-all-destinations'
                 LIMIT 1
              ) neutral_proof ON true
            WHERE b.document_id=$1 AND b.locale=$2
            FOR UPDATE OF b`,
          [documentId, body.locale],
        );
        const sourceRevisionId = body.sourceRevisionId ? String(body.sourceRevisionId) : null;
        let source: { rows: Array<Record<string, any>> };
        let governingSource: { rows: Array<Record<string, any>> };
        if (sourceRevisionId) {
          // A baseline may still be established from an explicitly named
          // real-market historical revision. No legacy source is inferred or
          // relocated.
          source = await client.query(
            `SELECT d.kind,r.id,r.revision_number,r.payload,e.market,e.locale
                 FROM cms_revisions r
                 JOIN cms_market_editions e ON e.id=r.edition_id
                 JOIN cms_documents d ON d.id=e.document_id
               WHERE e.document_id=$1 AND r.id=$2 AND e.locale=$3
                  AND e.market<>'shared-source' AND e.locale<>'und'
                FOR KEY SHARE OF r,e`,
            [documentId, sourceRevisionId, body.locale],
          );
          if (!source.rows[0]) {
            await client.query("ROLLBACK");
            res.status(404).json({ error: "The selected revision is not an exact source in this locale." });
            return;
          }
          governingSource = source;
          // The server, not an optimistic client, is authoritative for an
          // exact published/historical source. Keep accepting the existing
          // matching client snapshot for compatibility, but reject a stale or
          // substituted payload rather than silently publishing it.
          if (body.snapshot !== undefined && !isDeepStrictEqual(body.snapshot, source.rows[0].payload)) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "The supplied snapshot does not match the selected exact source revision." });
            return;
          }
        } else {
          if (!existing.rows[0]?.active_revision_id || !existing.rows[0]?.kind) {
            await client.query("ROLLBACK");
            res.status(409).json({
              error: "A neutral baseline must already exist when no real-market source revision is supplied.",
            });
            return;
          }
           if (!existing.rows[0].governing_source_revision_id && !existing.rows[0].intentional_neutral) {
            await client.query("ROLLBACK");
            res.status(409).json({
              error: "This neutral baseline has no durable real-market origin. Select an exact saved source revision before replacing it.",
            });
            return;
          }
           governingSource = existing.rows[0].intentional_neutral
             ? {
               rows: [{
                 kind: existing.rows[0].kind, id: null, revision_number: existing.rows[0].revision_number,
                 payload: existing.rows[0].snapshot, market: null, locale: null,
               }],
             }
             : await client.query(
            `SELECT d.kind,r.id,r.revision_number,r.payload,e.market,e.locale
               FROM cms_revisions r
               JOIN cms_market_editions e ON e.id=r.edition_id
               JOIN cms_documents d ON d.id=e.document_id
              WHERE e.document_id=$1 AND r.id=$2 AND e.locale=$3
                AND e.market<>'shared-source' AND e.locale<>'und'
              FOR KEY SHARE OF r,e`,
            [documentId, existing.rows[0].governing_source_revision_id, body.locale],
          );
           if (!governingSource.rows[0]) {
            await client.query("ROLLBACK");
            res.status(409).json({
              error: "This neutral baseline's durable source is unavailable. Select an exact saved source revision before replacing it.",
            });
            return;
          }
           source = {
            rows: [{
              kind: existing.rows[0].kind,
              id: null,
              revision_number: existing.rows[0].revision_number,
              payload: existing.rows[0].snapshot,
              market: null,
              locale: null,
            }],
          };
        }
        // A baseline with active shared/adapted bindings affects exactly those
        // bound editions. A first baseline, and an unused successor whose
        // editions are all independent/custom, has no such bindings yet; its
        // prospective fan-out remains every enabled same-language market.
        // This keeps reusable-content establishment non-circular while still
        // requiring authority over every market it could be adopted into.
        const boundDestinations = existing.rows[0]
          ? (await client.query(
            `SELECT market.code market,binding.locale
               FROM cms_market_edition_bindings binding
               JOIN market_editions market ON market.id=binding.market_edition_id
              WHERE binding.document_id=$1
                AND binding.baseline_id=$2
                AND binding.mode IN ('shared','adapted')
              FOR KEY SHARE OF binding,market`,
            [documentId, existing.rows[0].id],
          )).rows
          : [];
        const affectedDestinations = boundDestinations.length
          ? boundDestinations
          : (await client.query(
            `SELECT market.code market,supported.locale
               FROM market_editions market
               CROSS JOIN LATERAL (
                 SELECT DISTINCT configured_locale locale
                   FROM unnest(ARRAY[market.default_locale,market.fallback_locale]) configured_locale
                  WHERE configured_locale IS NOT NULL
                    AND lower(split_part(configured_locale,'-',1))
                        = lower(split_part($1,'-',1))
               ) supported
              WHERE market.enabled=true
              FOR KEY SHARE OF market`,
            [body.locale],
          )).rows;
        const suppliedSourceAllowed = existing.rows[0]?.intentional_neutral && !sourceRevisionId
          ? (await Promise.all(affectedDestinations.map((target) => {
            const market = String(target.market);
            return canAccessContent(auth.user, {
              topic: existing.rows[0].kind as CmsDocumentKind,
              capability: "edit", marketCode: market, scope: "shared",
              sourceMarketCode: market,
              destinationMarketCodes: affectedDestinations.map((destination) => String(destination.market)),
            });
          }))).every(Boolean)
          : (
          await options.canAccessEditionTarget(
            client, auth, documentId, String(governingSource.rows[0].market), String(governingSource.rows[0].locale), "edit",
          )
          && await canAccessContent(auth.user, {
            topic: governingSource.rows[0].kind as CmsDocumentKind,
            capability: "edit",
            marketCode: String(governingSource.rows[0].market),
            scope: "shared",
            sourceMarketCode: String(governingSource.rows[0].market),
            destinationMarketCodes: affectedDestinations.map((target) => String(target.market)),
          })
        );
        const affectedDestinationsAllowed = await Promise.all(affectedDestinations.map((target) =>
          options.canAccessEditionTarget(
            client, auth, documentId, String(target.market), String(target.locale), "edit",
          )));
        if (!affectedDestinations.length || !suppliedSourceAllowed || !affectedDestinationsAllowed.every(Boolean)) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not authorized to edit every affected exact edition." });
          return;
        }
        const authoritativeSnapshot = sourceRevisionId ? source.rows[0].payload : body.snapshot;
        if (authoritativeSnapshot === undefined) {
          await client.query("ROLLBACK");
          res.status(400).json({ error: "A snapshot is required when no exact source revision is supplied." });
          return;
        }
        const validation = validateCmsSnapshot(source.rows[0].kind, authoritativeSnapshot, "draft");
        if (!validation.success) {
          await client.query("ROLLBACK");
          res.status(422).json({ error: "The shared baseline does not satisfy this document's content contract.", details: validation.errors });
          return;
        }
        if (existing.rows[0] && (body.expectedRevisionNumber === undefined ||
          Number(existing.rows[0].revision_number) !== body.expectedRevisionNumber)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The neutral baseline changed; reopen before saving a successor." });
          return;
        }
        const baseline = existing.rows[0] ? { rows: [existing.rows[0]] } : await client.query(
            `INSERT INTO cms_shared_baselines(document_id,locale,created_by_user_id)
             VALUES ($1,$2,$3) RETURNING id,created_at`,
            [documentId, body.locale, auth.user.id],
          );
        const pins = sourceRevisionId
          ? await client.query(
            `SELECT asset_id "assetId",media_version_id "mediaVersionId"
               FROM cms_media_references
              WHERE document_id=$1 AND field_path=$2 AND media_version_id IS NOT NULL`,
            [documentId, `revision:${sourceRevisionId}`],
          )
          : { rows: (existing.rows[0]?.media_references ?? []) as Array<Record<string, unknown>> };
        const baselineMediaReferences = mediaPinsForSnapshot(
          validation.data,
          String(source.rows[0].kind),
          pins.rows,
        );
        await assertExactImmutableMediaPins(client, baselineMediaReferences);
        const revision = await client.query(
          `INSERT INTO cms_shared_baseline_revisions(baseline_id,revision_number,snapshot,media_references,
                                                      content_digest,source_revision_id,governing_source_revision_id,created_by_user_id)
           VALUES ($1,COALESCE((SELECT max(revision_number)+1 FROM cms_shared_baseline_revisions WHERE baseline_id=$1),1),
                   $2,$3,$4,$5,$6,$7) RETURNING id,revision_number`,
            [baseline.rows[0]!.id, validation.data,
               JSON.stringify(baselineMediaReferences), digest(validation.data),
               sourceRevisionId, sourceRevisionId ?? existing.rows[0]?.governing_source_revision_id, auth.user.id],
        );
        await client.query("UPDATE cms_shared_baselines SET active_revision_id=$2,updated_at=now() WHERE id=$1",
          [baseline.rows[0]!.id, revision.rows[0]!.id]);
        // The database successor trigger records a durable event for every
        // affected assignee. Keep the route's state transition explicit too:
        // isolated route-test schemas and pre-trigger development schemas
        // still must never present a binding based on the replaced revision as
        // current. The trigger covers direct operational pointer updates.
        await client.query(
          `UPDATE cms_market_edition_bindings
              SET translation_state='stale',updated_at=now()
            WHERE document_id=$1 AND baseline_id=$2
              AND mode IN ('shared','adapted')
              AND based_on_baseline_revision_id=$3`,
          [documentId, baseline.rows[0]!.id, existing.rows[0]?.active_revision_id ?? null],
        );
        await audit(auth, "shared-baseline-established", "document", documentId,
          { locale: body.locale, sourceRevisionId }, client);
        if (existing.rows[0]?.intentional_neutral && !sourceRevisionId) {
          await audit(auth, "shared-neutral-baseline-created", "shared-baseline",
            String(baseline.rows[0]!.id), {
              documentId, baselineRevisionId: String(revision.rows[0]!.id), locale: body.locale,
              destinationMarkets: affectedDestinations.map((target) => String(target.market)),
              authorityProof: "explicit-shared-and-regional-all-destinations",
            }, client);
        }
        await client.query("COMMIT");
        res.status(201).json({
          id: String(baseline.rows[0]!.id), documentId, locale: body.locale,
          revisionId: String(revision.rows[0]!.id), revisionNumber: Number(revision.rows[0]!.revision_number),
          sourceRevisionId, snapshot: validation.data,
           mediaReferences: baselineMediaReferences,
          createdAt: baseline.rows[0]!.created_at,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof InvalidImmutableMediaPinsError) {
          res.status(422).json({ error: error.message });
          return;
        }
        throw error;
      } finally { client.release(); }
    }),
  );

  router.put("/documents/:documentId/shared-market/bindings", options.requireCsrf,
    asyncRoute(async (req, res) => {
      const parsed = BindSharedMarketEditionBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid shared-market binding.", details: parsed.error.issues });
        return;
      }
      const documentId = String(req.params.documentId);
      const body = parsed.data;
      const auth = res.locals.auth as AuthContext;
      const destination = await pool.query(
        "SELECT code FROM market_editions WHERE id=$1 AND enabled=true",
        [body.marketEditionId],
      );
      if (!destination.rows[0]) {
        res.status(404).json({ error: "The market edition is unavailable." });
        return;
      }
      const market = String(destination.rows[0].code);
      if (!await options.canAccessEditionTarget(pool, auth, documentId, market, body.locale, "edit")) {
        res.status(403).json({ error: "You are not authorized to edit this market." });
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
        const lockedDestination = await client.query(
          "SELECT code FROM market_editions WHERE id=$1 AND enabled=true FOR KEY SHARE",
          [body.marketEditionId],
        );
        if (!lockedDestination.rows[0]) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "The market edition is unavailable." });
          return;
        }
        const lockedMarket = String(lockedDestination.rows[0].code);
        if (!await options.canAccessEditionTarget(
          client, transactionAuth, documentId, lockedMarket, body.locale, "edit",
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to this market." });
          return;
        }
        const document = await client.query("SELECT kind FROM cms_documents WHERE id=$1", [documentId]);
        if (String(document.rows[0].kind) === "site-configuration") {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "This document kind retains its dedicated market contract." });
          return;
        }
        const destinationLanguage = localeLanguageIdentity(body.locale);
        if (body.mode !== "independent" && !destinationLanguage) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Shared content requires an explicit localized destination; und is never a reusable language." });
          return;
        }
        // Reuse can replace an unbound legacy/custom exact edition. A binding
        // version cannot protect that case because there is no binding yet, so
        // lock the exact target and verify the revision the editor inspected
        // before materializing a new draft over it. The optional token keeps
        // older technical callers compatible while guided reuse always sends
        // it when a destination already has saved content.
        const destinationEdition = await client.query(
          `SELECT e.id,latest.id revision_id
             FROM cms_market_editions e
             LEFT JOIN LATERAL (
               SELECT r.id FROM cms_revisions r
                WHERE r.edition_id=e.id
                ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC LIMIT 1
             ) latest ON true
            WHERE e.document_id=$1 AND e.market=$2 AND e.locale=$3
            ORDER BY e.created_at,e.id LIMIT 1
            FOR UPDATE OF e`,
          [documentId, lockedMarket, body.locale],
        );
        const destinationRevisionId = destinationEdition.rows[0]?.revision_id
          ? String(destinationEdition.rows[0].revision_id) : null;
        // Existing bindings materialize an exact edition. Acquire that edition
        // first so generic rebinds share ordinary save's edition→binding order.
        const existingPreflight = await client.query(
          `SELECT market.code market,binding.locale
             FROM cms_market_edition_bindings binding
             JOIN market_editions market ON market.id=binding.market_edition_id
            WHERE binding.document_id=$1 AND binding.market_edition_id=$2 AND binding.locale=$3`,
          [documentId, body.marketEditionId, body.locale],
        );
        if (existingPreflight.rows[0] && !await lockManagedExactEdition(
          client,
          documentId,
          String(existingPreflight.rows[0].market),
          String(existingPreflight.rows[0].locale),
        )) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The existing managed binding has no exact edition." });
          return;
        }
        const existing = await client.query(
          `SELECT binding.*,COALESCE(adopted.governing_source_revision_id,adopted.source_revision_id) baseline_source_revision_id,
                  source_edition.market source_market,source_edition.locale source_locale
             FROM cms_market_edition_bindings binding
             LEFT JOIN cms_shared_baseline_revisions adopted
               ON adopted.id=binding.based_on_baseline_revision_id
             LEFT JOIN cms_revisions source_revision ON source_revision.id=COALESCE(adopted.governing_source_revision_id,adopted.source_revision_id)
             LEFT JOIN cms_market_editions source_edition
               ON source_edition.id=source_revision.edition_id
              AND source_edition.document_id=binding.document_id
              AND source_edition.market NOT IN ('shared-source','und')
             WHERE binding.document_id=$1 AND binding.market_edition_id=$2 AND binding.locale=$3
            FOR UPDATE OF binding`,
          [documentId, body.marketEditionId, body.locale],
        );
        const existingBinding = existing.rows[0];
        if (body.version === 0 && existingBinding) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "This market edition is already bound; reopen it and use its current version." });
          return;
        }
        if (body.version > 0 && (!existingBinding || Number(existingBinding.version) !== body.version)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "This binding changed by another editor; reopen before saving." });
          return;
        }
        if (existingBinding && existingBinding.mode !== "independent"
          && !await sourceMarketAllowed(
            client, transactionAuth, documentId, existingBinding, "edit", options.canAccessEditionTarget,
          )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to the current shared baseline source market." });
          return;
        }
        // A saved shared destination can enter Adapted mode through the
        // explicit Customize action. It keeps the same frozen neutral
        // baseline and starts with an empty override set; subsequent field
        // saves use the sparse-overrides endpoint. All other generic mode or
        // baseline changes remain Compare/Resolve-only.
        const startingAdaptedCustomization = existingBinding
          && existingBinding.mode === "shared"
          && body.mode === "adapted"
          && body.baselineId === String(existingBinding.baseline_id)
          && body.baselineRevisionId === String(existingBinding.based_on_baseline_revision_id);
        if (existingBinding && existingBinding.mode !== "independent" && !startingAdaptedCustomization && (
          body.mode === "independent"
          || body.mode !== existingBinding.mode
          || body.baselineId !== String(existingBinding.baseline_id)
          || body.baselineRevisionId !== String(existingBinding.based_on_baseline_revision_id)
        )) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "An existing Shared or Adapted binding can change baseline, mode, or local overrides only through Compare and Resolve.",
          });
          return;
        }
        // Translation acknowledgement is the only backwards-compatible
        // non-materializing shared/adapted update. It cannot replace the
        // destination snapshot; every new/adopting materialization must carry
        // the inspected target token (including null for an empty target).
        const nonMaterializingTranslationAcknowledgement = Boolean(
          existingBinding
          && existingBinding.mode !== "independent"
          && body.mode === existingBinding.mode
          && body.baselineId === String(existingBinding.baseline_id)
          && body.baselineRevisionId === String(existingBinding.based_on_baseline_revision_id)
          && body.translationSourceRevisionId,
        );
        const materializesSharedDestination = body.mode !== "independent"
          && !nonMaterializingTranslationAcknowledgement;
        if (materializesSharedDestination && body.expectedDestinationRevisionId === undefined) {
          await client.query("ROLLBACK");
          res.status(422).json({
            error: "An inspected destination revision token is required before shared content can materialize a draft.",
          });
          return;
        }
        if (materializesSharedDestination && body.expectedActiveBaselineRevisionId === undefined) {
          await client.query("ROLLBACK");
          res.status(422).json({
            error: "An inspected active baseline revision token is required before shared content can materialize a draft.",
          });
          return;
        }
        if (body.expectedDestinationRevisionId !== undefined
          && !destinationRevisionMatchesExpected(body.expectedDestinationRevisionId, destinationRevisionId)) {
          await client.query("ROLLBACK");
          res.status(409).json({
            error: "This destination has a newer saved revision than the one you compared. Reload its differences before replacing it.",
          });
          return;
        }
        let baseline: Record<string, any> | undefined;
        if (body.mode !== "independent") {
          const baselineId = body.baselineId ?? existingBinding?.baseline_id;
          const result = await client.query(
           `SELECT b.id,b.active_revision_id,r.id revision_id,r.snapshot,r.media_references,
                  COALESCE(r.governing_source_revision_id,r.source_revision_id) baseline_source_revision_id,
                  source_edition.market source_market,source_edition.locale source_locale
               FROM cms_shared_baselines b
                JOIN cms_shared_baseline_revisions r ON r.id=$4
                LEFT JOIN cms_revisions source_revision ON source_revision.id=COALESCE(r.governing_source_revision_id,r.source_revision_id)
                LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
                WHERE b.id=$1 AND b.document_id=$2
                  AND lower(split_part(b.locale,'-',1))=$3
                  AND lower(b.locale)<>'und'
                  AND r.baseline_id=b.id
               FOR UPDATE OF b`,
              [baselineId, documentId, destinationLanguage, body.baselineRevisionId],
          );
          baseline = result.rows[0];
          if (!baseline) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "Shared and Adapted bindings require an explicit neutral baseline in the same language." });
            return;
          }
          if (body.expectedActiveBaselineRevisionId !== undefined
            && String(baseline.active_revision_id) !== body.expectedActiveBaselineRevisionId) {
            await client.query("ROLLBACK");
            res.status(409).json({
              error: "The reusable baseline changed after comparison. Reload its differences before reusing it.",
            });
            return;
          }
          if (!await sourceMarketAllowed(
            client, transactionAuth, documentId, baseline, "edit", options.canAccessEditionTarget,
            { market: lockedMarket, locale: body.locale },
          )) {
            await client.query("ROLLBACK");
            res.status(403).json({ error: "You are not assigned to the shared baseline source market." });
            return;
          }
        }
        let translationSourceRevisionId: string | null = null;
        if (body.mode !== "independent" && body.translationSourceRevisionId) {
          const translationSource = await client.query(
            `SELECT revision.id,COALESCE(revision.governing_source_revision_id,revision.source_revision_id) baseline_source_revision_id,
                    source_edition.market source_market,source_edition.locale source_locale
               FROM cms_shared_baseline_revisions revision
               JOIN cms_shared_baselines source_baseline ON source_baseline.id=revision.baseline_id
               LEFT JOIN cms_revisions source_revision ON source_revision.id=COALESCE(revision.governing_source_revision_id,revision.source_revision_id)
               LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
               WHERE revision.id=$1 AND source_baseline.document_id=$2
                AND source_baseline.active_revision_id=revision.id`,
            [body.translationSourceRevisionId, documentId],
          );
          if (!translationSource.rows[0] || !await sourceMarketAllowed(
            client, transactionAuth, documentId, translationSource.rows[0], "edit", options.canAccessEditionTarget,
          )) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "The translation source revision is not an authorized baseline for this document." });
            return;
          }
          translationSourceRevisionId = String(translationSource.rows[0].id);
        }
        let independent: Record<string, any> | undefined;
        if (body.mode === "independent") {
          const result = await client.query(
            `SELECT r.id,r.payload,r.workflow_state,e.id edition_id
               FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id
              WHERE r.id=$1 AND e.document_id=$2 AND e.market=$3 AND e.locale=$4`,
            [body.independentRevisionId, documentId, lockedMarket, body.locale],
          );
          independent = result.rows[0];
          const validation = independent && validateCmsSnapshot(document.rows[0].kind, independent.payload, "draft");
          if (!independent || !validation?.success) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "Independent binding requires an exact valid destination revision." });
            return;
          }
        }
        const binding = body.version === 0
          ? await client.query(
            `INSERT INTO cms_market_edition_bindings(document_id,market_edition_id,locale,mode,baseline_id,
                                                      based_on_baseline_revision_id,translation_source_revision_id,override_operations,version,
                                                      translation_state,updated_by_user_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,'[]'::jsonb,1,
                     CASE WHEN $4='independent' THEN 'not-applicable' ELSE 'current' END,$8)
             ON CONFLICT (document_id,market_edition_id,locale) DO NOTHING
             RETURNING *`,
            [documentId, body.marketEditionId, body.locale, body.mode, baseline?.id ?? null,
              baseline?.revision_id ?? null, translationSourceRevisionId, transactionAuth.user.id],
          )
          : await client.query(
            `UPDATE cms_market_edition_bindings binding
                SET mode=$2,baseline_id=$3,based_on_baseline_revision_id=$4,
                    translation_source_revision_id=CASE
                      WHEN binding.baseline_id=$3
                      THEN COALESCE($5,binding.translation_source_revision_id)
                      ELSE $5 END,
                    override_operations=CASE WHEN $2='adapted'
                      AND binding.based_on_baseline_revision_id=$4
                      THEN binding.override_operations ELSE '[]'::jsonb END,
                    held_baseline_revision_id=NULL,
                    translation_state=CASE WHEN $2='independent' THEN 'not-applicable'
                      WHEN $5 IS NOT NULL THEN 'current'
                      ELSE binding.translation_state END,
                    version=binding.version+1,updated_by_user_id=$6,updated_at=now()
              WHERE binding.id=$1 AND binding.version=$7
              RETURNING binding.*`,
            [existingBinding.id, body.mode, baseline?.id ?? null, baseline?.revision_id ?? null,
              translationSourceRevisionId, transactionAuth.user.id, body.version],
          );
        if (!binding.rows[0]) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "This market edition was bound concurrently; reopen it before saving." });
          return;
        }
        const saved = binding.rows[0]!;
        if (baseline && materializesSharedDestination) {
          const snapshot = body.mode === "adapted"
            ? applySharedOverrideOperations(baseline.snapshot, (saved.override_operations ?? []) as any)
            : baseline.snapshot;
          const validation = validateCmsSnapshot(document.rows[0].kind, snapshot, "draft");
          if (!validation.success) {
            await client.query("ROLLBACK");
            res.status(422).json({ error: "The baseline does not satisfy this document's content contract.", details: validation.errors });
            return;
          }
          const revisionId = await materializeSharedMarketRevision(client, {
            documentId, market: lockedMarket, locale: body.locale, snapshot: validation.data, baselineRevisionId: String(baseline.revision_id),
            bindingId: String(saved.id), userId: transactionAuth.user.id,
            mediaReferences: mediaPinsForSnapshot(snapshot, String(document.rows[0].kind), baseline.media_references ?? []),
          });
          await client.query(
            `UPDATE cms_market_edition_bindings
                SET materialized_revision_id=$2 WHERE id=$1`,
            [saved.id, revisionId],
          );
          saved.materialized_revision_id = revisionId;
        } else if (independent) {
          const sealed = await client.query(
            `SELECT binding_id::text FROM cms_resolved_market_revisions
              WHERE cms_revision_id=$1 FOR KEY SHARE`,
            [independent.id],
          );
          if (sealed.rows[0] && String(sealed.rows[0].binding_id) !== String(saved.id)) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "The selected independent revision is already sealed to another market binding." });
            return;
          }
          const pins = await client.query(
            `SELECT asset_id "assetId",media_version_id "mediaVersionId"
               FROM cms_media_references
              WHERE document_id=$1 AND field_path=$2 AND media_version_id IS NOT NULL`,
            [documentId, `revision:${independent.id}`],
          );
          const independentMediaReferences = mediaPinsForSnapshot(
            independent.payload,
            String(document.rows[0].kind),
            pins.rows,
          );
          await assertExactImmutableMediaPins(client, independentMediaReferences);
          await client.query(
            `INSERT INTO cms_resolved_market_revisions(binding_id,cms_revision_id,baseline_revision_id,
                                                        snapshot,media_references,content_digest)
             VALUES ($1,$2,NULL,$3,$4,$5)
             ON CONFLICT (cms_revision_id) DO NOTHING`,
            [saved.id, independent.id, independent.payload,
              JSON.stringify(independentMediaReferences),
              digest(independent.payload)],
          );
          await client.query(
            `UPDATE cms_market_edition_bindings SET materialized_revision_id=$2 WHERE id=$1`,
            [saved.id, independent.id],
          );
          saved.materialized_revision_id = independent.id;
        }
        await audit(transactionAuth, "shared-market-bound", "document", documentId,
          { bindingId: saved.id, mode: body.mode, market: lockedMarket, locale: body.locale }, client);
        await client.query("COMMIT");
        res.json(mapBinding(saved));
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof InvalidImmutableMediaPinsError) {
          res.status(422).json({ error: error.message });
          return;
        }
        throw error;
      } finally { client.release(); }
    }),
  );

  router.put("/documents/:documentId/shared-market/bindings/:bindingId/overrides",
    options.requireCsrf, asyncRoute(async (req, res) => {
      const parsed = SaveSharedMarketOverridesBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid sparse overrides.", details: parsed.error.issues });
        return;
      }
      const documentId = String(req.params.documentId);
      const bindingId = String(req.params.bindingId);
      // Orval's Zod object parser intentionally strips unspecified object
      // keys. Array additions are authored content, however, so preserve the
      // validated request values rather than reducing every added object to
      // its stable `id`.
      const operations = Array.isArray(req.body?.operations)
        ? req.body.operations as SharedOverrideOperation[]
        : parsed.data.operations as SharedOverrideOperation[];
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        if (!await lockDocumentForMutation(client, documentId)) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Document not found." });
          return;
        }
        const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext);
        if (!auth) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "Authentication is no longer valid." });
          return;
        }
        const preflight = await client.query(
          `SELECT market.code market,binding.locale
             FROM cms_market_edition_bindings binding
             JOIN market_editions market ON market.id=binding.market_edition_id
            WHERE binding.id=$1 AND binding.document_id=$2`,
          [bindingId, documentId],
        );
        if (!preflight.rows[0] || !await lockManagedExactEdition(
          client,
          documentId,
          String(preflight.rows[0].market),
          String(preflight.rows[0].locale),
        )) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The managed binding has no exact edition to mutate." });
          return;
        }
        const bindingResult = await client.query(
          `SELECT binding.*,market.code market,document.kind document_kind,
                  COALESCE(adopted_revision.governing_source_revision_id,adopted_revision.source_revision_id) baseline_source_revision_id,
                  source_edition.market source_market,source_edition.locale source_locale
             FROM cms_market_edition_bindings binding
             JOIN market_editions market ON market.id=binding.market_edition_id
             JOIN cms_documents document ON document.id=binding.document_id
              LEFT JOIN cms_shared_baseline_revisions adopted_revision
                ON adopted_revision.id=binding.based_on_baseline_revision_id
              LEFT JOIN cms_revisions source_revision ON source_revision.id=COALESCE(adopted_revision.governing_source_revision_id,adopted_revision.source_revision_id)
              LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
             WHERE binding.id=$1 AND binding.document_id=$2 FOR UPDATE OF binding`,
          [bindingId, documentId],
        );
        const binding = bindingResult.rows[0];
        if (!binding) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "Shared-market binding not found." });
          return;
        }
        if (!await options.canAccessEditionTarget(
          client, auth, documentId, String(binding.market), String(binding.locale), "edit",
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to this market." });
          return;
        }
        if (!await sourceMarketAllowed(
          client, auth, documentId, binding, "edit", options.canAccessEditionTarget,
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to the shared baseline source market." });
          return;
        }
        if (binding.mode !== "adapted" || Number(binding.version) !== parsed.data.version) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Only the current Adapted binding can accept these overrides." });
          return;
        }
        if (String(binding.based_on_baseline_revision_id) !== parsed.data.baselineRevisionId) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Overrides must be authored against this binding's exact adopted baseline revision." });
          return;
        }
        const baseline = await client.query(
         `SELECT r.id,r.snapshot,r.media_references
              FROM cms_shared_baselines b
              JOIN cms_shared_baseline_revisions r ON r.id=$3
             WHERE b.id=$1 AND b.locale=$2 AND r.id=$3 AND r.baseline_id=b.id`,
           [binding.baseline_id, binding.locale, parsed.data.baselineRevisionId],
        );
        if (!baseline.rows[0]) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The selected baseline revision is no longer this binding's adopted revision." });
          return;
        }
        let snapshot: Record<string, unknown>;
        try {
          snapshot = applySharedOverrideOperations(
            baseline.rows[0].snapshot,
            operations,
          );
        } catch (error) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: error instanceof Error ? error.message : "Unsupported structural override." });
          return;
        }
        const validation = validateCmsSnapshot(binding.document_kind as any, snapshot, "draft");
        if (!validation.success) {
          await client.query("ROLLBACK");
          res.status(422).json({ error: "Resolved adaptations fail the content contract.", details: validation.errors });
          return;
        }
        const revisionId = await materializeSharedMarketRevision(client, {
          documentId, market: String(binding.market), locale: String(binding.locale), snapshot: validation.data,
          baselineRevisionId: String(baseline.rows[0].id), bindingId, userId: auth.user.id,
          mediaReferences: mediaPinsForSnapshot(
            snapshot,
            String(binding.document_kind),
            baseline.rows[0].media_references ?? [],
          ),
        });
        const updated = await client.query(
          `UPDATE cms_market_edition_bindings
               SET override_operations=$2,materialized_revision_id=$3,
                   mode=CASE WHEN jsonb_array_length($2::jsonb)=0 THEN 'shared' ELSE 'adapted' END,
                   version=version+1,updated_by_user_id=$4,updated_at=now()
            WHERE id=$1 RETURNING *`,
           [bindingId, JSON.stringify(operations), revisionId, auth.user.id],
        );
        await audit(auth, "shared-market-overrides-saved", "document", documentId,
          { bindingId, operationCount: operations.length }, client);
        await client.query("COMMIT");
        res.json(mapBinding(updated.rows[0]!));
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof InvalidImmutableMediaPinsError) {
          res.status(422).json({ error: error.message });
          return;
        }
        throw error;
      } finally { client.release(); }
    }),
  );

  router.get("/documents/:documentId/shared-market/bindings/:bindingId/compare",
    asyncRoute(async (req, res) => {
      const documentId = String(req.params.documentId);
      const bindingId = String(req.params.bindingId);
      const result = await pool.query(
        `SELECT binding.*,target.code market,current_revision.id current_id,
                 current_revision.snapshot current_snapshot,previous_revision.id previous_id,previous_revision.snapshot previous_snapshot,
                  resolved.baseline_revision_id local_baseline_revision_id,resolved.snapshot local_snapshot,
                 source_edition.market current_source_market,source_edition.locale current_source_locale,
                 adopted_source_edition.market adopted_source_market,adopted_source_edition.locale adopted_source_locale,
                 resolved_source_edition.market local_source_market,resolved_source_edition.locale local_source_locale
           FROM cms_market_edition_bindings binding
           JOIN market_editions target ON target.id=binding.market_edition_id
           JOIN cms_shared_baselines base ON base.id=binding.baseline_id
           JOIN cms_shared_baseline_revisions current_revision ON current_revision.id=base.active_revision_id
           LEFT JOIN cms_shared_baseline_revisions previous_revision
             ON previous_revision.id=binding.based_on_baseline_revision_id
           LEFT JOIN cms_resolved_market_revisions resolved
             ON resolved.cms_revision_id=binding.materialized_revision_id
           LEFT JOIN cms_revisions source_revision
             ON source_revision.id=COALESCE(current_revision.governing_source_revision_id,current_revision.source_revision_id)
           LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
             LEFT JOIN cms_revisions adopted_source_revision
               ON adopted_source_revision.id=COALESCE(previous_revision.governing_source_revision_id,previous_revision.source_revision_id)
            LEFT JOIN cms_market_editions adopted_source_edition ON adopted_source_edition.id=adopted_source_revision.edition_id
            LEFT JOIN cms_shared_baseline_revisions resolved_baseline
              ON resolved_baseline.id=resolved.baseline_revision_id
           LEFT JOIN cms_revisions resolved_source_revision
             ON resolved_source_revision.id=COALESCE(resolved_baseline.governing_source_revision_id,resolved_baseline.source_revision_id)
            LEFT JOIN cms_market_editions resolved_source_edition ON resolved_source_edition.id=resolved_source_revision.edition_id
          WHERE binding.id=$1 AND binding.document_id=$2`,
        [bindingId, documentId],
      );
      const row = result.rows[0];
      if (!row) {
        res.status(404).json({ error: "Shared-market binding not found." });
        return;
      }
      const auth = res.locals.auth as AuthContext;
       const requiredLineages = [
         [row.current_id, row.current_source_market, row.current_source_locale],
         [row.previous_id, row.adopted_source_market, row.adopted_source_locale],
         [row.local_baseline_revision_id, row.local_source_market, row.local_source_locale],
       ].filter((lineage): lineage is [string, string | null, string | null] => typeof lineage[0] === "string");
      if (!await options.canAccessEditionTarget(
        pool, auth, documentId, String(row.market), String(row.locale), "view",
       ) || !(await Promise.all(requiredLineages.map(([revisionId, market, locale]) =>
         sourceMarketAllowed(pool, auth, documentId, {
           baseline_revision_id: revisionId, source_market: market, source_locale: locale,
         }, "view", options.canAccessEditionTarget),
       ))).every(Boolean)) {
        res.status(403).json({ error: "You are not assigned to this shared-market binding and source." });
        return;
      }
      const comparison = mergeSharedBaselineUpdate(
        row.previous_snapshot ?? row.current_snapshot,
        row.current_snapshot,
        row.override_operations ?? [],
      );
      res.json({
        binding: mapBinding(row),
        baselineRevisionId: String(row.current_id),
        previousSnapshot: row.previous_snapshot ?? row.current_snapshot,
        currentSnapshot: row.current_snapshot,
        localSnapshot: row.local_snapshot ?? row.previous_snapshot ?? row.current_snapshot,
        mergedSnapshot: comparison.snapshot,
        conflicts: comparison.conflicts,
        canAutoAdopt: comparison.conflicts.length === 0,
      });
    }),
  );

  router.post("/documents/:documentId/shared-market/bindings/:bindingId/resolve",
    options.requireCsrf, asyncRoute(async (req, res) => {
      const parsed = ResolveSharedMarketBaselineUpdateBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid baseline resolution.", details: parsed.error.issues });
        return;
      }
      const documentId = String(req.params.documentId);
      const bindingId = String(req.params.bindingId);
      const action = parsed.data.action;
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
          res.status(403).json({ error: "Authentication is no longer valid." });
          return;
        }
        const preflight = await client.query(
          `SELECT market.code market,binding.locale
             FROM cms_market_edition_bindings binding
             JOIN market_editions market ON market.id=binding.market_edition_id
            WHERE binding.id=$1 AND binding.document_id=$2`,
          [bindingId, documentId],
        );
        if (!preflight.rows[0] || !await lockManagedExactEdition(
          client,
          documentId,
          String(preflight.rows[0].market),
          String(preflight.rows[0].locale),
        )) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The managed binding has no exact edition to mutate." });
          return;
        }
        const bindingResult = await client.query(
          `SELECT binding.*,target.code market,document.kind document_kind,
                  adopted.snapshot adopted_snapshot,adopted.media_references adopted_media_references,
                  resolved.snapshot local_snapshot,resolved.media_references local_media_references,
                  COALESCE(adopted.governing_source_revision_id,adopted.source_revision_id) baseline_source_revision_id,
                  source_edition.market source_market,source_edition.locale source_locale
             FROM cms_market_edition_bindings binding
             JOIN market_editions target ON target.id=binding.market_edition_id
             JOIN cms_documents document ON document.id=binding.document_id
             LEFT JOIN cms_shared_baseline_revisions adopted ON adopted.id=binding.based_on_baseline_revision_id
             LEFT JOIN cms_resolved_market_revisions resolved
               ON resolved.binding_id=binding.id AND resolved.cms_revision_id=binding.materialized_revision_id
             LEFT JOIN cms_revisions source_revision ON source_revision.id=COALESCE(adopted.governing_source_revision_id,adopted.source_revision_id)
             LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
            WHERE binding.id=$1 AND binding.document_id=$2
            FOR UPDATE OF binding`,
          [bindingId, documentId],
        );
        const binding = bindingResult.rows[0];
        if (!binding || binding.mode === "independent" || Number(binding.version) !== parsed.data.version) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The binding changed, is independent, or has no baseline to resolve." });
          return;
        }
        if (!await options.canAccessEditionTarget(
          client, transactionAuth, documentId, String(binding.market), String(binding.locale), "edit",
        ) || !await sourceMarketAllowed(
          client, transactionAuth, documentId, binding, "edit", options.canAccessEditionTarget,
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to this shared-market binding and source." });
          return;
        }
        const targetResult = await client.query(
          `SELECT revision.id,revision.snapshot,revision.media_references,
                  COALESCE(revision.governing_source_revision_id,revision.source_revision_id) baseline_source_revision_id,
                  source_edition.market source_market,source_edition.locale source_locale
             FROM cms_shared_baselines baseline
             JOIN cms_shared_baseline_revisions revision ON revision.id=$3
             LEFT JOIN cms_revisions source_revision ON source_revision.id=COALESCE(revision.governing_source_revision_id,revision.source_revision_id)
             LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
            WHERE baseline.id=$1 AND baseline.document_id=$2 AND revision.baseline_id=baseline.id
            FOR UPDATE OF baseline`,
          [binding.baseline_id, documentId, parsed.data.baselineRevisionId],
        );
        const target = targetResult.rows[0];
        if (!target) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The requested baseline revision is not available to resolve this binding." });
          return;
        }
        if (!await sourceMarketAllowed(
          client, transactionAuth, documentId, target, "edit", options.canAccessEditionTarget,
        )) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to the requested baseline source market." });
          return;
        }
        const current = await client.query(
          "SELECT active_revision_id FROM cms_shared_baselines WHERE id=$1 FOR UPDATE",
          [binding.baseline_id],
        );
        if (String(current.rows[0]?.active_revision_id) !== String(target.id)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "Only the currently active baseline revision can be resolved." });
          return;
        }
        let snapshot: Record<string, unknown>;
        let mediaReferences: Array<Record<string, unknown>>;
        let nextMode = binding.mode;
        let nextBaselineId: string | null = binding.baseline_id;
        let nextBasedOn: string | null = binding.based_on_baseline_revision_id;
        let nextOperations = binding.override_operations ?? [];
        let nextHeld: string | null = null;
        if (action === "adopt") {
          const resolvedUpdate = resolveSharedBaselineUpdate(
            binding.adopted_snapshot,
            target.snapshot,
            binding.override_operations ?? [],
            parsed.data.conflictDecisions ?? [],
          );
          if (!resolvedUpdate.success) {
            await client.query("ROLLBACK");
            res.status(409).json({
              error: resolvedUpdate.error,
              conflicts: resolvedUpdate.conflicts,
            });
            return;
          }
          snapshot = resolvedUpdate.snapshot;
          nextOperations = resolvedUpdate.operations;
          mediaReferences = mediaPinsForSnapshot(snapshot, String(binding.document_kind), target.media_references ?? []);
          nextBasedOn = String(target.id);
          nextMode = nextOperations.length ? "adapted" : "shared";
        } else if (action === "reset") {
          if ((parsed.data.conflictDecisions?.length ?? 0) > 0) {
            await client.query("ROLLBACK");
            res.status(400).json({ error: "Conflict decisions are only valid for an Adopt action." });
            return;
          }
          snapshot = target.snapshot;
          mediaReferences = mediaPinsForSnapshot(snapshot, String(binding.document_kind), target.media_references ?? []);
          nextBasedOn = String(target.id);
          nextOperations = [];
          nextMode = "shared";
        } else {
          if ((parsed.data.conflictDecisions?.length ?? 0) > 0) {
            await client.query("ROLLBACK");
            res.status(400).json({ error: "Conflict decisions are only valid for an Adopt action." });
            return;
          }
          if (!binding.local_snapshot) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "The current resolved market revision is unavailable. Reload before keeping or detaching it." });
            return;
          }
          snapshot = binding.local_snapshot;
          mediaReferences = mediaPinsForSnapshot(snapshot, String(binding.document_kind), binding.local_media_references ?? []);
          if (action === "keep") nextHeld = String(target.id);
          if (action === "detach") {
            nextMode = "independent";
            nextBaselineId = null;
            nextBasedOn = null;
            nextOperations = [];
          }
        }
        const validation = validateCmsSnapshot(binding.document_kind as any, snapshot, "draft");
        if (!validation.success) {
          await client.query("ROLLBACK");
          res.status(422).json({ error: "Resolved binding fails the content contract.", details: validation.errors });
          return;
        }
        const revisionId = await materializeSharedMarketRevision(client, {
          documentId,
          market: String(binding.market),
          locale: String(binding.locale),
          snapshot: validation.data,
          baselineRevisionId: nextBasedOn,
          bindingId,
          userId: transactionAuth.user.id,
          mediaReferences,
        });
        const update = await client.query(
          `UPDATE cms_market_edition_bindings
              SET mode=$2,baseline_id=$3,based_on_baseline_revision_id=$4,
                  override_operations=$5,held_baseline_revision_id=$6,
                  materialized_revision_id=$7,
                  translation_state=CASE WHEN $2='independent' THEN 'not-applicable'
                    WHEN translation_state='stale' THEN 'stale' ELSE 'current' END,
                  version=version+1,updated_by_user_id=$8,updated_at=now()
            WHERE id=$1 RETURNING *`,
          [bindingId, nextMode, nextBaselineId, nextBasedOn, JSON.stringify(nextOperations), nextHeld, revisionId, transactionAuth.user.id],
        );
        await audit(transactionAuth, "shared-market-baseline-resolved", "document", documentId,
          { bindingId, action, baselineRevisionId: target.id, materializedRevisionId: revisionId }, client);
        await client.query("COMMIT");
        res.json(mapBinding(update.rows[0]!));
      } catch (error) {
        await client.query("ROLLBACK");
        if (error instanceof InvalidImmutableMediaPinsError) {
          res.status(422).json({ error: error.message });
          return;
        }
        throw error;
      } finally {
        client.release();
      }
    }),
  );

  router.post("/documents/:documentId/shared-market/migration-report", options.requireCsrf,
    asyncRoute(async (req, res) => {
      const parsed = ReportSharedMarketMigrationBody.safeParse(req.body);
      if (!parsed.success) {
        res.status(400).json({ error: "Invalid migration report request." });
        return;
      }
      const documentId = String(req.params.documentId);
      const candidates = await pool.query(
        `SELECT e.id edition_id,e.market,e.locale,e.published_revision_id
           FROM cms_market_editions e WHERE e.document_id=$1 AND e.market<>'shared-source'`,
        [documentId],
      );
      const auth = res.locals.auth as AuthContext;
      if (!(await Promise.all(candidates.rows.map((row) => options.canAccessEditionTarget(
        pool, auth, documentId, String(row.market), String(row.locale), "view",
      )))).every(Boolean)) {
        res.status(403).json({ error: "You are not authorized to view every exact edition in this report." });
        return;
      }
      const report = {
        dryRun: parsed.data.dryRun,
        receiptId: null as string | null,
        candidates: candidates.rows.map((row) => ({
          editionId: String(row.edition_id), market: row.market, locale: row.locale,
          publishedRevisionId: row.published_revision_id ? String(row.published_revision_id) : null,
        })),
        notes: ["No source was selected, promoted, copied, or published by this report."],
      };
      if (!parsed.data.dryRun) {
        const receipt = await pool.query(
          `INSERT INTO cms_shared_edition_migration_receipts(document_id,requested_by_user_id,dry_run,report)
           VALUES ($1,$2,false,$3) RETURNING id`,
          [documentId, res.locals.auth.user.id, report],
        );
        report.receiptId = String(receipt.rows[0]!.id);
      }
      await audit(res.locals.auth, "shared-market-migration-reported", "document", documentId,
        { dryRun: report.dryRun, candidateCount: report.candidates.length });
      res.json(report);
    }),
  );
}
