import assert from "node:assert/strict";
import test from "node:test";

test("office fallback changes only after publication and remains configured after archival", { concurrency: false }, async (t) => {
  const priorDatabaseUrl = process.env.DATABASE_URL;
  const priorSessionSecret = process.env.SESSION_SECRET;
  process.env.DATABASE_URL = "postgres://test.invalid/cognirise";
  process.env.SESSION_SECRET = "office-publication-history-test-secret-long-enough";

  const [{ default: app }, { pool }] = await Promise.all([
    import("../src/app.ts"),
    import("@workspace/db"),
  ]);
  let approvedAt: Date | null = null;
  let publishedAt: Date | null = null;
  let publicationState: "draft" | "published" | "archived" = "draft";
  let scheduledPublicationRecorded = false;
  let immediatePublicationRecorded = false;

  t.mock.method(pool, "query", async (sql: unknown) => {
    const statement = String(sql);
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
      const usesImmediatePublicationHistory =
        statement.includes("publication_event.action='document.published'")
        && statement.includes("publication_event.metadata->>'scheduled'");
      return {
        rowCount: 1,
        rows: [{
          is_configured: usesImmediatePublicationHistory
            ? immediatePublicationRecorded
            : approvedAt !== null,
        }],
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
  const endpoint =
    `http://127.0.0.1:${address.port}/api/public/content?market=uae&locale=en&kind=office`;
  const configured = async () => {
    const response = await fetch(endpoint);
    assert.equal(response.status, 200);
    return (await response.json() as { isConfigured: boolean }).isConfigured;
  };

  assert.equal(await configured(), false, "a draft keeps compiled fallback active");
  approvedAt = new Date();
  assert.equal(await configured(), false, "approval alone keeps compiled fallback active");
  scheduledPublicationRecorded = true;
  assert.equal(await configured(), false, "scheduling alone keeps compiled fallback active");
  assert.equal(scheduledPublicationRecorded, true);
  publicationState = "published";
  publishedAt = new Date();
  immediatePublicationRecorded = true;
  assert.equal(await configured(), true, "first publication disables compiled fallback");
  publicationState = "archived";
  assert.equal(await configured(), true, "archival retains publication history");
  publicationState = "draft";
  publishedAt = null;
  assert.equal(await configured(), true, "restore cannot reactivate compiled fallback");
  assert.equal(publicationState, "draft", "restore clears mutable edition publication state");
  assert.equal(publishedAt, null, "restore clears the edition publication timestamp");
});