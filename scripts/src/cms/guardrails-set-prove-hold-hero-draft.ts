/**
 * Stages one development-only successor of the exact Set, Prove & Hold
 * revision with the route-owned Guardrails hero attached.
 *
 * This is deliberately separate from the media-free replacement receipt and
 * from the post-merge release command.  It may create a draft and a pending
 * media reference, but it never approves a revision or moves a publication
 * pointer.  A pending asset is usable only through the authenticated CMS
 * preview capability.
 */
import { createHash } from "node:crypto";
import { chmod, lstat, open, readFile, rename, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pool } from "@workspace/db";
import { validateCmsSnapshot } from "@workspace/api-zod";
import {
  GUARDRAILS_SET_PROVE_HOLD_OPERATION,
  GUARDRAILS_SET_PROVE_HOLD_RECEIPT,
  guardrailsSetProveHoldResultDigest,
  guardrailsSetProveHoldSnapshot,
  guardrailsSetProveHoldSnapshotDigest,
} from "./guardrails-set-prove-hold-reconciliation.js";
import { GUARDRAILS_HERO } from "./guardrails-redesign.js";
import { objectStorageClient } from "./object-storage.js";

type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{
    rowCount: number | null;
    rows: Array<Record<string, any>>;
  }>;
};

type HeroPin = {
  mediaId: string;
  mediaVersionId: string;
  storageKey: string;
};

type PublisherCredentials = {
  email: string;
  password: string;
  totpSecret: string;
};

type FixtureUser = {
  role: "administrator" | "editor";
  email: string;
  password: string;
  totpSecret: string;
};

type FixtureState = {
  version: 1;
  phase: "ready";
  users: FixtureUser[];
};

const repositoryRootFromScript = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const verify = args.includes("--verify-db");
const preview = args.includes("--preview");
const target = args.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);
const credentialsPath = args.find((argument) => argument.startsWith("--credentials="))?.slice("--credentials=".length);
const previewFile = args.find((argument) => argument.startsWith("--preview-file="))?.slice("--preview-file=".length)
  ?? "/tmp/guardrails-set-prove-hold-hero-preview.json";
const configuredApiBase = (
  args.find((argument) => argument.startsWith("--api-base="))?.slice("--api-base=".length)
  ?? process.env.CMS_API_BASE_URL
  ?? "http://localhost:80/api"
).replace(/\/+$/, "");
const apiOrigin = configuredApiBase.replace(/\/api$/, "");
const apiPrefix = configuredApiBase.endsWith("/api") ? "/api" : "/api";

export const GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT =
  "cms.guardrails.set-prove-hold-v1:hero-draft";
export const GUARDRAILS_SET_PROVE_HOLD_HERO_OPERATION =
  "cms.framework.guardrails-set-prove-hold-hero-draft-staged";
export const GUARDRAILS_SET_PROVE_HOLD_HERO_MEDIA_OPERATION =
  "cms.framework.guardrails-set-prove-hold-hero-media-staged";
const STAGING_AUTHOR_EMAIL = "cms-guardrails-set-prove-hold-hero@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Guardrails Set, Prove & Hold hero draft reconciliation";
const STAGING_REASON =
  "Development-only Guardrails Set, Prove & Hold successor with the route-owned hero attached. The hero remains pending review and publication remains unchanged.";
const HERO_MEDIA_RECEIPT = `${GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT}:media`;
const SOURCE_STORAGE_PREFIX = "cms-media/guardrails-boundaries-hero";
const PREVIEW_MODE = "authenticated-cms-api";

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export function guardrailsSetProveHoldHeroSnapshot(hero: {
  mediaId: string;
  mediaVersionId: string;
}) {
  const baseline = guardrailsSetProveHoldSnapshot as Record<string, any>;
  const baselineSeo = baseline.seo && typeof baseline.seo === "object"
    ? baseline.seo
    : {};
  const content = {
    ...baseline.content,
    heroMedia: {
      mediaId: hero.mediaId,
      mediaVersionId: hero.mediaVersionId,
      role: "hero" as const,
      altText: GUARDRAILS_HERO.altText,
    },
  };
  const currentMediaIds = Array.isArray(baseline.mediaIds)
    ? baseline.mediaIds.filter((item): item is string => typeof item === "string")
    : [];
  return {
    ...baseline,
    content,
    seo: {
      ...baselineSeo,
      ogImageMedia: {
        mediaId: hero.mediaId,
        mediaVersionId: hero.mediaVersionId,
        role: "og-image" as const,
        altText: GUARDRAILS_HERO.altText,
      },
    },
    mediaIds: currentMediaIds.includes(hero.mediaId)
      ? currentMediaIds
      : [...currentMediaIds, hero.mediaId],
  };
}

