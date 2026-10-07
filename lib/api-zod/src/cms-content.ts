import { z } from "zod";
import { telecomPovSchema } from "./telecom-pov";
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
import {
  methodologyEditorialDefinition,
  methodologyEditorialMediaValues,
} from "./methodology-editorial";

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
// Landing CTAs may open the visitor's email client; keep this allowance
// separate from navigation, evidence, media, and other link contracts.
const safeLandingCtaLink = z.union([
  safeLink,
  z.string().regex(/^mailto:[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i, "Use a plain email address for landing CTAs."),
]);
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

const pulseCognibaseSectionIds = [
  "problem", "capabilities", "how-it-works", "teams", "deployment", "trust", "faq",
] as const;
const pulseCogniagentsSectionIds = [
  "problem", "differences", "functions", "how-it-works", "foundation", "deployment", "faq",
] as const;

const pulseCtaSchema = z.object({
  label: z.string().trim().min(1).max(120).refine((value) => !/[<>]/.test(value), "HTML is not allowed in Pulse copy."),
  href: z.union([safeLink, z.string().regex(/^#[a-z0-9_-]+$/i, "Use a safe in-page anchor.")]),
}).strict();

const pulseText = (max: number) => z.string().trim().min(1).max(max)
  .refine((value) => !/[<>]/.test(value), "HTML is not allowed in Pulse copy.");

const pulsePageItemSchema = z.object({
  title: pulseText(240),
  body: pulseText(8_000),
  label: pulseText(240).optional(),
  detail: pulseText(1_000).optional(),
}).strict();

const pulseSectionSchema = <T extends readonly [string, ...string[]]>(ids: T) => z.object({
  id: z.enum(ids as unknown as [string, ...string[]]),
  visible: z.boolean().default(true),
  eyebrow: pulseText(160),
  heading: pulseText(500),
  body: pulseText(8_000),
  highlightedText: pulseText(2_000).optional(),
  items: z.array(pulsePageItemSchema).min(1).max(30),
  footer: pulseText(1_000).optional(),
  links: z.array(pulseCtaSchema).max(4).default([]),
}).strict();

function createPulsePageSchema<const V extends "cognibase-pulse" | "cogniagents-pulse", const T extends readonly [string, ...string[]], const D extends readonly [string, ...string[]]>(
  variant: V,
  sectionIds: T,
  diagramLabelIds: D,
) {
  const sectionSchema = pulseSectionSchema(sectionIds);
  const diagramLabelIdSchema = z.enum(diagramLabelIds as unknown as [string, ...string[]]);
  const sectionIdSchema = z.enum(sectionIds as unknown as [string, ...string[]]);
  const baseSchema = z.object({
    variant: z.literal(variant),
    layout: z.enum(["editorial", "compact"]).default("editorial"),
    tone: z.enum(["evidence-led", "operational"]).default("evidence-led"),
    hero: z.object({
      eyebrow: pulseText(160),
      headline: pulseText(500),
      body: pulseText(8_000),
      ctas: z.array(pulseCtaSchema).min(1).max(2),
      footnote: pulseText(500),
    }).strict(),
    diagram: z.object({
      accessibleDescription: pulseText(2_000),
      labels: z.array(z.object({
        id: diagramLabelIdSchema,
        text: pulseText(500),
      }).strict()).max(40),
    }).strict(),
    proofItems: z.array(pulseText(240)).min(3).max(8),
    sections: z.array(sectionSchema).min(sectionIds.length).max(sectionIds.length),
    sectionOrder: z.array(sectionIdSchema).length(sectionIds.length),
    closing: z.object({
      eyebrow: pulseText(160),
      heading: pulseText(500),
      body: pulseText(8_000),
      cta: pulseCtaSchema,
      footerLeft: pulseText(500),
      footerRight: pulseText(500),
    }).strict(),
  }).strict();
  const completeSchema = baseSchema.superRefine((page, context) => {
    const sectionIdsReceived = page.sections.map((section) => section.id);
    if (new Set(sectionIdsReceived).size !== sectionIdsReceived.length) {
      context.addIssue({ code: "custom", path: ["sections"], message: "Pulse section IDs must be unique." });
    }
    if (sectionIds.some((id) => !sectionIdsReceived.includes(id))) {
      context.addIssue({ code: "custom", path: ["sections"], message: "Every template section must be present." });
    }
    if (new Set(page.sectionOrder).size !== page.sectionOrder.length) {
      context.addIssue({ code: "custom", path: ["sectionOrder"], message: "Pulse section order IDs must be unique." });
    }
    if (sectionIds.some((id) => !page.sectionOrder.includes(id))) {
      context.addIssue({ code: "custom", path: ["sectionOrder"], message: "Section order must include every template section exactly once." });
    }
    const diagramIds = page.diagram.labels.map((item) => item.id);
    if (new Set(diagramIds).size !== diagramIds.length) {
      context.addIssue({ code: "custom", path: ["diagram", "labels"], message: "Diagram label IDs must be unique." });
    }
    if (diagramLabelIds.some((id) => !diagramIds.includes(id))) {
      context.addIssue({ code: "custom", path: ["diagram", "labels"], message: "Every template diagram label must be present." });
    }
    pulseAnchorIssues(page, true).forEach((issue) => {
      context.addIssue({ code: "custom", path: issue.path, message: issue.message });
    });
  });
  return { baseSchema, completeSchema };
}

const cognibasePulsePageSchemas = createPulsePageSchema("cognibase-pulse", pulseCognibaseSectionIds, [
  "topBrand", "topCaption", "question", "sourcePolicy", "sourcePolicyDetail", "sourceWiki",
  "sourceWikiDetail", "sourceRecords", "sourceRecordsDetail", "retrieval", "keyword",
  "semantic", "relevantEvidence", "answerTitle", "sourceLinked", "answer", "citationPolicy",
  "citationWiki", "accessRights", "noGuess",
] as const);
const cogniagentsPulsePageSchemas = createPulsePageSchema("cogniagents-pulse", pulseCogniagentsSectionIds, [
  "topBrand", "topCaption", "title", "intake", "prepare", "humanCheckpoint", "humanReview",
  "act", "permissions", "decisionLogged", "intakeStep", "prepareStep", "actStep",
] as const);
export const cognibasePulsePageSchema = cognibasePulsePageSchemas.completeSchema;
export const cogniagentsPulsePageSchema = cogniagentsPulsePageSchemas.completeSchema;
const pulsePageDraftSchema = z.union([
  cognibasePulsePageSchemas.baseSchema.deepPartial(),
  cogniagentsPulsePageSchemas.baseSchema.deepPartial(),
]);
export const pulsePageSchema = z.union([
  cognibasePulsePageSchema,
  cogniagentsPulsePageSchema,
]);

type PulseAnchorValidationInput = {
  variant?: string;
  hero?: { ctas?: { href?: string }[] };
  sections?: { id?: string; visible?: boolean; links?: { href?: string }[] }[];
  closing?: { cta?: { href?: string } };
};

function pulseAnchorIssues(page: PulseAnchorValidationInput, requireSectionPresence: boolean) {
  const anchorTargets = page.variant === "cognibase-pulse"
    ? { "how-it-works": "how-it-works" }
    : page.variant === "cogniagents-pulse"
      ? { "agents-by-function": "functions" }
      : {};
  const links = [
    ...(page.hero?.ctas ?? []),
    ...(page.sections ?? []).flatMap((section) => section.links ?? []),
    ...(page.closing?.cta ? [page.closing.cta] : []),
  ];
  const errors: { path: (string | number)[]; message: string }[] = [];
  for (const [linkIndex, link] of links.entries()) {
    if (!link.href?.startsWith("#")) continue;
    const anchor = link.href.slice(1);
    const sectionId = anchorTargets[anchor as keyof typeof anchorTargets];
    if (!sectionId) {
      errors.push({
        path: ["links", linkIndex, "href"],
        message: `Pulse link "${link.href}" does not target an approved page section anchor.`,
      });
      continue;
    }
    const target = page.sections?.find((section) => section.id === sectionId);
    if (target?.visible === false) {
      errors.push({
        path: ["links", linkIndex, "href"],
        message: `Pulse link "${link.href}" targets a hidden section.`,
      });
    } else if (requireSectionPresence && !target) {
      errors.push({
        path: ["links", linkIndex, "href"],
        message: `Pulse link "${link.href}" targets an absent section.`,
      });
    } else if (!requireSectionPresence && page.sections && !target) {
      errors.push({
        path: ["links", linkIndex, "href"],
        message: `Pulse link "${link.href}" targets an absent section.`,
      });
    }
  }
  return errors;
}

const platformContentBaseSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  category: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(2_000),
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  template: z.enum(["standard", "cognios-specialist", "cognibase-pulse", "cogniagents-pulse"]).default("standard"),
  pulsePage: pulsePageSchema.optional(),
  sections: z.array(z.object({
    heading: z.string().trim().min(1).max(240),
    body: z.array(cmsRichBlockSchema).max(50),
  }).strict()).max(20).default([]),
  capabilities: stringList,
  differentiators: stringList,
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLink }).strict().optional(),
  ...governance,
}).strict();

