import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";

test("platform view is deep-linkable and keeps direct platform destinations", async () => {
  const source = await readFile(new URL("./ArchitectureStage.tsx", import.meta.url), "utf8");
  assert.match(source, /viewParam === "platform"/);
  assert.match(source, /next\.set\("platform", platformId\)/);
  assert.match(source, /platformsForLayer\(layer\.id\)/);
  assert.match(source, /href=\{validPlatform\.href\}/);
  assert.match(source, /aria-pressed=\{validPlatform\?\.id === platform\.id\}/);
  assert.match(source, /event\.key !== "Enter" && event\.key !== " "/);
  assert.match(source, /selectPlatform\(platform\.id\)/);
});

test("platform view explains overlap and partner ownership", async () => {
  const source = await readFile(new URL("./ArchitectureStage.tsx", import.meta.url), "utf8");
  assert.match(source, /not exclusive placement or ownership/i);
  assert.match(source, /Partner contribution/);
  assert.match(source, /partner products remain independently owned/i);
});