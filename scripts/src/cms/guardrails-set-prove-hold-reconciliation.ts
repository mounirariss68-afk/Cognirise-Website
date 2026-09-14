/**
 * Reconciles the source-authorized Set, Prove & Hold successor without
 * modifying an editor's work, then optionally publishes it through the CMS
 * HTTP API. The database portion owns only its exact known predecessor; the
 * release transition is always made by an authenticated publisher request.
 */
import { createHash } from "node:crypto";
import { lstat, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { pool } from "@workspace/db";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { guardrailsSetProveHoldFixture } from "./guardrails-set-prove-hold.js";

type SqlClient = {
  query: (text: string, values?: unknown[]) => Promise<{
    rowCount: number | null;
    rows: Array<Record<string, any>>;
  }>;
};

type FixtureUser = {
  role: "administrator" | "editor";
  email: string;
  password: string;
  totpSecret: string;
};

type FixtureState = {
  version: 1;
  phase: "ready";
  users: FixtureUser[];
};

type PublisherCredentials = {
  email: string;
  password: string;
  totpSecret: string;
};

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const args = process.argv.slice(2);
const apply = args.includes("--apply-db");
const publish = args.includes("--publish");
const verify = args.includes("--verify-public");
const verifyPreview = args.includes("--verify-preview");
const target = args.find((argument) => argument.startsWith("--target="))?.slice("--target=".length);
const credentialsPath = args.find((argument) => argument.startsWith("--credentials="))?.slice("--credentials=".length);
const configuredApiBase = (args.find((argument) => argument.startsWith("--api-base="))?.slice("--api-base=".length)
  ?? process.env.CMS_API_BASE_URL
  ?? "http://localhost:80/api").replace(/\/+$/, "");
// Accept either an origin (http://localhost:80) or the commonly advertised
// API base (http://localhost:80/api); never concatenate /api/api.
const apiOrigin = configuredApiBase.replace(/\/api$/, "");
const apiPrefix = configuredApiBase.endsWith("/api") ? "/api" : "/api";

export const GUARDRAILS_SET_PROVE_HOLD_RECEIPT = "cms.guardrails.set-prove-hold-v1";
export const GUARDRAILS_SET_PROVE_HOLD_OPERATION = "cms.framework.guardrails-set-prove-hold-staged";
export const GUARDRAILS_SET_PROVE_HOLD_RELEASE_RECEIPT = "cms.guardrails.set-prove-hold-v1.release";
export const GUARDRAILS_SET_PROVE_HOLD_RELEASE_OPERATION = "cms.framework.guardrails-set-prove-hold-published";
const STAGING_AUTHOR_EMAIL = "cms-guardrails-set-prove-hold@service.invalid";
const STAGING_AUTHOR_LABEL = "CMS Guardrails Set, Prove & Hold reconciliation";
const LEGACY_RECEIPTS = [
  ["cms.guardrails.redesign-v1", "cms.framework.guardrails-redesign-staged"],
  ["cms.guardrails.page.stage-v1", "cms.framework.guardrails-page-staged"],
] as const;
const STAGING_REASON = "Set, Prove & Hold replacement staged from the supplied editorial source. Project-owner chat authorization approves this scoped replacement; publication remains an authenticated CMS action.";
const PUBLISH_NOTE = "Project-owner chat authorization: publish the scoped Set, Prove & Hold replacement for /methodologies/guardrails-framework. Legacy revision history is retained.";
export const guardrailsPublicationScope = Object.freeze({
  loginPath: "/api/auth/login",
  mfaPath: "/api/auth/mfa/verify",
  publishPath: "/api/documents/:documentId/publish",
  publicPath: "/api/public/content/uae/en/framework/guardrails-framework",
  requires: ["private-fixture-administrator", "totp-mfa", "csrf"] as const,
  publicationMechanism: "authenticated-cms-api" as const,
});

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

function digest(value: unknown): string {
  return createHash("sha256").update(canonical(value)).digest("hex");
}

export const guardrailsSetProveHoldSnapshot = {
  ...guardrailsSetProveHoldFixture,
  content: {
    ...guardrailsSetProveHoldFixture.content,
    // The replacement uses native diagrams and has no page-owned raster asset.
    // Do not carry the superseded revision's hero pin into this snapshot.
    visibility: "public" as const,
  },
};

export const guardrailsSetProveHoldSnapshotDigest = digest(guardrailsSetProveHoldSnapshot);
export const guardrailsSetProveHoldPublicProjectionDigest = digest({
  slug: guardrailsSetProveHoldSnapshot.slug,
  title: guardrailsSetProveHoldSnapshot.title,
  summary: guardrailsSetProveHoldSnapshot.summary,
  content: guardrailsSetProveHoldSnapshot.content,
  seo: guardrailsSetProveHoldSnapshot.seo,
});
const snapshotDigest = guardrailsSetProveHoldSnapshotDigest;
export function guardrailsSetProveHoldResultDigest(revisionId: string): string {
  return digest({ revisionId, snapshotDigest });
}
export function guardrailsSetProveHoldReleaseDigest(documentId: string, revisionId: string): string {
  return digest({ documentId, revisionId, snapshotDigest, authorization: PUBLISH_NOTE });
}

export function assertDevelopmentTarget(environment = process.env): void {
  if (target !== "development") {
    throw new Error("Guardrails replacement database work requires --target=development.");
  }
  if (environment.NODE_ENV === "production" || environment.REPLIT_DEPLOYMENT === "1") {
    throw new Error("Guardrails replacement reconciliation is disabled in production.");
  }
  if (!environment.DATABASE_URL) {
    throw new Error("DATABASE_URL is required for development reconciliation.");
  }
}

function isReplacementSnapshot(value: unknown): boolean {
  return canonical(value) === canonical(guardrailsSetProveHoldSnapshot);
}

async function stagingActor(client: SqlClient, allowCreate: boolean) {
  const current = await client.query(
    "SELECT id::text,email FROM cms_users WHERE email=$1 FOR UPDATE",
    [STAGING_AUTHOR_EMAIL],
  );
  if (current.rowCount === 1) return current.rows[0] as { id: string; email: string };
  if (!allowCreate) throw new Error("The controlled Set, Prove & Hold staging editor is missing.");
  const inserted = await client.query(
    `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
     VALUES ($1,$2,'editor','active',now()) RETURNING id::text,email`,
    [STAGING_AUTHOR_EMAIL, STAGING_AUTHOR_LABEL],
  );
  if (inserted.rowCount !== 1) throw new Error("Could not provision the controlled replacement staging editor.");
  return inserted.rows[0] as { id: string; email: string };
}

async function exactPredecessor(
  client: SqlClient,
  documentId: string,
  editionId: string,
): Promise<string | null> {
  const latest = await client.query(
    `SELECT r.id::text,r.payload,r.content_digest,
            d.id::text document_id,d.kind,d.status document_status,
            e.market,e.locale,e.localized_slug
       FROM cms_revisions r
       JOIN cms_market_editions e ON e.id=r.edition_id
       JOIN cms_documents d ON d.id=e.document_id
      WHERE r.edition_id=$1
      ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC LIMIT 1`,
    [editionId],
  );
  if (!latest.rowCount) return null;
  const receipts = await client.query(
    `SELECT idempotency_key,operation,subject_id::text,request_digest,result_digest
       FROM cms_operation_receipts
      WHERE idempotency_key=ANY($1::text[])`,
    [LEGACY_RECEIPTS.map(([key]) => key)],
  );
  const accepted = new Map(LEGACY_RECEIPTS);
  const predecessor = receipts.rows.find((receipt) =>
    accepted.get(receipt.idempotency_key) === receipt.operation
    && receipt.subject_id === latest.rows[0].id,
  );
  if (!predecessor) {
    throw new Error(
      `Refusing to replace revision ${latest.rows[0].id}: it is not the exact receipted Guardrails predecessor. Preserve that editorial work and use the CMS to reconcile it deliberately.`,
    );
  }
  const current = latest.rows[0];
  if (
    current.document_id !== documentId
    || current.kind !== "framework"
    || current.document_status !== "active"
    || current.market !== "uae"
    || current.locale !== "en"
    || current.localized_slug !== guardrailsSetProveHoldSnapshot.slug
    || typeof current.content_digest !== "string"
    || !/^[a-f0-9]{64}$/.test(current.content_digest)
    || digest(current.payload) !== current.content_digest
    || typeof predecessor.request_digest !== "string"
    || !/^[a-f0-9]{64}$/.test(predecessor.request_digest)
    || typeof predecessor.result_digest !== "string"
    || !/^[a-f0-9]{64}$/.test(predecessor.result_digest)
  ) {
    throw new Error("The receipted Guardrails predecessor no longer binds its exact document, edition, payload, and digest.");
  }
  return String(latest.rows[0].id);
}

export async function stageGuardrailsSetProveHold(
  client: SqlClient,
  allowCreate: boolean,
) {
  const validation = validateCmsSnapshot("framework", guardrailsSetProveHoldSnapshot, "publish");
  if (!validation.success) {
    throw new Error(`Set, Prove & Hold replacement violates publication validation: ${validation.errors.join("; ")}`);
  }
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest,response
       FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE`,
    [GUARDRAILS_SET_PROVE_HOLD_RECEIPT],
  );
  if (receipt.rowCount) {
    const stored = receipt.rows[0];
    if (
      receipt.rowCount !== 1
      || stored.operation !== GUARDRAILS_SET_PROVE_HOLD_OPERATION
      || stored.request_digest !== snapshotDigest
    ) {
      throw new Error("The Set, Prove & Hold replacement receipt conflicts with the approved source snapshot.");
    }
    const revision = await client.query(
      `SELECT r.id::text,r.edition_id::text,r.payload,r.content_digest,
              e.document_id::text,e.market,e.locale,e.localized_slug,
              d.canonical_slug,d.kind,d.status document_status
         FROM cms_revisions r
         JOIN cms_market_editions e ON e.id=r.edition_id
         JOIN cms_documents d ON d.id=e.document_id
        WHERE r.id=$1`,
      [stored.subject_id],
    );
    if (
      revision.rowCount !== 1
      || revision.rows[0].canonical_slug !== guardrailsSetProveHoldSnapshot.slug
      || revision.rows[0].kind !== "framework"
      || revision.rows[0].document_status !== "active"
      || revision.rows[0].market !== "uae"
      || revision.rows[0].locale !== "en"
      || revision.rows[0].localized_slug !== guardrailsSetProveHoldSnapshot.slug
      || revision.rows[0].content_digest !== snapshotDigest
      || !isReplacementSnapshot(revision.rows[0].payload)
      || stored.result_digest !== guardrailsSetProveHoldResultDigest(revision.rows[0].id)
    ) {
      throw new Error("The Set, Prove & Hold receipt no longer identifies its exact immutable successor.");
    }
    const latest = await client.query(
      `SELECT id::text FROM cms_revisions
        WHERE edition_id=$1
        ORDER BY revision_number DESC,created_at DESC,id DESC LIMIT 1`,
      [revision.rows[0].edition_id],
    );
    if (latest.rowCount !== 1 || latest.rows[0].id !== revision.rows[0].id) {
      // A human successor wins. The receipt still proves that our replacement
      // was staged, but replay must not turn an older revision back into the
      // active draft or mutate publication history.
      return {
        documentId: String(revision.rows[0].document_id),
        editionId: String(revision.rows[0].edition_id),
        revisionId: String(revision.rows[0].id),
        outcome: "preserved" as const,
      };
    }
    return {
      documentId: String(revision.rows[0].document_id),
      editionId: String(revision.rows[0].edition_id),
      revisionId: String(revision.rows[0].id),
      outcome: "replayed" as const,
    };
  }
  if (!allowCreate) throw new Error("The Set, Prove & Hold replacement receipt is absent.");

  const author = await stagingActor(client, true);
  const document = await client.query(
    `SELECT id::text,kind,status FROM cms_documents
      WHERE canonical_slug=$1 FOR UPDATE`,
    [guardrailsSetProveHoldSnapshot.slug],
  );
  let documentId: string;
  if (!document.rowCount) {
    const inserted = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,status,owner_id)
       VALUES ('framework',$1,$2,'active',$3) RETURNING id::text`,
      [guardrailsSetProveHoldSnapshot.slug, guardrailsSetProveHoldSnapshot.title, author.id],
    );
    documentId = String(inserted.rows[0].id);
  } else {
    if (
      document.rowCount !== 1
      || document.rows[0].kind !== "framework"
      || document.rows[0].status !== "active"
    ) {
      throw new Error("The Guardrails route is owned by a different or inactive document.");
    }
    documentId = String(document.rows[0].id);
  }
  const edition = await client.query(
    `SELECT id::text FROM cms_market_editions
      WHERE document_id=$1 AND market='uae' AND locale='en' FOR UPDATE`,
    [documentId],
  );
  let editionId: string;
  let predecessorId: string | null = null;
  if (!edition.rowCount) {
    const inserted = await client.query(
      `INSERT INTO cms_market_editions(document_id,market,locale,localized_slug,publication_state,fallback_mode,parity_complete)
       VALUES ($1,'uae','en',$2,'draft','none',false) RETURNING id::text`,
      [documentId, guardrailsSetProveHoldSnapshot.slug],
    );
    editionId = String(inserted.rows[0].id);
  } else {
    editionId = String(edition.rows[0].id);
    predecessorId = await exactPredecessor(client, documentId, editionId);
  }
  const revision = await client.query(
    `INSERT INTO cms_revisions
       (edition_id,revision_number,payload_version,payload,content_digest,workflow_state,created_by_user_id,source_revision_id,reason)
     SELECT $1,COALESCE(max(revision_number),0)+1,1,$2,$3,'draft',$4,$5,$6
       FROM cms_revisions WHERE edition_id=$1
     RETURNING id::text`,
    [editionId, guardrailsSetProveHoldSnapshot, snapshotDigest, author.id, predecessorId, STAGING_REASON],
  );
  if (revision.rowCount !== 1) throw new Error("Could not create the Set, Prove & Hold successor revision.");
  const revisionId = String(revision.rows[0].id);
  const resultDigest = guardrailsSetProveHoldResultDigest(revisionId);
  await client.query(
    `INSERT INTO cms_operation_receipts
       (idempotency_key,operation,subject_id,request_digest,result_digest,actor_user_id,response,status_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,201)`,
    [GUARDRAILS_SET_PROVE_HOLD_RECEIPT, GUARDRAILS_SET_PROVE_HOLD_OPERATION,
      revisionId, snapshotDigest, resultDigest, author.id,
      { documentId, editionId, revisionId, predecessorId, publicationState: "draft", mediaPins: [] }],
  );
  await client.query(
    `INSERT INTO cms_audit_events(actor_user_id,actor_label,action,target_type,target_id,request_id,metadata)
     VALUES ($1,$2,'document.replacement_staged','document',$3,$4,$5)`,
    [author.id, author.email, documentId, GUARDRAILS_SET_PROVE_HOLD_RECEIPT, {
      revisionId,
      predecessorId,
      source: "Set-Prove-Hold-AI-Guardrails-Framework_(1)_1789395806128.html",
      chatAuthorization: "Scoped project-owner publication authorization recorded per replit.md.",
      mediaPins: [],
    }],
  );
  return { documentId, editionId, revisionId, outcome: "staged" as const };
}

async function readPublisherCredentials(filePath: string | undefined): Promise<PublisherCredentials> {
  const configuredPath = filePath ?? process.env.CMS_GUARDRAILS_PUBLISHER_CREDENTIALS_FILE;
  if (!configuredPath) throw new Error("--credentials=... or CMS_GUARDRAILS_PUBLISHER_CREDENTIALS_FILE is required for authenticated CMS publication.");
  const resolved = path.resolve(configuredPath);
  const stats = await lstat(resolved);
  if (!stats.isFile() || (stats.mode & 0o777) !== 0o600) {
    throw new Error("Publisher credentials must be an owned regular mode-600 file.");
  }
  if (typeof process.getuid === "function" && stats.uid !== process.getuid()) {
    throw new Error("Publisher credentials must be owned by the current user.");
  }
  const state = JSON.parse(await readFile(resolved, "utf8")) as Partial<FixtureState> & Partial<PublisherCredentials>;
  const administrator = state.version === 1 && state.phase === "ready" && Array.isArray(state.users)
    ? state.users.find((user) => user.role === "administrator")
    : state;
  if (!administrator?.email || !administrator.password || !administrator.totpSecret) {
    throw new Error("Publisher credentials must provide an enrolled administrator email, password, and TOTP secret.");
  }
  const exactIdentity = process.env.CMS_GUARDRAILS_PUBLISHER_EMAIL;
  if (exactIdentity && administrator.email.toLowerCase() !== exactIdentity.toLowerCase()) {
    throw new Error("Publisher credentials do not match CMS_GUARDRAILS_PUBLISHER_EMAIL.");
  }
  return {
    email: administrator.email,
    password: administrator.password,
    totpSecret: administrator.totpSecret,
  };
}

function responseCookies(response: Response): string[] {
  const nodeHeaders = response.headers as Headers & { getSetCookie?: () => string[] };
  return nodeHeaders.getSetCookie?.()
    ?? (response.headers.get("set-cookie") ? [response.headers.get("set-cookie")!] : []);
}

async function authenticatedPublish(documentId: string, revisionId: string): Promise<void> {
  const publisher = await readPublisherCredentials(credentialsPath);
  const security = await import(
    pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/lib/security.ts")).href,
  ) as { totp(secret: string): string };
  const cookies = new Map<string, string>();
  const absorbCookies = (response: Response) => {
    for (const cookie of responseCookies(response)) {
      const [pair] = cookie.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  };
  const request = async (pathname: string, body: Record<string, unknown>) => {
    const response = await fetch(`${apiOrigin}${pathname}`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: apiOrigin,
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      },
      body: JSON.stringify(body),
    });
    absorbCookies(response);
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) throw new Error(`CMS ${pathname} failed (${response.status}): ${String(payload.error ?? "unknown error")}`);
    return payload as Record<string, any>;
  };
  const login = await request(guardrailsPublicationScope.loginPath, {
    email: publisher.email,
    password: publisher.password,
  });
  const challengeId = login.mfaChallenge?.id;
  if (typeof challengeId !== "string") throw new Error("CMS fixture administrator did not receive an MFA challenge.");
  const verified = await request(guardrailsPublicationScope.mfaPath, {
    challengeId,
    code: security.totp(publisher.totpSecret),
  });
  const csrfToken = verified.csrfToken;
  if (typeof csrfToken !== "string") throw new Error("CMS MFA verification did not issue a CSRF token.");
  const response = await fetch(`${apiOrigin}${apiPrefix}/documents/${documentId}/publish`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: apiOrigin,
      cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      "x-csrf-token": csrfToken,
    },
    body: JSON.stringify({ revisionId, note: PUBLISH_NOTE }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) {
    throw new Error(`CMS publication failed (${response.status}): ${String(payload.error ?? "unknown error")}`);
  }
}

