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
let navigateLocation: (next: string) => void = () => {};
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
  editionId: "uae-edition",
  canPermanentlyDelete: false,
  inherited: false,
  effectiveMarket: null,
  effectiveLocale: null,
  createdAt: new Date("2026-01-01"),
  updatedAt: new Date("2026-01-01"),
};
let currentDocument: any = documentBase;
let currentSession: any = { user: { role: "administrator", marketCodes: ["uae"], legacyAdministratorMarketCodes: ["uae"] } };
let currentAvailability: any;
let currentPersonAvailability: any = { items: [] };
let currentSharedMatrix: any = { baselines: [], bindings: [] };
let sharedMatrixLookupState: "ready" | "loading" | "error" | "stale" = "ready";
let pendingSave: { input: any; options: any } | undefined;
let pendingSubmit: { input: any; options: any } | undefined;
let pendingPublish: { input: any; options: any } | undefined;
let pendingAvailabilityPublish: { input: any; options: any } | undefined;
let pendingAvailabilityReview: { input: any; options: any } | undefined;
let publishAvailabilityPending = false;
let pendingBaselineSave: { input: any; options: any } | undefined;
let sharedOverrideMutations = 0;
let sharedOverrideInput: any;
let directSharedComparison: any;
let currentSharedComparison: any;
let resolveSharedInput: any;
let bindSharedInput: any;
let pendingRestore: { input: any; options: any } | undefined;
let mutationPending = false;
let previewResponse: any;
let previewError: unknown;
let previewCalls: Array<{ documentId: string; params: any }> = [];
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
const submitMutation = {
  isPending: false,
  mutate(input: any, options: any) {
    pendingSubmit = { input, options };
  },
};
const publishMutation = {
  isPending: false,
  mutate(input: any, options: any) {
    pendingPublish = { input, options };
  },
};
const publishAvailabilityMutation = {
  get isPending() { return publishAvailabilityPending; },
  mutate(input: any, options: any) {
    pendingAvailabilityPublish = { input, options };
  },
};
const reviewAvailabilityMutation = {
  isPending: false,
  mutate(input: any, options: any) {
    pendingAvailabilityReview = { input, options };
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
let currentEditorialWork: any[] = [];
let currentMarkets: any[] = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
let editionsLoading = false;
let marketsLoading = false;

/**
 * Older rendered scenarios predate the server authority projection. Keep
 * those fixtures settled without making production code infer capabilities:
 * explicit authority fields always win, while omitted fields are projected
 * here from the same legacy fixture grants the scenarios were written around.
 * Authority/loading/denial scenarios provide the fields explicitly.
 */
function settledAvailabilityFixture(value: any) {
  const fallback = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
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
    }],
  };
  const availability = value ?? fallback;
  const user = currentSession?.user ?? {};
  const grants = user.capabilityGrants ?? [];
  const matrixConfigured = Boolean(user.capabilityMatrixConfigured || grants.length);
  const role = String(user.role ?? "");
  const legacyCapabilities = role === "administrator" || role === "publisher"
    ? ["view", "edit", "review", "publish"]
    : role === "editor" ? ["view", "edit", "review"] : ["view"];
  const regional = (capability: string, market: string) => matrixConfigured
    ? grants.some((grant: any) =>
      grant.topic === currentDocument?.kind
      && grant.capability === capability
      && grant.scope === "regional"
      && grant.marketCode === market)
    : legacyCapabilities.includes(capability)
      && (role === "administrator"
        ? (user.legacyAdministratorMarketCodes ?? user.marketCodes ?? []).includes(market)
        : (user.marketCodes ?? []).includes(market));
  const shared = (capability: string, market: string) => matrixConfigured
    ? grants.some((grant: any) =>
      grant.topic === currentDocument?.kind
      && grant.capability === capability
      && grant.scope === "shared"
      && grant.marketCode === market)
    : role === "administrator"
      && (user.legacyAdministratorMarketCodes ?? user.marketCodes ?? []).includes(market);
  const sourceMarket = availability.sharedSource?.market;
  const destinationMarkets = [...new Set(
    (availability.items ?? []).map((item: any) => String(item.market)),
  )] as string[];
  const authority = (capability: string) => Boolean(
    sourceMarket
    && shared(capability, sourceMarket)
    && destinationMarkets.length > 0
    && destinationMarkets.every((market) => regional(capability, market)),
  );
  const canReviewShared = authority("review");
  const reviewBlockedReason = !canReviewShared
    ? !destinationMarkets.every((market) => regional("review", market))
      ? "missing-regional-grant"
      : "missing-shared-grant"
    : null;
  return {
    ...availability,
    canEditShared: availability.canEditShared ?? authority("edit"),
    canReviewShared: availability.canReviewShared ?? canReviewShared,
    reviewBlockedReason: availability.reviewBlockedReason ?? reviewBlockedReason,
    canPublishShared: availability.canPublishShared ?? authority("publish"),
  };
}