export const platformContentSchema = platformContentBaseSchema.superRefine((content, context) => {
  const pulseTemplate = content.template === "cognibase-pulse" || content.template === "cogniagents-pulse";
  if (pulseTemplate && !content.pulsePage) {
    context.addIssue({ code: "custom", path: ["pulsePage"], message: "Pulse page content is required for this template." });
  } else if (!pulseTemplate && content.pulsePage) {
    context.addIssue({ code: "custom", path: ["pulsePage"], message: "Pulse page content is only valid for a Pulse template." });
  } else if (content.pulsePage && content.pulsePage.variant !== content.template) {
    context.addIssue({ code: "custom", path: ["pulsePage", "variant"], message: "Pulse page variant must match the platform template." });
  }
});
const platformContentDraftSchema = platformContentBaseSchema
  .omit({ pulsePage: true })
  .deepPartial()
  .extend({ pulsePage: pulsePageDraftSchema.optional() })
  .superRefine((content, context) => {
    if (content.pulsePage?.variant && content.template && content.pulsePage.variant !== content.template) {
      context.addIssue({ code: "custom", path: ["pulsePage", "variant"], message: "Pulse page variant must match the platform template." });
    }
    if (content.pulsePage?.variant) {
      pulseAnchorIssues(content.pulsePage, false).forEach((issue) => {
        context.addIssue({ code: "custom", path: ["pulsePage", ...issue.path], message: issue.message });
      });
    }
  });

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
  telecomPov: telecomPovSchema.optional(),
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
  if (value.telecomPov && value.legacyPath !== "/industries/telecoms") {
    context.addIssue({ code: "custom", path: ["telecomPov"], message: "Telecom POV belongs only to Telecoms." });
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

const frameworkGuardrailsFirstFigureSchema = frameworkGuardrailsFigureSchema.extend({
  asset: z.literal("aam-guardrails-vs-authority.svg"),
}).strict();
/** Optional summary-first copy for the Guardrails and authority subsection.
 * The object is deliberately all-required when present: an incomplete
 * summary must not silently become public copy. */
export const frameworkGuardrailsSummarySchema = z.object({
  lead: z.string().trim().min(1).max(2_000),
  handover: z.string().trim().min(1).max(2_000),
  rules: z.array(z.object({
    title: z.string().trim().min(1).max(240),
    body: z.string().trim().min(1).max(2_000),
  }).strict()).length(4),
  caveat: z.string().trim().min(1).max(2_000),
  disclosureLabel: z.string().trim().min(1).max(240),
  firstFigure: frameworkGuardrailsFirstFigureSchema,
}).strict();

export type FrameworkGuardrailsSummary = z.infer<typeof frameworkGuardrailsSummarySchema>;

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
  firstFigure: frameworkGuardrailsFirstFigureSchema,
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
  /** Optional summary-first copy. Legacy revisions without it remain valid. */
  summary: frameworkGuardrailsSummarySchema.optional(),
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

/** Historical standalone Guardrails composition. Keep this arm readable for
 * revision history and preview, but do not impose its E1–E5 manuscript on
 * the Set, Prove & Hold replacement. */
export const legacyGuardrailsFrameworkContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  template: z.literal("guardrails"),
  contentVersion: z.literal("guardrails-legacy-v1"),
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

const setProveHoldPhase = z.enum(["set", "prove", "hold"]);
const setProveHoldActionSchema = z.object({
  id: z.enum([
    "set-name", "set-build", "set-choose", "set-assign",
    "prove-attack", "prove-red-team", "prove-count", "prove-record",
    "hold-watch", "hold-retest", "hold-revisit", "hold-report",
  ]),
  phase: setProveHoldPhase,
  order: z.number().int().min(1).max(4),
  title: guardedText,
  statement: guardedText,
  explanation: z.array(guardedText).min(1).max(5),
  owner: guardedText,
  outputOrCadence: z.object({ label: z.enum(["Output", "Cadence"]), value: guardedText }).strict(),
  failureCondition: guardedText,
  callout: guardedText,
}).strict();

const setProveHoldActionOrder = [
  ["set-name", "set", 1], ["set-build", "set", 2],
  ["set-choose", "set", 3], ["set-assign", "set", 4],
  ["prove-attack", "prove", 1], ["prove-red-team", "prove", 2],
  ["prove-count", "prove", 3], ["prove-record", "prove", 4],
  ["hold-watch", "hold", 1], ["hold-retest", "hold", 2],
  ["hold-revisit", "hold", 3], ["hold-report", "hold", 4],
] as const;

const setProveHoldLayerSchema = z.object({
  id: z.enum(["policy", "prompt", "runtime", "architecture"]),
  title: guardedText,
  whatItIs: guardedText,
  customerDataExample: guardedText,
  limitation: guardedText,
  strength: z.number().int().min(1).max(4),
}).strict();

/** Source replacement for the standalone Guardrails route. Its fixed action
 * IDs make the 4 + 4 + 4 framework durable without carrying forward the
 * retired E-band/stopping-rule fields. */
export const setProveHoldGuardrailsFrameworkContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  template: z.literal("guardrails"),
  contentVersion: z.literal("set-prove-hold-v1"),
  hero: z.object({
    eyebrow: guardedText,
    headline: guardedText,
    subheadline: guardedText,
    strapline: guardedText,
    primaryAction: z.object({ label: guardedText, href: z.literal("/contact") }).strict(),
    secondaryAction: z.object({ label: guardedText, href: z.literal("/methodologies/agent-authority-model") }).strict(),
  }).strict(),
  heroMedia: optionalMediaReference,
  heroMediaId: legacyMediaId,
  overview: z.object({
    heading: guardedText,
    intro: guardedText,
    phases: z.array(z.object({
      id: setProveHoldPhase,
      title: guardedText,
      caption: guardedText,
      mode: z.enum(["sequential", "pre-launch-tests", "concurrent"]),
      actionIds: z.array(z.string()).length(4),
    }).strict()).length(3).superRefine((phases, context) => {
      const expected = [
        ["set", "sequential", ["set-name", "set-build", "set-choose", "set-assign"]],
        ["prove", "pre-launch-tests", ["prove-attack", "prove-red-team", "prove-count", "prove-record"]],
        ["hold", "concurrent", ["hold-watch", "hold-retest", "hold-revisit", "hold-report"]],
      ] as const;
      if (phases.some((phase, index) => phase.id !== expected[index][0]
        || phase.mode !== expected[index][1]
        || phase.actionIds.some((id, actionIndex) => id !== expected[index][2][actionIndex]))) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "overview.phases must retain the Set, Prove, Hold action map." });
      }
    }),
  }).strict(),
  layers: z.object({
    heading: guardedText,
    intro: guardedText,
    exampleRule: guardedText,
    tableHeaders: z.array(guardedText).length(5),
    rows: z.array(setProveHoldLayerSchema).length(4).superRefine((rows, context) => {
      const expected = ["policy", "prompt", "runtime", "architecture"];
      if (rows.some((row, index) => row.id !== expected[index] || row.strength !== index + 1)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "layers.rows must retain four ordered enforcement layers and strengths." });
      }
    }),
    callout: guardedText,
  }).strict(),
  lifecycleMatrix: z.object({
    heading: guardedText,
    intro: guardedText,
    columnHeaders: z.array(guardedText).length(4),
    rows: z.array(z.object({
      layerId: z.enum(["policy", "prompt", "runtime", "architecture"]),
      layer: guardedText,
      set: guardedText,
      prove: guardedText,
      hold: guardedText,
    }).strict()).length(4).superRefine((rows, context) => {
      if (rows.some((row, index) => row.layerId !== ["policy", "prompt", "runtime", "architecture"][index])) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "lifecycleMatrix.rows must retain layer order." });
      }
    }),
    callout: guardedText,
    measure: guardedText,
  }).strict(),
  actions: z.array(setProveHoldActionSchema).length(12).superRefine((actions, context) => {
    if (actions.some((action, index) => action.id !== setProveHoldActionOrder[index][0]
      || action.phase !== setProveHoldActionOrder[index][1]
      || action.order !== setProveHoldActionOrder[index][2])) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "actions must retain the reviewed 4 + 4 + 4 identifiers, phases, and order." });
    }
  }),
  references: z.object({
    heading: guardedText,
    intro: guardedText,
    items: z.array(z.object({
      id: z.enum(["owasp-llm-top-10", "owasp-agent-control-standard", "mitre-atlas", "nist-ai-rmf", "nist-ai-600-1", "iso-42001"]),
      title: guardedText,
      version: guardedText,
      url: safeExternalUrl,
      note: guardedText,
    }).strict()).length(6).superRefine((items, context) => {
      const expected = ["owasp-llm-top-10", "owasp-agent-control-standard", "mitre-atlas", "nist-ai-rmf", "nist-ai-600-1", "iso-42001"];
      if (items.some((item, index) => item.id !== expected[index])) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "references.items must retain the verified non-UAE source order." });
      }
    }),
    disclaimer: guardedText,
  }).strict(),
  moves: z.object({
    heading: guardedText,
    intro: guardedText,
    items: z.array(z.object({
      id: z.enum(["one", "two", "three"]),
      number: z.number().int().min(1).max(3),
      title: guardedText,
      body: guardedText,
    }).strict()).length(3).superRefine((items, context) => {
      if (items.some((item, index) => item.id !== ["one", "two", "three"][index] || item.number !== index + 1)) {
        context.addIssue({ code: z.ZodIssueCode.custom, message: "moves.items must retain numeric order." });
      }
    }),
    cta: z.object({ heading: guardedText, body: guardedText, button: z.object({ label: guardedText, href: z.literal("/contact") }).strict() }).strict(),
  }).strict(),
  relatedLink: z.object({
    title: guardedText,
    body: guardedText,
    href: z.literal("/methodologies/agent-authority-model"),
  }).strict(),
  ...governance,
}).strict();

