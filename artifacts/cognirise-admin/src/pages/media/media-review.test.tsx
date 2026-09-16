import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin/media" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
  HTMLButtonElement: { value: dom.window.HTMLButtonElement, configurable: true },
  HTMLTextAreaElement: { value: dom.window.HTMLTextAreaElement, configurable: true },
  HTMLSelectElement: { value: dom.window.HTMLSelectElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  NodeFilter: { value: dom.window.NodeFilter, configurable: true },
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

type Asset = {
  id: string;
  versionId: string;
  filename: string;
  objectPath: string;
  publicUrl: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  altText: string;
  caption: string;
  credit: string;
  status: string;
  createdAt: string;
  collection: "website";
  canEdit: boolean;
  canReview: boolean;
  canInspect: boolean;
};

type ReviewInput = {
  mediaId: string;
  data: {
    decision: "approve" | "reject";
    sourceRightsApproved: boolean;
    accessibilityApproved: boolean;
  };
};

type MockQueryOptions = {
  queryKey?: readonly unknown[];
  [key: string]: unknown;
};

const sourceAsset: Asset = {
  id: "asset-review-1",
  versionId: "asset-review-1-v1",
  filename: "governed-source.png",
  objectPath: "media/governed-source.png",
  publicUrl: "https://media.invalid/governed-source.png",
  mimeType: "image/png",
  size: 1024 * 1024,
  width: 1200,
  height: 800,
  altText: "A governed source image",
  caption: "Approved website usage",
  credit: "Cognirise",
  status: "review",
  createdAt: "2026-01-01T00:00:00.000Z",
  collection: "website",
  canEdit: true,
  canReview: true,
  canInspect: false,
};

let assets: Asset[] = [];
let reviewCalls: ReviewInput[] = [];
let reviewBehavior: (input: ReviewInput) => Promise<Asset>;
let role = "publisher";

function getListMediaQueryKey(params?: unknown) {
  return ["/api/media", ...(params === undefined ? [] : [params])];
}

function pageFor(params?: Record<string, unknown>) {
  const collection = params?.collection;
  const search = typeof params?.search === "string" ? params.search.toLowerCase() : "";
  const items = assets.filter((asset) =>
    (!collection || asset.collection === collection) &&
    (!search || asset.filename.toLowerCase().includes(search)),
  );
  return {
    items,
    total: items.length,
    page: Number(params?.page ?? 1),
    pageSize: Number(params?.pageSize ?? 40),
    totalPages: 1,
  };
}

function performReview(input: ReviewInput) {
  const updated = {
    ...assets.find((asset) => asset.id === input.mediaId)!,
    status: input.data.decision === "approve" ? "ready" : "rejected",
    versionId: `${input.mediaId}-${input.data.decision}-v2`,
  };
  assets = assets.map((asset) => asset.id === updated.id ? updated : asset);
  return updated;
}

function resetState() {
  assets = [{ ...sourceAsset }];
  role = "publisher";
  reviewCalls = [];
  reviewBehavior = async (input) => performReview(input);
}

const moduleMock = (mock as typeof mock & { module?: typeof mock.module }).module;

if (typeof moduleMock !== "function") {
  test("rendered media review flow", async () => {
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
      useLocation: () => ["/admin/media", () => {}],
    },
  });

  mock.module("@workspace/api-zod", {
    namedExports: {
      CMS_HERO_DOCUMENT_SLUGS: { homepage: "homepage-hero", industries: "industries-hero" },
    },
  });

  mock.module("@workspace/api-client-react", {
    namedExports: {
      getListMediaQueryKey,
      getListAuditEventsQueryKey: (params?: unknown) => ["/api/audit", ...(params === undefined ? [] : [params])],
      getGetMediaReferenceImpactQueryKey: (id: string) => ["/api/media", id, "reference-impact"],
      getGetDocumentRevisionQueryKey: (...parts: unknown[]) => ["document-revision", ...parts],
      getGetMediaQueryKey: (id: string) => ["media", id],
      useGetSession: () => ({ data: { user: { role } }, isLoading: false, isError: false }),
      useListMedia: (params?: Record<string, unknown>, options?: { query?: MockQueryOptions }) => {
        const queryOptions = options?.query ?? {};
        const queryKey = queryOptions.queryKey ?? getListMediaQueryKey(params);
        return useQuery({
          ...queryOptions,
          queryKey,
          queryFn: async () => pageFor(params),
          initialData: pageFor(params),
          staleTime: 60_000,
        });
      },
      useListAuditEvents: () => ({
        data: { items: [], total: 0, page: 1, pageSize: 25, totalPages: 0 },
        isLoading: false,
        isError: false,
      }),
      useGetMediaReferenceImpact: () => ({
        data: { mediaId: sourceAsset.id, referenceCount: 0, references: [] },
        isLoading: false,
        isError: false,
      }),
      useReviewMedia: () => ({
        isPending: false,
        mutateAsync: (input: ReviewInput) => {
          reviewCalls.push(input);
          return reviewBehavior(input);
        },
      }),
      useUpdateMedia: () => ({ isPending: false, mutateAsync: async () => undefined }),
      useCreateDocument: () => ({ isPending: false, mutateAsync: async () => undefined }),
      useGetDocumentRevision: () => ({ data: undefined, isLoading: false, isError: false }),
      useListDocuments: () => ({ data: { items: [] }, isLoading: false, isError: false }),
      useFinalizeMediaUpload: () => ({ isPending: false, mutateAsync: async () => undefined }),
      useGetMedia: () => ({ data: undefined, isLoading: false, isError: false }),
      useRequestMediaUpload: () => ({ isPending: false, mutateAsync: async () => undefined }),
      useSubmitDocument: () => ({ isPending: false, mutateAsync: async () => undefined }),
      useUpdateDocument: () => ({ isPending: false, mutateAsync: async () => undefined }),
    },
  });

  mock.module("./BatchUploadZone", {
    namedExports: {
      BatchUploadZone: () => <section aria-label="Upload media test stub" />,
    },
  });

  const { default: MediaLibrary } = await import("./MediaLibrary");
  const { createRoot } = await import("react-dom/client");

  async function renderLibrary() {
    const client = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    const container = document.createElement("div");
    document.body.append(container);
    let root!: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<QueryClientProvider client={client}><MediaLibrary /></QueryClientProvider>);
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

  async function tick() {
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
  }

  async function clickAndSettle(button: HTMLButtonElement) {
    await React.act(async () => {
      button.click();
      await tick();
      await tick();
    });
  }

  function button(root: ParentNode, text: string) {
    const found = [...root.querySelectorAll<HTMLButtonElement>("button")]
      .find((item) => item.textContent?.includes(text) || item.getAttribute("aria-label")?.includes(text));
    assert.ok(found, `Expected button containing ${text}`);
    return found;
  }

  function reviewButton(container: ParentNode) {
    return button(container, "Review");
  }

  function checkboxes() {
    return [...document.body.querySelectorAll<HTMLButtonElement>('[role="checkbox"]')];
  }

  async function openReview(container: ParentNode) {
    await React.act(async () => reviewButton(container).click());
    assert.match(document.body.textContent ?? "", /Review media asset/);
  }

  async function closeReview() {
    await React.act(async () => button(document.body, "Close").click());
  }

  test("card actions stay ordered on a compact non-wrapping row without changing table sizing", async () => {
    resetState();
    const view = await renderLibrary();
    try {
      const review = reviewButton(view.container);
      const download = button(view.container, "Download");
      assert.equal(review.nextElementSibling, download);
      assert.ok(review.parentElement?.classList.contains("flex-nowrap"));
      assert.ok(review.parentElement?.classList.contains("items-center"));
      for (const action of [review, download]) {
        for (const token of ["h-8", "px-2", "gap-1.5", "shrink-0", "whitespace-nowrap"]) {
          assert.ok(action.classList.contains(token), `card action needs ${token}`);
        }
        assert.ok(action.querySelector("svg"));
      }
      await React.act(async () => button(view.container, "List view").click());
      for (const action of [reviewButton(view.container), button(view.container, "Download")]) {
        assert.ok(action.parentElement?.classList.contains("flex-col"));
        assert.ok(action.classList.contains("px-3"));
        assert.ok(action.classList.contains("gap-2"));
      }
    } finally {
      await view.unmount();
    }
  });

  test("card downloads retain pending state and start the protected file download", async () => {
    resetState();
    let release!: (response: Response) => void;
    const fetchMock = mock.method(globalThis, "fetch", () => new Promise<Response>((resolve) => { release = resolve; }));
    const anchorClick = mock.method(dom.window.HTMLAnchorElement.prototype, "click", function (this: HTMLAnchorElement) {
      assert.equal(this.getAttribute("href"), `/api/media/${sourceAsset.id}/download`);
      assert.equal(this.download, sourceAsset.filename);
    });
    const view = await renderLibrary();
    try {
      const download = button(view.container, "Download");
      await React.act(async () => download.click());
      assert.equal(download.disabled, true);
      assert.ok(download.querySelector("svg.animate-spin"));
      assert.equal(download.textContent, "Download");
      assert.equal(reviewButton(view.container).nextElementSibling, download);
      await React.act(async () => download.click());
      assert.equal(fetchMock.mock.callCount(), 1);
      await React.act(async () => {
        release(new Response(null, { status: 206 }));
        await tick();
      });
      assert.equal(anchorClick.mock.callCount(), 1);
      assert.equal(download.disabled, false);
    } finally {
      await view.unmount();
      fetchMock.mock.restore();
      anchorClick.mock.restore();
    }
  });

  test("unavailable card downloads remain disabled and editors cannot review", async () => {
    resetState();
    role = "editor";
    assets = [{
      ...sourceAsset,
      publicUrl: "",
      canEdit: false,
      canReview: false,
      canInspect: false,
    }];
    const view = await renderLibrary();
    try {
      assert.equal(button(view.container, "Download").disabled, true);
      assert.equal([...view.container.querySelectorAll("button")].some((item) => item.textContent === "Review"), false);
      assert.match(view.container.textContent ?? "", /Awaiting a publisher review/);
    } finally {
      await view.unmount();
    }
  });

  test("grid and list views open the review gates immediately", async () => {
    resetState();
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      assert.equal(checkboxes().length, 2);
      assert.match(document.body.textContent ?? "", /Confirm source review gates/);
      assert.ok(button(document.body, "Confirm approval"));
      assert.ok(button(document.body, "Reject"));
      await closeReview();

      await React.act(async () => button(view.container, "List view").click());
      await openReview(view.container);
      assert.equal(checkboxes().length, 2);
      assert.match(document.body.textContent ?? "", /Confirm source review gates/);
    } finally {
      await view.unmount();
    }
  });

  test("approval remains gated until both source and accessibility checks are confirmed", async () => {
    resetState();
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      const confirm = button(document.body, "Confirm approval");
      assert.equal(confirm.disabled, true);

      await React.act(async () => checkboxes()[0].click());
      assert.equal(confirm.disabled, true);
      await React.act(async () => checkboxes()[1].click());
      assert.equal(confirm.disabled, false);
      assert.equal(reviewCalls.length, 0);
    } finally {
      await view.unmount();
    }
  });

  test("reject submits with unchecked approval gates and updates the library to Rejected", async () => {
    resetState();
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      await clickAndSettle(button(document.body, "Reject"));
      assert.deepEqual(reviewCalls, [{
        mediaId: sourceAsset.id,
        data: {
          decision: "reject",
          sourceRightsApproved: false,
          accessibilityApproved: false,
        },
      }]);
      assert.equal(document.body.textContent?.includes("Review media asset"), false);
      assert.match(view.container.textContent ?? "", /Rejected/);
      assert.equal(view.container.textContent?.includes("Awaiting review"), false);
    } finally {
      await view.unmount();
    }
  });

  test("closing and reopening a review resets both approval gates", async () => {
    resetState();
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      await React.act(async () => checkboxes()[0].click());
      assert.equal(checkboxes()[0].getAttribute("aria-checked"), "true");
      await closeReview();

      await openReview(view.container);
      assert.deepEqual(checkboxes().map((item) => item.getAttribute("aria-checked")), ["false", "false"]);
    } finally {
      await view.unmount();
    }
  });

  test("pending review protects against duplicate submits and dialog close", async () => {
    resetState();
    let pendingInput!: ReviewInput;
    let release!: () => void;
    reviewBehavior = (input) => {
      pendingInput = input;
      return new Promise<Asset>((resolve) => {
        release = () => resolve(performReview(pendingInput));
      });
    };
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      await React.act(async () => checkboxes().forEach((item) => item.click()));
      const confirm = button(document.body, "Confirm approval");
      await React.act(async () => confirm.click());
      assert.equal(reviewCalls.length, 1);
      assert.equal(button(document.body, "Confirm approval").disabled, true);

      await React.act(async () => button(document.body, "Confirm approval").click());
      assert.equal(reviewCalls.length, 1, "a pending decision cannot be submitted twice");
      await closeReview();
      assert.match(document.body.textContent ?? "", /Review media asset/, "pending review cannot be closed");

      await React.act(async () => {
        release();
        await tick();
        await tick();
      });
      assert.equal(document.body.textContent?.includes("Review media asset"), false);
    } finally {
      await view.unmount();
    }
  });

  test("failed review retains an actionable conflict error and allows retry", async () => {
    resetState();
    let firstAttempt = true;
    reviewBehavior = async (input) => {
      if (firstAttempt) {
        firstAttempt = false;
        throw { data: { error: "Another reviewer already decided this asset." } };
      }
      return performReview(input);
    };
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      await clickAndSettle(button(document.body, "Reject"));
      assert.equal(reviewCalls.length, 1);
      assert.match(document.body.textContent ?? "", /Another reviewer already decided this asset/);
      assert.match(document.body.textContent ?? "", /Retry the decision/);
      assert.ok(!button(document.body, "Reject").disabled);

      await clickAndSettle(button(document.body, "Reject"));
      assert.equal(reviewCalls.length, 2);
      assert.equal(document.body.textContent?.includes("Review media asset"), false);
      assert.match(view.container.textContent ?? "", /Rejected/);
    } finally {
      await view.unmount();
    }
  });

  test("failed approval keeps both gates checked and leaves the review actionable", async () => {
    resetState();
    let firstAttempt = true;
    reviewBehavior = async (input) => {
      if (firstAttempt) {
        firstAttempt = false;
        throw new Error("Approval service unavailable.");
      }
      return performReview(input);
    };
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      await React.act(async () => checkboxes().forEach((item) => item.click()));
      await clickAndSettle(button(document.body, "Confirm approval"));

      assert.equal(reviewCalls.length, 1);
      assert.match(document.body.textContent ?? "", /Approval service unavailable/);
      assert.match(document.body.textContent ?? "", /Retry the decision/);
      assert.deepEqual(
        checkboxes().map((item) => item.getAttribute("aria-checked")),
        ["true", "true"],
      );
      assert.equal(button(document.body, "Confirm approval").disabled, false);

      await clickAndSettle(button(document.body, "Confirm approval"));
      assert.equal(reviewCalls.length, 2);
      assert.equal(document.body.textContent?.includes("Review media asset"), false);
      assert.match(view.container.textContent ?? "", /Available/);
    } finally {
      await view.unmount();
    }
  });

  test("successful approval closes review and updates the asset to Available", async () => {
    resetState();
    const view = await renderLibrary();
    try {
      await openReview(view.container);
      await React.act(async () => checkboxes().forEach((item) => item.click()));
      await clickAndSettle(button(document.body, "Confirm approval"));
      assert.deepEqual(reviewCalls, [{
        mediaId: sourceAsset.id,
        data: {
          decision: "approve",
          sourceRightsApproved: true,
          accessibilityApproved: true,
        },
      }]);
      assert.equal(document.body.textContent?.includes("Review media asset"), false);
      assert.match(view.container.textContent ?? "", /Available/);
      assert.equal(view.container.textContent?.includes("Awaiting review"), false);
    } finally {
      await view.unmount();
    }
  });

  test("successful approval remains Available after a library reload and cannot be reopened", async () => {
    resetState();
    const view = await renderLibrary();
    let reloaded: Awaited<ReturnType<typeof renderLibrary>> | undefined;
    try {
      await openReview(view.container);
      await React.act(async () => checkboxes().forEach((item) => item.click()));
      await clickAndSettle(button(document.body, "Confirm approval"));
      await view.unmount();

      reloaded = await renderLibrary();
      assert.match(reloaded.container.textContent ?? "", /Available/);
      assert.equal(
        [...reloaded.container.querySelectorAll<HTMLButtonElement>("button")]
          .some((item) => item.textContent?.includes("Review")),
        false,
      );
    } finally {
      if (reloaded) await reloaded.unmount();
      else if (view.container.isConnected) await view.unmount();
    }
  });
}