/**
 * Pure shared-market projection primitives.  This module intentionally has no
 * database or HTTP dependency so that authoring clients and the API can make
 * the same sparse-override and conflict decisions.
 *
 * Array positions are never addresses. An array can only be changed when all
 * of its entries have a unique string `id`; this prevents a baseline reorder
 * from silently applying an override to the wrong entry.
 */
import { collectCmsMediaReferences, type CmsDocumentKind } from "./cms-content";

export type SharedMarketBindingModeValue = "shared" | "adapted" | "independent";
export type SharedOverrideOperation =
  | { op: "set"; path: string; value: unknown }
  | { op: "remove"; path: string }
  | { op: "array-add"; path: string; value: Record<string, unknown>; afterId?: string }
  | { op: "array-remove"; path: string; id: string }
  | { op: "array-reorder"; path: string; ids: string[] };

export type SharedMergeConflictKind =
  | "invalid-path"
  | "unsupported-structure"
  | "deleted-baseline-value"
  | "concurrent-value-change"
  | "array-add-conflict"
  | "array-remove-conflict"
  | "array-reorder-conflict";

export interface SharedMergeConflict {
  path: string;
  kind: SharedMergeConflictKind;
  message: string;
}

export interface SharedMergeResult {
  snapshot: Record<string, unknown>;
  conflicts: SharedMergeConflict[];
}

type PathPart = { key: string; id?: string };
const PATH = /^(?:[A-Za-z][A-Za-z0-9_]*)(?:\[[A-Za-z][A-Za-z0-9_-]*=[^\]/]+\])?(?:\.[A-Za-z][A-Za-z0-9_]*(?:\[[A-Za-z][A-Za-z0-9_-]*=[^\]/]+\])?)*$/;

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function equal(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function parsePath(path: string): PathPart[] {
  if (!PATH.test(path) || /\[\d+\]/.test(path)) {
    throw new Error("Paths must use object keys and stable array selectors; numeric array indexes are not supported.");
  }
  return path.split(".").map((segment) => {
    const match = /^([A-Za-z][A-Za-z0-9_]*)(?:\[id=([^\]]+)\])?$/.exec(segment);
    if (!match) throw new Error(`Invalid override path: ${path}`);
    return { key: match[1]!, id: match[2] };
  });
}

function stableArray(value: unknown, path: string): Array<Record<string, unknown>> {
  if (!Array.isArray(value) || !value.every((item) =>
    item && typeof item === "object" && !Array.isArray(item) && typeof item.id === "string"
  )) {
    throw new Error(`${path} is not a stable-id array.`);
  }
  const ids = value.map((item) => String((item as Record<string, unknown>).id));
  if (new Set(ids).size !== ids.length) throw new Error(`${path} has duplicate stable IDs.`);
  return value as Array<Record<string, unknown>>;
}

function valueAt(root: Record<string, unknown>, parts: PathPart[], path: string): unknown {
  let current: unknown = root;
  for (const part of parts) {
    if (!current || typeof current !== "object" || Array.isArray(current)) {
      throw new Error(`${path} does not address an object field.`);
    }
    current = (current as Record<string, unknown>)[part.key];
    if (part.id !== undefined) {
      current = stableArray(current, path).find((item) => item.id === part.id);
      if (!current) throw new Error(`${path} does not contain stable ID ${part.id}.`);
    }
  }
  return current;
}

function parentAt(root: Record<string, unknown>, parts: PathPart[], path: string) {
  const parent = valueAt(root, parts.slice(0, -1), path);
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) {
    throw new Error(`${path} does not have an object parent.`);
  }
  return { parent: parent as Record<string, unknown>, last: parts.at(-1)! };
}

function setAt(root: Record<string, unknown>, path: string, value: unknown) {
  const parts = parsePath(path);
  const { parent, last } = parentAt(root, parts, path);
  if (last.id === undefined) {
    parent[last.key] = clone(value);
    return;
  }
  const array = stableArray(parent[last.key], path);
  const index = array.findIndex((item) => item.id === last.id);
  if (index < 0) throw new Error(`${path} does not contain stable ID ${last.id}.`);
  array[index] = clone(value as Record<string, unknown>);
}

