import assert from "node:assert/strict";
import test from "node:test";

let marketAvailabilityTestTail = Promise.resolve();

async function serialMarketAvailabilityTest<T>(run: () => Promise<T>): Promise<T> {
  const previous = marketAvailabilityTestTail;
  let release!: () => void;
  marketAvailabilityTestTail = new Promise<void>((resolve) => { release = resolve; });
  await previous;
  try {
    return await run();
  } finally {
    release();
  }
}

test("person availability mutations use the versioned destination workflow", { concurrency: false }, async (t) => serialMarketAvailabilityTest(async () => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "market-test-session-secret-that-is-longer-than-32-chars";

  const [{ default: app }, { pool }, auth, security] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
    import("../src/lib/auth.ts"),
    import("../src/lib/security.ts"),
  ]);
  let role: "viewer" | "editor" | "administrator" = "viewer";
  let marketCodes = ["ksa"];
  let auditCount = 0;
  let publishedDecision: "inherit" | "off" = "inherit";
  let publicSelectionChecked = false;
  const now = new Date();

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
          name: "CMS user",
          email: "cms@example.com",
          role,
          status: "active",
          last_login_at: null,
          user_created_at: now,
          user_updated_at: now,
          must_rotate: false,
          mfa_enabled: true,
          // The editor is intentionally assigned to the KSA market exercised
          // below; the administrator later retains all-market authority.
          market_codes: marketCodes,
        }],
      };
    }
    if (statement.includes("SELECT d.kind,m.code market")) {
      return { rowCount: 1, rows: [{ kind: "person", market: "ksa" }] };
    }
    if (statement.includes("SELECT draft_version FROM cms_document_availability_states")) {
      return { rowCount: 1, rows: [{ draft_version: 0 }] };
    }
    if (statement.includes("INSERT INTO cms_document_availability_states")) {
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_document_market_availability")) {
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("INSERT INTO cms_audit_events")) {
      auditCount += 1;
      return { rowCount: 1, rows: [] };
    }
    if (statement.includes("SET published_decision=a.draft_decision")) {
      publishedDecision = "off";
      return {
        rowCount: 1,
        rows: [{ market: "ksa", published_decision: "off", published_at: now }],
      };
    }
    if (statement.includes("JOIN cms_document_market_availability a") && statement.includes("WHERE m.id=$2")) {
      return {
        rowCount: 1,
        rows: [{
          market_edition_id: "market-id",
          market: "ksa",
          display_name: "Saudi Arabia",
          enabled: true,
          published_decision: "inherit",
          draft_decision: "off",
          published_effective_available: true,
          preview_effective_available: false,
          has_edition: false,
          updated_at: now,
          published_at: null,
        }],
      };
    }
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 2,
        rows: [
          { code: "ksa", default_locale: "en", fallback_market_code: "uae", fallback_locale: "en", is_canonical: false },
          { code: "uae", default_locale: "en", fallback_market_code: null, fallback_locale: null, is_canonical: true },
        ],
      };
    }
    if (statement.includes("WITH selected AS")) {
      publicSelectionChecked = statement.includes("cms_document_market_availability") &&
        statement.includes("requested.code=$3") &&
        statement.includes("availability.published_decision IS DISTINCT FROM 'off'") &&
        !statement.includes("availability.draft_decision");
      const rows = publishedDecision === "off"
        ? []
        : [{
            ...publicPersonRow("staged-person", "staged-person", "ksa"),
            requested_market: "ksa",
            requested_locale: "en",
            total_count: 1,
          }];
      return { rowCount: rows.length, rows };
    }
    return { rowCount: 0, rows: [] };
  });
  t.mock.method(pool, "connect", async () => ({
    async query(sql: unknown, values: unknown[] = []) {
      const statement = String(sql);
      if (statement === "BEGIN" || statement === "COMMIT" || statement === "ROLLBACK") {
        return { rowCount: 0, rows: [] };
      }
      if (statement === "SELECT id FROM cms_documents WHERE id=$1 FOR UPDATE") {
        return String(values[0]) === "person-id"
          ? { rowCount: 1, rows: [{ id: "person-id" }] }
          : { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT role,status") && statement.includes("FROM cms_users")) {
        assert.deepEqual(values, ["user-id"]);
        return { rowCount: 1, rows: [{ role, status: "active" }] };
      }
      if (statement.includes("LOCK TABLE cms_user_market_assignments IN SHARE MODE")) {
        return { rowCount: 0, rows: [] };
      }
      if (statement.includes("SELECT market_code") && statement.includes("FROM cms_user_market_assignments")) {
        assert.deepEqual(values, ["user-id"]);
        return {
          rowCount: role === "administrator" ? 0 : marketCodes.length,
          rows: role === "administrator" ? [] : marketCodes.map((market_code) => ({ market_code })),
        };
      }
      return pool.query(sql, values);
    },
    release: () => undefined,
  }) as never);

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
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

  const denied = await fetch(`${origin}/api/documents/person-id/market-availability/market-id`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ decision: "off" }),
  });
  assert.equal(denied.status, 403);
  assert.equal(auditCount, 0);

  role = "editor";
  marketCodes = [];
  const unassigned = await fetch(`${origin}/api/documents/person-id/market-availability/market-id`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ decision: "off" }),
  });
  assert.equal(unassigned.status, 403);
  assert.equal(auditCount, 0);

  marketCodes = ["ksa"];
  const updated = await fetch(`${origin}/api/documents/person-id/market-availability/market-id`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ decision: "off", version: 0 }),
  });
  assert.equal(updated.status, 200);
  const stagedResponse = await updated.json() as {
    publishedEffectiveAvailable: boolean;
    pendingDecision: string | null;
    previewEffectiveAvailable: boolean;
  };
  assert.equal(stagedResponse.publishedEffectiveAvailable, true);
  assert.equal(stagedResponse.pendingDecision, "off");
  assert.equal(stagedResponse.previewEffectiveAvailable, false);
  assert.equal(auditCount, 1);

  const beforeRelease = await fetch(`${origin}/api/public/content?market=ksa&locale=en&kind=person`);
  assert.equal(beforeRelease.status, 200);
  assert.deepEqual(
    (await beforeRelease.json() as { items: Array<{ slug: string }> }).items.map((item) => item.slug),
    ["staged-person"],
    "a staged hidden decision must not change public delivery",
  );

  const editorPublish = await fetch(`${origin}/api/documents/person-id/market-availability/market-id/publish`, {
    method: "POST",
    headers,
  });
  assert.equal(editorPublish.status, 403);

  role = "administrator";
  const release = await fetch(`${origin}/api/documents/person-id/market-availability/market-id/publish`, {
    method: "POST",
    headers,
  });
  assert.equal(release.status, 400, "the legacy endpoint cannot publish without a reviewed version");
  assert.equal(auditCount, 1);

  const listed = await fetch(`${origin}/api/public/content?market=ksa&locale=en&kind=person`);
  assert.equal(listed.status, 200);
  assert.deepEqual(
    (await listed.json() as { items: Array<{ slug: string }> }).items.map((item) => item.slug),
    ["staged-person"],
    "the rejected legacy release cannot alter the still-published person visibility",
  );
  assert.equal(publicSelectionChecked, true);
}));

