import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { resolve } from "node:path";

type PoolLike = {
  query<T = Record<string, unknown>>(sql: string, values?: unknown[]): Promise<{ rows: T[]; rowCount: number | null }>;
  end(): Promise<void>;
  options: { connectionString?: string };
};

function withSearchPath(databaseUrl: string, schema: string) {
  const url = new URL(databaseUrl);
  url.searchParams.set("options", `-csearch_path=${schema},public`);
  return url.toString();
}

async function clonePublicTables(admin: PoolLike, schema: string) {
  const tables = await admin.query<{ tablename: string }>(
    "SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname='public'",
  );
  for (const table of tables.rows) {
    const name = table.tablename.replace(/"/g, "\"\"");
    await admin.query(
      `CREATE TABLE "${schema}"."${name}" (LIKE public."${name}" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING INDEXES)`,
    );
  }
}

test("editorial review recovery preserves valid requests and reroutes only current blocked requests", {
  concurrency: false,
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSessionSecret = process.env.SESSION_SECRET;
  assert.ok(originalDatabaseUrl);
  const schema = `task345_recovery_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { pool: routePool } = await import("@workspace/db") as { pool: PoolLike };
  const PoolConstructor = routePool.constructor as unknown as new (options: { connectionString: string }) => PoolLike;
  const admin = new PoolConstructor({ connectionString: originalDatabaseUrl });
  const ids = {
    requester: randomUUID(),
    reviewer: randomUUID(),
    alternate: randomUUID(),
    manager: randomUUID(),
    document: randomUUID(),
    emptyDocument: randomUUID(),
    approvedDocument: randomUUID(),
    edition: randomUUID(),
    emptyEdition: randomUUID(),
    approvedEdition: randomUUID(),
    revision: randomUUID(),
    emptyRevision: randomUUID(),
    approvedRevision: randomUUID(),
  };
  const tokens = {
    requester: randomUUID(),
    reviewer: randomUUID(),
  };
  let server: { close(callback: (error?: Error) => void): void } | undefined;

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await clonePublicTables(admin, schema);
    await admin.query(`SET search_path TO "${schema}", public`);
    for (const migration of [
      "0032_cms_editorial_work.sql",
      "0033_cms_editorial_review_hardening.sql",
      "0034_cms_editorial_digest_delivery_identity.sql",
      "0035_cms_revision_accuracy_confirmations.sql",
      "0036_cms_review_request_accountability_snapshot.sql",
      "0037_cms_capability_matrix_access_projection.sql",
      "0038_cms_review_capability_reviewers.sql",
      "0039_cms_capability_matrix_configuration.sql",
      "0040_cms_legacy_administrator_market_snapshots.sql",
    ]) {
      await admin.query(await readFile(resolve(process.cwd(), `../../lib/db/migrations/${migration}`), "utf8"));
    }
    const marketId = randomUUID();
    await admin.query(
      `INSERT INTO market_editions(id,code,display_name,default_locale,enabled,is_canonical)
       VALUES ($1,'uae','United Arab Emirates','en',true,true)`,
      [marketId],
    );
    for (const [name, id, role, status] of [
      ["requester", ids.requester, "editor", "active"],
      ["reviewer", ids.reviewer, "publisher", "active"],
      ["alternate", ids.alternate, "publisher", "active"],
      ["manager", ids.manager, "administrator", "active"],
    ] as const) {
      await admin.query(
        `INSERT INTO cms_users(id,email,display_name,role,status)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, `${name}-${id}@example.test`, name, role, status],
      );
      await admin.query(
        `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
         VALUES ($1,'task345-fixture',1,now())`,
        [id],
      );
    }
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [ids.requester, (await import("../src/lib/security.ts")).hashToken(tokens.requester)],
    );
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [ids.reviewer, (await import("../src/lib/security.ts")).hashToken(tokens.reviewer)],
    );
    await admin.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code)
       VALUES ($1,'uae'),($2,'uae'),($3,'uae')`,
      [ids.requester, ids.reviewer, ids.alternate],
    );
    await admin.query(
      "INSERT INTO cms_user_capability_configurations(user_id) VALUES ($1)",
      [ids.requester],
    );
    await admin.query(
      `INSERT INTO cms_user_capability_grants(user_id,topic,capability,scope,market_code)
       VALUES ($1,'publication','view','regional','uae'),
              ($1,'publication','edit','regional','uae')`,
      [ids.requester],
    );

    const documents = [
      [ids.document, ids.edition, ids.revision, "recovery"],
      [ids.emptyDocument, ids.emptyEdition, ids.emptyRevision, "empty"],
      [ids.approvedDocument, ids.approvedEdition, ids.approvedRevision, "approved"],
    ] as const;
    for (const [documentId, editionId, revisionId, slug] of documents) {
      await admin.query(
        `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
         VALUES ($1,'publication',$2,$3,$4,'active')`,
        [documentId, `task345-${slug}-${documentId.slice(0, 8)}`, `Task 345 ${slug}`, ids.requester],
      );
      await admin.query(
        `INSERT INTO cms_market_editions(id,document_id,market,locale,localized_slug,publication_state,content_mode)
         VALUES ($1,$2,'uae','en',$3,'in-review','custom')`,
        [editionId, documentId, `task345-${slug}-${documentId.slice(0, 8)}`],
      );
      await admin.query(
        `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
         VALUES ($1,$2,1,'{}','task345-' || $3,'in-review',$4,'Task 345 recovery fixture')`,
        [revisionId, editionId, slug, ids.requester],
      );
    }

    routePool.options.connectionString = withSearchPath(originalDatabaseUrl, schema);
    process.env.DATABASE_URL = routePool.options.connectionString;
    process.env.SESSION_SECRET = "task-345-editorial-recovery-test-session-secret";
    const [{ default: app }, auth, security] = await Promise.all([
      import("../src/app.ts"),
      import("../src/lib/auth.ts"),
      import("../src/lib/security.ts"),
    ]);
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => (server as any).once("listening", resolve));
    const address = (server as any).address();
    assert.ok(address && typeof address !== "string");
    const origin = `http://127.0.0.1:${address.port}`;
    const headersFor = (token: string) => {
      const tokenHash = security.hashToken(token);
      const csrfToken = auth.csrfForSession(tokenHash);
      return {
        "content-type": "application/json",
        origin,
        cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrfToken}`,
        "x-csrf-token": csrfToken,
      };
    };
    const request = (path: string, method: string, body: unknown, token = tokens.requester) =>
      fetch(`${origin}${path}`, {
        method,
        headers: headersFor(token),
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const json = async <T>(response: Response, status: number, label: string) => {
      const text = await response.text();
      assert.equal(response.status, status, `${label}: ${text}`);
      return JSON.parse(text) as T;
    };

    const first = await json<{ reviewRequest: { id: string; reviewerId: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revision}/request-review`, "POST", {
        reviewerId: ids.reviewer,
      }),
      201,
      "create exact review request",
    );
    const retry = await json<{ reviewRequest: { id: string; reviewerId: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revision}/request-review`, "POST", {}),
      200,
      "valid open request is idempotent",
    );
    assert.deepEqual(retry.reviewRequest, first.reviewRequest);
    assert.equal(
      (await admin.query("SELECT count(*)::text count FROM cms_review_requests WHERE revision_id=$1", [ids.revision])).rows[0].count,
      "1",
    );

    await admin.query("UPDATE cms_users SET status='suspended' WHERE id=$1", [ids.reviewer]);
    const myWork = await json<{ items: Array<{
      reviewRequest?: { id: string; status: string; requesterId: string } | null;
      status: string;
      blockedReason: string | null;
      reviewRevisionId: string | null;
      currentRevisionId: string | null;
    }> }>(
      await request("/api/editorial-work/my", "GET", undefined),
      200,
      "edit-only requester discovers blocked review recovery in My Work",
    );
    const recoveryItem = myWork.items.find((item) => item.reviewRequest?.id === first.reviewRequest.id);
    assert.equal(recoveryItem?.status, "blocked");
    assert.match(recoveryItem?.blockedReason ?? "", /reviewer is unavailable/);
    assert.equal(recoveryItem?.reviewRevisionId, ids.revision);
    assert.equal(recoveryItem?.currentRevisionId, ids.revision);
    const rerouted = await json<{ reviewRequest: { id: string; reviewerId: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revision}/request-review`, "POST", {}),
      200,
      "revoked reviewer is rerouted transactionally",
    );
    assert.equal(rerouted.reviewRequest.id, first.reviewRequest.id);
    assert.equal(rerouted.reviewRequest.reviewerId, ids.alternate);
    assert.equal(
      (await admin.query(
        `SELECT count(*)::text count FROM cms_editorial_notifications
          WHERE review_request_id=$1 AND user_id=$2 AND type='review-requested'`,
        [first.reviewRequest.id, ids.alternate],
      )).rows[0].count,
      "1",
    );
    assert.equal(
      (await admin.query(
        `SELECT count(*)::text count FROM cms_audit_events
          WHERE action='editorial.review_rerouted' AND target_id=$1`,
        [first.reviewRequest.id],
      )).rows[0].count,
      "1",
    );

    await admin.query(
      "UPDATE cms_users SET status='suspended' WHERE id IN ($1,$2,$3)",
      [ids.alternate, ids.reviewer, ids.manager],
    );
    await json(
      await request(`/api/editorial-work/revisions/${ids.emptyRevision}/request-review`, "POST", {}),
      409,
      "empty eligible pool returns an actionable conflict",
    );

    await json(
      await request(`/api/editorial-work/revisions/${ids.approvedRevision}/request-review`, "POST", {
        reviewerId: ids.manager,
      }),
      409,
      "a reviewer without exact access cannot be selected",
    );
    await admin.query("UPDATE cms_users SET status='active' WHERE id=$1", [ids.alternate]);
    const approvedRequest = await json<{ reviewRequest: { id: string } }>(
      await request(`/api/editorial-work/revisions/${ids.approvedRevision}/request-review`, "POST", {
        reviewerId: ids.alternate,
      }),
      201,
      "create request for approval immutability check",
    );
    await json(
      await request(`/api/editorial-work/review-requests/${approvedRequest.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, tokens.requester),
      403,
      "requester cannot decide its own exact review",
    );
    await admin.query("UPDATE cms_users SET status='active' WHERE id=$1", [ids.reviewer]);
    const reviewerSession = randomUUID();
    await admin.query(
      `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
       VALUES ($1,$2,now(),now()+interval '1 hour')`,
      [ids.alternate, security.hashToken(reviewerSession)],
    );
    await json(
      await request(`/api/editorial-work/review-requests/${approvedRequest.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, reviewerSession),
      200,
      "reviewer approves exact revision",
    );
    await json(
      await request(`/api/editorial-work/revisions/${ids.approvedRevision}/request-review`, "POST", {}),
      409,
      "approved request cannot be rerouted",
    );
  } finally {
    if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
    await routePool.end();
    await admin.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`).catch(() => undefined);
    await admin.end();
    if (originalDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalDatabaseUrl;
    if (originalSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = originalSessionSecret;
  }
});