function removeAt(root: Record<string, unknown>, path: string) {
  const parts = parsePath(path);
  const { parent, last } = parentAt(root, parts, path);
  if (last.id === undefined) {
    if (!(last.key in parent)) throw new Error(`${path} does not exist.`);
    delete parent[last.key];
    return;
  }
  const array = stableArray(parent[last.key], path);
  const index = array.findIndex((item) => item.id === last.id);
  if (index < 0) throw new Error(`${path} does not contain stable ID ${last.id}.`);
  array.splice(index, 1);
}

function arrayAt(root: Record<string, unknown>, path: string) {
  const parts = parsePath(path);
  if (parts.at(-1)?.id !== undefined) throw new Error(`${path} must address an array, not an item.`);
  return stableArray(valueAt(root, parts, path), path);
}

/** Validates and applies sparse operations to a fully materialized baseline. */
export function applySharedOverrideOperations(
  baseline: Record<string, unknown>,
  operations: readonly SharedOverrideOperation[],
): Record<string, unknown> {
  const result = clone(baseline);
  for (const operation of operations) {
    switch (operation.op) {
      case "set":
        setAt(result, operation.path, operation.value);
        break;
      case "remove":
        removeAt(result, operation.path);
        break;
      case "array-add": {
        if (!operation.value || typeof operation.value.id !== "string") {
          throw new Error(`${operation.path} additions require an object with a stable string id.`);
        }
        const array = arrayAt(result, operation.path);
        if (array.some((item) => item.id === operation.value.id)) {
          throw new Error(`${operation.path} already contains stable ID ${operation.value.id}.`);
        }
        const after = operation.afterId === undefined ? -1 : array.findIndex((item) => item.id === operation.afterId);
        if (operation.afterId !== undefined && after < 0) {
          throw new Error(`${operation.path} does not contain afterId ${operation.afterId}.`);
        }
        array.splice(after + 1, 0, clone(operation.value));
        break;
      }
      case "array-remove": {
        const array = arrayAt(result, operation.path);
        const index = array.findIndex((item) => item.id === operation.id);
        if (index < 0) throw new Error(`${operation.path} does not contain stable ID ${operation.id}.`);
        array.splice(index, 1);
        break;
      }
      case "array-reorder": {
        const array = arrayAt(result, operation.path);
        const ids = array.map((item) => String(item.id));
        if (operation.ids.length !== ids.length || new Set(operation.ids).size !== ids.length ||
          operation.ids.some((id) => !ids.includes(id))) {
          throw new Error(`${operation.path} reorder must contain each current stable ID exactly once.`);
        }
        const byId = new Map(array.map((item) => [String(item.id), item]));
        array.splice(0, array.length, ...operation.ids.map((id) => byId.get(id)!));
        break;
      }
    }
  }
  return result;
}

/**
 * Derive a minimal, identity-addressed projection of a resolved market
 * snapshot onto its adopted baseline. This is shared by normal exact-edition
 * saves and the editor reset affordance so neither path broadens a local
 * override accidentally.
 */
