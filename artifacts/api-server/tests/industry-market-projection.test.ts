import assert from "node:assert/strict";
import test from "node:test";
import { projectIndustrySnapshotForMarket } from "@workspace/api-zod";

const v2Snapshot = {
  slug: "education",
  title: "Education",
  summary: "K–12 and higher education",
  seo: { title: "Education AI" },
  mediaIds: ["hero-id"],
  markets: ["uae"],
  content: {
    schemaVersion: 1,
    name: "Education",
    heroMediaId: "hero-id",
    gcc: "The UAE has a specific national direction.",
    sources: [
      { label: "Global", url: "https://example.com/global" },
      { label: "UAE", url: "https://example.com/uae", market: "uae" },
      { label: "Saudi initiative", url: "https://evidence.gov.sa/education", market: "ksa" },
    ],
    educationPov: {
      version: 2,
      introduction: "Shared capability, not a product.",
      strategicShift: "Move from tools to journeys.",
      patternQuote: "Specialise with governance.",
      globalDirection: "Connect learning and human capability.",
      convictions: [
        { title: "Purpose", body: "Global" },
        { title: "Educator agency", body: "Global" },
        { title: "Institution-wide change", body: "Global" },
        { title: "Safeguarding", body: "Global" },
        { title: "UAE direction", body: "UAE only", market: "uae" },
        { title: "Saudi direction", body: "Saudi Arabia only", market: "ksa" },
      ],
      signals: [
        { institution: "OECD", signal: "Global", implication: "Measure outcomes", sourceUrls: ["https://example.com/global"] },
        { institution: "UAE", signal: "Regional", implication: "UAE", sourceUrls: ["https://example.com/uae"], market: "uae" },
        { institution: "Saudi initiative", signal: "Regional", implication: "Saudi Arabia", sourceUrls: ["https://evidence.gov.sa/education"], market: "ksa" },
      ],
      applications: [{
        title: "Applications",
        items: [
          { title: "Global application", body: "Neutral", sourceUrls: ["https://example.com/global"] },
          { title: "UAE application", body: "UAE", sourceUrls: ["https://example.com/uae"], market: "uae" },
          { title: "Saudi application", body: "Saudi Arabia", sourceUrls: ["https://evidence.gov.sa/education"], market: "ksa" },
        ],
      }],
    },
  },
};

test("Education v2 projection keeps the complete payload and filters every marked object", () => {
  const projected = projectIndustrySnapshotForMarket(v2Snapshot, "ksa");
  assert.notEqual(projected, v2Snapshot);
  assert.equal(projected.summary, v2Snapshot.summary);
  assert.deepEqual(projected.seo, v2Snapshot.seo);
  assert.deepEqual(projected.mediaIds, v2Snapshot.mediaIds);
  assert.deepEqual(projected.markets, ["ksa"]);
  assert.equal(projected.content.heroMediaId, "hero-id");
  assert.deepEqual(projected.content.sources.map((source) => source.label), ["Global", "Saudi initiative"]);
  assert.deepEqual(projected.content.educationPov.convictions.map((item) => item.title), [
    "Purpose",
    "Educator agency",
    "Institution-wide change",
    "Safeguarding",
    "Saudi direction",
  ]);
  assert.deepEqual(projected.content.educationPov.signals.map((item) => item.institution), ["OECD", "Saudi initiative"]);
  assert.deepEqual(
    projected.content.educationPov.applications[0].items.map((item) => item.title),
    ["Global application", "Saudi application"],
  );
  assert.equal(JSON.stringify(projected).includes('"market"'), false);
  assert.equal(JSON.stringify(projected).includes("UAE only"), false);
  assert.equal(JSON.stringify(projected).includes("The UAE"), false);
  assert.equal(JSON.stringify(v2Snapshot).includes("UAE only"), true, "projection does not mutate CMS authority");
});

test("Education v2 projection uses markers rather than index substitution", () => {
  const projected = projectIndustrySnapshotForMarket(v2Snapshot, "europe");
  assert.deepEqual(projected.content.educationPov.convictions.map((item) => item.title), [
    "Purpose",
    "Educator agency",
    "Institution-wide change",
    "Safeguarding",
    "Make responsible adoption an institutional capability",
  ]);
  assert.deepEqual(projected.content.educationPov.applications[0].items.map((item) => item.title), ["Global application"]);
  assert.deepEqual(projected.content.sources.map((source) => source.label), ["Global"]);
  assert.doesNotMatch(JSON.stringify(projected), /Saudi|\.gov\.sa/i);
});

