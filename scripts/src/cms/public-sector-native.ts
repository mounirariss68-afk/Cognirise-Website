import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import path from "node:path";
import { industryContentSchema, publicSectorNativeSchema, validateCmsSnapshot, type PublicSectorNode } from "@workspace/api-zod";
import { canonicalResultDigest as digest } from "./migration.js";
import { repositoryRoot } from "./common.js";

export const NATIVE_MARKETS = ["uae", "ksa", "turkiye", "europe"] as const;
type Market = typeof NATIVE_MARKETS[number];
export const NATIVE_OPERATION = "cms.public-sector.ai-native-government.v2";
export const NATIVE_AUTHORIZATION = "Owner chat instruction: implement and publicly deliver the four supplied 7 October 2026 Public Sector English editions. This approves the replacement editorial content, not new government transactions or media clearance.";
type Sql = { query: (sql: string, values?: any[]) => Promise<any> };
export const receiptKey = (market: string) => `public-sector:ai-native-government:2026-10-07:${market}:en`;

export function nativeDisposition({ receipt, latestId, publishedId, latestDigest, latestState, predecessorKnown }: {
  receipt?: { revisionId: string; candidateDigest: string }; latestId: string | null; publishedId: string | null;
  latestDigest: string | null; latestState: string | null; predecessorKnown: boolean;
}): "stage" | "replay" | "preserve-conflict" {
  if (receipt) return latestId === receipt.revisionId && latestDigest === receipt.candidateDigest ? "replay" : "preserve-conflict";
  if (!latestId || (latestId === publishedId && latestState === "approved") || predecessorKnown) return "stage";
  return "preserve-conflict";
}

export async function nativeManuscripts() {
  const raw = JSON.parse(await readFile(path.join(repositoryRoot, "scripts/src/cms/public-sector-native-content.json"), "utf8"));
  for (const market of NATIVE_MARKETS) publicSectorNativeSchema.parse(raw[market].publicSectorNative);
  return raw as Record<Market, { thesis: string; dek: string; sources: any[]; publicSectorNative: ReturnType<typeof publicSectorNativeSchema.parse> }>;
}

function prose(node: PublicSectorNode): string {
  if (node.type === "copy" || node.type === "heading") return node.runs.map(run => run.text).join("");
  if (node.type === "panel") return node.blocks.map(prose).join("\n");
  if (node.type === "list") return node.items.map(item => item.map(prose).join(" ")).join("\n");
  if (node.type === "table") return node.rows.flat(2).map(prose).join(" ");
  return `${node.title}\n${node.consequence}\n${node.declaration}`;
}
/** Compatibility fields are derived from this manuscript, never September
 * claims. The full v2 structure, not these legacy summaries, renders publicly. */
export async function nativeSnapshot(base: any, market: Market) {
  const manuscript = (await nativeManuscripts())[market];
  const native = manuscript.publicSectorNative;
  const sectionText = (index: number) => native.sections[index].blocks.map(prose).join("\n");
  const title = (index: number) => native.sections[index].title;
  const content = { ...base.content };
  delete content.publicSectorPov;
  Object.assign(content, {
    publicSectorNative: native, name: "Public Sector", shortName: "Public Sector",
    legacyPath: "/industries/public-sector", thesis: manuscript.thesis, dek: manuscript.dek,
    opportunity: sectionText(0).slice(0, 1000),
    pressures: [2, 5, 7].map(index => ({ title: title(index).slice(0, 160), body: sectionText(index).slice(0, 1000) })),
    capabilities: [1, 9].map(index => ({ title: title(index).slice(0, 160), body: sectionText(index).slice(0, 1000) })),
    uses: [3, 4, 5].map(index => ({ use: title(index).slice(0, 160), description: title(index),
      evidence: sectionText(index).slice(0, 3000), boundary: "Illustrative service design, not a live government application or a Cognirise client claim." })),
    reversal: { title: title(11).slice(0, 240), body: sectionText(11).slice(0, 2000) },
    myth: { claim: title(0).slice(0, 240), verdict: sectionText(0).slice(0, 2000) },
    gcc: sectionText(2).slice(0, 2000),
    service: { label: "Discuss a service to redesign", href: "/contact", firstMove: title(12).slice(0, 240) },
    sources: manuscript.sources, visibility: "public",
  });
  const snapshot = {
    ...base, slug: "public-sector", title: `The AI-Native Government — ${native.marketLabel}`,
    summary: manuscript.dek, markets: [market],
    content: industryContentSchema.parse(content),
    seo: { ...base.seo, title: `AI-Native Government · ${native.marketLabel} | Cognirise`,
      description: manuscript.dek.slice(0, 300) },
  };
  const validation = validateCmsSnapshot("industry", snapshot);
  if (validation.errors?.length) throw new Error(`${market}: ${validation.errors.join("; ")}`);
  return validation.data as typeof snapshot;
}

