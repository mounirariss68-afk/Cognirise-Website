---
name: Website browser validation routing
description: How to target the Cognirise website in browser-level validation without bypassing Replit's split workflow routing.
---

Run shell-managed Chromium checks against the managed local proxy at `http://127.0.0.1:80`, with the application route appended directly. Start both the website and API workflows first. Do not include the artifact path prefix, target the website workflow port, or default shell-run Chromium to the external development domain.

**Why:** The Cognirise preview splits Vite assets and `/api` requests across separate managed workflows. The local port-80 proxy preserves that routing. Direct workflow ports bypass part of the app, while the external development domain can present a Replit preview-sharing interstitial to shell-run headless Chromium.

**How to apply:** Keep browser-script defaults on the local port-80 proxy and allow an explicit base-URL override. If a route renders the generic 404, verify both workflows and the `/api/public/navigation` response before treating it as an application regression. Managed app-preview tooling can continue resolving the artifact route itself.

Finish API generation checks before starting a browser pass.

**Why:** The code-generation check regenerates shared sources, temporarily deleting files that running Vite clients import. Running it during authentication caused transient missing-module overlays and page reloads even though the check succeeded.

**How to apply:** Treat code-generation checks as source-writing operations when scheduling integrated verification; complete them before workflow restart and browser testing.

Compare mobile overflow against `document.documentElement.clientWidth` and the requested viewport, not `window.innerWidth` alone.

**Why:** An overflowing decorative element expanded a 390px mobile layout to 494px; both scrollWidth and innerWidth became 494, falsely reporting no overflow while the screenshot showed shrunken content.

**How to apply:** Record clientWidth, scrollWidth and requested viewport width together. Distinguish intentionally scrollable tables from unbounded decorative elements before changing layout.

Keep comparison-page captures separate from the product's functional browser checks, and support resuming only the unchecked flows.

**Why:** Repeated cross-page reference captures were followed by blank-document reloads despite passing product checks. A fresh, scoped check completed the remaining flows; the blank reload's underlying cause was not established.

**How to apply:** Complete product interactions before navigating to visual references, retain completed evidence, and include console errors and DOM readiness in timeout diagnostics rather than repeatedly rerunning the entire suite.
