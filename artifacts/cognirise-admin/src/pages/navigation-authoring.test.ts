import assert from "node:assert/strict";
import test from "node:test";
import {
  navigationDestinationOptions,
  navigationParentOptions,
  navigationPositionOptions,
  navigationSnapshot,
  navigationTree,
} from "./navigation-authoring";
import type { NavigationSettings } from "@workspace/api-client-react";

const settings: NavigationSettings = {
  items: [
    { id: "about", label: "About", parentId: null, order: 1, destination: "/about", visible: true },
    { id: "about.contact", label: "Contact", parentId: "about", order: 2, destination: "/contact", visible: true },
    { id: "what-we-do", label: "What we do", parentId: null, order: 0, destination: "/", visible: true },
  ],
  pages: [
    { path: "/", enabled: true },
    { path: "/about", enabled: true },
    { path: "/contact", enabled: true },
  ],
  requestedMarket: "uae",
  requestedLocale: "en",
  market: "uae",
  locale: "en",
  usedFallback: false,
  isConfigured: true,
  updatedAt: null,
  version: 4,
};

test("navigation tree and parent picker expose labels, not registry identifiers", () => {
  const tree = navigationTree(settings.items);
  assert.deepEqual(tree.map((item) => item.label), ["What we do", "About"]);
  assert.deepEqual(tree[1]?.children.map((item) => item.label), ["Contact"]);

  const options = navigationParentOptions(settings.items, "about.contact");
  assert.equal(options[0]?.label, "Top level (main menu)");
  assert.equal(options[1]?.label, "What we do · /");
  assert.equal(options.some((option) => option.label.includes("about.contact")), false);
});

test("destination picker keeps a currently stored page while using governed paths", () => {
  const options = navigationDestinationOptions(settings, "/legacy");
  assert.equal(options.some((option) => option.value === "/legacy"), true);
  assert.equal(options.find((option) => option.value === "/contact")?.label, "Contact · /contact");
  assert.equal(options.some((option) => option.label.includes("about.contact")), false);
});

test("navigation position and dirty snapshots are deterministic", () => {
  assert.deepEqual(navigationPositionOptions(2).map((option) => option.label), ["Position 1", "Position 2"]);
  assert.equal(navigationPositionOptions(2, 7)[7]?.value, "7");
  const first = navigationSnapshot(settings);
  const second = navigationSnapshot({ ...settings, updatedAt: new Date().toISOString() });
  assert.equal(first, second);
  assert.notEqual(
    first,
    navigationSnapshot({
      ...settings,
      items: settings.items.map((item) => item.id === "about" ? { ...item, visible: false } : item),
    }),
  );
});
