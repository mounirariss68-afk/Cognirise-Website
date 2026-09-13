import assert from "node:assert/strict";
import test from "node:test";
import { JSDOM } from "jsdom";
import * as React from "react";
import { act } from "react";
import type { Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/content/doc-1?market=shared-source&locale=und" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  HTMLInputElement: { value: dom.window.HTMLInputElement, configurable: true },
  HTMLSelectElement: { value: dom.window.HTMLSelectElement, configurable: true },
  HTMLTextAreaElement: { value: dom.window.HTMLTextAreaElement, configurable: true },
  HTMLButtonElement: { value: dom.window.HTMLButtonElement, configurable: true },
  Event: { value: dom.window.Event, configurable: true },
  MouseEvent: { value: dom.window.MouseEvent, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { createRoot } = await import("react-dom/client");
const { EditionAssignmentControl } = await import("./EditionAssignmentControl");

const editionId = "6e8f13e0-6f47-4a2c-9346-0a1f4726b961";
const editorId = "4dc11aae-42f3-4e8c-a7f1-8026989fae7d";
const reviewerId = "9e2d2b01-c374-4d3a-84c2-8d36d3b57c1f";
let savedInput: Record<string, unknown> | undefined;
let assignment = false;
let rejectSave = false;
let getCalls = 0;

const response = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" },
});

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = typeof input === "string" ? input : input.toString();
  if (url.endsWith(`/editions/${editionId}/assignees`)) {
    return response({ items: [
      { id: editorId, name: "Ada Editor", role: "editor" },
      { id: reviewerId, name: "Ravi Publisher", role: "publisher" },
      { id: "048ee8ee-c9dc-46c9-b979-45f5cdcfdf11", name: "Aria Admin", role: "administrator" },
    ] });
  }
  if (url.startsWith("/api/editorial-work/assignments")) {
    getCalls += 1;
    return response({
      items: assignment ? [{
        id: "assignment-1",
        editionId,
        editor: { id: editorId, name: "Ada Editor" },
        reviewer: { id: reviewerId, name: "Ravi Reviewer" },
        dueAt: null,
        status: "active",
      }] : [],
    });
  }
  if (url.endsWith(`/editions/${editionId}/assignment`) && init?.method === "PUT") {
    savedInput = JSON.parse(String(init.body));
    if (rejectSave) return response({ error: "The reviewer no longer has access." }, 409);
    assignment = true;
    return response({ assignment: { id: "assignment-1", editionId, editor: { id: editorId, name: "Ada Editor" }, reviewer: { id: reviewerId, name: "Ravi Reviewer" }, dueAt: null, status: "active" } });
  }
  throw new Error(`Unexpected request: ${init?.method ?? "GET"} ${url}`);
}) as typeof fetch;

function changeControl(control: HTMLInputElement | HTMLSelectElement, value: string) {
  const prototype = control instanceof dom.window.HTMLSelectElement
    ? dom.window.HTMLSelectElement.prototype
    : dom.window.HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  setter?.call(control, value);
  control.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  control.dispatchEvent(new dom.window.Event("change", { bubbles: true }));
}

async function settle() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

test("assignment save reloads the exact target and preserves unsaved values after an error", async () => {
  savedInput = undefined;
  assignment = false;
  rejectSave = false;
  getCalls = 0;
  const container = document.createElement("div");
  document.body.append(container);
  const root: Root = createRoot(container);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  await act(async () => {
    root.render(
      <QueryClientProvider client={client}>
        <EditionAssignmentControl
          editionId={editionId}
          documentId="doc-1"
          market="shared-source"
          locale="und"
          currentRevisionId="revision-1"
          currentRevisionNumber={1}
          canRequestReview={false}
          canManage
          currentUser={{ id: editorId, name: "Ada Editor" }}
        />
      </QueryClientProvider>,
    );
  });
  await settle();

  const editor = container.querySelector<HTMLSelectElement>("[aria-label='Assigned editor']")!;
  const reviewer = container.querySelector<HTMLSelectElement>("[aria-label='Assigned reviewer']")!;
  assert.ok(editor);
  assert.ok(reviewer);
  assert.match(editor.textContent ?? "", /Ada Editor · editor/);
  assert.match(reviewer.textContent ?? "", /Ravi Publisher · publisher/);
  assert.doesNotMatch(reviewer.textContent ?? "", /Ada Editor · editor/);
  await act(async () => {
    changeControl(editor, editorId);
    changeControl(reviewer, reviewerId);
  });
  await act(async () => {
    (Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Save assignment")) as HTMLButtonElement).click();
  });
  await settle();
  await settle();
  assert.deepEqual(savedInput, { editorId, reviewerId, dueAt: null });
  assert.ok(getCalls >= 2, "a successful mutation refetches the assignment for reload-safe state");
  assert.equal(editor.value, editorId);
  assert.equal(reviewer.value, reviewerId);

  rejectSave = true;
  await act(async () => {
    changeControl(reviewer, "048ee8ee-c9dc-46c9-b979-45f5cdcfdf11");
    (Array.from(container.querySelectorAll("button")).find((button) => button.textContent?.includes("Save assignment")) as HTMLButtonElement).click();
  });
  await settle();
  assert.equal(reviewer.value, "048ee8ee-c9dc-46c9-b979-45f5cdcfdf11");
  assert.match(container.textContent ?? "", /Assignment was not saved.*reviewer no longer has access/i);

  await act(async () => root.unmount());
  container.remove();
});