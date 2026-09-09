import assert from "node:assert/strict";
import test from "node:test";
import {
  configurePublicMarkets,
  getMarketState,
  getMarketLocationLabel,
  isMarket,
  OFFICE_LOCATIONS,
  registerMarketHistoryListener,
  resolveMarket,
  setMarket,
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

test("authoritative configuration rejects disabled markets deterministically", () => {
  configurePublicMarkets(["uae", "ksa"], "uae");
  assert.equal(resolveMarket("?market=europe", "ksa"), "ksa");
  assert.equal(resolveMarket("?market=unknown", "europe"), "uae");
  configurePublicMarkets(["uae", "ksa", "turkiye", "europe"], "uae");
});

test("public configuration authoritatively enables new market codes", () => {
  configurePublicMarkets([
    { code: "uae", displayName: "United Arab Emirates", defaultLocale: "en" },
    { code: "qatar", displayName: "Qatar", defaultLocale: "ar" },
  ], "uae");

  assert.equal(isMarket("qatar"), true);
  assert.equal(resolveMarket("?market=qatar", "uae"), "qatar");
  assert.equal(setMarket("qatar"), true);
  assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });
  assert.equal(getMarketLocationLabel("qatar"), "Qatar");

  assert.equal(setMarket("ksa"), false);
  assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });
  assert.equal(isMarket("unknown"), false);

  configurePublicMarkets(["uae", "ksa", "turkiye", "europe"], "uae");
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

test("browser store reconciles configured locales and popstate atomically", () => {
  const previousWindow = globalThis.window;
  const values = new Map<string, string>();
  let popstate: (() => void) | undefined;
  const location = {
    href: "https://example.test/",
    search: "",
  };
  const browser = {
    location,
    localStorage: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
    history: {
      state: null,
      replaceState: (_state: unknown, _unused: string, next: URL) => {
        location.href = next.href;
        location.search = next.search;
      },
    },
    addEventListener: (type: string, listener: () => void) => {
      if (type === "popstate") popstate = listener;
    },
    removeEventListener: (type: string, listener: () => void) => {
      if (type === "popstate" && popstate === listener) popstate = undefined;
    },
  };
  Object.defineProperty(globalThis, "window", { value: browser, configurable: true });

  const markets = [
    { code: "uae", displayName: "United Arab Emirates", defaultLocale: "ar", locales: ["ar", "en"] },
    { code: "europe", displayName: "Europe", defaultLocale: "en", locales: ["en"] },
    { code: "qatar", displayName: "Qatar", defaultLocale: "ar", locales: ["ar", "en"] },
  ];
  const unregister = registerMarketHistoryListener();
  try {
    configurePublicMarkets(markets, "uae");
    assert.deepEqual(getMarketState(), { market: "uae", locale: "ar" });

    location.href = "https://example.test/?market=europe&locale=en";
    location.search = "?market=europe&locale=en";
    popstate?.();
    assert.deepEqual(getMarketState(), { market: "europe", locale: "en" });

    location.href = "https://example.test/?market=qatar&locale=ar";
    location.search = "?market=qatar&locale=ar";
    popstate?.();
    assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });

    location.href = "https://example.test/?locale=en";
    location.search = "?locale=en";
    popstate?.();
    assert.deepEqual(getMarketState(), { market: "qatar", locale: "en" });

    location.href = "https://example.test/?market=qatar";
    location.search = "?market=qatar";
    popstate?.();
    assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });

    location.href = "https://example.test/?market=qatar&locale=ar";
    location.search = "?market=qatar&locale=ar";
    configurePublicMarkets(markets, "uae");
    assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });

    location.href = "https://example.test/";
    location.search = "";
    values.set("cognirise-market", "qatar");
    configurePublicMarkets(markets, "uae");
    assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });

    assert.equal(setMarket("ksa"), false);
    assert.equal(setMarket("unknown"), false);
    assert.deepEqual(getMarketState(), { market: "qatar", locale: "ar" });
  } finally {
    unregister();
    if (previousWindow === undefined) {
      delete (globalThis as { window?: Window }).window;
    } else {
      Object.defineProperty(globalThis, "window", { value: previousWindow, configurable: true });
    }
    configurePublicMarkets(["uae", "ksa", "turkiye", "europe"], "uae");
  }
});
