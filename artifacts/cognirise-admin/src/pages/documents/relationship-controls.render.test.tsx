import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { JSDOM } from "jsdom";
import {
  getListDocumentsQueryKey,
  type Document,
} from "@workspace/api-client-react";
import { RecordPicker } from "./relationship-controls";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "http://localhost/admin/content/document-1",
});
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  MouseEvent: { value: dom.window.MouseEvent, configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const bulent = {
  id: "bulent-record",
  title: "Bulent",
  slug: "bulent",
  kind: "person",
  status: "draft",
  markets: ["uae"],
} as unknown as Document;

function PickerHarness() {
  const [value, setValue] = React.useState<string[]>([]);
  return React.createElement(RecordPicker, {
    label: "Related records",
    value,
    onChange: setValue,
  });
}

test("selecting a suggestion renders its selected card and editor anchor", async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const suggestionsParams = {
    page: 1,
    pageSize: 25,
    kind: undefined,
    search: undefined,
  };
  const selectedParams = {
    page: 1,
    pageSize: 100,
    kind: undefined,
  };
  client.setQueryData(getListDocumentsQueryKey(suggestionsParams), {
    items: [bulent],
    total: 1,
    totalPages: 1,
    page: 1,
    pageSize: 25,
  });
  client.setQueryData(getListDocumentsQueryKey(selectedParams), {
    items: [bulent],
    total: 1,
    totalPages: 1,
    page: 1,
    pageSize: 100,
  });

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  try {
    await act(async () => {
      root.render(
        React.createElement(
          QueryClientProvider,
          { client },
          React.createElement(PickerHarness),
        ),
      );
    });

    const suggestion = [...host.querySelectorAll("button")]
      .find((button) => button.textContent?.includes("Bulent"));
    assert.ok(suggestion, "the authorized record is rendered as a suggestion");

    await act(async () => {
      suggestion.click();
    });

    const selectedLink = host.querySelector<HTMLAnchorElement>('a[href="/content/bulent-record"]');
    assert.ok(selectedLink, "the selected card renders an editor anchor");
    assert.equal(selectedLink.textContent, "Bulent");
    assert.match(host.textContent ?? "", /Selected associations/);
  } finally {
    await act(async () => root.unmount());
    client.clear();
    host.remove();
  }
});