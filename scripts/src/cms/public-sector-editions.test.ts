import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  buildPublicSectorContent,
  normalizePublicSectorEvidence,
  parsePublicSectorDocuments,
  publicSectorEditionAction,
} from "./public-sector-editions.js";

test("Task 319 parses all four complete editions without prohibited editorial boilerplate", async () => {
  const documents = await parsePublicSectorDocuments();
  assert.deepEqual([...documents.keys()], ["uae", "ksa", "turkiye", "europe"]);
  for (const document of documents.values()) {
    assert.equal(document.headline, "Public value is earned at the point of service.");
    assert.equal(document.pressures.length, 4);
    assert.equal(document.capabilities.length, 3);
    assert.equal(document.applications.length, 3);
    assert.ok(document.marketContext.length >= 8);
    assert.ok(document.nextAction.length >= 7);
    const serialized = JSON.stringify(document);
    assert.doesNotMatch(serialized, /Alternative headline|Hero image:|Version 1\.0|Link: consolidated/i);
  }
});

test("Task 319 keeps market payloads isolated and retains the supplied narrative", async () => {
  const documents = await parsePublicSectorDocuments();
  const sources = [...documents.values()].flatMap((document) => document.sources.map((source) => ({
    ...source,
    market: document.market,
    url: `https://evidence.example/${encodeURIComponent(source.label)}`,
    jurisdiction: "the institution's named jurisdiction",
  })));
  const applications = [...documents.values()].flatMap((document) => document.applications.map((application) => ({
    market: document.market,
    use: application.use,
    sourceUrls: document.sources.slice(0, 2).map((source) => `https://evidence.example/${encodeURIComponent(source.label)}`),
    institution: "The named institution",
    jurisdiction: document.marketLabel,
    evidence: "The mapped source is retained as a bounded example, not a Cognirise outcome claim.",
  })));
  const evidence = normalizePublicSectorEvidence({ version: 1, sources, applications, unresolved: [] });
  const digests = new Set<string>();
  for (const document of documents.values()) {
    const result = buildPublicSectorContent(document, evidence, {
      mediaIds: ["immutable-hero-asset"],
      content: {
        heroMedia: { mediaId: "immutable-hero-asset", mediaVersionId: "immutable-hero-version" },
        editorialHistorySentinel: "preserve",
        image: "/images/public-sector.png",
        imageAlt: "Existing civic hero",
        selectedWork: { description: "Existing selected work" },
        verificationDate: "2026-09-07",
        reviewDate: "2027-03-07",
      },
    });
    assert.deepEqual(result.fatalBlockers, []);
    assert.equal(result.evidenceReport.status, "review-required");
    assert.equal(result.evidenceReport.draftBlockers.length, 1);
    const payload = result.payload as { markets: string[]; content: Record<string, any> };
    const content = payload.content;
    assert.equal(payload.markets[0], document.market);
    assert.equal(content.legacyPath, "/industries/public-sector");
    assert.equal(content.publicSectorPov.market, document.market);
    assert.equal(content.publicSectorPov.opportunity.length, 4);
    assert.equal(content.heroMedia.mediaVersionId, "immutable-hero-version");
    assert.equal(content.editorialHistorySentinel, "preserve");
    assert.match(content.reversal.body, /\n\n/);
    assert.match(content.myth.verdict, /\n\n/);
    digests.add(result.candidateDigest);
  }
  assert.equal(digests.size, 4);
});

