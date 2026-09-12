import assert from "node:assert/strict";
import test from "node:test";
import {
  type JanitorSqlClient,
  type JanitorSqlPool,
  type StagingObject,
  type StagingStorageAdapter,
  runMediaStagingJanitor,
  STAGING_ORPHAN_MARKER,
} from "./media-staging-janitor.js";

const PREFIX = "private";
const NOW = new Date("2026-01-03T00:00:00Z");
const OLD = new Date("2025-12-31T00:00:00Z");
const RECENT = new Date("2026-01-02T23:59:00Z");

type FakeAsset = {
  asset_id: string;
  storage_key: string;
  status: string;
  updated_at: Date;
  has_versions: boolean;
  has_references: boolean;
  has_published_reference: boolean;
  janitor_marked: boolean;
};

function pathFor(id: string): string {
  return `${PREFIX}/cms-media/staging/${id}`;
}

function asset(id: string, overrides: Partial<FakeAsset> = {}): FakeAsset {
  return {
    asset_id: id,
    storage_key: pathFor(id),
    status: "pending",
    updated_at: OLD,
    has_versions: false,
    has_references: false,
    has_published_reference: false,
    janitor_marked: false,
    ...overrides,
  };
}

class FakeStorage implements StagingStorageAdapter {
  readonly stagingPrefix = PREFIX;
  readonly deleted: string[] = [];
  failDeletes = 0;
  objects: StagingObject[];

  constructor(objects: StagingObject[]) {
    this.objects = [...objects];
  }

  async listStagingObjects(): Promise<StagingObject[]> {
    return [...this.objects];
  }

  async deleteStagingObject(object: StagingObject): Promise<void> {
    if (this.failDeletes > 0) {
      this.failDeletes -= 1;
      throw new Error("simulated storage interruption");
    }
    this.deleted.push(object.path);
    this.objects = this.objects.filter((candidate) => candidate.path !== object.path);
  }
}

class FakePool implements JanitorSqlPool {
  readonly updates: string[] = [];
  readonly auditRows: string[] = [];
  lockedAssetIds = new Set<string>();
  failUpdate = false;
  rows: FakeAsset[];

  constructor(rows: FakeAsset[]) {
    this.rows = rows;
  }

  private snapshot(row: FakeAsset): FakeAsset {
    return { ...row };
  }

  async query(text: string, values: unknown[] = []) {
    if (text.includes("FROM cms_media_assets a")) {
      const storageLike = String(values[0] ?? "");
      const rows = this.rows
        .filter((row) => !storageLike || row.storage_key.startsWith(storageLike.replace(/%$/, "")))
        .map((row) => this.snapshot(row));
      return { rows, rowCount: rows.length };
    }
    const path = String(values[0] ?? "");
    const row = this.rows.find((candidate) => candidate.storage_key === path);
    return { rows: row ? [{ id: row.asset_id }] : [], rowCount: row ? 1 : 0 };
  }