/** A missing version occurs only on revisions written before the replacement;
 * explicitly supplied versions stay fail-closed. */
export const guardrailsFrameworkContentSchema = z.preprocess((value) => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const content = value as Record<string, unknown>;
    if (!Object.prototype.hasOwnProperty.call(content, "contentVersion")) {
      return { ...content, contentVersion: "guardrails-legacy-v1" };
    }
  }
  return value;
}, z.discriminatedUnion("contentVersion", [
  legacyGuardrailsFrameworkContentSchema,
  setProveHoldGuardrailsFrameworkContentSchema,
]));

/**
 * The assessment engines and the IDAO delivery canon remain application-owned.
 * These records deliberately carry only their reviewed identifiers, in their
 * fixed order, plus the editorial presentation around them.  Editors may
 * change an explanation, citation, image, or CTA; they cannot silently change
 * an assessment dimension, decision rule, or delivery stage.
 */
const methodologyText = z.string().trim().min(1).max(8_000);
const frameworkContentDiscriminatedUnion = z.lazy(() => z.union([
  agentAuthorityFrameworkContentSchema,
  guardrailsFrameworkContentSchema,
  idaoFrameworkContentSchema,
  aiUseCasePrioritizationFrameworkContentSchema,
  aiValueToScaleFrameworkContentSchema,
  agenticOperationsReadinessFrameworkContentSchema,
  humanAgentOperatingModelFrameworkContentSchema,
]));

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

