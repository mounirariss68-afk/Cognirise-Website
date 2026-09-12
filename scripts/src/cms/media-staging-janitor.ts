import { objectStorageClient } from "./object-storage.js";

export const STAGING_ORPHAN_MARKER = "media.staging_orphan_marked";
export const DEFAULT_ABANDONED_AFTER_MS = 24 * 60 * 60 * 1_000;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StagingObject = {
  path: string;
  generation: string | null;
  updatedAt: Date | null;
};

export type StagingStorageAdapter = {
  stagingPrefix: string;
  listStagingObjects: () => Promise<StagingObject[]>;
  deleteStagingObject: (object: StagingObject) => Promise<void>;
};

type QueryResult = {
  rows: any[];
  rowCount?: number | null;
};

export type JanitorSqlClient = {
  query: (text: string, values?: unknown[]) => Promise<QueryResult>;
  release: () => void;
};

export type JanitorSqlPool = {
  query: (text: string, values?: unknown[]) => Promise<QueryResult>;
  connect: () => Promise<JanitorSqlClient>;
};

export type MediaStagingJanitorOptions = {
  apply?: boolean;
  now?: Date;
  abandonedAfterMs?: number;
};

export type JanitorItem = {
  path: string;
  assetId?: string;
  action: "candidate" | "reclaimed" | "retained" | "failed";
  reason: string;
};

export type MediaStagingJanitorReport = {
  mode: "dry-run" | "apply";
  cutoff: string;
  scannedObjects: number;
  scannedDatabaseRows: number;
  items: JanitorItem[];
};

type AssetRow = {
  asset_id: string;
  storage_key: string;
  status: string;
  updated_at: Date;
  has_versions: boolean;
  has_references: boolean;
  has_published_reference: boolean;
  janitor_marked: boolean;
};

const assetSnapshotSql = `
  SELECT a.id::text AS asset_id,a.storage_key,a.status,a.updated_at,
    EXISTS (
      SELECT 1 FROM cms_media_versions v WHERE v.asset_id=a.id
    ) AS has_versions,
    EXISTS (
      SELECT 1 FROM cms_media_references ref WHERE ref.asset_id=a.id
    ) AS has_references,
    EXISTS (
      SELECT 1
        FROM cms_market_editions e
        JOIN cms_revisions r
          ON r.id=e.published_revision_id AND r.edition_id=e.id
        CROSS JOIN LATERAL jsonb_array_elements_text(
          COALESCE(r.payload->'mediaIds','[]'::jsonb)
        ) media_id
       WHERE e.publication_state='published'
         AND media_id.value=a.id::text
    ) AS has_published_reference,
    EXISTS (
      SELECT 1
        FROM cms_audit_events audit
       WHERE audit.target_type='media'
         AND audit.target_id=a.id::text
         AND audit.action=$2
    ) AS janitor_marked
    FROM cms_media_assets a
   WHERE a.storage_key LIKE $1
`;

const lockedAssetSql = `${assetSnapshotSql}
     AND a.id=$3
   FOR UPDATE OF a SKIP LOCKED`;

function normalizedPrefix(prefix: string): string {
  return prefix.replace(/^\/+|\/+$/g, "");
}

export function stagingObjectIdentity(path: string, prefix: string): string | null {
  const marker = `${normalizedPrefix(prefix)}/cms-media/staging/`;
  if (!path.startsWith(marker)) return null;
  const identity = path.slice(marker.length);
  return UUID.test(identity) ? identity : null;
}

function cutoffFor(options: MediaStagingJanitorOptions): { now: Date; cutoff: Date } {
  const now = options.now ?? new Date();
  const abandonedAfterMs = options.abandonedAfterMs ?? DEFAULT_ABANDONED_AFTER_MS;
  if (!Number.isFinite(abandonedAfterMs) || abandonedAfterMs <= 0) {
    throw new Error("abandonedAfterMs must be a positive finite duration.");
  }
  const cutoff = new Date(now.getTime() - abandonedAfterMs);
  if (!Number.isFinite(cutoff.getTime())) throw new Error("now must be a valid date.");
  return { now, cutoff };
}

