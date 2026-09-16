import assert from "node:assert/strict";
import test from "node:test";
import { composePlatformCatalog, PLATFORM_CATALOG } from "./platformCatalog";

const expected = [
  ["CogniOS", "/platforms/cognios"],
  ["CogniAgents", "/platforms/cogniagents"],
  ["CogniDocs", "/platforms/cognidocs"],
  ["CogniBase", "/platforms/cognibase"],
  ["Lupitor", "/platforms/lupitor"],
  ["Datatoolpack", "/platforms/datatoolpack"],
  ["bunjee.ai", "/platforms/bunjee-ai"],
];

test("defines the exact canonical seven-platform journey", () => {
  assert.deepEqual(PLATFORM_CATALOG.map(({ name, href }) => [name, href]), expected);
  assert.deepEqual(
    PLATFORM_CATALOG.filter(({ ownership }) => ownership === "partner").map(({ name }) => name),
    ["Lupitor", "Datatoolpack", "bunjee.ai"],
  );
});

test("published data can enrich owned summaries without changing canonical identity or duplicating partners", () => {
  const composed = composePlatformCatalog([
    { slug: "cognitalk", description: "Retired conversation record" },
    { slug: "cogniware", description: "Published integration description" },
    { slug: "lupitor", description: "CMS duplicate partner" },
    { slug: "bunjee-ai", description: "CMS duplicate partner" },
    { slug: "unknown", description: "Unknown platform" },
  ]);
  assert.deepEqual(composed.map(({ name, href }) => [name, href]), expected);
  assert.equal(composed.find(({ name }) => name === "CogniBase")?.description, "Published integration description");
  assert.notEqual(composed.find(({ name }) => name === "Lupitor")?.description, "CMS duplicate partner");
  assert.equal(new Set(composed.map(({ href }) => href)).size, 7);
});