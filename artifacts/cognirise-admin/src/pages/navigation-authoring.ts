import type { NavigationSettings, NavigationSetting } from "@workspace/api-client-react";

export type NavigationTreeItem = NavigationSetting & {
  children: NavigationTreeItem[];
};

export type NavigationPickerOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

function byOrder(a: NavigationSetting, b: NavigationSetting) {
  return a.order - b.order || a.label.localeCompare(b.label);
}

/**
 * Build the two-level menu used by the editor without exposing registry IDs.
 * The server remains the source of truth for hierarchy validation; this helper
 * is intentionally only a presentational projection.
 */
export function navigationTree(items: NavigationSetting[]): NavigationTreeItem[] {
  const childrenByParent = new Map<string, NavigationSetting[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const children = childrenByParent.get(item.parentId) ?? [];
    children.push(item);
    childrenByParent.set(item.parentId, children);
  }

  return items
    .filter((item) => !item.parentId)
    .sort(byOrder)
    .map((parent) => ({
      ...parent,
      children: (childrenByParent.get(parent.id) ?? []).sort(byOrder).map((child) => ({
        ...child,
        children: [],
      })),
    }));
}

export function navigationParentOptions(
  items: NavigationSetting[],
  itemId: string,
): NavigationPickerOption[] {
  return [
    { value: "", label: "Top level (main menu)" },
    ...items
      .filter((item) => !item.parentId && item.id !== itemId)
      .sort(byOrder)
      .map((item) => ({
        value: item.id,
        label: `${item.label} · ${item.destination}`,
      })),
  ];
}

function destinationLabel(
  destination: string,
  items: NavigationSetting[],
): string {
  const item = items.find((candidate) => candidate.destination === destination);
  return item ? `${item.label} · ${destination}` : destination;
}

/**
 * Destinations are selected from the release registry. An unresolved legacy
 * path is shown as quarantined so an editor can repair it, but it is never
 * offered as a valid destination for a new or changed item.
 */
export function navigationDestinationOptions(
  settings: Pick<NavigationSettings, "pages" | "items">,
  current?: string,
  registryDestinations: ReadonlyArray<{ destinationId: string; path: string }> = [],
): NavigationPickerOption[] {
  const registeredPaths = new Set(registryDestinations.map((entry) => entry.path));
  const configuredPaths = new Set(settings.pages.map((page) => page.path));
  const options = registryDestinations
    .filter((entry) => entry.path && entry.path !== "/preview/:token")
    .filter((entry, index, all) => all.findIndex((candidate) => candidate.path === entry.path) === index)
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((entry) => ({
      value: entry.path,
      label: `${entry.destinationId} · ${entry.path}${configuredPaths.has(entry.path) ? "" : " · unavailable in this edition"}`,
      disabled: !configuredPaths.has(entry.path),
    }));
  if (current && !registeredPaths.has(current)) {
    options.unshift({
      value: current,
      label: `Repair required · unresolved legacy path ${current}`,
      disabled: true,
    });
  }
  return options.length ? options : settings.pages.map((page) => ({
    value: page.path,
    label: destinationLabel(page.path, settings.items),
  }));
}

export function navigationPositionOptions(itemCount: number, currentOrder?: number): NavigationPickerOption[] {
  const optionCount = Math.max(1, itemCount, typeof currentOrder === "number" ? currentOrder + 1 : 0);
  return Array.from({ length: optionCount }, (_, index) => ({
    value: String(index),
    label: `Position ${index + 1}`,
  }));
}

export function navigationSnapshot(settings: NavigationSettings | null | undefined) {
  if (!settings) return "";
  return JSON.stringify({
    items: settings.items.map(({ id, label, parentId, order, destination, visible }) => ({
      id,
      label,
      parentId,
      order,
      destination,
      visible,
    })),
    pages: settings.pages.map(({ path, enabled }) => ({ path, enabled })),
    version: settings.version,
    market: settings.market,
    locale: settings.locale,
  });
}
