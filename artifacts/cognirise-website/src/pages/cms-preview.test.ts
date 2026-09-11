import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

const pageUrl = new URL("./CmsPreview.tsx", import.meta.url);
const layoutUrl = new URL("./AgentAuthorityModel.tsx", import.meta.url);
const cmsUrl = new URL("../lib/cms.ts", import.meta.url);

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
  assert.match(dynamicSitemap, /enabled: !isPreview/);
  assert.match(dynamicSitemap, /if \(isPreview\) return;/);
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

test("all valid industry snapshots use a production renderer for their exact market", async () => {
  const [preview, cms] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(cmsUrl, "utf8"),
  ]);

  assert.match(preview, /preview\.kind === "industry"/);
  assert.match(preview, /resolvePreviewIndustryMedia\(content, preview\.media\)/);
  assert.match(preview, /<IndustryEditorialView/);
  assert.match(preview, /marketOverride=\{previewMarket\}/);
  assert.match(preview, /<BankingEditorial/);
  assert.match(preview, /media\.content\.bankingPov/);
  assert.match(preview, /content\.bankingPov\.market !== preview\.requestedMarket/);
  assert.match(preview, /media: preview\.media/);
  assert.match(cms, /educationPov\?\.version === 2/);
  assert.match(cms, /educatorPractice", "researchCoordination/);
  assert.match(cms, /scene\.src = resolved\.url/);
  assert.match(cms, /resolvePinnedCmsMedia/);
  assert.doesNotMatch(preview, /useCmsCollection<PublicCaseStudy>|useListPublishedContent|CaseStudyRail|IndustryEvidenceRail/);
  assert.doesNotMatch(preview, /from ["']@\/content\/banking/);
  assert.match(preview, /canonicalUrl: null, noIndex: true/);
});

test("industry previews fail closed on malformed drafts or unavailable pinned media", async () => {
  const preview = await readFile(pageUrl, "utf8");

  assert.match(preview, /if \(!validation\.success\)/);
  assert.match(preview, /cannot be completed from public content/);
  assert.match(preview, /if \(missingMedia\.length\)/);
  assert.match(preview, /has not been completed with public media/);
  assert.match(preview, /function isPreview\(value: unknown\)/);
  assert.doesNotMatch(preview, /useGetPublishedContent|useCmsEntry|useListPublishedContent/);
});

test("preview refreshes are cancellable and parent focus messages are narrowly scoped", async () => {
  const [preview, cms] = await Promise.all([
    readFile(pageUrl, "utf8"),
    readFile(cmsUrl, "utf8"),
  ]);

  assert.match(preview, /const controller = new AbortController\(\)/);
  assert.match(preview, /signal: controller\.signal/);
  assert.match(preview, /window\.setInterval\(\(\) => void load\(\), 30_000\)/);
  assert.match(preview, /currentRequest !== requestNumber/);
  assert.match(preview, /controller\.abort\(\)/);
  assert.match(preview, /window\.parent === window[\s\S]*event\.origin !== window\.location\.origin[\s\S]*event\.source !== window\.parent/);
  assert.match(preview, /isIndustryPreviewFocusMessage\(event\.data\)/);
  assert.match(preview, /\[data-industry-section="\$\{event\.data\.section\}"\]/);
  assert.match(cms, /INDUSTRY_PREVIEW_SECTION_IDS/);
  assert.match(cms, /Object\.keys\(message\)\.every/);
});

test("embedded previews report only their opaque availability state to the same-origin parent", async () => {
  const preview = await readFile(pageUrl, "utf8");

  assert.match(preview, /type IndustryPreviewStatus = "ready" \| "unavailable" \| "expired" \| "revoked"/);
  assert.match(preview, /error\?\.kind === "revoked"/);
  assert.match(preview, /error\?\.kind === "expired"/);
  assert.match(preview, /window\.parent === window \|\| lastPreviewStatus\.current === previewStatus/);
  assert.match(preview, /\{ type: "industry-preview-status", status: previewStatus \}/);
  assert.match(preview, /window\.location\.origin/);
  assert.doesNotMatch(
    preview.slice(preview.indexOf('type: "industry-preview-status"'), preview.indexOf('type: "industry-preview-status"') + 120),
    /token|revision|document|message/,
  );
});