test("legacy Education payloads remain backward compatible", () => {
  const legacy = {
    ...v2Snapshot,
    content: {
      ...v2Snapshot.content,
      educationPov: {
        convictions: [
          { title: "Purpose", body: "Preserved" },
          { title: "Universities advance national capability", body: "The UAE can convert ambition into value." },
        ],
      },
      sources: [
        { label: "Global", url: "https://example.com/global" },
        { label: "UAE", url: "https://ai.gov.ae/strategy/" },
      ],
    },
  };
  const uae = projectIndustrySnapshotForMarket(legacy, "uae");
  assert.deepEqual(uae, legacy);
  const ksa = projectIndustrySnapshotForMarket(legacy, "ksa");
  assert.notEqual(ksa, legacy);
  assert.equal(JSON.stringify(ksa).includes("UAE"), false);
  assert.deepEqual(ksa.content.sources.map((source) => source.label), ["Global"]);
});

test("projection is idempotent and preserves safe same-market edition copy", () => {
  const ksaAuthority = structuredClone(v2Snapshot);
  ksaAuthority.content.gcc = "A locally approved Saudi education direction.";
  ksaAuthority.content.educationPov.convictions = [
    { title: "One", body: "One" },
    { title: "Two", body: "Two" },
    { title: "Three", body: "Three" },
    { title: "Four", body: "Four" },
    { title: "KSA direction", body: "Locally approved", market: "ksa" },
  ];
  const once = projectIndustrySnapshotForMarket(ksaAuthority, "ksa", "ksa");
  const twice = projectIndustrySnapshotForMarket(once, "ksa");
  assert.deepEqual(twice, once);
  assert.equal(once.content.gcc, "A locally approved Saudi education direction.");
  assert.equal(once.content.educationPov.convictions.at(-1)?.title, "KSA direction");
});

test("exact KSA edition with neutral custom convictions is preserved on API and frontend projection", () => {
  const ksaEdition = structuredClone(v2Snapshot);
  ksaEdition.markets = ["ksa"];
  ksaEdition.content.gcc = "A locally approved neutral institutional direction.";
  ksaEdition.content.sources = [ksaEdition.content.sources[0]];
  ksaEdition.content.educationPov.convictions = [
    { title: "One", body: "Custom one" },
    { title: "Two", body: "Custom two" },
    { title: "Three", body: "Custom three" },
    { title: "Four", body: "Custom four" },
    { title: "Five", body: "Custom neutral fifth" },
  ];
  ksaEdition.content.educationPov.signals = [ksaEdition.content.educationPov.signals[0]];
  ksaEdition.content.educationPov.applications[0].items =
    [ksaEdition.content.educationPov.applications[0].items[0]];

  const apiProjection = projectIndustrySnapshotForMarket(ksaEdition, "ksa", "ksa");
  const frontendProjection = projectIndustrySnapshotForMarket(apiProjection, "ksa");
  assert.deepEqual(apiProjection, ksaEdition);
  assert.deepEqual(frontendProjection, apiProjection);
  assert.equal(apiProjection.content.educationPov.convictions.length, 5);
  assert.deepEqual(apiProjection.content.sources, ksaEdition.content.sources);
  assert.doesNotMatch(JSON.stringify(apiProjection), /Saudi|SDAIA|\.gov\.sa/i);
});

test("KSA fallback joins the verified Saudi evidence bundle and remains idempotent", () => {
  const uaeAuthority = structuredClone(v2Snapshot);
  uaeAuthority.content.sources = uaeAuthority.content.sources.filter((item) => item.market !== "ksa");
  uaeAuthority.content.educationPov.convictions =
    uaeAuthority.content.educationPov.convictions.filter((item) => item.market !== "ksa");
  uaeAuthority.content.educationPov.signals =
    uaeAuthority.content.educationPov.signals.filter((item) => item.market !== "ksa");
  uaeAuthority.content.educationPov.applications[0].items =
    uaeAuthority.content.educationPov.applications[0].items.filter((item) => item.market !== "ksa");

  const once = projectIndustrySnapshotForMarket(uaeAuthority, "ksa", "uae");
  const twice = projectIndustrySnapshotForMarket(once, "ksa");
  assert.deepEqual(twice, once);
  assert.match(once.content.gcc, /Saudi Arabia/);
  assert.equal(once.content.educationPov.convictions.length, 5);
  assert.match(JSON.stringify(once.content.educationPov.signals), /AI qualifications and future skills/);
  assert.match(JSON.stringify(once.content.educationPov.applications), /Quality-assured AI pathways/);
  assert.match(JSON.stringify(once.content.sources), /Human Capability Development Program/);
  assert.doesNotMatch(JSON.stringify(once), /\bUAE\b|United Arab Emirates|\bNOVA\b|\.gov\.ae/i);
  assert.doesNotMatch(JSON.stringify(once), /"market"/);
});

test("projection rejects unmarked foreign regional copy anywhere in the payload", () => {
  const unsafe = structuredClone(v2Snapshot);
  unsafe.seo = { title: "Saudi education evidence" };
  assert.throws(
    () => projectIndustrySnapshotForMarket(unsafe, "uae", "uae"),
    /foreign regional content/,
  );
});