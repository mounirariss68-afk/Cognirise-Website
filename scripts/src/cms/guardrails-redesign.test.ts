import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";
import { repositoryRoot } from "./common.js";
import { guardrailsFixture } from "./guardrails-fixture.js";
import {
  GUARDRAILS_HERO,
  GUARDRAILS_REDESIGN_VERSION,
  guardrailsPresentation,
  redesignedGuardrailsSnapshot,
} from "./guardrails-redesign.js";

const hero = {
  mediaId: "6c1e0194-3c88-4f5b-97b2-fca2d45ad787",
  mediaVersionId: "953e240a-3dcf-47fc-98ec-ddb8e5158d3e",
};

test("the confirmed Guardrails hero has an exact immutable source identity", async () => {
  const bytes = await readFile(`${repositoryRoot}/${GUARDRAILS_HERO.sourceFile}`);
  assert.equal(bytes.length, GUARDRAILS_HERO.byteSize);
  assert.equal(
    createHash("sha256").update(bytes).digest("hex"),
    GUARDRAILS_HERO.checksum,
  );
  assert.deepEqual(
    [GUARDRAILS_HERO.width, GUARDRAILS_HERO.height, GUARDRAILS_HERO.mimeType],
    [1024, 1024, "image/jpeg"],
  );
});

test("the redesigned transform preserves the old complete fixture and adds only presentation plus hero pin", () => {
  const redesigned = redesignedGuardrailsSnapshot(hero);
  assert.equal(validateCmsSnapshot("framework", redesigned, "draft").success, true);
  assert.equal("presentation" in guardrailsFixture.content, false);
  assert.equal("heroMedia" in guardrailsFixture.content, false);
  assert.deepEqual(
    {
      ...redesigned.content,
      presentation: undefined,
      heroMedia: undefined,
    },
    {
      ...guardrailsFixture.content,
      presentation: undefined,
      heroMedia: undefined,
    },
  );
  assert.deepEqual(redesigned.mediaIds, [hero.mediaId]);
  assert.deepEqual(redesigned.content.heroMedia, {
    ...hero,
    role: "hero",
    altText: GUARDRAILS_HERO.altText,
  });
  assert.deepEqual(redesigned.seo?.ogImageMedia, {
    ...hero,
    role: "og-image",
    altText: GUARDRAILS_HERO.altText,
  });
});

test("concise presentation has seven groups without copying structural governance", () => {
  assert.equal(guardrailsPresentation.version, GUARDRAILS_REDESIGN_VERSION);
  assert.deepEqual(Object.keys(guardrailsPresentation).sort(), [
    "authority",
    "distinction",
    "exposure",
    "hero",
    "layers",
    "setProveHold",
    "sourcesNextStep",
    "version",
  ]);
  assert.equal(guardrailsPresentation.hero.headline, "Guardrails that hold.");
  assert.equal(guardrailsPresentation.hero.subheadline, "Set the boundaries. Prove they work. Keep them working as your AI changes.");
  assert.match(guardrailsPresentation.setProveHold.summary, /Set what matters\. Prove it survives attack\. Hold it/);
  assert.match(guardrailsPresentation.exposure.summary, /Each band carries its own requirement/);
  assert.equal("exposures" in guardrailsPresentation, false);
  assert.equal("phases" in guardrailsPresentation, false);
});

test("the old controlled mappings and four steps per phase remain untouched by redesign", () => {
  assert.deepEqual(
    guardrailsFixture.content.stoppingRule.exposures.map((item) => [item.id, item.enforcementLayer, item.additionId]),
    [
      ["internal-reversible", "prompt", "monitoring"],
      ["reversible-cost", "runtime", "none"],
      ["irreversible-customer", "runtime", "architectural-scoping"],
      ["regulator-public-safety", "architecture", "independent-control"],
      ["above-ceiling", "architecture", "authority-artefact"],
    ],
  );
  assert.deepEqual(
    guardrailsFixture.content.method.phases.map((phase) => [phase.id, phase.steps.length]),
    [["set", 4], ["prove", 4], ["hold", 4]],
  );
});