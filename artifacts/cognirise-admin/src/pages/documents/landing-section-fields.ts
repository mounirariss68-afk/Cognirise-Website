import { landingPageSlotContract } from "@workspace/api-zod";

export function governedLandingSlotType(pagePath: unknown, slotId: unknown) {
  if (typeof pagePath !== "string" || typeof slotId !== "string") return undefined;
  const contract = (landingPageSlotContract as Record<string, Record<string, string>>)[pagePath];
  return contract && Object.hasOwn(contract, slotId) ? contract[slotId] : undefined;
}

export function newLandingNarrativeSection(index: number) {
  return {
    type: "narrative" as const,
    id: `section-${index + 1}`,
    order: index,
    body: [{ type: "paragraph" as const, text: "" }],
  };
}

export function updateLandingSection(
  sections: Array<Record<string, unknown>>,
  index: number,
  patch: Record<string, unknown>,
) {
  return sections.map((section, current) => current === index ? { ...section, ...patch } : section);
}