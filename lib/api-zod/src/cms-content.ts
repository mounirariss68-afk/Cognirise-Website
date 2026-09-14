import { z } from "zod";
import {
  type HScore,
  type Oversight,
  type RScore,
  OVERSIGHT_LABELS,
  OVERSIGHT_ORDER,
  getCeiling,
  getEBand,
  isRequestedAboveCeiling,
} from "./agent-authority";
import {
  landingPageSlotContract,
  type GovernedLandingPagePath,
  type GovernedLandingSlotType,
} from "./landing-page-slots.generated";
import { projectIndustrySnapshotForMarket } from "./industry-market-projection";

export const CMS_CONTRACT_VERSION = 1 as const;
export const cmsDocumentKinds = ["person", "partner", "platform", "publication", "case-study", "industry", "framework", "office", "site-configuration", "landing-page"] as const;
export type CmsDocumentKind = (typeof cmsDocumentKinds)[number];
export type CmsValidationMode = "draft" | "publish";

/**
 * The compiled /work overview was retired in favour of individually governed
 * case-study routes. Keep this explicit rather than relying on the generated
 * slot contract alone: old published revisions can outlive the source
 * inventory, and must remain readable in the CMS without becoming public
 * landing delivery.
 */
export const CMS_RETIRED_LANDING_PAGE_PATHS = ["/work", "/work/"] as const;
export function initialCmsContent(kind: CmsDocumentKind): CmsContent {
  if (kind === "framework") {
    return {
      schemaVersion: CMS_CONTRACT_VERSION,
      template: "agent-authority",
    } as CmsContent;
  }
  if (kind === "site-configuration") {
    return { schemaVersion: CMS_CONTRACT_VERSION } as CmsContent;
  }
  if (kind === "landing-page") {
    return {
      schemaVersion: CMS_CONTRACT_VERSION,
      template: "landing",
      sections: [],
      seo: {},
      legal: {},
      visualReferences: [],
    } as unknown as CmsContent;
  }

  return { schemaVersion: CMS_CONTRACT_VERSION } as CmsContent;
}

function isInitialCmsDraft(kind: CmsDocumentKind, input: unknown): boolean {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return false;
  const expected = initialCmsContent(kind) as unknown as Record<string, unknown>;
  const received = input as Record<string, unknown>;
  const expectedKeys = Object.keys(expected);
  const receivedKeys = Object.keys(received);
  return receivedKeys.length === expectedKeys.length
    && expectedKeys.every((key) =>
      JSON.stringify(received[key]) === JSON.stringify(expected[key])
    );
}

const safeExternalUrl = z.string().url().regex(/^https?:\/\//i, "Only HTTP(S) links are allowed.");
const safeInternalPath = z.string().regex(/^\/(?!\/)[a-z0-9/_-]*(?:\?[a-z0-9&=_-]+)?(?:#[a-z0-9_-]+)?$/i);
const safeAssetPath = z.string().regex(/^\/(?!\/)[a-z0-9/_.-]+$/i);
const safeLink = z.union([safeExternalUrl, safeInternalPath]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const optionalDate = date.optional();
const stringList = z.array(z.string().trim().min(1).max(240)).max(50).default([]);

const requiredBankingStringList = z.array(z.string().trim().min(1).max(240)).min(1).max(8);
const idList = z.array(z.string().uuid()).max(50).default([]);

/** A media selection is an immutable (asset, version) pair.  The asset id is
 * retained because it is the stable library identity; delivery must always use
 * mediaVersionId. */
export const cmsMediaReferenceSchema = z.object({
  mediaId: z.string().uuid(),
  mediaVersionId: z.string().uuid(),
  role: z.enum(["identity", "logo", "hero", "supporting", "background", "icon", "og-image", "document"]),
  altText: z.string().trim().min(1).max(500).optional(),
}).strict();

const optionalMediaReference = cmsMediaReferenceSchema.optional();

const legacyMediaId = z.string().uuid().optional().describe(
  "Deprecated migration input. New selections must use the corresponding immutable media reference.",
);

export const cmsSourceSchema = z.object({
  label: z.string().trim().min(1).max(240),
  url: safeExternalUrl.optional(),
  accessedAt: optionalDate,
}).strict();

export const cmsEvidenceSchema = z.object({
  statement: z.string().trim().min(1).max(1_000),
  source: cmsSourceSchema,
  approved: z.boolean().default(false),
}).strict();

export const cmsRichBlockSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("heading"), level: z.union([z.literal(2), z.literal(3)]), text: z.string().trim().min(1).max(240) }).strict(),
  z.object({ type: z.literal("paragraph"), text: z.string().trim().min(1).max(8_000) }).strict(),
  z.object({ type: z.literal("list"), style: z.enum(["bullet", "numbered"]).default("bullet"), items: stringList }).strict(),
  z.object({ type: z.literal("quote"), text: z.string().trim().min(1).max(2_000), attribution: z.string().trim().max(240).optional() }).strict(),
]);

const governance = {
  visibility: z.enum(["public", "hidden", "restricted"]).default("public"),
  order: z.number().int().min(0).max(10_000).default(0),
  sources: z.array(cmsSourceSchema).max(30).default([]),
  verificationDate: optionalDate,
  reviewDate: optionalDate,
  relatedIds: idList,
};

export const personContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  role: z.enum(["founder", "leader", "employee", "advisor"]),
  title: z.string().trim().min(1).max(240),
  biography: z.string().trim().max(8_000).optional(),
  contribution: z.string().trim().max(4_000).optional(),
  focusAreas: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    detail: z.string().trim().min(1).max(1_000),
  }).strict()).max(20).default([]),
  profileLinks: z.array(z.object({
    label: z.string().trim().min(1).max(80),
    url: safeLink,
  }).strict()).max(10).default([]),
  identityMedia: optionalMediaReference,
  identityMediaId: legacyMediaId,
  approvedFallback: z.enum(["initials", "brand-mark"]).optional(),
  ...governance,
}).strict();

export const partnerContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  allianceCategory: z.string().trim().min(1).max(160),
  positioning: z.string().trim().min(1).max(4_000),
  facts: z.array(z.object({ value: z.string().trim().min(1).max(160), label: z.string().trim().min(1).max(500) }).strict()).max(20).default([]),
  evidence: z.array(cmsEvidenceSchema).max(30).default([]),
  coverage: stringList,
  contribution: z.string().trim().max(4_000).optional(),
  website: safeExternalUrl.optional(),
  logoMedia: optionalMediaReference,
  logoMediaId: legacyMediaId,
  relationshipStatus: z.enum(["active", "prospective", "paused", "ended"]),
  ...governance,
}).strict();

export const officeContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  city: z.string().trim().min(1).max(160),
  address: z.string().trim().min(1).max(1_000),
  phone: z.string().trim().min(1).max(80).optional(),
  ...governance,
}).strict();

export const platformContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  category: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(2_000),
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  template: z.enum(["standard", "cognios-specialist"]).default("standard"),
  sections: z.array(z.object({
    heading: z.string().trim().min(1).max(240),
    body: z.array(cmsRichBlockSchema).max(50),
  }).strict()).max(20).default([]),
  capabilities: stringList,
  differentiators: stringList,
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLink }).strict().optional(),
  ...governance,
}).strict();

export const publicationContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  variant: z.enum(["article", "pov"]),
  teaser: z.string().trim().min(1).max(1_000),
  body: z.array(cmsRichBlockSchema).max(200).default([]),
  author: z.string().trim().min(1).max(240),
  publicationDate: date,
  updatedDate: optionalDate,
  readingTimeMinutes: z.number().int().min(1).max(240).optional(),
  topics: stringList,
  sectors: stringList,
  platformIds: idList,
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  pdfMedia: optionalMediaReference,
  pdfMediaId: legacyMediaId,
  social: z.object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(300).optional(),
    imageMedia: optionalMediaReference,
    imageMediaId: legacyMediaId,
  }).strict().default({}),
  ...governance,
}).strict();

export const caseStudyContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  variant: z.enum(["summary", "full"]),
  disclosure: z.enum(["named", "anonymized", "restricted"]),
  sector: z.enum([
    "Financial Services",
    "Telecoms",
    "Travel & Hospitality",
    "Public Sector",
    "Manufacturing & Industrial",
    "Life Sciences",
    "Retail & Consumer",
    "Professional Services",
    "Security & AI Infrastructure",
  ]),
  organizationDescriptor: z.string().trim().min(1).max(240),
  engagementType: z.enum(["client-delivery", "product-demonstration", "concept", "proposal-prototype"]),
  deliveryStage: z.enum(["production", "pilot", "proof-of-concept", "mvp", "demo", "concept", "proposal"]),
  impactClassification: z.enum(["observed", "pilot-demo", "simulated", "projected", "unavailable"]),
  impactStatement: z.string().trim().min(1).max(2_000),
  disclosureNote: z.string().trim().min(1).max(1_000),
  publicEvidenceStatus: z.enum(["approved", "needs-review", "restricted"]),
  relatedIndustries: z.array(z.enum([
    "financial-services",
    "telecoms",
    "travel-hospitality",
    "energy-resources",
    "public-sector",
    "education",
  ])).max(6).default([]),
  visual: z.object({
    kind: z.literal("illustrative-interface-reconstruction"),
    caption: z.string().trim().min(1).max(500),
    altText: z.string().trim().min(1).max(500),
    textEquivalent: z.string().trim().min(1).max(2_000),
    template: z.enum([
      "knowledge-assistant",
      "analytics-dashboard",
      "workflow-console",
      "commerce-experience",
      "governance-console",
      "operations-console",
    ]),
    fixtureLabels: z.array(z.string().trim().min(1).max(120)).min(1).max(20),
  }).strict(),
  mandate: z.string().trim().min(1).max(2_000),
  context: z.string().trim().max(4_000).optional(),
  constraints: stringList,
  work: z.array(cmsRichBlockSchema).max(100).default([]),
  controls: stringList,
  outcomes: stringList,
  evidence: z.array(cmsEvidenceSchema).max(30).default([]),
  quote: z.object({ text: z.string().trim().min(1).max(2_000), attribution: z.string().trim().max(240).optional() }).strict().optional(),
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLink }).strict().optional(),
  ...governance,
}).strict();

