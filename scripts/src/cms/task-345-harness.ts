/**
 * Disposable integrated Task 345 fixture.
 *
 * This command owns only a random PostgreSQL schema and a private object
 * namespace. It never writes the public schema, manufactures a session, or
 * changes a workflow/proxy configuration. Browser clients must still use
 * /api/auth/login and /api/auth/mfa/verify.
 */

import { createHash, randomBytes, randomUUID } from "node:crypto";
import { readFile, chmod, lstat, mkdir, open, readdir, rename, unlink } from "node:fs/promises";
import http from "node:http";
import https from "node:https";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Storage } from "@google-cloud/storage";
import {
  cmsDocumentKinds,
  collectCmsMediaReferences,
  validateCmsSnapshot,
  type CmsCollectedMediaReference,
  type CmsDocumentKind,
} from "@workspace/api-zod";

type QueryResult<Row = Record<string, unknown>> = {
  rows: Row[];
  rowCount: number | null;
};
type QueryClient = {
  query<Row = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<QueryResult<Row>>;
  release?: () => void;
};
type PoolLike = QueryClient & {
  end(): Promise<void>;
  options: { connectionString?: string };
};
type SecurityHelpers = {
  hashPassword(password: string): Promise<string>;
  encryptTotpSecret(secret: string): string;
  randomBase32(length?: number): string;
  totp(secret: string, now?: number, stepSeconds?: number): string;
};
type Role = "administrator" | "editor" | "publisher";
type FixtureUser = {
  id: string;
  label: "author" | "reviewer" | "publisher" | "administrator";
  role: Role;
  email: string;
  password: string;
  totpSecret: string;
};
type FixtureDocument = {
  id: string;
  kind: CmsDocumentKind;
  slug: string;
  uaeRevisionId: string;
  ksaRevisionId: string;
  mediaVersionIds: string[];
};
type FixtureMedia = {
  assetId: string;
  versionId: string;
  storageKey: string;
  checksum: string;
};
type PreservationBaseline = {
  version: 1;
  capturedAt: string;
  publishedPointers: unknown[];
  availability: unknown[];
  mediaPins: unknown[];
  revisionDigests: unknown[];
};
export type HarnessState = {
  version: 1;
  phase: "creating" | "ready";
  prefix: string;
  schema: string;
  createdAt: string;
  sessionSecret: string;
  storageRoot: string;
  bucketName: string;
  capabilities: "available" | "unavailable";
  fixtureForeignKeysInstalled: number;
  fixtureTriggersInstalled: number;
  users: FixtureUser[];
  documents: FixtureDocument[];
  media: FixtureMedia[];
  baseline: PreservationBaseline;
};
export type CleanupReceipt = {
  version: 1;
  phase: "creating" | "ready";
  prefix: string;
  schema: string;
  createdAt: string;
  storageRoot: string;
  bucketName: string;
  users: Array<Pick<FixtureUser, "id" | "label" | "role" | "email">>;
  documents: Array<Pick<FixtureDocument, "id" | "kind">>;
  storageKeys: string[];
  baseline: PreservationBaseline;
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PREFIX = /^fixture-cms-task-345-[0-9a-f-]+$/;
const SCHEMA = /^task345_[0-9a-f]{20}$/;
const cleanupReceiptDirectory = path.join(repositoryRoot, ".local/state/cms-task-345-cleanup");
const PNG_BYTES = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);
const source = {
  label: "Task 345 disposable fixture source",
  url: "https://example.com/task-345-fixture",
  accessedAt: "2026-10-01",
};
const governance = {
  visibility: "public",
  order: 1,
  sources: [source],
  verificationDate: "2026-10-01",
  reviewDate: "2027-01-01",
  relatedIds: [],
};
const block = { type: "paragraph", text: "A disposable Task 345 lifecycle paragraph." };

