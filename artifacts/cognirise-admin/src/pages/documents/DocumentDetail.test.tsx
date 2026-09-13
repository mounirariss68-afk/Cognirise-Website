import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { UpdateDocumentAvailabilityBody, validateCmsSnapshot } from "@workspace/api-zod";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/content/document-1" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  NodeFilter: { value: dom.window.NodeFilter, configurable: true },
  DocumentFragment: { value: dom.window.DocumentFragment, configurable: true },
  HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
  HTMLFormElement: { value: dom.window.HTMLFormElement, configurable: true },
  Event: { value: dom.window.Event, configurable: true },
  CustomEvent: { value: dom.window.CustomEvent, configurable: true },
  MouseEvent: { value: dom.window.MouseEvent, configurable: true },
  KeyboardEvent: { value: dom.window.KeyboardEvent, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
  requestAnimationFrame: { value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0), configurable: true },
  cancelAnimationFrame: { value: (handle: number) => clearTimeout(handle), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;
Object.defineProperty(dom.window.HTMLElement.prototype, "scrollIntoView", { value: () => {}, configurable: true });

const listeners = new Set<() => void>();
let currentLocation = "/content/document-1";
let currentSearch = "";
const documentBase = {
  id: "document-1",
  kind: "site-configuration",
  slug: "contact-email",
  title: "Contact email",
  summary: null,
  status: "draft",
  content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "hello@example.com" },
  mediaIds: [],
  markets: ["uae"],
  revisionNumber: 1,
  currentRevisionId: "revision-1",
  canPermanentlyDelete: false,
  inherited: false,
  effectiveMarket: null,
  effectiveLocale: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};
let currentDocument: any = documentBase;
let currentSession: any = { user: { role: "administrator", marketCodes: ["uae"] } };
let currentAvailability: any;
let currentPersonAvailability: any = { items: [] };
let currentSharedMatrix: any = { baselines: [], bindings: [] };
let pendingSave: { input: any; options: any } | undefined;
let pendingBaselineSave: { input: any; options: any } | undefined;
let sharedOverrideMutations = 0;
let sharedOverrideInput: any;
let directSharedComparison: any;
let currentSharedComparison: any;
let resolveSharedInput: any;
let bindSharedInput: any;
let pendingRestore: { input: any; options: any } | undefined;
let mutationPending = false;
let onSharedAvailabilityMutation: ((input: any, options: any) => void) | undefined;
let onPersonAvailabilityMutation: ((input: any, options: any) => void) | undefined;
const notify = () => listeners.forEach((listener) => listener());
const mutation = {
  get isPending() { return mutationPending; },
  mutate(input: any, options: any) {
    pendingSave = { input, options };
    mutationPending = true;
    notify();
  },
};
const inertMutation = { isPending: false, mutate() {} };
const sharedOverrideMutation = {
  isPending: false,
  mutate(input: any) {
    sharedOverrideMutations += 1;
    sharedOverrideInput = input;
  },
};
const resolveSharedMutation = {
  isPending: false,
  mutate(input: any) {
    resolveSharedInput = input;
  },
};
const bindSharedMutation = {
  isPending: false,
  mutate(input: any) {
    bindSharedInput = input;
  },
};
const baselineMutation = {
  isPending: false,
  mutate(input: any, options: any) {
    pendingBaselineSave = { input, options };
  },
};
const restoreMutation = {
  isPending: false,
  mutate(input: any, options: any) {
    pendingRestore = { input, options };
  },
};
const sharedAvailabilityMutation = {
  get isPending() { return false; },
  mutate(input: any, options: any) {
    onSharedAvailabilityMutation?.(input, options);
  },
};
const personAvailabilityMutation = {
  get isPending() { return false; },
  mutate(input: any, options: any) {
    onPersonAvailabilityMutation?.(input, options);
  },
};
const edition = {
  market: "uae", locale: "en-US", exact: true, revisionId: "revision-1", revisionNumber: 1,
  workflowState: "draft", publicationState: null, effectiveMarket: null, effectiveLocale: null,
  usedFallback: false, fallbackReason: null, effectivePublicationState: null, effectiveWorkflowState: null,
  effectiveRevisionId: null, effectiveRevisionNumber: null, ready: true, readinessErrors: [],
};
let currentEditions: any[] = [edition];
let currentMarkets: any[] = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
let editionsLoading = false;
let marketsLoading = false;