const industrySourceSchema = z.object({
  label: z.string().trim().min(1).max(240),
  publisher: z.string().trim().min(1).max(240),
  kind: z.enum(["Official source", "Independent study", "Company-reported", "Vendor claim"]),
  url: safeExternalUrl,
  accessedAt: optionalDate,
  market: z.enum(["uae", "ksa", "turkiye", "europe"]).optional(),
  supports: z.string().trim().max(2_000).optional(),
  limitation: z.string().trim().max(2_000).optional(),
}).strict();

const titledBodyShape = {
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(1_000),
};

const titledBodySchema = z.object(titledBodyShape).strict();
const educationTitledBodySchema = z.object({
  ...titledBodyShape,
  market: z.enum(["uae", "ksa", "turkiye", "europe"]).optional(),
}).strict();

const educationMarketSchema = z.enum(["uae", "ksa", "turkiye", "europe"]);
const educationSignalShape = {
  institution: z.string().trim().min(1).max(120),
  signal: z.string().trim().min(1).max(500),
  implication: z.string().trim().min(1).max(500),
  sourceUrls: z.array(safeExternalUrl).min(1).max(4),
};
const educationApplicationItemShape = {
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(2_000),
  market: educationMarketSchema.optional(),
};
const legacyEducationApplicationsSchema = z.array(z.object({
  title: z.string().trim().min(1).max(160),
  items: z.array(z.object({
    ...educationApplicationItemShape,
    sourceUrls: z.array(safeExternalUrl),
  }).strict()),
}).strict());
const educationApplicationsV2Schema = z.array(z.object({
  title: z.string().trim().min(1).max(160),
  items: z.array(z.object({
    ...educationApplicationItemShape,
    sourceUrls: z.array(safeExternalUrl).min(1).max(4),
  }).strict()).min(1).max(12),
}).strict()).min(1).max(6);
const educationRoadmapSchema = z.array(z.object({
  horizon: z.string().trim().min(1).max(80),
  title: z.string().trim().min(1).max(160),
  body: z.string().trim().min(1).max(1_000),
}).strict()).length(3);

const educationImagerySceneSchema = z.object({
  src: safeAssetPath,
  altText: z.string().trim().min(1).max(500),
  media: cmsMediaReferenceSchema.extend({ role: z.literal("supporting") }).strict().optional(),
}).strict();
const legacyEducationPovSchema = z.object({
  version: z.undefined().optional(),
  introduction: z.string().trim().max(4_000).optional(),
  strategicShift: z.string().trim().max(4_000).optional(),
  patternQuote: z.string().trim().max(2_000).optional(),
  globalDirection: z.string().trim().max(4_000).optional(),
  convictions: z.array(educationTitledBodySchema).length(5),
  valueDomains: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(2_000),
    examples: z.array(z.string().trim().min(1).max(500)).min(1).max(6),
  }).strict()).length(3),
  applications: legacyEducationApplicationsSchema.optional(),
  signals: z.array(z.object({
    ...educationSignalShape,
    market: educationMarketSchema.optional(),
  }).strict()).min(6).max(10),
  targetState: z.array(titledBodySchema).length(6),
  roadmap: educationRoadmapSchema,
  leadershipTest: z.string().trim().min(1).max(1_000),
}).strict();

const educationPovV2Schema = z.object({
  version: z.literal(2),
  imagery: z.object({
    educatorPractice: educationImagerySceneSchema,
    researchCoordination: educationImagerySceneSchema,
  }).strict().optional(),
  introduction: z.string().trim().min(1).max(4_000),
  strategicShift: z.string().trim().min(1).max(4_000),
  patternQuote: z.string().trim().min(1).max(2_000),
  globalDirection: z.string().trim().min(1).max(4_000),
  convictions: z.array(educationTitledBodySchema).length(5),
  valueDomains: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(2_000),
    examples: z.array(z.string().trim().min(1).max(500)).max(6),
  }).strict()).length(5),
  applications: educationApplicationsV2Schema,
  signals: z.array(z.object({
    ...educationSignalShape,
    market: educationMarketSchema.optional(),
  }).strict()).min(1).max(10),
  targetState: z.array(titledBodySchema).length(7),
  roadmap: educationRoadmapSchema,
  leadershipTest: z.string().trim().min(1).max(1_000),
}).strict();

const educationPovSchema = z.union([legacyEducationPovSchema, educationPovV2Schema]);

const bankingMarketSchema = z.enum(["uae", "ksa", "turkiye", "europe"]);
export const publicSectorMarketSchema = z.enum(["uae", "ksa", "turkiye", "europe"]);

/**
 * Public-sector copy is deliberately a separate rich-block contract from the
 * generic CMS narrative blocks.  Public-sector evidence often needs a whole
 * sentence per list item, so the list item limit is materially larger than
 * the compact 240-character list used by the other templates.
 */
export const publicSectorRichListBlockSchema = z.object({
  type: z.literal("list"),
  style: z.enum(["bullet", "numbered"]).default("bullet"),
  items: z.array(z.string().trim().min(1).max(2_000)).max(50),
}).strict();

export const publicSectorRichBlockSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("heading"),
    level: z.union([z.literal(2), z.literal(3)]),
    text: z.string().trim().min(1).max(240),
  }).strict(),
  z.object({
    type: z.literal("paragraph"),
    text: z.string().trim().min(1).max(8_000),
  }).strict(),
  publicSectorRichListBlockSchema,
]);

export const publicSectorPovSchema = z.object({
  version: z.literal(1),
  market: publicSectorMarketSchema,
  marketLabel: z.string().trim().min(1).max(160),
  reviewBlockers: z.array(z.string().trim().min(1).max(1_000)).max(30).optional(),
  opportunity: z.array(publicSectorRichBlockSchema).min(1).max(50),
  pressuresHeading: z.string().trim().min(1).max(240),
  capabilitiesIntroduction: z.string().trim().min(1).max(2_000),
  applicationsDisclaimer: z.string().trim().min(1).max(2_000),
  marketHeading: z.string().trim().min(1).max(240),
  marketContext: z.array(publicSectorRichBlockSchema).min(1).max(50),
  sourcesIntroduction: z.string().trim().min(1).max(2_000),
  nextAction: z.array(publicSectorRichBlockSchema).min(1).max(50),
}).strict();

export const industryContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  legacyPath: safeInternalPath,
  name: z.string().trim().min(1).max(160),
  shortName: z.string().trim().min(1).max(80),
  thesis: z.string().trim().min(1).max(240),
  accent: z.string().trim().min(1).max(120),
  dek: z.string().trim().min(1).max(2_000),
  opportunity: z.string().trim().min(1).max(1_000),
  capabilities: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(1_000),
  }).strict()).min(2).max(8),
  selectedWork: z.object({
    description: z.string().trim().min(1).max(1_000),
  }).strict(),
  image: safeAssetPath,
  imageAlt: z.string().trim().min(1).max(300),
  variant: z.enum(["ledger", "network", "journey", "field", "factory"]),
  pressures: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(1_000),
  }).strict()).min(3).max(5),
  reversal: z.object({
    title: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(2_000),
  }).strict(),
  myth: z.object({
    claim: z.string().trim().min(1).max(240),
    verdict: z.string().trim().min(1).max(2_000),
  }).strict(),
  gcc: z.string().trim().min(1).max(2_000),
  service: z.object({
    label: z.string().trim().min(1).max(160),
    href: safeInternalPath,
    firstMove: z.string().trim().min(1).max(240),
  }).strict(),
  uses: z.array(z.object({
    use: z.string().trim().min(1).max(160),
    description: z.string().trim().max(2_000).optional(),
    evidence: z.string().trim().min(1).max(3_000),
    boundary: z.string().trim().min(1).max(500),
    sourceUrls: z.array(safeExternalUrl).max(12).optional(),
  }).strict()).min(1).max(12),
  sources: z.array(industrySourceSchema).min(1).max(30),
  educationPov: educationPovSchema.optional(),
  bankingPov: z.lazy(() => bankingPovSchema).optional(),
  publicSectorPov: publicSectorPovSchema.optional(),
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  supportingMedia: z.array(cmsMediaReferenceSchema).max(8).optional(),
  verificationDate: date,
  reviewDate: date,
  visibility: z.enum(["public", "hidden", "restricted"]).default("public"),
  order: z.number().int().min(0).max(10_000).default(0),
  relatedIds: idList,
}).strict().superRefine((value, context) => {
  if (value.bankingPov && value.name !== "Financial Services") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["bankingPov"],
      message: "The Banking POV is available only to Financial Services.",
    });
  }
  if (value.publicSectorPov && value.name !== "Public Sector") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["publicSectorPov"],
      message: "The Public Sector POV is available only to Public Sector.",
    });
  }
  const sourceTrail = new Set(value.sources.map((source) => source.url));
  if (value.bankingPov) {
    for (const [index, source] of value.bankingPov.evidenceSignals.entries()) {
      if (!sourceTrail.has(source.url)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["bankingPov", "evidenceSignals", index, "url"],
          message: "Banking evidence URL must match a URL in the industry source trail.",
        });
      }
    }
  }
  if (value.educationPov?.version === 2) {
    const associations = [
      ...value.educationPov.signals.flatMap((signal, index) =>
        signal.sourceUrls.map((url, sourceIndex) => ({
          url,
          path: ["educationPov", "signals", index, "sourceUrls", sourceIndex],
        }))),
      ...(value.educationPov.applications ?? []).flatMap((group, groupIndex) =>
        group.items.flatMap((item, itemIndex) =>
          item.sourceUrls.map((url, sourceIndex) => ({
            url,
            path: ["educationPov", "applications", groupIndex, "items", itemIndex, "sourceUrls", sourceIndex],
          })))),
    ];
    for (const association of associations) {
      if (!sourceTrail.has(association.url)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: association.path,
          message: "Source URL must match a URL in the industry source trail.",
        });
      }
    }
  }
  for (const [index, use] of value.uses.entries()) {
    if (value.publicSectorPov && !use.sourceUrls?.length) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["uses", index, "sourceUrls"],
        message: "A Public Sector use must include at least one source URL.",
      });
    }
    for (const [sourceIndex, url] of (use.sourceUrls ?? []).entries()) {
      if (!sourceTrail.has(url)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["uses", index, "sourceUrls", sourceIndex],
          message: "Source URL must match a URL in the industry source trail.",
        });
      }
    }
  }
  if (value.publicSectorPov) {
    for (const [index, source] of value.sources.entries()) {
      if (!source.market) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", index, "market"],
          message: "A Public Sector source must include its market attribution.",
        });
      } else if (source.market !== value.publicSectorPov.market) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", index, "market"],
          message: "A Public Sector source market must match publicSectorPov.market.",
        });
      }
      if (!source.supports) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", index, "supports"],
          message: "A Public Sector source must state what claim it supports.",
        });
      }
      if (!source.limitation) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["sources", index, "limitation"],
          message: "A Public Sector source must state its limitation.",
        });
      }
    }
  }
});

