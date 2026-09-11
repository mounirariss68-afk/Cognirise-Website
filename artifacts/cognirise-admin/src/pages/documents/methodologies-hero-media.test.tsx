import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  getGetMediaQueryKey,
  getListMediaQueryKey,
} from "@workspace/api-client-react";
import { validateCmsContent } from "@workspace/api-zod";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/",
});
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
  HTMLFormElement: { value: dom.window.HTMLFormElement, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  DocumentFragment: { value: dom.window.DocumentFragment, configurable: true },
  Event: { value: dom.window.Event, configurable: true },
  CustomEvent: { value: dom.window.CustomEvent, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  NodeFilter: { value: dom.window.NodeFilter, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  getComputedStyle: {
    value: dom.window.getComputedStyle.bind(dom.window),
    configurable: true,
  },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean })
  .IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { createRoot } = await import("react-dom/client");
const { ContentEditor } = await import("./ContentEditor");

const approvedHero = {
  id: "00000000-0000-4000-8000-000000000101",
  versionId: "00000000-0000-4000-8000-000000000201",
  filename: "methodologies-hero-approved.webp",
  publicUrl: "/api/media/approved/file",
  mimeType: "image/webp",
  status: "active",
  altText: "A governed methodology moving from evidence to action",
  width: 1600,
  height: 900,
};
const unavailableHero = {
  ...approvedHero,
  id: "00000000-0000-4000-8000-000000000102",
  versionId: "00000000-0000-4000-8000-000000000202",
  filename: "methodologies-hero-awaiting-review.webp",
  status: "review",
};
const mediaParams = {
  page: 1,
  pageSize: 100,
  search: undefined,
  collection: "website" as const,
};

const methodologiesDraft = {
  schemaVersion: 1,
  pagePath: "/methodologies",
  template: "methodologies",
  narrative: "Choose a governed methodology for the decision in front of you.",
  sections: [{
    type: "media",
    id: "methodologies-hero-media",
    order: 0,
    references: [{ mediaId: "", role: "hero" }],
  }],
  seo: {},
  legal: {},
  visualReferences: [],
  visibility: "public",
  order: 0,
  sources: [],
  relatedIds: [],
};

function ControlledEditor({
  initial,
  onContent,
}: {
  initial: Record<string, any>;
  onContent: (content: Record<string, any>) => void;
}) {
  const [content, setContent] = React.useState(initial);
  return React.createElement(ContentEditor, {
    kind: "landing-page",
    value: content,
    errors: [],
    onChange: (next) => {
      onContent(next);
      setContent(next);
    },
  });
}

async function mountEditor(
  queryClient: QueryClient,
  initial: Record<string, any>,
) {
  let content = initial;
  const container = document.createElement("div");
  document.body.append(container);
  let root: Root;
  await React.act(async () => {
    root = createRoot(container);
    root.render(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(ControlledEditor, {
          initial,
          onContent: (next) => {
            content = next;
          },
        }),
      ),
    );
  });
  return {
    container,
    content: () => content,
    unmount: async () => {
      await React.act(async () => root.unmount());
      container.remove();
    },
  };
}

test("methodologies landing hero selects only approved media and reloads its exact saved pin", {
  concurrency: false,
}, async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  queryClient.setQueryData(getListMediaQueryKey(mediaParams), {
    items: [approvedHero, unavailableHero],
    page: 1,
    pageSize: 100,
    total: 2,
  });
  queryClient.setQueryData(getGetMediaQueryKey(approvedHero.id), approvedHero);

  const editor = await mountEditor(queryClient, methodologiesDraft);
  let reloaded: Awaited<ReturnType<typeof mountEditor>> | undefined;
  try {
    const choose = editor.container.querySelector<HTMLButtonElement>(
      '[data-testid="button-choose-media-1"]',
    );
    assert.ok(choose, "the methodologies hero must expose the approved-media picker");
    await React.act(async () => {
      choose.click();
      await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const approved = document.querySelector<HTMLButtonElement>(
      `[data-testid="button-select-media-${approvedHero.id}"]`,
    );
    const awaitingReview = document.querySelector<HTMLButtonElement>(
      `[data-testid="button-select-media-${unavailableHero.id}"]`,
    );
    assert.ok(approved, "an active, versioned website image should be selectable");
    assert.equal(
      awaitingReview,
      null,
      "an image awaiting review must not be offered by the picker",
    );

    await React.act(async () => approved.click());
    const selected = editor.content().sections[0].references[0];
    assert.deepEqual(selected, {
      mediaId: approvedHero.id,
      mediaVersionId: approvedHero.versionId,
      role: "hero",
      altText: approvedHero.altText,
    });

    const validated = validateCmsContent("landing-page", editor.content(), "draft");
    assert.equal(validated.success, true);
    assert.ok(validated.success);

    // Model the API JSON round trip used by save and subsequent document reload.
    const savedFixture = JSON.parse(JSON.stringify(validated.data));
    await editor.unmount();
    reloaded = await mountEditor(queryClient, savedFixture);

    const persisted = reloaded.container.querySelector<HTMLElement>(
      '[data-testid="selected-media-media-1"]',
    );
    assert.ok(persisted, "the saved hero selection should rehydrate in the editor");
    assert.match(persisted.textContent ?? "", /methodologies-hero-approved\.webp/);
    assert.match(
      persisted.textContent ?? "",
      new RegExp(`Pinned version ${approvedHero.versionId.slice(0, 8)}`),
    );
    assert.equal(
      reloaded.content().sections[0].references[0].mediaVersionId,
      approvedHero.versionId,
    );
  } finally {
    if (reloaded) await reloaded.unmount();
    else if (editor.container.isConnected) await editor.unmount();
    queryClient.clear();
  }
});

test("a current approved list item wins over a stale exact-item review snapshot", {
  concurrency: false,
}, async () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: Infinity },
      mutations: { retry: false },
    },
  });
  const staleExact = {
    ...approvedHero,
    filename: "methodologies-hero-stale-review.webp",
    status: "review",
    versionId: "00000000-0000-4000-8000-000000000299",
  };
  queryClient.setQueryData(getListMediaQueryKey(mediaParams), {
    items: [approvedHero, unavailableHero],
    page: 1,
    pageSize: 100,
    total: 2,
  });
  queryClient.setQueryData(getGetMediaQueryKey(approvedHero.id), staleExact);

  const selectedDraft = JSON.parse(JSON.stringify(methodologiesDraft));
  selectedDraft.sections[0].references[0] = {
    mediaId: approvedHero.id,
    mediaVersionId: approvedHero.versionId,
    role: "hero",
    altText: approvedHero.altText,
  };
  const editor = await mountEditor(queryClient, selectedDraft);
  try {
    const selected = editor.container.querySelector<HTMLElement>(
      '[data-testid="selected-media-media-1"]',
    );
    assert.ok(selected, "the saved hero selection should remain visible");
    assert.match(selected.textContent ?? "", /methodologies-hero-approved\.webp/);
    assert.doesNotMatch(selected.textContent ?? "", /stale-review/);
    assert.match(
      selected.textContent ?? "",
      new RegExp(`Pinned version ${approvedHero.versionId.slice(0, 8)}`),
    );
  } finally {
    await editor.unmount();
    queryClient.clear();
  }
});