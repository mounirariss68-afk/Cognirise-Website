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