test("Task 319 keeps ledger metadata out of visible application copy and merges source notes", async () => {
  const document = (await parsePublicSectorDocuments()).get("uae")!;
  const evidence = normalizePublicSectorEvidence({
    version: 1,
    sources: document.sources.map((source, index) => ({
      market: "uae",
      label: source.label,
      publisher: "Named public institution",
      kind: "Official source",
      url: `https://evidence.example/${index}`,
      supports: `Ledger support note ${index}`,
      limitation: `Ledger limitation note ${index}`,
    })),
    applications: document.applications.map((application) => ({
      market: "uae",
      use: application.use,
      sourceUrls: [],
      institution: "Named public institution",
      jurisdiction: "United Arab Emirates",
      evidence: "ATTACHMENT SECTION 5 / exact 27 source rows / review metadata must not render",
    })),
    unresolved: [],
  });
  const result = buildPublicSectorContent(document, evidence, {
    content: {
      image: "/images/public-sector.png",
      imageAlt: "Existing civic hero",
      selectedWork: { description: "Existing selected work" },
      verificationDate: "2026-09-07",
      reviewDate: "2027-03-07",
    },
  });
  const content = result.payload.content as {
    uses: Array<{ evidence: string }>;
    sources: Array<{ supports?: string; limitation?: string }>;
  };
  assert.ok(content.uses.every((use) => !/ATTACHMENT SECTION|exact 27 source rows|review metadata/i.test(use.evidence)));
  assert.ok(content.uses.every((use) => /Named example attribution/.test(use.evidence)));
  assert.match(content.sources[0].supports ?? "", /Ledger support note 0/);
  assert.match(content.sources[0].limitation ?? "", /Ledger limitation note 0/);
});

test("Task 319 reports unresolved evidence as a review blocker without promoting the draft", async () => {
  const document = (await parsePublicSectorDocuments()).get("uae")!;
  const sources = document.sources.map((source) => ({
    ...source,
    url: `https://evidence.example/${encodeURIComponent(source.label)}`,
    market: "uae" as const,
  }));
  const evidence = normalizePublicSectorEvidence({
    version: 1,
    sources,
    applications: document.applications.map((application) => ({
      market: "uae",
      use: application.use,
      sourceUrls: [sources[0].url],
      institution: "The named institution",
      jurisdiction: "United Arab Emirates",
    })),
    unresolved: ["One source still needs independent legal review."],
  });
  const result = buildPublicSectorContent(document, evidence, {
    content: {
      image: "/images/public-sector.png",
      imageAlt: "Existing civic hero",
      selectedWork: { description: "Existing selected work" },
      verificationDate: "2026-09-07",
      reviewDate: "2027-03-07",
    },
  });
  assert.equal(result.evidenceReport.status, "review-required");
  assert.deepEqual(result.evidenceReport.draftBlockers, [
    "One source still needs independent legal review.",
    "Shared public-sector legal claim (section 3, line 32): the universal suspensive-appeal assertion is not legally verified; narrow the language or supply authoritative legal support before publication.",
  ]);
  assert.deepEqual(result.evidenceReport.fatalBlockers, []);
  assert.deepEqual((result.payload as { content: { publicSectorPov: { reviewBlockers: string[] } } }).content.publicSectorPov.reviewBlockers, result.evidenceReport.draftBlockers);
});

test("Task 319 fails closed when an approved predecessor has no governed dates", async () => {
  const document = (await parsePublicSectorDocuments()).get("uae")!;
  const sources = document.sources.map((source) => ({
    ...source,
    url: `https://evidence.example/${encodeURIComponent(source.label)}`,
    market: "uae" as const,
  }));
  const evidence = normalizePublicSectorEvidence({
    version: 1,
    sources,
    applications: document.applications.map((application) => ({
      market: "uae",
      use: application.use,
      sourceUrls: [sources[0].url],
      institution: "The named institution",
      jurisdiction: "United Arab Emirates",
    })),
    unresolved: [],
  });
  const result = buildPublicSectorContent(document, evidence, { content: {} });
  assert.ok(result.fatalBlockers.some((blocker) => blocker.includes("verificationDate")));
  assert.ok(result.fatalBlockers.some((blocker) => blocker.includes("reviewDate")));
});

