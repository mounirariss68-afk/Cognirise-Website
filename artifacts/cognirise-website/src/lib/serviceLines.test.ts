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
    ["../pages/Home.tsx", "ServiceLineTiles"],
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
  assert.doesNotMatch(source, /["'](?:Expand|Collapse)["']|cps-tile-affordance|<Plus|<X/);
  assert.doesNotMatch(source, /import\s*\{[^}]*\b(?:Plus|X)\b[^}]*\}\s*from\s*["']lucide-react["']/);
  assert.match(source, /activeIndex === null/);
  assert.match(source, /all-collapsed/);
  assert.match(source, /prefers-reduced-motion:reduce/);
  assert.match(source, /onMouseEnter=\{\(\) => preview\(id\)\}/);
  assert.match(source, /closest\("a, button"\)/);
  assert.doesNotMatch(source, /hover:not\(\.active\) \.cps-tile-visual img/);
});

test("both service tile variants render every available destination as compact text links", async () => {
  const source = await readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8");
  assert.equal(source.match(/service\.destinations\.map/g)?.length, 2);
  assert.doesNotMatch(source, /service\.destinations\[0\]/);
  assert.match(source, /text-decoration:underline/);
  assert.doesNotMatch(source, /\.cps-tile-dest\{[^}]*border:/);
});

test("AI Platforms destinations stay stacked as one link per row at every viewport", async () => {
  const source = await readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8");
  assert.match(
    source,
    /\.cps-tile\[data-service="ai-platforms"\] \.cps-tile-dests\{flex-direction:column;flex-wrap:nowrap;align-items:flex-start\}/,
  );
  assert.doesNotMatch(
    source,
    /@media[^{]*\{[^}]*\.cps-tile\[data-service="ai-platforms"\] \.cps-tile-dests/,
  );
});

test("service interest analytics distinguish card activation from destination navigation", async () => {
  const [tiles, home] = await Promise.all([
    readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8"),
    readFile(new URL("../pages/Home.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(tiles, /trackEvent\("service_card_activated"/);
  assert.match(tiles, /trackEvent\("service_destination_clicked"/);
  assert.match(tiles, /service_line: serviceLine/);
  assert.match(tiles, /destination/);
  assert.match(tiles, /source/);
  assert.match(home, /source="homepage"/);
});

test("consulting keeps service destinations and adds a distinct governed methodology group", async () => {
  const [tiles, home] = await Promise.all([
    readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8"),
    readFile(new URL("../pages/Home.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(home, /methodologyCtas=\{\[frameworkPortfolioCta, frameworkIdaoCta, frameworkAuthorityCta\]\}/);
  assert.match(tiles, /service\.id === "consulting-engineering" && methodologyCtas\.length > 0/);
  assert.match(tiles, /data-testid="service-methodologies"/);
  assert.match(tiles, /methodologyCtas\.map/);
  assert.match(tiles, /trackDestinationClick\(service\.id, cta\.href\)/);
  assert.match(tiles, /className="cps-tile-dest cps-tile-methodology-link group"/);
  assert.equal(tiles.match(/service\.destinations\.map/g)?.length, 2);
});

test("service tiles use Pulse raster illustrations instead of generated vector drawings", async () => {
  const source = await readFile(new URL("../components/ServiceLineTiles.tsx", import.meta.url), "utf8");
  assert.match(source, /SERVICE_VISUALS/);
  assert.doesNotMatch(source, /ServiceLineDrawing|<svg/);
});