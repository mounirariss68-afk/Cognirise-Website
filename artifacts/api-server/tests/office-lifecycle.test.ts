import assert from "node:assert/strict";
import test from "node:test";
import { createPublicationTransactionFixture } from "./publication-transaction-fixture.ts";

test("published offices with later drafts archive, restore, and never use permanent deletion", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "office-lifecycle-test-session-secret-long-enough";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  const now = new Date();
  let rootStatus = "active";
  let publicationState = "published";
  let publishedRevisionId: string | null = "published-revision-id";
  let archiveCount = 0;
  let restoreCount = 0;
  let availabilityMutationAttempted = false;
  let deleteGuardChecked = false;
  const approvedPayload = {
    slug: "office-dubai",
    title: "Dubai",
    summary: null,
    content: {
      schemaVersion: 1,
      city: "Dubai",
      address: "Approved published address",
      visibility: "public",
      order: 0,
      sources: [],
      relatedIds: [],
    },
    mediaIds: [],
    markets: ["uae"],
  };
  const draftPayload = {
    ...approvedPayload,
    content: {
      ...approvedPayload.content,
      address: "Edited draft address",
    },
  };
  let latestRevisionId = "draft-revision-id";
  let latestRevisionNumber = 2;
  let latestPayload = draftPayload;

  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    if (statement.includes("FROM cms_sessions s")) {
      return {
        rowCount: 1,
        rows: [{
          id: "session-id",
          token_digest: security.hashToken("session-token"),
          mfa_satisfied_at: now,
          expires_at: new Date(now.getTime() + 60_000),
          created_at: now,
          user_id: "user-id",
          name: "CMS administrator",
          email: "cms@example.com",
          role: "administrator",
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
           market_codes: ["uae"],
           legacy_administrator_market_codes: ["uae"],
           capability_matrix_configured: false,
           capability_grants: [],
        }],
      };
    }
    if (statement.includes("cms_user_capability_configurations") || statement.includes("FROM cms_user_capability_grants")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("FROM cms_legacy_administrator_market_snapshots")) {
      return { rowCount: 1, rows: [{ market_codes: ["uae"] }] };
    }
    if (statement.includes("DELETE FROM cms_documents d")) {
      deleteGuardChecked = statement.includes("publication_event.action='document.published'");
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("SET publication_state='archived'")) {
      publicationState = "archived";
      archiveCount += 1;
      return { rowCount: 1, rows: [{ id: "office-id" }] };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) {
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae",
          default_locale: "en",
          fallback_market_code: null,
          fallback_locale: null,
          is_canonical: true,
        }],
      };
    }
    if (statement.includes("WITH selected AS")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("AS is_configured")) {
      assert.match(statement, /publication_event\.action='document\.published'/);
      assert.match(statement, /publication_event\.metadata->>'scheduled'/);
      return { rowCount: 1, rows: [{ is_configured: true }] };
    }
    if (statement.includes("SELECT d.id,d.kind")) {
      return {
        rowCount: 1,
        rows: [{
          id: "office-id",
          kind: "office",
          canonical_slug: "office-dubai",
          title: "Dubai",
          owner_id: "user-id",
          root_status: rootStatus,
          created_at: now,
          updated_at: now,
          markets: ["uae"],
          can_permanently_delete: false,
           revision_id: latestRevisionId,
           revision_number: latestRevisionNumber,
           payload: latestPayload,
          workflow_state: "draft",
          publication_state: publicationState,
          published_revision_id: publishedRevisionId,
          publish_at: null,
          published_at: now,
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });
  const transactions: ReturnType<typeof createPublicationTransactionFixture>[] = [];
  const createTransaction = () => createPublicationTransactionFixture({
    documentLocks: { "office-id": "office-id" },
    editionAccess: (id) => id === "office-id"
      ? { rowCount: 1, rows: [{ edition_id: "edition-id", content_mode: "custom", kind: "office" }] }
      : undefined,
    workflowReceipts: (statement) => {
      if (statement.includes("INSERT INTO cms_restore_release_receipts")) {
        return { rowCount: 1, rows: [{ id: "office-restore-release-receipt" }] };
      }
      return undefined;
    },
    unexpectedSqlLabel: "office lifecycle",
    query: async (statement, values) => {
      if (statement.includes("SELECT status FROM cms_documents")) {
        return { rowCount: 1, rows: [{ status: rootStatus }] };
      }
       if (statement.includes("SELECT market,locale FROM cms_market_editions")) {
         return { rowCount: 1, rows: [{ market: "uae", locale: "en" }] };
      }
       if (statement.includes("DELETE FROM cms_documents d")) {
         deleteGuardChecked = statement.includes("publication_event.action='document.published'");
         return { rowCount: 0, rows: [] };
       }
      if (statement.includes("cms_document_availability_states")) {
        availabilityMutationAttempted = true;
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT id FROM cms_market_editions") && statement.includes("FOR UPDATE")) {
        return String(values[0]) === "office-id" && values[1] === "uae" && values[2] === "en"
          ? { rowCount: 1, rows: [{ id: "edition-id" }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("SET publication_state='archived'")) {
        publicationState = "archived";
        archiveCount += 1;
        return { rowCount: 1, rows: [{ id: "edition-id" }] };
      }
      if (statement.includes("SELECT e.id,e.published_revision_id,e.content_mode,d.kind")) {
        return {
          rowCount: 1,
          rows: [{
            id: "edition-id",
            published_revision_id: publishedRevisionId,
            kind: "office",
            revision_id: latestRevisionId,
            revision_number: latestRevisionNumber,
            workflow_state: "draft",
            payload: latestPayload,
          }],
        };
      }
      if (
        statement.includes("FROM cms_revisions published")
        && statement.includes("cms_resolved_market_revisions")
        && statement.includes("FOR KEY SHARE OF published")
      ) {
        assert.deepEqual(values, ["published-revision-id", "edition-id"]);
        return { rowCount: 1, rows: [{ source_market: "uae" }] };
      }
      if (statement.includes("SELECT id,payload,content_digest FROM cms_revisions")) {
        assert.deepEqual(values, ["published-revision-id", "edition-id"]);
        return {
          rowCount: 1,
          rows: [{
            id: "published-revision-id",
            payload: approvedPayload,
            content_digest: "approved-office-digest",
          }],
        };
      }
      if (statement.includes("INSERT INTO cms_revisions")) {
        latestRevisionId = "restored-revision-id";
        latestRevisionNumber = 3;
        latestPayload = structuredClone(approvedPayload);
        return {
          rowCount: 1,
          rows: [{
            id: latestRevisionId,
            payload: latestPayload,
            content_digest: "approved-office-digest",
          }],
        };
      }
      if (statement.includes("INSERT INTO cms_revision_accuracy_confirmations")) {
        return { rowCount: 1, rows: [] };
      }
      if (statement.includes("SET publication_state='draft'")) {
        publicationState = "draft";
        restoreCount += 1;
        return { rowCount: 1, rows: [{ id: "edition-id" }] };
      }
      return undefined;
    },
  });
  t.mock.method(pool, "connect", async () => {
    const transaction = createTransaction();
    transactions.push(transaction);
    return transaction.client as never;
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    assert.deepEqual(
      transactions.map((transaction) => transaction.phase),
      ["rolled-back", "committed", "committed"],
    );
    transactions[0]?.assertRolledBack();
    transactions[1]?.assertCommitted();
    transactions[2]?.assertCommitted();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const origin = `http://127.0.0.1:${address.port}`;
  const csrf = auth.csrfForSession(security.hashToken("session-token"));
  const headers = {
    "content-type": "application/json",
    origin,
    "x-csrf-token": csrf,
    cookie: `${auth.SESSION_COOKIE}=session-token; ${auth.CSRF_COOKIE}=${csrf}`,
  };

  const permanentDelete = await fetch(`${origin}/api/documents/office-id`, {
    method: "DELETE",
    headers,
  });
  assert.equal(permanentDelete.status, 409);
  assert.equal(deleteGuardChecked, true);

  const archived = await fetch(`${origin}/api/documents/office-id/archive`, {
    method: "POST",
    headers,
    body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(archived.status, 200);
  assert.equal((await archived.json() as { status: string }).status, "archived");
  assert.equal(archiveCount, 1);

  const restored = await fetch(`${origin}/api/documents/office-id/restore`, {
    method: "POST",
    headers,
    body: JSON.stringify({ market: "uae", locale: "en" }),
  });
  assert.equal(restored.status, 200);
  const restoredDocument = await restored.json() as {
    status: string;
    canPermanentlyDelete: boolean;
    publishedRevisionId: string | null;
    currentRevisionId: string;
    content: { address: string };
  };
  assert.equal(restoredDocument.status, "draft");
  assert.equal(restoredDocument.canPermanentlyDelete, false);
  assert.equal(restoredDocument.publishedRevisionId, "published-revision-id");
  assert.equal(restoredDocument.currentRevisionId, "restored-revision-id");
  assert.equal(restoredDocument.content.address, "Approved published address");
  assert.deepEqual(
    latestPayload,
    approvedPayload,
    "restore must draft a copy of the approved published office, not revive the later draft",
  );
  assert.notDeepEqual(latestPayload, draftPayload);
  assert.equal(restoreCount, 1);
  assert.equal(
    availabilityMutationAttempted,
    false,
    "restoring an exact office edition must not create or advance availability state",
  );

  const publicOffices = await fetch(
    `${origin}/api/public/content?market=uae&locale=en&kind=office`,
  );
  assert.equal(publicOffices.status, 200);
  assert.equal(
    (await publicOffices.json() as { isConfigured: boolean }).isConfigured,
    true,
    "restoring the last published office must not reactivate compiled fallback",
  );
});