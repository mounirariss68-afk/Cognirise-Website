import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  heroConfiguration,
  heroConfigurationSnapshot,
  heroMedia,
  motionMetadata,
  digest,
  type GovernedHeroMedia,
  type ConfiguredHeroSlot,
  type HeroSlot,
} from "./hero-media.js";
import { CMS_HERO_DOCUMENT_SLUGS, validateCmsSnapshot } from "@workspace/api-zod";
import { objectStorageClient } from "./object-storage.js";
import { repositoryRoot } from "./common.js";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply-db");
const shouldVerify = args.includes("--verify-db");
const shouldMediaOnly = args.includes("--media-only");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);
const PREFIX = "cms-site-hero-reconciliation-v1";
const CONFIGURATION_V2_PREFIX = "cms-site-hero-reconciliation-v2";
const PLATFORM_METADATA_PREFIX = "cms-site-hero-motion-metadata-v1";
const PLATFORM_METADATA_OPERATION = "cms.site-hero.motion-metadata-reconciled";
const APPROVAL = "Approved development reconciliation of existing website hero media.";
const V2_APPROVAL = "Validated site hero configuration contract upgrade.";

interface SqlClient {
  query: (text: string, values?: any[]) => Promise<{ rowCount: number | null; rows: any[] }>;
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

export function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Site hero reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database work requires the explicit --target=development safeguard.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!environment.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !environment.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is not configured.");
  }
}

async function reconcileObjects(allowCreate: boolean) {
  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
  const privatePrefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const keys = new Map<string, string>();
  for (const definition of heroMedia) {
    const bytes = await readFile(`${repositoryRoot}/${definition.sourceFile}`);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== definition.checksum || bytes.length !== definition.byteSize) {
      throw new Error(`Hero source changed from its governed manifest: ${definition.sourceFile}.`);
    }
    const storageKey = `${privatePrefix}/cms-media/site-hero-${definition.checksum}`;
    const object = bucket.file(storageKey);
    const [exists] = await object.exists();
    if (!exists) {
      if (!allowCreate) {
        throw new Error(`Missing durable hero object for ${definition.publicPath}.`);
      }
      await object.save(bytes, {
        resumable: false,
        contentType: definition.mimeType,
        metadata: {
          cacheControl: "private, max-age=31536000, immutable",
          metadata: { checksum, source: PREFIX, publicPath: definition.publicPath },
        },
      });
    }
    const [metadata] = await object.getMetadata();
    // Provider metadata is not sufficient evidence that the durable object
    // contains the governed binary. Always read the stored bytes back, even
    // when the object reports the expected size and content type.
    const [stored] = await object.download();
    const storedChecksum = createHash("sha256").update(stored).digest("hex");
    if (
      Number(metadata.size) !== definition.byteSize
      || metadata.contentType !== definition.mimeType
      || stored.length !== definition.byteSize
      || storedChecksum !== definition.checksum
    ) {
      throw new Error(`Existing hero object metadata or bytes conflict with ${definition.publicPath}.`);
    }
    keys.set(definition.publicPath, storageKey);
  }
  return keys;
}

