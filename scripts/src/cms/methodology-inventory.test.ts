import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import {
  METHODOLOGY_SLUGS,
  aiUseCasePrioritizationEditorial,
  aiUseCasePrioritizationHeroSeed,
  aiValueToScaleEditorial,
  aiValueToScaleHeroSeed,
  agenticOperationsReadinessEditorial,
  agenticOperationsReadinessHeroSeed,
  humanAgentOperatingModelEditorial,
  humanAgentOperatingModelHeroSeed,
  idaoEditorial,
  idaoHeroSeed,
  idaoMediaInventory,
  methodologyCanonicalSeed,
  methodologyEditorialDefinition,
  methodologyEditorialDefinitions,
  validateCmsContent,
} from "@workspace/api-zod";
import { repositoryRoot } from "./common.js";

const STANDALONE_EDITORIAL_SLUGS = [
  "idao",
  "ai-use-case-prioritization",
  "ai-value-to-scale",
  "agentic-operations-readiness",
  "human-agent-operating-model",
] as const;

type InventoryRecord = {
  type: string;
  name?: string;
  fields: {
    slug: string;
    content: {
      template?: string;
      thesis?: string;
      sources?: unknown[];
    };
    mediaPaths: string[];
    publicPath?: string;
    cmsOwnership?: string;
  };
};

type ImportOperation = {
  kind: string;
  slug: string;
  payload: {
    content?: {
      thesis?: string;
    };
  };
};

const RETIRED_IDAO_CANON_PATHS = Array.from(
  { length: 5 },
  (_, index) => `/images/cognirise/canon-${index + 1}.jpg`,
);

function frameworkSeed(
  slug: (typeof STANDALONE_EDITORIAL_SLUGS)[number],
  editorial: { seed: Record<string, unknown> },
  heroSeed: Record<string, unknown>,
) {
  const { imageSrc: _imageSrc, imageAlt: _imageAlt, media: _media, ...hero } = heroSeed;
  return {
    schemaVersion: 1,
    template: slug,
    hero,
    editorial: editorial.seed,
    canonical: methodologyCanonicalSeed(slug),
    visibility: "public",
    order: STANDALONE_EDITORIAL_SLUGS.indexOf(slug) + 1,
    sources: [],
    relatedIds: [],
  };
}

test("the generic inventory retains only Agent Authority and all non-methodology operations", async () => {
  const inventory = JSON.parse(await readFile(
    `${repositoryRoot}/scripts/cms/output/inventory.json`,
    "utf8",
  )) as {
    manifestDigest: string;
    expectedCounts: {
      people: number;
      partners: number;
      platforms: number;
      articles: number;
      caseStudies: number;
      industries: number;
      frameworks: number;
      assets: number;
    };
    records: InventoryRecord[];
  };
  const payload = JSON.parse(await readFile(
    `${repositoryRoot}/scripts/cms/output/import-payload.json`,
    "utf8",
  )) as {
    manifestDigest: string;
    operations: ImportOperation[];
    availabilityOperations: unknown[];
    governanceOperations: unknown[];
    mediaOperations: unknown[];
  };

  assert.equal(inventory.expectedCounts.frameworks, 1);
  assert.equal(inventory.expectedCounts.industries, 6);
  const frameworks = inventory.records.filter((record) => record.type === "framework");
  assert.deepEqual(frameworks.map((record) => record.fields.slug), ["agent-authority-model"]);
  assert.equal(frameworks[0]?.fields.content.template, "agent-authority");
  assert.equal(frameworks[0]?.fields.mediaPaths.length, 1);
  assert.ok((frameworks[0]?.fields.content.sources?.length ?? 0) > 0, "Agent Authority requires a source trail");

  const genericFrameworkSlugs = new Set(frameworks.map((record) => record.fields.slug));
  for (const slug of [...STANDALONE_EDITORIAL_SLUGS, "guardrails-framework"]) {
    assert.equal(genericFrameworkSlugs.has(slug), false, `${slug} is not owned by generic inventory`);
  }

  const inventoryCounts = Object.fromEntries([
    "person",
    "partner",
    "platform",
    "article",
    "case-study",
    "industry",
    "framework",
    "asset",
  ].map((type) => [type, inventory.records.filter((record) => record.type === type).length]));
  assert.deepEqual(inventoryCounts, {
    person: 8,
    partner: 5,
    platform: 5,
    article: 3,
    "case-study": 22,
    industry: 6,
    framework: 1,
    asset: 82,
  });
  assert.deepEqual(
    inventory.records
      .filter((record) => record.type === "industry")
      .map((record) => record.fields.slug),
    ["financial-services", "telecoms", "travel-hospitality", "energy-resources", "public-sector", "education"],
  );
  assert.equal(
    inventory.records.find((record) => record.type === "industry" && record.fields.slug === "financial-services")
      ?.fields.content.thesis,
    "Trust in AI comes from how it is governed and operated—not how well its chatbot performs.",
  );

  assert.equal(payload.manifestDigest, inventory.manifestDigest);
  assert.equal(payload.operations.length, 50);
  assert.deepEqual(Object.fromEntries([
    "person",
    "partner",
    "platform",
    "publication",
    "case-study",
    "industry",
    "framework",
  ].map((kind) => [kind, payload.operations.filter((operation) => operation.kind === kind).length])), {
    person: 8,
    partner: 5,
    platform: 5,
    publication: 3,
    "case-study": 22,
    industry: 6,
    framework: 1,
  });
  assert.equal(payload.availabilityOperations.length, 8);
  assert.equal(payload.governanceOperations.length, 5);
  assert.equal(payload.mediaOperations.length, 82);
  const serializedInventory = JSON.stringify(inventory);
  const serializedPayload = JSON.stringify(payload);
  for (const retiredPath of RETIRED_IDAO_CANON_PATHS) {
    assert.equal(serializedInventory.includes(retiredPath), false, `${retiredPath} must not be inventoried`);
    assert.equal(serializedPayload.includes(retiredPath), false, `${retiredPath} must not be importable`);
  }
  assert.equal(
    payload.operations.find((operation) => operation.kind === "industry" && operation.slug === "financial-services")
      ?.payload.content?.thesis,
    "Trust in AI comes from how it is governed and operated—not how well its chatbot performs.",
  );
  const importedFrameworkSlugs = new Set(payload.operations
    .filter((operation) => operation.kind === "framework")
    .map((operation) => operation.slug));
  assert.deepEqual([...importedFrameworkSlugs], ["agent-authority-model"]);
  for (const slug of [...STANDALONE_EDITORIAL_SLUGS, "guardrails-framework"]) {
    assert.equal(importedFrameworkSlugs.has(slug), false, `${slug} must not create a generic import operation`);
  }
});

