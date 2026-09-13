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

test("Task 322 editorial routes enforce reassignment, SoD, approval publishing, and revoked access", {
  concurrency: false,
  skip: !process.env.DATABASE_URL && "DATABASE_URL is not available",
}, async () => {
  const originalDatabaseUrl = process.env.DATABASE_URL;
  const originalSessionSecret = process.env.SESSION_SECRET;
  assert.ok(originalDatabaseUrl);
  const schema = `task322_editorial_${randomUUID().replaceAll("-", "").slice(0, 20)}`;
  const { pool: routePool } = await import("@workspace/db") as { pool: PoolLike };
  const PoolConstructor = routePool.constructor as unknown as new (options: { connectionString: string }) => PoolLike;
  const admin = new PoolConstructor({ connectionString: originalDatabaseUrl });
  let server: { close(callback: (error?: Error) => void): void } | undefined;
  const ids = {
    administrator: randomUUID(), editor: randomUUID(), reviewerOne: randomUUID(),
    reviewerTwo: randomUUID(), reviewerThree: randomUUID(), document: randomUUID(),
    edition: randomUUID(), revisionOne: randomUUID(), revisionTwo: randomUUID(), revisionThree: randomUUID(),
    unassignedDocument: randomUUID(), unassignedEdition: randomUUID(), uae: randomUUID(),
    media: randomUUID(), mediaVersion: randomUUID(),
  };
  const tokens = Object.fromEntries(
    ["administrator", "editor", "reviewerOne", "reviewerTwo", "reviewerThree"].map((key) => [key, randomUUID()]),
  ) as Record<"administrator" | "editor" | "reviewerOne" | "reviewerTwo" | "reviewerThree", string>;
  const snapshot = {
    slug: `task-322-${ids.document.slice(0, 8)}`,
    title: "Task 322 editorial approval",
    summary: null,
    content: {
      schemaVersion: 1, variant: "article", teaser: "Editorial workflow route fixture.",
      body: [{ type: "paragraph", text: "This is a complete publication route fixture." }],
      author: "Task 322", publicationDate: "2026-10-01", readingTimeMinutes: 3,
      topics: ["governance"], sectors: [], platformIds: [],
      heroMedia: {
        mediaId: ids.media, mediaVersionId: ids.mediaVersion, role: "hero",
        altText: "Task 322 governed image",
      },
      visibility: "public", order: 1,
      sources: [{ label: "Task 322 fixture", url: "https://example.com/task-322", accessedAt: "2026-10-01" }],
      verificationDate: "2026-10-01", reviewDate: "2027-01-01", relatedIds: [],
    },
    mediaIds: [ids.media], markets: ["uae"],
  };

  try {
    await admin.query(`CREATE SCHEMA "${schema}"`);
    await clonePublicTables(admin, schema);
    await admin.query(`SET search_path TO "${schema}", public`);
    const migration0032 = await readFile(resolve(process.cwd(), "../../lib/db/migrations/0032_cms_editorial_work.sql"), "utf8");
    const migration0033 = await readFile(resolve(process.cwd(), "../../lib/db/migrations/0033_cms_editorial_review_hardening.sql"), "utf8");
    await admin.query(migration0032);
    await admin.query(migration0033);

    const security = await import("../src/lib/security.ts");
    for (const [key, role] of [
      ["administrator", "administrator"], ["editor", "editor"], ["reviewerOne", "administrator"],
      ["reviewerTwo", "administrator"], ["reviewerThree", "publisher"],
    ] as const) {
      await admin.query(
        `INSERT INTO cms_users(id,email,display_name,role,status)
         VALUES ($1,$2,$3,$4,'active')`,
        [ids[key], `${key}-${ids[key]}@example.test`, key, role],
      );
      await admin.query(
        `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
         VALUES ($1,'task322-fixture',1,now())`,
        [ids[key]],
      );
      await admin.query(
        `INSERT INTO cms_sessions(user_id,token_digest,mfa_satisfied_at,expires_at)
         VALUES ($1,$2,now(),now()+interval '1 hour')`,
        [ids[key], security.hashToken(tokens[key])],
      );
    }
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'uae'),($2,'uae')",
      [ids.editor, ids.reviewerThree],
    );
    await admin.query(
      `INSERT INTO market_editions(id,code,display_name,default_locale,enabled,is_canonical)
       VALUES ($1,'uae','United Arab Emirates','en',true,true)`,
      [ids.uae],
    );
    await admin.query(
      `INSERT INTO cms_media_assets(id,storage_key,filename,original_filename,media_type,byte_size,checksum,alt_text,collection,status,uploaded_by_user_id)
       VALUES ($1,$2,'task322.png','task322.png','image/png',4,$3,'Task 322 governed image','website','active',$4)`,
      [ids.media, `task322/${ids.media}`, `checksum-${ids.media}`, ids.administrator],
    );
    await admin.query(
      `INSERT INTO cms_media_versions(id,asset_id,version_number,storage_key,checksum,byte_size,width,height,metadata)
       VALUES ($1,$2,1,$3,$4,4,1200,800,
               '{"altText":"Task 322 governed image","rightsStatus":"approved","accessibilityStatus":"approved"}'::jsonb)`,
      [ids.mediaVersion, ids.media, `task322/${ids.mediaVersion}`, `checksum-${ids.mediaVersion}`],
    );
    await admin.query(
      `INSERT INTO cms_documents(id,kind,canonical_slug,title,owner_id,status)
       VALUES ($1,'publication',$2,$3,$4,'active'),($5,'publication',$6,'Unassigned editorial work',$4,'active')`,
      [ids.document, snapshot.slug, snapshot.title, ids.editor, ids.unassignedDocument, `unassigned-${ids.document.slice(0, 8)}`],
    );
    await admin.query(
      `INSERT INTO cms_market_editions(id,document_id,market,locale,localized_slug,publication_state,content_mode)
       VALUES ($1,$2,'uae','en',$3,'in-review','custom'),($4,$5,'uae','en',$6,'draft','custom')`,
      [ids.edition, ids.document, snapshot.slug, ids.unassignedEdition, ids.unassignedDocument, `unassigned-${ids.document.slice(0, 8)}`],
    );
    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,1,$3,'task322-one','in-review',$4,'Task 322 review fixture')`,
      [ids.revisionOne, ids.edition, snapshot, ids.editor],
    );

    routePool.options.connectionString = withSearchPath(originalDatabaseUrl, schema);
    process.env.DATABASE_URL = routePool.options.connectionString;
    process.env.SESSION_SECRET = "task-322-editorial-route-test-session-secret";
    const [{ default: app }, auth] = await Promise.all([
      import("../src/app.ts"), import("../src/lib/auth.ts"),
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
        "content-type": "application/json", origin,
        cookie: `${auth.SESSION_COOKIE}=${token}; ${auth.CSRF_COOKIE}=${csrfToken}`,
        "x-csrf-token": csrfToken,
      };
    };
    const request = (path: string, method: string, body: unknown, token = tokens.administrator) =>
      fetch(`${origin}${path}`, {
        method, headers: headersFor(token), ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
    const json = async <T>(response: Response, status: number, label: string) => {
      const text = await response.text();
      assert.equal(response.status, status, `${label}: ${text}`);
      return JSON.parse(text) as T;
    };

    await json(
      await request(`/api/editorial-work/editions/${ids.edition}/assignment`, "PUT", {
        editorId: ids.editor, reviewerId: ids.editor, dueAt: null,
      }),
      409, "an accountable editor cannot be assigned as reviewer",
    );
    await json(
      await request(`/api/editorial-work/editions/${ids.edition}/assignment`, "PUT", {
        editorId: ids.editor, reviewerId: ids.reviewerOne, dueAt: null,
      }),
      200, "assign distinct editor and reviewer",
    );
    const queue = await json<{ items: Array<{ editionId: string }> }>(
      await request("/api/editorial-work/team?includeUnassigned=true", "GET", undefined),
      200, "team queue with an unassigned edition",
    );
    assert.ok(queue.items.some((item) => item.editionId === ids.unassignedEdition), "unassigned queue item must not bind unused SQL values");

    const first = await json<{ reviewRequest: { id: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revisionOne}/request-review`, "POST", undefined, tokens.editor),
      201, "an omitted request body falls back to the assigned reviewer",
    );
    const second = await json<{ reviewRequest: { id: string; reviewerId: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revisionOne}/request-review`, "POST", {
        reviewerId: ids.reviewerTwo,
      }, tokens.editor),
      201, "replace review request with a different reviewer",
    );
    assert.notEqual(first.reviewRequest.id, second.reviewRequest.id);
    assert.equal(second.reviewRequest.reviewerId, ids.reviewerTwo);
    await json(
      await request(`/api/documents/${ids.document}/publish`, "POST", { revisionId: ids.revisionOne }, tokens.administrator),
      409, "generic publish cannot auto-approve an exact pending review",
    );
    await json(
      await request(`/api/documents/${ids.document}/reject`, "POST", {
        revisionId: ids.revisionOne, body: "Generic rejection bypass attempt.",
      }, tokens.administrator),
      403, "generic reject cannot bypass the designated pending reviewer",
    );
    const legacyPublishRevision = randomUUID();
    const legacyRejectRevision = randomUUID();
    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,1,$3,'task322-legacy-publish','draft',$4,'Legacy publish fixture')`,
      [legacyPublishRevision, ids.unassignedEdition, snapshot, ids.editor],
    );
    await json(
      await request(`/api/documents/${ids.unassignedDocument}/publish`, "POST", { revisionId: legacyPublishRevision }, tokens.administrator),
      200, "legacy content without an exact review request retains direct administrator publication",
    );
    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,2,$3,'task322-legacy-reject','in-review',$4,'Legacy reject fixture')`,
      [legacyRejectRevision, ids.unassignedEdition, snapshot, ids.editor],
    );
    await json(
      await request(`/api/documents/${ids.unassignedDocument}/reject`, "POST", {
        revisionId: legacyRejectRevision, body: "Legacy rejection remains available.",
      }, tokens.administrator),
      200, "legacy content without an exact review request retains generic rejection",
    );
    assert.equal(
      (await admin.query<{ status: string }>("SELECT status FROM cms_review_requests WHERE id=$1", [first.reviewRequest.id])).rows[0]?.status,
      "superseded",
    );
    await json(
      await request(`/api/editorial-work/review-requests/${first.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, tokens.reviewerOne),
      409, "a superseded reviewer cannot decide",
    );
    await json(
      await request(`/api/editorial-work/review-requests/${second.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, tokens.reviewerTwo),
      200, "the replacement reviewer approves",
    );
    await json(
      await request(`/api/editorial-work/review-requests/${second.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, tokens.reviewerTwo),
      200, "an exact decision retry is idempotent",
    );
    assert.equal(
      (await admin.query<{ workflow_state: string }>("SELECT workflow_state FROM cms_revisions WHERE id=$1", [ids.revisionOne])).rows[0]?.workflow_state,
      "approved",
    );
    await json(
      await request(`/api/documents/${ids.document}/publish`, "POST", { revisionId: ids.revisionOne }, tokens.reviewerTwo),
      200, "an approved exact revision remains publishable",
    );
    const completedQueue = await json<{ items: Array<{ editionId: string; status: string; blockedReason: string | null }> }>(
      await request("/api/editorial-work/team", "GET", undefined, tokens.reviewerTwo),
      200, "the team queue reports a current published revision as completed",
    );
    const completedItem = completedQueue.items.filter((item) => item.editionId === ids.edition);
    assert.equal(completedItem.length, 1, "the assignment does not duplicate an unassigned queue row");
    assert.equal(completedItem[0]?.status, "completed");
    assert.equal(completedItem[0]?.blockedReason, null);
    const sharedBaseline = randomUUID();
    const sharedBaselineRevisionOne = randomUUID();
    const sharedBaselineRevisionTwo = randomUUID();
    await admin.query(
      `INSERT INTO cms_shared_baselines(id,document_id,locale,created_by_user_id)
       VALUES ($1,$2,'en',$3)`,
      [sharedBaseline, ids.document, ids.administrator],
    );
    await admin.query(
      `INSERT INTO cms_shared_baseline_revisions(id,baseline_id,revision_number,snapshot,content_digest,created_by_user_id)
       VALUES ($1,$2,1,'{}','task322-shared-one',$3),
              ($4,$2,2,'{}','task322-shared-two',$3)`,
      [sharedBaselineRevisionOne, sharedBaseline, ids.administrator, sharedBaselineRevisionTwo],
    );
    await admin.query(
      `INSERT INTO cms_market_edition_bindings(document_id,market_edition_id,locale,mode,baseline_id,based_on_baseline_revision_id,translation_state)
       VALUES ($1,$2,'en','shared',$3,$4,'current')`,
      [ids.document, ids.uae, sharedBaseline, sharedBaselineRevisionOne],
    );
    await admin.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,'uae') ON CONFLICT DO NOTHING",
      [ids.reviewerTwo],
    );
    await admin.query(
      "UPDATE cms_shared_baselines SET active_revision_id=$2 WHERE id=$1",
      [sharedBaseline, sharedBaselineRevisionTwo],
    );
    const sharedBlockedQueue = await json<{ items: Array<{ editionId: string; status: string; blockedReason: string | null }> }>(
      await request("/api/editorial-work/team", "GET", undefined, tokens.reviewerTwo),
      200, "shared baseline successor is projected through the catalogue market binding",
    );
    const sharedBlockedItem = sharedBlockedQueue.items.find((item) => item.editionId === ids.edition);
    assert.equal(sharedBlockedItem?.status, "blocked");
    assert.equal(sharedBlockedItem?.blockedReason, "The shared baseline has changed and this edition must be updated.");
    await admin.query(
      "UPDATE cms_market_edition_bindings SET mode='adapted',translation_state='stale' WHERE document_id=$1 AND market_edition_id=$2 AND locale='en'",
      [ids.document, ids.uae],
    );
    const adaptedBlockedQueue = await json<{ items: Array<{ editionId: string; status: string; blockedReason: string | null }> }>(
      await request("/api/editorial-work/team", "GET", undefined, tokens.reviewerTwo),
      200, "adapted stale translation is projected as blocked",
    );
    assert.equal(
      adaptedBlockedQueue.items.find((item) => item.editionId === ids.edition)?.blockedReason,
      "The shared baseline has changed and this edition must be updated.",
    );
    await admin.query(
      "DELETE FROM cms_market_edition_bindings WHERE document_id=$1 AND market_edition_id=$2 AND locale='en'",
      [ids.document, ids.uae],
    );
    await admin.query(
      "UPDATE cms_review_requests SET status='rejected',blocked_reason='Editorial changes required.' WHERE id=$1",
      [second.reviewRequest.id],
    );
    const blockedQueue = await json<{ items: Array<{ editionId: string; status: string; blockedReason: string | null }> }>(
      await request("/api/editorial-work/team", "GET", undefined, tokens.reviewerTwo),
      200, "the latest non-requested review outcome remains projected in the team queue",
    );
    const blockedItem = blockedQueue.items.find((item) => item.editionId === ids.edition);
    assert.equal(blockedItem?.status, "blocked");
    assert.equal(blockedItem?.blockedReason, "The latest review request was rejected.");

    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,2,$3,'task322-two','in-review',$4,'Task 322 permission fixture')`,
      [ids.revisionTwo, ids.edition, snapshot, ids.editor],
    );
    const revoked = await json<{ reviewRequest: { id: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revisionTwo}/request-review`, "POST", {
        reviewerId: ids.reviewerThree,
      }, tokens.editor),
      201, "request an access-scoped publisher",
    );
    await admin.query("DELETE FROM cms_user_market_assignments WHERE user_id=$1 AND market_code='uae'", [ids.reviewerThree]);
    await json(
      await request(`/api/editorial-work/review-requests/${revoked.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, tokens.reviewerThree),
      403, "a reviewer whose exact market access was revoked cannot decide",
    );
    await admin.query(
      `INSERT INTO cms_editorial_notifications(user_id,event_key,type,edition_id,title,message,link,created_at)
       VALUES ($1,'task322-visible','assignment',NULL,'Visible editorial notice','This notice has no restricted edition.','/documents/' || $2::text,now()-interval '1 minute'),
              ($1,'task322-restricted','assignment',$3,'Restricted editorial notice','This notice points to revoked work.','/documents/' || $2::text,now())`,
      [ids.reviewerThree, ids.document, ids.edition],
    );
    const visibleNotifications = await json<{ items: Array<{ title: string }> }>(
      await request("/api/editorial-work/notifications?limit=1", "GET", undefined, tokens.reviewerThree),
      200, "notification access filtering occurs before the requested page limit",
    );
    assert.deepEqual(
      visibleNotifications.items.map((notification) => notification.title),
      ["Visible editorial notice"],
    );

    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,3,$3,'task322-three','in-review',$4,'Task 322 rejection fixture')`,
      [ids.revisionThree, ids.edition, snapshot, ids.editor],
    );
    const rejection = await json<{ reviewRequest: { id: string } }>(
      await request(`/api/editorial-work/revisions/${ids.revisionThree}/request-review`, "POST", {
        reviewerId: ids.reviewerTwo,
      }, tokens.editor),
      201, "request rejection reviewer",
    );
    await json(
      await request(`/api/editorial-work/review-requests/${rejection.reviewRequest.id}/decision`, "POST", {
        decision: "rejected", note: "Please address the source evidence.",
      }, tokens.reviewerTwo),
      200, "a rejection records the existing review-comment workflow",
    );
    assert.equal(
      (await admin.query<{ count: string }>(
        "SELECT count(*)::text count FROM cms_review_comments WHERE revision_id=$1 AND body=$2",
        [ids.revisionThree, "Please address the source evidence."],
      )).rows[0]?.count,
      "1",
    );
    const clearedRevision = randomUUID();
    await admin.query(
      `INSERT INTO cms_revisions(id,edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,$2,4,$3,'task322-clear-assignment','in-review',$4,'Task 322 clear assignment fixture')`,
      [clearedRevision, ids.edition, snapshot, ids.editor],
    );
    const beforeClear = await json<{ reviewRequest: { id: string } }>(
      await request(`/api/editorial-work/revisions/${clearedRevision}/request-review`, "POST", {
        reviewerId: ids.reviewerTwo,
      }, tokens.editor),
      201, "request a reviewer before clearing the assignment",
    );
    const clearAssignment = await request(`/api/editorial-work/editions/${ids.edition}/assignment`, "DELETE", undefined);
    assert.equal(clearAssignment.status, 204, "clearing an assignment succeeds");
    await json(
      await request(`/api/editorial-work/review-requests/${beforeClear.reviewRequest.id}/decision`, "POST", {
        decision: "approved",
      }, tokens.reviewerTwo),
      409, "a reviewer cannot decide a request superseded by assignment clearance",
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