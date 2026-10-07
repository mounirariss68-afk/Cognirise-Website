import assert from "node:assert/strict";
import test from "node:test";
import { INDUSTRIES } from "./industries";
import { applyTelecomLaunch } from "./telecom-launch";

test("Telecom launch uses the new work without replacing the approved hero or regional context", () => {
  const base = INDUSTRIES.find(item => item.slug === "telecoms")!;
  const view = applyTelecomLaunch(base);
  assert.equal(view.thesis, "Transform the enterprise around the network.");
  assert.equal(view.image, base.image);
  assert.equal(view.imageAlt, base.imageAlt);
  assert.equal(view.gcc, base.gcc);
  assert.equal(view.telecomPov?.departments.length, 18);
  assert.equal(view.telecomPov?.scenarios.length, 8);
  assert.equal(applyTelecomLaunch(INDUSTRIES[0]), INDUSTRIES[0]);
});
