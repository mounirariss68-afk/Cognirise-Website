import assert from "node:assert/strict";
import { test } from "node:test";
import {
  financialServicesPunctuationReconciliationPlan,
  educationSuccessorAction,
  EDUCATION_SUCCESSOR_SEO,
  canonicalResultDigest,
  educationSuccessorRecoveryKey,
  industryBaselineAction,
  isApprovedFinancialServicesPunctuationReconciliation,
} from "./migration.js";

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

test("allows only the approved financial-services punctuation correction over preserved editorial content", () => {
  const published = {
    content: {
      thesis: "The model estate—not the chatbot—is where trust is won.",
      dek: "Unchanged.",
      heroMediaId: "published-media",
    },
    mediaIds: ["published-media"],
  };
  const canonical = {
    content: {
      thesis: "The model estate — not the chatbot — is where trust is won.",
      dek: "Unchanged.",
    },
    mediaIds: [],
  };
  assert.equal(
    isApprovedFinancialServicesPunctuationReconciliation(published, canonical),
    true,
  );
  assert.equal(
    isApprovedFinancialServicesPunctuationReconciliation(
      published,
      { ...canonical, content: { ...canonical.content, dek: "Changed." } },
    ),
    false,
  );
});

test("requires an approved latest publication before planning the punctuation correction", () => {
  const canonicalPayload = {
    content: {
      thesis: "The model estate — not the chatbot — is where trust is won.",
      dek: "Unchanged.",
    },
    mediaIds: [],
  };
  const eligible = {
    slug: "financial-services",
    publicationState: "published",
    publishedRevisionId: "revision-5",
    latestRevision: { id: "revision-5", workflowState: "approved" },
    publishedPayload: {
      content: {
        thesis: "The model estate—not the chatbot—is where trust is won.",
        dek: "Unchanged.",
      },
      mediaIds: [],
    },
    canonicalPayload,
    publishedReferences: [],
  };
  assert.ok(financialServicesPunctuationReconciliationPlan(eligible));
  assert.equal(
    financialServicesPunctuationReconciliationPlan({
      ...eligible,
      publishedRevisionId: null,
      publishedPayload: undefined,
    }),
    null,
  );
  assert.equal(
    financialServicesPunctuationReconciliationPlan({
      ...eligible,
      publicationState: "draft",
    }),
    null,
  );
  assert.equal(
    financialServicesPunctuationReconciliationPlan({
      ...eligible,
      latestRevision: { id: "later-editorial-draft", workflowState: "draft" },
    }),
    null,
  );
});

test("copies current punctuation-only media references without substituting a prior pin", () => {
  const plan = financialServicesPunctuationReconciliationPlan({
    slug: "financial-services",
    publicationState: "published",
    publishedRevisionId: "revision-5",
    latestRevision: { id: "revision-5", workflowState: "approved" },
    publishedPayload: {
      content: {
        thesis: "The model estate—not the chatbot—is where trust is won.",
        dek: "Unchanged.",
        heroMediaId: "current-media",
      },
      mediaIds: ["current-media"],
    },
    canonicalPayload: {
      content: {
        thesis: "The model estate — not the chatbot — is where trust is won.",
        dek: "Unchanged.",
      },
      mediaIds: [],
    },
    publishedReferences: [{ assetId: "current-media", mediaVersionId: null }],
  });
  assert.ok(plan);
  assert.deepEqual(plan.references, [{ assetId: "current-media", mediaVersionId: null }]);
  assert.equal(plan.payload.content.heroMediaId, "current-media");
  assert.deepEqual(plan.payload.mediaIds, ["current-media"]);
});

test("Education successor accepts only an exact known authority and governed v2 shape", () => {
  const canonicalPayload = {
    seo: { ...EDUCATION_SUCCESSOR_SEO, noIndex: false },
    content: {
      educationPov: {
        version: 2,
        valueDomains: Array.from({ length: 5 }, () => ({})),
        targetState: Array.from({ length: 7 }, () => ({})),
      },
    },
  };
  assert.equal(educationSuccessorAction({
    baselineAction: "append-and-publish",
    latestNormalizedPayloadDigest: "99e765da04fa7ef70050ed29c4b3242b2ce3861e0ce8bd7fa62bfc02de3e43ca",
    canonicalPayload,
  }), "append-and-publish");
  assert.equal(educationSuccessorAction({
    baselineAction: "append-and-publish",
    latestNormalizedPayloadDigest: "newer-editorial-authority",
    canonicalPayload,
  }), "preserve-editorial");
  assert.equal(educationSuccessorAction({
    baselineAction: "append-and-publish",
    latestNormalizedPayloadDigest: "99e765da04fa7ef70050ed29c4b3242b2ce3861e0ce8bd7fa62bfc02de3e43ca",
    canonicalPayload: {
      ...canonicalPayload,
      seo: { ...canonicalPayload.seo, title: "Stale Education metadata" },
    },
  }), "preserve-editorial");
  assert.equal(educationSuccessorAction({
    baselineAction: "reuse-complete",
    latestNormalizedPayloadDigest: "already-v2",
    canonicalPayload,
  }), "reuse-complete");
});

test("Education redesign replays from the exact approved v10 successor authority", () => {
  const canonicalPayload = {
    seo: { ...EDUCATION_SUCCESSOR_SEO, noIndex: false },
    content: {
      educationPov: {
        version: 2,
        valueDomains: Array.from({ length: 5 }, () => ({})),
        targetState: Array.from({ length: 7 }, () => ({})),
      },
    },
  };
  assert.equal(educationSuccessorAction({
    baselineAction: "append-and-publish",
    latestNormalizedPayloadDigest: "cc208e07c47b59d8e27e80bd55a8f3515a88b79c1b7f91459bf6e251e0a050e5",
    canonicalPayload,
  }), "append-and-publish");
  assert.equal(educationSuccessorAction({
    baselineAction: "append-and-publish",
    latestNormalizedPayloadDigest: "unrecognized-approved-looking-payload",
    canonicalPayload,
  }), "preserve-editorial");
});

test("Education recovery receipt remains separately identifiable from the preserved v11 receipt", () => {
  assert.equal(
    educationSuccessorRecoveryKey("industry:education"),
    "cms-industry-education-successor-v11-recovery:industry:education",
  );
});

test("Education cutover authority comparison is stable across JSONB key ordering", () => {
  const left = {
    seo: { description: "description", title: "title", noIndex: false },
    content: { educationPov: { version: 2, valueDomains: [], targetState: [] } },
    mediaIds: [],
  };
  assert.equal(
    canonicalResultDigest(left),
    canonicalResultDigest({
      mediaIds: [],
      content: { educationPov: { targetState: [], valueDomains: [], version: 2 } },
      seo: { noIndex: false, title: "title", description: "description" },
    }),
  );
});
