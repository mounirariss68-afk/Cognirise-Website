import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { editionAuthoringActions, selectInitialExactEdition } from "./edition-authoring.ts";
import type { DocumentEdition } from "@workspace/api-client-react";

const adminRoot = new URL("../../../", import.meta.url);

test("guided editor exposes readiness and exact edition controls", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /documentReadiness/);
  assert.match(detail, /Market \+ locale matrix/);
  assert.match(detail, /market: selectedMarket/);
  assert.match(detail, /locale: selectedLocale/);
  assert.match(detail, /revisionId: previewRevisionId/);
  assert.match(detail, /useListDocumentEditions/);
  assert.match(detail, /useCreateDocumentEditionOverride/);
  assert.match(detail, /revision\.market === selectedMarket && revision\.locale === selectedLocale/);
  assert.match(detail, /useGetDocument\(id!, documentParams/);
  assert.match(detail, /window\.open\(result\.data\.previewUrl/);
  assert.doesNotMatch(detail, /\/cognirise-website/);
  assert.doesNotMatch(detail, /UAE\/English edition/);
});

test("content editor chooses governed media instead of accepting copied IDs", async () => {
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8");
  const mediaField = await readFile(new URL("src/pages/documents/MediaField.tsx", adminRoot), "utf8");
  assert.match(editor, /<MediaField label="Case-study hero image"/);
  assert.doesNotMatch(editor, /label="Hero media ID"/);
  assert.match(editor, /legacyMediaId=\{value\.heroMediaId\}/);
  assert.match(mediaField, /value\?\.mediaId \?\? legacyMediaId/);
  assert.match(mediaField, /\["ready", "active"\]\.includes/);
  assert.match(mediaField, /versionId/);
  assert.match(mediaField, /mediaVersionId: asset\.versionId/);
  assert.match(editor, /value=\{value\.heroMedia\}/);
  assert.match(mediaField, /Only approved, versioned/);
});

test("landing and complex records use structured controls rather than JSON or pipe input", async () => {
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8");
  assert.match(editor, /<LandingSections value=\{value\.sections\}/);
  assert.match(editor, /<RecordList label="Sector examples"/);
  assert.doesNotMatch(editor, /Structured sections \(one JSON object per line\)/);
  assert.doesNotMatch(editor, /Visual media references \(one JSON object per line\)/);
  assert.equal(editor.includes('split("|")'), false);
});

test("repeatable plain lists use add and remove controls", async () => {
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8");
  assert.match(editor, /function StringList/);
  assert.match(editor, />Add item</);
  assert.match(editor, />Remove</);
  assert.match(editor, /<StringList label="Outcomes"/);
});

const edition = (market: string, workflowState: string, revisionId = `${market}-revision`): DocumentEdition => ({
  market,
  locale: market === "ksa" ? "ar-SA" : "en-US",
  exact: true,
  effectiveMarket: null,
  effectiveLocale: null,
  usedFallback: false,
  fallbackReason: null,
  publicationState: null,
  workflowState,
  revisionId,
  revisionNumber: 1,
  effectivePublicationState: null,
  effectiveWorkflowState: null,
  effectiveRevisionId: null,
  effectiveRevisionNumber: null,
  ready: true,
  readinessErrors: [],
});

test("initial selection opens an assigned non-UAE exact edition with its locale", () => {
  const selected = selectInitialExactEdition(
    [edition("uae", "draft"), edition("ksa", "draft")],
    "editor",
    ["ksa"],
  );
  assert.equal(selected?.market, "ksa");
  assert.equal(selected?.locale, "ar-SA");
});

test("first draft can submit and in-review editions deny editing", () => {
  assert.equal(editionAuthoringActions(edition("ksa", "draft"), true, false, false).canSubmit, true);
  const review = editionAuthoringActions(edition("ksa", "in-review"), true, true, true);
  assert.equal(review.canSave, false);
  assert.equal(review.immutable, true);
  assert.equal(editionAuthoringActions(edition("ksa", "in-review"), true, true, false).canPublish, true);
});

test("an approved latest exact revision can start a successor draft", () => {
  const actions = editionAuthoringActions(edition("uae", "approved"), true, true, false);
  assert.equal(actions.canSave, true);
  assert.equal(actions.canSubmit, false);
  assert.equal(actions.canPublish, false);
});

test("detail rehydrates form state whenever the exact edition response changes", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /const responseKey = `\$\{selectedMarket\}:\$\{selectedLocale\}`/);
  assert.doesNotMatch(detail, /if \(doc && !initialized\.current\)/);
});

test("an inherited edition remains selectable for explicit override creation", async () => {
  const inherited = { ...edition("ksa", "approved", ""), exact: false, effectiveRevisionId: "public-source" };
  const selected = selectInitialExactEdition([inherited], "editor", ["ksa"]);
  assert.equal(selected, inherited);

  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /enabled: Boolean\(id && selectedEdition\?\.exact && selectedEdition\.revisionId\)/);
  assert.match(detail, /sourceRevisionId: selectedEdition\.effectiveRevisionId/);
  assert.match(detail, /No fallback draft content is loaded into the editor/);
  assert.doesNotMatch(detail, /if \(!target\?\.exact \|\| !target\.revisionId\) return/);
});

test("publish options and response cache stay scoped to the selected exact edition", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /\{editionRevisions\.map\(rev => \(/);
  assert.doesNotMatch(detail, /\{sortedRevisions\.map\(rev => \(\s*<option/);
  assert.match(detail, /const targetParams = \{ market: selectedMarket, locale: selectedLocale \};/);
  assert.match(detail, /setQueryData\(getGetDocumentQueryKey\(id!, targetParams\), updated\)/);
});