function editorialWorkFor(revisionId: string, status: "requested" | "approved" = "approved", editionId = "uae-edition") {
  return [{
    id: `work-${revisionId}`,
    editionId,
    documentId: "document-1",
    documentTitle: "Contact email",
    documentKind: "site-configuration",
    market: "uae",
    locale: "en-US",
    editor: null,
    reviewer: { id: "reviewer-1", name: "Independent reviewer" },
    dueAt: null,
    status: status === "requested" ? "active" : "completed",
    currentRevisionId: revisionId,
    currentRevisionNumber: 1,
    workflowState: status === "approved" ? "approved" : "in-review",
    publishedRevisionId: null,
    link: "/content/document-1?market=uae&locale=en-US",
    reviewRequestId: `request-${revisionId}`,
    reviewRevisionId: revisionId,
    reviewRequest: {
      id: `request-${revisionId}`,
      editionId,
      revisionId,
      requesterId: "editor-1",
      reviewerId: "reviewer-1",
      status,
      note: null,
      decisionNote: status === "approved" ? "Approved exact revision." : null,
      requestedAt: "2026-01-01T00:00:00.000Z",
      decidedAt: status === "approved" ? "2026-01-01T00:05:00.000Z" : null,
      supersededAt: null,
      blockedReason: null,
    },
  }];
}

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
    useLocation: () => [currentLocation, navigateLocation],
    useSearch: () => currentSearch,
  },
});
mock.module("@workspace/api-client-react", {
  namedExports: {
    DocumentStatus: {},
    getListDocumentsQueryKey: (params: unknown) => ["documents", params],
    getListPublishedContentQueryKey: (params: unknown) => ["published-content", params],
    getGetDocumentQueryKey: (_id: string, params: unknown) => ["document", _id, params],
    getPreviewDocumentQueryKey: () => ["preview"],
    previewDocument: async (documentId: string, params: any) => {
      previewCalls.push({ documentId, params });
      if (previewError) throw previewError;
      return previewResponse ?? {
        previewUrl: "",
        revisionId: "",
        requestedMarket: "",
        requestedLocale: "",
        market: "",
        locale: "",
        revisionNumber: 0,
      };
    },
    getListDocumentRevisionsQueryKey: () => ["revisions"],
    getListMarketEditionsQueryKey: () => ["markets"],
    getListDocumentEditionsQueryKey: () => ["editions"],
    getGetSharedMarketEditionMatrixQueryKey: () => ["shared-market"],
    getCompareSharedMarketBaselineQueryKey: () => ["shared-market-compare"],
    getListDocumentReviewCommentsQueryKey: () => ["comments"],
    getGetDocumentRevisionAccuracyConfirmationQueryKey: () => ["accuracy-confirmation"],
    confirmDocumentRevisionAccuracy: async () => ({
      id: "accuracy-confirmation-1",
      confirmedAt: "2026-01-01T00:00:00.000Z",
    }),
    getGetMediaQueryKey: () => ["media"],
    getListMediaQueryKey: () => ["media-list"],
    useGetSession: () => {
      React.useSyncExternalStore(
        (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        () => JSON.stringify(currentSession),
        () => "",
      );
      const user = currentSession?.user;
      const legacyAdministratorMarketCodes = user?.role === "administrator"
        && !user.capabilityMatrixConfigured
        && !(user.capabilityGrants?.length)
        && user.legacyAdministratorMarketCodes === undefined
        ? user.marketCodes
        : user?.legacyAdministratorMarketCodes;
      return {
        data: user && legacyAdministratorMarketCodes
          ? { ...currentSession, user: { ...user, legacyAdministratorMarketCodes } }
          : currentSession,
        isLoading: false,
        isError: false,
      };
    },
    customFetch: async (url: unknown) => String(url).includes("/editorial-work/team")
      ? { items: currentEditorialWork, emptyState: currentEditorialWork.length ? undefined : "no-work" }
      : { items: [] },
    useListDocuments: () => ({ data: { items: [] }, isLoading: false, isError: false }),
    useListDocumentEditions: () => {
      React.useSyncExternalStore((listener) => { listeners.add(listener); return () => listeners.delete(listener); }, () => `${editionsLoading}:${JSON.stringify(currentEditions)}`, () => "");
      return { data: editionsLoading ? undefined : { items: currentEditions }, isLoading: editionsLoading, isError: false };
    },
    useGetSharedMarketEditionMatrix: () => ({
      // Refetch/error states retain the last matrix snapshot in React Query;
      // the detail page must not treat that stale binding snapshot as fresh.
      data: currentSharedMatrix,
      isLoading: false,
      isError: sharedMatrixLookupState === "error",
      isFetching: sharedMatrixLookupState === "loading",
      isStale: sharedMatrixLookupState === "stale",
    }),
    useCompareSharedMarketBaseline: () => ({ data: currentSharedComparison, refetch: async () => ({ data: currentSharedComparison }), isFetching: false }),
    compareSharedMarketBaseline: async () => directSharedComparison,
    useGetDocumentAvailability: () => {
      React.useSyncExternalStore(
        (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        () => currentAvailability,
        () => currentAvailability,
      );
       return { data: settledAvailabilityFixture(currentAvailability ?? {
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
     }] }), isLoading: false, isError: false };
    },
    getGetDocumentAvailabilityQueryKey: () => ["availability"],
     getDocumentAvailability: async () => settledAvailabilityFixture(currentAvailability ?? ({
      documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 0,
      sharedSource: { editionId: "uae-edition", revisionId: "revision-1", market: "uae", locale: "en-US" },
      affectedEditions: [], items: [],
     })),
    getGetDocumentMarketAvailabilityQueryKey: () => ["person-availability"],
    useGetDocument: () => {
      React.useSyncExternalStore(
        (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
        () => currentDocument,
        () => currentDocument,
      );
      return { data: currentDocument, isLoading: false, isError: false };
    },
    useListPublishedContent: () => ({
      data: { items: [], isConfigured: false, configuredPagePaths: [] },
      isLoading: false,
      isFetching: false,
      isError: false,
    }),
    useGetPublicNavigationSettings: () => ({
      data: { pages: [], isConfigured: false },
      isLoading: false,
      isFetching: false,
      isError: false,
    }),
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
    useGetDocumentRevisionAccuracyConfirmation: () => ({
      data: { confirmation: null },
      isSuccess: true,
    }),
    useSubmitDocument: () => submitMutation,
    usePublishDocument: () => publishMutation,
    useArchiveDocument: () => inertMutation,
    useRestoreDocument: () => restoreMutation,
    useDeleteDocument: () => inertMutation,
    useRollbackDocument: () => inertMutation,
    useReviewDocumentAvailability: () => reviewAvailabilityMutation,
    useSelectDocumentAvailabilitySource: () => inertMutation,
    usePublishDocumentAvailability: () => publishAvailabilityMutation,
    useGetDocumentMarketAvailability: () => ({ data: currentPersonAvailability, isLoading: false, isError: false }),
    useUpdateDocumentAvailability: () => sharedAvailabilityMutation,
    useUpdateDocumentMarketAvailability: () => personAvailabilityMutation,
    usePublishDocumentMarketAvailability: () => inertMutation,
    useAddDocumentReviewComment: () => inertMutation,
    useRejectDocumentRevision: () => inertMutation,
    useCreateDocumentEditionOverride: () => inertMutation,
    useEstablishSharedMarketBaseline: () => baselineMutation,
    useBindSharedMarketEdition: () => bindSharedMutation,
    useSaveSharedMarketOverrides: () => sharedOverrideMutation,
    useResolveSharedMarketBaselineUpdate: () => resolveSharedMutation,
    useGetMedia: () => ({ data: undefined }),
    useListMedia: () => ({ data: { items: [] } }),
    getDocumentRevision: async () => ({ snapshot: {} }),
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
  mutationPending = false;
  previewResponse = undefined;
  previewError = undefined;
  previewCalls = [];
  pendingSave = undefined;
  pendingSubmit = undefined;
  pendingPublish = undefined;
  pendingAvailabilityPublish = undefined;
  pendingAvailabilityReview = undefined;
  publishAvailabilityPending = false;
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

function fakePreviewWindow(initiallyClosed = false, previewDocument = new JSDOM("<!doctype html><html><head></head><body></body></html>").window.document) {
  const state = { closed: initiallyClosed, navigatedTo: undefined as string | undefined };
  if (typeof previewDocument.createElement === "function") {
    const createElement = previewDocument.createElement.bind(previewDocument);
    previewDocument.createElement = ((tagName: string) => {
      const element = createElement(tagName);
      if (tagName.toLowerCase() === "a") {
        const click = element.click.bind(element);
        Object.defineProperty(element, "click", {
          configurable: true,
          value: () => {
            state.navigatedTo = element.getAttribute("href") ?? undefined;
            click();
          },
        });
      }
      return element;
    }) as typeof previewDocument.createElement;
  }
  return {
    state,
    value: {
      closed: initiallyClosed,
      opener: {},
      location: {
        replace(url: string) {
          state.navigatedTo = url;
        },
      },
      document: previewDocument,
      close() {
        state.closed = true;
        (this as { closed: boolean }).closed = true;
      },
    } as unknown as Window,
  };
}

test("changed Save and preview reserves the gesture tab and previews the returned exact revision", async () => {
  const originalOpen = window.open;
  const reserved = fakePreviewWindow();
  let openArgs: unknown[] | undefined;
  window.open = ((...args: unknown[]) => {
    openArgs = args;
    return reserved.value;
  }) as typeof window.open;
  const view = await renderDetail();
  try {
    previewResponse = {
      previewUrl: "/preview/exact-revision-2",
      revisionId: "revision-2",
      requestedMarket: "uae",
      requestedLocale: "en-US",
      market: "uae",
      locale: "en-US",
      revisionNumber: 2,
    };
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Changed title");
    await React.act(async () => button(view.container, "Save and preview").click());
    assert.ok(pendingSave, "Save and preview must save before issuing a capability");
    assert.equal(previewCalls.length, 0, "preview issuance waits for save confirmation");

    const saved = {
      ...documentBase,
      title: "Changed title",
      revisionNumber: 2,
      currentRevisionId: "revision-2",
    };
    await React.act(async () => {
      currentDocument = saved;
      mutationPending = false;
      pendingSave!.options.onSuccess(saved);
      notify();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.deepEqual(previewCalls, [{
      documentId: "document-1",
      params: { market: "uae", locale: "en-US", revisionId: "revision-2" },
    }]);
    assert.deepEqual(openArgs, ["about:blank", "_blank"], "reserve the popup without a feature that makes browsers return null");
    assert.equal(reserved.value.opener, null, "the reserved tab is isolated before navigation");
    const navigation = reserved.value.document.querySelector("a");
    assert.equal(navigation?.getAttribute("href"), "/preview/exact-revision-2");
    assert.equal(navigation?.target, "_self");
    assert.equal(navigation?.rel, "noreferrer");
    assert.equal(navigation?.getAttribute("referrerpolicy"), "no-referrer");
    assert.equal(view.container.querySelector('[data-testid="preview-fallback"]'), null);
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
    mutationPending = false;
  }
});

test("unchanged preview retains a fallback link when the popup is blocked", async () => {
  const originalOpen = window.open;
  window.open = (() => null) as typeof window.open;
  const view = await renderDetail();
  try {
    previewResponse = {
      previewUrl: "/preview/unchanged",
      revisionId: "revision-1",
      requestedMarket: "uae",
      requestedLocale: "en-US",
      market: "uae",
      locale: "en-US",
      revisionNumber: 1,
    };
    await React.act(async () => {
      button(view.container, "Preview").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.deepEqual(previewCalls, [{
      documentId: "document-1",
      params: { market: "uae", locale: "en-US", revisionId: "revision-1" },
    }]);
    const fallback = view.container.querySelector<HTMLAnchorElement>('[data-testid="preview-fallback-link"]');
    assert.ok(fallback, "blocked popup users retain a clickable preview affordance");
    assert.equal(fallback.getAttribute("href"), "/preview/unchanged");
    assert.equal(fallback.getAttribute("rel"), "noopener noreferrer");
    assert.equal(fallback.getAttribute("referrerpolicy"), "no-referrer");
    assert.equal(pendingSave, undefined, "unchanged preview must not save again");
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
  }
});

test("Save and preview closes its reserved tab when the draft save fails", async () => {
  const originalOpen = window.open;
  const reserved = fakePreviewWindow();
  window.open = (() => reserved.value) as typeof window.open;
  const view = await renderDetail();
  try {
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Save failure");
    await React.act(async () => button(view.container, "Save and preview").click());
    assert.ok(pendingSave);
    await React.act(async () => {
      mutationPending = false;
      pendingSave!.options.onError({ status: 500, data: { error: "Save service unavailable" } });
      notify();
      await Promise.resolve();
    });
    assert.equal(previewCalls.length, 0, "preview issuance must not run after a failed save");
    assert.equal(reserved.state.closed, true, "the reserved placeholder is cleaned up on save failure");
    assert.equal(view.container.querySelector('[data-testid="preview-fallback-link"]'), null);
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
    mutationPending = false;
  }
});

test("an unverified referrer policy closes the placeholder and keeps a fallback link", async () => {
  const originalOpen = window.open;
  const unsafeDocument = { head: null, documentElement: null } as unknown as Document;
  const reserved = fakePreviewWindow(false, unsafeDocument);
  window.open = (() => reserved.value) as typeof window.open;
  const view = await renderDetail();
  try {
    previewResponse = {
      previewUrl: "/preview/policy-fallback",
      revisionId: "revision-1",
      requestedMarket: "uae",
      requestedLocale: "en-US",
      market: "uae",
      locale: "en-US",
      revisionNumber: 1,
    };
    await React.act(async () => {
      button(view.container, "Preview").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(reserved.state.closed, true, "an unsafe placeholder is closed before capability navigation");
    assert.ok(view.container.querySelector('[data-testid="preview-fallback-link"]'));
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
  }
});

test("a saved preview failure persists the exact target and retries without another save", async () => {
  const originalOpen = window.open;
  window.open = (() => null) as typeof window.open;
  const view = await renderDetail();
  try {
    previewError = { status: 503, data: { error: "Preview issuer is unavailable" } };
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Saved before preview failure");
    await React.act(async () => button(view.container, "Save and preview").click());
    const saved = {
      ...documentBase,
      title: "Saved before preview failure",
      revisionNumber: 2,
      currentRevisionId: "revision-2",
    };
    await React.act(async () => {
      currentDocument = saved;
      mutationPending = false;
      pendingSave!.options.onSuccess(saved);
      notify();
      await Promise.resolve();
      await Promise.resolve();
    });
    const failure = view.container.querySelector('[data-testid="preview-failure"]')!;
    assert.match(failure.textContent ?? "", /Saved successfully, but preview could not be issued/i);
    assert.match(failure.textContent ?? "", /revision-2/);
    assert.match(failure.textContent ?? "", /Preview issuer is unavailable/);

    previewError = undefined;
    previewResponse = {
      previewUrl: "/preview/retried-saved-revision",
      revisionId: "revision-2",
      requestedMarket: "uae",
      requestedLocale: "en-US",
      market: "uae",
      locale: "en-US",
      revisionNumber: 2,
    };
    pendingSave = undefined;
    await React.act(async () => {
      button(view.container, "Retry saved revision preview").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.deepEqual(previewCalls.at(-1), {
      documentId: "document-1",
      params: { market: "uae", locale: "en-US", revisionId: "revision-2" },
    });
    assert.equal(pendingSave, undefined, "retrying a saved revision must not PATCH the edited draft");
    assert.equal(view.container.querySelector('[data-testid="preview-failure"]'), null);
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
    mutationPending = false;
    previewError = undefined;
  }
});

test("closed preview tabs and issuance failures release the lock without leaving a stale fallback", async () => {
  const originalOpen = window.open;
  const closed = fakePreviewWindow(true);
  window.open = (() => closed.value) as typeof window.open;
  const view = await renderDetail();
  try {
    previewResponse = {
      previewUrl: "/preview/closed",
      revisionId: "revision-1",
      requestedMarket: "uae",
      requestedLocale: "en-US",
      market: "uae",
      locale: "en-US",
      revisionNumber: 1,
    };
    await React.act(async () => {
      button(view.container, "Preview").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.ok(view.container.querySelector('[data-testid="preview-fallback-link"]'));
    assert.equal(button(view.container, "Preview").disabled, false, "a closed tab must not leave Preview locked");

    previewError = new Error("Preview service unavailable");
    await React.act(async () => {
      button(view.container, "Preview").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(view.container.querySelector('[data-testid="preview-fallback-link"]'), null);
    assert.equal(button(view.container, "Preview").disabled, false, "issuance errors must release the synchronous guard");
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
    previewError = undefined;
  }
});

test("a mismatched preview response is rejected instead of opening a stale target", async () => {
  const originalOpen = window.open;
  const reserved = fakePreviewWindow();
  window.open = (() => reserved.value) as typeof window.open;
  const view = await renderDetail();
  try {
    previewResponse = {
      previewUrl: "/preview/wrong-revision",
      revisionId: "revision-0",
      requestedMarket: "uae",
      requestedLocale: "en-US",
      market: "uae",
      locale: "en-US",
      revisionNumber: 0,
    };
    await React.act(async () => {
      button(view.container, "Preview").click();
      await Promise.resolve();
      await Promise.resolve();
    });
    assert.equal(reserved.state.navigatedTo, undefined);
    assert.equal(reserved.state.closed, true, "a mismatched capability closes the placeholder");
    assert.equal(view.container.querySelector('[data-testid="preview-fallback-link"]'), null);
    assert.equal(button(view.container, "Preview").disabled, false, "a mismatched capability must release the preview lock");
  } finally {
    window.open = originalOpen;
    await view.unmount();
    currentDocument = documentBase;
  }
});

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
    assert.equal(button(view.container, "Regions").disabled, true);
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

test("rendered publication saves serialize the default article variant", async () => {
  const view = await renderDetail({
    ...documentBase,
    kind: "publication",
    content: { schemaVersion: 1 },
  });
  try {
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Publication title");
    await React.act(async () => button(view.container, "Save Draft").click());
    assert.equal(
      pendingSave?.input.data.content.variant,
      "article",
      "saving a legacy publication draft must persist the editor's Article default",
    );
  } finally {
    await view.unmount();
  }
});

test("managed adapted editions submit their materialized exact revision instead of legacy shared-source state", async () => {
  currentSession = { user: { role: "publisher", marketCodes: ["uae"] } };
  currentSearch = "?market=uae&locale=en-US";
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  const adaptedDocument = {
    ...documentBase,
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentDocument = adaptedDocument;
  currentEditions = [{ ...edition, revisionId: "revision-5", revisionNumber: 5 }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-adapted",
      documentId: "document-1",
      marketEditionId: "uae-edition",
      locale: "en-US",
      mode: "adapted",
      baselineId: "baseline-1",
      baselineRevisionId: "baseline-revision-4",
      version: 4,
      operations: [],
      materializedRevisionId: "revision-5",
      translationState: "current",
    }],
  };
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 3,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-4",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: [],
    items: [],
  };
  const view = await renderDetail(adaptedDocument);
  try {
    await React.act(async () => button(view.container, "Submit for review").click());
    assert.equal(
      pendingSubmit?.input.data.revisionId,
      "revision-5",
      "adapted exact editions must use their materialized revision and skip the legacy source token",
    );
    assert.doesNotMatch(view.container.textContent ?? "", /shared source changed on the server/i);
  } finally {
    await view.unmount();
    currentDocument = documentBase;
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentSearch = "";
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    pendingSubmit = undefined;
  }
});

test("managed adapted publication omits legacy availability version and presents exact-edition messaging", async () => {
  const adaptedDocument = {
    ...documentBase,
    status: "approved",
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentDocument = adaptedDocument;
  currentEditions = [{ ...edition, workflowState: "approved", revisionId: "revision-5", revisionNumber: 5 }];
  currentEditorialWork = editorialWorkFor("revision-5");
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-adapted",
      documentId: "document-1",
      marketEditionId: "uae-edition",
      locale: "en-US",
      mode: "adapted",
      baselineId: "baseline-1",
      baselineRevisionId: "baseline-revision-4",
      version: 4,
      operations: [],
      materializedRevisionId: "revision-5",
      translationState: "current",
    }],
  };
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 3,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-4",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: [],
    items: [],
  };
  const view = await renderDetail(adaptedDocument);
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.match(view.container.textContent ?? "", /Content reuse/);
    const publishCustomization = button(view.container, "Publish...");
    assert.equal(publishCustomization.disabled, false, "customization publication remains available to the publisher");
    await React.act(async () => publishCustomization.click());
    const dialog = document.body.textContent ?? "";
    assert.match(dialog, /Publish Customization/);
    assert.match(dialog, /Only this selected edition will publish/);
    assert.doesNotMatch(dialog, /Destination impact/);

    await React.act(async () => button(document.body, "Confirm Publish").click());
    assert.equal(pendingPublish?.input.data.revisionId, "revision-5");
    assert.equal("availabilityVersion" in (pendingPublish?.input.data ?? {}), false);
  } finally {
    await view.unmount();
    currentDocument = documentBase;
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    currentEditorialWork = [];
    pendingPublish = undefined;
  }
});

test("publish-only authority can explicitly release a reviewed adapted destination snapshot", async () => {
  currentSession = {
    user: {
      role: "publisher",
      marketCodes: ["uae", "ksa"],
      capabilityGrants: [
        { topic: "site-configuration", capability: "publish", scope: "shared", marketCode: "uae" },
        { topic: "site-configuration", capability: "view", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "review", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "publish", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "view", scope: "regional", marketCode: "ksa" },
        { topic: "site-configuration", capability: "review", scope: "regional", marketCode: "ksa" },
        { topic: "site-configuration", capability: "publish", scope: "regional", marketCode: "ksa" },
      ],
    },
  };
  currentSearch = "?market=uae&locale=en-US";
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  const adaptedDocument = {
    ...documentBase,
    status: "published",
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentDocument = adaptedDocument;
  currentEditions = [{
    ...edition,
    workflowState: "approved",
    publicationState: "published",
    effectivePublicationState: "published",
    revisionId: "revision-5",
    revisionNumber: 5,
  }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-adapted",
      documentId: "document-1",
      marketEditionId: "uae-edition",
      locale: "en-US",
      mode: "adapted",
      baselineId: "baseline-1",
      baselineRevisionId: "baseline-revision-4",
      version: 4,
      operations: [],
      materializedRevisionId: "revision-5",
      translationState: "current",
    }],
  };
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 0,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-4",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: ["uae/en-US"],
    items: [
      {
        marketEditionId: "uae-edition",
        market: "uae",
        locale: "en-US",
        displayName: "UAE",
        stagedDecision: "show",
        reviewedDecision: "show",
        publishedDecision: "off",
        publishedEffectiveAvailable: false,
        pending: true,
        customized: true,
      },
      {
        marketEditionId: "ksa-edition",
        market: "ksa",
        locale: "en",
        displayName: "KSA",
        stagedDecision: "off",
        reviewedDecision: "off",
        publishedDecision: "off",
        publishedEffectiveAvailable: false,
        pending: false,
        customized: false,
      },
    ],
  };
  const view = await renderDetail(adaptedDocument);
  try {
    const editionsTab = button(view.container, "Regions");
    await React.act(async () => {
      editionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      editionsTab.click();
    });
    const release = button(view.container, "Publish reviewed destinations");
    assert.equal(release.disabled, false);
    await React.act(async () => release.click());
    const confirmation = document.body.textContent ?? "";
    assert.match(confirmation, /Reviewed version:\s*4/);
    assert.match(confirmation, /Current target:\s*UAE · en-US · revision 5/);
    assert.match(confirmation, /UAE · en-US:\s*shown/);
    await React.act(async () => button(document.body, "Confirm destination release").click());
    assert.equal(pendingAvailabilityPublish?.input.data.version, 4);
    assert.equal(pendingAvailabilityPublish?.input.data.revisionId, undefined);
    const publishedSnapshot = {
      ...currentAvailability,
      publishedVersion: 4,
      items: currentAvailability.items.map((item: any) => ({
        ...item,
        publishedDecision: item.market === "uae" ? "show" : item.publishedDecision,
        publishedEffectiveAvailable: item.market === "uae" ? true : item.publishedEffectiveAvailable,
        pending: item.market === "uae" ? false : item.pending,
      })),
    };
    await React.act(async () => {
      currentAvailability = publishedSnapshot;
      pendingAvailabilityPublish!.options.onSuccess(publishedSnapshot);
      notify();
    });
    assert.match(view.container.textContent ?? "", /Live:\s*Shown/);
    assert.doesNotMatch(view.container.textContent ?? "", /Live:\s*Not published yet/);
  } finally {
    await view.unmount();
    currentSearch = "";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentDocument = documentBase;
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    pendingAvailabilityPublish = undefined;
  }
});

test("publisher sees independent reviewed visibility release separately from content publish", async () => {
  currentSession = { user: { role: "publisher", marketCodes: ["ksa"] } };
  currentSearch = "?market=ksa&locale=en";
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  const independentDocument = {
    ...documentBase,
    editionId: "ksa-edition",
    status: "published",
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentDocument = independentDocument;
  currentEditions = [{
    ...edition,
    market: "ksa",
    locale: "en",
    workflowState: "approved",
    publicationState: "published",
    effectivePublicationState: "published",
    revisionId: "revision-5",
    revisionNumber: 5,
  }];
  currentEditorialWork = editorialWorkFor("revision-5", "approved", "ksa-edition");
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-independent",
      documentId: "document-1",
      marketEditionId: "ksa-edition",
      locale: "en",
      mode: "independent",
      version: 2,
      operations: [],
      materializedRevisionId: "revision-5",
      translationState: "not-applicable",
    }],
  };
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 3,
    canPublishShared: true,
    sharedSource: null,
    affectedEditions: ["ksa/en"],
    items: [{
      marketEditionId: "ksa-edition",
      market: "ksa",
      locale: "en",
      displayName: "KSA",
      stagedDecision: "show",
      reviewedDecision: "show",
      publishedDecision: "off",
      publishedEffectiveAvailable: false,
      pending: false,
      customized: true,
    }],
  };
  const view = await renderDetail(independentDocument);
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const release = view.container.querySelector<HTMLButtonElement>(
      '[data-testid="button-publish-reviewed-destinations"]',
    );
    assert.ok(release, "independent editions expose a dedicated visibility release");
    assert.equal(release.disabled, false);
    assert.match(view.container.textContent ?? "", /Publish reviewed visibility/);
    assert.match(view.container.textContent ?? "", /KSA.*shown.*live: excluded/i);

    const contentPublish = button(view.container, "Publish...");
    assert.equal(contentPublish.disabled, false, "content publication remains a separate action");
    await React.act(async () => contentPublish.click());
    assert.match(document.body.textContent ?? "", /Publish Customization/);
    assert.match(document.body.textContent ?? "", /Destination choices are not released by customization publication/);
    assert.doesNotMatch(document.body.textContent ?? "", /Publish reviewed visibility\?/);
  } finally {
    await view.unmount();
    currentSearch = "";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentDocument = documentBase;
    currentEditions = [edition];
    currentEditorialWork = [];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
  }
});

test("independent reviewed visibility release is disabled without authoritative publish authority", async () => {
  currentSession = { user: { role: "publisher", marketCodes: ["ksa"] } };
  currentSearch = "?market=ksa&locale=en";
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  const independentDocument = {
    ...documentBase,
    editionId: "ksa-edition",
    status: "published",
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentDocument = independentDocument;
  currentEditions = [{
    ...edition,
    market: "ksa",
    locale: "en",
    workflowState: "approved",
    publicationState: "published",
    effectivePublicationState: "published",
    revisionId: "revision-5",
    revisionNumber: 5,
  }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-independent",
      documentId: "document-1",
      marketEditionId: "ksa-edition",
      locale: "en",
      mode: "independent",
      version: 2,
      operations: [],
      materializedRevisionId: "revision-5",
      translationState: "not-applicable",
    }],
  };
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 3,
    canPublishShared: false,
    sharedSource: null,
    affectedEditions: ["ksa/en"],
    items: [{
      marketEditionId: "ksa-edition",
      market: "ksa",
      locale: "en",
      displayName: "KSA",
      stagedDecision: "show",
      reviewedDecision: "show",
      publishedDecision: "off",
      publishedEffectiveAvailable: false,
      pending: false,
      customized: true,
    }],
  };
  const view = await renderDetail(independentDocument);
  try {
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const release = view.container.querySelector<HTMLButtonElement>(
      '[data-testid="button-publish-reviewed-destinations"]',
    );
    assert.ok(release, "the reviewed snapshot remains visible for an unauthorized publisher");
    assert.equal(release.disabled, true);
  } finally {
    await view.unmount();
    currentSearch = "";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentDocument = documentBase;
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
  }
});

test("review-only editors can approve destination visibility without shared edit", async () => {
  currentSession = {
    user: {
      id: "reviewer-1",
      role: "editor",
      marketCodes: ["uae", "ksa"],
      capabilityMatrixConfigured: true,
      capabilityGrants: [
        { topic: "site-configuration", capability: "review", scope: "shared", marketCode: "uae" },
        { topic: "site-configuration", capability: "view", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "review", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "review", scope: "regional", marketCode: "ksa" },
      ],
    },
  };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [{ ...edition, workflowState: "in-review" }];
  currentEditorialWork = editorialWorkFor("revision-1", "requested");
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 2,
    reviewedVersion: 2,
    publishedVersion: 0,
    canEditShared: false,
    canReviewShared: true,
    reviewBlockedReason: null,
    canPublishShared: true,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-1",
      publishedRevisionId: null,
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: ["uae/en-US", "ksa/en"],
    items: [
      {
        marketEditionId: "uae-edition",
        market: "uae",
        locale: "en-US",
        displayName: "UAE",
        stagedDecision: "show",
        reviewedDecision: null,
        publishedDecision: "off",
        publishedEffectiveAvailable: false,
        pending: true,
        customized: false,
      },
      {
        marketEditionId: "ksa-edition",
        market: "ksa",
        locale: "en",
        displayName: "KSA",
        stagedDecision: "show",
         reviewedDecision: "off",
        publishedDecision: "off",
        publishedEffectiveAvailable: false,
        pending: true,
        customized: false,
      },
    ],
  };
  const view = await renderDetail({ ...documentBase, status: "in-review" });
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.ok(button(view.container, "Open assigned review"), "review capability loads the exact assigned request");
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const approve = button(view.container, "Approve destination visibility");
    assert.equal(approve.disabled, false, "review authority, not edit authority, approves a destination snapshot");
    await React.act(async () => approve.click());
    assert.equal(pendingAvailabilityReview?.input.data.version, 2);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
    pendingAvailabilityReview = undefined;
  }
});

