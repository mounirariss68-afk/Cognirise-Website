import assert from "node:assert/strict";
import test from "node:test";
import { canAccessPendingPreviewMedia } from "../src/preview-access.js";

test("only editorial roles can obtain pending-review preview media", () => {
  assert.equal(canAccessPendingPreviewMedia("editor"), true);
  assert.equal(canAccessPendingPreviewMedia("publisher"), true);
  assert.equal(canAccessPendingPreviewMedia("administrator"), true);
  assert.equal(canAccessPendingPreviewMedia("viewer"), false);
  assert.equal(canAccessPendingPreviewMedia(undefined), false);
});