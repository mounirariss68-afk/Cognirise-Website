import { serverValidationIssues } from "./draft-save";

export function describeActionError(error: unknown) {
  const record = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const data = record.data && typeof record.data === "object"
    ? record.data as Record<string, unknown> : record;
  const text = (value: unknown) => typeof value === "string" && value.trim() ? value : undefined;
  const message = text(data.error) ?? text(data.message) ?? text(record.message)
    ?? "The action could not be completed. Check your connection and try again.";
  const issues = serverValidationIssues({ data });
  return {
    message,
    issues,
    mediaBlocked: /media/i.test(message) || issues.some(({ message, path }) => /media/i.test(`${path} ${message}`)),
  };
}