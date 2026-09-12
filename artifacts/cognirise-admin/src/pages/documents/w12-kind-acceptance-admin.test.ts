import assert from "node:assert/strict";
import test from "node:test";
import {
  cmsDocumentKinds,
  collectCmsMediaReferences,
  type CmsDocumentKind,
} from "@workspace/api-zod";
import {
  buildDraftSave,
  describeSaveFailure,
  normalizeDraftSeo,
} from "./draft-save.ts";

const media = {
  partner: {
    id: "00000000-0000-4000-8000-000000000211",
    version: "00000000-0000-4000-8000-000000000212",
  },
  platform: {
    id: "00000000-0000-4000-8000-000000000221",
    version: "00000000-0000-4000-8000-000000000222",
  },
  caseStudy: {
    id: "00000000-0000-4000-8000-000000000231",
    version: "00000000-0000-4000-8000-000000000232",
  },
  framework: {
    id: "00000000-0000-4000-8000-000000000241",
    version: "00000000-0000-4000-8000-000000000242",
  },
  landing: {
    id: "00000000-0000-4000-8000-000000000251",
    version: "00000000-0000-4000-8000-000000000252",
  },
} as const;

const source = {
  label: "W12 admin representative source",
  url: "https://example.com/w12-admin-source",
  accessedAt: "2026-10-01",
};

const governance = {
  visibility: "public",
  order: 1,
  sources: [source],
  verificationDate: "2026-10-01",
  reviewDate: "2027-01-01",
  relatedIds: [],
};

const image = (
  id: string,
  version: string,
  role: "identity" | "logo" | "hero" | "supporting",
  altText = "W12 admin representative media",
) => ({ mediaId: id, mediaVersionId: version, role, altText });

const blocks = [
  { type: "heading", level: 2, text: "A governed heading" },
  { type: "paragraph", text: "A representative paragraph." },
  { type: "list", style: "bullet", items: ["First item", "Second item"] },
  { type: "quote", text: "A representative quote.", attribution: "W12 editor" },
];

