import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PlatformContent, PublicationContent } from "@workspace/api-zod";

// The application Vite transform supplies the automatic JSX runtime. The
// direct SSR test runs through tsx, so expose the legacy JSX global before the
// presentation module is loaded.
(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as unknown as { location: { pathname: string; search: string } }).location = {
  pathname: "/",
  search: "",
};
const { PlatformPresentation, PublicationPresentation } = await import("./PublicCmsPresentations");

const platformContent = {
  schemaVersion: 1,
  category: "Platform",
  summary: "A structured platform summary.",
  template: "standard",
  sections: [{
    heading: "How it works",
    body: [
      { type: "paragraph", text: "First paragraph." },
      { type: "list", style: "numbered", items: ["One", "Two"] },
      { type: "quote", text: "A precise customer quote.", attribution: "Named customer" },
    ],
  }],
  capabilities: [],
  differentiators: [],
  cta: undefined,
  visibility: "public",
  order: 0,
  sources: [],
  verificationDate: undefined,
  reviewDate: undefined,
  relatedIds: [],
} as PlatformContent;

const publicationContent = {
  schemaVersion: 1,
  variant: "article",
  teaser: "An article teaser.",
  body: [
    { type: "paragraph", text: "The article lead." },
    { type: "list", style: "numbered", items: ["A", "B"] },
    { type: "quote", text: "The article quote.", attribution: "Article source" },
  ],
  author: "Author",
  publicationDate: "2025-01-01",
  updatedDate: undefined,
  readingTimeMinutes: 4,
  topics: [],
  sectors: [],
  platformIds: [],
  heroMedia: undefined,
  heroMediaId: undefined,
  pdfMedia: undefined,
  pdfMediaId: undefined,
  social: {},
  visibility: "public",
  order: 0,
  sources: [],
  verificationDate: undefined,
  reviewDate: undefined,
  relatedIds: [],
} as PublicationContent;

test("platform rendering preserves rich list styles and quote attribution", () => {
  const html = renderToStaticMarkup(
    <PlatformPresentation title="Platform title" content={platformContent} />,
  );
  assert.match(html, /<ol[^>]*list-decimal/);
  assert.match(html, /<li>One<\/li><li>Two<\/li>/);
  assert.match(html, /<blockquote[^>]*>.*A precise customer quote\..*<cite[^>]*>Named customer<\/cite>/);
  assert.doesNotMatch(html, /<ul[^>]*>.*One/);
});

test("publication rendering shares the lossless rich renderer and keeps the lead treatment", () => {
  const html = renderToStaticMarkup(
    <PublicationPresentation title="Publication title" content={publicationContent} />,
  );
  assert.match(html, /<p class="lead">The article lead\.<\/p>/);
  assert.match(html, /<ol[^>]*list-decimal/);
  assert.match(html, /<blockquote[^>]*>.*The article quote\..*<cite[^>]*>Article source<\/cite>/);
  assert.doesNotMatch(html, /<ul[^>]*>.*A/);
});