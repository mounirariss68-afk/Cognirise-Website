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
  assert.match(editor, /label="Public website contact email"/);
  assert.match(editor, /type="email"/);
  assert.match(editor, /approved and published/);
});