function configureAvailabilityAuthorityFixture(
  authority: {
    canReviewShared: boolean;
    reviewBlockedReason: "self-review" | "missing-regional-grant" | "missing-shared-grant" | null;
  },
) {
  currentSession = {
    user: {
      id: "reviewer-1",
      role: "publisher",
      marketCodes: ["europe", "ksa", "uae"],
      capabilityMatrixConfigured: true,
      capabilityGrants: [
        ...["europe", "ksa", "uae"].flatMap((marketCode) => ([
          { topic: "site-configuration", capability: "view", scope: "regional", marketCode },
          { topic: "site-configuration", capability: "review", scope: "regional", marketCode },
          { topic: "site-configuration", capability: "publish", scope: "regional", marketCode },
        ])),
        { topic: "site-configuration", capability: "review", scope: "shared", marketCode: "uae" },
        { topic: "site-configuration", capability: "publish", scope: "shared", marketCode: "uae" },
      ],
    },
  };
  currentMarkets = [
    { id: "europe-edition", code: "europe", displayName: "Europe", defaultLocale: "en", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
  ];
  currentEditions = [{ ...edition, workflowState: "in-review" }];
  currentEditorialWork = editorialWorkFor("revision-1", "requested");
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 2,
    reviewedVersion: null,
    publishedVersion: 0,
    canEditShared: false,
    canReviewShared: authority.canReviewShared,
    reviewBlockedReason: authority.reviewBlockedReason,
    canPublishShared: false,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-1",
      publishedRevisionId: null,
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: ["europe/en", "ksa/en", "uae/en-US"],
    items: currentMarkets.map((market) => ({
      marketEditionId: market.id,
      market: market.code,
      locale: market.defaultLocale,
      displayName: market.displayName,
      stagedDecision: "show",
      reviewedDecision: null,
      publishedDecision: "off",
      publishedEffectiveAvailable: false,
      pending: true,
      customized: false,
    })),
  };
}

