import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { PlatformContent, PublicationContent } from "@workspace/api-zod";
import { resolveCmsMedia, resolvePinnedCmsMedia } from "@/lib/cms";

// The application Vite transform supplies the automatic JSX runtime. The
// direct SSR test runs through tsx, so expose the legacy JSX global before the
// presentation module is loaded.
(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as unknown as { location: { pathname: string; search: string } }).location = {
  pathname: "/",
  search: "",
};
const { PlatformPresentation, PublicationPresentation } = await import("./cms/PublicCmsPresentations");

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
    <PlatformPresentation title="Platform title" content={platformContent} summary={platformContent.summary} />,
  );
  assert.match(html, /<ol[^>]*list-decimal/);
  assert.match(html, /<li>One<\/li><li>Two<\/li>/);
  assert.match(html, /<blockquote[^>]*>.*A precise customer quote\..*<cite[^>]*>Named customer<\/cite>/);
  assert.doesNotMatch(html, /<ul[^>]*>.*One/);
});

test("platform presentation renders the exact saved detail summary instead of card copy", () => {
  const exactPreviewSummary = "TASK345-KSA-MARKER-1";
  const staleContent = {
    ...platformContent,
    summary: exactPreviewSummary,
  };
  const html = renderToStaticMarkup(
    <PlatformPresentation
      title="Platform title"
      content={staleContent}
      summary="Stale platform card summary."
      preview
    />,
  );
  assert.match(html, new RegExp(exactPreviewSummary));
  assert.doesNotMatch(html, /Stale platform card summary\./);
});

test("platform preview does not resurrect card summary when exact detail copy is empty", () => {
  const html = renderToStaticMarkup(
    <PlatformPresentation
      title="Platform title"
      content={{ ...platformContent, summary: "" }}
      summary="Stale platform card summary."
      preview
    />,
  );
  assert.doesNotMatch(html, /Stale platform card summary\./);
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

test("public and protected publication previews render the exact resolved hero version", () => {
  const heroReference = {
    mediaId: "hero-a",
    mediaVersionId: "hero-a-approved",
    role: "hero" as const,
    altText: "Approved hero A",
  };
  const media = [
    {
      id: "hero-a",
      versionId: "hero-a-old",
      url: "/api/public/media/hero-a/hero-a-old",
      altText: "Old hero A",
    },
    {
      id: "hero-a",
      versionId: "hero-a-approved",
      url: "/api/public/media/hero-a/hero-a-approved",
      altText: "Approved hero A",
    },
    {
      id: "hero-b",
      versionId: "hero-b-approved",
      url: "/api/public/media/hero-b/hero-b-approved",
      altText: "Approved hero B",
    },
  ] as any;
  const publicHero = resolveCmsMedia(media, heroReference, "hero-a");
  const previewHero = resolvePinnedCmsMedia(media, heroReference);

  assert.equal(publicHero?.url, "/api/public/media/hero-a/hero-a-approved");
  assert.equal(previewHero?.url, "/api/public/media/hero-a/hero-a-approved");

  for (const [preview, resolvedHero] of [[false, publicHero], [true, previewHero]] as const) {
    const html = renderToStaticMarkup(
      <PublicationPresentation
        title="Publication title"
        content={{ ...publicationContent, heroMedia: heroReference }}
        heroMedia={resolvedHero}
        preview={preview}
      />,
    );
    assert.match(html, /data-testid="publication-hero"/);
    assert.match(html, /src="\/api\/public\/media\/hero-a\/hero-a-approved"/);
    assert.doesNotMatch(html, /hero-a-old|hero-b-approved|latest|fallback/);
  }
});

test("publication hero is optional and does not render a replacement image", () => {
  const html = renderToStaticMarkup(
    <PublicationPresentation title="Publication title" content={publicationContent} />,
  );
  assert.doesNotMatch(html, /data-testid="publication-hero"/);
  assert.doesNotMatch(html, /<img/);
});