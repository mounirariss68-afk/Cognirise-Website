import assert from "node:assert/strict";
import test from "node:test";
import { isCurrentRouteDestination, routePath } from "./routeState";

test("matches exact destinations independently of market query parameters", () => {
  assert.equal(routePath("/methodologies/agent-authority-model?market=uae"), "/methodologies/agent-authority-model");
  assert.equal(
    isCurrentRouteDestination(
      "/methodologies/agent-authority-model",
      "/methodologies/agent-authority-model?market=uae",
      "",
    ),
    true,
  );
  assert.equal(isCurrentRouteDestination("/methodologies/idao", "/methodologies/agent-authority-model?market=uae", ""), false);
});

test("distinguishes overview destinations from anchored child destinations", () => {
  assert.equal(isCurrentRouteDestination("/platforms", "/platforms?market=uae", "#architecture"), false);
  assert.equal(isCurrentRouteDestination("/platforms#architecture", "/platforms?market=uae", "#architecture"), true);
});