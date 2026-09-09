import assert from "node:assert/strict";
import test from "node:test";
import {
  CreateDocumentBody,
  cmsPublicRoute,
  initialCmsContent,
  NAVIGATION_ITEM_IDS,
  NavigationSettingsSchema,
  UpdateDocumentMarketAvailabilityBody,
  UpdateDocumentBody,
  UpdateNavigationSettingsSchema,
  validateCmsContent,
  validateCmsSnapshot,
} from "@workspace/api-zod";

const governance = {
  schemaVersion: 1,
  visibility: "public",
  order: 1,
  sources: [{ label: "Approved source", url: "https://example.com/source", accessedAt: "2026-09-06" }],
  verificationDate: "2026-09-06",
  reviewDate: "2027-03-06",
  relatedIds: [],
};

const heroIds = {
  poster: "00000000-0000-4000-8000-000000000001",
  posterVersion: "00000000-0000-4000-8000-000000000011",
  mp4: "00000000-0000-4000-8000-000000000002",
  mp4Version: "00000000-0000-4000-8000-000000000012",
  webm: "00000000-0000-4000-8000-000000000003",
  webmVersion: "00000000-0000-4000-8000-000000000013",
};

test("publication requires a known variant and governed article body", () => {
  const valid = validateCmsContent("publication", {
    ...governance,
    variant: "article",
    teaser: "A governed teaser.",
    body: [{ type: "paragraph", text: "A complete paragraph." }],
    author: "Editorial practice",
    publicationDate: "2026-09-06",
    readingTimeMinutes: 1,
    topics: ["governance"],
    sectors: [],
    platformIds: [],
  }, "publish");
  assert.equal(valid.success, true);
  assert.equal(validateCmsContent("publication", { ...governance, variant: "video" }, "draft").success, false);
});

test("POVs require a ready PDF reference before publication", () => {
  const result = validateCmsContent("publication", {
    ...governance,
    variant: "pov",
    teaser: "A document teaser.",
    body: [],
    author: "Editorial practice",
    publicationDate: "2026-09-06",
    topics: [],
    sectors: [],
    platformIds: [],
  }, "publish");
  assert.equal(result.success, false);
  assert.match(result.errors.join(" "), /PDF/);
});

test("unsafe profile links are rejected at the shared boundary", () => {
  const result = validateCmsContent("person", {
    ...governance,
    role: "advisor",
    title: "Advisor",
    biography: "A complete approved biography.",
    focusAreas: [],
    profileLinks: [{ label: "Unsafe", url: "javascript:alert(1)" }],
    approvedFallback: "initials",
  }, "draft");
  assert.equal(result.success, false);
});

test("restricted and summary cases never receive public detail routes", () => {
  const restricted = {
    ...governance,
    variant: "full" as const,
    disclosure: "restricted" as const,
    sector: "Financial Services" as const,
    organizationDescriptor: "Regulated financial institution",
    engagementType: "client-delivery" as const,
    deliveryStage: "proof-of-concept" as const,
    impactClassification: "pilot-demo" as const,
    impactStatement: "The proof of concept demonstrated the workflow; production impact is unavailable.",
    disclosureNote: "Identity and interface data are withheld.",
    publicEvidenceStatus: "approved" as const,
    relatedIndustries: ["financial-services" as const],
    visual: {
      kind: "illustrative-interface-reconstruction" as const,
      caption: "Illustrative reconstruction.",
      altText: "An anonymized workflow interface.",
      textEquivalent: "A workflow with a human approval gate.",
      template: "workflow-console" as const,
      fixtureLabels: ["Example organization"],
    },
    mandate: "A mandate.",
    constraints: [],
    work: [{ type: "paragraph" as const, text: "The approved work." }],
    controls: [],
    outcomes: [],
    evidence: [],
  };
  assert.equal(cmsPublicRoute("case-study", "restricted-case", restricted), null);
  assert.equal(cmsPublicRoute("case-study", "summary-case", { ...restricted, variant: "summary", disclosure: "anonymized" }), null);
  assert.equal(cmsPublicRoute("case-study", "full-case", { ...restricted, disclosure: "anonymized" }), "/work/full-case");
});

