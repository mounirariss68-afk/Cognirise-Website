type SuccessorResponse = {
  currentRevisionId?: string | null;
  revisionNumber?: number;
};

export type PreviewTarget = {
  market: string;
  locale: string;
  revisionId: string;
};

type PreviewResponse = {
  requestedMarket?: string;
  requestedLocale?: string;
  market?: string;
  locale?: string;
  revisionId?: string;
};

type EditionMatrix = {
  items: Array<{ market: string; locale: string; revisionId?: string | null; revisionNumber?: number }>;
};

/**
 * A preview capability is scoped to all three parts of the exact editor
 * address. The API also returns the resolved address, so checking only its
 * revision id would allow a valid revision from a different market or locale
 * to be opened in the wrong tab.
 */
export function previewResponseMatchesTarget(
  response: PreviewResponse | null | undefined,
  target: PreviewTarget,
) {
  return Boolean(
    response
    && response.revisionId === target.revisionId
    && response.requestedMarket === target.market
    && response.requestedLocale === target.locale
    && response.market === target.market
    && response.locale === target.locale,
  );
}

export function previewPinForEditionRevision(
  pinnedRevisionId: string | undefined,
  editionRevisionId: string | null | undefined,
  localSuccessor: boolean,
  latestSavedRevisionId?: string | null,
) {
  if (localSuccessor && editionRevisionId) return editionRevisionId;
  return pinnedRevisionId ?? latestSavedRevisionId ?? editionRevisionId ?? undefined;
}

/** Updates only the exact edition that produced a confirmed local successor. */
export function applyLocalSuccessorToEditionMatrix(
  matrix: EditionMatrix | undefined,
  target: { market: string; locale: string },
  successor: SuccessorResponse,
) {
  if (!matrix || !successor.currentRevisionId || typeof successor.revisionNumber !== "number") return matrix;
  return {
    ...matrix,
    items: matrix.items.map((edition) =>
      edition.market === target.market && edition.locale === target.locale
        ? { ...edition, revisionId: successor.currentRevisionId, revisionNumber: successor.revisionNumber }
        : edition,
    ),
  };
}