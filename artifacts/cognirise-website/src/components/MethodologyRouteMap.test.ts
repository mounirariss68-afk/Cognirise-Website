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
  it("maps every approved route to its own existing artwork, used inside the clickable choice", () => {
    const art = source.match(/const SITUATION_ART:[\s\S]*?\n};/)?.[0] ?? "";
    assert.ok(art);
    for (const id of situationIds) {
      assert.ok(existsSync(resolve(root, `public/images/cognirise/situations/${id}.jpg`)));
      assert.ok(art.includes(`"/images/cognirise/situations/${id}.jpg"`));
    }
    assert.equal((art.match(/src: "\/images\/cognirise\/situations\//g) ?? []).length, 7);
    assert.match(source, /<button[\s\S]*?className="methodology-route-choice"[\s\S]*?<span className="methodology-route-choice-content">[\s\S]*?<span className="methodology-route-art">[\s\S]*?<img src=\{assetUrl\(SITUATION_ART\[sit\.id\]\.src\)\} alt=\{SITUATION_ART\[sit\.id\]\.alt\}/);
    assert.match(source, /<span className="methodology-route-choice-content">[\s\S]*?\{sit\.label\}/);
    assert.doesNotMatch(source, /methodology-route-thumb|route-detail-art|methodology-route-hero-figure|activeArt/);
    assert.match(styles, /\.methodology-route-screen \{[\s\S]*?grid-template-columns: minmax\(320px, 36%\) minmax\(0, 1fr\)/);
    assert.match(styles, /\.methodology-route-rail \{[\s\S]*?border-right: 1px solid var\(--route-rule\)/);
    assert.match(styles, /\.methodology-route-choices \{[\s\S]*?grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(styles, /\.methodology-route-art img \{[\s\S]*?object-fit: cover/);
    assert.doesNotMatch(styles, /\.methodology-route-choice:first-child \{ grid-column: span 2/);
    assert.match(styles, /\.methodology-route-choice \{[\s\S]*?min-height: var\(--choice-height\)/);
    assert.match(styles, /\.methodology-route-choice-content \{[\s\S]*?background: #fff/);
    assert.match(styles, /\.methodology-route-choice \{[\s\S]*?grid-template-columns: minmax\(0, 62%\) minmax\(0, 38%\)/);
    assert.match(source, /<div className="methodology-route-rail"[\s\S]*?<div\s+id="selected-route-output"/);
    assert.match(styles, /\.methodology-route-detail \{[\s\S]*?position: sticky;[\s\S]*?max-height: calc\(100dvh - 48px\)/);
    assert.match(source, /outputRef\.current\?\.scrollTo\(\{ top: 0 \}\)/);
    assert.match(styles, /@media \(max-width: 1023px\) \{[\s\S]*?\.methodology-route-screen \{ grid-template-columns: minmax\(260px, 36%\) minmax\(0, 1fr\)/);
    assert.match(styles, /@media \(max-width: 767px\) \{[\s\S]*?\.methodology-route-screen \{ grid-template-columns: minmax\(0, 1fr\)/);
    assert.match(styles, /\.methodology-route-detail \{ position: static; max-height: none; overflow: visible; \}/);
    assert.match(styles, /@media \(max-width: 640px\) \{[\s\S]*?\.methodology-route-choices \{ grid-template-columns: 1fr/);
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
    assert.match(styles, /\.methodology-route-choice\[data-preview="true"\]::after/);
    assert.match(styles, /\.methodology-route-choice:focus-visible/);
    assert.match(styles, /@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\.methodology-route-choice:hover \{[\s\S]*?width: 100%;[\s\S]*?min-height: calc\(var\(--choice-height\) \+ 36px\)/);
    assert.match(styles, /\.methodology-route-choice:focus-visible \{[\s\S]*?min-height: calc\(var\(--choice-height\) \+ 36px\)/);
    assert.match(styles, /\.methodology-route-choice \{[\s\S]*?overflow: hidden/);
    assert.doesNotMatch(styles, /box-decoration-break|\.methodology-route-choice:hover img/);
    assert.doesNotMatch(styles, /\.methodology-route-choice::before/);
    assert.match(styles, /@media \(max-width: 640px\)/);
    assert.match(styles, /@media \(prefers-reduced-motion: no-preference\)/);
    assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  });
});