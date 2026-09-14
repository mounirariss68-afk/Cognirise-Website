import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const route = readFileSync(new URL("./MethodologyRouteMap.tsx", import.meta.url), "utf8");
const portfolio = readFileSync(new URL("../pages/MethodologiesPortfolio.tsx", import.meta.url), "utf8");

test("all situation actions share the approved button and retain their destination callback", () => {
  const start = route.indexOf("{activeRoute.actions.map");
  const actions = route.slice(start, route.indexOf("))}", start));
  assert.match(actions, /<BrandButton[\s\S]*href=\{action.href\}/);
  assert.match(actions, /variant=\{action.type\}/);
  assert.match(actions, /data-testid=\{`action-\$\{action.type\}`\}/);
  assert.match(actions, /\{action.label\}\s*<\/BrandButton>/);
  assert.equal((actions.match(/onClick=\{\(\) => openDestination\(action.href\)\}/g) || []).length, 1);
  assert.doesNotMatch(actions, /<ArrowRight|<Link|bg-gradient|translate-x/);
  assert.equal((route.match(/trackProjectEvent\("methodology_destination_opened"/g) || []).length, 1);
});

test("governed and fallback portfolio hero actions use the same shared CTA", () => {
  assert.match(portfolio, /<BrandButton[\s\S]*href=\{primaryAction.href\}[\s\S]*onClick=\{handleNavClick\}[\s\S]*\{primaryAction.label\}\s*<\/BrandButton>/);
  for (const source of [route, portfolio]) {
    assert.doesNotMatch(source, /bg-gradient-to-b|hover:bg-\[#1a3a75\]|pulse-signal-rail/);
  }
});