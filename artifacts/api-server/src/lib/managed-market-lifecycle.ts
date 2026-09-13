import { createHash } from "node:crypto";
import {
  collectCmsMediaReferences,
  sparseOverridesForResolvedSnapshot,
  type CmsDocumentKind,
} from "@workspace/api-zod";
import type { Queryable } from "./cms";

export { sparseOverridesForResolvedSnapshot } from "@workspace/api-zod";

type Binding = {
  id: string;
  mode: "shared" | "adapted" | "independent";
  baseline_id: string | null;
  baseline_revision_id: string | null;
  based_on_baseline_revision_id: string | null;
  materialized_revision_id: string | null;
  override_operations: unknown;
};

const digest = (snapshot: unknown) =>
  createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

async function bindingForEdition(
  client: Queryable,
  documentId: string,
  market: string,
  locale: string,
): Promise<Binding | null> {
  const result = await client.query(
    `SELECT binding.id::text,binding.mode,binding.baseline_id,
            binding.based_on_baseline_revision_id,binding.materialized_revision_id,
            binding.override_operations
       FROM cms_market_edition_bindings binding
       JOIN market_editions destination ON destination.id=binding.market_edition_id
      WHERE binding.document_id=$1 AND destination.code=$2 AND binding.locale=$3
      FOR UPDATE OF binding`,
    [documentId, market, locale],
  );
  return result.rows[0] ?? null;
}

async function pinnedManifest(
  client: Queryable,
  documentId: string,
  revisionId: string,
) {
  const references = await client.query(
    `SELECT DISTINCT asset_id::text "assetId",media_version_id::text "mediaVersionId"
       FROM cms_media_references
      WHERE document_id=$1 AND field_path=$2 AND media_version_id IS NOT NULL
      ORDER BY "assetId","mediaVersionId"`,
    [documentId, `revision:${revisionId}`],
  );
  return references.rows;
}

/**
 * Connect a normal exact-edition save to its managed-market binding.  The
 * resolved row records the result and its pins once; later draft saves move
 * only the mutable binding pointer.  In particular, it never reads the active
 * baseline, because doing so would reinterpret an adopted historical lineage.
 */
export async function synchronizeManagedMarketRevision(
  client: Queryable,
  input: {
    documentId: string;
    market: string;
    locale: string;
    revisionId: string;
    snapshot: Record<string, unknown>;
    kind: CmsDocumentKind;
    userId: string;
    sourceRevisionId?: string;
  },
) {
  const binding = await bindingForEdition(client, input.documentId, input.market, input.locale);
  if (!binding) return null;

  const sourceResolved = input.sourceRevisionId
    ? await client.query(
      `SELECT baseline_revision_id::text
         FROM cms_resolved_market_revisions
        WHERE binding_id=$1 AND cms_revision_id=$2`,
      [binding.id, input.sourceRevisionId],
    )
    : { rows: [] as Array<{ baseline_revision_id: string | null }> };
  const historicalBaselineRevisionId = sourceResolved.rows[0]?.baseline_revision_id ?? null;
  let mode = historicalBaselineRevisionId === null && sourceResolved.rows.length
    ? "independent" as const
    : binding.mode;
  let operations: unknown = [];
  let baselineRevisionId: string | null = null;
  if (mode !== "independent") {
    // The binding's adopted revision, rather than its baseline's current
    // revision, is the only valid parent for this saved history.
    const adoptedBaselineRevisionId = historicalBaselineRevisionId
      ?? binding.based_on_baseline_revision_id;
    if (!adoptedBaselineRevisionId) {
      throw new Error("Managed shared-market binding has no adopted baseline revision.");
    }
    const adopted = await client.query(
      `SELECT snapshot FROM cms_shared_baseline_revisions
        WHERE id=$1 AND baseline_id=$2`,
      [adoptedBaselineRevisionId, binding.baseline_id],
    );
    if (!adopted.rows[0]?.snapshot) {
      throw new Error("Managed shared-market adopted baseline is unavailable.");
    }
    baselineRevisionId = adoptedBaselineRevisionId;
    operations = sparseOverridesForResolvedSnapshot(adopted.rows[0].snapshot, input.snapshot);
    mode = (operations as unknown[]).length ? "adapted" : "shared";
  }

  const existing = await client.query(
    `SELECT binding_id::text FROM cms_resolved_market_revisions
      WHERE cms_revision_id=$1 FOR KEY SHARE`,
    [input.revisionId],
  );
  if (existing.rowCount && String(existing.rows[0].binding_id) !== binding.id) {
    throw new Error("This revision is already sealed to another market binding.");
  }
  const manifest = await pinnedManifest(client, input.documentId, input.revisionId);
  if (!existing.rowCount) {
    await client.query(
      `INSERT INTO cms_resolved_market_revisions
        (binding_id,cms_revision_id,baseline_revision_id,snapshot,media_references,content_digest)
       VALUES ($1,$2,$3,$4,$5,$6)`,
       [binding.id, input.revisionId, baselineRevisionId, input.snapshot, JSON.stringify(manifest), digest(input.snapshot)],
    );
  }
  await client.query(
    `UPDATE cms_market_edition_bindings
        SET mode=$2,baseline_id=CASE WHEN $2='independent' THEN NULL ELSE baseline_id END,
            based_on_baseline_revision_id=$6,override_operations=$3,materialized_revision_id=$4,
            version=version+1,updated_by_user_id=$5,updated_at=now()
      WHERE id=$1`,
    [binding.id, mode, JSON.stringify(operations), input.revisionId, input.userId, baselineRevisionId],
  );
  return { bindingId: binding.id, mode, baselineRevisionId };
}

