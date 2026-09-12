import type { DocumentEdition, UserRole } from "@workspace/api-client-react";

export type EditionAuthoringActions = {
  canSave: boolean;
  canSubmit: boolean;
  canPublish: boolean;
  immutable: boolean;
};

/**
 * Chooses only real, exact editions. The API has already removed markets the
 * session cannot access; marketCodes provides a stable preference within that
 * accessible matrix.
 */
export function selectInitialExactEdition(
  editions: DocumentEdition[],
  role: UserRole | undefined,
  marketCodes: string[] = [],
): DocumentEdition | undefined {
  const exact = editions.filter((edition) => edition.exact && edition.revisionId);
  const preferred = (available: DocumentEdition[]) => role === "administrator"
    ? available.find((edition) => edition.market === "uae")
      ?? available.find((edition) => marketCodes.includes(edition.market))
      ?? available[0]
    : available.find((edition) => marketCodes.includes(edition.market)) ?? available[0];

  return preferred(exact) ?? preferred(editions);
}

/** Actions are based exclusively on the latest exact-edition workflow row. */
export function editionAuthoringActions(
  edition: DocumentEdition | undefined,
  canEdit: boolean,
  canPublish: boolean,
  hasUnsaved: boolean,
  allowDirectPublish = false,
): EditionAuthoringActions {
  if (!edition?.exact || !edition.revisionId) {
    return { canSave: false, canSubmit: false, canPublish: false, immutable: true };
  }

  const workflow = edition.workflowState;
  const immutable = workflow === "in-review";
  return {
    canSave: canEdit && !immutable
      && (workflow === "approved" || (["draft", "rejected"].includes(workflow ?? "") && hasUnsaved)),
    canSubmit: canEdit && !hasUnsaved && ["draft", "rejected"].includes(workflow ?? ""),
    canPublish: canPublish && !hasUnsaved && (
      workflow === "in-review"
      || (allowDirectPublish && ["draft", "rejected"].includes(workflow ?? ""))
    ),
    immutable,
  };
}