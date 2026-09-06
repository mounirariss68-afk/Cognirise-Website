import assert from "node:assert/strict";
import test from "node:test";
import { isMarket, resolveMarket } from "./market";

test("valid market query takes precedence over local preference", () => {
  assert.equal(resolveMarket("?topic=ai&market=ksa", "europe"), "ksa");
});

test("local preference is used when query is missing or invalid", () => {
  assert.equal(resolveMarket("?topic=ai", "turkiye"), "turkiye");
  assert.equal(resolveMarket("?market=unknown", "europe"), "europe");
});

test("market validation and defaults are deterministic", () => {
  assert.equal(isMarket("uae"), true);
  assert.equal(isMarket("uk"), false);
  assert.equal(resolveMarket("", null), "uae");
});