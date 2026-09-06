import { z } from "zod/v4";

/** Strict, versioned JSONB contracts used before a revision is persisted. */
export const cmsMarkets = ["uae", "ksa", "turkiye", "europe"] as const;
export const cmsDocumentKinds = [
  "page", "navigation", "publication", "person", "organization", "referenceSource",
  "approvedSource", "proof", "claim", "globalSettings",
] as const;
export const cmsRouteKinds = [
  "home", "service", "platform", "industry", "caseStudy", "about", "contact", "landing", "legal",
] as const;
const id = z.string().regex(/^[A-Za-z0-9._-]{3,200}$/);
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(120);
const boundedText = (max: number) => z.string().max(max);
const optionalIso = z.string().datetime({ offset: true }).optional();

export const stableRefSchema = z.strictObject({ id });
const safeExternalUrl = z.url().refine(
  (value) => /^https:\/\//i.test(value) || /^mailto:/i.test(value) || /^tel:/i.test(value),
  "Only HTTPS, mailto, and tel links are permitted",
);
export const safeLinkSchema: z.ZodType<{
  label: string; internal?: { id: string }; externalUrl?: string; children?: unknown[];
}> = z.lazy(() => z.strictObject({
  label: boundedText(160).min(1),
  internal: stableRefSchema.optional(),
  externalUrl: safeExternalUrl.optional(),
  children: z.array(safeLinkSchema).max(12).optional(),
}).refine((value) => Boolean(value.internal) !== Boolean(value.externalUrl), "Choose exactly one link destination"));
export const navigationContentSchema = z.strictObject({
  placement: z.enum(["primary", "utility", "footer"]),
  items: z.array(safeLinkSchema).min(1).max(50),
});

const spanSchema = z.strictObject({
  type: z.literal("span"), text: boundedText(4_000), marks: z.array(z.enum(["strong", "em", "code"])).max(8).default([]),
});
export const richTextSchema = z.array(z.strictObject({
  type: z.literal("block"),
  style: z.enum(["normal", "h2", "h3", "blockquote"]),
  children: z.array(spanSchema).min(1).max(200),
})).max(200);

export const seoSchema = z.strictObject({
  metaTitle: boundedText(60).optional(),
  metaDescription: boundedText(160).optional(),
  canonicalUrl: safeExternalUrl.optional(),
  noIndex: z.boolean().default(false),
  openGraphImage: stableRefSchema.optional(),
  structuredDataType: z.enum(["WebPage", "Article", "Person", "Organization", "Service"]).optional(),
});
const sectionBase = {
  id,
  eyebrow: boundedText(160).optional(),
  heading: boundedText(240).min(1),
  body: richTextSchema.optional(),
};
export const pageSectionSchema = z.discriminatedUnion("type", [
  z.strictObject({ ...sectionBase, type: z.literal("hero"), primaryAction: safeLinkSchema.optional(), media: stableRefSchema.optional() }),
  z.strictObject({ ...sectionBase, type: z.literal("richText") }),
  z.strictObject({ ...sectionBase, type: z.literal("claims"), claims: z.array(stableRefSchema).min(1).max(24) }),
  z.strictObject({ ...sectionBase, type: z.literal("metrics"), proof: z.array(stableRefSchema).max(24) }),
  z.strictObject({ ...sectionBase, type: z.literal("quote"), quote: boundedText(4_000).min(1), person: stableRefSchema.optional() }),
  z.strictObject({ ...sectionBase, type: z.literal("referenceGrid"), items: z.array(stableRefSchema).max(48) }),
  z.strictObject({ ...sectionBase, type: z.literal("media"), media: stableRefSchema }),
  z.strictObject({ ...sectionBase, type: z.literal("timeline"), steps: z.array(z.strictObject({ label: boundedText(160), detail: boundedText(2_000) })).max(24) }),
  z.strictObject({ ...sectionBase, type: z.literal("comparison"), before: boundedText(4_000), after: boundedText(4_000) }),
  z.strictObject({ ...sectionBase, type: z.literal("cta"), action: safeLinkSchema }),
  z.strictObject({ ...sectionBase, type: z.literal("faq"), items: z.array(z.strictObject({ question: boundedText(400), answer: richTextSchema })).max(30) }),
  z.strictObject({ ...sectionBase, type: z.literal("downloadGate"), asset: stableRefSchema.optional(), consentCopy: boundedText(2_000).optional() }),
  z.strictObject({ ...sectionBase, type: z.literal("formSlot"), form: z.enum(["contact", "valueScan"]) }),
]);

