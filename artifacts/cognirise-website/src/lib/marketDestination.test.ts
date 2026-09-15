import assert from "node:assert/strict";
import test from "node:test";
import { marketAwareDestination } from "./marketDestination";

test("market-aware navigation preserves the selected edition and anchors", () => {
  assert.equal(
    marketAwareDestination("/methodologies/guardrails-framework", "uae", "en"),
    "/methodologies/guardrails-framework?market=uae&locale=en",
  );
  assert.equal(
    marketAwareDestination("/platforms?view=layers#architecture", "ksa", "ar"),
    "/platforms?view=layers&market=ksa&locale=ar#architecture",
  );
});