import { ALLIANCE_PLATFORMS } from "./alliancePlatforms";

export type PlatformCatalogItem = {
  slug: "cognios" | "cogniagents" | "cognidocs" | "cognibase" | "lupitor" | "datatoolpack" | "bunjee-ai";
  name: string;
  href: string;
  ownership: "cognirise" | "partner";
  description: string;
};

export const PLATFORM_CATALOG: readonly PlatformCatalogItem[] = [
  {
    slug: "cognios",
    name: "CogniOS",
    href: "/platforms/cognios",
    ownership: "cognirise",
    description: "The core operating system for governed enterprise intelligence.",
  },
  {
    slug: "cogniagents",
    name: "CogniAgents",
    href: "/platforms/cogniagents",
    ownership: "cognirise",
    description: "Governed agents coordinating operational tasks.",
  },
  {
    slug: "cognidocs",
    name: "CogniDocs",
    href: "/platforms/cognidocs",
    ownership: "cognirise",
    description: "Knowledge made available with context and control.",
  },
  {
    slug: "cognibase",
    name: "CogniBase",
    href: "/platforms/cognibase",
    ownership: "cognirise",
    description: "Composable intelligence integrations for enterprise systems.",
  },
  {
    slug: "lupitor",
    name: ALLIANCE_PLATFORMS.lupitor.name,
    href: "/platforms/lupitor",
    ownership: "partner",
    description: ALLIANCE_PLATFORMS.lupitor.summary,
  },
  {
    slug: "datatoolpack",
    name: "Datatoolpack",
    href: "/platforms/datatoolpack",
    ownership: "partner",
    description: ALLIANCE_PLATFORMS.datatoolpack.summary,
  },
  {
    slug: "bunjee-ai",
    name: ALLIANCE_PLATFORMS["bunjee-ai"].name,
    href: "/platforms/bunjee-ai",
    ownership: "partner",
    description: ALLIANCE_PLATFORMS["bunjee-ai"].summary,
  },
] as const;

export type PublishedPlatformSummary = {
  slug: string;
  description?: string | null;
};

const CMS_SLUG_ALIASES: Readonly<Record<string, PlatformCatalogItem["slug"]>> = {
  cognios: "cognios",
  cogniagents: "cogniagents",
  cognidocs: "cognidocs",
  cognibase: "cognibase",
  cogniware: "cognibase",
};

export function composePlatformCatalog(published: readonly PublishedPlatformSummary[]): PlatformCatalogItem[] {
  const descriptions = new Map<PlatformCatalogItem["slug"], string>();
  for (const item of published) {
    const canonicalSlug = CMS_SLUG_ALIASES[item.slug.toLowerCase()];
    const description = item.description?.trim();
    if (canonicalSlug && description && !descriptions.has(canonicalSlug)) {
      descriptions.set(canonicalSlug, description);
    }
  }
  return PLATFORM_CATALOG.map((platform) => platform.ownership === "cognirise" && descriptions.has(platform.slug)
    ? { ...platform, description: descriptions.get(platform.slug)! }
    : { ...platform });
}