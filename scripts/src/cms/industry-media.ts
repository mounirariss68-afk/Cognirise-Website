export interface PulseIndustryMediaDefinition {
  sector: string;
  slug: string | null;
  role?: "hero" | "supporting";
  filename: string;
  publicPath: string;
  width?: number;
  height?: number;
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
    filename: "pulse-industry-education-campus-v3.png",
    publicPath: "/images/cognirise/industries/pulse-industry-education-campus-v3.png",
    width: 1024,
    height: 1024,
    altText: "A sunlit education campus atrium connects library shelves, tiered learning spaces and glazed science rooms along restrained violet and coral light paths.",
    usage: "CMS industry hero: Education",
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

export const educationDraftReceiptOperations = [
  "cms.inventory.education-successor-pending-cutover",
  "cms.inventory.import",
] as const;

/** Payload, document, key and request digest are checked by the caller.
 * A generic import receipt can authorize only the first, unpublished draft. */
export function educationDraftReceiptAllowed(
  operation: string | undefined,
  revisionNumber: number,
  publishedRevisionId: string | null,
): boolean {
  return operation === educationDraftReceiptOperations[0]
    || (operation === educationDraftReceiptOperations[1]
      && revisionNumber === 1 && publishedRevisionId === null);
}

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