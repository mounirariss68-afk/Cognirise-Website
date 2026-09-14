import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  CreateDocumentBody,
  guardrailsFrameworkContentSchema,
  validateCmsContent,
  validateCmsSnapshot,
} from "@workspace/api-zod";
import { guardrailsFixture } from "./guardrails-fixture.js";
import {
  guardrailsSetProveHoldContent,
  guardrailsSetProveHoldFixture,
} from "./guardrails-set-prove-hold.js";

const source = readFileSync(
  new URL("../../../attached_assets/Set-Prove-Hold-AI-Guardrails-Framework_(1)_1789395806128.html", import.meta.url),
  "utf8",
);

test("Set, Prove & Hold fixture validates as the replacement standalone Guardrails variant", () => {
  assert.equal(
    guardrailsFrameworkContentSchema.safeParse(guardrailsSetProveHoldContent).success,
    true,
  );
  const snapshot = validateCmsSnapshot("framework", guardrailsSetProveHoldFixture, "draft");
  assert.equal(snapshot.success, true, snapshot.success ? undefined : snapshot.errors.join("; "));
  assert.equal(CreateDocumentBody.safeParse({
    kind: "framework",
    slug: guardrailsSetProveHoldFixture.slug,
    title: guardrailsSetProveHoldFixture.title,
    summary: guardrailsSetProveHoldFixture.summary,
    content: guardrailsSetProveHoldFixture.content,
    markets: guardrailsSetProveHoldFixture.markets,
  }).success, true, "generated OpenAPI request schema must accept the replacement arm");
  assert.equal(guardrailsSetProveHoldContent.template, "guardrails");
  assert.equal(guardrailsSetProveHoldContent.contentVersion, "set-prove-hold-v1");
  assert.equal("stoppingRule" in guardrailsSetProveHoldContent, false);
  assert.equal("questions" in guardrailsSetProveHoldContent, false);
  assert.equal("measurement" in guardrailsSetProveHoldContent, false);
});

test("the replacement preserves all twelve non-UAE source actions with operating detail", () => {
  const expected = [
    ["set-name", "Name what must never happen"],
    ["set-build", "Build it into the strongest layer you can"],
    ["set-choose", "Choose what happens when it triggers"],
    ["set-assign", "Give each rule an owner"],
    ["prove-attack", "Attack each rule directly"],
    ["prove-red-team", "Widen the attack to the whole system"],
    ["prove-count", "Count what it blocks wrongly"],
    ["prove-record", "Record the result with a date on it"],
    ["hold-watch", "Watch the blocked attempts"],
    ["hold-retest", "Re-test on every change"],
    ["hold-revisit", "Add new rules, retire old ones"],
    ["hold-report", "Report how strong they are, not how many"],
  ];
  assert.deepEqual(
    guardrailsSetProveHoldContent.actions.map(({ id, title }) => [id, title]),
    expected,
  );
  assert.deepEqual(
    guardrailsSetProveHoldContent.overview.phases.map(({ id, mode, actionIds }) => [id, mode, actionIds.length]),
    [["set", "sequential", 4], ["prove", "pre-launch-tests", 4], ["hold", "concurrent", 4]],
  );
  for (const action of guardrailsSetProveHoldContent.actions) {
    assert.ok(action.explanation.length > 0, `${action.id} needs an explanation`);
    assert.ok(action.owner.length > 0, `${action.id} needs an owner`);
    assert.ok(action.outputOrCadence.value.length > 0, `${action.id} needs an output or cadence`);
    assert.ok(action.failureCondition.length > 0, `${action.id} needs a failure condition`);
    assert.ok(action.callout.length > 0, `${action.id} needs a supporting callout`);
    assert.ok(source.includes(action.title), `${action.title} is missing from supplied HTML`);
  }
});