test("public person collection keeps visible records and excludes mixed hidden records", {
  concurrency: false,
}, async (t) => serialMarketAvailabilityTest(async () => {
  const fixture: PublicPersonFixture = {
    markets: [
      {
        code: "ksa",
        default_locale: "en",
        fallback_market_code: "uae",
        fallback_locale: "en",
        is_canonical: false,
      },
      {
        code: "uae",
        default_locale: "en",
        fallback_market_code: null,
        fallback_locale: null,
        is_canonical: true,
      },
    ],
    rows: [
      publicPersonRow("visible-person", "visible-person", "uae"),
      publicPersonRow("hidden-person", "hidden-person", "uae"),
    ],
    decisions: {
      "visible-person:uae": "inherit",
      "hidden-person:uae": "off",
    },
  };
  const origin = await startPublicFixture(t, fixture);

  const collection = await fetch(`${origin}/api/public/content?market=uae&locale=en&kind=person`);
  assert.equal(collection.status, 200);
  const payload = await collection.json() as {
    items: Array<{
      slug: string;
      market: string;
      locale: string;
      requestedMarket: string;
      requestedLocale: string;
      usedFallback: boolean;
    }>;
    market: string;
    requestedMarket: string;
    usedFallback: boolean;
  };
  assert.deepEqual(payload.items.map((item) => item.slug), ["visible-person"]);
  assert.equal(payload.items[0]?.market, "uae");
  assert.equal(payload.items[0]?.requestedMarket, "uae");
  assert.equal(payload.items[0]?.usedFallback, false);
  assert.equal(payload.total, 1);

  const hiddenDetail = await fetch(`${origin}/api/public/content/uae/en/person/hidden-person`);
  assert.equal(hiddenDetail.status, 404, "hidden people must not resolve through the public detail API");
}));