const contentByKind: Record<CmsDocumentKind, Record<string, unknown>> = {
  person: {
    schemaVersion: 1,
    role: "leader",
    title: "Practice Lead",
    biography: "A complete representative biography.",
    contribution: "A representative contribution.",
    focusAreas: [{ title: "Governance", detail: "Build bounded capability." }],
    profileLinks: [{ label: "Profile", url: "https://example.com/w12-person" }],
    approvedFallback: "initials",
    ...governance,
  },
  partner: {
    schemaVersion: 1,
    allianceCategory: "Delivery partner",
    positioning: "A partner that strengthens governed delivery.",
    facts: [{ value: "Regional", label: "Delivery coverage" }],
    evidence: [{
      statement: "The partner claim was reviewed against the source.",
      source,
      approved: true,
    }],
    coverage: ["UAE", "KSA"],
    contribution: "A representative contribution.",
    website: "https://example.com/w12-partner",
    logoMedia: image(media.partner.id, media.partner.version, "logo", "W12 partner logo"),
    relationshipStatus: "active",
    ...governance,
  },
  platform: {
    schemaVersion: 1,
    category: "Specialist",
    summary: "A governed platform summary.",
    heroMedia: image(media.platform.id, media.platform.version, "hero", "W12 platform hero"),
    template: "standard",
    sections: [{ heading: "Platform section", body: blocks }],
    capabilities: ["Bounded automation", "Evidence capture"],
    differentiators: ["Human approval", "Versioned delivery"],
    cta: { label: "Explore", href: "/platforms/w12-platform" },
    ...governance,
  },
  publication: {
    schemaVersion: 1,
    variant: "article",
    teaser: "A representative publication teaser.",
    body: blocks,
    author: "Editorial practice",
    publicationDate: "2026-10-01",
    updatedDate: "2026-10-02",
    readingTimeMinutes: 5,
    topics: ["governance"],
    sectors: ["Public Sector"],
    platformIds: [],
    social: { title: "W12 social title", description: "W12 social description" },
    ...governance,
  },
  "case-study": {
    schemaVersion: 1,
    variant: "full",
    disclosure: "anonymized",
    sector: "Manufacturing & Industrial",
    organizationDescriptor: "An industrial operator",
    engagementType: "client-delivery",
    deliveryStage: "production",
    impactClassification: "observed",
    impactStatement: "The governed workflow improved the documented operating path.",
    disclosureNote: "Identity is withheld.",
    publicEvidenceStatus: "approved",
    relatedIndustries: ["energy-resources"],
    visual: {
      kind: "illustrative-interface-reconstruction",
      caption: "Illustrative reconstruction.",
      altText: "An anonymized operations console.",
      textEquivalent: "A workflow with a human approval gate.",
      template: "operations-console",
      fixtureLabels: ["Example site"],
    },
    mandate: "Demonstrate a governed workflow.",
    context: "Representative context.",
    constraints: ["Human approval required"],
    work: blocks,
    controls: ["Approval gate"],
    outcomes: ["Documented outcome"],
    evidence: [{
      statement: "The workflow was reviewed.",
      source,
      approved: true,
    }],
    quote: { text: "A representative quote.", attribution: "Operations lead" },
    heroMedia: image(media.caseStudy.id, media.caseStudy.version, "hero", "W12 case-study hero"),
    cta: { label: "Discuss", href: "/contact" },
    ...governance,
  },
  industry: {
    schemaVersion: 1,
    legacyPath: "/industries/w12-industry",
    name: "W12 Industry",
    shortName: "W12",
    thesis: "A governed industry thesis.",
    accent: "Governed momentum.",
    dek: "A concise industry summary.",
    opportunity: "Create measurable value from a priority operating constraint.",
    capabilities: [
      { title: "Agentic platform", body: "Build bounded agents connected to workflows." },
      { title: "Responsible delivery", body: "Embed evidence, oversight and controls." },
    ],
    selectedWork: { description: "Show the mandate and evidenced outcome." },
    image: "/images/w12-industry.png",
    imageAlt: "A representative industry scene.",
    variant: "ledger",
    pressures: [
      { title: "One", body: "First operating pressure." },
      { title: "Two", body: "Second operating pressure." },
      { title: "Three", body: "Third operating pressure." },
    ],
    reversal: { title: "A reversal", body: "A documented consequence." },
    myth: { claim: "A claim", verdict: "A governed verdict." },
    gcc: "A regional context.",
    service: { label: "AI Platforms", href: "/what-we-do", firstMove: "Map one decision." },
    uses: [{
      use: "Priority workflow",
      evidence: "Measured evidence",
      boundary: "Human approval",
      sourceUrls: [source.url],
    }],
    sources: [{
      label: "Official guidance",
      publisher: "Public authority",
      kind: "Official source",
      url: source.url,
      accessedAt: source.accessedAt,
    }],
    heroMedia: image(media.platform.id, media.platform.version, "hero", "W12 industry hero"),
    supportingMedia: [image(media.landing.id, media.landing.version, "supporting", "W12 industry support")],
    verificationDate: "2026-10-01",
    reviewDate: "2027-01-01",
    visibility: "public",
    order: 1,
    relatedIds: [],
  },
  framework: {
    schemaVersion: 1,
    template: "agent-authority",
    teaser: "Govern each handover according to its exposure.",
    handoverExplanation: "Knowledge, Decision and Action describe individual handovers.",
    methodology: blocks,
    workedExample: {
      sector: "Travel & hospitality",
      title: "Passenger re-accommodation",
      handover: "action",
      reversibility: "R3",
      reach: "H2",
      exposureBand: "E2",
      oversight: "On the loop, with a stated intervention window",
      detail: "The duty manager owns the handover.",
      requestedAuthority: "on-loop",
      interventionWindow: "Before released-seat inventory expires.",
      accountableRole: "Duty Manager",
      promotionEvidence: "An approved body of clean rebookings.",
      automaticDemotion: "Any involuntary downgrade.",
    },
    sectorExamples: [],
    heroMedia: image(media.framework.id, media.framework.version, "hero", "W12 framework hero"),
    cta: { label: "Apply", href: "/contact" },
    ...governance,
  },
  office: {
    schemaVersion: 1,
    city: "Dubai",
    address: "Office 1914, The Binary, Business Bay, Dubai, UAE",
    phone: "+971 4 123 4567",
    ...governance,
  },
  "site-configuration": {
    schemaVersion: 1,
    page: "homepage",
    hero: {
      posterMediaId: "00000000-0000-4000-8000-000000000261",
      posterMediaVersionId: "00000000-0000-4000-8000-000000000262",
      sources: [
        {
          mediaId: "00000000-0000-4000-8000-000000000263",
          mediaVersionId: "00000000-0000-4000-8000-000000000264",
          mimeType: "video/mp4",
        },
        {
          mediaId: "00000000-0000-4000-8000-000000000265",
          mediaVersionId: "00000000-0000-4000-8000-000000000266",
          mimeType: "video/webm",
        },
      ],
    },
  },
  "landing-page": {
    schemaVersion: 1,
    pagePath: "/about",
    template: "landing",
    narrative: "A representative governed landing narrative.",
    sections: [
      {
        type: "narrative",
        id: "hero",
        order: 0,
        body: [{ type: "paragraph", text: "Hero narrative." }],
      },
      {
        type: "cta",
        id: "about-closing-cta",
        order: 1,
        label: "Start a conversation",
        href: "/contact",
        style: "primary",
      },
    ],
    cta: { label: "Contact", href: "/contact", style: "secondary" },
    seo: { title: "W12 About", description: "W12 landing description", noIndex: false },
    legal: { disclaimer: "Representative fixture." },
    visualReferences: [image(media.landing.id, media.landing.version, "supporting", "W12 landing visual")],
    ...governance,
  },
};

