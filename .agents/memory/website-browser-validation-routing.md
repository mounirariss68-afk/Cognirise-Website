---
name: Website browser validation routing
description: How to target the Cognirise website in browser-level validation without bypassing Replit's split workflow routing.
---

Run browser-level website checks against the root development-domain URL, with the application route appended directly. Do not include the artifact path prefix, and do not target the website workflow port.

**Why:** The Cognirise development preview intentionally splits root Vite assets and `/api` requests across separate managed workflows. An artifact-prefixed browser URL leaves the prefix in the SPA pathname, while a direct website port bypasses the API workflow; either target can produce a false route or CMS failure even when the managed preview is healthy.

**How to apply:** Set browser-test base URLs to the root Replit development domain and then append routes such as `/what-we-do` or `/#home-industries`. Keep shell-only route probes separate from browser validation because the shell's local proxy context is not equivalent to the artifact preview.