export function guardrailsSetProveHoldHeroSnapshotDigest(hero: {
  mediaId: string;
  mediaVersionId: string;
}) {
  return digest(guardrailsSetProveHoldHeroSnapshot(hero));
}

export function guardrailsSetProveHoldHeroRequestDigest(
  baselineRevisionId: string,
  hero: { mediaId: string; mediaVersionId: string },
) {
  return digest({
    baselineRevisionId,
    baselineDigest: guardrailsSetProveHoldSnapshotDigest,
    hero: { mediaId: hero.mediaId, mediaVersionId: hero.mediaVersionId },
    snapshotDigest: guardrailsSetProveHoldHeroSnapshotDigest(hero),
  });
}

export function guardrailsSetProveHoldHeroResultDigest(
  revisionId: string,
  hero: { mediaId: string; mediaVersionId: string },
) {
  return digest({
    revisionId,
    snapshotDigest: guardrailsSetProveHoldHeroSnapshotDigest(hero),
  });
}

export function assertDevelopmentTarget(environment = process.env): void {
  if (target !== "development") {
    throw new Error("Guardrails hero draft work requires --target=development.");
  }
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Guardrails hero draft staging is disabled in production.");
  }
  if (!environment.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for development reconciliation.");
  }
  if (!environment.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !environment.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is required for Guardrails hero staging.");
  }
}

function privateObjectKey(): string {
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  return `${prefix}/${SOURCE_STORAGE_PREFIX}-${GUARDRAILS_HERO.checksum}`;
}

function expectedMediaMetadata(value: unknown): Record<string, any> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, any>
    : {};
}

function assertHeroMediaRow(row: Record<string, any>, expectedStorageKey?: string): void {
  const metadata = expectedMediaMetadata(row.metadata);
  if (
    row.media_type !== GUARDRAILS_HERO.mimeType
    || Number(row.byte_size) !== GUARDRAILS_HERO.byteSize
    || row.checksum !== GUARDRAILS_HERO.checksum
    || row.filename !== GUARDRAILS_HERO.filename
    || row.original_filename !== GUARDRAILS_HERO.filename
    || row.alt_text !== GUARDRAILS_HERO.altText
    || row.collection !== "website"
    || !["pending-review", "active", "ready"].includes(String(row.status))
    || (expectedStorageKey !== undefined && row.storage_key !== expectedStorageKey)
    || row.version_asset_id !== undefined && row.version_asset_id !== row.asset_id
    || Number(row.version_number) !== 1
    || row.version_storage_key !== row.storage_key
    || row.version_checksum !== GUARDRAILS_HERO.checksum
    || Number(row.version_byte_size) !== GUARDRAILS_HERO.byteSize
    || Number(row.width) !== GUARDRAILS_HERO.width
    || Number(row.height) !== GUARDRAILS_HERO.height
    || !["needs-review", "approved-use"].includes(String(metadata.rightsStatus))
    || !["needs-review", "approved"].includes(String(metadata.accessibilityStatus))
  ) {
    throw new Error("Guardrails hero media authority does not match the immutable route-owned source.");
  }
}

async function sourceBytes(): Promise<Buffer> {
  const bytes = await readFile(`${repositoryRootFromScript}/${GUARDRAILS_HERO.sourceFile}`);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (bytes.length !== GUARDRAILS_HERO.byteSize || checksum !== GUARDRAILS_HERO.checksum) {
    throw new Error("The route-owned Guardrails hero source differs from its immutable manifest.");
  }
  return bytes;
}