const frameworkExampleSchema = z.object({
  sector: z.string().trim().min(1).max(160),
  title: z.string().trim().min(1).max(240),
  handover: z.enum(["knowledge", "decision", "action"]),
  reversibility: z.enum(["R1", "R2", "R3", "R4"]),
  reach: z.enum(["H1", "H2", "H3", "H4", "H5"]),
  exposureBand: z.enum(["E1", "E2", "E3", "E4", "E5"]),
  oversight: z.string().trim().min(1).max(500),
  detail: z.string().trim().min(1).max(2_000),
}).strict();

const frameworkWorkedExampleSchema = frameworkExampleSchema.extend({
  requestedAuthority: z.enum(OVERSIGHT_ORDER),
  interventionWindow: z.string().trim().min(1).max(1_000).optional(),
  accountableRole: z.string().trim().min(1).max(240),
  promotionEvidence: z.string().trim().min(1).max(2_000),
  automaticDemotion: z.string().trim().min(1).max(2_000),
  authorityArtefact: z.string().trim().min(1).max(1_000).optional(),
}).strict();

/** These diagrams are code-owned static assets, never editor-supplied paths. */
export const FRAMEWORK_GUARDRAILS_FIGURE_ASSETS = [
  "aam-guardrails-vs-authority.svg",
  "aam-how-they-interact.svg",
] as const;

const frameworkGuardrailsFigureSchema = z.object({
  asset: z.enum(FRAMEWORK_GUARDRAILS_FIGURE_ASSETS),
  altText: z.string().trim().min(1).max(1_000),
  captionLabel: z.string().trim().min(1).max(120),
  captionLead: z.string().trim().min(1).max(1_000),
  captionBody: z.string().trim().min(1).max(1_000),
}).strict();

export const frameworkGuardrailsSubsectionSchema = z.object({
  heading: z.string().trim().min(1).max(240),
  opening: z.string().trim().min(1).max(2_000),
  definition: z.string().trim().min(1).max(4_000),
  bankExample: z.object({
    beforeQuote: z.string().trim().min(1).max(4_000),
    quote: z.string().trim().min(1).max(1_000),
    afterQuote: z.string().trim().min(1).max(4_000),
  }).strict(),
  comparisonHeading: z.string().trim().min(1).max(240),
  comparisonColumns: z.object({
    guardrails: z.string().trim().min(1).max(240),
    authorityModel: z.string().trim().min(1).max(240),
  }).strict(),
  comparisonRows: z.array(z.object({
    label: z.string().trim().min(1).max(240),
    guardrails: z.string().trim().min(1).max(2_000),
    authorityModel: z.string().trim().min(1).max(2_000),
    guardrailsEmphasis: z.enum(["plain", "italic"]),
    authorityModelEmphasis: z.enum(["plain", "italic"]),
  }).strict()).length(3),
  unit: z.object({
    heading: z.string().trim().min(1).max(240),
    paragraphs: z.array(z.string().trim().min(1).max(4_000)).length(2),
    emphasis: z.string().trim().min(1).max(1_000),
  }).strict(),
  firstFigure: frameworkGuardrailsFigureSchema.extend({
    asset: z.literal("aam-guardrails-vs-authority.svg"),
  }).strict(),
  interaction: z.object({
    heading: z.string().trim().min(1).max(240),
    introduction: z.string().trim().min(1).max(1_000),
    exposure: z.object({
      lead: z.string().trim().min(1).max(240),
      body: z.string().trim().min(1).max(4_000),
    }).strict(),
    evidence: z.object({
      lead: z.string().trim().min(1).max(240),
      body: z.string().trim().min(1).max(4_000),
    }).strict(),
    controlsIntroduction: z.string().trim().min(1).max(2_000),
    requiredControls: z.object({
      lead: z.string().trim().min(1).max(240),
      bodyBeforeExamples: z.string().trim().min(1).max(4_000),
      assuranceExample: z.string().trim().min(1).max(2_000),
      betweenExamples: z.string().trim().max(1_000).optional(),
      controlExample: z.string().trim().min(1).max(2_000),
      conclusion: z.string().trim().min(1).max(1_000),
    }).strict(),
    compensatingControls: z.object({
      lead: z.string().trim().min(1).max(240),
      bodyBeforeContent: z.string().trim().min(1).max(4_000),
      content: z.string().trim().min(1).max(240),
      bodyAfterContent: z.string().trim().min(1).max(4_000),
    }).strict(),
  }).strict(),
  secondFigure: frameworkGuardrailsFigureSchema.extend({
    asset: z.literal("aam-how-they-interact.svg"),
  }).strict(),
  designRule: z.object({
    heading: z.string().trim().min(1).max(240),
    quote: z.string().trim().min(1).max(2_000),
    conclusion: z.string().trim().min(1).max(4_000),
    failure: z.string().trim().min(1).max(4_000),
    closingEmphasis: z.string().trim().min(1).max(1_000),
  }).strict(),
}).strict();

export type FrameworkGuardrailsSubsection = z.infer<typeof frameworkGuardrailsSubsectionSchema>;

/** The original methodology contract. Keep this independently discriminated:
 * Guardrails is a different public page, not an optional section of AAM. */
export const agentAuthorityFrameworkContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  template: z.literal("agent-authority").default("agent-authority"),
  teaser: z.string().trim().min(1).max(1_000),
  handoverExplanation: z.string().trim().min(1).max(4_000),
  methodology: z.array(cmsRichBlockSchema).min(1).max(100),
  workedExample: frameworkWorkedExampleSchema,
  sectorExamples: z.array(frameworkExampleSchema).max(20).default([]),
  /** Optional so legacy framework revisions remain valid and render unchanged. */
  guardrails: frameworkGuardrailsSubsectionSchema.optional(),
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLink }).strict().optional(),
  ...governance,
}).strict();

const guardedText = z.string().trim().min(1).max(4_000);
const fixedId = <T extends z.ZodRawShape>(id: string, shape: T) =>
  z.object({ id: z.literal(id), ...shape }).strict();

const guardrailsLayerSchema = z.discriminatedUnion("id", [
  fixedId("policy", { title: guardedText, description: guardedText, example: guardedText, bypass: guardedText, strengthLabel: guardedText }),
  fixedId("prompt", { title: guardedText, description: guardedText, example: guardedText, bypass: guardedText, strengthLabel: guardedText }),
  fixedId("runtime", { title: guardedText, description: guardedText, example: guardedText, bypass: guardedText, strengthLabel: guardedText }),
  fixedId("architecture", { title: guardedText, description: guardedText, example: guardedText, bypass: guardedText, strengthLabel: guardedText }),
]);
const guardrailsStoppingRuleSchema = z.discriminatedUnion("id", [
  fixedId("windowed-reversible", { band: guardedText, minimumLayer: z.literal("prompt"), addition: guardedText }),
  fixedId("reversible-cost", { band: guardedText, minimumLayer: z.literal("runtime"), addition: z.string().trim().max(2_000) }),
  fixedId("irreversible-customer", { band: guardedText, minimumLayer: z.literal("runtime"), addition: guardedText }),
  fixedId("regulator-visible", { band: guardedText, minimumLayer: z.literal("architecture"), addition: guardedText }),
  fixedId("above-ceiling", { band: guardedText, minimumLayer: z.literal("architecture"), addition: guardedText }),
]);
const guardrailsQuestionSchema = z.discriminatedUnion("id", [
  fixedId("enforcement", { prompt: guardedText, description: guardedText }),
  fixedId("presence", { prompt: guardedText, description: guardedText }),
  fixedId("afterwards", { prompt: guardedText, description: guardedText }),
]);
const guardrailsMethodPhaseSchema = z.discriminatedUnion("id", [
  fixedId("set", { title: guardedText, caption: guardedText, steps: z.array(guardedText).length(4) }),
  fixedId("prove", { title: guardedText, caption: guardedText, steps: z.array(guardedText).length(4) }),
  fixedId("hold", { title: guardedText, caption: guardedText, steps: z.array(guardedText).length(4) }),
]);
const guardrailsMaintenanceSchema = z.discriminatedUnion("id", [
  fixedId("policy", { layer: guardedText, set: guardedText, prove: guardedText, hold: guardedText }),
  fixedId("prompt", { layer: guardedText, set: guardedText, prove: guardedText, hold: guardedText }),
  fixedId("runtime", { layer: guardedText, set: guardedText, prove: guardedText, hold: guardedText }),
  fixedId("architecture", { layer: guardedText, set: guardedText, prove: guardedText, hold: guardedText }),
]);
const guardrailsSourceGroupSchema = z.discriminatedUnion("id", [
  fixedId("forbid", { heading: guardedText, references: z.array(guardedText).min(1).max(12) }),
  fixedId("bypass-test", { heading: guardedText, references: z.array(guardedText).min(1).max(12) }),
  fixedId("measured-against", { heading: guardedText, references: z.array(guardedText).min(1).max(12) }),
]);
const guardrailsMoveSchema = z.discriminatedUnion("id", [
  fixedId("one", { heading: guardedText, body: guardedText }),
  fixedId("two", { heading: guardedText, body: guardedText }),
  fixedId("three", { heading: guardedText, body: guardedText }),
]);
const guardrailsPresentationCopySchema = z.object({
  summary: guardedText,
  detailsLabel: guardedText.optional(),
}).strict().superRefine((copy, context) => {
  if (copy.detailsLabel === undefined) return;
  if (!copy.detailsLabel.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["detailsLabel"],
      message: "A presentation detail label cannot be blank.",
    });
  }
});
/** Optional summary-first reading aids. Full reviewed detail remains in the
 * existing Guardrails fields rather than being copied into a second envelope. */