export async function stageNativeEdition(client: Sql, market: Market) {
  const manuscript = (await nativeManuscripts())[market];
  const requestDigest = digest(manuscript);
  const key = `${receiptKey(market)}:${requestDigest}`;
  await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [receiptKey(market)]);
  const doc = await client.query("SELECT id::text FROM cms_documents WHERE kind='industry' AND canonical_slug='public-sector' AND archived_at IS NULL FOR UPDATE");
  if (doc.rows.length !== 1) throw new Error("The canonical Public Sector industry must exist exactly once.");
  const documentId = doc.rows[0].id;
  const source = await client.query(
    `SELECT r.* FROM cms_market_editions e JOIN cms_revisions r ON r.id=e.published_revision_id
     WHERE e.document_id=$1 AND COALESCE(e.editorial_market,e.market)='uae' AND e.locale IN ('en','und') AND r.workflow_state='approved'
     ORDER BY r.created_at DESC LIMIT 1`, [documentId]);
  if (source.rows.length !== 1) throw new Error("An approved UAE predecessor is required for exact hero inheritance.");
  await client.query(
    `INSERT INTO cms_market_editions(document_id,market,locale,localized_slug,publication_state,fallback_mode,content_mode,editorial_market)
     VALUES($1,$2,'en','public-sector','draft','none','custom',$2) ON CONFLICT(document_id,market,locale) DO NOTHING`, [documentId, market]);
  const editions = await client.query(
    `SELECT e.id::text,e.published_revision_id::text,l.id::text latest_id,l.workflow_state,l.content_digest,l.revision_number,l.source_revision_id::text
       FROM cms_market_editions e LEFT JOIN LATERAL
       (SELECT * FROM cms_revisions WHERE edition_id=e.id ORDER BY revision_number DESC LIMIT 1) l ON true
     WHERE e.document_id=$1 AND e.market=$2 AND e.locale='en' FOR UPDATE OF e`, [documentId, market]);
  if (editions.rows.length !== 1) throw new Error("The exact regional edition must exist exactly once.");
  const edition = editions.rows[0];
  const receipts = await client.query("SELECT operation,subject_id::text,response,request_digest,result_digest FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE", [key]);
  const receipt = receipts.rows[0];
  if (receipt && receipt.operation !== NATIVE_OPERATION) throw new Error(`${market}: conflicting operation receipt.`);
  if (receipt && (receipt.request_digest !== requestDigest || receipt.result_digest !== digest(receipt.response) || receipt.subject_id !== receipt.response?.revisionId)) {
    throw new Error(`${market}: receipt integrity mismatch; no content changed.`);
  }
  const knownNative = await client.query(
    `SELECT response FROM cms_operation_receipts WHERE operation=$1 AND subject_id=$2
       AND request_digest=$3 ORDER BY created_at LIMIT 1`,
    [NATIVE_OPERATION, edition.latest_id, requestDigest]);
  const priorNative = await client.query(
    `SELECT response FROM cms_operation_receipts WHERE operation=$1 AND subject_id=$2
       AND response->>'candidateDigest'=$3 LIMIT 1`,
    [NATIVE_OPERATION, edition.latest_id, edition.content_digest]);
  // A digest-matching publication from this operation is a safe predecessor
  // for a corrected import. A later editor revision never matches this query.
  const effectiveReceipt = receipt?.response ?? knownNative.rows[0]?.response;
  const predecessors = edition.latest_id ? await client.query(
    `SELECT 1 FROM cms_operation_receipts receipt JOIN cms_audit_events audit
       ON audit.metadata->>'revisionId'=receipt.subject_id::text
       JOIN cms_revisions predecessor ON predecessor.id::text=receipt.subject_id
       JOIN cms_revisions current ON current.id::text=$1
     WHERE receipt.subject_id IN ($1,$4) AND receipt.operation='cms.public-sector.edition-draft-v1'
       AND audit.action='cms.public-sector.edition-draft-staged'
       AND audit.metadata->>'candidateDigest'=predecessor.content_digest
       AND current.payload=predecessor.payload AND audit.target_id=$3
       AND $2::text IS NOT NULL`, [edition.latest_id, edition.content_digest, documentId, edition.source_revision_id]) : { rows: [] };
  const disposition = nativeDisposition({
    receipt: effectiveReceipt, latestId: edition.latest_id, publishedId: edition.published_revision_id,
    latestDigest: edition.content_digest, latestState: edition.workflow_state,
    predecessorKnown: (edition.workflow_state === "draft" && predecessors.rows.length > 0) || priorNative.rows.length > 0,
  });
  if (disposition === "preserve-conflict") return { market, documentId, disposition, revisionId: null };
  if (disposition === "replay") return { market, documentId, disposition, revisionId: effectiveReceipt.revisionId };
  const snapshot = await nativeSnapshot(source.rows[0].payload, market);
  const candidateDigest = digest(snapshot);
  const refs = await client.query(
    `SELECT asset_id::text,media_version_id::text FROM cms_media_references WHERE document_id=$1 AND field_path=$2`,
    [documentId, `revision:${source.rows[0].id}`]);
  const hero = snapshot.content.heroMedia;
  if (!hero?.mediaVersionId || !refs.rows.some((r: any) => r.asset_id === hero.mediaId && r.media_version_id === hero.mediaVersionId)) {
    throw new Error("Approved civic hero must have an exact predecessor revision/media pin.");
  }
  const author = await client.query("SELECT created_by_user_id::text FROM cms_revisions WHERE id=$1", [source.rows[0].id]);
  const inserted = await client.query(
    `INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,source_revision_id,reason)
     VALUES($1,$2,1,$3,$4,'draft',$5,$6,$7) RETURNING id::text`,
    [edition.id, Number(edition.revision_number ?? 0) + 1, snapshot, candidateDigest, author.rows[0]?.created_by_user_id,
      source.rows[0].id, "Owner-authorized October Public Sector replacement, staged for normal CMS publication."]);
  const revisionId = inserted.rows[0].id;
  for (const ref of refs.rows) await client.query(
    `INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES($1,$2,$3,$4)
     ON CONFLICT(document_id,field_path,asset_id) DO NOTHING`, [ref.asset_id, ref.media_version_id, documentId, `revision:${revisionId}`]);
  const response = { revisionId, candidateDigest, market, documentId, editionId: edition.id, sourceRevisionId: source.rows[0].id };
  await client.query(
    `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest,response,status_code)
    VALUES($1,$2,$3,$4,$5,$6,201)`, [key, NATIVE_OPERATION, revisionId, requestDigest, digest(response), response]);
  await client.query(
    `INSERT INTO cms_audit_events(actor_label,action,target_type,target_id,request_id,metadata)
     VALUES('Owner-authorized content reconciliation','cms.public-sector.native-staged','document',$1,$2,$3)`,
    [documentId, key, { ...response, authorization: NATIVE_AUTHORIZATION, inheritedResearchDate: "2026-10-07", executorResearchVerification: false }]);
  return { market, documentId, disposition, revisionId };
}

async function main() {
  const args = process.argv.slice(2);
  if (!args.includes("--apply-db") || !args.includes("--target=development") || process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production") throw new Error("Explicit --apply-db --target=development is required; deployment mutation is refused.");
  const { pool } = await import("@workspace/db");
  try {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      const results = [];
      for (const market of NATIVE_MARKETS) results.push(await stageNativeEdition(client, market));
      await client.query("COMMIT");
      console.log(JSON.stringify(results));
      if (results.some(r => r.disposition === "preserve-conflict") && !args.includes("--report-conflict")) throw new Error("Newer editorial work was preserved; resolve the reported market conflict before delivery.");
    } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
    finally { client.release(); }
  } finally { await pool.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
