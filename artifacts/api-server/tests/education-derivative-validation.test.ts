import assert from "node:assert/strict";
import test from "node:test";
import {
  projectIndustrySnapshotForMarket,
  validateCmsSnapshot,
  validateCmsSnapshotForDelivery,
} from "@workspace/api-zod";

const globalUrl = "https://example.edu/global";
const uaeUrl = "https://example.edu/regional-evidence";
const pair = (index: number) => ({ title: `Title ${index}`, body: `Body ${index}` });

function educationSnapshot(markets = ["uae"]) {
  return {
    slug: "education",
    title: "Education",
    summary: "Education perspective",
    mediaIds: [],
    markets,
    content: {
      schemaVersion: 1,
      legacyPath: "/industries/education",
      name: "Education",
      shortName: "Education",
      thesis: "A documented thesis",
      accent: "Learning",
      dek: "A governed education summary.",
      opportunity: "A governed opportunity.",
      capabilities: [pair(1), pair(2)],
      selectedWork: { description: "Selected evidence." },
      image: "/images/education.jpg",
      imageAlt: "A university campus",
      variant: "network",
      pressures: [pair(1), pair(2), pair(3)],
      reversal: pair(1),
      myth: { claim: "A claim", verdict: "A verdict" },
      gcc: "Responsible regional direction.",
      service: { label: "Value Scan", href: "/value-scan", firstMove: "Begin with evidence." },
      uses: [{ use: "Student support", evidence: "Documented", boundary: "Human review" }],
      sources: [{
        label: "Global evidence",
        publisher: "Example University",
        kind: "Official source",
        url: globalUrl,
      }],
      educationPov: {
        version: 2,
        introduction: "Introduction.",
        strategicShift: "Strategic shift.",
        patternQuote: "Pattern quote.",
        globalDirection: "Global direction.",
        convictions: [
          pair(1),
          pair(2),
          pair(3),
          pair(4),
          { ...pair(5), market: "uae" },
        ],
        valueDomains: Array.from({ length: 5 }, (_, index) => ({ ...pair(index), examples: [] })),
        applications: [{
          title: "Teaching",
          items: [{ ...pair(1), sourceUrls: [globalUrl] }],
        }],
        signals: [{
          institution: "Example University",
          signal: "Documented signal",
          implication: "Documented implication",
          sourceUrls: [globalUrl],
        }],
        targetState: Array.from({ length: 7 }, (_, index) => pair(index)),
        roadmap: Array.from({ length: 3 }, (_, index) => ({ horizon: `H${index}`, ...pair(index) })),
        leadershipTest: "A leadership test.",
      },
      verificationDate: "2025-01-01",
      reviewDate: "2026-01-01",
      visibility: "public",
      order: 1,
      relatedIds: [],
    },
  };
}

function publicationErrors(snapshot: ReturnType<typeof educationSnapshot>) {
  const result = validateCmsSnapshot("industry", snapshot, "publish");
  assert.equal(result.success, false);
  return result.success ? [] : result.errors;
}

test("canonical UAE publication validates all four possible delivery markets", () => {
  const snapshot = educationSnapshot();
  const result = validateCmsSnapshot("industry", snapshot, "publish");
  assert.equal(result.success, true, result.success ? undefined : result.errors.join("; "));

  snapshot.content.educationPov.applications[0].items[0].market = "uae";
  assert.equal(validateCmsSnapshot("industry", snapshot, "draft").success, true);
  const errors = publicationErrors(snapshot);
  assert.ok(errors.some((error) => error.includes("Education europe delivery")
    && error.includes("applications.0.items")));
});

test("publication rejects derivatives with no signals or sources", () => {
  const snapshot = educationSnapshot();
  snapshot.content.sources[0].market = "uae";
  snapshot.content.educationPov.signals[0].market = "uae";
  const errors = publicationErrors(snapshot);
  assert.ok(errors.some((error) => error.includes("Education europe delivery")
    && (error.includes("sources") || error.includes("signals"))));
});

test("publication rejects multiple removed convictions and regional source mismatches", () => {
  const convictions = educationSnapshot();
  convictions.content.educationPov.convictions = [
    pair(1),
    pair(2),
    pair(3),
    { ...pair(4), market: "uae" },
    { ...pair(5), market: "ksa" },
  ];
  assert.ok(publicationErrors(convictions).some((error) =>
    error.includes("Education europe delivery") && error.includes("convictions")));

  const associations = educationSnapshot();
  associations.content.sources.push({
    label: "UAE evidence",
    publisher: "Example University",
    kind: "Official source",
    url: uaeUrl,
    market: "uae",
  });
  associations.content.educationPov.signals[0].sourceUrls = [uaeUrl];
  assert.ok(publicationErrors(associations).some((error) =>
    error.includes("Education europe delivery") && error.includes("sourceUrls")));
});

test("exact non-UAE editions validate only declared markets and delivery validation does not recurse", () => {
  const exactKsa = educationSnapshot(["ksa"]);
  exactKsa.content.educationPov.convictions[4].market = "ksa";
  assert.equal(validateCmsSnapshot("industry", exactKsa, "publish").success, true);

  const derivative = structuredClone(exactKsa);
  derivative.content.educationPov.convictions.forEach((conviction) => delete conviction.market);
  const delivered = validateCmsSnapshotForDelivery("industry", derivative, "publish");
  assert.equal(delivered.success, true, delivered.success ? undefined : delivered.errors.join("; "));
});

test("legacy Education publication remains readable without derivative enforcement", () => {
  const legacy = educationSnapshot();
  const pov = legacy.content.educationPov;
  legacy.content.educationPov = {
    convictions: pov.convictions.map(({ market: _market, ...conviction }) => conviction),
    valueDomains: pov.valueDomains.slice(0, 3).map((domain) => ({ ...domain, examples: ["Example"] })),
    signals: Array.from({ length: 6 }, (_, index) => ({
      institution: `University ${index}`,
      signal: "Signal",
      implication: "Implication",
      sourceUrls: [globalUrl],
    })),
    targetState: pov.targetState.slice(0, 6),
    roadmap: pov.roadmap,
    leadershipTest: pov.leadershipTest,
  } as typeof legacy.content.educationPov;
  assert.equal(validateCmsSnapshot("industry", legacy, "publish").success, true);
  legacy.content.educationPov.convictions[0].body = "UAE-specific historical direction.";
  legacy.content.educationPov.signals[0].signal = "UAE-specific historical signal.";
  const projected = projectIndustrySnapshotForMarket(legacy, "europe", "uae");
  assert.equal(validateCmsSnapshotForDelivery("industry", projected, "publish").success, true);
});