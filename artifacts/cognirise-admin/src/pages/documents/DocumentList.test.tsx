import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

if (typeof (mock as typeof mock & { module?: unknown }).module !== "function") {
  test("rendered document creation payloads", async () => {
    const run = promisify(execFile);
    await run(process.execPath, [
      "--experimental-test-module-mocks",
      "--import", "tsx",
      "--test", fileURLToPath(import.meta.url),
    ], { env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  });
} else {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/publications" });
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
    ResizeObserver: { value: class { observe() {} unobserve() {} disconnect() {} }, configurable: true },
    getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
  });
  (globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  (globalThis as typeof globalThis & { React: typeof React }).React = React;

  let pendingCreate: { input: any; options: any } | undefined;
  const createMutation = {
    isPending: false,
    mutate(input: any, options: any) {
      pendingCreate = { input, options };
    },
  };

  mock.module("wouter", {
    namedExports: {
      useLocation: () => ["/publications", () => {}],
      Link: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a>,
    },
  });
  mock.module("@tanstack/react-query", {
    namedExports: {
      useQueryClient: () => ({ invalidateQueries: () => {} }),
    },
  });
  mock.module("@workspace/api-client-react", {
    namedExports: {
      DocumentKind: {},
      DocumentStatus: {},
      SharedEditionReadiness: {},
      getListDocumentsQueryKey: (params: unknown) => ["documents", params],
      getListMarketEditionsQueryKey: (params: unknown) => ["markets", params],
      getGetDocumentAvailabilityQueryKey: (id: string) => ["availability", id],
      getListDocumentEditionsQueryKey: (id: string) => ["editions", id],
      useGetDocumentAvailability: () => ({ data: undefined, isLoading: false }),
      useListDocumentEditions: () => ({ data: undefined, isLoading: false }),
      useGetSession: () => ({
        data: { user: { role: "administrator", marketCodes: ["uae"] } },
      }),
      useListDocuments: () => ({
        data: { items: [], total: 0, totalPages: 1 },
        isLoading: false,
      }),
      useListMarketEditions: () => ({
        data: {
          items: [{
            id: "uae-edition",
            code: "uae",
            displayName: "UAE",
            defaultLocale: "en-US",
            enabled: true,
            isCanonical: true,
          }],
        },
        isLoading: false,
        isError: false,
      }),
      useCreateDocument: () => createMutation,
    },
  });
  mock.module("./ContentEditor", {
    namedExports: {
      ContentEditor: ({ value }: { value: Record<string, unknown> }) => (
        <div data-testid="content-editor" data-variant={String(value.variant ?? "")} />
      ),
    },
  });
  mock.module("./DocumentMarketMatrix", {
    namedExports: {
      DocumentMarketMatrix: () => null,
    },
  });
  mock.module("./PeopleMarketMatrix", {
    namedExports: {
      PeopleMarketMatrix: () => null,
    },
  });

  const { default: DocumentList } = await import("./DocumentList");
  const { createRoot } = await import("react-dom/client");

  async function renderList() {
    const container = document.createElement("div");
    document.body.append(container);
    let root: Root;
    await React.act(async () => {
      root = createRoot(container);
      root.render(<DocumentList kind="publication" />);
    });
    return {
      container,
      unmount: async () => {
        await React.act(async () => root.unmount());
        container.remove();
      },
    };
  }

  async function change(field: HTMLInputElement, value: string) {
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
    await React.act(async () => {
      setValue.call(field, value);
      field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
      field.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  }

  test("publication creation renders Article as the default and sends it", async () => {
    const view = await renderList();
    try {
      await React.act(async () => {
        [...view.container.querySelectorAll<HTMLButtonElement>("button")]
          .find((item) => item.textContent?.includes("Create New"))
          ?.click();
      });
      assert.equal(document.body.querySelector("[data-testid=content-editor]")?.getAttribute("data-variant"), "article");
      const title = [...document.body.querySelectorAll<HTMLInputElement>("input")]
        .find((item) => item.placeholder === "Internal Document Title");
      const slug = [...document.body.querySelectorAll<HTMLInputElement>("input")]
        .find((item) => item.placeholder === "my-document-name");
      assert.ok(title);
      assert.ok(slug);
      await change(title, "A publication");
      await change(slug, "a-publication");
      assert.equal(title.value, "A publication");
      assert.equal(slug.value, "a-publication");
      const submit = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
        .find((item) => item.textContent?.includes("Create & Edit"));
      assert.ok(submit);
      assert.equal(submit.disabled, false);
      await React.act(async () => submit.click());
      if (!pendingCreate) console.error(document.body.textContent);
      assert.equal(pendingCreate?.input.data.content.variant, "article");
      assert.deepEqual(pendingCreate?.input.data.markets, ["uae"]);
      assert.equal(pendingCreate?.input.data.sharedLocale, "en-US");
    } finally {
      await view.unmount();
    }
  });
}