test("the five standalone methodology drafts use exact shared schema definitions", () => {
  assert.deepEqual(METHODOLOGY_SLUGS, STANDALONE_EDITORIAL_SLUGS);
  const definitions = methodologyEditorialDefinitions();
  assert.deepEqual(definitions.map((definition) => definition.template), STANDALONE_EDITORIAL_SLUGS);

  const expectedDefinitions = {
    idao: idaoEditorial,
    "ai-use-case-prioritization": aiUseCasePrioritizationEditorial,
    "ai-value-to-scale": aiValueToScaleEditorial,
    "agentic-operations-readiness": agenticOperationsReadinessEditorial,
    "human-agent-operating-model": humanAgentOperatingModelEditorial,
  };
  const expectedHeroSeeds = {
    idao: idaoHeroSeed,
    "ai-use-case-prioritization": aiUseCasePrioritizationHeroSeed,
    "ai-value-to-scale": aiValueToScaleHeroSeed,
    "agentic-operations-readiness": agenticOperationsReadinessHeroSeed,
    "human-agent-operating-model": humanAgentOperatingModelHeroSeed,
  };

  for (const slug of STANDALONE_EDITORIAL_SLUGS) {
    const definition = methodologyEditorialDefinition(slug);
    assert.equal(definition, expectedDefinitions[slug], `${slug} must resolve its exact registered definition`);
    assert.equal(definition?.editorialSchema.safeParse(definition.seed).success, true, `${slug} editorial seed is schema-valid`);
    assert.equal(
      validateCmsContent("framework", frameworkSeed(slug, expectedDefinitions[slug], expectedHeroSeeds[slug]), "draft").success,
      true,
      `${slug} framework envelope is schema-valid`,
    );
  }
});

test("IDAO retains one hero and ten supporting source-media occurrences", () => {
  assert.equal(idaoMediaInventory.length, 11);
  assert.equal(idaoMediaInventory.filter((media) => media.role === "hero").length, 1);
  assert.equal(idaoMediaInventory.filter((media) => media.role === "supporting").length, 10);
  assert.equal(new Set(idaoMediaInventory.map((media) => media.id)).size, 11);
  for (const media of idaoMediaInventory) {
    assert.match(media.src, /^\/images\/cognirise\/[A-Za-z0-9._/-]+\.(?:jpg|png)$/);
    assert.ok(media.altText.length > 0, `${media.id} requires alternative text`);
    assert.ok(media.label.length > 0, `${media.id} requires a governed label`);
  }
  assert.deepEqual(idaoMediaInventory[0], { id: "hero-demonstrate", ...idaoHeroSeed.media });
});

test("all-seven methodology integration remains verified by the separate draft reconciler", async () => {
  const reconciliation = await readFile(
    `${repositoryRoot}/scripts/src/cms/methodology-editorial-reconciliation.ts`,
    "utf8",
  );
  assert.match(reconciliation, /const protectedSlugs = \["agent-authority-model", "guardrails-framework"\]/);
  assert.match(reconciliation, /const expected = \[\.\.\.SLUGS, \.\.\.protectedSlugs\]/);
  assert.match(reconciliation, /All-seven methodology inventory is incomplete \(\$\{rows\.rowCount\}\/7\)/);
  assert.match(reconciliation, /const verified = await verifyAllSeven\(client, definitionBySlug, heroBySlug, inspected\)/);
});