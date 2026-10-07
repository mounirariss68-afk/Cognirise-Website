import { z } from "zod";

export const NAVIGATION_ITEM_REGISTRY = [
  { id: "what-we-do", label: "What we do", destination: "/" },
  { id: "methodologies", label: "How we do it", destination: "/methodologies" },
  { id: "methodologies.overview", label: "Methodology Portfolio", parentId: "methodologies", destination: "/methodologies" },
  { id: "methodologies.value-to-scale", label: "AI Value-to-Scale", parentId: "methodologies", destination: "/methodologies/ai-value-to-scale" },
  { id: "methodologies.use-case-prioritization", label: "Use-Case Prioritization", parentId: "methodologies", destination: "/methodologies/ai-use-case-prioritization" },
  { id: "methodologies.idao", label: "IDAO", parentId: "methodologies", destination: "/methodologies/idao" },
  { id: "methodologies.agent-authority", label: "Agent Authority Model", parentId: "methodologies", destination: "/methodologies/agent-authority-model" },
  { id: "methodologies.guardrails", label: "Guardrails Framework", parentId: "methodologies", destination: "/methodologies/guardrails-framework" },
  { id: "platforms", label: "Platforms", destination: "/platforms" },
  { id: "platforms.overview", label: "Platform Overview", parentId: "platforms", destination: "/platforms" },
  { id: "platforms.cognios", label: "CogniOS", parentId: "platforms", destination: "/platforms/cognios" },
  { id: "platforms.architecture", label: "Architecture", parentId: "platforms", destination: "/platforms/cognios#architecture" },
  { id: "platforms.cognidocs", label: "CogniDocs", parentId: "platforms", destination: "/platforms/cognidocs" },
  { id: "platforms.cogniagents", label: "CogniAgents", parentId: "platforms", destination: "/platforms/cogniagents" },
  { id: "platforms.cognitalk", label: "CogniTalk", parentId: "platforms", destination: "/platforms/cognitalk" },
  { id: "platforms.cogniware", label: "CogniWare", parentId: "platforms", destination: "/platforms/cogniware" },
  { id: "industries", label: "Industries", destination: "/industries" },
  { id: "industries.overview", label: "Industries Overview", parentId: "industries", destination: "/industries" },
  { id: "industries.banking", label: "Financial Services", parentId: "industries", destination: "/industries/financial-services" },
  { id: "industries.public-sector", label: "Public Sector", parentId: "industries", destination: "/industries/public-sector" },
  { id: "industries.telecoms", label: "Telecoms", parentId: "industries", destination: "/industries/telecoms" },
  { id: "industries.travel", label: "Travel & Hospitality", parentId: "industries", destination: "/industries/travel-hospitality" },
  { id: "industries.energy", label: "Energy & Resources", parentId: "industries", destination: "/industries/energy-resources" },
  { id: "industries.manufacturing", label: "Manufacturing & Conglomerates", parentId: "industries", destination: "/industries/manufacturing" },
  { id: "insights", label: "Insights", destination: "/insights" },
  { id: "about", label: "About", destination: "/about" },
  { id: "about.leadership", label: "Our Team", parentId: "about", destination: "/about" },
  { id: "about.core-values", label: "Core Values", parentId: "about", destination: "/about/core-values" },
  { id: "about.partners", label: "Partners", parentId: "about", destination: "/partners" },
  { id: "about.faq", label: "FAQ", parentId: "about", destination: "/faq" },
  { id: "about.contact", label: "Contact", parentId: "about", destination: "/contact" },
] as const;

export const NAVIGATION_ITEM_IDS = NAVIGATION_ITEM_REGISTRY.map((item) => item.id);
const navigationId = z.enum(NAVIGATION_ITEM_IDS as [string, ...string[]]);

// These identifiers are no longer part of the active menu, but can still be
// present in a policy published before the corresponding route was retired.
// Keep this list separate from NAVIGATION_ITEM_REGISTRY so new writes cannot
// resurrect a retired item while old published snapshots remain readable.
export const RETIRED_NAVIGATION_ITEM_IDS = ["work"] as const;
export const RETIRED_NAVIGATION_PAGE_PATHS = ["/work", "/work/"] as const;

const retiredNavigationItemIds = new Set<string>(RETIRED_NAVIGATION_ITEM_IDS);
const retiredNavigationPagePaths = new Set<string>(RETIRED_NAVIGATION_PAGE_PATHS);

export function isActiveNavigationItemId(id: string): id is (typeof NAVIGATION_ITEM_IDS)[number] {
  return (NAVIGATION_ITEM_IDS as readonly string[]).includes(id);
}

export function isRetiredNavigationPagePath(path: string) {
  return retiredNavigationPagePaths.has(path);
}

export const NavigationSettingSchema = z.object({
  id: navigationId,
  label: z.string().trim().min(1).max(120),
  parentId: navigationId.nullable(),
  order: z.number().int().min(0),
  destination: z.string().regex(/^\/(?!\/)[^\s]*$/, "Destination must be a site-relative path."),
  visible: z.boolean(),
}).strict();

const UpdateNavigationSettingSchema = NavigationSettingSchema.extend({
  // Omission means "use the registry hierarchy"; null is an explicit
  // promotion to the top level.
  parentId: navigationId.nullable().optional(),
}).strict();

const registryParents = new Map<string, string | null>(
  NAVIGATION_ITEM_REGISTRY.map((item) => [
    item.id,
    "parentId" in item ? item.parentId : null,
  ]),
);

