import { createHash } from "node:crypto";
import { validateCmsSnapshot } from "@workspace/api-zod";

const args = process.argv.slice(2);
const shouldApply = args.includes("--apply-db");
const shouldVerify = args.includes("--verify-db");
const target = args.find((argument) => argument.startsWith("--target="))?.slice(9);
const PREFIX = "cms-office-baseline-v1";

export const baselineOffices = [
  {
    slug: "office-dubai",
    title: "Dubai",
    content: {
      schemaVersion: 1,
      city: "Dubai",
      address: "Office 1914, The Binary by Omniyat, Business Bay, PO Box 71515, Dubai, UAE",
      visibility: "public",
      order: 0,
      sources: [],
      relatedIds: [],
    },
  },
  {
    slug: "office-riyadh",
    title: "Riyadh",
    content: {
      schemaVersion: 1,
      city: "Riyadh",
      address: "Office 27, First Floor, 3483 Anas Bin Malik Road, Riyadh, Kingdom of Saudi Arabia",
      visibility: "public",
      order: 1,
      sources: [],
      relatedIds: [],
    },
  },
  {
    slug: "office-london",
    title: "London",
    content: {
      schemaVersion: 1,
      city: "London",
      address: "The City, United Kingdom",
      visibility: "public",
      order: 2,
      sources: [],
      relatedIds: [],
    },
  },
] as const;

interface SqlClient {
  query: (text: string, values?: unknown[]) => Promise<{ rowCount: number | null; rows: any[] }>;
}

function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

export function assertDevelopmentTarget(environment = process.env) {
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Office reconciliation is disabled in production.");
  }
  if (target !== "development") {
    throw new Error("Database work requires the explicit --target=development safeguard.");
  }
  if (!environment.DATABASE_URL) throw new Error("DATABASE_URL is required.");
}

async function reconcileOffice(
  client: SqlClient,
  actor: { id: string; email: string },
  office: (typeof baselineOffices)[number],
  apply: boolean,
) {
  const receiptKey = `${PREFIX}:${office.slug}`;
  const receipt = await client.query(
    "SELECT subject_id FROM cms_operation_receipts WHERE idempotency_key=$1",
    [receiptKey],
  );
  if (receipt.rowCount) return "preserved";

  const existing = await client.query(
    "SELECT id::text,kind FROM cms_documents WHERE canonical_slug=$1",
    [office.slug],
  );
  if (existing.rowCount) {
    if (existing.rows[0].kind !== "office") {
      throw new Error(`Refusing to adopt non-office CMS record ${office.slug}.`);
    }
    if (!apply) throw new Error(`Missing reconciliation receipt for existing office ${office.slug}.`);
    await client.query(
      `INSERT INTO cms_operation_receipts
        (idempotency_key,operation,subject_id,request_digest,result_digest)
       VALUES ($1,$2,$3,$4,$5)`,
      [receiptKey, PREFIX, existing.rows[0].id, digest(office), digest({ adopted: existing.rows[0].id })],
    );
    return "adopted";
  }
  if (!apply) throw new Error(`Missing baseline office ${office.slug}.`);

  const snapshot = {
    slug: office.slug,
    title: office.title,
    summary: null,
    content: office.content,
    seo: { noIndex: true },
    mediaIds: [],
    markets: ["uae"],
  };
  const validation = validateCmsSnapshot("office", snapshot, "publish");
  if (!validation.success) {
    throw new Error(`Invalid baseline office ${office.slug}: ${validation.errors.join("; ")}`);
  }
  const contentDigest = digest(validation.data);
  const document = await client.query(
    `INSERT INTO cms_documents (kind,canonical_slug,title,status,owner_id)
     VALUES ('office',$1,$2,'active',$3) RETURNING id::text`,
    [office.slug, office.title, actor.id],
  );
  const edition = await client.query(
    `INSERT INTO cms_market_editions
      (document_id,market,locale,localized_slug,publication_state,parity_complete)
     VALUES ($1,'uae','en',$2,'draft',true) RETURNING id::text`,
    [document.rows[0].id, office.slug],
  );
  const revision = await client.query(
    `INSERT INTO cms_revisions
      (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,
       created_by_user_id,approved_by_user_id,approved_at,reason)
     VALUES ($1,1,1,$2,$3,'approved',$4,$4,now(),$5) RETURNING id::text`,
    [
      edition.rows[0].id,
      validation.data,
      contentDigest,
      actor.id,
      "Approved baseline reconciliation of confirmed public office details.",
    ],
  );
  await client.query(
    `UPDATE cms_market_editions
        SET publication_state='published',published_revision_id=$2,published_at=now(),updated_at=now()
      WHERE id=$1`,
    [edition.rows[0].id, revision.rows[0].id],
  );
  await client.query(
    `INSERT INTO cms_operation_receipts
      (idempotency_key,operation,subject_id,request_digest,result_digest)
     VALUES ($1,$2,$3,$4,$5)`,
    [
      receiptKey,
      PREFIX,
      document.rows[0].id,
      digest(office),
      digest({ documentId: document.rows[0].id, editionId: edition.rows[0].id, revisionId: revision.rows[0].id }),
    ],
  );
  await client.query(
    `INSERT INTO cms_audit_events
      (actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.published','document',$3,$4,$5)`,
    [
      actor.id,
      actor.email,
      document.rows[0].id,
      receiptKey,
      { revisionId: revision.rows[0].id, reason: "Confirmed office baseline" },
    ],
  );
  return "published";
}

async function run(apply: boolean) {
  const { pool } = await import("@workspace/db");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const admins = await client.query(
      "SELECT id::text,email FROM cms_users WHERE role='administrator' AND status='active' ORDER BY created_at LIMIT 1",
    );
    if (!admins.rowCount) throw new Error("Office reconciliation requires an active CMS administrator.");
    const outcomes = [];
    for (const office of baselineOffices) {
      outcomes.push(`${office.title}:${await reconcileOffice(client, admins.rows[0], office, apply)}`);
    }
    if (apply) await client.query("COMMIT");
    else await client.query("ROLLBACK");
    console.log(`Verified governed offices: ${outcomes.join(" ")}${apply ? "" : " (rolled back)"}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function main() {
  if (!shouldApply && !shouldVerify) {
    console.log(JSON.stringify(baselineOffices, null, 2));
    console.error("Dry run: pass --apply-db or --verify-db with --target=development.");
    return;
  }
  assertDevelopmentTarget();
  await run(shouldApply);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}