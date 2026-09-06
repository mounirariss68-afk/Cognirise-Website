import assert from "node:assert/strict";
import test from "node:test";
import { assistantTargets } from "./assistant-targets";

test("assistant targets construct only strict API-compatible document requests", () => {
  const payloads = [
    ["page", { content: { title: "Page title", summary: "Page summary", seo: { metaTitle: "SEO title" } } }],
    ["publication", { content: { title: "Publication", dek: "Publication dek", seo: { metaDescription: "SEO description" } } }],
    ["person", { content: { name: "Editor", role: "Reviewer" } }],
    ["organization", { content: { name: "Cognirise", website: "https://example.test" } }],
  ] as const;
  for (const [kind, payload] of payloads) {
    for (const target of assistantTargets(kind, payload)) {
      assert.ok(["page", "publication", "person", "organization"].includes(target.contentType));
      assert.ok(target.value.length > 0);
      assert.ok(target.maxLength >= target.value.length);
      assert.ok(target.operations.every((operation) =>
        operation === "quality-review" ||
        (operation === "summary" && ["summary", "dek"].includes(target.fieldPath)) ||
        (operation === "report-abstract" && target.fieldPath === "dek") ||
        (operation === "seo-metadata" && target.fieldPath.startsWith("seo."))));
    }
  }
  assert.deepEqual(assistantTargets("page", { content: { sections: [] } }), []);
});