export function sparseOverridesForResolvedSnapshot(
  baseline: Record<string, unknown>,
  resolved: Record<string, unknown>,
): SharedOverrideOperation[] {
  const operations: SharedOverrideOperation[] = [];
  const isObject = (value: unknown): value is Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value);
  const stable = (value: unknown[]): value is Array<Record<string, unknown> & { id: string }> =>
    value.every((item) => isObject(item) && typeof item.id === "string" && /^[A-Za-z0-9_-]+$/.test(item.id))
    && new Set(value.map((item) => String((item as Record<string, unknown>).id))).size === value.length;
  const walk = (before: Record<string, unknown>, after: Record<string, unknown>, parent = "") => {
    for (const key of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
      const path = parent ? `${parent}.${key}` : key;
      if (!(key in after)) {
        operations.push({ op: "remove", path });
        continue;
      }
      const previous = before[key];
      const next = after[key];
      if (equal(previous, next)) continue;
      if (isObject(previous) && isObject(next)) {
        walk(previous, next, path);
      } else if (Array.isArray(previous) && Array.isArray(next) && stable(previous) && stable(next)) {
        const oldById = new Map(previous.map((item) => [item.id, item]));
        const newById = new Map(next.map((item) => [item.id, item]));
        for (const item of previous) {
          if (!newById.has(item.id)) operations.push({ op: "array-remove", path, id: item.id });
        }
        const appliedIds = previous.filter((item) => newById.has(item.id)).map((item) => item.id);
        for (const item of next) {
          const original = oldById.get(item.id);
          if (original) walk(original, item, `${path}[id=${item.id}]`);
          else {
            operations.push({ op: "array-add", path, value: item });
            appliedIds.unshift(item.id);
          }
        }
        const ids = next.map((item) => item.id);
        if (!equal(appliedIds, ids)) operations.push({ op: "array-reorder", path, ids });
      } else {
        operations.push({ op: "set", path, value: next });
      }
    }
  };
  walk(baseline, resolved);
  return operations;
}

/**
 * Reset one field (or one stable-ID array item) to the adopted baseline then
 * rederive the whole sparse projection. Re-derivation is essential when a
 * legacy parent `set` operation contains several children: dropping that
 * parent would reset unrelated siblings too.
 */
export function resetSharedOverridePath(
  baseline: Record<string, unknown>,
  operations: readonly SharedOverrideOperation[],
  path: string,
  kind?: CmsDocumentKind,
): SharedOverrideOperation[] {
  const parts = parsePath(path);
  const resolved = applySharedOverrideOperations(baseline, operations);
  const typedMediaBeforeReset = kind
    ? new Set(collectCmsMediaReferences(kind, resolved.content, []).map((reference) => reference.mediaId))
    : null;
  let baselineValue: unknown;
  let baselineHasValue = true;
  try {
    baselineValue = valueAt(baseline, parts, path);
    baselineHasValue = baselineValue !== undefined;
  } catch (error) {
    // A missing final stable-ID item is a local array addition and can be
    // reset by removing that item. Missing parents/selectors cannot be reset
    // without guessing which local structure the editor meant to restore.
    const last = parts.at(-1)!;
    if (last.id === undefined) {
      throw new Error(`Cannot reset ${path}: it has no representable adopted-baseline value.`);
    }
    baselineHasValue = false;
  }
  try {
    if (baselineHasValue) {
      setAt(resolved, path, baselineValue);
    } else {
      const last = parts.at(-1)!;
      if (last.id !== undefined) {
        // A complete stable-ID item that is absent from the baseline is a
        // local-only addition. Resetting that item means removing it.
        removeAt(resolved, path);
      } else {
        const current = valueAt(resolved, parts, path);
        if (current !== undefined) removeAt(resolved, path);
      }
    }
  } catch (error) {
    throw new Error(
      `Cannot reset ${path}: a local parent removal or array structure makes this nested reset unrepresentable.`,
    );
  }
  if (kind && typedMediaBeforeReset) {
    const typedMediaAfterReset = new Set(
      collectCmsMediaReferences(kind, resolved.content, []).map((reference) => reference.mediaId),
    );
    const existingRootIds = Array.isArray(resolved.mediaIds)
      ? resolved.mediaIds.filter((mediaId): mediaId is string => typeof mediaId === "string")
      : [];
    // Root `mediaIds` sometimes mirror typed content references and sometimes
    // carry genuine legacy/non-content attachments. Remove only an ID that was
    // previously typed and is no longer typed, retain all other attachments,
    // then ensure every resulting typed reference is represented.
    const synchronizedRootIds = existingRootIds.filter((mediaId) =>
      !typedMediaBeforeReset.has(mediaId) || typedMediaAfterReset.has(mediaId),
    );
    for (const mediaId of typedMediaAfterReset) {
      if (!synchronizedRootIds.includes(mediaId)) synchronizedRootIds.push(mediaId);
    }
    if (existingRootIds.length || typedMediaAfterReset.size) {
      resolved.mediaIds = synchronizedRootIds;
    }
  }
  return sparseOverridesForResolvedSnapshot(baseline, resolved);
}

