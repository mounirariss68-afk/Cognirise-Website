import type { CmsDocumentKind } from "@workspace/api-zod";
import { validateCmsContent } from "@workspace/api-zod";
export { editionAuthoringActions, selectInitialExactEdition } from "./edition-authoring";
export { buildDraftSave, describeSaveFailure, isDraftSaveResponse, normalizeDraftSeo, parseDraftIssues, serverValidationIssues } from "./draft-save";

export type ReadinessItem = {
  label: string;
  ready: boolean;
  detail: string;
};

export const CONTENT_GUIDANCE: Record<CmsDocumentKind, string> = {
  person: "Create a governed profile with a public role, title, biography or contribution, and an approved identity treatment.",
  partner: "Describe the alliance, its public positioning, relationship status, and evidence.",
  platform: "Explain the platform, its category, capabilities, and reusable page sections.",
  publication: "Prepare the teaser, author and date first, then compose the structured article body.",
  "case-study": "Record disclosure and evidence classifications before adding the mandate, outcomes, and approved visual.",
  industry: "Build the industry narrative from governed capabilities, operating pressures, evidence, and imagery.",
  framework: "Document the methodology and authority examples, including the required governance boundaries.",
  office: "Provide the public city and complete postal address.",
  "site-configuration": "Configure a governed website surface using immutable approved media versions.",
  "landing-page": "Compose a governed landing page from reusable narrative sections, calls to action, SEO, and approved imagery.",
};

export function contentErrorMap(errors: string[]): Record<string, string> {
  return errors.reduce<Record<string, string>>((result, error) => {
    const separator = error.indexOf(":");
    const path = separator === -1 ? "content" : error.slice(0, separator);
    if (!result[path]) result[path] = separator === -1 ? error : error.slice(separator + 1).trim();
    return result;
  }, {});
}

export function documentReadiness(
  kind: CmsDocumentKind,
  title: string,
  content: Record<string, unknown>,
  mediaIds: string[],
): ReadinessItem[] {
  const draft = validateCmsContent(kind, content, "draft");
  const publish = validateCmsContent(kind, content, "publish");
  const referencesMedia = ["person", "partner", "platform", "publication", "case-study", "industry", "framework", "site-configuration"].includes(kind);
  return [
    {
      label: "Display title",
      ready: title.trim().length > 0,
      detail: title.trim() ? "A public display title is present." : "Add a display title.",
    },
    {
      label: "Required content",
      ready: draft.success,
      detail: draft.success ? "All type-specific required fields are valid." : `${draft.errors.length} required field issue${draft.errors.length === 1 ? "" : "s"} remain.`,
    },
    {
      label: "Approved media",
      ready: !referencesMedia || mediaIds.length > 0,
      detail: !referencesMedia || mediaIds.length > 0 ? "Media requirements are satisfied or optional." : "Choose approved media where the public presentation requires it.",
    },
    {
      label: "Publication governance",
      ready: publish.success,
      detail: publish.success ? "This edition meets publication rules." : `${publish.errors.length} review or publication issue${publish.errors.length === 1 ? "" : "s"} remain.`,
    },
  ];
}

export function collectContentMediaIds(content: Record<string, unknown>): string[] {
  const ids = new Set<string>();
  const visit = (value: unknown, key = "") => {
    if (typeof value === "string" && /MediaId$/.test(key)) ids.add(value);
    if (Array.isArray(value)) value.forEach((item) => visit(item));
    else if (value && typeof value === "object") {
      Object.entries(value as Record<string, unknown>).forEach(([childKey, child]) => visit(child, childKey));
    }
  };
  visit(content);
  return [...ids];
}
