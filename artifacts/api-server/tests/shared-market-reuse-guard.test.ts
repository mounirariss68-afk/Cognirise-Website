import assert from "node:assert/strict";
import test from "node:test";
import { destinationRevisionMatchesExpected, sameLanguageLocale } from "../src/lib/shared-market-reuse-guard.ts";

test("guided reuse refuses exact destinations changed after comparison", () => {
  assert.equal(destinationRevisionMatchesExpected("saved-target", "saved-target"), true);
  assert.equal(destinationRevisionMatchesExpected("saved-target", "newer-target"), false);
  assert.equal(destinationRevisionMatchesExpected("saved-target", null), false);
});

test("guided reuse refuses a customization created after an empty-target comparison", () => {
  assert.equal(destinationRevisionMatchesExpected(null, null), true);
  assert.equal(destinationRevisionMatchesExpected(null, "new-customization"), false);
  assert.equal(destinationRevisionMatchesExpected(undefined, "legacy-caller"), true);
});

test("shared baselines match BCP-47 language identity but never treat und as a wildcard", () => {
  assert.equal(sameLanguageLocale("en-US", "en"), true);
  assert.equal(sameLanguageLocale("en", "en-GB"), true);
  assert.equal(sameLanguageLocale("en-US", "ar-SA"), false);
  assert.equal(sameLanguageLocale("und", "en"), false);
});