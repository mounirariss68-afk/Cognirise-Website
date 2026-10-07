import { createHash } from "node:crypto";
import { writeFileSync } from "node:fs";
import { pool } from "@workspace/db";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { telecomCopy, telecomPov, supplied } from "./telecom-content";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
if (process.env.NODE_ENV === "production" || (apply && !args.includes("--target=development"))) throw new Error("Development-only draft staging; explicit target required.");
const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v;
const digest = (v: unknown) => createHash("sha256").update(JSON.stringify(canonical(v))).digest("hex");
const reason = "Owner-supplied Telecom POV adaptation; draft only; evidence and market review outstanding.";
const client = await pool.connect();
try {
  await client.query(apply ? "BEGIN" : "BEGIN READ ONLY");
  const { rows: editions } = await client.query(`SELECT e.*,d.id AS doc_id FROM cms_market_editions e JOIN cms_documents d ON d.id=e.document_id WHERE d.kind='industry' AND d.canonical_slug='telecoms' AND e.market='uae' AND e.locale='en' ${apply ? "FOR UPDATE OF e" : ""}`);
  if (editions.length !== 1) throw new Error("Expected exactly one UAE/en Telecom edition.");
  const edition = editions[0];
  const { rows } = await client.query("SELECT * FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC", [edition.id]);
  const latest = rows[0];
  const published = rows.find(r => r.id === edition.published_revision_id);
  if (!published) throw new Error("No approved published baseline; hero preservation cannot be proven.");
  const baseline = published.payload;
  const pins = (await client.query("SELECT asset_id,media_version_id FROM cms_media_references WHERE document_id=$1 AND field_path=$2", [edition.doc_id, `revision:${published.id}`])).rows;
  if (!pins.length || pins.some(p => !p.media_version_id)) throw new Error("Published immutable media pins are required.");
  const candidate = { ...baseline, title: "Telecoms — enterprise around the network", summary: telecomCopy.dek,
    content: { ...baseline.content, ...telecomCopy, telecomPov },
    seo: { ...baseline.seo, title: "Telecom enterprise workflows | Cognirise", description: "Explore bounded telecom workflows across customer, commercial and operational teams, with evidence, accountable authority and network ownership." },
  };
  for (const key of ["image", "imageAlt", "heroMedia", "heroMediaId", "supportingMedia"]) {
    if (JSON.stringify(candidate.content[key]) !== JSON.stringify(baseline.content[key])) throw new Error(`Hero/media changed: ${key}`);
  }
  const validation = validateCmsSnapshot("industry", candidate, "draft");
  if (!validation.success) throw new Error(JSON.stringify(validation));
  const same = digest(latest.payload) === digest(candidate);
  const knownPrevious = { ...candidate, seo: { ...candidate.seo, description: telecomCopy.dek } };
  if (args.includes("--repair-staged-pins")) {
    if (!apply) throw new Error("Pin repair requires explicit development apply.");
    for (const revision of rows) {
      if (revision.reason !== reason || revision.workflow_state !== "draft") continue;
      if (![digest(candidate), digest(knownPrevious)].includes(digest(revision.payload))) continue;
      for (const pin of pins) {
        const field = `revision:${revision.id}`;
        const existing = (await client.query("SELECT media_version_id FROM cms_media_references WHERE document_id=$1 AND field_path=$2 AND asset_id=$3", [edition.doc_id, field, pin.asset_id])).rows;
        if (existing.length && existing.some(p => p.media_version_id !== pin.media_version_id)) throw new Error("Conflicting immutable pin; no repair performed.");
        if (!existing.length) await client.query("INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES($1,$2,$3,$4)", [pin.asset_id, pin.media_version_id, edition.doc_id, field]);
      }
    }
    await client.query("COMMIT");
    console.log("Exact staged drafts now retain the published immutable media pins; payloads and publication unchanged.");
  } else {
  const metadataCorrection = latest.reason === reason && latest.workflow_state === "draft" && digest(latest.payload) === digest(knownPrevious);
  if (!same && latest.id !== published.id && !metadataCorrection) throw new Error("A newer editorial revision exists; refusing to overwrite or supersede it.");
  let revisionId = latest.id;
  if (apply && !same) {
    const actor = published.created_by_user_id;
    const inserted = await client.query(`INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason,source_revision_id) VALUES($1,$2,1,$3::jsonb,$4,'draft',$5,$6,$7) RETURNING id`, [edition.id, latest.revision_number + 1, JSON.stringify(candidate), digest(candidate), actor, reason, published.id]);
    revisionId = inserted.rows[0].id;
    for (const pin of pins) {
      await client.query("INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES($1,$2,$3,$4)", [pin.asset_id, pin.media_version_id, edition.doc_id, `revision:${revisionId}`]);
    }
    await client.query(`INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata) VALUES($1,'Telecom draft import','telecom.pov.draft-staged','industry',$2,$3,$4::jsonb)`, [actor, edition.doc_id, `telecom-pov:${revisionId}`, JSON.stringify({ revisionId, baselineRevisionId: published.id, publicationPerformed: false, approvalPerformed: false, heroDigest: digest(baseline.content.heroMedia ?? baseline.content.image), reason })]);
  }
  await client.query("COMMIT");
  writeFileSync(new URL("../../cms/output/telecom-review-candidate.json", import.meta.url), JSON.stringify(candidate, null, 2));
  writeFileSync(new URL("../../cms/output/telecom-source-inventory.json", import.meta.url), JSON.stringify({ supplied, metrics: telecomPov.metrics, policy: "Original numbers not present in classified metrics remain unresolved. No reported outcomes substantiated; all public figures are illustrative targets. Original source inventories are private review material, not public proof." }, null, 2));
  console.log(JSON.stringify({ apply, replay: same, revisionId, documentId: edition.doc_id, baselineRevisionId: published.id, heroPreserved: true, publicationChanged: false }));
  }
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
  await pool.end();
}
