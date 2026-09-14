import assert from "node:assert/strict";
import test from "node:test";
import { frameworkGuardrailsSummarySchema } from "@workspace/api-zod";
import { agentAuthorityGuardrails } from "./agent-authority-guardrails.js";
import {
  TASK_335_SUMMARY_OPERATION,
  assertCurrentSummarySource,
  assertLatestReceiptRevision,
  assertTask335FrameworkSource,
  assertExactTask335MediaPins,
  canonicalJson,
  collectTask335MediaPins,
  digest,
  reconcileTask335Summary,
  stagedSummaryFrameworkPayload,
  task335Summary,
  verifySummaryReplay,
} from "./task-335-agent-authority-summary.js";

function legacyGuardrails() {
  const copy = JSON.parse(JSON.stringify(agentAuthorityGuardrails)) as Record<string, any>;
  delete copy.summary;
  return copy;
}

test("Task 335 summary fixture satisfies the all-required four-rule contract", () => {
  assert.equal(frameworkGuardrailsSummarySchema.safeParse(task335Summary).success, true);
  assert.equal(task335Summary.rules.length, 4);
  assert.match(task335Summary.rules[1].body, /one level below/i);
  assert.match(task335Summary.rules[1].body, /within its exposure limit/i);
  assert.match(task335Summary.rules[1].body, /incident demotes/i);
  assert.equal(task335Summary.firstFigure.asset, agentAuthorityGuardrails.firstFigure.asset);
  assert.match(task335Summary.firstFigure.captionLead, /One common setting, or individually governed handovers/);
  assert.match(task335Summary.firstFigure.captionBody, /not an agent-wide claim/);
});

test("Task 335 media collection preserves exact source pins and rejects incomplete sets", () => {
  const assetId = "11111111-1111-4111-8111-111111111111";
  const versionId = "22222222-2222-4222-8222-222222222222";
  const payload = {
    mediaIds: [assetId],
    content: {
      heroMedia: { mediaId: assetId, mediaVersionId: versionId, role: "hero" },
    },
  };
  const expected = collectTask335MediaPins(payload, [{ assetId, mediaVersionId: versionId }]);
  assert.deepEqual(expected, [{ assetId, mediaVersionId: versionId }]);
  assert.doesNotThrow(() => assertExactTask335MediaPins(expected, expected));
  assert.throws(
    () => assertExactTask335MediaPins(expected, []),
    /complete governed source-revision pin set/,
  );
  assert.throws(
    () => collectTask335MediaPins(payload, [{
      assetId,
      mediaVersionId: "33333333-3333-4333-8333-333333333333",
    }]),
    /exact source-revision pin/,
  );
});

test("Task 335 requires the exact framework target and rejects stale published sources", () => {
  assert.doesNotThrow(() => assertTask335FrameworkSource({
    slug: "agent-authority-model",
    content: { template: "agent-authority" },
  }, { kind: "framework", canonicalSlug: "agent-authority-model", documentStatus: "active" }));
  assert.throws(
    () => assertTask335FrameworkSource({
      slug: "other-framework",
      content: { template: "agent-authority" },
    }),
    /slug is not agent-authority-model/,
  );
  assert.throws(
    () => assertTask335FrameworkSource({
      slug: "agent-authority-model",
      content: { template: "other-framework" },
    }),
    /template is not agent-authority/,
  );
  assert.doesNotThrow(() => assertCurrentSummarySource({
    sourceId: "draft-2",
    sourceWorkflowState: "draft",
    sourceRevisionId: "published-1",
    publishedRevisionId: "published-1",
    publishedWorkflowState: "approved",
    lineageIncludesPublished: true,
  }));
  assert.throws(
    () => assertCurrentSummarySource({
      sourceId: "stale-draft",
      sourceWorkflowState: "draft",
      sourceRevisionId: "old-published",
      publishedRevisionId: "published-2",
      publishedWorkflowState: "approved",
      lineageIncludesPublished: false,
    }),
    /stale draft source/,
  );
});

test("Task 335 replay rejects a newer editorial draft instead of falsely replaying", async () => {
  assert.throws(
    () => assertLatestReceiptRevision("newer-draft", "task-335-draft"),
    /newer editorial revision/,
  );
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes("FROM cms_documents")) {
        return {
          rowCount: 1,
          rows: [{
            document_id: "document-1",
            kind: "framework",
            canonical_slug: "agent-authority-model",
            document_status: "active",
            edition_id: "edition-1",
            publication_state: "published",
            published_revision_id: "published-1",
            published_workflow_state: "approved",
          }],
        };
      }
      if (sql.includes("FROM cms_operation_receipts")) {
        return {
          rowCount: 1,
          rows: [{
            operation: TASK_335_SUMMARY_OPERATION,
            subject_id: "task-335-draft",
            request_digest: digest(task335Summary),
            result_digest: "immutable-result",
          }],
        };
      }
      if (sql.includes("ORDER BY revision_number DESC")) {
        return {
          rowCount: 1,
          rows: [{ id: "newer-draft", revision_number: 3 }],
        };
      }
      throw new Error(`Unexpected replay query: ${sql}`);
    },
  };
  await assert.rejects(
    () => reconcileTask335Summary(client, false),
    /newer editorial revision/,
  );
  assert.equal(calls.some((sql) => sql.includes("WHERE r.id=$1")), false);
});

