import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { editionAuthoringActions, selectInitialExactEdition } from "./edition-authoring.ts";
import type { DocumentEdition } from "@workspace/api-client-react";
import { buildDraftSave, describeSaveFailure, isDraftSaveResponse, normalizeDraftSeo, serverValidationIssues } from "./draft-save.ts";

const adminRoot = new URL("../../../", import.meta.url);

test("guided editor uses a shared-content destination checklist", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /documentReadiness/);
  assert.match(detail, /Show this content in/);
  assert.match(detail, /MarketAvailabilityChecklist/);
  assert.match(detail, /Customize for this edition/);
  assert.match(detail, /Return to shared content/);
  assert.match(detail, /market: selectedMarket/);
  assert.match(detail, /locale: selectedLocale/);
  assert.match(detail, /revisionId: previewRevisionId/);
  assert.match(detail, /useListDocumentEditions/);
  assert.match(detail, /useCreateDocumentCustomization/);
  assert.match(detail, /revision\.market === selectedMarket && revision\.locale === selectedLocale/);
  assert.match(detail, /useGetDocument\(id!, documentParams/);
  assert.match(detail, /window\.open\("about:blank", "_blank"\)/);
  assert.match(detail, /previewResponseMatchesTarget\(result, target\)/);
  assert.match(detail, /navigateReservedPreview\(operation\.placeholder, result\.previewUrl\)/);
  assert.doesNotMatch(detail, /window\.open\(result\.data\.previewUrl/);
  assert.doesNotMatch(detail, /\/cognirise-website/);
  assert.doesNotMatch(detail, /Market \+ locale matrix/);
});

test("content editor chooses governed media instead of accepting copied IDs", async () => {
  const editor = await readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8");
  const mediaField = await readFile(new URL("src/pages/documents/MediaField.tsx", adminRoot), "utf8");
  assert.match(editor, /<MediaField.*label="Case-study hero image"/);
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

test("a reviewed approved edition can publish normally without administrator override", () => {
  assert.equal(editionAuthoringActions(edition("ksa", "approved"), true, true, false).canPublish, true);
  assert.equal(editionAuthoringActions(edition("ksa", "approved"), true, false, false).canPublish, false);
  assert.equal(editionAuthoringActions(edition("ksa", "approved"), true, true, true).canPublish, false);
});

test("first draft can submit and in-review editions deny editing", () => {
  assert.equal(editionAuthoringActions(edition("ksa", "draft"), true, false, false).canSubmit, true);
  const review = editionAuthoringActions(edition("ksa", "in-review"), true, true, true);
  assert.equal(review.canSave, false);
  assert.equal(review.immutable, true);
  assert.equal(editionAuthoringActions(edition("ksa", "in-review"), true, true, false).canPublish, true);
});

test("administrator can publish a saved draft directly while collaborators retain review", () => {
  assert.equal(editionAuthoringActions(edition("ksa", "draft"), true, true, false).canPublish, false);
  assert.equal(editionAuthoringActions(edition("ksa", "draft"), true, true, false, true).canPublish, true);
  assert.equal(editionAuthoringActions(edition("ksa", "draft"), true, true, true, true).canPublish, false);
  assert.equal(editionAuthoringActions(edition("ksa", "rejected"), true, true, false, true).canPublish, true);
});

test("an approved latest exact revision can start a successor draft", () => {
  const actions = editionAuthoringActions(edition("uae", "approved"), true, true, false);
  assert.equal(actions.canSave, true);
  assert.equal(actions.canSubmit, false);
  assert.equal(actions.canPublish, true);
});

test("detail rehydrates form state whenever the exact edition response changes", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /const responseKey = `\$\{id\}:\$\{selectedMarket\}:\$\{selectedLocale\}`/);
  assert.match(detail, /hasUnsavedRef\.current \|\| preserveAfterFailedSave\.current/);
  assert.doesNotMatch(detail, /if \(doc && !initialized\.current\)/);
});

test("customizations and initial selection use the explicit saved shared source", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /const sharedSource = availabilityForReview\?\.sharedSource/);
  assert.match(detail, /sourceRevisionId,/);
  assert.match(detail, /useSelectDocumentAvailabilitySource/);
  assert.match(detail, /Create a shared source from an exact historical revision/);
  assert.match(detail, /const canEditSelectedEdition = selectedIsSharedSource/);
  assert.match(detail, /canEditSelectedEdition && !editionIsArchived/);
  assert.match(detail, /getDocumentAvailability\(id!\)/);
  assert.match(detail, /A source save advances availability's version/);
  assert.match(detail, /if \(!sharedSource\)/);
  assert.match(detail, /if \(canManageSharedDestinations\)/);
  assert.match(detail, /Save shared content before creating a customization/);
  assert.doesNotMatch(detail, /Create editable override/);
});

