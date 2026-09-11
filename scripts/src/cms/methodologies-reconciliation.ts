import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { repositoryRoot } from "./common.js";
import {
  canonicalJson,
  digest,
  immutableVersionMetadata,
  methodologiesHeroMedia,
  resolveMethodologiesSnapshot,
} from "./methodologies-media.js";
import { objectStorageClient } from "./object-storage.js";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply-db");
const shouldVerify = args.includes("--verify-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);
const PREFIX = "cms-methodologies-hero-task-294-v1";
const MEDIA_RECEIPT = `${PREFIX}:media`;
const LANDING_RECEIPT = `${PREFIX}:landing`;
const APPROVAL_REASON =
  "Task 294: approved /methodologies hero media reconciliation; compiled draft and revision history preserved.";
const SEED_REASON = "Seed compiled landing parity draft";
const SEED_AUTHOR = "cms-reconciliation@system.invalid";

interface SqlClient {
  query: (text: string, values?: unknown[]) => Promise<{
    rowCount: number | null;
    rows: Record<string, any>[];
  }>;
}

type LiveDeliveryRow = Record<string, any>;

export function assertLiveMethodologiesDelivery(
  delivery: LiveDeliveryRow | undefined,
  mediaRows: LiveDeliveryRow[],
) {
  if (
    !delivery
    || delivery.kind !== "landing-page"
    || delivery.canonical_slug !== "methodologies"
    || delivery.document_status !== "active"
    || delivery.publication_state !== "published"
    || !delivery.published_revision_id
    || delivery.published_revision_id !== delivery.revision_id
    || delivery.workflow_state !== "approved"
  ) {
    throw new Error(
      "Live /methodologies delivery must point to one approved published revision.",
    );
  }
  const validation = validateCmsSnapshot("landing-page", delivery.payload, "publish");
  if (!validation.success) {
    throw new Error(`Live /methodologies snapshot is invalid: ${validation.errors.join("; ")}`);
  }
  const sections = (validation.data.content as {
    sections: Array<{
      id: string;
      type: string;
      references?: Array<{ mediaId: string; mediaVersionId: string }>;
    }>;
  }).sections;
  const slots = sections.filter((section) => section.id === methodologiesHeroMedia.slot);
  if (slots.length !== 1 || slots[0].type !== "media" || slots[0].references?.length !== 1) {
    throw new Error("Live /methodologies must contain exactly one resolved hero media reference.");
  }
  const payloadReference = slots[0].references[0];
  const exact = mediaRows.filter((row) =>
    row.asset_id === payloadReference.mediaId
    && row.media_version_id === payloadReference.mediaVersionId
  );
  const media = exact[0];
  const metadata = media?.metadata && typeof media.metadata === "object" ? media.metadata : {};
  const rights = metadata.rights && typeof metadata.rights === "object" ? metadata.rights : {};
  const rightsStatus = metadata.rightsStatus ?? rights.status;
  if (
    exact.length !== 1
    || media.reference_document_id !== delivery.document_id
    || media.field_path !== `revision:${delivery.revision_id}`
    || media.version_asset_id !== media.asset_id
    || media.asset_status !== "active"
    || typeof media.media_type !== "string"
    || !media.media_type.startsWith("image/")
    || typeof media.storage_key !== "string"
    || !media.storage_key
    || typeof media.checksum !== "string"
    || !/^[a-f0-9]{64}$/.test(media.checksum)
    || Number(media.byte_size) <= 0
    || Number(media.width) <= 0
    || Number(media.height) <= 0
    || !["approved", "approved-use"].includes(rightsStatus)
  ) {
    throw new Error(
      "Live /methodologies hero must resolve to one active, approved immutable media version.",
    );
  }
  return {
    revisionId: String(delivery.revision_id),
    revisionNumber: Number(delivery.revision_number),
    assetId: String(media.asset_id),
    versionId: String(media.media_version_id),
    storageKey: String(media.storage_key),
    checksum: String(media.checksum),
    byteSize: Number(media.byte_size),
    mediaType: String(media.media_type),
  };
}

export function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Task 294 methodologies reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database work requires the explicit --target=development safeguard.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!environment.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !environment.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is not configured.");
  }
}