if (typeof (mock as typeof mock & { module?: unknown }).module !== "function") {
  test("rendered DocumentDetail save state", async () => {
    const run = promisify(execFile);
    await run(process.execPath, [
      "--experimental-test-module-mocks",
      "--import", "tsx",
      "--test", fileURLToPath(import.meta.url),
    ], { env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  });
} else {

mock.module("wouter", {
  namedExports: {
    useRoute: () => [true, { id: "document-1" }],
    useLocation: () => [currentLocation, () => {}],
    useSearch: () => currentSearch,
  },
});
mock.module("@workspace/api-client-react", {
  namedExports: {
    DocumentStatus: {},
    getListDocumentsQueryKey: (params: unknown) => ["documents", params],
    getGetDocumentQueryKey: (_id: string, params: unknown) => ["document", _id, params],
    getPreviewDocumentQueryKey: () => ["preview"],
    getListDocumentRevisionsQueryKey: () => ["revisions"],
    getListMarketEditionsQueryKey: () => ["markets"],
    getListDocumentEditionsQueryKey: () => ["editions"],
    getGetSharedMarketEditionMatrixQueryKey: () => ["shared-market"],
    getCompareSharedMarketBaselineQueryKey: () => ["shared-market-compare"],
    getListDocumentReviewCommentsQueryKey: () => ["comments"],
    getGetMediaQueryKey: () => ["media"],
    getListMediaQueryKey: () => ["media-list"],
    useGetSession: () => ({ data: currentSession, isLoading: false, isError: false }),
    customFetch: async () => ({ items: [] }),
    useListDocuments: () => ({ data: { items: [] }, isLoading: false, isError: false }),
    useListDocumentEditions: () => {
      React.useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => `${editionsLoading}:${JSON.stringify(currentEditions)}`, () => "");
      return { data: editionsLoading ? undefined : { items: currentEditions }, isLoading: editionsLoading, isError: false };
    },
    useGetSharedMarketEditionMatrix: () => ({ data: currentSharedMatrix }),
    useCompareSharedMarketBaseline: () => ({ data: currentSharedComparison, refetch: async () => ({ data: currentSharedComparison }), isFetching: false }),
    compareSharedMarketBaseline: async () => directSharedComparison,
    useGetDocumentAvailability: () => {
      React.useSyncExternalStore(
        (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        () => currentAvailability,
        () => currentAvailability,
      );
      return { data: currentAvailability ?? {
      documentId: "document-1",
      draftVersion: 1,
      reviewedVersion: null,
      publishedVersion: 1,
      sharedSource: { editionId: "uae-edition", revisionId: "revision-1", market: "uae", locale: "en-US" },
      affectedEditions: [],
      items: [{
      marketEditionId: "uae-edition",
      market: "uae",
      locale: "en-US",
      displayName: "UAE",
      stagedDecision: "show",
      reviewedDecision: null,
      publishedDecision: "show",
      publishedEffectiveAvailable: true,
      pending: false,
      customized: false,
    }] }, isLoading: false, isError: false };
    },
    getGetDocumentAvailabilityQueryKey: () => ["availability"],
    getDocumentAvailability: async () => ({
      documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 0,
      sharedSource: { editionId: "uae-edition", revisionId: "revision-1", market: "uae", locale: "en-US" },
      affectedEditions: [], items: [],
    }),
    getGetDocumentMarketAvailabilityQueryKey: () => ["person-availability"],
    useGetDocument: () => {
      React.useSyncExternalStore(
        (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        () => currentDocument,
        () => currentDocument,
      );
      return { data: currentDocument, isLoading: false, isError: false };
    },
    useUpdateDocument: () => {
      React.useSyncExternalStore(
        (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        () => mutationPending,
        () => mutationPending,
      );
      return mutation;
    },
    useListDocumentRevisions: () => ({ data: { items: [] } }),
    useListMarketEditions: () => {
      React.useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => `${marketsLoading}:${JSON.stringify(currentMarkets)}`, () => "");
      return { data: marketsLoading ? undefined : { items: currentMarkets }, isLoading: marketsLoading };
    },
    usePreviewDocument: () => ({ refetch: async () => ({ data: null }) }),
    useListDocumentReviewComments: () => ({ data: [] }),
    useSubmitDocument: () => inertMutation,
    usePublishDocument: () => inertMutation,
    useArchiveDocument: () => inertMutation,
    useRestoreDocument: () => restoreMutation,
    useDeleteDocument: () => inertMutation,
    useRollbackDocument: () => inertMutation,
    useCreateDocumentEditionOverride: () => inertMutation,
    useReviewDocumentAvailability: () => inertMutation,
    useSelectDocumentAvailabilitySource: () => inertMutation,
    usePublishDocumentAvailability: () => inertMutation,
    useGetDocumentMarketAvailability: () => ({ data: currentPersonAvailability, isLoading: false, isError: false }),
    useUpdateDocumentAvailability: () => sharedAvailabilityMutation,
    useUpdateDocumentMarketAvailability: () => personAvailabilityMutation,
    usePublishDocumentMarketAvailability: () => inertMutation,
    useAddDocumentReviewComment: () => inertMutation,
    useRejectDocumentRevision: () => inertMutation,
    useEstablishSharedMarketBaseline: () => baselineMutation,
    useBindSharedMarketEdition: () => bindSharedMutation,
    useSaveSharedMarketOverrides: () => sharedOverrideMutation,
    useResolveSharedMarketBaselineUpdate: () => resolveSharedMutation,
    useGetMedia: () => ({ data: undefined }),
    useListMedia: () => ({ data: { items: [] } }),
    useRequestMediaUpload: () => inertMutation,
    useFinalizeMediaUpload: () => inertMutation,
  },
});

const { default: DocumentDetail } = await import("./DocumentDetail");
const { MarketAvailabilityChecklist } = await import("./MarketAvailabilityChecklist");
const { buildSharedBaselineSnapshot } = await import("./SharedBaselineEditor");
const { createRoot } = await import("react-dom/client");

async function renderDetail(initialDocument: any = documentBase) {
  currentDocument = initialDocument ? { ...initialDocument } : undefined;
  pendingSave = undefined;
  sharedOverrideMutations = 0;
  sharedOverrideInput = undefined;
  resolveSharedInput = undefined;
  bindSharedInput = undefined;
  mutationPending = false;
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const container = document.createElement("div");
  document.body.append(container);
  let root: Root;
  await React.act(async () => {
    root = createRoot(container);
    root.render(<QueryClientProvider client={client}><DocumentDetail /></QueryClientProvider>);
  });
  return {
    container,
    client,
    unmount: async () => {
      await React.act(async () => root.unmount());
      client.clear();
      container.remove();
    },
  };
}

async function renderChecklist(props: React.ComponentProps<typeof MarketAvailabilityChecklist>) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const container = document.createElement("div");
  document.body.append(container);
  let root: Root;
  await React.act(async () => {
    root = createRoot(container);
    root.render(<QueryClientProvider client={client}><MarketAvailabilityChecklist {...props} /></QueryClientProvider>);
  });
  return {
    container,
    unmount: async () => {
      await React.act(async () => root.unmount());
      client.clear();
      container.remove();
    },
  };
}

async function change(field: HTMLInputElement, value: string) {
  const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await React.act(async () => {
    setValue.call(field, value);
    field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

function button(container: ParentNode, text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes(text));
  assert.ok(found, `Expected button containing ${text}`);
  return found;
}

test("rendered detail locks a deferred save, protects dirty refetch, advances revision, and preserves conflict input", async () => {
  const view = await renderDetail();
  try {
    const title = view.container.querySelector<HTMLInputElement>("#document-title")!;
    assert.equal(title.value, "Contact email");
    await React.act(async () => {
      const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
      setValue.call(title, "Local first edit");
      title.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      currentDocument = { ...currentDocument, title: "Background refetch", revisionNumber: 2 };
      notify();
    });
    assert.equal(title.value, "Local first edit", "a synchronously dirty field must win over a batched background refetch");

    await React.act(async () => button(view.container, "Save Draft").click());
    assert.equal(title.disabled, true);
    assert.equal(button(view.container, "Editions").disabled, true);
    assert.equal(pendingSave?.input.data.revisionNumber, 1, "the token belongs to the hydrated snapshot, not refetched matrix/data");
    assert.equal(pendingSave?.input.data.expectedRevisionId, "revision-1", "saves include the exact revision identity as well as its number");
    const sidebarLink = document.createElement("a");
    sidebarLink.href = "/dashboard";
    document.body.append(sidebarLink);
    const navigation = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
    sidebarLink.dispatchEvent(navigation);
    assert.equal(navigation.defaultPrevented, true, "sidebar navigation is blocked during a save");
    sidebarLink.remove();

    await React.act(async () => {
      const response = { ...documentBase, title: "Local first edit", revisionNumber: 2, currentRevisionId: "revision-2" };
      currentDocument = response;
      mutationPending = false;
      pendingSave!.options.onSuccess(response);
      notify();
    });
    assert.equal(title.disabled, false);

    await change(title, "Local second edit");
    await React.act(async () => button(view.container, "Save Draft").click());
    assert.equal(pendingSave?.input.data.revisionNumber, 2, "a second save uses the accepted hydrated revision");
    await React.act(async () => {
      mutationPending = false;
      pendingSave!.options.onError({ status: 409, data: { error: "Revision conflict" } });
      notify();
    });
    assert.equal(title.value, "Local second edit");
    assert.match(document.body.textContent ?? "", /Review the revision conflict/);

    await React.act(async () => button(document.body, "Keep reviewing local changes").click());
    assert.equal(button(view.container, "Save Draft").disabled, true, "a conflict cannot retry with its stale token");
    await React.act(async () => button(view.container, "Review recovery options").click());
    assert.match(document.body.textContent ?? "", /Review the revision conflict/);
  } finally {
    await view.unmount();
  }
});

test("rendered detail preserves evidence for malformed success and known committed failures", async () => {
  const malformed = await renderDetail();
  try {
    const title = malformed.container.querySelector<HTMLInputElement>("#document-title")!;
    await change(title, "Unconfirmed edit");
    await React.act(async () => button(malformed.container, "Save Draft").click());
    await React.act(async () => {
      mutationPending = false;
      pendingSave!.options.onSuccess({ revisionNumber: 3 });
      notify();
    });
    assert.equal(title.value, "Unconfirmed edit", "an invalid 2xx response must not clear local work");
    assert.equal(button(malformed.container, "Save Draft").disabled, true);
    assert.match(document.body.textContent ?? "", /Verify the latest revision before saving again/);
  } finally {
    await malformed.unmount();
  }

  const committed = await renderDetail();
  try {
    const title = committed.container.querySelector<HTMLInputElement>("#document-title")!;
    await change(title, "Committed edit evidence");
    await React.act(async () => button(committed.container, "Save Draft").click());
    await React.act(async () => {
      currentDocument = { ...currentDocument, title: "Server committed value", revisionNumber: 2 };
      mutationPending = false;
      pendingSave!.options.onError({
        status: 500,
        data: { code: "DOCUMENT_SAVE_COMMITTED", committed: true, detail: "Revision 2 was committed." },
      });
      notify();
    });
    assert.equal(title.value, "Committed edit evidence");
    assert.equal(button(committed.container, "Save Draft").disabled, true);
    assert.match(document.body.textContent ?? "", /server reports a committed revision/i);
  } finally {
    await committed.unmount();
  }
});

test("restricted editor can create a target customization without loading shared content", async () => {
  currentSession = { user: { role: "editor", marketCodes: ["ksa"] } };
  currentEditions = [];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: {
      editionId: "internal-source",
      revisionId: "shared-revision",
      publishedRevisionId: null,
      market: "shared-source",
      locale: "und",
    },
    affectedEditions: [],
    items: [{
      marketEditionId: "ksa-edition",
      market: "ksa",
      locale: "en",
      displayName: "KSA",
      stagedDecision: "inherit",
      reviewedDecision: null,
      publishedDecision: "inherit",
      publishedEffectiveAvailable: true,
      pending: false,
      customized: false,
    }],
  };
  const view = await renderDetail(null);
  try {
    assert.match(view.container.textContent ?? "", /Shared source revision shared-revision is read-only/);
    const customize = button(view.container, "Customize for this edition");
    assert.equal(customize.disabled, false, "target-market authority must be sufficient to start a customization");
    assert.equal(view.container.querySelector("#document-title"), null, "restricted editors never load shared source content");
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentAvailability = undefined;
  }
});

test("an administrator with legacy customizations stays on explicit shared-source selection", async () => {
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [
      {
        marketEditionId: "uae-edition",
        market: "uae",
        locale: "en-US",
        displayName: "UAE",
        stagedDecision: "inherit",
        reviewedDecision: null,
        publishedDecision: "inherit",
        publishedEffectiveAvailable: true,
        pending: false,
        customized: true,
      },
      {
        marketEditionId: "ksa-edition",
        market: "ksa",
        locale: "en",
        displayName: "KSA",
        stagedDecision: "show",
        reviewedDecision: null,
        publishedDecision: "show",
        publishedEffectiveAvailable: true,
        pending: false,
        customized: true,
      },
    ],
  };
  currentEditions = [
    { ...edition, market: "uae", locale: "en-US" },
    { ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" },
  ];
  const view = await renderDetail(null);
  try {
    await React.act(async () => {});
    assert.ok(view.container.querySelector("#legacy-shared-source"), "source selection remains visible after initialization effects");
    assert.equal([...view.container.querySelectorAll("button")].filter((item) => item.textContent?.startsWith("Edit ")).length, 2);
  } finally {
    await view.unmount();
    currentEditions = [edition];
    currentAvailability = undefined;
  }
});

test("a full-authority editor defaults to shared content before an existing customization", async () => {
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-1",
      publishedRevisionId: "revision-1",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: [],
    items: [{
      marketEditionId: "ksa-edition",
      market: "ksa",
      locale: "en",
      displayName: "KSA",
      stagedDecision: "show",
      reviewedDecision: null,
      publishedDecision: "show",
      publishedEffectiveAvailable: true,
      pending: false,
      customized: true,
    }],
  };
  currentEditions = [
    { ...edition, market: "uae", locale: "en-US" },
    { ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" },
  ];
  currentMarkets = [
    { code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  const view = await renderDetail();
  try {
    await React.act(async () => {});
    assert.match(view.container.textContent ?? "", /Editing:\s*Shared content/);
    assert.doesNotMatch(view.container.textContent ?? "", /Editing:\s*Customization for KSA/);
  } finally {
    await view.unmount();
    currentEditions = [edition];
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentAvailability = undefined;
  }
});

test("the source destination can start a customization", async () => {
  const view = await renderDetail();
  try {
    const editionsTab = [...view.container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent === "Editions");
    assert.ok(editionsTab);
    await React.act(async () => {
      editionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      editionsTab.click();
    });
    const customize = button(view.container, "Customize for this edition");
    assert.equal(customize.disabled, false);
  } finally {
    await view.unmount();
  }
});

test("rendered destination checkbox submits and persists the complete availability matrix", async () => {
  currentAvailability = {
    documentId: "document-1",
    canEditShared: true,
    draftVersion: 7,
    reviewedVersion: null,
    publishedVersion: 1,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-1",
      publishedRevisionId: "revision-1",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: [],
    items: [
      {
        marketEditionId: "uae-edition",
        market: "uae",
        locale: "en-US",
        displayName: "UAE",
        stagedDecision: "inherit",
        reviewedDecision: null,
        publishedDecision: "inherit",
        publishedEffectiveAvailable: true,
        pending: false,
        customized: false,
      },
      {
        marketEditionId: "ksa-edition",
        market: "ksa",
        locale: "en",
        displayName: "KSA",
        stagedDecision: "show",
        reviewedDecision: null,
        publishedDecision: "show",
        publishedEffectiveAvailable: true,
        pending: false,
        customized: false,
      },
    ],
  };
  currentMarkets = [
    { code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  let submitted: any;
  onSharedAvailabilityMutation = (input, options) => {
    const validated = UpdateDocumentAvailabilityBody.safeParse(input.data);
    assert.equal(validated.success, true, "the actual generated availability contract accepts the complete matrix");
    submitted = input;
    // This is the availability response returned after the server accepts the
    // complete matrix; notify models the query's subsequent current fetch.
    currentAvailability = {
      ...currentAvailability,
      draftVersion: 8,
      items: currentAvailability.items.map((item: any) => item.marketEditionId === "ksa-edition"
        ? { ...item, stagedDecision: "off", pending: true }
        : item),
    };
    options.onSuccess(currentAvailability);
    notify();
  };
  const view = await renderDetail();
  try {
    const editionsTab = [...view.container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent === "Editions");
    assert.ok(editionsTab);
    await React.act(async () => {
      editionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      editionsTab.click();
    });
    const checkbox = [...view.container.querySelectorAll<HTMLElement>('[role="checkbox"]')]
      .find((item) => item.getAttribute("aria-label") === "Show this content in KSA");
    assert.ok(checkbox, "the second rendered destination checkbox is available");

    await React.act(async () => checkbox.click());

    assert.deepEqual(submitted, {
      documentId: "document-1",
      data: {
        version: 7,
        destinations: [
          { marketEditionId: "uae-edition", locale: "en-US", decision: "inherit" },
          { marketEditionId: "ksa-edition", locale: "en", decision: "off" },
        ],
      },
    });
    const persisted = [...view.container.querySelectorAll<HTMLElement>('[role="checkbox"]')]
      .find((item) => item.getAttribute("aria-label") === "Show this content in KSA");
    assert.equal(persisted?.getAttribute("aria-checked"), "false", "the returned current matrix persists after success");
  } finally {
    await view.unmount();
    onSharedAvailabilityMutation = undefined;
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentAvailability = undefined;
  }
});

test("a failed shared destination save retains the clicked checkbox draft", async () => {
  currentAvailability = {
    documentId: "document-1",
    canEditShared: true,
    draftVersion: 4,
    reviewedVersion: null,
    publishedVersion: 1,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-1",
      publishedRevisionId: "revision-1",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: [],
    items: [{
      marketEditionId: "uae-edition",
      market: "uae",
      locale: "en-US",
      displayName: "UAE",
      stagedDecision: "show",
      reviewedDecision: null,
      publishedDecision: "show",
      publishedEffectiveAvailable: true,
      pending: false,
      customized: false,
    }],
  };
  const drafts: any[] = [];
  onSharedAvailabilityMutation = (_input, options) => options.onError(new Error("Destination conflict"));
  const view = await renderChecklist({
    documentId: "document-1",
    destinations: [{ market: "uae", displayName: "UAE", locale: "en-US" }],
    canManageMarket: () => true,
    isAdministrator: true,
    onSelectionDraftChange: (draft) => drafts.push(draft),
  });
  try {
    const checkbox = view.container.querySelector<HTMLElement>('[aria-label="Show this content in UAE"]');
    assert.ok(checkbox);
    await React.act(async () => checkbox.click());
    assert.equal(checkbox.getAttribute("aria-checked"), "false", "the clicked off value remains visible after the mutation error");
    assert.deepEqual(drafts.at(-1), {
      selections: { "uae-edition:en-US": false },
      saveFailed: true,
    });
  } finally {
    await view.unmount();
    onSharedAvailabilityMutation = undefined;
    currentAvailability = undefined;
  }
});

test("a failed legacy person destination save retains the clicked checkbox draft", async () => {
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 5,
    reviewedVersion: null,
    publishedVersion: 1,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  currentPersonAvailability = {
    documentId: "document-1",
    items: [{
      marketEditionId: "uae-edition",
      market: "uae",
      displayName: "UAE",
      enabled: true,
      publishedDecision: "show",
      publishedEffectiveAvailable: true,
      pendingDecision: null,
      previewEffectiveAvailable: true,
      hasEdition: true,
      updatedAt: null,
      publishedAt: null,
    }],
  };
  const drafts: any[] = [];
  onPersonAvailabilityMutation = (_input, options) => options.onError(new Error("Destination conflict"));
  const view = await renderChecklist({
    documentId: "document-1",
    destinations: [{ market: "uae", displayName: "UAE" }],
    canManageMarket: () => true,
    isAdministrator: true,
    releaseIndividually: true,
    onSelectionDraftChange: (draft) => drafts.push(draft),
  });
  try {
    const checkbox = view.container.querySelector<HTMLElement>('[aria-label="Show this content in UAE"]');
    assert.ok(checkbox);
    await React.act(async () => checkbox.click());
    assert.equal(checkbox.getAttribute("aria-checked"), "false", "the clicked off value remains visible after the mutation error");
    assert.deepEqual(drafts.at(-1), {
      selections: { "person:uae-edition": false },
      saveFailed: true,
    });
  } finally {
    await view.unmount();
    onPersonAvailabilityMutation = undefined;
    currentPersonAvailability = { items: [] };
    currentAvailability = undefined;
  }
});

test("customization publish confirmation never promises destination release", async () => {
  currentSession = { user: { role: "publisher", marketCodes: ["uae"] } };
  currentEditions = [{ ...edition, workflowState: "in-review" }];
  currentMarkets = [
    { code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 2,
    reviewedVersion: 1,
    publishedVersion: 0,
    sharedSource: {
      editionId: "internal-source",
      revisionId: "shared-revision",
      publishedRevisionId: null,
      market: "shared-source",
      locale: "und",
    },
    affectedEditions: ["uae/en-US"],
    items: [{
      marketEditionId: "uae-edition",
      market: "uae",
      locale: "en-US",
      displayName: "UAE",
      stagedDecision: "off",
      reviewedDecision: null,
      publishedDecision: "inherit",
      publishedEffectiveAvailable: true,
      pending: true,
      customized: true,
    }],
  };
  const view = await renderDetail({ ...documentBase, status: "in-review" });
  try {
    await React.act(async () => button(view.container, "Publish...").click());
    const dialog = document.body.textContent ?? "";
    assert.match(dialog, /Publish Customization/);
    assert.match(dialog, /Destination choices are not released by customization publication/);
    assert.match(dialog, /Only this selected edition will publish/);
    assert.doesNotMatch(dialog, /Destination impact/);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentAvailability = undefined;
  }
});

test("administrator publish confirmation names direct saved-draft publication", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentEditions = [{ ...edition, workflowState: "draft" }];
  currentAvailability = undefined;
  const view = await renderDetail({ ...documentBase, status: "draft" });
  try {
    await React.act(async () => button(view.container, "Publish...").click());
    const dialog = document.body.textContent ?? "";
    assert.match(dialog, /Publish Saved Draft/);
    assert.match(dialog, /direct administrator publication of this exact saved revision/);
    assert.match(dialog, /media clearance/);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentAvailability = undefined;
  }
});

test("restoring a shared source retains its successor matrix row and invalidates the source availability snapshot", async () => {
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 2,
    reviewedVersion: null,
    publishedVersion: 1,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-1",
      publishedRevisionId: "revision-1",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: [],
    items: [{
      marketEditionId: "uae-edition",
      market: "uae",
      locale: "en-US",
      displayName: "UAE",
      stagedDecision: "show",
      reviewedDecision: null,
      publishedDecision: "show",
      publishedEffectiveAvailable: true,
      pending: false,
      customized: false,
    }],
  };
  const view = await renderDetail({ ...documentBase, status: "archived" });
  try {
    view.client.setQueryData(["availability"], currentAvailability);
    view.client.setQueryData(["editions"], { items: [edition] });
    await React.act(async () => button(view.container, "Restore as draft").click());
    assert.equal(pendingRestore?.input.documentId, "document-1");

    await React.act(async () => {
      pendingRestore!.options.onSuccess({
        ...documentBase,
        status: "draft",
        revisionNumber: 2,
        currentRevisionId: "restored-revision-2",
      });
    });

    assert.deepEqual(view.client.getQueryData<any>(["editions"]).items[0], {
      ...edition,
      revisionId: "restored-revision-2",
      revisionNumber: 2,
    }, "the active source continues at its returned successor revision");
    assert.equal(view.client.getQueryState(["availability"])?.isInvalidated, true);
    assert.equal(
      view.client.getQueryData<any>(["availability"]).items[0].stagedDecision,
      "show",
      "destination availability remains visible until the authoritative source-pointer refresh completes",
    );
  } finally {
    await view.unmount();
    pendingRestore = undefined;
    currentAvailability = undefined;
  }
});

test("shared edition panel renders real unbound exact context without inventing a shared source", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = { baselines: [], bindings: [] };
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    assert.match(view.container.textContent ?? "", /Shared edition/);
    assert.match(view.container.textContent ?? "", /unbound/i);
    assert.doesNotMatch(view.container.textContent ?? "", /Shared Baseline/);
  } finally {
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("shared baseline editor saves an edited neutral successor without submitting the regional draft", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [{
      id: "baseline-1", documentId: "document-1", locale: "en-US",
      revisionId: "baseline-revision-1", revisionNumber: 3, sourceRevisionId: "revision-1",
      snapshot: { slug: "contact-email", title: "Neutral title", summary: null, content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" }, mediaIds: [], seo: null },
      mediaReferences: [], createdAt: new Date("2026-01-01"),
    }],
    bindings: [],
  };
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    await React.act(async () => button(view.container, "Edit Shared").click());
    const title = document.body.querySelector<HTMLInputElement>("#shared-baseline-title")!;
    assert.equal(title.value, "Neutral title");
    await change(title, "Changed neutral title");
    await React.act(async () => button(document.body, "Save shared baseline").click());
    assert.equal(pendingBaselineSave?.input.data.sourceRevisionId, "revision-1");
    assert.equal(pendingBaselineSave?.input.data.expectedRevisionNumber, 3);
    assert.equal(pendingBaselineSave?.input.data.snapshot.title, "Changed neutral title");
    assert.equal(pendingSave, undefined, "shared editing never submits the regional draft PATCH");
  } finally {
    await view.unmount();
    pendingBaselineSave = undefined;
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("shared baseline payload omits null SEO and retains legacy root media pins", () => {
  const source = {
    slug: "contact-email",
    title: "Neutral title",
    summary: null,
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" },
    mediaIds: ["11111111-1111-4111-8111-111111111111"],
    markets: ["uae"],
  };
  const payload = buildSharedBaselineSnapshot(source, { ...source, title: "Edited shared title", seo: null });
  assert.equal("seo" in payload, false, "cms snapshot metadata permits omitted SEO but rejects seo: null");
  assert.deepEqual(payload.mediaIds, ["11111111-1111-4111-8111-111111111111"]);
  assert.equal(validateCmsSnapshot("site-configuration", payload, "draft").success, true);
});

test("resetting a persisted shared field cannot discard a dirty local title or its navigation guard", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-1", marketEditionId: "uae-edition", locale: "en-US", mode: "adapted",
      baselineRevisionId: "baseline-revision-1", sourceRevisionId: "revision-1", version: 4,
      operations: [{ op: "replace", path: "summary", value: "Regional summary" }],
    }],
  };
  const view = await renderDetail({ ...documentBase, title: "Server title", summary: "Regional summary" });
  const originalConfirm = window.confirm;
  window.confirm = () => false;
  try {
    const title = view.container.querySelector<HTMLInputElement>("#document-title")!;
    await change(title, "Unsaved local title");
    const resetSummary = view.container.querySelector<HTMLButtonElement>('[aria-label="Reset Summary / Deck (optional) to Shared"]');
    assert.ok(resetSummary, "the persisted summary override exposes a reset control");
    await React.act(async () => resetSummary.click());
    assert.equal(sharedOverrideMutations, 0, "a reset must not mutate the server while any local draft field is dirty");
    assert.equal(title.value, "Unsaved local title");

    currentDocument = { ...currentDocument, title: "Background response", revisionNumber: 2 };
    await React.act(async () => notify());
    assert.equal(title.value, "Unsaved local title", "a refetch after blocked reset cannot hydrate over local input");

    const link = document.createElement("a");
    link.href = "/dashboard";
    document.body.append(link);
    const navigation = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(navigation);
    link.remove();
    assert.equal(navigation.defaultPrevented, true, "blocked reset preserves dirty-navigation protection");
  } finally {
    window.confirm = originalConfirm;
    await view.unmount();
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentDocument = documentBase;
  }
});

test("successful ordinary saves clear pending shared field markers", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-1", marketEditionId: "uae-edition", locale: "en-US", mode: "adapted",
      baselineRevisionId: "baseline-revision-1", sourceRevisionId: "revision-1", version: 4, operations: [],
    }],
  };
  const view = await renderDetail({ ...documentBase, title: "Server title" });
  try {
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Saved local title");
    assert.ok(view.container.querySelector('[aria-label="Reset Display Title (required) to Shared"]'), "the unsaved local title is marked as a pending override");
    await React.act(async () => button(view.container, "Save Draft").click());
    const response = { ...currentDocument, title: "Saved local title", revisionNumber: 2, currentRevisionId: "revision-2" };
    await React.act(async () => {
      currentDocument = response;
      mutationPending = false;
      pendingSave!.options.onSuccess(response);
      notify();
    });
    assert.equal(view.container.querySelector('[aria-label="Reset Display Title (required) to Shared"]'), null, "PATCH success clears the local-only marker until a persisted binding refresh supplies operations");
  } finally {
    await view.unmount();
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentDocument = documentBase;
    mutationPending = false;
  }
});

test("changing the exact edition clears pending field markers rather than carrying them into another market", async () => {
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [edition, { ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" }];
  currentSharedMatrix = { baselines: [], bindings: [{ id: "binding-1", marketEditionId: "uae-edition", locale: "en-US", mode: "adapted", baselineRevisionId: "baseline-revision-1", version: 4, operations: [] }] };
  const view = await renderDetail({ ...documentBase, title: "UAE title" });
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Unsaved UAE title");
    assert.ok(view.container.querySelector('[aria-label="Reset Display Title (required) to Shared"]'));
    const trigger = view.container.querySelector<HTMLButtonElement>('[role="combobox"]')!;
    await React.act(async () => {
      trigger.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      trigger.click();
    });
    const ksa = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((option) => option.textContent?.includes("KSA"));
    assert.ok(ksa);
    await React.act(async () => ksa.click());
    assert.equal(view.container.querySelector('[aria-label="Reset Display Title (required) to Shared"]'), null);
  } finally {
    window.confirm = originalConfirm;
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentDocument = documentBase;
  }
});

test("shared adaptation panel exposes text, nested-object, and stable-array override paths for field reset", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-1", marketEditionId: "uae-edition", locale: "en-US", mode: "adapted",
      baselineRevisionId: "baseline-revision-1", version: 4,
      operations: [
        { op: "replace", path: "content.teaser", value: "Regional teaser" },
        { op: "replace", path: "content.social.imageMedia", value: { mediaId: "11111111-1111-4111-8111-111111111111" } },
        { op: "replace", path: "content.sections[id=hero].cta.label", value: "Regional CTA" },
      ],
    }],
  };
  directSharedComparison = {
    binding: { version: 4, baselineRevisionId: "baseline-revision-1" },
    previousSnapshot: { content: { teaser: "Shared teaser", social: { imageMedia: { mediaId: "11111111-1111-4111-8111-111111111111", caption: "Shared caption" } }, sections: [{ id: "hero", cta: { label: "Shared CTA" } }] } },
  };
  const view = await renderDetail();
  try {
    assert.match(view.container.textContent ?? "", /Content · teaser/);
    assert.match(view.container.textContent ?? "", /Content · social · image Media/);
    assert.match(view.container.textContent ?? "", /Content · sections \(hero\) · cta · label/);
    const reset = view.container.querySelector<HTMLButtonElement>('[aria-label="Reset Content · sections (hero) · cta · label to Shared"]');
    assert.ok(reset, "stable array selectors receive their own reset control");
    await React.act(async () => reset.click());
    assert.equal(sharedOverrideMutations, 1, "the panel routes a concrete sparse path to the real reset handler");
  } finally {
    await view.unmount();
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    directSharedComparison = undefined;
  }
});

