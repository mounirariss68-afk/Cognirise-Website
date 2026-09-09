import assert from "node:assert/strict";
import test from "node:test";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { validateCmsContent, type CmsDocumentKind } from "@workspace/api-zod";
import { JSDOM } from "jsdom";
import * as React from "react";
import type { Root } from "react-dom/client";
import { ContentEditor } from "./ContentEditor";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
Object.defineProperties(globalThis, {
  window: { value: dom.window, configurable: true },
  document: { value: dom.window.document, configurable: true },
  navigator: { value: dom.window.navigator, configurable: true },
  HTMLElement: { value: dom.window.HTMLElement, configurable: true },
  HTMLFormElement: { value: dom.window.HTMLFormElement, configurable: true },
  MutationObserver: { value: dom.window.MutationObserver, configurable: true },
  Node: { value: dom.window.Node, configurable: true },
  Element: { value: dom.window.Element, configurable: true },
  getComputedStyle: { value: dom.window.getComputedStyle.bind(dom.window), configurable: true },
});
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
(globalThis as typeof globalThis & { React: typeof React }).React = React;
const { createRoot } = await import("react-dom/client");

type Content = Record<string, any>;

function ControlledEditor({ kind, initial, onContent }: {
  kind: CmsDocumentKind;
  initial: Content;
  onContent: (content: Content) => void;
}) {
  const [content, setContent] = React.useState(initial);
  const handleChange = (next: Content) => {
    onContent(next);
    setContent(next);
  };

  return React.createElement(ContentEditor, {
    kind,
    value: content,
    onChange: handleChange,
    errors: [],
  });
}

async function renderEditor(kind: CmsDocumentKind, initial: Content) {
  let current = initial;
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
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
          kind,
          initial,
          onContent: (next) => {
            current = next;
          },
        }),
      ),
    );
  });

  return {
    container,
    content: () => current,
    unmount: async () => {
      await React.act(async () => root.unmount());
      queryClient.clear();
      container.remove();
    },
  };
}

function input(container: HTMLElement, label: string, index: number) {
  const found = container.querySelector<HTMLInputElement>(`input[aria-label="${label} ${index + 1}"]`);
  assert.ok(found, `${label} row ${index + 1} should be rendered`);
  return found;
}

function buttonWithText(container: ParentNode, text: string) {
  const found = [...container.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent === text);
  assert.ok(found, `${text} button should be rendered`);
  return found;
}

async function addItem(container: HTMLElement, label: string) {
  const section = input(container, label, 0).closest("section");
  assert.ok(section);
  await React.act(async () => buttonWithText(section, "Add item").click());
}

async function typeItem(container: HTMLElement, label: string, index: number, value: string) {
  const field = input(container, label, index);
  const setValue = Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, "value")!.set!;
  await React.act(async () => {
    setValue.call(field, value);
    field.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
}

async function removeItem(container: HTMLElement, label: string, index: number) {
  const row = input(container, label, index).parentElement;
  assert.ok(row);
  await React.act(async () => buttonWithText(row, "Remove").click());
}

const platformContent = {
  schemaVersion: 1,
  category: "Enterprise AI",
  summary: "A governed platform.",
  template: "standard",
  sections: [],
  capabilities: ["First", "Second"],
  differentiators: [],
  visibility: "public",
  order: 0,
  sources: [],
  relatedIds: [],
};

const caseStudyContent = {
  schemaVersion: 1,
  variant: "summary",
  disclosure: "restricted",
  sector: "Financial Services",
  organizationDescriptor: "Regulated financial institution",
  engagementType: "client-delivery",
  deliveryStage: "proof-of-concept",
  impactClassification: "pilot-demo",
  impactStatement: "The proof of concept demonstrated the workflow.",
  disclosureNote: "Identity and interface data are withheld.",
  publicEvidenceStatus: "approved",
  relatedIndustries: ["financial-services"],
  visual: {
    kind: "illustrative-interface-reconstruction",
    caption: "Illustrative reconstruction.",
    altText: "An anonymized workflow interface.",
    textEquivalent: "A workflow with a human approval gate.",
    template: "workflow-console",
    fixtureLabels: ["Example organization"],
  },
  mandate: "A mandate.",
  constraints: [],
  work: [],
  controls: [],
  outcomes: ["First", "Second"],
  evidence: [],
  visibility: "public",
  order: 0,
  sources: [],
  relatedIds: [],
};

test("platform ContentEditor retains an added row through its controlled parent and save validation", async () => {
  const editor = await renderEditor("platform", platformContent);
  try {
    await addItem(editor.container, "Capabilities");
    assert.equal(input(editor.container, "Capabilities", 2).value, "");
    assert.deepEqual(editor.content().capabilities, ["First", "Second", ""]);

    await typeItem(editor.container, "Capabilities", 2, "  Third capability  ");
    assert.equal(input(editor.container, "Capabilities", 2).value, "  Third capability  ");
    assert.deepEqual(editor.content().capabilities, ["First", "Second", "  Third capability  "]);

    await removeItem(editor.container, "Capabilities", 0);
    assert.deepEqual(
      [...editor.container.querySelectorAll<HTMLInputElement>('input[aria-label^="Capabilities "]')].map((node) => node.value),
      ["Second", "  Third capability  "],
    );

    const validated = validateCmsContent("platform", editor.content(), "draft");
    assert.equal(validated.success, true);
    assert.deepEqual(validated.success && (validated.data as Content).capabilities, ["Second", "Third capability"]);
  } finally {
    await editor.unmount();
  }
});

test("case-study ContentEditor retains an added row through its controlled parent and save validation", async () => {
  const editor = await renderEditor("case-study", caseStudyContent);
  try {
    await addItem(editor.container, "Outcomes");
    assert.equal(input(editor.container, "Outcomes", 2).value, "");
    assert.deepEqual(editor.content().outcomes, ["First", "Second", ""]);

    await typeItem(editor.container, "Outcomes", 2, "  Third outcome  ");
    assert.equal(input(editor.container, "Outcomes", 2).value, "  Third outcome  ");

    await removeItem(editor.container, "Outcomes", 1);
    assert.deepEqual(
      [...editor.container.querySelectorAll<HTMLInputElement>('input[aria-label^="Outcomes "]')].map((node) => node.value),
      ["First", "  Third outcome  "],
    );

    const validated = validateCmsContent("case-study", editor.content(), "draft");
    assert.equal(validated.success, true);
    assert.deepEqual(validated.success && (validated.data as Content).outcomes, ["First", "Third outcome"]);
  } finally {
    await editor.unmount();
  }
});