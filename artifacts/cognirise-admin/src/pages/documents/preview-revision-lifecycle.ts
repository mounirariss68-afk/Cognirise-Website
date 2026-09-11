type SuccessorResponse = {
  currentRevisionId?: string | null;
  revisionNumber?: number;
};

type EditionMatrix = {
  items: Array<{ market: string; locale: string; revisionId?: string | null; revisionNumber?: number }>;
};

export function previewPinForEditionRevision(
  pinnedRevisionId: string | undefined,
  editionRevisionId: string | null | undefined,
  localSuccessor: boolean,
) {
  if (localSuccessor && editionRevisionId) return editionRevisionId;
  return pinnedRevisionId ?? editionRevisionId ?? undefined;
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