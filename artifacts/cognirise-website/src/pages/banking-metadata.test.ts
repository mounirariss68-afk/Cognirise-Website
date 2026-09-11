import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("Shell leaves protected preview and banking metadata to their governed page effects", async () => {
  const shell = await readFile(new URL("../components/layout/Shell.tsx", import.meta.url), "utf8");
  const preview = await readFile(new URL("./CmsPreview.tsx", import.meta.url), "utf8");
  assert.match(shell, /if \(currentPath\.startsWith\("\/preview\/"\) \|\| currentPath === "\/industries\/financial-services"\) return;/);
  assert.match(preview, /title: "Draft preview \| Cognirise"[\s\S]*canonicalUrl: null, noIndex: true/);
});