function validateNavigationHierarchy(
  items: Array<{ id: string; parentId?: string | null }>,
  context: z.RefinementCtx,
) {
  const itemIds = new Set(items.map((item) => item.id));
  const effectiveParents = new Map(registryParents);
  for (const item of items) {
    if (Object.prototype.hasOwnProperty.call(item, "parentId")) {
      effectiveParents.set(item.id, item.parentId ?? null);
    }
  }

  for (const [index, item] of items.entries()) {
    const parentId = effectiveParents.get(item.id) ?? null;
    if (parentId && (!itemIds.has(parentId) || parentId === item.id)) {
      context.addIssue({ code: "custom", message: "Parent must reference another item in this menu.", path: ["items", index, "parentId"] });
      continue;
    }

    const visited = new Set<string>([item.id]);
    let ancestorId = parentId;
    let depth = 0;
    while (ancestorId) {
      if (visited.has(ancestorId)) {
        context.addIssue({ code: "custom", message: "Navigation hierarchy cannot contain a cycle.", path: ["items", index, "parentId"] });
        break;
      }
      visited.add(ancestorId);
      depth += 1;
      if (depth > 1) {
        context.addIssue({
          code: "custom",
          message: "Only main menu and submenu levels are supported; a submenu cannot be nested under another submenu.",
          path: ["items", index, "parentId"],
        });
        break;
      }
      ancestorId = effectiveParents.get(ancestorId) ?? null;
    }
  }
}

export const PageAvailabilitySchema = z.object({
  path: z.string().regex(/^\/(?!\/)[^\s#?]*$/, "Page path must be a site-relative path without a query or fragment."),
  enabled: z.boolean(),
}).strict();

export const NavigationSettingsSchema = z.object({
  items: z.array(NavigationSettingSchema),
  pages: z.array(PageAvailabilitySchema),
  requestedMarket: z.string().min(1),
  requestedLocale: z.string().min(1),
  market: z.string().min(1),
  locale: z.string().min(1),
  usedFallback: z.boolean(),
  isConfigured: z.boolean(),
  updatedAt: z.string().datetime().nullable(),
  version: z.number().int().min(1),
}).strict().superRefine((value, context) => {
  validateNavigationHierarchy(value.items, context);
});

export const NavigationPolicySnapshotSchema = z.object({
  items: z.array(NavigationSettingSchema),
  pages: z.array(PageAvailabilitySchema),
}).strict().superRefine((value, context) => {
  validateNavigationHierarchy(value.items, context);
});

/**
 * Policies are immutable snapshots, so removing an item from the active
 * registry does not remove it from already-published JSON. Read those
 * snapshots through this narrow compatibility boundary instead of weakening
 * NavigationPolicySnapshotSchema (which validates all new writes).
 *
 * Retired overview pages are removed for the same reason: an old disabled
 * `/work` decision must not make the replacement redirect look unavailable.
 * Case-study detail paths below `/work/:slug` are deliberately preserved.
 */
export function normalizePersistedNavigationPolicy(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;

  const record = value as Record<string, unknown>;
  const items = Array.isArray(record.items)
    ? record.items
      .filter((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return true;
        const id = (item as Record<string, unknown>).id;
        return typeof id !== "string" || !retiredNavigationItemIds.has(id);
      })
      .map((item) => {
        if (!item || typeof item !== "object" || Array.isArray(item)) return item;
        const normalized = { ...(item as Record<string, unknown>) };
        if (typeof normalized.parentId === "string" && retiredNavigationItemIds.has(normalized.parentId)) {
          normalized.parentId = null;
        }
        return normalized;
      })
    : record.items;
  const pages = Array.isArray(record.pages)
    ? record.pages.filter((page) => {
      if (!page || typeof page !== "object" || Array.isArray(page)) return true;
      const path = (page as Record<string, unknown>).path;
      return typeof path !== "string" || !retiredNavigationPagePaths.has(path);
    })
    : record.pages;

  return { ...record, items, pages };
}

export function parsePersistedNavigationPolicy(value: unknown) {
  return NavigationPolicySnapshotSchema.parse(normalizePersistedNavigationPolicy(value));
}

export function safeParsePersistedNavigationPolicy(value: unknown) {
  return NavigationPolicySnapshotSchema.safeParse(normalizePersistedNavigationPolicy(value));
}

export const UpdateNavigationSettingsSchema = z.object({
  items: z.array(UpdateNavigationSettingSchema).max(NAVIGATION_ITEM_IDS.length),
  pages: z.array(PageAvailabilitySchema),
  market: z.string().min(1),
  locale: z.string().min(1),
  version: z.number().int().min(1),
}).strict().superRefine((value, context) => {
  const ids = value.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Navigation item IDs must be unique.", path: ["items"] });
  }
  const itemIds = new Set(ids);
  const pagePaths = new Set(value.pages.map((page) => page.path));
  if (pagePaths.size !== value.pages.length) context.addIssue({ code: "custom", message: "Page paths must be unique.", path: ["pages"] });
  for (const [index, item] of value.items.entries()) {
    const path = item.destination.split(/[?#]/)[0];
    if (item.visible && value.pages.find((page) => page.path === path)?.enabled === false) {
      context.addIssue({ code: "custom", message: "Visible navigation cannot link to an unavailable page.", path: ["items", index, "destination"] });
    }
  }
});

export type GovernedNavigationSettings = z.infer<typeof NavigationSettingsSchema>;
export type GovernedNavigationUpdate = z.infer<typeof UpdateNavigationSettingsSchema>;