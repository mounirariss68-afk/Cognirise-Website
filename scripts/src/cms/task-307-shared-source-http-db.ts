import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { Server } from "node:http";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

type StorageCookie = { name: string; value: string };
type StorageState = { cookies?: StorageCookie[] };
type Session = { cookie: string; csrf: string };
type HttpResult<T> = { response: Response; body: T };

const args = process.argv.slice(2);
const storageStateFlag = args.indexOf("--storage-state");
const storageStatePath = storageStateFlag >= 0 ? args[storageStateFlag + 1] : undefined;
const digest = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex");
const repositoryRoot = fileURLToPath(new URL("../../../", import.meta.url));
const lifecycleDeadline = AbortSignal.timeout(240_000);

function assertRequired(value: unknown, message: string): asserts value {
  assert.ok(value, message);
}

function fixturePayload(slug: string, title: string, market: string) {
  return {
    slug,
    title,
    summary: "Disposable task 307 shared-source lifecycle verification.",
    content: {
      schemaVersion: 1,
      variant: "article",
      teaser: "A disposable publication used only to verify the shared-source release boundary.",
      body: [{ type: "paragraph", text: "This fixture is deleted automatically after the HTTP lifecycle assertion." }],
      author: "Task 307 verifier",
      publicationDate: "2025-01-01",
      readingTimeMinutes: 1,
      topics: ["governance"],
      sectors: [],
      platformIds: [],
      visibility: "public",
      order: 0,
      sources: [{
        label: "Verification fixture source",
        url: "https://example.com/task-307-fixture",
        accessedAt: "2025-01-01",
      }],
      verificationDate: "2025-01-01",
      reviewDate: "2025-01-01",
      relatedIds: [],
    },
    mediaIds: [],
    markets: [market],
  };
}

async function readStorageSession(
  path: string,
  sessionCookieName: string,
  csrfCookieName: string,
): Promise<Session> {
  const state = JSON.parse(await readFile(path, "utf8")) as StorageState;
  const cookies = new Map((state.cookies ?? []).map((cookie) => [cookie.name, cookie.value]));
  const session = cookies.get(sessionCookieName);
  const csrf = cookies.get(csrfCookieName);
  assertRequired(session && csrf, "The supplied storage state must contain an authenticated CMS session and CSRF cookie.");
  return {
    cookie: `${sessionCookieName}=${session}; ${csrfCookieName}=${csrf}`,
    csrf,
  };
}

async function json<T>(
  origin: string,
  session: Session,
  path: string,
  init: RequestInit = {},
): Promise<HttpResult<T>> {
  const headers = new Headers(init.headers);
  headers.set("cookie", session.cookie);
  if (init.method && !["GET", "HEAD"].includes(init.method)) {
    headers.set("origin", origin);
    headers.set("x-csrf-token", session.csrf);
    headers.set("content-type", "application/json");
  }
  const response = await fetch(`${origin}${path}`, {
    ...init,
    headers,
    signal: init.signal ?? AbortSignal.any([lifecycleDeadline, AbortSignal.timeout(20_000)]),
  });
  const text = await response.text();
  let body: T;
  try {
    body = text ? JSON.parse(text) as T : undefined as T;
  } catch {
    throw new Error(`${init.method ?? "GET"} ${path} returned a non-JSON HTTP ${response.status} response.`);
  }
  return { response, body };
}

function expectStatus<T>(result: HttpResult<T>, expected: number, operation: string): T {
  if (result.response.status !== expected) {
    const error = result.body && typeof result.body === "object" && "error" in result.body
      ? String((result.body as { error?: unknown }).error)
      : "no API error was supplied";
    throw new Error(`${operation} expected HTTP ${expected}, received ${result.response.status}: ${error}`);
  }
  return result.body;
}

