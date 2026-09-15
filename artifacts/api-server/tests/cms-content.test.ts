import assert from "node:assert/strict";
import test from "node:test";
import {
  CreateDocumentBody,
  CMS_DRAFT_METADATA_LIMITS,
  cmsDocumentKinds,
  cmsDraftMetadataSchema,
  cmsMediaReferenceSchema,
  frameworkGuardrailsSummarySchema,
  collectCmsMediaReferences,
  CreateDocumentEditionOverrideBody,
  cmsPublicRoute,
  initialCmsContent,
  isCmsConfigurationIdentityValid,
  NAVIGATION_ITEM_IDS,
  NavigationSettingsSchema,
  AddDocumentReviewCommentBody,
  RejectDocumentRevisionBody,
  SubmitDocumentBody,
  UpdateDocumentMarketAvailabilityBody,
  UpdateDocumentBody,
  UpdateNavigationSettingsSchema,
  isCmsRetiredLandingPagePath,
  validateCmsContent,
  validateCmsSnapshot,
  EstablishSharedMarketBaselineBody,
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

test("draft request and snapshot metadata rules stay aligned for every document kind", () => {
  const metadataCases = [
    undefined,
    {},
    { title: "" },
    { description: "" },
    { title: "Search title", description: "Search description" },
    { canonicalUrl: "" },
    { canonicalUrl: "https://www.cognirise.ai/path" },
    { canonicalUrl: "HTTPS://www.cognirise.ai/path" },
    { canonicalUrl: "http://example.com/path", noIndex: true },
  ];

  for (const kind of cmsDocumentKinds) {
    for (const seo of metadataCases) {
      const input = {
        kind,
        slug: `metadata-${kind}`,
        title: "T".repeat(CMS_DRAFT_METADATA_LIMITS.title),
        summary: "S".repeat(CMS_DRAFT_METADATA_LIMITS.summary),
        content: initialCmsContent(kind),
        ...(seo === undefined ? {} : { seo }),
        markets: ["uae"],
      };
      const request = CreateDocumentBody.safeParse(input);
      assert.equal(request.success, true, `${kind} request rejected ${JSON.stringify(seo)}`);
      const snapshot = validateCmsSnapshot(kind, {
        slug: input.slug,
        title: input.title,
        summary: input.summary,
        content: input.content,
        ...(seo === undefined ? {} : { seo }),
        mediaIds: [],
        markets: input.markets,
      }, "draft");
      assert.equal(
        snapshot.success,
        true,
        `${kind} snapshot rejected ${JSON.stringify(seo)}: ${
          snapshot.success ? "" : snapshot.errors.join("; ")
        }`,
      );
    }
  }

  assert.equal(CreateDocumentBody.safeParse({
    kind: "person",
    slug: "too-long-metadata",
    title: "T".repeat(CMS_DRAFT_METADATA_LIMITS.title + 1),
    content: initialCmsContent("person"),
    markets: ["uae"],
  }).success, false);
  assert.equal(cmsDraftMetadataSchema.safeParse({
    slug: "too-long-seo",
    title: "Metadata",
    seo: { description: "D".repeat(CMS_DRAFT_METADATA_LIMITS.seoDescription + 1) },
  }).success, false);
  assert.equal(cmsDraftMetadataSchema.safeParse({
    slug: "unsafe-canonical",
    title: "Metadata",
    seo: { canonicalUrl: "javascript:alert(1)" },
  }).success, false);
  assert.equal(cmsDraftMetadataSchema.safeParse({
    slug: "legacy-seo",
    title: "Metadata",
    seo: { imageId: heroIds.poster },
  }).success, false, "unknown legacy SEO properties must be rejected, not stripped");
  assert.equal(CreateDocumentBody.safeParse({
    kind: "publication",
    slug: "neutral-source-contract",
    title: "Neutral source",
    content: initialCmsContent("publication"),
    markets: ["uae", "ksa"],
    sharedLocale: "en",
  }).success, true, "neutral shared creation must be opt-in and locale-addressed");
  assert.equal(CreateDocumentBody.safeParse({
    kind: "publication",
    slug: "neutral-source-invalid-locale",
    title: "Neutral source",
    content: initialCmsContent("publication"),
    markets: ["uae"],
    sharedLocale: "und",
  }).success, false, "neutral shared creation must reject the internal und locale");
  assert.equal(EstablishSharedMarketBaselineBody.safeParse({
    locale: "en",
    snapshot: { slug: "neutral-source", title: "Neutral source", content: {} },
  }).success, true, "neutral successor saves omit legacy source lineage");
  assert.equal(EstablishSharedMarketBaselineBody.safeParse({
    locale: "en",
    sourceRevisionId: null,
    snapshot: { slug: "neutral-source", title: "Neutral source", content: {} },
  }).success, true, "neutral successor saves may explicitly send null source lineage");
});

test("immutable media references require and collect exact versions from every landing location", () => {
  const mediaId = "00000000-0000-4000-8000-000000000021";
  const mediaVersionId = "00000000-0000-4000-8000-000000000022";
  assert.equal(cmsMediaReferenceSchema.safeParse({
    mediaId,
    role: "hero",
  }).success, false);
  const content = {
    visualReferences: [{ mediaId, mediaVersionId, role: "hero", altText: "Governed hero" }],
    sections: [{
      type: "media",
      references: [{
        mediaId: "00000000-0000-4000-8000-000000000023",
        mediaVersionId: "00000000-0000-4000-8000-000000000024",
        role: "supporting",
        altText: "Supporting visual",
      }],
    }],
  };
  assert.deepEqual(
    collectCmsMediaReferences("landing-page", content).map(({ mediaId: id, mediaVersionId: version }) => [id, version]),
    [
      [mediaId, mediaVersionId],
      ["00000000-0000-4000-8000-000000000023", "00000000-0000-4000-8000-000000000024"],
    ],
  );
});

test("legacy asset ids remain readable without overriding an authoritative version pin", () => {
  const legacyId = "00000000-0000-4000-8000-000000000031";
  const exactId = "00000000-0000-4000-8000-000000000032";
  const versionId = "00000000-0000-4000-8000-000000000033";
  const references = collectCmsMediaReferences("platform", {
    heroMediaId: legacyId,
    heroMedia: { mediaId: exactId, mediaVersionId: versionId, role: "hero", altText: "Exact visual" },
  });
  assert.deepEqual(references.map((reference) => [
    reference.mediaId,
    reference.mediaVersionId,
  ]), [[exactId, versionId]]);
});

test("landing drafts remain partial while publication requires the generated page template", () => {
  const initial = initialCmsContent("landing-page");
  assert.doesNotThrow(() => validateCmsContent("landing-page", initial, "draft"));
  assert.equal(validateCmsContent("landing-page", initial, "draft").success, true);
  assert.doesNotThrow(() => validateCmsContent("landing-page", initial, "publish"));

  const mediaId = "00000000-0000-4000-8000-000000000021";
  const content = {
    ...governance,
    pagePath: "/" as const,
    template: "landing" as const,
    narrative: "The approved homepage narrative.",
    sections: [
      { type: "narrative" as const, id: "hero", order: 0, heading: "Intelligence becomes momentum.", body: [{ type: "paragraph" as const, text: "A governed introduction." }] },
      { type: "media" as const, id: "hero-visual", order: 1, references: [{ mediaId, mediaVersionId: "00000000-0000-4000-8000-000000000022", role: "hero" as const, altText: "An abstract governed system." }] },
      { type: "cta" as const, id: "primary-action", order: 2, label: "Explore our practice", href: "/#service-lines" as const, style: "primary" as const },
    ],
    seo: { title: "Cognirise" },
    legal: {},
    visualReferences: [],
  };
  const draftSnapshot = validateCmsSnapshot("landing-page", {
    slug: "homepage",
    title: "Homepage",
    content,
    mediaIds: [],
    markets: ["uae"],
  }, "draft");
  assert.equal(draftSnapshot.success, true, draftSnapshot.success ? undefined : draftSnapshot.errors.join("; "));
  if (!draftSnapshot.success) return;
  assert.equal(cmsPublicRoute("landing-page", "homepage", draftSnapshot.data.content), "/");
  assert.deepEqual(draftSnapshot.data.mediaIds, [mediaId]);
  const incompletePublication = validateCmsSnapshot("landing-page", {
    slug: "homepage",
    title: "Homepage",
    content,
    mediaIds: [],
    markets: ["uae"],
  }, "publish");
  assert.equal(incompletePublication.success, false);
  assert.ok(incompletePublication.errors.some((error) => error.includes("missing required slot")));
  assert.equal(validateCmsContent("landing-page", {
    ...content,
    sections: content.sections.map((section) => section.type === "media"
      ? { ...section, references: section.references.map(({ mediaVersionId: _version, ...reference }) => reference) }
      : section),
  }, "publish").success, false);
  assert.equal(validateCmsContent("landing-page", {
    ...content,
    sections: content.sections.map((section) => ({ ...section, order: 0 })),
  }, "publish").success, false);
});

test("all seeded landing revision envelopes open as editable drafts and remain blocked until parity approval", () => {
  for (const [slug, pagePath, title, narrative] of [
    ["homepage", "/", "Homepage", "Intelligence becomes momentum."],
    ["about", "/about", "About", "We build capability that holds."],
    ["partners", "/partners", "Partners", "A partner model for governed delivery."],
    ["platforms", "/platforms", "Platforms", "Platforms that turn intelligence into operating leverage."],
    ["insights", "/insights", "Insights", "Evidence for the decisions that move the work."],
  ] as const) {
    const snapshot = {
      slug, title, summary: narrative, markets: ["uae"], mediaIds: [],
      content: {
        schemaVersion: 1, pagePath, template: "landing", narrative,
        sections: [
          { type: "narrative", id: "hero", order: 0, heading: narrative, body: [{ type: "paragraph", text: narrative }] },
          { type: "cta", id: "primary-action", order: 1, label: "Explore our practice", href: "/#service-lines", style: "primary" },
        ],
        cta: { label: "Explore our practice", href: "/#service-lines", style: "primary" },
        seo: { title }, legal: {}, visualReferences: [],
      },
    };
    const editable = validateCmsSnapshot("landing-page", snapshot, "draft");
    assert.equal(editable.success, true, editable.success ? undefined : editable.errors.join("; "));
    assert.equal(validateCmsSnapshot("landing-page", snapshot, "publish").success, false);
    if (editable.success) assert.equal(editable.data.content.pagePath, pagePath);
  }
});

test("the retired /work overview is not a public landing route while case-study routes remain eligible", () => {
  assert.equal(isCmsRetiredLandingPagePath("/work"), true);
  assert.equal(cmsPublicRoute("landing-page", "work", {
    ...governance,
    pagePath: "/work",
    template: "landing",
    narrative: "Retired overview",
    sections: [{
      type: "cta",
      id: "primary-action",
      order: 0,
      label: "Start",
      href: "/contact",
      style: "primary",
    }],
    seo: {},
    legal: {},
    visualReferences: [],
  } as never), null);
  assert.equal(cmsPublicRoute("case-study", "proof", {
    ...governance,
    variant: "full",
    disclosure: "anonymized",
  } as never), "/work/proof");
  const retirement = validateCmsContent("landing-page", {
    ...governance,
    pagePath: "/work",
    template: "landing",
    narrative: "Retired overview",
    sections: [{
      type: "cta",
      id: "primary-action",
      order: 0,
      label: "Start",
      href: "/contact",
      style: "primary",
    }],
    seo: {},
    legal: {},
    visualReferences: [],
  }, "publish");
  assert.equal(retirement.success, false);
  if (!retirement.success) {
    assert.ok(retirement.errors.some((error) => /retired/i.test(error)));
  }
});

test("offices are publishable, ordered content with required city and address fields", () => {
  const valid = validateCmsContent("office", {
    schemaVersion: 1,
    city: "Dubai",
    address: "Office 1914, The Binary by Omniyat, Business Bay, PO Box 71515, Dubai, UAE",
    phone: "+971 4 123 4567",
    visibility: "public",
    order: 0,
    sources: [],
    relatedIds: [],
  }, "publish");
  assert.equal(valid.success, true);
  assert.equal(valid.success && valid.data.phone, "+971 4 123 4567");
  assert.equal(validateCmsContent("office", {
    schemaVersion: 1,
    city: "Vienna",
    address: "Example street 1, 1010 Vienna, Austria",
  }, "publish").success, true, "phone remains optional at publication");
  assert.equal(validateCmsContent("office", {
    schemaVersion: 1,
    city: "London",
    address: "Example street, London, United Kingdom",
    phone: "1".repeat(81),
  }, "draft").success, false, "phone is bounded");
  assert.equal(
    validateCmsContent("office", {
      schemaVersion: 1,
      city: "",
      address: "",
      visibility: "public",
      order: 0,
      sources: [],
      relatedIds: [],
    }, "publish").success,
    false,
  );
  assert.equal(cmsPublicRoute("office", "office-dubai", valid.success ? valid.data : {}), null);
});

test("contact site configuration requires a strict valid email", () => {
  const valid = validateCmsContent("site-configuration", {
    schemaVersion: 1,
    configuration: "contact-email",
    contactEmail: "contact@cognirise.ai",
  }, "publish");
  assert.equal(valid.success, true);
  const invalid = validateCmsContent("site-configuration", {
    schemaVersion: 1,
    configuration: "contact-email",
    contactEmail: "not-an-email",
  }, "draft");
  assert.equal(invalid.success, false);
  assert.match(invalid.errors.join(" "), /valid email address/i);
  const contact = valid.success ? valid.data : {};
  const hero = {
    schemaVersion: 1,
    page: "homepage",
    hero: {
      posterMediaId: heroIds.poster,
      posterMediaVersionId: heroIds.posterVersion,
      sources: [
        { mediaId: heroIds.mp4, mediaVersionId: heroIds.mp4Version, mimeType: "video/mp4" },
        { mediaId: heroIds.webm, mediaVersionId: heroIds.webmVersion, mimeType: "video/webm" },
      ],
    },
  };
  assert.equal(isCmsConfigurationIdentityValid("site-configuration", "site-contact-email", contact), true);
  assert.equal(isCmsConfigurationIdentityValid("site-configuration", "site-homepage-hero", contact), false);
  assert.equal(isCmsConfigurationIdentityValid("site-configuration", "site-contact-email", hero), false);
  assert.equal(isCmsConfigurationIdentityValid("site-configuration", "site-homepage-hero", hero), true);
});

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

test("navigation settings enforce the authoritative market-aware menu contract", () => {
  assert.equal(NAVIGATION_ITEM_IDS.includes("about.advisors"), false);
  const valid = {
    market: "ksa",
    locale: "en",
    version: 1,
    pages: [
      { path: "/platforms", enabled: true },
      { path: "/platforms/cognios", enabled: false },
    ],
    items: [
      {
        id: "platforms",
        label: "Platforms",
        parentId: null,
        order: 0,
        destination: "/platforms",
        visible: true,
      },
      {
        id: "platforms.cognios",
        label: "CogniOS",
        parentId: "platforms",
        order: 1,
        destination: "/platforms/cognios",
        visible: false,
      },
    ],
  };
  assert.equal(UpdateNavigationSettingsSchema.safeParse(valid).success, true);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    ...valid,
    items: [valid.items[0], valid.items[0]],
  }).success, false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    ...valid,
    items: [{ ...valid.items[0], id: "external.unsafe" }],
  }).success, false);
  assert.equal(UpdateNavigationSettingsSchema.safeParse({
    ...valid,
    items: [{ ...valid.items[0], id: "about.advisors" }],
  }).success, false);
  assert.equal(NavigationSettingsSchema.safeParse({
    ...valid,
    items: valid.items,
    requestedMarket: "ksa",
    requestedLocale: "en",
    market: "ksa",
    locale: "en",
    usedFallback: false,
    isConfigured: true,
    updatedAt: null,
    version: 1,
  }).success, true);
  assert.equal(NavigationSettingsSchema.safeParse({
    ...valid,
    items: [{ ...valid.items[0], id: "about.advisors" }],
    requestedMarket: "ksa",
    requestedLocale: "en",
    market: "ksa",
    locale: "en",
    usedFallback: false,
    isConfigured: true,
    updatedAt: null,
    version: 1,
  }).success, false);
});

