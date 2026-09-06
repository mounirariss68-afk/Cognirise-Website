import assert from "node:assert/strict";
import test from "node:test";
import { assistantTargets } from "../../../../cognirise-website/src/lib/assistant-targets";
import { applyAssistantDecision } from "./assistant-decision";
import { AssistantFailure, parseAssistantInput, validateOutput } from "./editorial-assistant";

test("UI target, server parser, output gate, and decision apply share one contract", () => {
  const target = assistantTargets("page", { content: { title: "Old title" } })[0]!;
  const input = parseAssistantInput({
    requestId: "request_1234", subjectId: "page.home", market: "uae", operation: target.operations[0],
    draft: target.value, sourceIds: ["approved.source-1"], contentClass: "public",
    target: { fieldPath: target.fieldPath, contentType: target.contentType, language: "en", maxLength: target.maxLength, revisionId: "revision-1" },
  });
  assert.ok(input);
  const output = validateOutput({
    suggestion: "New title",
    citations: [{ claim: "New title", sourceId: "approved.source-1", quote: "New title" }],
    uncertainties: [],
  }, input.draft, [{ id: "approved.source-1", revision: "source-revision", title: "Fact", content: "New title", approvedAt: "2025-01-01T00:00:00Z" }], input.target, input.operation);
  const accepted = applyAssistantDecision("author", "reviewer", "revision-1", "revision-1", "revision-1", "accepted", { title: input.draft }, "title", output.suggestion);
  assert.equal(accepted.content?.title, output.suggestion);
  assert.equal(accepted.wasEdited, true);
  assert.throws(() => applyAssistantDecision("author", "author", "revision-1", "revision-1", "revision-1", "accepted", { title: input.draft }, "title", output.suggestion), (error) => error instanceof AssistantFailure && error.code === "self_decision");
  assert.throws(() => applyAssistantDecision("author", "reviewer", "revision-2", "revision-1", "revision-1", "accepted", { title: input.draft }, "title", output.suggestion), (error) => error instanceof AssistantFailure && error.code === "stale_target");
  assert.deepEqual(applyAssistantDecision("author", "reviewer", "revision-2", "revision-1", undefined, "rejected"), { wasEdited: false, content: undefined });
  assert.throws(() => applyAssistantDecision("author", "author", "revision-2", "revision-1", undefined, "rejected"), (error) => error instanceof AssistantFailure && error.code === "self_decision");
});