test("rendered full-matrix availability authority enables an independent reviewer", async () => {
  configureAvailabilityAuthorityFixture({ canReviewShared: true, reviewBlockedReason: null });
  const view = await renderDetail({ ...documentBase, status: "in-review" });
  try {
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const approve = button(view.container, "Approve destination visibility");
    assert.equal(approve.disabled, false);
    assert.match(view.container.querySelector('[data-testid="destination-review-authority"]')?.textContent ?? "", /independent reviewer/i);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("rendered availability authority distinguishes a missing shared grant", async () => {
  configureAvailabilityAuthorityFixture({ canReviewShared: false, reviewBlockedReason: "missing-shared-grant" });
  const view = await renderDetail({ ...documentBase, status: "in-review" });
  try {
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const approve = button(view.container, "Approve destination visibility");
    assert.equal(approve.disabled, true);
    assert.match(view.container.querySelector('[data-testid="destination-review-authority"]')?.textContent ?? "", /Shared review grant/i);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("rendered availability authority distinguishes the snapshot author", async () => {
  configureAvailabilityAuthorityFixture({ canReviewShared: false, reviewBlockedReason: "self-review" });
  const view = await renderDetail({ ...documentBase, status: "in-review" });
  try {
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const approve = button(view.container, "Approve destination visibility");
    assert.equal(approve.disabled, true);
    assert.match(view.container.querySelector('[data-testid="destination-review-authority"]')?.textContent ?? "", /cannot approve your own/i);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("a shared grant for another source market cannot release this source's destinations", async () => {
  currentSession = {
    user: {
      role: "publisher",
      marketCodes: ["uae", "ksa"],
      capabilityMatrixConfigured: true,
      capabilityGrants: [
        // KSA is deliberately not the exact UAE source market.
        { topic: "site-configuration", capability: "publish", scope: "shared", marketCode: "ksa" },
        { topic: "site-configuration", capability: "edit", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "publish", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "edit", scope: "regional", marketCode: "ksa" },
        { topic: "site-configuration", capability: "publish", scope: "regional", marketCode: "ksa" },
      ],
    },
  };
  currentSearch = "?market=uae&locale=en-US";
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentDocument = {
    ...documentBase,
    status: "published",
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentEditions = [{
    ...edition,
    workflowState: "approved",
    publicationState: "published",
    effectivePublicationState: "published",
    revisionId: "revision-5",
    revisionNumber: 5,
  }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-adapted",
      documentId: "document-1",
      marketEditionId: "uae-edition",
      locale: "en-US",
      mode: "adapted",
      baselineId: "baseline-1",
      baselineRevisionId: "baseline-revision-4",
      version: 4,
      operations: [],
      materializedRevisionId: "revision-5",
      translationState: "current",
    }],
  };
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 0,
    sharedSource: {
      editionId: "uae-edition",
      revisionId: "revision-4",
      publishedRevisionId: "revision-4",
      market: "uae",
      locale: "en-US",
    },
    affectedEditions: ["uae/en-US"],
    items: [
      {
        marketEditionId: "uae-edition",
        market: "uae",
        locale: "en-US",
        displayName: "UAE",
        stagedDecision: "show",
        reviewedDecision: "show",
        publishedDecision: "off",
        publishedEffectiveAvailable: false,
        pending: true,
        customized: true,
      },
      {
        marketEditionId: "ksa-edition",
        market: "ksa",
        locale: "en",
        displayName: "KSA",
        stagedDecision: "off",
        reviewedDecision: "off",
        publishedDecision: "off",
        publishedEffectiveAvailable: false,
        pending: false,
        customized: false,
      },
    ],
  };
  const view = await renderDetail(currentDocument);
  try {
    const regionsTab = button(view.container, "Regions");
    await React.act(async () => {
      regionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regionsTab.click();
    });
    const release = button(view.container, "Publish reviewed destinations");
    assert.equal(release.disabled, true, "a shared grant for KSA cannot authorize the UAE source");
  } finally {
    await view.unmount();
    currentSearch = "";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentDocument = documentBase;
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
  }
});

test("reviewed destination release stays disabled for unauthorized, stale, or busy adapted targets", async () => {
  currentSearch = "?market=uae&locale=en-US";
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  const adaptedDocument = {
    ...documentBase,
    status: "published",
    currentRevisionId: "revision-5",
    revisionNumber: 5,
  };
  currentDocument = adaptedDocument;
  currentEditions = [{
    ...edition,
    workflowState: "approved",
    publicationState: "published",
    revisionId: "revision-5",
    revisionNumber: 5,
  }];
  currentSharedMatrix = {
    baselines: [],
    bindings: [{
      id: "binding-adapted",
      documentId: "document-1",
      marketEditionId: "uae-edition",
      locale: "en-US",
      mode: "adapted",
      materializedRevisionId: "revision-5",
      version: 4,
      operations: [],
    }],
  };
  const availability = {
    documentId: "document-1",
    draftVersion: 4,
    reviewedVersion: 4,
    publishedVersion: 0,
    sharedSource: { editionId: "uae-edition", revisionId: "revision-4", market: "uae", locale: "en-US" },
    affectedEditions: ["uae/en-US"],
    items: [{
      marketEditionId: "uae-edition",
      market: "uae",
      locale: "en-US",
      displayName: "UAE",
      stagedDecision: "show",
      reviewedDecision: "show",
      publishedDecision: "off",
      publishedEffectiveAvailable: false,
      pending: true,
      customized: true,
    }],
  };
  currentAvailability = availability;
  const view = await renderDetail(adaptedDocument);
  try {
    const editionsTab = button(view.container, "Regions");
    await React.act(async () => {
      editionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      editionsTab.click();
    });
    const release = button(view.container, "Publish reviewed destinations");
    currentSession = { user: { role: "editor", marketCodes: ["uae"] } };
    await React.act(async () => notify());
    assert.equal(button(view.container, "Publish reviewed destinations").disabled, true);

    currentSession = { user: { role: "publisher", marketCodes: ["uae"] } };
    currentAvailability = { ...availability, draftVersion: 5 };
    await React.act(async () => notify());
    assert.equal(button(view.container, "Publish reviewed destinations").disabled, true);

    currentAvailability = availability;
    publishAvailabilityPending = true;
    await React.act(async () => notify());
    assert.equal(button(view.container, "Publish reviewed destinations").disabled, true);
    assert.equal(release.disabled, true);
  } finally {
    await view.unmount();
    currentSearch = "";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentDocument = documentBase;
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    publishAvailabilityPending = false;
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
  currentSession = {
    user: {
      role: "editor",
      marketCodes: ["ksa"],
      capabilityGrants: [
        { topic: "site-configuration", capability: "edit", scope: "shared" },
        { topic: "site-configuration", capability: "edit", scope: "regional", marketCode: "ksa" },
      ],
    },
  };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [{ ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" }];
  currentSharedMatrix = {
    baselines: [{
      id: "baseline-en",
      documentId: "document-1",
      locale: "en",
      revisionId: "baseline-revision-en",
      revisionNumber: 2,
      sourceRevisionId: null,
      snapshot: { ...documentBase, seo: undefined },
      mediaReferences: [],
      createdAt: new Date("2026-01-01"),
    }],
    bindings: [{
      id: "ksa-binding",
      documentId: "document-1",
      marketEditionId: "ksa-edition",
      locale: "en",
      mode: "shared",
      baselineId: "baseline-en",
      baselineRevisionId: "baseline-revision-en",
      version: 1,
      operations: [],
      materializedRevisionId: null,
      translationState: "current",
    }],
  };
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
    await React.act(async () => customize.click());
    assert.equal(bindSharedInput?.data.mode, "adapted");
    assert.equal(bindSharedInput?.data.baselineId, "baseline-en");
    assert.equal(bindSharedInput?.data.baselineRevisionId, "baseline-revision-en");
    assert.equal(bindSharedInput?.data.expectedDestinationRevisionId, "ksa-revision");
    assert.equal(bindSharedInput?.data.version, 1);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
  }
});

test("restricted bare links react to the neutral matrix without opening an editable shared baseline", async () => {
  currentSession = {
    user: {
      role: "editor",
      marketCodes: ["ksa"],
      capabilityGrants: [
        { topic: "site-configuration", capability: "edit", scope: "regional", marketCode: "ksa" },
      ],
    },
  };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [{ ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" }];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: {
      editionId: "internal-source",
      revisionId: "shared-revision",
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
  currentSharedMatrix = {
    baselines: [{
      id: "bare-link-baseline",
      documentId: "document-1",
      locale: "en",
      revisionId: "bare-link-baseline-revision",
      revisionNumber: 2,
      sourceRevisionId: null,
      snapshot: {
        slug: "contact-email",
        title: "Neutral title",
        summary: "Neutral summary",
        content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" },
        mediaIds: [],
      },
      mediaReferences: [],
    }],
    bindings: [{
      id: "bare-link-binding",
      documentId: "document-1",
      marketEditionId: "ksa-edition",
      locale: "en",
      mode: "shared",
      baselineId: "bare-link-baseline",
      baselineRevisionId: "bare-link-baseline-revision",
      version: 3,
      operations: [],
      materializedRevisionId: null,
      translationState: "current",
    }],
  };
  currentSearch = "";
  currentLocation = "/content/document-1";
  navigateLocation = (next) => {
    const [pathname, query = ""] = next.split("?", 2);
    currentLocation = pathname;
    currentSearch = query ? `?${query}` : "";
    notify();
  };
  const view = await renderDetail({ ...documentBase, title: "Regional title" });
  try {
    // The matrix and selected edition settle through the mounted query
    // subscriptions, rather than relying on a precomputed URL mock.
    await React.act(async () => {
      notify();
      await Promise.resolve();
    });
    assert.equal(currentSearch, "", "restricted bare links must not redirect to context=shared");
    assert.ok(view.container.querySelector("#document-title"), "the assigned regional editor remains usable");
    assert.equal(view.container.querySelector("#shared-baseline-title"), null, "restricted editors never receive an editable neutral form");
    const regions = button(view.container, "Regions");
    await React.act(async () => {
      regions.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      regions.click();
    });
    assert.ok(button(view.container, "Customize for this edition"), "the assigned destination keeps its customization path");
    await React.act(async () => button(view.container, "Customize for this edition").click());
    assert.equal(bindSharedInput?.data.mode, "adapted");
    assert.equal(bindSharedInput?.data.marketEditionId, "ksa-edition");
    assert.equal(bindSharedInput?.data.expectedDestinationRevisionId, "ksa-revision");
  } finally {
    navigateLocation = () => {};
    currentSearch = "";
    currentLocation = "/content/document-1";
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentDocument = documentBase;
    currentEditions = [edition];
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    bindSharedInput = undefined;
  }
});

test("restricted explicit shared context is read-only and cannot invoke baseline save", async () => {
  currentSession = { user: { role: "editor", marketCodes: ["ksa"] } };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentEditions = [{ ...edition, market: "ksa", locale: "en", revisionId: "ksa-revision" }];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: {
      editionId: "internal-source",
      revisionId: "shared-revision",
      market: "shared-source",
      locale: "und",
    },
    affectedEditions: [],
    items: [],
  };
  currentSharedMatrix = {
    baselines: [{
      id: "explicit-shared-baseline",
      documentId: "document-1",
      locale: "en",
      revisionId: "explicit-shared-revision",
      revisionNumber: 2,
      sourceRevisionId: null,
      snapshot: {
        slug: "contact-email",
        title: "Neutral title",
        summary: null,
        content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" },
        mediaIds: [],
      },
      mediaReferences: [],
    }],
    bindings: [{
      id: "explicit-shared-binding",
      documentId: "document-1",
      marketEditionId: "ksa-edition",
      locale: "en",
      mode: "shared",
      baselineId: "explicit-shared-baseline",
      baselineRevisionId: "explicit-shared-revision",
      version: 1,
      operations: [],
      materializedRevisionId: null,
      translationState: "current",
    }],
  };
  currentSearch = "?context=shared&locale=en";
  currentLocation = `/content/document-1${currentSearch}`;
  const view = await renderDetail({ ...documentBase, title: "Regional title" });
  try {
    assert.equal(currentSearch, "?context=shared&locale=en");
    const title = view.container.querySelector<HTMLInputElement>("#shared-baseline-title")!;
    assert.ok(title, "explicit shared context still offers a read-only neutral preview");
    assert.equal(title.disabled, true);
    const save = button(view.container, "Save shared content");
    assert.equal(save.disabled, true, "the shared toolbar save stays disabled without administrator authority");
    assert.equal(view.container.querySelector('[data-testid="shared-baseline-save"]'), null);
    await React.act(async () => save.click());
    assert.equal(pendingBaselineSave, undefined, "restricted shared context never invokes the administrator-only save endpoint");
    assert.equal(view.container.querySelector('[data-testid="preview-failure"]'), null);
  } finally {
    currentSearch = "";
    currentLocation = "/content/document-1";
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentDocument = documentBase;
    currentEditions = [edition];
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    pendingBaselineSave = undefined;
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
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [{
      id: "source-baseline", documentId: "document-1", locale: "en-US",
      revisionId: "source-baseline-revision", revisionNumber: 1, sourceRevisionId: null,
      snapshot: {}, mediaReferences: [],
    }],
    bindings: [{
      id: "source-binding", documentId: "document-1", marketEditionId: "uae-edition", locale: "en-US",
      mode: "shared", baselineId: "source-baseline", baselineRevisionId: "source-baseline-revision",
      version: 1, operations: [], materializedRevisionId: "revision-1", translationState: "current",
    }],
  };
  const view = await renderDetail();
  try {
    const editionsTab = [...view.container.querySelectorAll<HTMLButtonElement>('[role="tab"]')]
      .find((tab) => tab.textContent === "Regions");
    assert.ok(editionsTab);
    await React.act(async () => {
      editionsTab.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      editionsTab.click();
    });
    const customize = button(view.container, "Customize for this edition");
    assert.equal(customize.disabled, false);
  } finally {
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("rendered destination checkbox submits and persists the complete availability matrix", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae", "ksa"], legacyAdministratorMarketCodes: ["uae", "ksa"] } };
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
      .find((tab) => tab.textContent === "Regions");
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
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
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
  currentEditions = [{ ...edition, workflowState: "approved" }];
  currentEditorialWork = editorialWorkFor("revision-1");
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
  const view = await renderDetail({ ...documentBase, status: "approved" });
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      // The exact approved-review lookup uses the mocked async fetch. Let its
      // query notification commit before attempting the publish action.
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const publishCustomization = button(view.container, "Publish...");
    assert.equal(publishCustomization.disabled, false, "the exact approved review lookup must settle before publishing");
    await React.act(async () => publishCustomization.click());
    const dialog = document.body.textContent ?? "";
    assert.match(dialog, /Publish Customization/);
    assert.match(dialog, /Destination choices are not released by customization publication/);
    assert.match(dialog, /Only this selected edition will publish/);
    assert.doesNotMatch(dialog, /Destination impact/);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentEditorialWork = [];
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentAvailability = undefined;
  }
});

test("administrator can publish an eligible saved draft without an exact review request", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentEditions = [{ ...edition, workflowState: "draft" }];
  currentEditorialWork = [];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  const view = await renderDetail({ ...documentBase, status: "draft" });
  try {
    await React.act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const publish = button(view.container, "Publish...");
    assert.equal(publish.disabled, false);
    await React.act(async () => publish.click());
    assert.match(document.body.textContent ?? "", /Publish Customization/);
    assert.match(document.body.textContent ?? "", /direct publication of this exact saved revision/i);
    assert.match(document.body.textContent ?? "", /No independent review request is bypassed or created/);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("administrator direct publication stays disabled while the current binding lookup is loading", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentEditions = [{ ...edition, workflowState: "draft" }];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  currentEditorialWork = [];
  sharedMatrixLookupState = "loading";
  const view = await renderDetail({ ...documentBase, status: "draft" });
  try {
    await React.act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const publish = button(view.container, "Publish...");
    assert.equal(publish.disabled, true);
    assert.match(
      view.container.querySelector('[data-testid="publish-disabled-reason"]')?.textContent ?? "",
      /still loading or unavailable.*Retry/i,
    );
    assert.equal(document.body.querySelector('[role="dialog"]'), null);
  } finally {
    await view.unmount();
    sharedMatrixLookupState = "ready";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("administrator direct publication stays disabled when the current binding lookup fails", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentEditions = [{ ...edition, workflowState: "draft" }];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  currentEditorialWork = [];
  sharedMatrixLookupState = "error";
  const view = await renderDetail({ ...documentBase, status: "draft" });
  try {
    await React.act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const publish = button(view.container, "Publish...");
    assert.equal(publish.disabled, true);
    assert.match(
      view.container.querySelector('[data-testid="publish-disabled-reason"]')?.textContent ?? "",
      /still loading or unavailable.*Retry/i,
    );
    assert.equal(document.body.querySelector('[role="dialog"]'), null);
  } finally {
    await view.unmount();
    sharedMatrixLookupState = "ready";
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("administrator direct publication stays blocked while an exact review request exists", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentEditions = [{ ...edition, workflowState: "draft" }];
  currentEditorialWork = editorialWorkFor("revision-1", "requested");
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  const view = await renderDetail({ ...documentBase, status: "draft" });
  try {
    await React.act(async () => {
      await Promise.resolve();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    const publish = button(view.container, "Publish...");
    assert.equal(publish.disabled, true);
    assert.match(
      view.container.querySelector('[data-testid="publish-disabled-reason"]')?.textContent ?? "",
      /Submit this exact saved revision/,
    );
    assert.equal(document.body.querySelector('[role="dialog"]'), null);
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentEditorialWork = [];
    currentAvailability = undefined;
  }
});

test("configured administrator without an exact publish grant has no direct publish action", async () => {
  currentSession = {
    user: {
      role: "administrator",
      marketCodes: ["uae"],
      capabilityMatrixConfigured: true,
      capabilityGrants: [
        { topic: "site-configuration", capability: "view", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "edit", scope: "regional", marketCode: "uae" },
        { topic: "site-configuration", capability: "review", scope: "regional", marketCode: "uae" },
      ],
    },
  };
  currentEditions = [{ ...edition, workflowState: "draft" }];
  currentEditorialWork = [];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  const view = await renderDetail({ ...documentBase, status: "draft" });
  try {
    assert.equal(
      [...view.container.querySelectorAll("button")].some((candidate) =>
        candidate.textContent?.includes("Publish...")),
      false,
    );
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentEditions = [edition];
    currentEditorialWork = [];
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
    assert.match(view.container.textContent ?? "", /Content reuse/);
    assert.match(view.container.textContent ?? "", /Saved content, market visibility, and reviewed publication are separate/);
    assert.match(view.container.textContent ?? "", /unbound/i);
    assert.doesNotMatch(view.container.textContent ?? "", /Shared Baseline/);
  } finally {
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("copying an exact source establishes a baseline by revision identity, not current editor draft", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentEditions = [{ ...edition, revisionId: "revision-1", revisionNumber: 1 }];
  currentSharedMatrix = { baselines: [], bindings: [] };
  currentAvailability = undefined;
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    await React.act(async () => button(view.container, "Save neutral baseline").click());
    assert.equal(pendingBaselineSave?.input.data.sourceRevisionId, "revision-1");
    assert.equal("snapshot" in (pendingBaselineSave?.input.data ?? {}), false);
  } finally {
    await view.unmount();
    pendingBaselineSave = undefined;
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
  }
});

test("compact shared controls hide customization and disable restores outside the destination permission", async () => {
  currentSession = { user: { role: "editor", marketCodes: ["ksa"] } };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentAvailability = {
    documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 1,
    sharedSource: null, affectedEditions: [], items: [{
      marketEditionId: "uae-edition", market: "uae", locale: "en-US", displayName: "UAE",
      stagedDecision: "show", reviewedDecision: null, publishedDecision: "show",
      publishedEffectiveAvailable: true, pending: false, customized: true,
    }],
  };
  currentSharedMatrix = {
    baselines: [{
      id: "compact-baseline", documentId: "document-1", locale: "en-US", revisionId: "compact-revision",
      revisionNumber: 2, sourceRevisionId: null, snapshot: {}, mediaReferences: [],
    }],
    bindings: [{
      id: "compact-binding", documentId: "document-1", marketEditionId: "uae-edition", locale: "en-US",
      mode: "adapted", baselineId: "compact-baseline", baselineRevisionId: "compact-revision", version: 2,
      operations: [{ op: "replace", path: "title", value: "local title" }], materializedRevisionId: "revision-1",
      translationState: "current",
    }],
  };
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    assert.equal(
      [...view.container.querySelectorAll<HTMLButtonElement>("button")].some((item) => item.textContent?.includes("Customize this market")),
      false,
    );
    assert.match(view.container.textContent ?? "", /Market-specific fields/);
    const restore = view.container.querySelector<HTMLButtonElement>('[aria-label*="Restore"]');
    assert.equal(restore, null, "restore is not exposed without destination permission");
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
    currentAvailability = undefined;
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("shared baseline editor saves an edited neutral successor without submitting the regional draft", async () => {
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en", enabled: true },
  ];
  currentSharedMatrix = {
    baselines: [{
      id: "baseline-1", documentId: "document-1", locale: "en-US",
       revisionId: "baseline-revision-1", revisionNumber: 3, sourceRevisionId: null, authorityKind: "neutral",
      snapshot: { slug: "contact-email", title: "Neutral title", summary: null, content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" }, mediaIds: [], seo: null },
       mediaReferences: [], affectedDestinationMarkets: ["uae"], canEdit: true, editReason: null, createdAt: new Date("2026-01-01"),
    }],
    bindings: [],
  };
  currentSearch = "?market=uae&locale=en-US";
  currentLocation = `/content/document-1${currentSearch}`;
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    assert.match(view.container.textContent ?? "", /Governed destinations: uae/);
    assert.equal(button(view.container, "Edit Shared").disabled, false, "unrelated enabled markets do not disable a bound baseline");
    assert.equal(button(view.container, "Save neutral baseline").disabled, false, "server-proven neutral authority removes the unnecessary source-selection gate");
    await React.act(async () => button(view.container, "Edit Shared").click());
    const title = document.body.querySelector<HTMLInputElement>("#shared-baseline-title")!;
    assert.equal(title.value, "Neutral title");
    await change(title, "Changed neutral title");
    await React.act(async () => button(document.body, "Save shared baseline").click());
     assert.equal(pendingBaselineSave?.input.data.sourceRevisionId, undefined, "neutral baseline successors omit real-market source lineage");
    assert.equal(pendingBaselineSave?.input.data.expectedRevisionNumber, 3);
    assert.equal(pendingBaselineSave?.input.data.snapshot.title, "Changed neutral title");
    assert.equal(pendingSave, undefined, "shared editing never submits the regional draft PATCH");
  } finally {
    currentSearch = "";
    currentLocation = "/content/document-1";
    await view.unmount();
    pendingBaselineSave = undefined;
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("a permission-denied neutral baseline shows access guidance, not country-source recovery", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [{
      id: "legacy-baseline", documentId: "document-1", locale: "en-US",
      revisionId: "legacy-baseline-revision", revisionNumber: 2, sourceRevisionId: null, authorityKind: "neutral",
      snapshot: { slug: "contact-email", title: "Neutral title", summary: null, content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" }, mediaIds: [], seo: null },
      mediaReferences: [], affectedDestinationMarkets: ["uae"], canEdit: false,
      editReason: "You need Shared and regional Edit access to every affected destination.",
    }],
    bindings: [],
  };
  currentSearch = "?market=uae&locale=en-US";
  currentLocation = `/content/document-1${currentSearch}`;
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    assert.equal(
      [...view.container.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes("Edit Shared")),
      undefined,
    );
    assert.doesNotMatch(view.container.textContent ?? "", /no durable source origin/i);
    assert.match(view.container.textContent ?? "", /Shared and regional Edit access/i);
    const save = button(view.container, "Save neutral baseline");
    assert.equal(save.disabled, true);
  } finally {
    currentSearch = "";
    currentLocation = "/content/document-1";
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("an unresolved legacy baseline still requires explicit saved-source recovery", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [{
      id: "unresolved-baseline", documentId: "document-1", locale: "en-US",
      revisionId: "unresolved-baseline-revision", revisionNumber: 2, sourceRevisionId: null, authorityKind: "unresolved",
      snapshot: null, mediaReferences: [], affectedDestinationMarkets: ["uae"], canEdit: false,
      editReason: "Select an exact saved source revision; this baseline has no durable real-market origin.",
    }],
    bindings: [],
  };
  currentSearch = "?market=uae&locale=en-US";
  currentLocation = `/content/document-1${currentSearch}`;
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    assert.match(view.container.textContent ?? "", /no durable source origin/i);
    const save = button(view.container, "Save neutral baseline");
    assert.equal(save.disabled, true);
  } finally {
    currentSearch = "";
    currentLocation = "/content/document-1";
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("a source-less successor with server-proven neutral authority remains editable in explicit shared context", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentAvailability = {
    documentId: "document-1", draftVersion: 1, reviewedVersion: null, publishedVersion: 1,
    sharedSource: { editionId: "uae-edition", revisionId: "regional-revision", market: "uae", locale: "en-US" },
    affectedEditions: [], items: [],
  };
  currentSharedMatrix = {
    baselines: [{
      id: "governed-baseline", documentId: "document-1", locale: "en-US",
      revisionId: "governed-baseline-revision", revisionNumber: 4, sourceRevisionId: null, authorityKind: "neutral",
      snapshot: { slug: "contact-email", title: "Governed neutral", summary: null, content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "governed@example.com" }, mediaIds: [], seo: null },
      mediaReferences: [], affectedDestinationMarkets: ["uae"], canEdit: true, editReason: null,
    }],
    bindings: [],
  };
  currentSearch = "?context=shared&locale=en-US";
  currentLocation = `/content/document-1${currentSearch}`;
  const view = await renderDetail({ ...documentBase, kind: "platform" });
  try {
    const title = view.container.querySelector<HTMLInputElement>("#shared-baseline-title");
    assert.ok(title);
    assert.equal(title.disabled, false);
    assert.doesNotMatch(view.container.textContent ?? "", /no durable source origin/i);
    await change(title, "Edited neutral successor");
    const save = button(view.container, "Save shared content");
    assert.equal(save.disabled, false);
    await React.act(async () => save.click());
    assert.equal(pendingBaselineSave?.input.data.sourceRevisionId, undefined);
    assert.equal(pendingBaselineSave?.input.data.snapshot.title, "Edited neutral successor");
  } finally {
    currentSearch = "";
    currentLocation = "/content/document-1";
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentDocument = documentBase;
    currentEditions = [edition];
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentAvailability = undefined;
    pendingBaselineSave = undefined;
  }
});

test("saved neutral content is the bare-link default while the regional revision remains intact", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentEditions = [{ ...edition, revisionId: "regional-revision", revisionNumber: 7 }];
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 7,
    reviewedVersion: null,
    publishedVersion: 1,
    sharedSource: { editionId: "uae-edition", revisionId: "regional-revision", market: "uae", locale: "en-US" },
    affectedEditions: [],
    items: [{
      marketEditionId: "uae-edition", market: "uae", locale: "en-US", displayName: "UAE",
      stagedDecision: "show", reviewedDecision: null, publishedDecision: "show",
      publishedEffectiveAvailable: true, pending: false, customized: false,
    }],
  };
  const neutralSnapshot = {
    slug: "contact-email", title: "Neutral title", summary: "Neutral summary",
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" },
    mediaIds: [], seo: null,
  };
  currentSharedMatrix = {
    baselines: [{
      id: "baseline-1", documentId: "document-1", locale: "en-US",
      revisionId: "baseline-revision-1", revisionNumber: 3, sourceRevisionId: null,
      snapshot: neutralSnapshot, mediaReferences: [],
    }],
    bindings: [{
      id: "binding-1", documentId: "document-1", marketEditionId: "uae-edition", locale: "en-US",
      mode: "adapted", baselineId: "baseline-1", baselineRevisionId: "baseline-revision-1",
      version: 2, operations: [], materializedRevisionId: "regional-revision",
    }],
  };
  currentDocument = { ...documentBase, revisionNumber: 7, currentRevisionId: "regional-revision", summary: "Regional summary" };
  currentSearch = "";
  currentLocation = "/content/document-1";
  navigateLocation = (next) => {
    const [pathname, query = ""] = next.split("?", 2);
    currentLocation = pathname;
    currentSearch = query ? `?${query}` : "";
    notify();
  };
  const view = await renderDetail(currentDocument);
  try {
    await React.act(async () => {});
    assert.match(view.container.textContent ?? "", /Neutral summary/);
    const sharedTitle = document.body.querySelector<HTMLInputElement>("#shared-baseline-title");
    assert.ok(sharedTitle);
    await change(sharedTitle, "Saved neutral title");
    await React.act(async () => button(document.body, "Save shared content").click());
    assert.equal(pendingSave, undefined);
    assert.equal(pendingBaselineSave?.input.data.sourceRevisionId, undefined);
    currentSharedMatrix = {
      ...currentSharedMatrix,
      baselines: [{
        ...currentSharedMatrix.baselines[0],
        revisionId: "baseline-revision-2",
        revisionNumber: 4,
        snapshot: { ...neutralSnapshot, title: "Saved neutral title" },
      }],
    };
    await React.act(async () => {
      pendingBaselineSave?.options.onSuccess();
      pendingBaselineSave = undefined;
      notify();
    });
    await view.unmount();
    currentSearch = "";
    currentLocation = "/content/document-1";
    const reopened = await renderDetail(currentDocument);
    try {
      await React.act(async () => {});
      assert.match(reopened.container.textContent ?? "", /Neutral summary/);
      assert.equal(
        reopened.container.querySelector<HTMLInputElement>("#shared-baseline-title")?.value,
        "Saved neutral title",
      );
    } finally {
      await reopened.unmount();
    }
    assert.equal(currentDocument.currentRevisionId, "regional-revision");
  } finally {
    if (view.container.isConnected) await view.unmount();
    navigateLocation = () => {};
    currentSearch = "";
    currentLocation = "/content/document-1";
    currentAvailability = undefined;
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentDocument = documentBase;
  }
});

test("shared baseline editor surfaces title and content validation before saving", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [{
      id: "invalid-baseline", documentId: "document-1", locale: "en-US",
      revisionId: "invalid-baseline-revision", revisionNumber: 2, sourceRevisionId: null,
      snapshot: {
        slug: "contact-email", title: "", summary: null,
        content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "not-an-email" },
        mediaIds: [],
      },
      mediaReferences: [],
    }],
    bindings: [],
  };
  const view = await renderDetail({ ...documentBase, kind: "site-configuration" });
  try {
    await React.act(async () => button(view.container, "Edit Shared").click());
    assert.match(document.body.textContent ?? "", /Add a display title before saving this shared baseline/);
    assert.match(document.body.textContent ?? "", /Enter a valid email address/);
    assert.equal(button(document.body, "Save shared baseline").disabled, true);
  } finally {
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
  }
});

test("discarding shared baseline edits resets the draft before reopening the same revision", async () => {
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentSharedMatrix = {
    baselines: [{
      id: "discard-baseline", documentId: "document-1", locale: "en-US",
      revisionId: "discard-baseline-revision", revisionNumber: 2, sourceRevisionId: null,
      snapshot: {
        slug: "contact-email", title: "Original neutral title", summary: null,
        content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" },
        mediaIds: [],
      },
      mediaReferences: [],
    }],
    bindings: [],
  };
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  const view = await renderDetail({ ...documentBase, kind: "site-configuration" });
  try {
    await React.act(async () => button(view.container, "Edit Shared").click());
    const title = document.body.querySelector<HTMLInputElement>("#shared-baseline-title")!;
    await change(title, "Abandoned neutral title");
    await React.act(async () => button(document.body, "Cancel").click());
    await React.act(async () => button(view.container, "Edit Shared").click());
    assert.equal(document.body.querySelector<HTMLInputElement>("#shared-baseline-title")?.value, "Original neutral title");
  } finally {
    window.confirm = originalConfirm;
    await view.unmount();
    currentMarkets = [{ code: "uae", displayName: "UAE", defaultLocale: "en-US" }];
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

test("inline neutral editing keeps dirty input through a failed save and protects context navigation", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  currentSearch = "?context=shared&locale=en-US";
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentEditions = [{ ...edition, market: "uae", locale: "en-US", revisionId: "revision-1" }];
  currentSharedMatrix = {
    baselines: [{
      id: "baseline-inline",
      documentId: "document-1",
      locale: "en-US",
      revisionId: "baseline-inline-revision-1",
      revisionNumber: 3,
      sourceRevisionId: null,
      snapshot: {
        slug: "contact-email",
        title: "Neutral title",
        summary: null,
        content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "neutral@example.com" },
        mediaIds: [],
      },
      mediaReferences: [],
      createdAt: new Date("2026-01-01"),
    }],
    bindings: [],
  };
  const originalConfirm = window.confirm;
  window.confirm = () => false;
  const view = await renderDetail({ ...documentBase, title: "Regional title" });
  try {
    const title = view.container.querySelector<HTMLInputElement>("#shared-baseline-title")!;
    await change(title, "Unsaved neutral title");
    await React.act(async () => {});
    assert.equal(button(view.container, "Save shared content").disabled, false);
    await React.act(async () => button(view.container, "Save shared content").click());
    assert.ok(pendingBaselineSave, "the top-bar save action invokes the inline shared baseline save");
    assert.equal(pendingBaselineSave?.input.data.sourceRevisionId, undefined);
    await React.act(async () => pendingBaselineSave?.options.onError({ status: 409, data: { error: "The neutral baseline changed" } }));
    assert.equal(title.value, "Unsaved neutral title", "a failed neutral save keeps the inline draft");

    const link = document.createElement("a");
    link.href = "/dashboard";
    document.body.append(link);
    const navigation = new dom.window.MouseEvent("click", { bubbles: true, cancelable: true });
    link.dispatchEvent(navigation);
    link.remove();
    assert.equal(navigation.defaultPrevented, true, "dirty shared context blocks internal navigation");
    const beforeUnload = new dom.window.Event("beforeunload", { cancelable: true });
    window.dispatchEvent(beforeUnload);
    assert.equal(beforeUnload.defaultPrevented, true, "dirty shared context blocks tab navigation");
  } finally {
    window.confirm = originalConfirm;
    currentSearch = "";
    currentEditions = [edition];
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentSharedMatrix = { baselines: [], bindings: [] };
    pendingBaselineSave = undefined;
    await view.unmount();
  }
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
  currentSession = { user: { role: "administrator", marketCodes: ["uae", "ksa"], legacyAdministratorMarketCodes: ["uae", "ksa"] } };
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
    await React.act(async () => {
      ksa.click();
      notify();
    });
    assert.equal(view.container.querySelector('[aria-label="Reset Display Title (required) to Shared"]'), null);
  } finally {
    window.confirm = originalConfirm;
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
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
    assert.match(view.container.textContent ?? "", /not available/i);
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
    await React.act(async () => button(view.container, "Compare / resolve").click());
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

test("reuse comparison resolves the frozen destination binding without switching away from its source edition", async () => {
  currentSession = { user: { role: "administrator", marketCodes: ["uae", "ksa"], legacyAdministratorMarketCodes: ["uae", "ksa"] } };
  const targetBinding = {
    id: "ksa-frozen-binding", documentId: "document-1", marketEditionId: "ksa-edition", locale: "en-US",
    mode: "adapted", baselineId: "baseline-1", baselineRevisionId: "baseline-revision-1", version: 7,
    operations: [], materializedRevisionId: "ksa-revision-1", translationState: "current",
  };
  currentDocument = { ...documentBase, markets: ["uae", "ksa"] };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en-US", enabled: true },
  ];
  currentEditions = [
    edition,
    { ...edition, market: "ksa", revisionId: "ksa-revision-1", revisionNumber: 1 },
  ];
  currentSharedMatrix = {
    baselines: [{
      id: "baseline-1", documentId: "document-1", locale: "en-US", revisionId: "baseline-revision-1",
      revisionNumber: 1, sourceRevisionId: "revision-1", snapshot: {}, mediaReferences: [],
    }],
    bindings: [targetBinding],
  };
  currentSharedComparison = {
    binding: targetBinding,
    baselineRevisionId: "baseline-revision-2",
    previousSnapshot: { title: "Old shared" },
    currentSnapshot: { title: "New shared" },
    localSnapshot: { title: "KSA local" },
    mergedSnapshot: {},
    canAutoAdopt: true,
    conflicts: [],
  };
  const view = await renderDetail(currentDocument);
  try {
    assert.equal(view.container.querySelector<HTMLInputElement>("#document-title")?.value, "Contact email");
    await React.act(async () => button(view.container, "Compare and decide").click());
    assert.match(document.body.textContent ?? "", /Resolving: KSA · en-US/);
    await React.act(async () => button(document.body, "Apply & Save Draft").click());
    assert.equal(resolveSharedInput?.bindingId, "ksa-frozen-binding");
    assert.equal(resolveSharedInput?.data.version, 7);
    assert.equal(view.container.querySelector<HTMLInputElement>("#document-title")?.value, "Contact email",
      "opening and resolving the destination comparison never rehydrates or selects it as the source editor");
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentDocument = documentBase;
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
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
        assert.match(view.container.textContent ?? "", /Loading your accessible document editions/, "query-pending render must not fall back to availability source");
        await React.act(async () => {
          if (first === "catalog") marketsLoading = false;
          else editionsLoading = false;
          notify();
        });
        if (first === "catalog") {
          assert.match(view.container.textContent ?? "", /Loading your accessible document editions/, "the remaining edition catalogue keeps selection pending");
        } else {
          assert.match(view.container.querySelector('[data-testid="editing-context"]')?.textContent ?? "", /Awaiting exact edition/, "the remaining market catalogue keeps the exact selection pending");
        }
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

test("a deliberate regional switch persists a separate URL target and visibly retains an unavailable exact edition", async () => {
  currentLocation = "/content/document-1";
  currentSearch = "";
  navigateLocation = (next) => {
    const [pathname, query = ""] = next.split("?", 2);
    currentLocation = pathname;
    currentSearch = query ? `?${query}` : "";
    notify();
  };
  currentMarkets = [
    { id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true },
    { id: "ksa-edition", code: "ksa", displayName: "KSA", defaultLocale: "en-US", enabled: true },
  ];
  currentSession = { user: { role: "administrator", marketCodes: ["uae", "ksa"] } };
  currentEditions = [edition];
  currentSharedMatrix = {
    baselines: [{
      id: "neutral-baseline", documentId: "document-1", locale: "en-US", revisionId: "neutral-revision",
      revisionNumber: 4, sourceRevisionId: null, snapshot: {
        title: "Neutral contact", summary: "Shared summary",
        content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "shared@example.com" },
      }, mediaReferences: [],
    }],
    bindings: [{
      id: "ksa-binding", documentId: "document-1", marketEditionId: "ksa-edition", locale: "en-US",
      mode: "shared", baselineId: "neutral-baseline", baselineRevisionId: "neutral-revision",
      version: 8, operations: [], materializedRevisionId: null, translationState: "current",
    }],
  };
  const view = await renderDetail();
  const originalConfirm = window.confirm;
  window.confirm = () => true;
  try {
    const market = view.container.querySelector<HTMLButtonElement>('[aria-label="Content version"]')!;
    await React.act(async () => {
      market.dispatchEvent(new dom.window.MouseEvent("mousedown", { bubbles: true, button: 0 }));
      market.click();
    });
    const ksa = [...document.body.querySelectorAll<HTMLElement>('[role="option"]')].find((option) => option.textContent?.includes("KSA"));
    assert.ok(ksa);
    await React.act(async () => {
      ksa.click();
      // The mock document endpoint normally returns the currently open exact
      // edition. Once the geography changes, make that endpoint represent
      // the real missing-destination response.
      currentDocument = undefined;
      notify();
    });
      assert.equal(currentLocation, "/content/document-1", "wouter pathname remains separate from query state");
      assert.match(currentSearch, /(?:\?|&)market=ksa(?:&|$)/, "a deliberate regional switch persists its market in browser search");
      assert.match(currentSearch, /(?:\?|&)locale=en-US(?:&|$)/, "a deliberate regional switch persists its locale in browser search");
    assert.match(
      view.container.textContent ?? "",
      /requested KSA · en-US edition is unavailable or has no exact revision/i,
      "an explicit selected target remains visible instead of silently falling back to UAE",
    );
    assert.doesNotMatch(view.container.textContent ?? "", /Editing:.*UAE/);
  } finally {
    window.confirm = originalConfirm;
    await view.unmount();
    currentDocument = documentBase;
    currentLocation = "/content/document-1";
    currentSearch = "";
    navigateLocation = () => {};
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
    currentEditions = [edition];
    currentSharedMatrix = { baselines: [], bindings: [] };
    bindSharedInput = undefined;
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
    assert.match(view.container.textContent ?? "", /Editing:\s*Shared content · und/);
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
        assert.match(view.container.textContent ?? "", /Loading your accessible document editions/, "query-pending render must not fall back to availability source");
        await React.act(async () => {
          if (first === "catalog") marketsLoading = false;
          else editionsLoading = false;
          notify();
        });
        if (first === "catalog") {
          assert.match(view.container.textContent ?? "", /Loading your accessible document editions/, "the remaining edition catalogue keeps selection pending");
        } else {
          assert.match(view.container.querySelector('[data-testid="editing-context"]')?.textContent ?? "", /Awaiting exact edition/, "the remaining market catalogue keeps the exact selection pending");
        }
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

async function activateReadinessAction(container: ParentNode, path: string) {
  const normalizedPath = path.replace(/\[(\d+)\]/g, ".$1");
  const compactPath = normalizedPath.replace(/[^a-z0-9]/gi, "").toLowerCase();
  const issues = [...container.querySelectorAll<HTMLElement>("[data-readiness-issue]")];
  const issue = issues.find((item) => item.textContent?.includes(`Path: ${path}`))
    ?? issues
    .find((item) => item.dataset.readinessIssue?.includes(normalizedPath)
      || item.dataset.readinessIssue?.replace(/[^a-z0-9]/gi, "").toLowerCase().includes(compactPath)
      || item.textContent?.includes(`Path: ${path}`));
  assert.ok(issue, `Expected actionable readiness issue for ${path}`);
  const action = issue.querySelector<HTMLButtonElement>("button");
  assert.ok(action, `Expected an action for ${path}`);
  await React.act(async () => {
    action.click();
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

test("structured workflow readiness focuses Submit Review instead of presenting its server message as a content correction", async () => {
  currentSession = { user: { role: "publisher", marketCodes: ["uae"] } };
  currentDocument = documentBase;
  currentSearch = "";
  currentLocation = "/content/document-1";
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  currentSharedMatrix = { baselines: [], bindings: [] };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentEditorialWork = [];
  currentEditions = [{
    ...edition,
    workflowState: "draft",
    readinessErrors: ["This saved revision must be submitted and approved before publication."],
    readinessIssues: [{
      category: "workflow",
      action: "review",
      message: "This saved revision must be submitted and approved before publication.",
    }],
  }];
  const view = await renderDetail();
  try {
    const workflow = [...view.container.querySelectorAll<HTMLElement>("[data-readiness-issue]")]
      .find((item) => item.textContent?.includes("Path: workflow.review"));
    assert.ok(workflow);
    assert.match(workflow.textContent ?? "", /Review submission required/);
    assert.doesNotMatch(workflow.textContent ?? "", /Path: content/);
    await activateReadinessAction(view.container, "workflow.review");
    assert.equal(document.activeElement?.id, "submit-review");
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentDocument = documentBase;
    currentSearch = "";
    currentLocation = "/content/document-1";
    currentEditions = [edition];
    currentAvailability = undefined;
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentEditorialWork = [];
  }
});

test("rendered readiness merges current draft and publish corrections with distinct next steps", async () => {
  currentSession = { user: { role: "publisher", marketCodes: ["uae"] } };
  currentDocument = documentBase;
  currentSearch = "";
  currentLocation = "/content/document-1";
  currentAvailability = {
    documentId: "document-1",
    draftVersion: 1,
    reviewedVersion: null,
    publishedVersion: 0,
    sharedSource: null,
    affectedEditions: [],
    items: [],
  };
  currentSharedMatrix = { baselines: [], bindings: [] };
  currentMarkets = [{ id: "uae-edition", code: "uae", displayName: "UAE", defaultLocale: "en-US", enabled: true }];
  currentEditorialWork = [];
  currentEditions = [{ ...edition, readinessErrors: ["content.contactEmail: Invalid input"] }];
  const view = await renderDetail({
    ...documentBase,
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "not-an-email" },
  });
  try {
    await change(view.container.querySelector<HTMLInputElement>("#document-title")!, "Unsaved contact page");
    const issues = [...view.container.querySelectorAll<HTMLElement>("[data-readiness-issue]")];
    assert.equal(issues.length, 3, "the normalized correction, media attention, and unsaved draft remain distinct");
    const contact = issues.find((item) => /Path: content\.contactEmail(?:Find|$)/.test(item.textContent ?? ""));
    assert.ok(contact);
    assert.match(contact.textContent ?? "", /Publish \+ Edition/);
    assert.equal(
      issues.some((item) => item.textContent?.includes("Path: content.content.contactEmail")),
      false,
      "draft and publish validator path representations resolve to one editor control",
    );
    await activateReadinessAction(view.container, "content.contactEmail");
    assert.equal(document.activeElement?.id, "content-contactEmail");
  } finally {
    await view.unmount();
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
    currentDocument = documentBase;
    currentSearch = "";
    currentLocation = "/content/document-1";
    currentEditions = [edition];
    currentAvailability = undefined;
    currentSharedMatrix = { baselines: [], bindings: [] };
    currentEditorialWork = [];
  }
});

test("case-study publish readiness focuses its required organization descriptor control", async () => {
  const view = await renderDetail({
    ...documentBase,
    kind: "case-study",
    content: { schemaVersion: 1 },
  });
  try {
    await activateReadinessAction(view.container, "content.organizationDescriptor");
    assert.equal(document.activeElement?.id, "content-organizationDescriptor");
  } finally {
    await view.unmount();
    currentDocument = documentBase;
  }
});

test("office editor uses compact readiness beside its fields rather than the full workflow card", async () => {
  currentEditions = [{
    ...edition,
    readinessIssues: [{
      category: "validation",
      action: "edit",
      message: "content.city: Add the public city.",
    }],
  }];
  const view = await renderDetail({
    ...documentBase,
    kind: "office",
    content: { schemaVersion: 1, city: "", address: "" },
  });
  try {
    const readiness = view.container.querySelector<HTMLElement>('[data-testid="publication-readiness"]')!;
    assert.ok(readiness.querySelector("details"), "office readiness stays compact");
    assert.doesNotMatch(readiness.textContent ?? "", /Each issue applies to this selected exact edition/);
    assert.match(view.container.textContent ?? "", /Add the public city/);
  } finally {
    await view.unmount();
    currentDocument = documentBase;
    currentEditions = [edition];
  }
});

test("same-leaf nested readiness paths keep their own scoped fallback rather than focusing the first matching control", async () => {
  currentEditions = [{
    ...edition,
    readinessErrors: [
      "content.hero.heading: Add the hero heading.",
      "content.sections[0].heading: Add the first section heading.",
    ],
  }];
  const view = await renderDetail({
    ...documentBase,
    kind: "platform",
    content: {
      schemaVersion: 1,
      category: "Technology",
      summary: "A concise platform summary.",
      sections: [{ heading: "", body: [{ type: "paragraph", text: "" }] }],
    },
  });
  try {
    const heroIssue = [...view.container.querySelectorAll<HTMLElement>("[data-readiness-issue]")]
      .find((item) => item.dataset.readinessIssue?.includes("content.hero.heading"));
    const sectionIssue = [...view.container.querySelectorAll<HTMLElement>("[data-readiness-issue]")]
      .find((item) => item.dataset.readinessIssue?.includes("content.sections[0].heading"));
    assert.ok(heroIssue);
    assert.ok(sectionIssue);
    await React.act(async () => {
      heroIssue.querySelector<HTMLButtonElement>("button")!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(document.activeElement, heroIssue);
    await React.act(async () => {
      sectionIssue.querySelector<HTMLButtonElement>("button")!.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(document.activeElement, sectionIssue);
  } finally {
    await view.unmount();
    currentDocument = documentBase;
    currentEditions = [edition];
  }
});

test("readiness actions focus the exact correction control or destination, rather than a generic workflow target", async () => {
  const titleView = await renderDetail({ ...documentBase, title: "" });
  try {
    await activateReadinessAction(titleView.container, "title");
    assert.equal(document.activeElement?.id, "document-title");
  } finally {
    await titleView.unmount();
  }

  const contentView = await renderDetail({
    ...documentBase,
    content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "not-an-email" },
  });
  try {
    await activateReadinessAction(contentView.container, "content.contactEmail");
    assert.equal(document.activeElement?.id, "content-contactEmail");
  } finally {
    await contentView.unmount();
  }

  currentEditions = [{ ...edition, readinessErrors: ["seo.canonicalUrl: Use an HTTP(S) URL."] }];
  const seoView = await renderDetail();
  try {
    await activateReadinessAction(seoView.container, "seo.canonicalUrl");
    assert.equal(document.activeElement?.id, "seo-canonical-url");
  } finally {
    await seoView.unmount();
    currentEditions = [edition];
  }

  const unsavedView = await renderDetail();
  try {
    await change(unsavedView.container.querySelector<HTMLInputElement>("#document-title")!, "Changed but not saved");
    await activateReadinessAction(unsavedView.container, "workflow.unsaved");
    assert.equal(document.activeElement?.id, "save-draft");
  } finally {
    await unsavedView.unmount();
  }

  currentEditions = [{ ...edition, workflowState: "in-review" }];
  const reviewView = await renderDetail({ ...documentBase, status: "in-review" });
  try {
    await activateReadinessAction(reviewView.container, "workflow.state");
    assert.equal(document.activeElement?.id, "review-comment");
  } finally {
    await reviewView.unmount();
    currentEditions = [edition];
  }

  const archivedView = await renderDetail({ ...documentBase, status: "archived" });
  try {
    await activateReadinessAction(archivedView.container, "workflow.state");
    assert.equal(document.activeElement?.id, "restore-draft");
  } finally {
    await archivedView.unmount();
    currentDocument = documentBase;
  }
});

test("archived readiness gives permission guidance instead of focusing a restore control the editor cannot use", async () => {
  currentSession = { user: { role: "editor", marketCodes: ["uae"] } };
  const view = await renderDetail({ ...documentBase, status: "archived" });
  try {
    const issue = [...view.container.querySelectorAll<HTMLElement>("[data-readiness-issue]")]
      .find((item) => item.textContent?.includes("Archived edition"));
    assert.ok(issue);
    assert.match(issue.textContent ?? "", /publisher or administrator must restore/i);
    assert.ok(button(issue, "Review required access"));
    assert.equal(view.container.querySelector("#restore-draft"), null);
    await React.act(async () => {
      button(issue, "Review required access").click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    assert.equal(document.activeElement, issue);
  } finally {
    await view.unmount();
    currentDocument = documentBase;
    currentSession = { user: { role: "administrator", marketCodes: ["uae"] } };
  }
});

}