const guardrailsPresentationSchema = z.object({
  version: z.literal("guardrails-redesign-v1"),
  hero: z.object({
    headline: guardedText,
    subheadline: guardedText,
    detailsLabel: guardedText.optional(),
  }).strict(),
  distinction: guardrailsPresentationCopySchema,
  layers: guardrailsPresentationCopySchema,
  exposure: guardrailsPresentationCopySchema,
  setProveHold: z.object({
    summary: guardedText,
    questionsDetailsLabel: guardedText.optional(),
    maintenanceDetailsLabel: guardedText.optional(),
    measurementDetailsLabel: guardedText.optional(),
  }).strict(),
  authority: guardrailsPresentationCopySchema,
  sourcesNextStep: guardrailsPresentationCopySchema,
}).strict();

function requiresFixedOrder(
  expected: readonly string[],
  path: string,
) {
  return (items: Array<{ id: string }>, context: z.RefinementCtx) => {
    if (items.some((item, index) => item.id !== expected[index])) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [path],
        message: `${path} must retain its reviewed identifiers and order.`,
      });
    }
  };
}

/** Dedicated CMS composition for /methodologies/guardrails. The IDs, counts,
 * E1–E5 mapping, and control placement are contract-owned; prose is edited
 * only inside those fixed slots. */
export const guardrailsFrameworkContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  template: z.literal("guardrails"),
  hero: z.object({
    eyebrow: guardedText,
    headline: guardedText,
    subheadline: guardedText,
    primaryAction: z.object({ label: guardedText, href: z.literal("/contact") }).strict(),
    secondaryAction: z.object({ label: guardedText, href: z.literal("/methodologies/agent-authority-model") }).strict(),
  }).strict(),
  /** A page-owned immutable image. Draft media may still be pending review;
   * normal publish validation remains the release gate. */
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  presentation: guardrailsPresentationSchema.optional(),
  distinction: z.object({
    heading: guardedText,
    body: z.array(guardedText).length(3),
  }).strict(),
  layers: z.object({
    heading: guardedText, intro: guardedText, exampleText: guardedText, tableHeaders: z.array(guardedText).length(5),
    table: z.array(z.object({ id: z.enum(["policy", "prompt", "runtime", "architecture"]), layer: guardedText, whatItIs: guardedText, inThisExample: guardedText, whatGetsPastIt: guardedText, strength: z.number().int().min(1).max(4), strengthLabel: guardedText }).strict()).length(4).superRefine((rows, ctx) => {
      requiresFixedOrder(["policy", "prompt", "runtime", "architecture"], "layers.table")(rows, ctx);
      if (rows.some((row, index) => row.strength !== index + 1 || row.strengthLabel !== `${index + 1} of 4`)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "layers.table strength must match its fixed row." });
    }),
    pullOut: guardedText, closingLine: guardedText,
    aside: z.object({ heading: guardedText, body: guardedText }).strict(),
    diagram: z.object({
      title: guardedText, description: guardedText, kicker: guardedText, rule: guardedText, thresholdAfter: z.literal("prompt"), thresholdLabel: guardedText, footer: guardedText,
      rows: z.array(z.object({
        id: z.enum(["policy", "prompt", "runtime", "architecture"]),
        label: guardedText, description: guardedText, example: guardedText, bypassLabel: guardedText,
        bypass: guardedText, strength: z.number().int().min(1).max(4), strengthLabel: guardedText,
      }).strict()).length(4).superRefine((rows, ctx) => {
        requiresFixedOrder(["policy", "prompt", "runtime", "architecture"], "layers.diagram.rows")(rows, ctx);
        if (rows.some((row, index) => row.strength !== index + 1 || row.strengthLabel !== `${index + 1} of 4`)) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "layers.diagram.rows strength must match its fixed row." });
        }
      }),
    }).strict(),
  }).strict(),
  stoppingRule: z.object({
    heading: guardedText,
    intro: guardedText, tableHeaders: z.array(guardedText).length(2),
    exposures: z.array(z.object({ id: z.enum(["internal-reversible", "reversible-cost", "irreversible-customer", "regulator-public-safety", "above-ceiling"]), handover: guardedText, requirement: guardedText, enforcementLayer: z.enum(["prompt", "runtime", "architecture"]), additionId: z.enum(["monitoring", "none", "architectural-scoping", "independent-control", "authority-artefact"]) }).strict()).length(5).superRefine((rows, ctx) => {
      requiresFixedOrder(["internal-reversible", "reversible-cost", "irreversible-customer", "regulator-public-safety", "above-ceiling"], "stoppingRule.exposures")(rows, ctx);
      const expected = [["prompt", "monitoring"], ["runtime", "none"], ["runtime", "architectural-scoping"], ["architecture", "independent-control"], ["architecture", "authority-artefact"]] as const;
      if (rows.some((row, index) => row.enforcementLayer !== expected[index][0] || row.additionId !== expected[index][1])) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each exposure must retain its fixed enforcement destination and addition." });
    }),
    pullOut: guardedText,
    diagram: z.object({
      title: guardedText, description: guardedText, kicker: guardedText, heading: guardedText, bandHeading: guardedText, destinationHeading: guardedText, footer: guardedText, note: guardedText,
      bands: z.array(z.object({ id: z.enum(["internal-reversible", "reversible-cost", "irreversible-customer", "regulator-public-safety", "above-ceiling"]), label: guardedText, description: guardedText, destination: z.enum(["prompt", "runtime", "architecture"]), additionId: z.enum(["monitoring", "none", "architectural-scoping", "independent-control", "authority-artefact"]) }).strict()).length(5).superRefine((bands, ctx) => {
        requiresFixedOrder(["internal-reversible", "reversible-cost", "irreversible-customer", "regulator-public-safety", "above-ceiling"], "stoppingRule.diagram.bands")(bands, ctx);
        const expected = [["prompt", "monitoring"], ["runtime", "none"], ["runtime", "architectural-scoping"], ["architecture", "independent-control"], ["architecture", "authority-artefact"]] as const;
        if (bands.some((band, index) => band.destination !== expected[index][0] || band.additionId !== expected[index][1])) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Each diagram band must retain its fixed enforcement destination and addition." });
        }
      }),
      destinations: z.array(z.object({ id: z.enum(["prompt", "runtime", "architecture"]), label: guardedText, description: guardedText }).strict()).length(3).superRefine(requiresFixedOrder(["prompt", "runtime", "architecture"], "stoppingRule.diagram.destinations")),
      additions: z.array(z.object({ id: z.enum(["monitoring", "architectural-scoping", "independent-control", "authority-artefact"]), label: guardedText }).strict()).length(4).superRefine(requiresFixedOrder(["monitoring", "architectural-scoping", "independent-control", "authority-artefact"], "stoppingRule.diagram.additions")),
    }).strict(),
  }).strict(),
  questions: z.object({
    heading: guardedText,
    intro: guardedText,
    panels: z.array(z.object({ id: z.enum(["enforcement", "presence", "afterwards"]), title: guardedText, body: guardedText }).strict()).length(3).superRefine(requiresFixedOrder(["enforcement", "presence", "afterwards"], "questions.panels")),
  }).strict(),
  method: z.object({
    heading: guardedText,
    intro: guardedText,
    phases: z.array(z.object({ id: z.enum(["set", "prove", "hold"]), name: guardedText, caption: guardedText, steps: z.array(guardedText).length(4) }).strict()).length(3).superRefine(requiresFixedOrder(["set", "prove", "hold"], "method.phases")),
  }).strict(),
  maintenance: z.object({
    heading: guardedText, tableHeaders: z.array(guardedText).length(4),
    table: z.array(z.object({ id: z.enum(["policy", "prompt", "runtime", "architecture"]), layer: guardedText, set: guardedText, prove: guardedText, hold: guardedText }).strict()).length(4).superRefine(requiresFixedOrder(["policy", "prompt", "runtime", "architecture"], "maintenance.table")),
    closingParagraph: guardedText,
  }).strict(),
  measurement: z.object({ heading: guardedText, statement: guardedText, supportingLine: guardedText }).strict(),
  authority: z.object({
    heading: guardedText,
    body: z.array(guardedText).length(5),
    linkCard: z.object({ title: guardedText, description: guardedText, href: z.literal("/methodologies/agent-authority-model") }).strict(),
  }).strict(),
  references: z.object({
    heading: guardedText,
    intro: z.array(guardedText).length(2),
    groups: z.array(z.object({ id: z.enum(["forbid", "bypass", "measured"]), title: guardedText, items: guardedText }).strict()).length(3).superRefine(requiresFixedOrder(["forbid", "bypass", "measured"], "references.groups")),
  }).strict(),
  moves: z.object({
    heading: guardedText,
    moves: z.array(z.object({ number: z.number().int().min(1).max(3), title: guardedText, body: guardedText }).strict()).length(3).superRefine((moves, ctx) => {
      if (moves.some((move, index) => move.number !== index + 1)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "moves.moves must retain numeric order." });
    }),
    cta: z.object({ heading: guardedText, body: guardedText, button: z.object({ label: guardedText, href: z.literal("/contact") }).strict() }).strict(),
    footerNote: guardedText,
  }).strict(),
  visibility: z.enum(["public", "hidden", "restricted"]).default("public"),
  order: z.number().int().min(0).max(10_000).default(0),
  sources: z.array(cmsSourceSchema).default([]),
  verificationDate: optionalDate,
  reviewDate: optionalDate,
  relatedIds: idList,
  relatedLink: z.object({ title: guardedText, body: guardedText, href: z.literal("/methodologies/guardrails-framework") }).strict(),
}).strict();

const frameworkContentDiscriminatedUnion = z.discriminatedUnion("template", [
  agentAuthorityFrameworkContentSchema,
  guardrailsFrameworkContentSchema,
]);

/** Legacy Agent Authority revisions predate the template discriminator.  Only
 * its absence selects that legacy contract; explicit unknown values remain
 * invalid rather than being silently reclassified. */
export const frameworkContentSchema = z.preprocess((value) => {
  if (
    value
    && typeof value === "object"
    && !Array.isArray(value)
  ) {
    const content = value as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(content, "template")) {
      return { ...content, template: "agent-authority" };
    }
    // An explicitly supplied discriminator must be valid; Zod's default on
    // the legacy arm would otherwise treat an explicit undefined as absent.
    if (content.template === undefined) return { ...content, template: "__invalid__" };
  }
  return value;
}, frameworkContentDiscriminatedUnion);

const heroMediaReferenceSchema = z.object({
  mediaId: z.string().uuid(),
  mediaVersionId: z.string().uuid(),
  mimeType: z.enum(["video/mp4", "video/webm"]),
}).strict();

