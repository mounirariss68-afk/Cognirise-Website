import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const sourceUrl = new URL("./guardrails-reconciliation.ts", import.meta.url);

test("Guardrails redesign reconciliation is development-only, private, exact-baseline and receipt-bound", async () => {
  const source = await readFile(sourceUrl, "utf8");
  for (const required of [
    "NODE_ENV === \"production\"",
    "REPLIT_DEPLOYMENT === \"1\"",
    "--target=development",
    "GUARDRAILS_STAGE_RECEIPT",
    "GUARDRAILS_REDESIGN_MEDIA_RECEIPT",
    "GUARDRAILS_REDESIGN_RECEIPT",
    "pg_advisory_xact_lock",
    "FOR UPDATE",
    "private, max-age=31536000, immutable",
    "object.download()",
    "pending-review",
    'rightsStatus: "needs-review"',
    'accessibilityStatus: "needs-review"',
    'outcome: "preserved"',
    "cms_media_references",
  ]) assert.ok(source.includes(required), `Expected reconciliation source to contain ${required}.`);
  assert.doesNotMatch(source, /UPDATE cms_market_editions/);
  assert.doesNotMatch(source, /UPDATE cms_revisions/);
  assert.doesNotMatch(source, /DELETE FROM/);
});