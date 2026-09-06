import { z } from "zod";

export const CMS_CONTRACT_VERSION = 1 as const;
export const cmsDocumentKinds = ["person", "partner", "platform", "publication", "case-study", "industry"] as const;
export type CmsDocumentKind = (typeof cmsDocumentKinds)[number];
export type CmsValidationMode = "draft" | "publish";

const safeExternalUrl = z.string().url().regex(/^https?:\/\//i, "Only HTTP(S) links are allowed.");
const safeInternalPath = z.string().regex(/^\/(?!\/)[a-z0-9/_-]*(?:\?[a-z0-9&=_-]+)?(?:#[a-z0-9_-]+)?$/i);
const safeAssetPath = z.string().regex(/^\/(?!\/)[a-z0-9/_.-]+$/i);
const safeLink = z.union([safeExternalUrl, safeInternalPath]);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const optionalDate = date.optional();
const stringList = z.array(z.string().trim().min(1).max(240)).max(50).default([]);
const idList = z.array(z.string().uuid()).max(50).default([]);

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
  identityMediaId: z.string().uuid().optional(),
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
  logoMediaId: z.string().uuid().optional(),
  relationshipStatus: z.enum(["active", "prospective", "paused", "ended"]),
  ...governance,
}).strict();

export const platformContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  category: z.string().trim().min(1).max(160),
  summary: z.string().trim().min(1).max(2_000),
  heroMediaId: z.string().uuid().optional(),
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
  heroMediaId: z.string().uuid().optional(),
  pdfMediaId: z.string().uuid().optional(),
  social: z.object({
    title: z.string().trim().max(120).optional(),
    description: z.string().trim().max(300).optional(),
    imageMediaId: z.string().uuid().optional(),
  }).strict().default({}),
  ...governance,
}).strict();

export const caseStudyContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  variant: z.enum(["summary", "full"]),
  disclosure: z.enum(["named", "anonymized", "restricted"]),
  mandate: z.string().trim().min(1).max(2_000),
  context: z.string().trim().max(4_000).optional(),
  constraints: stringList,
  work: z.array(cmsRichBlockSchema).max(100).default([]),
  controls: stringList,
  outcomes: stringList,
  evidence: z.array(cmsEvidenceSchema).max(30).default([]),
  quote: z.object({ text: z.string().trim().min(1).max(2_000), attribution: z.string().trim().max(240).optional() }).strict().optional(),
  heroMediaId: z.string().uuid().optional(),
  cta: z.object({ label: z.string().trim().min(1).max(120), href: safeLink }).strict().optional(),
  ...governance,
}).strict();

const industrySourceSchema = z.object({
  label: z.string().trim().min(1).max(240),
  publisher: z.string().trim().min(1).max(240),
  kind: z.enum(["Official source", "Independent study", "Company-reported", "Vendor claim"]),
  url: safeExternalUrl,
  accessedAt: optionalDate,
}).strict();

export const industryContentSchema = z.object({
  schemaVersion: z.literal(CMS_CONTRACT_VERSION).default(CMS_CONTRACT_VERSION),
  legacyPath: safeInternalPath,
  name: z.string().trim().min(1).max(160),
  shortName: z.string().trim().min(1).max(80),
  thesis: z.string().trim().min(1).max(240),
  accent: z.string().trim().min(1).max(120),
  dek: z.string().trim().min(1).max(2_000),
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
    evidence: z.string().trim().min(1).max(240),
    boundary: z.string().trim().min(1).max(500),
  }).strict()).min(1).max(12),
  sources: z.array(industrySourceSchema).min(1).max(30),
  heroMediaId: z.string().uuid().optional(),
  verificationDate: date,
  reviewDate: date,
  visibility: z.enum(["public", "hidden", "restricted"]).default("public"),
  order: z.number().int().min(0).max(10_000).default(0),
  relatedIds: idList,
}).strict();

export const cmsContentSchemas = {
  person: personContentSchema,
  partner: partnerContentSchema,
  platform: platformContentSchema,
  publication: publicationContentSchema,
  "case-study": caseStudyContentSchema,
  industry: industryContentSchema,
} as const;

export type PersonContent = z.infer<typeof personContentSchema>;
export type PartnerContent = z.infer<typeof partnerContentSchema>;
export type PlatformContent = z.infer<typeof platformContentSchema>;
export type PublicationContent = z.infer<typeof publicationContentSchema>;
export type CaseStudyContent = z.infer<typeof caseStudyContentSchema>;
export type IndustryContent = z.infer<typeof industryContentSchema>;
export type CmsContent = PersonContent | PartnerContent | PlatformContent | PublicationContent | CaseStudyContent | IndustryContent;