test("case-study publication enforces anonymization, evidence and conservative impact labels", () => {
  const caseStudy = {
    ...governance,
    variant: "summary" as const,
    disclosure: "anonymized" as const,
    sector: "Manufacturing & Industrial" as const,
    organizationDescriptor: "Industrial operator",
    engagementType: "product-demonstration" as const,
    deliveryStage: "proof-of-concept" as const,
    impactClassification: "simulated" as const,
    impactStatement: "Scenario results are simulated interface fixtures, not production outcomes.",
    disclosureNote: "Organization identity and interface values are withheld.",
    publicEvidenceStatus: "approved" as const,
    relatedIndustries: ["energy-resources" as const],
    visual: {
      kind: "illustrative-interface-reconstruction" as const,
      caption: "Illustrative reconstruction using fixture data.",
      altText: "An anonymized operations console.",
      textEquivalent: "A simulated alert moves to a human approval gate.",
      template: "operations-console" as const,
      fixtureLabels: ["Example site", "Sample incident"],
    },
    mandate: "Demonstrate a governed incident workflow.",
    constraints: [],
    work: [],
    controls: [],
    outcomes: [],
    evidence: [{ statement: "The scenario completed in a demonstration.", source: governance.sources[0], approved: true }],
  };
  assert.equal(validateCmsSnapshot("case-study", {
    slug: "governed-case",
    title: "A governed case",
    summary: "An anonymized industrial operator tested a governed workflow.",
    content: caseStudy,
    mediaIds: [],
    markets: ["uae"],
  }, "publish").success, true);
  assert.equal(validateCmsContent("case-study", { ...caseStudy, disclosure: "named" }, "publish").success, false);
  assert.equal(validateCmsContent("case-study", { ...caseStudy, publicEvidenceStatus: "needs-review" }, "publish").success, false);
  const unqualified = validateCmsContent("case-study", {
    ...caseStudy,
    impactClassification: "observed",
  }, "publish");
  assert.equal(unqualified.success, false);
  assert.match(unqualified.errors.join(" "), /Non-production impact/);
  assert.equal(validateCmsContent("case-study", {
    ...caseStudy,
    relatedIndustries: ["retail"],
  }, "draft").success, false);
  assert.equal(validateCmsContent("case-study", {
    ...caseStudy,
    visual: { ...caseStudy.visual, altText: "" },
  }, "publish").success, false);
});

test("snapshot contract normalizes media authority and rejects unknown fields", () => {
  const mediaId = "00000000-0000-4000-8000-000000000001";
  const result = validateCmsSnapshot("platform", {
    slug: "new-platform",
    title: "New platform",
    content: {
      ...governance,
      category: "Specialist",
      summary: "A governed platform summary.",
      template: "standard",
      heroMediaId: mediaId,
      sections: [],
      capabilities: [],
      differentiators: [],
      unexpected: true,
    },
    mediaIds: [],
    markets: ["uae"],
  }, "draft");
  assert.equal(result.success, false);
});

test("site configuration pins the poster and both video source versions", () => {
  const content = {
    schemaVersion: 1,
    page: "industries",
    hero: {
      posterMediaId: heroIds.poster,
      posterMediaVersionId: heroIds.posterVersion,
      sources: [
        { mediaId: heroIds.mp4, mediaVersionId: heroIds.mp4Version, mimeType: "video/mp4" },
        { mediaId: heroIds.webm, mediaVersionId: heroIds.webmVersion, mimeType: "video/webm" },
      ],
    },
  };
  const result = validateCmsSnapshot("site-configuration", {
    slug: "industries-hero",
    title: "Industries hero",
    content,
    mediaIds: [],
    markets: ["uae"],
  }, "publish");
  assert.equal(result.success, true);
  if (!result.success) return;
  assert.deepEqual(
    new Set(result.data.mediaIds),
    new Set([heroIds.poster, heroIds.mp4, heroIds.webm]),
  );
  assert.equal(cmsPublicRoute("site-configuration", "industries-hero", result.data.content), null);
  assert.equal(validateCmsContent("site-configuration", {
    ...content,
    hero: {
      ...content.hero,
      sources: content.hero.sources.map((source) => ({ ...source, mimeType: "video/mp4" })),
    },
  }, "publish").success, false);
});

