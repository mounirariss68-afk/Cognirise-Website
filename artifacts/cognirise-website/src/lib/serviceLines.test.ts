import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { SERVICE_LINES, SERVICE_LINE_LABELS } from "./serviceLines";

test("defines exactly the three approved service lines", () => {
  assert.deepEqual(SERVICE_LINES.map((line) => line.label), SERVICE_LINE_LABELS);
  assert.equal(SERVICE_LINES.length, 3);
});

test("service touchpoints use the canonical model instead of four or five-item presentations", async () => {
  const sources = await Promise.all([
    ["../pages/ServicesOverview.tsx", "SERVICE_LINES"],
    ["../pages/Home.tsx", "ServiceLineTiles"],
    ["../components/layout/Shell.tsx", "SERVICE_LINE_LABELS"],
    ["../pages/ValueScan.tsx", "SERVICE_LINE_LABELS"],
  ].map(async ([path, model]) => ({
    source: await readFile(new URL(path, import.meta.url), "utf8"),
    model,
  })));
  for (const { source, model } of sources) assert.match(source, new RegExp(model));
  assert.doesNotMatch(sources.map(({ source }) => source).join("\n"), /Five ways into the work|Engineering & Modernisation/);
});

test("service tiles expose selection, panels, keyboard navigation and reduced motion", async () => {
  const source = await readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8");
  assert.match(source, /useSpatialDisclosure/);
  assert.match(source, /SpatialDisclosureItem/);
  assert.match(source, /SpatialDisclosureTrigger/);
  assert.match(source, /SpatialDisclosurePanel/);
  assert.match(source, /mode="editorial"/);
  assert.match(source, /variant = "full"/);
  assert.match(source, /service\.short/);
  assert.match(source, /Expand/);
  assert.match(source, /activeIndex === null/);
  assert.match(source, /all-collapsed/);
  assert.match(source, /prefers-reduced-motion:reduce/);
});

test("service tiles use Pulse raster illustrations instead of generated vector drawings", async () => {
  const source = await readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8");
  assert.match(source, /SERVICE_VISUALS/);
  assert.doesNotMatch(source, /ServiceLineDrawing|<svg/);
});