test("publish options and response cache stay scoped to the selected exact edition", async () => {
  const detail = await readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8");
  assert.match(detail, /\{editionRevisions\.map\(rev => \(/);
  assert.doesNotMatch(detail, /\{sortedRevisions\.map\(rev => \(\s*<option/);
  assert.match(detail, /const targetParams = \{ market: selectedMarket, locale: selectedLocale \};/);
  assert.match(detail, /setQueryData\(getGetDocumentQueryKey\(id!, targetParams\), updated\)/);
  assert.match(detail, /if \(market === selectedMarket && locale === selectedLocale\) return/);
  assert.match(detail, /Destination impact/);
  assert.match(detail, /pendingDestinationChanges/);
});

const validSource = {
  slug: "contact-email",
  title: "Contact email",
  summary: "",
  content: { schemaVersion: 1, configuration: "contact-email", contactEmail: "hello@example.com" },
  mediaIds: [],
  markets: ["uae"],
};

test("blank optional SEO stays absent and clearing existing SEO sends null", () => {
  assert.equal(normalizeDraftSeo({ title: " ", description: "", canonicalUrl: "", noIndex: false }, false), undefined);
  assert.equal(normalizeDraftSeo({ title: "", description: "", canonicalUrl: "", noIndex: false }, true), null);
  const result = buildDraftSave("site-configuration", validSource, {}, false);
  assert.equal(result.success, true);
  if (result.success) assert.equal(Object.hasOwn(result.snapshot, "seo"), false);
});

test("draft save uses the shared snapshot validator for metadata and preserves unknown SEO", () => {
  const partial = buildDraftSave("site-configuration", validSource, { title: "Only a title" }, false);
  assert.equal(partial.success, true);
  const badUrl = buildDraftSave("site-configuration", validSource, {
    title: "Search title",
    description: "Search description",
    canonicalUrl: "javascript:alert(1)",
  }, false);
  assert.equal(badUrl.success, false);
  if (!badUrl.success) assert.equal(badUrl.issues[0]?.path, "seo.canonicalUrl");
  const legacy = buildDraftSave("site-configuration", validSource, { imageId: "legacy" }, true);
  assert.equal(legacy.success, false);
  if (!legacy.success) assert.equal(legacy.issues[0]?.path, "seo");
});

test("save failures distinguish validation, authorization, conflict, and uncertain responses", () => {
  assert.equal(describeSaveFailure({ status: 422, data: { details: [{ path: ["seo", "title"], message: "Too long" }] } }).action, "review-fields");
  assert.equal(describeSaveFailure({ status: 401 }).action, "sign-in");
  assert.equal(describeSaveFailure({ status: 403 }).title, "You cannot save this edition");
  assert.equal(describeSaveFailure({ status: 409 }).action, "review-conflict");
  assert.equal(describeSaveFailure({ name: "ResponseParseError", status: 200 }).action, "verify");
  assert.equal(describeSaveFailure({ status: 500, data: { code: "DOCUMENT_SAVE_COMMITTED", committed: true } }).action, "reload-committed");
  assert.deepEqual(
    serverValidationIssues({ data: { details: [{ path: ["seo", "canonicalUrl"], message: "Use an HTTP(S) URL" }] } }),
    [{ path: "seo.canonicalUrl", message: "Use an HTTP(S) URL" }],
  );
  assert.deepEqual(describeSaveFailure(new TypeError("token=secret")), {
    title: "Network interrupted the save",
    description: "Your changes remain here. Verify the latest revision before attempting another save.",
    action: "verify",
  });
  const expectedSave = {
    documentId: "document-1",
    kind: "site-configuration" as const,
    slug: "contact-email",
    market: "uae",
    locale: "en-US",
    previousRevision: 1,
    snapshot: {
      title: "Contact email",
      summary: null,
      content: validSource.content,
      seo: undefined,
      mediaIds: [],
    },
  };
  assert.equal(isDraftSaveResponse(null, expectedSave), false);
  assert.equal(isDraftSaveResponse({ revisionNumber: 2 }, expectedSave), false);
  assert.equal(isDraftSaveResponse({
    id: "document-1",
    kind: "site-configuration",
    slug: "contact-email",
    title: "Contact email",
    content: validSource.content,
    markets: ["uae"],
    revisionNumber: 2,
    currentRevisionId: "revision-2",
  }, expectedSave), true);
  assert.equal(isDraftSaveResponse({
    id: "document-1",
    kind: "site-configuration",
    slug: "contact-email",
    title: "Contact email",
    content: validSource.content,
    markets: ["uae"],
    revisionNumber: 2,
    market: "ksa",
  }, expectedSave), false);
  for (const nearValid of [
    { kind: "office" },
    { slug: "different-slug" },
    { content: { ...validSource.content, contactEmail: "other@example.com" } },
  ]) {
    assert.equal(isDraftSaveResponse({
      id: "document-1",
      kind: "site-configuration",
      slug: "contact-email",
      title: "Contact email",
      summary: null,
      content: validSource.content,
      markets: ["uae"],
      mediaIds: [],
      revisionNumber: 2,
      currentRevisionId: "revision-2",
      ...nearValid,
    }, expectedSave), false);
  }
});