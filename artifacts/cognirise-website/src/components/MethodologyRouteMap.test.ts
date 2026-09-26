import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it } from "node:test";
import assert from "node:assert/strict";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const source = readFileSync(resolve(root, "src/components/MethodologyRouteMap.tsx"), "utf8");
const styles = readFileSync(resolve(root, "src/components/MethodologyRouteMap.css"), "utf8");
const situationIds = [
  "investment", "competing-ideas", "existing-strategy", "process-problem",
  "pilot-release", "proven-expansion", "underperformance",
];

describe("illustrated methodology route navigator", () => {
  it("maps every approved route to its own existing art file and meaningful main alt", () => {
    const art = source.match(/const SITUATION_ART:[\s\S]*?\n};/)?.[0] ?? "";
    assert.ok(art);
    for (const id of situationIds) {
      assert.ok(existsSync(resolve(root, `public/images/cognirise/situations/${id}.jpg`)));
      assert.ok(art.includes(`"/images/cognirise/situations/${id}.jpg"`));
    }
    assert.equal((art.match(/src: "\/images\/cognirise\/situations\//g) ?? []).length, 7);
    assert.match(source, /src=\{assetUrl\(SITUATION_ART\[sit\.id\]\.src\)\} alt="" loading="lazy" data-pulse-image-resilient="true"/);
    assert.match(source, /src=\{assetUrl\(activeArt\.src\)\} alt=\{activeArt\.alt\} loading="eager" data-pulse-image-resilient="true"/);
  });

  it("retains description data for print but removes both repeated on-screen copies", () => {
    assert.equal((source.match(/description: "/g) ?? []).length, 7);
    assert.match(source, /<strong>Description:<\/strong> \{printWords\(route\.description\)\}/);
    assert.doesNotMatch(source, /sit\.description|activeRoute\.description/);
    assert.match(source, /route-detail-assets/);
    assert.match(source, /route-detail-decision/);
    assert.match(source, /route-detail-output/);
  });

  it("keeps mouse previews separate from committed selection, storage and analytics", () => {
    assert.match(source, /const displayedSituation = previewSituation \?\? activeSituation/);
    assert.match(source, /if \(pointerType === "mouse"\)/);
    assert.match(source, /onPointerEnter=\{\(event\) => previewOnMouse/);
    assert.match(source, /onPointerLeave=\{\(\) => setPreviewSituation\(null\)\}/);
    assert.match(source, /onFocus=\{\(\) => setPreviewSituation\(null\)\}/);
    assert.match(source, /const selectSituation = \(situation: RouteSituation\) => \{[\s\S]*?setPreviewSituation\(null\);[\s\S]*?setActiveSituation\(situation\);/);
    assert.match(source, /aria-checked=\{isActive\}/);
    assert.match(source, /aria-live="polite">Selected situation: \{ROUTE_DATA\.find\(r => r\.id === activeSituation\)/);
    assert.doesNotMatch(source, /role="region"\s+aria-live/);
    assert.match(source, /sessionStorage\.setItem\(STORAGE_KEY_SELECTION, activeSituation\)/);
    assert.match(source, /onKeyDown=\{\(event\) => handleSituationKeyDown\(event, index\)\}/);
    assert.match(source, /onClick=\{\(\) => handleRadioClick\(sit\.id as RouteSituation\)\}/);
    assert.match(styles, /\.methodology-route-choice\[data-preview="true"\] \.methodology-route-thumb/);
    assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)/);
  });
});