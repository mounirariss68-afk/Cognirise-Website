import { serverValidationIssues } from "./draft-save";

export type DocumentActionError = {
  message: string;
  issues: ReturnType<typeof serverValidationIssues>;
  mediaBlocked: boolean;
  committed?: boolean;
};

export function describeActionError(error: unknown): DocumentActionError {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const data = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown> : record;
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
  const committed = data.committed === true
    || data.code === "DOCUMENT_SUBMIT_COMMITTED"
    || data.code === "DOCUMENT_PUBLISH_COMMITTED"
    || record.committed === true;
  const message = text(data.error) ?? text(data.message) ?? text(record.message)
    ?? "The action could not be completed. Check your connection and try again.";
  const issues = serverValidationIssues({ data });
  return {
    message,
    issues,
    mediaBlocked: /media/i.test(message) || issues.some(({ message, path }) => /media/i.test(`${path} ${message}`)),
    committed,
  };
}