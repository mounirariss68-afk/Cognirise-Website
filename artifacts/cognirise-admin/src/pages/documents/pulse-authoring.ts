import { cognibasePulseDraftContent, cogniagentsPulseDraftContent } from "@workspace/api-zod";

export type PulseTemplate = "cognibase-pulse" | "cogniagents-pulse";
export const pulseTemplates: PulseTemplate[] = ["cognibase-pulse", "cogniagents-pulse"];

export function pulseTemplateForSlug(slug: string): PulseTemplate | null {
  const normalized = slug.trim().toLowerCase();
  return normalized === "cognibase" ? "cognibase-pulse"
    : normalized === "cogniagents" ? "cogniagents-pulse" : null;
}

export function pulseDefault(template: PulseTemplate): Record<string, any> {
  // Never hand the editor the shared default's mutable nested objects.
  return structuredClone(template === "cognibase-pulse" ? cognibasePulseDraftContent : cogniagentsPulseDraftContent);
}

export function hasAuthoredPlatformContent(value: Record<string, any>): boolean {
  return Boolean(
    value.pulsePage || value.cta || value.heroMedia || value.heroMediaId
    || (Array.isArray(value.sections) && value.sections.length)
    || (Array.isArray(value.capabilities) && value.capabilities.length)
    || (Array.isArray(value.differentiators) && value.differentiators.length)
    || (typeof value.summary === "string" && value.summary.trim())
    || (typeof value.category === "string" && value.category.trim()),
  );
}

/** Keep governance independent of template copy when changing a page's composition. */
export function replacePlatformTemplate(value: Record<string, any>, template: "standard" | "cognios-specialist" | PulseTemplate): Record<string, any> {
  if (pulseTemplates.includes(template as PulseTemplate)) {
    const next = pulseDefault(template as PulseTemplate);
    for (const key of ["visibility", "order", "sources", "relatedIds", "verificationDate", "reviewDate"]) {
      if (value[key] !== undefined) next[key] = value[key];
    }
    return next;
  }
  const { pulsePage: _discarded, ...rest } = value;
  return { ...rest, template };
}

export function pulseCreationContent(kind: string, slug: string, current: Record<string, any>): Record<string, any> {
  const template = kind === "platform" ? pulseTemplateForSlug(slug) : null;
  return template ? replacePlatformTemplate(current, template) : current;
}