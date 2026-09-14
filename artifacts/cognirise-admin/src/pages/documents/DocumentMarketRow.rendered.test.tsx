import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGetDocumentAvailabilityQueryKey,
  getGetDocumentMarketCopyCandidatesQueryKey,
  getGetSharedMarketEditionMatrixQueryKey,
  getListDocumentEditionsQueryKey,
  type Document,
  type MarketEdition,
} from "@workspace/api-client-react";
import { DocumentMarketRow } from "./DocumentMarketRow";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/content" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
  requestAnimationFrame: { value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0), configurable: true },
  cancelAnimationFrame: { value: (handle: number) => clearTimeout(handle), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const documentRecord = { id: "document-1", title: "Test document", slug: "test-document", markets: [], kind: "publication" } as unknown as Document;
const market = { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true } as MarketEdition;

async function renderRow({ missingCreate = false }: { missingCreate?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });
  client.setQueryData(getGetSharedMarketEditionMatrixQueryKey("document-1"), { baselines: [], bindings: [] });
  client.setQueryData(getGetDocumentAvailabilityQueryKey("document-1"), {
    documentId: "document-1", canEditShared: true, draftVersion: 1, reviewedVersion: null, publishedVersion: 0,
    sharedSource: null, affectedEditions: [],
    items: [{ marketEditionId: "ksa-edition", market: "ksa", locale: "en", displayName: "KSA", stagedDecision: "off", publishedDecision: "off", publishedEffectiveAvailable: false, pending: false }],
  });
  client.setQueryData(getListDocumentEditionsQueryKey("document-1"), {
    documentId: "document-1",
    items: [{
      market: "ksa", locale: "en", exact: false, usedFallback: false, fallbackReason: null,
      publicationState: null, workflowState: null, revisionId: null, revisionNumber: null,
      effectivePublicationState: null, effectiveWorkflowState: null, effectiveRevisionId: null, effectiveRevisionNumber: null,
      ready: false, readinessErrors: missingCreate ? ["Create this market edition from an authorized source."] : [], readinessIssues: missingCreate
        ? [{ category: "missing", action: "create", message: "Create this market edition from an authorized source." }]
        : [],
    }],
  });
  client.setQueryData(getGetDocumentMarketCopyCandidatesQueryKey("document-1", "ksa", "en"), {
    documentId: "document-1", targetMarket: "ksa", targetLocale: "en",
    candidates: [{
      editionId: "uae-edition", market: "uae", locale: "en", revisionId: "source-revision-8", revisionNumber: 8,
      workflowState: "approved", publicationState: "published", publishedRevisionId: "source-revision-8",
      ready: true, readinessErrors: [], readinessIssues: [],
    }],
  });
  const container = document.createElement("div");
  const opened: Array<[string | undefined, string | undefined, string | undefined]> = [];
  document.body.append(container);
  let root: Root;
  await React.act(async () => {
    root = createRoot(container);
    root.render(<QueryClientProvider client={client}><table><tbody>
      <DocumentMarketRow document={documentRecord} markets={[market]} locale="en" canManageMarket={() => true} isAdministrator={false}
        onDraftChange={() => {}} onOpen={(marketCode, localeCode, focus) => opened.push([marketCode, localeCode, focus])} />
    </tbody></table></QueryClientProvider>);
  });
  return {
    container,
    opened,
    unmount: async () => {
      await React.act(async () => root.unmount());
      client.clear();
      container.remove();
    },
  };
}

test("rendered missing market copy requires an explicit saved geo source and names the unpublished target", async () => {
  const view = await renderRow();
  try {
    const open = view.container.querySelector<HTMLButtonElement>('[data-testid="button-copy-from-market-document-1-ksa-edition-en"]');
    assert.ok(open, view.container.textContent ?? "Missing matrix row content");
    await React.act(async () => open.click());

    const source = view.container.querySelector<HTMLSelectElement>('[data-testid="select-copy-source-document-1-ksa-edition-en"]');
    assert.ok(source);
    assert.match(source.textContent ?? "", /UAE · EN · revision 8 · published/);
    const setter = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value")!.set!;
    await React.act(async () => {
      setter.call(source, "source-revision-8");
      source.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
    await React.act(async () => view.container.querySelector<HTMLButtonElement>('[data-testid="button-confirm-copy-document-1-ksa-edition-en"]')!.click());
    const confirmation = view.container.textContent ?? "";
    assert.match(confirmation, /Copy saved revision 8 from UAE · EN into KSA · EN/);
    assert.match(confirmation, /editable unpublished draft/);
    assert.match(confirmation, /does not copy approval, publish content, or overwrite an existing target/);
  } finally {
    await view.unmount();
  }
});

test("API missing/create readiness opens authorized source selection without routing to a nonexistent edition", async () => {
  const view = await renderRow({ missingCreate: true });
  try {
    assert.match(view.container.textContent ?? "", /Market content is missing; no saved revision exists/);
    assert.doesNotMatch(view.container.textContent ?? "", /saved revision unavailable/);
    assert.equal(view.container.querySelector('[data-testid="button-open-baseline-setup-document-1-ksa-edition-en"]'), null);
    const create = view.container.querySelector<HTMLButtonElement>('[data-testid="button-choose-create-source-document-1-ksa-edition-en"]');
    assert.ok(create);
    await React.act(async () => create.click());
    assert.ok(view.container.querySelector('[data-testid="select-copy-source-document-1-ksa-edition-en"]'));
    assert.deepEqual(view.opened, []);
  } finally {
    await view.unmount();
  }
});