async function loadCompiledAuthority() {
  const inventory = JSON.parse(await readFile(
    `${repositoryRoot}/lib/db/landing-page-inventory.json`,
    "utf8",
  )) as Array<{
    sourceKey?: unknown;
    slug?: unknown;
    path?: unknown;
    title?: unknown;
    snapshot?: unknown;
  }>;
  const matches = inventory.filter((item) =>
    item.sourceKey === "compiled:/methodologies"
    && item.slug === "methodologies"
    && item.path === "/methodologies"
    && item.title === "Methodologies"
  );
  if (matches.length !== 1 || !matches[0].snapshot) {
    throw new Error("Generated inventory must contain exactly one compiled /methodologies authority.");
  }
  const snapshot = matches[0].snapshot as Record<string, unknown>;
  const draftValidation = validateCmsSnapshot("landing-page", snapshot, "draft");
  if (!draftValidation.success) {
    throw new Error(`Generated /methodologies authority is invalid: ${draftValidation.errors.join("; ")}`);
  }
  return snapshot;
}

/**
 * Drizzle schema push synchronizes table shape but does not execute migration
 * seed SQL. Recreate only the generated /methodologies seed, and only when its
 * exact identities are absent. Existing revisions or conflicting rows fail
 * closed rather than being adopted or rewritten.
 */
async function ensureMethodologiesAuthority(client: SqlClient, allowCreate: boolean) {
  const compiled = await loadCompiledAuthority();
  let document = await client.query(
    `SELECT id::text,kind,title,status FROM cms_documents
      WHERE canonical_slug='methodologies' ${allowCreate ? "FOR UPDATE" : ""}`,
  );
  if (!document.rowCount) {
    if (!allowCreate) throw new Error("The compiled /methodologies document seed is missing.");
    document = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,status)
       VALUES ('landing-page','methodologies','Methodologies','active')
       RETURNING id::text,kind,title,status`,
    );
  }
  const documentRow = document.rows[0];
  if (
    document.rowCount !== 1
    || documentRow.kind !== "landing-page"
    || documentRow.title !== "Methodologies"
    || documentRow.status !== "active"
  ) {
    throw new Error("Conflicting CMS document occupies the /methodologies seed identity.");
  }

  let edition = await client.query(
    `SELECT id::text,market,locale,localized_slug,publication_state,
            published_revision_id::text
       FROM cms_market_editions
      WHERE document_id=$1 AND market='uae' AND locale='en'
      ${allowCreate ? "FOR UPDATE" : ""}`,
    [documentRow.id],
  );
  if (!edition.rowCount) {
    if (!allowCreate) throw new Error("The compiled /methodologies edition seed is missing.");
    const collisions = await client.query(
      `SELECT id::text FROM cms_market_editions
        WHERE market='uae' AND locale='en' AND localized_slug='methodologies'`,
    );
    if (collisions.rowCount) {
      throw new Error("A different UAE/English edition owns the methodologies slug.");
    }
    const otherEditions = await client.query(
      "SELECT id::text FROM cms_market_editions WHERE document_id=$1",
      [documentRow.id],
    );
    if (otherEditions.rowCount) {
      throw new Error("Refusing to seed over an existing /methodologies market edition.");
    }
    edition = await client.query(
      `INSERT INTO cms_market_editions
        (document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete)
       VALUES ($1,'uae','en','methodologies','draft','none',false)
       RETURNING id::text,market,locale,localized_slug,publication_state,
                 published_revision_id::text`,
      [documentRow.id],
    );
  }
  const editionRow = edition.rows[0];
  if (
    edition.rowCount !== 1
    || editionRow.market !== "uae"
    || editionRow.locale !== "en"
    || editionRow.localized_slug !== "methodologies"
  ) {
    throw new Error("Conflicting CMS edition occupies the /methodologies seed identity.");
  }

  let reconciliation = await client.query(
    `SELECT compiled_payload FROM cms_landing_page_reconciliation
      WHERE document_id=$1 AND source_key='compiled:/methodologies'`,
    [documentRow.id],
  );
  if (!reconciliation.rowCount) {
    if (!allowCreate) throw new Error("The compiled /methodologies reconciliation seed is missing.");
    reconciliation = await client.query(
      `INSERT INTO cms_landing_page_reconciliation
        (document_id,source_key,compiled_digest,compiled_payload,compiled_visual_sources)
       VALUES ($1,'compiled:/methodologies',$2,$3,
         COALESCE((
           SELECT jsonb_agg(section ORDER BY (section->>'order')::integer)
             FROM jsonb_array_elements($3::jsonb->'content'->'sections') section
            WHERE section->>'type'='migration-media'
         ),'[]'::jsonb))
       RETURNING compiled_payload`,
      [documentRow.id, digest(compiled), compiled],
    );
  }
  if (
    reconciliation.rowCount !== 1
    || canonicalJson(reconciliation.rows[0].compiled_payload) !== canonicalJson(compiled)
  ) {
    throw new Error("Existing /methodologies compiled authority differs from generated inventory.");
  }

  const revisions = await client.query(
    `SELECT id::text,revision_number,payload,workflow_state,reason
       FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number`,
    [editionRow.id],
  );
  if (!revisions.rowCount) {
    if (!allowCreate) throw new Error("The compiled /methodologies draft seed is missing.");
    await client.query(
      `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
       VALUES ($1,'CMS reconciliation','editor','active',now())
       ON CONFLICT (email) DO NOTHING`,
      [SEED_AUTHOR],
    );
    const author = await client.query(
      "SELECT id::text FROM cms_users WHERE email=$1",
      [SEED_AUTHOR],
    );
    if (author.rowCount !== 1) throw new Error("Could not provision scoped landing seed attribution.");
    await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,
         workflow_state,created_by_user_id,reason)
       VALUES ($1,1,1,$2,$3,'draft',$4,$5)`,
      [editionRow.id, compiled, digest(compiled), author.rows[0].id, SEED_REASON],
    );
  }
}

