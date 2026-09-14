import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  GUARDRAILS_SET_PROVE_HOLD_OPERATION,
  GUARDRAILS_SET_PROVE_HOLD_RECEIPT,
  guardrailsPublicationScope,
  guardrailsSetProveHoldResultDigest,
  guardrailsSetProveHoldSnapshot,
  guardrailsSetProveHoldSnapshotDigest,
  recordGuardrailsReleaseReceipt,
  stageGuardrailsSetProveHold,
} from "./guardrails-set-prove-hold-reconciliation.js";

const documentId = "00000000-0000-4000-8000-000000000001";
const editionId = "00000000-0000-4000-8000-000000000002";
const revisionId = "00000000-0000-4000-8000-000000000003";
const laterRevisionId = "00000000-0000-4000-8000-000000000004";

function exactReceipt() {
  return {
    operation: GUARDRAILS_SET_PROVE_HOLD_OPERATION,
    subject_id: revisionId,
    request_digest: guardrailsSetProveHoldSnapshotDigest,
    result_digest: guardrailsSetProveHoldResultDigest(revisionId),
  };
}

function replayClient(latestId = revisionId): {
  statements: string[];
  query: (text: string) => Promise<{ rowCount: number; rows: Record<string, any>[] }>;
} {
  const statements: string[] = [];
  return {
    statements,
    async query(text: string) {
      statements.push(text);
      if (text.includes("FROM cms_operation_receipts")) return { rowCount: 1, rows: [exactReceipt()] };
      if (text.includes("FROM cms_revisions r")) {
        return {
          rowCount: 1,
          rows: [{
            id: revisionId,
            edition_id: editionId,
            document_id: documentId,
            canonical_slug: "guardrails-framework",
          kind: "framework",
          document_status: "active",
          market: "uae",
          locale: "en",
          localized_slug: "guardrails-framework",
            payload: guardrailsSetProveHoldSnapshot,
            content_digest: guardrailsSetProveHoldSnapshotDigest,
          }],
        };
      }
      if (text.includes("ORDER BY revision_number DESC,created_at DESC,id DESC")) {
        return { rowCount: 1, rows: [{ id: latestId }] };
      }
      throw new Error(`Unexpected SQL: ${text.slice(0, 100)}`);
    },
  };
}

function hasWrite(statements: string[]): boolean {
  return statements.some((statement) => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(statement));
}

test("an exact receipt replays its immutable media-free replacement without a write", async () => {
  const client = replayClient();
  const result = await stageGuardrailsSetProveHold(client, true);

  assert.deepEqual(result, { documentId, editionId, revisionId, outcome: "replayed" });
  assert.equal(hasWrite(client.statements), false);
  assert.equal("heroMedia" in guardrailsSetProveHoldSnapshot.content, false);
  assert.equal("heroMediaId" in guardrailsSetProveHoldSnapshot.content, false);
  assert.equal(client.statements.some((statement) => /cms_media|media_references|media_versions/i.test(statement)), false);
});

test("a later editor successor is preserved even when the replacement receipt is intact", async () => {
  const client = replayClient(laterRevisionId);
  const result = await stageGuardrailsSetProveHold(client, true);

  assert.deepEqual(result, { documentId, editionId, revisionId, outcome: "preserved" });
  assert.equal(hasWrite(client.statements), false);
});

test("a receipt cannot replay a replacement into a different kind, status, market, locale, or localized route", async () => {
  for (const field of ["kind", "document_status", "market", "locale", "localized_slug"] as const) {
    const client = replayClient();
    const originalQuery = client.query;
    client.query = async (text: string) => {
      const result = await originalQuery(text);
      if (text.includes("FROM cms_revisions r")) {
        return {
          ...result,
          rows: result.rows.map((row) => ({
            ...row,
            [field]: field === "kind" ? "article"
              : field === "document_status" ? "archived"
                : field === "market" ? "ksa"
                  : field === "locale" ? "ar" : "another-route",
          })),
        };
      }
      return result;
    };
    await assert.rejects(() => stageGuardrailsSetProveHold(client, true), /receipt no longer identifies/i);
    assert.equal(hasWrite(client.statements), false, `${field} mismatch must not write`);
  }
});

test("a conflicting receipt fails closed before any document or publication mutation", async () => {
  const client = replayClient();
  const originalQuery = client.query;
  client.query = async (text: string) => {
    if (text.includes("FROM cms_operation_receipts")) {
      return { rowCount: 1, rows: [{ ...exactReceipt(), request_digest: "wrong-source-digest" }] };
    }
    return originalQuery(text);
  };

  await assert.rejects(() => stageGuardrailsSetProveHold(client, true), /receipt conflicts/i);
  assert.equal(hasWrite(client.statements), false);
});

test("an unreceipted existing predecessor is rejected instead of overwriting published history", async () => {
  const statements: string[] = [];
  const client = {
    statements,
    async query(text: string) {
      statements.push(text);
      if (text.includes("WHERE idempotency_key=$1 FOR UPDATE")) return { rowCount: 0, rows: [] };
      if (text.includes("FROM cms_users")) return { rowCount: 1, rows: [{ id: "author", email: "author@example.invalid" }] };
      if (text.includes("FROM cms_documents")) return { rowCount: 1, rows: [{ id: documentId, kind: "framework", status: "active" }] };
      if (text.includes("FROM cms_market_editions")) return { rowCount: 1, rows: [{ id: editionId }] };
      if (text.includes("ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC")) {
        return { rowCount: 1, rows: [{ id: laterRevisionId, payload: { editor: "newer work" } }] };
      }
      if (text.includes("idempotency_key=ANY")) return { rowCount: 0, rows: [] };
      throw new Error(`Unexpected SQL: ${text.slice(0, 100)}`);
    },
  };

  await assert.rejects(() => stageGuardrailsSetProveHold(client, true), /not the exact receipted Guardrails predecessor/i);
  assert.equal(hasWrite(statements), false);
});