async function verifyObject(
  storageKey: string,
  bytes: Buffer,
  allowCreate: boolean,
): Promise<void> {
  const object = objectStorageClient
    .bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!)
    .file(storageKey);
  const [exists] = await object.exists();
  if (!exists) {
    if (!allowCreate) throw new Error("The private Guardrails hero object is missing.");
    await object.save(bytes, {
      resumable: false,
      contentType: GUARDRAILS_HERO.mimeType,
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
        metadata: {
          checksum: GUARDRAILS_HERO.checksum,
          source: GUARDRAILS_SET_PROVE_HOLD_HERO_MEDIA_OPERATION,
          intendedRoute: GUARDRAILS_HERO.intendedRoute,
        },
      },
    });
  }
  const [[metadata], [stored]] = await Promise.all([
    object.getMetadata(),
    object.download(),
  ]);
  const storedChecksum = createHash("sha256").update(stored).digest("hex");
  if (
    Number(metadata.size) !== GUARDRAILS_HERO.byteSize
    || metadata.contentType !== GUARDRAILS_HERO.mimeType
    || stored.length !== GUARDRAILS_HERO.byteSize
    || storedChecksum !== GUARDRAILS_HERO.checksum
  ) {
    throw new Error("Private Guardrails hero object metadata or bytes conflict with the governed source.");
  }
}

async function findPreflightMedia(client: SqlClient): Promise<Record<string, any> | null> {
  const candidates = await client.query(
    `SELECT a.id::text asset_id,a.storage_key,a.filename,a.original_filename,a.media_type,
            a.byte_size,a.checksum,a.alt_text,a.collection,a.status,
            v.id::text media_version_id,v.asset_id::text version_asset_id,
            v.version_number,v.storage_key version_storage_key,v.checksum version_checksum,
            v.byte_size version_byte_size,v.width,v.height,v.metadata
       FROM cms_media_assets a
       JOIN cms_media_versions v ON v.asset_id=a.id AND v.version_number=1
      WHERE a.checksum=$1 AND a.byte_size=$2 AND a.media_type=$3
        AND v.checksum=$1 AND v.byte_size=$2
      ORDER BY (a.storage_key=$4) DESC,a.created_at ASC,a.id ASC`,
    [GUARDRAILS_HERO.checksum, GUARDRAILS_HERO.byteSize, GUARDRAILS_HERO.mimeType, privateObjectKey()],
  );
  if (!candidates.rowCount) return null;
  const first = candidates.rows[0];
  const exactKey = candidates.rows.filter((row) => row.storage_key === privateObjectKey());
  if (exactKey.length > 1) {
    throw new Error("Multiple Guardrails hero assets claim the governed private storage key.");
  }
  if (!exactKey.length && candidates.rowCount > 1) {
    throw new Error("Multiple exact Guardrails hero assets exist without a deterministic storage identity.");
  }
  assertHeroMediaRow(first, exactKey.length ? privateObjectKey() : undefined);
  return first;
}

