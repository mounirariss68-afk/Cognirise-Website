export type AssistantOperation = "quality-review" | "rewrite" | "summary" | "report-abstract" | "seo-metadata";
export type AssistantContentType = "page" | "publication" | "person" | "organization";
export type AssistantFieldPath = "title" | "summary" | "dek" | "name" | "role" | "website" | "seo.metaTitle" | "seo.metaDescription";

export type AssistantTarget = {
  contentType: AssistantContentType;
  fieldPath: AssistantFieldPath;
  label: string;
  value: string;
  maxLength: number;
  operations: readonly AssistantOperation[];
};

const text = (value: unknown): string | undefined => typeof value === "string" && value.length > 0 ? value : undefined;
const record = (value: unknown): Record<string, unknown> | undefined =>
  typeof value === "object" && value !== null && !Array.isArray(value) ? value as Record<string, unknown> : undefined;
// Rewrite is intentionally omitted: it is disabled by the server's default
// capability set, while quality-review is enabled and still returns a bounded
// replacement suggestion.
const general = ["quality-review"] as const;

function target(contentType: AssistantContentType, fieldPath: AssistantFieldPath, label: string, value: unknown, operations: readonly AssistantOperation[] = general): AssistantTarget | undefined {
  const current = text(value);
  if (!current) return;
  return { contentType, fieldPath, label, value: current, maxLength: Math.min(12_000, Math.max(1, current.length * 2)), operations };
}

/** Maps normalized CMS revision content to the strict assistant target contract. */
export function assistantTargets(kind: unknown, payload: unknown): AssistantTarget[] {
  const content = record(record(payload)?.content);
  if (!content || !["page", "publication", "person", "organization"].includes(String(kind))) return [];
  const contentType = kind as AssistantContentType;
  const seo = record(content.seo);
  const values: Array<AssistantTarget | undefined> = [];
  if (contentType === "page") {
    values.push(target(contentType, "title", "Title", content.title));
    values.push(target(contentType, "summary", "Summary", content.summary, ["summary"]));
  } else if (contentType === "publication") {
    values.push(target(contentType, "title", "Title", content.title));
    values.push(target(contentType, "dek", "Dek", content.dek, ["summary", "report-abstract"]));
  } else if (contentType === "person") {
    values.push(target(contentType, "name", "Name", content.name));
    values.push(target(contentType, "role", "Role", content.role));
  } else {
    values.push(target(contentType, "name", "Name", content.name));
    values.push(target(contentType, "website", "Website", content.website));
  }
  if (contentType === "page" || contentType === "publication") {
    values.push(target(contentType, "seo.metaTitle", "SEO meta title", seo?.metaTitle, ["seo-metadata"]));
    values.push(target(contentType, "seo.metaDescription", "SEO meta description", seo?.metaDescription, ["seo-metadata"]));
  }
  return values.filter((value): value is AssistantTarget => value !== undefined);
}