test("a legacy receipt with a mismatched predecessor payload digest is rejected before successor creation", async () => {
  const statements: string[] = [];
  const client = {
    async query(text: string) {
      statements.push(text);
      if (text.includes("WHERE idempotency_key=$1 FOR UPDATE")) return { rowCount: 0, rows: [] };
      if (text.includes("FROM cms_users")) return { rowCount: 1, rows: [{ id: "author", email: "author@example.invalid" }] };
      if (text.includes("FROM cms_documents")) return { rowCount: 1, rows: [{ id: documentId, kind: "framework", status: "active" }] };
      if (text.includes("FROM cms_market_editions")) return { rowCount: 1, rows: [{ id: editionId }] };
      if (text.includes("ORDER BY r.revision_number DESC,r.created_at DESC,r.id DESC")) {
        return {
          rowCount: 1,
          rows: [{
            id: laterRevisionId,
            payload: { legacy: "edited after its receipt" },
            content_digest: "0".repeat(64),
            document_id: documentId,
            kind: "framework",
            document_status: "active",
            market: "uae",
            locale: "en",
            localized_slug: "guardrails-framework",
          }],
        };
      }
      if (text.includes("idempotency_key=ANY")) {
        return {
          rowCount: 1,
          rows: [{
            idempotency_key: "cms.guardrails.page.stage-v1",
            operation: "cms.framework.guardrails-page-staged",
            subject_id: laterRevisionId,
            request_digest: "1".repeat(64),
            result_digest: "2".repeat(64),
          }],
        };
      }
      throw new Error(`Unexpected SQL: ${text.slice(0, 100)}`);
    },
  };
  await assert.rejects(
    () => stageGuardrailsSetProveHold(client, true),
    /predecessor no longer binds its exact document, edition, payload, and digest/i,
  );
  assert.equal(hasWrite(statements), false);
});

test("the scoped publisher can only use the audited MFA and CSRF CMS lifecycle", () => {
  assert.deepEqual(guardrailsPublicationScope, {
    loginPath: "/api/auth/login",
    mfaPath: "/api/auth/mfa/verify",
    publishPath: "/api/documents/:documentId/publish",
    publicPath: "/api/public/content/uae/en/framework/guardrails-framework",
    requires: ["private-fixture-administrator", "totp-mfa", "csrf"],
    publicationMechanism: "authenticated-cms-api",
  });
  const source = readFileSync(new URL("./guardrails-set-prove-hold-reconciliation.ts", import.meta.url), "utf8");
  assert.match(source, /x-csrf-token/);
  assert.match(source, /security\.totp/);
  assert.match(source, /\/documents\/\$\{documentId\}\/publish/);
  assert.doesNotMatch(source, /UPDATE\s+cms_market_editions\s+SET\s+[^;]*(?:publication_state|published_revision_id)/i);
});

test("a public pointer without the ordinary document.published audit cannot receive a release receipt", async () => {
  const statements: string[] = [];
  const client = {
    async query(text: string) {
      statements.push(text);
      if (text.includes("FROM cms_operation_receipts")) return { rowCount: 0, rows: [] };
      if (text.includes("FROM cms_market_editions")) return { rowCount: 1, rows: [{ published_revision_id: revisionId }] };
      if (text.includes("FROM cms_audit_events")) return { rowCount: 0, rows: [] };
      throw new Error(`Unexpected SQL: ${text.slice(0, 100)}`);
    },
  };
  await assert.rejects(
    () => recordGuardrailsReleaseReceipt(client, documentId, revisionId),
    /publication audit and exact public pointer are required/i,
  );
  assert.equal(hasWrite(statements), false);
});

test("fixture cleanup cannot erase a real document audit merely because a disposable user performed it", () => {
  const fixture = readFileSync(new URL("../../cms-owner-browser-fixture.ts", import.meta.url), "utf8");
  assert.match(fixture, /target_id=ANY\(\$2::text\[\]\)\s+OR \(actor_user_id=ANY\(\$1::uuid\[\]\) AND target_id=ANY\(\$2::text\[\]\)\)/);
  assert.doesNotMatch(fixture, /actor_user_id=ANY\(\$1::uuid\[\]\)\s+OR target_id=ANY\(\$2::text\[\]\)/);
});

test("post-merge runs the credential-bound replacement release, not the obsolete Guardrails manuscript stage", () => {
  const postMerge = readFileSync(new URL("../../post-merge.sh", import.meta.url), "utf8");
  assert.match(postMerge, /cms:owner-browser-fixture/);
  assert.match(postMerge, /--development setup --credentials/);
  assert.match(postMerge, /--development cleanup --credentials/);
  assert.match(postMerge, /cms:release-guardrails-set-prove-hold/);
  assert.match(postMerge, /pnpm --filter @workspace\/api-server build/);
  assert.match(postMerge, /PORT="\$guardrails_api_port" NODE_ENV=development/);
  assert.match(postMerge, /127\.0\.0\.1:\$\{guardrails_api_port\}\/api/);
  assert.match(postMerge, /--verify-preview/);
  assert.match(postMerge, /trap cleanup_guardrails_release EXIT/);
  assert.doesNotMatch(postMerge, /src\/cms\/guardrails-reconciliation\.ts/);
  assert.doesNotMatch(postMerge, /cms:stage-agent-authority-guardrails/);
});