test("market availability accepts only the governed three-state decision", () => {
  for (const decision of ["inherit", "show", "off"]) {
    assert.equal(UpdateDocumentMarketAvailabilityBody.safeParse({ decision, version: 0 }).success, true);
  }
  assert.equal(
    UpdateDocumentMarketAvailabilityBody.safeParse({ decision: "hidden", version: 0 }).success,
    false,
  );
});

test("edition overrides require an exact target market and locale", () => {
  assert.equal(CreateDocumentEditionOverrideBody.safeParse({
    market: "ksa",
    locale: "ar-SA",
  }).success, true);
  assert.equal(CreateDocumentEditionOverrideBody.safeParse({ market: "ksa" }).success, false);
});

test("internal shared-source address is a valid editable edition target", () => {
  assert.equal(UpdateDocumentBody.safeParse({
    market: "shared-source",
    locale: "und",
    revisionNumber: 1,
  }).success, true);
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
    market: "ksa",
    locale: "ar-SA",
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
  assert.equal(UpdateDocumentBody.safeParse({ revisionNumber: 2, markets: ["ksa"] }).success, false);
  assert.equal(SubmitDocumentBody.safeParse({ revisionId: heroIds.posterVersion }).success, true);
  assert.equal(
    AddDocumentReviewCommentBody.safeParse({
      revisionId: heroIds.posterVersion,
      body: "Please verify the KSA edition.",
    }).success,
    true,
  );
  assert.equal(
    RejectDocumentRevisionBody.safeParse({
      revisionId: heroIds.posterVersion,
      body: "The localized evidence is incomplete.",
    }).success,
    true,
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

test("legacy authority revisions remain valid and summary copy is all-required with four rules", () => {
  const legacy = {
    schemaVersion: 1,
    template: "agent-authority",
    teaser: "Govern each handover according to its exposure.",
    handoverExplanation: "A handover is governed on its own terms.",
    methodology: [{ type: "paragraph", text: "Evidence earns the climb." }],
    workedExample: {
      sector: "Travel",
      title: "Re-accommodation",
      handover: "action",
      reversibility: "R3",
      reach: "H2",
      exposureBand: "E2",
      oversight: "On the loop",
      detail: "A duty manager owns the handover.",
      requestedAuthority: "on-loop",
      accountableRole: "Duty manager",
      promotionEvidence: "Measured clean rebookings.",
      automaticDemotion: "Any incident.",
    },
    sectorExamples: [],
  };
  assert.equal(validateCmsContent("framework", legacy, "draft").success, true);

  const summary = {
    lead: "Guardrails enforce limits.",
    handover: "A handover is the moment an output becomes consequential.",
    rules: [1, 2, 3, 4].map((index) => ({ title: `Rule ${index}`, body: `Body ${index}.` })),
    caveat: "Only constrained content can carry authority above the ceiling.",
    disclosureLabel: "Read the full explanation",
    firstFigure: {
      asset: "aam-guardrails-vs-authority.svg",
      altText: "A shared rail with four governed handovers.",
      captionLabel: "Illustration 1 —",
      captionLead: "The model governs each handover.",
      captionBody: "The handovers are illustrative.",
    },
  };
  assert.equal(frameworkGuardrailsSummarySchema.safeParse(summary).success, true);
  assert.equal(frameworkGuardrailsSummarySchema.safeParse({ ...summary, rules: summary.rules.slice(0, 3) }).success, false);
  assert.equal(frameworkGuardrailsSummarySchema.safeParse({ ...summary, caveat: undefined }).success, false);
  assert.equal(frameworkGuardrailsSummarySchema.safeParse({
    ...summary,
    firstFigure: { ...summary.firstFigure, asset: "aam-how-they-interact.svg" },
  }).success, false);
});