async function reconcileObject(allowCreate: boolean) {
  const bytes = await readFile(`${repositoryRoot}/${methodologiesHeroMedia.sourceFile}`);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== methodologiesHeroMedia.checksum || bytes.length !== methodologiesHeroMedia.byteSize) {
    throw new Error("The supplied Task 294 image bytes have changed.");
  }
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKey =
    `${prefix}/cms-media/methodologies-hero-${methodologiesHeroMedia.checksum}`;
  const object = objectStorageClient
    .bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!)
    .file(storageKey);
  const [exists] = await object.exists();
  if (!exists) {
    if (!allowCreate) throw new Error("The durable Task 294 methodologies object is missing.");
    await object.save(bytes, {
      resumable: false,
      contentType: methodologiesHeroMedia.mimeType,
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
        metadata: {
          checksum: methodologiesHeroMedia.checksum,
          source: "user-supplied-task-294",
          usage: "/methodologies:methodologies-hero-media",
        },
      },
    });
  }
  const [[metadata], [stored]] = await Promise.all([
    object.getMetadata(),
    object.download(),
  ]);
  if (
    Number(metadata.size) !== methodologiesHeroMedia.byteSize
    || metadata.contentType !== methodologiesHeroMedia.mimeType
    || metadata.cacheControl !== "private, max-age=31536000, immutable"
    || metadata.metadata?.checksum !== methodologiesHeroMedia.checksum
    || metadata.metadata?.source !== "user-supplied-task-294"
    || metadata.metadata?.usage !== "/methodologies:methodologies-hero-media"
    || createHash("sha256").update(stored).digest("hex") !== methodologiesHeroMedia.checksum
    || stored.length !== methodologiesHeroMedia.byteSize
  ) {
    throw new Error("Durable Task 294 object metadata or byte readback failed.");
  }
  return storageKey;
}

