import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { collectCmsMediaReferences, validateCmsSnapshot } from "@workspace/api-zod";
import { canonicalResultDigest } from "./migration.js";
import { emitJson, outputPath, repositoryRoot } from "./common.js";
import { bankingMediaManifest } from "./banking-media-manifest.js";

const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const write = args.includes("--write");
const reportConflict = args.includes("--report-conflict");
const target = args.find((item) => item.startsWith("--target="))?.slice(9);
const destination = args.find((item) => item.startsWith("--out="))?.slice(6);
const baselinePath = args.find((item) => item.startsWith("--baseline="))?.slice(11)
  ?? path.join(repositoryRoot, "scripts/cms/output/banking-published-baseline.json");
const RECEIPT_PREFIX = "cms-banking-pov-v1-successor:";

const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const normalized = canonicalResultDigest;

function baselineCaseMembership(baseline: Record<string, any>) {
  return (baseline.cases as Array<any>).map((item) => ({
    slug: item.canonical_slug,
    title: item.payload?.title ?? item.payload?.content?.title,
    order: Number(item.payload?.content?.order ?? 0),
    digest: item.content_digest,
  }));
}

function inheritedHeroPin(baseline: Record<string, any>, page: Record<string, any>) {
  const heroMediaId = page.payload?.content?.heroMediaId;
  const altText = page.payload?.content?.heroMedia?.altText ?? page.payload?.content?.imageAlt;
  const pin = (baseline.immutableMediaPins as Array<any> | undefined)?.find((item) =>
    item.document_id === page.document_id
    && item.field_path === `revision:${page.published_revision_id}`
    && item.asset_id === heroMediaId,
  );
  if (!heroMediaId || typeof altText !== "string" || !altText.trim() || !pin?.media_version_id
    || typeof pin.checksum !== "string" || !Number.isFinite(Number(pin.byte_size))) {
    throw new Error("Baseline lacks the published Financial Services hero's immutable version pin and descriptive alt text.");
  }
  return {
    mediaId: heroMediaId,
    mediaVersionId: pin.media_version_id,
    role: "hero" as const,
    altText,
    checksum: pin.checksum,
    byteSize: Number(pin.byte_size),
  };
}

async function loadBankingPov() {
  const moduleUrl = pathToFileURL(path.join(repositoryRoot, "artifacts/cognirise-website/src/content/banking.ts")).href;
  const loaded = await import(moduleUrl) as { bankingPov?: unknown };
  if (!loaded.bankingPov) throw new Error("Website banking content must export named bankingPov before a CMS successor can be prepared.");
  return loaded.bankingPov;
}

export async function bindReceiptMedia(canonicalPov: unknown) {
  const receiptPath = path.join(repositoryRoot, "scripts/cms/output/banking-media-import-receipt.json");
  const receipt = JSON.parse(await readFile(receiptPath, "utf8")) as {
    media?: Array<{ id?: unknown; sourceFile?: unknown; checksum?: unknown; assetId?: unknown; mediaVersionId?: unknown }>;
  };
  if (!Array.isArray(receipt.media)) throw new Error("Banking media import receipt is unavailable; run the exact media importer before successor setup.");
  const pins = new Map<string, { mediaId: string; mediaVersionId: string; role: "supporting"; altText: string }>();
  for (const expected of bankingMediaManifest) {
    const actual = receipt.media.find((item) => item.id === expected.id);
    if (!actual || actual.sourceFile !== expected.sourceFile || actual.checksum !== expected.checksum
      || typeof actual.assetId !== "string" || typeof actual.mediaVersionId !== "string") {
      throw new Error(`Banking media receipt does not provide the verified source/checksum pin for ${expected.id}.`);
    }
    pins.set(expected.id, {
      mediaId: actual.assetId, mediaVersionId: actual.mediaVersionId, role: "supporting", altText: expected.altText,
    });
  }
  if (!canonicalPov || typeof canonicalPov !== "object" || Array.isArray(canonicalPov)) {
    throw new Error("Canonical bankingPov is not an object.");
  }
  const pov = structuredClone(canonicalPov) as Record<string, any>;
  const pointPins: Record<string, string> = {
    "core-banking-operations": "core-banking-operations",
    "contact-centre": "contact-centre",
    "software-delivery": "software-delivery",
    "marketing-intelligence": "marketing-intelligence",
  };
  if (!Array.isArray(pov.startingPoints) || !pov.productionReadiness) throw new Error("Canonical bankingPov has no media-bearing sections.");
  for (const point of pov.startingPoints) {
    const key = pointPins[point?.id];
    if (!key) throw new Error(`Unexpected Banking starting-point ID in canonical content: ${String(point?.id)}.`);
    point.image = pins.get(key);
  }
  pov.productionReadiness.image = pins.get("production-readiness-gate");
  return pov;
}