async function stageHeroMedia(
  client: SqlClient,
  author: { id: string; email: string } | null,
  preflight: Record<string, any> | null,
  storageKey: string,
  allowCreate: boolean,
): Promise<HeroPin> {
  const current = await findPreflightMedia(client);
  if (current) {
    assertHeroMediaRow(current, current.storage_key);
    if (
      (preflight && current.asset_id !== preflight.asset_id)
      || (!preflight && current.storage_key !== storageKey)
    ) {
      throw new Error("Guardrails hero media changed while the development reconciliation was waiting.");
    }
    return {
      mediaId: String(current.asset_id),
      mediaVersionId: String(current.media_version_id),
      storageKey: String(current.storage_key),
    };
  }
  if (!allowCreate) throw new Error("The exact Guardrails hero media row is missing.");
  if (preflight) {
    throw new Error("Guardrails hero media appeared with a conflicting identity during staging.");
  }
  const mediaAuthor = author ?? await stagingActor(client, true);
  const asset = await client.query(
    `INSERT INTO cms_media_assets
      (storage_key,filename,original_filename,media_type,byte_size,checksum,
       alt_text,credit,collection,status,uploaded_by_user_id)
     VALUES ($1,$2,$2,$3,$4,$5,$6,NULL,'website','pending-review',$7)
     RETURNING id::text asset_id,storage_key,filename,original_filename,media_type,
       byte_size,checksum,alt_text,collection,status`,
    [
      storageKey,
      GUARDRAILS_HERO.filename,
      GUARDRAILS_HERO.mimeType,
      GUARDRAILS_HERO.byteSize,
      GUARDRAILS_HERO.checksum,
      GUARDRAILS_HERO.altText,
      mediaAuthor.id,
    ],
  );
  if (asset.rowCount !== 1) throw new Error("Could not create the pending Guardrails hero asset.");
  const version = await client.query(
    `INSERT INTO cms_media_versions
      (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
     VALUES ($1,1,$2,$3,$4,$5,$6,$7)
     RETURNING id::text media_version_id,asset_id::text version_asset_id,version_number,
       storage_key version_storage_key,checksum version_checksum,byte_size version_byte_size,
       width,height,metadata`,
    [
      asset.rows[0].asset_id,
      storageKey,
      GUARDRAILS_HERO.checksum,
      GUARDRAILS_HERO.byteSize,
      GUARDRAILS_HERO.width,
      GUARDRAILS_HERO.height,
      {
        sourceFile: GUARDRAILS_HERO.sourceFile,
        sourceType: "user-confirmed-generated-image",
        intendedRoute: GUARDRAILS_HERO.intendedRoute,
        altText: GUARDRAILS_HERO.altText,
        rightsStatus: "needs-review",
        accessibilityStatus: "needs-review",
        sourceReview: "pending",
      },
    ],
  );
  if (version.rowCount !== 1) throw new Error("Could not create the immutable Guardrails hero version.");
  const row = { ...asset.rows[0], ...version.rows[0] };
  assertHeroMediaRow(row, storageKey);
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
    [
      HERO_MEDIA_RECEIPT,
      GUARDRAILS_SET_PROVE_HOLD_HERO_MEDIA_OPERATION,
      asset.rows[0].asset_id,
      digest({
        sourceFile: GUARDRAILS_HERO.sourceFile,
        checksum: GUARDRAILS_HERO.checksum,
        byteSize: GUARDRAILS_HERO.byteSize,
        storageKey,
      }),
      digest({ assetId: asset.rows[0].asset_id, mediaVersionId: version.rows[0].media_version_id }),
      mediaAuthor.id,
      {
        mediaVersionId: version.rows[0].media_version_id,
        status: "pending-review",
        rightsStatus: "needs-review",
        accessibilityStatus: "needs-review",
      },
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'media.draft-staged','media',$3,$4,$5)`,
    [
      mediaAuthor.id,
      mediaAuthor.email,
      asset.rows[0].asset_id,
      HERO_MEDIA_RECEIPT,
      {
        mediaVersionId: version.rows[0].media_version_id,
        status: "pending-review",
        rightsStatus: "needs-review",
        accessibilityStatus: "needs-review",
      },
    ],
  );
  return {
    mediaId: String(asset.rows[0].asset_id),
    mediaVersionId: String(version.rows[0].media_version_id),
    storageKey,
  };
}

async function stagingActor(client: SqlClient, allowCreate: boolean) {
  const existing = await client.query(
    "SELECT id::text,email FROM cms_users WHERE email=$1 FOR UPDATE",
    [STAGING_AUTHOR_EMAIL],
  );
  if (existing.rowCount === 1) return existing.rows[0] as { id: string; email: string };
  if (!allowCreate) throw new Error("The controlled Guardrails hero staging editor is missing.");
  const inserted = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
     VALUES ($1,$2,'editor','active',now()) RETURNING id::text,email`,
    [STAGING_AUTHOR_EMAIL, STAGING_AUTHOR_LABEL],
  );
  if (inserted.rowCount !== 1) throw new Error("Could not provision the controlled Guardrails hero staging editor.");
  return inserted.rows[0] as { id: string; email: string };
}

