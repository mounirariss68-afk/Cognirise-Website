import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const stage = await readFile(new URL("../src/components/cognios/ArchitectureStage.tsx", import.meta.url), "utf8");
const styles = await readFile(new URL("../src/components/cognios/ArchitectureStage.css", import.meta.url), "utf8");

test("visible drill-down close controls own deterministic rollback transitions", () => {
  assert.match(stage, /data-testid="architecture-layer-close"/);
  assert.match(stage, /data-testid="architecture-component-close"/);
  assert.match(stage, /setArchitectureState\(null, null, \{ replace: true \}\)/);
  assert.match(stage, /setArchitectureState\(layerId, null, \{ replace: true \}\)/);
  assert.match(stage, /window\.history\[options\?\.replace \? "replaceState" : "pushState"\]/);
  assert.match(stage, /window\.dispatchEvent\(new PopStateEvent\("popstate"/);
  assert.match(stage, /if \(active\) return/);
  assert.match(stage, /onPointerDown=\{\(event\) => \{[\s\S]*?event\.preventDefault\(\);[\s\S]*?closeLayer\(\)/);
  assert.match(stage, /if \(event\.detail === 0\) onClose\(\)/);
  assert.match(styles, /\.coa-layer-plane > \*/);
  assert.match(styles, /\.co-component-detail-close > \*/);
  assert.doesNotMatch(styles, /perspective:|translateZ|preserve-3d/);
});

test("drill-down state retains the architecture anchor and restores focus", () => {
  assert.match(stage, /#architecture/);
  assert.match(stage, /componentRefs\.current\[priorComponent\]\?\.focus\(\)/);
  assert.match(stage, /layerRefs\.current\[priorLayer\]\?\.focus\(\)/);
  assert.match(stage, /requestedFocus\.current = \{ type: "component", id: componentId \}/);
  assert.match(stage, /requestedFocus\.current = \{ type: "layer", id: layerId \}/);
  assert.match(stage, /stageRef\.current\?\.contains\(currentFocus\)/);
  assert.match(stage, /event\.key !== "Escape"/);
});