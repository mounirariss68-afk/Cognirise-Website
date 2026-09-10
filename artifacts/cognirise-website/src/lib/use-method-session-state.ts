import { useEffect, useState, type Dispatch, type SetStateAction } from "react";

export type MethodSessionStateOptions<T> = {
  validate?: (value: unknown) => value is T;
};

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
 * React state that is restored only within the current browser tab.
 *
 * sessionStorage is intentionally used instead of localStorage: method inputs
 * survive navigation and reloads, but are not shared with the server or other
 * tabs and are discarded when the tab's session ends.
 */
export function useMethodSessionState<T>(
  key: string,
  initial: T | (() => T),
  options: MethodSessionStateOptions<T> = {},
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    const fallback = initialValue(initial);
    if (typeof window === "undefined") return fallback;

    try {
      const stored = window.sessionStorage.getItem(key);
      return parseMethodSessionState(stored, fallback, options.validate);
    } catch {
      return fallback;
    }
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Storage can be disabled or full. The in-memory assessment still works.
    }
  }, [key, state]);

  return [state, setState];
}