const clearPathByKind: Partial<Record<CmsDocumentKind, string>> = {
  person: "biography",
  partner: "contribution",
  platform: "cta",
  publication: "updatedDate",
  "case-study": "context",
  industry: "heroMedia",
  framework: "cta",
  office: "phone",
  "landing-page": "cta",
};

const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

test("W12 admin save builder round-trips representative fields for all ten kinds", () => {
  assert.deepEqual(Object.keys(contentByKind).sort(), [...cmsDocumentKinds].sort());

  for (const kind of cmsDocumentKinds) {
    const source = {
      slug: `w12-${kind}`,
      title: `W12 ${kind}`,
      summary: "A representative admin summary.",
      content: contentByKind[kind],
      mediaIds: [],
      markets: ["uae"],
    };
    const saved = buildDraftSave(
      kind,
      source,
      {
        title: "W12 search title",
        description: "W12 search description",
        canonicalUrl: "https://example.com/w12",
        noIndex: true,
      },
      false,
    );
    assert.equal(saved.success, true, `${kind} should use the shared draft validator`);
    if (!saved.success) continue;
    assert.deepEqual(saved.snapshot.content, source.content, `${kind} content must survive admin save preparation`);
    assert.deepEqual(saved.snapshot.markets, ["uae"]);
    assert.deepEqual(saved.seo, {
      title: "W12 search title",
      description: "W12 search description",
      canonicalUrl: "https://example.com/w12",
      noIndex: true,
    });

    const clearable = clone(source.content);
    const path = clearPathByKind[kind];
    if (path) delete clearable[path];
    const cleared = buildDraftSave(
      kind,
      { ...source, content: clearable },
      {},
      false,
    );
    assert.equal(
      cleared.success,
      true,
      `${kind} optional clear must remain a saveable draft: ${
        cleared.success ? "" : cleared.issues.map((issue) => issue.path).join(", ")
      }`,
    );
  }
});

test("W12 admin clear and error states retain the shared mutation contract", () => {
  assert.equal(
    normalizeDraftSeo({ title: "", description: "", canonicalUrl: "", noIndex: false }, true),
    null,
    "an existing SEO object is explicitly cleared rather than silently retained",
  );
  assert.equal(
    normalizeDraftSeo({ title: "", description: "", canonicalUrl: "", noIndex: false }, false),
    undefined,
    "an untouched SEO object remains absent",
  );
  assert.equal(describeSaveFailure({ status: 403 }).action, "review-fields");
  assert.equal(describeSaveFailure({ status: 409 }).action, "review-conflict");
  assert.equal(describeSaveFailure({
    status: 500,
    data: { code: "DOCUMENT_SAVE_COMMITTED", committed: true },
  }).action, "reload-committed");
});

test("W12 admin media controls retain exact version pins rather than only asset ids", () => {
  for (const kind of cmsDocumentKinds) {
    const references = collectCmsMediaReferences(kind, contentByKind[kind]);
    for (const reference of references) {
      assert.ok(reference.mediaVersionId, `${kind} media selection must include a version pin`);
    }
    if (kind === "office") assert.deepEqual(references, []);
  }
});