function conflict(path: string, kind: SharedMergeConflictKind, message: string): SharedMergeConflict {
  return { path, kind, message };
}

/**
 * Replays local operations over a new baseline and explicitly reports the
 * baseline changes that would make a replay ambiguous.  A conflict never
 * causes a partial baseline mutation: callers must choose adopt, keep, reset,
 * or detach and persist a new immutable materialization.
 */
export function mergeSharedBaselineUpdate(
  previousBaseline: Record<string, unknown>,
  nextBaseline: Record<string, unknown>,
  operations: readonly SharedOverrideOperation[],
): SharedMergeResult {
  const conflicts: SharedMergeConflict[] = [];
  for (const operation of operations) {
    try {
      if (operation.op === "set" || operation.op === "remove") {
        const parts = parsePath(operation.path);
        const before = valueAt(previousBaseline, parts, operation.path);
        const after = valueAt(nextBaseline, parts, operation.path);
        if (!equal(before, after)) {
          conflicts.push(conflict(operation.path, after === undefined ? "deleted-baseline-value" : "concurrent-value-change",
            "The shared baseline changed this locally overridden value."));
        }
      } else {
        const before = stableArray(valueAt(previousBaseline, parsePath(operation.path), operation.path), operation.path);
        const after = stableArray(valueAt(nextBaseline, parsePath(operation.path), operation.path), operation.path);
        const beforeById = new Map(before.map((item) => [String(item.id), item]));
        const afterById = new Map(after.map((item) => [String(item.id), item]));
        if (operation.op === "array-add") {
          if (afterById.has(String(operation.value.id))) {
            conflicts.push(conflict(operation.path, "array-add-conflict",
              `The shared baseline now contains local addition ID ${operation.value.id}.`));
          }
          // `afterId` is semantic placement, so replaying after a baseline
          // reorder would attach the local item to a different neighbour.
          // Baseline additions are safe; only the relative order of entries
          // that existed when the operation was authored is ambiguous.
          const beforeIds = before.map((item) => String(item.id));
          const afterExistingIds = after
            .map((item) => String(item.id))
            .filter((id) => beforeById.has(id));
          const beforeStillPresent = beforeIds.filter((id) => afterById.has(id));
          if (!equal(beforeStillPresent, afterExistingIds)) {
            conflicts.push(conflict(operation.path, "array-add-conflict",
              "The shared baseline reordered this array, making the local addition's placement ambiguous."));
          } else if (operation.afterId !== undefined && !afterById.has(operation.afterId)) {
            conflicts.push(conflict(operation.path, "array-add-conflict",
              `The shared baseline removed the local addition anchor ${operation.afterId}.`));
          }
        } else if (operation.op === "array-remove") {
          const original = beforeById.get(operation.id);
          const changed = afterById.get(operation.id);
          if (!original || !changed) {
            conflicts.push(conflict(operation.path, "array-remove-conflict",
              `The shared baseline removed stable ID ${operation.id}.`));
          } else if (!equal(original, changed)) {
            conflicts.push(conflict(operation.path, "array-remove-conflict",
              `The shared baseline changed stable ID ${operation.id} while this market removes it.`));
          }
        } else {
          const beforeIds = before.map((item) => String(item.id));
          const afterIds = after.map((item) => String(item.id));
          if (!equal(beforeIds, afterIds)) {
            conflicts.push(conflict(operation.path, "array-reorder-conflict",
              "The shared baseline reordered or structurally changed this locally reordered array."));
          }
        }
      }
    } catch (error) {
      conflicts.push(conflict(operation.path, "unsupported-structure",
        error instanceof Error ? error.message : "The override addresses unsupported structure."));
    }
  }
  if (conflicts.length) return { snapshot: clone(nextBaseline), conflicts };
  try {
    return { snapshot: applySharedOverrideOperations(nextBaseline, operations), conflicts };
  } catch (error) {
    return {
      snapshot: clone(nextBaseline),
      conflicts: [conflict("",
        "invalid-path",
        error instanceof Error ? error.message : "The override is invalid.")],
    };
  }
}