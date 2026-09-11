import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const readSource = (relativePath: string) =>
  readFileSync(new URL(relativePath, import.meta.url), "utf8");

const app = readSource("../App.tsx");
const styles = readSource("../index.css");
const sharedHero = readSource("./MethodPageHero.tsx");
const portfolio = readSource("../pages/MethodologiesPortfolio.tsx");
const idao = readSource("../pages/IDAOMethodology.tsx");
const authority = readSource("../pages/AgentAuthorityModel.tsx");

const consumers = [
  ["AI Value-to-Scale", readSource("../pages/AIValueToScale.tsx")],
  ["Agentic Operations Readiness", readSource("../pages/AgenticOperationsReadiness.tsx")],
  ["AI Use-Case Portfolio Prioritization", readSource("../pages/AIUseCasePrioritization.tsx")],
  ["Human-Agent Operating Model", readSource("../pages/HumanAgentOperatingModel.tsx")],
] as const;

  const checksum = (path: string) => createHash("sha256")
    .update(readFileSync(new URL(path, import.meta.url))).digest("hex");
const standaloneFrames = [
  ["methodology portfolio", portfolio],
  ["IDAO", idao],
  ["Agent Authority", authority],
] as const;

const methodologySources = [
  sharedHero,
  ...consumers.map(([, source]) => source),
  ...standaloneFrames.map(([, source]) => source),
].join("\n");

test("all seven methodology routes resolve to the audited hero implementations", () => {
  const routes = [
    ["/methodologies/ai-use-case-prioritization", "AIUseCasePrioritization"],
    ["/methodologies/ai-value-to-scale", "AIValueToScale"],
    ["/methodologies/agentic-operations-readiness", "AgenticOperationsReadiness"],
    ["/methodologies/idao", "IDAOMethodology"],
    ["/methodologies/agent-authority-model", "AgentAuthorityModel"],
    ["/methodologies/human-agent-operating-model", "HumanAgentOperatingModel"],
  ] as const;
  assert.match(app, /<Route path="\/methodologies"><GovernedLandingRoute pagePath="\/methodologies" compiled=\{MethodologiesPortfolio\} \/><\/Route>/);

  for (const [path, component] of routes) {
    assert.match(
      app,
      new RegExp(`<Route path="${path.replaceAll("/", "\\/")}" component=\\{${component}\\} \\/>`),
      `${path} must keep its audited methodology page`,
    );
  }
});

test("the shared diagonal is one exact five-point CSS polygon", () => {
  assert.match(
    styles,
    /\.clip-diagonal\s*\{\s*clip-path:\s*polygon\(10% 0,\s*100% 0,\s*100% 91%,\s*0 100%,\s*0 12%\);\s*\}/,
  );
  assert.equal(
    styles.match(/polygon\(10% 0,\s*100% 0,\s*100% 91%,\s*0 100%,\s*0 12%\)/g)?.length,
    1,
    "the shared methodology silhouette must have one canonical definition",
  );
});

test("all four MethodPageHero consumers delegate their imagery to the shared frame", () => {
  assert.equal(
    consumers.filter(([, source]) => /<MethodPageHero\b/.test(source)).length,
    4,
  );
  for (const [name, source] of consumers) {
    assert.equal(source.match(/<MethodPageHero\b/g)?.length, 1, `${name} must use one shared hero`);
    assert.doesNotMatch(source, /data-methodology-hero-frame/, `${name} must not duplicate the frame`);
    assert.doesNotMatch(source, /\[clip-path:|style=\{\{[^}]*clipPath/, `${name} must not add another mask`);
  }
  assert.match(sharedHero, /<motion\.figure[\s\S]*?data-methodology-hero-frame[\s\S]*?className="clip-diagonal /);
});

test("portfolio, IDAO and Agent Authority each keep one standalone shared frame", () => {
  for (const [name, source] of standaloneFrames) {
    assert.equal(
      source.match(/data-methodology-hero-frame/g)?.length,
      1,
      `${name} must expose exactly one audited hero frame`,
    );
    assert.match(
      source,
      /data-methodology-hero-frame[^>]*className="clip-diagonal /,
      `${name} must use the shared silhouette`,
    );
  }
  assert.equal(methodologySources.match(/data-methodology-hero-frame/g)?.length, 4);
});

test("methodology frames have no alternate inline or responsive polygon masks", () => {
  assert.doesNotMatch(methodologySources, /\[clip-path:polygon/);
  assert.doesNotMatch(methodologySources, /(?:sm|md|lg|xl|2xl):\[clip-path:/);
  assert.equal(
    styles.match(/^\.clip-diagonal\s*\{/gm)?.length,
    1,
    "the canonical selector must not be redefined at another breakpoint",
  );
});

test("Agent Authority keeps the permanent figure separate from its reveal wrapper", () => {
  assert.match(
    authority,
    /<motion\.div\s+initial=\{reducedMotion \? false : \{ opacity: 0, clipPath: "inset\(0 100% 0 0\)" \}\}[\s\S]*?<figure data-methodology-hero-frame className="clip-diagonal /,
  );
  assert.match(authority, /animate=\{\{ opacity: 1, clipPath: "inset\(0 0 0 0\)" \}\}/);
  assert.doesNotMatch(authority, /<motion\.figure[^>]*data-methodology-hero-frame/);
  assert.doesNotMatch(
    authority,
    /<figure data-methodology-hero-frame[^>]*(?:initial|animate|transition)=/,
    "the clipped figure itself must remain permanently mounted and unanimated",
  );
});

test("hero responsive heights remain unchanged", () => {
  const standardHeight = /h-\[430px\][^"]*md:h-\[520px\][^"]*lg:h-\[620px\]/;
  assert.match(sharedHero, standardHeight);
  assert.match(portfolio, standardHeight);
  assert.match(idao, standardHeight);
  assert.match(
    authority,
    /data-methodology-hero-frame className="clip-diagonal relative h-\[430px\][^"]*lg:h-\[650px\]"/,
  );
  assert.doesNotMatch(authority, /data-methodology-hero-frame[^>]*md:h-/);
});

test("every methodology hero caption stays above the lower diagonal", () => {
  assert.match(sharedHero, /<figcaption className="absolute bottom-\[11%\]/);
  assert.match(idao, /<figcaption className="absolute bottom-\[11%\]/);
  assert.match(authority, /<figcaption className="absolute bottom-\[11%\]/);
  assert.equal(sharedHero.match(/<figcaption className="absolute bottom-\[11%\]/g)?.length, 1);
  assert.equal(authority.match(/<figcaption className="absolute bottom-\[11%\]/g)?.length, 1);
});
