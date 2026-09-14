import assert from "node:assert/strict";
import test from "node:test";
import { validateCmsContent } from "@workspace/api-zod";
import {
  authoritySummaryDraft,
  guardrailsDraft,
  guardrailsEditableTextPaths,
} from "./ContentEditor.tsx";

test("Guardrails draft initializer starts new records on the Set, Prove & Hold structural shape", () => {
  const draft = guardrailsDraft();

  assert.equal(validateCmsContent("framework", draft, "draft").success, true);
  assert.equal(draft.template, "guardrails");
  assert.equal(draft.contentVersion, "set-prove-hold-v1");
  assert.equal(draft.layers.rows.length, 4);
  assert.deepEqual(draft.layers.rows.map((row: { strength: number }) => row.strength), [1, 2, 3, 4]);
  assert.deepEqual(
    draft.overview.phases.map((phase: { id: string; mode: string; actionIds: string[] }) => [phase.id, phase.mode, phase.actionIds.length]),
    [["set", "sequential", 4], ["prove", "pre-launch-tests", 4], ["hold", "concurrent", 4]],
  );
  assert.equal(draft.actions.length, 12);
  assert.equal(draft.moves.items.length, 3);
  assert.equal("stoppingRule" in draft, false);
  assert.equal("authority" in draft, false);
});

test("Guardrails editor exposes prose, never structural or governance slots", () => {
  const paths = guardrailsEditableTextPaths({
    ...guardrailsDraft(),
    relatedIds: ["6c1e0194-3c88-4f5b-97b2-fca2d45ad787"],
    sources: [{ title: "Evidence", url: "https://example.com/evidence" }],
    heroMedia: {
      mediaId: "6c1e0194-3c88-4f5b-97b2-fca2d45ad787",
      mediaVersionId: "953e240a-3dcf-47fc-98ec-ddb8e5158d3e",
      role: "hero",
      altText: "Governed hero",
    },
    presentation: {
      version: "guardrails-redesign-v1",
      distinction: { summary: "Concise distinction." },
    },
  });
  const structuralKeys = new Set([
    "template", "contentVersion", "id", "href", "phase", "mode", "actionIds", "sourceIds", "sourceId", "layerId", "enforcementLayer", "destination", "additionId",
    "thresholdAfter", "strength", "strengthLabel", "number", "schemaVersion",
    "visibility", "order", "verificationDate", "reviewDate", "relatedIds",
  ]);

  assert(paths.some((path) => path.join(".") === "hero.headline"));
  assert.equal(paths.some((path) => path.join(".") === "references.items.0.version"), true);
  assert.equal(paths.some((path) => path.join(".") === "actions.0.outputOrCadence.label"), false);
  assert.equal(paths.some((path) => structuralKeys.has(path.at(-1) ?? "")), false);
  assert.equal(paths.some((path) => path[0] === "sources"), false);
  assert.equal(paths.some((path) => path[0] === "relatedIds"), false);
});

test("Guardrails editor keeps an optional immutable hero selection out of prose fields", () => {
  const paths = guardrailsEditableTextPaths({
    ...guardrailsDraft(),
    heroMedia: {
      mediaId: "6c1e0194-3c88-4f5b-97b2-fca2d45ad787",
      mediaVersionId: "953e240a-3dcf-47fc-98ec-ddb8e5158d3e",
      role: "hero",
      altText: "Governed hero",
    },
    presentation: {
      version: "guardrails-redesign-v1",
      distinction: { summary: "Concise distinction." },
    },
  });
  assert.equal(paths.some((path) => path[0] === "heroMedia"), false);
  assert.equal(paths.some((path) => path.join(".") === "presentation.version"), false);
  assert.equal(paths.some((path) => path.join(".") === "presentation.distinction.summary"), true);
});
test("Agent Authority summary authoring keeps four rules and a fixed first figure", () => {
  const draft = authoritySummaryDraft();
  assert.equal(draft.rules.length, 4);
  assert.equal(draft.firstFigure.asset, "aam-guardrails-vs-authority.svg");
  assert.deepEqual(Object.keys(draft).sort(), [
    "caveat",
    "disclosureLabel",
    "firstFigure",
    "handover",
    "lead",
    "rules",
  ]);
});