test("Task 335 media repair rejects absent receipt before any normal staging SQL", async () => {
  const calls: string[] = [];
  const client = {
    query: async (sql: string) => {
      calls.push(sql);
      if (sql.includes("pg_advisory_xact_lock")) {
        return { rowCount: 1, rows: [] };
      }
      if (sql.includes("FROM cms_documents")) {
        return {
          rowCount: 1,
          rows: [{
            document_id: "document-1",
            kind: "framework",
            canonical_slug: "agent-authority-model",
            document_status: "active",
            edition_id: "edition-1",
            publication_state: "published",
            published_revision_id: "published-1",
            published_workflow_state: "approved",
          }],
        };
      }
      if (sql.includes("FROM cms_operation_receipts")) {
        return { rowCount: 0, rows: [] };
      }
      throw new Error(`Unexpected SQL after absent-receipt guard: ${sql}`);
    },
  };
  await assert.rejects(
    () => reconcileTask335Summary(client, true, true),
    /existing summary staging receipt; no normal staging is permitted/,
  );
  assert.equal(calls.some((sql) => /\bINSERT\b/i.test(sql)), false);
  assert.equal(calls.some((sql) => sql.includes("ORDER BY revision_number DESC")), false);
});

test("Task 335 scoped update preserves legacy fields and rejects a second summary", () => {
  const currentGuardrails = legacyGuardrails();
  currentGuardrails.interaction.introduction = "UAE-specific detail remains editorially authoritative.";
  const current = {
    slug: "agent-authority-model",
    title: "The Agent Authority Model",
    summary: "Existing summary",
    content: {
      schemaVersion: 1,
      template: "agent-authority",
      teaser: "Existing teaser",
      guardrails: currentGuardrails,
    },
    seo: {},
    mediaIds: [],
    markets: ["uae"],
  };
  const staged = stagedSummaryFrameworkPayload(current);
  assert.deepEqual(staged.content.teaser, current.content.teaser);
  assert.equal(staged.content.guardrails.interaction.introduction, currentGuardrails.interaction.introduction);
  assert.deepEqual(staged.content.guardrails.firstFigure, currentGuardrails.firstFigure);
  assert.equal(
    canonicalJson(staged.content.guardrails.summary),
    canonicalJson(task335Summary),
  );
  assert.throws(
    () => stagedSummaryFrameworkPayload(staged),
    /already has guardrails summary content/,
  );
});

test("Task 335 receipt replay accepts the exact draft and rejects conflicts", () => {
  const currentGuardrails = legacyGuardrails();
  const payload = stagedSummaryFrameworkPayload({
    slug: "agent-authority-model",
    title: "The Agent Authority Model",
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      template: "agent-authority",
      teaser: "Existing teaser",
      guardrails: currentGuardrails,
    },
  });
  const document = {
    documentId: "document-1",
    editionId: "edition-1",
    kind: "framework",
    canonicalSlug: "agent-authority-model",
    documentStatus: "active",
    publicationState: "published",
    publishedRevisionId: "published-1",
  };
  const result = {
    documentId: document.documentId,
    editionId: document.editionId,
    revisionId: "draft-2",
    sourceRevisionId: "draft-1",
    publicationState: document.publicationState,
    publishedRevisionId: document.publishedRevisionId,
  };
  const replay = verifySummaryReplay({
    receipt: {
      operation: TASK_335_SUMMARY_OPERATION,
      subjectId: result.revisionId,
      requestDigest: digest(task335Summary),
      resultDigest: digest(result),
    },
    revision: {
      id: result.revisionId,
      editionId: document.editionId,
      payload,
      contentDigest: digest(payload),
      workflowState: "draft",
      sourceRevisionId: result.sourceRevisionId,
    },
    auditMetadata: result,
    document,
  });
  assert.deepEqual(replay, {
    disposition: "replayed",
    revisionId: result.revisionId,
    publicationState: document.publicationState,
  });

  assert.throws(
    () => verifySummaryReplay({
      receipt: {
        operation: TASK_335_SUMMARY_OPERATION,
        subjectId: result.revisionId,
        requestDigest: digest(task335Summary),
        resultDigest: digest(result),
      },
      revision: {
        id: result.revisionId,
        editionId: document.editionId,
        payload: { ...payload, content: { ...payload.content, teaser: "Newer editorial work" } },
        contentDigest: digest(payload),
        workflowState: "draft",
        sourceRevisionId: result.sourceRevisionId,
      },
      auditMetadata: result,
      document,
    }),
    /conflicts with its immutable draft revision/,
  );
});