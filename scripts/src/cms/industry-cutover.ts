import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  type CmsDocumentKind,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import {
  type InventoryRecord,
  repositoryRoot,
} from "./common.js";
import { educationDraftReceiptAllowed, educationDraftReceiptOperations, industryPublicationPinAction, pulseIndustryMedia } from "./industry-media.js";
import {
  mediaMigrationOperations,
  migrationOperations,
  canonicalResultDigest,
  educationSuccessorRecoveryKey,
  educationSuccessorVersion,
  resultDigest,
  type MediaMigrationOperation,
  type MigrationOperation,
} from "./migration.js";
import { objectStorageClient } from "./object-storage.js";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply-db");
const shouldVerify = args.includes("--verify-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);
const requestedSlug = args.find((argument) => argument.startsWith("--slug="))?.slice(7);
const APPROVED_AT = "2026-09-08";
const CUTOVER_PREFIX = "cms-industry-pulse-cutover-v2";
const EDUCATION_HERO_CUTOVER_PREFIX = "cms-industry-education-hero-v4";
const EDUCATION_PRIOR_CUTOVER_PREFIX = "cms-industry-education-imagery-v3";
const LEGACY_CUTOVER_PREFIX = "cms-industry-pulse-cutover-v1";
const MEDIA_APPROVAL_PREFIX = "cms-industry-pulse-media-approval-v2";
const REFERENCE_REPAIR_PREFIX = "cms-industry-pulse-reference-repair-v1";

interface Inventory {
  schemaVersion: number;
  manifestDigest: string;
  records: InventoryRecord[];
}

interface ApprovedMedia {
  definition: (typeof pulseIndustryMedia)[number];
  operation: MediaMigrationOperation;
  assetId: string;
  versionId: string;
}

interface SqlClient {
  query: (
    queryText: string,
    values?: any[],
  ) => Promise<{ rowCount: number | null; rows: any[] }>;
}

function assertDevelopmentTarget() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") {
    throw new Error("The Pulse industry cutover is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database work requires the explicit --target=development safeguard.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is not configured.");
  }
}

async function loadPlan() {
  if (requestedSlug && requestedSlug !== "education") {
    throw new Error("This scoped cutover supports Education only.");
  }
  const inventory = JSON.parse(
    await readFile(`${repositoryRoot}/scripts/cms/output/inventory.json`, "utf8"),
  ) as Inventory;
  if (inventory.schemaVersion !== 2 || !inventory.manifestDigest) {
    throw new Error("Unsupported or invalid CMS inventory.");
  }
  const operationsByPath = new Map(
    mediaMigrationOperations(inventory.records).map((operation) => [operation.publicPath, operation]),
  );
  const contentOperationsBySlug = new Map(
    migrationOperations(inventory.records)
      .filter((operation) => operation.kind === "industry")
      .map((operation) => [operation.slug, operation]),
  );
  const fullPlan = pulseIndustryMedia.map((definition) => {
    const operation = operationsByPath.get(definition.publicPath);
    if (!operation) throw new Error(`The governed inventory is missing ${definition.publicPath}.`);
    if (
      operation.collection !== "website"
      || operation.cmsOwnership !== "cms-candidate"
      || operation.mimeType !== "image/png"
      || operation.width !== (definition.width ?? 1536)
      || operation.height !== (definition.height ?? 1024)
      || operation.altText !== definition.altText
    ) {
      throw new Error(`${definition.publicPath} does not match the approved media contract.`);
    }
    const contentOperation = definition.slug && definition.role !== "supporting"
      ? contentOperationsBySlug.get(definition.slug)
      : undefined;
    if (definition.slug && definition.role !== "supporting" && !contentOperation) {
      throw new Error(`The governed inventory is missing the ${definition.slug} content baseline.`);
    }
    const content = contentOperation?.payload.content as Record<string, unknown> | undefined;
    if (
      contentOperation
      && (
        contentOperation.mediaPaths[0] !== definition.publicPath
        || (definition.slug !== "education" && contentOperation.mediaPaths.length !== 1)
        || (definition.slug === "education" && contentOperation.mediaPaths.length !== 1)
        || content?.image !== definition.publicPath
        || content?.imageAlt !== definition.altText
      )
    ) {
      throw new Error(`${definition.slug}: the governed content baseline is not pinned to its approved Pulse PNG.`);
    }
    return { definition, operation, contentOperation };
  });
  const plan = requestedSlug
    ? fullPlan.filter((item) => item.definition.slug === requestedSlug)
    : fullPlan;
  const associated = plan.filter((item) => item.definition.slug && item.definition.role !== "supporting");
  const supporting = plan.filter((item) => item.definition.role === "supporting");
  const expectedAssociated = requestedSlug ? 1 : 6;
  const expectedSupporting = 0;
  const expectedUnassociated = requestedSlug ? 0 : 3;
  if (
    associated.length !== expectedAssociated
    || supporting.length !== expectedSupporting
    || plan.length !== expectedAssociated + expectedSupporting + expectedUnassociated
  ) {
    throw new Error(requestedSlug
      ? "The Education cutover must contain exactly one reviewed hero."
      : "The Pulse industry family must contain nine assets and six hero associations.");
  }
  return plan;
}

