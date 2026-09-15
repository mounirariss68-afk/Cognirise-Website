import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { JSDOM } from "jsdom";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Document } from "@workspace/api-client-react";
import { DocumentCompactList } from "./DocumentCompactList";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/content" });
Object.defineProperties(globalThis, {
  location: { value: dom.window.location, configurable: true },
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
  addEventListener: { value: dom.window.addEventListener.bind(dom.window), configurable: true },
  removeEventListener: { value: dom.window.removeEventListener.bind(dom.window), configurable: true },
  dispatchEvent: { value: dom.window.dispatchEvent.bind(dom.window), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

const documentRecord = { 
  id: "document-1", 
  title: "Test Partner", 
  slug: "test-partner", 
  markets: ["us", "uk"], 
  kind: "partner", 
  status: "published",
  content: {},
  updatedAt: new Date().toISOString()
} as unknown as Document;

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

const availabilityData = {
  documentId: "document-1",
  canEditShared: true,
  items: [
    { market: "us", displayName: "United States", locale: "en", publishedEffectiveAvailable: true, stagedDecision: "show", pending: false },
    { market: "uk", displayName: "United Kingdom", locale: "en", publishedEffectiveAvailable: false, stagedDecision: "show", pending: true },
    { market: "unused", displayName: "Unused market", locale: "en", publishedEffectiveAvailable: false, stagedDecision: "off", pending: false }
  ]
};

const editionsData = {
  documentId: "document-1",
  items: [
    { market: "us", locale: "en", exact: true, hasEffectivePublishedRevision: true, revisionId: "rev1", workflowState: "published", publicationState: "published" },
    { market: "uk", locale: "en", exact: true, hasEffectivePublishedRevision: false, revisionId: "rev2", workflowState: "draft", publicationState: "draft" },
    { market: "unused", locale: "en", exact: false, hasEffectivePublishedRevision: false, revisionId: null, workflowState: null, publicationState: null, readinessErrors: ["Missing exact edition"] }
  ]
};

function installFetch(t: import("node:test").TestContext) {
  const fetches = { urls: [] as string[] };
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input.toString();
    fetches.urls.push(url);
    if (url.includes("/availability")) return Promise.resolve(response(availabilityData));
    if (url.includes("/editions")) return Promise.resolve(response(editionsData));
    return Promise.resolve(response({}));
  });
  return fetches;
}

const settle = (count = 5) => Array.from({ length: count }).reduce((p: Promise<void>) => p.then(() => new Promise<void>((resolve) => setTimeout(resolve, 10))), Promise.resolve());

async function renderList(kind = "partner") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const container = dom.window.document.createElement("div");
  dom.window.document.body.appendChild(container);
  const root = createRoot(container);
  await React.act(async () => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <DocumentCompactList kind={kind} documents={[{ ...documentRecord, kind: kind as Document["kind"] }]} />
      </QueryClientProvider>
    );
  });
  await React.act(async () => { await settle(); });
  return {
    container,
    unmount: async () => {
      await React.act(async () => root.unmount());
      container.remove();
      queryClient.clear();
    },
  };
}

for (const kind of ["partner", "platform", "industry", "framework", "office", "case-study", "publication"]) {
test(`${kind} list has one compact row with live and pending status and no unused-market diagnostics`, async (t) => {
  installFetch(t);
  const view = await renderList(kind);
  try {
    const text = view.container.textContent ?? "";
    assert.ok(text.includes("Test Partner"));
    assert.ok(text.includes("test-partner"));
    assert.ok(text.includes("United States"));
    assert.ok(text.includes("United Kingdom"));
    assert.equal(view.container.querySelectorAll("tbody tr").length, 1);
    assert.match(text, /Live/);
    assert.match(text, /Pending/);
    assert.doesNotMatch(text, /Unused market|Missing exact edition|Issues|Source|blocker|binding|baseline|canonical/);
    
    // We should see Live and Pending badges based on mock server data

    assert.ok(view.container.querySelector('.bg-emerald-500\\/10'), "Should render Live badge");
    assert.ok(view.container.querySelector('.bg-amber-500\\/10'), "Should render Pending badge");
    
    // Check navigation buttons are present
    const editBtn = Array.from(view.container.querySelectorAll('button')).find(b => b.textContent === "Edit");
    assert.ok(editBtn, "Edit button should exist");
    assert.equal(view.container.querySelector("a")?.getAttribute("href"), "/content/document-1");
  } finally {
    await view.unmount();
  }
});
}

test("status failures are explicit and retryable rather than reported as an empty draft", async (t) => {
  let failing = true;
  t.mock.method(globalThis, "fetch", async (input: RequestInfo | URL) => {
    if (failing) return response({ error: "Unavailable" }, 503);
    return response(input.toString().includes("/availability") ? availabilityData : editionsData);
  });
  const view = await renderList();
  try {
    assert.match(view.container.textContent ?? "", /Status unavailable/);
    const retry = Array.from(view.container.querySelectorAll("button")).find((button) => button.textContent === "Retry");
    assert.ok(retry);
    failing = false;
    await React.act(async () => { retry.click(); await settle(); });
    assert.match(view.container.textContent ?? "", /Live/);
    assert.doesNotMatch(view.container.textContent ?? "", /Status unavailable/);
  } finally {
    await view.unmount();
  }
});

