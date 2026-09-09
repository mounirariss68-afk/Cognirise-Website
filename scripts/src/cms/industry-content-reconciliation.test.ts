import assert from "node:assert/strict";
import { test } from "node:test";
import { industryBaselineAction } from "./migration.js";

const revision = {
  id: "revision-4",
  revisionNumber: 4,
  reason: "Approved broadened industry content contract baseline v4; prior revisions and hero-media pin preserved.",
  workflowState: "approved",
  hasOpportunity: true,
  provenanceValid: true,
  payloadFamilyDigest: "family",
  matchesContractPayload: false,
  hasValidMediaPin: true,
  hasKnownV3UnpinnedRef: false,
  priorHasValidMediaPin: true,
};

const legacy = [1, 2, 3].map((revisionNumber) => ({
  ...revision,
  id: `revision-${revisionNumber}`,
  revisionNumber,
  reason: revisionNumber === 1
    ? "Inventory migration; pending editorial review."
    : "Approved Cognirise Pulse industry-image cutover; previous revisions and media preserved.",
  workflowState: "approved",
  hasOpportunity: false,
  provenanceValid: true,
  payloadFamilyDigest: "legacy",
  hasValidMediaPin: false,
}));

test("appends a changed governed industry baseline without replacing history", () => {
  assert.equal(
    industryBaselineAction([...legacy, revision], revision.id, "published"),
    "append-and-publish",
  );
});

test("reuses an identical governed industry baseline", () => {
  assert.equal(
    industryBaselineAction([...legacy, { ...revision, matchesContractPayload: true }], revision.id, "published"),
    "reuse-complete",
  );
});

test("preserves a changed editorial revision that lacks governed provenance", () => {
  assert.equal(
    industryBaselineAction([...legacy, { ...revision, provenanceValid: false }], revision.id, "published"),
    "preserve-editorial",
  );
});

test("uses the prior immutable media pin while appending changed content over the known v3 defect", () => {
  const v3WithUnpinnedMedia = {
    ...revision,
    reason: "Approved broadened industry content contract baseline v3; prior revisions preserved.",
    hasValidMediaPin: false,
    hasKnownV3UnpinnedRef: true,
    priorHasValidMediaPin: true,
  };
  assert.equal(
    industryBaselineAction([...legacy, v3WithUnpinnedMedia], revision.id, "published"),
    "append-and-publish",
  );
});