function isBeforeCutoff(value: Date | null | undefined, cutoff: Date): boolean {
  return value instanceof Date
    && Number.isFinite(value.getTime())
    && value.getTime() <= cutoff.getTime();
}

function rowCanBeReclaimed(row: AssetRow, cutoff: Date): string | null {
  if (row.status === "pending") {
    if (!isBeforeCutoff(row.updated_at, cutoff)) return "active-or-retryable-session";
  } else if (row.status === "failed" && row.janitor_marked) {
    // A previous janitor run committed this terminal marker before its storage
    // deletion. Retrying that exact marker is idempotent and safe.
  } else if (row.status === "failed") {
    return "unproven-failed-state";
  } else {
    return "committed-or-nonpending-asset";
  }
  if (row.has_versions) return "committed-immutable-version";
  if (row.has_references) return "media-reference-exists";
  if (row.has_published_reference) return "published-revision-reference-exists";
  return null;
}

function objectCanBeReclaimed(object: StagingObject, cutoff: Date): string | null {
  if (!stagingObjectIdentity(object.path, object.path.split("/cms-media/")[0] ?? "")) {
    return "path-is-not-a-proven-staging-object";
  }
  if (!object.generation) return "storage-generation-proof-missing";
  if (!isBeforeCutoff(object.updatedAt, cutoff)) return "storage-object-is-recent";
  return null;
}

function pushItem(items: JanitorItem[], item: JanitorItem): void {
  items.push(item);
}

export async function runMediaStagingJanitor(
  pool: JanitorSqlPool,
  storage: StagingStorageAdapter,
  options: MediaStagingJanitorOptions = {},
): Promise<MediaStagingJanitorReport> {
  const { cutoff } = cutoffFor(options);
  const items: JanitorItem[] = [];
  const objects = await storage.listStagingObjects();
  const assetResult = await pool.query(assetSnapshotSql, [
    `${normalizedPrefix(storage.stagingPrefix)}/cms-media/staging/%`,
    STAGING_ORPHAN_MARKER,
  ]);
  const assets = assetResult.rows as AssetRow[];
  const assetsByPath = new Map(assets.map((asset) => [asset.storage_key, asset]));
  const seenPaths = new Set<string>();

  for (const object of objects) {
    seenPaths.add(object.path);
    const identity = stagingObjectIdentity(object.path, storage.stagingPrefix);
    if (!identity) {
      pushItem(items, { path: object.path, action: "retained", reason: "path-is-not-a-proven-staging-object" });
      continue;
    }
    const storageReason = objectCanBeReclaimed(object, cutoff);
    if (storageReason) {
      pushItem(items, { path: object.path, action: "retained", reason: storageReason });
      continue;
    }
    const asset = assetsByPath.get(object.path);
    if (!asset) {
      if (!options.apply) {
        pushItem(items, { path: object.path, action: "candidate", reason: "orphan-object-without-asset-row" });
        continue;
      }
      const current = await pool.query(
        "SELECT id::text FROM cms_media_assets WHERE storage_key=$1",
        [object.path],
      );
      if (current.rowCount) {
        pushItem(items, { path: object.path, action: "retained", reason: "asset-row-appeared-during-scan" });
        continue;
      }
      try {
        await storage.deleteStagingObject(object);
        pushItem(items, { path: object.path, action: "reclaimed", reason: "orphan-object-without-asset-row" });
      } catch {
        pushItem(items, { path: object.path, action: "failed", reason: "storage-delete-failed" });
      }
      continue;
    }
    const rowReason = rowCanBeReclaimed(asset, cutoff);
    if (rowReason) {
      pushItem(items, { path: object.path, assetId: asset.asset_id, action: "retained", reason: rowReason });
      continue;
    }
    if (!options.apply) {
      pushItem(items, { path: object.path, assetId: asset.asset_id, action: "candidate", reason: "expired-or-abandoned-staging-object" });
      continue;
    }
    // The transactional lock and terminal marker are committed before any
    // object deletion. Finalize takes the same asset row lock and only accepts
    // status=pending, so it cannot race into a deleted staging object.
    const result = await markAssetAbandonedWithStorage(pool, storage, object, asset, cutoff);
    pushItem(items, result);
  }

  for (const asset of assets) {
    if (!seenPaths.has(asset.storage_key) && !rowCanBeReclaimed(asset, cutoff)) {
      pushItem(items, {
        path: asset.storage_key,
        assetId: asset.asset_id,
        action: "retained",
        reason: "database-row-has-no-storage-object",
      });
    }
  }
  return {
    mode: options.apply ? "apply" : "dry-run",
    cutoff: cutoff.toISOString(),
    scannedObjects: objects.length,
    scannedDatabaseRows: assets.length,
    items,
  };
}

