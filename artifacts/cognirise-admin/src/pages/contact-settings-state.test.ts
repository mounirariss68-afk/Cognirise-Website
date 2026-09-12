import assert from "node:assert/strict";
import test from "node:test";
import {
  contactEditionLabel,
  contactEmailFromDocument,
  contactPublicationAffectedDestinations,
  contactPublicationSnapshot,
  contactPublicationSnapshotMatches,
  contactPublishAvailabilityReady,
  contactSharedDestinationReviewReady,
  contactSharedReviewReady,
  validContactEmail,
  withContactEmail,
} from "./contact-settings-state";

const document = {
  content: {
    schemaVersion: 1,
    configuration: "contact-email" as const,
    contactEmail: "old@example.com",
    preservedField: "keep this",
  },
};

test("contact edits preserve unrelated governed content", () => {
  assert.equal(contactEmailFromDocument(document), "old@example.com");
  assert.deepEqual(withContactEmail(document, "new@example.com"), {
    ...document.content,
    contactEmail: "new@example.com",
  });
});

test("contact email validation stays beside the focused form", () => {
  assert.equal(validContactEmail("hello@example.com"), true);
  assert.equal(validContactEmail("not-an-email"), false);
  assert.equal(validContactEmail("hello@example"), false);
  assert.equal(validContactEmail(`${"a".repeat(242)}@example.com`), true);
  assert.equal(validContactEmail(`${"a".repeat(243)}@example.com`), false);
});

test("regional edition labels distinguish local exceptions and fallbacks", () => {
  assert.match(contactEditionLabel({
    market: "uae",
    locale: "en",
    exact: true,
    usedFallback: false,
    effectiveMarket: "uae",
    effectiveLocale: "en",
  }, true), /shared source/);
  assert.match(contactEditionLabel({
    market: "uae",
    locale: "en",
    exact: true,
    usedFallback: false,
    effectiveMarket: "uae",
    effectiveLocale: "en",
  }), /local exception/);
  assert.match(contactEditionLabel({
    market: "ksa",
    locale: "en",
    exact: false,
    usedFallback: true,
    effectiveMarket: "uae",
    effectiveLocale: "en",
  }), /uses UAE · en/);
});

test("shared contact review and publication require the current availability contract", () => {
  assert.equal(contactSharedReviewReady(false, undefined), true);
  assert.equal(contactSharedReviewReady(true, {
    canEditShared: false,
    reviewedVersion: 2,
    draftVersion: 3,
  }), false);
  assert.equal(contactSharedReviewReady(true, {
    canEditShared: false,
    reviewedVersion: 3,
    draftVersion: 3,
  }), true);
  assert.equal(contactSharedDestinationReviewReady({
    reviewedVersion: 3,
    draftVersion: 3,
    items: [{ reviewedDecision: "show" } as never],
  }), true);
  assert.equal(contactSharedDestinationReviewReady({
    reviewedVersion: 3,
    draftVersion: 3,
    items: [{ reviewedDecision: null } as never],
  }), false);
  assert.equal(contactSharedReviewReady(true, {
    canEditShared: true,
    reviewedVersion: null,
    draftVersion: 3,
  }), true);

  assert.equal(contactPublishAvailabilityReady(false, true, undefined, null, null), true);
  assert.equal(contactPublishAvailabilityReady(true, false, 3, "revision-3", "revision-3"), false);
  assert.equal(contactPublishAvailabilityReady(true, true, 3, "revision-3", "revision-3"), true);
  assert.equal(contactPublishAvailabilityReady(true, true, 3, "revision-2", "revision-3"), false);
});

test("publication impact freezes all shared destinations but one custom edition", () => {
  const availability = {
    draftVersion: 8,
    reviewedVersion: 8,
    sharedSource: {
      market: "uae",
      locale: "en",
      editionId: "source-edition",
      revisionId: "source-revision-8",
      publishedRevisionId: "source-revision-7",
      sourceRevisionId: "source-revision-8",
    },
    canEditShared: true,
    items: [
      {
        marketEditionId: "uae-edition",
        market: "uae",
        locale: "en",
        displayName: "United Arab Emirates",
        stagedDecision: "show" as const,
        reviewedDecision: "show" as const,
        publishedDecision: "show" as const,
        publishedEffectiveAvailable: true,
        pending: true,
        customized: false,
      },
      {
        marketEditionId: "ksa-edition",
        market: "ksa",
        locale: "ar",
        displayName: "Saudi Arabia",
        stagedDecision: "off" as const,
        reviewedDecision: "off" as const,
        publishedDecision: "show" as const,
        publishedEffectiveAvailable: true,
        pending: true,
        customized: false,
      },
    ],
  };
  const shared = contactPublicationAffectedDestinations(true, "uae", "en", availability, "reviewed");
  assert.deepEqual(shared.map((destination) => `${destination.market}:${destination.locale}`), ["uae:en", "ksa:ar"]);
  assert.deepEqual(shared.map((destination) => destination.decision), ["show", "off"]);

  const custom = contactPublicationAffectedDestinations(false, "turkiye", "tr", null, "reviewed");
  assert.equal(custom.length, 1);
  assert.equal(custom[0]?.marketEditionId, "turkiye:tr");
  assert.equal(custom[0]?.decision, "show");

  const snapshot = contactPublicationSnapshot(availability, "source-revision-8", "source-revision-8", "reviewed");
  assert.equal(snapshot.availabilityVersion, 8);
  assert.equal(snapshot.destinations.length, 2);
  assert.equal(contactPublicationSnapshotMatches(snapshot, availability, "source-revision-8"), true);
  assert.equal(
    contactPublicationSnapshotMatches(snapshot, { ...availability, draftVersion: 9 }, "source-revision-8"),
    false,
  );
  assert.equal(
    contactPublicationSnapshotMatches(
      snapshot,
      {
        ...availability,
        items: availability.items.map((item, index) => index === 0
          ? { ...item, reviewedDecision: "off" as const }
          : item),
      },
      "source-revision-8",
    ),
    false,
  );
});
