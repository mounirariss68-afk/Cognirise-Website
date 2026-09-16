import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ContentEditor } from "./ContentEditor";
import { OverridesContext } from "./OverridesContext";
import { buildDocumentReadiness } from "./document-readiness";

(globalThis as typeof globalThis & { React: typeof React }).React = React;

function renderOffice(canEdit: boolean, publicationErrors: string[] = []) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <OverridesContext.Provider value={{
        isAdapted: true, canEdit, operations: [{ op: "set", path: "content.address", value: "Local address" }],
        onReset: () => {},
      }}>
        <ContentEditor kind="office" value={{ schemaVersion: 1, city: "Local city", address: "Local address" }}
          onChange={() => {}} errors={[]} publicationErrors={publicationErrors} />
      </OverridesContext.Provider>
    </QueryClientProvider>,
  );
}

function renderOfficePresentation(presentation: "content" | "settings") {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <OverridesContext.Provider value={{ isAdapted: false, canEdit: true, operations: [] }}>
        <ContentEditor
          kind="office"
          value={{ schemaVersion: 1, city: "Local city", address: "Local address", visibility: "public", order: 3 }}
          onChange={() => {}}
          errors={[]}
          presentation={presentation}
        />
      </OverridesContext.Provider>
    </QueryClientProvider>,
  );
}

test("regional office address exposes a field-specific shared restoration control", () => {
  const html = renderOffice(true);
  assert.match(html, /Restore Full postal address to shared content/);
  assert.match(html, /Local address/);
  assert.doesNotMatch(html, /Restore City to shared content/);
});

test("read-only regional fields cannot restore content", () => {
  const html = renderOffice(false);
  assert.match(html, /disabled=""[^>]*aria-label="Restore Full postal address to shared content"/);
});

test("publication validation appears beside the field without becoming a draft-save error", () => {
  const html = renderOffice(true, ["content.address: Check postal address before publication."]);
  assert.match(html, /aria-invalid="true"/);
  assert.match(html, /Check postal address before publication/);
  assert.doesNotMatch(html, /need attention before saving/);
});

test("content and settings presentations keep public writing separate from governance", () => {
  const content = renderOfficePresentation("content");
  assert.match(content, /Full postal address/);
  assert.doesNotMatch(content, /Governance and ordering/);
  assert.doesNotMatch(content, /Historical verification date/);

  const settings = renderOfficePresentation("settings");
  assert.doesNotMatch(settings, /Full postal address/);
  assert.match(settings, /Governance and ordering/);
  assert.match(settings, /Historical verification date/);
  assert.match(settings, /data-field-path="content\.verificationDate"/);
});

function renderEditor(kind: Parameters<typeof ContentEditor>[0]["kind"], value: Record<string, unknown>) {
  return renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
      <OverridesContext.Provider value={{ isAdapted: false, canEdit: true, operations: [] }}>
        <ContentEditor kind={kind} value={value} onChange={() => {}} errors={[]} />
      </OverridesContext.Provider>
    </QueryClientProvider>,
  );
}

test("hero-film, advertised media, and case CTA controls expose stored field paths", () => {
  const site = renderEditor("site-configuration", {
    schemaVersion: 1,
    page: "homepage",
    hero: {
      posterMediaId: "11111111-1111-4111-8111-111111111111",
      posterMediaVersionId: "22222222-2222-4222-8222-222222222222",
      sources: [
        { mediaId: "33333333-3333-4333-8333-333333333333", mediaVersionId: "44444444-4444-4444-8444-444444444444", mimeType: "video/mp4" },
        { mediaId: "55555555-5555-4555-8555-555555555555", mediaVersionId: "66666666-6666-4666-8666-666666666666", mimeType: "video/webm" },
      ],
    },
  });
  assert.match(site, /Hero MP4 source/);
  assert.match(site, /Hero WebM source/);
  assert.match(site, /data-field-path="content\.hero\.posterMediaId"/);

  const caseStudy = renderEditor("case-study", { schemaVersion: 1, cta: { label: "Contact", href: "/contact" } });
  assert.match(caseStudy, /data-field-path="content\.cta\.label"/);
  assert.match(caseStudy, /data-field-path="content\.cta\.href"/);

  const landing = renderEditor("landing-page", { schemaVersion: 1, visualReferences: [] });
  assert.match(landing, /data-field-path="content\.visualReferences"/);

  const industry = renderEditor("industry", { schemaVersion: 1, supportingMedia: [] });
  assert.match(industry, /data-field-path="content\.supportingMedia"/);
});

test("legacy media readiness focuses the actual kind-specific picker", () => {
  const issues = buildDocumentReadiness({
    kind: "site-configuration", title: "Homepage hero", content: {
      schemaVersion: 1, page: "homepage", hero: { posterMediaId: "", posterMediaVersionId: "", sources: [] },
    }, mediaIds: [],
  });
  assert.ok(issues.some((issue) => issue.path === "content.hero.posterMediaId"));
  assert.ok(!issues.some((issue) => issue.path === "content.media"));
});