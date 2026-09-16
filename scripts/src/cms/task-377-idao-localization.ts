import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import {
  idaoEditorial,
  idaoHeroSeed,
  idaoMediaInventory,
  methodologyCanonicalSeed,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { objectStorageClient } from "./object-storage.js";
import { repositoryRoot } from "./common.js";

export const TASK_377_MARKETS = ["ksa", "turkiye", "europe"] as const;
type Market = (typeof TASK_377_MARKETS)[number];
type ReleaseMarket = "uae" | Market;
const stages = ["innovate", "demonstrate", "activate", "operate"] as const;
const root = "artifacts/cognirise-website/public/images/cognirise/idao";
const reason = "Task 377 approved market IDAO/homepage media localization; staged draft for normal editorial review and publication.";
const serviceEmail = "cms-task-377@service.invalid";
const governanceDate = "2026-09-16";
const governanceSource = {
  label: "Cognirise IDAO methodology canon",
  accessedAt: governanceDate,
};
const explicitUserAuthorization = "I approve them. publish them directly and mark them as approved and published in the cms.";
const authorizationReceiptKey = "cms-task-377:user-authorization:2026-09-16:v2";
const publish = process.argv.includes("--publish");

export type Task377Media = { market: Market; stage: (typeof stages)[number]; sourcePath: string; checksum: string; bytes: number; mime: string; altText: string; width: number; height: number };
type AuthorizationMedia = Pick<Task377Media, "market" | "stage" | "checksum">;
type AuthorizationTarget = { market: string; kind: string; slug: string; revisionId: string; contentDigest: string };
export function task377MediaPaths() {
  return TASK_377_MARKETS.flatMap((market) => stages.map((stage) => ({
    market, stage, sourcePath: `${root}/${market}/${stage}.jpg`,
  })));
}
function digest(value: unknown) { return createHash("sha256").update(JSON.stringify(value)).digest("hex"); }
export function task377AuthorizationRequestDigest(mediaSources: AuthorizationMedia[], targets: AuthorizationTarget[]) {
  return digest({
    task: 377,
    explicitUserAuthorization,
    media: [...mediaSources].sort((left, right) => `${left.market}:${left.stage}`.localeCompare(`${right.market}:${right.stage}`)),
    targets: [...targets].sort((left, right) => `${left.market}:${left.kind}:${left.slug}`.localeCompare(`${right.market}:${right.kind}:${right.slug}`)),
  });
}
function mime(file: string) { return file.endsWith(".jpg") ? "image/jpeg" : "image/webp"; }
const sceneAlt: Record<(typeof stages)[number], string> = {
  innovate: "A diverse client and advisory team maps a priority opportunity together around a workshop table, with notes and evidence in view.",
  demonstrate: "Client leaders test a working prototype together on a large tablet while an advisor observes the decision-ready journey.",
  activate: "A forward-deployed engineer and client product owner review governed agent workflows and explicit human approval gates for a live MVP.",
  operate: "Client leaders transfer ownership as connected teams coordinate work across an operations hub, with the capability ready to run.",
};
function alt(stage: (typeof stages)[number], market: string) {
  const marketName = market === "uae" ? "UAE" : market === "ksa" ? "Saudi Arabia" : market === "turkiye" ? "Türkiye" : "Europe";
  return `${sceneAlt[stage]} Approved ${marketName} market edition.`;
}
function jpegDimensions(bytes: Buffer) {
  let offset = 2;
  while (offset + 9 < bytes.length) {
    if (bytes[offset] !== 0xff) { offset++; continue; }
    const marker = bytes[offset + 1]; const length = bytes.readUInt16BE(offset + 2);
    if (marker >= 0xc0 && marker <= 0xc3) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
    offset += 2 + length;
  }
  throw new Error("JPEG dimensions could not be read.");
}
export async function inspectTask377Media(): Promise<Task377Media[]> {
  const output: Task377Media[] = [];
  for (const item of task377MediaPaths()) {
    const absolute = path.join(repositoryRoot, item.sourcePath);
    const bytes = await readFile(absolute);
    const metadata = await stat(absolute);
    const dimensions = jpegDimensions(bytes);
    if (dimensions.width !== 1024 || dimensions.height !== 1024) throw new Error(`${item.sourcePath}: expected 1024x1024, got ${dimensions.width}x${dimensions.height}.`);
    output.push({ ...item, checksum: createHash("sha256").update(bytes).digest("hex"), bytes: metadata.size, mime: mime(item.sourcePath), altText: alt(item.stage, item.market), ...dimensions });
  }
  return output;
}

type Client = { query(sql: string, values?: unknown[]): Promise<{ rowCount: number | null; rows: Record<string, any>[] }> };
type Pin = { mediaId: string; mediaVersionId: string; role: "hero" | "supporting" };
function productionGuard() {
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") throw new Error("Task 377 is disabled in production.");
  if (process.env.NODE_ENV !== "development" || !process.env.DATABASE_URL || !process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID || !process.env.PRIVATE_OBJECT_DIR) {
    throw new Error("Task 377 apply requires development DATABASE_URL and Object Storage configuration.");
  }
}
async function media(client: Client, source: Task377Media): Promise<Pin> {
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const key = `${prefix}/cms-media/task-377/${source.market}/${source.stage}-${source.checksum}.jpg`;
  let asset = await client.query("SELECT id::text,checksum,byte_size,media_type FROM cms_media_assets WHERE checksum=$1", [source.checksum]);
  if ((asset.rowCount ?? 0) > 1) throw new Error(`${source.sourcePath}: ambiguous asset checksum.`);
  if (!asset.rowCount) asset = await client.query(
    `INSERT INTO cms_media_assets(storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,credit,collection,status)
     VALUES($1,$2,$2,$3,$4,$5,$6,'Approved Task 377 candidate','website','pending-review') RETURNING id::text,checksum,byte_size,media_type`,
    [key, `${source.market}-${source.stage}.jpg`, source.mime, source.bytes, source.checksum, source.altText],
  );
  const a = asset.rows[0];
  if (!a || a.checksum !== source.checksum || Number(a.byte_size) !== source.bytes || a.media_type !== source.mime) throw new Error(`${source.sourcePath}: asset conflict.`);
  let version = await client.query("SELECT id::text FROM cms_media_versions WHERE asset_id=$1 AND checksum=$2 AND storage_key=$3", [a.id, source.checksum, key]);
  if (!version.rowCount) version = await client.query(
    `INSERT INTO cms_media_versions(asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
     SELECT $1,COALESCE(MAX(version_number),0)+1,$2,$3,$4,$5,$6,$7 FROM cms_media_versions WHERE asset_id=$1 RETURNING id::text`,
     [a.id, key, source.checksum, source.bytes, source.width, source.height, { task: 377, sourcePath: source.sourcePath, altText: source.altText, approval: "user-approved-candidate-1", reviewStatus: "needs-review" }],
  );
  if (version.rowCount !== 1) throw new Error(`${source.sourcePath}: immutable version unavailable.`);
  return { mediaId: String(a.id), mediaVersionId: String(version.rows[0].id), role: source.stage === "demonstrate" ? "hero" : "supporting" };
}
async function provisionObject(source: Task377Media) {
  const prefix = process.env.PRIVATE_OBJECT_DIR!.replace(/^\/+|\/+$/g, "");
  const key = `${prefix}/cms-media/task-377/${source.market}/${source.stage}-${source.checksum}.jpg`;
  const bytes = await readFile(path.join(repositoryRoot, source.sourcePath));
  const object = objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID!).file(key);
  const [exists] = await object.exists();
  if (!exists) await object.save(bytes, { resumable: false, contentType: source.mime, metadata: { cacheControl: "private, max-age=31536000, immutable", metadata: { checksum: source.checksum, task: "377" } } });
  const [[metadata], [stored]] = await Promise.all([object.getMetadata(), object.download()]);
  if (Number(metadata.size) !== source.bytes || metadata.contentType !== source.mime || metadata.metadata?.checksum !== source.checksum || createHash("sha256").update(stored).digest("hex") !== source.checksum) throw new Error(`${source.sourcePath}: App Storage verification failed.`);
}
async function provisionObjects(sources: Task377Media[]) {
  const queue = [...sources]; const workers = Array.from({ length: 3 }, async () => {
    while (queue.length) { const source = queue.shift(); if (source) await provisionObject(source); }
  });
  await Promise.all(workers);
}
function replace(value: unknown, source: string, pin: Pin, altText: string): unknown {
  if (Array.isArray(value)) return value.map((item) => replace(item, source, pin, altText));
  if (!value || typeof value !== "object") return value;
  const object = value as Record<string, unknown>;
  const copy = Object.fromEntries(Object.entries(object).map(([key, item]) => [key, replace(item, source, pin, altText)]));
  if (copy.src === source) { copy.altText = altText; copy.media = pin; }
  return copy;
}
function payloadPins(value: unknown): Set<string> {
  const pins = new Set<string>();
  const walk = (item: unknown) => {
    if (Array.isArray(item)) return item.forEach(walk);
    if (!item || typeof item !== "object") return;
    const object = item as Record<string, unknown>;
    if (typeof object.mediaId === "string" && typeof object.mediaVersionId === "string") {
      pins.add(`${object.mediaId}:${object.mediaVersionId}`);
    }
    if (object.media && typeof object.media === "object") {
      const media = object.media as Record<string, unknown>;
      if (typeof media.mediaId === "string" && typeof media.mediaVersionId === "string") pins.add(`${media.mediaId}:${media.mediaVersionId}`);
    }
    walk(object.content); walk(object.hero); walk(object.editorial); walk(object.sections);
    Object.values(object).forEach((child) => { if (child && typeof child === "object") walk(child); });
  };
  walk(value);
  return pins;
}
function withGovernance(value: Record<string, unknown>) {
  value.visibility = "public";
  value.sources = [governanceSource];
  value.verificationDate = governanceDate;
  value.reviewDate = governanceDate;
  value.relatedIds = Array.isArray(value.relatedIds) ? value.relatedIds : [];
  return value;
}
function hydrateMedia(value: unknown, pins: Map<string, Pin>): unknown {
  if (Array.isArray(value)) return value.map((item) => hydrateMedia(item, pins));
  if (!value || typeof value !== "object") return value;
  const object = Object.fromEntries(Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => [key, hydrateMedia(item, pins)]));
  if (typeof object.src === "string") {
    const pin = pins.get(object.src);
    if (pin) return { ...object, media: pin };
  }
  return object;
}
async function refs(client: Client, documentId: string, revisionId: string) {
  const result = await client.query("SELECT asset_id::text,media_version_id::text FROM cms_media_references WHERE document_id=$1 AND field_path=$2", [documentId, `revision:${revisionId}`]);
  return result.rows;
}
async function syncRevisionRefs(client: Client, documentId: string, revisionId: string, payload: unknown) {
  const expected = payloadPins(payload);
  const current = await refs(client, documentId, revisionId);
  for (const reference of current) {
    const identity = `${reference.asset_id}:${reference.media_version_id}`;
    if (!expected.has(identity)) {
      throw new Error(`Revision ${revisionId} has an unexpected immutable media reference; append a successor instead of rewriting its evidence.`);
    }
  }
  for (const identity of expected) {
    const [mediaId, mediaVersionId] = identity.split(":");
    await client.query(
      "INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES($1,$2,$3,$4) ON CONFLICT DO NOTHING",
      [mediaId, mediaVersionId, documentId, `revision:${revisionId}`],
    );
  }
}
async function stageEdition(client: Client, market: ReleaseMarket, kind: "framework" | "landing-page", slug: string, sources: Task377Media[], pins: Map<string, Pin>) {
  const document = await client.query("SELECT id::text FROM cms_documents WHERE kind=$1 AND canonical_slug=$2 FOR UPDATE", [kind, slug]);
  if (document.rowCount !== 1) throw new Error(`Task 377 requires exactly one ${kind}/${slug} document.`);
  const source = await client.query(
    `SELECT e.id::text edition_id,
            COALESCE(published.id,latest.id)::text revision_id,
            COALESCE(published.payload,latest.payload) payload,
            COALESCE(published.content_digest,latest.content_digest) content_digest
       FROM cms_market_editions e
       LEFT JOIN cms_revisions published ON published.id=e.published_revision_id
       LEFT JOIN LATERAL (
         SELECT id,payload,content_digest,workflow_state
           FROM cms_revisions
          WHERE edition_id=e.id
          ORDER BY revision_number DESC,created_at DESC,id DESC
          LIMIT 1
       ) latest ON true
      WHERE e.document_id=$1 AND e.market='uae' AND e.locale='en'
        AND (
          (e.publication_state='published' AND e.published_revision_id IS NOT NULL
            AND published.workflow_state='approved')
          OR
          (e.publication_state='draft' AND e.published_revision_id IS NULL
            AND latest.workflow_state='draft')
        )`,
    [document.rows[0].id],
  );
  if (source.rowCount !== 1) {
    throw new Error(`${kind}/${slug}: approved UAE publication or exact unpublished latest draft is required.`);
  }
  const existing = await client.query("SELECT id::text,publication_state,published_revision_id::text FROM cms_market_editions WHERE document_id=$1 AND market=$2 AND locale='en' FOR UPDATE", [document.rows[0].id, market]);
  if ((existing.rowCount ?? 0) > 1) throw new Error(`${kind}/${slug}/${market}: duplicate edition.`);
  let editionId = existing.rows[0]?.id as string | undefined;
  if (!editionId) {
    const created = await client.query(
      `INSERT INTO cms_market_editions(document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete,content_mode,editorial_market)
       VALUES($1,$2,'en',$3,'draft','none',false,'custom',$2) RETURNING id::text`,
      [document.rows[0].id, market, slug],
    );
    editionId = String(created.rows[0].id);
  } else if (!["draft", "published"].includes(String(existing.rows[0].publication_state))) {
    throw new Error(`${kind}/${slug}/${market}: unsupported edition state; preserving it.`);
  }
  const latest = await client.query("SELECT id::text,revision_number,workflow_state,payload,content_digest FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1 FOR UPDATE", [editionId]);
  if (latest.rows[0] && !["draft", "approved"].includes(String(latest.rows[0].workflow_state))) {
    throw new Error(`${kind}/${slug}/${market}: active review history exists; preserving it.`);
  }
  const sourcePayload = structuredClone(source.rows[0].payload) as Record<string, unknown>;
  if (!sourcePayload.content || typeof sourcePayload.content !== "object") {
    throw new Error(`${kind}/${slug}/${market}: source snapshot has no content object.`);
  }
  const governedContent = sourcePayload.content as Record<string, unknown>;
  // Successors are built from the current API-owned IDAO contract, rather than
  // copying the stale framework editorial shape. Existing immutable pins are
  // retained for canon media; only the four stage occurrences are localized.
  const canonicalPins = new Map<string, Pin>();
  const migrationSourcePaths = Array.isArray((governedContent as { sections?: unknown[] }).sections)
    ? ((governedContent as { sections: Array<Record<string, unknown>> }).sections)
      .filter((section) => section.type === "migration-media" && typeof section.sourcePath === "string")
      .map((section) => String(section.sourcePath))
    : [];
  const canonicalSourcePaths = [...new Set([
    ...idaoMediaInventory.map((item) => item.src),
    ...migrationSourcePaths,
  ])];
  for (const sourcePath of canonicalSourcePaths) {
    const bytes = await readFile(path.join(repositoryRoot, "artifacts/cognirise-website/public", sourcePath));
    const checksum = createHash("sha256").update(bytes).digest("hex");
    const canonical = await client.query(
      `SELECT a.id::text media_id,v.id::text media_version_id
         FROM cms_media_assets a JOIN cms_media_versions v ON v.asset_id=a.id
        WHERE a.checksum=$1 AND v.checksum=$1 AND v.metadata->>'sourcePath'=$2`,
      [checksum, sourcePath],
    );
    if (canonical.rowCount !== 1) {
      throw new Error(`${kind}/${slug}/${market}: canonical source ${sourcePath} does not resolve to one exact immutable checksum.`);
    }
    canonicalPins.set(sourcePath, {
      mediaId: String(canonical.rows[0].media_id),
      mediaVersionId: String(canonical.rows[0].media_version_id),
      role: "supporting",
    });
  }
  if (kind === "framework") {
    governedContent.editorial = hydrateMedia(structuredClone(idaoEditorial.seed), canonicalPins);
    governedContent.canonical = methodologyCanonicalSeed("idao");
    governedContent.hero = hydrateMedia(structuredClone(idaoHeroSeed), canonicalPins);
    if (governedContent.hero && typeof governedContent.hero === "object") {
      const hero = governedContent.hero as Record<string, unknown>;
      hero.media = { ...((hero.media ?? {}) as Record<string, unknown>), ...(pins.get("demonstrate")!), role: "hero", altText: alt("demonstrate", market) };
    }
  }
  withGovernance(governedContent);
  if (kind === "landing-page") {
    governedContent.sources = [{
      label: "Cognirise homepage source authority",
      accessedAt: governanceDate,
    }];
  }
  const sourcePaths = ["/images/cognirise/blueprint-innovate.jpg", "/images/cognirise/blueprint-demonstrate.jpg", "/images/cognirise/blueprint-activate.jpg", "/images/cognirise/blueprint-operate.jpg"];
  for (const [index, oldPath] of sourcePaths.entries()) {
    const stage = stages[index]; const pin = { ...pins.get(stage)!, role: "supporting" as const };
    sourcePayload.content = replace(sourcePayload.content, oldPath, pin, alt(stage, market));
    if (kind === "framework") {
      governedContent.editorial = replace(governedContent.editorial, oldPath, pin, alt(stage, market));
    }
  }
  // Resolve every remaining canonical occurrence without changing its bytes.
  // A migration reference is never silently left unresolved in a successor.
  if (kind === "framework") governedContent.editorial = hydrateMedia(governedContent.editorial, canonicalPins);
  const demonstrate = pins.get("demonstrate");
  if (kind === "framework" && demonstrate && sourcePayload.content && typeof sourcePayload.content === "object") {
    const content = sourcePayload.content as Record<string, unknown>;
    if (content.hero && typeof content.hero === "object") {
      content.hero = { ...(content.hero as Record<string, unknown>), media: { ...demonstrate, role: "hero" } };
    }
  }
  if (kind === "landing-page" && sourcePayload.content && typeof sourcePayload.content === "object") {
    const content = sourcePayload.content as Record<string, any>;
    const sections = (Array.isArray(content.sections) ? content.sections : [])
      .map((section: any) => {
        if (section?.type !== "migration-media" || typeof section.sourcePath !== "string") return section;
        const pin = canonicalPins.get(section.sourcePath);
        if (!pin) return section;
        // Keep the compiled slot identity, order, and approved alt text while
        // replacing only the unresolved migration-media discriminator.
        return {
          type: "media",
          id: section.id,
          order: section.order,
          references: [{ mediaId: pin.mediaId, mediaVersionId: pin.mediaVersionId, role: "supporting", altText: section.altText }],
        };
      })
      .filter((section: any) => !stages.some((stage) => section.id === `home-idao-stage-${stage}`));
    const nextOrder = Math.max(-1, ...sections.map((section: any) => Number(section.order)).filter(Number.isFinite)) + 1;
    for (const [index, stage] of stages.entries()) {
      const pin = pins.get(stage)!;
      sections.push({
        type: "media",
        id: `home-idao-stage-${stage}`,
        order: nextOrder + index,
        references: [{ mediaId: pin.mediaId, mediaVersionId: pin.mediaVersionId, role: "supporting", altText: alt(stage, market) }],
      });
    }
    content.sections = sections;
  }
  const mediaIds = new Set(Array.isArray(sourcePayload.mediaIds) ? sourcePayload.mediaIds.map(String) : []);
  for (const pin of [...pins.values(), ...canonicalPins.values()]) mediaIds.add(pin.mediaId);
  sourcePayload.mediaIds = [...mediaIds]; sourcePayload.markets = [market];
  const validation = validateCmsSnapshot(kind, sourcePayload, "draft");
  if (!validation.success) throw new Error(`${kind}/${market} draft invalid: ${validation.errors.join("; ")}`);
  const publishValidation = validateCmsSnapshot(kind, validation.data, "publish");
  if (!publishValidation.success) throw new Error(`${kind}/${market} publish successor invalid: ${publishValidation.errors.join("; ")}`);
  const contentDigest = digest(validation.data);
  if (latest.rows[0]?.content_digest === contentDigest) {
    if (latest.rows[0].workflow_state === "draft") {
      await syncRevisionRefs(client, String(document.rows[0].id), String(latest.rows[0].id), validation.data);
    }
    return { market, status: "replayed", revisionId: latest.rows[0].id };
  }
  const revision = await client.query(
    `INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,reason,created_by_user_id)
     VALUES($1,$2,1,$3,$4,'draft',$5,(SELECT id FROM cms_users WHERE email=$6)) RETURNING id::text`,
    [editionId, Number(latest.rows[0]?.revision_number ?? 0) + 1, validation.data, contentDigest, reason, serviceEmail],
  );
  if (revision.rowCount !== 1) throw new Error(`${kind}/${market}: draft creation failed.`);
  const revisionId = String(revision.rows[0].id);
  await syncRevisionRefs(client, String(document.rows[0].id), revisionId, validation.data);
  return { market, status: "staged", revisionId };
}
async function preflightAuthorities(client: Client) {
  for (const [kind, slug] of [["framework", "idao"], ["landing-page", "homepage"]] as const) {
    const document = await client.query("SELECT id::text FROM cms_documents WHERE kind=$1 AND canonical_slug=$2 AND status='active'", [kind, slug]);
    if (document.rowCount !== 1) throw new Error(`Task 377 preflight requires exactly one active ${kind}/${slug} document.`);
    const source = await client.query(
      `SELECT e.publication_state,e.published_revision_id::text,r.workflow_state
         FROM cms_market_editions e LEFT JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE e.document_id=$1 AND e.market='uae' AND e.locale='en'`,
      [document.rows[0].id],
    );
    if (source.rowCount !== 1) throw new Error(`Task 377 preflight requires exactly one UAE/en ${kind}/${slug} authority.`);
    const row = source.rows[0];
    if (row.published_revision_id && row.publication_state === "published" && row.workflow_state === "approved") continue;
    const latest = await client.query("SELECT workflow_state FROM cms_revisions WHERE edition_id=(SELECT id FROM cms_market_editions WHERE document_id=$1 AND market='uae' AND locale='en') ORDER BY revision_number DESC LIMIT 1", [document.rows[0].id]);
    if (row.published_revision_id || row.publication_state !== "draft" || latest.rows[0]?.workflow_state !== "draft") {
      throw new Error(`Task 377 preflight requires an approved published UAE/en ${kind}/${slug}, or an exact unpublished latest draft; no mutation attempted.`);
    }
  }
}
async function task377AuthorizationScope(client: Client, mediaSources: Task377Media[]) {
  const targets = await client.query(
    `SELECT e.market,d.kind,d.canonical_slug slug,r.id::text revision_id,r.content_digest
       FROM cms_documents d
       JOIN cms_market_editions e ON e.document_id=d.id
       JOIN LATERAL (
         SELECT id,content_digest
           FROM cms_revisions
          WHERE edition_id=e.id
          ORDER BY revision_number DESC,created_at DESC,id DESC
          LIMIT 1
       ) r ON true
      WHERE d.kind IN ('framework','landing-page')
        AND d.canonical_slug IN ('idao','homepage')
        AND e.market IN ('uae','ksa','turkiye','europe')
        AND e.locale='en'
      ORDER BY array_position(ARRAY['uae','ksa','turkiye','europe'],e.market),
               array_position(ARRAY['framework','landing-page'],d.kind)`,
  );
  if (targets.rowCount !== 8) throw new Error("Task 377 authorization scope requires exactly eight latest release targets.");
  const media = [...mediaSources]
    .sort((left, right) => `${left.market}:${left.stage}`.localeCompare(`${right.market}:${right.stage}`))
    .map(({ market, stage, checksum }) => ({ market, stage, checksum }));
  const releaseTargets = targets.rows.map((row) => ({
    market: String(row.market),
    kind: String(row.kind),
    slug: String(row.slug),
    revisionId: String(row.revision_id),
    contentDigest: String(row.content_digest),
  }));
  return {
    task: 377,
    explicitUserAuthorization,
    media,
    targets: releaseTargets,
  };
}
async function releaseTask377(client: Client) {
  const mediaSources = await inspectTask377Media();
  await client.query("BEGIN");
  try {
    const actor = await client.query("SELECT id::text FROM cms_users WHERE email=$1 AND status='active' AND role IN ('administrator','publisher')", [serviceEmail]);
    if (actor.rowCount !== 1) throw new Error("Task 377 release requires its reconciliation attribution user.");
    const authorizationScope = await task377AuthorizationScope(client, mediaSources);
    const authorizationDigest = task377AuthorizationRequestDigest(authorizationScope.media, authorizationScope.targets);
    const authorization = await client.query(
      `SELECT receipt.subject_id::text,receipt.request_digest
         FROM cms_operation_receipts receipt
         JOIN cms_users authorizer ON authorizer.id=receipt.actor_user_id
        WHERE receipt.idempotency_key=$1
          AND receipt.operation='cms.task-377.user-authorized'
         AND receipt.status_code BETWEEN 200 AND 299
         AND authorizer.status='active' AND authorizer.role='administrator'`,
      [authorizationReceiptKey],
    );
    if (
      authorization.rowCount !== 1
      || String(authorization.rows[0].subject_id) !== String(actor.rows[0].id)
      || String(authorization.rows[0].request_digest) !== authorizationDigest
    ) {
      throw new Error("Task 377 release requires the durable receipt for the user's explicit publication authorization.");
    }
    const assets = await client.query(
      `SELECT a.id::text asset_id,a.checksum,v.id::text version_id,v.checksum version_checksum,v.metadata
         FROM cms_media_assets a JOIN cms_media_versions v ON v.asset_id=a.id
        WHERE v.metadata->>'task'='377' ORDER BY a.id,v.id`,
    );
    const expected = new Set(mediaSources.map((source) => source.checksum));
    if (assets.rowCount !== 12 || assets.rows.some((row) => !expected.has(String(row.checksum)) || row.checksum !== row.version_checksum)) {
      throw new Error("Task 377 release requires exactly the twelve current immutable approved-source checksums; no publication attempted.");
    }
    for (const row of assets.rows) {
      await client.query("UPDATE cms_media_assets SET status='active' WHERE id=$1 AND status<>'active'", [row.asset_id]);
      await client.query(
        `UPDATE cms_media_versions
            SET metadata=COALESCE(metadata,'{}'::jsonb)||$1::jsonb
          WHERE id=$2 AND (
            metadata->>'rightsStatus' IS DISTINCT FROM 'approved-use'
            OR metadata->>'accessibilityStatus' IS DISTINCT FROM 'approved'
          )`,
        [JSON.stringify({ task: 377, rightsStatus: "approved-use", accessibilityStatus: "approved", approvalEvidence: "Explicit user authorization to publish Task 377 candidates." }), row.version_id],
      );
    }
    const canonicalSourcePaths = [...new Set([
      ...idaoMediaInventory.map((item) => item.src),
      "/images/cognirise/pulse-convergence.jpg",
      "/images/cognirise/cognirise-pulse-governance.jpg",
      "/images/cognirise/cognirise-pulse-people.jpg",
      "/images/cognirise/site-cognios.jpg",
    ])];
    for (const sourcePath of canonicalSourcePaths) {
      const bytes = await readFile(path.join(repositoryRoot, "artifacts/cognirise-website/public", sourcePath));
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const canonical = await client.query(
        `SELECT DISTINCT a.id::text asset_id,v.id::text version_id
           FROM cms_media_assets a JOIN cms_media_versions v ON v.asset_id=a.id
          WHERE a.checksum=$1 AND v.checksum=$1 AND v.metadata->>'sourcePath'=$2`,
        [checksum, sourcePath],
      );
      if (!canonical.rowCount) throw new Error(`Task 377 release requires the exact canonical static asset ${sourcePath}.`);
      for (const row of canonical.rows) {
        await client.query("UPDATE cms_media_assets SET status='active' WHERE id=$1 AND status<>'active'", [row.asset_id]);
        await client.query(
          `UPDATE cms_media_versions
              SET metadata=COALESCE(metadata,'{}'::jsonb)||$1::jsonb
            WHERE id=$2 AND (
              metadata->>'rightsStatus' IS DISTINCT FROM 'approved-use'
              OR metadata->>'accessibilityStatus' IS DISTINCT FROM 'approved'
            )`,
          [JSON.stringify({
            rightsStatus: "approved-use",
            accessibilityStatus: "approved",
            approvalEvidence: "Existing canonical website asset included in the explicitly authorized Task 377 homepage and IDAO publication.",
          }), row.version_id],
        );
      }
    }
    const outcomes: unknown[] = [];
    for (const market of ["uae", ...TASK_377_MARKETS] as const) {
      for (const [kind, slug] of [["framework", "idao"], ["landing-page", "homepage"]] as const) {
        const edition = await client.query(
          `SELECT e.id::text edition_id,e.document_id::text document_id,e.published_revision_id::text,
                  r.id::text revision_id,r.payload,r.content_digest,r.workflow_state,r.reason
             FROM cms_market_editions e JOIN cms_documents d ON d.id=e.document_id
             JOIN LATERAL (SELECT * FROM cms_revisions WHERE edition_id=e.id ORDER BY revision_number DESC LIMIT 1) r ON true
            WHERE d.kind=$1 AND d.canonical_slug=$2 AND e.market=$3 AND e.locale='en' FOR UPDATE`,
          [kind, slug, market],
        );
        if (edition.rowCount !== 1) throw new Error(`Task 377 release missing ${market}/${kind}/${slug}.`);
        const row = edition.rows[0];
        const receiptKey = `cms-task-377:publish-successor:${market}:${kind}:${slug}:${row.content_digest}`;
        const receipt = await client.query("SELECT subject_id::text FROM cms_operation_receipts WHERE idempotency_key=$1", [receiptKey]);
        if (receipt.rowCount) {
          if (String(receipt.rows[0].subject_id) !== String(row.revision_id)) {
            throw new Error(`Task 377 receipt does not match the selected ${market}/${kind}/${slug} successor.`);
          }
          outcomes.push({ market, kind, slug, status: "replayed", revisionId: receipt.rows[0].subject_id });
          continue;
        }
        await ensurePublishedAvailability(client, row.document_id, row.edition_id, row.revision_id, actor.rows[0].id);
        const publishValidation = validateCmsSnapshot(kind, row.payload, "publish");
        if (!publishValidation.success) throw new Error(`Task 377 release refused schema-invalid publish successor ${market}/${kind}/${slug}: ${publishValidation.errors.join("; ")}`);
        const preflightDigest = String(row.content_digest);
        if (row.workflow_state !== "draft") throw new Error(`Task 377 release rejected competing/newer ${market}/${kind}/${slug} history.`);
        if (String(row.reason) !== reason) {
          throw new Error(`Task 377 release rejected competing/newer ${market}/${kind}/${slug} history.`);
        }
        if (market === "uae") {
          const validation = validateCmsSnapshot(kind, row.payload, "draft");
          if (!validation.success) throw new Error(`Task 377 UAE ${kind}/${slug} draft is not schema-valid: ${validation.errors.join("; ")}`);
          const references = await client.query(
            `SELECT ref.asset_id::text,ref.media_version_id::text,
                    version.metadata
               FROM cms_media_references ref
               JOIN cms_media_versions version ON version.id=ref.media_version_id
              WHERE ref.document_id=$1 AND ref.field_path=$2`,
            [row.document_id, `revision:${row.revision_id}`],
          );
          const referencePins = new Set(references.rows.map((reference) => `${reference.asset_id}:${reference.media_version_id}`));
          const expectedPins = payloadPins(row.payload);
          if (referencePins.size !== expectedPins.size || [...expectedPins].some((pin) => !referencePins.has(pin))) throw new Error(`Task 377 UAE ${kind}/${slug} immutable references do not exactly match its own payload.`);
          if (references.rows.some((reference) => reference.metadata?.task === 377)) throw new Error(`Task 377 UAE ${kind}/${slug} draft carries localized Task 377 media.`);
        }
        const revision = await client.query(
          `UPDATE cms_revisions SET workflow_state='approved',approved_by_user_id=$2,approved_at=now()
            WHERE id=$1 AND workflow_state='draft' AND content_digest=$3 RETURNING id::text`,
          [row.revision_id, actor.rows[0].id, preflightDigest],
        );
        if (revision.rowCount !== 1) throw new Error(`Task 377 release could not approve ${market}/${kind}/${slug}.`);
        await client.query("UPDATE cms_market_editions SET published_revision_id=$2,published_at=now(),publication_state='published',updated_at=now() WHERE id=$1 AND (published_revision_id IS NULL OR published_revision_id=$3)", [row.edition_id, row.revision_id, row.published_revision_id]);
        const resultDigest = digest({ documentId: row.document_id, editionId: row.edition_id, revisionId: row.revision_id, payloadDigest: row.content_digest, userAuthorization: true });
        await client.query("INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest) VALUES($1,'cms.task-377.published',$2,$3,$4)", [receiptKey, row.revision_id, row.content_digest, resultDigest]);
        await client.query("INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata) VALUES($1,'Task 377 explicit user authorization','document.published','document',$2,$3,$4)", [actor.rows[0].id, row.document_id, receiptKey, { task: 377, explicitUserAuthorization, market, kind, slug, immutableMediaChecksums: mediaSources.map((source) => source.checksum) }]);
        outcomes.push({ market, kind, slug, status: "published", revisionId: row.revision_id });
      }
    }
    await client.query("COMMIT");
    return outcomes;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
}

async function ensurePublishedAvailability(client: Client, documentId: string, editionId: string, revisionId: string, actorId: string) {
  await client.query(
    `INSERT INTO cms_document_availability_states
      (document_id,draft_version,reviewed_version,published_version,published_source_revision_id,published_by_user_id,published_at,updated_by_user_id,updated_at)
     VALUES($1,0,0,1,$2,$3,now(),$3,now())
     ON CONFLICT(document_id) DO UPDATE SET
       published_version=GREATEST(cms_document_availability_states.published_version,1),
       published_source_revision_id=EXCLUDED.published_source_revision_id,
       published_by_user_id=EXCLUDED.published_by_user_id,published_at=now(),updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()`,
    [documentId, revisionId, actorId],
  );
  await client.query(
    `INSERT INTO cms_document_market_availability
      (document_id,market_edition_id,locale,published_decision,draft_decision,published_by_user_id,published_at,updated_by_user_id,updated_at)
     VALUES($1,(SELECT id FROM market_editions WHERE code=(SELECT market FROM cms_market_editions WHERE id=$2)),'en','show',NULL,$3,now(),$3,now())
     ON CONFLICT(document_id,market_edition_id,locale) DO UPDATE SET
       published_decision='show',draft_decision=NULL,published_by_user_id=EXCLUDED.published_by_user_id,published_at=now(),updated_by_user_id=EXCLUDED.updated_by_user_id,updated_at=now()`,
    [documentId, editionId, actorId],
  );
}

async function run() {
  const mediaSources = await inspectTask377Media();
  const args = process.argv.slice(2);
  if (!args.includes("--apply-db") && !publish) {
    console.log(JSON.stringify({ task: 377, dryRun: true, markets: TASK_377_MARKETS, media: mediaSources, publication: "not attempted" }, null, 2));
    return;
  }
  if (!args.includes("--target=development")) throw new Error("Pass --target=development explicitly.");
  productionGuard();
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    if (publish) {
      const outcomes = await releaseTask377(client);
      console.log(JSON.stringify({ task: 377, mode: "publish", outcomes, publication: "authorized Task 377 revisions only" }, null, 2));
      return;
    }
    if (args.includes("--authorization-scope")) {
      const scope = await task377AuthorizationScope(client, mediaSources);
      console.log(JSON.stringify({ authorizationReceiptKey, authorizationDigest: task377AuthorizationRequestDigest(scope.media, scope.targets), scope }, null, 2));
      return;
    }
    await preflightAuthorities(client);
    const pinsByMarket = new Map<ReleaseMarket, Map<string, Pin>>();
    await client.query("BEGIN");
    transactionOpen = true;
    await client.query("SELECT pg_advisory_xact_lock(hashtext('cms:task-377:idao-localization'))");
    await client.query(
      `INSERT INTO cms_users(email,display_name,role,status)
       VALUES($1,'Task 377 explicitly authorized release','publisher','active')
       ON CONFLICT(email) DO UPDATE SET
         display_name=EXCLUDED.display_name,role='publisher',status='active'`,
      [serviceEmail],
    );
    for (const market of TASK_377_MARKETS) {
      const pins = new Map<string, Pin>();
      for (const source of mediaSources.filter((item) => item.market === market)) pins.set(source.stage, await media(client, source));
      pinsByMarket.set(market, pins);
    }
    const uaePins = new Map<string, Pin>();
    for (const [index, stage] of stages.entries()) {
      const sourcePath = ["/images/cognirise/blueprint-innovate.jpg", "/images/cognirise/blueprint-demonstrate.jpg", "/images/cognirise/blueprint-activate.jpg", "/images/cognirise/blueprint-operate.jpg"][index];
      const bytes = await readFile(path.join(repositoryRoot, "artifacts/cognirise-website/public", sourcePath));
      const checksum = createHash("sha256").update(bytes).digest("hex");
      const result = await client.query(
        `SELECT a.id::text media_id,v.id::text media_version_id
           FROM cms_media_assets a JOIN cms_media_versions v ON v.asset_id=a.id
          WHERE a.checksum=$1 AND v.checksum=$1 AND v.metadata->>'sourcePath'=$2`,
        [checksum, sourcePath],
      );
      if (result.rowCount !== 1) throw new Error(`Task 377 requires one exact immutable UAE ${stage} source.`);
      uaePins.set(stage, {
        mediaId: String(result.rows[0].media_id),
        mediaVersionId: String(result.rows[0].media_version_id),
        role: stage === "demonstrate" ? "hero" : "supporting",
      });
    }
    pinsByMarket.set("uae", uaePins);
    await client.query("COMMIT"); transactionOpen = false;
    await provisionObjects(mediaSources);
    await client.query("BEGIN");
    transactionOpen = true;
    const output: unknown[] = [];
    const actor = await client.query("SELECT id::text FROM cms_users WHERE email=$1", [serviceEmail]);
    for (const market of ["uae", ...TASK_377_MARKETS] as const) {
      const pins = pinsByMarket.get(market)!;
      output.push(await stageEdition(client, market, "framework", "idao", mediaSources.filter((item) => item.market === market), pins));
      output.push(await stageEdition(client, market, "landing-page", "homepage", mediaSources.filter((item) => item.market === market), pins));
      const documents = await client.query("SELECT id::text,kind,canonical_slug FROM cms_documents WHERE canonical_slug IN ('idao','homepage') AND kind IN ('framework','landing-page')");
      for (const document of documents.rows) await client.query(`INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
        VALUES($1,'Task 377 reconciliation','document.draft-reconciled','document',$2,$3,$4)
        ON CONFLICT(request_id) DO NOTHING`, [actor.rows[0].id, document.id, `cms-task-377:${market}:${document.canonical_slug}`, { task: 377, market, approvedCandidates: true, immutablePins: [...pins.values()], publication: "normal-review-required" }]);
    }
    await client.query("COMMIT");
    transactionOpen = false;
    console.log(JSON.stringify({ task: 377, output, publication: "No published pointer was changed; editorial review and authorized publication remain required." }, null, 2));
  } catch (error) { if (transactionOpen) await client.query("ROLLBACK"); throw error; } finally { client.release(); await pool.end(); }
}
if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) run().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });