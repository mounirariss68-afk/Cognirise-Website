export type GuardrailsRevisionInventoryEntry = {
  /** Exact path passed to the standalone Guardrails editor's Area control. */
  path: string;
  consumer: "public-detail" | "internal" | "derived";
  draft: "editable" | "read-only" | "derived";
  note?: string;
};

const supportedGuardrailsContentVersions = new Set([
  "guardrails-legacy-v1",
  "set-prove-hold-v1",
]);

const standaloneGuardrailsSharedRoots = new Set([
  "sources",
  "relatedIds",
  "heroMedia",
  "heroMediaId",
  "visibility",
  "order",
  "verificationDate",
  "reviewDate",
]);

const guardrailsStructuralKeys = new Set([
  "template",
  "contentVersion",
  "id",
  "href",
  "phase",
  "mode",
  "actionIds",
  "sourceIds",
  "sourceId",
  "layerId",
  "enforcementLayer",
  "destination",
  "additionId",
  "thresholdAfter",
  "strength",
  "strengthLabel",
  "number",
  "schemaVersion",
  "visibility",
  "order",
  "verificationDate",
  "reviewDate",
  "relatedIds",
]);

/** Returns only editable prose paths. Structural IDs, control placement, and
 * governance fields are deliberately excluded from the Guardrails editor. */
export function guardrailsEditableTextPaths(item: unknown, path: string[] = []): string[][] {
  if (path[0] === "sources" || path[0] === "relatedIds" || path[0] === "heroMedia" || path[0] === "heroMediaId") return [];
  if (typeof item === "string") {
    const key = path.at(-1) ?? "";
    // `version` is editorial evidence copy in references, while an action's
    // Output/Cadence label is an enum-backed structural display contract.
    if (
      guardrailsStructuralKeys.has(key)
      || (key === "version" && !(path[0] === "references" && path[1] === "items"))
      || (key === "label" && path.includes("outputOrCadence"))
    ) return [];
    return [path];
  }
  if (Array.isArray(item)) return item.flatMap((entry, index) => guardrailsEditableTextPaths(entry, [...path, String(index)]));
  if (item && typeof item === "object") return Object.entries(item).flatMap(([key, entry]) => guardrailsEditableTextPaths(entry, [...path, key]));
  return [];
}

const guardrailsLeafPaths = (item: unknown, path: string[] = []): string[][] => {
  if (item === null || item === undefined) return [];
  if (typeof item !== "object") return [path];
  if (Array.isArray(item)) return item.flatMap((entry, index) => guardrailsLeafPaths(entry, [...path, String(index)]));
  return Object.entries(item).flatMap(([key, entry]) => guardrailsLeafPaths(entry, [...path, key]));
};

/**
 * Produces the revision-specific record of the standalone Guardrails editor.
 * It deliberately calls `guardrailsEditableTextPaths`, so a newly rendered
 * prose leaf cannot diverge from the inventory. Shared governance, source,
 * relationship, and media wrappers are omitted here because their field
 * coverage is recorded by the common ContentEditor controls.
 */
export function guardrailsRevisionInventory(item: unknown): GuardrailsRevisionInventoryEntry[] {
  const record = item && typeof item === "object" && !Array.isArray(item) ? item as Record<string, unknown> : null;
  const contentVersion = record?.contentVersion;
  if (typeof contentVersion !== "string" || !supportedGuardrailsContentVersions.has(contentVersion)) {
    throw new Error("Guardrails inventory requires a supported contentVersion.");
  }

  const editablePaths = new Set(guardrailsEditableTextPaths(item).map((path) => path.join(".")));
  const inventory = guardrailsLeafPaths(item)
    .filter((path) => !standaloneGuardrailsSharedRoots.has(path[0] ?? ""))
    .map((path): GuardrailsRevisionInventoryEntry => {
      const exactPath = `content.${path.join(".")}`;
      if (path.join(".") === "schemaVersion") {
        return { path: exactPath, consumer: "derived", draft: "derived", note: "Runtime contract version." };
      }
      if (editablePaths.has(path.join("."))) {
        return { path: exactPath, consumer: "public-detail", draft: "editable" };
      }
      return {
        path: exactPath,
        consumer: "internal",
        draft: "read-only",
        note: "Protected structural key; the standalone editor must preserve it.",
      };
    });

  return inventory.sort((left, right) => left.path.localeCompare(right.path));
}