import { useEffect, useState } from "react";

const KEY = "cognirise-method-exploration";
const METHODS = new Set([
  "ai-value-to-scale", "ai-use-case-prioritization",
  "agentic-operations-readiness", "human-agent-operating-model",
]);
type Visit = { from: string; to: string; title: string; scroll: number };

function localMethod(url: URL): boolean {
  return url.origin === window.location.origin &&
    /\/methodologies(?:\/|$)/.test(url.pathname);
}

function readVisit(): Visit | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(KEY) || "null");
    if (!value || typeof value.from !== "string" || typeof value.to !== "string" ||
      typeof value.title !== "string" || !Number.isFinite(value.scroll)) return null;
    const from = new URL(value.from, window.location.origin);
    const to = new URL(value.to, window.location.origin);
    return localMethod(from) && localMethod(to) ? value : null;
  } catch { return null; }
}

/** Scoped to supporting pages: canonical pages never mount this behavior. */
export function useMethodReturn(title: string) {
  const [visit] = useState(readVisit);
  const current = window.location.pathname + window.location.search;
  const incoming = visit && new URL(visit.to, window.location.origin).pathname +
    new URL(visit.to, window.location.origin).search === current ? visit : null;
  const originSlug = incoming?.from.split("?")[0].split("#")[0].split("/").pop();
  const hasSupportingOrigin = originSlug && METHODS.has(originSlug);

  useEffect(() => {
    const previous = readVisit();
    const source = previous && new URL(previous.from, window.location.origin);
    let frame = 0;
    let secondFrame = 0;
    if (source && source.pathname + source.search === current && source.hash === window.location.hash) {
      frame = requestAnimationFrame(() => {
        secondFrame = requestAnimationFrame(() => {
          window.scrollTo({ top: Math.max(0, previous!.scroll), behavior: "instant" });
        });
      });
    }
    const remember = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element)?.closest<HTMLAnchorElement>("a[href]");
      if (!link || link.target === "_blank" || link.hasAttribute("data-method-return")) return;
      const destination = new URL(link.href);
      if (!localMethod(destination) || destination.pathname === window.location.pathname) return;
      try {
        sessionStorage.setItem(KEY, JSON.stringify({
          from: window.location.pathname + window.location.search + window.location.hash,
          to: destination.pathname + destination.search,
          title, scroll: window.scrollY,
        } satisfies Visit));
      } catch { /* Navigation still works when browser storage is disabled. */ }
    };
    document.addEventListener("click", remember, true);
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(secondFrame);
      document.removeEventListener("click", remember, true);
    };
  }, [current, title]);

  return {
    href: hasSupportingOrigin ? incoming!.from : "/methodologies#route-navigator",
    label: hasSupportingOrigin ? `Back to ${incoming!.title}` : "Back to your situation",
  };
}