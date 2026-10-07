/**
 * The fixed top-level industry composition. This is intentionally a rendering
 * contract rather than a CMS schema field: revisions keep their existing
 * structured content and never persist ordering or section IDs.
 */
export const INDUSTRY_SECTION_IDS = [
  "hero",
  "opportunity",
  "pressures",
  "capabilities",
  "applications",
  "perspective",
  "market",
  "sources",
  "cta",
] as const;

import { PUBLIC_SECTOR_NATIVE_SECTION_IDS } from "./public-sector-native";
export type IndustrySectionId = (typeof INDUSTRY_SECTION_IDS)[number] | (typeof PUBLIC_SECTOR_NATIVE_SECTION_IDS)[number];
export const INDUSTRY_PREVIEW_STATUSES = ["ready", "unavailable", "expired", "revoked"] as const;
export type IndustryPreviewStatus = (typeof INDUSTRY_PREVIEW_STATUSES)[number];

export const INDUSTRY_SECTION_OUTLINE = [
  { id: "hero", label: "Hero and industry proposition" },
  { id: "opportunity", label: "Opportunity and strategic shift" },
  { id: "pressures", label: "Operating pressures" },
  { id: "capabilities", label: "Value domains and capabilities" },
  { id: "applications", label: "Representative applications" },
  { id: "perspective", label: "Perspective and adoption guidance" },
  { id: "market", label: "Market context" },
  { id: "sources", label: "Sources and further evidence" },
  { id: "cta", label: "Value Scan and contact" },
] as const satisfies ReadonlyArray<{ id: IndustrySectionId; label: string }>;

/**
 * Structured-content paths owned by each fixed visual section. The map is
 * shared with authoring validation only; it is not persisted into revisions.
 */
export const INDUSTRY_SECTION_CONTENT_PATHS: Readonly<Record<(typeof INDUSTRY_SECTION_IDS)[number], readonly string[]>> = {
  hero: [
    "legacyPath", "name", "shortName", "thesis", "accent", "dek", "image", "imageAlt", "heroMedia", "heroMediaId", "variant",
    "bankingPov.descriptor", "bankingPov.hero",
    "educationPov.introduction", "publicSectorPov.marketLabel",
  ],
  opportunity: [
    "telecomPov.valuePools", "telecomPov.note",
    "opportunity", "educationPov.strategicShift", "bankingPov.valueOutcomes", "publicSectorPov.opportunity",
  ],
  pressures: [
    "telecomPov.candidates",
    "pressures", "educationPov.convictions", "bankingPov.adoptionLevels", "publicSectorPov.pressuresHeading",
  ],
  capabilities: [
    "telecomPov.departments", "telecomPov.architecture",
    "capabilities", "educationPov.valueDomains", "educationPov.targetState", "educationPov.imagery",
    "bankingPov.valueDomains", "bankingPov.startingPoints", "publicSectorPov.capabilitiesIntroduction",
  ],
  applications: [
    "telecomPov.scenarios", "telecomPov.rafm", "telecomPov.adaptations",
    "uses", "educationPov.applications", "educationPov.signals", "bankingPov.voiceBanking", "publicSectorPov.applicationsDisclaimer",
  ],
  perspective: [
    "telecomPov.capabilityRange", "telecomPov.delivery",
    "reversal", "myth", "educationPov.patternQuote", "educationPov.globalDirection", "educationPov.roadmap",
    "bankingPov.productionReadiness", "bankingPov.deliveryPath",
  ],
  market: [
    "telecomPov.marketConstraints",
    "gcc", "educationPov.leadershipTest", "bankingPov.market", "publicSectorPov.marketHeading", "publicSectorPov.marketContext",
  ],
  sources: [
    "telecomPov.metrics", "telecomPov.reviewBlockers",
    "sources", "bankingPov.evidenceSignals", "bankingPov.partners", "bankingPov.caseMembershipSnapshot", "publicSectorPov.sourcesIntroduction", "publicSectorPov.reviewBlockers",
  ],
  cta: ["selectedWork", "service", "bankingPov.cta", "publicSectorPov.nextAction", "telecomPov.entryPoints"],
};

export function belongsToIndustrySection(path: string, section: IndustrySectionId) {
  const contentPath = path.replace(/^content\./, "");
  const nativeIndex = PUBLIC_SECTOR_NATIVE_SECTION_IDS.indexOf(section as typeof PUBLIC_SECTOR_NATIVE_SECTION_IDS[number]);
  if (contentPath.startsWith("publicSectorNative.")) {
    if (nativeIndex >= 0) return contentPath.startsWith(`publicSectorNative.sections.${nativeIndex}.`)
      || contentPath === `publicSectorNative.sections.${nativeIndex}`
      || (section === "research" && /publicSectorNative\.(researchDateQualification|reviewBlockers|sourceDate)/.test(contentPath));
    return section === "hero" && /^publicSectorNative\.(market|marketLabel|version)$/.test(contentPath);
  }
  return (INDUSTRY_SECTION_CONTENT_PATHS[section as keyof typeof INDUSTRY_SECTION_CONTENT_PATHS] ?? []).some((prefix) =>
    contentPath === prefix || contentPath.startsWith(`${prefix}.`),
  );
}

export function isIndustrySectionId(value: unknown): value is IndustrySectionId {
  return typeof value === "string" && [...INDUSTRY_SECTION_IDS, ...PUBLIC_SECTOR_NATIVE_SECTION_IDS].includes(value as IndustrySectionId);
}

export function isIndustryPreviewStatusMessage(value: unknown): value is {
  type: "industry-preview-status";
  status: IndustryPreviewStatus;
} {
  if (!value || typeof value !== "object") return false;
  const message = value as Record<string, unknown>;
  return message.type === "industry-preview-status"
    && typeof message.status === "string"
    && (INDUSTRY_PREVIEW_STATUSES as readonly string[]).includes(message.status);
}