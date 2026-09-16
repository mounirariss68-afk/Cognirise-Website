import assert from "node:assert/strict";
import test from "node:test";
import { createPublicationTransactionFixture } from "./publication-transaction-fixture.ts";

function createFixture() {
  return createPublicationTransactionFixture({
    documentLocks: { "document-id": "document-id" },
    unexpectedSqlLabel: "fixture contract",
    query: () => undefined,
  });
}

test("publication transaction fixtures accept read-only safeguards and verify commit order", async () => {
  const fixture = createFixture();
  await fixture.client.query("BEGIN");
  await fixture.client.query("SELECT current_setting('transaction_isolation')");
  await fixture.client.query("LOCK TABLE cms_publication_guard IN SHARE MODE");
  await fixture.client.query("COMMIT");
  fixture.assertCommitted();
});

test("publication transaction fixtures reject unexpected mutations", async () => {
  const fixture = createFixture();
  await fixture.client.query("BEGIN");
  await assert.rejects(
    fixture.client.query("UPDATE cms_market_editions SET publication_state='published'"),
    /unexpected fixture contract mutation SQL/,
  );
  await fixture.client.query("ROLLBACK");
  fixture.assertRolledBack();
});

test("publication transaction fixtures reject commit or rollback before begin", async () => {
  const fixture = createFixture();
  await assert.rejects(fixture.client.query("COMMIT"), /COMMIT must follow BEGIN/);
  await assert.rejects(fixture.client.query("ROLLBACK"), /ROLLBACK must follow BEGIN/);
});