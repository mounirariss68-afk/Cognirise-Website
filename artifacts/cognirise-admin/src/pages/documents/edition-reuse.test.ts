import assert from "node:assert/strict";
import test from "node:test";
import { buildEditionReusePlan, createReuseRequests, retainedReuseOutcomes, reuseFailureOutcome, sameLanguage, snapshotDifferences } from "./edition-reuse.ts";

const markets = [
  { id: "uae-id", code: "uae", displayName: "United Arab Emirates", defaultLocale: "en-US" },
  { id: "ksa-id", code: "ksa", displayName: "Saudi Arabia", defaultLocale: "en" },
  { id: "uk-id", code: "uk", displayName: "United Kingdom", defaultLocale: "en-GB" },
];
const source = { market: "uae", locale: "en-US", revisionId: "source-2", revisionNumber: 2 };
const baseline = {
  id: "baseline", documentId: "document", locale: "en-US", revisionId: "baseline-2",
  revisionNumber: 2, sourceRevisionId: "source-2", snapshot: {}, mediaReferences: [], createdAt: new Date(),
};

test("reuse plan shows only same-language destinations and protects legacy, independent, and frozen content", () => {
  const plan = buildEditionReusePlan({
    sourceRevisionId: "source-2",
    markets,
    exactEditions: [
      source,
      { market: "ksa", locale: "en-US", revisionId: "ksa-custom", revisionNumber: 1 },
      { market: "uk", locale: "en-US", revisionId: "uk-frozen", revisionNumber: 3 },
      { market: "uk", locale: "ar-SA", revisionId: "uk-arabic", revisionNumber: 1 },
    ],
    matrix: {
      baselines: [baseline],
      bindings: [
        {
          id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
          mode: "independent", baselineId: null, baselineRevisionId: null, heldBaselineRevisionId: null,
          translationSourceRevisionId: null, version: 4, operations: [], materializedRevisionId: "ksa-custom",
          translationState: "not-applicable", updatedAt: new Date(),
        },
        {
          id: "uk-binding", documentId: "document", marketEditionId: "uk-id", locale: "en-US",
          mode: "adapted", baselineId: "older-baseline", baselineRevisionId: "older-baseline-revision",
          heldBaselineRevisionId: null, translationSourceRevisionId: null, version: 2,
          operations: [{ op: "set", path: "content.summary", value: "Local" }],
          materializedRevisionId: "uk-frozen", translationState: "stale", updatedAt: new Date(),
        },
      ],
    },
    canEditDestination: (market) => market !== "uk",
  });
  assert.equal(plan.baseline?.revisionId, "baseline-2");
  assert.equal(plan.targets.find((target) => target.key === "ksa|en-US")?.mode, "customized");
  assert.equal(plan.targets.find((target) => target.key === "uk|en-US")?.mode, "frozen");
  assert.deepEqual(plan.targets.map((target) => target.key), ["ksa|en", "ksa|en-US", "uk|en-GB", "uk|en-US"]);
  assert.deepEqual(plan.otherLanguageEditions.map((edition) => edition.revisionId), ["uk-arabic"]);
});

test("reuse requests require explicit replacement and retain each binding version", () => {
  const plan = buildEditionReusePlan({
    sourceRevisionId: "source-2",
    markets,
    exactEditions: [source, { market: "ksa", locale: "en-US", revisionId: "ksa-custom", revisionNumber: 1 }],
    matrix: {
      baselines: [baseline],
      bindings: [{
        id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
        mode: "independent", baselineId: null, baselineRevisionId: null, heldBaselineRevisionId: null,
        translationSourceRevisionId: null, version: 4, operations: [], materializedRevisionId: "ksa-custom",
        translationState: "not-applicable", updatedAt: new Date(),
      }],
    },
    canEditDestination: () => true,
  });
  assert.deepEqual(createReuseRequests(plan, {
    "ksa|en-US": { selected: true, replaceCustomization: false },
    "uk|en-GB": { selected: true, replaceCustomization: true },
  }).map((request) => request.market), ["uk"]);
  const requests = createReuseRequests(plan, {
    "ksa|en-US": {
      selected: true,
      replaceCustomization: true,
      inspectedDestinationRevisionId: "ksa-custom",
      inspectedBindingVersion: 4,
      inspectedBaselineRevisionId: "baseline-2",
    },
  });
  assert.equal(requests[0]?.version, 4);
  assert.equal(requests[0]?.expectedDestinationRevisionId, "ksa-custom");
  assert.equal(createReuseRequests(plan, {
    "uk|en-GB": { selected: true, replaceCustomization: true },
  })[0]?.expectedDestinationRevisionId, null);
});