async function reconcileMedia(
  client: SqlClient,
  actor: { id: string; email: string },
  storageKey: string,
  allowCreate: boolean,
) {
  const request = {
    binary: methodologiesHeroMedia,
    immutableMetadata: immutableVersionMetadata(),
    storageKey,
  };
  const requestDigest = digest(request);
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [MEDIA_RECEIPT],
  );
  let asset;
  if (receipt.rowCount) {
    if (
      receipt.rowCount !== 1
      || receipt.rows[0].operation !== "cms.methodologies.hero-media-imported"
      || receipt.rows[0].request_digest !== requestDigest
    ) {
      throw new Error("Task 294 media receipt conflicts with the governed request.");
    }
    asset = await client.query(
      `SELECT id::text,storage_key,filename,original_filename,media_type,byte_size,
              checksum,status,collection
         FROM cms_media_assets WHERE id=$1`,
      [receipt.rows[0].subject_id],
    );
  } else {
    if (!allowCreate) throw new Error("Task 294 media receipt is missing.");
    const occupied = await client.query(
      "SELECT id::text FROM cms_media_assets WHERE storage_key=$1",
      [storageKey],
    );
    if (occupied.rowCount) {
      throw new Error("Refusing to adopt an unreceipted media row at the Task 294 immutable key.");
    }
    asset = await client.query(
      `INSERT INTO cms_media_assets
        (storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,
         credit,collection,status,uploaded_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,'website','active',$8)
       RETURNING id::text,storage_key,filename,original_filename,media_type,byte_size,
                 checksum,status,collection`,
      [
        storageKey,
        methodologiesHeroMedia.filename,
        methodologiesHeroMedia.sourceFile.split("/").at(-1),
        methodologiesHeroMedia.mimeType,
        methodologiesHeroMedia.byteSize,
        methodologiesHeroMedia.checksum,
        methodologiesHeroMedia.altText,
        actor.id,
      ],
    );
  }
  const row = asset.rows[0];
  if (
    asset.rowCount !== 1
    || row.storage_key !== storageKey
    || row.filename !== methodologiesHeroMedia.filename
    || row.original_filename !== methodologiesHeroMedia.sourceFile.split("/").at(-1)
    || row.media_type !== methodologiesHeroMedia.mimeType
    || Number(row.byte_size) !== methodologiesHeroMedia.byteSize
    || row.checksum !== methodologiesHeroMedia.checksum
    || row.status !== "active"
    || row.collection !== "website"
  ) {
    throw new Error("Task 294 media asset authority has drifted.");
  }
  const expectedMetadata = immutableVersionMetadata();
  let version = await client.query(
    `SELECT id::text,asset_id::text,version_number,storage_key,checksum,byte_size,
            width,height,metadata
       FROM cms_media_versions
      WHERE asset_id=$1 AND storage_key=$2 AND checksum=$3`,
    [row.id, storageKey, methodologiesHeroMedia.checksum],
  );
  if (!version.rowCount && !receipt.rowCount) {
    version = await client.query(
      `INSERT INTO cms_media_versions
        (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7)
       RETURNING id::text,asset_id::text,version_number,storage_key,checksum,byte_size,
                 width,height,metadata`,
      [
        row.id,
        storageKey,
        methodologiesHeroMedia.checksum,
        methodologiesHeroMedia.byteSize,
        methodologiesHeroMedia.width,
        methodologiesHeroMedia.height,
        expectedMetadata,
      ],
    );
  }
  const immutable = version.rows[0];
  if (
    version.rowCount !== 1
    || Number(immutable.version_number) !== 1
    || immutable.asset_id !== row.id
    || immutable.storage_key !== storageKey
    || immutable.checksum !== methodologiesHeroMedia.checksum
    || Number(immutable.byte_size) !== methodologiesHeroMedia.byteSize
    || Number(immutable.width) !== methodologiesHeroMedia.width
    || Number(immutable.height) !== methodologiesHeroMedia.height
    || canonicalJson(immutable.metadata) !== canonicalJson(expectedMetadata)
  ) {
    throw new Error("Task 294 immutable media-version authority failed.");
  }
  const resultDigest = digest({ assetId: row.id, versionId: immutable.id, storageKey });
  if (receipt.rowCount) {
    if (receipt.rows[0].result_digest !== resultDigest) {
      throw new Error("Task 294 media result receipt no longer identifies the immutable version.");
    }
  } else {
    await client.query(
      `INSERT INTO cms_operation_receipts
        (idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES ($1,'cms.methodologies.hero-media-imported',$2,$3,$4)`,
      [MEDIA_RECEIPT, row.id, requestDigest, resultDigest],
    );
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES ($1,$2,'media.approved','media',$3,$4,$5)`,
      [actor.id, actor.email, row.id, MEDIA_RECEIPT, {
        mediaVersionId: immutable.id,
        source: "user-supplied attached asset",
        authorization: "Explicit Task 294 request to publish on /methodologies.",
        slot: methodologiesHeroMedia.slot,
      }],
    );
  }
  return { assetId: String(row.id), versionId: String(immutable.id) };
}

async function reconcileLanding(
  client: SqlClient,
  actor: { id: string; email: string },
  media: { assetId: string; versionId: string },
  allowCreate: boolean,
) {
  const authority = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.id::text edition_id,e.publication_state,e.published_revision_id::text,
            reconciliation.compiled_payload
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
         AND e.market='uae' AND e.locale='en'
       JOIN cms_landing_page_reconciliation reconciliation ON reconciliation.document_id=d.id
         AND reconciliation.source_key='compiled:/methodologies'
      WHERE d.canonical_slug='methodologies'
       ${allowCreate ? "FOR UPDATE OF d,e" : ""}`,
  );
  const row = authority.rows[0];
  if (
    authority.rowCount !== 1
    || row.kind !== "landing-page"
    || row.document_status !== "active"
  ) {
    throw new Error("Expected one active compiled /methodologies landing authority.");
  }
  const payload = resolveMethodologiesSnapshot(
    row.compiled_payload,
    media.assetId,
    media.versionId,
  );
  const validation = validateCmsSnapshot("landing-page", payload, "publish");
  if (!validation.success) {
    throw new Error(`Resolved /methodologies snapshot is invalid: ${validation.errors.join("; ")}`);
  }
  const validated = validation.data;
  const requestDigest = digest(validated);
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [LANDING_RECEIPT],
  );
  if (receipt.rowCount) {
    const revision = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.payload,r.workflow_state,r.reason,
              e.document_id::text
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$1`,
      [receipt.rows[0].subject_id],
    );
    const pinned = await client.query(
      `SELECT asset_id::text,media_version_id::text
         FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 AND asset_id=$3`,
      [row.document_id, `revision:${receipt.rows[0].subject_id}`, media.assetId],
    );
    const resultDigest = digest({
      documentId: row.document_id,
      editionId: row.edition_id,
      revisionId: receipt.rows[0].subject_id,
      mediaId: media.assetId,
      mediaVersionId: media.versionId,
    });
    if (
      receipt.rowCount !== 1
      || receipt.rows[0].operation !== "cms.methodologies.hero-published"
      || receipt.rows[0].request_digest !== requestDigest
      || receipt.rows[0].result_digest !== resultDigest
      || revision.rowCount !== 1
      || revision.rows[0].edition_id !== row.edition_id
      || revision.rows[0].document_id !== row.document_id
      || revision.rows[0].workflow_state !== "approved"
      || revision.rows[0].reason !== APPROVAL_REASON
      || canonicalJson(revision.rows[0].payload) !== canonicalJson(validated)
      || pinned.rowCount !== 1
      || pinned.rows[0].media_version_id !== media.versionId
    ) {
      throw new Error("Task 294 landing receipt no longer proves its approved immutable revision.");
    }
    return "replayed";
  }
  if (!allowCreate) throw new Error("Task 294 landing receipt is missing.");
  if (row.publication_state !== "draft" || row.published_revision_id !== null) {
    throw new Error("Refusing to replace an existing /methodologies publication.");
  }
  const revisions = await client.query(
    `SELECT id::text,revision_number,payload,workflow_state
       FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number`,
    [row.edition_id],
  );
  if (
    revisions.rowCount !== 1
    || Number(revisions.rows[0].revision_number) !== 1
    || revisions.rows[0].workflow_state !== "draft"
    || canonicalJson(revisions.rows[0].payload) !== canonicalJson(row.compiled_payload)
  ) {
    throw new Error("The /methodologies draft has editorial history; preserving it for explicit review.");
  }
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,approved_by_user_id,approved_at,reason)
     VALUES ($1,2,1,$2,$3,'approved',$4,$4,now(),$5) RETURNING id::text`,
    [row.edition_id, validated, requestDigest, actor.id, APPROVAL_REASON],
  );
  const revisionId = String(revision.rows[0].id);
  await client.query(
    `INSERT INTO cms_media_references (asset_id,media_version_id,document_id,field_path)
     VALUES ($1,$2,$3,$4)`,
    [media.assetId, media.versionId, row.document_id, `revision:${revisionId}`],
  );
  const published = await client.query(
    `UPDATE cms_market_editions
        SET publication_state='published',parity_complete=true,published_revision_id=$2,
            published_at=now(),updated_at=now()
      WHERE id=$1 AND publication_state='draft' AND published_revision_id IS NULL`,
    [row.edition_id, revisionId],
  );
  if (published.rowCount !== 1) {
    throw new Error("Concurrent /methodologies publication change detected; preserving it.");
  }
  const resultDigest = digest({
    documentId: row.document_id,
    editionId: row.edition_id,
    revisionId,
    mediaId: media.assetId,
    mediaVersionId: media.versionId,
  });
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,'cms.methodologies.hero-published',$2,$3,$4)`,
    [LANDING_RECEIPT, revisionId, requestDigest, resultDigest],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.published','document',$3,$4,$5)`,
    [actor.id, actor.email, row.document_id, LANDING_RECEIPT, {
      revisionId,
      sourceRevisionId: revisions.rows[0].id,
      mediaId: media.assetId,
      mediaVersionId: media.versionId,
      slot: methodologiesHeroMedia.slot,
      reason: APPROVAL_REASON,
    }],
  );
  return "published";
}

