import assert from "node:assert/strict";
import test from "node:test";
import { marketLocaleOptions } from "./DocumentGeographySelector";
import { affectedPublicationDestinations, type PublicationImpactDestination } from "./PublicationImpactSummary";

test("geography locales stay scoped to the selected market", () => {
  const editions = [
    { market: "uae", locale: "en-AE", exact: true },
    { market: "uae", locale: "ar-AE", exact: false },
    { market: "ksa", locale: "ar-SA", exact: true },
  ];
  assert.deepEqual(
    marketLocaleOptions(
      { code: "uae", displayName: "United Arab Emirates", defaultLocale: "en-AE", locales: ["en-AE"] },
      editions,
    ),
    ["ar-AE", "en-AE"],
  );
});

test("missing market catalog entries do not invent a language", () => {
  assert.deepEqual(marketLocaleOptions(undefined, [{ market: "uae", locale: "en-AE" }]), []);
});

test("publication impact lists only destinations with a staged decision", () => {
  const destinations: PublicationImpactDestination[] = [
    { market: "uae", locale: "en-AE", displayName: "United Arab Emirates", pending: true, stagedDecision: "show" },
    { market: "ksa", locale: "ar-SA", displayName: "Saudi Arabia", pending: false, stagedDecision: "off" },
    { market: "uk", locale: "en-GB", displayName: "United Kingdom", pending: true, stagedDecision: "off" },
  ];
  assert.deepEqual(
    affectedPublicationDestinations(destinations).map((item) => item.market),
    ["uae", "uk"],
  );
});
