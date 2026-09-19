import { z } from "zod";
import { cmsDocumentKinds } from "./cms-content";

export const CMS_RELEASE_REGISTRY_VERSION = "2026-09-19.1";

export const destinationReferenceSchema = z.object({
  destinationId: z.string().trim().min(1).max(160),
  anchor: z.string().trim().min(1).max(160).optional(),
  query: z.record(z.string().max(500)).optional(),
}).strict();
export type DestinationReference = z.infer<typeof destinationReferenceSchema>;

export const logicalMediaPlacementSchema = z.object({
  placementId: z.string().regex(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/),
  market: z.string().trim().min(2).max(20).nullable(),
  locale: z.string().trim().min(2).max(20).nullable(),
  inheritsFromPlacementId: z.string().nullable(),
  required: z.boolean(),
}).strict();

export const releaseRouteSchema = z.object({
  destinationId: z.string(),
  path: z.string().startsWith("/"),
  kind: z.enum(cmsDocumentKinds).nullable(),
  rendererKey: z.string(),
  routeType: z.enum(["page", "collection", "dynamic", "alias", "redirect", "preview"]),
  destinationIdTarget: z.string().nullable(),
  anchor: z.string().nullable(),
  requiredContentSlots: z.array(z.string()),
  requiredMediaSlots: z.array(z.string()),
  requiredLinkSlots: z.array(z.string()),
  failureSemantics: z.enum(["absent", "redirect", "service-failure"]),
  compiledOnly: z.boolean(),
}).strict();

export const cmsReleaseRegistrySchema = z.object({
  version: z.string(),
  atomicity: z.literal("market-locale"),
  routes: z.array(releaseRouteSchema),
  kinds: z.array(z.enum(cmsDocumentKinds)),
  fallbackPolicy: z.object({
    allowCanonicalMarketFallback: z.literal(false),
    requireExactLocaleForRequiredFields: z.literal(true),
    unavailableDestinationBehavior: z.literal("omit-before-layout"),
  }).strict(),
}).strict();

const page = (
  destinationId: string,
  path: string,
  kind: (typeof cmsDocumentKinds)[number] | null,
  rendererKey: string,
  routeType: "page" | "collection" | "dynamic" | "preview" = "page",
  compiledOnly = false,
) => ({
  destinationId, path, kind, rendererKey, routeType,
  destinationIdTarget: null, anchor: null,
  requiredContentSlots: ["title", "content"],
  requiredMediaSlots: [],
  requiredLinkSlots: [],
  failureSemantics: "absent" as const,
  compiledOnly,
});
const redirect = (destinationId: string, path: string, target: string, anchor: string | null = null) => ({
  destinationId, path, kind: null, rendererKey: "redirect", routeType: "redirect" as const,
  destinationIdTarget: target, anchor,
  requiredContentSlots: [], requiredMediaSlots: [], requiredLinkSlots: [],
  failureSemantics: "redirect" as const, compiledOnly: false,
});