function publishErrors(kind: CmsDocumentKind, value: CmsContent): string[] {
  const errors: string[] = [];
  if (value.visibility !== "public") errors.push("Only public content can be published.");
  if (!value.sources.length) errors.push("At least one source is required.");
  if (!value.verificationDate) errors.push("A verification date is required.");
  if (!value.reviewDate) errors.push("A review date is required.");
  if (kind === "person") {
    const person = value as PersonContent;
    if (!person.identityMediaId && !person.approvedFallback) errors.push("An approved identity image or fallback is required.");
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
    if (publication.variant === "pov" && !publication.pdfMediaId) errors.push("A POV document requires an approved PDF.");
  }
  if (kind === "case-study") {
    const caseStudy = value as CaseStudyContent;
    if (caseStudy.disclosure === "restricted") errors.push("Restricted case studies cannot be published publicly.");
    if (caseStudy.variant === "full" && !caseStudy.work.length) errors.push("A full case study requires a work narrative.");
    if (caseStudy.evidence.some((claim) => !claim.approved)) errors.push("Every case-study evidence statement must be approved.");
  }
  if (kind === "industry") {
    const industry = value as IndustryContent;
    if (industry.pressures.length < 3) errors.push("At least three operating pressures are required.");
    if (!industry.imageAlt) errors.push("Industry hero imagery requires alternative text.");
  }
  return errors;
}

export function validateCmsContent(kind: CmsDocumentKind, input: unknown, mode: CmsValidationMode = "draft") {
  if (
    mode === "draft" &&
    typeof input === "object" &&
    input !== null &&
    Object.keys(input).length === 1 &&
    (input as Record<string, unknown>).schemaVersion === CMS_CONTRACT_VERSION
  ) {
    return { success: true as const, data: input as CmsContent };
  }
  const parsed = cmsContentSchemas[kind].safeParse(input);
  if (!parsed.success) {
    return {
      success: false as const,
      errors: parsed.error.issues.map((issue) => `${issue.path.join(".") || "content"}: ${issue.message}`),
    };
  }
  const errors = mode === "publish" ? publishErrors(kind, parsed.data) : [];
  return errors.length
    ? { success: false as const, errors }
    : { success: true as const, data: parsed.data as CmsContent };
}

export const cmsSeoSchema = z.object({
  title: z.string().trim().max(70).optional(),
  description: z.string().trim().max(180).optional(),
  canonicalUrl: safeExternalUrl.optional(),
  noIndex: z.boolean().default(false),
}).strict();

export const cmsSnapshotSchema = z.object({
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  title: z.string().trim().min(1).max(240),
  summary: z.string().trim().max(2_000).nullable().optional(),
  content: z.unknown(),
  seo: cmsSeoSchema.optional(),
  mediaIds: idList,
  markets: z.array(z.string().regex(/^[a-z][a-z0-9-]{1,15}$/)).min(1).max(20),
}).strict();

export function validateCmsSnapshot(
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
  const mediaIds = new Set(snapshot.data.mediaIds);
  const record = content.data as Record<string, unknown>;
  for (const field of ["identityMediaId", "logoMediaId", "heroMediaId", "pdfMediaId"]) {
    if (typeof record[field] === "string") mediaIds.add(record[field] as string);
  }
  const social = record.social;
  if (social && typeof social === "object" && typeof (social as Record<string, unknown>).imageMediaId === "string") {
    mediaIds.add((social as Record<string, unknown>).imageMediaId as string);
  }
  return {
    success: true as const,
    data: { ...snapshot.data, content: content.data, mediaIds: [...mediaIds] },
  };
}

export function cmsPublicRoute(kind: CmsDocumentKind, slug: string, content: CmsContent): string | null {
  if (content.visibility !== "public") return null;
  if (kind === "person" || kind === "partner") return null;
  if (kind === "platform") return `/platforms/${slug}`;
  if (kind === "publication") return `/insights/${slug}`;
  if (kind === "industry") return `/industries/${slug}`;
  const caseStudy = content as CaseStudyContent;
  return caseStudy.variant === "full" && caseStudy.disclosure !== "restricted"
    ? `/work/${slug}`
    : null;
}