test("Task 319 never invents application joins or falls back to an unrelated market source", async () => {
  const document = (await parsePublicSectorDocuments()).get("ksa")!;
  const evidence = normalizePublicSectorEvidence({
    version: 1,
    sources: document.sources.map((source) => ({
      ...source,
      market: "ksa",
      url: `https://evidence.example/${encodeURIComponent(source.label)}`,
    })),
    applications: [],
    unresolved: [],
  });
  const result = buildPublicSectorContent(document, evidence, {
    content: {
      image: "/images/public-sector.png",
      imageAlt: "Existing civic hero",
      selectedWork: { description: "Existing selected work" },
      verificationDate: "2026-09-07",
      reviewDate: "2027-03-07",
    },
  });
  const content = result.payload.content as { uses: Array<{ sourceUrls: string[] }> };
  assert.equal(content.uses.every((use) => use.sourceUrls.length === 0), true);
  assert.equal(result.fatalBlockers.filter((blocker) => blocker.includes("no explicit market-and-label evidence mapping")).length, 3);
});

test("Task 319 keeps duplicate source labels market-scoped", () => {
  const evidence = normalizePublicSectorEvidence({
    version: 1,
    sources: [
      { market: "ksa", label: "UN E-Government Survey 2024", publisher: "UN DESA", kind: "Official source", url: "https://evidence.example/ksa-un", supports: "KSA ranking", limitation: "Dated benchmark" },
      { market: "turkiye", label: "UN E-Government Survey 2024", publisher: "UN DESA", kind: "Official source", url: "https://evidence.example/tr-un", supports: "Türkiye ranking", limitation: "Dated benchmark" },
    ],
    applications: [],
    unresolved: [],
  });
  assert.equal(evidence.sources.length, 2);
  assert.deepEqual(
    evidence.sources.map((source) => `${source.market}:${source.url}`),
    ["ksa:https://evidence.example/ksa-un", "turkiye:https://evidence.example/tr-un"],
  );
});

test("Task 319 replays only an exact receipt and preserves newer editorial work", () => {
  const common = {
    operation: "cms.public-sector.edition-draft-v1",
    requestDigest: "request",
    resultDigest: "result",
    candidateDigest: "candidate",
  };
  assert.equal(publicSectorEditionAction({
    ...common,
    receipt: { ...common, revisionId: "draft" },
    latestRevisionId: "draft",
    publishedRevisionId: "published",
    latestWorkflowState: "draft",
    latestDigest: "candidate",
  }), "replay");
  assert.equal(publicSectorEditionAction({
    ...common,
    receipt: { ...common, revisionId: "draft" },
    latestRevisionId: "draft",
    publishedRevisionId: "published",
    latestWorkflowState: "draft",
    latestDigest: "changed",
  }), "preserve-conflict");
  assert.equal(publicSectorEditionAction({
    ...common,
    receipt: { ...common, revisionId: "draft" },
    latestRevisionId: "draft",
    publishedRevisionId: "published",
    latestWorkflowState: "draft",
    latestDigest: "changed",
    previousAutomatedDraft: true,
  }), "stage-successor");
  assert.equal(publicSectorEditionAction({
    ...common,
    latestRevisionId: "newer",
    publishedRevisionId: "published",
    latestWorkflowState: "draft",
    latestDigest: "different",
  }), "preserve-conflict");
  assert.equal(publicSectorEditionAction({
    ...common,
    latestRevisionId: "published",
    publishedRevisionId: "published",
    latestWorkflowState: "approved",
    latestDigest: "published",
  }), "stage");
});

test("Task 319 never updates or deletes receipts and refuses an edited draft successor", async () => {
  const source = await readFile(new URL("./public-sector-editions.ts", import.meta.url), "utf8");
  assert.doesNotMatch(source, /(?:UPDATE|DELETE)\s+(?:FROM\s+)?cms_operation_receipts/i);
  assert.match(source, /INSERT INTO cms_operation_receipts/i);
  assert.equal(publicSectorEditionAction({
    operation: "cms.public-sector.edition-draft-v1",
    requestDigest: "new-request",
    resultDigest: "new-result",
    candidateDigest: "new-candidate",
    receipt: {
      operation: "cms.public-sector.edition-draft-v1",
      requestDigest: "old-request",
      resultDigest: "old-result",
      revisionId: "draft",
    },
    latestRevisionId: "draft",
    publishedRevisionId: "published",
    latestWorkflowState: "draft",
    latestDigest: "human-edited-digest",
    previousAutomatedDraft: false,
  }), "preserve-conflict");
});