test("navigation settings accept only active unique menu item IDs", () => {
  assert.equal(NAVIGATION_ITEM_IDS.includes("about.advisors"), false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "platforms", enabled: false }, { id: "platforms.cognios", enabled: true }],
  }).success, true);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "platforms", enabled: false }, { id: "platforms", enabled: true }],
  }).success, false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "external.unsafe", enabled: false }],
  }).success, false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    items: [{ id: "about.advisors", enabled: true }],
  }).success, false);
  assert.equal(NavigationSettingsSchema.safeParse({
    items: [{ id: "about.advisors", enabled: true }],
    updatedAt: null,
  }).success, false);
});

test("market availability accepts only the governed three-state decision", () => {
  for (const decision of ["inherit", "show", "off"]) {
    assert.equal(UpdateDocumentMarketAvailabilityBody.safeParse({ decision }).success, true);
  }
  assert.equal(
    UpdateDocumentMarketAvailabilityBody.safeParse({ decision: "hidden" }).success,
    false,
  );
});

test("industry publication requires the broadened value and delivery contract", () => {
  const industry = {
    ...governance,
    legacyPath: "/industries/example",
    name: "Example industry",
    shortName: "Example",
    thesis: "A governed thesis.",
    accent: "governed thesis.",
    dek: "A concise editorial summary.",
    opportunity: "Create measurable value from a priority operating constraint.",
    capabilities: [
      { title: "Agentic platform", body: "Build bounded agents connected to production workflows." },
      { title: "Responsible delivery", body: "Embed evidence, oversight and controls in delivery." },
    ],
    selectedWork: {
      description: "Show the mandate, boundary and evidenced outcome.",
    },
    image: "/images/example.png",
    imageAlt: "A descriptive industry scene.",
    variant: "ledger",
    pressures: [
      { title: "One", body: "First pressure." },
      { title: "Two", body: "Second pressure." },
      { title: "Three", body: "Third pressure." },
    ],
    reversal: { title: "A reversal", body: "A documented consequence." },
    myth: { claim: "A claim", verdict: "A governed verdict." },
    gcc: "A specific regional context.",
    service: { label: "AI Platforms", href: "/what-we-do", firstMove: "Map one decision." },
    uses: [{ use: "Priority workflow", evidence: "Measured evidence", boundary: "Human approval" }],
    sources: [{
      label: "Official guidance",
      publisher: "Public authority",
      kind: "Official source",
      url: "https://example.com/guidance",
    }],
  };
  assert.equal(validateCmsContent("industry", industry, "publish").success, true);
  const { opportunity: _opportunity, ...withoutOpportunity } = industry;
  assert.equal(validateCmsContent("industry", withoutOpportunity, "publish").success, false);
  assert.equal(validateCmsContent("industry", { ...industry, capabilities: [industry.capabilities[0]] }, "publish").success, false);
  assert.equal(validateCmsContent("industry", { ...industry, selectedWork: {} }, "publish").success, false);
});

