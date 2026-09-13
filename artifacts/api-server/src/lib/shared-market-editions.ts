import { createHash } from "node:crypto";
import type { IRouter } from "express";
import { pool } from "@workspace/db";
import {
  BindSharedMarketEditionBody,
  CompareSharedMarketBaselineParams,
  EstablishSharedMarketBaselineBody,
  ReportSharedMarketMigrationBody,
  ResolveSharedMarketBaselineUpdateBody,
  SaveSharedMarketOverridesBody,
  applySharedOverrideOperations,
  collectCmsMediaReferences,
  mergeSharedBaselineUpdate,
  resolveSharedBaselineUpdate,
  type SharedOverrideOperation,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { audit, type Queryable } from "./cms";
import type { AuthContext } from "./auth";
import { asyncRoute } from "./http";
import {
  lockDocumentForMutation,
  revalidateMutationAuth,
} from "./managed-market-lifecycle";

type BindingRow = Record<string, any>;
const digest = (snapshot: unknown) => createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

class InvalidImmutableMediaPinsError extends Error {}

function mediaPinsForSnapshot(
  snapshot: Record<string, unknown>,
  kind: string,
  inherited: Array<Record<string, unknown>>,
) {
  const references = collectCmsMediaReferences(
    kind as any,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds.filter((id): id is string => typeof id === "string") : [],
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

function sourceMarketAllowed(auth: AuthContext, row: Record<string, any>, canAccessMarket: (auth: AuthContext, market: string) => boolean) {
  return typeof row.source_market === "string"
    && row.source_market.length > 0
    && canAccessMarket(auth, row.source_market);
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

async function materialize(
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
 * Register only additive shared-market routes. Existing People/contact routes,
 * availability state, and legacy shared-source pointers are intentionally not
 * read or modified here.
 */
export function registerSharedMarketEditionRoutes(
  router: IRouter,
  options: {
    canAccessMarket: (auth: AuthContext, market: string) => boolean;
    requireEditor: any;
    requireAdministrator: any;
    requireCsrf: any;
  },
) {
  router.get("/documents/:documentId/shared-market", asyncRoute(async (req, res) => {
    const documentId = String(req.params.documentId);
    const auth = res.locals.auth as AuthContext;
    const permittedMarkets = auth.user.role === "administrator" ? null : auth.user.marketCodes;
    const [baselines, bindings] = await Promise.all([
      pool.query(
        `SELECT b.id,b.document_id,b.locale,r.id revision_id,r.revision_number,r.source_revision_id,
                r.snapshot,r.media_references,b.created_at
           FROM cms_shared_baselines b
           JOIN cms_shared_baseline_revisions r ON r.id=b.active_revision_id
            LEFT JOIN cms_revisions source_revision ON source_revision.id=r.source_revision_id
            LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
           WHERE b.document_id=$1
             AND source_edition.market IS NOT NULL
             AND ($2::text[] IS NULL OR source_edition.market=ANY($2::text[]))
           ORDER BY b.locale`,
        [documentId, permittedMarkets],
      ),
      pool.query(
        `SELECT binding.*
           FROM cms_market_edition_bindings binding
           JOIN market_editions target ON target.id=binding.market_edition_id
           LEFT JOIN cms_shared_baseline_revisions adopted ON adopted.id=binding.based_on_baseline_revision_id
           LEFT JOIN cms_revisions source_revision ON source_revision.id=adopted.source_revision_id
           LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
          WHERE binding.document_id=$1
             AND ($2::text[] IS NULL OR target.code=ANY($2::text[]))
             AND (binding.mode='independent' OR (source_edition.market IS NOT NULL
               AND ($2::text[] IS NULL OR source_edition.market=ANY($2::text[]))))
          ORDER BY binding.locale,binding.market_edition_id`,
        [documentId, permittedMarkets],
      ),
    ]);
    res.json({
      baselines: baselines.rows.map((row) => ({
        id: String(row.id), documentId: String(row.document_id), locale: row.locale,
        revisionId: String(row.revision_id), revisionNumber: Number(row.revision_number),
        sourceRevisionId: row.source_revision_id ? String(row.source_revision_id) : null,
         snapshot: row.snapshot, mediaReferences: row.media_references ?? [],
        createdAt: row.created_at,
      })),
      bindings: bindings.rows.map(mapBinding),
    });
  }));

  router.post("/documents/:documentId/shared-market", options.requireCsrf, options.requireAdministrator,
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
        const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext, "administrator");
        if (!auth) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "Authentication is no longer valid." });
          return;
        }
        // A neutral baseline is a copy of an explicitly named real-market
        // historical revision. No legacy source is inferred or relocated.
        const source = await client.query(
         `SELECT d.kind,r.id,r.revision_number,r.payload,e.market
              FROM cms_revisions r
              JOIN cms_market_editions e ON e.id=r.edition_id
              JOIN cms_documents d ON d.id=e.document_id
            WHERE e.document_id=$1 AND r.id=$2 AND e.locale=$3
               AND e.market<>'shared-source' AND e.locale<>'und'
             FOR KEY SHARE OF r,e`,
          [documentId, body.sourceRevisionId, body.locale],
        );
        if (!source.rows[0]) {
          await client.query("ROLLBACK");
          res.status(404).json({ error: "The selected revision is not an exact source in this locale." });
          return;
        }
        const validation = validateCmsSnapshot(source.rows[0].kind, body.snapshot, "draft");
        if (!validation.success) {
          await client.query("ROLLBACK");
          res.status(422).json({ error: "The shared baseline does not satisfy this document's content contract.", details: validation.errors });
          return;
        }
        const exists = await client.query(
          `SELECT b.id,b.created_at,b.active_revision_id,r.revision_number
             FROM cms_shared_baselines b
             LEFT JOIN cms_shared_baseline_revisions r ON r.id=b.active_revision_id
             WHERE b.document_id=$1 AND b.locale=$2 FOR UPDATE OF b`,
          [documentId, body.locale],
        );
        if (exists.rows[0] && (body.expectedRevisionNumber === undefined ||
          Number(exists.rows[0].revision_number) !== body.expectedRevisionNumber)) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "The neutral baseline changed; reopen before saving a successor." });
          return;
        }
        const baseline = exists.rows[0] ? { rows: [exists.rows[0]] } : await client.query(
            `INSERT INTO cms_shared_baselines(document_id,locale,created_by_user_id)
             VALUES ($1,$2,$3) RETURNING id,created_at`,
            [documentId, body.locale, auth.user.id],
          );
        const pins = await client.query(
          `SELECT asset_id "assetId",media_version_id "mediaVersionId"
             FROM cms_media_references
            WHERE document_id=$1 AND field_path=$2 AND media_version_id IS NOT NULL`,
          [documentId, `revision:${body.sourceRevisionId}`],
        );
        const baselineMediaReferences = mediaPinsForSnapshot(
          validation.data,
          String(source.rows[0].kind),
          pins.rows,
        );
        await assertExactImmutableMediaPins(client, baselineMediaReferences);
        const revision = await client.query(
          `INSERT INTO cms_shared_baseline_revisions(baseline_id,revision_number,snapshot,media_references,
                                                      content_digest,source_revision_id,created_by_user_id)
           VALUES ($1,COALESCE((SELECT max(revision_number)+1 FROM cms_shared_baseline_revisions WHERE baseline_id=$1),1),
                   $2,$3,$4,$5,$6) RETURNING id,revision_number`,
            [baseline.rows[0]!.id, validation.data,
               JSON.stringify(baselineMediaReferences), digest(validation.data),
             body.sourceRevisionId, auth.user.id],
        );
        await client.query("UPDATE cms_shared_baselines SET active_revision_id=$2,updated_at=now() WHERE id=$1",
          [baseline.rows[0]!.id, revision.rows[0]!.id]);
        // Baseline edits never cascade into market drafts/live output. A hold
        // is an editor's explicit "keep this baseline" decision, not a marker
        // that every successor was automatically accepted or rejected.
        await client.query(
          `UPDATE cms_market_edition_bindings
               SET translation_state='stale',updated_at=now()
             WHERE document_id=$1 AND mode IN ('shared','adapted')
               AND translation_source_revision_id=$2`,
          [documentId, exists.rows[0]?.active_revision_id ?? null],
        );
        await audit(auth, "shared-baseline-established", "document", documentId,
          { locale: body.locale, sourceRevisionId: body.sourceRevisionId }, client);
        await client.query("COMMIT");
        res.status(201).json({
          id: String(baseline.rows[0]!.id), documentId, locale: body.locale,
          revisionId: String(revision.rows[0]!.id), revisionNumber: Number(revision.rows[0]!.revision_number),
          sourceRevisionId: body.sourceRevisionId, snapshot: validation.data,
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

  router.put("/documents/:documentId/shared-market/bindings", options.requireCsrf, options.requireEditor,
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
      if (!options.canAccessMarket(auth, market)) {
        res.status(403).json({ error: "You are not assigned to this market." });
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
        const transactionAuth = await revalidateMutationAuth(client, auth, "editor");
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
        if (!options.canAccessMarket(transactionAuth, lockedMarket)) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to this market." });
          return;
        }
        const document = await client.query("SELECT kind FROM cms_documents WHERE id=$1", [documentId]);
        if (["person", "site-configuration"].includes(String(document.rows[0].kind))) {
          await client.query("ROLLBACK");
          res.status(409).json({ error: "This document kind retains its dedicated market contract." });
          return;
        }
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
          `SELECT binding.*,source_edition.market source_market
             FROM cms_market_edition_bindings binding
             LEFT JOIN cms_shared_baseline_revisions adopted
               ON adopted.id=binding.based_on_baseline_revision_id
             LEFT JOIN cms_revisions source_revision ON source_revision.id=adopted.source_revision_id
             LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
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
          && !sourceMarketAllowed(transactionAuth, existingBinding, options.canAccessMarket)) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to the current shared baseline source market." });
          return;
        }
        if (existingBinding && existingBinding.mode !== "independent" && (
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
        let baseline: Record<string, any> | undefined;
        if (body.mode !== "independent") {
          const baselineId = body.baselineId ?? existingBinding?.baseline_id;
          const result = await client.query(
         `SELECT b.id,r.id revision_id,r.snapshot,r.media_references,
                 source_edition.market source_market
               FROM cms_shared_baselines b
                JOIN cms_shared_baseline_revisions r ON r.id=$4
                LEFT JOIN cms_revisions source_revision ON source_revision.id=r.source_revision_id
                LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
               WHERE b.id=$1 AND b.document_id=$2 AND b.locale=$3 AND r.baseline_id=b.id
               FOR UPDATE OF b`,
             [baselineId, documentId, body.locale, body.baselineRevisionId],
          );
          baseline = result.rows[0];
          if (!baseline) {
            await client.query("ROLLBACK");
            res.status(409).json({ error: "Shared and Adapted bindings require an explicit neutral baseline in this locale." });
            return;
          }
          if (!sourceMarketAllowed(transactionAuth, baseline, options.canAccessMarket)) {
            await client.query("ROLLBACK");
            res.status(403).json({ error: "You are not assigned to the shared baseline source market." });
            return;
          }
        }
        let translationSourceRevisionId: string | null = null;
        if (body.mode !== "independent" && body.translationSourceRevisionId) {
          const translationSource = await client.query(
            `SELECT revision.id,source_edition.market source_market
               FROM cms_shared_baseline_revisions revision
               JOIN cms_shared_baselines source_baseline ON source_baseline.id=revision.baseline_id
               LEFT JOIN cms_revisions source_revision ON source_revision.id=revision.source_revision_id
               LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
               WHERE revision.id=$1 AND source_baseline.document_id=$2
                AND source_baseline.active_revision_id=revision.id`,
            [body.translationSourceRevisionId, documentId],
          );
          if (!translationSource.rows[0] || !sourceMarketAllowed(transactionAuth, translationSource.rows[0], options.canAccessMarket)) {
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
        if (baseline) {
          const snapshot = body.mode === "adapted"
            ? applySharedOverrideOperations(baseline.snapshot, (saved.override_operations ?? []) as any)
            : baseline.snapshot;
          const validation = validateCmsSnapshot(document.rows[0].kind, snapshot, "draft");
          if (!validation.success) {
            await client.query("ROLLBACK");
            res.status(422).json({ error: "The baseline does not satisfy this document's content contract.", details: validation.errors });
            return;
          }
          const revisionId = await materialize(client, {
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
    options.requireCsrf, options.requireEditor, asyncRoute(async (req, res) => {
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
        const auth = await revalidateMutationAuth(client, res.locals.auth as AuthContext, "editor");
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
                 source_edition.market source_market
             FROM cms_market_edition_bindings binding
             JOIN market_editions market ON market.id=binding.market_edition_id
             JOIN cms_documents document ON document.id=binding.document_id
              LEFT JOIN cms_shared_baseline_revisions adopted_revision
                ON adopted_revision.id=binding.based_on_baseline_revision_id
              LEFT JOIN cms_revisions source_revision ON source_revision.id=adopted_revision.source_revision_id
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
        if (!options.canAccessMarket(auth, String(binding.market))) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to this market." });
          return;
        }
        if (!sourceMarketAllowed(auth, binding, options.canAccessMarket)) {
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
        const revisionId = await materialize(client, {
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
                current_revision.snapshot current_snapshot,previous_revision.snapshot previous_snapshot,
                 resolved.snapshot local_snapshot,
                 source_edition.market current_source_market,
                 adopted_source_edition.market adopted_source_market,
                 resolved_source_edition.market local_source_market
           FROM cms_market_edition_bindings binding
           JOIN market_editions target ON target.id=binding.market_edition_id
           JOIN cms_shared_baselines base ON base.id=binding.baseline_id
           JOIN cms_shared_baseline_revisions current_revision ON current_revision.id=base.active_revision_id
           LEFT JOIN cms_shared_baseline_revisions previous_revision
             ON previous_revision.id=binding.based_on_baseline_revision_id
           LEFT JOIN cms_resolved_market_revisions resolved
             ON resolved.cms_revision_id=binding.materialized_revision_id
           LEFT JOIN cms_revisions source_revision ON source_revision.id=current_revision.source_revision_id
           LEFT JOIN cms_market_editions source_edition ON source_edition.id=source_revision.edition_id
            LEFT JOIN cms_revisions adopted_source_revision ON adopted_source_revision.id=previous_revision.source_revision_id
            LEFT JOIN cms_market_editions adopted_source_edition ON adopted_source_edition.id=adopted_source_revision.edition_id
            LEFT JOIN cms_shared_baseline_revisions resolved_baseline
              ON resolved_baseline.id=resolved.baseline_revision_id
            LEFT JOIN cms_revisions resolved_source_revision ON resolved_source_revision.id=resolved_baseline.source_revision_id
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
      const requiredSources = [
        row.current_source_market,
        row.adopted_source_market,
        row.local_source_market,
      ].filter((market): market is string => typeof market === "string" && market.length > 0);
      if (!options.canAccessMarket(auth, String(row.market))
        || requiredSources.some((market) => !options.canAccessMarket(auth, market))) {
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
    options.requireCsrf, options.requireEditor, asyncRoute(async (req, res) => {
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
        const transactionAuth = await revalidateMutationAuth(client, auth, "editor");
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
                  source_edition.market source_market
             FROM cms_market_edition_bindings binding
             JOIN market_editions target ON target.id=binding.market_edition_id
             JOIN cms_documents document ON document.id=binding.document_id
             LEFT JOIN cms_shared_baseline_revisions adopted ON adopted.id=binding.based_on_baseline_revision_id
             LEFT JOIN cms_resolved_market_revisions resolved
               ON resolved.binding_id=binding.id AND resolved.cms_revision_id=binding.materialized_revision_id
             LEFT JOIN cms_revisions source_revision ON source_revision.id=adopted.source_revision_id
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
        if (!options.canAccessMarket(transactionAuth, String(binding.market))
          || !sourceMarketAllowed(transactionAuth, binding, options.canAccessMarket)) {
          await client.query("ROLLBACK");
          res.status(403).json({ error: "You are not assigned to this shared-market binding and source." });
          return;
        }
        const targetResult = await client.query(
          `SELECT revision.id,revision.snapshot,revision.media_references,
                  source_edition.market source_market
             FROM cms_shared_baselines baseline
             JOIN cms_shared_baseline_revisions revision ON revision.id=$3
             LEFT JOIN cms_revisions source_revision ON source_revision.id=revision.source_revision_id
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
        if (!sourceMarketAllowed(transactionAuth, target, options.canAccessMarket)) {
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
        const revisionId = await materialize(client, {
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
    options.requireAdministrator, asyncRoute(async (req, res) => {
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