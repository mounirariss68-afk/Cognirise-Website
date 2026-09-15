import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFile } from "node:fs/promises";
import { ReviewVersionSelect } from "./ReviewVersionSelect";

test("review select exposes configured choices and the selected market", () => {
  const html = renderToStaticMarkup(<ReviewVersionSelect
    markets={[{ code: "uae", displayName: "United Arab Emirates" }, { code: "qatar", displayName: "Qatar" }]}
    market="qatar" onSelect={() => {}}
  />);
  assert.match(html, /aria-label="Review version"/);
  assert.match(html, /value="qatar" selected=""/);
  assert.match(html, />Qatar<\/option>/);
  assert.doesNotMatch(html, /Saudi Arabia/);
});

test("both menu controls and the mobile separator are development-only", async () => {
  const source = await readFile(new URL("./Shell.tsx", import.meta.url), "utf8");
  assert.equal((source.match(/import\.meta\.env\?\.DEV && marketOptions.length > 0/g) ?? []).length, 2);
  assert.doesNotMatch(source, /marketOptions\.map/);
  assert.match(source, /import\.meta\.env\?\.DEV && marketOptions.length > 0 && \(\s*<div className="pb-12 border-t/);
});