/**
 * Site configuration has two intentionally disjoint authoring variants. A
 * draft may be saved as a hero film is assembled, but it must still name only
 * real fields from its chosen variant. Do not use `deepPartial()` on the
 * published union: it retains the two-source array length and makes the
 * discriminator too permissive for incremental hero authoring.
 */
const heroSiteConfigurationDraftSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).optional(),
  page: z.enum(CMS_HERO_FILM_SLOTS).optional(),
  hero: z.object({
    posterMediaId: z.string().uuid().optional(),
    posterMediaVersionId: z.string().uuid().optional(),
    // A source is an immutable, complete media pin once it is added. Drafts
    // may contain zero or one source while the second format is pending.
    sources: z.array(heroMediaReferenceSchema).max(2).optional(),
  }).strict().optional(),
}).strict();

const contactEmailConfigurationDraftSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).optional(),
  configuration: z.literal("contact-email").optional(),
  contactEmail: z.string().trim().email("Enter a valid email address.").max(254).optional(),
}).strict();

const siteConfigurationDraftContentSchema = z.preprocess((value) => {
  const content = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
  // Select the contact arm before parsing so an invalid contact email reports
  // its email error rather than the hero arm's unrelated strict-key error.
  const contact = content.configuration === "contact-email"
    || Object.prototype.hasOwnProperty.call(content, "contactEmail");
  return { variant: contact ? "contact" : "hero", content: value };
}, z.discriminatedUnion("variant", [
  z.object({ variant: z.literal("hero"), content: heroSiteConfigurationDraftSchema }).strict(),
  z.object({ variant: z.literal("contact"), content: contactEmailConfigurationDraftSchema }).strict(),
]).transform(({ content }) => content));

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
export const HOMEPAGE_INDUSTRY_IDS = [
  "financial-services",
  "telecoms",
  "travel-hospitality",
  "energy-resources",
  "public-sector",
  "education",
] as const;
export const cmsPageSectionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("narrative"),
    ...pageSectionIdentity,
    heading: z.string().trim().max(240).optional(),
    body: z.array(cmsRichBlockSchema).min(1).max(50),
    // Optional on purpose: immutable homepage editions approved before this
    // slot existed continue to render the established published-industry list.
    industryIds: z.array(z.enum(HOMEPAGE_INDUSTRY_IDS)).min(1).max(6).optional(),
  }).strict(),
  z.object({ type: z.literal("cta"), ...pageSectionIdentity, label: z.string().trim().min(1).max(120), href: safeLandingCtaLink, style: z.enum(["primary", "secondary", "text"]).default("primary") }).strict(),
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
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLandingCtaLink, style: z.enum(["primary", "secondary", "text"]).default("primary") }).optional(),
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
  for (const [index, section] of value.sections.entries()) {
    if (section.type === "narrative" && section.industryIds) {
      if (section.id !== "home-industries" || value.pagePath !== "/") {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "industryIds"],
          message: "Industry selections are only supported by the homepage industries section.",
        });
      }
      if (new Set(section.industryIds).size !== section.industryIds.length) {
        context.addIssue({
          code: "custom",
          path: ["sections", index, "industryIds"],
          message: "Homepage industry selections must be unique.",
        });
      }
    }
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
export type PulsePagePayload = z.infer<typeof pulsePageSchema>;
export type CogniBasePulsePage = z.infer<typeof cognibasePulsePageSchema>;
export type CogniAgentsPulsePage = z.infer<typeof cogniagentsPulsePageSchema>;
export type PublicationContent = z.infer<typeof publicationContentSchema>;
export type CaseStudyContent = z.infer<typeof caseStudyContentSchema>;
export type IndustryContent = z.infer<typeof industryContentSchema>;

export type BankingPov = z.infer<typeof bankingPovSchema>;
export type PublicSectorPov = z.infer<typeof publicSectorPovSchema>;
export type FrameworkContent = z.infer<typeof frameworkContentSchema>;
export type GuardrailsLegacyContent = z.infer<typeof legacyGuardrailsFrameworkContentSchema>;
export type SetProveHoldGuardrailsContent = z.infer<typeof setProveHoldGuardrailsFrameworkContentSchema>;
export type OfficeContent = z.infer<typeof officeContentSchema>;

