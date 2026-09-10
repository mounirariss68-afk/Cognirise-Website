import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("platform navigation removes architecture as a peer and groups ownership in both menus", async () => {
  const source = await readFile(new URL("./Shell.tsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /platforms\.architecture/);
  assert.doesNotMatch(source, /label: "Architecture", href: "\/platforms\/cognios#architecture"/);
  assert.ok((source.match(/Own platforms/g) ?? []).length >= 2);
  assert.ok((source.match(/Partner platforms/g) ?? []).length >= 2);
  assert.match(source, /Cognirise-owned platforms/);
  assert.match(source, /border-t border-border/);
  assert.match(source, /groupPlatformNavigation/);
});