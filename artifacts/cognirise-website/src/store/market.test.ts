import assert from "node:assert/strict";
import test from "node:test";
import {
  getMarketLocationLabel,
  isMarket,
  OFFICE_LOCATIONS,
  resolveMarket,
} from "./market";

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

test("market labels only name cities with confirmed offices", () => {
  assert.equal(getMarketLocationLabel("uae"), "Dubai · UAE");
  assert.equal(getMarketLocationLabel("ksa"), "Riyadh · Kingdom of Saudi Arabia");
  assert.equal(getMarketLocationLabel("turkiye"), "Türkiye");
  assert.equal(getMarketLocationLabel("europe"), "Europe");
});

test("confirmed office addresses remain exact", () => {
  assert.equal(
    OFFICE_LOCATIONS.dubai.address,
    "Office 1914, The Binary by Omniyat, Business Bay, PO Box 71515, Dubai, UAE",
  );
  assert.equal(
    OFFICE_LOCATIONS.riyadh.address,
    "Office 27, First Floor, 3483 Anas Bin Malik Road, Riyadh, Kingdom of Saudi Arabia",
  );
});