test("agent authority is a governed framework with a canonical methodology route", () => {
  const heroMediaId = "00000000-0000-4000-8000-000000000002";
  const framework = {
    ...governance,
    template: "agent-authority" as const,
    teaser: "Govern each handover according to its exposure.",
    handoverExplanation: "Knowledge, Decision and Action describe individual handovers, not permanent agent classes.",
    methodology: [{ type: "paragraph" as const, text: "Exposure sets the ceiling and approved evidence earns any climb." }],
    workedExample: {
      sector: "Travel & hospitality",
      title: "Passenger re-accommodation",
      handover: "action" as const,
      reversibility: "R3" as const,
      reach: "H2" as const,
      exposureBand: "E2" as const,
      oversight: "On the loop, with a stated intervention window",
      detail: "The duty manager owns the handover.",
      requestedAuthority: "on-loop" as const,
      interventionWindow: "Before released-seat inventory expires.",
      accountableRole: "Duty Manager, Operations Control Centre",
      promotionEvidence: "An approved body of clean rebookings.",
      automaticDemotion: "Any involuntary downgrade.",
    },
    sectorExamples: [],
    heroMediaId,
  };
  assert.equal(validateCmsContent("framework", framework, "publish").success, true);
  assert.equal(cmsPublicRoute("framework", "agent-authority-model", framework), "/methodologies/agent-authority-model");
  const contradictory = validateCmsContent("framework", {
    ...framework,
    workedExample: {
      ...framework.workedExample,
      exposureBand: "E5",
      oversight: "In the loop + external safety sign-off",
    },
  }, "publish");
  assert.equal(contradictory.success, false);
  assert.match(contradictory.errors.join(" "), /exposure must be E2/);

  const withoutPinnedHero = validateCmsContent("framework", { ...framework, heroMediaId: undefined }, "publish");
  assert.equal(withoutPinnedHero.success, false);
  assert.match(withoutPinnedHero.errors.join(" "), /hero media/i);

  const createRequest = CreateDocumentBody.safeParse({
    kind: "framework",
    slug: "agent-authority-model",
    title: "Agent Authority Model",
    content: framework,
    mediaIds: [heroMediaId],
    markets: ["uae"],
  });
  assert.equal(createRequest.success, true);
  assert.deepEqual(createRequest.success ? createRequest.data.content : null, framework);
  assert.equal(
    createRequest.success ? typeof createRequest.data.content.verificationDate : "invalid",
    "string",
  );
  assert.equal(
    createRequest.success
      ? validateCmsSnapshot("framework", {
          slug: createRequest.data.slug,
          title: createRequest.data.title,
          summary: createRequest.data.summary,
          content: createRequest.data.content,
          seo: createRequest.data.seo,
          mediaIds: createRequest.data.mediaIds ?? [],
          markets: createRequest.data.markets,
        }, "draft").success
      : false,
    true,
  );

  const updateRequest = UpdateDocumentBody.safeParse({
    content: {
      ...framework,
      teaser: "An edited governed teaser.",
    },
    revisionNumber: 2,
  });
  assert.equal(updateRequest.success, true);
  assert.equal(
    updateRequest.success ? updateRequest.data.content?.template : null,
    "agent-authority",
  );
  assert.equal(
    updateRequest.success ? updateRequest.data.content?.teaser : null,
    "An edited governed teaser.",
  );
  assert.equal(
    updateRequest.success ? typeof updateRequest.data.content?.reviewDate : "invalid",
    "string",
  );
  assert.equal(
    createRequest.success && updateRequest.success
      ? validateCmsSnapshot("framework", {
          slug: createRequest.data.slug,
          title: createRequest.data.title,
          summary: createRequest.data.summary,
          content: updateRequest.data.content,
          seo: createRequest.data.seo,
          mediaIds: createRequest.data.mediaIds ?? [],
          markets: createRequest.data.markets,
        }, "draft").success
      : false,
    true,
  );
});

test("the admin framework initializer survives request parsing and draft validation", () => {
  const initialContent = initialCmsContent("framework");
  assert.deepEqual(initialContent, {
    schemaVersion: 1,
    template: "agent-authority",
  });

  const request = CreateDocumentBody.safeParse({
    kind: "framework",
    slug: "new-framework",
    title: "New framework",
    content: initialContent,
    markets: ["uae"],
  });
  assert.equal(request.success, true);
  assert.equal(
    request.success
      ? validateCmsSnapshot("framework", {
          slug: request.data.slug,
          title: request.data.title,
          summary: request.data.summary,
          content: request.data.content,
          seo: request.data.seo,
          mediaIds: request.data.mediaIds ?? [],
          markets: request.data.markets,
        }, "draft").success
      : false,
    true,
  );
  assert.equal(validateCmsContent("framework", initialContent, "publish").success, false);
});