export const CMS_HERO_FILM_SLOTS = ["homepage", "industries"] as const;
export type CmsHeroFilmSlot = (typeof CMS_HERO_FILM_SLOTS)[number];
export const CMS_HERO_DOCUMENT_SLUGS: Record<CmsHeroFilmSlot, string> = {
  homepage: "site-homepage-hero",
  industries: "site-industries-hero",
};

export const CMS_CONTACT_EMAIL_DOCUMENT_SLUG = "site-contact-email" as const;

export function isCmsConfigurationIdentityValid(
  kind: CmsDocumentKind,
  slug: string,
  input: unknown,
) {
  if (kind !== "site-configuration") return true;
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return slug !== CMS_CONTACT_EMAIL_DOCUMENT_SLUG;
  }
  const value = input as Record<string, unknown>;
  const nested = value.content;
  const content = nested && typeof nested === "object" && !Array.isArray(nested)
    ? nested as Record<string, unknown>
    : value;
  const isContactEmail = content.configuration === "contact-email";
  return (slug === CMS_CONTACT_EMAIL_DOCUMENT_SLUG) === isContactEmail;
}

const heroSiteConfigurationContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  page: z.enum(CMS_HERO_FILM_SLOTS),
  hero: z.object({
    posterMediaId: z.string().uuid(),
    posterMediaVersionId: z.string().uuid(),
    sources: z.array(heroMediaReferenceSchema).length(2),
  }).strict(),
}).strict().superRefine((value, context) => {
  const mimeTypes = value.hero.sources.map((source) => source.mimeType);
  if (new Set(mimeTypes).size !== 2) {
    context.addIssue({
      code: "custom",
      path: ["hero", "sources"],
      message: "Hero sources require exactly one MP4 and one WebM.",
    });
  }
  const assetIds = [value.hero.posterMediaId, ...value.hero.sources.map((source) => source.mediaId)];
  if (new Set(assetIds).size !== 3) {
    context.addIssue({
      code: "custom",
      path: ["hero"],
      message: "Poster, MP4, and WebM must be three distinct media assets.",
    });
  }
});

export const contactEmailConfigurationContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  configuration: z.literal("contact-email"),
  contactEmail: z.string().trim().email("Enter a valid email address.").max(254),
}).strict();

export const siteConfigurationContentSchema = z.union([
  heroSiteConfigurationContentSchema,
  contactEmailConfigurationContentSchema,
]);

/** Authoritative composition contract for pages whose narrative was previously
 * compiled into the website. Sections are intentionally governed (not HTML)
 * so the same payload can be safely rendered by admin previews and the site. */
const pageSectionIdentity = {
  id: z.string().trim().min(1).max(80),
  order: z.number().int().min(0).max(10_000).default(0),
};

const blankOrHttpUrl = z.preprocess(
  (value) => typeof value === "string" && value.trim() === "" ? undefined : value,
  safeExternalUrl.optional(),
);
export const cmsSeoSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(300).optional(),
  canonicalUrl: blankOrHttpUrl,
  noIndex: z.boolean().default(false),
  // The social image is a second, semantic use of the same immutable asset as
  // a page hero when applicable. It must remain separately role-labelled.
  ogImageMedia: cmsMediaReferenceSchema.extend({ role: z.literal("og-image") }).optional(),
}).strict();

export const CMS_DRAFT_METADATA_LIMITS = {
  title: 240,
  summary: 2_000,
  seoTitle: 70,
  seoDescription: 300,
} as const;

export const cmsDraftMetadataSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  title: z.string().trim().min(1).max(CMS_DRAFT_METADATA_LIMITS.title),
  summary: z.string().trim().max(CMS_DRAFT_METADATA_LIMITS.summary).nullable().optional(),
  seo: cmsSeoSchema.optional(),
}).strict();
export const cmsPageSectionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("narrative"), ...pageSectionIdentity, heading: z.string().trim().max(240).optional(), body: z.array(cmsRichBlockSchema).min(1).max(50) }).strict(),
  z.object({ type: z.literal("cta"), ...pageSectionIdentity, label: z.string().trim().min(1).max(120), href: safeLink, style: z.enum(["primary", "secondary", "text"]).default("primary") }).strict(),
  z.object({ type: z.literal("legal"), ...pageSectionIdentity, text: z.string().trim().min(1).max(2_000), required: z.boolean().default(false) }).strict(),
  z.object({ type: z.literal("media"), ...pageSectionIdentity, references: z.array(cmsMediaReferenceSchema).min(1).max(12) }).strict(),
  z.object({
    type: z.literal("migration-media"),
    ...pageSectionIdentity,
    sourcePath: z.string().trim().regex(/^(?:\/|https?:\/\/)/),
    altText: z.string().trim().min(1).max(500),
    ownership: z.literal("compiled-landing"),
    resolution: z.literal("unresolved"),
  }).strict(),
]);

const cmsLandingPageContentBaseSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  pagePath: safeInternalPath,
  template: z.enum(["landing", "collection", "campaign", "legal", "methodologies"]),
  narrative: z.string().trim().min(1).max(2_000),
  // Compiled landing routes may expose many individually governed microcopy
  // slots (the Work proof ledger currently exceeds fifty).
  sections: z.array(cmsPageSectionSchema).min(1).max(100),
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLink, style: z.enum(["primary", "secondary", "text"]).default("primary") }).optional(),
  seo: cmsSeoSchema.default({}),
  legal: z.object({ privacy: z.string().trim().max(2_000).optional(), terms: z.string().trim().max(2_000).optional(), disclaimer: z.string().trim().max(2_000).optional() }).strict().default({}),
  visualReferences: z.array(cmsMediaReferenceSchema).max(30).default([]),
  ...governance,
}).strict();

export const cmsLandingPageContentSchema = cmsLandingPageContentBaseSchema.superRefine((value, context) => {
  const ids = value.sections.map((section) => section.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", path: ["sections"], message: "Section IDs must be unique." });
  }
  const orders = value.sections.map((section) => section.order);
  if (new Set(orders).size !== orders.length) {
    context.addIssue({ code: "custom", path: ["sections"], message: "Section order values must be unique." });
  }
});

export const cmsContentSchemas = {
  person: personContentSchema,
  partner: partnerContentSchema,
  platform: platformContentSchema,
  publication: publicationContentSchema,
  "case-study": caseStudyContentSchema,
  industry: industryContentSchema,
  framework: frameworkContentSchema,
  office: officeContentSchema,
  "site-configuration": siteConfigurationContentSchema,
  "landing-page": cmsLandingPageContentSchema,
} as const;

export type PersonContent = z.infer<typeof personContentSchema>;
export type PartnerContent = z.infer<typeof partnerContentSchema>;
export type PlatformContent = z.infer<typeof platformContentSchema>;
export type PublicationContent = z.infer<typeof publicationContentSchema>;
export type CaseStudyContent = z.infer<typeof caseStudyContentSchema>;
export type IndustryContent = z.infer<typeof industryContentSchema>;

export type BankingPov = z.infer<typeof bankingPovSchema>;
export type PublicSectorPov = z.infer<typeof publicSectorPovSchema>;
export type FrameworkContent = z.infer<typeof frameworkContentSchema>;
export type OfficeContent = z.infer<typeof officeContentSchema>;

export type LandingPageContent = z.infer<typeof cmsLandingPageContentSchema>;
export type SiteConfigurationContent = z.infer<typeof siteConfigurationContentSchema>;
export type CmsContent = PersonContent | PartnerContent | PlatformContent | PublicationContent | CaseStudyContent | IndustryContent | FrameworkContent | OfficeContent | SiteConfigurationContent | LandingPageContent;

