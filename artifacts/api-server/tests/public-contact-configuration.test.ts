import assert from "node:assert/strict";
import test from "node:test";

test("public contact configuration requires a valid approved publication and follows market fallback", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "contact-configuration-test-secret-long-enough";

  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);

  let publication: "none" | "invalid" | "uae" | "local" = "none";
  t.mock.method(pool, "query", async (sql: unknown, values?: unknown[]) => {
    const statement = String(sql);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 2,
        rows: [
          {
            code: "saudi-arabia",
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
      };
    }
    if (statement.includes("d.canonical_slug=$1")) {
      assert.equal(values?.[0], "site-contact-email");
      assert.match(statement, /r\.workflow_state='approved'/);
      assert.match(statement, /e\.publication_state='published'/);
      assert.match(statement, /d\.status<>'archived'/);
      if (publication === "none") return { rowCount: 0, rows: [] };
      const invalid = publication === "invalid";
      const local = publication === "local";
      return {
        rowCount: 1,
        rows: [{
          id: "00000000-0000-4000-8000-000000000001",
          market: local ? "saudi-arabia" : "uae",
          locale: "en",
          published_at: "2026-09-09T10:00:00.000Z",
          updated_at: "2026-09-09T10:00:00.000Z",
          revision_id: "00000000-0000-4000-8000-000000000002",
          revision_number: local ? 3 : 2,
          payload: {
            slug: "site-contact-email",
            title: "Public contact email",
            summary: null,
            content: {
              schemaVersion: 1,
              configuration: "contact-email",
              contactEmail: invalid ? "invalid" : local ? "hello@cognirise.sa" : "hello@cognirise.ai",
            },
            seo: { noIndex: false },
            mediaIds: [],
            markets: [local ? "saudi-arabia" : "uae"],
          },
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });

  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) =>
      server.close((error) => error ? reject(error) : resolve()),
    );
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
    if (priorSessionSecret === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = priorSessionSecret;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const endpoint = `http://127.0.0.1:${address.port}/api/public/contact-configuration?market=saudi-arabia&locale=en`;

  assert.equal((await fetch(endpoint)).status, 404, "unpublished configuration stays private");
  publication = "invalid";
  assert.equal((await fetch(endpoint)).status, 404, "invalid published payload is excluded");

  publication = "uae";
  const fallbackResponse = await fetch(endpoint);
  assert.equal(fallbackResponse.status, 200);
  assert.deepEqual(await fallbackResponse.json(), {
    contactEmail: "hello@cognirise.ai",
    market: "uae",
    locale: "en",
    requestedMarket: "saudi-arabia",
    usedFallback: true,
    revision: 2,
    publishedAt: "2026-09-09T10:00:00.000Z",
  });

  publication = "local";
  const localResponse = await fetch(endpoint);
  assert.equal(localResponse.status, 200);
  const local = await localResponse.json() as { contactEmail: string; usedFallback: boolean };
  assert.equal(local.contactEmail, "hello@cognirise.sa");
  assert.equal(local.usedFallback, false);
});