export type IndustryCapability = {
  title: string;
  body: string;
};

export function industryCapabilities(value: unknown): IndustryCapability[] {
  if (!Array.isArray(value)) return [];

  return value.map((item) => {
    const capability = item && typeof item === "object"
      ? item as Record<string, unknown>
      : {};
    return {
      title: typeof capability.title === "string" ? capability.title : "",
      body: typeof capability.body === "string" ? capability.body : "",
    };
  });
}

export function addIndustryCapability(value: unknown): IndustryCapability[] {
  return [...industryCapabilities(value), { title: "", body: "" }];
}

export function changeIndustryCapability(
  value: unknown,
  index: number,
  field: keyof IndustryCapability,
  next: string,
): IndustryCapability[] {
  return industryCapabilities(value).map((capability, capabilityIndex) =>
    capabilityIndex === index ? { ...capability, [field]: next } : capability
  );
}

export function removeIndustryCapability(value: unknown, index: number): IndustryCapability[] {
  return industryCapabilities(value).filter((_, capabilityIndex) => capabilityIndex !== index);
}