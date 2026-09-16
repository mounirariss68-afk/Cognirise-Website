import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessContent,
  canAccessAnyContentCapability,
  marketsForContentCapability,
} from "./content-capability";

test("a configured empty matrix is deny-all, including for administrators", () => {
  const user = {
    role: "administrator",
    marketCodes: ["uae", "ksa"],
    legacyAdministratorMarketCodes: ["uae"],
    capabilityMatrixConfigured: true,
    capabilityGrants: [],
  } as const;
  assert.equal(canAccessContent(user, {
    topic: "publication", capability: "view", marketCode: "uae",
  }), false);
  assert.equal(canAccessAnyContentCapability(user, "edit"), false);
  assert.deepEqual(marketsForContentCapability(user, "publication", "edit", ["uae", "ksa"]), []);
});

test("legacy administrator authority stays within the frozen geography", () => {
  const user = {
    role: "administrator",
    marketCodes: ["uae", "ksa"],
    legacyAdministratorMarketCodes: ["uae"],
  } as const;
  assert.equal(canAccessContent(user, {
    topic: "platform", capability: "edit", marketCode: "uae",
  }), true);
  assert.equal(canAccessContent(user, {
    topic: "platform", capability: "edit", marketCode: "ksa",
  }), false);
});

test("shared authority requires the source and every destination", () => {
  const user = {
    role: "viewer",
    capabilityMatrixConfigured: true,
    capabilityGrants: [
      { topic: "platform", capability: "edit", scope: "shared", marketCode: "uae" },
      { topic: "platform", capability: "edit", scope: "regional", marketCode: "uae" },
      { topic: "platform", capability: "edit", scope: "regional", marketCode: "ksa" },
    ],
  } as const;
  assert.equal(canAccessAnyContentCapability(user, "edit"), true);
  assert.equal(canAccessContent(user, {
    topic: "platform",
    capability: "edit",
    marketCode: "uae",
    scope: "shared",
    sourceMarketCode: "uae",
    destinationMarketCodes: ["uae", "ksa"],
  }), true);
  assert.equal(canAccessContent(user, {
    topic: "platform",
    capability: "edit",
    marketCode: "uae",
    scope: "shared",
    sourceMarketCode: "uae",
    destinationMarketCodes: ["uae", "qatar"],
  }), false);
});