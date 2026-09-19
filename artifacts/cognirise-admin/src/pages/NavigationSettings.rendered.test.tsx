import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import test, { mock } from "node:test";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/admin/navigation" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
  HTMLButtonElement: { value: dom.window.HTMLButtonElement, configurable: true },
  HTMLSelectElement: { value: dom.window.HTMLSelectElement, configurable: true },
  HTMLFormElement: { value: dom.window.HTMLFormElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  NodeFilter: { value: dom.window.NodeFilter, configurable: true },
  Event: { value: dom.window.Event, configurable: true },
  MouseEvent: { value: dom.window.MouseEvent, configurable: true },
  KeyboardEvent: { value: dom.window.KeyboardEvent, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
  requestAnimationFrame: { value: (callback: FrameRequestCallback) => setTimeout(() => callback(Date.now()), 0), configurable: true },
  cancelAnimationFrame: { value: (handle: number) => clearTimeout(handle), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;

type NavigationFixture = {
  items: Array<{
    id: string;
    label: string;
    parentId: string | null;
    order: number;
    destination: string;
    visible: boolean;
  }>;
  pages: Array<{ path: string; enabled: boolean }>;
  requestedMarket: string;
  requestedLocale: string;
  market: string;
  locale: string;
  usedFallback: boolean;
  isConfigured: boolean;
  updatedAt: string | null;
  version: number;
};

const navigationByLocale: Record<string, NavigationFixture> = {
  en: {
    items: [{
      id: "home",
      label: "Home",
      parentId: null,
      order: 0,
      destination: "/",
      visible: true,
    }],
    pages: [{ path: "/", enabled: true }],
    requestedMarket: "uae",
    requestedLocale: "en",
    market: "uae",
    locale: "en",
    usedFallback: false,
    isConfigured: true,
    updatedAt: "2026-01-01T00:00:00.000Z",
    version: 1,
  },
  fr: {
    items: [{
      id: "home",
      label: "Accueil",
      parentId: null,
      order: 0,
      destination: "/",
      visible: true,
    }],
    pages: [{ path: "/", enabled: true }],
    requestedMarket: "uae",
    requestedLocale: "fr",
    market: "uae",
    locale: "fr",
    usedFallback: false,
    isConfigured: true,
    updatedAt: "2026-01-02T00:00:00.000Z",
    version: 2,
  },
};

let queryCalls: string[] = [];

const moduleMock = (mock as typeof mock & { module?: typeof mock.module }).module;

if (typeof moduleMock !== "function") {
  test("rendered navigation locale guard", async () => {
    const run = promisify(execFile);
    await run(process.execPath, [
      "--experimental-test-module-mocks",
      "--import", "tsx",
      "--test", fileURLToPath(import.meta.url),
    ], { env: { ...process.env, NODE_TEST_CONTEXT: undefined } });
  });
} else {
  mock.module("@workspace/api-client-react", {
    namedExports: {
      customFetch: async () => ({ items: [] }),
      getGetNavigationSettingsQueryKey: (params: Record<string, string>) => ["/api/navigation", params],
      getGetPublicNavigationSettingsQueryKey: (params: Record<string, string>) => ["/api/public/navigation", params],
      useGetNavigationSettings: (
        params: Record<string, string>,
        options?: { query?: Record<string, unknown> },
      ) => {
        const queryKey = (options?.query?.queryKey as readonly unknown[] | undefined) ?? ["/api/navigation", params];
        const fixture = navigationByLocale[params.locale];
        return useQuery({
          queryKey,
          enabled: options?.query?.enabled as boolean | undefined,
          queryFn: async () => {
            queryCalls.push(`${params.market}:${params.locale}`);
            if (!fixture) throw new Error("Market or locale is unavailable.");
            await new Promise((resolve) => setTimeout(resolve, params.locale === "fr" ? 5 : 0));
            return fixture;
          },
          ...(fixture && params.locale === "en" ? { initialData: fixture } : {}),
        });
      },
      useListMarketEditions: () => ({
        data: {
          items: [
            { code: "uae", displayName: "UAE", defaultLocale: "en", fallbackLocale: "fr", enabled: true, isCanonical: true },
          ],
        },
        isLoading: false,
        isError: false,
      }),
      useUpdateNavigationSettings: () => ({ isPending: false, mutateAsync: async () => navigationByLocale.en }),
      useReviewNavigationSettings: () => ({ isPending: false, mutateAsync: async () => navigationByLocale.en }),
      usePublishNavigationSettings: () => ({ isPending: false, mutateAsync: async () => navigationByLocale.en }),
    },
  });

  const { default: NavigationSettings } = await import("./NavigationSettings");
  const { createRoot } = await import("react-dom/client");

  async function renderNavigation() {
    queryCalls = [];
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
      root.render(<QueryClientProvider client={client}><NavigationSettings /></QueryClientProvider>);
      await new Promise((resolve) => setTimeout(resolve, 0));
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

  async function blur(field: HTMLInputElement) {
    await React.act(async () => {
      field.focus();
      field.blur();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function pressEnter(field: HTMLInputElement) {
    await React.act(async () => {
      field.dispatchEvent(new dom.window.KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  }

  async function changeSelect(field: HTMLSelectElement, value: string) {
    const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLSelectElement.prototype, "value")!.set!;
    await React.act(async () => {
      setValue.call(field, value);
      field.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
    });
  }

  test("blank and malformed locale input keeps the saved draft rendered and avoids a disabled query spinner", async () => {
    const view = await renderNavigation();
    try {
      const locale = view.container.querySelector<HTMLInputElement>("#navigation-locale")!;
      const label = view.container.querySelector<HTMLInputElement>('[aria-label="Home menu label"]')!;
      assert.equal(locale.value, "en");
      assert.equal(label.value, "Home");

      await change(label, "Local Home");
      assert.match(view.container.textContent ?? "", /Unsaved local changes/);
      const callsBeforeInput = [...queryCalls];

      await change(locale, "");
      assert.equal(locale.value, "");
      assert.equal(label.value, "Local Home", "editing the input must not discard the dirty draft");
      assert.doesNotMatch(view.container.textContent ?? "", /Refreshing this edition/);
      assert.equal(view.container.querySelector(".animate-spin"), null, "blank input must not leave the page on a query spinner");
      assert.deepEqual(queryCalls, callsBeforeInput, "blank input must not create a blank-locale query key");

      await blur(locale);
      assert.equal(locale.value, "", "invalid blank locale remains visible for correction");
      assert.match(view.container.textContent ?? "", /Enter a recognized locale/);
      assert.equal(label.value, "Local Home");

      await change(locale, "e!");
      await blur(locale);
      assert.equal(locale.value, "e!", "malformed locale remains visible for correction");
      assert.match(view.container.textContent ?? "", /Enter a recognized locale/);
      assert.equal(label.value, "Local Home");

      await change(locale, "xx");
      await pressEnter(locale);
      assert.equal(locale.value, "xx", "an unrecognized language remains visible after Enter");
      assert.match(view.container.textContent ?? "", /Enter a recognized locale/);
      assert.equal(label.value, "Local Home");

      const market = view.container.querySelector<HTMLSelectElement>("#navigation-market")!;
      await changeSelect(market, "ksa");
      assert.equal(market.value, "uae", "market switching is blocked while an invalid locale is being edited");
      assert.equal(locale.value, "xx");
      assert.equal(label.value, "Local Home", "the dirty draft survives an invalid market-switch attempt");
      assert.match(view.container.textContent ?? "", /Enter a recognized locale/);
    } finally {
      await view.unmount();
    }
  });

  test("committing a valid locale switches query keys and hydrates the matching edition", async () => {
    const view = await renderNavigation();
    try {
      const locale = view.container.querySelector<HTMLInputElement>("#navigation-locale")!;
      await change(locale, "fr");
      await blur(locale);
      assert.equal(locale.value, "fr");
      assert.ok(view.container.querySelector(".animate-spin"), "a committed locale may show a loading state while its edition hydrates");
      await React.act(async () => new Promise((resolve) => setTimeout(resolve, 10)));
      const label = view.container.querySelector<HTMLInputElement>('[aria-label="Accueil menu label"]');
      assert.ok(label, "the response for the committed locale must hydrate after the loading state");
      assert.equal(label.value, "Accueil");
      assert.ok(queryCalls.includes("uae:fr"));
    } finally {
      await view.unmount();
    }
  });

  test("an unavailable but well-formed locale resolves to an error instead of an endless blank spinner", async () => {
    const view = await renderNavigation();
    try {
      const locale = view.container.querySelector<HTMLInputElement>("#navigation-locale")!;
      await change(locale, "en-US");
      await blur(locale);
      await React.act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
      assert.match(locale.value, /^en-us$/i);
      assert.match(view.container.textContent ?? "", /Navigation settings could not be loaded/);
      assert.equal(view.container.querySelector(".animate-spin"), null);
      assert.ok(queryCalls.includes("uae:en-us"));
    } finally {
      await view.unmount();
    }
  });
}