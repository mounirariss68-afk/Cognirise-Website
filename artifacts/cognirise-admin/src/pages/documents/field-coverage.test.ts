import assert from "node:assert/strict";
import test from "node:test";
import { cmsDocumentKinds } from "@workspace/api-zod";
import { CMS_FIELD_COVERAGE, fieldCoverageFor } from "./field-coverage.ts";

test("field coverage inventory names all ten document kinds", () => {
  assert.deepEqual(Object.keys(CMS_FIELD_COVERAGE).sort(), [...cmsDocumentKinds].sort());
  for (const kind of cmsDocumentKinds) {
    const fields = fieldCoverageFor(kind);
    assert.ok(fields.length > 0, `${kind} must have field coverage`);
    assert.ok(fields.some((field) => field.path === "schemaVersion"), `${kind} must record schemaVersion`);
  }
});

test("schema-only relationships are classified without dropping stored values", () => {
  for (const kind of cmsDocumentKinds) {
    const fields = fieldCoverageFor(kind);
    const relationships = fields.filter((field) => field.path === "relatedIds[]");
    if (kind === "site-configuration") {
      assert.equal(relationships.length, 0);
    } else {
      assert.equal(relationships[0]?.consumer, "schema-only");
    }
  }
  assert.equal(fieldCoverageFor("publication").find((field) => field.path === "platformIds[]")?.consumer, "schema-only");
  assert.equal(fieldCoverageFor("publication").find((field) => field.path === "social.title")?.draft, "read-only");
});