/** Verifies protected preview in a fresh normal MFA session. Preview tokens
 * remain response-local: this routine never logs or persists them. */
async function verifyAuthenticatedPreview(documentId: string, revisionId: string): Promise<void> {
  const publisher = await readPublisherCredentials(credentialsPath);
  const security = await import(
    pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/lib/security.ts")).href,
  ) as { totp(secret: string): string };
  const cookies = new Map<string, string>();
  const post = async (pathname: string, body: Record<string, unknown>) => {
    const response = await fetch(`${apiOrigin}${pathname}`, {
      method: "POST",
      headers: { "content-type": "application/json", origin: apiOrigin },
      body: JSON.stringify(body),
    });
    for (const cookie of responseCookies(response)) {
      const [pair] = cookie.split(";", 1);
      const separator = pair.indexOf("=");
      if (separator > 0) cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
    const payload = await response.json().catch(() => ({})) as Record<string, any>;
    if (!response.ok) throw new Error(`CMS ${pathname} failed (${response.status}): ${String(payload.error ?? "unknown error")}`);
    return payload;
  };
  const login = await post(guardrailsPublicationScope.loginPath, { email: publisher.email, password: publisher.password });
  const challengeId = login.mfaChallenge?.id;
  if (typeof challengeId !== "string") throw new Error("CMS preview verification did not receive an MFA challenge.");
  await post(guardrailsPublicationScope.mfaPath, { challengeId, code: security.totp(publisher.totpSecret) });
  const response = await fetch(
    `${apiOrigin}${apiPrefix}/documents/${documentId}/preview?market=uae&locale=en&revisionId=${encodeURIComponent(revisionId)}`,
    {
      headers: {
        origin: apiOrigin,
        cookie: [...cookies].map(([name, value]) => `${name}=${value}`).join("; "),
      },
    },
  );
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(`CMS preview capability failed (${response.status}): ${String(payload.error ?? "unknown error")}`);
  if (
    response.headers.get("x-robots-tag")?.toLowerCase() !== "noindex, nofollow, noarchive"
    || payload.revisionId !== revisionId
    || payload.usedFallback !== false
    || !payload.document
    || digest(payload.document) !== guardrailsSetProveHoldSnapshotDigest
    || payload.document.mediaIds?.length !== 0
    || payload.document.heroMediaId !== undefined
  ) throw new Error("Protected preview did not return the exact noindex media-free Set, Prove & Hold replacement.");
}

async function replacementHasDurablePublicationAudit(documentId: string, revisionId: string): Promise<boolean> {
  const live = await pool.query(
    `SELECT 1
       FROM cms_market_editions e JOIN cms_revisions r ON r.edition_id=e.id
      WHERE e.document_id=$1 AND r.id=$2 AND e.published_revision_id=r.id
        AND e.publication_state='published'
        AND EXISTS (
          SELECT 1 FROM cms_audit_events audit
           WHERE audit.target_type='document' AND audit.target_id=e.document_id::text
             AND audit.action='document.published'
             AND audit.metadata->>'revisionId'=r.id::text
        )`,
    [documentId, revisionId],
  );
  return live.rowCount === 1;
}

/** Records publication evidence only after the normal API lifecycle's audit
 * proves the exact pointer transition. It never changes workflow or pointers. */
export async function recordGuardrailsReleaseReceipt(
  client: SqlClient,
  documentId: string,
  revisionId: string,
): Promise<"recorded" | "replayed"> {
  const requestDigest = guardrailsSetProveHoldReleaseDigest(documentId, revisionId);
  const receipt = await client.query(
    `SELECT operation,subject_id::text,request_digest,result_digest,response
       FROM cms_operation_receipts WHERE idempotency_key=$1 FOR UPDATE`,
    [GUARDRAILS_SET_PROVE_HOLD_RELEASE_RECEIPT],
  );
  if (receipt.rowCount) {
    const stored = receipt.rows[0];
    if (
      receipt.rowCount !== 1
      || stored.operation !== GUARDRAILS_SET_PROVE_HOLD_RELEASE_OPERATION
      || stored.subject_id !== revisionId
      || stored.request_digest !== requestDigest
      || !stored.response
      || stored.response.documentId !== documentId
      || stored.response.revisionId !== revisionId
      || stored.response.sourceAuthorization !== PUBLISH_NOTE
      || typeof stored.response.auditEventId !== "string"
      || stored.result_digest !== digest(stored.response)
    ) throw new Error("The Set, Prove & Hold publication receipt conflicts with the approved release.");
    return "replayed";
  }
  const published = await client.query(
    `SELECT e.published_revision_id::text
       FROM cms_market_editions e
      WHERE e.document_id=$1 AND e.published_revision_id=$2 AND e.publication_state='published'
      FOR UPDATE`,
    [documentId, revisionId],
  );
  const audit = await client.query(
    `SELECT id FROM cms_audit_events
      WHERE target_type='document' AND target_id=$1 AND action='document.published'
        AND metadata->>'revisionId'=$2
      ORDER BY occurred_at DESC LIMIT 1`,
    [documentId, revisionId],
  );
  if (published.rowCount !== 1 || audit.rowCount !== 1) {
    throw new Error("The authenticated CMS publication audit and exact public pointer are required before recording release evidence.");
  }
  const evidence = {
    documentId,
    revisionId,
    auditEventId: String(audit.rows[0].id),
    sourceAuthorization: PUBLISH_NOTE,
    mechanism: guardrailsPublicationScope.publicationMechanism,
  };
  await client.query(
    `INSERT INTO cms_operation_receipts
       (idempotency_key,operation,subject_id,request_digest,result_digest,response,status_code)
     VALUES ($1,$2,$3,$4,$5,$6,201)`,
    [GUARDRAILS_SET_PROVE_HOLD_RELEASE_RECEIPT, GUARDRAILS_SET_PROVE_HOLD_RELEASE_OPERATION,
      revisionId, requestDigest, digest(evidence), evidence],
  );
  return "recorded";
}

async function verifyPublic(revisionId: string, revisionNumber: number): Promise<void> {
  const response = await fetch(
    `${apiOrigin}${apiPrefix}/public/content/uae/en/framework/${guardrailsSetProveHoldSnapshot.slug}`,
  );
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(`Public replacement verification failed (${response.status}).`);
  if (
    payload.content?.contentVersion !== "set-prove-hold-v1"
    || payload.content?.template !== "guardrails"
    || payload.revision === undefined
    || payload.content?.heroMedia !== undefined
    || payload.content?.heroMediaId !== undefined
    || payload.usedFallback !== false
    || Number(payload.revision) !== revisionNumber
  ) {
    throw new Error("Public delivery did not return the exact Set, Prove & Hold media-free replacement.");
  }
  const publicProjection = {
    slug: payload.slug,
    title: payload.title,
    summary: payload.summary,
    content: payload.content,
    seo: payload.seo,
  };
  if (digest(publicProjection) !== guardrailsSetProveHoldPublicProjectionDigest) {
    throw new Error("Public delivery content differs from the digest-bound replacement projection.");
  }
  if (/\bUAE\b|Dubai|Abu Dhabi|PDPL|Arabic|Charter/i.test(JSON.stringify(payload.content))) {
    throw new Error("Public delivery retained UAE-specific editorial replacement content.");
  }
  if (
    payload.content.actions?.length !== guardrailsSetProveHoldSnapshot.content.actions.length
    || payload.content.references?.items?.length !== guardrailsSetProveHoldSnapshot.content.references.items.length
  ) {
    throw new Error("Public delivery omitted required replacement source content.");
  }
  // revisionId is deliberately not exposed on public routes. The queried
  // revision number and the complete public projection digest bind delivery to
  // the private, receipt-bound revision without exposing its UUID.
  if (!revisionId) throw new Error("The exact private revision identity is required for public verification.");
}

async function reconciliation(): Promise<void> {
  if (!apply && !publish && !verify && !verifyPreview) {
    process.stdout.write("Dry run only. Use --apply-db --target=development to stage; add --publish with fixture credentials for CMS publication.\n");
    return;
  }
  assertDevelopmentTarget();
  let staged: Awaited<ReturnType<typeof stageGuardrailsSetProveHold>> | null = null;
  if (apply) {
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [GUARDRAILS_SET_PROVE_HOLD_RECEIPT]);
      staged = await stageGuardrailsSetProveHold(client, true);
      await client.query("COMMIT");
      process.stdout.write(`Set, Prove & Hold replacement ${staged.outcome}: revision ${staged.revisionId}.\n`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  }
  if (publish || verify || verifyPreview) {
    const receipt = await pool.query(
      `SELECT subject_id::text FROM cms_operation_receipts
        WHERE idempotency_key=$1 AND operation=$2 AND request_digest=$3`,
      [GUARDRAILS_SET_PROVE_HOLD_RECEIPT, GUARDRAILS_SET_PROVE_HOLD_OPERATION, snapshotDigest],
    );
    if (receipt.rowCount !== 1) throw new Error("The exact replacement stage receipt is required before publication or public verification.");
    const revision = await pool.query(
      `SELECT e.document_id::text document_id,r.id::text revision_id,r.revision_number
         FROM cms_revisions r JOIN cms_market_editions e ON e.id=r.edition_id
        WHERE r.id=$1`,
      [receipt.rows[0].subject_id],
    );
    if (revision.rowCount !== 1) throw new Error("The replacement stage receipt points to no revision.");
    if (publish) {
      const exactDocumentId = String(revision.rows[0].document_id);
      const exactRevisionId = String(revision.rows[0].revision_id);
      if (!await replacementHasDurablePublicationAudit(exactDocumentId, exactRevisionId)) {
        await authenticatedPublish(exactDocumentId, exactRevisionId);
        process.stdout.write("Set, Prove & Hold replacement published through authenticated CMS API.\n");
      } else {
        process.stdout.write("Set, Prove & Hold replacement already has its exact durable API publication audit.\n");
      }
      const client = await pool.connect();
      try {
        await client.query("BEGIN");
        await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [GUARDRAILS_SET_PROVE_HOLD_RELEASE_RECEIPT]);
        const outcome = await recordGuardrailsReleaseReceipt(client, exactDocumentId, exactRevisionId);
        await client.query("COMMIT");
        process.stdout.write(`Set, Prove & Hold publication evidence ${outcome}.\n`);
      } catch (error) {
        await client.query("ROLLBACK").catch(() => undefined);
        throw error;
      } finally {
        client.release();
      }
    }
    if (verifyPreview) {
      await verifyAuthenticatedPreview(String(revision.rows[0].document_id), String(revision.rows[0].revision_id));
      process.stdout.write("Protected preview parity and noindex metadata verified.\n");
    }
    await verifyPublic(String(revision.rows[0].revision_id), Number(revision.rows[0].revision_number));
    process.stdout.write("Public CMS API verified the media-free Set, Prove & Hold replacement.\n");
  }
  await pool.end();
}

if (/guardrails-set-prove-hold-reconciliation\.(?:ts|js)$/.test(process.argv[1] ?? "")) {
  void reconciliation().catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : "Guardrails replacement reconciliation failed."}\n`);
    process.exitCode = 1;
  });
}