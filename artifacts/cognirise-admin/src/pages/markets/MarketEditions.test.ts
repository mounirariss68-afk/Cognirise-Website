import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const adminRoot = new URL("../../../", import.meta.url);

test("market editing keeps dirty values visible and blocks dismissal during saves", async () => {
  const page = await readFile(new URL("src/pages/markets/MarketEditions.tsx", adminRoot), "utf8");

  assert.match(page, /form\.formState\.isDirty/);
  assert.match(page, /requestCloseEditor/);
  assert.match(page, /onEscapeKeyDown/);
  assert.match(page, /onPointerDownOutside/);
  assert.match(page, /finally \{\s+setMarketLock/);
  assert.match(page, /fallbackMarketCode: values\.fallbackMarketCode \|\| null/);
  assert.match(page, /fallbackLocale: values\.fallbackLocale \|\| null/);
});

test("market mutations use per-record locks rather than disabling every row", async () => {
  const page = await readFile(new URL("src/pages/markets/MarketEditions.tsx", adminRoot), "utf8");

  assert.match(page, /lockedMarkets/);
  assert.match(page, /isMarketLocked\(market\.id\)/);
  assert.match(page, /disabled=\{isMarketLocked\(market\.id\) \|\| market\.isCanonical\}/);
});