export async function ensureManagedMarketRevision(
  client: Queryable,
  input: Parameters<typeof synchronizeManagedMarketRevision>[1],
) {
  const binding = await bindingForEdition(client, input.documentId, input.market, input.locale);
  if (!binding) return null;
  const resolved = await client.query(
    `SELECT 1 FROM cms_resolved_market_revisions
      WHERE binding_id=$1 AND cms_revision_id=$2`,
    [binding.id, input.revisionId],
  );
  if (binding.materialized_revision_id === input.revisionId && resolved.rowCount) {
    return { bindingId: binding.id, mode: binding.mode };
  }
  return synchronizeManagedMarketRevision(client, input);
}

/**
 * A managed destination can be published only from its current immutable
 * materialization.  The ordinary media gate remains the authority for asset
 * approval; this guard prevents an otherwise approved arbitrary exact revision
 * from taking over a binding.
 */
export async function assertManagedMarketPublication(
  client: Queryable,
  input: { documentId: string; market: string; locale: string; revisionId: string },
) {
  const binding = await bindingForEdition(client, input.documentId, input.market, input.locale);
  if (!binding) return null;
  const resolved = await client.query(
    `SELECT resolved.snapshot=revision.payload AS snapshot_matches,
            resolved.media_references,revision.payload,document.kind
       FROM cms_resolved_market_revisions resolved
       JOIN cms_revisions revision ON revision.id=resolved.cms_revision_id
        JOIN cms_market_editions edition ON edition.id=revision.edition_id
        JOIN cms_documents document ON document.id=edition.document_id
      WHERE resolved.binding_id=$1 AND resolved.cms_revision_id=$2`,
    [binding.id, input.revisionId],
  );
  if (
    binding.materialized_revision_id !== input.revisionId
    || !resolved.rowCount
    || !resolved.rows[0].snapshot_matches
  ) {
    throw new Error(
      "This managed market revision is not the binding's current immutable materialization.",
    );
  }
  const snapshot = resolved.rows[0].payload as Record<string, unknown>;
  const expected = collectCmsMediaReferences(
    resolved.rows[0].kind as CmsDocumentKind,
    snapshot.content,
    Array.isArray(snapshot.mediaIds) ? snapshot.mediaIds : [],
  );
  const explicitPins = new Map<string, string>();
  for (const reference of expected) {
    if (!reference.mediaVersionId) continue;
    const prior = explicitPins.get(reference.mediaId);
    if (prior && prior !== reference.mediaVersionId) {
      throw new Error(
        `Managed market publication has conflicting immutable media pins for asset ${reference.mediaId}.`,
      );
    }
    explicitPins.set(reference.mediaId, reference.mediaVersionId);
  }
  const revisionReferences = await client.query(
    `SELECT asset_id::text "assetId",media_version_id::text "mediaVersionId"
       FROM cms_media_references
      WHERE document_id=$1 AND field_path=$2`,
    [input.documentId, `revision:${input.revisionId}`],
  );
  const actualPins = new Map<string, string>();
  for (const reference of revisionReferences.rows) {
    const assetId = reference.assetId;
    const mediaVersionId = reference.mediaVersionId;
    if (typeof assetId !== "string" || typeof mediaVersionId !== "string") {
      throw new Error("Managed market publication requires every referenced asset to have an immutable media pin.");
    }
    const prior = actualPins.get(assetId);
    if (prior && prior !== mediaVersionId) {
      throw new Error(`Managed market publication has conflicting stored media pins for asset ${assetId}.`);
    }
    actualPins.set(assetId, mediaVersionId);
  }
  const expectedAssetIds = new Set(expected.map((reference) => reference.mediaId));
  if (
    expectedAssetIds.size !== actualPins.size
    || [...expectedAssetIds].some((assetId) => !actualPins.has(assetId))
    || [...explicitPins].some(([assetId, versionId]) => actualPins.get(assetId) !== versionId)
  ) {
    throw new Error("Managed market immutable media references do not exactly match the revision snapshot.");
  }
  const manifest = resolved.rows[0].media_references;
  if (!Array.isArray(manifest)) {
    throw new Error("Managed market immutable media manifest is invalid.");
  }
  const manifestPins = new Map<string, string>();
  for (const entry of manifest) {
    const assetId = entry?.assetId;
    const mediaVersionId = entry?.mediaVersionId;
    if (typeof assetId !== "string" || typeof mediaVersionId !== "string") {
      throw new Error("Managed market immutable media manifest contains an unpinned asset.");
    }
    const prior = manifestPins.get(assetId);
    if (prior) {
      throw new Error(`Managed market immutable media manifest duplicates asset ${assetId}.`);
    }
    manifestPins.set(assetId, mediaVersionId);
  }
  if (
    manifestPins.size !== actualPins.size
    || [...actualPins].some(([assetId, versionId]) => manifestPins.get(assetId) !== versionId)
  ) {
    throw new Error("Managed market immutable media manifest does not match the revision media pins.");
  }
  return binding.id;
}