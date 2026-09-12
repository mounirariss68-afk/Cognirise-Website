import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../", import.meta.url);

test("contact email has a dedicated governed singleton editing entry point", async () => {
  const [app, layout, page, editor] = await Promise.all([
    readFile(new URL("src/App.tsx", adminRoot), "utf8"),
    readFile(new URL("src/components/layout/AppLayout.tsx", adminRoot), "utf8"),
    readFile(new URL("src/pages/ContactSettings.tsx", adminRoot), "utf8"),
    readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8"),
  ]);
  assert.match(app, /path="\/contact-settings"/);
  assert.match(layout, /title: "Contact Email", url: "\/contact-settings"/);
  assert.match(page, /CMS_CONTACT_EMAIL_DOCUMENT_SLUG/);
  assert.match(page, /configuration: "contact-email"/);
  assert.match(page, /useCreateDocument/);
  assert.match(page, /useUpdateDocument/);
  assert.match(page, /useSubmitDocument/);
  assert.match(page, /usePublishDocument/);
  assert.match(page, /getDocumentAvailability/);
  assert.match(page, /useReviewDocumentAvailability/);
  assert.match(page, /availabilityVersion/);
  assert.match(page, /Destination impact/);
  assert.match(page, /Frozen availability version/);
  assert.match(page, /source revision/);
  assert.match(page, /publishedDestinationSummary/);
  assert.match(page, /exact destinations/);
  assert.match(page, /Every enabled destination/);
  assert.doesNotMatch(page, /Only the selected market and locale were updated/);
  assert.match(page, /withContactEmail/);
  assert.match(page, /getListDocumentEditionsQueryKey/);
  assert.match(page, /Open history and edition details/);
  assert.match(page, /second editor may win the singleton creation race/i);
  assert.match(editor, /label="Public website contact email"/);
  assert.match(editor, /type="email"/);
  assert.match(editor, /approved and published/);
});