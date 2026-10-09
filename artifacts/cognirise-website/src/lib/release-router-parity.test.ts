import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { CMS_RELEASE_REGISTRY } from "@workspace/api-zod";

test("every released page has an exact website route and every dynamic registry route has a matching router", async () => {
  const app = await readFile(new URL("../App.tsx", import.meta.url), "utf8");
  for (const route of CMS_RELEASE_REGISTRY.routes) {
    if (route.routeType === "redirect" || route.routeType === "alias") continue;
    const marker = `path="${route.path}"`;
    assert.equal(
      app.includes(marker),
      true,
      `${route.destinationId} (${route.path}) lacks an exact website router declaration`,
    );
  }
});

test("the registry never claims an open dynamic renderer for fixed-template methodology or service pages", () => {
  assert.equal(
    CMS_RELEASE_REGISTRY.routes.some((route) =>
      route.routeType === "dynamic"
      && (route.path.startsWith("/methodologies/") || route.path.startsWith("/what-we-do/"))),
    false,
  );
});