  async connect(): Promise<JanitorSqlClient> {
    return {
      query: async (text, values = []) => {
        if (text === "BEGIN" || text === "COMMIT" || text === "ROLLBACK") {
          this.updates.push(text);
          return { rows: [], rowCount: 0 };
        }
        if (text.includes("FOR UPDATE OF a")) {
          const id = String(values[2]);
          if (this.lockedAssetIds.has(id)) return { rows: [], rowCount: 0 };
          const row = this.rows.find((candidate) => candidate.asset_id === id);
          return { rows: row ? [this.snapshot(row)] : [], rowCount: row ? 1 : 0 };
        }
        if (text.includes("UPDATE cms_media_assets")) {
          if (this.failUpdate) throw new Error("simulated transaction interruption");
          const id = String(values[0]);
          const row = this.rows.find((candidate) => candidate.asset_id === id);
          if (!row || row.status !== "pending") return { rows: [], rowCount: 0 };
          row.status = "failed";
          row.updated_at = NOW;
          this.updates.push(id);
          return { rows: [{ id }], rowCount: 1 };
        }
        if (text.includes("INSERT INTO cms_audit_events")) {
          this.auditRows.push(String(values[1]));
          const row = this.rows.find((candidate) => candidate.asset_id === String(values[1]));
          if (row) row.janitor_marked = true;
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      },
      release() {},
    };
  }
}

function object(id: string, updatedAt = OLD): StagingObject {
  return { path: pathFor(id), generation: `generation-${id}`, updatedAt };
}

test("dry-run reports only proven candidates and never mutates storage or rows", async () => {
  const orphan = asset("00000000-0000-4000-8000-000000000001");
  const recent = asset("00000000-0000-4000-8000-000000000002");
  const published = asset("00000000-0000-4000-8000-000000000003", {
    has_versions: true,
    has_published_reference: true,
  });
  const pool = new FakePool([orphan, recent, published]);
  const storage = new FakeStorage([
    object(orphan.asset_id),
    object(recent.asset_id, RECENT),
    object(published.asset_id),
    {
      path: `${PREFIX}/cms-media/objects/immutable/sha256/committed`,
      generation: "generation-immutable",
      updatedAt: OLD,
    },
    {
      path: pathFor("00000000-0000-4000-8000-000000000005"),
      generation: null,
      updatedAt: OLD,
    },
    object("00000000-0000-4000-8000-000000000004"),
  ]);

  const report = await runMediaStagingJanitor(pool, storage, { now: NOW });
  assert.equal(report.mode, "dry-run");
  assert.equal(storage.deleted.length, 0);
  assert.equal(orphan.status, "pending");
  assert.deepEqual(
    report.items.filter((item) => item.action === "candidate").map((item) => item.reason),
    ["expired-or-abandoned-staging-object", "orphan-object-without-asset-row"],
  );
  assert.ok(report.items.some((item) => item.reason === "storage-object-is-recent"));
  assert.ok(report.items.some((item) => item.reason === "committed-immutable-version"));
  assert.ok(report.items.some((item) => item.reason === "path-is-not-a-proven-staging-object"));
  assert.ok(report.items.some((item) => item.reason === "storage-generation-proof-missing"));
});

test("apply serializes through the asset lock, marks before delete, and is idempotent", async () => {
  const orphan = asset("00000000-0000-4000-8000-000000000011");
  const pool = new FakePool([orphan]);
  const storage = new FakeStorage([object(orphan.asset_id)]);

  const first = await runMediaStagingJanitor(pool, storage, {
    apply: true,
    now: NOW,
  });
  assert.equal(first.items[0]?.action, "reclaimed");
  assert.equal(orphan.status, "failed");
  assert.deepEqual(storage.deleted, [orphan.storage_key]);
  assert.deepEqual(pool.auditRows, [orphan.asset_id]);
  assert.ok(pool.updates.indexOf("BEGIN") < pool.updates.indexOf("COMMIT"));

  const second = await runMediaStagingJanitor(pool, storage, {
    apply: true,
    now: NOW,
  });
  assert.equal(second.scannedObjects, 0);
  assert.deepEqual(storage.deleted, [orphan.storage_key]);
});

test("storage interruption leaves the committed marker for a safe retry", async () => {
  const orphan = asset("00000000-0000-4000-8000-000000000021");
  const pool = new FakePool([orphan]);
  const storage = new FakeStorage([object(orphan.asset_id)]);
  storage.failDeletes = 1;

  const interrupted = await runMediaStagingJanitor(pool, storage, {
    apply: true,
    now: NOW,
  });
  assert.equal(interrupted.items[0]?.action, "failed");
  assert.equal(interrupted.items[0]?.reason, "storage-delete-failed-after-marker");
  assert.equal(orphan.status, "failed");
  assert.equal(storage.deleted.length, 0);

  const retried = await runMediaStagingJanitor(pool, storage, {
    apply: true,
    now: NOW,
  });
  assert.equal(retried.items[0]?.action, "reclaimed");
  assert.deepEqual(storage.deleted, [orphan.storage_key]);
  assert.equal(pool.auditRows.filter((id) => id === orphan.asset_id).length, 1);
});

test("lock contention and transaction rollback retain the staging object", async () => {
  const locked = asset("00000000-0000-4000-8000-000000000031");
  const lockedPool = new FakePool([locked]);
  lockedPool.lockedAssetIds.add(locked.asset_id);
  const lockedStorage = new FakeStorage([object(locked.asset_id)]);
  const lockedReport = await runMediaStagingJanitor(lockedPool, lockedStorage, {
    apply: true,
    now: NOW,
  });
  assert.equal(lockedReport.items[0]?.reason, "locked-or-missing-asset");
  assert.equal(lockedStorage.deleted.length, 0);
  assert.equal(locked.status, "pending");

  const interrupted = asset("00000000-0000-4000-8000-000000000032");
  const interruptedPool = new FakePool([interrupted]);
  interruptedPool.failUpdate = true;
  const interruptedStorage = new FakeStorage([object(interrupted.asset_id)]);
  await assert.rejects(
    runMediaStagingJanitor(interruptedPool, interruptedStorage, { apply: true, now: NOW }),
    /simulated transaction interruption/,
  );
  assert.equal(interrupted.status, "pending");
  assert.equal(interruptedStorage.deleted.length, 0);
  assert.ok(interruptedPool.updates.includes("ROLLBACK"));
});

test("published references and committed immutable versions are never deleted", async () => {
  const published = asset("00000000-0000-4000-8000-000000000041", {
    has_versions: true,
    has_references: true,
    has_published_reference: true,
  });
  const pool = new FakePool([published]);
  const storage = new FakeStorage([object(published.asset_id)]);
  const report = await runMediaStagingJanitor(pool, storage, { apply: true, now: NOW });
  assert.equal(report.items[0]?.action, "retained");
  assert.equal(report.items[0]?.reason, "committed-immutable-version");
  assert.equal(storage.deleted.length, 0);
  assert.equal(published.status, "pending");
});