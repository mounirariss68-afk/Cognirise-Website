import assert from "node:assert/strict";
import test from "node:test";
import {
  canAccessExplicitGrant,
  canAccessLegacyContent,
  capabilityGrantPrerequisiteErrors,
  type CapabilityGrant,
} from "../src/lib/policy.ts";

const regionalView: CapabilityGrant = {
  topic: "platform",
  capability: "view",
  scope: "regional",
  marketCode: "uae",
};

test("explicit grants deny unlisted topics and geographies", () => {
  assert.equal(canAccessExplicitGrant([regionalView], {
    topic: "platform", capability: "view", marketCode: "uae",
  }), true);
  assert.equal(canAccessExplicitGrant([regionalView], {
    topic: "platform", capability: "view", marketCode: "ksa",
  }), false);
  assert.equal(canAccessExplicitGrant([regionalView], {
    topic: "publication", capability: "view", marketCode: "uae",
  }), false);
  assert.equal(canAccessExplicitGrant([regionalView], {
    topic: "platform", capability: "edit", marketCode: "uae",
  }), false);
});

test("shared access needs a distinct source grant and every destination right", () => {
  const grants: CapabilityGrant[] = [
    { topic: "platform", capability: "view", scope: "shared", marketCode: "uae" },
    regionalView,
    { topic: "platform", capability: "view", scope: "regional", marketCode: "ksa" },
  ];
  assert.equal(canAccessExplicitGrant(grants, {
    topic: "platform",
    capability: "view",
    marketCode: "uae",
    scope: "shared",
    sourceMarketCode: "uae",
    destinationMarketCodes: ["uae", "ksa"],
  }), true);
  assert.equal(canAccessExplicitGrant(grants.filter((grant) => grant.marketCode !== "ksa"), {
    topic: "platform",
    capability: "view",
    marketCode: "uae",
    scope: "shared",
    sourceMarketCode: "uae",
    destinationMarketCodes: ["uae", "ksa"],
  }), false);
});

test("capability prerequisites preserve review independence but protect release", () => {
  assert.deepEqual(capabilityGrantPrerequisiteErrors([{
    topic: "platform", capability: "review", scope: "regional", marketCode: "uae",
  }]), ["platform/uae/regional: review requires view."]);
  assert.equal(capabilityGrantPrerequisiteErrors([
    regionalView,
    { topic: "platform", capability: "review", scope: "regional", marketCode: "uae" },
  ]).length, 0);
  assert.match(
    capabilityGrantPrerequisiteErrors([{
      topic: "platform", capability: "publish", scope: "regional", marketCode: "uae",
    }]).join(" "),
    /publish requires (view|review)/,
  );
});

test("legacy shared compatibility preserves all-destination market constraint", () => {
  assert.equal(canAccessLegacyContent({
    role: "publisher",
    marketCodes: ["uae"],
  }, {
    topic: "platform",
    capability: "publish",
    marketCode: "uae",
    scope: "shared",
    sourceMarketCode: "uae",
    destinationMarketCodes: ["uae", "ksa"],
  }), false);
});