async function verifyLiveDelivery(client: SqlClient) {
  const publication = await client.query(
    `SELECT d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
            e.publication_state,e.published_revision_id::text,
            r.id::text revision_id,r.revision_number,r.workflow_state,r.payload
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
         AND e.market='uae' AND e.locale='en'
       LEFT JOIN cms_revisions r ON r.id=e.published_revision_id
        AND r.edition_id=e.id
      WHERE d.canonical_slug='methodologies'`,
  );
  if (publication.rowCount !== 1) {
    throw new Error("Live /methodologies delivery must have exactly one UAE/English edition.");
  }
  const delivery = publication.rows[0];
  const references = delivery.revision_id
    ? await client.query(
      `SELECT ref.asset_id::text,ref.media_version_id::text,
              ref.document_id::text reference_document_id,ref.field_path,
              version.asset_id::text version_asset_id,version.storage_key,
              version.checksum,version.byte_size,version.width,version.height,version.metadata,
              asset.status asset_status,asset.media_type
         FROM cms_media_references ref
         LEFT JOIN cms_media_versions version ON version.id=ref.media_version_id
         LEFT JOIN cms_media_assets asset ON asset.id=ref.asset_id
        WHERE ref.document_id=$1 AND ref.field_path=$2`,
      [delivery.document_id, `revision:${delivery.revision_id}`],
    )
    : { rowCount: 0, rows: [] };
  const live = assertLiveMethodologiesDelivery(delivery, references.rows);
  const object = objectStorageClient
    .bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!)
    .file(live.storageKey);
  const [exists] = await object.exists();
  if (!exists) throw new Error("Live /methodologies hero object is missing from durable storage.");
  const [[metadata], [stored]] = await Promise.all([
    object.getMetadata(),
    object.download(),
  ]);
  if (
    Number(metadata.size) !== live.byteSize
    || metadata.contentType !== live.mediaType
    || stored.length !== live.byteSize
    || createHash("sha256").update(stored).digest("hex") !== live.checksum
  ) {
    throw new Error("Live /methodologies hero object failed durable byte verification.");
  }
  return live;
}