function publishErrors(kind: CmsDocumentKind, value: CmsContent): string[] {
  const errors: string[] = [];
  if (kind === "site-configuration") return errors;
  const governed = value as Exclude<CmsContent, SiteConfigurationContent>;
  if (governed.visibility !== "public") errors.push("Only public content can be published.");
  if (kind === "office") return errors;
  if (!governed.sources.length) errors.push("At least one source is required.");
  if (!governed.verificationDate) errors.push("A verification date is required.");
  if (!governed.reviewDate) errors.push("A review date is required.");
  if (kind === "person") {
    const person = value as PersonContent;
    if (!person.identityMedia && !person.identityMediaId && !person.approvedFallback) errors.push("An approved identity image or fallback is required.");
    if (person.role !== "advisor" && !person.biography) errors.push("A biography is required.");
    if (person.role === "advisor" && !person.contribution) errors.push("An advisor contribution is required.");
  }
  if (kind === "partner") {
    const partner = value as PartnerContent;
    if (partner.relationshipStatus !== "active") errors.push("Only active partnerships can be published.");
    if (partner.evidence.some((claim) => !claim.approved)) errors.push("Every partner evidence statement must be approved.");
  }
  if (kind === "publication") {
    const publication = value as PublicationContent;
    if (!publication.body.length) errors.push("A publication body is required.");
    if (publication.variant === "pov" && !publication.pdfMedia && !publication.pdfMediaId) errors.push("A POV document requires an approved PDF.");
  }
  if (kind === "case-study") {
    const caseStudy = value as CaseStudyContent;
    if (caseStudy.disclosure === "restricted") errors.push("Restricted case studies cannot be published publicly.");
    if (caseStudy.variant === "summary" && caseStudy.disclosure !== "anonymized") errors.push("A public case-study summary must be anonymized.");
    if (caseStudy.publicEvidenceStatus !== "approved") errors.push("Public case-study evidence must be approved.");
    if (caseStudy.deliveryStage !== "production" && caseStudy.impactClassification === "observed") {
      errors.push("Non-production impact must be explicitly qualified as pilot/demo, simulated, projected, or unavailable.");
    }
    if (caseStudy.variant === "full" && !caseStudy.work.length) errors.push("A full case study requires a work narrative.");
    if (caseStudy.evidence.some((claim) => !claim.approved)) errors.push("Every case-study evidence statement must be approved.");
  }
  if (kind === "industry") {
    const industry = value as IndustryContent;
    if (industry.pressures.length < 3) errors.push("At least three operating pressures are required.");
    if (industry.capabilities.length < 2) errors.push("At least two build capabilities are required.");
    if (!industry.imageAlt) errors.push("Industry hero imagery requires alternative text.");
    if (industry.publicSectorPov?.reviewBlockers?.length) {
      errors.push("Public Sector review blockers must be cleared before publication.");
    }
  }
  if (kind === "framework") {
    const framework = value as FrameworkContent;
    // Legacy Guardrails revisions intentionally remain publish-compatible.
    // The optional redesign presentation, however, is image-led and must
    // carry a page-owned immutable hero reference before publication.
    if (framework.template === "guardrails") {
      if (framework.presentation && !framework.heroMedia && !framework.heroMediaId) {
        errors.push("The Guardrails redesign presentation requires immutable hero media.");
      }
      return errors;
    }
    if (!framework.heroMedia && !framework.heroMediaId) errors.push("A framework requires approved hero media.");
    for (const [index, example] of [framework.workedExample, ...framework.sectorExamples].entries()) {
      const rScore = Number(example.reversibility.slice(1)) as RScore;
      const hScore = Number(example.reach.slice(1)) as HScore;
      const expectedBand = getEBand(rScore, hScore);
      const expectedCeiling = getCeiling(expectedBand);
      const location = index === 0 ? "Worked example" : `Sector example ${index}`;
      if (example.exposureBand !== `E${expectedBand}`) {
        errors.push(`${location} exposure must be E${expectedBand} for ${example.reversibility}/${example.reach}.`);
      }
      if (example.oversight !== OVERSIGHT_LABELS[expectedCeiling]) {
        errors.push(`${location} oversight must match the calculated ${OVERSIGHT_LABELS[expectedCeiling]} ceiling.`);
      }
    }
    const workedBand = getEBand(
      Number(framework.workedExample.reversibility.slice(1)) as RScore,
      Number(framework.workedExample.reach.slice(1)) as HScore,
    );
    const workedCeiling = getCeiling(workedBand);
    if (
      (workedCeiling === "on-loop" || framework.workedExample.requestedAuthority === "on-loop") &&
      !framework.workedExample.interventionWindow
    ) {
      errors.push("The worked example requires a stated intervention window for on-the-loop operation.");
    }
    if (
      isRequestedAboveCeiling(framework.workedExample.requestedAuthority as Oversight, workedCeiling) &&
      !framework.workedExample.authorityArtefact
    ) {
      errors.push("The worked example must name the approved artefact carrying authority above the ceiling.");
    }
  }
  if (kind === "landing-page") {
    const landing = value as LandingPageContent;
    if (isCmsRetiredLandingPagePath(landing.pagePath)) {
      errors.push(`Landing page "${landing.pagePath}" is retired and cannot be published.`);
    }
    if (!landing.sections.length) errors.push("At least one governed page section is required.");
    if (new Set(landing.sections.map((section) => section.id)).size !== landing.sections.length) {
      errors.push("Landing page section ids must be unique.");
    }
    if (new Set(landing.sections.map((section) => section.order)).size !== landing.sections.length) {
      errors.push("Landing page section order values must be unique.");
    }
    if (!landing.sections.some((section) => section.type === "cta") && !landing.cta) {
      errors.push("A landing page requires a governed call to action.");
    }
    if (landing.sections.some((section) => section.type === "migration-media")) {
      errors.push("Compiled landing media must be resolved to an approved immutable media version before publication.");
    }
    const contract = landingPageSlotContract[landing.pagePath as GovernedLandingPagePath] as
      | Record<string, GovernedLandingSlotType>
      | undefined;
    if (!contract) {
      errors.push(`Unknown governed landing page template "${landing.pagePath}".`);
    } else {
      const sectionsById = new Map<string, typeof landing.sections>();
      for (const section of landing.sections) {
        const matches = sectionsById.get(section.id) ?? [];
        matches.push(section);
        sectionsById.set(section.id, matches);
      }
      for (const [slotId, inventoryType] of Object.entries(contract)) {
        // The inventory records the exact draft source type. Publication must
        // replace migration placeholders with their immutable media equivalent.
        const expectedType = inventoryType === "migration-media" ? "media" : inventoryType;
        const matches = sectionsById.get(slotId) ?? [];
        if (matches.length === 0) {
          errors.push(`Landing page "${landing.pagePath}" is missing required slot "${slotId}" (${expectedType}).`);
        } else if (matches.length !== 1) {
          errors.push(`Landing page "${landing.pagePath}" must contain required slot "${slotId}" exactly once.`);
        } else if (matches[0].type !== expectedType) {
          errors.push(`Landing page "${landing.pagePath}" slot "${slotId}" must have type "${expectedType}", received "${matches[0].type}".`);
        }
      }
    }
  }
  return errors;
}

const guardrailsDraftStructuralKeys = new Set([
  "template",
  "id",
  "href",
  "enforcementLayer",
  "destination",
  "additionId",
  "thresholdAfter",
  "strength",
  "strengthLabel",
  "number",
  "schemaVersion",
  "visibility",
  "order",
  "verificationDate",
  "reviewDate",
  "relatedIds",
]);

function normalizeGuardrailsDraftText(value: unknown, key?: string): unknown {
  if (typeof value === "string") {
    return value.trim() === "" && !guardrailsDraftStructuralKeys.has(key ?? "")
      ? "__CMS_DRAFT_BLANK__"
      : value;
  }
  if (Array.isArray(value)) return value.map((item) => normalizeGuardrailsDraftText(item));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        normalizeGuardrailsDraftText(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

export function validateCmsContent(kind: CmsDocumentKind, input: unknown, mode: CmsValidationMode = "draft") {
  if (mode === "draft" && isInitialCmsDraft(kind, input)) {
    return { success: true as const, data: input as CmsContent };
  }
  // Editorial drafts intentionally remain saveable while incomplete. Fields that
  // are present still receive their normal type, length, URL, and enum checks;
  // publication always evaluates the complete authoritative schema below.
  const frameworkDraftContent = kind === "framework"
    && input
    && typeof input === "object"
    && !Array.isArray(input)
    ? input as Record<string, unknown>
    : null;
  const hasExplicitFrameworkTemplate = frameworkDraftContent
    ? Object.prototype.hasOwnProperty.call(frameworkDraftContent, "template")
    : false;
  const isGuardrailsDraft = kind === "framework"
    && input
    && typeof input === "object"
    && !Array.isArray(input)
    && frameworkDraftContent?.template === "guardrails";
  const frameworkDraftSchema = kind === "framework" && input && typeof input === "object" && !Array.isArray(input)
    ? (isGuardrailsDraft
      ? z.preprocess((value) => normalizeGuardrailsDraftText(value), guardrailsFrameworkContentSchema.deepPartial())
      : hasExplicitFrameworkTemplate && frameworkDraftContent?.template !== "agent-authority"
        ? z.never()
      : agentAuthorityFrameworkContentSchema.deepPartial())
    : null;
  const schema = mode === "draft" && kind === "framework"
    ? frameworkDraftSchema!
    : mode === "draft" && kind === "landing-page"
    ? cmsLandingPageContentBaseSchema.deepPartial()
    : mode === "draft" && kind !== "site-configuration"
      ? ((cmsContentSchemas[kind] instanceof z.ZodEffects
          ? cmsContentSchemas[kind]._def.schema
          : cmsContentSchemas[kind]) as z.AnyZodObject).deepPartial()
      : cmsContentSchemas[kind];
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.issues.map((issue: z.ZodIssue) => `${issue.path.join(".") || "content"}: ${issue.message}`),
    };
  }
  const errors = mode === "publish" ? publishErrors(kind, parsed.data as CmsContent) : [];
  return errors.length
    ? { success: false as const, errors }
    : {
      success: true as const,
      // Blank Guardrails prose is normalized only while checking a draft. Keep
      // the editor's original empty fields in the save payload.
      data: mode === "draft" && isGuardrailsDraft
        ? input as CmsContent
        : parsed.data as CmsContent,
    };
}
export const cmsSnapshotSchema = cmsDraftMetadataSchema.extend({
  content: z.unknown(),
  mediaIds: idList,
  markets: z.array(z.string().regex(/^[a-z][a-z0-9-]{1,15}$/)).min(1).max(20),
}).strict();

export type CmsCollectedMediaReference = {
  mediaId: string;
  mediaVersionId?: string;
  fieldPath: string;
  role?: CmsMediaReferenceContract["role"];
  altText?: string;
};
function validateCmsSnapshotStructure(
  kind: CmsDocumentKind,
  input: unknown,
  mode: CmsValidationMode = "draft",
) {
  const snapshot = cmsSnapshotSchema.safeParse(input);
  if (!snapshot.success) {
    return {
      success: false as const,
      errors: snapshot.error.issues.map((issue) => `${issue.path.join(".") || "document"}: ${issue.message}`),
    };
  }
  const content = validateCmsContent(kind, snapshot.data.content, mode);
  if (!content.success) return content;
  if (mode === "publish" && kind === "case-study") {
    const caseStudy = content.data as CaseStudyContent;
    if (caseStudy.variant === "summary" && !snapshot.data.summary?.trim()) {
      return { success: false as const, errors: ["A public case-study summary is required and must be anonymized."] };
    }
  }
  const references = collectCmsMediaReferences(kind, content.data, snapshot.data.mediaIds, snapshot.data.seo);
  const mediaIds = new Set(references.map((reference) => reference.mediaId));
  const exactVersions = new Map<string, string>();
  for (const reference of references) {
    if (!reference.mediaVersionId) continue;
    const existing = exactVersions.get(reference.mediaId);
    if (existing && existing !== reference.mediaVersionId) {
      return {
        success: false as const,
        errors: [`Media asset ${reference.mediaId} cannot reference multiple versions in one revision.`],
      };
    }
    exactVersions.set(reference.mediaId, reference.mediaVersionId);
  }
  return {
    success: true as const,
    data: { ...snapshot.data, content: content.data, mediaIds: [...mediaIds] },
  };
}

/**
 * Validates one already-projected delivery derivative without attempting to
 * derive further markets. Public and preview delivery use this boundary after
 * applying their requested market projection.
 */
