import assert from "node:assert/strict";
import test from "node:test";
import {
  canTransition,
  composeMarketRelease,
  dueActionsFromDocuments,
  isMarketAssigned,
  pageReleaseReadinessError,
  publishWithDraftSynchronization,
  type WorkflowPrincipal,
  violatesSeparationOfDuties,
  redirectGovernanceError,
  parseTransitionInput,
} from "./workflow";
import { resolveEdition, validatePageDocument } from "./adapter";

test("server policy enforces least-privilege edition transitions", () => {
  assert.equal(canTransition("author", "draft", "review"), true);
  assert.equal(canTransition("author", "review", "approved"), false);
  assert.equal(canTransition("reviewer", "review", "approved"), true);
  assert.equal(canTransition("reviewer", "approved", "published"), false);
  assert.equal(canTransition("publisher", "approved", "scheduled"), true);
  assert.equal(canTransition("publisher", "scheduled", "published"), true);
  assert.equal(canTransition("publisher", "published", "expired"), true);
  assert.equal(canTransition("publisher", "expired", "archived"), true);
});

test("redirect governance requires independent approval and publication actors", () => {
  const editor = { id: "editor-a", role: "regionalEditor", markets: ["uae"] } as const;
  const reviewer = { id: "reviewer-b", role: "reviewer", markets: ["uae"] } as const;
  const publisher = { id: "publisher-c", role: "publisher", markets: ["uae"] } as const;
  const review = { state: "review", lastEditorActor: editor.id, lastRequesterActor: editor.id };
  assert.match(redirectGovernanceError(review, "approved", { ...reviewer, id: editor.id }) ?? "", /Separation of duties/);
  assert.equal(redirectGovernanceError(review, "approved", reviewer), undefined);
  assert.match(redirectGovernanceError(review, "published", publisher) ?? "", /approval is required/);
  const approved = { ...review, approvedBy: { _ref: reviewer.id }, approvedAt: "2026-01-01T00:00:00Z", lastApprovalActor: reviewer.id };
  assert.match(redirectGovernanceError(approved, "published", { ...publisher, id: reviewer.id }) ?? "", /approver/);
  assert.equal(redirectGovernanceError(approved, "published", publisher), undefined);
});

test("market assignment and separation-of-duties are enforced without request actors", () => {
  const reviewer: WorkflowPrincipal = { id: "person.reviewer", role: "reviewer", markets: ["ksa"] };
  assert.equal(isMarketAssigned(reviewer, "ksa"), true);
  assert.equal(isMarketAssigned(reviewer, "uae"), false);
  assert.equal(
    violatesSeparationOfDuties(reviewer, { lastEditorActor: "person.reviewer" }, "approved"),
    true,
  );
  assert.equal(
    violatesSeparationOfDuties(reviewer, { lastRequesterActor: "other" }, "approved"),
    false,
  );
});

test("explicit UAE fallback editions can advance without meaningless local parity", () => {
  const fallbackEdition = {
    fallbackMode: "uaeFallback",
    parityComplete: false,
    publicationState: "review",
  };
  assert.equal(pageReleaseReadinessError(fallbackEdition, "approved"), undefined);
  assert.equal(pageReleaseReadinessError(fallbackEdition, "scheduled"), undefined);
  assert.equal(pageReleaseReadinessError(fallbackEdition, "published"), undefined);
  assert.equal(canTransition("reviewer", "review", "approved"), true);
  assert.equal(canTransition("publisher", "approved", "published"), true);
  const delivered = resolveEdition(validatePageDocument({
    _id: "page-services",
    _rev: "rev-fallback",
    slug: "services",
    routeKind: "service",
    _updatedAt: "2026-09-05T00:00:00Z",
    requestedEdition: {
      ...fallbackEdition,
      market: "ksa",
      publicationState: "published",
      approvedBy: { _ref: "reviewer-b" },
      approvedAt: "2026-09-05T00:00:00Z",
    },
    uaeEdition: {
      market: "uae",
      fallbackMode: "canonical",
      publicationState: "published",
      parityComplete: true,
      title: "Services",
      sections: [{ _type: "heroSection", heading: "Services" }],
    },
  }), "ksa", false);
  assert.equal(delivered.meta.deliveryMode, "uaeFallback");
  assert.equal(delivered.page?.title, "Services");

  assert.match(
    pageReleaseReadinessError({
      fallbackMode: "override",
      parityComplete: false,
      publicationState: "review",
    }, "approved") ?? "",
    /parity/,
  );
});