test("four layers, lifecycle matrix, moves, qualified claims, and verified non-UAE references are governed", () => {
  assert.deepEqual(
    guardrailsSetProveHoldContent.layers.rows.map(({ id, strength }) => [id, strength]),
    [["policy", 1], ["prompt", 2], ["runtime", 3], ["architecture", 4]],
  );
  assert.equal(guardrailsSetProveHoldContent.lifecycleMatrix.rows.length, 4);
  assert.deepEqual(
    guardrailsSetProveHoldContent.moves.items.map(({ id, number }) => [id, number]),
    [["one", 1], ["two", 2], ["three", 3]],
  );
  const serialized = JSON.stringify(guardrailsSetProveHoldFixture);
  assert.doesNotMatch(serialized, /\bUAE\b|Dubai|Abu Dhabi|PDPL|Arabic|Charter/i);
  assert.match(serialized, /illustrative evidence language/i);
  assert.match(serialized, /not a certification/i);
  const sourceAnchors = {
    "owasp-llm-top-10": /OWASP GenAI LLM Top 10/,
    "owasp-agent-control-standard": /OWASP Agent Control Standard/,
    "mitre-atlas": /MITRE ATLAS/,
    "nist-ai-rmf": /NIST AI RMF/,
    "nist-ai-600-1": /600-1/,
    "iso-42001": /ISO\/IEC 42001/,
  } as const;
  for (const reference of guardrailsSetProveHoldContent.references.items) {
    assert.match(reference.url, /^https:\/\//);
    assert.match(source, sourceAnchors[reference.id]);
  }
  assert.deepEqual(
    guardrailsSetProveHoldContent.references.items.map(({ id }) => id),
    ["owasp-llm-top-10", "owasp-agent-control-standard", "mitre-atlas", "nist-ai-rmf", "nist-ai-600-1", "iso-42001"],
    "Every retained non-UAE foundation source must have a dedicated reference record.",
  );
  assert.deepEqual(
    guardrailsSetProveHoldContent.sources.map(({ label }) => label),
    [
      "OWASP Top 10 for LLM Applications (2025)",
      "OWASP Agent Control Standard (v0.1 cited; release not verified)",
      "MITRE ATLAS",
      "NIST AI RMF 1.0",
      "NIST Generative AI Profile",
      "ISO/IEC 42001:2023",
    ],
    "The CMS source ledger must be reverse-complete with the reference inventory.",
  );
  assert.match(
    guardrailsSetProveHoldContent.actions.find(({ id }) => id === "prove-attack")!.callout,
    /OWASP's Top 10/i,
  );
  assert.match(
    guardrailsSetProveHoldContent.actions.find(({ id }) => id === "prove-red-team")!.callout,
    /MITRE ATLAS/i,
  );
  assert.match(
    guardrailsSetProveHoldContent.actions.find(({ id }) => id === "prove-record")!.callout,
    /ISO\/IEC 42001/i,
  );
});

test("legacy Guardrails revisions remain readable but an explicit unknown version fails closed", () => {
  const legacy = {
    ...guardrailsSetProveHoldContent,
    contentVersion: "guardrails-legacy-v1",
  };
  // A mixed replacement/legacy payload is never accepted.
  assert.equal(guardrailsFrameworkContentSchema.safeParse(legacy).success, false);

  const unversionedLegacy = {
    schemaVersion: 1,
    template: "guardrails",
    hero: {
      eyebrow: "Legacy",
      headline: "Legacy",
      subheadline: "Legacy",
      primaryAction: { label: "Contact", href: "/contact" },
      secondaryAction: { label: "Authority", href: "/methodologies/agent-authority-model" },
    },
  };
  // Incomplete history remains editable as a draft; full legacy snapshots are
  // parsed through the legacy arm by the CMS's draft validator.
  assert.equal(validateCmsSnapshot("framework", {
    slug: "guardrails-framework",
    title: "Legacy",
    summary: "Legacy snapshot",
    content: unversionedLegacy,
    mediaIds: [],
    markets: ["global"],
  }, "draft").success, true);
  assert.equal(
    guardrailsFrameworkContentSchema.parse(guardrailsFixture.content).contentVersion,
    "guardrails-legacy-v1",
    "Only genuinely unversioned historical snapshots receive the legacy discriminator.",
  );
  assert.equal(guardrailsFrameworkContentSchema.safeParse({
    ...guardrailsFixture.content,
    contentVersion: undefined,
  }).success, false);
  assert.equal(guardrailsFrameworkContentSchema.safeParse({
    ...guardrailsFixture.content,
    contentVersion: null,
  }).success, false);
  assert.equal(guardrailsFrameworkContentSchema.safeParse({
    ...guardrailsSetProveHoldContent,
    contentVersion: "unknown",
  }).success, false);

  const publishableReplacement = {
    ...guardrailsSetProveHoldContent,
    visibility: "public" as const,
  };
  assert.equal(validateCmsContent("framework", publishableReplacement, "publish").success, true);
  assert.equal(validateCmsContent("framework", {
    ...publishableReplacement,
    contentVersion: undefined,
  }, "publish").success, false, "An explicitly undefined version must not default during full publish validation.");
  assert.equal(validateCmsContent("framework", {
    ...publishableReplacement,
    contentVersion: null,
  }, "publish").success, false, "An explicitly null version must not default during full publish validation.");
});