test("edition header uses exact workflow and availability state rather than a fixed Live label", async () => {
  currentEditions = [{ ...edition, workflowState: "in-review", publicationState: "draft" }];
  currentAvailability = {
    documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: null,
    sharedSource: { editionId: "uae-edition", revisionId: "revision-1", market: "uae", locale: "en-US" },
    affectedEditions: [], items: [{ marketEditionId: "uae-edition", market: "uae", locale: "en-US", displayName: "UAE", stagedDecision: "show", reviewedDecision: null, publishedDecision: null, publishedEffectiveAvailable: false, pending: false, customized: false }],
  };
  const view = await renderDetail();
  try {
    assert.match(view.container.textContent ?? "", /Not available/);
    assert.doesNotMatch(view.container.textContent ?? "", /\bLive\b/);
  } finally {
    await view.unmount();
    currentEditions = [edition];
    currentAvailability = undefined;
  }
});

test("stable-array conflicts use unique decision identities while showing selector-aware values", async () => {
  const binding = {
    id: "binding-1", documentId: "document-1", marketEditionId: "uae-edition", locale: "en-US",
    mode: "adapted", baselineRevisionId: "baseline-revision-1", version: 4, operations: [],
    materializedRevisionId: "revision-1", translationState: "current",
  };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = { baselines: [], bindings: [binding] };
  currentSharedComparison = {
    binding,
    baselineRevisionId: "baseline-revision-2",
    previousSnapshot: { content: { sections: [{ id: "hero", title: "Old hero" }] } },
    currentSnapshot: { content: { sections: [{ id: "hero", title: "New hero" }] } },
    localSnapshot: { content: { sections: [{ id: "hero", title: "Local hero" }] } },
    mergedSnapshot: {},
    canAutoAdopt: false,
    conflicts: [
      { conflictId: "array-add:content.sections[id=hero].title:market:0", path: "content.sections[id=hero].title", kind: "remove", message: "Shared removed the section." },
      { conflictId: "array-remove:content.sections[id=hero].title:hero:1", path: "content.sections[id=hero].title", kind: "add", message: "Market retained the section." },
      { conflictId: "array-reorder:content.sections[id=hero].title:hero:2", path: "content.sections[id=hero].title", kind: "reorder", message: "Both changed its order." },
    ],
  };
  const view = await renderDetail();
  try {
    await React.act(async () => button(view.container, "Compare to Shared").click());
    const rendered = document.body.textContent ?? "";
    assert.equal((rendered.match(/content\.sections\[id=hero\]\.title/g) ?? []).length, 3, "same display path retains one choice per distinct operation");
    assert.match(rendered, /Old hero/);
    assert.match(rendered, /New hero/);
    assert.match(rendered, /Local hero/);
    const adoptButtons = [...document.body.querySelectorAll<HTMLButtonElement>("button")].filter((item) => item.textContent === "Adopt Update");
    assert.equal(adoptButtons.length, 3);
    await React.act(async () => adoptButtons.forEach((item) => item.click()));
    await React.act(async () => button(document.body, "Apply & Save Draft").click());
    assert.deepEqual(resolveSharedInput?.data.conflictDecisions, [
      { conflictId: "array-add:content.sections[id=hero].title:market:0", choice: "shared" },
      { conflictId: "array-remove:content.sections[id=hero].title:hero:1", choice: "shared" },
      { conflictId: "array-reorder:content.sections[id=hero].title:hero:2", choice: "shared" },
    ]);
  } finally {
    await view.unmount();
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentSharedComparison = undefined;
    resolveSharedInput = undefined;
  }
});