export function validateCmsSnapshotForDelivery(
  kind: CmsDocumentKind,
  input: unknown,
  mode: CmsValidationMode = "publish",
) {
  if (kind === "industry" && mode === "publish") {
    const snapshot = cmsSnapshotSchema.safeParse(input);
    const snapshotData = snapshot.success ? snapshot.data : null;
    const content = snapshotData
      && snapshotData.content
      && typeof snapshotData.content === "object"
      && !Array.isArray(snapshotData.content)
      ? snapshotData.content as Record<string, unknown>
      : null;
    const pov = content?.educationPov;
    if (
      content
      && snapshotData
      && (snapshotData.slug === "education" || content.name === "Education")
      && pov
      && typeof pov === "object"
      && !Array.isArray(pov)
      && (pov as Record<string, unknown>).version !== 2
    ) {
      // A legacy source revision was fully validated before publication. Its
      // leak-safe derivative can have historical cardinalities reduced by
      // filtering; keep that already-published content readable.
        const references = collectCmsMediaReferences(kind, content, snapshotData.mediaIds, snapshotData.seo);
      return {
        success: true as const,
        data: {
          ...snapshotData,
          content: content as IndustryContent,
          mediaIds: [...new Set(references.map((reference) => reference.mediaId))],
        },
      };
    }
  }
  const source = validateCmsSnapshotStructure(kind, input, mode);
  if (!source.success || mode !== "publish" || kind !== "industry") return source;
  const errors = [
    ...educationImmutableMediaErrors(source.data as z.infer<typeof cmsSnapshotSchema>),
    ...bankingDeliveryErrors(source.data),
    ...publicSectorDeliveryErrors(source.data),
  ];
  return errors.length ? { success: false as const, errors } : source;
}

const EDUCATION_DELIVERY_MARKETS = ["uae", "ksa", "turkiye", "europe"] as const;

function bankingDeliveryErrors(input: unknown): string[] {
  const parsed = cmsSnapshotSchema.safeParse(input);
  if (!parsed.success) return [];
  const snapshot = parsed.data;
  const content = snapshot.content as IndustryContent;
  const banking = content.bankingPov;
  if (!banking) return [];
  const errors: string[] = [];
  if (snapshot.slug !== "financial-services" || content.name !== "Financial Services") {
    errors.push("Banking POV delivery is restricted to the Financial Services document.");
  }
  if (!snapshot.markets.includes(banking.market)) {
    errors.push("Banking POV market must match a declared delivery market.");
  }
  const serialized = JSON.stringify({ bankingPov: banking, sources: content.sources });
  if (banking.market === "uae" && /\bSaudi(?: Arabia| Arabian)?\b|\bKingdom\b|\bSDAIA\b|\.gov\.sa\b/i.test(serialized)) {
    errors.push("UAE Banking POV delivery must not contain Saudi or Kingdom references.");
  }
  if (banking.market === "ksa" && /\bUAE\b|United Arab Emirates|\.gov\.ae\b/i.test(serialized)) {
    errors.push("Saudi Banking POV delivery must not contain UAE references.");
  }
  return errors;
}

function publicSectorDeliveryErrors(input: unknown): string[] {
  const parsed = cmsSnapshotSchema.safeParse(input);
  if (!parsed.success) return [];
  const snapshot = parsed.data;
  const content = snapshot.content as IndustryContent;
  const pov = content.publicSectorPov;
  if (!pov) return [];
  const errors: string[] = [];
  if (snapshot.slug !== "public-sector" || content.name !== "Public Sector") {
    errors.push("Public Sector POV delivery is restricted to the Public Sector document.");
  }
  if (snapshot.markets.length !== 1 || snapshot.markets[0] !== pov.market) {
    errors.push("Public Sector POV market must match the single exact declared delivery market.");
  }
  return errors;
}
function educationDerivativeErrors(snapshot: z.infer<typeof cmsSnapshotSchema>): string[] {
  const content = snapshot.content as IndustryContent;
  if (content.educationPov?.version !== 2) return [];
  // The UAE edition is canonical and can serve every governed fallback market.
  // Exact non-UAE editions serve only the markets explicitly declared by their
  // snapshot.
  const markets = snapshot.markets.includes("uae")
    ? [...EDUCATION_DELIVERY_MARKETS]
    : EDUCATION_DELIVERY_MARKETS.filter((market) => snapshot.markets.includes(market));
  const editionMarket = snapshot.markets.includes("uae") ? "uae" : snapshot.markets[0];
  return markets.flatMap((market) => {
    try {
      const derivative = projectIndustrySnapshotForMarket(snapshot, market, editionMarket);
      const validation = validateCmsSnapshotForDelivery("industry", derivative, "publish");
      return validation.success
        ? []
        : validation.errors.map((error) => `Education ${market} delivery: ${error}`);
    } catch (error) {
      return [
        `Education ${market} delivery: ${error instanceof Error ? error.message : "market projection failed."}`,
      ];
    }
  });
}

function educationImmutableMediaErrors(snapshot: {
  slug: string;
  mediaIds: string[];
  content?: unknown;
}) {
  const content = snapshot.content as IndustryContent;
  const pov = content.educationPov;
  if (
    snapshot.slug !== "education"
    || pov?.version !== 2
  ) return [];
  if (!pov.imagery) {
    const hero = content.heroMedia;
    if (snapshot.mediaIds.length !== 1 || new Set(snapshot.mediaIds).size !== 1) {
      return ["Education v2 publication without supporting imagery requires exactly one ordered immutable hero media ID."];
    }
    if (!hero) {
      return ["Education v2 publication without supporting imagery requires an immutable hero media reference."];
    }
    if (hero.role !== "hero" || hero.mediaId !== snapshot.mediaIds[0]) {
      return ["Education v2 immutable hero media reference must match the ordered hero media ID."];
    }
    return [];
  }
  const expected = [
    content.heroMedia,
    pov.imagery?.educatorPractice.media,
    pov.imagery?.researchCoordination.media,
  ];
  if (snapshot.mediaIds.length !== 3 || new Set(snapshot.mediaIds).size !== 3) {
    return ["Education v2 publication requires exactly three ordered immutable media IDs."];
  }
  if (expected.some((reference) => !reference)) {
    return ["Education v2 publication requires hero and both supporting immutable media references."];
  }
  if (
    expected[0]!.role !== "hero"
    || expected[1]!.role !== "supporting"
    || expected[2]!.role !== "supporting"
    || expected.some((reference, index) => reference!.mediaId !== snapshot.mediaIds[index])
  ) {
    return ["Education v2 immutable media references must match ordered hero, educator-practice, and research-coordination media IDs."];
  }
  return [];
}
export function validateCmsSnapshot(
  kind: CmsDocumentKind,
  input: unknown,
  mode: CmsValidationMode = "draft",
) {
  const source = validateCmsSnapshotStructure(kind, input, mode);
  if (!source.success || mode !== "publish" || kind !== "industry") return source;
  const errors = [
    ...educationImmutableMediaErrors(source.data as z.infer<typeof cmsSnapshotSchema>),
    ...bankingDeliveryErrors(source.data),
    ...publicSectorDeliveryErrors(source.data),
    ...educationDerivativeErrors(source.data),
  ];
  return errors.length
    ? { success: false as const, errors }
    : source;
}

export function cmsPublicRoute(kind: CmsDocumentKind, slug: string, content: CmsContent): string | null {
  if (kind === "site-configuration") return null;
  if ((content as Exclude<CmsContent, SiteConfigurationContent>).visibility !== "public") return null;
  if (kind === "person" || kind === "partner" || kind === "office") return null;
  if (kind === "platform") return `/platforms/${slug}`;
  if (kind === "publication") return `/insights/${slug}`;
  if (kind === "industry") return `/industries/${slug}`;
  if (kind === "framework") return `/methodologies/${slug}`;
  if (kind === "landing-page") {
    const path = (content as LandingPageContent).pagePath;
    return isCmsRetiredLandingPagePath(path) ? null : path;
  }
  const caseStudy = content as CaseStudyContent;
  return caseStudy.variant === "full" && caseStudy.disclosure !== "restricted"
    ? `/work/${slug}`
    : null;
}

/** Collect every governed media location from a snapshot.  Legacy ids remain
 * visible during migration, but only the authoritative reference objects carry
 * a version. */
