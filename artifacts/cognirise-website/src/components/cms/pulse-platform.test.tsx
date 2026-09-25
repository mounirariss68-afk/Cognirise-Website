import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  cognibasePulseDraftContent,
  cogniagentsPulseDraftContent,
  type PlatformContent,
} from "@workspace/api-zod";

(globalThis as typeof globalThis & { React: typeof React }).React = React;
(globalThis as unknown as { location: { pathname: string; search: string } }).location = {
  pathname: "/", search: "",
};

const { pulsePlatformVariant, platformPreviewPresentation, PulsePlatformPresentation } = await import("./pulse-platform");

test("specialist selection requires canonical slug, matching template, and complete validated payload", () => {
  const base = cognibasePulseDraftContent as PlatformContent;
  assert.equal(pulsePlatformVariant("cognibase", base), "cognibase-pulse");
  assert.equal(pulsePlatformVariant("another-platform", base), null);
  assert.equal(pulsePlatformVariant("cognibase", { ...base, template: "standard" }), null);
  assert.equal(pulsePlatformVariant("cognibase", { ...base, pulsePage: { ...base.pulsePage!, sections: [] } } as PlatformContent), null);
  assert.equal(pulsePlatformVariant("cogniagents", cogniagentsPulseDraftContent as PlatformContent), "cogniagents-pulse");
});

test("an incomplete or slug-mismatched Pulse preview fails closed; standard keeps its generic renderer", () => {
  const base = structuredClone(cognibasePulseDraftContent) as PlatformContent;
  assert.equal(platformPreviewPresentation("cognibase", base), "cognibase-pulse");
  assert.equal(platformPreviewPresentation("another-platform", base), "invalid-pulse");
  assert.equal(platformPreviewPresentation("cogniagents", base), "invalid-pulse");
  assert.equal(platformPreviewPresentation("cognibase", { ...base, pulsePage: undefined }), "invalid-pulse");
  assert.equal(platformPreviewPresentation("cognibase", { ...base, pulsePage: { ...base.pulsePage!, sections: [] } } as PlatformContent), "invalid-pulse");
  assert.equal(platformPreviewPresentation("another-platform", { ...base, template: "standard", pulsePage: undefined }), "standard");
});

test("every edited foundation item body is visible in protected preview and public composition", () => {
  const content = structuredClone(cogniagentsPulseDraftContent) as PlatformContent;
  const foundation = content.pulsePage!.sections.find(section => section.id === "foundation")!;
  foundation.items.forEach((item, index) => { item.body = `Edited foundation detail ${index + 1}`; });
  for (const preview of [true, false]) {
    const html = renderToStaticMarkup(<PulsePlatformPresentation slug="cogniagents" content={content} preview={preview} />);
    for (let index = 1; index <= foundation.items.length; index++) {
      assert.match(html, new RegExp(`Edited foundation detail ${index}(?!\\d)`));
    }
  }
});

for (const [slug, original] of [
  ["cognibase", cognibasePulseDraftContent],
  ["cogniagents", cogniagentsPulseDraftContent],
] as const) {
  test(`${slug} uses the saved copy, ordered sections and visibility without compiled fallbacks`, () => {
    const content = structuredClone(original) as PlatformContent;
    const page = content.pulsePage!;
    const originalFirst = page.sections[0].heading;
    page.hero.headline = "A fully governed headline.";
    page.diagram.labels[0].text = "GOVERNED DIAGRAM LABEL";
    page.closing.footerRight = "GOVERNED FOOTER";
    page.sections[0].heading = "FIRST SECTION MARKER";
    page.sections[1].heading = "SECOND SECTION MARKER";
    page.sections[3].visible = false;
    page.sectionOrder = [page.sectionOrder[1], page.sectionOrder[0], ...page.sectionOrder.slice(2)];
    const html = renderToStaticMarkup(<PulsePlatformPresentation slug={slug} content={content} preview />);
    assert.match(html, /A fully governed headline/);
    assert.match(html, /GOVERNED DIAGRAM LABEL/);
    assert.match(html, /GOVERNED FOOTER/);
    assert.ok(html.indexOf("SECOND SECTION MARKER") < html.indexOf("FIRST SECTION MARKER"));
    assert.doesNotMatch(html, new RegExp(originalFirst.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(html, new RegExp(page.sections[3].heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(html, /data-preview="draft"/);
  });
}