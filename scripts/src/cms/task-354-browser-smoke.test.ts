import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Task 354 smoke keeps the exact UI and public contracts", async () => {
  const source = await readFile(new URL("./task-354-browser-smoke.mjs", import.meta.url), "utf8");
  const detail = await readFile(
    new URL("../../../artifacts/cognirise-admin/src/pages/documents/DocumentDetail.tsx", import.meta.url),
    "utf8",
  );
  const editorialWork = await readFile(
    new URL("../../../artifacts/cognirise-admin/src/pages/EditorialWork.tsx", import.meta.url),
    "utf8",
  );
  const appLayout = await readFile(
    new URL("../../../artifacts/cognirise-admin/src/components/layout/AppLayout.tsx", import.meta.url),
    "utf8",
  );
  const harness = await readFile(new URL("./task-345-harness.ts", import.meta.url), "utf8");
  for (const required of [
    "http://127.0.0.1:80",
    "/admin/",
    'input[name=\\"email\\"][autocomplete=\\"email\\"]',
    "document.querySelector('#document-summary')",
    "document.querySelector('#save-draft:not([disabled])')",
    "Submit for review",
    "Route review",
    "Approve revision",
    "Confirm decision",
    "Approve destination visibility",
    "Publish reviewed visibility",
    "Confirm visibility release",
    "account-menu-trigger",
    'item.type === "page" && item.title === targetToken',
    'publicPath("ksa", `${document.slug}-ksa`)',
    "document.uaeRevisionId",
  ]) assert.ok(source.includes(required), `missing maintained contract: ${required}`);
  for (const label of [
    "Submit for review",
    "Route review",
    "Approve destination visibility",
    "Publish reviewed visibility",
    "Confirm visibility release",
  ]) assert.ok(detail.includes(label), `DocumentDetail no longer exposes: ${label}`);
  for (const label of ["Approve revision", "Confirm decision"]) {
    assert.ok(editorialWork.includes(label), `EditorialWork no longer exposes: ${label}`);
  }
  assert.match(appLayout, /data-testid="account-menu-trigger"/);
  assert.ok(
    source.indexOf("account-menu-trigger") < source.indexOf('clickText("Log out")'),
    "the account menu must open before logout is selected",
  );
  assert.match(harness, /fixtureSnapshot\(fixture\.kind, `\$\{slug\}-ksa`/);
  assert.match(harness, /INSERT INTO cms_editorial_assignments/);
  assert.match(harness, /assignment\.reviewer_user_id=\$2/);
  assert.ok(
    source.indexOf('clickText("Approve destination visibility")')
      < source.indexOf('button-publish-reviewed-destinations'),
    "visibility approval must precede waiting for the release control",
  );
  assert.doesNotMatch(source, /\/admin\/login/);
  assert.doesNotMatch(source, /textarea,\[contenteditable/);
});