async function markAssetAbandonedWithStorage(
  pool: JanitorSqlPool,
  storage: StagingStorageAdapter,
  object: StagingObject,
  asset: AssetRow,
  cutoff: Date,
): Promise<JanitorItem> {
  // Inline the adapter-bound path to preserve one explicit transaction boundary
  // around the row lock and terminal marker.
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const locked = await client.query(lockedAssetSql, [
      `${normalizedPrefix(storage.stagingPrefix)}/cms-media/staging/%`,
      STAGING_ORPHAN_MARKER,
      asset.asset_id,
    ]);
    if (!locked.rowCount) {
      await client.query("ROLLBACK");
      return { path: object.path, assetId: asset.asset_id, action: "retained", reason: "locked-or-missing-asset" };
    }
    const current = locked.rows[0] as AssetRow;
    if (current.storage_key !== object.path) {
      await client.query("ROLLBACK");
      return { path: object.path, assetId: asset.asset_id, action: "retained", reason: "staging-path-changed" };
    }
    const reason = rowCanBeReclaimed(current, cutoff);
    if (reason) {
      await client.query("ROLLBACK");
      return { path: object.path, assetId: asset.asset_id, action: "retained", reason };
    }
    if (current.status === "pending") {
      const updated = await client.query(
        `UPDATE cms_media_assets
            SET status='failed',updated_at=now()
          WHERE id=$1 AND status='pending'`,
        [asset.asset_id],
      );
      if (!updated.rowCount) {
        await client.query("ROLLBACK");
        return {
          path: object.path,
          assetId: asset.asset_id,
          action: "retained",
          reason: "concurrent-finalization-transition",
        };
      }
      await client.query(
        `INSERT INTO cms_audit_events
          (actor_user_id,actor_label,action,target_type,target_id,metadata)
         VALUES (NULL,'media-staging-janitor',$1,'media',$2,$3)`,
        [
          STAGING_ORPHAN_MARKER,
          asset.asset_id,
          {
            reason: "expired-or-abandoned-staging-object",
            objectGeneration: object.generation,
            observedBefore: cutoff.toISOString(),
          },
        ],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }
  try {
    await storage.deleteStagingObject(object);
    return { path: object.path, assetId: asset.asset_id, action: "reclaimed", reason: "orphan-marker-committed" };
  } catch {
    return { path: object.path, assetId: asset.asset_id, action: "failed", reason: "storage-delete-failed-after-marker" };
  }
}

export function productionStagingStorage(environment = process.env): StagingStorageAdapter {
  const bucketName = environment.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  const privateDirectory = environment.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  if (!bucketName || !privateDirectory) throw new Error("Object Storage is not configured.");
  const stagingPrefix = `${privateDirectory}/cms-media/staging`;
  const bucket = objectStorageClient.bucket(bucketName);
  return {
    stagingPrefix,
    async listStagingObjects() {
      const [files] = await bucket.getFiles({ prefix: `${stagingPrefix}/` });
      const objects: StagingObject[] = [];
      for (const file of files) {
        const metadata = file.metadata?.generation
          ? file.metadata
          : (await file.getMetadata())[0];
        objects.push({
          path: file.name,
          generation: metadata.generation ? String(metadata.generation) : null,
          updatedAt: metadata.updated ? new Date(metadata.updated) : null,
        });
      }
      return objects;
    },
    async deleteStagingObject(object) {
      if (!object.generation) throw new Error("Storage generation proof is required.");
      const generation = Number(object.generation);
      if (!Number.isSafeInteger(generation) || generation < 0) {
        throw new Error("Storage generation proof is invalid.");
      }
      await bucket.file(object.path).delete({
        ignoreNotFound: true,
        ifGenerationMatch: generation,
      });
    },
  };
}