test("valid market deep links win over shared/default selection for market code and catalog UUID", async () => {
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [edition, { ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" }];
  try {
    for (const marketParam of ["ksa", "ksa-edition"]) {
      currentLocation = "/content/document-1";
      currentSearch = `?market=${marketParam}&locale=en`;
      const view = await renderDetail();
      try {
        assert.match(view.container.querySelector('[role="combobox"]')?.textContent ?? "", /KSA/);
      } finally {
        await view.unmount();
      }
    }
  } finally {
    currentLocation = "/content/document-1";
    currentSearch = "";
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
  }
});

test("explicit market reload waits for both catalogues and never briefly selects the availability shared source", async () => {
  const ksa = { ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [edition, ksa];
  currentAvailability = {
    documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 1,
    sharedSource: { editionId: "uae-edition", revisionId: "revision-1", market: "uae", locale: "en-US" },
    affectedEditions: [], items: [],
  };
  try {
    for (const [marketParam, first] of [["ksa", "availability"], ["ksa-edition", "catalog"]] as const) {
      currentSearch = `?market=${marketParam}&locale=en`;
      editionsLoading = true;
      marketsLoading = true;
      const view = await renderDetail();
      try {
        assert.doesNotMatch(view.container.textContent ?? "", /Editing:.*UAE/, "query-pending render must not fall back to availability source");
        await React.act(async () => {
          if (first === "catalog") marketsLoading = false;
          else editionsLoading = false;
          notify();
        });
        assert.doesNotMatch(view.container.textContent ?? "", /Editing:.*UAE/, "one ready catalogue still cannot choose a fallback");
        await React.act(async () => {
          editionsLoading = false;
          marketsLoading = false;
          notify();
        });
        assert.match(view.container.querySelector('[role="combobox"]')?.textContent ?? "", /KSA/);
        assert.doesNotMatch(view.container.querySelector('[role="combobox"]')?.textContent ?? "", /UAE/);
      } finally {
        await view.unmount();
      }
    }
    currentSearch = "?market=missing-market&locale=en";
    editionsLoading = false;
    marketsLoading = false;
    const invalid = await renderDetail();
    try {
      assert.match(invalid.container.textContent ?? "", /requested MISSING-MARKET · en edition is unavailable/i);
      assert.doesNotMatch(invalid.container.textContent ?? "", /Editing:.*UAE/);
    } finally {
      await invalid.unmount();
    }
  } finally {
    currentLocation = "/content/document-1";
    currentSearch = "";
    editionsLoading = false;
    marketsLoading = false;
    currentAvailability = undefined;
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
  }
});

test("frozen adapted bindings expose comparison and lineage acknowledgement, never a forbidden rebind", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [
      { id: "active-en-baseline", documentId: "document-1", locale: "en-US", revisionId: "active-en-revision", revisionNumber: 5, sourceRevisionId: "revision-1", snapshot: {}, mediaReferences: [], createdAt: new Date() },
      { id: "translation-baseline", documentId: "document-1", locale: "ar", revisionId: "translation-revision", revisionNumber: 4, sourceRevisionId: "revision-1", snapshot: {}, mediaReferences: [], createdAt: new Date() },
    ],
    bindings: [{
      id: "binding-1", documentId: "document-1", marketEditionId: "uae-edition", locale: "en-US", mode: "adapted",
      baselineId: "historic-baseline", baselineRevisionId: "historic-revision", version: 7, operations: [],
      materializedRevisionId: "revision-1", translationState: "stale", updatedAt: new Date(),
    }],
  };
  const view = await renderDetail();
  try {
    assert.equal(view.container.querySelector('[aria-label="Shared binding mode"]'), null);
    assert.equal([...view.container.querySelectorAll("button")].some((item) => item.textContent?.includes("Bind selected exact edition")), false);
    assert.ok(button(view.container, "Compare / resolve"));
    const trigger = view.container.querySelector<HTMLButtonElement>('[aria-label="Translation source acknowledgement"]')!;
    await React.act(async () => { trigger.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 })); trigger.click(); });
    const translation = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((item) => item.textContent?.includes("AR baseline rev 4"));
    assert.ok(translation);
    await React.act(async () => translation.click());
    await React.act(async () => button(view.container, "Acknowledge translation lineage").click());
    assert.equal(bindSharedInput?.data.mode, "adapted");
    assert.equal(bindSharedInput?.data.baselineId, "historic-baseline", "ACK retains a frozen baseline absent from active choices");
    assert.equal(bindSharedInput?.data.baselineRevisionId, "historic-revision", "translation acknowledgement retains the frozen adopted baseline");
    assert.equal(bindSharedInput?.data.translationSourceRevisionId, "translation-revision");
    assert.equal(bindSharedInput?.data.version, 7);
  } finally {
    await view.unmount();
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    bindSharedInput = undefined;
  }
});

