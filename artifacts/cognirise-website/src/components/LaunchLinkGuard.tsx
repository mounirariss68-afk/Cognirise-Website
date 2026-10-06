import { useLayoutEffect } from "react";
import { launchHrefAllowed } from "@workspace/api-zod";

/** Covers rich CMS text and legacy anchors as well as the filtered menus.
 * Retains inline text, but removes the link and blocks legacy React handlers. */
export function LaunchLinkGuard() {
  useLayoutEffect(() => {
    const blocked = new WeakSet<Element>();
    const clean = () => {
      document.querySelectorAll<HTMLAnchorElement>("a[href]").forEach((anchor) => {
        const href = anchor.getAttribute("href")!;
        if (launchHrefAllowed(href)) return;
        blocked.add(anchor);
        anchor.removeAttribute("href");
        anchor.removeAttribute("target");
        anchor.setAttribute("aria-disabled", "true");
        anchor.tabIndex = -1;
        anchor.style.cursor = "default";
      });
    };
    const prevent = (event: Event) => {
      const anchor = (event.target as Element)?.closest?.("a");
      if (anchor && (blocked.has(anchor) || !launchHrefAllowed(anchor.getAttribute("href") || ""))) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    clean();
    const observer = new MutationObserver(clean);
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["href"] });
    document.addEventListener("click", prevent, true);
    document.addEventListener("auxclick", prevent, true);
    return () => {
      observer.disconnect();
      document.removeEventListener("click", prevent, true);
      document.removeEventListener("auxclick", prevent, true);
    };
  }, []);
  return null;
}
