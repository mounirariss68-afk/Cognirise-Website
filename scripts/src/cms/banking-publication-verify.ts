import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { collectCmsMediaReferences, validateCmsSnapshot } from "@workspace/api-zod";
import { canonicalResultDigest } from "./migration.js";
import { emitJson, outputPath, repositoryRoot } from "./common.js";
import { bankingMediaManifest } from "./banking-media-manifest.js";
import { bindReceiptMedia } from "./banking-successor.js";

const args = process.argv.slice(2);
const write = args.includes("--write");
const destination = args.find((item) => item.startsWith("--out="))?.slice(6);
const baselinePath = args.find((item) => item.startsWith("--baseline="))?.slice(11)
  ?? path.join(repositoryRoot, "scripts/cms/output/banking-published-baseline.json");

const normalized = canonicalResultDigest;
function membership(rows: Array<any>) {
  return rows.map((row) => ({ slug: row.canonical_slug, title: row.payload?.title ?? row.payload?.content?.title, order: Number(row.payload?.content?.order ?? 0), digest: row.content_digest }));
}
function expectedHeroPin(baseline: { immutableMediaPins?: any[] }, page: any) {
  const heroMediaId = page.payload?.content?.heroMediaId;
  const pin = baseline.immutableMediaPins?.find((item) =>
    item.document_id === page.document_id
    && item.field_path === `revision:${page.published_revision_id}`
    && item.asset_id === heroMediaId,
  );
  if (!heroMediaId || !pin?.media_version_id || typeof pin.checksum !== "string") {
    throw new Error("Baseline is missing the original Financial Services hero immutable pin.");
  }
  return { mediaId: heroMediaId, mediaVersionId: pin.media_version_id, checksum: pin.checksum, byteSize: Number(pin.byte_size) };
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID) {
    throw new Error("DATABASE_URL and DEFAULT_OBJECT_STORAGE_BUCKET_ID are required.");
  }
  const baseline = JSON.parse(await readFile(baselinePath, "utf8")) as { page: any[]; cases: any[]; immutableMediaPins?: any[] };
  const expectedPage = baseline.page.find((row) => row.market === "uae" && row.locale === "en");
  if (!expectedPage) throw new Error("No UAE/en Banking baseline is available.");
  const heroPin = expectedHeroPin(baseline, expectedPage);
  const { bankingPov } = await import(pathToFileURL(path.join(repositoryRoot, "artifacts/cognirise-website/src/content/banking.ts")).href) as { bankingPov?: unknown };
  if (!bankingPov) throw new Error("Canonical bankingPov is unavailable.");
  const boundBankingPov = await bindReceiptMedia(bankingPov);
  const { pool } = await import("@workspace/db");
  try {
    const page = await pool.query(
      `SELECT d.id::text document_id,e.id::text edition_id,e.market,e.locale,e.publication_state,e.published_revision_id::text,
              r.workflow_state,r.payload
         FROM cms_documents d JOIN cms_market_editions e ON e.document_id=d.id
         JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE d.kind='industry' AND d.canonical_slug='financial-services' AND e.market='uae' AND e.locale='en'`,
    );
    const live = page.rows[0];
    if (!live || live.publication_state !== "published" || live.workflow_state !== "approved") {
      throw new Error("Financial Services Banking successor is not published through the approved CMS procedure.");
    }
    if (normalized(live.payload?.content?.bankingPov) !== normalized(boundBankingPov)) {
      throw new Error("Published Banking POV does not match the canonical reviewed object.");
    }
    const validation = validateCmsSnapshot("industry", live.payload, "publish");
    if (!validation.success) throw new Error(`Published Banking payload fails delivery validation: ${validation.errors.join("; ")}`);
    const references = collectCmsMediaReferences("industry", live.payload.content, live.payload.mediaIds ?? [])
      .filter((item) => item.fieldPath.startsWith("content.bankingPov."));
    if (references.length !== 5 || references.some((item) => !item.mediaVersionId)) throw new Error("Published Banking payload has incomplete immutable media pins.");
    const bucket = (await import("./object-storage.js")).objectStorageClient.bucket(process.env.DEFAULT_OBJECT_STORAGE_BUCKET_ID);
    const publishedHero = collectCmsMediaReferences("industry", live.payload.content, live.payload.mediaIds ?? [])
      .find((item) => item.fieldPath === "content.heroMedia");
    if (!publishedHero || publishedHero.mediaId !== heroPin.mediaId || publishedHero.mediaVersionId !== heroPin.mediaVersionId) {
      throw new Error("Published Banking successor did not preserve the original Financial Services hero version pin.");
    }
    const heroMedia = await pool.query(
      `SELECT a.status,v.storage_key,v.checksum,v.byte_size FROM cms_media_assets a
        JOIN cms_media_versions v ON v.id=$2 AND v.asset_id=a.id WHERE a.id=$1`,
      [heroPin.mediaId, heroPin.mediaVersionId],
    );
    const liveHero = heroMedia.rows[0];
    if (!liveHero || liveHero.status !== "active" || liveHero.checksum !== heroPin.checksum
      || Number(liveHero.byte_size) !== heroPin.byteSize) {
      throw new Error("Published Financial Services hero pin is not approved or byte-exact.");
    }
    const [heroBytes] = await bucket.file(liveHero.storage_key).download();
    if (createHash("sha256").update(heroBytes).digest("hex") !== heroPin.checksum || heroBytes.length !== heroPin.byteSize) {
      throw new Error("Published Financial Services hero object readback mismatch.");
    }
    for (const entry of bankingMediaManifest) {
      const reference = references.find((item) => {
        const pathMatch = entry.id === "production-readiness-gate"
          ? item.fieldPath.endsWith("productionReadiness.image")
          : item.fieldPath.includes(`startingPoints.${["core-banking-operations", "contact-centre", "software-delivery", "marketing-intelligence"].indexOf(entry.id)}.image`);
        return pathMatch;
      });
      if (!reference?.mediaVersionId) throw new Error(`Published pin is missing for ${entry.id}.`);
      const media = await pool.query(
        `SELECT a.status,v.storage_key,v.checksum,v.byte_size FROM cms_media_assets a
           JOIN cms_media_versions v ON v.id=$2 AND v.asset_id=a.id WHERE a.id=$1`,
        [reference.mediaId, reference.mediaVersionId],
      );
      const pin = media.rows[0];
      if (!pin || pin.status !== "active" || pin.checksum !== entry.checksum || Number(pin.byte_size) !== entry.byteSize) {
        throw new Error(`Published media pin is not approved or byte-exact: ${entry.id}.`);
      }
      const [bytes] = await bucket.file(pin.storage_key).download();
      if (createHash("sha256").update(bytes).digest("hex") !== entry.checksum || bytes.length !== entry.byteSize) {
        throw new Error(`Published media object readback mismatch: ${entry.id}.`);
      }
    }
    const cases = await pool.query(
      `SELECT d.canonical_slug,r.content_digest,r.payload FROM cms_documents d
        JOIN cms_market_editions e ON e.document_id=d.id JOIN cms_revisions r ON r.id=e.published_revision_id
       WHERE d.kind='case-study' AND e.market='uae' AND e.locale='en' AND e.publication_state='published' AND r.workflow_state='approved'
         AND COALESCE(r.payload->'content'->>'visibility','public')='public'
         AND COALESCE(r.payload->'content'->>'disclosure','restricted')<>'restricted'
         AND COALESCE(r.payload->'content'->'relatedIndustries','[]'::jsonb) ? 'financial-services'
       ORDER BY e.market,e.locale,(r.payload->'content'->>'order')::int,d.canonical_slug`,
    );
    if (normalized(membership(cases.rows)) !== normalized(membership(baseline.cases))) throw new Error("Published Banking verification found a changed selected-work case receipt.");
    await emitJson({ task: 289, verified: true, edition: "uae/en", publishedRevisionId: live.published_revision_id, immutableMediaPins: references, preservedCases: membership(cases.rows) }, outputPath(destination, "banking-publication-verification.json"), write);
  } finally {
    await pool.end();
  }
}

main().catch((error) => { console.error(error instanceof Error ? error.message : error); process.exitCode = 1; });