export function bankingSuccessorReceiptKey(
  page: { edition_id: string; published_revision_id: string; content_digest: string },
  candidateDigest: string,
) {
  return `${RECEIPT_PREFIX}${page.edition_id}:${page.published_revision_id}:${page.content_digest}:${candidateDigest}`;
}

async function main() {
  const stored = JSON.parse(await readFile(baselinePath, "utf8")) as Record<string, any>;
  const { digest: baselineDigest, ...baseline } = stored;
  if (!baselineDigest || digest(baseline) !== baselineDigest || !Array.isArray(baseline.page) || !Array.isArray(baseline.cases)) {
    throw new Error("Banking baseline receipt is missing or digest-invalid; take a new read-only snapshot before mutation.");
  }
  const page = baseline.page.find((item: any) => item.market === "uae" && item.locale === "en");
  if (!page?.published_revision_id || page.publication_state !== "published" || page.workflow_state !== "approved") {
    throw new Error("Banking baseline has no approved UAE/en Financial Services publication.");
  }
  const bankingPov = await bindReceiptMedia(await loadBankingPov());
  const expectedCases = baselineCaseMembership(baseline);
  const heroPin = inheritedHeroPin(baseline, page);
  if (normalized((bankingPov as any).caseMembershipSnapshot) !== normalized(expectedCases)) {
    throw new Error("Canonical Banking POV caseMembershipSnapshot does not exactly match the pre-mutation public case receipt.");
  }
  const existingSources: unknown[] = [];
  const existingSourceUrls = new Set(existingSources.flatMap((source: unknown) =>
    source && typeof source === "object" && typeof (source as { url?: unknown }).url === "string"
      ? [(source as { url: string }).url]
      : []
  ));
  const bankingSourceTrail = (bankingPov as { evidenceSignals?: unknown[] }).evidenceSignals ?? [];
  const appendedSources = bankingSourceTrail.flatMap((source) => {
    if (!source || typeof source !== "object") return [];
    const evidence = source as Record<string, unknown>;
    if (typeof evidence.url !== "string" || existingSourceUrls.has(evidence.url)) return [];
    existingSourceUrls.add(evidence.url);
    return [{
      label: evidence.label,
      publisher: evidence.publisher,
      kind: evidence.kind,
      url: evidence.url,
      accessedAt: evidence.accessedAt,
      market: (bankingPov as { market?: unknown }).market,
    }];
  });
  const narrative = bankingPov as Record<string, any>;
  const unvalidatedPayload = {
    ...page.payload,
    summary: narrative.hero.body,
    seo: {
      ...page.payload.seo,
      title: "Banking AI | One bank. Three levels of AI value. | Cognirise",
      description: narrative.hero.body,
    },
    content: {
      ...page.payload.content,
      thesis: narrative.hero.heading,
      accent: "Three levels of AI value.",
      dek: narrative.hero.body,
      opportunity: "Create employee capacity, improve service and growth, and shorten workflows while measuring quality, exceptions and control together.",
      capabilities: narrative.valueDomains.map((domain: any) => ({ title: domain.title, body: domain.purpose })),
      pressures: narrative.valueOutcomes.map((outcome: any) => ({ title: outcome.title, body: outcome.body })),
      reversal: { title: "Start with a workflow, not an autonomy target.", body: narrative.adoptionLevels[2].decisionBoundary },
      myth: { claim: "“Every banking workflow should become autonomous.”", verdict: narrative.adoptionLevels[2].readiness.join(" ") },
      gcc: narrative.evidenceSignals.find((signal: any) => signal.jurisdiction === "UAE")?.statement ?? page.payload.content.gcc,
      service: { label: "Value Scan", href: narrative.cta.href, firstMove: narrative.cta.heading },
      uses: narrative.startingPoints.map((point: any) => ({ use: point.title, evidence: point.firstDeliverable, boundary: point.decisionBoundary })),
      sources: appendedSources,
      // Preserve the published hero's approved immutable lineage. Legacy
      // heroMediaId alone cannot resolve a version in a draft preview.
      heroMediaId: heroPin.mediaId,
      heroMedia: {
        mediaId: heroPin.mediaId,
        mediaVersionId: heroPin.mediaVersionId,
        role: heroPin.role,
        altText: heroPin.altText,
      },
      bankingPov,
    },
  };
  const draftValidation = validateCmsSnapshot("industry", unvalidatedPayload, "draft");
  if (!draftValidation.success) throw new Error(`Canonical Banking POV draft is invalid: ${draftValidation.errors.join("; ")}`);
  // Persist schema-normalized content and the complete raw mediaIds array,
  // rather than the pre-validation object. CMS delivery resolves raw IDs as
  // well as immutable reference objects.
  const nextPayload = draftValidation.data;
  const draftDigest = canonicalResultDigest(nextPayload);
  // Snapshot timestamps are evidence, not idempotency material. This identity
  // remains stable when the same published UAE/en revision is re-snapshotted.
  const receiptKey = bankingSuccessorReceiptKey(page, draftDigest);
  const plan = {
    task: 289, mode: apply ? "apply" : "dry-run", baselineDigest, receiptKey,
    documentId: page.document_id, editionId: page.edition_id, publishedRevisionId: page.published_revision_id,
    candidateDigest: draftDigest, preservedCaseCount: expectedCases.length,
    action: "append-draft-for-editorial-review-only",
    publication: "No publication occurs here. CMS review, approved immutable media, and the established publisher procedure remain mandatory.",
    securePreview: `An authorized editor may create a scoped UAE/en preview using GET /api/documents/${page.document_id}/preview?market=uae&locale=en&revisionId={draftRevisionId}; preview tokens are deliberately never written to this receipt.`,
  };
  if (!apply) {
    await emitJson(plan, outputPath(destination, "banking-successor-plan.json"), write);
    return;
  }
  if (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1" || target !== "development") {
    throw new Error("Banking successor reconciliation is development-only and requires --target=development.");
  }
  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required.");
  const { pool } = await import("@workspace/db");
  try {
    await pool.query("BEGIN");
    await pool.query("SELECT pg_advisory_xact_lock(hashtext($1))", [receiptKey]);
    const livePage = await pool.query(
      `SELECT e.id::text edition_id,e.publication_state,e.published_revision_id::text,r.id::text revision_id,
              r.revision_number,r.workflow_state,r.content_digest,r.payload
         FROM cms_market_editions e JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE e.id=$1 FOR UPDATE OF e,r`,
      [page.edition_id],
    );
    const live = livePage.rows[0];
    if (!live || live.publication_state !== "published" || live.published_revision_id !== page.published_revision_id
      || live.workflow_state !== "approved" || live.content_digest !== page.content_digest || normalized(live.payload) !== normalized(page.payload)) {
      throw new Error("Financial Services has changed since the baseline snapshot; preserving newer editorial work.");
    }
    const prior = await pool.query(
      `SELECT o.subject_id,o.result_digest FROM cms_operation_receipts o
        JOIN cms_revisions r ON r.id::text=o.subject_id
       WHERE o.idempotency_key=$1
          OR (o.operation='cms.banking-pov.successor-draft' AND o.result_digest=$2 AND r.edition_id=$3)
       ORDER BY CASE WHEN o.idempotency_key=$1 THEN 0 ELSE 1 END, o.created_at DESC LIMIT 1`,
      [receiptKey, draftDigest, page.edition_id],
    );
    if (prior.rows[0]) {
      const revision = await pool.query(`SELECT payload,workflow_state FROM cms_revisions WHERE id=$1`, [prior.rows[0].subject_id]);
      if (!revision.rows[0] || !["draft", "in-review", "approved"].includes(revision.rows[0].workflow_state)
        || canonicalResultDigest(revision.rows[0].payload) !== draftDigest || prior.rows[0].result_digest !== draftDigest) {
        throw new Error("Banking successor receipt conflicts with its review draft.");
      }
      await pool.query("COMMIT");
      await emitJson({ ...plan, disposition: "replayed", draftRevisionId: prior.rows[0].subject_id,
        securePreviewRequest: `/api/documents/${page.document_id}/preview?market=uae&locale=en&revisionId=${prior.rows[0].subject_id}`,
      }, outputPath(destination, "banking-successor-receipt.json"), write);
      return;
    }
    const latest = await pool.query(
      `SELECT id::text,revision_number,workflow_state FROM cms_revisions WHERE edition_id=$1 ORDER BY revision_number DESC LIMIT 1`,
      [page.edition_id],
    );
    if (!latest.rows[0]) throw new Error("Financial Services has no revision chain.");
    if (latest.rows[0].id !== page.published_revision_id || latest.rows[0].workflow_state !== "approved") {
      // Exact generated candidates have already replayed above. A different
      // candidate is a competing draft, even if its old receipt is intact.
      throw new Error("Financial Services has a newer draft/review revision; preserving editorial authority.");
    }
    const liveCases = await pool.query(
      `SELECT d.canonical_slug,r.content_digest,r.payload
         FROM cms_documents d JOIN cms_market_editions e ON e.document_id=d.id JOIN cms_revisions r ON r.id=e.published_revision_id
        WHERE d.kind='case-study' AND e.publication_state='published' AND r.workflow_state='approved'
          AND e.market=$1 AND e.locale=$2
          AND COALESCE(r.payload->'content'->>'visibility','public')='public'
          AND COALESCE(r.payload->'content'->>'disclosure','restricted')<>'restricted'
          AND COALESCE(r.payload->'content'->'relatedIndustries','[]'::jsonb) ? 'financial-services'
        ORDER BY e.market,e.locale,(r.payload->'content'->>'order')::int,d.canonical_slug`,
      [page.market, page.locale],
    );
    const actualCases = liveCases.rows.map((item) => ({ slug: item.canonical_slug, title: item.payload?.title ?? item.payload?.content?.title, order: Number(item.payload?.content?.order ?? 0), digest: item.content_digest }));
    if (normalized(actualCases) !== normalized(expectedCases)) throw new Error("The published Financial Services case set changed since the baseline; no successor was written.");
    const references = collectCmsMediaReferences("industry", nextPayload.content, nextPayload.mediaIds ?? []);
    const required = references.filter((reference) => reference.fieldPath.startsWith("content.bankingPov."));
    if (required.length !== 5 || required.some((reference) => !reference.mediaVersionId)) throw new Error("Banking successor requires all five immutable media pins.");
    const inheritedHero = references.find((reference) => reference.fieldPath === "content.heroMedia");
    if (!inheritedHero || inheritedHero.mediaId !== heroPin.mediaId || inheritedHero.mediaVersionId !== heroPin.mediaVersionId) {
      throw new Error("Banking successor did not retain the published Financial Services hero version pin.");
    }
    const verifiedHero = await pool.query(
      `SELECT a.id FROM cms_media_assets a JOIN cms_media_versions v ON v.id=$2 AND v.asset_id=a.id
        WHERE a.id=$1 AND a.status='active' AND v.storage_key NOT LIKE 'deferred/%'
          AND v.checksum=$3 AND v.byte_size=$4`,
      [heroPin.mediaId, heroPin.mediaVersionId, heroPin.checksum, heroPin.byteSize],
    );
    if (!verifiedHero.rowCount) throw new Error("Published Financial Services hero is not an approved byte-exact immutable pin.");
    for (const reference of required) {
      const manifest = reference.fieldPath.endsWith("productionReadiness.image")
        ? bankingMediaManifest.find((entry) => entry.id === "production-readiness-gate")
        : bankingMediaManifest.find((entry) => entry.id === narrative.startingPoints[Number(reference.fieldPath.match(/startingPoints\.(\d+)/)?.[1])]?.id);
      if (!manifest) throw new Error(`Unknown Banking media field: ${reference.fieldPath}.`);
      const verified = await pool.query(
        `SELECT a.id FROM cms_media_assets a JOIN cms_media_versions v ON v.id=$2 AND v.asset_id=a.id
           WHERE a.id=$1 AND a.status IN ('pending-review','active') AND v.storage_key NOT LIKE 'deferred/%'
             AND v.checksum=$3 AND v.byte_size=$4`,
        [reference.mediaId, reference.mediaVersionId, manifest.checksum, manifest.byteSize],
      );
      if (!verified.rowCount) throw new Error(`Banking media is not an exact immutable CMS pin: ${reference.fieldPath}.`);
    }
    const author = await pool.query(
      `INSERT INTO cms_users(email,display_name,role,status) VALUES
       ('cms-banking-pov-successor@service.invalid','Banking POV successor service','viewer','suspended')
       ON CONFLICT(email) DO UPDATE SET display_name=EXCLUDED.display_name
       RETURNING id::text`,
    );
    const inserted = await pool.query(
      `INSERT INTO cms_revisions(edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES($1,$2,1,$3,$4,'draft',$5,'Task 289 Banking POV successor; pending editorial review')
       RETURNING id::text`,
      [page.edition_id, Number(latest.rows[0].revision_number) + 1, nextPayload, draftDigest, author.rows[0].id],
    );
    const revisionId = inserted.rows[0].id;
    const revisionPins = new Map<string, (typeof references)[number]>();
    for (const reference of references) {
      const previous = revisionPins.get(reference.mediaId);
      if (previous?.mediaVersionId && reference.mediaVersionId && previous.mediaVersionId !== reference.mediaVersionId) {
        throw new Error(`Conflicting versions for Banking revision media ${reference.mediaId}.`);
      }
      if (!previous || reference.mediaVersionId) revisionPins.set(reference.mediaId, reference);
    }
    for (const reference of revisionPins.values()) {
      await pool.query(`INSERT INTO cms_media_references(asset_id,media_version_id,document_id,field_path) VALUES($1,$2,$3,$4)`, [reference.mediaId, reference.mediaVersionId, page.document_id, `revision:${revisionId}`]);
    }
    await pool.query(`INSERT INTO cms_operation_receipts(idempotency_key,operation,subject_id,request_digest,result_digest) VALUES($1,'cms.banking-pov.successor-draft',$2,$3,$4)`, [receiptKey, revisionId, baselineDigest, draftDigest]);
    await pool.query(`INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata) VALUES($1,'cms-banking-pov-successor','cms.banking-pov.successor-draft','industry',$2,$3,$4)`, [author.rows[0].id, page.document_id, receiptKey, { baselineDigest, draftRevisionId: revisionId, caseCount: expectedCases.length, publish: false }]);
    await pool.query("COMMIT");
    await emitJson({ ...plan, disposition: "created-draft", draftRevisionId: revisionId, immutablePins: required,
      securePreviewRequest: `/api/documents/${page.document_id}/preview?market=uae&locale=en&revisionId=${revisionId}`,
    }, outputPath(destination, "banking-successor-receipt.json"), write);
  } catch (error) {
    await pool.query("ROLLBACK");
    throw error;
  } finally {
    await pool.end();
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(async (error) => {
    const message = error instanceof Error ? error.message : String(error);
    if (reportConflict) {
      // A post-merge hook must surface an editorial conflict without turning
      // every later, unrelated merge into an unsafe retry or a failed merge.
      // Direct reconciliation remains fail-closed.
      await emitJson({
        task: 289,
        mode: apply ? "apply" : "dry-run",
        disposition: "preserved-conflict",
        error: message,
        action: "No Banking draft, publication pointer, media pin, or editorial revision was overwritten.",
      }, outputPath(destination, "banking-successor-receipt.json"), true);
      console.error(`Banking successor preserved existing editorial state: ${message}`);
      return;
    }
    console.error(message);
    process.exitCode = 1;
  });
}