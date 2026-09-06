import { createHash, randomUUID } from "node:crypto";

const args = process.argv.slice(2);
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");

async function main() {
  if (!args.includes("--development") || !args.includes("--rehearse-rollback")) {
    throw new Error("Refusing rollback rehearsal. Pass both --development and --rehearse-rollback.");
  }
  if (process.env.NODE_ENV === "production") throw new Error("Rollback rehearsal is forbidden when NODE_ENV=production.");
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  const suffix = randomUUID();
  const email = `cms-rollback-rehearsal-${suffix}@service.invalid`;
  const slug = `rollback-rehearsal-${suffix}`;
  try {
    await client.query("BEGIN");
    const user = await client.query(`INSERT INTO cms_users (email,display_name,role,status)
      VALUES ($1,'CMS rollback rehearsal service','viewer','suspended') RETURNING id`, [email]);
    const userId = user.rows[0].id;
    const document = await client.query(`INSERT INTO cms_documents (kind,canonical_slug,title,owner_id,status)
      VALUES ('publication',$1,'Rollback rehearsal fixture',$2,'active') RETURNING id`, [slug, userId]);
    const documentId = document.rows[0].id;
    const edition = await client.query(`INSERT INTO cms_market_editions
      (document_id,market,locale,localized_slug,publication_state,published_at)
       VALUES ($1,'uae','en',$2,'published',now()) RETURNING id`, [documentId, slug]);
    const editionId = edition.rows[0].id;
    const approved = { title: "Approved fixture", marker: suffix };
    const approvedRevision = await client.query(`INSERT INTO cms_revisions
      (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason,approved_by_user_id,approved_at)
       VALUES ($1,1,$2,$3,'approved',$4,'rehearsal baseline',$4,now()) RETURNING id`,
      [editionId, approved, digest(approved), userId]);
    const approvedId = approvedRevision.rows[0].id;
    await client.query("UPDATE cms_market_editions SET published_revision_id=$2 WHERE id=$1", [editionId, approvedId]);
    const changed = { title: "Changed fixture", marker: suffix };
    await client.query(`INSERT INTO cms_revisions
      (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
      VALUES ($1,2,$2,$3,'draft',$4,'rehearsal change')`, [editionId, changed, digest(changed), userId]);
    const rollback = await client.query(`INSERT INTO cms_revisions
      (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
      SELECT $1,max(revision_number)+1,$2,$3,'draft',$4,'rehearsal rollback'
      FROM cms_revisions WHERE edition_id=$1 RETURNING revision_number,payload,workflow_state`,
      [editionId, approved, digest(approved), userId]);
    if (rollback.rows[0].revision_number !== 3 || rollback.rows[0].workflow_state !== "draft") throw new Error("Rollback did not create draft revision 3.");
    const current = await client.query("SELECT payload FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1", [editionId]);
    const publicRevision = await client.query(`SELECT r.payload FROM cms_market_editions e
      JOIN cms_revisions r ON r.id=e.published_revision_id AND r.edition_id=e.id AND r.workflow_state='approved'
      WHERE e.id=$1 AND e.publication_state='published'`, [editionId]);
    if (JSON.stringify(current.rows[0].payload) !== JSON.stringify(approved) || JSON.stringify(publicRevision.rows[0]?.payload) !== JSON.stringify(approved)) {
      throw new Error("Current/public revision rollback semantics failed.");
    }
    await client.query("DELETE FROM cms_documents WHERE id=$1", [documentId]);
    const remains = await client.query("SELECT 1 FROM cms_market_editions WHERE id=$1 UNION ALL SELECT 1 FROM cms_revisions WHERE edition_id=$1", [editionId]);
    if (remains.rowCount) throw new Error("Fixture cleanup failed.");
    await client.query("DELETE FROM cms_users WHERE id=$1", [userId]);
    await client.query("COMMIT");
    console.log(`Development rollback rehearsal succeeded at ${new Date().toISOString()}; temporary fixture cleaned up.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });