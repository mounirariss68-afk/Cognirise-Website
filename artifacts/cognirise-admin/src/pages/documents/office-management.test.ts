import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { officeLifecycleAction } from "./office-lifecycle.ts";

const adminRoot = new URL("../../../", import.meta.url);

test("office management is available from navigation through governed removal", async () => {
  const [app, layout, editor, detail] = await Promise.all([
    readFile(new URL("src/App.tsx", adminRoot), "utf8"),
    readFile(new URL("src/components/layout/AppLayout.tsx", adminRoot), "utf8"),
    readFile(new URL("src/pages/documents/ContentEditor.tsx", adminRoot), "utf8"),
    readFile(new URL("src/pages/documents/DocumentDetail.tsx", adminRoot), "utf8"),
  ]);

  assert.match(app, /path="\/offices".*DocumentList kind="office"/);
  assert.match(layout, /title: "Offices", url: "\/offices"/);

  const officeEditor = editor.slice(
    editor.indexOf('{kind === "office"'),
    editor.indexOf('{kind === "platform"'),
  );
  assert.match(officeEditor, /label="City"/);
  assert.match(officeEditor, /label="Full postal address"/);

  assert.match(detail, /Remove office/);
  assert.match(detail, /published history will be archived/);
  assert.match(detail, /unpublished office and its revision history will be permanently deleted/);
});

test("a published office with a newer draft still archives instead of attempting deletion", () => {
  assert.equal(officeLifecycleAction({
    kind: "office",
    status: "draft",
    canPermanentlyDelete: false,
  }), "archive");
});

test("an archived office exposes recovery while a never-published draft can be deleted", () => {
  assert.equal(officeLifecycleAction({
    kind: "office",
    status: "archived",
    canPermanentlyDelete: false,
  }), "restore");
  assert.equal(officeLifecycleAction({
    kind: "office",
    status: "draft",
    canPermanentlyDelete: true,
  }), "delete");
});