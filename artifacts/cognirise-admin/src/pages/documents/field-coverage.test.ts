import assert from "node:assert/strict";
import test from "node:test";
import { cmsDocumentKinds } from "@workspace/api-zod";
import { guardrailsSetProveHoldContent } from "../../../../../scripts/src/cms/guardrails-set-prove-hold.ts";
import { guardrailsFixture } from "../../../../../scripts/src/cms/guardrails-fixture.ts";
import { guardrailsEditableTextPaths, guardrailsRevisionInventory } from "./guardrails-editor-inventory.ts";
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

test("specialist nested control inventory has unique wildcard paths", () => {
  const fields = fieldCoverageFor("industry");
  const paths = fields.map((field) => field.path);
  assert.equal(new Set(paths).size, paths.length, "a field must have one consumer disposition");
  for (const path of [
    "educationPov.applications[].items[].sourceUrls[]",
    "educationPov.imagery.educatorPractice.media.mediaVersionId",
    "bankingPov.startingPoints[].action.href",
    "bankingPov.productionReadiness.focalPoint.x",
    "bankingPov.caseMembershipSnapshot[].digest",
    "publicSectorPov.marketContext[].items[]",
  ]) {
    assert.ok(paths.includes(path), `missing nested specialist control: ${path}`);
  }
  assert.equal(fields.find((field) => field.path === "bankingPov.caseMembershipSnapshot[].digest")?.consumer, "internal");
});

test("framework and hero variants retain leaf-level inventory rather than section-only entries", () => {
  const framework = fieldCoverageFor("framework").map((field) => field.path);
  for (const path of [
    "hero.media.mediaVersionId",
    "guardrails.comparisonRows[].authorityModelEmphasis",
    "guardrails.interaction.requiredControls.controlExample",
    "editorial.*.media.mediaVersionId",
  ]) assert.ok(framework.includes(path), `missing framework leaf: ${path}`);

  const configuration = fieldCoverageFor("site-configuration");
  assert.equal(configuration.find((field) => field.path === "contactEmail")?.consumer, "public-detail");
  assert.equal(configuration.find((field) => field.path === "hero.sources[].mimeType")?.consumer, "internal");
});

test("Guardrails revision inventory exactly follows standalone rendered prose controls", () => {
  for (const content of [guardrailsFixture.content, guardrailsSetProveHoldContent]) {
    const inventory = guardrailsRevisionInventory(content);
    const editable = inventory.filter((entry) => entry.draft === "editable").map((entry) => entry.path).sort();
    const rendered = guardrailsEditableTextPaths(content).map((path) => `content.${path.join(".")}`).sort();
    assert.deepEqual(editable, rendered, `${content.contentVersion} must inventory every rendered Area control`);
    assert.ok(inventory.every((entry) => entry.path.startsWith("content.")));
    assert.ok(inventory.some((entry) => entry.draft === "read-only" && entry.consumer === "internal"), `${content.contentVersion} must retain protected structural exclusions`);
  }

  const legacy = guardrailsRevisionInventory(guardrailsFixture.content);
  assert.equal(legacy.find((entry) => entry.path === "content.hero.primaryAction.href")?.draft, "read-only");
  assert.equal(legacy.find((entry) => entry.path === "content.layers.table.0.id")?.consumer, "internal");
  assert.equal(legacy.find((entry) => entry.path === "content.schemaVersion")?.draft, "derived");
  assert.throws(() => guardrailsRevisionInventory({ contentVersion: "unsupported" }), /supported contentVersion/);
});