async function exactBaseline(client: SqlClient) {
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts
      WHERE idempotency_key=$1
      FOR UPDATE`,
    [GUARDRAILS_SET_PROVE_HOLD_RECEIPT],
  );
  if (
    receipt.rowCount !== 1
    || receipt.rows[0].operation !== GUARDRAILS_SET_PROVE_HOLD_OPERATION
    || receipt.rows[0].request_digest !== guardrailsSetProveHoldSnapshotDigest
    || receipt.rows[0].result_digest !== guardrailsSetProveHoldResultDigest(receipt.rows[0].subject_id)
  ) {
    throw new Error("The exact media-free Set, Prove & Hold receipt is required and must remain unchanged.");
  }
  const baseline = await client.query(
    `SELECT r.id::text revision_id,r.edition_id::text edition_id,r.revision_number,r.payload,
            r.content_digest,r.workflow_state,
            d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.market,e.locale,e.localized_slug,e.publication_state,
            e.published_revision_id::text published_revision_id
       FROM cms_revisions r
       JOIN cms_market_editions e ON e.id=r.edition_id
       JOIN cms_documents d ON d.id=e.document_id
      WHERE r.id=$1`,
    [receipt.rows[0].subject_id],
  );
  const row = baseline.rows[0];
  if (
    baseline.rowCount !== 1
    || row.revision_id !== receipt.rows[0].subject_id
    || row.content_digest !== guardrailsSetProveHoldSnapshotDigest
    || canonical(row.payload) !== canonical(guardrailsSetProveHoldSnapshot)
    || row.kind !== "framework"
    || row.canonical_slug !== guardrailsSetProveHoldSnapshot.slug
    || row.document_status !== "active"
    || row.market !== "uae"
    || row.locale !== "en"
    || row.localized_slug !== guardrailsSetProveHoldSnapshot.slug
    || !["draft", "rejected", "approved"].includes(String(row.workflow_state))
  ) {
    throw new Error("The receipted Set, Prove & Hold baseline no longer binds its exact editable edition.");
  }
  return row;
}

function assertDraftSnapshot(hero: HeroPin) {
  const snapshot = guardrailsSetProveHoldHeroSnapshot(hero);
  const validation = validateCmsSnapshot("framework", snapshot, "draft");
  if (!validation.success) {
    throw new Error(`Guardrails hero draft violates the CMS contract: ${validation.errors.join("; ")}`);
  }
  return snapshot;
}

export async function stageGuardrailsSetProveHoldHero(
  client: SqlClient,
  hero: HeroPin,
  allowCreate: boolean,
) {
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest,response
       FROM cms_operation_receipts
      WHERE idempotency_key=$1
      FOR UPDATE`,
    [GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT],
  );
  if (receipt.rowCount) {
    if (receipt.rowCount !== 1 || receipt.rows[0].operation !== GUARDRAILS_SET_PROVE_HOLD_HERO_OPERATION) {
      throw new Error("The Guardrails hero draft receipt conflicts with its governed operation.");
    }
    const staged = await client.query(
      `SELECT r.id::text revision_id,r.edition_id::text edition_id,r.payload,r.content_digest,
              r.workflow_state,e.document_id::text document_id,
              e.market,e.locale,e.localized_slug,e.publication_state,
              e.published_revision_id::text published_revision_id,
              d.kind,d.canonical_slug,d.status document_status
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
         JOIN cms_documents d ON d.id=e.document_id
        WHERE r.id=$1`,
      [receipt.rows[0].subject_id],
    );
    const row = staged.rows[0];
    const heroSnapshot = row ? row.payload : null;
    const contentHero = heroSnapshot?.content?.heroMedia;
    const seoHero = heroSnapshot?.seo?.ogImageMedia;
    const actualHero = contentHero && seoHero
      ? { mediaId: String(contentHero.mediaId), mediaVersionId: String(contentHero.mediaVersionId) }
      : null;
    const receiptResponse = receipt.rows[0].response as Record<string, any> | null;
    if (
      staged.rowCount !== 1
      || !actualHero
      || actualHero.mediaId !== hero.mediaId
      || actualHero.mediaVersionId !== hero.mediaVersionId
      || row.content_digest !== guardrailsSetProveHoldHeroSnapshotDigest(hero)
      || canonical(row.payload) !== canonical(guardrailsSetProveHoldHeroSnapshot(hero))
      || receipt.rows[0].request_digest !== guardrailsSetProveHoldHeroRequestDigest(
        String(receiptResponse?.baselineRevisionId ?? ""),
        hero,
      )
      || receipt.rows[0].result_digest !== guardrailsSetProveHoldHeroResultDigest(row.revision_id, hero)
      || row.kind !== "framework"
      || row.canonical_slug !== guardrailsSetProveHoldSnapshot.slug
      || row.document_status !== "active"
      || row.market !== "uae"
      || row.locale !== "en"
      || row.localized_slug !== guardrailsSetProveHoldSnapshot.slug
      || row.workflow_state !== "draft"
      || String(row.published_revision_id ?? "") !== String(receiptResponse?.publicationPointerPreserved ?? "")
    ) {
      throw new Error("The Guardrails hero draft receipt no longer identifies its exact unpublished revision.");
    }
    const references = await client.query(
      `SELECT asset_id::text,media_version_id::text
         FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2`,
      [row.document_id, `revision:${row.revision_id}`],
    );
    if (
      references.rowCount !== 1
      || references.rows[0].asset_id !== hero.mediaId
      || references.rows[0].media_version_id !== hero.mediaVersionId
    ) {
      throw new Error("The Guardrails hero draft lost its exact immutable media pin.");
    }
    const latest = await client.query(
      `SELECT id::text FROM cms_revisions
        WHERE edition_id=$1
        ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
      [row.edition_id],
    );
    if (latest.rowCount !== 1 || latest.rows[0].id !== row.revision_id) {
      return {
        documentId: String(row.document_id),
        editionId: String(row.edition_id),
        revisionId: String(row.revision_id),
        outcome: "preserved" as const,
      };
    }
    return {
      documentId: String(row.document_id),
      editionId: String(row.edition_id),
      revisionId: String(row.revision_id),
      outcome: "replayed" as const,
    };
  }
  if (!allowCreate) throw new Error("The Guardrails hero draft receipt is absent.");

  const baseline = await exactBaseline(client);
  const latest = await client.query(
    `SELECT id::text,revision_number,payload,content_digest
       FROM cms_revisions
      WHERE edition_id=$1
      ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
    [baseline.edition_id],
  );
  if (
    latest.rowCount !== 1
    || latest.rows[0].id !== baseline.revision_id
    || latest.rows[0].content_digest !== guardrailsSetProveHoldSnapshotDigest
    || canonical(latest.rows[0].payload) !== canonical(guardrailsSetProveHoldSnapshot)
  ) {
    return {
      documentId: String(baseline.document_id),
      editionId: String(baseline.edition_id),
      revisionId: String(latest.rows[0]?.id ?? baseline.revision_id),
      outcome: "preserved" as const,
    };
  }
  const snapshot = assertDraftSnapshot(hero);
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,
       workflow_state,created_by_user_id,source_revision_id,reason)
     SELECT $1,COALESCE(max(revision_number),0)+1,1,$2,$3,'draft',$4,$5,$6
       FROM cms_revisions WHERE edition_id=$1
     RETURNING id::text`,
    [
      baseline.edition_id,
      snapshot,
      guardrailsSetProveHoldHeroSnapshotDigest(hero),
      (await stagingActor(client, true)).id,
      baseline.revision_id,
      STAGING_REASON,
    ],
  );
  if (revision.rowCount !== 1) throw new Error("Could not create the Guardrails hero draft revision.");
  const revisionId = String(revision.rows[0].id);
  await client.query(
    `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
     VALUES ($1,$2,$3,$4)`,
    [hero.mediaId, hero.mediaVersionId, baseline.document_id, `revision:${revisionId}`],
  );
  const requestDigest = guardrailsSetProveHoldHeroRequestDigest(baseline.revision_id, hero);
  const resultDigest = guardrailsSetProveHoldHeroResultDigest(revisionId, hero);
  const author = await client.query(
    "SELECT id::text,email FROM cms_users WHERE email=$1",
    [STAGING_AUTHOR_EMAIL],
  );
  if (author.rowCount !== 1) throw new Error("The controlled Guardrails hero staging editor disappeared.");
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
    [
      GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT,
      GUARDRAILS_SET_PROVE_HOLD_HERO_OPERATION,
      revisionId,
      requestDigest,
      resultDigest,
      author.rows[0].id,
      {
        baselineRevisionId: baseline.revision_id,
        documentId: baseline.document_id,
        editionId: baseline.edition_id,
        revisionId,
        publicationState: "draft",
        workflowState: "draft",
        heroMediaId: hero.mediaId,
        heroMediaVersionId: hero.mediaVersionId,
        heroStatus: "pending-review",
        publicationPointerPreserved: baseline.published_revision_id ?? null,
      },
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.draft-staged','document',$3,$4,$5)`,
    [
      author.rows[0].id,
      author.rows[0].email,
      baseline.document_id,
      GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT,
      {
        baselineRevisionId: baseline.revision_id,
        revisionId,
        heroMediaId: hero.mediaId,
        heroMediaVersionId: hero.mediaVersionId,
        workflowState: "draft",
        publicationState: "draft",
        publicationPointerPreserved: baseline.published_revision_id ?? null,
        source: GUARDRAILS_HERO.sourceFile,
      },
    ],
  );
  return {
    documentId: String(baseline.document_id),
    editionId: String(baseline.edition_id),
    revisionId,
    outcome: "staged" as const,
  };
}

