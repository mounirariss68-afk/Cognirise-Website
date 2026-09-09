import assert from "node:assert/strict";
import test from "node:test";
import { samePageHashTarget } from "./hashNavigation";

test("recognizes same-page fragments without treating cross-page links as local", () => {
  const current = "https://cognirise.ai/?market=uae";
  assert.equal(samePageHashTarget("/#service-lines", current), "service-lines");
  assert.equal(samePageHashTarget("/methodologies/idao#lifecycle", current), null);
  assert.equal(samePageHashTarget("/value-scan", current), null);
});