async function reconcilePlatformsMotionMetadata(
  client: SqlClient,
  actor: { id: string; email: string },
  definition: (typeof heroMedia)[number],
  row: any,
  versions: any[],
  posterMediaId: string,
  fallbackMediaId: string,
  allowCreate: boolean,
) {
  if (
    definition.slot !== "platforms"
    || (definition.role !== "mp4" && definition.role !== "webm")
  ) return;

  const expectedMotionMetadata = motionMetadata(
    definition.slot,
    posterMediaId,
    fallbackMediaId,
  );
  const legacyMotionMetadata = motionMetadata(definition.slot, posterMediaId);
  const versionOne = versions.find((item) => Number(item.version_number) === 1);
  if (!versionOne) throw new Error(`Missing immutable v1 for ${definition.publicPath}.`);

  const receiptKey = `${PLATFORM_METADATA_PREFIX}:${definition.role}`;
  const requestDigest = digest({
    assetId: row.id,
    sourceVersionId: versionOne.id,
    sourceVersionNumber: 1,
    sourceMotionMetadata: legacyMotionMetadata,
    expectedMotionMetadata,
  });
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [receiptKey],
  );

  if (receipt.rowCount) {
    if (
      receipt.rows[0].operation !== PLATFORM_METADATA_OPERATION
      || receipt.rows[0].request_digest !== requestDigest
    ) {
      throw new Error(`Platforms motion metadata receipt conflicts for ${definition.publicPath}.`);
    }
    const corrected = await client.query(
      `SELECT id::text,asset_id::text,version_number,storage_key,checksum,byte_size,
              width,height,metadata
         FROM cms_media_versions
        WHERE id=$1 AND asset_id=$2`,
      [receipt.rows[0].subject_id, row.id],
    );
    const resultDigest = digest({
      assetId: row.id,
      sourceVersionId: versionOne.id,
      versionId: corrected.rows[0]?.id,
      motionMetadata: expectedMotionMetadata,
    });
    if (
      corrected.rowCount !== 1
      || Number(corrected.rows[0].version_number) !== 2
      || corrected.rows[0].storage_key !== versionOne.storage_key
      || corrected.rows[0].checksum !== versionOne.checksum
      || Number(corrected.rows[0].byte_size) !== Number(versionOne.byte_size)
      || Number(corrected.rows[0].width) !== Number(versionOne.width)
      || Number(corrected.rows[0].height) !== Number(versionOne.height)
      || canonicalJson(corrected.rows[0].metadata?.motionMetadata ?? null)
        !== canonicalJson(expectedMotionMetadata)
      || receipt.rows[0].result_digest !== resultDigest
    ) {
      throw new Error(`Platforms motion metadata version authority failed for ${definition.publicPath}.`);
    }
    return;
  }

  const versionOneMotionMetadata = versionOne.metadata?.motionMetadata ?? null;
  if (
    canonicalJson(versionOneMotionMetadata) !== canonicalJson(legacyMotionMetadata)
    || canonicalJson(row.motion_metadata ?? null) !== canonicalJson(legacyMotionMetadata)
  ) {
    // A non-legacy v1 or asset classification is editorial authority. Do not
    // reinterpret, overwrite, or append over that decision.
    return;
  }

  const latestVersion = versions.at(-1);
  if (latestVersion?.id !== versionOne.id) {
    if (
      canonicalJson(latestVersion?.metadata?.motionMetadata ?? null)
      === canonicalJson(expectedMotionMetadata)
    ) {
      throw new Error(
        `Unreceipted Platforms motion metadata version exists for ${definition.publicPath}.`,
      );
    }
    // A later non-governed version is editorial drift and must remain intact.
    return;
  }
  if (!allowCreate) {
    throw new Error(
      `Missing Platforms motion metadata correction receipt for ${definition.publicPath}.`,
    );
  }

  const correctedMetadata = {
    ...(versionOne.metadata && typeof versionOne.metadata === "object"
      ? versionOne.metadata
      : {}),
    motionMetadata: expectedMotionMetadata,
  };
  const corrected = await client.query(
    `INSERT INTO cms_media_versions
      (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
     SELECT asset_id,version_number+1,storage_key,checksum,byte_size,width,height,$2
       FROM cms_media_versions
      WHERE id=$1 AND version_number=1
     RETURNING id::text,asset_id::text,version_number,storage_key,checksum,byte_size,
               width,height,metadata`,
    [versionOne.id, correctedMetadata],
  );
  if (corrected.rowCount !== 1) {
    throw new Error(`Could not append Platforms motion metadata for ${definition.publicPath}.`);
  }
  const resultDigest = digest({
    assetId: row.id,
    sourceVersionId: versionOne.id,
    versionId: corrected.rows[0].id,
    motionMetadata: expectedMotionMetadata,
  });
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [receiptKey, PLATFORM_METADATA_OPERATION, corrected.rows[0].id, requestDigest, resultDigest],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'media.metadata-version-appended','media',$3,$4,$5)`,
    [actor.id, actor.email, row.id, receiptKey, {
      publicPath: definition.publicPath,
      sourceVersionId: versionOne.id,
      mediaVersionId: corrected.rows[0].id,
      reducedMotionMediaId: fallbackMediaId,
    }],
  );
}

async function reconcileMedia(
  client: SqlClient,
  actor: { id: string; email: string },
  keys: Map<string, string>,
  allowCreate: boolean,
) {
  const governed: GovernedHeroMedia[] = [];
  // Posters and fallbacks are deliberately reconciled first: motion rows
  // carry both identities in their DB-enforced metadata.
  const definitions = [...heroMedia].sort((left, right) =>
    Number(right.role === "poster") - Number(left.role === "poster")
    || Number(right.role === "fallback") - Number(left.role === "fallback"));
  const posterIds = new Map<HeroSlot, string>();
  const fallbackIds = new Map<HeroSlot, string>();
  for (const definition of definitions) {
    const receiptKey = `${PREFIX}:media:${definition.slot}:${definition.role}`;
    const requestDigest = digest(definition);
    const receipt = await client.query(
      `SELECT operation,subject_id::text,request_digest,result_digest
         FROM cms_operation_receipts WHERE idempotency_key=$1`,
      [receiptKey],
    );
    let asset;
    if (receipt.rowCount) {
      if (
        receipt.rows[0].operation !== "cms.site-hero.media-reconciled"
        || receipt.rows[0].request_digest !== requestDigest
      ) {
        throw new Error(`Immutable hero media receipt conflicts for ${definition.publicPath}.`);
      }
      asset = await client.query(
        `SELECT id::text,storage_key,filename,media_type,byte_size,checksum,status,
                collection,motion_metadata
           FROM cms_media_assets WHERE id=$1`,
        [receipt.rows[0].subject_id],
      );
    } else {
      if (!allowCreate) {
        throw new Error(
          `Missing hero media reconciliation receipt for ${definition.publicPath}; ` +
          "no committed development media-only reconciliation exists.",
        );
      }
      asset = await client.query(
        `SELECT id::text,storage_key,filename,media_type,byte_size,checksum,status,
                collection,motion_metadata
           FROM cms_media_assets WHERE storage_key=$1`,
        [keys.get(definition.publicPath)],
      );
      if (asset.rowCount) {
        throw new Error(`Refusing to adopt an unrelated media row at the governed key for ${definition.publicPath}.`);
      }
      asset = await client.query(
        `INSERT INTO cms_media_assets
           (storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,credit,collection,
           motion_metadata,status,uploaded_by_user_id)
          VALUES ($1,$2,$2,$3,$4,$5,$6,'Cognirise',$7,$8,'active',$9)
         RETURNING id::text,storage_key,filename,media_type,byte_size,checksum,status,
                   collection,motion_metadata`,
        [
          keys.get(definition.publicPath),
          definition.filename,
          definition.mimeType,
          definition.byteSize,
          definition.checksum,
          definition.altText,
          definition.role === "poster" || definition.role === "fallback" ? "website" : "motion",
          definition.role === "poster" || definition.role === "fallback"
            ? null
            : motionMetadata(
              definition.slot,
              posterIds.get(definition.slot)!,
              fallbackIds.get(definition.slot) ?? posterIds.get(definition.slot)!,
            ),
          actor.id,
        ],
      );
    }
    if (asset.rowCount !== 1) throw new Error(`Missing governed hero media row for ${definition.publicPath}.`);
    const row = asset.rows[0];
    const isMotion = definition.role === "mp4" || definition.role === "webm";
    const expectedMotionMetadata = isMotion
      ? motionMetadata(
        definition.slot,
        posterIds.get(definition.slot)!,
        fallbackIds.get(definition.slot) ?? posterIds.get(definition.slot)!,
      )
      : null;
    const rowMotionMetadata = row.motion_metadata ?? null;
    const rowMotionMetadataValid = !isMotion
      ? rowMotionMetadata === null
      : definition.slot === "platforms"
        ? rowMotionMetadata !== null
        : canonicalJson(rowMotionMetadata) === canonicalJson(expectedMotionMetadata);
    if (
      row.storage_key !== keys.get(definition.publicPath)
      || row.filename !== definition.filename
      || row.media_type !== definition.mimeType
      || Number(row.byte_size) !== definition.byteSize
      || row.checksum !== definition.checksum
      || row.status !== "active"
      || row.collection !== (
        definition.role === "poster" || definition.role === "fallback" ? "website" : "motion"
      )
      || !rowMotionMetadataValid
    ) {
      throw new Error(`Governed hero media row has drifted for ${definition.publicPath}.`);
    }
    let versions = await client.query(
      `SELECT id::text,version_number,storage_key,checksum,byte_size,width,height,metadata
         FROM cms_media_versions
        WHERE asset_id=$1 AND (version_number=1 OR version_number>1)
        ORDER BY version_number`,
      [row.id],
    );
    let version: { rowCount: number | null; rows: any[] } = {
      rowCount: versions.rows.filter((item) => Number(item.version_number) === 1).length,
      rows: versions.rows.filter((item) => Number(item.version_number) === 1),
    };
    if (!version.rowCount && !receipt.rowCount) {
      version = await client.query(
        `INSERT INTO cms_media_versions
          (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,1,$2,$3,$4,$5,$6,$7)
         RETURNING id::text,version_number,storage_key,checksum,byte_size,width,height,metadata`,
        [
          row.id,
          row.storage_key,
          definition.checksum,
          definition.byteSize,
          definition.width,
          definition.height,
          {
            sourcePath: definition.publicPath,
            usage: `${definition.slot} hero ${definition.role}`,
            rightsStatus: "approved-use",
            accessibilityStatus:
              definition.role === "poster" || definition.role === "fallback"
                ? "approved"
                : "decorative",
            ...(expectedMotionMetadata ? { motionMetadata: expectedMotionMetadata } : {}),
          },
        ],
      );
      versions = {
        rowCount: (versions.rowCount ?? 0) + (version.rowCount ?? 0),
        rows: [...versions.rows, ...version.rows],
      };
    }
    const versionMotionMetadata = version.rows[0]?.metadata?.motionMetadata ?? null;
    const versionMotionMetadataValid = !isMotion
      ? versionMotionMetadata === null
      : definition.slot === "platforms"
        ? versionMotionMetadata !== null
        : canonicalJson(versionMotionMetadata) === canonicalJson(expectedMotionMetadata);
    if (
      version.rowCount !== 1
      || Number(version.rows[0].version_number) !== 1
      || version.rows[0].storage_key !== row.storage_key
      || version.rows[0].checksum !== definition.checksum
      || Number(version.rows[0].byte_size) !== definition.byteSize
      || Number(version.rows[0].width) !== definition.width
      || Number(version.rows[0].height) !== definition.height
      || !versionMotionMetadataValid
    ) {
      throw new Error(`Immutable hero media version authority failed for ${definition.publicPath}.`);
    }
    if (isMotion && definition.slot === "platforms") {
      await reconcilePlatformsMotionMetadata(
        client,
        actor,
        definition,
        row,
        versions.rows,
        posterIds.get(definition.slot)!,
        fallbackIds.get(definition.slot)!,
        allowCreate,
      );
    }
    const resultDigest = digest({ assetId: row.id, versionId: version.rows[0].id });
    if (!receipt.rowCount) {
      await client.query(
        `INSERT INTO cms_operation_receipts
          (idempotency_key,operation,subject_id,request_digest,result_digest)
         VALUES ($1,'cms.site-hero.media-reconciled',$2,$3,$4)`,
        [receiptKey, row.id, requestDigest, resultDigest],
      );
      await client.query(
        `INSERT INTO cms_audit_events
          (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
         VALUES ($1,$2,'media.approved','media',$3,$4,$5)`,
        [actor.id, actor.email, row.id, receiptKey, { publicPath: definition.publicPath, versionId: version.rows[0].id }],
      );
    } else if (receipt.rows[0].result_digest !== resultDigest) {
      throw new Error(`Immutable hero media result receipt conflicts for ${definition.publicPath}.`);
    }
    governed.push({ definition, assetId: row.id, versionId: version.rows[0].id });
    if (definition.role === "poster") posterIds.set(definition.slot, row.id);
    if (definition.role === "fallback") fallbackIds.set(definition.slot, row.id);
  }
  return governed;
}

async function reconcileConfiguration(
  client: SqlClient,
  actor: { id: string; email: string },
  slot: ConfiguredHeroSlot,
  governed: readonly GovernedHeroMedia[],
  allowCreate: boolean,
) {
  const legacyReceiptKey = `${PREFIX}:configuration:${slot}`;
  const receiptKey = `${CONFIGURATION_V2_PREFIX}:configuration:${slot}`;
  const slug = CMS_HERO_DOCUMENT_SLUGS[slot];
  const title = `${slot === "homepage" ? "Homepage" : "Industries"} hero`;
  const payload = heroConfigurationSnapshot(slot, governed);
  const validation = validateCmsSnapshot("site-configuration", payload, "publish");
  if (!validation.success) {
    throw new Error(`Invalid ${slot} reconciliation payload: ${validation.errors.join("; ")}`);
  }
  const validatedPayload = validation.data;
  const requestDigest = digest(validatedPayload);
  const receipt = await client.query(
    `SELECT subject_id::text,request_digest,result_digest,operation
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [receiptKey],
  );
  if (receipt.rowCount) {
    if (
      receipt.rows[0].request_digest !== requestDigest
      || receipt.rows[0].operation !== "cms.site-hero.configuration-published.v2"
    ) {
      throw new Error(`Published ${slot} hero receipt conflicts with the governed media identities.`);
    }
    const authority = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.revision_number,r.reason,
              r.workflow_state,r.payload,d.id::text document_id,d.kind,
              d.canonical_slug,d.title,d.status document_status,d.archived_at,
              e.market,e.locale,e.localized_slug,e.publication_state,
              e.published_revision_id::text,
              (SELECT x.id::text FROM cms_revisions x
                WHERE x.edition_id=r.edition_id AND x.revision_number=1) legacy_revision_id
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
         JOIN cms_documents d ON d.id=e.document_id
        WHERE r.id=$1`,
      [receipt.rows[0].subject_id],
    );
    const authorityRow = authority.rows[0];
    const expectedResult = authorityRow?.revision_number === 2
      ? digest({
          documentId: authorityRow.document_id,
          editionId: authorityRow.edition_id,
          revisionId: authorityRow.id,
          upgradedFromRevisionId: authorityRow.legacy_revision_id,
        })
      : digest({
          documentId: authorityRow?.document_id,
          editionId: authorityRow?.edition_id,
          revisionId: authorityRow?.id,
        });
    if (
      authority.rowCount !== 1
      || receipt.rows[0].result_digest !== expectedResult
      || authorityRow.workflow_state !== "approved"
      || canonicalJson(authorityRow.payload) !== canonicalJson(validatedPayload)
      || authorityRow.kind !== "site-configuration"
      || authorityRow.canonical_slug !== slug
      || authorityRow.title !== title
      || authorityRow.document_status !== "active"
      || authorityRow.archived_at !== null
      || authorityRow.market !== "uae"
      || authorityRow.locale !== "en"
      || authorityRow.localized_slug !== slug
      || authorityRow.publication_state !== "published"
      || authorityRow.published_revision_id !== receipt.rows[0].subject_id
      || !(
        (authorityRow.revision_number === 1 && authorityRow.reason === APPROVAL)
        || (authorityRow.revision_number === 2 && authorityRow.reason === V2_APPROVAL)
      )
    ) {
      throw new Error(`Immutable published revision authority failed for the ${slot} hero.`);
    }
    const references = await client.query(
      `SELECT asset_id::text,media_version_id::text
         FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2
        ORDER BY asset_id`,
      [authority.rows[0].document_id, `revision:${receipt.rows[0].subject_id}`],
    );
    const expectedReferences = governed
      .filter((item) => item.definition.slot === slot)
      .map((item) => `${item.assetId}:${item.versionId}`)
      .sort();
    const actualReferences = references.rows
      .map((row) => `${String(row.asset_id)}:${String(row.media_version_id)}`)
      .sort();
    if (
      references.rowCount !== 3
      || canonicalJson(actualReferences) !== canonicalJson(expectedReferences)
    ) {
      throw new Error(`Published ${slot} hero does not have exactly three immutable pinned media references.`);
    }
    return "replayed";
  }

  const legacyPayload = heroConfiguration(slot, governed);
  const legacyDigest = digest(legacyPayload);
  const legacyReceipt = await client.query(
    `SELECT subject_id::text,request_digest,result_digest,operation
       FROM cms_operation_receipts WHERE idempotency_key=$1`,
    [legacyReceiptKey],
  );
  if (legacyReceipt.rowCount) {
    const legacy = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.revision_number,r.payload_version,
              r.payload,r.content_digest,r.workflow_state,r.created_by_user_id::text,
              r.approved_by_user_id::text,r.reason,
              d.id::text document_id,d.kind,d.canonical_slug,d.title,
              d.owner_id::text,d.status document_status,d.archived_at,
              e.market,e.locale,e.localized_slug,e.publication_state,
              e.published_revision_id::text,
              (SELECT max(x.revision_number) FROM cms_revisions x
                WHERE x.edition_id=r.edition_id) max_revision_number
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
         JOIN cms_documents d ON d.id=e.document_id
        WHERE r.id=$1`,
      [legacyReceipt.rows[0].subject_id],
    );
    const row = legacy.rows[0];
    const expectedLegacyResult = row
      ? digest({ documentId: row.document_id, editionId: row.edition_id, revisionId: row.id })
      : "";
    if (
      legacyReceipt.rowCount !== 1
      || legacyReceipt.rows[0].operation !== "cms.site-hero.configuration-published"
      || legacyReceipt.rows[0].request_digest !== legacyDigest
      || legacyReceipt.rows[0].result_digest !== expectedLegacyResult
      || legacy.rowCount !== 1
      || row.kind !== "site-configuration"
      || row.canonical_slug !== slug
      || row.title !== title
      || row.owner_id !== actor.id
      || row.document_status !== "active"
      || row.archived_at !== null
      || row.market !== "uae"
      || row.locale !== "en"
      || row.localized_slug !== slug
      || row.publication_state !== "published"
      || row.published_revision_id !== row.id
      || row.revision_number !== 1
      || row.max_revision_number !== 1
      || row.payload_version !== 1
      || row.content_digest !== legacyDigest
      || row.workflow_state !== "approved"
      || row.created_by_user_id !== actor.id
      || row.approved_by_user_id !== actor.id
      || row.reason !== APPROVAL
      || canonicalJson(row.payload) !== canonicalJson(legacyPayload)
    ) {
      throw new Error(`Legacy ${slot} hero authority is not the exact task-owned configuration.`);
    }
    const legacyReferences = await client.query(
      `SELECT asset_id::text,media_version_id::text
         FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2 ORDER BY asset_id`,
      [row.document_id, `revision:${row.id}`],
    );
    const expectedReferences = governed
      .filter((item) => item.definition.slot === slot)
      .map((item) => `${item.assetId}:${item.versionId}`)
      .sort();
    const actualReferences = legacyReferences.rows
      .map((reference) => `${String(reference.asset_id)}:${String(reference.media_version_id)}`)
      .sort();
    if (
      legacyReferences.rowCount !== 3
      || canonicalJson(actualReferences) !== canonicalJson(expectedReferences)
    ) {
      throw new Error(`Legacy ${slot} hero media authority is not exactly pinned.`);
    }
    if (!allowCreate) {
      throw new Error(`Legacy ${slot} hero requires the controlled v2 configuration upgrade.`);
    }
    const upgraded = await client.query(
      `INSERT INTO cms_revisions
        (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
         created_by_user_id,approved_by_user_id,approved_at,reason)
       VALUES ($1,2,1,$2,$3,'approved',$4,$4,now(),$5) RETURNING id::text`,
      [row.edition_id, validatedPayload, requestDigest, actor.id, V2_APPROVAL],
    );
    for (const media of governed.filter((item) => item.definition.slot === slot)) {
      await client.query(
        `INSERT INTO cms_media_references (asset_id,media_version_id,document_id,field_path)
         VALUES ($1,$2,$3,$4)`,
        [media.assetId, media.versionId, row.document_id, `revision:${upgraded.rows[0].id}`],
      );
    }
    await client.query(
      `UPDATE cms_market_editions
          SET published_revision_id=$2,published_at=now(),updated_at=now()
        WHERE id=$1 AND published_revision_id=$3`,
      [row.edition_id, upgraded.rows[0].id, row.id],
    );
    await client.query(
      `INSERT INTO cms_operation_receipts
        (idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES ($1,'cms.site-hero.configuration-published.v2',$2,$3,$4)`,
      [receiptKey, upgraded.rows[0].id, requestDigest, digest({
        documentId: row.document_id,
        editionId: row.edition_id,
        revisionId: upgraded.rows[0].id,
        upgradedFromRevisionId: row.id,
      })],
    );
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES ($1,$2,'document.published','document',$3,$4,$5)`,
      [actor.id, actor.email, row.document_id, receiptKey, {
        revisionId: upgraded.rows[0].id,
        upgradedFromRevisionId: row.id,
        slot,
        reason: V2_APPROVAL,
      }],
    );
    return "upgraded";
  }

  if (!allowCreate) throw new Error(`Missing published ${slot} hero v2 configuration receipt.`);
  const existing = await client.query(
    "SELECT id::text FROM cms_documents WHERE canonical_slug=$1",
    [slug],
  );
  if (existing.rowCount) {
    throw new Error(`Refusing to overwrite unrelated CMS configuration ${slug}.`);
  }
  const document = await client.query(
    `INSERT INTO cms_documents (kind,canonical_slug,title,status,owner_id)
     VALUES ('site-configuration',$1,$2,'active',$3) RETURNING id::text`,
    [slug, title, actor.id],
  );
  const edition = await client.query(
    `INSERT INTO cms_market_editions
      (document_id,market,locale,localized_slug,publication_state,parity_complete)
     VALUES ($1,'uae','en',$2,'draft',true) RETURNING id::text`,
    [document.rows[0].id, slug],
  );
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,approved_by_user_id,approved_at,reason)
     VALUES ($1,1,1,$2,$3,'approved',$4,$4,now(),$5) RETURNING id::text`,
     [edition.rows[0].id, validatedPayload, requestDigest, actor.id, APPROVAL],
  );
  for (const media of governed.filter((item) => item.definition.slot === slot)) {
    await client.query(
      `INSERT INTO cms_media_references (asset_id,media_version_id,document_id,field_path)
       VALUES ($1,$2,$3,$4)`,
      [media.assetId, media.versionId, document.rows[0].id, `revision:${revision.rows[0].id}`],
    );
  }
  await client.query(
    `UPDATE cms_market_editions
        SET publication_state='published',published_revision_id=$2,published_at=now(),updated_at=now()
      WHERE id=$1`,
    [edition.rows[0].id, revision.rows[0].id],
  );
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
      VALUES ($1,'cms.site-hero.configuration-published.v2',$2,$3,$4)`,
    [receiptKey, revision.rows[0].id, requestDigest, digest({ documentId: document.rows[0].id, editionId: edition.rows[0].id, revisionId: revision.rows[0].id })],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.published','document',$3,$4,$5)`,
    [actor.id, actor.email, document.rows[0].id, receiptKey, { revisionId: revision.rows[0].id, slot, reason: APPROVAL }],
  );
  return "published";
}