const ownershipSchema = z.strictObject({
  owner: stableRefSchema, regionalOwner: stableRefSchema.optional(), reviewDueAt: optionalIso,
  sensitivity: z.enum(["public", "anonymized", "restricted"]).default("public"),
});
const pagePayload = z.strictObject({
  kind: z.literal("page"), title: boundedText(240).min(1), routeKind: z.enum(cmsRouteKinds),
  canonicalSlug: slug, summary: boundedText(2_000).optional(), topics: z.array(boundedText(100)).max(24).default([]),
  sections: z.array(pageSectionSchema).max(80), seo: seoSchema.optional(), ownership: ownershipSchema,
});
const publicationPayload = z.strictObject({
  kind: z.literal("publication"), title: boundedText(240).min(1), canonicalSlug: slug,
  format: z.enum(["article", "report", "video", "webinar", "news", "newsletter", "podcast", "download"]),
  dek: boundedText(2_000).optional(), body: richTextSchema, authors: z.array(stableRefSchema).min(1).max(20),
  topics: z.array(boundedText(100)).max(24).default([]), media: stableRefSchema.optional(),
  download: stableRefSchema.optional(), gated: z.boolean().default(false), eventStartsAt: optionalIso,
  publishedAt: optionalIso, readingMinutes: z.int().min(1).max(10_000).optional(), seo: seoSchema.optional(),
  ownership: ownershipSchema,
});
const personPayload = z.strictObject({
  kind: z.literal("person"), name: boundedText(240).min(1), role: boundedText(240).optional(),
  profileType: z.enum(["leader", "team", "advisor", "author"]), bio: richTextSchema.optional(),
  portrait: stableRefSchema.optional(), expertise: z.array(boundedText(100)).max(30), ownership: ownershipSchema,
});
const organizationPayload = z.strictObject({
  kind: z.literal("organization"), name: boundedText(240).min(1),
  organizationType: z.enum(["partner", "client", "vendor", "publisher", "institution"]).optional(),
  description: richTextSchema.optional(), logo: stableRefSchema.optional(), website: safeExternalUrl.optional(),
  capabilities: z.array(boundedText(160)).max(50), ownership: ownershipSchema,
});
const approvedSourcePayload = z.strictObject({
  kind: z.literal("approvedSource"), title: boundedText(500).min(1), content: boundedText(30_000).min(1),
  approvalStatus: z.enum(["draft", "approved", "withdrawn"]), contentClass: z.enum(["public", "internal"]),
  approvedAt: optionalIso, verifiedAt: optionalIso, expiresAt: optionalIso,
  marketsApproved: z.array(z.enum(cmsMarkets)).min(1).max(4), source: stableRefSchema.optional(), ownership: ownershipSchema,
});
const navigationPayload = z.strictObject({
  kind: z.literal("navigation"),
  content: navigationContentSchema,
  ownership: ownershipSchema,
});
const genericGovernedPayload = z.strictObject({
  kind: z.enum(["referenceSource", "proof", "claim", "globalSettings"]),
  content: z.record(z.string().max(100), z.unknown()).refine((value) => JSON.stringify(value).length <= 100_000, "Content is too large"),
  ownership: ownershipSchema,
});

export const cmsRevisionPayloadSchema = z.discriminatedUnion("kind", [
  pagePayload, publicationPayload, personPayload, organizationPayload, approvedSourcePayload, navigationPayload, genericGovernedPayload,
]);
export const cmsEditionPayloadSchema = z.strictObject({
  schemaVersion: z.literal(1),
  documentId: id,
  market: z.enum(cmsMarkets),
  fallbackMode: z.enum(["canonical", "uaeFallback", "override", "unavailable"]),
  content: cmsRevisionPayloadSchema,
}).superRefine((value, ctx) => {
  if (value.fallbackMode === "canonical" && value.market !== "uae") ctx.addIssue({ code: "custom", message: "Only UAE may be canonical" });
  if (value.fallbackMode === "override" && value.content.kind === "page" && value.content.sections.length === 0) {
    ctx.addIssue({ code: "custom", message: "Page overrides require sections" });
  }
});

export type CmsEditionPayload = z.infer<typeof cmsEditionPayloadSchema>;
export type CmsRevisionPayload = z.infer<typeof cmsRevisionPayloadSchema>;