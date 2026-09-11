import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { objectStorageClient } from "./object-storage.js";
import { repositoryRoot } from "./common.js";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply-db");
const shouldVerify = args.includes("--verify-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

const RECEIPT_KEY = "cms-value-to-scale-hero-reconciliation-v1:media";
const OPERATION = "cms.value-to-scale-hero.media-reconciled";
const SOURCE_FILE =
  "artifacts/cognirise-website/public/images/cognirise/method-vts-v2.jpg";
const PUBLIC_PATH = "/images/cognirise/method-vts-v2.jpg";
const LEGACY_PUBLIC_PATH = "/images/cognirise/method-vts.jpg";
const ROUTE = "/methodologies/ai-value-to-scale";
const LABEL = "AI Value-to-Scale hero";
const FILENAME = `${LABEL}.jpg`;
const ORIGINAL_FILENAME =
  "cognirise-pulse-agentic-workflows-directed-action_1789039737133.jpg";
const ALT_TEXT =
  "Violet, pink and orange light streams connect architectural portals and converge at a circular portal on the right.";
const CHECKSUM =
  "ad0ddce310568b7161ee26c1cab7ef5348db2e8252413eecb12a0860853733d5";
const BYTE_SIZE = 1_160_096;
const WIDTH = 3_072;
const HEIGHT = 3_072;
const MIME_TYPE = "image/jpeg";

const VERSION_METADATA = {
  sourcePath: PUBLIC_PATH,
  sourceFile: SOURCE_FILE,
  sourceOriginalFilename: ORIGINAL_FILENAME,
  sourceType: "user-supplied",
  sourceAuthorization: "User explicitly requested use of the supplied artwork.",
  intendedRoute: ROUTE,
  label: LABEL,
  altText: ALT_TEXT,
  rightsStatus: "needs-review",
  accessibilityStatus: "needs-review",
} as const;

interface SqlClient {
  query: (
    text: string,
    values?: unknown[],
  ) => Promise<{ rowCount: number | null; rows: Record<string, any>[] }>;
}

interface ImmutableVersion {
  id: string;
  asset_id: string;
  version_number: number;
  storage_key: string;
  checksum: string;
  byte_size: number;
  width: number;
  height: number;
  metadata: unknown;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function resolveReceiptedImmutableVersion(
  receiptResultDigest: string | null,
  assetId: string,
  versions: readonly ImmutableVersion[],
) {
  return versions.filter((item) =>
    receiptResultDigest === digest({
      assetId,
      versionId: item.id,
      checksum: CHECKSUM,
    })
  );
}

export function assertNoLegacyHeroAssociations(
  associations: readonly Record<string, unknown>[],
) {
  if (associations.length) {
    throw new Error(
      `Unexpected immutable CMS reference(s) to ${LEGACY_PUBLIC_PATH}: ${
        associations.map((item) =>
          `${String(item.document_id)}:${String(item.field_path)}`
        ).join(", ")
      }.`,
    );
  }
}

const REQUEST = {
  publicPath: PUBLIC_PATH,
  sourceFile: SOURCE_FILE,
  sourceOriginalFilename: ORIGINAL_FILENAME,
  route: ROUTE,
  label: LABEL,
  filename: FILENAME,
  mimeType: MIME_TYPE,
  checksum: CHECKSUM,
  byteSize: BYTE_SIZE,
  width: WIDTH,
  height: HEIGHT,
  altText: ALT_TEXT,
  collection: "website",
  review: {
    status: "pending-review",
    rightsStatus: "needs-review",
    accessibilityStatus: "needs-review",
  },
  sourceAuthorization: VERSION_METADATA.sourceAuthorization,
} as const;

export function assertDevelopmentTarget(environment = process.env) {
  if (
    environment.NODE_ENV === "production"
    || environment.REPLIT_DEPLOYMENT === "1"
  ) {
    throw new Error("AI Value-to-Scale hero reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error(
      "Database work requires the explicit --target=development safeguard.",
    );
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (
    !environment.DEFAULT_OBJECT_STORAGE_BUCKET_ID
    || !environment.PRIVATE_OBJECT_DIR
  ) {
    throw new Error("Development Object Storage is not configured.");
  }
}

async function reconcileObject(allowCreate: boolean) {
  const bytes = await readFile(`${repositoryRoot}/${SOURCE_FILE}`);
  const sourceChecksum = createHash("sha256").update(bytes).digest("hex");
  if (sourceChecksum !== CHECKSUM || bytes.length !== BYTE_SIZE) {
    throw new Error("AI Value-to-Scale hero source differs from its governed identity.");
  }

  const bucket = objectStorageClient.bucket(
    process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!,
  );
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKey = `${prefix}/cms-media/value-to-scale-hero-${CHECKSUM}`;
  const object = bucket.file(storageKey);
  const [exists] = await object.exists();
  if (!exists) {
    if (!allowCreate) throw new Error("The durable AI Value-to-Scale hero object is missing.");
    await object.save(bytes, {
      resumable: false,
      contentType: MIME_TYPE,
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
        metadata: {
          checksum: CHECKSUM,
          source: RECEIPT_KEY,
          publicPath: PUBLIC_PATH,
        },
      },
    });
  }

  const [metadata] = await object.getMetadata();
  if (
    Number(metadata.size) !== BYTE_SIZE
    || metadata.contentType !== MIME_TYPE
  ) {
    throw new Error("The durable AI Value-to-Scale hero object metadata conflicts.");
  }
  // Always read the stored object back. Provider metadata alone is not
  // sufficient evidence that the supplied bytes were durably preserved.
  const [storedBytes] = await object.download();
  const storedChecksum = createHash("sha256").update(storedBytes).digest("hex");
  if (storedBytes.length !== BYTE_SIZE || storedChecksum !== CHECKSUM) {
    throw new Error("The durable AI Value-to-Scale hero object bytes conflict.");
  }
  return { storageKey, sourceChecksum, storedChecksum };
}

async function inspectAssociations(client: SqlClient, assetId: string) {
  const pageCandidates = await client.query(
    `SELECT DISTINCT d.id::text document_id,d.kind,d.canonical_slug,d.title,
            e.id::text edition_id,e.market,e.locale,e.publication_state,
            e.published_revision_id::text,r.id::text revision_id,
            r.revision_number,r.workflow_state
       FROM cms_documents d
       LEFT JOIN cms_market_editions e ON e.document_id=d.id
       LEFT JOIN cms_revisions r ON r.edition_id=e.id
      WHERE d.canonical_slug IN ('ai-value-to-scale','methodologies-ai-value-to-scale')
         OR r.payload::text LIKE '%'||$1||'%'
         OR r.payload::text LIKE '%'||$2||'%'
      ORDER BY d.canonical_slug,e.market,e.locale,r.revision_number`,
    [PUBLIC_PATH, LEGACY_PUBLIC_PATH],
  );
  const actualAssociations = await client.query(
    `SELECT mr.id::text reference_id,mr.document_id::text,mr.field_path,
            mr.asset_id::text,mr.media_version_id::text,d.kind,
            d.canonical_slug,d.title
       FROM cms_media_references mr
       JOIN cms_documents d ON d.id=mr.document_id
      WHERE mr.asset_id=$1
      ORDER BY d.canonical_slug,mr.field_path`,
    [assetId],
  );
  const legacyAssociations = await client.query(
    `SELECT DISTINCT mr.id::text reference_id,mr.document_id::text,mr.field_path,
            mr.asset_id::text,mr.media_version_id::text,d.kind,
            d.canonical_slug,d.title
       FROM cms_media_references mr
       JOIN cms_documents d ON d.id=mr.document_id
       JOIN cms_media_assets a ON a.id=mr.asset_id
       LEFT JOIN cms_media_versions pinned ON pinned.id=mr.media_version_id
       LEFT JOIN cms_media_versions any_version ON any_version.asset_id=a.id
      WHERE a.filename=$1
         OR a.original_filename=$1
         OR pinned.metadata->>'sourcePath'=$2
         OR any_version.metadata->>'sourcePath'=$2
      ORDER BY d.canonical_slug,mr.field_path`,
    ["method-vts.jpg", LEGACY_PUBLIC_PATH],
  );
  assertNoLegacyHeroAssociations(legacyAssociations.rows);
  return {
    pageCandidates: pageCandidates.rows,
    actualAssociations: actualAssociations.rows,
    legacyAssociations: legacyAssociations.rows,
  };
}

async function reconcileDatabase(
  client: SqlClient,
  storageKey: string,
  allowCreate: boolean,
) {
  const requestDigest = digest(REQUEST);
  const receipt = await client.query(
    `SELECT idempotency_key,operation,subject_id,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [RECEIPT_KEY],
  );

  let asset;
  let version;
  let outcome: "created" | "reused";
  if (receipt.rowCount) {
    const row = receipt.rows[0];
    if (
      row.operation !== OPERATION
      || row.request_digest !== requestDigest
    ) {
      throw new Error("AI Value-to-Scale hero reconciliation receipt conflicts.");
    }
    asset = await client.query(
      `SELECT id::text,storage_key,filename,original_filename,media_type,
              byte_size,checksum,alt_text,credit,collection,status
         FROM cms_media_assets WHERE id=$1`,
      [row.subject_id],
    );
    const versions = await client.query(
      `SELECT id::text,asset_id::text,version_number,storage_key,checksum,
              byte_size,width,height,metadata
         FROM cms_media_versions
        WHERE asset_id=$1 ORDER BY version_number`,
      [row.subject_id],
    );
    const receiptedVersions = resolveReceiptedImmutableVersion(
      row.result_digest,
      row.subject_id,
      versions.rows as ImmutableVersion[],
    );
    version = { rowCount: receiptedVersions.length, rows: receiptedVersions };
    if (asset.rowCount !== 1 || version.rowCount !== 1) {
      throw new Error("AI Value-to-Scale hero receipt subject or immutable version is missing.");
    }
    const expectedResult = digest({
      assetId: asset.rows[0].id,
      versionId: version.rows[0].id,
      checksum: CHECKSUM,
    });
    if (row.result_digest !== expectedResult) {
      throw new Error("AI Value-to-Scale hero reconciliation result conflicts.");
    }
    outcome = "reused";
  } else {
    if (!allowCreate) {
      throw new Error("The AI Value-to-Scale hero reconciliation receipt is missing.");
    }
    const collision = await client.query(
      "SELECT id::text FROM cms_media_assets WHERE storage_key=$1",
      [storageKey],
    );
    if (collision.rowCount) {
      throw new Error("Refusing to adopt an unrelated media row at the governed storage key.");
    }
    asset = await client.query(
      `INSERT INTO cms_media_assets
        (storage_key,filename,original_filename,media_type,byte_size,checksum,
         alt_text,credit,collection,status,uploaded_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,'website','pending-review',$8)
       RETURNING id::text,storage_key,filename,original_filename,media_type,
                 byte_size,checksum,alt_text,credit,collection,status`,
      [
        storageKey,
        FILENAME,
        ORIGINAL_FILENAME,
        MIME_TYPE,
        BYTE_SIZE,
        CHECKSUM,
        ALT_TEXT,
        null,
      ],
    );
    version = await client.query(
      `INSERT INTO cms_media_versions
        (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7)
       RETURNING id::text,asset_id::text,version_number,storage_key,checksum,
                 byte_size,width,height,metadata`,
      [
        asset.rows[0].id,
        storageKey,
        CHECKSUM,
        BYTE_SIZE,
        WIDTH,
        HEIGHT,
        VERSION_METADATA,
      ],
    );
    const resultDigest = digest({
      assetId: asset.rows[0].id,
      versionId: version.rows[0].id,
      checksum: CHECKSUM,
    });
    await client.query(
      `INSERT INTO cms_operation_receipts
        (idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES ($1,$2,$3,$4,$5)`,
      [RECEIPT_KEY, OPERATION, asset.rows[0].id, requestDigest, resultDigest],
    );
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES (NULL,'development-reconciliation',$1,'media',$2,$3,$4)`,
      [
        OPERATION,
        asset.rows[0].id,
        RECEIPT_KEY,
        {
          publicPath: PUBLIC_PATH,
          route: ROUTE,
          versionId: version.rows[0].id,
          checksum: CHECKSUM,
          status: "pending-review",
          rightsStatus: "needs-review",
          accessibilityStatus: "needs-review",
        },
      ],
    );
    outcome = "created";
  }

  const media = asset.rows[0];
  const immutable = version.rows[0];
  if (
    immutable.asset_id !== media.id
    || Number(immutable.version_number) !== 1
    || immutable.storage_key !== storageKey
    || immutable.checksum !== CHECKSUM
    || Number(immutable.byte_size) !== BYTE_SIZE
    || Number(immutable.width) !== WIDTH
    || Number(immutable.height) !== HEIGHT
    || canonicalJson(immutable.metadata) !== canonicalJson(VERSION_METADATA)
  ) {
    throw new Error("AI Value-to-Scale hero database authority has drifted.");
  }

  return {
    assetId: media.id as string,
    versionId: immutable.id as string,
    status: media.status as string,
    outcome,
    inspection: await inspectAssociations(client, media.id),
  };
}

async function run(apply: boolean) {
  const object = await reconcileObject(apply);
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await reconcileDatabase(client, object.storageKey, apply);
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(JSON.stringify({
      media: {
        label: LABEL,
        assetId: result.assetId,
        versionId: result.versionId,
        status: result.status,
        outcome: result.outcome,
        checksum: CHECKSUM,
        byteSize: BYTE_SIZE,
        sourceChecksum: object.sourceChecksum,
        storageReadbackChecksum: object.storedChecksum,
        listPath: `/api/media?search=${encodeURIComponent(LABEL)}`,
        detailPath: `/api/media/${result.assetId}`,
        previewPath: `/api/media/${result.assetId}/file`,
        downloadPath: `/api/media/${result.assetId}/download`,
      },
      reviewGates: {
        rights: "needs-review",
        accessibility: "needs-review",
        clearance:
          "Requires authorized source-metadata review; changing only asset workflow status does not clear immutable version gates.",
      },
      route: ROUTE,
      cmsPageCandidates: result.inspection.pageCandidates,
      cmsAssociations: result.inspection.actualAssociations,
      legacyHeroAssociations: result.inspection.legacyAssociations,
      associationStatus: result.inspection.actualAssociations.length
        ? "existing-associations-reported-without-modification"
        : "no-existing-cms-page-association",
      transaction: apply ? "committed" : "verified-and-rolled-back",
    }, null, 2));
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  if (!shouldApply && !shouldVerify) {
    console.log(JSON.stringify(REQUEST, null, 2));
    console.error("Dry run: pass --apply-db or --verify-db with --target=development.");
    return;
  }
  assertDevelopmentTarget();
  await run(shouldApply);
}

if (
  process.argv[1]
  && import.meta.url === new URL(`file://${process.argv[1]}`).href
) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}