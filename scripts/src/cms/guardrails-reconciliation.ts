import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { pool } from "@workspace/db";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { repositoryRoot } from "./common.js";
import { guardrailsFixture } from "./guardrails-fixture.js";
import {
  GUARDRAILS_HERO,
  redesignedGuardrailsSnapshot,
} from "./guardrails-redesign.js";
import { objectStorageClient } from "./object-storage.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const verify = args.includes("--verify-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);

/** Original reviewed-copy receipt. It remains the immutable fixture baseline. */
export const GUARDRAILS_STAGE_RECEIPT = "cms.guardrails.page.stage-v1";
export const GUARDRAILS_STAGE_OPERATION = "cms.framework.guardrails-page-staged";
export const GUARDRAILS_REDESIGN_MEDIA_RECEIPT = "cms.guardrails.redesign-v1:media";
export const GUARDRAILS_REDESIGN_MEDIA_OPERATION = "cms.framework.guardrails-redesign-hero-staged";
export const GUARDRAILS_REDESIGN_RECEIPT = "cms.guardrails.redesign-v1";
export const GUARDRAILS_REDESIGN_OPERATION = "cms.framework.guardrails-redesign-staged";

const STAGING_AUTHOR_EMAIL = "cms-guardrails-framework@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Guardrails Framework draft reconciliation";
const SOURCE_STAGING_REASON =
  "Guardrails reviewed-source baseline. Review gates remain outstanding; no publication or preview authority was created.";
const REDESIGN_STAGING_REASON =
  "Guardrails redesign draft staged from the exact reviewed-source baseline. Hero media is private and pending review; no publication, approval, status, or availability pointer was changed.";

type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: Record<string, any>[] }>;
};

const canonical = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
};
const digest = (value: unknown) => createHash("sha256").update(canonical(value)).digest("hex");
const sourceSnapshot = {
  slug: guardrailsFixture.slug,
  title: guardrailsFixture.title,
  summary: guardrailsFixture.summary,
  content: guardrailsFixture.content,
  seo: guardrailsFixture.seo,
  mediaIds: guardrailsFixture.mediaIds,
  markets: guardrailsFixture.markets,
};
const sourceDigest = digest(sourceSnapshot);
const heroRequest = {
  ...GUARDRAILS_HERO,
  collection: "website",
  status: "pending-review",
  rightsStatus: "needs-review",
  accessibilityStatus: "needs-review",
} as const;
const heroRequestDigest = digest(heroRequest);

export function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Guardrails redesign staging is disabled in production.");
  }
  if (target !== "development") throw new Error("Database work requires --target=development.");
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  if (!environment.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !environment.PRIVATE_OBJECT_DIR) {
    throw new Error("Development Object Storage is required for Guardrails hero staging.");
  }
}

async function reconcileHeroObject(allowCreate: boolean) {
  const bytes = await readFile(`${repositoryRoot}/${GUARDRAILS_HERO.sourceFile}`);
  const checksum = createHash("sha256").update(bytes).digest("hex");
  if (checksum !== GUARDRAILS_HERO.checksum || bytes.length !== GUARDRAILS_HERO.byteSize) {
    throw new Error("Guardrails hero source differs from its confirmed immutable identity.");
  }
  const bucket = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!);
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const storageKey = `${prefix}/cms-media/guardrails-boundaries-hero-${checksum}`;
  const object = bucket.file(storageKey);
  const [exists] = await object.exists();
  if (!exists) {
    if (!allowCreate) throw new Error("The private Guardrails hero object is missing.");
    await object.save(bytes, {
      resumable: false,
      contentType: GUARDRAILS_HERO.mimeType,
      metadata: {
        cacheControl: "private, max-age=31536000, immutable",
        metadata: { checksum, source: GUARDRAILS_REDESIGN_MEDIA_RECEIPT },
      },
    });
  }
  const [metadata] = await object.getMetadata();
  const [stored] = await object.download();
  const storedChecksum = createHash("sha256").update(stored).digest("hex");
  if (
    Number(metadata.size) !== GUARDRAILS_HERO.byteSize
    || metadata.contentType !== GUARDRAILS_HERO.mimeType
    || stored.length !== GUARDRAILS_HERO.byteSize
    || storedChecksum !== GUARDRAILS_HERO.checksum
  ) {
    throw new Error("Private Guardrails hero object metadata or bytes conflict.");
  }
  return storageKey;
}