export function collectCmsMediaReferences(
  kind: CmsDocumentKind,
  content: unknown,
  legacyMediaIds: readonly string[] = [],
  seo?: unknown,
): CmsCollectedMediaReference[] {
  const result: CmsCollectedMediaReference[] = legacyMediaIds.map((mediaId, index) => ({
    mediaId,
    fieldPath: `mediaIds.${index}`,
  }));
  if (!content || typeof content !== "object" || Array.isArray(content)) return result;
  const record = content as Record<string, unknown>;
  const add = (value: unknown, fieldPath: string, legacyRole?: CmsMediaReferenceContract["role"]) => {
    if (typeof value === "string") {
      result.push({ mediaId: value, fieldPath, role: legacyRole });
      return;
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return;
    const reference = value as Record<string, unknown>;
    if (typeof reference.mediaId !== "string") return;
    result.push({
      mediaId: reference.mediaId,
      mediaVersionId: typeof reference.mediaVersionId === "string" ? reference.mediaVersionId : undefined,
      fieldPath,
      role: typeof reference.role === "string" ? reference.role as CmsMediaReferenceContract["role"] : legacyRole,
      altText: typeof reference.altText === "string" ? reference.altText : undefined,
    });
  };
  const locations = [
    ["identityMedia", "identityMediaId", "identity"],
    ["logoMedia", "logoMediaId", "logo"],
    ["heroMedia", "heroMediaId", "hero"],
    ["pdfMedia", "pdfMediaId", "document"],
  ] as const;
  for (const [referenceField, legacyField, role] of locations) {
    add(record[referenceField] ?? record[legacyField], `content.${referenceField}`, role);
  }
  if (seo && typeof seo === "object" && !Array.isArray(seo)) {
    const seoRecord = seo as Record<string, unknown>;
    add(seoRecord.ogImageMedia, "seo.ogImageMedia", "og-image");
  }
  if (Array.isArray(record.supportingMedia)) {
    for (const [index, reference] of record.supportingMedia.entries()) {
      add(reference, `content.supportingMedia.${index}`, "supporting");
    }
  }
  const educationPov = record.educationPov;
  const educationImagery = educationPov && typeof educationPov === "object" && !Array.isArray(educationPov)
    ? (educationPov as Record<string, unknown>).imagery
    : undefined;
  if (
    kind === "industry"
    && educationImagery
    && typeof educationImagery === "object"
    && !Array.isArray(educationImagery)
  ) {
    for (const slot of ["educatorPractice", "researchCoordination"]) {
      const scene = (educationImagery as Record<string, unknown>)[slot];
      if (scene && typeof scene === "object" && !Array.isArray(scene)) {
        add((scene as Record<string, unknown>).media, `content.educationPov.imagery.${slot}.media`, "supporting");
      }
    }
  }
  if (record.social && typeof record.social === "object" && !Array.isArray(record.social)) {
    const social = record.social as Record<string, unknown>;
    add(social.imageMedia ?? social.imageMediaId, "content.social.imageMedia", "og-image");
  }
  if (
    (kind === "site-configuration" || (
      record.hero && typeof record.hero === "object" &&
      Object.hasOwn(record.hero as object, "posterMediaVersionId")
    )) &&
    record.hero && typeof record.hero === "object"
  ) {
    const hero = record.hero as Record<string, unknown>;
    add({
      mediaId: hero.posterMediaId,
      mediaVersionId: hero.posterMediaVersionId,
      role: "hero",
    }, "content.hero.poster", "hero");
    for (const [index, source] of (Array.isArray(hero.sources) ? hero.sources : []).entries()) {
      add({ ...(source as object), role: "background" }, `content.hero.sources.${index}`, "background");
    }
  }
  if (kind === "landing-page" || Array.isArray(record.visualReferences)) {
    for (const [index, reference] of (Array.isArray(record.visualReferences) ? record.visualReferences : []).entries()) {
      add(reference, `content.visualReferences.${index}`);
    }
    for (const [sectionIndex, section] of (Array.isArray(record.sections) ? record.sections : []).entries()) {
      if (!section || typeof section !== "object" || (section as Record<string, unknown>).type !== "media") continue;
      const references = (section as Record<string, unknown>).references;
      for (const [referenceIndex, reference] of (Array.isArray(references) ? references : []).entries()) {
        add(reference, `content.sections.${sectionIndex}.references.${referenceIndex}`);
      }
    }
  }
  if (kind === "industry" && record.bankingPov && typeof record.bankingPov === "object"
    && !Array.isArray(record.bankingPov)) {
    const banking = record.bankingPov as Record<string, unknown>;
    for (const [index, startingPoint] of (Array.isArray(banking.startingPoints)
      ? banking.startingPoints
      : []).entries()) {
      if (!startingPoint || typeof startingPoint !== "object") continue;
      add((startingPoint as Record<string, unknown>).image, `content.bankingPov.startingPoints.${index}.image`, "supporting");
    }
    const readiness = banking.productionReadiness;
    if (readiness && typeof readiness === "object" && !Array.isArray(readiness)) {
      add((readiness as Record<string, unknown>).image, "content.bankingPov.productionReadiness.image", "supporting");
    }
  }
  return result;
}

export type CmsMediaReferenceContract = z.infer<typeof cmsMediaReferenceSchema>;

export function validateCmsDraftMetadata(input: unknown) {
  const parsed = cmsDraftMetadataSchema.safeParse(input);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : {
        success: false as const,
        errors: parsed.error.issues.map(
          (issue) => `${issue.path.join(".") || "document"}: ${issue.message}`,
        ),
      };
}

export type CmsRetiredLandingPagePath = (typeof CMS_RETIRED_LANDING_PAGE_PATHS)[number];

export function isCmsRetiredLandingPagePath(path: string): path is CmsRetiredLandingPagePath {
  return (CMS_RETIRED_LANDING_PAGE_PATHS as readonly string[]).includes(path);
}

const bankingMediaReferenceSchema = cmsMediaReferenceSchema.extend({
  role: z.literal("supporting"),
});

const bankingJourneyIds = [
  "accounts-cards",
  "payments-transfers",
  "loans-deposits",
  "fraud-card-security",
  "digital-channel-support",
  "collections-reminders",
  "campaigns-outbound",
] as const;

export const bankingPovSchema = z.lazy(() => z.object({
  version: z.literal(1),
  market: bankingMarketSchema,
  descriptor: z.string().trim().min(1).max(500),
  hero: z.object({
    eyebrow: z.string().trim().min(1).max(160),
    heading: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(2_000),
    startingPointsAnchorLabel: z.string().trim().min(1).max(120),
    selectedWorkAnchorLabel: z.string().trim().min(1).max(120),
  }).strict(),
  evidenceSignals: z.array(bankingSourceSchema).min(1).max(12),
  valueOutcomes: z.array(z.object({
    title: z.string().trim().min(1).max(160),
    body: z.string().trim().min(1).max(1_000),
    measures: requiredBankingStringList,
  }).strict()).length(3),
  adoptionLevels: z.array(bankingLevelSchema).length(3),
  valueDomains: z.array(z.object({
    id: z.enum(bankingDomainIds),
    title: z.string().trim().min(1).max(160),
    purpose: z.string().trim().min(1).max(1_000),
    examples: requiredBankingStringList,
    measures: requiredBankingStringList,
  }).strict()).length(6),
  startingPoints: z.array(z.object({
    id: z.enum(bankingStartingPointIds),
    title: z.string().trim().min(1).max(160),
    valueProposition: z.string().trim().min(1).max(500),
    problem: z.string().trim().min(1).max(1_000),
    cogniriseRole: z.string().trim().min(1).max(1_000),
    requiredInputs: requiredBankingStringList,
    firstDeliverable: z.string().trim().min(1).max(1_000),
    measures: requiredBankingStringList,
    decisionBoundary: z.string().trim().min(1).max(1_000),
    action: z.object({
      label: z.string().trim().min(1).max(120),
      href: safeLink,
    }).strict(),
    image: bankingMediaReferenceSchema,
    focalPoint: bankingFocalPointSchema,
  }).strict()).length(4),
  voiceBanking: z.object({
    platform: z.object({
      name: z.literal("Lupitor"),
      contribution: z.string().trim().min(1).max(1_000),
      href: safeExternalUrl,
      qualification: z.string().trim().min(1).max(1_000),
    }).strict(),
    cogniriseContribution: z.string().trim().min(1).max(1_000),
    journeys: z.array(z.object({
      id: z.enum(bankingJourneyIds),
      title: z.string().trim().min(1).max(160),
      scope: z.string().trim().min(1).max(1_000),
      measures: requiredBankingStringList,
      controlBoundary: z.string().trim().min(1).max(1_000),
    }).strict()).length(7),
  }).strict(),
  productionReadiness: z.object({
    eyebrow: z.string().trim().min(1).max(160),
    heading: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(2_000),
    practices: requiredBankingStringList,
    image: bankingMediaReferenceSchema,
    focalPoint: bankingFocalPointSchema,
    annotation: z.string().trim().min(1).max(1_000),
  }).strict(),
  deliveryPath: z.object({
    stages: z.array(z.object({
      stage: z.string().trim().min(1).max(160),
      owner: z.string().trim().min(1).max(240),
      outcome: z.string().trim().min(1).max(1_000),
    }).strict()).min(4).max(6),
    practices: requiredBankingStringList,
  }).strict(),
  partners: z.array(z.object({
    name: z.enum(["Lupitor", "Ekimetrics"]),
    contribution: z.string().trim().min(1).max(1_000),
    qualification: z.string().trim().min(1).max(1_000),
    href: safeExternalUrl.optional(),
  }).strict()).length(2),
  cta: z.object({
    heading: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(2_000),
    label: z.string().trim().min(1).max(120),
    href: safeInternalPath,
  }).strict(),
  caseMembershipSnapshot: z.array(z.object({
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
    title: z.string().trim().min(1).max(240),
    order: z.number().int().min(0).max(10_000),
    digest: z.string().regex(/^[a-f0-9]{64}$/),
  }).strict()).min(1).max(50),
}).strict().superRefine((value, context) => {
  const unique = (values: readonly string[], path: (string | number)[], label: string) => {
    if (new Set(values).size !== values.length) {
      context.addIssue({ code: z.ZodIssueCode.custom, path, message: `${label} must be unique.` });
    }
  };
  unique(value.adoptionLevels.map((item) => String(item.level)), ["adoptionLevels"], "Adoption levels");
  unique(value.valueDomains.map((item) => String(item.id)), ["valueDomains"], "Banking value-domain IDs");
  unique(value.startingPoints.map((item) => String(item.id)), ["startingPoints"], "Banking starting-point IDs");
  unique(value.voiceBanking.journeys.map((item) => String(item.id)), ["voiceBanking", "journeys"], "Voice journey IDs");
  unique(value.partners.map((item) => String(item.name)), ["partners"], "Partners");
  unique(value.caseMembershipSnapshot.map((item) => item.slug), ["caseMembershipSnapshot"], "Case membership");
  const expected = (actual: readonly string[], required: readonly string[], path: (string | number)[]) => {
    if (actual.length !== required.length || required.some((item) => !actual.includes(item))) {
      context.addIssue({ code: z.ZodIssueCode.custom, path, message: "The governed Banking POV requires the complete prescribed set." });
    }
  };
  expected(value.valueDomains.map((item) => String(item.id)), bankingDomainIds, ["valueDomains"]);
  expected(value.startingPoints.map((item) => String(item.id)), bankingStartingPointIds, ["startingPoints"]);
  expected(value.voiceBanking.journeys.map((item) => String(item.id)), bankingJourneyIds, ["voiceBanking", "journeys"]);
}));

const bankingFocalPointSchema = z.object({
  x: z.number().min(0).max(100),
  y: z.number().min(0).max(100),
}).strict();

const bankingLevelSchema = z.object({
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  title: z.string().trim().min(1).max(160),
  value: z.string().trim().min(1).max(1_000),
  illustrativeWork: requiredBankingStringList,
  owner: z.string().trim().min(1).max(240),
  readiness: requiredBankingStringList,
  measures: requiredBankingStringList,
  decisionBoundary: z.string().trim().min(1).max(1_000),
}).strict();

const bankingStartingPointIds = [
  "core-banking-operations",
  "contact-centre",
  "software-delivery",
  "marketing-intelligence",
] as const;

const bankingDomainIds = [
  "credit-lending",
  "risk-fraud",
  "operations-process",
  "customer-sales",
  "engineering-it",
  "compliance-regulation",
] as const;

const bankingSourceSchema = z.object({
  label: z.string().trim().min(1).max(240),
  publisher: z.string().trim().min(1).max(240),
  kind: z.enum(["Official source", "Independent study", "Company-reported", "Vendor claim"]),
  url: safeExternalUrl,
  accessedAt: date,
  publicationPeriod: z.string().trim().min(1).max(120),
  jurisdiction: z.string().trim().min(1).max(160),
  statement: z.string().trim().min(1).max(1_000),
  qualification: z.string().trim().min(1).max(1_000),
}).strict();
