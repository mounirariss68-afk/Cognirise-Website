import { z } from "zod";

export const NAVIGATION_ITEM_REGISTRY = [
  { id: "what-we-do", label: "What we do" },
  { id: "methodologies", label: "Frameworks & Methodologies" },
  { id: "methodologies.idao", label: "IDAO", parentId: "methodologies" },
  { id: "methodologies.agent-authority", label: "Agent Authority Model", parentId: "methodologies" },
  { id: "platforms", label: "Platforms" },
  { id: "platforms.overview", label: "Platform Overview", parentId: "platforms" },
  { id: "platforms.cognios", label: "CogniOS", parentId: "platforms" },
  { id: "platforms.architecture", label: "Architecture", parentId: "platforms" },
  { id: "platforms.cognidocs", label: "CogniDocs", parentId: "platforms" },
  { id: "platforms.cogniagents", label: "CogniAgents", parentId: "platforms" },
  { id: "platforms.cognitalk", label: "CogniTalk", parentId: "platforms" },
  { id: "platforms.cogniware", label: "CogniWare", parentId: "platforms" },
  { id: "industries", label: "Industries" },
  { id: "industries.overview", label: "Industries Overview", parentId: "industries" },
  { id: "industries.banking", label: "Banking & Financial Services", parentId: "industries" },
  { id: "industries.public-sector", label: "Public Sector", parentId: "industries" },
  { id: "industries.telecoms", label: "Telecoms", parentId: "industries" },
  { id: "industries.travel", label: "Travel & Hospitality", parentId: "industries" },
  { id: "industries.energy", label: "Energy & Resources", parentId: "industries" },
  { id: "industries.manufacturing", label: "Manufacturing & Conglomerates", parentId: "industries" },
  { id: "work", label: "Work" },
  { id: "insights", label: "Insights" },
  { id: "about", label: "About" },
  { id: "about.leadership", label: "Firm & Leadership", parentId: "about" },
  { id: "about.partners", label: "Partners", parentId: "about" },
  { id: "about.faq", label: "FAQ", parentId: "about" },
  { id: "about.contact", label: "Contact", parentId: "about" },
] as const;

export const NAVIGATION_ITEM_IDS = NAVIGATION_ITEM_REGISTRY.map((item) => item.id);
const navigationId = z.enum(NAVIGATION_ITEM_IDS as [string, ...string[]]);

export const NavigationSettingSchema = z.object({
  id: navigationId,
  enabled: z.boolean(),
}).strict();

export const NavigationSettingsSchema = z.object({
  items: z.array(NavigationSettingSchema),
  updatedAt: z.string().datetime().nullable(),
}).strict();

export const UpdateNavigationSettingsSchema = z.object({
  items: z.array(NavigationSettingSchema).min(1).max(NAVIGATION_ITEM_IDS.length),
}).strict().superRefine((value, context) => {
  const ids = value.items.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    context.addIssue({ code: "custom", message: "Navigation item IDs must be unique.", path: ["items"] });
  }
});

export type GovernedNavigationSettings = z.infer<typeof NavigationSettingsSchema>;
export type GovernedNavigationUpdate = z.infer<typeof UpdateNavigationSettingsSchema>;