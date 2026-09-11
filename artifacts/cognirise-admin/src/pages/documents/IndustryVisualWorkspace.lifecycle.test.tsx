import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import * as React from "react";
import { createRoot, type Root } from "react-dom/client";
import { IndustryVisualWorkspace } from "./IndustryVisualWorkspace";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/content/industry-1",
});
// The workspace clock is unrelated to this lifecycle test and would otherwise
// keep jsdom's timer queue open after the rendered assertions finish.
Object.defineProperties(dom.window, {
  setInterval: { value: () => 0, configurable: true },
  clearInterval: { value: () => {}, configurable: true },
});
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  HTMLFormElement: { value: dom.window.HTMLFormElement, configurable: true },
  HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  Event: { value: dom.window.Event, configurable: true },
  MessageEvent: { value: dom.window.MessageEvent, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  requestAnimationFrame: { value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0), configurable: true },
  cancelAnimationFrame: { value: (handle: number) => clearTimeout(handle), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => { resolve = nextResolve; });
  return { promise, resolve };
}

function preview(token: string) {
  return {
    previewUrl: `/preview/${token}`,
    revisionId: "revision-one",
    revisionNumber: 1,
    expiresAt: new Date(Date.now() + 60_000).toISOString(),
    usedFallback: false,
    warnings: [],
  } as any;
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

test("keeps the parent iframe mounted while its child fetch is pending, then accepts ready without retaining an old terminal state", async () => {
  const requests: Deferred<any>[] = [];
  const requestPreview = () => {
    const next = deferred<any>();
    requests.push(next);
    return next.promise;
  };
  const container = document.createElement("div");
  document.body.append(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  let root: Root;

  await React.act(async () => {
    root = createRoot(container);
    root.render(
      <QueryClientProvider client={client}>
        <IndustryVisualWorkspace
          content={{ schemaVersion: 2 }}
          onChange={() => {}}
          errors={[]}
          disabled={false}
          revisionId="revision-one"
          currentRevisionId="revision-one"
          revisionNumber={1}
          market="uae"
          locale="en-US"
          hasUnsaved={false}
          requestPreview={requestPreview}
        />
      </QueryClientProvider>,
    );
    await settle();
  });
  assert.equal(requests.length, 1);
  assert.equal(container.querySelector("iframe"), null, "the parent waits only for capability issuance");

  await React.act(async () => {
    requests[0].resolve(preview("capability-one"));
    await settle();
  });
  const iframe = container.querySelector("iframe");
  assert.ok(iframe, "the iframe is mounted as soon as the capability is issued");
  await React.act(async () => { await settle(); });
  assert.ok(iframe.isConnected, "a delayed child fetch sends no initial unavailable state that removes its iframe");

  const firstFrame = iframe.contentWindow!;
  await React.act(async () => {
    window.dispatchEvent(new dom.window.MessageEvent("message", {
      origin: window.location.origin,
      source: firstFrame,
      data: { type: "industry-preview-status", status: "revoked" },
    }));
  });
  assert.equal(container.querySelector("iframe"), null, "a terminal child status hides the revoked capability");
  assert.match(container.textContent ?? "", /Preview session revoked/);

  const refresh = [...container.querySelectorAll("button")].find((button) => button.textContent?.includes("Refresh preview"));
  assert.ok(refresh);
  await React.act(async () => {
    refresh.click();
    await settle();
  });
  assert.equal(requests.length, 2);
  assert.equal(container.querySelector("iframe"), null, "the revoked iframe is not remounted while its replacement capability is pending");
  await React.act(async () => {
    requests[1].resolve(preview("capability-two"));
    await settle();
  });
  const replacementFrame = container.querySelector("iframe");
  assert.ok(replacementFrame, "a new capability clears the predecessor terminal state");

  await React.act(async () => {
    window.dispatchEvent(new dom.window.MessageEvent("message", {
      origin: window.location.origin,
      source: replacementFrame.contentWindow,
      data: { type: "industry-preview-status", status: "ready" },
    }));
  });
  assert.ok(container.querySelector("iframe")?.isConnected, "the ready child remains visible in the parent");
  assert.match(container.textContent ?? "", /Saved revision preview/);

  await React.act(async () => root.unmount());
  client.clear();
  container.remove();
});