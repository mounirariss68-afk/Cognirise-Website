import assert from "node:assert/strict";
import test from "node:test";
import { rankMarketLocaleCandidates } from "../src/routes/public.ts";

test("public edition ranking prefers requested locale, then configured locale fallback", () => {
  const rows = [
    { code: "ksa", default_locale: "en", fallback_locale: "ar", fallback_market_code: "uae", is_canonical: false },
    { code: "uae", default_locale: "en", fallback_locale: null, fallback_market_code: null, is_canonical: true },
  ];
  assert.deepEqual(rankMarketLocaleCandidates(rows, "ksa", "ar"), [
    "ksa|ar",
    "ksa|en",
    "uae|ar",
    "uae|en",
  ]);
});

test("public edition ranking rejects an unknown or disabled requested market input", () => {
  assert.equal(rankMarketLocaleCandidates([], "europe", "en"), null);
});