function responseCookies(response: Response): string[] {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return headers.getSetCookie?.()
    ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
}

async function readPublisherCredentials(filePath: string | undefined): Promise<PublisherCredentials> {
  if (!filePath) throw new Error("--credentials=... is required for an authorized CMS preview.");
  const resolved = path.resolve(filePath);
  if (resolved === "/tmp" || !resolved.startsWith("/tmp/")) {
    throw new Error("--credentials must point at a private file below /tmp.");
  }
  const stats = await lstat(resolved);
  if (!stats.isFile() || (stats.mode & 0o777) !== 0o600) {
    throw new Error("Preview credentials must be an owned regular mode-600 file.");
  }
  if (typeof process.getuid === "function" && stats.uid !== process.getuid()) {
    throw new Error("Preview credentials must be owned by the current user.");
  }
  const parsed = JSON.parse(await readFile(resolved, "utf8")) as Partial<FixtureState> & Partial<PublisherCredentials>;
  const administrator = parsed.version === 1 && parsed.phase === "ready" && Array.isArray(parsed.users)
    ? parsed.users.find((user) => user.role === "administrator")
    : parsed;
  if (!administrator?.email || !administrator.password || !administrator.totpSecret) {
    throw new Error("Preview credentials must provide an enrolled administrator email, password, and TOTP secret.");
  }
  return {
    email: administrator.email,
    password: administrator.password,
    totpSecret: administrator.totpSecret,
  };
}