test("an explicit Shared source link selects the exact internal edition without a market catalogue entry", async () => {
  currentAvailability = {
    documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 1,
    sharedSource: { editionId: "shared-edition-1", revisionId: "revision-1", market: "shared-source", locale: "und" },
    affectedEditions: [], items: [],
  };
  currentSearch = "?market=shared-source&locale=und";
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentEditions = [edition];
  const view = await renderDetail();
  try {
    assert.match(view.container.textContent ?? "", /Exact target: Shared source · und/);
    assert.doesNotMatch(view.container.textContent ?? "", /requested SHARED-SOURCE.*unavailable/i);
  } finally {
    await view.unmount();
    currentSearch = "";
    currentAvailability = undefined;
  }
});

test("explicit market reload waits for both catalogues and never briefly selects the availability shared source", async () => {
  const ksa = { ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [edition, ksa];
  currentAvailability = {
    documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 1,
    sharedSource: { editionId: "uae-edition", revisionId: "revision-1", market: "uae", locale: "en-US" },
    affectedEditions: [], items: [],
  };
  try {
    for (const [marketParam, first] of [["ksa", "availability"], ["ksa-edition", "catalog"]] as const) {
      currentSearch = `?market=${marketParam}&locale=en`;
      editionsLoading = true;
      marketsLoading = true;
      const view = await renderDetail();
      try {
        assert.doesNotMatch(view.container.textContent ?? "", /Editing:.*UAE/, "query-pending render must not fall back to availability source");
        await React.act(async () => {
          if (first === "catalog") marketsLoading = false;
          else editionsLoading = false;
          notify();
        });
        assert.doesNotMatch(view.container.textContent ?? "", /Editing:.*UAE/, "one ready catalogue still cannot choose a fallback");
        await React.act(async () => {
          editionsLoading = false;
          marketsLoading = false;
          notify();
        });
        assert.match(view.container.querySelector('[role="combobox"]')?.textContent ?? "", /KSA/);
        assert.doesNotMatch(view.container.querySelector('[role="combobox"]')?.textContent ?? "", /UAE/);
      } finally {
        await view.unmount();
      }
    }
    currentSearch = "?market=missing-market&locale=en";
    editionsLoading = false;
    marketsLoading = false;
    const invalid = await renderDetail();
    try {
      assert.match(invalid.container.textContent ?? "", /requested MISSING-MARKET · en edition is unavailable/i);
      assert.doesNotMatch(invalid.container.textContent ?? "", /Editing:.*UAE/);
    } finally {
      await invalid.unmount();
    }
  } finally {
    currentLocation = "/content/document-1";
    currentSearch = "";
    editionsLoading = false;
    marketsLoading = false;
    currentAvailability = undefined;
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
  }
});

test("frozen adapted bindings expose comparison and lineage acknowledgement, never a forbidden rebind", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [
      { id: "active-en-baseline", documentId: "document-1", locale: "en-US", revisionId: "active-en-revision", revisionNumber: 5, sourceRevisionId: "revision-1", snapshot: {}, mediaReferences: [], createdAt: new Date() },
      { id: "translation-baseline", documentId: "document-1", locale: "ar", revisionId: "translation-revision", revisionNumber: 4, sourceRevisionId: "revision-1", snapshot: {}, mediaReferences: [], createdAt: new Date() },
    ],
    bindings: [{
      id: "binding-1", documentId: "document-1", marketEditionId: "uae-edition", locale: "en-US", mode: "adapted",
      baselineId: "historic-baseline", baselineRevisionId: "historic-revision", version: 7, operations: [],
      materializedRevisionId: "revision-1", translationState: "stale", updatedAt: new Date(),
    }],
  };
  const view = await renderDetail();
  try {
    assert.equal(view.container.querySelector('[aria-label="Shared binding mode"]'), null);
    assert.equal([...view.container.querySelectorAll("button")].some((item) => item.textContent?.includes("Bind selected exact edition")), false);
    assert.ok(button(view.container, "Compare / resolve"));
    const trigger = view.container.querySelector<HTMLButtonElement>('[aria-label="Translation source acknowledgement"]')!;
    await React.act(async () => { trigger.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 })); trigger.click(); });
    const translation = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((item) => item.textContent?.includes("AR baseline rev 4"));
    assert.ok(translation);
    await React.act(async () => translation.click());
    await React.act(async () => button(view.container, "Acknowledge translation lineage").click());
    assert.equal(bindSharedInput?.data.mode, "adapted");
    assert.equal(bindSharedInput?.data.baselineId, "historic-baseline", "ACK retains a frozen baseline absent from active choices");
    assert.equal(bindSharedInput?.data.baselineRevisionId, "historic-revision", "translation acknowledgement retains the frozen adopted baseline");
    assert.equal(bindSharedInput?.data.translationSourceRevisionId, "translation-revision");
    assert.equal(bindSharedInput?.data.version, 7);
  } finally {
    await view.unmount();
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    bindSharedInput = undefined;
  }
});

}
