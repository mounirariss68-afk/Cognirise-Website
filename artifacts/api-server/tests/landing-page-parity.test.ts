import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { validateCmsSnapshot } from "@workspace/api-zod";

type Seed = {
  slug: string;
  path: string;
  snapshot: {
    content: {
      sections: Array<{
        id: string;
        type: string;
        label?: string;
        href?: string;
        body?: Array<{ type: string; text?: string }>;
      }>;
    };
  };
};

const workspace = resolve(process.cwd(), "../..");
const seeds = JSON.parse(
  readFileSync(resolve(workspace, "lib/db/landing-page-inventory.json"), "utf8"),
) as Seed[];
const expectedCounts = {
  "/": 44,
  "/about": 12,
  "/partners": 16,
  "/platforms": 17,
  "/insights": 41,
  "/methodologies": 3,
};

test("generated landing inventory is current and has every unique governed slot", () => {
  execFileSync(process.execPath, ["scripts/generate-landing-parity.mjs", "--page=/", "--check"], {
    cwd: workspace,
    stdio: "pipe",
  });
  execFileSync(process.execPath, ["scripts/generate-landing-parity.mjs", "--page=/methodologies", "--check"], {
    cwd: workspace,
    stdio: "pipe",
  });
  assert.deepEqual(
    Object.fromEntries(seeds.map((seed) => [seed.path, seed.snapshot.content.sections.length])),
    expectedCounts,
  );
  for (const seed of seeds) {
    const ids = seed.snapshot.content.sections.map((section) => section.id);
    assert.equal(new Set(ids).size, ids.length, `${seed.path} has duplicate section IDs`);
    assert.ok(ids.includes("hero"), `${seed.path} is missing its bound hero narrative`);
  }
});

test("homepage inventory retains only framework CTAs and binds outcome CTAs", () => {
  const homepage = seeds.find((seed) => seed.path === "/");
  assert.ok(homepage);
  const sections = homepage.snapshot.content.sections;
  const frameworkSlots = sections.filter((section) => section.id.startsWith("home-framework-"));
  assert.deepEqual(
    frameworkSlots.map(({ id, type, label, href }) => ({ id, type, label, href })),
    [
      {
        id: "home-framework-authority-cta",
        type: "cta",
        label: "Agent Authority Model",
        href: "/methodologies/agent-authority-model",
      },
      {
        id: "home-framework-idao-cta",
        type: "cta",
        label: "Explore IDAO",
        href: "/methodologies/idao",
      },
      {
        id: "home-framework-portfolio-cta",
        type: "cta",
        label: "View methodology portfolio",
        href: "/methodologies",
      },
    ],
  );
  assert.deepEqual(
    sections
      .filter((section) => section.id.startsWith("home-image-ledger-") && section.id.endsWith("-cta"))
      .map(({ id, type, label, href }) => ({ id, type, label, href })),
    [
      {
        id: "home-image-ledger-first-cta",
        type: "cta",
        label: "Agent Authority Model",
        href: "/methodologies/agent-authority-model",
      },
      {
        id: "home-image-ledger-second-cta",
        type: "cta",
        label: "Human–Agent Operating Model",
        href: "/methodologies/human-agent-operating-model",
      },
      {
        id: "home-image-ledger-third-cta",
        type: "cta",
        label: "CogniOS architecture",
        href: "/platforms/cognios#architecture",
      },
    ],
  );
  const firstCaption = sections.find((section) => section.id === "home-image-ledger-first-caption");
  assert.deepEqual(firstCaption?.body, [{ type: "paragraph", text: "Boundaries you control." }]);
});

test("all generated landing envelopes pass the real draft validator", () => {
  assert.equal(seeds.length, 6);
  for (const seed of seeds) {
    const result = validateCmsSnapshot("landing-page", seed.snapshot, "draft");
    assert.equal(result.success, true, result.success ? undefined : `${seed.path}: ${result.errors.join("; ")}`);
  }
});

test("unresolved compiled media is the only publication blocker", () => {
  for (const seed of seeds) {
    const result = validateCmsSnapshot("landing-page", seed.snapshot, "publish");
    const unresolved = seed.snapshot.content.sections.some((section) => section.type === "migration-media");
    assert.equal(result.success, !unresolved, `${seed.path} publication readiness was unexpected`);
    if (!result.success) {
      assert.ok(result.errors.includes(
        "Compiled landing media must be resolved to an approved immutable media version before publication.",
      ), seed.path);
      assert.ok(result.errors.some((error) => error.includes('must have type "media", received "migration-media"')), seed.path);
    }
  }
});

test("every generated publication slot is required with its generated type", () => {
  for (const seed of seeds) {
    const migration = seed.snapshot.content.sections.find((section) => section.type === "migration-media");
    if (migration) {
      const snapshot = structuredClone(seed.snapshot);
      snapshot.content.sections = snapshot.content.sections.filter((section) => section.id !== migration.id);
      const result = validateCmsSnapshot("landing-page", snapshot, "publish");
      assert.equal(result.success, false, seed.path);
      assert.ok(result.errors.some((error) => error.includes(`missing required slot "${migration.id}" (media)`)), seed.path);
    }

    const narrative = seed.snapshot.content.sections.find((section) => section.type === "narrative");
    assert.ok(narrative, `${seed.path} needs a generated narrative fixture`);
    const withoutNarrative = structuredClone(seed.snapshot);
    withoutNarrative.content.sections = withoutNarrative.content.sections.filter((section) => section.id !== narrative.id);
    const narrativeResult = validateCmsSnapshot("landing-page", withoutNarrative, "publish");
    assert.equal(narrativeResult.success, false);
    assert.ok(narrativeResult.errors.some((error) => error.includes(`missing required slot "${narrative.id}" (narrative)`)));

    const cta = seed.snapshot.content.sections.find((section) => section.type === "cta");
    assert.ok(cta, `${seed.path} needs a generated CTA fixture`);
    const wrongCta = structuredClone(seed.snapshot) as any;
    const ctaIndex = wrongCta.content.sections.findIndex((section: { id: string }) => section.id === cta.id);
    wrongCta.content.sections[ctaIndex] = {
      type: "narrative",
      id: cta.id,
      order: wrongCta.content.sections[ctaIndex].order,
      body: [{ type: "paragraph", text: "Wrong slot type" }],
    };
    const ctaResult = validateCmsSnapshot("landing-page", wrongCta, "publish");
    assert.equal(ctaResult.success, false);
    assert.ok(ctaResult.errors.some((error) => error.includes(`slot "${cta.id}" must have type "cta", received "narrative"`)));
  }
});