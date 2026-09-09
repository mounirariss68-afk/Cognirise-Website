import type { MouseEvent } from "react";
import { scrollToSection } from "@/lib/motion";

export function samePageHashTarget(href: string, currentHref: string) {
  try {
    const target = new URL(href, currentHref);
    const current = new URL(currentHref);
    if (target.origin !== current.origin || target.pathname !== current.pathname || !target.hash) return null;
    return decodeURIComponent(target.hash.slice(1));
  } catch {
    return null;
  }
}

export function handleSamePageHashNavigation(event: MouseEvent<HTMLAnchorElement>, href: string) {
  const sectionId = samePageHashTarget(href, window.location.href);
  if (!sectionId || !document.getElementById(sectionId)) return false;

  event.preventDefault();
  const hash = new URL(href, window.location.href).hash;
  window.history.pushState(window.history.state, "", `${window.location.pathname}${window.location.search}${hash}`);
  scrollToSection(sectionId);
  return true;
}