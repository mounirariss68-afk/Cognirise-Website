import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { frameworkContentSchema } from "@workspace/api-zod";
import { guardrailsFixture } from "../../../../scripts/src/cms/guardrails-fixture";
import { applyMetadata } from "@/lib/metadata";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
const location = { origin: "http://127.0.0.1", pathname: "/methodologies/guardrails-framework", search: "", hash: "" };
Object.assign(globalThis, { window: { location, localStorage: { getItem() { return null; } }, addEventListener() {}, removeEventListener() {} }, location });
const { GuardrailsLayout, guardrailsMetadata } = await import("./GuardrailsFramework");
const content = frameworkContentSchema.parse(guardrailsFixture.content);
if (content.template !== "guardrails") throw new Error("Wrong test template");
const framework = {
  ...content, id: "guardrails-render-test", title: guardrailsFixture.title,
  slug: guardrailsFixture.slug, summary: guardrailsFixture.summary, seo: guardrailsFixture.seo,
  media: [], publishedAt: "", updatedAt: "", market: "uae", requestedMarket: "uae", usedFallback: false,
};
const decode = (text: string) => text.replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
const plain = (text: string) => decode(text.replace(/<\/(?:p|div|td|th|h[1-6]|li|section|header|button)>/g, "$& ").replace(/<[^>]+>/g, ""));
const unmark = (text: string) => text.replace(/\*/g, "").replace(/\s+/g, " ").trim();
const structural = new Set(["id", "href", "template", "visibility", "thresholdAfter", "enforcementLayer", "additionId", "destination", "relatedLink", "sources", "relatedIds"]);
function editorial(value: unknown, path = ""): Array<[string, string]> {
  if (typeof value === "string") return value.split(" · ").map((part) => [path, part]);
  if (Array.isArray(value)) return value.flatMap((item, index) => editorial(item, `${path}.${index}`));
  if (value && typeof value === "object") return Object.entries(value).filter(([key]) => !structural.has(key)).flatMap(([key, item]) => editorial(item, `${path}.${key}`));
  return [];
}

test("Guardrails renders every governed editorial field before interaction", () => {
  const html = renderToStaticMarkup(<GuardrailsLayout framework={framework} renderPolicy="cms" preview />);
  const rendered = plain(html);
  const missing = editorial(content).filter(([path, value]) => {
    // Figure title/description may be carried by accessible attributes.
    const haystack = /\.diagram\.(title|description)$/.test(path) ? decode(html) : rendered;
    return !haystack.includes(unmark(value));
  });
  assert.deepEqual(missing, []);
  assert.doesNotMatch(rendered, /\*\*|\*how much\*|\[ILLUSTRATION|Section heading:/);
  assert.match(html, /<strong[^>]*>Authority is the <em/);
  const levels = [...html.matchAll(/<h([1-6])\b/g)].map((match) => Number(match[1]));
  assert.equal(levels.filter((level) => level === 1).length, 1);
  for (let i = 1; i < levels.length; i++) assert.ok(levels[i] <= levels[i - 1] + 1, `Heading level skipped: ${levels[i - 1]} to ${levels[i]}`);
});

test("absent Guardrails content never renders compiled prose", () => {
  for (const renderPolicy of ["unavailable", "compiled-fallback", "cms"] as const) {
    assert.doesNotMatch(renderToStaticMarkup(<GuardrailsLayout framework={null} renderPolicy={renderPolicy} />), /A guardrail is only as strong as/);
  }
});

test("loading and unavailable document heads remove canonical and exclude reviewed SEO", () => {
  class HeadElement {
    attributes: Record<string, string> = {};
    rel = "";
    href = "";
    constructor(public tag: string) {}
    setAttribute(key: string, value: string) { this.attributes[key] = value; }
    remove() { elements.splice(elements.indexOf(this), 1); }
  }
  const elements: HeadElement[] = [];
  const document = {
    title: "",
    createElement: (tag: string) => new HeadElement(tag),
    head: {
      appendChild: (node: HeadElement) => elements.push(node),
      querySelector: (selector: string) => {
        const match = selector.match(/^(\w+)\[([^=]+)="([^"]+)"\]$/)!;
        return elements.find((node) => node.tag === match[1]
          && (match[2] === "rel" ? node.rel : node.attributes[match[2]]) === match[3]) ?? null;
      },
    },
  };
  Object.assign(globalThis, { document });
  for (const policy of ["loading", "unavailable", "compiled-fallback"] as const) {
    // Start from a delivered record to verify stale head values are removed.
    applyMetadata(guardrailsMetadata(framework, "cms"));
    assert.equal(document.title, guardrailsFixture.seo.title);
    applyMetadata(guardrailsMetadata(framework, policy));
    assert.equal(document.head.querySelector('meta[name="robots"]')?.attributes.content, "noindex,nofollow");
    assert.equal(document.head.querySelector('link[rel="canonical"]'), null);
    assert.equal(document.title, "Content unavailable | Cognirise");
    assert.doesNotMatch(JSON.stringify(elements), /Most AI guardrails|Set, Prove|guardrails-framework/);
  }
  assert.equal(guardrailsMetadata(null, "cms").noIndex, true);
  assert.equal(guardrailsMetadata(framework, "cms", true).canonicalUrl, null);
});