async function run(apply: boolean, mediaOnly: boolean) {
  const keys = await reconcileObjects(apply);
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
    const admins = await client.query(
      "SELECT id::text,email FROM cms_users WHERE role='administrator' AND status='active' ORDER BY created_at",
    );
    if (admins.rowCount !== 1) throw new Error("Hero reconciliation requires exactly one active CMS administrator.");
    const governed = await reconcileMedia(client, admins.rows[0], keys, apply);
    const outcomes: string[] = [];
    if (!mediaOnly) {
      for (const slot of ["homepage", "industries"] as const) {
        outcomes.push(`${slot}:${await reconcileConfiguration(client, admins.rows[0], slot, governed, apply)}`);
      }
    }
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(
      `Verified governed site hero media: media=${heroMedia.length}` +
      `${mediaOnly ? " (media-only; pages untouched)" : ` ${outcomes.join(" ")}`}` +
      `${apply ? "" : " (rolled back)"}.`,
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
      media: heroMedia.map(({ slot, role, publicPath, checksum }) => ({ slot, role, publicPath, checksum })),
      mode: shouldMediaOnly ? "development-media-only" : "development-media-and-site-heroes",
      configurations: shouldMediaOnly ? [] : ["site-homepage-hero", "site-industries-hero"],
    }, null, 2));
    console.error(
      "Dry run: pass --media-only --apply-db (or --verify-db) with --target=development.",
    );
    return;
  }
  assertDevelopmentTarget();
  await run(shouldApply, shouldMediaOnly);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}