import assert from "node:assert/strict";
import test from "node:test";
import { buildDocumentReadiness, dedupeReadinessIssues, type ReadinessIssue } from "./document-readiness.ts";

test("merges one normalized correction across draft and publish gates", () => {
  const issues = buildDocumentReadiness({
    kind: "site-configuration",
    title: "Contact email",
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "not-an-email" },
    mediaIds: [],
    exact: true,
    canEdit: true,
    canPublish: true,
  });

  const contactEmail = issues.filter((issue) => issue.path === "content.contactEmail");
  assert.equal(contactEmail.length, 1, "one field correction is not repeated for every gate");
  assert.deepEqual(contactEmail[0].scopes, ["draft", "publish"]);
  assert.equal(contactEmail[0].action, "focus-content-field");
});

test("deduplicates normalized draft, publish, and edition evidence into one issue", () => {
  const repeated: ReadinessIssue = {
    id: "draft:blocker:content.headline:required",
    scope: "draft",
    scopes: ["draft"],
    severity: "blocker",
    path: "content.headline",
    label: "Headline needs correction",
    detail: "Required",
    action: "focus-content-field",
    actionLabel: "Focus content field",
  };
  const issues = dedupeReadinessIssues([
    repeated,
    { ...repeated, id: "duplicate" },
    { ...repeated, id: "publish:blocker:content.headline:required", scope: "publish", scopes: ["publish"] },
    { ...repeated, id: "edition:blocker:headline:required", scope: "edition", path: "content.headline", scopes: ["edition"] },
  ]);

  assert.equal(issues.length, 1);
  assert.deepEqual(issues[0].scopes, ["draft", "publish", "edition"]);
});

test("adds actionable workflow, edition, and permission warnings without collapsing them", () => {
  const issues = buildDocumentReadiness({
    kind: "site-configuration",
    title: "Contact email",
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "hello@example.com" },
    mediaIds: [],
    exact: true,
    readinessErrors: ["content.contactEmail: Use a verified mailbox.", "content.contactEmail: Use a verified mailbox."],
    workflowState: "in-review",
    publicationState: "draft",
    hasUnsaved: true,
    canEdit: false,
    canPublish: false,
    availabilityPending: true,
    availableInMarket: false,
  });

  assert.equal(issues.filter((issue) => issue.path === "content.contactEmail").length, 1);
  assert.ok(issues.some((issue) => issue.scope === "workflow" && issue.path === "workflow.unsaved" && issue.action === "focus-save"));
  assert.ok(issues.some((issue) => issue.scope === "workflow" && issue.path === "permissions.publish" && issue.action === "review-access"));
  assert.ok(issues.some((issue) => issue.scope === "edition" && issue.path === "edition.availability" && issue.action === "open-editions"));
});

test("uses structured edition workflow readiness as a workflow action, not an untargeted content error", () => {
  const issues = buildDocumentReadiness({
    kind: "site-configuration",
    title: "Contact email",
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "hello@example.com" },
    mediaIds: ["approved-media"],
    exact: true,
    workflowState: "draft",
    canEdit: true,
    canPublish: false,
    readinessErrors: ["This saved revision must be submitted and approved before publication."],
    readinessIssues: [{
      category: "workflow",
      action: "review",
      message: "This saved revision must be submitted and approved before publication.",
    }],
  });

  const workflow = issues.find((issue) => issue.path === "workflow.review");
  assert.ok(workflow);
  assert.equal(workflow.scope, "workflow");
  assert.equal(workflow.action, "focus-submit-review");
  assert.equal(issues.some((issue) => issue.path === "content"), false);
});