export const CMS_RELEASE_REGISTRY = cmsReleaseRegistrySchema.parse({
  version: CMS_RELEASE_REGISTRY_VERSION,
  atomicity: "market-locale",
  kinds: cmsDocumentKinds,
  fallbackPolicy: {
    allowCanonicalMarketFallback: false,
    requireExactLocaleForRequiredFields: true,
    unavailableDestinationBehavior: "omit-before-layout",
  },
  routes: [
    page("home", "/", "landing-page", "home"),
    page("methodologies", "/methodologies", "landing-page", "methodologies"),
    page("methodology.detail", "/methodologies/:slug", "framework", "methodology-detail", "dynamic"),
    page("services.detail", "/what-we-do/:slug", "landing-page", "service-detail", "dynamic", true),
    redirect("what-we-do", "/what-we-do", "home", "service-lines"),
    redirect("services", "/services", "home", "service-lines"),
    page("platforms", "/platforms", "landing-page", "platforms"),
    page("platform.detail", "/platforms/:slug", "platform", "platform-detail", "dynamic"),
    page("platform.cognios", "/platforms/cognios", "platform", "platform-detail"),
    page("platform.cognidocs", "/platforms/cognidocs", "platform", "platform-detail"),
    page("platform.cogniagents", "/platforms/cogniagents", "platform", "platform-detail"),
    page("platform.cognibase", "/platforms/cognibase", "platform", "platform-detail"),
    page("platform.lupitor", "/platforms/lupitor", "platform", "platform-detail"),
    page("platform.datatoolpack", "/platforms/datatoolpack", "platform", "platform-detail"),
    page("platform.bunjee-ai", "/platforms/bunjee-ai", "platform", "platform-detail"),
    page("industries", "/industries", "landing-page", "industries"),
    page("industry.detail", "/industries/:slug", "industry", "industry-detail", "dynamic"),
    page("industry.financial-services", "/industries/financial-services", "industry", "industry-detail"),
    page("industry.public-sector", "/industries/public-sector", "industry", "industry-detail"),
    page("industry.telecoms", "/industries/telecoms", "industry", "industry-detail"),
    page("industry.travel-hospitality", "/industries/travel-hospitality", "industry", "industry-detail"),
    page("industry.energy-resources", "/industries/energy-resources", "industry", "industry-detail"),
    page("industry.education", "/industries/education", "industry", "industry-detail"),
    page("case-study.detail", "/work/:slug", "case-study", "case-study-detail", "dynamic"),
    page("insights", "/insights", "landing-page", "insights"),
    page("insight.detail", "/insights/:slug", "publication", "insight-detail", "dynamic"),
    page("about", "/about", "landing-page", "about"),
    page("partners", "/partners", "landing-page", "partners"),
    page("faq", "/faq", "landing-page", "faq", "page", true),
    page("contact", "/contact", "landing-page", "contact", "page", true),
    page("value-scan", "/value-scan", "landing-page", "value-scan", "page", true),
    page("preview", "/preview/:token", null, "cms-preview", "preview"),
    redirect("platform.cognitalk", "/platforms/cognitalk", "platform.lupitor"),
    redirect("platform.cogniware", "/platforms/cogniware", "platform.cognibase"),
    redirect("industry.banking", "/industries/banking", "industry.financial-services"),
    redirect("industry.government", "/industries/government", "industry.public-sector"),
    redirect("industry.travel", "/industries/travel", "industry.travel-hospitality"),
    redirect("industry.energy", "/industries/energy", "industry.energy-resources"),
    redirect("sectors", "/sectors", "industries"),
    redirect("who", "/who", "about"),
    redirect("architecture", "/architecture", "platform.cognios", "architecture"),
    redirect("cognidocs", "/cognidocs", "platform.cognidocs"),
    redirect("cogniagents", "/cogniagents", "platform.cogniagents"),
    redirect("cognitalk", "/cognitalk", "platform.lupitor"),
    redirect("cogniware", "/cogniware", "platform.cognibase"),
    redirect("pov-banking", "/pov-banking", "industry.financial-services"),
    redirect("pov-government", "/pov-government", "industry.public-sector"),
    redirect("pov-telecoms", "/pov-telecoms", "industry.telecoms"),
    redirect("pov-travel", "/pov-travel", "industry.travel-hospitality"),
    redirect("pov-energy", "/pov-energy", "industry.energy-resources"),
    redirect("industry.manufacturing", "/industries/manufacturing", "industry.public-sector"),
    redirect("pov-manufacturing", "/pov-manufacturing", "industry.public-sector"),
    redirect("pov-public-sector", "/pov-public-sector", "industry.public-sector"),
  ],
});

export const resourceGrantActions = [
  "view", "create", "edit", "delete-draft", "bind-media", "preview", "submit", "propose-withdrawal",
] as const;
export const resourceScopedGrantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  resourceType: z.enum(["canonical-page", "partner-case-studies"]),
  resourceId: z.string(),
  ownerId: z.string().nullable(),
  market: z.string(),
  locale: z.string(),
  actions: z.array(z.enum(resourceGrantActions)),
  version: z.number().int().positive(),
  expiresAt: z.coerce.date().nullable(),
  revokedAt: z.coerce.date().nullable(),
}).strict();

export const releaseScopeSchema = z.object({
  market: z.string().trim().min(2).max(20),
  locale: z.string().trim().min(2).max(20),
}).strict();

export const buildReleaseCandidateBodySchema = releaseScopeSchema.extend({
  submittedByUserId: z.string().optional(),
}).strict();
export const publishReleaseBodySchema = z.object({
  candidateId: z.string(),
  idempotencyKey: z.string().min(1).max(200),
}).strict();
export const rollbackReleaseBodySchema = z.object({
  releaseId: z.string(),
  idempotencyKey: z.string().min(1).max(200),
}).strict();

export type CmsReleaseRegistry = z.infer<typeof cmsReleaseRegistrySchema>;