async function uploadApprovedMedia(
  plan: Awaited<ReturnType<typeof loadPlan>>,
) {
  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKeys = new Map<string, string>();
  for (const item of plan) {
    const bytes = await readFile(`${repositoryRoot}/${item.operation.sourceFile}`);
    const checksum = createHash("sha256").update(bytes).digest("hex");
    if (checksum !== item.operation.checksum || bytes.length !== item.operation.byteSize) {
      throw new Error(`Asset changed after approval: ${item.operation.sourceFile}.`);
    }
    const storageKey = `${prefix}/cms-media/approved-${item.operation.checksum}`;
    const object = bucket.file(storageKey);
    const [exists] = await object.exists();
    if (!exists) {
      await object.save(bytes, {
        resumable: false,
        contentType: item.operation.mimeType,
        metadata: {
          cacheControl: "private, max-age=31536000, immutable",
          metadata: { checksum: item.operation.checksum, source: "cms-industry-pulse-approval-v2" },
        },
      });
    }
    const [metadata] = await object.getMetadata();
    if (
      Number(metadata.size) !== item.operation.byteSize
      || metadata.metadata?.checksum !== item.operation.checksum
    ) {
      throw new Error(`Approved storage object parity failed for ${item.definition.publicPath}.`);
    }
    storageKeys.set(item.definition.publicPath, storageKey);
  }
  return storageKeys;
}

async function approveMedia(
  client: SqlClient,
  admin: { id: string; email: string },
  plan: Awaited<ReturnType<typeof loadPlan>>,
  approvedStorageKeys: Map<string, string>,
) {
  const approved = new Map<string, ApprovedMedia>();
  for (const item of plan) {
    const mediaResult = await client.query(
      `SELECT a.id::text asset_id,a.status,a.checksum,a.byte_size,a.alt_text,a.credit,a.collection
         FROM cms_media_assets a
        WHERE a.checksum=$1`,
      [item.operation.checksum],
    );
    if (mediaResult.rowCount !== 1) {
      throw new Error(`Expected one imported media asset for ${item.definition.publicPath}.`);
    }
    const media = mediaResult.rows[0] as Record<string, unknown>;
    if (
      media.checksum !== item.operation.checksum
      || Number(media.byte_size) !== item.operation.byteSize
      || media.collection !== "website"
    ) {
      throw new Error(`Imported media parity failed for ${item.definition.publicPath}.`);
    }
    const storageKey = approvedStorageKeys.get(item.definition.publicPath)!;
    const metadata = {
      sourcePath: item.definition.publicPath,
      usages: [item.definition.usage],
      altText: item.definition.altText,
      credit: "Cognirise",
      accessibilityStatus: "approved",
      rightsStatus: "approved-use",
      approvedUse: "Cognirise industry imagery",
      approvedAt: APPROVED_AT,
    };
    let version = await client.query(
      `SELECT id::text,checksum,byte_size,width,height,metadata
         FROM cms_media_versions
        WHERE asset_id=$1 AND storage_key=$2
        ORDER BY version_number DESC
        LIMIT 1`,
      [media.asset_id, storageKey],
    );
    if (!version.rowCount) {
      const nextVersion = await client.query(
        "SELECT COALESCE(max(version_number),0)::int + 1 next_version FROM cms_media_versions WHERE asset_id=$1",
        [media.asset_id],
      );
      version = await client.query(
        `INSERT INTO cms_media_versions
          (asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING id::text,checksum,byte_size,width,height,metadata`,
        [
          media.asset_id,
          Number(nextVersion.rows[0].next_version),
          storageKey,
          item.operation.checksum,
          item.operation.byteSize,
           item.operation.width,
           item.operation.height,
          metadata,
        ],
      );
    }
    const approvedVersion = version.rows[0] as Record<string, unknown>;
    if (
      approvedVersion.checksum !== item.operation.checksum
      || Number(approvedVersion.byte_size) !== item.operation.byteSize
      || Number(approvedVersion.width) !== item.operation.width
      || Number(approvedVersion.height) !== item.operation.height
    ) {
      throw new Error(`Approved immutable version parity failed for ${item.definition.publicPath}.`);
    }
    await client.query(
      `UPDATE cms_media_assets
          SET status='active',alt_text=$2,credit='Cognirise',updated_at=now()
        WHERE id=$1
          AND (status<>'active' OR alt_text IS DISTINCT FROM $2 OR credit IS DISTINCT FROM 'Cognirise')`,
      [media.asset_id, item.definition.altText],
    );
    const approvalRequestId = `${MEDIA_APPROVAL_PREFIX}:${item.operation.checksum.slice(0, 24)}`;
    await client.query(
      `INSERT INTO cms_audit_events
        (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES ($1,$2,'media.approved','media',$3,$4,$5)
       ON CONFLICT (request_id) DO NOTHING`,
      [
        admin.id,
        admin.email,
        media.asset_id,
        approvalRequestId,
        {
          approvedAt: APPROVED_AT,
          approvedUse: "Cognirise industry imagery",
          publicPath: item.definition.publicPath,
          associatedIndustry: item.definition.slug,
        },
      ],
    );
    approved.set(item.definition.publicPath, {
      ...item,
      assetId: String(media.asset_id),
      versionId: String(approvedVersion.id),
    });
  }
  return approved;
}

