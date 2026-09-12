import { pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
import { canonicalResultDigest } from "./migration.js";
import { emitJson, outputPath } from "./common.js";
import { PUBLIC_SECTOR_MARKETS, type PublicSectorMarket } from "./public-sector-editions.js";

/**
 * Read-only post-merge verification for Task 319. This intentionally does not
 * create preview sessions, approve revisions, publish editions, or update
 * availability. It reports the public pointer, the exact draft receipt and
 * whether the supplied market payload is still pending normal review.
 */

const RECEIPT_PREFIX = "cms-public-sector-editions-v1";
const AUDIT_ACTION = "cms.public-sector.edition-draft-staged";

interface QueryResult {
  rows: Array<Record<string, any>>;
}

interface ReadOnlyPool {
  query(sql: string, values?: unknown[]): Promise<QueryResult>;
  end(): Promise<void>;
}

function marketFrom(value: unknown) {
  return PUBLIC_SECTOR_MARKETS.includes(value as PublicSectorMarket)
    ? value as PublicSectorMarket
    : undefined;
}

function publicPayloadCheck(payload: unknown, market: PublicSectorMarket) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { valid: false, reason: "revision payload is absent" };
  }
  const candidate = payload as Record<string, any>;
  const content = candidate.content;
  const pov = content?.publicSectorPov;
  const valid = candidate.slug === "public-sector"
    && Array.isArray(candidate.markets)
    && candidate.markets.length === 1
    && candidate.markets[0] === market
    && pov?.market === market
    && (pov?.reviewBlockers === undefined || Array.isArray(pov.reviewBlockers));
  return valid
    ? { valid: true, reason: null }
    : { valid: false, reason: "payload is not an exact market-isolated Public Sector edition" };
}

function asMetadata(value: unknown): Record<string, any> | null {
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, any> : null;
}