test("public person collection returns no records when every requested-market record is hidden", {
  concurrency: false,
}, async (t) => serialMarketAvailabilityTest(async () => {
  const fixture: PublicPersonFixture = {
    markets: [
      {
        code: "ksa",
        default_locale: "en",
        fallback_market_code: "uae",
        fallback_locale: "en",
        is_canonical: false,
      },
      {
        code: "uae",
        default_locale: "en",
        fallback_market_code: null,
        fallback_locale: null,
        is_canonical: true,
      },
    ],
    rows: [publicPersonRow("hidden-founder", "hidden-founder", "uae")],
    decisions: { "hidden-founder:uae": "off" },
  };
  const origin = await startPublicFixture(t, fixture);

  const collection = await fetch(`${origin}/api/public/content?market=uae&locale=en&kind=person`);
  assert.equal(collection.status, 200);
  const payload = await collection.json() as {
    items: Array<{
      slug: string;
      market: string;
      locale: string;
      requestedMarket: string;
      requestedLocale: string;
      usedFallback: boolean;
    }>;
    market: string;
    requestedMarket: string;
    usedFallback: boolean;
  };
  assert.deepEqual(payload.items, []);
  assert.equal(payload.total, 0);
  assert.equal(
    (await fetch(`${origin}/api/public/content/uae/en/person/hidden-founder`)).status,
    404,
  );
}));

test("requested-market person availability falls back to a published UAE edition when not explicitly hidden", {
  concurrency: false,
}, async (t) => serialMarketAvailabilityTest(async () => {
  const fixture: PublicPersonFixture = {
    markets: [
      {
        code: "ksa",
        default_locale: "en",
        fallback_market_code: "uae",
        fallback_locale: "en",
        is_canonical: false,
      },
      {
        code: "uae",
        default_locale: "en",
        fallback_market_code: null,
        fallback_locale: null,
        is_canonical: true,
      },
    ],
    rows: [publicPersonRow("uae-fallback-person", "uae-fallback-person", "uae", "ksa")],
    decisions: { "uae-fallback-person:ksa": "inherit" },
  };
  const origin = await startPublicFixture(t, fixture);

  const response = await fetch(`${origin}/api/public/content?market=ksa&locale=en&kind=person`);
  assert.equal(response.status, 200);
  const payload = await response.json() as {
    items: Array<{
      slug: string;
      market: string;
      locale: string;
      requestedMarket: string;
      requestedLocale: string;
      usedFallback: boolean;
    }>;
    market: string;
    requestedMarket: string;
    usedFallback: boolean;
  };
  assert.deepEqual(payload.items.map((item) => item.slug), ["uae-fallback-person"]);
  assert.equal(payload.items[0]?.market, "uae");
  assert.equal(payload.items[0]?.locale, "en");
  assert.equal(payload.items[0]?.requestedMarket, "ksa");
  assert.equal(payload.items[0]?.requestedLocale, "en");
  assert.equal(payload.items[0]?.usedFallback, true);
  assert.equal(payload.market, "uae");
  assert.equal(payload.requestedMarket, "ksa");
  assert.equal(payload.usedFallback, true);
}));

