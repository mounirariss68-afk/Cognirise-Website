import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { registerNavigationTraversalGuard } from "@/store/navigation";

export type MethodSessionStateOptions<T> = {
  validate?: (value: unknown) => value is T;
};

const OBSOLETE_ASSESSMENT_DRAFT_PREFIXES = [
  "cognirise:vts-assessment:v1",
  "cognirise:method:ai-use-case-prioritization:opportunities",
  "cognirise:method:agentic-operations-readiness:",
] as const;

/**
 * Remove only the old questionnaire drafts. Legacy readiness deletion
 * credentials live in localStorage under a different prefix and are
 * intentionally untouched.
 */
export function forgetObsoleteAssessmentDrafts(): void {
  if (typeof window === "undefined") return;
  try {
    const keysToRemove: string[] = [];
    for (let index = 0; index < window.sessionStorage.length; index += 1) {
      const key = window.sessionStorage.key(index);
      if (key && OBSOLETE_ASSESSMENT_DRAFT_PREFIXES.some((prefix) => key === prefix || (prefix.endsWith(":") && key.startsWith(prefix)))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => window.sessionStorage.removeItem(key));
  } catch {
    // Storage can be disabled; the page-memory assessment still works.
  }
}

function initialValue<T>(initial: T | (() => T)): T {
  return typeof initial === "function" ? (initial as () => T)() : initial;
}

export function parseMethodSessionState<T>(
  stored: string | null,
  fallback: T,
  validate?: (value: unknown) => value is T,
): T {
  if (stored === null) return fallback;
  try {
    const parsed: unknown = JSON.parse(stored);
    return validate && !validate(parsed) ? fallback : (parsed as T);
  } catch {
    return fallback;
  }
}

/**
 * React state for a public assessment.
 *
 * Assessment answers are deliberately page-memory-only.  Keeping this helper
 * named after the old session state API avoids changing every methodology
 * component at once, while making the interim no-saving policy explicit: a
 * route change, reload, or tab close discards the answers.
 */
export function useMethodSessionState<T>(
  key: string,
  initial: T | (() => T),
  options: MethodSessionStateOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  // Keep key/options in the signature for source compatibility with the
  // existing tools. They intentionally do not participate in persistence.
  void key;
  void options;
  useEffect(() => {
    forgetObsoleteAssessmentDrafts();
  }, []);
  return useState<T>(() => initialValue(initial));
}

/**
 * Preferred name for new assessment work. This is intentionally a small
 * in-memory hook rather than a persistence abstraction.
 */
export function useAssessmentMemory<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  useEffect(() => {
    forgetObsoleteAssessmentDrafts();
  }, []);
  return useState<T>(() => initialValue(initial));
}

/**
 * Warn before a navigation that would throw away an unfinished assessment.
 * The warning is never installed for an empty page, and browsers decide the
 * exact wording of their native dialog.
 */
export function useUnsavedWorkWarning(isDirty: boolean): void {
  useEffect(() => {
    if (!isDirty || typeof window === "undefined") return;
    const message = "You have unfinished assessment work. Leave this page and lose it?";
    const confirmLeave = () => window.confirm(message);
    const leavesDocument = (url: string | URL | null | undefined) => {
      if (!url) return true;
      const next = new URL(String(url), window.location.href);
      const current = new URL(window.location.href);
      return next.origin !== current.origin || next.pathname !== current.pathname || next.search !== current.search;
    };
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const originalPushState = window.history.pushState;
    const originalReplaceState = window.history.replaceState;
    let lastSafeUrl = window.location.href;
    let lastSafeState = window.history.state;
    const guardedPushState: typeof window.history.pushState = function guardedPushState(this: History, ...args) {
      if (leavesDocument(args[2]) && !confirmLeave()) return;
      const result = originalPushState.apply(this, args);
      lastSafeUrl = window.location.href;
      lastSafeState = window.history.state;
      return result;
    };
    const guardedReplaceState: typeof window.history.replaceState = function guardedReplaceState(this: History, ...args) {
      if (leavesDocument(args[2]) && !confirmLeave()) return;
      const result = originalReplaceState.apply(this, args);
      lastSafeUrl = window.location.href;
      lastSafeState = window.history.state;
      return result;
    };
    const cancelBackNavigation = (event: PopStateEvent) => {
      const next = new URL(window.location.href);
      const current = new URL(lastSafeUrl);
      if (next.pathname === current.pathname && next.search === current.search) {
        lastSafeUrl = window.location.href;
        lastSafeState = event.state;
        return;
      }
      if (confirmLeave()) {
        lastSafeUrl = window.location.href;
        lastSafeState = event.state;
        return;
      }
      // Restore the route synchronously during capture so wouter never sees
      // the rejected location and cannot unmount the in-memory questionnaire.
      event.stopImmediatePropagation();
      originalPushState.call(window.history, lastSafeState, "", lastSafeUrl);
    };
    window.history.pushState = guardedPushState;
    window.history.replaceState = guardedReplaceState;
    window.addEventListener("beforeunload", warn);
    const unregisterTraversalGuard = registerNavigationTraversalGuard(cancelBackNavigation);
    return () => {
      if (window.history.pushState === guardedPushState) window.history.pushState = originalPushState;
      if (window.history.replaceState === guardedReplaceState) window.history.replaceState = originalReplaceState;
      window.removeEventListener("beforeunload", warn);
      unregisterTraversalGuard();
    };
  }, [isDirty]);
}