import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { nativeManuscripts, NATIVE_MARKETS, NATIVE_AUTHORIZATION, NATIVE_OPERATION, receiptKey, stageNativeEdition } from "./public-sector-native.js";
import { canonicalResultDigest as digest } from "./migration.js";
import { repositoryRoot } from "./common.js";

const args = process.argv.slice(2);
const value = (flag: string) => args.find(arg => arg.startsWith(`${flag}=`))?.slice(flag.length + 1);

async function main() {
  if (!args.includes("--target=development") || process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production") throw new Error("Only explicit development reconciliation is supported.");
  const credentialPath = value("--credentials");
  if (!credentialPath) throw new Error("A private administrator credential file is required for the normal CMS API.");
  const stats = await lstat(credentialPath);
  if (!stats.isFile() || (stats.mode & 0o777) !== 0o600 || (process.getuid && stats.uid !== process.getuid())) throw new Error("Credential file must be an owned mode-600 regular file.");
  const fixture = JSON.parse(await readFile(credentialPath, "utf8"));
  const actor = fixture.version === 1 && fixture.phase === "ready" ? fixture.users.find((user: any) => user.role === "administrator") : fixture;
  if (!actor?.email || !actor.password || !actor.totpSecret) throw new Error("MFA-enrolled CMS administrator credentials are required.");
  const base = (value("--api-base") ?? "http://localhost:80/api").replace(/\/$/, "");
  const origin = new URL(base).origin;
  const cookies = new Map<string, string>();
  let csrf = "";
  const request = async (route: string, body?: any, method = body ? "POST" : "GET") => {
    const response = await fetch(`${base}${route}`, {
      method, headers: { "content-type": "application/json", origin, cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; "), ...(csrf ? { "x-csrf-token": csrf } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    for (const cookie of response.headers.getSetCookie()) {
      const pair = cookie.split(";")[0]; const split = pair.indexOf("=");
      cookies.set(pair.slice(0, split), pair.slice(split + 1));
    }
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) throw new Error(`CMS ${route} (${response.status}): ${payload.error ?? "invalid response"}${payload.details ? ` ${JSON.stringify(payload.details)}` : ""}`);
    return payload;
  };
  const challenge = await request("/auth/login", { email: actor.email, password: actor.password });
  const { totp } = await import(pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/lib/security.ts")).href);
  const authenticated = await request("/auth/mfa/verify", { challengeId: challenge.mfaChallenge?.id, code: totp(actor.totpSecret) });
  csrf = authenticated.csrfToken;
  if (!csrf) throw new Error("MFA did not return a CSRF token.");
  const { pool } = await import("@workspace/db");
  try {
    const canonical = await pool.query("SELECT id::text FROM cms_documents WHERE canonical_slug='public-sector' AND kind='industry' AND archived_at IS NULL");
    if (canonical.rows.length !== 1) throw new Error("Canonical Public Sector identity is ambiguous.");
    const documentId = canonical.rows[0].id;
    // Use the existing customization lifecycle to separate UAE from the old
    // real-market shared source. It preserves the source's immutable history.
    const legacy = await pool.query(
      `SELECT e.id,e.content_mode,l.id::text revision_id,l.content_digest,l.workflow_state
       FROM cms_market_editions e JOIN LATERAL
       (SELECT * FROM cms_revisions WHERE edition_id=e.id ORDER BY revision_number DESC LIMIT 1) l ON true
       WHERE e.document_id=$1 AND e.market='uae' AND e.locale='en'`, [documentId]);
    if (legacy.rows[0]?.content_mode === "shared") {
      const current = legacy.rows[0];
      const known = await pool.query(
        `SELECT 1 FROM cms_operation_receipts receipt JOIN cms_audit_events audit
          ON audit.metadata->>'revisionId'=receipt.subject_id::text
         WHERE receipt.subject_id=$1 AND receipt.operation='cms.public-sector.edition-draft-v1'
           AND audit.action='cms.public-sector.edition-draft-staged'
           AND audit.metadata->>'candidateDigest'=$2 AND audit.target_id=$3`,
        [current.revision_id, current.content_digest, documentId]);
      if (!known.rowCount || current.workflow_state !== "draft") throw new Error("Shared-source customization refused: newer or unreceipted editorial work exists.");
      await request(`/documents/${documentId}/editions`, { market: "uae", locale: "en", sourceRevisionId: current.revision_id });
      console.log("UAE separated through the supported regional customization lifecycle; shared-source history retained.");
    }
    const client = await pool.connect();
    let staged: Awaited<ReturnType<typeof stageNativeEdition>>[] = [];
    try {
      await client.query("BEGIN");
      for (const market of NATIVE_MARKETS) staged.push(await stageNativeEdition(client, market));
      await client.query("COMMIT");
    } catch (error) { await client.query("ROLLBACK").catch(() => {}); throw error; }
    finally { client.release(); }
    for (const edition of staged) {
      if (!edition.revisionId) {
        console.log(`${edition.market}: newer editorial work preserved; no publication attempted.`);
        if (!args.includes("--report-conflict")) throw new Error(`${edition.market}: exact replacement has an editorial conflict.`);
        continue;
      }
      const live = await pool.query(
        `SELECT 1 FROM cms_market_editions e JOIN cms_revisions r ON r.id=e.published_revision_id
         WHERE e.document_id=$1 AND e.market=$2 AND e.locale='en' AND r.id=$3 AND r.workflow_state='approved'`,
        [documentId, edition.market, edition.revisionId]);
      if (!live.rowCount) {
        // The owner-approved manuscript and its unchanged date qualification
        // are confirmed through the standard exact-revision accuracy gate.
        // This does not record a new research check date or media approval.
        await request(`/documents/${documentId}/revisions/${edition.revisionId}/accuracy-confirmation`, {});
        await request(`/documents/${documentId}/publish`, { revisionId: edition.revisionId, note: NATIVE_AUTHORIZATION });
      }
      const capability = await request(`/documents/${documentId}/preview?market=${edition.market}&locale=en&revisionId=${edition.revisionId}`);
      if (capability.revisionId !== edition.revisionId || capability.usedFallback !== false
        || capability.document?.content?.publicSectorNative?.market !== edition.market
        || !capability.document?.content?.heroMedia?.mediaVersionId) throw new Error(`${edition.market}: protected preview pin mismatch.`);
      const previewUrl = capability.previewUrl?.replace(/^\/preview\//, "/api/preview/");
      // Exact capability and public verification are kept response-local. Never
      // persist or log a protected token or authenticated cookie.
      if (previewUrl && typeof previewUrl === "string") {
        const previewResponse = await fetch(new URL(previewUrl, origin), { headers: { cookie: [...cookies].map(([k, v]) => `${k}=${v}`).join("; ") } });
        if (!previewResponse.ok) throw new Error(`${edition.market}: protected preview failed (${previewResponse.status}).`);
        const preview = await previewResponse.json() as Record<string, any>;
        if (preview.document?.content?.publicSectorNative?.market !== edition.market) throw new Error(`${edition.market}: protected preview edition mismatch.`);
        if (digest(preview.document.content.publicSectorNative) !== digest(capability.document.content.publicSectorNative)
          || digest(preview.document.content.heroMedia) !== digest(capability.document.content.heroMedia)
          || !previewResponse.headers.get("x-robots-tag")?.includes("noindex")) {
          throw new Error(`${edition.market}: immutable preview parity or noindex contract failed.`);
        }
      } else throw new Error(`${edition.market}: protected preview capability missing.`);
      console.log(`${edition.market}: exact native revision approved and published through the CMS API.`);
    }
    for (const edition of staged.filter(edition => edition.revisionId)) {
      const response = await fetch(`${base}/public/content/${edition.market}/en/industry/public-sector`);
      const payload = await response.json() as Record<string, any>;
      if (!response.ok || payload.usedFallback !== false || payload.market !== edition.market || payload.content?.publicSectorNative?.market !== edition.market) throw new Error(`${edition.market}: exact public edition is not available (${response.status}).`);
      const expected = (await nativeManuscripts())[edition.market].publicSectorNative;
      if (digest(expected) !== digest(payload.content.publicSectorNative)) throw new Error(`${edition.market}: public manuscript differs from its source mapping.`);
      const audit = await pool.query(
        `SELECT id::text FROM cms_audit_events WHERE action='document.published' AND target_id=$1 AND metadata->>'revisionId'=$2 ORDER BY occurred_at DESC LIMIT 1`,
        [documentId, edition.revisionId]);
      if (!audit.rowCount) throw new Error(`${edition.market}: normal publication audit missing.`);
      const evidence = { market: edition.market, revisionId: edition.revisionId, auditId: audit.rows[0].id, authorization: NATIVE_AUTHORIZATION };
      await pool.query(
        `INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest,response,status_code)
         VALUES($1,$2,$3,$4,$5,$6,201) ON CONFLICT(idempotency_key) DO NOTHING`,
        [`${receiptKey(edition.market)}:release:${edition.revisionId}`, `${NATIVE_OPERATION}.release`, edition.revisionId, digest(expected), digest(evidence), evidence]);
      console.log(`${edition.market}: exact public response verified, no fallback; release audit recorded.`);
    }
  } finally { await pool.end(); }
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