test("due policy emits expiry without rejecting an already expired timestamp", () => {
  const now = new Date("2026-03-01T00:00:00Z");
  const actions = dueActionsFromDocuments([{
    _id: "page.services",
    marketEditions: [{
      _key: "edition_ksa", market: "ksa", publicationState: "published",
      expiresAt: "2026-02-28T00:00:00Z",
    }],
  }], now);
  assert.deepEqual(actions, [{
    requestId: `due_edition_ksa_${now.getTime()}`,
    subjectId: "page.services", market: "ksa", toState: "expired",
  }]);
});

test("due policy schedules redirect publication and expiry through the audited workflow", () => {
  const now = new Date("2026-01-02T00:00:00Z");
  const actions = dueActionsFromDocuments([{
    _id: "redirect-legacy",
    _type: "redirect",
    market: "ksa",
    lifecycle: { state: "scheduled", publishAt: "2026-01-01T00:00:00Z" },
  }, {
    _id: "redirect-expired",
    _type: "redirect",
    lifecycle: { state: "published", expiresAt: "2026-01-01T00:00:00Z" },
  }], now);
  assert.deepEqual(actions.map((action) => [action.subjectId, action.market, action.toState]), [
    ["redirect-legacy", "ksa", "published"],
    ["redirect-expired", "uae", "expired"],
  ]);
});

test("market release preserves other live editions and retains their pending drafts", () => {
  const draft = {
    _id: "drafts.page.services",
    _rev: "draft-rev",
    _type: "page",
    marketEditions: [
      { _key: "uae", publicationState: "approved", title: "Approved UAE" },
      { _key: "ksa", publicationState: "published", title: "Unreviewed KSA draft" },
    ],
  };
  const currentPublished = {
    _id: "page.services",
    _rev: "published-rev",
    _type: "page",
    marketEditions: [
      { _key: "uae", publicationState: "published", title: "Old UAE" },
      { _key: "ksa", publicationState: "published", title: "Live KSA" },
    ],
  };
  const published = composeMarketRelease(
    draft,
    currentPublished,
    "page.services",
    "uae",
    "published",
  );
  assert.deepEqual(published.marketEditions, [
    { _key: "uae", publicationState: "published", title: "Approved UAE" },
    { _key: "ksa", publicationState: "published", title: "Live KSA" },
  ]);
  const mutations = publishWithDraftSynchronization(
    [{ createIfNotExists: { _id: "audit" } }],
    published,
    draft,
    "uae",
  );
  assert.equal(mutations.some((mutation) => "delete" in mutation), false);
  assert.deepEqual(mutations.at(-1), {
    patch: {
      id: "drafts.page.services",
      ifRevisionID: "draft-rev",
      set: { 'marketEditions[_key=="uae"].publicationState': "draft" },
      unset: [
        'marketEditions[_key=="uae"].approvedBy',
        'marketEditions[_key=="uae"].approvedAt',
        'marketEditions[_key=="uae"].lastApprovalActor',
        'marketEditions[_key=="uae"].publishAt',
        'marketEditions[_key=="uae"].expiresAt',
      ],
    },
  });
});

test("direct publish applies expiry to the composed live target", () => {
  const expiresAt = "2027-01-01T00:00:00.000Z";
  const published = composeMarketRelease(
    {
      _id: "drafts.page.services",
      _type: "page",
      marketEditions: [{ _key: "uae", publicationState: "approved" }],
    },
    null,
    "page.services",
    "uae",
    "published",
    undefined,
    expiresAt,
  );
  assert.equal(
    (published.marketEditions as Array<Record<string, unknown>>)[0]?.expiresAt,
    expiresAt,
  );
});

test("transition contract rejects unknown fields by omission and bad identifiers", () => {
  assert.deepEqual(parseTransitionInput({
    requestId: "request_123", subjectId: "page.services", market: "europe",
    toState: "approved",
  }), {
    requestId: "request_123", subjectId: "page.services", market: "europe",
    toState: "approved",
  });
  assert.equal(parseTransitionInput({ requestId: "../bad", subjectId: "page", market: "uae", toState: "published" }), undefined);
  assert.equal(parseTransitionInput({ requestId: "request_123", subjectId: "page", market: "uae", toState: "deleted" }), undefined);
});