async function main() {
  if (!args.includes("--development") || !args.includes("--task-307-http-db")) {
    throw new Error(
      "Refusing shared-source lifecycle verification. Pass --development --task-307-http-db.",
    );
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("Task 307 HTTP/DB lifecycle verification is forbidden when NODE_ENV=production.");
  }
  if (storageStateFlag >= 0 && !storageStatePath) {
    throw new Error("--storage-state requires a path to a temporary CMS browser storage state.");
  }
  if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    throw new Error("SESSION_SECRET must be configured before starting the isolated API verifier.");
  }

  const [{ default: app }, { pool }, auth] = await Promise.all([
    import(pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/app.ts")).href),
    import("@workspace/db"),
    import(pathToFileURL(path.join(repositoryRoot, "artifacts/api-server/src/lib/auth.ts")).href),
  ]);
  const providedAdminSession = storageStatePath
    ? await readStorageSession(storageStatePath, auth.SESSION_COOKIE, auth.CSRF_COOKIE)
    : undefined;
  const listeningServer: Server = app.listen(0, "127.0.0.1");
  const serverListening = new Promise<void>((resolve, reject) => {
    listeningServer.once("listening", resolve);
    listeningServer.once("error", reject);
  });
  let server: Server | undefined = listeningServer;
  const client = await pool.connect();
  let fixtureDocumentId: string | undefined;
  let sourceDestinationFixtureId: string | undefined;
  const fixtureUserIds: string[] = [];

  try {
    await Promise.race([
      serverListening,
      new Promise<never>((_, reject) => setTimeout(
        () => reject(new Error("The isolated API verifier did not bind within 10 seconds.")),
        10_000,
      )),
    ]);
    const address = listeningServer.address();
    assertRequired(address && typeof address !== "string", "Could not bind the isolated API verifier.");
    const origin = `http://127.0.0.1:${address.port}`;

    // A supplied browser state is optional and is only read/validated. All
    // lifecycle mutations always use the disposable fixture administrator.
    if (providedAdminSession) {
      const adminIdentity = expectStatus(
        await json<{ user?: { role?: string } }>(origin, providedAdminSession, "/api/auth/session"),
        200,
        "optional temporary administrator session check",
      );
      assert.equal(adminIdentity.user?.role, "administrator", "The supplied storage state must belong to an administrator.");
    }

    const markets = await client.query(
      `SELECT id::text id,code,default_locale
         FROM market_editions
        WHERE enabled=true
        ORDER BY is_canonical DESC,display_name,code
        FOR SHARE`,
    );
    assert.ok(Number(markets.rowCount) >= 2, "Task 307 requires at least two enabled destination markets.");
    const allMarkets = markets.rows.map((row: { code: string }) => String(row.code));
    const included = markets.rows[0] as { id: string; code: string; default_locale: string };
    const excluded = markets.rows[1] as { id: string; code: string; default_locale: string };
    const suffix = randomUUID();
    const slug = `task-307-shared-source-${suffix}`;

    const insertUser = async (role: "administrator" | "editor", label: string) => {
      const result = await client.query(
        `INSERT INTO cms_users(email,display_name,role,status,email_verified_at)
         VALUES ($1,$2,$3,'active',now()) RETURNING id::text id`,
        [`task-307-${label}-${suffix}@service.invalid`, `Task 307 ${label}`, role],
      );
      const userId = String(result.rows[0].id);
      fixtureUserIds.push(userId);
      return userId;
    };
    const ownerId = await insertUser("administrator", "fixture-owner");
    const fullEditorId = await insertUser("editor", "all-destinations-editor");
    const restrictedEditorId = await insertUser("editor", "restricted-editor");
    await client.query(
      `INSERT INTO cms_user_market_assignments(user_id,market_code)
       SELECT $1,unnest($2::text[])`,
      [fullEditorId, allMarkets],
    );
    await client.query(
      "INSERT INTO cms_user_market_assignments(user_id,market_code) VALUES ($1,$2)",
      [restrictedEditorId, included.code],
    );
    for (const userId of [ownerId, fullEditorId, restrictedEditorId]) {
      await client.query(
        `INSERT INTO cms_totp_credentials(user_id,encrypted_secret,encryption_key_version,verified_at)
         VALUES ($1,$2,1,now())`,
        [userId, `task-307-disposable-${randomUUID()}`],
      );
    }

    const document = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,owner_id,status)
       VALUES ('publication',$1,'Task 307 disposable legacy fixture',$2,'active')
       RETURNING id::text id`,
      [slug, ownerId],
    );
    fixtureDocumentId = String(document.rows[0].id);
    const sourceEdition = await client.query(
      `INSERT INTO cms_market_editions
         (document_id,market,locale,localized_slug,publication_state,fallback_mode,content_mode)
       VALUES ($1,$2,$3,$4,'draft','none','custom') RETURNING id::text id`,
      [fixtureDocumentId, included.code, included.default_locale, slug],
    );
    const alternateEdition = await client.query(
      `INSERT INTO cms_market_editions
         (document_id,market,locale,localized_slug,publication_state,fallback_mode,content_mode)
       VALUES ($1,$2,$3,$4,'draft','none','custom') RETURNING id::text id`,
      [fixtureDocumentId, excluded.code, excluded.default_locale, `${slug}-alternate`],
    );
    const sourceEditionId = String(sourceEdition.rows[0].id);
    const sourceDraftOne = fixturePayload(slug, "Task 307 initial source draft", included.code);
    await client.query(
      `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,1,$2,$3,'draft',$4,'Disposable legacy source baseline')`,
      [sourceEditionId, sourceDraftOne, digest(sourceDraftOne), ownerId],
    );
    const sourceDraftTwo = fixturePayload(slug, "Task 307 exact saved source revision", included.code);
    const sourceRevision = await client.query(
      `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,2,$2,$3,'draft',$4,'Disposable exact source selected by task 307')
       RETURNING id::text id`,
      [sourceEditionId, sourceDraftTwo, digest(sourceDraftTwo), ownerId],
    );
    const selectedLegacyRevisionId = String(sourceRevision.rows[0].id);
    const alternatePayload = fixturePayload(
      `${slug}-alternate`,
      "Task 307 independent alternate edition",
      excluded.code,
    );
    await client.query(
      `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,reason)
       VALUES ($1,1,$2,$3,'draft',$4,'Disposable independent legacy edition')`,
      [String(alternateEdition.rows[0].id), alternatePayload, digest(alternatePayload), ownerId],
    );
    await client.query(
      `INSERT INTO cms_document_availability_states(document_id,draft_version,published_version)
       VALUES ($1,0,0)`,
      [fixtureDocumentId],
    );

    const makeFixtureSession = async (userId: string): Promise<Session> => {
      const cookies = new Map<string, string>();
      await auth.createSession(
        userId,
        true,
        { ip: "127.0.0.1", header: () => "task-307-http-db-verifier" } as never,
        { cookie: (name: string, value: string) => { cookies.set(name, value); } } as never,
      );
      const session = cookies.get(auth.SESSION_COOKIE);
      const csrf = cookies.get(auth.CSRF_COOKIE);
      assertRequired(session && csrf, "Could not create a disposable authenticated CMS session.");
      return {
        cookie: `${auth.SESSION_COOKIE}=${session}; ${auth.CSRF_COOKIE}=${csrf}`,
        csrf,
      };
    };
    const fixtureAdministratorSession = await makeFixtureSession(ownerId);
    const fullEditorSession = await makeFixtureSession(fullEditorId);
    const restrictedEditorSession = await makeFixtureSession(restrictedEditorId);

    const availabilityBefore = expectStatus(
      await json<{ sharedSource: unknown }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability`,
      ),
      200,
      "read null-source legacy availability",
    );
    assert.equal(availabilityBefore.sharedSource, null, "The multi-edition legacy fixture must start without a shared source.");

    const selected = expectStatus(
      await json<{
        draftVersion: number;
        sharedSource: { market: string; locale: string; editionId: string; revisionId: string; sourceRevisionId: string };
      }>(origin, fixtureAdministratorSession, `/api/documents/${fixtureDocumentId}/availability/source`, {
        method: "POST",
        body: JSON.stringify({ version: 0, sourceRevisionId: selectedLegacyRevisionId }),
      }),
      201,
      "select exact legacy source revision",
    );
    assert.equal(selected.draftVersion, 1);
    assert.equal(selected.sharedSource.market, "shared-source");
    assert.equal(selected.sharedSource.locale, "und");
    assert.equal(selected.sharedSource.sourceRevisionId, selectedLegacyRevisionId);
    const sharedRevisionOne = selected.sharedSource.revisionId;
    const clonedSharedOrigin = await client.query(
      "SELECT editorial_market FROM cms_market_editions WHERE id=$1",
      [selected.sharedSource.editionId],
    );
    assert.equal(
      clonedSharedOrigin.rows[0].editorial_market,
      included.code,
      "A cloned internal source retains the selected revision's regional editorial origin.",
    );

    const sharedPath = `/api/documents/${fixtureDocumentId}?market=shared-source&locale=und`;
    const sharedRead = expectStatus(
      await json<{ currentRevisionId: string; revisionNumber: number; title: string }>(
        origin,
        fullEditorSession,
        sharedPath,
      ),
      200,
      "read internal shared source as fully authorized editor",
    );
    assert.equal(sharedRead.currentRevisionId, sharedRevisionOne);
    assert.equal(sharedRead.title, "Task 307 exact saved source revision");
    expectStatus(
      await json(origin, restrictedEditorSession, sharedPath),
      403,
      "deny internal shared source to restricted editor",
    );
    const sharedTitle = "Task 307 saved shared source revision";
    const patched = expectStatus(
      await json<{ currentRevisionId: string; revisionNumber: number; title: string }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            market: "shared-source",
            locale: "und",
            revisionNumber: sharedRead.revisionNumber,
            expectedRevisionId: sharedRead.currentRevisionId,
            title: sharedTitle,
          }),
        },
      ),
      200,
      "save shared-source/und revision",
    );
    assert.equal(patched.revisionNumber, 2);
    assert.equal(patched.title, sharedTitle);
    const sharedRevisionTwo = patched.currentRevisionId;
    assert.notEqual(sharedRevisionTwo, sharedRevisionOne);
    const savedAvailability = expectStatus(
      await json<{
        draftVersion: number;
        items: Array<{ marketEditionId: string; market: string; locale: string }>;
      }>(
        origin, fullEditorSession, `/api/documents/${fixtureDocumentId}/availability`,
      ),
      200,
      "refresh destination version after shared save",
    );
    // Read the complete currently configured matrix immediately before
    // staging, so markets or locales added after fixture creation receive an
    // explicit decision rather than being silently inherited.
    const stagedDestinations = savedAvailability.items.map((destination) => ({
      marketEditionId: destination.marketEditionId,
      locale: destination.locale,
      decision: destination.market === included.code && destination.locale === included.default_locale
        ? "show" as const
        : "off" as const,
    }));

    const preview = expectStatus(
      await json<{ previewUrl: string; revisionId: string; document: { title: string } }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/preview?market=shared-source&locale=und&revisionId=${encodeURIComponent(sharedRevisionTwo)}`,
      ),
      200,
      "create internal shared-source preview",
    );
    assert.equal(preview.revisionId, sharedRevisionTwo);
    assert.equal(preview.document.title, sharedTitle);
    const resolvedPreview = expectStatus(
      await json<{ revisionId: string; document: { title: string } }>(
        origin,
        fullEditorSession,
        `/api${preview.previewUrl}`,
      ),
      200,
      "resolve internal shared-source preview",
    );
    assert.equal(resolvedPreview.revisionId, sharedRevisionTwo);
    assert.equal(resolvedPreview.document.title, sharedTitle);

    const staged = expectStatus(
      await json<{ draftVersion: number; reviewedVersion: number | null; sharedSource: { revisionId: string } }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability`,
        {
          method: "PUT",
          body: JSON.stringify({
            version: savedAvailability.draftVersion,
            destinations: stagedDestinations,
          }),
        },
      ),
      200,
      "stage selected and excluded destinations",
    );
    assert.equal(staged.draftVersion, savedAvailability.draftVersion + 1);
    assert.equal(staged.reviewedVersion, null);
    assert.equal(staged.sharedSource.revisionId, sharedRevisionTwo);

    const submitted = expectStatus(
      await json<{ status: string; currentRevisionId: string }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/submit`,
        { method: "POST", body: JSON.stringify({ revisionId: sharedRevisionTwo }) },
      ),
      200,
      "submit shared source",
    );
    assert.equal(submitted.status, "in-review");
    assert.equal(submitted.currentRevisionId, sharedRevisionTwo);
    const stateAfterSubmit = await client.query(
      `SELECT draft_version,reviewed_version,shared_source_revision_id::text shared_source_revision_id,
              reviewed_source_revision_id::text reviewed_source_revision_id
         FROM cms_document_availability_states WHERE document_id=$1`,
      [fixtureDocumentId],
    );
    assert.equal(String(stateAfterSubmit.rows[0].shared_source_revision_id), sharedRevisionTwo);
    assert.equal(stateAfterSubmit.rows[0].reviewed_version, null,
      "Submitting content must not rewrite the staged availability source/version.");
    assert.equal(stateAfterSubmit.rows[0].reviewed_source_revision_id, null);

    const reviewed = expectStatus(
      await json<{
        draftVersion: number;
        reviewedVersion: number | null;
        sharedSource: { revisionId: string };
        items: Array<{ marketEditionId: string; locale: string; reviewedDecision: string | null }>;
      }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability/review`,
        { method: "POST", body: JSON.stringify({ version: staged.draftVersion }) },
      ),
      200,
      "review the exact staged destination selection",
    );
    assert.equal(reviewed.reviewedVersion, staged.draftVersion);
    assert.equal(reviewed.sharedSource.revisionId, sharedRevisionTwo);
    assert.equal(
      reviewed.items.find((item) => item.marketEditionId === excluded.id && item.locale === excluded.default_locale)?.reviewedDecision,
      "off",
    );

    const privateBeforePublish = expectStatus(
      await json<{ items: Array<{ id: string }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(included.code)}&locale=${encodeURIComponent(included.default_locale)}&kind=publication`,
      ),
      200,
      "confirm staged source remains private",
    );
    assert.equal(privateBeforePublish.items.some((item) => item.id === fixtureDocumentId), false);

    const published = expectStatus(
      await json<{ status: string; currentRevisionId: string; publishedRevisionId: string }>(
        origin,
        fixtureAdministratorSession,
        `/api/documents/${fixtureDocumentId}/publish`,
        { method: "POST", body: JSON.stringify({ revisionId: sharedRevisionTwo }) },
      ),
      200,
      "atomically publish source and reviewed destinations",
    );
    assert.equal(published.status, "published");
    assert.equal(published.currentRevisionId, sharedRevisionTwo);
    assert.equal(published.publishedRevisionId, sharedRevisionTwo);

    const publishedState = await client.query(
      `SELECT state.published_version,state.published_source_revision_id::text published_source_revision_id,
              source.published_revision_id::text source_published_revision_id
         FROM cms_document_availability_states state
         JOIN cms_market_editions source ON source.id=state.shared_source_edition_id
        WHERE state.document_id=$1`,
      [fixtureDocumentId],
    );
    assert.equal(Number(publishedState.rows[0].published_version), staged.draftVersion);
    assert.equal(String(publishedState.rows[0].published_source_revision_id), sharedRevisionTwo);
    assert.equal(String(publishedState.rows[0].source_published_revision_id), sharedRevisionTwo);
    const publishedDecisions = await client.query(
      `SELECT market.code,availability.locale,availability.published_decision,availability.draft_decision
         FROM cms_document_market_availability availability
         JOIN market_editions market ON market.id=availability.market_edition_id
        WHERE availability.document_id=$1 AND market.id::text=ANY($2::text[])
        ORDER BY market.code,availability.locale`,
      [fixtureDocumentId, [included.id, excluded.id]],
    );
    const decisionFor = (marketId: string, locale: string) => {
      const market = marketId === included.id ? included.code : excluded.code;
      return publishedDecisions.rows.find((row: { code: string; locale: string }) =>
        row.code === market && row.locale === locale,
      );
    };
    assert.equal(decisionFor(included.id, included.default_locale)?.published_decision, "show");
    assert.equal(decisionFor(excluded.id, excluded.default_locale)?.published_decision, "off");
    assert.equal(decisionFor(excluded.id, excluded.default_locale)?.draft_decision, null);

    const selectedPublic = expectStatus(
      await json<{ items: Array<{ id: string; title: string; revision: number }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(included.code)}&locale=${encodeURIComponent(included.default_locale)}&kind=publication`,
      ),
      200,
      "read selected public destination",
    );
    const live = selectedPublic.items.find((item) => item.id === fixtureDocumentId);
    assertRequired(live, "The selected destination did not resolve the published shared source.");
    assert.equal(live.title, sharedTitle);
    assert.equal(live.revision, 2);

    const excludedPublic = expectStatus(
      await json<{ items: Array<{ id: string }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(excluded.code)}&locale=${encodeURIComponent(excluded.default_locale)}&kind=publication`,
      ),
      200,
      "read excluded public destination",
    );
    assert.equal(excludedPublic.items.some((item) => item.id === fixtureDocumentId), false);

    // Removing one materialized row models a newly configured destination on
    // an otherwise eligible, already-published shared document. Staging show
    // must create that row with a published-off baseline: neither list nor
    // detail delivery may expose it until the next reviewed source release.
    await client.query(
      `DELETE FROM cms_document_market_availability
        WHERE document_id=$1 AND market_edition_id=$2 AND locale=$3`,
      [fixtureDocumentId, excluded.id, excluded.default_locale],
    );
    const missingDestinationBeforeStage = expectStatus(
      await json<{ items: Array<{ id: string }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(excluded.code)}&locale=${encodeURIComponent(excluded.default_locale)}&kind=publication`,
      ),
      200,
      "fail closed in the public list when a published destination row is missing",
    );
    assert.equal(missingDestinationBeforeStage.items.some((item) => item.id === fixtureDocumentId), false);
    expectStatus(
      await json(
        origin,
        fullEditorSession,
        `/api/public/content/${encodeURIComponent(excluded.code)}/${encodeURIComponent(excluded.default_locale)}/publication/${encodeURIComponent(slug)}`,
      ),
      404,
      "fail closed in public detail when a published destination row is missing",
    );
    const restageAvailability = expectStatus(
      await json<{
        draftVersion: number;
        items: Array<{
          marketEditionId: string;
          market: string;
          locale: string;
          stagedDecision: "inherit" | "show" | "off";
        }>;
      }>(origin, fullEditorSession, `/api/documents/${fixtureDocumentId}/availability`),
      200,
      "read the complete matrix with its missing destination defaulted off",
    );
    const restageDestinations = restageAvailability.items.map((destination) => ({
      marketEditionId: destination.marketEditionId,
      locale: destination.locale,
      decision: destination.stagedDecision,
    }));
    const stagedMissingDestinationOff = expectStatus(
      await json<{ draftVersion: number }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability`,
        {
          method: "PUT",
          body: JSON.stringify({ version: restageAvailability.draftVersion, destinations: restageDestinations }),
        },
      ),
      200,
      "stage off for the newly materialized destination",
    );
    const missingDestinationAfterOffStage = expectStatus(
      await json<{ items: Array<{ id: string }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(excluded.code)}&locale=${encodeURIComponent(excluded.default_locale)}&kind=publication`,
      ),
      200,
      "keep a staged-off missing destination out of public list delivery",
    );
    assert.equal(missingDestinationAfterOffStage.items.some((item) => item.id === fixtureDocumentId), false);
    expectStatus(
      await json(
        origin,
        fullEditorSession,
        `/api/public/content/${encodeURIComponent(excluded.code)}/${encodeURIComponent(excluded.default_locale)}/publication/${encodeURIComponent(slug)}`,
      ),
      404,
      "keep a staged-off missing destination out of public detail delivery",
    );
    const showDestinations = restageDestinations.map((destination) => ({
      ...destination,
      decision: destination.marketEditionId === excluded.id && destination.locale === excluded.default_locale
        ? "show" as const
        : destination.decision,
    }));
    const stagedMissingDestination = expectStatus(
      await json<{ draftVersion: number }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability`,
        {
          method: "PUT",
          body: JSON.stringify({ version: stagedMissingDestinationOff.draftVersion, destinations: showDestinations }),
        },
      ),
      200,
      "stage show for the newly materialized destination",
    );
    const missingDestinationAfterStage = expectStatus(
      await json<{ items: Array<{ id: string }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(excluded.code)}&locale=${encodeURIComponent(excluded.default_locale)}&kind=publication`,
      ),
      200,
      "keep the staged show destination out of public list delivery",
    );
    assert.equal(missingDestinationAfterStage.items.some((item) => item.id === fixtureDocumentId), false);
    expectStatus(
      await json(
        origin,
        fullEditorSession,
        `/api/public/content/${encodeURIComponent(excluded.code)}/${encodeURIComponent(excluded.default_locale)}/publication/${encodeURIComponent(slug)}`,
      ),
      404,
      "keep the staged show destination out of public detail delivery",
    );
    const pendingPublishedDecision = await client.query(
      `SELECT published_decision,draft_decision
         FROM cms_document_market_availability
        WHERE document_id=$1 AND market_edition_id=$2 AND locale=$3`,
      [fixtureDocumentId, excluded.id, excluded.default_locale],
    );
    assert.deepEqual(pendingPublishedDecision.rows[0], {
      published_decision: "off",
      draft_decision: "show",
    });
    const republishedTitle = "Task 307 shared source after missing destination staging";
    const republishedSource = expectStatus(
      await json<{ currentRevisionId: string; revisionNumber: number }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}`,
        {
          method: "PATCH",
          body: JSON.stringify({
            market: "shared-source",
            locale: "und",
            revisionNumber: 2,
            expectedRevisionId: sharedRevisionTwo,
            title: republishedTitle,
          }),
        },
      ),
      200,
      "save a source revision for the staged destination release",
    );
    const republishedAvailability = expectStatus(
      await json<{ draftVersion: number }>(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability`,
      ),
      200,
      "refresh source-bound destination version before review",
    );
    expectStatus(
      await json(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/submit`,
        { method: "POST", body: JSON.stringify({ revisionId: republishedSource.currentRevisionId }) },
      ),
      200,
      "submit the staged-destination shared source",
    );
    expectStatus(
      await json(
        origin,
        fullEditorSession,
        `/api/documents/${fixtureDocumentId}/availability/review`,
        { method: "POST", body: JSON.stringify({ version: republishedAvailability.draftVersion }) },
      ),
      200,
      "review the staged show destination with its exact source revision",
    );
    expectStatus(
      await json(
        origin,
        fixtureAdministratorSession,
        `/api/documents/${fixtureDocumentId}/publish`,
        { method: "POST", body: JSON.stringify({ revisionId: republishedSource.currentRevisionId }) },
      ),
      200,
      "publish the approved source and staged destination together",
    );
    const missingDestinationAfterPublish = expectStatus(
      await json<{ items: Array<{ id: string; title: string }> }>(
        origin,
        fullEditorSession,
        `/api/public/content?market=${encodeURIComponent(excluded.code)}&locale=${encodeURIComponent(excluded.default_locale)}&kind=publication`,
      ),
      200,
      "release the reviewed staged show destination in public list delivery",
    );
    assert.equal(
      missingDestinationAfterPublish.items.find((item) => item.id === fixtureDocumentId)?.title,
      republishedTitle,
    );
    const releasedDetail = expectStatus(
      await json<{ id: string; title: string }>(
        origin,
        fullEditorSession,
        `/api/public/content/${encodeURIComponent(excluded.code)}/${encodeURIComponent(excluded.default_locale)}/publication/${encodeURIComponent(slug)}`,
      ),
      200,
      "release the reviewed staged show destination in public detail delivery",
    );
    assert.equal(releasedDetail.id, fixtureDocumentId);
    assert.equal(releasedDetail.title, republishedTitle);

    // A separate, singleton-style fixture models the pre-internal-address
    // shape: its only real-market edition is the shared source. This verifies
    // the on-demand relocation in /editions without changing the ambiguous
    // legacy custom editions exercised above.
    const onDemandSlug = `task-307-source-destination-${suffix}`;
    const onDemandDocument = await client.query(
      `INSERT INTO cms_documents(kind,canonical_slug,title,owner_id,status)
       VALUES ('publication',$1,'Task 307 source-destination fixture',$2,'active')
       RETURNING id::text id`,
      [onDemandSlug, ownerId],
    );
    sourceDestinationFixtureId = String(onDemandDocument.rows[0].id);
    const realMarketSharedEdition = await client.query(
      `INSERT INTO cms_market_editions
         (document_id,market,locale,localized_slug,publication_state,fallback_mode,content_mode)
       VALUES ($1,$2,$3,$4,'draft','none','shared') RETURNING id::text id`,
      [sourceDestinationFixtureId, included.code, included.default_locale, onDemandSlug],
    );
    const realMarketSharedEditionId = String(realMarketSharedEdition.rows[0].id);
    const realMarketSharedPayload = fixturePayload(
      onDemandSlug,
      "Task 307 real-market shared source",
      included.code,
    );
    const realMarketSharedRevision = await client.query(
      `INSERT INTO cms_revisions
         (edition_id,revision_number,payload,content_digest,workflow_state,created_by_user_id,
          approved_by_user_id,approved_at,reason)
       VALUES ($1,1,$2,$3,'approved',$4,$4,now(),'Disposable real-market shared source')
       RETURNING id::text id`,
      [realMarketSharedEditionId, realMarketSharedPayload, digest(realMarketSharedPayload), ownerId],
    );
    const realMarketSharedRevisionId = String(realMarketSharedRevision.rows[0].id);
    await client.query(
      `UPDATE cms_market_editions
          SET publication_state='published',published_revision_id=$2,published_at=now()
        WHERE id=$1`,
      [realMarketSharedEditionId, realMarketSharedRevisionId],
    );
    await client.query(
      `INSERT INTO cms_document_availability_states
         (document_id,draft_version,published_version,shared_source_edition_id,shared_source_revision_id,
          published_source_revision_id,updated_by_user_id)
       VALUES ($1,1,1,$2,$3,$3,$4)`,
      [sourceDestinationFixtureId, realMarketSharedEditionId, realMarketSharedRevisionId, ownerId],
    );
    await client.query(
      `INSERT INTO cms_document_market_availability
         (document_id,market_edition_id,locale,published_decision,published_by_user_id,published_at)
       VALUES ($1,$2,$3,'show',$4,now())`,
      [sourceDestinationFixtureId, included.id, included.default_locale, ownerId],
    );
    const publicBeforeRelocation = expectStatus(
      await json<{ items: Array<{ id: string; title: string }> }>(
        origin,
        restrictedEditorSession,
        `/api/public/content?market=${encodeURIComponent(included.code)}&locale=${encodeURIComponent(included.default_locale)}&kind=publication`,
      ),
      200,
      "read real-market shared source before relocation",
    );
    assert.equal(
      publicBeforeRelocation.items.find((item) => item.id === sourceDestinationFixtureId)?.title,
      "Task 307 real-market shared source",
    );
    const relocatedOverride = expectStatus(
      await json<{ id: string; number: number; market: string; locale: string; snapshot: { title: string } }>(
        origin,
        restrictedEditorSession,
        `/api/documents/${sourceDestinationFixtureId}/editions`,
        {
          method: "POST",
          body: JSON.stringify({
            market: included.code,
            locale: included.default_locale,
            sourceRevisionId: realMarketSharedRevisionId,
          }),
        },
      ),
      201,
      "create an independent source-destination custom draft",
    );
    assert.equal(relocatedOverride.number, 1);
    assert.equal(relocatedOverride.market, included.code);
    assert.equal(relocatedOverride.locale, included.default_locale);
    assert.equal(relocatedOverride.snapshot.title, "Task 307 real-market shared source");
    const relocatedIdentity = await client.query(
      `SELECT market,locale,editorial_market,content_mode,publication_state,published_revision_id::text published_revision_id
         FROM cms_market_editions WHERE id=$1`,
      [realMarketSharedEditionId],
    );
    assert.deepEqual(relocatedIdentity.rows[0], {
      market: "shared-source",
      locale: "und",
      editorial_market: included.code,
      content_mode: "shared",
      publication_state: "published",
      published_revision_id: realMarketSharedRevisionId,
    });
    const customDraft = await client.query(
      `SELECT content_mode,publication_state,published_revision_id::text published_revision_id
         FROM cms_market_editions
        WHERE document_id=$1 AND market=$2 AND locale=$3`,
      [sourceDestinationFixtureId, included.code, included.default_locale],
    );
    assert.equal(customDraft.rowCount, 1);
    assert.equal(customDraft.rows[0].content_mode, "custom");
    assert.equal(customDraft.rows[0].publication_state, "draft");
    assert.equal(customDraft.rows[0].published_revision_id, null);
    const publicAfterRelocation = expectStatus(
      await json<{ items: Array<{ id: string; title: string }> }>(
        origin,
        restrictedEditorSession,
        `/api/public/content?market=${encodeURIComponent(included.code)}&locale=${encodeURIComponent(included.default_locale)}&kind=publication`,
      ),
      200,
      "preserve published shared delivery after source-destination relocation",
    );
    assert.equal(
      publicAfterRelocation.items.find((item) => item.id === sourceDestinationFixtureId)?.title,
      "Task 307 real-market shared source",
    );

    console.log("Task 307 HTTP/DB shared-source lifecycle verified; disposable fixture cleanup is starting.");
  } finally {
    // The document owns revisions, editions, delivery rows, and preview
    // sessions through cascading foreign keys. Audit rows are deliberately
    // append-only, so remove only records targeting this generated fixture.
    for (const documentId of [fixtureDocumentId, sourceDestinationFixtureId].filter(Boolean)) {
      await client.query(
        "DELETE FROM cms_audit_events WHERE target_type='document' AND target_id=$1",
        [documentId],
      );
      await client.query("DELETE FROM cms_documents WHERE id=$1", [documentId]);
    }
    if (fixtureUserIds.length) {
      await client.query("DELETE FROM cms_users WHERE id::text=ANY($1::text[])", [fixtureUserIds]);
    }
    client.release();
    if (server) {
      await new Promise<void>((resolve, reject) =>
        server!.close((error) => error ? reject(error) : resolve()),
      );
      server = undefined;
    }
    await pool.end();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});