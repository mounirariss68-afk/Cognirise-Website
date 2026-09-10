import type { ReadinessAnswers } from "@workspace/api-client-react";

const QUERY_PARAM = "readiness";
const DELETE_TOKEN_PREFIX = "cognirise:readiness-delete:";

export function getSavedReadinessId(search: string): string | null {
  return new URLSearchParams(search).get(QUERY_PARAM);
}

export function readinessShareUrl(id: string): string {
  const url = new URL(window.location.href);
  url.searchParams.set(QUERY_PARAM, id);
  url.hash = "assessment";
  return url.toString();
}

export function replaceReadinessUrl(id: string | null): void {
  const url = new URL(window.location.href);
  if (id) url.searchParams.set(QUERY_PARAM, id);
  else url.searchParams.delete(QUERY_PARAM);
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

export function storeReadinessDeleteToken(id: string, token: string): void {
  window.localStorage.setItem(`${DELETE_TOKEN_PREFIX}${id}`, token);
}

export function getReadinessDeleteToken(id: string): string | null {
  return window.localStorage.getItem(`${DELETE_TOKEN_PREFIX}${id}`);
}

export function forgetReadinessDeleteToken(id: string): void {
  window.localStorage.removeItem(`${DELETE_TOKEN_PREFIX}${id}`);
}

export function isCompleteReadinessAnswers(
  answers: Partial<ReadinessAnswers>,
): answers is ReadinessAnswers {
  return [
    "stability",
    "access",
    "observability",
    "fallback",
    "exceptions",
    "economics",
  ].every((id) => Boolean(answers[id as keyof ReadinessAnswers]));
}