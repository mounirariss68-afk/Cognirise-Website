import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { industryContentSchema } from "@workspace/api-zod";
import { updateEducationPov } from "./education-fields";

const sourceUrl = "https://example.edu/evidence";
const pair = (index: number) => ({ title: `Title ${index}`, body: `Body ${index}` });

function industry(educationPov: Record<string, unknown>) {
  return {
    schemaVersion: 1,
    legacyPath: "/industries/education",
    name: "Education",
    shortName: "Education",
    thesis: "A documented thesis",
    accent: "Learning",
    dek: "A sufficiently governed education summary.",
    opportunity: "A governed opportunity.",
    capabilities: [pair(1), pair(2)],
    selectedWork: { description: "Selected evidence." },
    image: "/images/education.jpg",
    imageAlt: "A university campus",
    variant: "network",
    pressures: [pair(1), pair(2), pair(3)],
    reversal: pair(1),
    myth: { claim: "A claim", verdict: "A verdict" },
    gcc: "Regional context.",
    service: { label: "Value Scan", href: "/value-scan", firstMove: "Begin with evidence." },
    uses: [{ use: "Student support", evidence: "Documented", boundary: "Human review" }],
    sources: [{
      label: "Evidence",
      publisher: "Example University",
      kind: "Official source",
      url: sourceUrl,
      market: "uae",
    }],
    educationPov,
    verificationDate: "2025-01-01",
    reviewDate: "2026-01-01",
    visibility: "public",
    order: 1,
    relatedIds: [],
  };
}

function legacyEducationPov() {
  return {
    convictions: Array.from({ length: 5 }, (_, index) => pair(index)),
    valueDomains: Array.from({ length: 3 }, (_, index) => ({ ...pair(index), examples: ["Example"] })),
    signals: Array.from({ length: 6 }, (_, index) => ({
      institution: `University ${index}`,
      signal: "Documented signal",
      implication: "Documented implication",
      sourceUrls: [sourceUrl],
    })),
    targetState: Array.from({ length: 6 }, (_, index) => pair(index)),
    roadmap: Array.from({ length: 3 }, (_, index) => ({ horizon: `H${index}`, ...pair(index) })),
    leadershipTest: "A leadership test.",
  };
}

function educationPovV2() {
  return {
    version: 2,
    introduction: "Introduction.",
    strategicShift: "Strategic shift.",
    patternQuote: "Pattern quote.",
    globalDirection: "Global direction.",
    convictions: Array.from({ length: 5 }, (_, index) => ({ ...pair(index), market: index === 0 ? "ksa" : undefined })),
    valueDomains: Array.from({ length: 5 }, (_, index) => ({ ...pair(index), examples: [] })),
    applications: [{
      title: "Teaching",
      items: [{ ...pair(1), sourceUrls: [sourceUrl], market: "turkiye" }],
    }],
    signals: [{
      institution: "Example University",
      signal: "Documented signal",
      implication: "Documented implication",
      sourceUrls: [sourceUrl],
      market: "europe",
    }],
    targetState: Array.from({ length: 7 }, (_, index) => pair(index)),
    roadmap: Array.from({ length: 3 }, (_, index) => ({ horizon: `H${index}`, ...pair(index) })),
    leadershipTest: "A leadership test.",
  };
}

test("Education contract retains legacy cardinalities and accepts the v2 extension", () => {
  const legacy = industry(legacyEducationPov());
  assert.equal(industryContentSchema.safeParse(legacy).success, true);
  assert.deepEqual(industryContentSchema.parse(legacy).educationPov, legacy.educationPov);

  const v2 = industry(educationPovV2());
  assert.equal(industryContentSchema.safeParse(v2).success, true);
  assert.deepEqual(industryContentSchema.parse(v2).educationPov, v2.educationPov);
});

test("Education v2 enforces cardinalities and source-trail associations", () => {
  const wrongCounts = educationPovV2();
  wrongCounts.valueDomains.pop();
  wrongCounts.targetState.pop();
  assert.equal(industryContentSchema.safeParse(industry(wrongCounts)).success, false);

  const unassociated = educationPovV2();
  unassociated.signals[0].sourceUrls = ["https://other.example/evidence"];
  const parsed = industryContentSchema.safeParse(industry(unassociated));
  assert.equal(parsed.success, false);
  if (!parsed.success) {
    assert.ok(parsed.error.issues.some((issue) =>
      issue.path.join(".") === "educationPov.signals.0.sourceUrls.0"));
  }
});

test("Education v2 requires bounded application groups, items, and source links", () => {
  const missing = educationPovV2();
  delete (missing as Partial<typeof missing>).applications;
  assert.equal(industryContentSchema.safeParse(industry(missing)).success, false);

  const emptyItems = educationPovV2();
  emptyItems.applications[0].items = [];
  assert.equal(industryContentSchema.safeParse(industry(emptyItems)).success, false);

  const emptyLinks = educationPovV2();
  emptyLinks.applications[0].items[0].sourceUrls = [];
  assert.equal(industryContentSchema.safeParse(industry(emptyLinks)).success, false);
});

test("an Education v2 edit roundtrip preserves applications and market markers", () => {
  const original = industryContentSchema.parse(industry(educationPovV2()));
  assert.equal(original.educationPov?.version, 2);
  if (original.educationPov?.version !== 2) return;

  const editedPov = updateEducationPov(original.educationPov, {
    introduction: "Edited introduction.",
  });
  const roundtrip = industryContentSchema.parse({ ...original, educationPov: editedPov });
  assert.equal(roundtrip.educationPov?.introduction, "Edited introduction.");
  assert.deepEqual(roundtrip.educationPov?.applications, original.educationPov.applications);
  assert.equal(roundtrip.educationPov?.convictions[0].market, "ksa");
  assert.equal(roundtrip.educationPov?.signals[0].market, "europe");
  assert.equal(roundtrip.educationPov?.applications[0].items[0].market, "turkiye");
  assert.equal(roundtrip.sources[0].market, "uae");
});

test("Education authoring exposes accessible v2 fields and repeatable controls", async () => {
  const editor = await readFile(new URL("./ContentEditor.tsx", import.meta.url), "utf8");
  assert.match(editor, /Upgrade to Education POV v2/);
  assert.match(editor, /label="Introduction"/);
  assert.match(editor, /label="Strategic shift"/);
  assert.match(editor, /label="Pattern quote"/);
  assert.match(editor, /label="Global direction"/);
  assert.match(editor, />Add application group</);
  assert.match(editor, />Add application</);
  assert.match(editor, /Remove application group/);
  assert.match(editor, /educationMarkets/);
  assert.match(editor, /aria-label=\{label\}/);
});