export type LandingPageContent = z.infer<typeof cmsLandingPageContentSchema>;
export type SiteConfigurationContent = z.infer<typeof siteConfigurationContentSchema>;
export type CmsContent = PersonContent | PartnerContent | PlatformContent | PublicationContent | CaseStudyContent | IndustryContent | FrameworkContent | OfficeContent | SiteConfigurationContent | LandingPageContent;

/**
 * Keep the publish target alongside the rule that created it.  The older
 * helper returns prose for compatibility with callers outside this validator;
 * using it here would make a path depend on wording again.
 */
function missingMethodologyMediaPinPaths(slot: unknown, value: unknown, path = "content.editorial"): string[] {
  const definition = slot as {
    kind?: string;
    fields?: Record<string, unknown>;
    items?: unknown[];
  };
  // Text, link, and fixed slots intentionally store primitive values. Only
  // structural and media slots require an object before traversal.
  if (!["media", "group", "fixed-list"].includes(String(definition.kind))) return [];
  if (!value || typeof value !== "object") return [path];
  if (definition.kind === "media") {
    return !(value as { media?: unknown }).media ? [`${path}.media`] : [];
  }
  if (definition.kind === "group") {
    return Object.entries(definition.fields ?? {}).flatMap(([key, child]) =>
      missingMethodologyMediaPinPaths(child, (value as Record<string, unknown>)[key], `${path}.${key}`),
    );
  }
  if (definition.kind === "fixed-list") {
    return (definition.items ?? []).flatMap((child, index) =>
      missingMethodologyMediaPinPaths(child, (value as unknown[])[index], `${path}.${index}`),
    );
  }
  return [];
}

type PublicationRuleIssue = {
  /** Stable rule identifier. The public error copy remains deliberately separate. */
  rule: string;
  /** Absolute snapshot content target. */
  path: string;
  message: string;
};

