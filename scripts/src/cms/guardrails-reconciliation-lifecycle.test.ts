import assert from "node:assert/strict";
import test from "node:test";
import {
  GUARDRAILS_REDESIGN_OPERATION,
  GUARDRAILS_REDESIGN_RECEIPT,
  guardrailsRedesignRequestDigest,
  guardrailsRedesignResultDigest,
  guardrailsRedesignSnapshotDigest,
  stageRedesign,
} from "./guardrails-reconciliation.js";
import { redesignedGuardrailsSnapshot } from "./guardrails-redesign.js";

const baseline = {
  id: "00000000-0000-4000-8000-000000000001",
  edition_id: "00000000-0000-4000-8000-000000000002",
  document_id: "00000000-0000-4000-8000-000000000003",
};
const hero = {
  mediaId: "00000000-0000-4000-8000-000000000004",
  mediaVersionId: "00000000-0000-4000-8000-000000000005",
};
const stagedRevisionId = "00000000-0000-4000-8000-000000000006";

function receipt() {
  return {
    operation: GUARDRAILS_REDESIGN_OPERATION,
    subject_id: stagedRevisionId,
    request_digest: guardrailsRedesignRequestDigest(baseline, hero),
    result_digest: guardrailsRedesignResultDigest(stagedRevisionId, hero),
  };
}

function immutableRevision(workflow_state: string) {
  return {
    id: stagedRevisionId,
    edition_id: baseline.edition_id,
    payload: redesignedGuardrailsSnapshot(hero),
    content_digest: guardrailsRedesignSnapshotDigest(hero),
    workflow_state,
  };
}

function receiptClient(latestId: string, workflowState = "draft") {
  const statements: string[] = [];
  return {
    statements,
    async query(text: string) {
      statements.push(text);
      if (text.includes("FROM cms_operation_receipts")) return { rowCount: 1, rows: [receipt()] };
      if (text.includes("FROM cms_revisions WHERE id=$1")) return { rowCount: 1, rows: [immutableRevision(workflowState)] };
      if (text.includes("FROM cms_media_references")) {
        return { rowCount: 1, rows: [{ asset_id: hero.mediaId, media_version_id: hero.mediaVersionId }] };
      }
      if (text.includes("ORDER BY revision_number DESC LIMIT 1")) return { rowCount: 1, rows: [{ id: latestId }] };
      throw new Error(`Unexpected SQL in lifecycle test: ${text.slice(0, 80)}`);
    },
  };
}

test("a legitimate normal revision after the exact receipted redesign is preserved without mutation", async () => {
  const client = receiptClient("00000000-0000-4000-8000-000000000007");
  const result = await stageRedesign(client, { id: "author", email: "author@example.invalid" }, baseline, hero, true);
  assert.deepEqual(result, { revisionId: stagedRevisionId, outcome: "preserved" });
  assert.equal(client.statements.some((sql) => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(sql)), false);
});

test("a lifecycle-published receipted revision replays as an immutable no-op", async () => {
  const client = receiptClient(stagedRevisionId, "published");
  const result = await stageRedesign(client, { id: "author", email: "author@example.invalid" }, baseline, hero, true);
  assert.deepEqual(result, { revisionId: stagedRevisionId, outcome: "replayed" });
  assert.equal(client.statements.some((sql) => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(sql)), false);
});

test("an unreceipted redesign never replaces a newer edited baseline", async () => {
  const statements: string[] = [];
  const newerRevisionId = "00000000-0000-4000-8000-000000000008";
  const client = {
    statements,
    async query(text: string) {
      statements.push(text);
      if (text.includes("FROM cms_operation_receipts")) return { rowCount: 0, rows: [] };
      if (text.includes("ORDER BY revision_number DESC LIMIT 1")) {
        return {
          rowCount: 1,
          rows: [{
            id: newerRevisionId,
            revision_number: 3,
            payload: { editor: "newer work" },
            content_digest: "different",
            workflow_state: "draft",
          }],
        };
      }
      throw new Error(`Unexpected SQL in pre-stage preservation test: ${text.slice(0, 80)}`);
    },
  };
  const result = await stageRedesign(client, { id: "author", email: "author@example.invalid" }, baseline, hero, true);
  assert.deepEqual(result, { revisionId: newerRevisionId, outcome: "preserved" });
  assert.equal(statements.some((sql) => /^\s*(?:INSERT|UPDATE|DELETE)\b/i.test(sql)), false);
});