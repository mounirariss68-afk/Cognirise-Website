import assert from "node:assert/strict";
import test from "node:test";
import { cleanHeroIdentifier } from "./hero-identifiers";

test("removes country and configured location prefixes from hero labels", () => {
  assert.equal(
    cleanHeroIdentifier("UAE / AI-native advisory & engineering"),
    "AI-native advisory & engineering",
  );
  assert.equal(
    cleanHeroIdentifier("Platforms / Riyadh · Kingdom of Saudi Arabia", {
      marketLocation: "Riyadh · Kingdom of Saudi Arabia",
    }),
    "Platforms",
  );
});

test("removes revision tokens without changing the useful section label", () => {
  assert.equal(
    cleanHeroIdentifier("Methodologies / 03"),
    "Methodologies",
  );
  assert.equal(
    cleanHeroIdentifier("Platforms / UAE / version 2"),
    "Platforms",
  );
});

test("does not alter a clean hero label or regional editorial copy", () => {
  const label = "AI-native advisory & engineering";
  const body = "UAE teams need a route from strategy into production.";
  assert.equal(cleanHeroIdentifier(label), label);
  assert.equal(body, "UAE teams need a route from strategy into production.");
});