async function actor(client: SqlClient, allowCreate: boolean) {
  const current = await client.query(
    "SELECT id::text,email FROM cms_users WHERE email=$1 FOR UPDATE",
    [STAGING_AUTHOR_EMAIL],
  );
  if (current.rowCount === 1) return current.rows[0] as { id: string; email: string };
  if (!allowCreate) throw new Error("The controlled Guardrails staging editor is missing.");
  const inserted = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
     VALUES ($1,$2,'editor','active',now()) RETURNING id::text,email`,
    [STAGING_AUTHOR_EMAIL, STAGING_AUTHOR_LABEL],
  );
  if (inserted.rowCount !== 1) throw new Error("Could not provision the controlled Guardrails staging editor.");
  return inserted.rows[0] as { id: string; email: string };
}

async function stageSourceBaseline(client: SqlClient, author: { id: string; email: string }, allowCreate: boolean) {
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE`,
    [GUARDRAILS_STAGE_RECEIPT],
  );
  if (receipt.rowCount) {
    if (
      receipt.rowCount !== 1
      || receipt.rows[0].operation !== GUARDRAILS_STAGE_OPERATION
      || receipt.rows[0].request_digest !== sourceDigest
      || receipt.rows[0].result_digest !== sourceDigest
    ) throw new Error("The Guardrails reviewed-source receipt conflicts with the retained fixture.");
    const revision = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.payload,r.content_digest,r.workflow_state,
              d.id::text document_id,d.kind,d.canonical_slug,d.status document_status,
              e.market,e.locale,e.localized_slug,e.publication_state
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
         JOIN cms_documents d ON d.id=e.document_id
        WHERE r.id=$1`,
      [receipt.rows[0].subject_id],
    );
    const row = revision.rows[0];
    if (
      revision.rowCount !== 1
      || row.kind !== "framework"
      || row.canonical_slug !== guardrailsFixture.slug
      || row.document_status !== "active"
      || row.market !== "uae" || row.locale !== "en"
       || row.localized_slug !== guardrailsFixture.slug
      || row.workflow_state !== "draft"
      || row.content_digest !== sourceDigest
      || canonical(row.payload) !== canonical(sourceSnapshot)
    ) throw new Error("The Guardrails reviewed-source receipt no longer identifies its exact hidden baseline.");
    return row;
  }
  if (!allowCreate) throw new Error("The Guardrails reviewed-source receipt is absent.");

  const existing = await client.query(
    "SELECT id::text,kind,status FROM cms_documents WHERE canonical_slug=$1 FOR UPDATE",
    [guardrailsFixture.slug],
  );
  let documentId: string;
  if (!existing.rowCount) {
    const inserted = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,status)
       VALUES ('framework',$1,$2,'active') RETURNING id::text`,
      [guardrailsFixture.slug, guardrailsFixture.title],
    );
    documentId = inserted.rows[0].id;
  } else {
    if (existing.rowCount !== 1 || existing.rows[0].kind !== "framework" || existing.rows[0].status !== "active") {
      throw new Error("The Guardrails slug is owned by a different or inactive document.");
    }
    documentId = existing.rows[0].id;
  }
  const edition = await client.query(
    `SELECT id::text,publication_state FROM cms_market_editions
      WHERE document_id=$1 AND market='uae' AND locale='en' FOR UPDATE`,
    [documentId],
  );
  let editionId: string;
  if (!edition.rowCount) {
    const inserted = await client.query(
      `INSERT INTO cms_market_editions(document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete)
       VALUES ($1,'uae','en',$2,'draft','none',false) RETURNING id::text`,
      [documentId, guardrailsFixture.slug],
    );
    editionId = inserted.rows[0].id;
  } else {
    if (edition.rowCount !== 1 || edition.rows[0].publication_state !== "draft") {
      throw new Error("The Guardrails UAE/English edition is not an unpublished draft.");
    }
    editionId = edition.rows[0].id;
  }
  const revisions = await client.query("SELECT id FROM cms_revisions WHERE edition_id=$1 LIMIT 1", [editionId]);
  if (revisions.rowCount) throw new Error("Guardrails has unreceipted editorial work; refusing to supersede it.");
  const revision = await client.query(
    `INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason)
     SELECT $1,COALESCE(max(revision_number),0)+1,1,$2,$3,'draft',$4,$5
       FROM cms_revisions WHERE edition_id=$1
     RETURNING id::text,edition_id::text,payload,content_digest,workflow_state`,
    [editionId, sourceSnapshot, sourceDigest, author.id, SOURCE_STAGING_REASON],
  );
  if (revision.rowCount !== 1) throw new Error("Could not stage the Guardrails reviewed-source baseline.");
  await client.query(
    `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
    [GUARDRAILS_STAGE_RECEIPT, GUARDRAILS_STAGE_OPERATION, revision.rows[0].id, sourceDigest, sourceDigest, author.id,
      { documentId, editionId, revisionId: revision.rows[0].id, publicationState: "draft" }],
  );
  await client.query(
    `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.draft-staged','document',$3,$4,$5)`,
    [author.id, author.email, documentId, GUARDRAILS_STAGE_RECEIPT, { editionId, revisionId: revision.rows[0].id, publicationState: "draft" }],
  );
  return {
    ...revision.rows[0],
    document_id: documentId,
    kind: "framework",
    canonical_slug: guardrailsFixture.slug,
    document_status: "active",
    market: "uae",
    locale: "en",
    localized_slug: guardrailsFixture.slug,
    publication_state: "draft",
  };
}

