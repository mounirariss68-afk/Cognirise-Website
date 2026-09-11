export interface PulseIndustryMediaDefinition {
  sector: string;
  slug: string | null;
  role?: "hero" | "supporting";
  imagerySlot?: "educatorPractice" | "researchCoordination";
  filename: string;
  publicPath: string;
  altText: string;
  usage: string;
}

export const pulseIndustryMedia: PulseIndustryMediaDefinition[] = [
  {
    sector: "Financial Services",
    slug: "financial-services",
    filename: "pulse-industry-financial-services.png",
    publicPath: "/images/cognirise/industries/pulse-industry-financial-services.png",
    altText: "Transparent custody chambers and luminous governed transaction paths converging through a financial operations landscape.",
    usage: "CMS industry hero: Financial Services",
  },
  {
    sector: "Telecoms",
    slug: "telecoms",
    filename: "pulse-industry-telecoms-network.png",
    publicPath: "/images/cognirise/industries/pulse-industry-telecoms-network.png",
    altText: "Distributed communications nodes linked by luminous signals across a wide network landscape.",
    usage: "CMS industry hero: Telecoms",
  },
  {
    sector: "Travel & Hospitality",
    slug: "travel-hospitality",
    filename: "pulse-industry-travel-hospitality.png",
    publicPath: "/images/cognirise/industries/pulse-industry-travel-hospitality.png",
    altText: "Luminous passenger routes rerouting through a layered terminal as an aircraft departs in the distance.",
    usage: "CMS industry hero: Travel & Hospitality",
  },
  {
    sector: "Energy & Resources",
    slug: "energy-resources",
    filename: "pulse-industry-energy-resources.png",
    publicPath: "/images/cognirise/industries/pulse-industry-energy-resources.png",
    altText: "Luminous operational signals moving through geological layers and field infrastructure toward a controlled intervention.",
    usage: "CMS industry hero: Energy & Resources",
  },
  {
    sector: "Public Sector",
    slug: "public-sector",
    filename: "pulse-industry-public-sector-services.png",
    publicPath: "/images/cognirise/industries/pulse-industry-public-sector-services.png",
    altText: "Citizens receiving documents and support at an accessible civic service centre linked by luminous service routes.",
    usage: "CMS industry hero: Public Sector",
  },
  {
    sector: "Education",
    slug: "education",
    role: "hero",
    filename: "pulse-industry-education-hero-v2.png",
    publicPath: "/images/cognirise/industries/pulse-industry-education-hero-v2.png",
    altText: "A school learner, university learner, educator and researcher collaborate around a learning table in a light-filled campus studio.",
    usage: "CMS industry hero: Education",
  },
  {
    sector: "Education",
    slug: "education",
    role: "supporting",
    imagerySlot: "educatorPractice",
    filename: "pulse-industry-education-practice-v2.png",
    publicPath: "/images/cognirise/industries/pulse-industry-education-practice-v2.png",
    altText: "Four distinct educators collaboratively reviewing lesson materials around a table in a bright professional-learning studio.",
    usage: "CMS industry supporting media: Education educator practice",
  },
  {
    sector: "Education",
    slug: "education",
    role: "supporting",
    imagerySlot: "researchCoordination",
    filename: "pulse-industry-education-research-v2.png",
    publicPath: "/images/cognirise/industries/pulse-industry-education-research-v2.png",
    altText: "Three distinct university colleagues coordinate a reviewable research plan around a transparent table.",
    usage: "CMS industry supporting media: Education research coordination",
  },
  {
    sector: "Manufacturing",
    slug: null,
    filename: "pulse-industry-manufacturing-production.png",
    publicPath: "/images/cognirise/industries/pulse-industry-manufacturing-production.png",
    altText: "Precision components moving through coordinated production cells toward a transparent inspection chamber.",
    usage: "Governed industry-family asset; unassociated until a Manufacturing industry record is separately approved",
  },
  {
    sector: "Defense",
    slug: null,
    filename: "pulse-industry-defense-protection.png",
    publicPath: "/images/cognirise/industries/pulse-industry-defense-protection.png",
    altText: "Signals filtered through translucent security layers around a hardened communications and radar complex.",
    usage: "Governed industry-family asset; unassociated until a Defense industry record is separately approved",
  },
  {
    sector: "Retail & CPG",
    slug: null,
    filename: "pulse-industry-retail-cpg-demand.png",
    publicPath: "/images/cognirise/industries/pulse-industry-retail-cpg-demand.png",
    altText: "Luminous demand and replenishment routes connecting consumer products, inventory modules, and fulfilment shelves.",
    usage: "Governed industry-family asset; unassociated until a Retail and CPG industry record is separately approved",
  },
];

export const pulseIndustryMediaByFilename = new Map(
  pulseIndustryMedia.map((item) => [item.filename, item]),
);

export const pulseIndustryMediaBySlug = new Map(
  pulseIndustryMedia.flatMap((item) => item.slug && item.role !== "supporting" ? [[item.slug, item] as const] : []),
);

export const educationSupportingMedia = pulseIndustryMedia.filter((item) =>
  item.slug === "education" && item.role === "supporting",
);

export function industryPublicationPinAction(input: {
  workflowState: string | null | undefined;
  mediaIds: unknown;
  heroMediaId: unknown;
  expectedAssetId: string;
  expectedVersionId: string;
  referenceVersionIds: Array<string | null>;
  expectedSupportingMedia?: Array<{ assetId: string; versionId: string }>;
}): "complete" | "insert-reference" | "blocked" {
  const expectedMedia = [
    { assetId: input.expectedAssetId, versionId: input.expectedVersionId },
    ...(input.expectedSupportingMedia ?? []),
  ];
  if (!Array.isArray(input.mediaIds)) return "blocked";
  const mediaIds = input.mediaIds;
  if (
    input.workflowState !== "approved"
    || mediaIds.length !== expectedMedia.length
    || expectedMedia.some((media, index) => mediaIds[index] !== media.assetId)
    || input.heroMediaId !== input.expectedAssetId
  ) return "blocked";
  if (input.referenceVersionIds.length === 0) return "insert-reference";
  return input.referenceVersionIds.length === expectedMedia.length
    && expectedMedia.every((media, index) => input.referenceVersionIds[index] === media.versionId)
    ? "complete"
    : "blocked";
}