test("a stale refetch clears a prior inspected confirmation instead of retrying with new tokens", () => {
  const initial = buildEditionReusePlan({
    sourceRevisionId: "source-2", markets,
    exactEditions: [source, { market: "ksa", locale: "en-US", revisionId: "old-target", revisionNumber: 1 }],
    matrix: { baselines: [baseline], bindings: [{
      id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
      mode: "independent", baselineId: null, baselineRevisionId: null, heldBaselineRevisionId: null,
      translationSourceRevisionId: null, version: 4, operations: [], materializedRevisionId: "old-target",
      translationState: "not-applicable", updatedAt: new Date(),
    }] },
    canEditDestination: () => true,
  });
  const choices = {
    "ksa|en-US": {
      selected: true, replaceCustomization: true,
      inspectedDestinationRevisionId: "old-target", inspectedBindingVersion: 4,
      inspectedBaselineRevisionId: "baseline-2",
    },
  };
  assert.equal(createReuseRequests(initial, choices)[0]?.expectedDestinationRevisionId, "old-target");

  const refetched = buildEditionReusePlan({
    sourceRevisionId: "source-2", markets,
    exactEditions: [source, { market: "ksa", locale: "en-US", revisionId: "new-target", revisionNumber: 2 }],
    matrix: { baselines: [baseline], bindings: [{
      id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
      mode: "independent", baselineId: null, baselineRevisionId: null, heldBaselineRevisionId: null,
      translationSourceRevisionId: null, version: 5, operations: [], materializedRevisionId: "new-target",
      translationState: "not-applicable", updatedAt: new Date(),
    }] },
    canEditDestination: () => true,
  });
  // A rendered flow clears this choice in its refetch effect; this guard also
  // makes an immediate retry impossible before that effect is scheduled.
  assert.deepEqual(createReuseRequests(refetched, choices), []);

  const baselineSuccessor = buildEditionReusePlan({
    sourceRevisionId: "source-2", markets,
    exactEditions: [source, { market: "ksa", locale: "en-US", revisionId: "old-target", revisionNumber: 1 }],
    matrix: { baselines: [{ ...baseline, revisionId: "baseline-successor", revisionNumber: 3 }], bindings: [{
      id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
      mode: "independent", baselineId: null, baselineRevisionId: null, heldBaselineRevisionId: null,
      translationSourceRevisionId: null, version: 4, operations: [], materializedRevisionId: "old-target",
      translationState: "not-applicable", updatedAt: new Date(),
    }] },
    canEditDestination: () => true,
  });
  assert.deepEqual(createReuseRequests(baselineSuccessor, choices), []);
});

test("locale eligibility uses language identity and refuses und as a wildcard", () => {
  assert.equal(sameLanguage("en-US", "en"), true);
  assert.equal(sameLanguage("en", "en-GB"), true);
  assert.equal(sameLanguage("en-US", "ar-SA"), false);
  assert.equal(sameLanguage("und", "en"), false);
  const legacy = buildEditionReusePlan({
    sourceRevisionId: "legacy", markets,
    exactEditions: [{ market: "shared-source", locale: "und", revisionId: "legacy", revisionNumber: 1 }],
    matrix: { baselines: [], bindings: [] }, canEditDestination: () => true,
  });
  assert.match(legacy.sourceIssue ?? "", /explicitly choose/i);
  assert.deepEqual(legacy.targets, []);
});

test("a failed target remains recoverable with an explicit outcome", () => {
  assert.deepEqual(
    reuseFailureOutcome(
      { key: "ksa|en-US", marketEditionId: "ksa-id", market: "ksa", locale: "en-US", version: 4, replacesCustomization: true },
      { data: { error: "This binding changed by another editor; reopen before saving." } },
    ),
    {
      key: "ksa|en-US", market: "ksa", locale: "en-US", status: "failed",
      message: "This binding changed by another editor; reopen before saving.",
    },
  );
});

test("a retained customization is reported as skipped instead of changed", () => {
  const plan = buildEditionReusePlan({
    sourceRevisionId: "source-2", markets,
    exactEditions: [source, { market: "ksa", locale: "en-US", revisionId: "ksa-custom", revisionNumber: 1 }],
    matrix: { baselines: [baseline], bindings: [] },
    canEditDestination: () => true,
  });
  assert.equal(retainedReuseOutcomes(plan, {
    "ksa|en-US": { selected: false, replaceCustomization: false, retainCustomization: true },
  })[0]?.status, "skipped");
});

test("structural differences identify actual changed fields without treating array position as identity", () => {
  assert.deepEqual(
    snapshotDifferences(
      { title: "Saved", content: { items: [{ id: "a", label: "A" }], summary: "Same" } },
      { title: "Local", content: { items: [{ id: "b", label: "B" }], summary: "Same" } },
    ).map((difference) => difference.path),
    ["content.items", "title"],
  );
});