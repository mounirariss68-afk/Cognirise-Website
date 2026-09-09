import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pageUrl = new URL("./CmsPreview.tsx", import.meta.url);
const layoutUrl = new URL("./AgentAuthorityModel.tsx", import.meta.url);

test("framework previews use the buyer layout without a public CMS request", async () => {
  const [preview, layout] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(layoutUrl, "utf8"),
  ]);

  assert.match(preview, /<AgentAuthorityLayout framework=\{framework\} preview \/>/);
  assert.match(layout, /export function AgentAuthorityLayout/);
  assert.match(layout, /canonicalUrl: null/);
  assert.match(layout, /noIndex: true/);
  assert.match(layout, /preview \? \{/);
});

test("framework preview keeps warnings and a responsive draft banner visible", async () => {
  const preview = await readFile(pageUrl, "utf8");

  assert.match(preview, /Protected draft preview — not published/);
  assert.match(preview, /role="alert"/);
  assert.match(preview, /Media unavailable:/);
  assert.match(preview, /flex-col[\s\S]*sm:flex-row/);
  assert.match(preview, /preview\.media/);
});

test("preview capability URLs are absent from public sitemap sources", async () => {
  const [staticSitemap, dynamicSitemap] = await Promise.all([
    readFile(new URL("../../public/sitemap.xml", import.meta.url), "utf8"),
    readFile(new URL("../components/PublicSitemap.tsx", import.meta.url), "utf8"),
  ]);

  assert.doesNotMatch(staticSitemap, /\/preview\//);
  assert.doesNotMatch(dynamicSitemap, /\/preview\//);
});

test("office previews reuse the public contact card and keep phone optional", async () => {
  const [preview, contact, card] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(new URL("./Contact.tsx", import.meta.url), "utf8"),
    readFile(new URL("../components/OfficeContactCard.tsx", import.meta.url), "utf8"),
  ]);

  assert.match(preview, /preview\.kind === "office"/);
  assert.match(preview, /<OfficeContactCard city=\{office\.city\} address=\{office\.address\} phone=\{office\.phone\} \/>/);
  assert.match(contact, /<OfficeContactCard key=/);
  assert.match(card, /\{phone \? \(/);
  assert.match(card, /href=\{`tel:\$\{phone\}`\}/);
});