function publishRuleIssues(kind: CmsDocumentKind, value: CmsContent): PublicationRuleIssue[] {
  const issues: PublicationRuleIssue[] = [];
  const add = (rule: string, path: string, message: string) => issues.push({ rule, path, message });
  if (kind === "site-configuration") return issues;
  const governed = value as Exclude<CmsContent, SiteConfigurationContent>;
  if (governed.visibility !== "public") add("PUBLIC_VISIBILITY", "content.visibility", "Only public content can be published.");
  if (kind === "office") return issues;
  if (!governed.sources.length) add("SOURCE_REQUIRED", "content.sources", "At least one source is required.");
  if (!governed.verificationDate) add("VERIFICATION_DATE_REQUIRED", "content.verificationDate", "A verification date is required.");
  if (!governed.reviewDate) add("REVIEW_DATE_REQUIRED", "content.reviewDate", "A review date is required.");
  if (kind === "person") {
    const person = value as PersonContent;
    if (!person.identityMedia && !person.identityMediaId && !person.approvedFallback) add("IDENTITY_REQUIRED", "content.identityMedia", "An approved identity image or fallback is required.");
    if (person.role !== "advisor" && !person.biography) add("BIOGRAPHY_REQUIRED", "content.biography", "A biography is required.");
    if (person.role === "advisor" && !person.contribution) add("ADVISOR_CONTRIBUTION_REQUIRED", "content.contribution", "An advisor contribution is required.");
  }
  if (kind === "partner") {
    const partner = value as PartnerContent;
    if (partner.relationshipStatus !== "active") add("ACTIVE_RELATIONSHIP_REQUIRED", "content.relationshipStatus", "Only active partnerships can be published.");
    partner.evidence.forEach((claim, index) => {
      if (!claim.approved) add("EVIDENCE_APPROVAL_REQUIRED", `content.evidence.${index}.approved`, "Every partner evidence statement must be approved.");
    });
  }
  if (kind === "publication") {
    const publication = value as PublicationContent;
    if (!publication.body.length) add("BODY_REQUIRED", "content.body", "A publication body is required.");
    if (publication.variant === "pov" && !publication.pdfMedia && !publication.pdfMediaId) add("POV_DOCUMENT_REQUIRED", "content.pdfMedia", "A POV document requires an approved PDF.");
  }
  if (kind === "case-study") {
    const caseStudy = value as CaseStudyContent;
    if (caseStudy.disclosure === "restricted") add("PUBLIC_DISCLOSURE_REQUIRED", "content.disclosure", "Restricted case studies cannot be published publicly.");
    if (caseStudy.variant === "summary" && caseStudy.disclosure !== "anonymized") add("SUMMARY_ANONYMIZATION_REQUIRED", "content.disclosure", "A public case-study summary must be anonymized.");
    if (caseStudy.publicEvidenceStatus !== "approved") add("PUBLIC_EVIDENCE_APPROVAL_REQUIRED", "content.publicEvidenceStatus", "Public case-study evidence must be approved.");
    if (caseStudy.deliveryStage !== "production" && caseStudy.impactClassification === "observed") {
      add("NON_PRODUCTION_IMPACT_QUALIFICATION_REQUIRED", "content.impactClassification", "Non-production impact must be explicitly qualified as pilot/demo, simulated, projected, or unavailable.");
    }
    if (caseStudy.variant === "full" && !caseStudy.work.length) add("WORK_NARRATIVE_REQUIRED", "content.work", "A full case study requires a work narrative.");
    caseStudy.evidence.forEach((claim, index) => {
      if (!claim.approved) add("EVIDENCE_APPROVAL_REQUIRED", `content.evidence.${index}.approved`, "Every case-study evidence statement must be approved.");
    });
  }
  if (kind === "industry") {
    const industry = value as IndustryContent;
    if (industry.telecomPov?.reviewBlockers.length) {
      add("TELECOM_REVIEW_BLOCKERS", "content.telecomPov.reviewBlockers", "Telecom review blockers must be resolved before publication.");
    }
    if (industry.pressures.length < 3) add("PRESSURES_REQUIRED", "content.pressures", "At least three operating pressures are required.");
    if (industry.capabilities.length < 2) add("CAPABILITIES_REQUIRED", "content.capabilities", "At least two build capabilities are required.");
    if (!industry.imageAlt) add("HERO_ALT_TEXT_REQUIRED", "content.imageAlt", "Industry hero imagery requires alternative text.");
    if (industry.publicSectorPov?.reviewBlockers?.length) {
      add("PUBLIC_SECTOR_REVIEW_BLOCKERS", "content.publicSectorPov.reviewBlockers", "Public Sector review blockers must be cleared before publication.");
    }
  }
  if (kind === "framework") {
    const framework = value as FrameworkContent;
    if (framework.template === "guardrails") {
      if ("presentation" in framework && framework.presentation && !framework.heroMedia && !framework.heroMediaId) {
        add("GUARDRAILS_HERO_MEDIA_REQUIRED", "content.heroMedia", "The Guardrails redesign presentation requires immutable hero media.");
      }
      return issues;
    }
    if (framework.template !== "agent-authority") {
      if (!framework.hero.media && !framework.hero.mediaId) {
        add("METHODOLOGY_HERO_MEDIA_REQUIRED", "content.hero.media", "A methodology framework requires approved hero media.");
      }
      const definition = methodologyEditorialDefinition(framework.template);
      if (!definition) {
        add("METHODOLOGY_SLOT_DEFINITION_MISSING", "content.editorial", `Methodology template "${framework.template}" has no registered editorial slot definition.`);
      } else {
        missingMethodologyMediaPinPaths(definition.slots, framework.editorial).forEach((path) =>
          add("METHODOLOGY_MEDIA_PIN_REQUIRED", path, `${path.replace(/^content\./, "")} requires an immutable mediaId and mediaVersionId before publication.`),
        );
      }
      return issues;
    }
    if (!framework.heroMedia && !framework.heroMediaId) add("HERO_MEDIA_REQUIRED", "content.heroMedia", "A framework requires approved hero media.");
    for (const [index, example] of [framework.workedExample, ...framework.sectorExamples].entries()) {
      const rScore = Number(example.reversibility.slice(1)) as RScore;
      const hScore = Number(example.reach.slice(1)) as HScore;
      const expectedBand = getEBand(rScore, hScore);
      const expectedCeiling = getCeiling(expectedBand);
      const location = index === 0 ? "Worked example" : `Sector example ${index}`;
      if (example.exposureBand !== `E${expectedBand}`) {
        add("EXPOSURE_BAND_MISMATCH", index === 0 ? "content.workedExample.exposureBand" : `content.sectorExamples.${index - 1}.exposureBand`, `${location} exposure must be E${expectedBand} for ${example.reversibility}/${example.reach}.`);
      }
      if (example.oversight !== OVERSIGHT_LABELS[expectedCeiling]) {
        add("OVERSIGHT_MISMATCH", index === 0 ? "content.workedExample.oversight" : `content.sectorExamples.${index - 1}.oversight`, `${location} oversight must match the calculated ${OVERSIGHT_LABELS[expectedCeiling]} ceiling.`);
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
      add("INTERVENTION_WINDOW_REQUIRED", "content.workedExample.interventionWindow", "The worked example requires a stated intervention window for on-the-loop operation.");
    }
    if (
      isRequestedAboveCeiling(framework.workedExample.requestedAuthority as Oversight, workedCeiling) &&
      !framework.workedExample.authorityArtefact
    ) {
      add("AUTHORITY_ARTEFACT_REQUIRED", "content.workedExample.authorityArtefact", "The worked example must name the approved artefact carrying authority above the ceiling.");
    }
  }
  if (kind === "landing-page") {
    const landing = value as LandingPageContent;
    if (isCmsRetiredLandingPagePath(landing.pagePath)) {
      add("RETIRED_PAGE_PATH", "content.pagePath", `Landing page "${landing.pagePath}" is retired and cannot be published.`);
    }
    if (!landing.sections.length) add("SECTION_REQUIRED", "content.sections", "At least one governed page section is required.");
    if (new Set(landing.sections.map((section) => section.id)).size !== landing.sections.length) {
      add("SECTION_ID_UNIQUE", "content.sections", "Landing page section ids must be unique.");
    }
    if (new Set(landing.sections.map((section) => section.order)).size !== landing.sections.length) {
      add("SECTION_ORDER_UNIQUE", "content.sections", "Landing page section order values must be unique.");
    }
    const homepageIndustrySection = landing.sections.find((section) => section.id === "home-industries");
    if (homepageIndustrySection && (
      landing.pagePath !== "/"
      || homepageIndustrySection.type !== "narrative"
    )) {
      add(
        "HOME_INDUSTRY_SLOT_INVALID",
        "content.sections",
        'The optional "home-industries" slot must be a narrative section on the homepage.',
      );
    }
    if (!landing.sections.some((section) => section.type === "cta") && !landing.cta) {
      add("CTA_REQUIRED", "content.cta", "A landing page requires a governed call to action.");
    }
    if (landing.sections.some((section) => section.type === "migration-media")) {
      add("MIGRATION_MEDIA_RESOLUTION_REQUIRED", "content.sections", "Compiled landing media must be resolved to an approved immutable media version before publication.");
    }
    const contract = landingPageSlotContract[landing.pagePath as GovernedLandingPagePath] as
      | Record<string, GovernedLandingSlotType>
      | undefined;
    if (!contract) {
      add("GOVERNED_TEMPLATE_UNKNOWN", "content.pagePath", `Unknown governed landing page template "${landing.pagePath}".`);
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
        // Existing published homepage revisions predate this optional editorial
        // list. Keep them deliverable while a revision with the new list is
        // reviewed; if the slot is present, it still receives normal cardinality
        // and type validation below.
        if (
          landing.pagePath === "/"
          && slotId === "home-office-cities"
          && matches.length === 0
        ) {
          continue;
        }
        if (matches.length === 0) {
          add("REQUIRED_SLOT_MISSING", "content.sections", `Landing page "${landing.pagePath}" is missing required slot "${slotId}" (${expectedType}).`);
        } else if (matches.length !== 1) {
          add("REQUIRED_SLOT_DUPLICATED", "content.sections", `Landing page "${landing.pagePath}" must contain required slot "${slotId}" exactly once.`);
        } else if (matches[0].type !== expectedType) {
          const index = landing.sections.indexOf(matches[0]);
          add("REQUIRED_SLOT_TYPE_MISMATCH", `content.sections.${index}.type`, `Landing page "${landing.pagePath}" slot "${slotId}" must have type "${expectedType}", received "${matches[0].type}".`);
        }
      }
    }
  }
  return issues;
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

/**
 * Machine-readable validation data travels alongside the legacy string list.
 * `errors` remains for existing callers and audit history, while new UI and
 * API consumers can use a canonical target without parsing prose.
 */
export type CmsContentValidationIssue = {
  code: string;
  path: string;
  message: string;
  scope: CmsValidationMode;
  action: "focus-title" | "focus-content-field" | "focus-seo";
};

function validationCode(kind: CmsDocumentKind, mode: CmsValidationMode, path: string, source: string) {
  return `CMS_${mode.toUpperCase()}_${kind.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${source.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_${path.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`;
}

function validationAction(path: string): CmsContentValidationIssue["action"] {
  if (path === "title") return "focus-title";
  if (path === "seo" || path.startsWith("seo.")) return "focus-seo";
  return "focus-content-field";
}

function publicationValidationIssues(kind: CmsDocumentKind, mode: CmsValidationMode, value: CmsContent): CmsContentValidationIssue[] {
  return publishRuleIssues(kind, value).map((issue) => ({
    code: validationCode(kind, mode, issue.path, issue.rule),
    path: issue.path,
    message: issue.message,
    scope: mode,
    action: validationAction(issue.path),
  }));
}

/** Snapshot delivery guards do not name an editor control. They are surfaced as
 * an explicit delivery receipt target instead of inferring a field from prose. */
function deliveryValidationIssues(kind: CmsDocumentKind, mode: CmsValidationMode, errors: string[]): CmsContentValidationIssue[] {
  return errors.map((message, index) => ({
    code: validationCode(kind, mode, "content.delivery", `delivery-${index + 1}`),
    path: "content.delivery",
    message,
    scope: mode,
    action: "focus-content-field",
  }));
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
  const explicitFrameworkTemplate = kind === "framework"
    && input
    && typeof input === "object"
    && !Array.isArray(input)
    ? frameworkDraftContent?.template
    : undefined;
  const methodologyFrameworkSchemas: Record<string, z.AnyZodObject> = {
    idao: idaoFrameworkContentSchema,
    "ai-use-case-prioritization": aiUseCasePrioritizationFrameworkContentSchema,
    "ai-value-to-scale": aiValueToScaleFrameworkContentSchema,
    "agentic-operations-readiness": agenticOperationsReadinessFrameworkContentSchema,
    "human-agent-operating-model": humanAgentOperatingModelFrameworkContentSchema,
  };
  const guardrailsDraftContentVersion = frameworkDraftContent?.contentVersion;
  const frameworkDraftSchema = kind === "framework" && input && typeof input === "object" && !Array.isArray(input)
    ? (explicitFrameworkTemplate === "guardrails"
      ? guardrailsDraftContentVersion === "set-prove-hold-v1"
        ? z.preprocess((value) => normalizeGuardrailsDraftText(value), setProveHoldGuardrailsFrameworkContentSchema.deepPartial())
        : guardrailsDraftContentVersion === undefined || guardrailsDraftContentVersion === "guardrails-legacy-v1"
          ? z.preprocess((value) => normalizeGuardrailsDraftText(value), legacyGuardrailsFrameworkContentSchema.deepPartial())
          : z.never()
      : typeof explicitFrameworkTemplate === "string" && methodologyFrameworkSchemas[explicitFrameworkTemplate]
        ? methodologyFrameworkSchemas[explicitFrameworkTemplate].deepPartial()
      : hasExplicitFrameworkTemplate && explicitFrameworkTemplate !== "agent-authority"
        ? z.never()
      : agentAuthorityFrameworkContentSchema.deepPartial())
    : null;
  const schema = mode === "draft" && kind === "framework"
    ? frameworkDraftSchema!
    : mode === "draft" && kind === "platform"
    ? platformContentDraftSchema
    : mode === "draft" && kind === "landing-page"
    ? cmsLandingPageContentBaseSchema.deepPartial()
    : mode === "draft" && kind === "site-configuration"
    ? siteConfigurationDraftContentSchema
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
      issues: parsed.error.issues.map((issue: z.ZodIssue) => {
        const relativePath = issue.path.join(".");
        const path = relativePath ? `content.${relativePath}` : "content";
        return {
          code: validationCode(kind, mode, path, issue.code),
          path,
          message: issue.message,
          scope: mode,
          action: validationAction(path),
        };
      }),
    };
  }
  const issues = mode === "publish" ? publicationValidationIssues(kind, mode, parsed.data as CmsContent) : [];
  return issues.length
    ? { success: false as const, errors: issues.map((issue) => issue.message), issues }
    : {
      success: true as const,
      // Blank Guardrails prose is normalized only while checking a draft. Keep
      // the editor's original empty fields in the save payload.
        data: mode === "draft" && explicitFrameworkTemplate === "guardrails"
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
      issues: snapshot.error.issues.map((issue) => {
        const path = issue.path.join(".") || "document";
        return {
          code: validationCode(kind, mode, path, issue.code),
          path,
          message: issue.message,
          scope: mode,
          action: validationAction(path),
        };
      }),
    };
  }
  const content = validateCmsContent(kind, snapshot.data.content, mode);
  if (!content.success) return content;
  if (kind === "platform") {
    const platform = content.data as PlatformContent;
    const canonicalSlug = platform.template === "cognibase-pulse"
      ? "cognibase"
      : platform.template === "cogniagents-pulse"
        ? "cogniagents"
        : undefined;
    if (canonicalSlug && snapshot.data.slug !== canonicalSlug) {
      const message = `The ${platform.template} template must use the canonical slug "${canonicalSlug}".`;
      return {
        success: false as const,
        errors: [message],
        issues: [{
          code: validationCode(kind, mode, "slug", "canonical-pulse-slug"),
          path: "slug",
          message,
          scope: mode,
          action: "focus-content-field" as const,
        }],
      };
    }
  }
  if (mode === "publish" && kind === "case-study") {
    const caseStudy = content.data as CaseStudyContent;
    if (caseStudy.variant === "summary" && !snapshot.data.summary?.trim()) {
      const errors = ["A public case-study summary is required and must be anonymized."];
      return {
        success: false as const,
        errors,
        issues: [{
          code: validationCode(kind, mode, "summary", "case-study-summary-required"),
          path: "summary",
          message: errors[0],
          scope: mode,
          action: "focus-content-field" as const,
        }],
      };
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
        issues: [{
          // Point at the second conflicting editor selection, not the
          // derived snapshot mediaIds receipt. That keeps readiness focus on
          // the exact mutable media control.
          code: validationCode(kind, mode, reference.fieldPath, "immutable-media-version-conflict"),
          path: reference.fieldPath,
          message: `Media asset ${reference.mediaId} cannot reference multiple versions in one revision.`,
          scope: mode,
          action: "focus-content-field",
        }],
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
  return errors.length
    ? { success: false as const, errors, issues: deliveryValidationIssues(kind, mode, errors) }
    : source;
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
    ? { success: false as const, errors, issues: deliveryValidationIssues(kind, mode, errors) }
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
  // New methodology templates keep the hero image and its presentation
  // metadata together.  This remains separate from hero films, which use a
  // posterMediaVersionId and are handled below.
  if (
    kind === "framework"
    && record.hero
    && typeof record.hero === "object"
    && !Array.isArray(record.hero)
  ) {
    const hero = record.hero as Record<string, unknown>;
    add(hero.media ?? hero.mediaId, "content.hero.media", "hero");
  }
  if (
    kind === "framework"
    && typeof record.template === "string"
    && record.editorial
  ) {
    const definition = methodologyEditorialDefinition(record.template);
    if (definition) {
      for (const reference of methodologyEditorialMediaValues(definition.slots, record.editorial)) {
        add(
          {
            mediaId: reference.media.mediaId,
            mediaVersionId: reference.media.mediaVersionId,
            role: reference.media.role,
            altText: reference.altText,
          },
          `content.${reference.path}`,
          reference.media.role,
        );
      }
    }
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


const methodologyHeroSchema = z.object({
  breadcrumb: z.string().trim().min(1).max(160),
  title: methodologyText,
  description: methodologyText,
  supportingText: z.string().trim().max(4_000).optional(),
  media: optionalMediaReference,
  mediaId: legacyMediaId,
  imagePosition: z.string().trim().max(120).optional(),
  imageCaptionSubtitle: z.string().trim().max(240).optional(),
  imageCaptionTitle: z.string().trim().max(1_000).optional(),
}).strict();

const methodologyCanonicalIds = {
  idao: {
    stages: ["innovate", "demonstrate", "activate", "operate"],
    layers: ["01", "02", "03", "04", "05"],
  },
  "ai-use-case-prioritization": {
    dimensions: ["value", "feasibility", "timeToEvidence", "adoptionFriction", "controlBurden", "reusePotential"],
    decisionRules: ["stop", "innovate", "demonstrate", "activate"],
  },
  "ai-value-to-scale": {
    dimensions: ["value", "portfolio", "platform", "operating", "workforce", "governance", "outcomes"],
    stages: ["1", "2", "3", "4", "5"],
  },
  "agentic-operations-readiness": {
    conditions: ["stability", "access", "observability", "fallback", "exceptions", "economics"],
    decisions: ["proceed", "prepare", "stop"],
  },
  "human-agent-operating-model": {
    designSteps: ["01", "02", "03", "04", "05"],
    decisionRights: ["frame", "recommend", "approve", "act", "intervene"],
    measures: ["use", "control", "capability", "outcome"],
  },
} as const;

const methodologyCanonicalSchema = (groups: Record<string, readonly string[]>) =>
  z.object(Object.fromEntries(Object.entries(groups).map(([key, ids]) => [
    key,
    fixedMethodologyIds(ids, `canonical.${key}`),
  ])) as Record<string, z.ZodTypeAny>).strict();

/** The only migration-safe representation of application-owned methodology
 * identifiers. Editorial code may consume these values but cannot redefine
 * their membership or order. */
export function methodologyCanonicalSeed(template: keyof typeof methodologyCanonicalIds) {
  return Object.fromEntries(
    Object.entries(methodologyCanonicalIds[template]).map(([key, ids]) => [
      key,
      (ids as readonly string[]).map((id: string) => ({ id })),
    ]),
  );
}

const fixedMethodologyIds = (expected: readonly string[], path: string) =>
  z.array(z.object({ id: z.string() }).strict()).length(expected.length).superRefine(requiresFixedOrder(expected, path));

const methodologyFrameworkSchema = <T extends string>(
  template: T,
  canonical: z.ZodTypeAny,
) => z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  template: z.literal(template),
  hero: methodologyHeroSchema,
  editorial: z.lazy(() => {
    const definition = methodologyEditorialDefinition(template);
    return definition
      ? definition.editorialSchema as z.ZodTypeAny
      : z.never({ message: `Methodology template "${template}" has no registered editorial slot definition.` });
  }),
  canonical,
  ...governance,
}).strict();

export const idaoFrameworkContentSchema = methodologyFrameworkSchema("idao", methodologyCanonicalSchema(methodologyCanonicalIds.idao));
export const aiUseCasePrioritizationFrameworkContentSchema = methodologyFrameworkSchema("ai-use-case-prioritization", methodologyCanonicalSchema(methodologyCanonicalIds["ai-use-case-prioritization"]));
export const aiValueToScaleFrameworkContentSchema = methodologyFrameworkSchema("ai-value-to-scale", methodologyCanonicalSchema(methodologyCanonicalIds["ai-value-to-scale"]));
export const agenticOperationsReadinessFrameworkContentSchema = methodologyFrameworkSchema("agentic-operations-readiness", methodologyCanonicalSchema(methodologyCanonicalIds["agentic-operations-readiness"]));
export const humanAgentOperatingModelFrameworkContentSchema = methodologyFrameworkSchema("human-agent-operating-model", methodologyCanonicalSchema(methodologyCanonicalIds["human-agent-operating-model"]));