async function stageHeroMedia(
  client: SqlClient,
  author: { id: string; email: string },
  storageKey: string,
  allowCreate: boolean,
) {
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE`,
    [GUARDRAILS_REDESIGN_MEDIA_RECEIPT],
  );
  let asset;
  let version;
  if (receipt.rowCount) {
    if (
      receipt.rowCount !== 1
      || receipt.rows[0].operation !== GUARDRAILS_REDESIGN_MEDIA_OPERATION
      || receipt.rows[0].request_digest !== heroRequestDigest
    ) throw new Error("The Guardrails hero receipt conflicts with its governed source.");
    asset = await client.query(
      `SELECT id::text,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,credit,collection,status
         FROM cms_media_assets WHERE id=$1`,
      [receipt.rows[0].subject_id],
    );
    version = await client.query(
      `SELECT id::text,asset_id::text,version_number,storage_key,checksum,byte_size,width,height,metadata
         FROM cms_media_versions WHERE asset_id=$1 AND version_number=1`,
      [receipt.rows[0].subject_id],
    );
  } else {
    if (!allowCreate) throw new Error("The Guardrails hero receipt is absent.");
    const collision = await client.query("SELECT id::text FROM cms_media_assets WHERE storage_key=$1", [storageKey]);
    if (collision.rowCount) throw new Error("Refusing to adopt an unrelated media row at the Guardrails hero key.");
    asset = await client.query(
      `INSERT INTO cms_media_assets
        (storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,credit,collection,status,uploaded_by_user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,NULL,'website','pending-review',$8)
       RETURNING id::text,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,credit,collection,status`,
      [storageKey, GUARDRAILS_HERO.filename, GUARDRAILS_HERO.filename, GUARDRAILS_HERO.mimeType,
        GUARDRAILS_HERO.byteSize, GUARDRAILS_HERO.checksum, GUARDRAILS_HERO.altText, author.id],
    );
    version = await client.query(
      `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,1,$2,$3,$4,$5,$6,$7)
       RETURNING id::text,asset_id::text,version_number,storage_key,checksum,byte_size,width,height,metadata`,
      [asset.rows[0].id, storageKey, GUARDRAILS_HERO.checksum, GUARDRAILS_HERO.byteSize,
        GUARDRAILS_HERO.width, GUARDRAILS_HERO.height, {
          sourceFile: GUARDRAILS_HERO.sourceFile,
          sourceType: "user-confirmed-generated-image",
          intendedRoute: GUARDRAILS_HERO.intendedRoute,
          altText: GUARDRAILS_HERO.altText,
          rightsStatus: "needs-review",
          accessibilityStatus: "needs-review",
          sourceReview: "pending",
        }],
    );
    const resultDigest = digest({ assetId: asset.rows[0].id, versionId: version.rows[0].id, checksum: GUARDRAILS_HERO.checksum });
    await client.query(
      `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
       VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
      [GUARDRAILS_REDESIGN_MEDIA_RECEIPT, GUARDRAILS_REDESIGN_MEDIA_OPERATION, asset.rows[0].id, heroRequestDigest, resultDigest, author.id,
        { mediaVersionId: version.rows[0].id, status: "pending-review", private: true }],
    );
    await client.query(
      `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
       VALUES ($1,$2,'media.draft-staged','media',$3,$4,$5)`,
      [author.id, author.email, asset.rows[0].id, GUARDRAILS_REDESIGN_MEDIA_RECEIPT,
        { mediaVersionId: version.rows[0].id, status: "pending-review", rightsStatus: "needs-review", accessibilityStatus: "needs-review" }],
    );
  }
  const media = asset.rows[0];
  const immutable = version.rows[0];
  const expectedResult = digest({ assetId: media?.id, versionId: immutable?.id, checksum: GUARDRAILS_HERO.checksum });
  if (
    asset.rowCount !== 1 || version.rowCount !== 1
    || receipt.rowCount && receipt.rows[0].result_digest !== expectedResult
    || media.storage_key !== storageKey
    || media.filename !== GUARDRAILS_HERO.filename
    || media.original_filename !== GUARDRAILS_HERO.filename
    || media.media_type !== GUARDRAILS_HERO.mimeType
    || Number(media.byte_size) !== GUARDRAILS_HERO.byteSize
    || media.checksum !== GUARDRAILS_HERO.checksum
    || media.alt_text !== GUARDRAILS_HERO.altText
    || media.credit !== null
     || media.collection !== "website"
     || !["pending-review", "active", "ready"].includes(media.status)
    || immutable.asset_id !== media.id
    || Number(immutable.version_number) !== 1
    || immutable.storage_key !== storageKey
    || immutable.checksum !== GUARDRAILS_HERO.checksum
    || Number(immutable.byte_size) !== GUARDRAILS_HERO.byteSize
    || Number(immutable.width) !== GUARDRAILS_HERO.width
    || Number(immutable.height) !== GUARDRAILS_HERO.height
     || !["needs-review", "approved-use"].includes(immutable.metadata?.rightsStatus)
     || !["needs-review", "approved"].includes(immutable.metadata?.accessibilityStatus)
  ) throw new Error("The Guardrails private hero media authority has drifted.");
  return { mediaId: media.id as string, mediaVersionId: immutable.id as string };
}

