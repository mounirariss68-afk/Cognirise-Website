import assert from "node:assert/strict";
import test from "node:test";
import { validateCmsContent } from "@workspace/api-zod";
import {
  guardrailsDraft,
  guardrailsEditableTextPaths,
} from "./ContentEditor.tsx";

test("Guardrails draft initializer has the final saveable structural shape", () => {
  const draft = guardrailsDraft();

  assert.equal(validateCmsContent("framework", draft, "draft").success, true);
  assert.equal(draft.template, "guardrails");
  assert.equal(draft.layers.tableHeaders.length, 5);
  assert.equal(draft.layers.diagram.rows.length, 4);
  assert.equal(draft.layers.diagram.thresholdAfter, "prompt");
  assert.deepEqual(draft.layers.diagram.rows.map((row: { strength: number }) => row.strength), [1, 2, 3, 4]);
  assert.deepEqual(draft.layers.diagram.rows.map((row: { strengthLabel: string }) => row.strengthLabel), ["1 of 4", "2 of 4", "3 of 4", "4 of 4"]);
  assert.equal(draft.stoppingRule.exposures.length, 5);
  assert.deepEqual(
    draft.stoppingRule.diagram.bands.map((band: { destination: string; additionId: string }) => [band.destination, band.additionId]),
    [["prompt", "monitoring"], ["runtime", "none"], ["runtime", "architectural-scoping"], ["architecture", "independent-control"], ["architecture", "authority-artefact"]],
  );
  assert.equal(draft.references.groups.length, 3);
  assert.equal(draft.moves.moves.length, 3);
  assert.equal("sourcesSection" in draft, false);
});

test("Guardrails editor exposes prose, never structural or governance slots", () => {
  const paths = guardrailsEditableTextPaths({
    ...guardrailsDraft(),
    relatedIds: ["6c1e0194-3c88-4f5b-97b2-fca2d45ad787"],
    sources: [{ title: "Evidence", url: "https://example.com/evidence" }],
  });
  const structuralKeys = new Set([
    "template", "id", "href", "enforcementLayer", "destination", "additionId",
    "thresholdAfter", "strength", "strengthLabel", "number", "schemaVersion",
    "visibility", "order", "verificationDate", "reviewDate", "relatedIds",
  ]);

  assert(paths.some((path) => path.join(".") === "hero.headline"));
  assert.equal(paths.some((path) => structuralKeys.has(path.at(-1) ?? "")), false);
  assert.equal(paths.some((path) => path[0] === "sources"), false);
  assert.equal(paths.some((path) => path[0] === "relatedIds"), false);
});