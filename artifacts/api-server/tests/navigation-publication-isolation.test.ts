import assert from "node:assert/strict";
import test from "node:test";

test("public navigation resolves only the atomic published snapshot", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);
  const statements: string[] = [];
  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
    statements.push(statement);
    if (statement.includes("FROM market_editions WHERE enabled=true")) {
      return {
        rowCount: 1,
        rows: [{
          code: "uae", display_name: "United Arab Emirates", default_locale: "en",
          fallback_market_code: null, fallback_locale: null, is_canonical: true,
        }],
      };
    }
    if (statement.includes("cms_navigation_published_policies")) {
      return {
        rowCount: 1,
        rows: [{
          items: [{
            id: "platforms", label: "Published platforms", parentId: null, order: 0,
            destination: "/platforms", visible: true,
          }],
          pages: [{ path: "/platforms", enabled: true }],
          published_at: new Date("2026-01-01T00:00:00Z"),
        }],
      };
    }
    return { rowCount: 0, rows: [] };
  });
  const server = app.listen(0, "127.0.0.1");
  await new Promise<void>((resolve) => server.once("listening", resolve));
  t.after(async () => {
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    if (priorDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = priorDatabaseUrl;
  });
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  const response = await fetch(`http://127.0.0.1:${address.port}/api/public/navigation?market=uae&locale=en`);
  assert.equal(response.status, 200);
  const body = await response.json() as { items: Array<{ label: string }>; isConfigured: boolean };
  assert.equal(body.items[0]?.label, "Published platforms");
  assert.equal(body.isConfigured, true);
  assert.ok(statements.some((statement) => statement.includes("cms_navigation_published_policies")));
  assert.equal(statements.some((statement) => statement.includes("cms_navigation_editions")), false);
  assert.equal(statements.some((statement) => statement.includes("cms_page_availability")), false);
  const configurationResponse = await fetch(`http://127.0.0.1:${address.port}/api/public/configuration`);
  assert.equal(configurationResponse.status, 200);
  const configuration = await configurationResponse.json() as {
    markets: Array<{ code: string; defaultLocale: string; locales: string[]; isCanonical: boolean }>;
  };
  assert.deepEqual(configuration.markets, [{
    code: "uae",
    displayName: "United Arab Emirates",
    defaultLocale: "en",
    locales: ["en"],
    isCanonical: true,
  }]);
});