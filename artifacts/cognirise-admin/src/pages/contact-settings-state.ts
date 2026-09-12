import type {
  Document,
  DocumentAvailability,
  DocumentAvailabilityDestination,
  DocumentEdition,
} from "@workspace/api-client-react";

export type ContactContent = {
  schemaVersion?: number;
  configuration?: "contact-email";
  contactEmail?: string;
  [key: string]: unknown;
};

export function contactEmailFromDocument(document: Pick<Document, "content"> | null | undefined) {
  const content = document?.content;
  return content && typeof content === "object" && "contactEmail" in content
    && typeof content.contactEmail === "string"
    ? content.contactEmail
    : "";
}

/** Keep every governed field in the document while changing only this setting. */
export function withContactEmail(
  document: Pick<Document, "content">,
  contactEmail: string,
): ContactContent {
  const content = document.content && typeof document.content === "object"
    ? document.content as ContactContent
    : {};
  return { ...content, contactEmail };
}

export function validContactEmail(value: string) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim()) && value.trim().length <= 254;
}

export function contactEditionLabel(
  edition: Pick<DocumentEdition, "market" | "locale" | "exact" | "usedFallback" | "effectiveMarket" | "effectiveLocale">,
  isSharedSource = false,
) {
  const target = `${edition.market.toUpperCase()} · ${edition.locale}`;
  if (isSharedSource) return `${target} · shared source`;
  if (edition.exact) return `${target} · local exception`;
  if (edition.usedFallback && edition.effectiveMarket && edition.effectiveLocale) {
    return `${target} · uses ${edition.effectiveMarket.toUpperCase()} · ${edition.effectiveLocale}`;
  }
  return `${target} · shared source`;
}

export function contactSharedReviewReady(
  isSharedSourceTarget: boolean,
  availability: Pick<DocumentAvailability, "canEditShared" | "reviewedVersion" | "draftVersion"> | null | undefined,
) {
  return !isSharedSourceTarget
    || Boolean(
      availability?.canEditShared
      || availability?.reviewedVersion === availability?.draftVersion,
    );
}

export function contactSharedDestinationReviewReady(
  availability: Pick<DocumentAvailability, "reviewedVersion" | "draftVersion" | "items"> | null | undefined,
) {
  return Boolean(
    availability
    && availability.reviewedVersion !== null
    && availability.reviewedVersion === availability.draftVersion
    && availability.items.every((item) => item.reviewedDecision !== null),
  );
}

export function contactPublishAvailabilityReady(
  isSharedSourceTarget: boolean,
  availabilityResolved: boolean,
  draftVersion: number | undefined,
  sourceRevisionId: string | null | undefined,
  activeRevisionId: string | null,
) {
  return isSharedSourceTarget
    ? Boolean(
        availabilityResolved
        && draftVersion !== undefined
        && draftVersion >= 0
        && sourceRevisionId === activeRevisionId,
      )
    : availabilityResolved;
}

export type ContactPublicationMode = "direct" | "reviewed";

export type ContactPublicationDestination = Pick<
  DocumentAvailabilityDestination,
  "marketEditionId" | "market" | "locale" | "displayName" | "stagedDecision" | "reviewedDecision"
> & {
  decision: DocumentAvailabilityDestination["stagedDecision"];
};

export type ContactPublicationSnapshot = {
  mode: ContactPublicationMode;
  availabilityVersion: number;
  sourceRevisionId: string;
  revisionId: string;
  destinations: ContactPublicationDestination[];
};

export function contactPublicationDestinations(
  availability: Pick<DocumentAvailability, "items" | "reviewedVersion" | "draftVersion">,
  mode: ContactPublicationMode,
): ContactPublicationDestination[] {
  const useReviewed = mode === "reviewed"
    && contactSharedDestinationReviewReady(availability);
  return availability.items.map((item) => ({
    marketEditionId: item.marketEditionId,
    market: item.market,
    locale: item.locale,
    displayName: item.displayName,
    stagedDecision: item.stagedDecision,
    reviewedDecision: item.reviewedDecision,
    decision: useReviewed ? (item.reviewedDecision ?? item.stagedDecision) : item.stagedDecision,
  }));
}

export function contactPublicationAffectedDestinations(
  isSharedSource: boolean,
  selectedMarket: string,
  selectedLocale: string,
  availability: Pick<DocumentAvailability, "items" | "reviewedVersion" | "draftVersion"> | null | undefined,
  mode: ContactPublicationMode,
): ContactPublicationDestination[] {
  if (isSharedSource) {
    return availability ? contactPublicationDestinations(availability, mode) : [];
  }
  return [{
    marketEditionId: `${selectedMarket}:${selectedLocale}`,
    market: selectedMarket,
    locale: selectedLocale,
    displayName: `${selectedMarket.toUpperCase()} · ${selectedLocale}`,
    stagedDecision: "show",
    reviewedDecision: null,
    decision: "show",
  }];
}

export function contactPublicationSnapshot(
  availability: Pick<DocumentAvailability, "draftVersion" | "reviewedVersion" | "items">,
  sourceRevisionId: string,
  revisionId: string,
  mode: ContactPublicationMode,
): ContactPublicationSnapshot {
  return {
    mode,
    availabilityVersion: availability.draftVersion,
    sourceRevisionId,
    revisionId,
    destinations: contactPublicationDestinations(availability, mode),
  };
}

export function contactPublicationSnapshotMatches(
  snapshot: ContactPublicationSnapshot,
  availability: Pick<DocumentAvailability, "draftVersion" | "reviewedVersion" | "sharedSource" | "items">,
  revisionId: string,
) {
  if (
    snapshot.revisionId !== revisionId
    || snapshot.availabilityVersion !== availability.draftVersion
    || availability.sharedSource?.revisionId !== snapshot.sourceRevisionId
  ) {
    return false;
  }
  return JSON.stringify(snapshot.destinations)
    === JSON.stringify(contactPublicationDestinations(availability, snapshot.mode));
}