function args(): string[] {
  return process.argv.slice(2);
}
function flag(name: string): string | undefined {
  const values = args();
  const index = values.indexOf(name);
  const value = values[index + 1];
  if (index < 0 || !value || value.startsWith("--")) return undefined;
  return value;
}
function hasFlag(name: string): boolean {
  return args().includes(name);
}
function requireDevelopmentTarget(): void {
  if (!hasFlag("--development") || process.env.NODE_ENV !== "development") {
    throw new Error("Refusing fixture mutation unless --development and NODE_ENV=development are set.");
  }
  for (const key of ["APP_ENV", "ENVIRONMENT", "DEPLOYMENT_ENV"]) {
    if (/^(prod|production)$/i.test(process.env[key] ?? "")) {
      throw new Error(`Refusing fixture mutation because ${key} is production.`);
    }
  }
  if (process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Refusing fixture mutation in a deployment.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}
function privatePath(value: string | undefined, flagName: string): string {
  if (!value) throw new Error(`${flagName} must point to a mode-600 file below /tmp.`);
  const resolved = path.resolve(value);
  if (!resolved.startsWith("/tmp/") || path.basename(resolved).startsWith(".")) {
    throw new Error(`${flagName} must point to a non-hidden file below /tmp.`);
  }
  return resolved;
}
async function assertPrivateFile(filePath: string, exists: boolean): Promise<void> {
  try {
    const stats = await lstat(filePath);
    if (!stats.isFile() || (stats.mode & 0o777) !== 0o600) {
      throw new Error(`Private state file ${filePath} must be a mode-600 regular file.`);
    }
    if (typeof process.getuid === "function" && stats.uid !== process.getuid()) {
      throw new Error(`Private state file ${filePath} is not owned by the current user.`);
    }
    if (!exists) throw new Error(`Private state file ${filePath} already exists.`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "ENOENT") {
      if (exists) throw new Error(`Private state file ${filePath} does not exist.`);
      return;
    }
    throw error;
  }
}
async function writePrivateJson(filePath: string, value: unknown): Promise<void> {
  await assertPrivateFile(filePath, false);
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
  } finally {
    await handle.close();
  }
  await chmod(temporary, 0o600);
  await rename(temporary, filePath);
  await assertPrivateFile(filePath, true);
}
async function replacePrivateJson(filePath: string, value: unknown): Promise<void> {
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, "utf8");
  } finally {
    await handle.close();
  }
  await chmod(temporary, 0o600);
  await rename(temporary, filePath);
  await assertPrivateFile(filePath, true);
}
function cleanupReceiptPath(schema: string): string {
  if (!SCHEMA.test(schema)) throw new Error("Refusing an invalid cleanup receipt schema.");
  return path.join(cleanupReceiptDirectory, `${schema}.json`);
}
export function cleanupReceiptFromState(state: HarnessState): CleanupReceipt {
  return {
    version: 1,
    phase: state.phase,
    prefix: state.prefix,
    schema: state.schema,
    createdAt: state.createdAt,
    storageRoot: state.storageRoot,
    bucketName: state.bucketName,
    users: state.users.map(({ id, label, role, email }) => ({ id, label, role, email })),
    documents: state.documents.map(({ id, kind }) => ({ id, kind })),
    storageKeys: state.media.map(({ storageKey }) => storageKey),
    baseline: state.baseline,
  };
}
async function persistCleanupReceipt(state: HarnessState): Promise<void> {
  await mkdir(cleanupReceiptDirectory, { recursive: true, mode: 0o700 });
  const receiptPath = cleanupReceiptPath(state.schema);
  try {
    await assertPrivateFile(receiptPath, true);
    await replacePrivateJson(receiptPath, cleanupReceiptFromState(state));
  } catch (error) {
    if ((error as Error).message.includes("does not exist")) {
      await writePrivateJson(receiptPath, cleanupReceiptFromState(state));
      return;
    }
    throw error;
  }
}
async function readState(filePath: string): Promise<HarnessState> {
  await assertPrivateFile(filePath, true);
  let value: unknown;
  try {
    value = JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    throw new Error("Fixture state is not valid JSON.");
  }
  return validateHarnessState(value);
}
function record(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown, label: string): string {
  if (typeof value !== "string" || !value) throw new Error(`Fixture state has an invalid ${label}.`);
  return value;
}
export function isOwnedStorageKey(storageRoot: string, key: string): boolean {
  const root = storageRoot.replace(/^\/+|\/+$/g, "");
  return Boolean(root) && key.startsWith(`${root}/cms-media/objects/`) &&
    !key.includes("..") && key.split("/").length >= 7;
}
function isConfiguredMediaKey(storageRoot: string, key: string): boolean {
  const root = storageRoot.replace(/^\/+|\/+$/g, "");
  return Boolean(root) && key.startsWith(`${root}/cms-media/`) && !key.includes("..");
}
export function cleanupSchemaValidationMode(
  phase: CleanupReceipt["phase"],
  schemaExists: boolean,
): "absent" | "partial" | "ready" {
  if (!schemaExists) return "absent";
  return phase === "ready" ? "ready" : "partial";
}
export function preservationMatches(expected: PreservationBaseline, actual: PreservationBaseline): boolean {
  return JSON.stringify({
    publishedPointers: expected.publishedPointers,
    availability: expected.availability,
    mediaPins: expected.mediaPins,
    revisionDigests: expected.revisionDigests,
  }) === JSON.stringify({
    publishedPointers: actual.publishedPointers,
    availability: actual.availability,
    mediaPins: actual.mediaPins,
    revisionDigests: actual.revisionDigests,
  });
}
export function validateHarnessState(value: unknown): HarnessState {
  if (!record(value) || value.version !== 1 || (value.phase !== "creating" && value.phase !== "ready")) {
    throw new Error("Fixture state has an unsupported version or phase.");
  }
  const prefix = stringValue(value.prefix, "prefix");
  const schema = stringValue(value.schema, "schema");
  const storageRoot = stringValue(value.storageRoot, "storage root").replace(/^\/+|\/+$/g, "");
  const bucketName = stringValue(value.bucketName, "bucket name");
  const sessionSecret = stringValue(value.sessionSecret, "session secret");
  if (!PREFIX.test(prefix) || !SCHEMA.test(schema) || sessionSecret.length < 32) {
    throw new Error("Fixture state has invalid ownership or authentication material.");
  }
  if (!Array.isArray(value.users) || value.users.length !== 4) {
    throw new Error("Fixture state must contain four distinct users.");
  }
  const users = value.users.map((raw, index): FixtureUser => {
    if (!record(raw)) throw new Error(`Fixture state has an invalid user at index ${index}.`);
    const id = stringValue(raw.id, "user id");
    const label = raw.label;
    const role = raw.role;
    if (!UUID.test(id) || !["author", "reviewer", "publisher", "administrator"].includes(String(label)) ||
      !["editor", "publisher", "administrator"].includes(String(role))) {
      throw new Error("Fixture state has an invalid user identity.");
    }
    return {
      id, label: label as FixtureUser["label"], role: role as Role,
      email: stringValue(raw.email, "user email"),
      password: stringValue(raw.password, "user password"),
      totpSecret: stringValue(raw.totpSecret, "TOTP secret"),
    };
  });
  if (new Set(users.map((user) => user.id)).size !== users.length ||
    new Set(users.map((user) => user.label)).size !== users.length) {
    throw new Error("Fixture state users must be distinct.");
  }
  if (!Array.isArray(value.documents) || value.documents.length !== cmsDocumentKinds.length) {
    throw new Error("Fixture state must contain one document for every CMS kind.");
  }
  const documents = value.documents.map((raw): FixtureDocument => {
    if (!record(raw)) throw new Error("Fixture state has an invalid document.");
    const id = stringValue(raw.id, "document id");
    const kind = raw.kind;
    if (!UUID.test(id) || !cmsDocumentKinds.includes(kind as CmsDocumentKind)) {
      throw new Error("Fixture state has an invalid document identity.");
    }
    return {
      id, kind: kind as CmsDocumentKind, slug: stringValue(raw.slug, "document slug"),
      uaeRevisionId: stringValue(raw.uaeRevisionId, "UAE revision id"),
      ksaRevisionId: stringValue(raw.ksaRevisionId, "KSA revision id"),
      mediaVersionIds: Array.isArray(raw.mediaVersionIds) ? raw.mediaVersionIds.map((id) => stringValue(id, "media version id")) : [],
    };
  });
  if (!Array.isArray(value.media) || value.media.length < cmsDocumentKinds.length) {
    throw new Error("Fixture state has too few media objects.");
  }
  const media = value.media.map((raw): FixtureMedia => {
    if (!record(raw)) throw new Error("Fixture state has an invalid media object.");
    const storageKey = stringValue(raw.storageKey, "storage key");
    if (!isOwnedStorageKey(storageRoot, storageKey)) {
      throw new Error("Fixture state contains a media object outside its namespace.");
    }
    return {
      assetId: stringValue(raw.assetId, "asset id"),
      versionId: stringValue(raw.versionId, "version id"),
      storageKey,
      checksum: stringValue(raw.checksum, "media checksum"),
    };
  });
  if (!record(value.baseline)) throw new Error("Fixture state has no preservation baseline.");
  return {
    version: 1,
    phase: value.phase,
    prefix,
    schema,
    createdAt: stringValue(value.createdAt, "createdAt"),
    sessionSecret,
    storageRoot,
    bucketName,
    capabilities: value.capabilities === "available" ? "available" : "unavailable",
    fixtureForeignKeysInstalled: Number.isInteger(value.fixtureForeignKeysInstalled)
      ? Number(value.fixtureForeignKeysInstalled)
      : 0,
    fixtureTriggersInstalled: Number.isInteger(value.fixtureTriggersInstalled)
      ? Number(value.fixtureTriggersInstalled)
      : 0,
    users,
    documents,
    media,
    baseline: value.baseline as PreservationBaseline,
  };
}
export function validateCleanupReceipt(value: unknown): CleanupReceipt {
  if (!record(value) || value.version !== 1 || (value.phase !== "creating" && value.phase !== "ready")) {
    throw new Error("Cleanup receipt has an unsupported version or phase.");
  }
  const prefix = stringValue(value.prefix, "cleanup prefix");
  const schema = stringValue(value.schema, "cleanup schema");
  const storageRoot = stringValue(value.storageRoot, "cleanup storage root").replace(/^\/+|\/+$/g, "");
  const bucketName = stringValue(value.bucketName, "cleanup bucket");
  if (!PREFIX.test(prefix) || !SCHEMA.test(schema)) throw new Error("Cleanup receipt has invalid ownership identity.");
  if (!Array.isArray(value.users) || value.users.length !== 4 ||
      !Array.isArray(value.documents) || value.documents.length !== cmsDocumentKinds.length ||
      !Array.isArray(value.storageKeys) || value.storageKeys.length < cmsDocumentKinds.length) {
    throw new Error("Cleanup receipt has incomplete fixture identities.");
  }
  const users = value.users.map((raw) => {
    if (!record(raw) || !UUID.test(stringValue(raw.id, "cleanup user id")) ||
        !["author", "reviewer", "publisher", "administrator"].includes(String(raw.label)) ||
        !["editor", "publisher", "administrator"].includes(String(raw.role))) {
      throw new Error("Cleanup receipt has an invalid user.");
    }
    return {
      id: String(raw.id),
      label: raw.label as FixtureUser["label"],
      role: raw.role as Role,
      email: stringValue(raw.email, "cleanup user email"),
    };
  });
  if (new Set(users.map((user) => user.id)).size !== users.length ||
      new Set(users.map((user) => user.label)).size !== users.length) {
    throw new Error("Cleanup receipt users must be distinct.");
  }
  const documents = value.documents.map((raw) => {
    if (!record(raw) || !UUID.test(stringValue(raw.id, "cleanup document id")) ||
        !cmsDocumentKinds.includes(raw.kind as CmsDocumentKind)) throw new Error("Cleanup receipt has an invalid document.");
    return { id: String(raw.id), kind: raw.kind as CmsDocumentKind };
  });
  const storageKeys = value.storageKeys.map((key) => stringValue(key, "cleanup storage key"));
  if (storageKeys.some((key) => !isOwnedStorageKey(storageRoot, key) || !key.includes(`/${prefix}/`))) {
    throw new Error("Cleanup receipt contains a media object outside its exact fixture namespace.");
  }
  if (!record(value.baseline)) throw new Error("Cleanup receipt has no preservation baseline.");
  return {
    version: 1, phase: value.phase, prefix, schema,
    createdAt: stringValue(value.createdAt, "cleanup createdAt"),
    storageRoot, bucketName, users, documents, storageKeys,
    baseline: value.baseline as PreservationBaseline,
  };
}
function digest(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}
function withSearchPath(databaseUrl: string, schema: string): string {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-csearch_path=${schema},public`);
  return url.toString();
}
async function defaultPool(): Promise<PoolLike> {
  const module = await import("@workspace/db") as { pool: PoolLike };
  return module.pool;
}
async function fixturePool(databaseUrl: string, schema: string): Promise<PoolLike> {
  const base = await defaultPool();
  const Constructor = base.constructor as unknown as new (options: { connectionString: string }) => PoolLike;
  return new Constructor({ connectionString: withSearchPath(databaseUrl, schema) });
}
async function hasTable(pool: QueryClient, name: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    "SELECT to_regclass($1) IS NOT NULL AS exists", [name],
  );
  return Boolean(result.rows[0]?.exists);
}
async function hasColumn(pool: QueryClient, table: string, column: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1
         FROM pg_catalog.pg_attribute attribute
         JOIN pg_catalog.pg_class relation ON relation.oid=attribute.attrelid
         JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
        WHERE namespace.nspname=current_schema()
          AND relation.relname=$1
          AND attribute.attname=$2
          AND attribute.attnum>0
          AND NOT attribute.attisdropped
     ) AS exists`,
    [table, column],
  );
  return Boolean(result.rows[0]?.exists);
}
async function hasFunction(pool: QueryClient, name: string): Promise<boolean> {
  const result = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(
       SELECT 1
         FROM pg_catalog.pg_proc proc
         JOIN pg_catalog.pg_namespace namespace ON namespace.oid=proc.pronamespace
        WHERE namespace.nspname=current_schema()
          AND proc.proname=$1
     ) AS exists`,
    [name],
  );
  return Boolean(result.rows[0]?.exists);
}
async function publicTableRequired(pool: QueryClient, names: string[]): Promise<void> {
  for (const name of names) {
    if (!await hasTable(pool, name)) throw new Error(`DATABASE_URL is missing required CMS table ${name}.`);
  }
}
async function captureBaseline(pool: QueryClient): Promise<PreservationBaseline> {
  const pointers = await pool.query(
    `SELECT e.document_id::text document_id,e.id::text edition_id,e.market,e.locale,
            r.id::text revision_id,r.revision_number,r.content_digest,
            md5(r.payload::text) snapshot_digest
       FROM cms_market_editions e
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
      WHERE e.publication_state='published' AND e.published_revision_id IS NOT NULL
      ORDER BY e.document_id,e.market,e.locale`,
  );
  const availability = await pool.query(
    `SELECT document_id::text document_id,market_edition_id::text market_edition_id,
            locale,published_decision,draft_decision
       FROM cms_document_market_availability
      ORDER BY document_id,market_edition_id,locale`,
  );
  const mediaPins = await pool.query(
    `SELECT ref.document_id::text document_id,ref.field_path,
            ref.asset_id::text asset_id,ref.media_version_id::text media_version_id
       FROM cms_media_references ref
       JOIN cms_market_editions e ON e.document_id=ref.document_id
       JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id
          AND ref.field_path='revision:'||r.id::text
      WHERE e.publication_state='published' AND e.published_revision_id IS NOT NULL
      ORDER BY ref.document_id,ref.field_path,ref.asset_id,ref.media_version_id`,
  );
  const revisions = await pool.query(
    `SELECT edition_id::text edition_id,count(*)::int revision_count,
            array_agg(content_digest ORDER BY revision_number,id) content_digests
       FROM cms_revisions GROUP BY edition_id ORDER BY edition_id`,
  );
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    publishedPointers: pointers.rows,
    availability: availability.rows,
    mediaPins: mediaPins.rows,
    revisionDigests: revisions.rows,
  };
}
async function clonePublicTables(admin: QueryClient, schema: string): Promise<string[]> {
  const tables = await admin.query<{ tablename: string }>(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public' ORDER BY tablename",
  );
  await admin.query(`CREATE SCHEMA "${schema}"`);
  for (const row of tables.rows) {
    const table = row.tablename.replace(/"/g, "\"\"");
    await admin.query(
      `CREATE TABLE "${schema}"."${table}" (LIKE public."${table}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)`,
    );
  }
  const fixture = await fixturePool(process.env.DATABASE_URL!, schema);
  try {
    for (const row of tables.rows) {
      const table = row.tablename.replace(/"/g, "\"\"");
      await fixture.query(`TRUNCATE TABLE "${schema}"."${table}" CASCADE`);
    }
  } finally {
    await fixture.end();
  }
  return tables.rows.map((row) => row.tablename);
}
async function applyFixtureMigrations(pool: QueryClient): Promise<void> {
  const migrations: Array<[string, string]> = [
    ["cms_revision_accuracy_confirmations", "0035_cms_revision_accuracy_confirmations.sql"],
    ["cms_review_requests", "0036_cms_review_request_accountability_snapshot.sql"],
    ["cms_user_capability_grants", "0037_cms_capability_matrix_access_projection.sql"],
    ["cms_review_requests", "0038_cms_review_capability_reviewers.sql"],
    ["cms_user_capability_configurations", "0039_cms_capability_matrix_configuration.sql"],
    ["cms_legacy_administrator_market_snapshots", "0040_cms_legacy_administrator_market_snapshots.sql"],
    ["cms_shared_baseline_revisions", "0041_cms_shared_baseline_governing_source.sql"],
    ["cms_document_availability_states", "0042_cms_availability_destination_pins.sql"],
  ];
  for (const [table, file] of migrations) {
    const migrationPath = path.join(repositoryRoot, "lib/db/migrations", file);
    let sql: string;
    try {
      sql = await readFile(migrationPath, "utf8");
    } catch {
      continue;
    }
    if (file.startsWith("0038")) {
      if (await hasTable(pool, "cms_review_requests")) await pool.query(sql);
      continue;
    }
    if (file.startsWith("0039")) {
      if (await hasTable(pool, "cms_user_capability_grants") &&
        !await hasTable(pool, "cms_user_capability_configurations")) {
        await pool.query(sql);
      }
      continue;
    }
    if (file.startsWith("0040")) {
      if (!await hasTable(pool, "cms_legacy_administrator_market_snapshots")) {
        await pool.query(sql);
      }
      continue;
    }
    if (file.startsWith("0041")) {
      if (await hasTable(pool, "cms_shared_baseline_revisions") &&
        !await hasColumn(pool, "cms_shared_baseline_revisions", "governing_source_revision_id")) {
        await pool.query(sql);
      }
      continue;
    }
    if (file.startsWith("0042")) {
      if (await hasTable(pool, "cms_document_availability_states") &&
        !await hasColumn(pool, "cms_document_availability_states", "reviewed_destination_pins")) {
        await pool.query(sql);
      }
      continue;
    }
    if (file.startsWith("0036")) {
      if (await hasTable(pool, "cms_review_requests") &&
        !await hasColumn(pool, "cms_review_requests", "accountable_editor_user_id")) {
        await pool.query(sql);
      }
      continue;
    }
    if (!await hasTable(pool, table)) {
      await pool.query(sql);
    }
  }
}
async function requireCompleteFixtureSchema(pool: QueryClient): Promise<void> {
  const required = [
    "market_editions",
    "cms_users",
    "cms_password_credentials",
    "cms_totp_credentials",
    "cms_user_market_assignments",
    "cms_documents",
    "cms_market_editions",
    "cms_revisions",
    "cms_media_assets",
    "cms_media_versions",
    "cms_media_references",
    "cms_document_market_availability",
    "cms_editorial_assignments",
    "cms_review_requests",
    "cms_revision_accuracy_confirmations",
    "cms_user_capability_grants",
    "cms_user_capability_configurations",
    "cms_legacy_administrator_market_snapshots",
  ];
  const missing: string[] = [];
  for (const table of required) {
    if (!await hasTable(pool, table)) missing.push(table);
  }
  if (missing.length) {
    throw new Error(
      `Fixture schema is incomplete after isolated migrations; refusing API startup. Missing: ${missing.join(", ")}.`,
    );
  }
  if (!await hasColumn(pool, "cms_review_requests", "accountable_editor_user_id")) {
    throw new Error("Fixture schema is incomplete: cms_review_requests.accountable_editor_user_id is missing.");
  }
  if (!await hasFunction(pool, "cms_assert_review_request_target")) {
    throw new Error("Fixture schema is incomplete: 0038 reviewer-integrity function is missing.");
  }
  if (!await hasColumn(pool, "cms_document_availability_states", "reviewed_destination_pins")) {
    throw new Error("Fixture schema is incomplete: availability destination pins are missing.");
  }
}
async function installFixtureForeignKeys(
  sourcePool: QueryClient,
  fixturePoolConnection: QueryClient,
  schema: string,
): Promise<number> {
  const constraints = await sourcePool.query<{ table_name: string; constraint_name: string; definition: string }>(
    `SELECT relation.relname table_name,constraint_row.conname constraint_name,
            pg_get_constraintdef(constraint_row.oid,true) definition
       FROM pg_catalog.pg_constraint constraint_row
       JOIN pg_catalog.pg_class relation ON relation.oid=constraint_row.conrelid
       JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
      WHERE namespace.nspname='public' AND constraint_row.contype='f'
      ORDER BY relation.relname,constraint_row.conname`,
  );
  let installed = 0;
  for (const constraint of constraints.rows) {
    const exists = await fixturePoolConnection.query<{ exists: boolean }>(
      `SELECT EXISTS(
         SELECT 1
           FROM pg_catalog.pg_constraint candidate
           JOIN pg_catalog.pg_class relation ON relation.oid=candidate.conrelid
          WHERE candidate.conname=$1 AND relation.relname=$2
       ) AS exists`,
      [constraint.constraint_name, constraint.table_name],
    );
    if (exists.rows[0]?.exists) continue;
    const definition = constraint.definition.replace(
      /REFERENCES\s+(?:ONLY\s+)?(?:(?:"?public"?\.)?)(?:"([^"]+)"|([a-z_][a-z0-9_]*))/gi,
      (_match, quoted: string | undefined, plain: string | undefined) =>
        `REFERENCES "${schema}"."${(quoted ?? plain)!.replace(/"/g, "\"\"")}"`,
    );
    await fixturePoolConnection.query(
      `ALTER TABLE "${schema}"."${constraint.table_name.replace(/"/g, "\"\"")}"
         ADD CONSTRAINT "${constraint.constraint_name.replace(/"/g, "\"\"")}" ${definition}`,
    );
    installed++;
  }
  return installed;
}
async function installFixtureTriggers(
  sourcePool: QueryClient,
  fixturePoolConnection: QueryClient,
  schema: string,
): Promise<number> {
  const triggers = await sourcePool.query<{ table_name: string; definition: string }>(
    `SELECT relation.relname table_name,pg_get_triggerdef(trigger_row.oid,true) definition
       FROM pg_catalog.pg_trigger trigger_row
       JOIN pg_catalog.pg_class relation ON relation.oid=trigger_row.tgrelid
       JOIN pg_catalog.pg_namespace namespace ON namespace.oid=relation.relnamespace
      WHERE namespace.nspname='public' AND NOT trigger_row.tgisinternal
      ORDER BY relation.relname,trigger_row.tgname`,
  );
  let installed = 0;
  for (const trigger of triggers.rows) {
    const target = trigger.table_name.replace(/"/g, "\"\"");
    let definition = trigger.definition.replace(
      new RegExp(`\\bON\\s+(?:ONLY\\s+)?(?:(?:"?public"?\\.)?)"?${target}"?`, "i"),
      `ON "${schema}"."${target}"`,
    );
    // 0038 deliberately supersedes the legacy role-only reviewer target. Bind
    // the isolated trigger to the isolated function, not the public function.
    definition = definition.replace(
      /\b(?:"?public"?\.)?cms_assert_review_request_target\s*\(/gi,
      "cms_assert_review_request_target(",
    );
    await fixturePoolConnection.query(definition);
    installed++;
  }
  return installed;
}
function mediaReference(media: FixtureMedia, role: "identity" | "logo" | "hero" | "supporting") {
  return {
    mediaId: media.assetId,
    mediaVersionId: media.versionId,
    role,
    altText: "Task 345 disposable approved fixture media",
  };
}
function fixtureContent(kind: CmsDocumentKind, media: FixtureMedia[]): Record<string, unknown> {
  const ref = (index = 0, role: "identity" | "logo" | "hero" | "supporting" = "hero") =>
    mediaReference(media[index % media.length]!, role);
  if (kind === "person") return {
    schemaVersion: 1, role: "leader", title: "Task 345 Practice Lead",
    biography: "A complete disposable fixture biography.", contribution: "A governed contribution.",
    focusAreas: [{ title: "Governance", detail: "Build bounded capability." }],
    profileLinks: [{ label: "Profile", url: "https://example.com/task-345-person" }],
    identityMedia: ref(0, "identity"), approvedFallback: "initials", ...governance,
  };
  if (kind === "partner") return {
    schemaVersion: 1, allianceCategory: "Delivery partner",
    positioning: "A partner that strengthens governed delivery.",
    facts: [{ value: "Regional", label: "Delivery coverage" }],
    evidence: [{ statement: "The fixture claim was reviewed.", source, approved: true }],
    coverage: ["UAE"], contribution: "A disposable contribution.",
    website: "https://example.com/task-345-partner", logoMedia: ref(1, "logo"),
    relationshipStatus: "active", ...governance,
  };
  if (kind === "platform") return {
    schemaVersion: 1, category: "Specialist", summary: "A governed platform summary.",
    heroMedia: ref(2), template: "standard", sections: [{ heading: "Platform section", body: [block] }],
    capabilities: ["Bounded automation", "Evidence capture"],
    differentiators: ["Human approval", "Versioned delivery"],
    cta: { label: "Explore", href: "/platforms/task-345-platform" }, ...governance,
  };
  if (kind === "publication") return {
    schemaVersion: 1, variant: "article", teaser: "A disposable publication teaser.",
    body: [block], author: "Editorial practice", publicationDate: "2026-10-01",
    updatedDate: "2026-10-02", readingTimeMinutes: 3, topics: ["governance"],
    sectors: ["Public Sector"], platformIds: [], heroMedia: ref(3), social: {}, ...governance,
  };
  if (kind === "case-study") return {
    schemaVersion: 1, variant: "full", disclosure: "anonymized", sector: "Manufacturing & Industrial",
    organizationDescriptor: "A disposable industrial operator", engagementType: "client-delivery",
    deliveryStage: "production", impactClassification: "observed",
    impactStatement: "The governed workflow improved the operating path.",
    disclosureNote: "Identity is withheld.", publicEvidenceStatus: "approved",
    relatedIndustries: ["energy-resources"],
    visual: {
      kind: "illustrative-interface-reconstruction", caption: "Illustrative reconstruction.",
      altText: "An anonymized operations console.", textEquivalent: "A workflow with a human approval gate.",
      template: "operations-console", fixtureLabels: ["Task 345"],
    },
    mandate: "Demonstrate a governed workflow.", context: "Representative lifecycle context.",
    constraints: ["Human approval required"], work: [block], controls: ["Approval gate"],
    outcomes: ["Documented outcome"],
    evidence: [{ statement: "The workflow was reviewed.", source, approved: true }],
    quote: { text: "A representative quote.", attribution: "Operations lead" },
    heroMedia: ref(4), cta: { label: "Discuss", href: "/contact" }, ...governance,
  };
  if (kind === "industry") return {
    schemaVersion: 1, legacyPath: "/industries/task-345-industry", name: "Task 345 Industry",
    shortName: "T345", thesis: "A governed industry thesis.", accent: "Governed momentum.",
    dek: "A concise industry summary.", opportunity: "Create value from a priority constraint.",
    capabilities: [
      { title: "Agentic platform", body: "Build bounded agents." },
      { title: "Responsible delivery", body: "Embed evidence and controls." },
    ],
    selectedWork: { description: "Show the mandate and evidenced outcome." },
    image: "/images/task-345-industry.png", imageAlt: "A representative industry scene.", variant: "ledger",
    pressures: [
      { title: "One", body: "First operating pressure." },
      { title: "Two", body: "Second operating pressure." },
      { title: "Three", body: "Third operating pressure." },
    ],
    reversal: { title: "A reversal", body: "A documented consequence." },
    myth: { claim: "A claim", verdict: "A governed verdict." },
    gcc: "A regional context.",
    service: { label: "AI Platforms", href: "/what-we-do", firstMove: "Map one decision." },
    uses: [{ use: "Priority workflow", evidence: "Measured evidence", boundary: "Human approval", sourceUrls: [source.url] }],
    sources: [{ label: "Official guidance", publisher: "Public authority", kind: "Official source", url: source.url, accessedAt: source.accessedAt }],
    heroMedia: ref(5), visibility: "public", order: 1, verificationDate: "2026-10-01",
    reviewDate: "2027-01-01", relatedIds: [],
  };
  if (kind === "framework") return {
    schemaVersion: 1, template: "agent-authority",
    teaser: "Govern each handover according to its exposure.",
    handoverExplanation: "Knowledge, Decision and Action describe individual handovers.",
    methodology: [block],
    workedExample: {
      sector: "Travel & hospitality", title: "Passenger re-accommodation", handover: "action",
      reversibility: "R3", reach: "H2", exposureBand: "E2",
      oversight: "On the loop, with a stated intervention window",
      detail: "The duty manager owns the handover.", requestedAuthority: "on-loop",
      interventionWindow: "Before released-seat inventory expires.", accountableRole: "Duty Manager",
      promotionEvidence: "An approved body of clean rebookings.", automaticDemotion: "Any involuntary downgrade.",
    },
    sectorExamples: [], heroMedia: ref(6), cta: { label: "Apply", href: "/contact" }, ...governance,
  };
  if (kind === "office") return {
    schemaVersion: 1, city: "Dubai", address: "Office 1914, Business Bay, Dubai, UAE",
    phone: "+971 4 123 4567", ...governance,
  };
  if (kind === "site-configuration") return {
    schemaVersion: 1, page: "homepage",
    hero: {
      posterMediaId: media[7]!.assetId, posterMediaVersionId: media[7]!.versionId,
      sources: [
        { mediaId: media[8]!.assetId, mediaVersionId: media[8]!.versionId, mimeType: "video/mp4" },
        { mediaId: media[9]!.assetId, mediaVersionId: media[9]!.versionId, mimeType: "video/webm" },
      ],
    },
  };
  return {
    schemaVersion: 1, pagePath: "/methodologies", template: "landing",
    narrative: "A governed lifecycle landing page.",
    sections: [
      { type: "narrative", id: "hero", order: 0, body: [block] },
      {
        type: "media",
        id: "methodologies-hero-media",
        order: 1,
        references: [ref(10, "supporting")],
      },
      { type: "cta", id: "primary-action", order: 2, label: "Contact", href: "/contact", style: "primary" },
    ],
    cta: { label: "Contact", href: "/contact", style: "secondary" },
     seo: { title: "Task 345 Methodologies", description: "Disposable lifecycle fixture", noIndex: false },
     legal: {}, visualReferences: [ref(10, "supporting")], ...governance,
  };
}
function fixtureSnapshot(kind: CmsDocumentKind, slug: string, title: string, content: Record<string, unknown>, markets: string[]) {
  return {
    slug,
    title,
    summary: `Disposable Task 345 ${kind} summary`,
    content,
    mediaIds: deduplicateFixtureMediaReferences(collectCmsMediaReferences(kind, content))
      .map((reference) => reference.mediaId),
    markets,
  };
}
export function deduplicateFixtureMediaReferences(
  references: readonly CmsCollectedMediaReference[],
): CmsCollectedMediaReference[] {
  const byAsset = new Map<string, CmsCollectedMediaReference>();
  for (const reference of references) {
    const existing = byAsset.get(reference.mediaId);
    if (existing && existing.mediaVersionId !== reference.mediaVersionId) {
      throw new Error(
        `Fixture media asset ${reference.mediaId} is pinned to conflicting immutable versions ` +
        `${existing.mediaVersionId ?? "legacy"} and ${reference.mediaVersionId ?? "legacy"}.`,
      );
    }
    if (!existing) byAsset.set(reference.mediaId, reference);
  }
  return [...byAsset.values()];
}
export function validateAllFixtureSnapshots(): void {
  const media: FixtureMedia[] = Array.from({ length: 11 }, () => ({
    assetId: randomUUID(),
    versionId: randomUUID(),
    storageKey: "fixture-cms-task-345/cms-media/objects/local/asset/sha256/digest",
    checksum: "fixture-digest",
  }));
  for (const kind of cmsDocumentKinds) {
    const content = fixtureContent(kind, media);
    const published = validateCmsSnapshot(
      kind,
      fixtureSnapshot(kind, `fixture-${kind}`, `Task 345 ${kind}`, content, ["uae", "ksa", "europe"]),
      "publish",
    );
    if (!published.success) {
      throw new Error(`${kind} fixture failed local publish validation: ${published.errors.join("; ")}`);
    }
    const draft = validateCmsSnapshot(
      kind,
      fixtureSnapshot(kind, `fixture-${kind}-ksa`, `Task 345 ${kind} KSA`, content, ["ksa"]),
      "draft",
    );
    if (!draft.success) {
      throw new Error(`${kind} fixture failed local draft validation: ${draft.errors.join("; ")}`);
    }
  }
}
function newUser(prefix: string, label: FixtureUser["label"], role: Role, security: SecurityHelpers): FixtureUser {
  const password = `${randomBytes(32).toString("base64url")}Aa1!`;
  return {
    id: randomUUID(), label, role, email: `${prefix}.${label}@fixture.invalid`,
    password, totpSecret: security.randomBase32(),
  };
}
async function storageClient(bucketName: string): Promise<ReturnType<Storage["bucket"]>> {
  const storage = new Storage({
    credentials: {
      audience: "replit", subject_token_type: "access_token",
      token_url: "http://127.0.0.1:1106/token", type: "external_account",
      credential_source: { url: "http://127.0.0.1:1106/credential", format: { type: "json", subject_token_field_name: "access_token" } },
      universe_domain: "googleapis.com",
    },
    projectId: "",
  });
  return storage.bucket(bucketName);
}
async function provisionStorage(state: HarnessState, bucket: ReturnType<Storage["bucket"]>): Promise<void> {
  for (const media of state.media) {
    await bucket.file(media.storageKey).save(PNG_BYTES, {
      resumable: false,
      contentType: "image/png",
      metadata: { cacheControl: "private, max-age=31536000, immutable" },
      preconditionOpts: { ifGenerationMatch: 0 },
    });
  }
}
async function seedDatabase(pool: QueryClient, state: HarnessState, security: SecurityHelpers): Promise<void> {
  const author = state.users.find((user) => user.label === "author")!;
  const reviewer = state.users.find((user) => user.label === "reviewer")!;
  const publisher = state.users.find((user) => user.label === "publisher")!;
  const administrator = state.users.find((user) => user.label === "administrator")!;
  await pool.query("BEGIN");
  try {
    await pool.query(
      `INSERT INTO market_editions(id,code,display_name,default_locale,fallback_market_code,fallback_locale,enabled,is_canonical)
       VALUES ($1,'uae','United Arab Emirates','en',NULL,NULL,true,true),
              ($2,'ksa','Kingdom of Saudi Arabia','en','uae','en',true,false),
              ($3,'europe','Europe','en','uae','en',true,false)`,
      [randomUUID(), randomUUID(), randomUUID()],
    );
    for (const user of state.users) {
      await pool.query(
        `INSERT INTO cms_users(id,email,display_name,role,status,email_verified_at)
         VALUES ($1,$2,$3,$4,'active',now())`,
        [user.id, user.email, `Task 345 fixture ${user.label}`, user.role],
      );
      await pool.query(
        `INSERT INTO cms_password_credentials(user_id,password_hash,algorithm,password_version,must_rotate)
         VALUES ($1,$2,'scrypt',1,false)`,
        [user.id, await security.hashPassword(user.password)],
      );
      await pool.query(
        `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
         VALUES ($1,$2,1,now())`,
        [user.id, security.encryptTotpSecret(user.totpSecret)],
      );
    }
    for (const media of state.media) {
      await pool.query(
        `INSERT INTO cms_media_assets
           (id,storage_key,filename,original_filename,media_type,byte_size,checksum,
            alt_text,collection,status,uploaded_by_user_id)
         VALUES ($1,$2,$3,$3,'image/png',$4,$5,$6,'website','active',$7)`,
        [
          media.assetId, media.storageKey, `${media.assetId}.png`, PNG_BYTES.length,
          media.checksum, "Task 345 disposable approved fixture media", author.id,
        ],
      );
      await pool.query(
        `INSERT INTO cms_media_versions
           (id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,$2,1,$3,$4,$5,1,1,
                 '{"altText":"Task 345 disposable approved fixture media",
                   "rightsStatus":"approved-use","accessibilityStatus":"approved"}'::jsonb)`,
        [media.versionId, media.assetId, media.storageKey, media.checksum, PNG_BYTES.length],
      );
    }
    const markets = ["uae", "ksa", "europe"];
    for (const user of state.users) {
      for (const market of markets) {
        await pool.query(
          "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,$2)",
          [user.id, market],
        );
      }
    }
    if (!await hasTable(pool, "cms_user_capability_grants") ||
      !await hasTable(pool, "cms_user_capability_configurations")) {
      throw new Error("Fixture capability schema is incomplete; refusing legacy authorization fallback.");
    }
    state.capabilities = "available";
    {
      const capabilities = ["view", "edit", "review", "publish"];
      for (const user of [author, reviewer, publisher]) {
        const allowed = user.label === "author" ? ["view", "edit", "review"] : capabilities;
        for (const topic of cmsDocumentKinds) {
          for (const capability of allowed) {
            for (const market of markets) {
              await pool.query(
                `INSERT INTO cms_user_capability_grants
                   (user_id,topic,capability,scope,market_code,created_by_user_id)
                 VALUES ($1,$2,$3,'regional',$4,$5)
                 ON CONFLICT DO NOTHING`,
                [user.id, topic, capability, market, administrator.id],
              );
            }
          }
        }
        for (const capability of allowed) {
          for (const market of markets) {
            await pool.query(
              `INSERT INTO cms_user_capability_grants
                 (user_id,topic,capability,scope,market_code,created_by_user_id)
               SELECT $1,topic_name,$2,'shared',$3,$4
                 FROM unnest($5::text[]) AS topics(topic_name)
               ON CONFLICT DO NOTHING`,
              [user.id, capability, market, administrator.id, [...cmsDocumentKinds]],
            );
          }
        }
      }
      await pool.query(
        `INSERT INTO cms_user_capability_configurations(user_id,configured_by_user_id)
         VALUES ($1,$4),($2,$4),($3,$4)
         ON CONFLICT (user_id) DO NOTHING`,
        [author.id, reviewer.id, publisher.id, administrator.id],
      );
    }
    const marketsByCode = await pool.query<{ id: string; code: string; default_locale: string }>(
      "SELECT id::text id,code,default_locale FROM market_editions",
    );
    const uae = marketsByCode.rows.find((market) => market.code === "uae");
    const ksa = marketsByCode.rows.find((market) => market.code === "ksa");
    if (!uae || !ksa) throw new Error("Fixture markets were not created.");
    for (const fixture of state.documents) {
      const content = fixtureContent(fixture.kind, state.media);
      const slug = fixture.slug;
      const title = `Task 345 ${fixture.kind} fixture`;
      const uaeSnapshot = fixtureSnapshot(fixture.kind, slug, title, content, ["uae", "ksa", "europe"]);
      const ksaSnapshot = fixtureSnapshot(fixture.kind, `${slug}-ksa`, `${title} KSA`, content, ["ksa"]);
      const validUae = validateCmsSnapshot(fixture.kind, uaeSnapshot, "publish");
      if (!validUae.success) throw new Error(`${fixture.kind} fixture failed publish validation: ${validUae.errors.join("; ")}`);
      const validKsa = validateCmsSnapshot(fixture.kind, ksaSnapshot, "draft");
      if (!validKsa.success) throw new Error(`${fixture.kind} fixture failed draft validation: ${validKsa.errors.join("; ")}`);
      await pool.query(
        `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
         VALUES ($1,$2,$3,$4,$5,'active')`,
        [fixture.id, fixture.kind, slug, title, author.id],
      );
      const editions = await pool.query<{ id: string; market: string; locale: string }>(
        `INSERT INTO cms_market_editions
           (id,document_id,market,locale,localized_slug,publication_state,content_mode)
         VALUES ($1,$2,'uae',$3,$4,'published','custom'),
                ($5,$2,'ksa',$3,$6,'draft','custom')
         RETURNING id::text id,market,locale`,
        [randomUUID(), fixture.id, uae.default_locale, slug, randomUUID(), `${slug}-ksa`],
      );
      const uaeEdition = editions.rows.find((edition) => edition.market === "uae")!;
      const ksaEdition = editions.rows.find((edition) => edition.market === "ksa")!;
      await pool.query(
        `INSERT INTO cms_editorial_assignments
           (document_id,edition_id,editor_user_id,reviewer_user_id,created_by_user_id,updated_by_user_id)
         VALUES ($1,$2,$3,$4,$5,$5)`,
        [fixture.id, ksaEdition.id, author.id, reviewer.id, administrator.id],
      );
      const now = new Date().toISOString();
      await pool.query(
        `INSERT INTO cms_revisions
           (id,edition_id,revision_number,payload,payload_version,content_digest,workflow_state,
            created_by_user_id,approved_by_user_id,approved_at,reason,created_at)
          VALUES ($1,$2,1,$3,1,$4,'approved',$5,$6,$11,'Task 345 fixture approved public snapshot',$11),
                ($7,$8,1,$9,1,$10,'draft',$5,NULL,NULL,'Task 345 fixture regional draft',$11)`,
        [
          fixture.uaeRevisionId, uaeEdition.id, uaeSnapshot, digest(uaeSnapshot), author.id, publisher.id,
          fixture.ksaRevisionId, ksaEdition.id, ksaSnapshot, digest(ksaSnapshot), now,
        ],
      );
      await pool.query(
        `UPDATE cms_market_editions
            SET published_revision_id=$2,published_at=now()
          WHERE id=$1`,
        [uaeEdition.id, fixture.uaeRevisionId],
      );
      const refs = deduplicateFixtureMediaReferences(collectCmsMediaReferences(fixture.kind, content));
      for (const revision of [
        { id: fixture.uaeRevisionId, source: content },
        { id: fixture.ksaRevisionId, source: content },
      ]) {
        for (const ref of refs) {
          const media = state.media.find((candidate) => candidate.assetId === ref.mediaId && candidate.versionId === ref.mediaVersionId);
          if (!media) throw new Error(`Missing fixture media for ${fixture.kind}.${ref.fieldPath}.`);
          await pool.query(
            `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
             VALUES ($1,$2,$3,$4)`,
            [media.assetId, media.versionId, fixture.id, `revision:${revision.id}`],
          );
        }
      }
      for (const edition of [uaeEdition, ksaEdition]) {
        await pool.query(
          `INSERT INTO cms_document_market_availability
             (document_id,market_edition_id,locale,published_decision,draft_decision,updated_by_user_id)
           VALUES ($1,$2,$3,$4,'show',$5)`,
          [
            fixture.id,
            (edition.market === "uae" ? uae : ksa).id,
            edition.locale,
            edition.market === "uae" ? "show" : "off",
            author.id,
          ],
        );
      }
      if (await hasTable(pool, "cms_document_availability_states")) {
        await pool.query(
          `INSERT INTO cms_document_availability_states
             (document_id,draft_version,reviewed_version,published_version,
              reviewed_source_revision_id,published_source_revision_id,updated_by_user_id,reviewed_by_user_id,published_by_user_id)
           VALUES ($1,2,NULL,1,NULL,$2,$3,NULL,$4)`,
          [fixture.id, fixture.uaeRevisionId, author.id, publisher.id],
        );
      }
    }
    const invalidAvailabilityIdentity = await pool.query<{ count: string }>(
      `SELECT count(*)::text count
         FROM cms_document_market_availability availability
         JOIN cms_market_editions document_edition
           ON document_edition.id=availability.market_edition_id
        WHERE availability.document_id=ANY($1::uuid[])`,
      [state.documents.map((document) => document.id)],
    );
    if (invalidAvailabilityIdentity.rows[0]?.count !== "0") {
      throw new Error("Fixture availability rows must reference configured market_editions IDs, never document edition IDs.");
    }
    await pool.query("COMMIT");
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  }
}
async function setup(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  await assertPrivateFile(statePath, false);
  const databaseUrl = process.env.DATABASE_URL!;
  const sourcePool = await defaultPool();
  const configuredStorageRoot = process.env.PRIVATE_OBJECT_DIR?.replace(/^\/+|\/+$/g, "");
  const bucketName = process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID;
  if (!configuredStorageRoot || !bucketName) throw new Error("Object Storage is not configured; no fixture was created.");
  await publicTableRequired(sourcePool, [
    "market_editions", "cms_users", "cms_password_credentials", "cms_totp_credentials",
    "cms_user_market_assignments", "cms_documents", "cms_market_editions",
    "cms_revisions", "cms_media_assets", "cms_media_versions", "cms_media_references",
    "cms_document_market_availability",
  ]);
    const security = await import(pathToFileURL(
      path.join(repositoryRoot, "artifacts/api-server/src/lib/security.ts"),
    ).href) as SecurityHelpers;
  const sessionSecret = randomBytes(48).toString("base64url");
  process.env.SESSION_SECRET = sessionSecret;
  const prefix = `fixture-cms-task-345-${randomUUID()}`;
  const schema = `task345_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const storageRoot = `${configuredStorageRoot}/cms-task-345/${prefix}`;
  const users = ([
    ["author", "editor"],
    ["reviewer", "publisher"],
    ["publisher", "publisher"],
    ["administrator", "administrator"],
  ] as const).map(([label, role]) => newUser(prefix, label, role, security));
  const media: FixtureMedia[] = Array.from({ length: 11 }, () => {
    const assetId = randomUUID();
    const versionId = randomUUID();
    const checksum = createHash("sha256").update(PNG_BYTES).digest("hex");
    return {
      assetId, versionId,
      storageKey: `${storageRoot}/cms-media/objects/${assetId}/sha256/${checksum}`,
      checksum,
    };
  });
  const documents = cmsDocumentKinds.map((kind): FixtureDocument => ({
    id: randomUUID(),
    kind,
    slug: `${prefix}-${kind.replaceAll("_", "-")}`,
    uaeRevisionId: randomUUID(),
    ksaRevisionId: randomUUID(),
    mediaVersionIds: [],
  }));
  validateAllFixtureSnapshots();
  const baseline = await captureBaseline(sourcePool);
  const state: HarnessState = {
    version: 1, phase: "creating", prefix, schema, createdAt: new Date().toISOString(),
    sessionSecret, storageRoot, bucketName, capabilities: "unavailable",
    fixtureForeignKeysInstalled: 0, fixtureTriggersInstalled: 0,
    users, documents, media, baseline,
  };
  await writePrivateJson(statePath, state);
  await persistCleanupReceipt(state);
  let fixture: PoolLike | undefined;
  try {
    await clonePublicTables(sourcePool, schema);
    fixture = await fixturePool(databaseUrl, schema);
    await applyFixtureMigrations(fixture);
    await requireCompleteFixtureSchema(fixture);
    state.fixtureForeignKeysInstalled = await installFixtureForeignKeys(sourcePool, fixture, schema);
    state.fixtureTriggersInstalled = await installFixtureTriggers(sourcePool, fixture, schema);
    const bucket = await storageClient(bucketName);
    await provisionStorage(state, bucket);
    for (const document of state.documents) {
      document.mediaVersionIds = deduplicateFixtureMediaReferences(
        collectCmsMediaReferences(document.kind, fixtureContent(document.kind, state.media)),
      )
        .map((reference) => reference.mediaVersionId)
        .filter((id): id is string => Boolean(id));
    }
    await seedDatabase(fixture, state, security);
    state.phase = "ready";
    await replacePrivateJson(statePath, state);
    await persistCleanupReceipt(state);
    process.stdout.write(
      `Task 345 fixture ready in schema ${schema}. State is ${statePath} (mode 600); secret values were not printed.\n` +
      `Restart-durable cleanup receipt: ${cleanupReceiptPath(schema)} (mode 600, no credentials).\n` +
      `Fixture integrity installed in isolated schema: ${state.fixtureForeignKeysInstalled} foreign keys, ` +
      `${state.fixtureTriggersInstalled} workflow/media triggers; public definitions were not modified.\n` +
      `Capability matrix: ${state.capabilities}. Run serve with the same DATABASE_URL, then clean up explicitly.\n`,
    );
  } catch (error) {
    throw new Error(
      `Fixture setup failed; durable cleanup authority was retained. Run recover-cleanup. Cause: ${
        error instanceof Error ? error.message : "unknown setup failure"
      }`,
    );
  } finally {
    if (fixture) await fixture.end().catch(() => undefined);
    await sourcePool.end().catch(() => undefined);
  }
}
async function readCleanupReceipt(filePath: string): Promise<CleanupReceipt> {
  await assertPrivateFile(filePath, true);
  return validateCleanupReceipt(JSON.parse(await readFile(filePath, "utf8")) as unknown);
}
export function publicStorageReferenceOverlap(candidateKeys: string[], publicKeys: string[]): string[] {
  const candidates = new Set(candidateKeys);
  return [...new Set(publicKeys.filter((key) => candidates.has(key)))].sort();
}
async function assertNoPublicStorageReferences(sourcePool: QueryClient, keys: string[]): Promise<void> {
  const references = await sourcePool.query<{ storage_key: string }>(
    `SELECT storage_key FROM cms_media_assets WHERE storage_key=ANY($1::text[])
     UNION
     SELECT storage_key FROM cms_media_versions WHERE storage_key=ANY($1::text[])`,
    [keys],
  );
  if (publicStorageReferenceOverlap(keys, references.rows.map((row) => row.storage_key)).length) {
    throw new Error("Refusing cleanup because public CMS data references a fixture storage object.");
  }
}
async function listOwnedFixtureObjects(
  bucket: ReturnType<Storage["bucket"]>,
  receipt: CleanupReceipt,
): Promise<string[]> {
  const [files] = await bucket.getFiles({ prefix: `${receipt.storageRoot}/cms-media/` });
  const keys = files.map((file) => file.name);
  if (keys.some((key) => !isConfiguredMediaKey(receipt.storageRoot, key))) {
    throw new Error("Refusing cleanup because object listing escaped the exact fixture namespace.");
  }
  return keys;
}
async function validateReceiptIdentities(fixture: QueryClient, receipt: CleanupReceipt): Promise<void> {
  const users = await fixture.query<{ id: string; email: string; role: Role }>(
    "SELECT id::text id,email,role FROM cms_users WHERE id=ANY($1::uuid[])",
    [receipt.users.map((user) => user.id)],
  );
  if (users.rows.length !== receipt.users.length || receipt.users.some((expected) =>
    !users.rows.some((actual) => actual.id === expected.id && actual.email === expected.email && actual.role === expected.role))) {
    throw new Error("Refusing cleanup because fixture user identities do not match the durable receipt.");
  }
  const documents = await fixture.query<{ id: string; kind: CmsDocumentKind }>(
    "SELECT id::text id,kind FROM cms_documents WHERE id=ANY($1::uuid[])",
    [receipt.documents.map((document) => document.id)],
  );
  if (documents.rows.length !== receipt.documents.length || receipt.documents.some((expected) =>
    !documents.rows.some((actual) => actual.id === expected.id && actual.kind === expected.kind))) {
    throw new Error("Refusing cleanup because fixture document identities do not match the durable receipt.");
  }
}
async function cleanupFromReceipt(receipt: CleanupReceipt, statePath?: string): Promise<void> {
  requireDevelopmentTarget();
  const state = receipt;
  if (!SCHEMA.test(state.schema)) throw new Error("Refusing cleanup for an invalid schema name.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  if (process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID !== state.bucketName) {
    throw new Error("Configured object bucket differs from the fixture bucket; refusing cleanup.");
  }
  const sourcePool = await defaultPool();
  const fixture = await fixturePool(databaseUrl, state.schema);
  try {
    const publicBefore = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicBefore)) {
      throw new Error("Public preservation baseline changed; cleanup made no changes and retained its receipt.");
    }
    const schemaExists = await sourcePool.query<{ exists: boolean }>(
      "SELECT to_regnamespace($1) IS NOT NULL AS exists", [state.schema],
    );
    const schemaMode = cleanupSchemaValidationMode(state.phase, Boolean(schemaExists.rows[0]?.exists));
    const bucket = await storageClient(state.bucketName);
    const namespaceKeys = await listOwnedFixtureObjects(bucket, state);
    let databaseKeys: string[] = [];
    if (schemaMode === "ready") {
      if (!await hasTable(fixture, "cms_documents")) throw new Error("Fixture schema is missing cms_documents.");
      await validateReceiptIdentities(fixture, state);
      const assets = await fixture.query<{ storage_key: string }>(
        "SELECT storage_key FROM cms_media_assets WHERE storage_key IS NOT NULL UNION SELECT storage_key FROM cms_media_versions WHERE storage_key IS NOT NULL",
      );
      databaseKeys = assets.rows.map((row) => row.storage_key).filter((key) => !key.startsWith("pending:"));
    }
    const allKeys = [...new Set([...databaseKeys, ...state.storageKeys, ...namespaceKeys])];
    if (allKeys.some((key) => !isConfiguredMediaKey(state.storageRoot, key))) {
      throw new Error("Refusing cleanup for a storage key outside the exact fixture namespace.");
    }
    await assertNoPublicStorageReferences(sourcePool, allKeys);
    for (const key of allKeys) {
      await bucket.file(key).delete({ ignoreNotFound: true });
    }
    await fixture.end();
    if (schemaMode !== "absent") {
      await sourcePool.query(`DROP SCHEMA IF EXISTS "${state.schema}" CASCADE`);
    }
    const remains = await sourcePool.query<{ exists: boolean }>(
      "SELECT to_regnamespace($1) IS NOT NULL AS exists", [state.schema],
    );
    if (remains.rows[0]?.exists) throw new Error("Fixture schema still exists after cleanup.");
    const after = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, after)) {
      throw new Error("Public content/publication/media preservation baseline changed during cleanup; receipt was retained.");
    }
    if (statePath) await unlink(statePath).catch(() => undefined);
    await unlink(cleanupReceiptPath(state.schema));
    process.stdout.write("Task 345 fixture cleaned up; public preservation baseline matched exactly.\n");
  } catch (error) {
    await fixture.end().catch(() => undefined);
    throw error;
  } finally {
    await sourcePool.end().catch(() => undefined);
  }
}
async function cleanup(statePath: string): Promise<void> {
  const state = await readState(statePath);
  const expected = validateCleanupReceipt(cleanupReceiptFromState(state));
  const durable = await readCleanupReceipt(cleanupReceiptPath(state.schema));
  if (JSON.stringify(expected) !== JSON.stringify(durable)) {
    throw new Error("Private state and durable cleanup receipt disagree; refusing cleanup.");
  }
  await cleanupFromReceipt(durable, statePath);
}
async function recoverCleanup(): Promise<void> {
  requireDevelopmentTarget();
  let names: string[];
  try {
    names = (await readdir(cleanupReceiptDirectory)).filter((name) => SCHEMA.test(name.replace(/\.json$/, "")) && name.endsWith(".json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      process.stdout.write("NO OP: no durable Task 345 cleanup receipts exist.\n");
      return;
    }
    throw error;
  }
  if (!names.length) {
    process.stdout.write("NO OP: no durable Task 345 cleanup receipts exist.\n");
    return;
  }
  for (const name of names.sort()) {
    const receipt = await readCleanupReceipt(path.join(cleanupReceiptDirectory, name));
    await cleanupFromReceipt(receipt);
  }
}
async function verify(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  const state = await readState(statePath);
  if (state.phase !== "ready") throw new Error("Fixture state is not ready for verification.");
  const pool = await fixturePool(process.env.DATABASE_URL!, state.schema);
  try {
    await requireCompleteFixtureSchema(pool);
    const docs = await pool.query<{ count: string }>("SELECT count(*)::text count FROM cms_documents");
    const refs = await pool.query<{ count: string }>("SELECT count(*)::text count FROM cms_media_references");
    const assets = await pool.query<{ id: string; storage_key: string; status: string }>(
      "SELECT id::text id,storage_key,status FROM cms_media_assets ORDER BY id",
    );
    const reviewer = state.users.find((user) => user.label === "reviewer")!;
    const assignments = await pool.query<{ count: string }>(
      `SELECT count(*)::text count
         FROM cms_editorial_assignments assignment
         JOIN cms_market_editions edition ON edition.id=assignment.edition_id
        WHERE assignment.document_id=ANY($1::uuid[])
          AND edition.market='ksa'
          AND edition.locale='en'
          AND assignment.reviewer_user_id=$2`,
      [state.documents.map((document) => document.id), reviewer.id],
    );
    if (Number(docs.rows[0]?.count) !== cmsDocumentKinds.length) {
      throw new Error("Fixture verification found an unexpected document count.");
    }
    if (!Number(refs.rows[0]?.count)) throw new Error("Fixture verification found no media references.");
    if (Number(assignments.rows[0]?.count) !== cmsDocumentKinds.length) {
      throw new Error("Fixture verification found a missing or incorrect KSA reviewer assignment.");
    }
    const bucket = await storageClient(state.bucketName);
    for (const asset of assets.rows) {
      if (asset.status !== "active" || !isConfiguredMediaKey(state.storageRoot, asset.storage_key)) continue;
      await bucket.file(asset.storage_key).getMetadata();
    }
    process.stdout.write(`Task 345 fixture verified: ${docs.rows[0]?.count} kinds, ${refs.rows[0]?.count} immutable media references, capability matrix ${state.capabilities}.\n`);
  } finally {
    await pool.end();
  }
}
async function baseline(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  await assertPrivateFile(statePath, false);
  const pool = await defaultPool();
  try {
    await publicTableRequired(pool, [
      "cms_documents", "cms_market_editions", "cms_revisions",
      "cms_media_references", "cms_document_market_availability",
    ]);
    await writePrivateJson(statePath, await captureBaseline(pool));
    process.stdout.write(`Read-only Task 345 preservation baseline written to ${statePath} (mode 600).\n`);
  } finally {
    await pool.end();
  }
}
async function totp(statePath: string): Promise<void> {
  const state = await readState(statePath);
  const role = flag("--role") ?? "author";
  const user = state.users.find((candidate) => candidate.label === role);
  if (!user) throw new Error(`No fixture user named ${role}.`);
  const security = await import(pathToFileURL(
    path.join(repositoryRoot, "artifacts/api-server/src/lib/security.ts"),
  ).href) as SecurityHelpers;
  process.stdout.write(`${security.totp(user.totpSecret)}\n`);
}

type ProxyTarget = { origin: string; preserveHost?: boolean };
function proxyServer(apiOrigin: string, frontendOrigin: string | undefined, websiteOrigin?: string): http.Server {
  const server = http.createServer((request, response) => {
    const pageOrigin = websiteOrigin && !request.url?.startsWith("/admin")
      ? websiteOrigin : frontendOrigin;
    const target: ProxyTarget | undefined = request.url?.startsWith("/api/")
      ? { origin: apiOrigin, preserveHost: true }
      : pageOrigin ? { origin: pageOrigin } : undefined;
    if (!target || !request.url) {
      response.writeHead(503, { "content-type": "text/plain" });
      response.end("Fixture proxy has no frontend upstream. Pass --frontend-upstream.\n");
      return;
    }
    const upstream = new URL(target.origin);
    const transport = upstream.protocol === "https:" ? https : http;
    const headers = { ...request.headers, host: target.preserveHost ? request.headers.host : upstream.host };
    const outgoing = transport.request({
      protocol: upstream.protocol,
      hostname: upstream.hostname,
      port: upstream.port || undefined,
      method: request.method,
      path: request.url,
      headers,
    }, (incoming) => {
      response.writeHead(incoming.statusCode ?? 502, incoming.headers);
      incoming.pipe(response);
    });
    outgoing.on("error", () => {
      if (!response.headersSent) response.writeHead(502);
      response.end("Fixture upstream is unavailable.\n");
    });
    request.pipe(outgoing);
  });
  return server;
}
async function listen(server: http.Server, port: number): Promise<number> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve());
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Fixture server did not expose a TCP address.");
  return address.port;
}
async function serve(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  const state = await readState(statePath);
  if (state.phase !== "ready") throw new Error("Fixture state is not ready to serve.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  // @workspace/db creates its singleton on first import. Scope it before the
  // guard imports that module, otherwise the API silently retains public.
  process.env.DATABASE_URL = withSearchPath(databaseUrl, state.schema);
  process.env.SESSION_SECRET = state.sessionSecret;
  process.env.PRIVATE_OBJECT_DIR = state.storageRoot;
  const guard = await fixturePool(databaseUrl, state.schema);
  try {
    await requireCompleteFixtureSchema(guard);
  } finally {
    await guard.end();
  }
  const { default: app } = await import(pathToFileURL(
    path.join(repositoryRoot, "artifacts/api-server/src/app.ts"),
  ).href);
  const api = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => api.once("listening", resolve));
  const apiAddress = api.address();
  if (!apiAddress || typeof apiAddress === "string") throw new Error("Fixture API did not expose a TCP address.");
  const apiOrigin = `http://127.0.0.1:${apiAddress.port}`;
  const frontendOrigin = flag("--frontend-upstream");
  const proxy = proxyServer(apiOrigin, frontendOrigin, flag("--website-upstream"));
  const proxyPort = await listen(proxy, Number(flag("--proxy-port") ?? 0));
  process.stdout.write(
    `Task 345 fixture API: ${apiOrigin}\n` +
    `Task 345 fixture proxy: http://127.0.0.1:${proxyPort}\n` +
    (frontendOrigin ? "Frontend upstream is opt-in; no workflow configuration was changed.\n" :
      "No frontend upstream was configured; API-only mode is active.\n"),
  );
  await new Promise<void>((resolve) => {
    const close = () => {
      proxy.close();
      api.close(() => resolve());
    };
    process.once("SIGINT", close);
    process.once("SIGTERM", close);
  });
}
async function repairAvailabilityIdentity(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  const state = await readState(statePath);
  if (state.phase !== "ready") throw new Error("Fixture state is not ready for repair.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const apply = hasFlag("--apply");
  const sourcePool = await defaultPool();
  const pool = await fixturePool(databaseUrl, state.schema);
  const documentIds = state.documents.map((document) => document.id);
  try {
    const publicBefore = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicBefore)) {
      throw new Error("Refusing fixture repair: the public website preservation baseline changed.");
    }
    await requireCompleteFixtureSchema(pool);
    await pool.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const before = await pool.query<{
      total: string; dangling: string; correct: string;
    }>(
      `SELECT count(*)::text total,
              count(*) FILTER (WHERE document_edition.id IS NOT NULL)::text dangling,
              count(*) FILTER (
                WHERE configured.id IS NOT NULL
                  AND EXISTS (
                    SELECT 1 FROM cms_market_editions exact
                     WHERE exact.document_id=availability.document_id
                       AND exact.market=configured.code
                       AND exact.locale=availability.locale
                  )
              )::text correct
         FROM cms_document_market_availability availability
         LEFT JOIN cms_market_editions document_edition
           ON document_edition.id=availability.market_edition_id
          AND document_edition.document_id=availability.document_id
          AND document_edition.market IN ('uae','ksa')
          AND document_edition.locale=availability.locale
         LEFT JOIN market_editions configured
           ON configured.id=availability.market_edition_id
          AND configured.code IN ('uae','ksa')
        WHERE availability.document_id=ANY($1::uuid[])
       `,
      [documentIds],
    );
    const expected = state.documents.length * 2;
    const total = Number(before.rows[0]?.total ?? 0);
    const dangling = Number(before.rows[0]?.dangling ?? 0);
    const correct = Number(before.rows[0]?.correct ?? 0);
    if (total !== expected) {
      throw new Error(`Refusing repair: expected exactly ${expected} owned UAE/KSA availability rows, found ${total}.`);
    }
    if (correct === expected && dangling === 0) {
      await pool.query("ROLLBACK");
      const publicAfter = await captureBaseline(sourcePool);
      if (!preservationMatches(state.baseline, publicAfter)) {
        throw new Error("Public website preservation baseline changed during no-op repair check.");
      }
      process.stdout.write(
        `NO OP: all ${expected} owned availability rows already reference configured UAE/KSA market IDs in isolated schema ${state.schema}; no visibility rows were written.\n`,
      );
      return;
    }
    if (dangling !== expected || correct !== 0) {
      throw new Error("Refusing repair: owned availability rows are partial, mixed, or outside the UAE/KSA identity scope.");
    }
    if (!apply) {
      await pool.query("ROLLBACK");
      process.stdout.write(
        `DRY RUN: would remap exactly ${expected} Task 345 availability rows in isolated schema ${state.schema}; ` +
        `published/draft decisions, revisions, publication pointers, and availability state are unchanged.\n`,
      );
      return;
    }
    const updated = await pool.query<{ count: string }>(
      `WITH repaired AS (
         UPDATE cms_document_market_availability availability
            SET market_edition_id=configured.id
           FROM cms_market_editions document_edition
           JOIN market_editions configured ON configured.code=document_edition.market
          WHERE availability.document_id=ANY($1::uuid[])
            AND availability.market_edition_id=document_edition.id
            AND document_edition.document_id=availability.document_id
            AND document_edition.market IN ('uae','ksa')
            AND document_edition.locale=availability.locale
            AND configured.enabled=true
          RETURNING availability.document_id
       ) SELECT count(*)::text count FROM repaired`,
      [documentIds],
    );
    if (Number(updated.rows[0]?.count ?? 0) !== expected) {
      throw new Error(`Repair changed ${updated.rows[0]?.count ?? 0} rows; expected exactly ${expected}.`);
    }
    const remaining = await pool.query<{ count: string }>(
      `SELECT count(*)::text count
         FROM cms_document_market_availability availability
         JOIN cms_market_editions document_edition
           ON document_edition.id=availability.market_edition_id
        WHERE availability.document_id=ANY($1::uuid[])`,
      [documentIds],
    );
    if (remaining.rows[0]?.count !== "0") {
      throw new Error("Repair invariant failed: an owned availability row still references a document edition.");
    }
    await pool.query("COMMIT");
    const publicAfter = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicAfter)) {
      throw new Error("Public website preservation baseline changed during fixture repair.");
    }
    process.stdout.write(
      `Repaired exactly ${expected} owned availability identity mappings in isolated schema ${state.schema}; ` +
      `decisions and all revision/publication pointers were preserved.\n`,
    );
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await pool.end();
    await sourcePool.end();
  }
}
async function repairAvailabilityState(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  const state = await readState(statePath);
  if (state.phase !== "ready") throw new Error("Fixture state is not ready for repair.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const apply = hasFlag("--apply");
  const sourcePool = await defaultPool();
  const pool = await fixturePool(databaseUrl, state.schema);
  const documentIds = state.documents.map((document) => document.id);
  const author = state.users.find((user) => user.label === "author");
  if (!author) throw new Error("Refusing availability-state repair: the owned author identity is missing.");
  type PublishedStateSnapshot = {
    states: unknown[];
    availability: unknown[];
  };
  const publishedStateSnapshot = async (): Promise<PublishedStateSnapshot> => {
    const states = await pool.query(
      `SELECT document_id::text document_id,published_version,
              published_source_revision_id::text published_source_revision_id
         FROM cms_document_availability_states
        WHERE document_id=ANY($1::uuid[])
        ORDER BY document_id`,
      [documentIds],
    );
    const availability = await pool.query(
      `SELECT document_id::text document_id,market_edition_id::text market_edition_id,
              locale,published_decision
         FROM cms_document_market_availability
        WHERE document_id=ANY($1::uuid[])
        ORDER BY document_id,market_edition_id,locale`,
      [documentIds],
    );
    return { states: states.rows, availability: availability.rows };
  };
  const snapshotsMatch = (before: PublishedStateSnapshot, after: PublishedStateSnapshot): boolean =>
    JSON.stringify(before) === JSON.stringify(after);
  try {
    const publicBefore = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicBefore)) {
      throw new Error("Refusing availability-state repair: the public website preservation baseline changed.");
    }
    await requireCompleteFixtureSchema(pool);
    const fixtureBefore = await captureBaseline(pool);
    const publishedBefore = await publishedStateSnapshot();
    await pool.query(apply ? "BEGIN" : "BEGIN READ ONLY");

    const identities = await pool.query<{ id: string; email: string; role: Role }>(
      `SELECT id::text id,email,role FROM cms_users WHERE id=ANY($1::uuid[])`,
      [state.users.map((user) => user.id)],
    );
    if (identities.rows.length !== state.users.length ||
      state.users.some((user) => {
        const identity = identities.rows.find((candidate) => candidate.id === user.id);
        return !identity || identity.email !== user.email || identity.role !== user.role;
      })) {
      throw new Error("Refusing availability-state repair: fixture user identities are not exact.");
    }
    const documents = await pool.query<{ id: string; kind: CmsDocumentKind; owner_id: string }>(
      `SELECT id::text id,kind,owner_id::text owner_id
         FROM cms_documents
        WHERE id=ANY($1::uuid[])`,
      [documentIds],
    );
    if (documents.rows.length !== state.documents.length ||
      state.documents.some((document) =>
        !documents.rows.some((row) =>
          row.id === document.id && row.kind === document.kind && row.owner_id === author.id))) {
      throw new Error("Refusing availability-state repair: the owned fixture documents are not exact.");
    }
    const candidates = await pool.query<{
      document_id: string;
      row_count: string;
      configured_markets: string;
      differing_rows: string;
      draft_version: number;
      published_version: number;
    }>(
      `SELECT state.document_id::text document_id,
              count(availability.*)::text row_count,
              count(*) FILTER (WHERE market.code IN ('uae','ksa'))::text configured_markets,
              count(*) FILTER (
                WHERE availability.draft_decision IS DISTINCT FROM availability.published_decision
              )::text differing_rows,
              state.draft_version,state.published_version
         FROM cms_document_availability_states state
         LEFT JOIN cms_document_market_availability availability
           ON availability.document_id=state.document_id
         LEFT JOIN market_editions market ON market.id=availability.market_edition_id
        WHERE state.document_id=ANY($1::uuid[])
        GROUP BY state.document_id,state.draft_version,state.published_version
        ORDER BY state.document_id`,
      [documentIds],
    );
    if (candidates.rows.length !== state.documents.length ||
      candidates.rows.some((row) =>
        Number(row.row_count) !== 2 ||
        Number(row.configured_markets) !== 2 ||
        Number(row.differing_rows) < 1)) {
      throw new Error(
        "Refusing availability-state repair: each owned document must have exactly two configured UAE/KSA rows with a staged decision difference.",
      );
    }
    const eligible = candidates.rows.filter((row) => row.draft_version <= row.published_version);
    if (!apply) {
      await pool.query("ROLLBACK");
      const fixtureAfter = await captureBaseline(pool);
      const publishedAfter = await publishedStateSnapshot();
      if (!preservationMatches(fixtureBefore, fixtureAfter) || !snapshotsMatch(publishedBefore, publishedAfter)) {
        throw new Error("Availability-state repair changed fixture content during dry run.");
      }
      const publicAfter = await captureBaseline(sourcePool);
      if (!preservationMatches(state.baseline, publicAfter)) {
        throw new Error("Public website preservation baseline changed during availability-state dry run.");
      }
      process.stdout.write(
        eligible.length === 0
          ? `NO OP: no exact-owned Task 345 availability states have staged decisions with draft_version <= published_version; no rows were written.\n`
          : `DRY RUN: would repair ${eligible.length} exact-owned Task 345 availability states; ` +
            `draft versions would become published_version + 1, reviewed receipts/pins would be cleared, and published decisions/version/source pointers would be preserved.\n`,
      );
      return;
    }
    if (eligible.length === 0) {
      await pool.query("ROLLBACK");
      const publicAfter = await captureBaseline(sourcePool);
      if (!preservationMatches(state.baseline, publicAfter)) {
        throw new Error("Public website preservation baseline changed during availability-state no-op check.");
      }
      process.stdout.write(
        "NO OP: no exact-owned Task 345 availability states have staged decisions with draft_version <= published_version; no rows were written.\n",
      );
      return;
    }
    const stagedRowsUpdated = await pool.query<{ count: string }>(
      `WITH repaired AS (
         UPDATE cms_document_market_availability availability
            SET updated_by_user_id=$2
          WHERE availability.document_id=ANY($1::uuid[])
            AND availability.draft_decision IS DISTINCT FROM availability.published_decision
          RETURNING availability.document_id
       ) SELECT count(*)::text count FROM repaired`,
      [eligible.map((row) => row.document_id), author.id],
    );
    if (Number(stagedRowsUpdated.rows[0]?.count ?? 0) < eligible.length) {
      throw new Error("Availability-state repair invariant failed: staged rows were not attributed to the fixture author.");
    }
    const updated = await pool.query<{ count: string }>(
      `WITH repaired AS (
         UPDATE cms_document_availability_states state
            SET draft_version=state.published_version+1,
                reviewed_version=NULL,
                reviewed_source_revision_id=NULL,
                reviewed_selections='[]'::jsonb,
                reviewed_destination_pins='[]'::jsonb,
                reviewed_by_user_id=NULL,
                reviewed_at=NULL,
                updated_by_user_id=$2,
                updated_at=now()
          WHERE state.document_id=ANY($1::uuid[])
            AND state.draft_version<=state.published_version
            AND EXISTS (
              SELECT 1
                FROM cms_document_market_availability availability
               WHERE availability.document_id=state.document_id
                 AND availability.draft_decision IS DISTINCT FROM availability.published_decision
            )
          RETURNING state.document_id
       ) SELECT count(*)::text count FROM repaired`,
      [eligible.map((row) => row.document_id), author.id],
    );
    if (Number(updated.rows[0]?.count ?? 0) !== eligible.length) {
      throw new Error(`Availability-state repair changed ${updated.rows[0]?.count ?? 0} rows; expected exactly ${eligible.length}.`);
    }
    const fixtureAfter = await captureBaseline(pool);
    const publishedAfter = await publishedStateSnapshot();
    if (!preservationMatches(fixtureBefore, fixtureAfter) || !snapshotsMatch(publishedBefore, publishedAfter)) {
      throw new Error("Availability-state repair changed published decisions, pointers, content, revisions, or media pins.");
    }
    await pool.query("COMMIT");
    const publicAfter = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicAfter)) {
      throw new Error("Public website preservation baseline changed during availability-state repair.");
    }
    const repairedState = await pool.query<{
      document_id: string; draft_version: number; reviewed_version: number | null; published_version: number;
    }>(
      `SELECT document_id::text document_id,draft_version,reviewed_version,published_version
         FROM cms_document_availability_states
        WHERE document_id=ANY($1::uuid[])
        ORDER BY document_id`,
      [documentIds],
    );
    process.stdout.write(
      `Repaired ${eligible.length} exact-owned Task 345 availability states in isolated schema ${state.schema}; ` +
      `published decisions, versions, source pointers, content, revisions, and media pins were preserved.\n` +
      `Availability state after repair: ${JSON.stringify(repairedState.rows)}\n`,
    );
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await pool.end();
    await sourcePool.end();
  }
}
async function repairCapabilityMatrix(statePath: string): Promise<void> {
  requireDevelopmentTarget();
  const state = await readState(statePath);
  if (state.phase !== "ready") throw new Error("Fixture state is not ready for repair.");
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required.");
  const apply = hasFlag("--apply");
  const sourcePool = await defaultPool();
  const pool = await fixturePool(databaseUrl, state.schema);
  const ownedUsers = state.users;
  const ownedUserIds = ownedUsers.map((user) => user.id);
  const targetUsers = ownedUsers.filter((user) => user.label !== "administrator");
  const targetUserIds = targetUsers.map((user) => user.id);
  const allowedCapabilities = new Map<FixtureUser["label"], readonly string[]>([
    ["author", ["view", "edit", "review"]],
    ["reviewer", ["view", "edit", "review", "publish"]],
    ["publisher", ["view", "edit", "review", "publish"]],
  ]);
  try {
    const publicBefore = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicBefore)) {
      throw new Error("Refusing capability repair: the public website preservation baseline changed.");
    }
    await requireCompleteFixtureSchema(pool);
    const fixtureBefore = await captureBaseline(pool);
    await pool.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const identities = await pool.query<{ id: string; email: string; role: Role }>(
      `SELECT id::text id,email,role
         FROM cms_users
        WHERE id=ANY($1::uuid[])`,
      [ownedUserIds],
    );
    if (identities.rows.length !== ownedUsers.length) {
      throw new Error("Refusing capability repair: fixture user identities are incomplete.");
    }
    const identityById = new Map(identities.rows.map((row) => [row.id, row]));
    for (const user of ownedUsers) {
      const identity = identityById.get(user.id);
      if (!identity || identity.email !== user.email || identity.role !== user.role) {
        throw new Error(`Refusing capability repair: user ${user.label} is not the exact owned fixture identity.`);
      }
    }
    const documents = await pool.query<{ id: string; kind: CmsDocumentKind }>(
      `SELECT id::text id,kind
         FROM cms_documents
        WHERE id=ANY($1::uuid[])`,
      [state.documents.map((document) => document.id)],
    );
    if (documents.rows.length !== state.documents.length ||
      state.documents.some((document) =>
        !documents.rows.some((row) => row.id === document.id && row.kind === document.kind))) {
      throw new Error("Refusing capability repair: the ten owned fixture documents are not exact.");
    }
    const enabledMarkets = (await pool.query<{ code: string }>(
      "SELECT code FROM market_editions WHERE enabled=true ORDER BY code",
    )).rows.map((row) => row.code);
    if (!enabledMarkets.length) throw new Error("Refusing capability repair: no enabled fixture destinations exist.");
    const grants = await pool.query<{
      user_id: string; topic: string; capability: string; scope: "regional" | "shared"; market_code: string;
    }>(
      `SELECT user_id::text user_id,topic,capability,scope,market_code
         FROM cms_user_capability_grants
        WHERE user_id=ANY($1::uuid[])`,
      [targetUserIds],
    );
    const authorId = ownedUsers.find((user) => user.label === "author")!.id;
    if (grants.rows.some((grant) => grant.user_id === authorId && grant.capability === "publish")) {
      throw new Error("Refusing capability repair: the owned author already has publish authority.");
    }
    const grantKey = (userId: string, topic: string, capability: string, scope: string, market: string) =>
      `${userId}\u0000${topic}\u0000${capability}\u0000${scope}\u0000${market}`;
    const existing = new Set(grants.rows.map((grant) =>
      grantKey(grant.user_id, grant.topic, grant.capability, grant.scope, grant.market_code)));
    const missing: Array<[string, CmsDocumentKind, string, string]> = [];
    for (const user of targetUsers) {
      const capabilities = allowedCapabilities.get(user.label);
      if (!capabilities) throw new Error(`Refusing capability repair: unsupported fixture user ${user.label}.`);
      for (const topic of cmsDocumentKinds) {
        for (const capability of capabilities) {
          for (const market of enabledMarkets) {
            if (!existing.has(grantKey(user.id, topic, capability, "shared", market))) {
              missing.push([user.id, topic, capability, market]);
            }
          }
        }
      }
    }
    const configured = await pool.query<{ user_id: string }>(
      `SELECT user_id::text user_id
         FROM cms_user_capability_configurations
        WHERE user_id=ANY($1::uuid[])`,
      [targetUserIds],
    );
    const configuredUsers = new Set(configured.rows.map((row) => row.user_id));
    const missingConfigurations = targetUsers.filter((user) => !configuredUsers.has(user.id));
    if (!apply) {
      await pool.query("ROLLBACK");
      const fixtureAfter = await captureBaseline(pool);
      if (!preservationMatches(fixtureBefore, fixtureAfter)) {
        throw new Error("Fixture content changed during capability repair dry run.");
      }
      const publicAfter = await captureBaseline(sourcePool);
      if (!preservationMatches(state.baseline, publicAfter)) {
        throw new Error("Public website preservation baseline changed during capability repair dry run.");
      }
      process.stdout.write(
        `DRY RUN: would add ${missing.length} shared capability grants across ${enabledMarkets.length} enabled destinations ` +
        `for the three non-administrator Task 345 users and ${missingConfigurations.length} matrix configurations; ` +
        "no content, revision, availability, or publication rows would be written.\n",
      );
      return;
    }
    const administrator = ownedUsers.find((user) => user.label === "administrator")!;
    for (const user of missingConfigurations) {
      await pool.query(
        `INSERT INTO cms_user_capability_configurations(user_id,configured_by_user_id)
         VALUES ($1,$2)
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, administrator.id],
      );
    }
    for (const [userId, topic, capability, market] of missing) {
      await pool.query(
        `INSERT INTO cms_user_capability_grants
           (user_id,topic,capability,scope,market_code,created_by_user_id)
         VALUES ($1,$2,$3,'shared',$4,$5)
         ON CONFLICT DO NOTHING`,
        [userId, topic, capability, market, administrator.id],
      );
    }
    const remaining = await pool.query<{ count: string }>(
      `SELECT count(*)::text count
         FROM cms_user_capability_grants
        WHERE user_id=ANY($1::uuid[])
          AND scope='shared'
          AND market_code=ANY($2::text[])`,
      [targetUserIds, enabledMarkets],
    );
    const expectedShared = targetUsers.reduce((total, user) =>
      total + cmsDocumentKinds.length * (allowedCapabilities.get(user.label)?.length ?? 0) * enabledMarkets.length, 0);
    if (Number(remaining.rows[0]?.count ?? 0) < expectedShared) {
      throw new Error("Capability repair invariant failed: shared authority remains incomplete.");
    }
    const fixtureAfter = await captureBaseline(pool);
    if (!preservationMatches(fixtureBefore, fixtureAfter)) {
      throw new Error("Capability repair changed fixture content, revisions, availability, or media pins.");
    }
    await pool.query("COMMIT");
    const publicAfter = await captureBaseline(sourcePool);
    if (!preservationMatches(state.baseline, publicAfter)) {
      throw new Error("Public website preservation baseline changed during capability repair.");
    }
    process.stdout.write(
      missing.length === 0 && missingConfigurations.length === 0
        ? `NO OP: owned Task 345 users already have prerequisite-complete shared authority across ${enabledMarkets.length} enabled destinations; no capability rows were written.\n`
        : `Repaired ${missing.length} shared capability grants and ${missingConfigurations.length} matrix configurations for exact owned Task 345 users; content, revisions, availability, and publication pointers were preserved.\n`,
    );
  } catch (error) {
    await pool.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    await pool.end();
    await sourcePool.end();
  }
}
function usage(): void {
  process.stdout.write(
    [
      "Task 345 isolated acceptance fixture (development database only)",
      "",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development setup --state /tmp/task-345.json",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development baseline --state /tmp/task-345-baseline.json",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development serve --state /tmp/task-345.json",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development serve --state /tmp/task-345.json --frontend-upstream http://127.0.0.1:5173",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development verify --state /tmp/task-345.json",
       "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development repair-availability --state /tmp/task-345.json",
       "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development repair-availability --apply --state /tmp/task-345.json",
       "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development repair-availability-state --state /tmp/task-345.json",
       "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development repair-availability-state --apply --state /tmp/task-345.json",
       "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development repair-capabilities --state /tmp/task-345.json",
       "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development repair-capabilities --apply --state /tmp/task-345.json",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development totp --state /tmp/task-345.json --role author",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development cleanup --state /tmp/task-345.json",
      "  pnpm --filter @workspace/scripts cms:task-345-harness -- --development recover-cleanup",
      "",
      "State and credentials remain in the mode-600 file; secret values are never printed.",
    ].join("\n") + "\n",
  );
}
async function main(): Promise<void> {
  const command = args().find((value) => [
    "setup", "baseline", "serve", "verify", "totp", "cleanup", "repair-availability",
    "repair-availability-state", "repair-capabilities", "recover-cleanup",
  ].includes(value));
  if (!command) {
    usage();
    return;
  }
  if (command === "recover-cleanup") {
    await recoverCleanup();
    return;
  }
  const statePath = privatePath(flag("--state") ?? flag("--credentials"), "--state");
  if (command === "setup") await setup(statePath);
  else if (command === "baseline") await baseline(statePath);
  else if (command === "serve") await serve(statePath);
  else if (command === "verify") await verify(statePath);
  else if (command === "totp") await totp(statePath);
  else if (command === "repair-availability") await repairAvailabilityIdentity(statePath);
  else if (command === "repair-availability-state") await repairAvailabilityState(statePath);
  else if (command === "repair-capabilities") await repairCapabilityMatrix(statePath);
  else await cleanup(statePath);
}
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Task 345 fixture failed."}\n`);
    process.exitCode = 1;
  });
}