async function verifyHttpResponse(
  baseUrl: string | undefined,
  market: PublicSectorMarket,
  beforeSnapshot: Record<string, any> | null,
  publishedPayload: Record<string, any> | null,
) {
  if (!baseUrl) return { status: "not-requested", exactMarketPayload: null };
  const url = `${baseUrl.replace(/\/+$/, "")}/api/public/content/${market}/en/industry/public-sector`;
  try {
    const response = await fetch(url, { headers: { accept: "application/json" } });
    const body = await response.json().catch(() => null) as Record<string, any> | null;
    if (!response.ok || !body) {
      return { status: "unavailable", httpStatus: response.status, url, exactMarketPayload: false };
    }
    const exactMarketPayload = body.market === market
      && body.requestedMarket === market
      && body.usedFallback === false
      && body.locale === "en"
      && body.content?.publicSectorPov?.market === market;
    const dbPayloadMatch = publishedPayload?.content
      ? JSON.stringify(body.content) === JSON.stringify(publishedPayload.content)
      : null;
    const beforeComparison = market === "uae" && beforeSnapshot
      ? {
          checked: true,
          unchanged: body.revision === beforeSnapshot.revision
            && JSON.stringify(body.content) === JSON.stringify(beforeSnapshot.content),
          baselineRevision: beforeSnapshot.revision ?? null,
          currentRevision: body.revision ?? null,
        }
      : { checked: false, unchanged: null };
    return {
      status: exactMarketPayload && dbPayloadMatch !== false ? "verified" : "mismatch",
      httpStatus: response.status,
      url,
      revision: body.revision ?? null,
      exactMarketPayload,
      dbPayloadMatch,
      beforeComparison,
    };
  } catch (error) {
    return {
      status: "unavailable",
      url,
      exactMarketPayload: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verify() {
  const args = process.argv.slice(2);
  const target = args.find((item) => item.startsWith("--target="))?.slice(9);
  const write = args.includes("--write");
  const destination = args.find((item) => item.startsWith("--out="))?.slice(6);
  const baseUrl = args.find((item) => item.startsWith("--base-url="))?.slice(11) ?? process.env.PUBLIC_SECTOR_VERIFY_BASE_URL;
  const beforePath = args.find((item) => item.startsWith("--before="))?.slice(9);
  const requested = args.find((item) => item.startsWith("--market="))?.slice(9);
  const markets = requested
    ? [marketFrom(requested)]
    : [...PUBLIC_SECTOR_MARKETS];
  if (markets.some((market): market is undefined => !market)) throw new Error(`Unsupported Public Sector market: ${requested}.`);
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Public Sector verification is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  let beforeSnapshot: Record<string, any> | null = null;
  if (beforePath) {
    try {
      const parsed = JSON.parse(await readFile(beforePath, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) beforeSnapshot = parsed;
    } catch (error) {
      throw new Error(`Unable to read --before snapshot: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const { pool } = await import("@workspace/db") as { pool: ReadOnlyPool };
  const results: Array<Record<string, unknown>> = [];
  try {
    const documents = await pool.query(
      `SELECT id::text,title
         FROM cms_documents
        WHERE kind='industry' AND canonical_slug='public-sector'`,
    );
    if (documents.rows.length !== 1) throw new Error("Expected exactly one Public Sector industry document.");
    const documentId = String(documents.rows[0].id);
    for (const market of markets as PublicSectorMarket[]) {
      const editions = await pool.query(
        `SELECT e.id::text edition_id,e.market,e.locale,e.content_mode,e.fallback_mode,
                e.publication_state,e.published_revision_id::text,
                published.id::text published_id,published.revision_number published_revision_number,
                published.workflow_state published_workflow_state,
                published.content_digest published_digest,published.payload published_payload,
                latest.id::text latest_id,latest.workflow_state latest_workflow_state,
                latest.content_digest latest_digest,latest.payload latest_payload
           FROM cms_market_editions e
           LEFT JOIN cms_revisions published ON published.id=e.published_revision_id
           LEFT JOIN LATERAL (
             SELECT r.id,r.workflow_state,r.content_digest,r.payload
               FROM cms_revisions r
              WHERE r.edition_id=e.id
              ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC
              LIMIT 1
           ) latest ON true
          WHERE e.document_id=$1 AND e.market=$2 AND e.locale='en'`,
        [documentId, market],
      );
      if (editions.rows.length !== 1) {
        results.push({
          market,
          status: "pending",
          reason: "exact market edition is absent",
          publicationUnchanged: false,
        });
        continue;
      }
      const edition = editions.rows[0];
      const receiptRows = await pool.query(
        `SELECT operation,subject_id::text,request_digest,result_digest
           FROM cms_operation_receipts
          WHERE idempotency_key=$1 OR idempotency_key LIKE $2
          ORDER BY created_at DESC
          LIMIT 1`,
        [`${RECEIPT_PREFIX}:${market}:en`, `${RECEIPT_PREFIX}:${market}:en:successor:%`],
      );
      const receipt = receiptRows.rows[0] ?? null;
      const auditRows = await pool.query(
        `SELECT metadata
           FROM cms_audit_events
          WHERE target_type='industry' AND target_id=$1 AND action=$2
            AND metadata->>'market'=$3
          ORDER BY occurred_at DESC
          LIMIT 1`,
        [documentId, AUDIT_ACTION, market],
      );
      const availabilityRows = await pool.query(
        `SELECT market_edition_id::text,locale,published_decision,draft_decision
           FROM cms_document_market_availability
          WHERE document_id=$1 AND market_edition_id=$2`,
        [documentId, edition.edition_id],
      );
      const auditMetadata = asMetadata(auditRows.rows[0]?.metadata);
      const publicCheck = edition.published_payload
        ? publicPayloadCheck(edition.published_payload, market)
        : { valid: false, reason: "no published revision pointer" };
      const draftCheck = edition.latest_payload
        ? publicPayloadCheck(edition.latest_payload, market)
        : { valid: false, reason: "no draft candidate" };
      const published = edition.published_id
        && edition.published_workflow_state === "approved"
        && edition.publication_state === "published";
      const receiptMatchesDraft = Boolean(
        receipt
        && receipt.operation === "cms.public-sector.edition-draft-v1"
        && String(receipt.subject_id) === String(edition.latest_id)
        && edition.latest_digest
        && edition.latest_digest === canonicalResultDigest(edition.latest_payload),
      );
      const recordedBeforePointer = auditMetadata?.publicationVerification
        && Object.prototype.hasOwnProperty.call(auditMetadata.publicationVerification, "publishedRevisionId")
        ? auditMetadata.publicationVerification.publishedRevisionId
        : undefined;
      // A shared UAE edition can expose the approved UAE predecessor through
      // sourceRevisionId while its own publication pointer is null. The
      // writer records that effective public pointer separately at staging.
      const beforePointer = recordedBeforePointer !== undefined
        ? (recordedBeforePointer ? String(recordedBeforePointer) : null)
        : market === "uae" && edition.content_mode === "shared" && auditMetadata?.sourceRevisionId
          ? String(auditMetadata.sourceRevisionId)
          : null;
      const beforePointerKnown = Boolean(auditMetadata)
        && (recordedBeforePointer !== undefined
          || (market === "uae" && edition.content_mode === "shared" && auditMetadata?.sourceRevisionId));
      const currentPointer = edition.published_id ? String(edition.published_id) : null;
      const pointerMutated = beforePointerKnown ? beforePointer !== currentPointer : null;
      const httpVerification = await verifyHttpResponse(
        baseUrl,
        market,
        beforeSnapshot,
        edition.published_payload && typeof edition.published_payload === "object" ? edition.published_payload : null,
      );
      results.push({
        market,
        editionId: edition.edition_id,
        mode: edition.content_mode,
        fallbackMode: edition.fallback_mode,
        status: published && publicCheck.valid ? "published" : "pending",
        publicResponse: {
          status: published && publicCheck.valid ? "published" : "pending",
          revisionId: currentPointer,
          revisionNumber: edition.published_revision_number ?? null,
          digest: edition.published_digest ?? null,
          exactMarketPayload: publicCheck,
        },
        draftCandidate: {
          status: draftCheck.valid ? edition.latest_workflow_state : "pending",
          revisionId: edition.latest_id ?? null,
          digest: edition.latest_digest ?? null,
          receiptMatchesDraft,
          exactMarketPayload: draftCheck,
          reviewBlockers: edition.latest_payload?.content?.publicSectorPov?.reviewBlockers ?? [],
        },
        publicationUnchanged: beforePointerKnown ? pointerMutated === false : null,
        publicationVerification: {
          stagedBeforeRevisionId: beforePointerKnown ? beforePointer : null,
          currentPublishedRevisionId: currentPointer,
          pointerMutated,
          evidence: beforePointerKnown ? "market-scoped staging audit metadata" : "no market-scoped staging audit metadata; pointer mutation is unknown",
        },
        httpVerification,
        availability: "read-only check: no availability rows or decisions were changed",
        availabilitySnapshot: availabilityRows.rows,
      });
    }
  } finally {
    await pool.end();
  }
  const pending = results.filter((result) => result.status === "pending").length;
  await emitJson({
    task: 319,
    mode: "read-only-verification",
    markets: results,
    summary: {
      sourceMarketsChecked: results.length,
      pending,
      publicationClaim: pending ? "At least one exact edition remains pending normal review/publication." : "All checked exact editions have approved public responses.",
    },
    action: "No preview session, approval, publication pointer, revision, media reference, or availability decision was mutated.",
  }, outputPath(destination, "public-sector-editions-verification.json"), write);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  verify().catch((error) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}