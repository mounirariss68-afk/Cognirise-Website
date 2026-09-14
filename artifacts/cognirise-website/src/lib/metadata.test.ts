import assert from "node:assert/strict";
import test from "node:test";
import { guardrailsMetadata } from "../pages/GuardrailsFramework";
import { applyMetadata, type PageMetadata } from "./metadata";

class HeadElement {
  private readonly attributes = new Map<string, string>();
  parent: Head | undefined;

  constructor(readonly tagName: string) {}

  setAttribute(name: string, value: string) {
    this.attributes.set(name, value);
  }

  getAttribute(name: string) {
    return this.attributes.get(name) ?? null;
  }

  remove() {
    this.parent?.removeChild(this);
  }
}

class Head {
  readonly children: HeadElement[] = [];

  appendChild(element: HeadElement) {
    element.parent = this;
    this.children.push(element);
    return element;
  }

  removeChild(element: HeadElement) {
    const index = this.children.indexOf(element);
    if (index >= 0) this.children.splice(index, 1);
  }

  querySelector<T extends HeadElement>(selector: string): T | null {
    const match = selector.match(/^([a-z]+)\[([^=]+)="([^"]+)"\]$/);
    if (!match) return null;
    const [, tagName, attribute, value] = match;
    return (this.children.find((element) =>
      element.tagName === tagName && element.getAttribute(attribute) === value
    ) as T | undefined) ?? null;
  }
}

class DocumentHeadHarness {
  title = "";
  readonly head = new Head();

  createElement(tagName: string) {
    return new HeadElement(tagName);
  }
}

function withDocument(callback: (document: DocumentHeadHarness) => void) {
  const runtime = globalThis as typeof globalThis & { document?: unknown };
  const previousDocument = runtime.document;
  const document = new DocumentHeadHarness();
  runtime.document = document;
  try {
    callback(document);
  } finally {
    if (previousDocument === undefined) delete runtime.document;
    else runtime.document = previousDocument;
  }
}

function socialImageContent(document: DocumentHeadHarness, selector: string) {
  return document.head.querySelector(selector)?.getAttribute("content") ?? null;
}

function assertSocialImages(document: DocumentHeadHarness, expected: string | null) {
  assert.equal(socialImageContent(document, 'meta[property="og:image"]'), expected);
  assert.equal(socialImageContent(document, 'meta[name="twitter:image"]'), expected);
}

const populatedMetadata: PageMetadata = {
  title: "Published guardrails",
  description: "A published methodology.",
  canonicalUrl: null,
  imageUrl: "https://cdn.example.test/guardrails.jpg",
};

test("DOM head transitions clear both social images for generic preview, loading, and unavailable states", () => {
  withDocument((document) => {
    applyMetadata(populatedMetadata);
    assertSocialImages(document, populatedMetadata.imageUrl!);

    const transitions: Array<[string, PageMetadata]> = [
      ["generic preview", {
        title: "Draft preview | Cognirise",
        description: "Protected CMS draft preview.",
        canonicalUrl: null,
        noIndex: true,
      }],
      ["loading", guardrailsMetadata(null, "loading")],
      ["unavailable", guardrailsMetadata(null, "unavailable")],
    ];

    for (const [state, metadata] of transitions) {
      applyMetadata(metadata);
      assertSocialImages(document, null);
      assert.equal(document.title, metadata.title, `${state} should update the document title`);
    }
  });
});

test("an unresolved Guardrails social image version cannot retain the previous image", () => {
  const metadata = guardrailsMetadata({
    template: "guardrails",
    title: "Guardrails",
    summary: "Governed methodology.",
    media: [{ id: "social", versionId: "social-v1", url: "/social-v1.jpg" }],
    seo: {
      title: "Guardrails",
      description: "Governed methodology.",
      noIndex: false,
      ogImageMedia: { mediaId: "social", mediaVersionId: "missing", role: "og-image" },
    },
  } as never, "cms");

  assert.equal(metadata.imageUrl, undefined);

  withDocument((document) => {
    applyMetadata(populatedMetadata);
    applyMetadata(metadata);
    assertSocialImages(document, null);
  });
});