type PersonDecision = "inherit" | "show" | "off";

type PublicPersonFixture = {
  markets: Array<Record<string, unknown>>;
  rows: Array<Record<string, any>>;
  decisions: Record<string, PersonDecision>;
};

function publicPersonRow(
  id: string,
  slug: string,
  market: string,
  requestedMarket = market,
): Record<string, any> {
  const now = new Date("2026-09-11T00:00:00.000Z");
  return {
    id,
    kind: "person",
    market,
    locale: "en",
    published_at: now,
    updated_at: now,
    localized_slug: slug,
    revision_id: `${id}-revision`,
    revision_number: 1,
    requested_market: requestedMarket,
    requested_locale: "en",
    payload: {
      slug,
      title: `${slug} title`,
      summary: `${slug} summary`,
      content: {
        schemaVersion: 1,
        role: "leader",
        title: `${slug} title`,
        biography: `${slug} biography`,
        contribution: `${slug} contribution`,
        focusAreas: [],
        profileLinks: [],
        approvedFallback: "initials",
        visibility: "public",
        order: 0,
        sources: [{
          label: "Fixture source",
          url: "https://example.com/fixture-source",
          accessedAt: "2026-09-11",
        }],
        verificationDate: "2026-09-11",
        reviewDate: "2027-09-11",
        relatedIds: [],
      },
      mediaIds: [],
      markets: [market],
    },
  };
}

async function startPublicFixture(t: any, fixture: PublicPersonFixture): Promise<string> {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "market-public-test-session-secret-long-enough";

  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);

  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return { rowCount: fixture.markets.length, rows: fixture.markets };
    }
    if (statement.includes("WITH selected AS")) {
      assert.match(statement, /requested\.code=\$3/);
      assert.match(statement, /cms_document_market_availability availability/);
      assert.match(statement, /availability\.published_decision IS DISTINCT FROM 'off'/);
      assert.doesNotMatch(statement, /availability\.draft_decision/);
      const requestedMarket = String(values?.[2]);
      const requestedSlug = statement.includes("source_rank=1") ? String(values?.[1]) : null;
      const rows = fixture.rows
        .filter((row) =>
          fixture.decisions[`${row.id}:${requestedMarket}`] !== "off"
          && (requestedSlug === null || row.localized_slug === requestedSlug)
        )
        .map((row) => ({
          ...row,
          requested_market: requestedMarket,
          requested_locale: String(values?.[3]),
          total_count: fixture.rows.filter(
            (candidate) => fixture.decisions[`${candidate.id}:${requestedMarket}`] !== "off",
          ).length,
        }));
      return { rowCount: rows.length, rows };
    }
    if (statement.includes("SELECT d.id,d.kind,e.market")) {
      const requestedMarket = String(values?.[2]);
      const slug = String(values?.[1]);
      const row = fixture.rows.find((candidate) =>
        candidate.localized_slug === slug &&
        fixture.decisions[`${candidate.id}:${requestedMarket}`] !== "off"
      );
      if (!row) return { rowCount: 0, rows: [] };
      return {
        rowCount: 1,
        rows: [{
          ...row,
          requested_market: requestedMarket,
          requested_locale: String(values?.[4]),
        }],
      };
    }
    if (statement.includes("SELECT a.*,v.id version_id")) {
      return { rowCount: 0, rows: [] };
    }
    if (statement.includes("WITH publication_history")) {
      return {
        rowCount: 1,
        rows: [{ is_configured: true, configured_page_paths: [] }],
      };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
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
  return `http://127.0.0.1:${address.port}`;
}