async function run(apply: boolean) {
  const storageKey = await reconcileObject(apply);
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const administrators = await client.query(
      `SELECT id::text,email FROM cms_users
        WHERE role='administrator' AND status='active' ORDER BY created_at LIMIT 1`,
    );
    if (administrators.rowCount !== 1) {
      throw new Error("Task 294 reconciliation requires an active CMS administrator.");
    }
    const actor = administrators.rows[0] as { id: string; email: string };
    await ensureMethodologiesAuthority(client, apply);
    const media = await reconcileMedia(client, actor, storageKey, apply);
    const outcome = await reconcileLanding(client, actor, media, apply);
    const live = await verifyLiveDelivery(client);
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(
      `Verified Task 294 methodologies hero: object=readback-ok mediaVersion=${media.versionId} landing=${outcome} liveRevision=${live.revisionNumber} liveMediaVersion=${live.versionId}${apply ? "" : " (rolled back)"}.`,
    );
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
    console.log(JSON.stringify({
      media: methodologiesHeroMedia,
      rights: immutableVersionMetadata().rights,
      receiptPrefix: PREFIX,
    }, null, 2));
    console.error("Dry run: pass --apply-db or --verify-db with --target=development.");
    return;
  }
  assertDevelopmentTarget();
  await run(shouldApply);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
