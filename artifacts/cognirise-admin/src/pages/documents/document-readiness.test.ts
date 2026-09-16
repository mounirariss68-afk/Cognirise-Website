import assert from "node:assert/strict";
import test from "node:test";
import { initialCmsContent, validateCmsContent, validateCmsSnapshot } from "@workspace/api-zod";
import { buildDocumentReadiness, dedupeReadinessIssues, type ReadinessIssue } from "./document-readiness.ts";

test("all ten kinds keep structurally valid incomplete drafts saveable", () => {
  const kinds = ["person", "partner", "platform", "publication", "case-study", "industry", "framework", "office", "landing-page"] as const;
  for (const kind of kinds) {
    const result = validateCmsContent(kind, initialCmsContent(kind), "draft");
    assert.equal(result.success, true, `${kind} initial draft remains saveable`);
  }

  // Site configuration has no intentionally incomplete draft arm: choosing the
  // contact-email configuration produces a structurally valid draft.
  assert.equal(validateCmsContent("site-configuration", {
    schemaVersion: 1,
    configuration: "contact-email",
    contactEmail: "editor@cognirise.ai",
  }, "draft").success, true);
});

test("publish rules produce stable direct targets and codes without parsing error copy", () => {
  const result = validateCmsContent("person", {
    schemaVersion: 1,
    role: "leader",
    title: "Leader",
    visibility: "public",
    order: 0,
    sources: [],
    relatedIds: [],
  }, "publish");
  assert.equal(result.success, false);
  if (result.success) return;

  const verification = result.issues.find((issue) => issue.path === "content.verificationDate");
  assert.ok(verification);
  assert.match(verification.code, /^CMS_PUBLISH_PERSON_VERIFICATION_DATE_REQUIRED_CONTENT_VERIFICATIONDATE$/);
  assert.equal(verification.action, "focus-content-field");
  assert.equal(verification.message, "A verification date is required.");
});

test("immutable media conflicts focus the second concrete media control", () => {
  const mediaId = "11111111-1111-4111-8111-111111111111";
  const result = validateCmsSnapshot("publication", {
    slug: "media-conflict",
    title: "Media conflict",
    mediaIds: [],
    markets: ["uae"],
    content: {
      schemaVersion: 1,
      heroMedia: { mediaId, mediaVersionId: "22222222-2222-4222-8222-222222222222", role: "hero" },
      social: {
        imageMedia: { mediaId, mediaVersionId: "33333333-3333-4333-8333-333333333333", role: "og-image" },
      },
    },
  }, "draft");
  assert.equal(result.success, false);
  if (result.success) return;
  assert.equal(result.issues[0]?.path, "content.social.imageMedia");
  assert.equal(result.issues[0]?.action, "focus-content-field");
});

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

test("direct administrator publication replaces review submission guidance for an eligible saved draft", () => {
  const issues = buildDocumentReadiness({
    kind: "site-configuration",
    title: "Contact email",
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "hello@example.com" },
    mediaIds: ["approved-media"],
    exact: true,
    workflowState: "draft",
    canEdit: true,
    canPublish: true,
    allowDirectPublish: true,
    readinessIssues: [{
      category: "workflow",
      action: "review",
      message: "This saved revision must be submitted and approved before publication.",
    }],
  });

  assert.equal(issues.some((issue) => issue.path === "workflow.review"), false);
  assert.equal(issues.some((issue) => issue.path === "permissions.publish"), false);
});

test("uses an authoritative structured validation path without parsing its message", () => {
  const issues = buildDocumentReadiness({
    kind: "framework",
    title: "Framework",
    content: { schemaVersion: 1, template: "agent-authority" },
    mediaIds: [],
    exact: true,
    canEdit: true,
    canPublish: true,
    readinessIssues: [{
      category: "validation",
      action: "edit",
      code: "CMS_PUBLISH_FRAMEWORK_GOVERNANCE_CONTENT_HERO_MEDIA",
      path: "content.heroMedia",
      message: "An approved hero image is required.",
    }],
  });

  const hero = issues.find((issue) => issue.path === "content.heroMedia" && issue.scope === "edition");
  assert.ok(hero);
  assert.equal(hero.action, "focus-content-field");
  assert.match(hero.id, /CMS_PUBLISH_FRAMEWORK_GOVERNANCE_CONTENT_HERO_MEDIA/);
});