async function writePrivatePreviewFile(value: Record<string, unknown>): Promise<void> {
  const resolved = path.resolve(previewFile);
  if (resolved === "/tmp" || !resolved.startsWith("/tmp/")) {
    throw new Error("--preview-file must be a regular path below /tmp.");
  }
  const temporary = `${resolved}.${process.pid}.tmp`;
  const contents = JSON.stringify(value) + "\n";
  const handle = await open(temporary, "wx", 0o600);
  try {
    await handle.writeFile(contents, "utf8");
  } finally {
    await handle.close();
  }
  await chmod(temporary, 0o600);
  await rename(temporary, resolved).catch(async (error) => {
    await unlink(temporary).catch(() => undefined);
    throw error;
  });
}

async function createAuthorizedPreview(
  documentId: string,
  revisionId: string,
  hero: HeroPin,
): Promise<void> {
  const publisher = await readPublisherCredentials(credentialsPath);
  const security = await import(
    pathToFileURL(path.join(repositoryRootFromScript, "artifacts/api-server/src/lib/security.ts")).href,
  ) as { totp(secret: string): string };
  const cookies = new Map<string, string>();
  const request = async (pathname: string, init: RequestInit = {}) => {
    const response = await fetch(`${apiOrigin}${pathname}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        origin: apiOrigin,
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
        ...(init.headers ?? {}),
      },
    });
    for (const cookie of responseCookies(response)) {
      const [pair] = cookie.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    return response;
  };
  const login = await request(`${apiPrefix}/auth/login`, {
    method: "POST",
    body: JSON.stringify({ email: publisher.email, password: publisher.password }),
  });
  const loginPayload = await login.json().catch(() => ({})) as Record<string, any>;
  if (!login.ok || typeof loginPayload.mfaChallenge?.id !== "string") {
    throw new Error("Authorized CMS preview login did not issue an MFA challenge.");
  }
  const verified = await request(`${apiPrefix}/auth/mfa/verify`, {
    method: "POST",
    body: JSON.stringify({
      challengeId: loginPayload.mfaChallenge.id,
      code: security.totp(publisher.totpSecret),
    }),
  });
  const verifiedPayload = await verified.json().catch(() => ({})) as Record<string, any>;
  if (!verified.ok || typeof verifiedPayload.csrfToken !== "string") {
    throw new Error("Authorized CMS preview MFA verification did not issue a CSRF token.");
  }
  const created = await request(
    `${apiPrefix}/documents/${documentId}/preview?market=uae&locale=en&revisionId=${encodeURIComponent(revisionId)}`,
  );
  const payload = await created.json().catch(() => ({})) as Record<string, any>;
  if (!created.ok || typeof payload.previewUrl !== "string") {
    throw new Error(`Authorized CMS preview creation failed (${created.status}).`);
  }
  if (
    created.headers.get("x-robots-tag")?.toLowerCase() !== "noindex, nofollow, noarchive"
    || payload.revisionId !== revisionId
    || payload.usedFallback !== false
    || canonical(payload.document) !== canonical(guardrailsSetProveHoldHeroSnapshot(hero))
    || !Array.isArray(payload.document?.mediaIds)
    || payload.document.mediaIds.length !== 1
    || payload.document.mediaIds[0] !== hero.mediaId
    || payload.document.content?.heroMedia?.mediaVersionId !== hero.mediaVersionId
    || payload.document.seo?.ogImageMedia?.mediaVersionId !== hero.mediaVersionId
  ) {
    throw new Error("Authorized CMS preview did not return the exact hero draft capability.");
  }
  const tokenMatch = payload.previewUrl.match(/^\/preview\/([^/]+)$/);
  if (!tokenMatch) throw new Error("Authorized CMS preview returned an unexpected capability path.");
  const protectedPreview = await request(`${apiPrefix}/preview/${encodeURIComponent(tokenMatch[1])}`);
  const protectedPayload = await protectedPreview.json().catch(() => ({})) as Record<string, any>;
  if (
    !protectedPreview.ok
    || protectedPreview.headers.get("x-robots-tag")?.toLowerCase() !== "noindex, nofollow, noarchive"
    || protectedPayload.revisionId !== revisionId
    || canonical(protectedPayload.document) !== canonical(guardrailsSetProveHoldHeroSnapshot(hero))
    || !Array.isArray(protectedPayload.media)
    || !protectedPayload.media.some((item: Record<string, any>) =>
      item.id === hero.mediaId && item.versionId === hero.mediaVersionId)
  ) {
    throw new Error("Protected CMS preview did not return the exact pinned hero object.");
  }
  await writePrivatePreviewFile({
    version: 1,
    previewUrl: payload.previewUrl,
    documentId,
    edition: { market: "uae", locale: "en" },
    revisionId,
    checks: {
      noindex: true,
      usedFallback: false,
      exactRevision: true,
      exactHeroMedia: true,
      pendingMediaCapability: true,
      publicationUntouched: true,
      authentication: PREVIEW_MODE,
    },
    expiresAt: payload.expiresAt,
  });
}

async function run(): Promise<void> {
  if (!apply && !verify && !preview) {
    process.stdout.write(
      "Dry run only. Use --apply-db --target=development; add --preview --credentials=... to save a private CMS capability path.\n",
    );
    return;
  }
  assertDevelopmentTarget();
  const bytes = await sourceBytes();
  const preflight = await findPreflightMedia(pool);
  const storageKey = preflight?.storage_key ?? privateObjectKey();
  await verifyObject(storageKey, bytes, apply);
  let staged: Awaited<ReturnType<typeof stageGuardrailsSetProveHoldHero>> | null = null;
  let stagedHero: HeroPin | null = null;
  const client = await pool.connect();
  let committed = false;
  let failure: unknown;
  try {
    await client.query("BEGIN");
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtext($1))",
      [GUARDRAILS_SET_PROVE_HOLD_HERO_RECEIPT],
    );
    const hero = await stageHeroMedia(client, null, preflight, storageKey, apply);
    staged = await stageGuardrailsSetProveHoldHero(client, hero, apply);
    await client.query("COMMIT");
    committed = true;
    process.stdout.write(
      `Guardrails Set, Prove & Hold hero draft ${staged.outcome}: document ${staged.documentId}, edition ${staged.editionId}, revision ${staged.revisionId}; object bytes and immutable media pin verified; publication and approval untouched.\n`,
    );
    if (preview) {
      stagedHero = hero;
    }
  } catch (error) {
    if (!committed) await client.query("ROLLBACK").catch(() => undefined);
    failure = error;
  } finally {
    client.release();
  }
  await pool.end();
  if (failure) throw failure;
  if (preview && staged && stagedHero) {
    await createAuthorizedPreview(staged.documentId, staged.revisionId, stagedHero);
    process.stdout.write(`Private CMS preview capability saved to ${path.resolve(previewFile)}.\n`);
  }
}

if (/guardrails-set-prove-hold-hero-draft\.(?:ts|js)$/.test(process.argv[1] ?? "")) {
  void run().catch(async (error) => {
    await pool.end().catch(() => undefined);
    process.stderr.write(`${error instanceof Error ? error.message : "Guardrails hero draft reconciliation failed."}\n`);
    process.exitCode = 1;
  });
}