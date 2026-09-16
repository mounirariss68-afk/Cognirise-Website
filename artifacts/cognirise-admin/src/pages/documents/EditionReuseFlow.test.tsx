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

  const { EditionReuseFlow, canSaveReusableSourceFromAuthority } = await import("./EditionReuseFlow");
  const { createRoot } = await import("react-dom/client");
  const markets = [
    { id: "uae-id", code: "uae", displayName: "UAE", defaultLocale: "en-US" },
    { id: "ksa-id", code: "ksa", displayName: "KSA", defaultLocale: "en" },
  ];
  const flowProps = (
    revisionId: string,
    version: number,
    baselineRevisionId = "baseline-1",
    flowMarkets = markets,
  ) => ({
    documentId: "document",
    matrix: {
      baselines: [{
        id: "baseline", documentId: "document", locale: "en-US", revisionId: baselineRevisionId,
        revisionNumber: baselineRevisionId === "baseline-1" ? 1 : 2, sourceRevisionId: "source-1", authorityKind: "regional" as const,
        snapshot: { title: "Source" }, mediaReferences: [], createdAt: "2026-01-01T00:00:00.000Z",
      }],
      bindings: [{
        id: "ksa-binding", documentId: "document", marketEditionId: "ksa-id", locale: "en-US",
        mode: "independent" as const, baselineId: null, baselineRevisionId: null,
        heldBaselineRevisionId: null, translationSourceRevisionId: null, version, operations: [],
        materializedRevisionId: revisionId, translationState: "not-applicable" as const, updatedAt: "2026-01-01T00:00:00.000Z",
      }],
    },
    markets: flowMarkets,
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

  test("explicit source and affected-destination edit grants enable saving for a lower legacy role", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const props = flowProps("target-1", 4);
    const authority = {
      capabilityMatrixConfigured: true,
      role: "author",
      marketCodes: [],
      capabilityGrants: [
        { topic: "industry", capability: "edit", scope: "shared", marketCode: "uae" },
        { topic: "industry", capability: "edit", scope: "regional", marketCode: "uae" },
        { topic: "industry", capability: "edit", scope: "regional", marketCode: "ksa" },
      ],
    };
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow
        {...props}
        matrix={{ ...props.matrix, baselines: [] }}
        canManageBaselines={false}
        canSaveReusableSource={(source, affected) => canSaveReusableSourceFromAuthority(authority, "industry", source, affected)}
      />);
    });
    const save = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Save reusable content")) as HTMLButtonElement;
    assert.equal(save.disabled, false);
    assert.doesNotMatch(container.textContent ?? "", /do not have authority to save this reusable source/);
    await React.act(async () => root!.unmount());
    container.remove();
  });

  test("configured source authority requires regional edit on the source as well as shared source edit", () => {
    assert.equal(canSaveReusableSourceFromAuthority({
      capabilityMatrixConfigured: true,
      role: "author",
      capabilityGrants: [
        { topic: "industry", capability: "edit", scope: "shared", marketCode: "uae" },
        { topic: "industry", capability: "edit", scope: "regional", marketCode: "ksa" },
      ],
    }, "industry", "uae", ["ksa"]), false);
  });

  test("a configured empty matrix keeps an administrator's reusable-source save disabled", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const props = flowProps("target-1", 4);
    const authority = {
      capabilityMatrixConfigured: true,
      role: "administrator",
      marketCodes: ["uae", "ksa"],
      capabilityGrants: [],
    };
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow
        {...props}
        matrix={{ ...props.matrix, baselines: [] }}
        canManageBaselines
        canSaveReusableSource={(source, affected) => canSaveReusableSourceFromAuthority(authority, "industry", source, affected)}
      />);
    });
    const save = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Save reusable content")) as HTMLButtonElement;
    assert.equal(save.disabled, true);
    assert.match(container.textContent ?? "", /do not have authority to save this reusable source and every affected destination/);
    await React.act(async () => root!.unmount());
    container.remove();
  });

  test("a distinct authorized published source freezes its exact revision without opening the newer draft", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const props = flowProps("target-1", 4);
    const saves: Array<[string, string, number | undefined]> = [];
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow
        {...props}
        matrix={{ ...props.matrix, baselines: [] }}
        sourceRevisionId="published-3"
        currentRevisionId="source-1"
        sourceCandidates={[
          { market: "uae", locale: "en-US", revisionId: "source-1", revisionNumber: 4, sourceKind: "saved-draft" },
          { market: "uae", locale: "en-US", revisionId: "published-3", revisionNumber: 3, sourceKind: "published" },
        ]}
        onSaveSource={(revisionId, locale, expected) => saves.push([revisionId, locale, expected])}
      />);
    });
    const save = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Save reusable content")) as HTMLButtonElement;
    assert.equal(save.disabled, false);
    assert.equal([...container.querySelectorAll("button")]
      .some((button) => button.textContent?.includes("Open saved source")), false);
    await React.act(async () => { save.click(); });
    assert.deepEqual(saves, [["published-3", "en-US", undefined]]);
    await React.act(async () => root!.unmount());
    container.remove();
  });

  test("a successor save asks authority only for the active baseline's bound destinations", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const props = flowProps("target-1", 4);
    const sameLanguageDestinations = [
      { ...markets[0], defaultLocale: "en-US" },
      { ...markets[1], defaultLocale: "en-US" },
      { id: "europe-id", code: "europe", displayName: "Europe", defaultLocale: "en-US" },
    ];
    let requestedMarkets: string[] | undefined;
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow
        {...props}
        markets={sameLanguageDestinations}
        matrix={{
          ...props.matrix,
          baselines: [{
            ...props.matrix.baselines[0],
            sourceRevisionId: "earlier-source",
            affectedDestinationMarkets: ["ksa"],
          }],
        }}
        canManageBaselines={false}
        canSaveReusableSource={(_source, affected) => {
          requestedMarkets = affected;
          return affected.length === 1 && affected[0] === "ksa";
        }}
      />);
    });
    const save = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Save reusable content")) as HTMLButtonElement;
    assert.deepEqual(requestedMarkets, ["ksa"]);
    assert.equal(save.disabled, false, "unrelated Europe must not deny a bound-baseline successor");
    await React.act(async () => root!.unmount());
    container.remove();
  });

  test("editing one retained customization keeps other partial results while composing its own retry", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    const calls: Array<Array<Record<string, unknown>>> = [];
    let attempt = 0;
    const onApply = async (_baseline: unknown, requests: any[]) => {
      calls.push(requests.map((request) => ({ ...request })));
      attempt += 1;
      return attempt === 1
        ? requests.map((request) => request.key === "europe|en-US"
          ? { key: request.key, market: request.market, locale: request.locale, status: "success" as const, message: "Draft created." }
          : { key: request.key, market: request.market, locale: request.locale, status: "failed" as const, message: "Binding changed." })
        : requests.map((request) => ({
          key: request.key, market: request.market, locale: request.locale, status: "success" as const, message: "Draft created.",
        }));
    };
    let root: Root;
    const sameLanguageDestinations = [
      { ...markets[0], defaultLocale: "en-US" },
      { ...markets[1], defaultLocale: "en-US" },
      { id: "europe-id", code: "europe", displayName: "Europe", defaultLocale: "en-US" },
      { id: "uk-id", code: "uk", displayName: "UK", defaultLocale: "en-US" },
    ];
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow {...flowProps("target-1", 4, "baseline-1", sameLanguageDestinations)} onApply={onApply as any} />);
    });
    const available = container.querySelector('#reuse-europe\\|en-US') as HTMLElement;
    const unrelatedFailure = container.querySelector('#reuse-uk\\|en-US') as HTMLElement;
    const customized = container.querySelector('#reuse-ksa\\|en-US') as HTMLElement;
    // Preserve KSA as an untouched customization while applying two distinct
    // available destinations: Europe succeeds and UK deterministically fails.
    await React.act(async () => { available.click(); unrelatedFailure.click(); });
    const customizedRow = [...container.querySelectorAll('[role="listitem"]')]
      .find((row) => row.textContent?.includes("KSA · en-US")) as HTMLElement;
    const apply = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Use saved content in")) as HTMLButtonElement;
    await React.act(async () => { apply.click(); });

    assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].map((request) => request.key), ["europe|en-US", "uk|en-US"]);
    assert.deepEqual(calls[0][0], {
      key: "europe|en-US", marketEditionId: "europe-id", market: "europe", locale: "en-US",
      version: 0, expectedDestinationRevisionId: null,
      expectedActiveBaselineRevisionId: "baseline-1", replacesCustomization: false,
    });
    assert.deepEqual(calls[0][1], {
      key: "uk|en-US", marketEditionId: "uk-id", market: "uk", locale: "en-US",
      version: 0, expectedDestinationRevisionId: null,
      expectedActiveBaselineRevisionId: "baseline-1", replacesCustomization: false,
    });
    assert.match(container.textContent ?? "", /Partial reuse result/);
    assert.match(container.textContent ?? "", /fresh inspection before a failed-only retry/);
    assert.equal(apply.disabled, true, "the old failed request must not remain selected");

    // Europe is completed and excluded. KSA remained untouched, so a separate
    // explicit inspection/consent can compose only KSA. Editing KSA must not
    // erase UK's still-actionable failed outcome.
    const inspect = [...customizedRow.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Inspect saved differences")) as HTMLButtonElement;
    await React.act(async () => { inspect.click(); });
    await React.act(async () => { customized.click(); });
    const replacement = [...customizedRow.querySelectorAll('[role="checkbox"]')].at(-1) as HTMLElement;
    await React.act(async () => { replacement.click(); });
    assert.match(container.textContent ?? "", /UK · en-US: Binding changed/);
    await React.act(async () => { apply.click(); });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].map((request) => request.key), ["ksa|en-US"]);
    assert.equal(calls[1][0].expectedDestinationRevisionId, "target-1");
    assert.equal(calls[1][0].version, 4);
    assert.match(container.textContent ?? "", /EUROPE · en-US: Draft created/);
    await React.act(async () => root!.unmount());
    container.remove();
  });

  test("an uncertain bulk transport outcome blocks every retry instead of duplicating requests", async () => {
    const container = document.createElement("div");
    document.body.append(container);
    let calls = 0;
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<EditionReuseFlow {...flowProps("target-1", 4)} onApply={async () => {
        calls += 1;
        throw new Error("connection closed before response");
      }} />);
    });
    const available = container.querySelector('#reuse-ksa\\|en') as HTMLElement;
    const apply = [...container.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Use saved content in")) as HTMLButtonElement;
    await React.act(async () => { available.click(); });
    await React.act(async () => { apply.click(); });
    assert.equal(calls, 1);
    assert.match(container.textContent ?? "", /Could not confirm whether any selected destination changed/);

    // Re-selecting a target after an unknown response must not reconstruct a
    // request from stale version/absence assumptions. A reload is required to
    // fetch an authoritative destination matrix before any retry.
    await React.act(async () => { available.click(); });
    await React.act(async () => { apply.click(); });
    assert.equal(calls, 1);
    assert.equal(apply.disabled, true);
    await React.act(async () => root!.unmount());
    container.remove();
  });
}