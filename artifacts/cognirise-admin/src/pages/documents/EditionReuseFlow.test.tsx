import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  DocumentFragment: { value: dom.window.DocumentFragment, configurable: true },
  Event: { value: dom.window.Event, configurable: true },
  MouseEvent: { value: dom.window.MouseEvent, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

if (typeof (mock as typeof mock & { module?: unknown }).module !== "function") {
  test("rendered stale reuse confirmation", async () => {
    await promisify(execFile)(process.execPath, [
      "--experimental-test-module-mocks",
      "--import", "tsx",
      "--test", fileURLToPath(import.meta.url),
    ], { env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  });
} else {
  mock.module("@workspace/api-client-react", {
    namedExports: {
      getDocumentRevision: async () => ({ snapshot: { title: "Destination" } }),
    },
  });

  const { EditionReuseFlow } = await import("./EditionReuseFlow");
  const { createRoot } = await import("react-dom/client");
  const markets = [
    { id: "uae-id", code: "uae", displayName: "UAE", defaultLocale: "en-US" },
    { id: "ksa-id", code: "ksa", displayName: "KSA", defaultLocale: "en" },
  ];
  const flowProps = (revisionId: string, version: number, baselineRevisionId = "baseline-1") => ({
    documentId: "document",
    matrix: {
      baselines: [{
        id: "baseline", documentId: "document", locale: "en-US", revisionId: baselineRevisionId,
        revisionNumber: baselineRevisionId === "baseline-1" ? 1 : 2, sourceRevisionId: "source-1",
        snapshot: { title: "Source" }, mediaReferences: [], createdAt: "2026-01-01T00:00:00.000Z",
      }],
      bindings: [{
        id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
        mode: "independent" as const, baselineId: null, baselineRevisionId: null,
        heldBaselineRevisionId: null, translationSourceRevisionId: null, version, operations: [],
        materializedRevisionId: revisionId, translationState: "not-applicable" as const, updatedAt: "2026-01-01T00:00:00.000Z",
      }],
    },
    markets,
    exactEditions: [
      { market: "uae", locale: "en-US", revisionId: "source-1", revisionNumber: 1 },
      { market: "ksa", locale: "en-US", revisionId, revisionNumber: version },
    ],
    sourceRevisionId: "source-1",
    currentRevisionId: "source-1",
    canManageBaselines: true,
    canEditDestination: () => true,
    hasUnsaved: false,
    onOpenSource: () => {},
    onSaveSource: () => {},
    onCompare: () => {},
    onApply: async () => [],
  });

  test("rendered stale-refetch-retry removes an inspected replacement confirmation", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow {...flowProps("target-1", 4)} />);
    });
    const selection = container.querySelector('#reuse-ksa\\|en-US') as HTMLElement;
    await React.act(async () => { selection.click(); });
    const inspect = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Inspect saved differences")) as HTMLButtonElement;
    await React.act(async () => { inspect.click(); });
    const checkboxes = container.querySelectorAll('[role="checkbox"]');
    const replacement = checkboxes[checkboxes.length - 1] as HTMLElement;
    await React.act(async () => { replacement.click(); });
    assert.match(container.textContent ?? "", /Replace this customization/);

    // Simulates the stale 409 invalidation/refetch. The component must not
    // retain confirmation when either target state or the frozen baseline
    // successor changes.
    await React.act(async () => {
      root!.render(<EditionReuseFlow {...flowProps("target-1", 4, "baseline-2")} />);
    });
    assert.doesNotMatch(container.textContent ?? "", /Replace this customization/);
    const apply = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Use saved content in")) as HTMLButtonElement;
    assert.equal(apply.disabled, true);
    await React.act(async () => root!.unmount());
    container.remove();
  });
}