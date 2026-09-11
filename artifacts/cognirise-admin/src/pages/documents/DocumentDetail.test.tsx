import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

const listeners = new Set<() => void>();
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
let pendingSave: { input: any; options: any } | undefined;
let mutationPending = false;
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
const edition = {
  market: "uae", locale: "en-US", exact: true, revisionId: "revision-1", revisionNumber: 1,
  workflowState: "draft", publicationState: null, effectiveMarket: null, effectiveLocale: null,
  usedFallback: false, fallbackReason: null, effectivePublicationState: null, effectiveWorkflowState: null,
  effectiveRevisionId: null, effectiveRevisionNumber: null, ready: true, readinessErrors: [],
};

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
    useLocation: () => ["/content/document-1", () => {}],
  },
});
mock.module("@workspace/api-client-react", {
  namedExports: {
    DocumentStatus: {},
    getGetDocumentQueryKey: (_id: string, params: unknown) => ["document", _id, params],
    getPreviewDocumentQueryKey: () => ["preview"],
    getListDocumentRevisionsQueryKey: () => ["revisions"],
    getListMarketEditionsQueryKey: () => ["markets"],
    getListDocumentEditionsQueryKey: () => ["editions"],
    getListDocumentReviewCommentsQueryKey: () => ["comments"],
    getGetMediaQueryKey: () => ["media"],
    getListMediaQueryKey: () => ["media-list"],
    useGetSession: () => ({ data: { user: { role: "administrator", marketCodes: ["uae"] } }, isLoading: false, isError: false }),
    useListDocumentEditions: () => ({ data: { items: [edition] }, isLoading: false, isError: false }),
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
    useListMarketEditions: () => ({ data: { items: [{ code: "uae", displayName: "UAE" }] } }),
    usePreviewDocument: () => ({ refetch: async () => ({ data: null }) }),
    useListDocumentReviewComments: () => ({ data: [] }),
    useSubmitDocument: () => inertMutation,
    usePublishDocument: () => inertMutation,
    useArchiveDocument: () => inertMutation,
    useRestoreDocument: () => inertMutation,
    useDeleteDocument: () => inertMutation,
    useRollbackDocument: () => inertMutation,
    useCreateDocumentEditionOverride: () => inertMutation,
    useAddDocumentReviewComment: () => inertMutation,
    useRejectDocumentRevision: () => inertMutation,
    useGetMedia: () => ({ data: undefined }),
    useListMedia: () => ({ data: { items: [] } }),
    useRequestMediaUpload: () => inertMutation,
    useFinalizeMediaUpload: () => inertMutation,
  },
});

const { default: DocumentDetail } = await import("./DocumentDetail");
const { createRoot } = await import("react-dom/client");

async function renderDetail() {
  currentDocument = { ...documentBase };
  pendingSave = undefined;
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

}
