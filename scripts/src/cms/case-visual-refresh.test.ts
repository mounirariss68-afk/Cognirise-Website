import assert from "node:assert/strict";
import test from "node:test";
import { copyPublishedCasePayload, planCaseVisualRefresh } from "./case-visual-refresh.js";

const valid = {
  receiptExists: false,
  currentVersionNumber: 3,
  currentChecksum: "old",
  expectedChecksum: "new",
  currentImmutableVersionValid: true,
  sourceReviewApproved: true,
  rightsApproved: true,
  accessibilityApproved: true,
  publicationValid: true,
  evidenceApproved: true,
};

test("a changed governed binary appends a new immutable version", () => {
  assert.deepEqual(planCaseVisualRefresh(valid), {
    action: "append",
    nextVersionNumber: 4,
  });
});

test("a receipted refresh replay does nothing", () => {
  assert.deepEqual(planCaseVisualRefresh({ ...valid, receiptExists: true }), {
    action: "replay",
  });
});

test("a refresh copies the published payload rather than mutating it", () => {
  const published = {
    content: { title: "Editor's title", evidence: [{ approved: true }] },
    mediaIds: ["asset-1"],
  };
  const copied = copyPublishedCasePayload(published);
  assert.deepEqual(copied, published);
  assert.notEqual(copied, published);
  assert.notEqual(copied.content, published.content);
  copied.content.title = "Changed copy";
  assert.equal(published.content.title, "Editor's title");
});

test("failed publication, evidence, or media gates never append", () => {
  for (const failed of [
    { publicationValid: false },
    { evidenceApproved: false },
    { currentImmutableVersionValid: false },
    { sourceReviewApproved: false },
    { rightsApproved: false },
    { accessibilityApproved: false },
  ]) {
    assert.equal(planCaseVisualRefresh({ ...valid, ...failed }).action, "fail");
  }
});