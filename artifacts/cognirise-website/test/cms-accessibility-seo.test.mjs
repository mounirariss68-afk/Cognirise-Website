import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const shell = readFileSync(new URL("../src/components/layout/Shell.tsx", import.meta.url), "utf8");
const preview = readFileSync(new URL("../src/pages/CmsPreview.tsx", import.meta.url), "utf8");

test("preview routes are excluded from search and canonical emission", () => {
  assert.match(shell, /isPreviewRoute/);
  assert.match(shell, /noindex, nofollow/);
  assert.match(shell, /querySelector\('link\[rel="canonical"\]'\)\?\.remove/);
});

test("preview has accessible loading and error states", () => {
  assert.match(preview, /role="status"/);
  assert.match(preview, /role="alert"/);
  assert.match(preview, /status-cms-preview-loading/);
});