export function guardrailsRedesignRequestDigest(
  baseline: Record<string, any>,
  hero: { mediaId: string; mediaVersionId: string },
) {
  const snapshot = redesignedGuardrailsSnapshot(hero);
  return digest({
    baselineRevisionId: baseline.id,
    baselineDigest: sourceDigest,
    hero,
    snapshot,
  });
}

export function guardrailsRedesignSnapshotDigest(hero: { mediaId: string; mediaVersionId: string }) {
  return digest(redesignedGuardrailsSnapshot(hero));
}

export function guardrailsRedesignResultDigest(
  revisionId: string,
  hero: { mediaId: string; mediaVersionId: string },
) {
  return digest({ revisionId, snapshotDigest: guardrailsRedesignSnapshotDigest(hero) });
}

export async function stageRedesign(
  client: SqlClient,
  author: { id: string; email: string },
  baseline: Record<string, any>,
  hero: { mediaId: string; mediaVersionId: string },
  allowCreate: boolean,
) {
  const snapshot = redesignedGuardrailsSnapshot(hero);
  const validation = validateCmsSnapshot("framework", snapshot, "draft");
  if (!validation.success) throw new Error(`Guardrails redesign violates the CMS contract: ${validation.errors.join("; ")}`);
  const requestDigest = guardrailsRedesignRequestDigest(baseline, hero);
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE`,
    [GUARDRAILS_REDESIGN_RECEIPT],
  );
  if (receipt.rowCount) {
    if (
      receipt.rowCount !== 1
      || receipt.rows[0].operation !== GUARDRAILS_REDESIGN_OPERATION
      || receipt.rows[0].request_digest !== requestDigest
    ) throw new Error("The Guardrails redesign receipt conflicts with the exact baseline or hero identity.");
    const revision = await client.query(
      `SELECT id::text,edition_id::text,payload,content_digest,workflow_state
         FROM cms_revisions WHERE id=$1`,
      [receipt.rows[0].subject_id],
    );
    const pins = await client.query(
      `SELECT asset_id::text,media_version_id::text FROM cms_media_references
        WHERE document_id=$1 AND field_path=$2`,
      [baseline.document_id, `revision:${receipt.rows[0].subject_id}`],
    );
    const latest = await client.query(
      `SELECT id::text FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1`,
      [baseline.edition_id],
    );
    if (
      revision.rowCount !== 1
      || revision.rows[0].edition_id !== baseline.edition_id
       || revision.rows[0].content_digest !== guardrailsRedesignSnapshotDigest(hero)
      || canonical(revision.rows[0].payload) !== canonical(snapshot)
       || receipt.rows[0].result_digest !== guardrailsRedesignResultDigest(revision.rows[0].id, hero)
      || pins.rowCount !== 1
      || pins.rows[0].asset_id !== hero.mediaId
       || pins.rows[0].media_version_id !== hero.mediaVersionId
       || latest.rowCount !== 1
    ) throw new Error("The Guardrails redesign receipt no longer identifies its exact immutable draft.");
    // Editors may create a legitimate successor, and a publisher may advance
    // the receipted revision. Both are lifecycle progress, not a reason for a
    // post-merge hook to overwrite, recreate, or reject the exact receipt.
    if (latest.rows[0].id !== revision.rows[0].id) {
      return { revisionId: revision.rows[0].id, outcome: "preserved" as const };
    }
    return { revisionId: revision.rows[0].id, outcome: "replayed" as const };
  }
  if (!allowCreate) throw new Error("The Guardrails redesign receipt is absent.");
  // Locking the edition above and reading this latest revision in a separate
  // statement prevents a stale READ COMMITTED snapshot from overwriting an
  // editor save that completed while this reconciliation waited.
  const current = await client.query(
    `SELECT id::text,revision_number,payload,content_digest,workflow_state
       FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1`,
    [baseline.edition_id],
  );
  if (
    current.rowCount !== 1
    || current.rows[0].id !== baseline.id
    || current.rows[0].content_digest !== sourceDigest
    || canonical(current.rows[0].payload) !== canonical(sourceSnapshot)
  ) {
    // An editor changed the baseline before the redesign was ever receipted.
    // This hook owns no replacement for that newer work, so preserve it.
    return { revisionId: String(current.rows[0]?.id ?? baseline.id), outcome: "preserved" as const };
  }
  const revision = await client.query(
    `INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason)
     SELECT $1,COALESCE(max(revision_number),0)+1,1,$2,$3,'draft',$4,$5
       FROM cms_revisions WHERE edition_id=$1
     RETURNING id::text`,
    [baseline.edition_id, snapshot, guardrailsRedesignSnapshotDigest(hero), author.id, REDESIGN_STAGING_REASON],
  );
  if (revision.rowCount !== 1) throw new Error("Could not stage the Guardrails redesign draft.");
  await client.query(
    `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path)
     VALUES ($1,$2,$3,$4)`,
    [hero.mediaId, hero.mediaVersionId, baseline.document_id, `revision:${revision.rows[0].id}`],
  );
  const resultDigest = guardrailsRedesignResultDigest(revision.rows[0].id, hero);
  await client.query(
    `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
    [GUARDRAILS_REDESIGN_RECEIPT, GUARDRAILS_REDESIGN_OPERATION, revision.rows[0].id, requestDigest, resultDigest, author.id,
      { baselineRevisionId: baseline.id, revisionId: revision.rows[0].id, publicationState: "draft", heroStatus: "pending-review" }],
  );
  await client.query(
    `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.draft-staged','document',$3,$4,$5)`,
    [author.id, author.email, baseline.document_id, GUARDRAILS_REDESIGN_RECEIPT,
      { baselineRevisionId: baseline.id, revisionId: revision.rows[0].id, heroMediaId: hero.mediaId, heroMediaVersionId: hero.mediaVersionId, publicationState: "draft" }],
  );
  return { revisionId: revision.rows[0].id, outcome: "staged" as const };
}

async function reconcile() {
  if (!apply && !verify) {
    console.log("Guardrails reconciliation is dry-run only. Use --verify-db or --apply-db.");
    return;
  }
  assertDevelopmentTarget();
  const storageKey = await reconcileHeroObject(apply);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [GUARDRAILS_REDESIGN_RECEIPT]);
    const author = await actor(client, apply);
    const baseline = await stageSourceBaseline(client, author, apply);
    // Always acquire the edition lock separately before reading its latest
    // revision. This gives the conflict check a fresh post-wait snapshot.
    await client.query("SELECT id FROM cms_market_editions WHERE id=$1 FOR UPDATE", [baseline.edition_id]);
    const hero = await stageHeroMedia(client, author, storageKey, apply);
    const result = await stageRedesign(client, author, baseline, hero, apply);
    await client.query("COMMIT");
    console.log(`Guardrails redesign ${result.outcome}: revision ${result.revisionId}; development draft only, hero remains private pending review.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

if (/guardrails-reconciliation\.(?:ts|js)$/.test(process.argv[1] ?? "")) {
  void reconcile().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}