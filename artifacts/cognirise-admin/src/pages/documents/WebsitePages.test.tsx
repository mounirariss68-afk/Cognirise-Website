import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

if (typeof (mock as typeof mock & { module?: unknown }).module !== "function") {
  test("website pages navigation", async () => {
    await promisify(execFile)(process.execPath, [
      "--experimental-test-module-mocks", "--import", "tsx", "--test", fileURLToPath(import.meta.url),
    ], { env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  });
} else {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/website-pages" });
  Object.defineProperties(globalThis, {
    window: { value: dom.window, configurable: true },
    document: { value: dom.window.document, configurable: true },
    navigator: { value: dom.window.navigator, configurable: true },
    HTMLElement: { value: dom.window.HTMLElement, configurable: true },
    HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
    Node: { value: dom.window.Node, configurable: true },
    Event: { value: dom.window.Event, configurable: true },
    MouseEvent: { value: dom.window.MouseEvent, configurable: true },
  });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as typeof globalThis & { React: typeof React }).React = React;

  const page = {
    id: "homepage-id",
    title: "Homepage",
    slug: "homepage",
    content: { pagePath: "/" },
    publishedRevisionId: "old-approved-revision",
  };
  let listState: any = { data: { items: [page], totalPages: 1 }, isLoading: false };
  let editionState: any = {
    data: {
      items: [{
        market: "uae", locale: "en", exact: true, revisionId: "new-draft-revision",
        workflowState: "draft", publicationState: "published", hasEffectivePublishedRevision: true,
      }, {
        market: "ksa", locale: "ar", exact: false, revisionId: "fallback",
        workflowState: "approved", publicationState: "published", hasEffectivePublishedRevision: true,
      }],
    },
    isLoading: false,
  };
  const observedParams: unknown[] = [];
  mock.module("wouter", {
    namedExports: {
      Link: ({ children, href, ...props }: React.PropsWithChildren<{ href: string }>) => <a href={href} {...props}>{children}</a>,
    },
  });
  mock.module("@tanstack/react-query", {
    namedExports: {
      useQueryClient: () => ({ invalidateQueries: () => {} }),
    },
  });
  mock.module("@workspace/api-client-react", {
    namedExports: {
      getListDocumentsQueryKey: (params: unknown) => ["documents", params],
      getListDocumentEditionsQueryKey: (id: string) => ["editions", id],
      useListDocuments: (params: unknown) => { observedParams.push(params); return listState; },
      useListDocumentEditions: () => editionState,
    },
  });

  const { default: WebsitePages } = await import("./WebsitePages");
  const { createRoot } = await import("react-dom/client");
  async function render() {
    const container = document.createElement("div");
    document.body.append(container);
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<WebsitePages />);
    });
    return {
      container,
      unmount: async () => {
        await React.act(async () => root.unmount());
        container.remove();
      },
    };
  }

  test("homepage is discoverable and its exact edition is linked without publishing the draft", async () => {
    const view = await render();
    try {
      assert.match(view.container.textContent ?? "", /Homepage/);
      assert.equal((observedParams.at(-1) as { kind: string }).kind, "landing-page");
      assert.equal(view.container.querySelector('a[href="/content/homepage-id"]')?.textContent, "Homepage");
      assert.match(view.container.querySelector('a[href="/content/homepage-id?market=uae&locale=en"]')?.textContent ?? "", /UAE · EN.*Live with pending changes/);
      assert.equal(view.container.querySelector('a[href*="market=ksa"]'), null);
      assert.deepEqual([...view.container.querySelectorAll("button")].map((item) => item.textContent), ["Refresh"]);
      const search = view.container.querySelector<HTMLInputElement>('input[aria-label="Search website pages"]')!;
      const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
      await React.act(async () => {
        setValue.call(search, "home");
        search.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
        search.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
      });
      assert.equal((observedParams.at(-1) as { search: string }).search, "home");
    } finally {
      await view.unmount();
    }
  });

  test("list errors and empty searches are not displayed as missing pages", async () => {
    listState = { isError: true, isLoading: false, refetch: () => {} };
    const failed = await render();
    assert.match(failed.container.querySelector('[role="alert"]')?.textContent ?? "", /could not be loaded/);
    await failed.unmount();

    listState = { data: { items: [], totalPages: 0 }, isLoading: false };
    editionState = { data: { items: [] }, isLoading: false };
    const empty = await render();
    assert.match(empty.container.textContent ?? "", /No website pages are available to your account/);
    await empty.unmount();
  });
}