async function applyCutover(
  plan: Awaited<ReturnType<typeof loadPlan>>,
) {
  const approvedStorageKeys = await uploadApprovedMedia(plan);
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const administrators = await client.query(
      `SELECT id::text,email FROM cms_users
        WHERE role='administrator' AND status='active'
        ORDER BY created_at`,
    );
    if (administrators.rowCount !== 1) {
      throw new Error("The cutover requires exactly one active CMS administrator for attribution.");
    }
    const admin = administrators.rows[0] as { id: string; email: string };
    const approvedMedia = await approveMedia(client, admin, plan, approvedStorageKeys);
    let published = 0;
    let replayed = 0;
    let repaired = 0;

    for (const item of plan.filter((candidate) =>
      candidate.definition.slug && candidate.definition.role !== "supporting"
    )) {
      const slug = item.definition.slug!;
      const media = approvedMedia.get(item.definition.publicPath)!;
      const supporting = plan
        .filter((candidate) => candidate.definition.slug === slug && candidate.definition.role === "supporting")
        .map((candidate) => approvedMedia.get(candidate.definition.publicPath)!);
       const idempotencyKey = `${slug === "education" ? EDUCATION_HERO_CUTOVER_PREFIX : CUTOVER_PREFIX}:${slug}`;
      const editionResult = await client.query(
        `SELECT d.id::text document_id,e.id::text edition_id,e.locale,e.publication_state,
                e.published_revision_id::text
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae'
          WHERE d.kind='industry' AND d.canonical_slug=$1`,
        [slug],
      );
      if (editionResult.rowCount !== 1 || editionResult.rows[0].locale !== "en") {
        throw new Error(`Expected one UAE/English industry edition for ${slug}.`);
      }
      const edition = editionResult.rows[0] as {
        document_id: string;
        edition_id: string;
        published_revision_id: string | null;
      };
      const legacyReceipt = await client.query(
        "SELECT subject_id FROM cms_operation_receipts WHERE idempotency_key=$1",
        [`${LEGACY_CUTOVER_PREFIX}:${slug}`],
      );
       if (slug === "education") {
         const priorCutover = await client.query(
           `SELECT operation,subject_id::text,request_digest,result_digest
              FROM cms_operation_receipts
             WHERE idempotency_key=$1`,
           [`${EDUCATION_PRIOR_CUTOVER_PREFIX}:${slug}`],
         );
         if (
           priorCutover.rowCount
           && priorCutover.rows[0].operation !== "cms.industry.pulse-media-cutover"
         ) {
           throw new Error("Education replacement hero has an unexpected prior imagery receipt.");
         }
       }

      const receipt = await client.query(
        `SELECT r.request_digest,a.metadata
           FROM cms_operation_receipts r
           LEFT JOIN cms_audit_events a ON a.request_id=r.idempotency_key
          WHERE r.idempotency_key=$1`,
        [idempotencyKey],
      );
      if (receipt.rowCount) {
        const auditMetadata = receipt.rows[0].metadata as Record<string, unknown> | null;
        const sourceRevisionId = typeof auditMetadata?.sourceRevisionId === "string"
          ? auditMetadata.sourceRevisionId
          : legacyReceipt.rowCount
            ? String(legacyReceipt.rows[0].subject_id)
            : null;
        if (!sourceRevisionId) {
          throw new Error(`Cutover receipt for ${slug} is missing its immutable source revision identity.`);
        }
        const recordedVersionId = typeof auditMetadata?.mediaVersionId === "string"
          ? auditMetadata.mediaVersionId
          : null;
        if (!recordedVersionId) {
          throw new Error(`Cutover receipt for ${slug} is missing its immutable media-version identity.`);
        }
        const replayDigest = resultDigest({
          slug,
          checksum: item.operation.checksum,
          mediaVersionId: recordedVersionId,
          publicPath: item.definition.publicPath,
          sourceRevisionId,
        });
        if (receipt.rows[0].request_digest !== replayDigest) {
          throw new Error(`Cutover receipt conflict for ${slug}.`);
        }
        if (!edition.published_revision_id) {
          throw new Error(`${slug} has a cutover receipt but no published revision.`);
        }
        const currentRevision = await client.query(
          `SELECT id::text,payload,workflow_state
             FROM cms_revisions
            WHERE id=$1 AND edition_id=$2`,
          [edition.published_revision_id, edition.edition_id],
        );
        if (currentRevision.rowCount !== 1) {
          throw new Error(`${slug} has no valid current published revision to repair.`);
        }
        const current = currentRevision.rows[0] as {
          id: string;
          payload: { mediaIds?: unknown; content?: Record<string, unknown> };
          workflow_state: string;
        };
        const expectedMedia = [media, ...supporting];
        const currentReferences = await client.query(
          `SELECT asset_id::text,media_version_id::text
             FROM cms_media_references
             WHERE document_id=$1 AND field_path=$2
               AND asset_id::text=ANY($3::text[])
             ORDER BY array_position($3::text[],asset_id::text)`,
          [edition.document_id, `revision:${current.id}`, expectedMedia.map((item) => item.assetId)],
        );
        const pinAction = industryPublicationPinAction({
          workflowState: current.workflow_state,
          mediaIds: current.payload?.mediaIds,
          heroMediaId: current.payload?.content?.heroMediaId,
          expectedAssetId: media.assetId,
          expectedVersionId: media.versionId,
          expectedSupportingMedia: supporting.map((item) => ({
            assetId: item.assetId,
            versionId: item.versionId,
          })),
          referenceVersionIds: currentReferences.rows.map((reference) =>
            typeof reference.media_version_id === "string"
              ? reference.media_version_id
              : null
          ),
        });
        if (pinAction === "blocked") {
          throw new Error(`${slug} published media differs from the approved Pulse association; preserving publication for editorial review.`);
        }
        if (pinAction === "insert-reference") {
          const repairKey = `${REFERENCE_REPAIR_PREFIX}:${slug}:${current.id}`;
          const repairDigest = resultDigest({
            slug,
            revisionId: current.id,
            mediaId: media.assetId,
            mediaVersionId: media.versionId,
            checksum: item.operation.checksum,
          });
          const repairReceipt = await client.query(
            `SELECT operation,subject_id,request_digest
               FROM cms_operation_receipts
              WHERE idempotency_key=$1`,
            [repairKey],
          );
          if (
            repairReceipt.rowCount
            && (
              repairReceipt.rows[0].operation !== "cms.industry.pulse-media-reference-repaired"
              || repairReceipt.rows[0].subject_id !== current.id
              || repairReceipt.rows[0].request_digest !== repairDigest
            )
          ) {
            throw new Error(`Reference-repair receipt conflict for ${slug}.`);
          }
          await client.query(
            `INSERT INTO cms_media_references
              (asset_id,media_version_id,document_id,field_path)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (document_id,field_path,asset_id) DO NOTHING`,
            [media.assetId, media.versionId, edition.document_id, `revision:${current.id}`],
          );
          if (!repairReceipt.rowCount) {
            await client.query(
              `INSERT INTO cms_operation_receipts
                (idempotency_key,operation,subject_id,request_digest,result_digest)
               VALUES ($1,'cms.industry.pulse-media-reference-repaired',$2,$3,$4)`,
              [
                repairKey,
                current.id,
                repairDigest,
                resultDigest({
                  documentId: edition.document_id,
                  editionId: edition.edition_id,
                  revisionId: current.id,
                  mediaId: media.assetId,
                  mediaVersionId: media.versionId,
                }),
              ],
            );
            await client.query(
              `INSERT INTO cms_audit_events
                (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
               VALUES ($1,$2,'cms.industry.pulse-media-reference-repaired','document',$3,$4,$5)
               ON CONFLICT (request_id) DO NOTHING`,
              [
                admin.id,
                admin.email,
                edition.document_id,
                repairKey,
                {
                  market: "uae",
                  locale: "en",
                  revisionId: current.id,
                  mediaId: media.assetId,
                  mediaVersionId: media.versionId,
                  reason: "Restored the missing immutable reference for an approved Pulse industry asset",
                },
              ],
            );
          }
          repaired++;
        } else {
          replayed++;
        }
        continue;
      }
      let sourceRevision;
      if (legacyReceipt.rowCount && slug !== "education") {
        sourceRevision = await client.query(
          `SELECT id::text,revision_number,payload,workflow_state
             FROM cms_revisions
            WHERE id=$1 AND edition_id=$2`,
          [legacyReceipt.rows[0].subject_id, edition.edition_id],
        );
      } else if (slug === "education") {
         // A v12 successor is intentionally imported as a governed draft. It
         // must become the cutover source so the final immutable hero
         // publication retains its approved narrative rather than rebuilding
         // from the obsolete published edition.
        sourceRevision = await client.query(
          `SELECT id::text,revision_number,payload,workflow_state
             FROM cms_revisions
            WHERE edition_id=$1
            ORDER BY revision_number DESC
            LIMIT 1`,
          [edition.edition_id],
        );
        const candidate = sourceRevision.rows[0] as {
          payload?: Record<string, unknown>;
          workflow_state?: string;
        } | undefined;
        const normalizedCandidate = candidate?.payload
          ? structuredClone(candidate.payload) as {
              mediaIds?: unknown[];
              content?: Record<string, unknown>;
            }
          : undefined;
        if (normalizedCandidate) {
          normalizedCandidate.mediaIds = [];
          delete normalizedCandidate.content?.heroMediaId;
          delete normalizedCandidate.content?.heroMedia;
          delete normalizedCandidate.content?.supportingMedia;
          const imagery = normalizedCandidate.content?.educationPov;
          const scenes = imagery && typeof imagery === "object" && !Array.isArray(imagery)
            ? (imagery as Record<string, unknown>).imagery
            : undefined;
          if (scenes && typeof scenes === "object" && !Array.isArray(scenes)) {
            for (const slot of ["educatorPractice", "researchCoordination"]) {
              const scene = (scenes as Record<string, unknown>)[slot];
              if (scene && typeof scene === "object" && !Array.isArray(scene)) {
                delete (scene as Record<string, unknown>).media;
              }
            }
          }
        }
        const pendingReceipt = await client.query(
          `SELECT idempotency_key,operation
             FROM cms_operation_receipts
            WHERE idempotency_key=ANY($1::text[])
              AND operation=ANY($4::text[])
              AND subject_id=$2
              AND request_digest=$3`,
          [
            [
               item.contentOperation!.idempotencyKey,
               educationSuccessorRecoveryKey(
                 item.contentOperation!.externalId,
                 educationSuccessorVersion(item.contentOperation!.idempotencyKey) ?? "v11",
               ),
            ],
            edition.document_id,
            item.contentOperation!.requestDigest,
            [...educationDraftReceiptOperations],
          ],
        );
        if (
          sourceRevision.rowCount !== 1
          || candidate?.workflow_state !== "draft"
          || !normalizedCandidate
          || pendingReceipt.rowCount !== 1
          || !educationDraftReceiptAllowed(
            pendingReceipt.rows[0]?.operation,
            Number(sourceRevision.rows[0]?.revision_number),
            edition.published_revision_id ?? null,
          )
          || canonicalResultDigest(normalizedCandidate) !== canonicalResultDigest(item.contentOperation!.payload)
        ) {
           throw new Error("education has no exact governed v12 draft available for the reviewed-hero cutover.");
        }
      } else if (edition.published_revision_id) {
        sourceRevision = await client.query(
          `SELECT id::text,revision_number,payload,workflow_state
             FROM cms_revisions
            WHERE id=$1 AND edition_id=$2 AND workflow_state='approved'`,
          [edition.published_revision_id, edition.edition_id],
        );
      } else {
        sourceRevision = await client.query(
          `SELECT id::text,revision_number,payload,workflow_state
             FROM cms_revisions
            WHERE edition_id=$1
            ORDER BY revision_number`,
          [edition.edition_id],
        );
        if (
          sourceRevision.rowCount !== 1
          || Number(sourceRevision.rows[0].revision_number) !== 1
          || resultDigest({
            ...sourceRevision.rows[0].payload,
            mediaIds: [],
            content: {
              ...sourceRevision.rows[0].payload.content,
              heroMediaId: undefined,
            },
          }) !== resultDigest(item.contentOperation!.payload)
        ) {
          throw new Error(`${slug} has unreviewed editorial drift; choose and approve a source revision before the image cutover.`);
        }
      }
      if (sourceRevision.rowCount !== 1) {
        throw new Error(`No explicitly reviewed source revision exists for ${slug}.`);
      }
      const source = sourceRevision.rows[0] as {
        id: string;
        revision_number: number;
        payload: Record<string, unknown>;
      };
      const request = {
        slug,
        checksum: item.operation.checksum,
        mediaVersionId: media.versionId,
        publicPath: item.definition.publicPath,
        sourceRevisionId: source.id,
      };
      const requestDigest = resultDigest(request);
      const latestRevision = await client.query(
        "SELECT COALESCE(max(revision_number),0)::int latest FROM cms_revisions WHERE edition_id=$1",
        [edition.edition_id],
      );
      const payload = structuredClone(source.payload);
      payload.mediaIds = [media.assetId, ...supporting.map((item) => item.assetId)];
      payload.content = {
        ...((payload.content && typeof payload.content === "object") ? payload.content : {}),
        heroMediaId: media.assetId,
        heroMedia: {
          mediaId: media.assetId,
          mediaVersionId: media.versionId,
          role: "hero",
          altText: item.definition.altText,
        },
      };
      const validation = validateCmsSnapshot("industry" as CmsDocumentKind, payload, "publish");
      if (!validation.success) {
        throw new Error(`${slug}: ${validation.errors.join("; ")}`);
      }
      const revisionResult = await client.query(
        `INSERT INTO cms_revisions
          (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
           created_by_user_id,approved_by_user_id,approved_at,reason)
         VALUES ($1,$2,1,$3,$4,'approved',$5,$5,now(),$6)
         RETURNING id::text`,
        [
          edition.edition_id,
          Number(latestRevision.rows[0].latest) + 1,
          validation.data,
          resultDigest(validation.data),
          admin.id,
          "Approved Cognirise Pulse industry-image cutover; previous revisions and media preserved.",
        ],
      );
      const revisionId = String(revisionResult.rows[0].id);
      for (const pinnedMedia of [media, ...supporting]) await client.query(
        `INSERT INTO cms_media_references
          (asset_id,media_version_id,document_id,field_path)
         VALUES ($1,$2,$3,$4)`,
        [pinnedMedia.assetId, pinnedMedia.versionId, edition.document_id, `revision:${revisionId}`],
      );
      await client.query(
        `UPDATE cms_market_editions
            SET publication_state='published',parity_complete=true,publish_at=NULL,
                published_revision_id=$2,published_at=now(),updated_at=now()
          WHERE id=$1`,
        [edition.edition_id, revisionId],
      );
      await client.query(
        "UPDATE cms_documents SET updated_at=now() WHERE id=$1",
        [edition.document_id],
      );
      await client.query(
        `INSERT INTO cms_operation_receipts
          (idempotency_key,operation,subject_id,request_digest,result_digest)
         VALUES ($1,'cms.industry.pulse-media-cutover',$2,$3,$4)`,
        [
          idempotencyKey,
          revisionId,
          requestDigest,
          resultDigest({
            documentId: edition.document_id,
            editionId: edition.edition_id,
            revisionId,
            mediaId: media.assetId,
            mediaVersionId: media.versionId,
          }),
        ],
      );
      await client.query(
        `INSERT INTO cms_audit_events
          (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
         VALUES ($1,$2,'document.published','document',$3,$4,$5)`,
        [
          admin.id,
          admin.email,
          edition.document_id,
          idempotencyKey,
          {
            market: "uae",
            locale: "en",
            revisionId,
            mediaId: media.assetId,
            mediaVersionId: media.versionId,
            sourceRevisionId: source.id,
            reason: "Approved Cognirise Pulse industry-image cutover",
          },
        ],
      );
      published++;
    }
    await verifyCutover(plan, client);
    await client.query("COMMIT");
     console.log(`${requestedSlug === "education" ? "Education hero" : "Pulse industry"} cutover applied: media=${plan.length} published=${published} repaired=${repaired} replayed=${replayed} unassociated=${plan.filter((item) => !item.definition.slug).length}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verifyCutover(
  plan: Awaited<ReturnType<typeof loadPlan>>,
  providedClient?: SqlClient,
) {
  const { pool } = await import("@workspace/db");
  const ownedClient = providedClient ? null : await pool.connect();
  const client = providedClient ?? ownedClient!;
  try {
    let associated = 0;
    let supporting = 0;
    let unassociated = 0;
    for (const item of plan) {
      const media = await client.query(
        `SELECT a.id::text asset_id,a.status,a.alt_text,a.credit,
                v.id::text version_id,v.storage_key,v.checksum,v.width,v.height,v.metadata
           FROM cms_media_assets a
           JOIN LATERAL (
             SELECT * FROM cms_media_versions
               WHERE asset_id=a.id
                 AND checksum=$1
                 AND metadata->>'accessibilityStatus'='approved'
                 AND metadata->>'rightsStatus'='approved-use'
               ORDER BY version_number DESC LIMIT 1
           ) v ON true
          WHERE a.checksum=$1`,
        [item.operation.checksum],
      );
      if (media.rowCount !== 1) {
        throw new Error(`Missing approved media for ${item.definition.publicPath}.`);
      }
      const row = media.rows[0] as Record<string, unknown>;
      const metadata = row.metadata as Record<string, unknown> | null;
      if (
        row.status !== "active"
        || row.alt_text !== item.definition.altText
        || row.credit !== "Cognirise"
        || row.checksum !== item.operation.checksum
         || Number(row.width) !== item.operation.width
         || Number(row.height) !== item.operation.height
        || String(row.storage_key).startsWith("deferred/")
        || metadata?.accessibilityStatus !== "approved"
        || metadata?.rightsStatus !== "approved-use"
      ) {
        throw new Error(`Approved media governance parity failed for ${item.definition.publicPath}.`);
      }

      if (item.definition.role === "supporting") {
        const references = await client.query(
          `SELECT count(*)::int count
             FROM cms_documents d
             JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae'
             JOIN cms_media_references ref ON ref.document_id=d.id
               AND ref.field_path='revision:' || e.published_revision_id::text
               AND ref.asset_id=$1
            WHERE d.kind='industry' AND d.canonical_slug='education'
              AND e.publication_state='published'`,
          [row.asset_id],
        );
        if (Number(references.rows[0].count) !== 1) {
          throw new Error(`${item.definition.publicPath} must be pinned to the published Education revision.`);
        }
        supporting++;
        continue;
      }

      if (!item.definition.slug) {
        const references = await client.query(
          "SELECT count(*)::int count FROM cms_media_references WHERE asset_id=$1",
          [row.asset_id],
        );
        if (Number(references.rows[0].count) !== 0) {
          throw new Error(`${item.definition.sector} must remain an unassociated governed asset.`);
        }
        unassociated++;
        continue;
      }

      const publication = await client.query(
        `SELECT d.id::text document_id,e.publication_state,e.published_revision_id::text,
                r.workflow_state,r.payload,ref.asset_id::text,ref.media_version_id::text
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae'
           JOIN cms_revisions r ON r.id=e.published_revision_id
           JOIN cms_media_references ref ON ref.document_id=d.id
             AND ref.field_path='revision:' || r.id::text
             AND ref.asset_id=$2
          WHERE d.kind='industry' AND d.canonical_slug=$1`,
        [item.definition.slug, row.asset_id],
      );
      if (publication.rowCount !== 1) {
        throw new Error(`Missing published pinned revision for ${item.definition.slug}.`);
      }
      const published = publication.rows[0] as Record<string, unknown>;
      const validation = validateCmsSnapshot(
        "industry",
        published.payload,
        "publish",
      );
      if (
        published.publication_state !== "published"
        || published.workflow_state !== "approved"
        || published.media_version_id !== row.version_id
        || !validation.success
        || validation.data.mediaIds[0] !== row.asset_id
        || (validation.data.content as Record<string, unknown>).heroMediaId !== row.asset_id
      ) {
        throw new Error(`Published industry parity failed for ${item.definition.slug}.`);
      }
      const history = await client.query(
        `SELECT count(DISTINCT r.id)::int revision_count,
                count(DISTINCT r.id) FILTER (WHERE r.revision_number=1)::int original_revision_count
           FROM cms_documents d
           JOIN cms_market_editions e ON e.document_id=d.id AND e.market='uae'
           JOIN cms_revisions r ON r.edition_id=e.id
          WHERE d.kind='industry' AND d.canonical_slug=$1`,
        [item.definition.slug],
      );
      const preserved = history.rows[0] as Record<string, unknown>;
      if (
        Number(preserved.revision_count) < 2
        || Number(preserved.original_revision_count) !== 1
      ) {
        throw new Error(`Original revision preservation failed for ${item.definition.slug}.`);
      }
      associated++;
    }
    if (!requestedSlug) {
      const publishedIndustries = await client.query(
        `SELECT count(*)::int count
           FROM cms_market_editions e
           JOIN cms_documents d ON d.id=e.document_id
          WHERE d.kind='industry' AND e.publication_state='published'`,
      );
      const additionalPages = await client.query(
        `SELECT count(*)::int count
           FROM cms_documents
          WHERE kind='industry' AND canonical_slug IN ('defense','retail-cpg')`,
      );
      const additionalPublications = await client.query(
        `SELECT count(*)::int count
           FROM cms_market_editions e
           JOIN cms_documents d ON d.id=e.document_id
          WHERE d.kind='industry'
            AND d.canonical_slug IN ('manufacturing','defense','retail-cpg')
            AND e.publication_state='published'`,
      );
      if (
        Number(publishedIndustries.rows[0].count) !== 6
        || Number(additionalPages.rows[0].count) !== 0
        || Number(additionalPublications.rows[0].count) !== 0
      ) {
        throw new Error("Only the six existing public industries may be published by this cutover.");
      }
    }
    if (supporting !== 0) throw new Error("Rejected Education supporting imagery must not be published.");
    const expectedAssociated = requestedSlug ? 1 : 6;
    if (associated !== expectedAssociated) throw new Error("Scoped industry publication count is incomplete.");
    console.log(`Verified ${requestedSlug === "education" ? "Education hero" : "Pulse industry"} cutover: approvedMedia=${plan.length} publishedIndustries=${associated} supportingMedia=${supporting} unassociatedMedia=${unassociated}.`);
  } finally {
    ownedClient?.release();
  }
}

async function main() {
  const plan = await loadPlan();
  if (!shouldApply && !shouldVerify) {
    console.log(JSON.stringify({
      approvedMedia: plan.map((item) => item.definition.publicPath),
      publishedIndustries: plan.flatMap((item) => item.definition.slug ? [item.definition.slug] : []),
      unassociatedMedia: plan.flatMap((item) => item.definition.slug ? [] : [item.definition.sector]),
    }, null, 2));
    console.error("Dry run: pass --apply-db or --verify-db with --target=development.");
    return;
  }
  assertDevelopmentTarget();
  try {
    if (shouldApply) await applyCutover(plan);
    await verifyCutover(plan);
  } finally {
    const { pool } = await import("@workspace/db");
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});